FROM python:3.11-slim-bookworm@sha256:2333bd330d12de02514770b3585cad313644316047cdee24a7acfdece6de6efb AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/opt/venv/bin:${PATH}"

FROM base AS dependencies
# Optional public mirror for build connectivity. Never pass credentials as ARGs.
ARG PIP_INDEX_URL=https://pypi.org/simple
COPY requirements.txt /tmp/requirements.txt
RUN python -m venv /opt/venv \
    && pip install --require-hashes --only-binary=:all: -r /tmp/requirements.txt \
    && pip check
RUN pip uninstall --yes pip setuptools

FROM base AS runtime

WORKDIR /app

ADD --checksum=sha256:8434dcb8c346dc95fbd63dbece056c343704590b58b6a5c323d39acf52bf0b48 \
    https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb /tmp/packages-microsoft-prod.deb
RUN dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
        ca-certificates libgssapi-krb5-2 unixodbc msodbcsql18=18.6.2.1-1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=dependencies /opt/venv /opt/venv

COPY . .
RUN /usr/local/bin/python -m pip uninstall --yes pip setuptools \
    && rm -rf /usr/local/lib/python3.11/ensurepip \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/media /app/staticfiles \
    && chown app:app /app/media /app/staticfiles \
    && chmod 755 /app/media /app/staticfiles /app/wait_for_db.sh /app/docker-entrypoint.sh

USER 10001:10001

EXPOSE 8000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
    CMD ["python", "/app/healthcheck.py", "live"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "--config", "/app/gunicorn.conf.py", "reza_backend.wsgi:application"]
