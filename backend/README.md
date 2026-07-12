# REZA Formal backend

Django REST API backed by Microsoft SQL Server.

## Supported local Python

Use Python 3.11 or 3.12. The Docker image uses 3.11 and the existing Windows virtual environment uses 3.12. Avoid creating the environment with a newer system Python until `pyodbc` and `mssql-django` support has been verified for it.

## Manual Windows setup

1. Install Microsoft ODBC Driver 17 or 18 for SQL Server.
2. Copy `.env.example` to `.env` and set the Django secret and SQL Server connection.
3. Create a supported virtual environment and install dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

4. Ensure SQL Server is running, the target database exists, and the configured login can access it.
5. Apply migrations, seed idempotent data, and start Django:

```powershell
python manage.py check
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

`seed_data` creates products/site settings when needed. It creates an admin only when both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are set. Leaving both empty skips admin creation; setting only one is a configuration error.

## Linux/macOS virtual environment

Use an available Python 3.11/3.12 executable, then:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

The Microsoft ODBC driver still must be installed through the operating system.

## Configuration

Important `backend/.env` values:

- `DJANGO_SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS`
- `ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`
- `DB_DRIVER`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE`, and `DB_CONNECTION_TIMEOUT`
- optional `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD`, and `DJANGO_SUPERUSER_USERNAME`
- optional `GOOGLE_OAUTH_CLIENT_ID` (Google login is disabled when blank)
- `AUTH_COOKIE_*`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and the HTTPS controls documented in `.env.example`

`backend/.env` is ignored and must never be committed.

Google ID tokens are verified server-side against the configured web client ID.
Authentication cookies intentionally accept only `SameSite=Lax` or `Strict`;
`SameSite=None` requires a complete CSRF token/header flow that is not yet
implemented. For HTTPS production, enable secure cookies, trusted proxy
forwarding, redirect, and HSTS only after confirming the deployment topology.

## Checks

Run the hermetic backend tests without connecting to the configured SQL Server:

```powershell
python manage.py test --settings=reza_backend.test_settings
```

`reza_backend.test_settings` uses an in-memory SQLite database, fast password hashing, and test-only secrets. The suite covers authentication, public input validation, order/stock invariants, admin product validation, and idempotent seeding.

With a valid development SQL Server environment, also run:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
```

Browser end-to-end tests are not currently included.

## Docker

Use the root Compose workflow for the full application:

```powershell
Set-Location ..
Copy-Item .env.docker.example .env
# Set required secrets in .env.
docker compose up --build
```

The backend container installs ODBC Driver 18, waits for the Compose SQL Server service, applies enabled startup tasks, and runs Gunicorn. See [the Docker guide](../docs/DOCKER_SETUP.md).
