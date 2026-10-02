"""Browser-only SQLite settings. Database/media paths are supplied by the runner."""
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from .test_settings import *  # noqa: F403

root = Path(os.environ['REZA_E2E_DIRECTORY']).resolve()
if not root.name.startswith('reza-e2e-') or not (root / '.disposable').is_file():
    raise ImproperlyConfigured('E2E requires a marked disposable runner directory')
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': root / 'db.sqlite3'}}
MEDIA_ROOT = root / 'media'
# The loopback-only disposable server serves its real uploaded files during browser tests.
# Production continues to serve media through Nginx, with DEBUG disabled.
DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
CSRF_TRUSTED_ORIGINS = [f"http://127.0.0.1:{int(os.environ.get('REZA_E2E_FRONTEND_PORT', '3100'))}"]
SECURE_SSL_REDIRECT = False
