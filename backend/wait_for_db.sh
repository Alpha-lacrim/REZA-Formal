#!/usr/bin/env bash
# Wait for SQL Server to be available, then exit
set -e

host="${DB_HOST:-localhost}"
port="${DB_PORT:-1433}"
user="${DB_USER:-sa}"
password="${DB_PASSWORD:-}"

echo "Waiting for SQL Server at $host:$port..."

# Try to connect using sqlcmd with a simple query
until sqlcmd -S "$host,$port" -U "$user" -P "$password" -Q "SELECT 1" -b > /dev/null 2>&1; do
  printf '.'
  sleep 1
done

echo "SQL Server is available"
