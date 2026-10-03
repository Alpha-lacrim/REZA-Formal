# Supported Alpine/ODBC runtime; retain Python and the complete dependency lock.
# See docs/adr/0002-backend-runtime-base.md for compatibility and scan evidence.
FROM python:3.11.17-alpine3.23@sha256:24e229dd5d67f3409879a2ff50c22e6490b5b39394cf3c78707ea6d33ba65e8a AS base

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

FROM base AS odbc-packages
# Microsoft detached signatures verified before pinning these package checksums.
# Only the selected architecture is installed; downloads stay outside runtime layers.
ADD --checksum=sha256:9ff10ec65dcbbe9ad57ed7fca648d8e7d09d4a25fc3c1095046f36a29f86b84a \
    https://download.microsoft.com/download/ade174b7-8cea-4543-91a6-c33ae320c2f0/msodbcsql18_18.7.1.1-1_amd64.apk /drivers/msodbcsql18-amd64.apk
ADD --checksum=sha256:d42f31124b2eb88633ed1ef5159add84541149d2ecebacdfa6e638719e26a48c \
    https://download.microsoft.com/download/ade174b7-8cea-4543-91a6-c33ae320c2f0/msodbcsql18_18.7.1.1-1_arm64.apk /drivers/msodbcsql18-arm64.apk

FROM base AS runtime

WORKDIR /app

ARG TARGETARCH
RUN --mount=type=bind,from=odbc-packages,source=/drivers,target=/drivers \
    case "$TARGETARCH" in amd64|arm64) ;; *) echo 'Unsupported ODBC architecture'; exit 1 ;; esac \
    # Apply security updates within the supported Alpine release.
    && apk upgrade --no-cache \
    && apk add --no-cache bash ca-certificates krb5-libs unixodbc openssl findutils \
    # Microsoft's APK uses a detached signature, so APK's own trust flag is needed.
    # ADD checksums enforce the previously verified Microsoft package bytes.
    && ACCEPT_EULA=Y apk add --no-cache --allow-untrusted "/drivers/msodbcsql18-${TARGETARCH}.apk"

COPY --from=dependencies /opt/venv /opt/venv

COPY . .
RUN /usr/local/bin/python -m pip uninstall --yes pip setuptools \
    && rm -rf /usr/local/lib/python3.11/ensurepip \
    && addgroup -g 10001 app \
    && adduser -D -H -u 10001 -G app -s /sbin/nologin app \
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
