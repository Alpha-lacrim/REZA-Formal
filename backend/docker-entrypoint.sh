#!/usr/bin/env bash
set -euo pipefail

/app/wait_for_db.sh

if [[ "${DB_AUTO_CREATE:-true}" == "true" ]]; then
python - <<'PY'
import os
import re

import pyodbc

db_name = os.environ.get("DB_NAME", "reza")
if not re.fullmatch(r"[A-Za-z0-9_.-]+", db_name):
    raise SystemExit(f"Unsafe DB_NAME for auto-create: {db_name!r}")

host = os.environ.get("DB_HOST", "db")
port = os.environ.get("DB_PORT", "1433")
server = host if "\\" in host else f"{host},{port}"
driver = os.environ.get("DB_DRIVER", "ODBC Driver 18 for SQL Server")
connection = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    "DATABASE=master;"
    f"UID={os.environ.get('DB_USER', 'sa')};"
    f"PWD={os.environ.get('DB_PASSWORD', '')};"
    f"Encrypt={os.environ.get('DB_ENCRYPT', 'no')};"
    f"TrustServerCertificate={os.environ.get('DB_TRUST_SERVER_CERTIFICATE', 'yes')};"
    "Connection Timeout=30;"
)

db_literal = db_name.replace("'", "''")
db_identifier = db_name.replace("]", "]]")
sql = f"IF DB_ID(N'{db_literal}') IS NULL CREATE DATABASE [{db_identifier}]"

with pyodbc.connect(connection, autocommit=True) as conn:
    conn.cursor().execute(sql)
print(f"Database ready: {db_name}", flush=True)
PY
fi

if [[ "${RUN_MIGRATIONS:-true}" == "true" ]]; then
    python manage.py migrate --noinput
fi

if [[ "${RUN_COLLECTSTATIC:-true}" == "true" ]]; then
    python manage.py collectstatic --noinput
fi

if [[ "${RUN_SEED_DATA:-true}" == "true" ]]; then
    python manage.py seed_data
fi

exec "$@"
