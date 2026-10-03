import base64
import time
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.test import TestCase, SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from .models import Address, AuthSession, Order, SiteSettings, ThrottleBucket, User
from .sessions import new_session
from .test_product_media import png_bytes, upload
from .throttles import LoginAccountRateThrottle, RegisterRateThrottle, client_ip
from .urls import urlpatterns


class SharedThrottleTests(TestCase):
    def test_forwarded_header_variation_cannot_change_untrusted_peer_identity(self):
        factory = APIRequestFactory()
        a, b = RegisterRateThrottle(), RegisterRateThrottle()
        for throttle in (a, b):
            throttle.rate = '2/min'
            throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
            throttle.timer = lambda: 120.5
        self.assertTrue(a.allow_request(factory.post('/', HTTP_X_FORWARDED_FOR='192.0.2.1'), None))
        self.assertTrue(b.allow_request(factory.post('/', HTTP_X_FORWARDED_FOR='192.0.2.2'), None))
        self.assertFalse(a.allow_request(factory.post('/', HTTP_X_FORWARDED_FOR='192.0.2.3'), None))
        self.assertGreater(a.wait(), 0)
        self.assertEqual(ThrottleBucket.objects.get().count, 2)
        self.assertNotIn('127.0.0.1', ThrottleBucket.objects.get().key)
        b.timer = lambda: 180.5
        self.assertTrue(b.allow_request(factory.post('/'), None))

    @override_settings(TRUSTED_PROXY_CIDRS=['192.0.2.0/24'])
    def test_only_explicit_proxy_and_single_ip_are_trusted(self):
        factory = APIRequestFactory()
        for peer, forwarded, expected in [('192.0.2.4', '198.51.100.7', '198.51.100.7'),
                                          ('203.0.113.4', '198.51.100.7', '203.0.113.4'),
                                          ('192.0.2.4', '198.51.100.7, 10.0.0.1', '192.0.2.4')]:
            request = factory.post('/', REMOTE_ADDR=peer, HTTP_X_FORWARDED_FOR=forwarded)
            self.assertEqual(client_ip(request), expected)

    def test_account_limit_normalizes_email_across_ips_without_storing_it(self):
        from rest_framework.request import Request
        from rest_framework.parsers import JSONParser
        factory = APIRequestFactory()
        throttle = LoginAccountRateThrottle()
        throttle.rate = '1/hour'
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
        throttle.timer = lambda: 100.0
        for index, email in enumerate([' Buyer@Example.invalid ', 'buyer@example.invalid']):
            request = Request(factory.post('/', {'email': email}, format='json', REMOTE_ADDR=f'192.0.2.{index}'), parsers=[JSONParser()])
            self.assertEqual(throttle.allow_request(request, None), index == 0)
        self.assertEqual(len(ThrottleBucket.objects.get().key), 64)

    def test_endpoint_429_returns_retry_after(self):
        client = APIClient()
        with patch.object(RegisterRateThrottle, 'get_rate', return_value='1/hour'):
            first = client.post('/api/auth/register/', {}, format='json')
            second = client.post('/api/auth/register/', {}, format='json', HTTP_X_FORWARDED_FOR='spoofed')
        self.assertEqual(first.status_code, 400)
        self.assertEqual(second.status_code, 429)
        self.assertGreater(int(second['Retry-After']), 0)

    def test_cleanup_removes_only_expired_security_state(self):
        user = User.objects.create_user('cleanup', 'cleanup@example.invalid', 'Test-only-493!')
        new_session(user)
        new_session(user)
        old = timezone.now() - timezone.timedelta(days=1)
        AuthSession.objects.filter(pk=AuthSession.objects.first().pk).update(expires_at=old)
        ThrottleBucket.objects.create(key='expired', expires_at=old)
        ThrottleBucket.objects.create(key='active', expires_at=timezone.now() + timezone.timedelta(days=1))
        call_command('prune_security_state', stdout=StringIO())
        self.assertEqual(AuthSession.objects.count(), 1)
        self.assertEqual(list(ThrottleBucket.objects.values_list('key', flat=True)), ['active'])


class SiteImageHardeningTests(TestCase):
    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        override = override_settings(MEDIA_ROOT=self.media.name)
        override.enable()
        self.addCleanup(override.disable)
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_superuser('site-security', 'site-security@example.invalid', 'Test-only-493!'))

    def files(self):
        return [path for path in Path(self.media.name).rglob('*') if path.is_file()]

    def test_all_site_fields_validate_real_content_extension_mime_and_size(self):
        for field in ['about_image', 'hero_image', 'suits_section_image', 'shirts_section_image',
                      'blazers_section_image', 'accessories_section_image', 'bespoke_section_image']:
            for file in [upload('spoof.html'), upload('fake.png', b'invalid'), upload(mime='text/html'),
                         upload(content=png_bytes((8001, 1))), upload(content=png_bytes() + b'x' * (10 * 1024 * 1024))]:
                response = self.client.put('/api/settings/', {field: file}, format='multipart')
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.files(), [])
        self.assertFalse(SiteSettings.objects.exists())

    def test_site_image_reencoding_and_inline_compatibility_discard_trailing_content(self):
        image = png_bytes() + b'<script>synthetic-inert-marker</script>'
        response = self.client.put('/api/settings/', {'hero_image': upload('../../chosen.png', image)}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertRegex(self.files()[0].name, r'^[a-f0-9]{32}\.png$')
        self.assertNotIn(b'synthetic-inert-marker', self.files()[0].read_bytes())
        response = self.client.put('/api/settings/', {'about_image': 'data:image/png;base64,' + base64.b64encode(image).decode()}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('data:', str(response.data))

    def test_site_db_failure_leaves_no_new_files(self):
        with patch.object(SiteSettings, 'save', side_effect=RuntimeError('synthetic rollback')):
            with self.assertRaises(RuntimeError):
                self.client.put('/api/settings/', {'hero_image': upload()}, format='multipart')
        self.assertEqual(self.files(), [])
        self.assertFalse(SiteSettings.objects.exists())

    def test_site_binary_budget_is_checked_before_decoding(self):
        with patch('shop.views.MAX_UPLOAD_BYTES', 100), patch('shop.product_media.Image.open') as decode:
            response = self.client.put('/api/settings/', {'hero_image': upload(), 'about_image': upload()}, format='multipart')
        self.assertEqual(response.status_code, 400)
        decode.assert_not_called()
