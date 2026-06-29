Backend Django app for REZA Formal

Quick start

1. Create a virtualenv and install:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Configure SQL Server connection:
   - Copy `.env.example` to `.env`
   - Update the SQL Server connection settings:
     - `DB_HOST`: Your SQL Server instance (e.g., `localhost\SQLEXPRESS` or IP address)
     - `DB_NAME`: Database name
     - `DB_USER`: Database user (e.g., `sa`)
     - `DB_PASSWORD`: Database password
     - `DB_PORT`: Default is `1433`
     - `DB_DRIVER`: ODBC driver (default: `ODBC Driver 17 for SQL Server`)

3. Ensure SQL Server is running and the connection is valid.

4. Run migrations and seed data:
```bash
python manage.py migrate
python manage.py loaddata
python manage.py seed_data
```

5. Run dev server:
```bash
python manage.py runserver
```

Docker deployment:
- Use the root Compose file from the project root:
```bash
cd ..
cp .env.docker.example .env
docker compose up --build
```
- Compose starts SQL Server, Django, and the frontend together.
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- See `docs/DOCKER_SETUP.md` for the full Docker workflow.
