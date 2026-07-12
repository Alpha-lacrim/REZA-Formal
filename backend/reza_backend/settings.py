import os
from pathlib import Path
import environ
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

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

allowed_hosts = env('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0,backend')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(',') if host.strip()]

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
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
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
            'Encrypt': env('DB_ENCRYPT', default='no'),
            'TrustServerCertificate': env('DB_TRUST_SERVER_CERTIFICATE', default='yes'),
            'Connection Timeout': env('DB_CONNECTION_TIMEOUT', default='30'),
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
# Increase maximum request body size (e.g., 50MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  
# Increase maximum file upload size (e.g., 50MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'shop.auth.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Optional: Increase Django REST Framework specific upload limits if needed
    # (Usually falls back to Django settings, but good to know)
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

GOOGLE_OAUTH_CLIENT_ID = env('GOOGLE_OAUTH_CLIENT_ID', default='').strip()


def _same_site_setting(name, default):
    value = env(name, default=default).strip().capitalize()
    if value not in {'Lax', 'Strict'}:
        raise ImproperlyConfigured(
            f'{name} must be Lax or Strict; SameSite=None is unsafe until '
            'cookie-authenticated API requests enforce CSRF tokens'
        )
    return value


AUTH_COOKIE_SECURE = env.bool('AUTH_COOKIE_SECURE', default=not DEBUG)
AUTH_COOKIE_SAMESITE = _same_site_setting('AUTH_COOKIE_SAMESITE', 'Lax')
AUTH_REFRESH_COOKIE_SAMESITE = _same_site_setting('AUTH_REFRESH_COOKIE_SAMESITE', 'Strict')

# CORS: allow React dev origin by default
cors_origins = env('ALLOWED_ORIGINS', default='http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(',') if o.strip()]
csrf_origins = env('CSRF_TRUSTED_ORIGINS', default=cors_origins)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_origins.split(',') if o.strip().startswith(('http://', 'https://'))]

# Allow credentialed requests from explicitly configured frontend origins.
CORS_ALLOW_CREDENTIALS = True

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
