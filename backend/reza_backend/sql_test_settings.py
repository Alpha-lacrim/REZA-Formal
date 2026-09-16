"""Opt-in SQL lane. Only the dedicated loopback/container service is allowed."""
import os
from django.core.exceptions import ImproperlyConfigured
from .test_settings import *  # noqa: F403

if os.environ.get('REZA_SQL_TEST') != 'disposable':
    raise ImproperlyConfigured('SQL tests require REZA_SQL_TEST=disposable')
host = os.environ.get('REZA_SQL_TEST_HOST', '127.0.0.1')
if host not in {'127.0.0.1', 'localhost', 'sql-test'}:
    raise ImproperlyConfigured('SQL tests only allow the disposable local SQL service')
DATABASES = {'default': {
    'ENGINE': 'mssql', 'NAME': 'master', 'HOST': host,
    'PORT': '1433' if host == 'sql-test' else '11434',
    'USER': 'sa', 'PASSWORD': os.environ['REZA_SQL_TEST_PASSWORD'],
    'TEST': {'NAME': 'test_reza_ci_disposable'},
    'OPTIONS': {'driver': 'ODBC Driver 18 for SQL Server',
                'extra_params': 'Encrypt=yes;TrustServerCertificate=yes', 'connection_timeout': 10,
                'query_timeout': 30},
}}
