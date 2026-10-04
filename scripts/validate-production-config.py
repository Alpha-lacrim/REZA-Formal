"""Validate the production template with synthetic config; never start services."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
names = {
    'DJANGO_SECRET_KEY': 'synthetic-ci-only-' * 5,
    'DB_PASSWORD': 'Synthetic-CI-Only-493!',
    'PRODUCTION_DB_PASSWORD': 'Synthetic-Runtime-Only-493!',
    'PRODUCTION_DB_USER': 'synthetic_runtime',
    'PRODUCTION_MSSQL_PID': 'Standard',
    'PRODUCTION_ALLOWED_HOSTS': 'store.example.invalid,localhost,127.0.0.1,backend',
    'PRODUCTION_CSRF_TRUSTED_ORIGINS': 'https://store.example.invalid',
    'DB_NAME': 'synthetic_ops', 'DB_HOST': 'db', 'DB_PORT': '1433',
    'DB_DRIVER': 'ODBC Driver 18 for SQL Server',
    'FRONTEND_PORT': '3000', 'TRUSTED_PROXY_CIDRS': '',
    'LOG_LEVEL': 'INFO', 'GUNICORN_WORKERS': '3',
    'GUNICORN_TIMEOUT': '30', 'GUNICORN_GRACEFUL_TIMEOUT': '30',
}
with tempfile.TemporaryDirectory(prefix='reza-production-config-') as temporary:
    env_file = Path(temporary) / 'fixture.env'
    env_file.write_text('\n'.join(f'{name}={value}' for name, value in names.items()))
    environment = {**os.environ, **names}
    result = subprocess.run([
        'docker', 'compose', '--env-file', str(env_file), '-p', 'reza-production-config-fixture',
        '-f', 'docker-compose.yml', '-f', 'docker-compose.production.yml',
        'config', '--format', 'json',
    ], cwd=ROOT, env=environment, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit('Production Compose validation failed; output withheld to protect configuration')
    services = json.loads(result.stdout)['services']

backend = services['backend']
env = backend['environment']
assert env['DEBUG'] == 'False'
assert all(env[name] == 'false' for name in ('DB_AUTO_CREATE', 'RUN_MIGRATIONS', 'RUN_SEED_DATA', 'RUN_COLLECTSTATIC'))
assert env['DB_USER'].lower() != 'sa'
assert env['DB_ENCRYPT'] == 'yes' and env['DB_TRUST_SERVER_CERTIFICATE'] == 'no'
assert all(env[name] == 'True' for name in ('AUTH_COOKIE_SECURE', 'SESSION_COOKIE_SECURE', 'CSRF_COOKIE_SECURE'))
assert not backend.get('ports') and not services['db'].get('ports')
assert all(not service.get('container_name') for service in services.values())
assert services['db']['environment']['MSSQL_PID'] != 'Developer'
assert backend['read_only'] and services['frontend']['read_only']
assert all(port['host_ip'] == '127.0.0.1' for port in services['frontend']['ports'])
assert services['frontend']['build']['args']['VITE_API_BASE'] == '/api'
assert env['TRUST_X_FORWARDED_PROTO'] == 'False' and env['SECURE_SSL_REDIRECT'] == 'False'
assert int(backend['stop_grace_period'][:-1]) > int(env['GUNICORN_GRACEFUL_TIMEOUT'])
print('Production template: synthetic configuration, isolation, startup flags, DB/TLS assumptions and shutdown budget pass')
