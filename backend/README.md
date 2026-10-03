# REZA Formal backend

Django REST API backed by Microsoft SQL Server.

## Supported local Python

Use the project-tested Python 3.11/3.12 baseline. The Docker image uses 3.11 and the existing Windows virtual environment uses 3.12.

## Manual Windows setup

1. Install Microsoft ODBC Driver 17 or 18 for SQL Server.
2. Copy `.env.example` to `.env` and set the Django secret and SQL Server connection.
3. Create a supported virtual environment and install dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --require-hashes --only-binary=:all: -r requirements.txt
python -m pip check
```

4. Ensure SQL Server is running, the target database exists, and the configured login can access it.
5. Apply migrations, seed idempotent data, and start Django:

```powershell
python manage.py check
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

`seed_data` bootstraps the demo catalog only when the catalog is empty and shipping methods only when none exist, so later container restarts do not recreate individually removed records. It creates an admin only when both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are set. Leaving both empty skips admin creation; setting only one is a configuration error.

Before applying migration `0005` to an existing production database, back it up. The migration normalizes emails, enforces uniqueness, and intentionally stops with user IDs if legacy accounts have blank or case-insensitive duplicate emails. Migrations `0006` and `0007` then add variants, addresses, shipping, coupons, payments/refunds, inventory history, order snapshots/events, carts, wishlists, reviews, returns, bespoke requests, newsletters, and notification outbox records.

## Linux/macOS virtual environment

Use an available Python 3.11/3.12 executable, then:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes --only-binary=:all: -r requirements.txt
```

The Microsoft ODBC driver still must be installed through the operating system.

`requirements.in` holds compatible inputs; `requirements.txt` is the complete
version/hash lock. Docker and CI enforce hashes and binary wheels. See
[operations](../docs/OPERATIONS.md) for lock updates, restricted runtime/migration
logins, JSON logging, UID 10001 volume ownership and recovery procedures.

## Configuration

Important `backend/.env` values:

- `DJANGO_SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS`
- `ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`
- `DB_DRIVER`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE`, and `DB_CONNECTION_TIMEOUT`
- optional `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD`, and `DJANGO_SUPERUSER_USERNAME`
- `TRUSTED_PROXY_CIDRS` (only verified immediate proxy networks; blank ignores forwarded IPs)
- `AUTH_COOKIE_*`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and the HTTPS controls documented in `.env.example`

`backend/.env` is ignored and must never be committed.

Google/OTP endpoints return 501; legacy MFA-marked accounts fail closed rather than bypassing their marker. Access sessions last 15 minutes with rotating refresh under a fixed seven-day family expiry. Logout revokes the family immediately. Apply migrations 0009/0010 with coordinated frontend rollout and require sign-in again. Schedule `python manage.py prune_security_state` daily. See [Batch 9 security record](../docs/SECURITY_HARDENING.md). Browser mutations use the `/api/auth/csrf/` bootstrap and `X-CSRFToken`; authentication cookies intentionally accept only `SameSite=Lax` or `Strict`. For HTTPS production, enable secure cookies, trusted proxy forwarding, redirect, and HSTS only after confirming the deployment topology.

## Checks

Run the hermetic backend tests without connecting to the configured SQL Server:

```powershell
python manage.py check --settings=reza_backend.test_settings
python manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings
python manage.py test --settings=reza_backend.test_settings
```

`reza_backend.test_settings` uses an in-memory SQLite database, fast password hashing, isolated throttle rates, and test-only secrets. The suite covers authentication/CSRF, throttles, routed checkout, idempotency, variants/inventory, coupons/shipping, snapshots, payment/order/return transitions, admin operations, public input validation, and seeding.

With a valid development SQL Server environment, also run:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
```

The repository CI runs isolated checks plus frontend lint/tests/type/build, Compose and disposable container/recovery/security gates. Browser/SQL integration lanes are separately dispatched; see [TESTING](../docs/TESTING.md). External provider sandbox evidence remains pending provider selection. The strict image release gate currently blocks the backend; see [FINAL_REVIEW](../docs/audit/FINAL_REVIEW.md).

## Docker

Use the root Compose workflow for the full application:

```powershell
Set-Location ..
Copy-Item .env.docker.example .env
# Set required secrets in .env.
docker compose up --build
```

The backend container installs ODBC Driver 18, waits for the Compose SQL Server service, applies enabled startup tasks, and runs Gunicorn. See [the Docker guide](../docs/DOCKER_SETUP.md).
