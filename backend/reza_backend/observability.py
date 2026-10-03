"""Bounded, vendor-neutral JSON events. Never serialize request data or errors."""
import json
import logging
import re
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone


request_id = ContextVar('request_id', default=None)
REQUEST_ID = re.compile(r'[A-Za-z0-9_-]{1,64}\Z')
REQUEST_FIELDS = ('method', 'route', 'status', 'duration_ms')
SAFE_MESSAGES = {
    'Multiple users share the same normalized email',
    'Product validation rejected',
}


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'timestamp': datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'event': getattr(record, 'event', 'application_log'),
            'request_id': request_id.get() or getattr(getattr(record, 'request', None), 'request_id', None),
        }
        for field in REQUEST_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        # Framework messages/arguments can contain URLs, SQL or credentials.
        # Even exception strings are untrusted. Preserve type and stack locations.
        if isinstance(record.msg, str) and record.msg in SAFE_MESSAGES:
            payload['message'] = record.msg
        if record.exc_info and record.exc_info[0]:
            payload['exception_type'] = record.exc_info[0].__name__
            payload['frames'] = [
                {'file': frame.filename.rsplit('/', 1)[-1].rsplit('\\', 1)[-1],
                 'line': frame.lineno, 'function': frame.name}
                for frame in traceback.extract_tb(record.exc_info[2])
            ]
        return json.dumps(payload, ensure_ascii=False)


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger('reza.requests')

    def __call__(self, request):
        supplied = request.headers.get('X-Request-ID', '')
        correlation = supplied if REQUEST_ID.fullmatch(supplied) else uuid.uuid4().hex
        token = request_id.set(correlation)
        request.request_id = correlation
        started = time.monotonic()
        try:
            response = self.get_response(request)
            response['X-Request-ID'] = correlation
            # Quiet successful probes; failures still produce events.
            if not (request.path.startswith('/api/health/') and response.status_code < 400):
                match = getattr(request, 'resolver_match', None)
                level = (logging.ERROR if response.status_code >= 500 else
                         logging.WARNING if response.status_code >= 400 else logging.INFO)
                self.logger.log(level, 'request_completed', extra={
                    'event': 'request_completed',
                    'method': request.method,
                    'route': match.route if match else 'unmatched',
                    'status': response.status_code,
                    'duration_ms': round((time.monotonic() - started) * 1000, 2),
                })
            return response
        finally:
            request_id.reset(token)


def logging_config(level='INFO'):
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {'json': {'()': 'reza_backend.observability.JsonFormatter'}},
        'handlers': {'console': {
            'class': 'logging.StreamHandler', 'formatter': 'json', 'stream': 'ext://sys.stdout',
        }},
        'root': {'handlers': ['console'], 'level': level},
        'loggers': {
            **{
                name: {'handlers': ['console'], 'level': level, 'propagate': False}
                for name in ('django', 'gunicorn.error', 'reza.requests', 'shop')
            },
            # Gunicorn emits access calls when logconfig_dict exists even with
            # accesslog=None. Middleware owns access events, including probes.
            'gunicorn.access': {'handlers': [], 'level': 'CRITICAL', 'propagate': False},
        },
    }
