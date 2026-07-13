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

# Endpoint throttling is covered by focused tests. Keep the shared in-memory
# throttle cache from making otherwise independent suite tests order-dependent.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'anon': '10000/min',
        'user': '10000/min',
        'login': '10000/min',
        'register': '10000/min',
        'contact': '10000/min',
        'checkout': '10000/min',
        'checkout_quote': '10000/min',
        'newsletter': '10000/min',
    },
}
