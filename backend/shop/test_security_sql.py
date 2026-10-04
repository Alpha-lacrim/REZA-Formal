"""Independent connections exercise security counters and token CAS on SQL Server."""
import threading
from concurrent.futures import ThreadPoolExecutor
from unittest import skipUnless

from django.db import close_old_connections, connection, connections
from django.test import TransactionTestCase
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.exceptions import TokenError

from .models import User, ThrottleBucket
from .sessions import new_session, rotate_session, revoke_cookies
from .throttles import RegisterRateThrottle


@skipUnless(connection.vendor == 'microsoft', 'Dedicated disposable SQL Server lane only')
class SecuritySqlConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user('sql-session', 'sql-session@example.invalid', 'Test-only-493!')

    def parallel(self, action, workers=2):
        barrier = threading.Barrier(workers)
        def run(index):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return action(index)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(run, index) for index in range(workers)]
            return [future.result(timeout=30) for future in futures]

    def test_same_refresh_has_exactly_one_winner_on_separate_connections(self):
        token = str(new_session(self.user)['refresh'])
        def rotate(_index):
            try:
                rotate_session(token)
                return True
            except TokenError:
                return False
        self.assertEqual(sum(self.parallel(rotate)), 1)

    def test_shared_limit_is_atomic_across_workers_including_first_bucket_creation(self):
        def request(index):
            throttle = RegisterRateThrottle()
            throttle.rate = '2/min'
            throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.rate)
            throttle.timer = lambda: 120.5
            return throttle.allow_request(APIRequestFactory().post('/', HTTP_X_FORWARDED_FOR=f'192.0.2.{index}'), None)
        self.assertEqual(sum(self.parallel(request, workers=4)), 2)
        self.assertEqual(ThrottleBucket.objects.get().count, 2)

    def test_logout_and_rotation_always_leave_family_revoked(self):
        token = str(new_session(self.user)['refresh'])
        def action(index):
            if index:
                revoke_cookies({'refresh': token})
            else:
                try:
                    return rotate_session(token)
                except TokenError:
                    return None
        results = self.parallel(action)
        for tokens in results:
            if tokens:
                with self.assertRaises(TokenError):
                    rotate_session(str(tokens['refresh']))
