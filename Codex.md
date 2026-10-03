# Codex Project Context

Last verified: 2026-10-04 (Batch 12 candidate combines Batch 11 UX and Batch 10 Debian 13/runtime-security follow-up; final review in progress)

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
- Routing: `HashRouter`, so browser routes live after `#` and static hosting does not need server-side route rewrites. [ADR 0001](docs/adr/0001-storefront-routing.md) retains it pending public-origin/rendering/legacy-link rollout. Home has a runtime root canonical; fragment product canonicals/XML sitemap and server product/social metadata remain deferred. Unknown routes/policies and missing products have named noindex recovery views; transport failures expose retry instead of false not-found.
- Shared state: one stable `frontend/state/AppState.tsx` provider supplies focused hooks over independent auth, cart, wishlist, theme, overlay and toast stores. `state/runtime.ts` composes lifecycles/actions; `contexts/GlobalContext.tsx` is a test compatibility facade only. No nested domain-provider tower or blanket memoization. See [state ownership, persistence inventory and query decision](docs/FRONTEND_STATE.md).
- Server cache: TanStack Query v5 owns catalog/settings and admin collection reads. Identity-scoped keys, deduplication, explicit invalidation and cancellation replace global catalog/manual admin fetch state. The bounded in-memory cache has 30-second freshness (settings 60), no automatic retry/focus fetch, and clears identity-bound data on session changes. Forms/selections and customer screen-specific reads remain feature-local.
- Commerce: `state/commerce.ts` independently hydrates cart/wishlist, serializes each write lane, preserves pending edits/removal tombstones through failures/reloads, and retries explicitly/on reconnect. `state/persistence.ts` validates role/user-scoped v3 buckets, migrates guest legacy keys without deleting them, and quarantines ambiguous legacy session commerce. Guest transfer uses max quantity/union once; logout never exports account data into guest state. Staff does not consume guest intent or synchronize customer commerce.
- Catalog requests derive from resolved session state; catalog results belong to that identity. Admin catalog failures expose no partial public catalog, and logout invalidates outstanding admin loads.
- API boundary: `frontend/services/api.ts` is the compatibility facade. `services/auth.ts` and `catalog.ts` own checked DTO conversion into `types.ts` domain models; other domain adapters migrate incrementally. `services/http/client.ts` returns unknown JSON, owns cookies/CSRF and single-flight refresh, and throws `ApiError` with status/message/fields/code. See [frontend API/session contract](docs/FRONTEND_API_AUTH.md).
- Auth state is explicit: loading, anonymous, customer or admin. Refresh failure clears local session state and rejects obsolete identity-bound responses. Login/register/logout wait for pending refresh and dispatched account writes, then use same-origin Web Locks to serialize cookie changes; a non-secret refresh epoch deduplicates refresh across tabs. Failed logout clears local data and reports unconfirmed server logout. Catalog/account reads wait for auth; stale bootstrap, hydration, catalog and detail/review/quote results are cancelled or ignored. Checkout form/continuations are session-bound. Independent tabs/devices retain existing commerce last-write semantics; account DTO role now reflects the backend is_admin capability without changing stored role/staff flags.
- Local fallback: `frontend/services/db.ts` exposes only a read-only emergency catalog based on `frontend/data.ts`. It is used only when the product API is unavailable and never reports local admin writes as server success.
- Main feature surfaces: lazy-loaded routes in `frontend/pages/` and shared UI in `frontend/components/`. Tailwind is compiled locally through PostCSS; no runtime Tailwind CDN is used.
- Admin composition: `pages/AdminPanel.tsx` owns shell/navigation; `features/admin/` owns dashboard, products/editor, orders, commerce, messages, settings and pagination. Product editor domains are independent drafts; raw files and revocable object previews are separate from persisted references. Customer/admin overlays share `components/Dialog.tsx` (native modality, initial focus, Tab wrapping, Escape, restoration and scroll locking); `features/admin/Dialog.tsx` re-exports it. `components/FormField.tsx` supplies persistent native labels. Global focus/reduced-motion/logical sizing rules preserve Persian RTL; navbar uses the mobile menu below 1280px. Tailwind scans `features/`.
- Admin reads consume eight-row server pages with filters/counts, cancellation and identity-scoped caching; inactive pages expire after five minutes. Commerce loads only its selected section; orders use embedded customer data instead of fetching users. Legacy array helpers return at most a 100-record compatibility preview for other staff site components. Complete product management uses the paginated screen. See [admin/media contract and rollout](docs/ADMIN_MEDIA.md).
- Static product/site assets: `frontend/public/images/`.

### Backend

- Project configuration: `backend/reza_backend/settings.py` and `backend/reza_backend/urls.py`.
- API application: `backend/shop/`.
- API routes: `backend/shop/urls.py`.
- Models: `backend/shop/models.py` contains users/products/variants, addresses, shipping/coupons, orders/items/payments/events, inventory movements, saved carts/wishlists, reviews, returns, bespoke/newsletter records, notification outbox, messages, and site settings.
- Request logic: auth/catalog/content surfaces remain in `backend/shop/views.py`; commerce views, serializers, and transactional rules live in `commerce_views.py`, `commerce_serializers.py`, and `commerce_services.py`.
- Active order URLs resolve to `commerce_views.py`; the unrouted legacy handlers and serializers have been removed. Native Django `/admin/` is a separate model-editing surface from REST `/api/admin/`; inspect `shop/admin.py` when changing write invariants.
- Authentication: `shop/sessions.py` and AuthSession enforce active user, password digest and family expiry for cookie and bearer access. Access lasts 15 minutes; refresh rotates atomically within an absolute seven-day family; logout immediately revokes both. Cookies are HttpOnly, host-only, path /, Secure outside DEBUG, access Lax/refresh Strict with explicit expiry. The frontend bootstraps `/api/auth/csrf/` and sends `X-CSRFToken` for unsafe browser requests. Header-only protected writes remain CSRF-free; public logout retains its explicit CSRF contract. Migration 0009 requires existing users to sign in again. Google/OTP/TOTP recovery are unavailable; legacy MFA markers block password login.
- Persistence: Microsoft SQL Server through `mssql-django` and `pyodbc` for normal runs. Any SQLite test settings are test-only and must not be confused with production configuration.
- Seed command: `python manage.py seed_data`; it bootstraps catalog records only when the catalog is empty and shipping only when none exists, and never publishes or logs a fixed administrator password.
- Hermetic tests: `backend/shop/tests.py` plus focused `test_*.py` modules use `backend/reza_backend/test_settings.py`, in-memory SQLite, and never touch configured SQL Server.
- Uploaded files: Django media storage under `backend/media/` locally or the mounted `/app/media` volume in Docker. Runtime media is ignored by Git.
- Product uploads use `shop/product_media.py`: decoded/re-encoded still images, 10 MiB/file, 40 MiB/binary request, 12 total images including primary, 8,000 px/side and 20 million pixels, URL validation and cleanup of newly staged files on failed product writes. Safe inline legacy galleries convert to files on edit; existing files are retained for historical references. Existing primary plus JSON gallery storage is sufficient; no ProductImage migration. Django spools files after 2 MiB; Nginx retains a 50 MiB total-body limit. `Product.primaryImage` preserves the actual API primary separately from the UI `image` fallback.
- Seven site images use the product decoder/budgets and `shop/site_services.py` staged rollback-safe writes. `SecurityResponseMiddleware` adds API CSP, private no-store and Permissions-Policy; Nginx supplies location/error headers and restricts media types/symlinks. Actual TLS/HSTS and historical media review remain deployment gates.
- Sensitive write throttles, including native /admin/login/, use shared atomic ThrottleBucket counters (migration 0010), explicit `TRUSTED_PROXY_CIDRS` and overwritten Nginx XFF. Schedule `manage.py prune_security_state` daily; never run it against an unintended DB. Limits, query overhead and owner rollout live in [security record](docs/SECURITY_HARDENING.md).
- Native Django product/variant/site/order/payment/return screens are inspection-only. Those service-owned writes use the existing REST/staff UI, including stock ledger and lifecycle guards. Native user add/change/delete requires superuser privileges.
- Refund allocations/entries use existing Payment metadata plus OrderEvent records through `shop/refunds.py`; no new schema. Net item allocations derive from immutable purchase amounts, exclude shipping/tax, and reconcile rounding. Manual refunds require amount, currency, reason, per-payment reference and explicit offline-transfer confirmation. Inconsistent legacy refund history requires reconciliation.

- Product mutations use `product_services.py` for atomic product/variant/ledger/media writes. Public detail mutations remain a tested staff-only compatibility route. Product read/write contracts are separate and explicit; only staff product reads expose the inventory version.
- `selectors.py` owns approved product aggregates/variants, order graphs and paged return payment/item/refund-quantity graphs. `pagination.py` shares stable ordering, size limits and links. Public catalog uses compact cards, search/category/fabric/price/sort/IDs, server pages and a bounded fabric facet endpoint; detail/staff reads retain full copy. Customer orders/returns/reviews use eight-row screens. Cart prefetches only its products' variants; unlocked quote reads are batched, locked checkout remains fresh/atomic. Dashboard net revenue aggregates existing JSON refund totals in SQL. See [measurements, stock ownership, transaction/index review and residual contracts](docs/DATABASE_PERFORMANCE.md).
- Inventory meaning: ProductVariant.stock is SKU stock; Product.stock projects active variants for compatibility, with documented pre-variant/deleted-variant fallbacks. `manage.py audit_inventory --limit 25` is a read-only mismatch/missing-history report, not a stock repair. Migration 0008 removes only the proven redundant SKU index; uniqueness remains. Apply after deployed-schema review/backup. Whole saved account snapshots and historical inline media remain follow-up.
- `subscription_services.py` owns normalized idempotent newsletter subscription/reactivation. Quote input permits incomplete address forms; checkout validates delivery-address types/limits. See [API contracts and OpenAPI decision](docs/API_CONTRACTS.md); no schema dependency/endpoint is installed.

### Docker request flow

The `frontend` image builds Vite assets with a digest-pinned Node/npm builder and serves them with unprivileged Nginx (UID 101, internal port 8080). It proxies `/api/` to Gunicorn, `/static/` to WhiteNoise and serves `/media/` from the read-only shared volume. Embedded Docker DNS follows backend recreation. Index HTML revalidates, hashed Vite assets cache immutably and source maps are disabled/blocked. Container builds exclude local env variants and enforce the same-origin public API contract.

Backend runs as UID/GID 10001 with a hash-locked binary-wheel dependency venv, digest-pinned Python and version-pinned ODBC 18; runtime compilers/installers are absent. Fresh media/static volumes inherit image ownership, but existing volumes need owner-reviewed permission preparation. Local startup retains optional DB creation/migration/static/seed flags before exec Gunicorn. When creation is off, DB wait connects directly to the application DB rather than master. Compose readiness is SQL -> Django query -> Nginx proxy; image-level liveness is independent. Gunicorn SIGTERM and Nginx SIGQUIT have bounded graceful stop budgets.

`docker-compose.production.yml` is a review template, not approved deployment automation: bootstrap/migration/seed/static flags off, separate restricted runtime SQL login, licensed SQL edition, validated DB TLS, Secure cookies, no DB/API host ports and loopback-only Nginx. TLS ingress owns external redirect/HSTS; Django ignores external forwarded scheme to avoid loops. Actual ingress/client IP trust, SQL certificates/login grants, capacity and backups require owner decisions. Each environment must have a distinct project/env/database/media namespace. See [operations](docs/OPERATIONS.md).

`reza_backend/observability.py` provides JSON stdout logging and bounded request IDs, safe route patterns/status/duration and exception type/stack locations without body/query/cookie/SQL/error-text capture. Nginx overwrites request IDs and emits JSON access events; successful probes are quiet. Compose local logs rotate; error reporting/collection is an owner-selected handler/consumer integration point, with no paid vendor or network reporter installed.

The local follow-up patches Alpine runtime packages and pins its maintained Nginx
security package on the 1.28 branch; unused dynamic modules are removed. Image scans
now download from official fallback registries and retain full reports/provenance in
ignored `.ops-reports/` plus CI artifacts. Frontend has zero reported advisories in
the observed snapshot. Backend now uses Debian 13 with same-release security updates,
keeping Python 3.11.17, ODBC 18.6.2.1 and the dependency hash lock. Its scan has zero
CRITICAL and 44 unfixed HIGH package findings across eight advisory IDs, down from
63 HIGH/CRITICAL across 23 IDs. All HIGH/CRITICAL findings block the release gate,
including unfixed ones; no exception is accepted. Setuid/setgid executable bits are
removed and verified in the runtime fixture. [Runtime advisory matrix and next steps](docs/RUNTIME_VULNERABILITIES.md)
record vendor status and remaining work.
The runtime fixture verifies a disposable TLS ingress/SQL CA with wrong-host/unknown-CA
rejections; no host trust store or real certificates are changed. The explicit volume
maintenance tool checks by default and verifies recovery archives before changing
ownership. It runs only on owned synthetic volumes in tests; existing application
volumes remain owner work. Hosted CI has local actionlint checks but no observed run.

The complete stack was first-launch tested on Windows/Docker Desktop on 2026-07-13. This workstation uses ignored `MSSQL_PORT=11433` because Windows rejected host port `1433`; services still connect to `db:1433` inside Compose.

## Important files

| File | Why it matters |
| --- | --- |
| `AGENTS.md` | Mandatory session workflow and continuity-file responsibilities. |
| `Handoff.md` | Newest-first record of changes, checks, incomplete work, and owner actions. |
| `README.md` | Supported local and Docker entry points. |
| `docker-compose.yml` | Complete local multi-container topology and environment wiring. |
| `docker-compose.production.yml`, `.env.production.example`, `docs/OPERATIONS.md` | Reviewed production configuration template and startup/migration/backup/restore/media/log/rollback/health runbooks; no deployment approval. |
| `backend/requirements.in`, `backend/requirements.txt` | Compatible Python inputs and complete version/hash lock; pip remains the installer. |
| `backend/gunicorn.conf.py`, `backend/healthcheck.py`, `backend/reza_backend/observability.py` | Worker/shutdown configuration, bounded probes and redacted JSON/request correlation. |
| `frontend/.nvmrc`, `frontend/nginx-main.conf` | CI Node patch baseline and unprivileged Nginx JSON logging/temp-path setup. |
| `scripts/check-build-inputs.py`, `scripts/validate-production-config.py`, `scripts/test-production-runtime.mjs` | Read-only lock/secret-signature checks, synthetic configuration validation and isolated real-SQL/media recovery fixture. |
| `scripts/prepare-volume-ownership.py`, `scripts/scan-runtime-images.mjs` | Explicit backup-before-ownership maintenance and full-report image scan gate with official DB source fallback. |
| `scripts/image-vulnerability-policy.mjs`, `scripts/test-image-vulnerability-policy.mjs`, `docs/RUNTIME_VULNERABILITIES.md` | All-HIGH/CRITICAL gate including unfixed advisories, regression cases and vendor remediation/owner matrix. |
| `scripts/Setup-DevelopmentEnv.ps1` | Creates ignored development env files, generates required secrets without displaying them, synchronizes the fresh database password, and removes obsolete Gemini variables. |
| `.env.docker.example` | Names and safe examples for Docker configuration; never add real secrets. |
| `frontend/package.json` | Frontend scripts and dependency contract. |
| `frontend/vite.config.ts` | Vite build and development-server behavior. |
| `frontend/state/` | Focused React subscriptions, auth/UI lifecycles, commerce persistence/queues, catalog/settings/admin cache and composition. |
| `frontend/features/admin/`, `docs/ADMIN_MEDIA.md` | Admin features, independent product drafts, managed media trace, limits and compatibility/rollback. |
| `frontend/contexts/GlobalContext.tsx` | Legacy aggregate hook/provider exports retained for integration regression probes. |
| `docs/FRONTEND_STATE.md` | State classification, query decision, guest/account invariants and complete browser-key audit. |
| `frontend/services/api.ts`, `auth.ts`, `catalog.ts` | API facade, domain transports and checked auth/catalog normalization. |
| `frontend/services/http/client.ts`, `errors.ts` | Shared HTTP, CSRF, single-flight refresh, session invalidation and safe error contracts. |
| `frontend/services/db.ts` | Read-only emergency product-catalog fallback only. |
| `frontend/types.ts` | Canonical UI data shapes. |
| `backend/reza_backend/settings.py` | Django, SQL Server, CORS, JWT, static, and media configuration. |
| `backend/shop/urls.py` | Public API surface. |
| `backend/shop/views.py` | Authentication, products, settings, contact and older staff HTTP endpoints. |
| `backend/shop/models.py` | Persistent data model and order relationships. |
| `backend/shop/commerce_services.py` | Quotes, idempotent checkout, locking, inventory, refunds, and lifecycle transitions. |
| `backend/shop/refunds.py` | Net item allocation, remaining refund bounds, reference replay and recorded financial totals. |
| `backend/shop/product_media.py` | Shared product image validation, gallery normalization and storage staging. |
| `frontend/tests/` | Retained Node auth/media regressions plus Vitest/RTL/user-event/MSW commerce and HTTP tests. |
| `docs/TESTING.md` | Fast quality gates, browser smoke and disposable SQL Server lane commands and isolation constraints. |
| `frontend/e2e/`, `frontend/playwright.config.ts` | Real Django browser smoke journeys using a disposable SQLite server. |
| `backend/e2e_server.py`, `backend/reza_backend/e2e_settings.py` | Synthetic browser fixtures and marked temporary database/media directory. |
| `docker-compose.sql-test.yml`, `backend/reza_backend/sql_test_settings.py` | Separate disposable SQL Server topology and fail-closed connection configuration. |
| `.github/workflows/extended-tests.yml` | Manually dispatched SQL Server and Playwright jobs. |
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
- Optional auth/deployment names include `DJANGO_SUPERUSER_*`, `TRUSTED_PROXY_CIDRS`, `AUTH_COOKIE_*`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_*`, and `TRUST_X_FORWARDED_PROTO`.
- Docker startup flags include `DB_AUTO_CREATE`, `RUN_MIGRATIONS`, `RUN_COLLECTSTATIC`, and `RUN_SEED_DATA`.
- Logging/worker names: `LOG_LEVEL`, `GUNICORN_WORKERS`, `GUNICORN_TIMEOUT`, `GUNICORN_GRACEFUL_TIMEOUT`.
- Production template names: `PRODUCTION_DB_USER`, `PRODUCTION_DB_PASSWORD`, `PRODUCTION_MSSQL_PID`, `PRODUCTION_ALLOWED_HOSTS`, `PRODUCTION_CSRF_TRUSTED_ORIGINS`. Optional public build mirror: `PIP_INDEX_URL` (never credentials).
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
npm.cmd run lint
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

Browser commands: from frontend, `npx.cmd playwright install chromium` then `npm.cmd run test:e2e`. Both loopback ports 3100/18080 must be free (override the frontend port with `REZA_E2E_FRONTEND_PORT` if Windows reserves 3100); `vite.e2e.config.ts` isolates the test proxy from normal development. The runner always creates synthetic data in a temporary SQLite database. SQL commands and test-only names (`REZA_SQL_TEST`, `REZA_SQL_TEST_HOST`, `REZA_SQL_TEST_PASSWORD`, `REZA_E2E_DIRECTORY`, `E2E_PYTHON`, `PLAYWRIGHT_CHANNEL`, `OPS_BACKEND_IMAGE`, `OPS_FRONTEND_IMAGE`) are documented in [docs/TESTING.md](docs/TESTING.md); never substitute production data or connection settings. CI covers `codex/**`, locks action commits and adds image/proxy/recovery/scan gates without registry login/push/deployment. The broader SQL/browser lanes remain manually dispatched; hosted results are not implied by local checks.

## Stable implementation constraints

- Preserve UTF-8 Persian copy and RTL layout.
- The backend is authoritative for price, total, stock, roles, and order status. Never trust client-submitted totals or privileges.
- Variant stock is used by checkout; `Product.stock` is its active-variant projection. Default-variant stock can be adjusted explicitly through the product API. Existing stock/variant writes require the latest `inventory_version` (frontend `inventoryVersion`); stale or absent versions return 409. Missing-product updates return 404, and product IDs cannot change. SQL Server concurrency/lock-order evidence remains DB-002/TEST-003.
- Order creation, cancellation, and admin cancellation must keep stock changes atomic and idempotent.
- Checkout rechecks the idempotency key after a rolled-back validation or integrity failure: a concurrent winning checkout may have consumed the last stock/coupon before the duplicate request validates. Replay only the same customer's order; cross-customer key reuse returns conflict.
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
