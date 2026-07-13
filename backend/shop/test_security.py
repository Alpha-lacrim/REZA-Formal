from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIClient, APIRequestFactory

from .models import User
from .throttles import RegisterRateThrottle


class CookieCsrfTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

    def csrf_token(self):
        response = self.client.get('/api/auth/csrf/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('csrftoken', response.cookies)
        return response.data['csrfToken']

    def test_public_auth_mutations_require_csrf(self):
        payload = {
            'email': 'csrf-register@example.com',
            'password': 'A-strong-csrf-password-493!',
            'first_name': 'CSRF',
        }

        denied = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(denied.status_code, 403)

        created = self.client.post(
            '/api/auth/register/',
            payload,
            format='json',
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(created.status_code, 201)

    def test_cookie_authenticated_mutations_require_matching_csrf_header(self):
        User.objects.create_user(
            username='csrf-user',
            email='csrf-user@example.com',
            password='A-strong-csrf-password-493!',
        )
        token = self.csrf_token()
        login = self.client.post(
            '/api/auth/login/',
            {'email': 'csrf-user@example.com', 'password': 'A-strong-csrf-password-493!'},
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(login.status_code, 200)

        denied = self.client.put('/api/auth/me/update/', {'phone': '09120000000'}, format='json')
        self.assertEqual(denied.status_code, 403)
        updated = self.client.put(
            '/api/auth/me/update/',
            {'phone': '09120000000'},
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['phone'], '09120000000')

    def test_anonymous_lead_capture_requires_csrf(self):
        denied = self.client.post(
            '/api/newsletter/subscribe/',
            {'email': 'newsletter@example.com'},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)

        accepted = self.client.post(
            '/api/newsletter/subscribe/',
            {'email': 'newsletter@example.com'},
            format='json',
            HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(accepted.status_code, 201)


class SensitiveEndpointThrottleTests(TestCase):
    def test_registration_throttle_limits_repeated_ip_requests(self):
        cache.clear()
        throttle = RegisterRateThrottle()
        throttle.rate = '2/min'
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
        factory = APIRequestFactory()

        self.assertTrue(throttle.allow_request(factory.post('/api/auth/register/'), None))
        self.assertTrue(throttle.allow_request(factory.post('/api/auth/register/'), None))
        self.assertFalse(throttle.allow_request(factory.post('/api/auth/register/'), None))
