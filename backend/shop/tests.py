import os
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from .management.commands.seed_data import PRODUCTS
from .models import ContactMessage, Order, OrderItem, Product, SiteSettings


User = get_user_model()


class DatabaseSettingsTests(SimpleTestCase):
    def test_mssql_odbc_keywords_are_forwarded_through_extra_params(self):
        from reza_backend import settings as project_settings

        options = project_settings.DATABASES['default']['OPTIONS']

        self.assertIn('Encrypt=', options['extra_params'])
        self.assertIn('TrustServerCertificate=', options['extra_params'])
        self.assertNotIn('Encrypt', options)
        self.assertNotIn('TrustServerCertificate', options)
        self.assertIsInstance(options['connection_timeout'], int)


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration_establishes_cookie_authentication(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'email': 'new.user@example.com',
                'password': 'A-strong-registration-password-493!',
                'first_name': 'New',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.cookies)
        self.assertIn('refresh', response.cookies)
        self.assertTrue(response.cookies['access']['httponly'])
        self.assertEqual(response.cookies['access']['samesite'], 'Lax')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_invalid_access_cookie_does_not_block_login_or_logout(self):
        User.objects.create_user(
            username='returning-user',
            email='returning@example.com',
            password='A-strong-returning-password-493!',
        )
        self.client.cookies['access'] = 'expired-or-invalid-token'

        login_response = self.client.post(
            '/api/auth/login/',
            {
                'email': 'returning@example.com',
                'password': 'A-strong-returning-password-493!',
            },
            format='json',
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertIn('access', login_response.cookies)

        self.client.cookies['access'] = 'expired-or-invalid-token'
        logout_response = self.client.post('/api/auth/logout/', format='json')
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.cookies['access'].value, '')

    def test_valid_cookie_for_inactive_user_does_not_block_logout(self):
        user = User.objects.create_user(
            username='disabled-user',
            email='disabled@example.com',
            password='A-strong-disabled-password-493!',
        )
        login_response = self.client.post(
            '/api/auth/login/',
            {
                'email': 'disabled@example.com',
                'password': 'A-strong-disabled-password-493!',
            },
            format='json',
        )
        self.assertEqual(login_response.status_code, 200)
        user.is_active = False
        user.save(update_fields=['is_active'])

        logout_response = self.client.post('/api/auth/logout/', format='json')

        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.cookies['access'].value, '')

    def test_refresh_cookie_replaces_an_invalid_access_cookie(self):
        User.objects.create_user(
            username='refresh-user',
            email='refresh@example.com',
            password='A-strong-refresh-password-493!',
        )
        login_response = self.client.post(
            '/api/auth/login/',
            {
                'email': 'refresh@example.com',
                'password': 'A-strong-refresh-password-493!',
            },
            format='json',
        )
        self.assertEqual(login_response.status_code, 200)

        self.client.cookies['access'] = 'expired-or-invalid-token'
        refresh_response = self.client.post('/api/auth/refresh/', format='json')

        self.assertEqual(refresh_response.status_code, 200)
        self.assertIn('access', refresh_response.cookies)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_invalid_refresh_cookie_is_cleared(self):
        self.client.cookies['refresh'] = 'expired-or-invalid-token'
        response = self.client.post('/api/auth/refresh/', format='json')

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.cookies['refresh'].value, '')

    def test_registration_validates_email_and_password(self):
        invalid_email = self.client.post(
            '/api/auth/register/',
            {'email': 'not-an-email', 'password': 'A-strong-registration-password-493!'},
            format='json',
        )
        weak_password = self.client.post(
            '/api/auth/register/',
            {'email': 'valid@example.com', 'password': 'password'},
            format='json',
        )

        self.assertEqual(invalid_email.status_code, 400)
        self.assertIn('email', invalid_email.data)
        self.assertEqual(weak_password.status_code, 400)
        self.assertIn('password', weak_password.data)
        self.assertFalse(User.objects.exists())

    def test_registration_enforces_case_insensitive_email_uniqueness(self):
        User.objects.create_user(
            username='existing-email',
            email='existing@example.com',
            password='A-strong-existing-password-493!',
        )

        response = self.client.post(
            '/api/auth/register/',
            {
                'email': 'EXISTING@example.com',
                'password': 'A-strong-registration-password-493!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.filter(email='existing@example.com').count(), 1)

    def test_login_rejects_missing_credentials_without_server_error(self):
        response = self.client.post('/api/auth/login/', {}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'Email and password are required')

    @patch('shop.views._verify_google_token')
    def test_google_auth_rejects_an_unverified_token(self, verifier):
        from shop.views import InvalidGoogleToken

        verifier.side_effect = InvalidGoogleToken
        response = self.client.post(
            '/api/auth/google/',
            {'id_token': 'unsigned.claims.token'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())
        verifier.assert_called_once()

    @patch('shop.views._verify_google_token')
    def test_google_auth_accepts_only_verified_email_claims(self, verifier):
        verifier.return_value = {
            'sub': 'google-account-id',
            'email': 'google.user@example.com',
            'email_verified': False,
            'name': 'Google User',
        }
        response = self.client.post(
            '/api/auth/google/',
            {'id_token': 'signed.claims.token'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

        verifier.return_value['email_verified'] = True
        response = self.client.post(
            '/api/auth/google/',
            {'id_token': 'signed.claims.token'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.cookies)
        self.assertTrue(User.objects.filter(email='google.user@example.com').exists())

    def test_otp_endpoint_neither_discloses_a_code_nor_changes_a_user(self):
        user = User.objects.create_user(
            username='otp-user',
            email='otp@example.com',
            password='A-strong-test-password-493!',
        )

        response = self.client.post(
            '/api/auth/send-otp/',
            {'email': user.email},
            format='json',
        )

        self.assertEqual(response.status_code, 501)
        self.assertNotIn('otp', response.data)
        user.refresh_from_db()
        self.assertIsNone(user.two_factor_secret)


class PublicApiValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_contact_sender_cannot_mark_message_read_or_forge_timestamp(self):
        response = self.client.post(
            '/api/contact/',
            {
                'name': 'Sender',
                'email': 'sender@example.com',
                'message': 'Hello',
                'read': True,
                'created_at': '2000-01-01T00:00:00Z',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        message = ContactMessage.objects.get()
        self.assertFalse(message.read)
        self.assertNotEqual(message.created_at.year, 2000)


class OrderInvariantTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='A-strong-test-password-493!',
        )
        self.product = Product.objects.create(
            id='order-product',
            name='Order Product',
            price=Decimal('125.50'),
            stock=5,
        )
        self.client.force_authenticate(self.user)

    def test_empty_order_is_rejected(self):
        response = self.client.post(
            '/api/orders/create/',
            {'items': [], 'shipping_address': 'Tehran'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_server_computes_total_and_decrements_stock(self):
        response = self.client.post(
            '/api/orders/create/',
            {
                'items': [{'id': self.product.id, 'qty': 2}],
                'total': '0.01',
                'shipping_address': 'Tehran',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        self.assertEqual(order.total, Decimal('251.00'))
        self.assertRegex(order.id, r'^ORD-[0-9a-f]{28}$')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_cancelling_two_orders_restores_both_quantities_once(self):
        first = Order.objects.create(
            id='ORD-FIRST', user=self.user, total=Decimal('125.50'), shipping_address='A'
        )
        second = Order.objects.create(
            id='ORD-SECOND', user=self.user, total=Decimal('251.00'), shipping_address='B'
        )
        OrderItem.objects.create(order=first, product=self.product, qty=1, price=self.product.price)
        OrderItem.objects.create(order=second, product=self.product, qty=2, price=self.product.price)
        self.product.stock = 2
        self.product.save(update_fields=['stock'])

        self.assertEqual(self.client.post('/api/orders/ORD-FIRST/cancel/').status_code, 200)
        self.assertEqual(self.client.post('/api/orders/ORD-SECOND/cancel/').status_code, 200)
        self.assertEqual(self.client.post('/api/orders/ORD-FIRST/cancel/').status_code, 409)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)


class AdminProductTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='test-admin',
            email='test-admin@example.com',
            password='A-strong-admin-password-493!',
        )
        self.client.force_authenticate(self.admin)

    def test_generated_product_ids_are_unique_and_values_are_non_negative(self):
        payload = {'name': 'Generated', 'price': '10.00', 'stock': 1}
        first = self.client.post('/api/admin/products/', payload, format='json')
        second = self.client.post('/api/admin/products/', payload, format='json')
        negative = self.client.post(
            '/api/admin/products/',
            {'name': 'Invalid', 'price': '-1.00', 'stock': -1},
            format='json',
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(first.data['id'], second.data['id'])
        self.assertTrue(first.data['id'].startswith('prod-'))
        self.assertEqual(negative.status_code, 400)


class SiteSettingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        admin = User.objects.create_superuser(
            username='settings-admin',
            email='settings-admin@example.com',
            password='A-strong-settings-password-493!',
        )
        self.client.force_authenticate(admin)

    def test_explicit_image_clear_flag_removes_existing_field(self):
        settings = SiteSettings.objects.create(
            about_title='Existing',
            hero_image='site/old-hero.jpg',
        )

        response = self.client.put(
            '/api/settings/',
            {'about_title': 'Updated', 'clear_hero_image': 'true'},
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        settings.refresh_from_db()
        self.assertEqual(settings.about_title, 'Updated')
        self.assertFalse(settings.hero_image)


class SeedDataTests(TestCase):
    @patch.dict(
        os.environ,
        {
            'DJANGO_SUPERUSER_EMAIL': '',
            'DJANGO_SUPERUSER_PASSWORD': '',
            'DJANGO_SUPERUSER_USERNAME': 'admin',
        },
        clear=False,
    )
    def test_seed_is_idempotent_and_matches_frontend_catalog_ids(self):
        call_command('seed_data', stdout=StringIO())
        call_command('seed_data', stdout=StringIO())

        self.assertFalse(User.objects.exists())
        self.assertEqual(
            set(Product.objects.values_list('id', flat=True)),
            {product['id'] for product in PRODUCTS},
        )
        self.assertEqual(Product.objects.count(), len(PRODUCTS))
        self.assertEqual(SiteSettings.objects.count(), 1)

    @patch.dict(
        os.environ,
        {
            'DJANGO_SUPERUSER_EMAIL': 'configured-admin@example.com',
            'DJANGO_SUPERUSER_PASSWORD': 'password',
            'DJANGO_SUPERUSER_USERNAME': 'configured-admin',
        },
        clear=False,
    )
    def test_seed_rejects_weak_configured_superuser_password(self):
        with self.assertRaises(CommandError):
            call_command('seed_data', stdout=StringIO(), stderr=StringIO())
        self.assertFalse(User.objects.exists())

    @patch.dict(
        os.environ,
        {
            'DJANGO_SUPERUSER_EMAIL': 'existing@example.com',
            'DJANGO_SUPERUSER_PASSWORD': 'A-strong-admin-password-493!',
            'DJANGO_SUPERUSER_USERNAME': 'configured-admin',
        },
        clear=False,
    )
    def test_seed_does_not_elevate_an_existing_normal_account(self):
        User.objects.create_user(username='existing', email='existing@example.com')

        with self.assertRaises(CommandError):
            call_command('seed_data', stdout=StringIO(), stderr=StringIO())

        self.assertFalse(User.objects.get(email='existing@example.com').is_superuser)


class SecuritySettingsTests(TestCase):
    @patch.dict(os.environ, {'AUTH_COOKIE_SAMESITE': 'None'}, clear=False)
    def test_cookie_auth_rejects_samesite_none_without_csrf_flow(self):
        from reza_backend import settings as project_settings

        with self.assertRaises(ImproperlyConfigured):
            project_settings._same_site_setting('AUTH_COOKIE_SAMESITE', 'Lax')
