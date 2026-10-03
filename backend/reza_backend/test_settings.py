"""Hermetic settings for the backend test suite.

Tests use an in-memory SQLite database and never connect to the configured SQL
Server instance.
"""

import os


os.environ.setdefault('DJANGO_SECRET_KEY', 'test-only-secret-key-for-isolated-tests-never-use-in-production-493')
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

# Focused tests exercise real limits. Keep scoped DB counters and general cache
# quotas high here so unrelated fixtures do not consume each other's quota.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'anon': '10000/min',
        'user': '10000/min',
        'login': '10000/min',
        'login_account': '10000/min',
        'admin_login': '10000/min',
        'admin_login_account': '10000/min',
        'refresh': '10000/min',
        'register': '10000/min',
        'contact': '10000/min',
        'checkout': '10000/min',
        'checkout_quote': '10000/min',
        'newsletter': '10000/min',
        'review': '10000/min',
        'bespoke': '10000/min',
        'return': '10000/min',
    },
}
