FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for building mysqlclient
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    default-mysql-client \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
# ------------------------

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Copy and make wait script executable
RUN chmod +x /app/wait_for_db.sh || true

CMD ["/bin/bash", "-c", "/app/wait_for_db.sh && gunicorn reza_backend.wsgi:application --bind 0.0.0.0:8000"]
