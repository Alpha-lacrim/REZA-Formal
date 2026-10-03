"""Same worker model as before; bounded shutdown and JSON errors on stdout."""
import os

from reza_backend.observability import logging_config

bind = '0.0.0.0:8000'
workers = int(os.environ.get('GUNICORN_WORKERS') or '3')
timeout = int(os.environ.get('GUNICORN_TIMEOUT') or '30')
graceful_timeout = int(os.environ.get('GUNICORN_GRACEFUL_TIMEOUT') or '30')
accesslog = None  # Request middleware emits safe JSON; no raw URL/cookie logs.
errorlog = '-'
loglevel = (os.environ.get('LOG_LEVEL') or 'INFO').lower()
logconfig_dict = logging_config(loglevel.upper())
