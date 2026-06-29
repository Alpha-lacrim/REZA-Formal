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

server = host if "\\" in host else f"{host},{port}"
connection = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    "DATABASE=master;"
    f"UID={user};"
    f"PWD={password};"
    f"Encrypt={encrypt};"
    f"TrustServerCertificate={trust};"
    "Connection Timeout=5;"
)

deadline = time.time() + timeout
print(f"Waiting for SQL Server at {server}...", flush=True)

while True:
    try:
        with pyodbc.connect(connection, autocommit=True) as conn:
            conn.cursor().execute("SELECT 1")
        print("SQL Server is available", flush=True)
        sys.exit(0)
    except Exception as exc:
        if time.time() >= deadline:
            print(f"Timed out waiting for SQL Server: {exc}", file=sys.stderr, flush=True)
            sys.exit(1)
        print(".", end="", flush=True)
        time.sleep(2)
PY
