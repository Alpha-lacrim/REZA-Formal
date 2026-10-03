from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuthSession, User
from .sessions import new_session, rotate_session, revoke_cookies


class SessionLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('session-buyer', 'session@example.invalid', 'Test-only-493!')
        self.client = APIClient(enforce_csrf_checks=True)
        self.csrf = self.client.get('/api/auth/csrf/').data['csrfToken']

    def login(self):
        response = self.client.post('/api/auth/login/', {'email': self.user.email, 'password': 'Test-only-493!'},
                                    format='json', HTTP_X_CSRFTOKEN=self.csrf)
        self.assertEqual(response.status_code, 200)
        return response

    def post(self, path):
        return self.client.post(path, format='json', HTTP_X_CSRFTOKEN=self.csrf)

    @override_settings(AUTH_COOKIE_SECURE=True)
    def test_cookies_are_host_only_httponly_secure_with_explicit_token_lifetimes(self):
        response = self.login()
        for name, same_site, lifetime in [('access', 'Lax', 900), ('refresh', 'Strict', 604800)]:
            cookie = response.cookies[name]
            self.assertTrue(cookie['httponly'] and cookie['secure'])
            self.assertEqual(cookie['samesite'], same_site)
            self.assertEqual(cookie['path'], '/')
            self.assertEqual(cookie['domain'], '')
            self.assertLessEqual(int(cookie['max-age']), lifetime)
            self.assertGreaterEqual(int(cookie['max-age']), lifetime - 2)
            self.assertTrue(cookie['expires'])
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)

    def test_rotation_is_single_use_and_does_not_extend_absolute_expiry(self):
        self.login()
        original = self.client.cookies['refresh'].value
        expiry = RefreshToken(original)['exp']
        refreshed = self.post('/api/auth/refresh/')
        self.assertEqual(refreshed.status_code, 200)
        current = refreshed.cookies['refresh'].value
        self.assertTrue(original != current, 'Refresh must rotate')
        self.assertEqual(RefreshToken(current)['exp'], expiry)
        with self.assertRaises(TokenError):
            rotate_session(original)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_logout_revokes_copied_access_and_rotated_refresh_family(self):
        self.login()
        old = self.client.cookies['refresh'].value
        self.assertEqual(self.post('/api/auth/refresh/').status_code, 200)
        copied = {key: self.client.cookies[key].value for key in ('access', 'refresh')}
        self.client.cookies['refresh'] = old
        self.assertEqual(self.post('/api/auth/logout/').status_code, 200)
        for name, raw in copied.items():
            self.client.cookies[name] = raw
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.post('/api/auth/refresh/').status_code, 401)
        self.assertIsNotNone(AuthSession.objects.get().revoked_at)

    def test_missing_invalid_expired_or_disabled_refresh_clears_both_cookies(self):
        for condition in ('missing', 'invalid', 'expired', 'disabled', 'password', 'deleted'):
            with self.subTest(condition=condition):
                self.user.is_active = True
                self.user.save()
                tokens = new_session(self.user)
                self.client.cookies['access'] = str(tokens['access'])
                self.client.cookies['refresh'] = str(tokens['refresh'])
                if condition == 'missing':
                    del self.client.cookies['refresh']
                elif condition == 'invalid':
                    self.client.cookies['refresh'] = 'synthetic-invalid'
                elif condition == 'expired':
                    tokens['refresh'].set_exp(lifetime=timedelta(seconds=-1))
                    self.client.cookies['refresh'] = str(tokens['refresh'])
                elif condition == 'disabled':
                    self.user.is_active = False
                    self.user.save()
                elif condition == 'password':
                    self.user.set_password('Changed-test-only-593!')
                    self.user.save()
                elif condition == 'deleted':
                    self.user.delete()
                result = self.post('/api/auth/refresh/')
                self.assertEqual(result.status_code, 401)
                for name in ('access', 'refresh'):
                    self.assertEqual(result.cookies[name].value, '')

    def test_password_change_revokes_access_and_header_clients_use_same_session(self):
        tokens = new_session(self.user)
        header_client = APIClient()
        header_client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(tokens['access']))
        self.assertEqual(header_client.put('/api/auth/me/update/', {'phone': '123'}, format='json').status_code, 200)
        self.user.set_password('Changed-test-only-593!')
        self.user.save()
        self.assertEqual(header_client.get('/api/auth/me/').status_code, 401)

    def test_header_logout_revokes_the_authenticated_session(self):
        tokens = new_session(self.user)
        header_client = APIClient(enforce_csrf_checks=True)
        header_client.cookies['csrftoken'] = self.client.cookies['csrftoken'].value
        header_client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(tokens['access']))
        self.assertEqual(header_client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=self.csrf).status_code, 200)
        self.assertEqual(header_client.get('/api/auth/me/').status_code, 401)
        with self.assertRaises(TokenError):
            rotate_session(str(tokens['refresh']))

    def test_legacy_stateless_tokens_require_sign_in_and_session_expiry_is_enforced(self):
        self.client.cookies['access'] = str(RefreshToken.for_user(self.user).access_token)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        tokens = new_session(self.user)
        AuthSession.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.client.cookies['access'] = str(tokens['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_refresh_racing_logout_cannot_restore_a_revoked_family(self):
        tokens = new_session(self.user)
        # Revoke between validation and the atomic compare-and-swap write.
        from . import sessions
        original = sessions.active_session
        def logout_after_validation(token, user):
            session = original(token, user)
            revoke_cookies({'refresh': str(tokens['refresh'])})
            return session
        with patch('shop.sessions.active_session', side_effect=logout_after_validation):
            with self.assertRaises(TokenError):
                rotate_session(str(tokens['refresh']))

    def test_refresh_and_logout_require_csrf_and_reject_untrusted_origin(self):
        self.login()
        for path in ('/api/auth/refresh/', '/api/auth/logout/'):
            self.assertEqual(self.client.post(path).status_code, 403)
            self.assertEqual(self.client.post(path, HTTP_X_CSRFTOKEN=self.csrf,
                                             HTTP_ORIGIN='https://untrusted.example.invalid').status_code, 403)
        self.assertIsNone(AuthSession.objects.get().revoked_at)
