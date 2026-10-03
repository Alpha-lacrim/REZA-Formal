import json
import logging
import sys
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch

from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase

from reza_backend.observability import JsonFormatter, RequestLogMiddleware, request_id


class ObservabilityTests(SimpleTestCase):
    def test_framework_exception_and_arguments_cannot_disclose_secrets(self):
        try:
            raise RuntimeError('private-password-and-SQL-diagnostic')
        except RuntimeError:
            record = logging.LogRecord('django.request', logging.ERROR, __file__, 1,
                                       'URL %s', ('private-token-query',), sys.exc_info())
        record.request = RequestFactory().get('/api/?token=private-cookie')
        output = JsonFormatter().format(record)
        self.assertNotIn('private-', output)
        self.assertEqual(json.loads(output)['exception_type'], 'RuntimeError')
        self.assertTrue(json.loads(output)['frames'])

    def test_untrusted_id_query_and_path_are_bounded(self):
        request = RequestFactory().get('/private-customer-path/?token=private-query',
                                       HTTP_X_REQUEST_ID='bad.id.' * 100)
        middleware = RequestLogMiddleware(lambda req: JsonResponse({}, status=503))
        with self.assertLogs('reza.requests', level='INFO') as captured:
            response = middleware(request)
        record = captured.records[0]
        self.assertEqual(len(response['X-Request-ID']), 32)
        self.assertEqual(record.route, 'unmatched')
        self.assertEqual(record.status, 503)
        self.assertNotIn('private-', JsonFormatter().format(record))
        self.assertIsNone(request_id.get())

    def test_parallel_requests_keep_their_context_and_return_same_id(self):
        barrier = Barrier(2)
        observed = []

        def handler(request):
            barrier.wait(timeout=5)
            observed.append((request.request_id, request_id.get()))
            return JsonResponse({})

        middleware = RequestLogMiddleware(handler)

        def run(identifier):
            response = middleware(RequestFactory().get('/api/', HTTP_X_REQUEST_ID=identifier))
            return response['X-Request-ID'], request_id.get()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, ['first-id', 'second-id']))
        self.assertCountEqual(results, [('first-id', None), ('second-id', None)])
        self.assertCountEqual(observed, [('first-id', 'first-id'), ('second-id', 'second-id')])

    def test_health_success_is_quiet_but_failure_is_logged(self):
        request = RequestFactory().get('/api/health/ready/')
        with patch('reza_backend.observability.logging.getLogger') as logger:
            RequestLogMiddleware(lambda req: JsonResponse({}))(request)
            logger.return_value.log.assert_not_called()
            RequestLogMiddleware(lambda req: JsonResponse({}, status=503))(request)
            logger.return_value.log.assert_called_once()

    def test_context_resets_if_downstream_raises(self):
        def broken(request):
            raise RuntimeError('synthetic')

        with self.assertRaises(RuntimeError):
            RequestLogMiddleware(broken)(RequestFactory().get('/api/'))
        self.assertIsNone(request_id.get())
