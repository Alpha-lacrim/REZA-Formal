Backend Django app for REZA Formal

Quick start

1. Create a virtualenv and install:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
2. Copy `.env.example` to `.env` and adjust `DATABASE_URL`.
3. Run migrations and seed data:
```bash
python manage.py migrate
python manage.py loaddata
python manage.py seed_data
```
4. Run dev server:
```bash
python manage.py runserver
```

Recommended: Use Docker compose for MySQL (`docker-compose up --build`).
