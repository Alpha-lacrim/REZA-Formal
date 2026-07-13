# Docker setup

Run the full local stack from the repository root.

## 1. Configure the environment

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Setup-DevelopmentEnv.ps1
```

The script creates ignored root `.env` and `backend/.env` files when needed, removes obsolete frontend Gemini variables, and securely generates these required values without printing them:

- `DJANGO_SECRET_KEY`: a long random Django signing key
- `DB_PASSWORD`: a strong SQL Server `sa` password containing uppercase, lowercase, number, and symbol

Compose rejects empty values instead of silently using checked-in credentials.

Later script runs preserve existing non-empty root secrets. Use `-RotateSecrets` only for an intentional rotation; an existing SQL Server volume keeps its original `sa` password and must be updated separately or intentionally reset.

Admin creation is optional. Set both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` to create a local admin during `seed_data`; leave both empty to skip it. `DJANGO_SUPERUSER_USERNAME` defaults to `admin`.

Do not commit `.env`.

## 2. Build and start

```powershell
docker compose config --quiet
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/products/
- Django admin: http://localhost:8000/admin/
- Backend readiness: http://localhost:8000/api/health/ready/

## Services

- `db`: SQL Server 2022 Developer with the persistent `mssql_data` volume.
- `backend`: installs ODBC Driver 18, waits for SQL Server with `pyodbc`, optionally creates the database, applies migrations, collects static assets, seeds idempotent data, and starts Gunicorn.
- `frontend`: builds the Vite application and serves it with Nginx. Nginx proxies `/api/` to Django and serves `/media/` from the read-only `django_media` volume shared with the backend.

All three services expose health checks. SQL Server must answer a real query, backend readiness must answer a database query, and frontend readiness verifies that Nginx can proxy backend readiness. Compose starts dependent services only after the dependency is healthy.

The seed command bootstraps products only when the catalog is empty and shipping methods only when none exist. Keeping `RUN_SEED_DATA=true` is convenient for development and does not recreate one intentionally deleted record while other records remain; production operators can set it to `false` after controlled bootstrap.

SQL Server and the direct Django port are published only on `127.0.0.1`. The frontend is published on `FRONTEND_PORT` and containers use the private Compose network internally.

`VITE_API_BASE=/api` is valid for the container build: the frontend API helper recognizes the prefix without duplicating `/api`, and Nginx forwards those requests to Django.

## Useful commands

```powershell
docker compose ps
docker compose logs -f db
docker compose logs -f backend
docker compose logs -f frontend
docker compose up -d --build
docker compose down
```

To rebuild only one service:

```powershell
docker compose build backend
docker compose up -d backend
```

To delete the database, uploaded-media, and collected-static volumes and start from scratch:

```powershell
docker compose down -v
```

`down -v` permanently removes local container data; use it only when a reset is intended.

## Configuration reference

Common root `.env` settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django signing secret | Required |
| `DB_PASSWORD` | Shared SQL Server/Django password | Required |
| `DB_USER` | SQL login used by Django/startup; local Compose must remain `sa` unless another privileged login was provisioned first | `sa` |
| `DB_NAME` | Application database | `reza` |
| `FRONTEND_PORT` | Host storefront port | `3000` |
| `BACKEND_PORT` | Host Django port | `8000` |
| `MSSQL_PORT` | Host SQL Server port | `1433` |
| `DB_WAIT_TIMEOUT` | Backend startup wait in seconds | `180` |
| `RUN_MIGRATIONS` | Apply migrations at backend startup | `true` |
| `RUN_COLLECTSTATIC` | Collect Django static files | `true` |
| `RUN_SEED_DATA` | Bootstrap empty catalog/shipping, settings, and optional admin | `true` |
| `DB_AUTO_CREATE` | Create `DB_NAME` when absent | `true` |
| `VITE_API_BASE` | Frontend API origin or prefix | `/api` |
| `GOOGLE_OAUTH_CLIENT_ID` | Backend Google token audience; blank disables it | Blank |
| `AUTH_COOKIE_SECURE` | Send JWT cookies only over HTTPS | `False` locally |
| `AUTH_COOKIE_SAMESITE` | Access-cookie SameSite policy (`Lax` or `Strict`) | `Lax` |
| `AUTH_REFRESH_COOKIE_SAMESITE` | Refresh-cookie SameSite policy | `Strict` |
| `TRUST_X_FORWARDED_PROTO` | Trust a proxy's forwarded HTTPS scheme | `False` |

For a non-local deployment, also review `DJANGO_DEBUG`, `ALLOWED_HOSTS`, `ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, cookie/HTTPS/HSTS controls, encryption options, persistent media storage, and the seeded-admin settings. Enable secure cookies and redirects only after HTTPS and trusted proxy forwarding are verified, or login redirect/cookie loops can result.

## Troubleshooting

### Compose reports a required variable is missing

Set non-empty `DJANGO_SECRET_KEY` and `DB_PASSWORD` values in the root `.env`. Confirm that you are running Compose from the repository root.

### SQL Server never becomes ready

Check `docker compose logs db` first. SQL Server rejects passwords that do not satisfy its complexity policy. If credentials were changed after the data volume was created, the existing SQL Server instance still has the original password; restore it or intentionally reset with `docker compose down -v`.

### Port is already in use

Change `FRONTEND_PORT`, `BACKEND_PORT`, or `MSSQL_PORT` in `.env`, then restart Compose.

The setup helper can update the ignored SQL host mapping without displaying any secret values:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Setup-DevelopmentEnv.ps1 -MssqlPort 11433
```

This does not change the container-to-container database port, which remains `1433`.

### Frontend receives API errors

Check `docker compose logs backend`, then confirm `VITE_API_BASE=/api` and rebuild the frontend because Vite environment variables are embedded at build time.
