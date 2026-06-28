FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for SQL Server connectivity (ODBC driver)
RUN apt-get update && apt-get install -y \
    pkg-config \
    build-essential \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Install ODBC Driver 17 for SQL Server
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Copy and make wait script executable
RUN chmod +x /app/wait_for_db.sh || true

CMD ["/bin/bash", "-c", "/app/wait_for_db.sh && gunicorn reza_backend.wsgi:application --bind 0.0.0.0:8000"]
