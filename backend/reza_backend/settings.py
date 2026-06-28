import os
from pathlib import Path
import environ
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY', default='change-me')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = ['*']

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

DATABASES = {
    'default': {
        'ENGINE': 'mssql',
        'NAME': env('DB_NAME', default='database'),
        'USER': env('DB_USER', default='sa'),
        'PASSWORD': env('DB_PASSWORD', default=''),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='1433'),
        'OPTIONS': {
            'driver': env('DB_DRIVER', default='ODBC Driver 17 for SQL Server'),
            'Encrypt': 'no',
            'TrustServerCertificate': 'yes',
            'Connection Timeout': '30',
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
MEDIA_URL = env('MEDIA_URL', default='/media/')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

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
        'rest_framework.permissions.AllowAny',
    ),
    # Optional: Increase Django REST Framework specific upload limits if needed
    # (Usually falls back to Django settings, but good to know)
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# CORS: allow React dev origin by default
cors_origins = env('ALLOWED_ORIGINS', default='http://localhost:5173')
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(',') if o.strip()]

# Allow cookies to be sent cross-site for auth (required for cookie-based JWT)
CORS_ALLOW_CREDENTIALS = True

# Patch for mssql-django: SQL Server v17 compatibility
# mssql-django doesn't officially support SQL Server 2025 (v17)
# but it works the same as 2022 (v16), so we override the version check
def _patch_mssql_version_check():
    try:
        import mssql.base
        from functools import lru_cache
        
        @lru_cache(maxsize=1)
        def patched_sql_server_version(self):
            # Get the actual version
            with self.cursor() as cursor:
                cursor.execute("SELECT CAST(SERVERPROPERTY('ProductMajorVersion') AS INT)")
                actual_ver = cursor.fetchone()[0] or 15
            # If version > 16 (SQL 2022), cap it at 16 for compatibility
            return min(actual_ver, 16)
        
        # Replace the version property
        mssql.base.DatabaseWrapper.sql_server_version = property(lambda self: patched_sql_server_version(self))
    except Exception:
        pass

_patch_mssql_version_check()