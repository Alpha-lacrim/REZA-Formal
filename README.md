# REZA Formal

REZA Formal is a full-stack e-commerce website for formal menswear. The project includes a React/Vite storefront, a Django REST API, SQL Server persistence, admin/product/order management, authentication, cart and wishlist flows, and Docker support for running the whole stack locally.

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router, Lucide icons
- Backend: Django, Django REST Framework, Simple JWT cookie auth
- Database: Microsoft SQL Server via `mssql-django` and `pyodbc`
- Containers: Docker Compose, SQL Server 2022, Gunicorn, Nginx

## Quick Start With Docker

Prerequisites:

- Docker Desktop running
- Git

From the repository root:

```powershell
cd C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal
Copy-Item .env.docker.example .env
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/products/
- Django admin: http://localhost:8000/admin/

Default local admin:

```text
Email: admin@reza.com
Password: admin
```

Docker Compose starts:

- `db`: SQL Server 2022 Developer
- `backend`: Django API with migrations, static collection, and seed data
- `frontend`: production Vite build served by Nginx, proxying `/api/` and `/media/`

More details are in [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md).

## Manual Local Development

Use this path if you want to run the backend and frontend directly on your machine instead of Docker.

### Backend

Create `backend/.env` from the example and set your SQL Server credentials:

```powershell
cd backend
Copy-Item .env.example .env
```

Install and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Backend runs at:

```text
http://localhost:8000
```

### Frontend

In another terminal:

```powershell
cd frontend
npm install
npm.cmd run dev
```

Frontend usually runs at:

```text
http://localhost:3000
```

If port `3000` is busy, Vite may offer another port.

## Useful Commands

Docker:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose down -v
```

Frontend:

```powershell
cd frontend
npm.cmd run build
```

Backend:

```powershell
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run
```

## Project Structure

```text
REZA-Formal/
  backend/                  Django REST API
  frontend/                 React/Vite storefront
  docs/                     Setup and analysis documentation
  docker-compose.yml        Full local Docker stack
  .env.docker.example       Docker Compose environment template
```

## Configuration Notes

- Root `.env` is used by Docker Compose and is intentionally ignored by Git.
- `backend/.env` is used when running Django manually and is also ignored by Git.
- Uploaded media, local databases, virtual environments, Python cache files, and build output are ignored.
- For Docker, update `.env` if ports or passwords need to change.

## Documentation

- [Docker setup](docs/DOCKER_SETUP.md)
- [Frontend/backend connection guide](FRONTEND_BACKEND_CONNECTION.md)
- [SQL Server migration notes](SQL_SERVER_MIGRATION_SUMMARY.md)
- [Codebase analysis](docs/CODEBASE_ANALYSIS_2026-06-28.md)
- [Changes performed](docs/CHANGES_PERFORMED_2026-06-28.md)
