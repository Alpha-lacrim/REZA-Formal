#!/usr/bin/env bash
set -euo pipefail

python - <<'PY'
import os
import sys
import time

import pyodbc

host = os.environ.get("DB_HOST", "db")
port = os.environ.get("DB_PORT", "1433")
user = os.environ.get("DB_USER", "sa")
password = os.environ.get("DB_PASSWORD", "")
driver = os.environ.get("DB_DRIVER", "ODBC Driver 18 for SQL Server")
encrypt = os.environ.get("DB_ENCRYPT", "no")
trust = os.environ.get("DB_TRUST_SERVER_CERTIFICATE", "yes")
timeout = int(os.environ.get("DB_WAIT_TIMEOUT", "180"))
# A runtime-only login need not have access to master. Only auto-create uses it.
database = "master" if os.environ.get("DB_AUTO_CREATE", "true") == "true" else os.environ.get("DB_NAME", "reza")

server = host if "\\" in host else f"{host},{port}"
connection = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={user};"
    f"PWD={password};"
    f"Encrypt={encrypt};"
    f"TrustServerCertificate={trust};"
    "Connection Timeout=5;"
)

deadline = time.monotonic() + timeout
print('Waiting for SQL Server', flush=True)

while True:
    try:
        with pyodbc.connect(connection, autocommit=True) as conn:
            conn.cursor().execute("SELECT 1")
        print("SQL Server is available", flush=True)
        sys.exit(0)
    except Exception:
        if time.monotonic() >= deadline:
            print("Timed out waiting for SQL Server; check database availability and configuration", file=sys.stderr, flush=True)
            sys.exit(1)
        time.sleep(min(2, max(0, deadline - time.monotonic())))
PY
