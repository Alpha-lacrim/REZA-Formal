"""Hermetic settings for the backend test suite.

Tests use an in-memory SQLite database and never connect to the configured SQL
Server instance.
"""

import os


os.environ.setdefault('DJANGO_SECRET_KEY', 'test-only-secret-key-that-is-not-for-production')
os.environ.setdefault('DEBUG', 'False')

from .settings import *  # noqa: E402,F403


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE
    if middleware != 'whitenoise.middleware.WhiteNoiseMiddleware'
]
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
AUTH_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
GOOGLE_OAUTH_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
