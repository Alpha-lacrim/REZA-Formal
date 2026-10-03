import os
import ipaddress
from pathlib import Path
import environ
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
from urllib.parse import urlsplit
from .observability import logging_config

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

DEBUG = env.bool('DEBUG', default=False)
SECRET_KEY = env('DJANGO_SECRET_KEY', default='').strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-development-only-key'
    else:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DEBUG is false')

if not DEBUG and SECRET_KEY in {'change-me', 'change-me-to-a-secure-key', 'change-me-for-local-docker'}:
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must not use a documented placeholder in production')
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith('django-insecure-')):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must contain at least 50 characters in production')

allowed_hosts = env('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0,backend')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(',') if host.strip()]
if not DEBUG and '*' in ALLOWED_HOSTS:
    raise ImproperlyConfigured('ALLOWED_HOSTS must be explicit when DEBUG is false')

INSTALLED_APPS = [
    'shop',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
]

MIDDLEWARE = [
    'reza_backend.observability.RequestLogMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'shop.middleware.SecurityResponseMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'reza_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'reza_backend.wsgi.application'

db_host = env('DB_HOST', default='localhost')
db_port = env('DB_PORT', default='1433')
if '\\' in db_host:
    # Named SQL Server instances normally discover their own dynamic port.
    db_port = ''

db_encrypt = env('DB_ENCRYPT', default='no').strip().lower()
if db_encrypt not in {'yes', 'no', 'mandatory', 'optional', 'strict'}:
    raise ImproperlyConfigured('DB_ENCRYPT must be yes, no, mandatory, optional, or strict')
db_trust_server_certificate = env(
    'DB_TRUST_SERVER_CERTIFICATE',
    default='yes',
).strip().lower()
if db_trust_server_certificate not in {'yes', 'no'}:
    raise ImproperlyConfigured('DB_TRUST_SERVER_CERTIFICATE must be yes or no')

DATABASES = {
    'default': {
        'ENGINE': 'mssql',
        'NAME': env('DB_NAME', default='database'),
        'USER': env('DB_USER', default='sa'),
        'PASSWORD': env('DB_PASSWORD', default=''),
        'HOST': db_host,
        'PORT': db_port,
        'OPTIONS': {
            'driver': env('DB_DRIVER', default='ODBC Driver 17 for SQL Server'),
            # mssql-django only forwards ODBC connection keywords through
            # extra_params; arbitrary top-level OPTIONS keys are ignored.
            'extra_params': (
                f'Encrypt={db_encrypt};'
                f'TrustServerCertificate={db_trust_server_certificate}'
            ),
            'connection_timeout': env.int('DB_CONNECTION_TIMEOUT', default=30),
        },
    }
}

AUTH_USER_MODEL = 'shop.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fa'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755
MEDIA_URL = env('MEDIA_URL', default='/media/')
media_root = Path(env('MEDIA_ROOT', default=str(BASE_DIR / 'media')))
MEDIA_ROOT = media_root if media_root.is_absolute() else BASE_DIR / media_root
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==============================================================================
# UPLOAD LIMIT SETTINGS (ADDED TO FIX 400 Bad Request / RequestDataTooBig)
# ==============================================================================
# Nginx caps the complete body at 50 MiB. Django's DATA limit excludes files;
# product validation separately caps binary uploads at 40 MiB / 12 files.
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
# This is a spool-to-disk threshold, not an upload rejection limit.
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024

REST_FRAMEWORK = {
    'NUM_PROXIES': 0,
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'shop.auth.CookieJWTAuthentication',
        'shop.auth.SessionJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/min',
        'user': '600/min',
        'login': '10/min',
        'login_account': '20/hour',
        'admin_login': '10/min',
        'admin_login_account': '20/hour',
        'refresh': '60/min',
        'register': '5/hour',
        'contact': '10/hour',
        'checkout': '30/hour',
        'checkout_quote': '300/hour',
        'newsletter': '5/hour',
        'review': '10/hour',
        'bespoke': '10/hour',
        'return': '20/hour',
    },
    # Optional: Increase Django REST Framework specific upload limits if needed
    # (Usually falls back to Django settings, but good to know)
}

TRUSTED_PROXY_CIDRS = env.list('TRUSTED_PROXY_CIDRS', default=[])
try:
    for cidr in TRUSTED_PROXY_CIDRS:
        ipaddress.ip_network(cidr)
except ValueError:
    raise ImproperlyConfigured('TRUSTED_PROXY_CIDRS must contain IP networks') from None

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

def _same_site_setting(name, default):
    value = env(name, default=default).strip().capitalize()
    if value not in {'Lax', 'Strict'}:
        raise ImproperlyConfigured(
            f'{name} must be Lax or Strict; this deployment intentionally uses '
            'same-site browser authentication and does not support third-party cookies'
        )
    return value


AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=not DEBUG)
AUTH_COOKIE_SAMESITE = _same_site_setting('AUTH_COOKIE_SAMESITE', 'Lax')
AUTH_REFRESH_COOKIE_SAMESITE = _same_site_setting('AUTH_REFRESH_COOKIE_SAMESITE', 'Strict')

def _trusted_origins(name, value):
    origins = [origin.strip() for origin in value.split(',') if origin.strip()]
    for origin in origins:
        try:
            parsed = urlsplit(origin)
            valid = (parsed.scheme in {'http', 'https'} and parsed.hostname
                     and not parsed.username and not parsed.password and not parsed.path
                     and not parsed.query and not parsed.fragment and '*' not in origin)
            parsed.port
        except ValueError:
            valid = False
        if not valid:
            raise ImproperlyConfigured(f'{name} must contain explicit HTTP(S) origins without wildcards or paths')
    return origins


# Same-origin production needs no CORS exception; development opts into loopback.
cors_origins = env('ALLOWED_ORIGINS', default=('http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173' if DEBUG else ''))
CORS_ALLOWED_ORIGINS = _trusted_origins('ALLOWED_ORIGINS', cors_origins)
csrf_origins = env('CSRF_TRUSTED_ORIGINS', default=cors_origins)
CSRF_TRUSTED_ORIGINS = _trusted_origins('CSRF_TRUSTED_ORIGINS', csrf_origins)

# Allow credentialed requests from explicitly configured frontend origins.
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'

# HTTPS/security controls are configurable so local HTTP remains usable. In a
# production environment, terminate TLS at the app or a trusted proxy and turn
# on redirect/HSTS explicitly after confirming the deployment topology.
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=not DEBUG)
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False)
SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=False)
if env.bool('TRUST_X_FORWARDED_PROTO', default=False):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

LOG_LEVEL = env('LOG_LEVEL', default='INFO').strip().upper() or 'INFO'
if LOG_LEVEL not in {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}:
    raise ImproperlyConfigured('LOG_LEVEL must be DEBUG, INFO, WARNING, ERROR, or CRITICAL')
LOGGING = logging_config(LOG_LEVEL)
