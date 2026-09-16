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
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
CSRF_TRUSTED_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000']
SECURE_SSL_REDIRECT = False
