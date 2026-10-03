# Debian 13 carries security fixes unavailable in Debian 12. Keep Python/ODBC pins.
FROM python:3.11.17-slim-trixie@sha256:bab1b7ef4b450c81002278d035eff85ebe394ae94df904f7a3ba14f7e16e487b AS base

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

ADD --checksum=sha256:d0c2f69250c6ce0d4c6220b142f999d039a3c560af7f980b943687d106ca8e38 \
    https://packages.microsoft.com/config/debian/13/packages-microsoft-prod.deb /tmp/packages-microsoft-prod.deb
RUN dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    # Apply same-release security updates newer than the pinned base image.
    && apt-get upgrade -y --no-install-recommends \
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
    && chmod 755 /app/media /app/staticfiles /app/wait_for_db.sh /app/docker-entrypoint.sh \
    # The application and maintenance jobs do not use setuid/setgid executables.
    && find /usr /opt -xdev -type f -perm /6000 -exec chmod a-s {} +

USER 10001:10001

EXPOSE 8000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=3 \
    CMD ["python", "/app/healthcheck.py", "live"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "--config", "/app/gunicorn.conf.py", "reza_backend.wsgi:application"]
