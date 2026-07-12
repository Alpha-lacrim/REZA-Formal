# REZA Formal

REZA Formal is a full-stack e-commerce site for formal menswear. It combines a React/Vite storefront with a Django REST API, Microsoft SQL Server persistence, cookie-based JWT authentication, product/order administration, and local Docker support.

## Stack

- Frontend: React 19, TypeScript, Vite, React Router
- Backend: Django, Django REST Framework, Simple JWT
- Database: Microsoft SQL Server via `mssql-django` and `pyodbc`
- Containers: Docker Compose, Gunicorn, and Nginx

## Full stack with Docker

Prerequisites are Git and a running Docker Desktop installation.

From the repository root:

```powershell
Copy-Item .env.docker.example .env
# Edit .env and set DJANGO_SECRET_KEY and DB_PASSWORD.
docker compose up --build
```

`DJANGO_SECRET_KEY` should be a long random value. `DB_PASSWORD` must satisfy SQL Server's password policy (at least eight characters with uppercase, lowercase, number, and symbol). Compose refuses to start when either is empty.

Admin creation is optional. To create a local admin during seeding, set both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` in `.env`; leaving both empty skips admin creation. Never commit this file.

Open:

- Storefront: http://localhost:3000
- Product API: http://localhost:8000/api/products/
- Django admin: http://localhost:8000/admin/

Compose starts:

- `db`: SQL Server 2022 Developer with persistent `mssql_data`
- `backend`: Gunicorn/Django after database wait, optional database creation, migrations, static collection, and idempotent seed data
- `frontend`: a production Vite build served by Nginx; `/api/` is proxied to Django and `/media/` is served from the shared read-only media volume

The database and direct backend ports bind to `127.0.0.1`; containers communicate through the private Compose network. See [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md) for configuration and reset instructions.

## Manual local development

### Backend

Use the project-tested Python 3.11/3.12 baseline; the container uses 3.11 and the existing ignored local virtual environment was created with 3.12. Install Microsoft ODBC Driver 17 or change `DB_DRIVER` to a compatible locally installed driver. Ensure SQL Server is running and the target database exists.

```powershell
Set-Location backend
Copy-Item .env.example .env
# Edit .env with the local SQL Server connection and Django secret.
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

The backend listens on http://localhost:8000 by default.

### Frontend

In another terminal:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

The frontend listens on http://localhost:3000. Its Vite server proxies `/api` and `/media` to `http://localhost:8000`, so the backend must also be running.

## Verification commands

```powershell
# Frontend
Set-Location frontend
npm.cmd run typecheck
npm.cmd run build

# Backend tests (from backend/; no SQL Server connection required)
Set-Location ..\backend
python manage.py test --settings=reza_backend.test_settings

# Backend configuration checks (with a valid SQL Server environment)
python manage.py check
python manage.py makemigrations --check --dry-run

# Compose (from the repository root, with root .env configured)
Set-Location ..
docker compose config --quiet
```

## Deployment

`vercel.json` is intentionally frontend-only. It installs and builds `frontend/` and publishes `frontend/dist`. The application uses hash-based routing, so server-side SPA rewrites are unnecessary. Before a Vercel deployment, set `VITE_API_BASE` to the public HTTPS origin of the separately hosted Django API.

The Django application depends on SQL Server, native ODBC support, uploaded-media persistence, and startup migrations. Deploy it on a persistent container/application host rather than through the old Vercel Python configuration.

Cookie auth currently requires the frontend and API to remain **same-site**, for example `www.example.com` and `api.example.com` (a custom Vercel domain is fine). A default `project.vercel.app` frontend plus an unrelated API host will not receive `SameSite=Lax/Strict` cookies. Use same-site custom domains or a same-origin API proxy; a genuinely cross-site design requires a complete CSRF-protected auth redesign and must account for browser third-party-cookie restrictions. Also configure allowed hosts/origins and secure-cookie/HTTPS proxy settings for the actual topology. Google login additionally requires a configured backend `GOOGLE_OAUTH_CLIENT_ID` and a frontend Google Identity flow that supplies a verified ID token.

## Project structure

```text
REZA-Formal/
  backend/                  Django REST API
  frontend/                 React/Vite storefront
  docs/                     Setup and audit notes
  docker-compose.yml        Full local container stack
  .env.docker.example       Root Compose environment template
  vercel.json               Frontend-only Vercel build config
```

## Configuration and hygiene

- Root `.env` is read by Docker Compose; `backend/.env` is read by manual Django runs. Both are ignored.
- Uploaded media, local databases, virtual environments, Python caches, cookie jars, archives, dependencies, and build output are ignored.
- `frontend/services/api.ts` is the primary server integration. `frontend/services/db.ts` is only a read-only emergency catalog fallback.
- OTP delivery is intentionally disabled until a separately verified delivery/enrollment flow is implemented.

## More documentation

- [Docker setup](docs/DOCKER_SETUP.md)
- [Frontend/backend connection](FRONTEND_BACKEND_CONNECTION.md)
- [SQL Server configuration](SQL_SERVER_MIGRATION_SUMMARY.md)
- [Codebase analysis snapshot](docs/CODEBASE_ANALYSIS_2026-06-28.md)
- [Changes snapshot](docs/CHANGES_PERFORMED_2026-06-28.md)
