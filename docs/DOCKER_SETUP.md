# Docker Setup

Run these commands from the project root:

```powershell
cd C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal
Copy-Item .env.docker.example .env
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/products/
- Django admin: http://localhost:8000/admin/

Default local Docker credentials:

- Email: `admin@reza.com`
- Password: `admin`

## Services

- `db`: SQL Server 2022 Developer container with persistent `mssql_data`.
- `backend`: Django REST API using Gunicorn, SQL Server ODBC Driver 18, automatic DB create, migrations, static collection, and seed data.
- `frontend`: Vite production build served by Nginx. Nginx proxies `/api/` and `/media/` to the backend service.

## Useful Commands

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you want to delete Docker database/media volumes and start fresh.

## Configuration

Docker Compose reads `.env` from the project root. The important values are:

```env
DB_PASSWORD=RezaFormal!2026
FRONTEND_PORT=3000
BACKEND_PORT=8000
MSSQL_PORT=1433
VITE_API_BASE=/api
```

If a port is already in use, change the matching value in `.env` before running Compose.
