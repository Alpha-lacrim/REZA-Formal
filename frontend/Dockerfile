FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build

WORKDIR /app

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# This image's CSP, API proxy and cookies require the same-origin API contract.
RUN case "$VITE_API_BASE" in ""|"/api"|"/api/") ;; *) exit 1 ;; esac \
    && npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8

COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --timeout=4 -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# Bypass image templates: configuration is baked in, filesystem can be read-only.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
