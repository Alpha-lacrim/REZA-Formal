#!/usr/bin/env bash
# Wait for MySQL to be available, then exit
set -e
host="${DB_HOST:-db}"
port="${DB_PORT:-3306}"
echo "Waiting for MySQL at $host:$port..."
until mysqladmin ping -h"$host" -P"$port" --silent; do
  printf '.'
  sleep 1
done
echo "MySQL is available"
