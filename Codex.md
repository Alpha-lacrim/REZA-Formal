# Codex Project Context

Last verified: 2026-09-14 (Batch 2; isolated regression/baseline results in Handoff)

## Purpose and product

REZA Formal is a Persian-first, RTL e-commerce site for formal menswear. It has React customer/staff interfaces, a Django REST API, Microsoft SQL Server persistence, CSRF-protected cookie JWT authentication, variant inventory, server-priced checkout, order/payment/return workflows, lead/content management, and local Docker orchestration.

This file contains durable project context for later coding sessions. Put chronological work notes in `Handoff.md`, and put session behavior rules in `AGENTS.md`.

The remediation baseline and stable finding IDs live in [docs/audit/AUDIT_INDEX.md](docs/audit/AUDIT_INDEX.md). [docs/ROADMAP.md](docs/ROADMAP.md) owns batch sequencing and decision gates; [docs/CODEX_PROGRAM.md](docs/CODEX_PROGRAM.md) owns program/Git provenance. Keep detailed findings out of this project map.

## Repository boundaries

- Active Git root: `C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal`
- `frontend/`: React 19 + TypeScript + Vite single-page application.
- `backend/`: Django + Django REST Framework application.
- `docs/`: setup, audit, and operational notes.
- `docker-compose.yml`: local SQL Server, backend, and frontend stack.
- The parent workspace contains archives and tooling that are not part of the active application repository.

## Runtime architecture

### Frontend

- Entry: `frontend/index.html` -> `frontend/index.tsx` -> `frontend/App.tsx`.
- Routing: `HashRouter`, so browser routes live after `#` and static hosting does not need server-side route rewrites.
- Shared state: `frontend/contexts/GlobalContext.tsx` owns authentication, products, variant-aware cart, wishlist, account synchronization, catalog-source safety, theme, site settings, and toast messages.
- Catalog requests derive from resolved session state; catalog results belong to that identity. Admin catalog failures expose no partial public catalog, and logout invalidates outstanding admin loads.
- API boundary: `frontend/services/api.ts` performs HTTP calls and converts Django snake_case/nested responses into the UI's models from `frontend/types.ts`.
- Local fallback: `frontend/services/db.ts` exposes only a read-only emergency catalog based on `frontend/data.ts`. It is used only when the product API is unavailable and never reports local admin writes as server success.
- Main feature surfaces: lazy-loaded routes in `frontend/pages/` and shared UI in `frontend/components/`. Tailwind is compiled locally through PostCSS; no runtime Tailwind CDN is used.
- Static product/site assets: `frontend/public/images/`.

### Backend

- Project configuration: `backend/reza_backend/settings.py` and `backend/reza_backend/urls.py`.
- API application: `backend/shop/`.
- API routes: `backend/shop/urls.py`.
- Models: `backend/shop/models.py` contains users/products/variants, addresses, shipping/coupons, orders/items/payments/events, inventory movements, saved carts/wishlists, reviews, returns, bespoke/newsletter records, notification outbox, messages, and site settings.
- Request logic: auth/catalog/content surfaces remain in `backend/shop/views.py`; commerce views, serializers, and transactional rules live in `commerce_views.py`, `commerce_serializers.py`, and `commerce_services.py`.
- Active order URLs resolve to `commerce_views.py`; similarly named legacy order handlers in `views.py` remain importable but are not routed. Native Django `/admin/` is a separate model-editing surface from REST `/api/admin/`; inspect `shop/admin.py` when changing write invariants.
- Authentication: HttpOnly access/refresh JWT cookies through `backend/shop/auth.py`; the frontend bootstraps `/api/auth/csrf/` and sends `X-CSRFToken` for every unsafe browser request. Header JWT clients remain usable without cookie CSRF.
- Persistence: Microsoft SQL Server through `mssql-django` and `pyodbc` for normal runs. Any SQLite test settings are test-only and must not be confused with production configuration.
- Seed command: `python manage.py seed_data`; it bootstraps catalog records only when the catalog is empty and shipping only when none exists, and never publishes or logs a fixed administrator password.
- Hermetic tests: `backend/shop/tests.py` plus focused `test_*.py` modules use `backend/reza_backend/test_settings.py`, in-memory SQLite, and never touch configured SQL Server.
- Uploaded files: Django media storage under `backend/media/` locally or the mounted `/app/media` volume in Docker. Runtime media is ignored by Git.
- Product uploads use `shop/product_media.py`: decoded/re-encoded still images, bounded files/dimensions/gallery count, URL validation and cleanup of newly staged files on failed product writes. Safe inline legacy galleries convert to files on edit; existing files are retained for historical references.
- Native Django product/variant/order/payment/return screens are inspection-only. Their write operations use the existing service-backed REST/staff UI, including stock ledger and lifecycle guards.
- Refund allocations/entries use existing Payment metadata plus OrderEvent records through `shop/refunds.py`; no new schema. Net item allocations derive from immutable purchase amounts, exclude shipping/tax, and reconcile rounding. Manual refunds require amount, currency, reason, per-payment reference and explicit offline-transfer confirmation. Inconsistent legacy refund history requires reconciliation.

### Docker request flow

The `frontend` image builds Vite assets and serves them with Nginx. Nginx proxies `/api/` to Gunicorn and serves `/media/` from the read-only shared volume. The backend waits for SQL Server, optionally creates the database, applies migrations, collects static files, and runs bootstrap data before Gunicorn. Compose health checks form a real dependency chain: SQL query -> Django readiness query -> Nginx-proxied readiness.

The complete stack was first-launch tested on Windows/Docker Desktop on 2026-07-13. This workstation uses ignored `MSSQL_PORT=11433` because Windows rejected host port `1433`; services still connect to `db:1433` inside Compose.

## Important files

| File | Why it matters |
| --- | --- |
| `AGENTS.md` | Mandatory session workflow and continuity-file responsibilities. |
| `Handoff.md` | Newest-first record of changes, checks, incomplete work, and owner actions. |
| `README.md` | Supported local and Docker entry points. |
| `docker-compose.yml` | Complete local multi-container topology and environment wiring. |
| `scripts/Setup-DevelopmentEnv.ps1` | Creates ignored development env files, generates required secrets without displaying them, synchronizes the fresh database password, and removes obsolete Gemini variables. |
| `.env.docker.example` | Names and safe examples for Docker configuration; never add real secrets. |
| `frontend/package.json` | Frontend scripts and dependency contract. |
| `frontend/vite.config.ts` | Vite build and development-server behavior. |
| `frontend/contexts/GlobalContext.tsx` | Cross-application UI state and actions. |
| `frontend/services/api.ts` | Authoritative frontend/Django API adapter and response normalization. |
| `frontend/services/db.ts` | Read-only emergency product-catalog fallback only. |
| `frontend/types.ts` | Canonical UI data shapes. |
| `backend/reza_backend/settings.py` | Django, SQL Server, CORS, JWT, static, and media configuration. |
| `backend/shop/urls.py` | Public API surface. |
| `backend/shop/views.py` | Authentication, products, settings, contact and older staff endpoints; retains unrouted legacy order handlers. |
| `backend/shop/models.py` | Persistent data model and order relationships. |
| `backend/shop/commerce_services.py` | Quotes, idempotent checkout, locking, inventory, refunds, and lifecycle transitions. |
| `backend/shop/refunds.py` | Net item allocation, remaining refund bounds, reference replay and recorded financial totals. |
| `backend/shop/product_media.py` | Shared product image validation, gallery normalization and storage staging. |
| `frontend/tests/` | Mounted React auth/media and API transport regressions using Node's test runner, React Testing Library and jsdom. |
| `backend/shop/commerce_views.py` | Customer and staff commerce endpoints. |
| `backend/shop/commerce_serializers.py` | Commerce validation, client aliases, and immutable response snapshots. |
| `backend/shop/management/commands/seed_data.py` | Idempotent initial data/bootstrap behavior. |
| `backend/shop/test_*.py` | Authentication/CSRF, routing, commerce, variants, lifecycle, and migration regressions. |
| `backend/reza_backend/test_settings.py` | Isolated SQLite test settings that never contact SQL Server. |
| `backend/shop/migrations/` | Schema history; never edit applied migrations casually. |
| `frontend/nginx.conf` | Container API proxy plus static and shared-media serving behavior. |
| `docs/DOCKER_SETUP.md` | Detailed Docker workflow. |

## API surface

All application endpoints are under `/api/`:

- Auth/health: `/health/live/`, `/health/ready/`, `/auth/csrf/`, `/auth/register/`, `/auth/login/`, `/auth/refresh/`, `/auth/me/`, `/auth/me/update/`, `/auth/logout/`, `/auth/google/`
- Catalog/social: `/products/`, `/products/<id>/`, `/products/<id>/reviews/`, `/wishlist/`, `/cart/`
- Checkout/account: `/checkout/options/`, `/checkout/quote/`, `/addresses/`, `/orders/create/`, `/orders/my/`, `/orders/<id>/`, `/orders/<id>/cancel/`, `/returns/`
- Leads/content: `/bespoke/requests/`, `/newsletter/subscribe/`, `/settings/`, `/contact/`
- Staff: `/admin/stats/`, `/admin/capabilities/`, `/admin/orders/`, `/admin/users/`, `/admin/messages/`, `/admin/products/`, `/admin/coupons/`, `/admin/shipping-methods/`, `/admin/payments/`, `/admin/reviews/`, `/admin/returns/`, and `/admin/bespoke/` plus detail/action routes

When the contract changes, update the backend route/view/serializer, `frontend/services/api.ts`, UI types/callers, tests, and this file together.

## Configuration

- Root `.env`: ignored; used by Docker Compose.
- `backend/.env`: ignored; used for direct Django development.
- `backend/.env.example` and `.env.docker.example`: tracked variable-name templates only.
- Frontend public configuration uses `VITE_API_BASE`. Never put private API keys in a `VITE_*` variable or inject server secrets into a browser bundle.
- Core backend names include `DJANGO_SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_DRIVER`, `DB_ENCRYPT`, and `DB_TRUST_SERVER_CERTIFICATE`.
- Optional auth/deployment names include `DJANGO_SUPERUSER_*`, `GOOGLE_OAUTH_CLIENT_ID`, `AUTH_COOKIE_*`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_*`, and `TRUST_X_FORWARDED_PROTO`.
- Docker startup flags include `DB_AUTO_CREATE`, `RUN_MIGRATIONS`, `RUN_COLLECTSTATIC`, and `RUN_SEED_DATA`.
- `MSSQL_PORT` controls only the optional host mapping. `DB_PORT` remains the backend-to-SQL Server port and is normally `1433` in Compose.

Never record environment values here. When adding a variable, update the appropriate example, Compose wiring, setup documentation, and this name-only inventory.

## Common workflows

```powershell
# Full stack
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Setup-DevelopmentEnv.ps1
docker compose up --build

# Frontend
cd frontend
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev

# Backend (activate backend/.venv first if desired)
cd ..\backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --settings=reza_backend.test_settings
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Use the repository's isolated test settings/command documented in `AGENTS.md` for automated tests so the live SQL Server is never modified by a test run.

## Stable implementation constraints

- Preserve UTF-8 Persian copy and RTL layout.
- The backend is authoritative for price, total, stock, roles, and order status. Never trust client-submitted totals or privileges.
- Variant stock is used by checkout; `Product.stock` is its active-variant projection. Default-variant stock can be adjusted explicitly through the product API. Existing stock/variant writes require the latest `inventory_version` (frontend `inventoryVersion`); stale or absent versions return 409. Missing-product updates return 404, and product IDs cannot change. SQL Server concurrency/lock-order evidence remains DB-002/TEST-003.
- Order creation, cancellation, and admin cancellation must keep stock changes atomic and idempotent.
- User emails are normalized and database-unique. Migration `0005` deliberately stops on blank/duplicate legacy emails and clears unusable secrets created by the retired 2FA delivery flow.
- Keep cookie flags and allowed origins environment-aware; production cookies must be secure.
- Cookie auth permits only `SameSite=Lax` or `Strict` and has an explicit CSRF token/header flow. Keep frontend/API same-site; third-party-cookie deployment remains intentionally unsupported.
- Checkout supports real provider-free `cod` and `manual` methods. Online payment, email/SMS delivery, carrier labels, and tax/accounting require owner-selected providers and credentials and must never be simulated as successful.
- Order, payment, return, and inventory state plus immutable snapshots are separate. Use transition functions in `commerce_services.py`; never update these states ad hoc.
- OTP delivery/enrollment and the frontend Google Identity flow are intentionally disabled until real providers are configured; the backend never echoes an OTP or trusts an unsigned Google token.
- Validate uploaded files and keep the Nginx/Django upload-size limits aligned.
- Use bundled `frontend/public/images/` assets for default UI imagery; fresh installs must not depend on remote placeholder-image services.
- Pass raw ODBC keywords such as `Encrypt` and `TrustServerCertificate` through `DATABASES['default']['OPTIONS']['extra_params']`; unsupported top-level option names are silently ignored by `mssql-django`.
- Do not retry failed production API writes against a hard-coded localhost address.
- Vercel, if used, hosts only the frontend; the stateful Django/SQL Server stack needs a separate compatible host.
- Do not commit local `.env` files, databases, media, virtual environments, build output, cookies, archives, or temporary debug scripts.
