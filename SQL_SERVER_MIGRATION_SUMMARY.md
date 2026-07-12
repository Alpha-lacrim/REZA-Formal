# SQL Server configuration summary

This document describes the current SQL Server integration. It supersedes the older migration notes that no longer matched the Docker stack.

## Current architecture

- Django uses the `mssql` database engine provided by `mssql-django`.
- Python connects through `pyodbc`.
- Manual development connects to an existing SQL Server instance configured in `backend/.env`.
- Docker Compose starts SQL Server 2022 Developer as the `db` service and stores its data in the `mssql_data` named volume.
- The backend container installs Microsoft ODBC Driver 18. The manual-development example defaults to Driver 17 because that is common on the existing Windows setup; set `DB_DRIVER` to a driver actually installed on the machine.

## Environment variables

| Variable | Description | Typical Docker value |
| --- | --- | --- |
| `DB_NAME` | Application database name | `reza` |
| `DB_USER` | SQL login; local Compose must use `sa` unless another privileged login is already provisioned | `sa` |
| `DB_PASSWORD` | SQL login password | Required secret |
| `DB_HOST` | SQL Server hostname or named instance | `db` |
| `DB_PORT` | SQL Server TCP port | `1433` |
| `DB_DRIVER` | Installed ODBC driver name | `ODBC Driver 18 for SQL Server` |
| `DB_ENCRYPT` | ODBC encryption option | `no` for local Compose |
| `DB_TRUST_SERVER_CERTIFICATE` | Certificate trust option | `yes` for local Compose |
| `DB_CONNECTION_TIMEOUT` | Django connection timeout in seconds | `30` |
| `DB_WAIT_TIMEOUT` | Container startup wait in seconds | `180` |
| `DB_AUTO_CREATE` | Create `DB_NAME` when absent at container startup | `true` |

Root `.env` supplies Docker Compose. `backend/.env` supplies a manual Django run. Both are ignored by Git; use `.env.docker.example` and `backend/.env.example` as templates.

## Container startup sequence

`backend/docker-entrypoint.sh` performs these enabled steps in order:

1. `backend/wait_for_db.sh` retries a `pyodbc` connection to the `master` database.
2. `DB_AUTO_CREATE=true` safely creates `DB_NAME` when it is absent.
3. `RUN_MIGRATIONS=true` applies Django migrations.
4. `RUN_COLLECTSTATIC=true` collects static files.
5. `RUN_SEED_DATA=true` runs the idempotent product/site seed and optionally creates an environment-configured admin.
6. Gunicorn starts the WSGI application.

Compose requires a non-empty `DB_PASSWORD` instead of falling back to a checked-in password. SQL Server enforces password complexity. Changing `.env` does not change the `sa` password inside an already initialized `mssql_data` volume.

## Manual Windows setup

1. Install Microsoft ODBC Driver 17 or 18 for SQL Server.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set the local host/instance, driver, database, login, and password.
4. Ensure the target database exists and the login can access it.
5. Install requirements and run checks/migrations:

```powershell
Set-Location backend
python -m pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py seed_data
```

For named instances such as `localhost\SQLEXPRESS`, the backend omits `DB_PORT` from the effective server name. For a TCP hostname/IP, ensure SQL Server TCP/IP is enabled and the configured port is reachable.

## Version compatibility

`backend/requirements.txt` requires `mssql-django>=1.7.3,<1.8`. That supported release line recognizes SQL Server 2025, so the old runtime monkey patch that capped the reported server version has been removed. Keep the dependency constraint and test database checks before moving to a different `mssql-django` minor release.

## Credential remediation

An earlier tracked version of this document contained a literal SQL password. The current tree has been scrubbed, but editing the file does not erase Git history.

Required user actions if that value was ever used:

1. Rotate the SQL login password everywhere it may still be active.
2. Update only ignored/local secret stores and deployment secret managers.
3. If the repository was shared or pushed, purge the old blob with a history-rewriting tool such as `git filter-repo`, coordinate the forced update with collaborators, and invalidate cached/forked copies where possible.

History rewriting is intentionally not performed automatically because it changes commit identities and requires repository-owner coordination.
