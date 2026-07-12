# Codex Project Context

Last verified: 2026-07-13

## Purpose and product

REZA Formal is a Persian-first, RTL e-commerce site for formal menswear. It has a React storefront/admin interface, a Django REST API, Microsoft SQL Server persistence, cookie-based JWT authentication, product and stock management, orders, user profiles, contact messages, site content settings, and local Docker orchestration.

This file contains durable project context for later coding sessions. Put chronological work notes in `Handoff.md`, and put session behavior rules in `AGENTS.md`.

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
- Shared state: `frontend/contexts/GlobalContext.tsx` owns authentication state, products, cart, wishlist, theme, site settings, and toast messages.
- API boundary: `frontend/services/api.ts` performs HTTP calls and converts Django snake_case/nested responses into the UI's models from `frontend/types.ts`.
- Local fallback: `frontend/services/db.ts` exposes only a read-only emergency catalog based on `frontend/data.ts`. It is used only when the product API is unavailable and never reports local admin writes as server success.
- Main feature surfaces: `frontend/pages/` for routes and `frontend/components/` for shared UI.
- Static product/site assets: `frontend/public/images/`.

### Backend

- Project configuration: `backend/reza_backend/settings.py` and `backend/reza_backend/urls.py`.
- API application: `backend/shop/`.
- API routes: `backend/shop/urls.py`.
- Models: custom `User`, `Product`, `Order`, `OrderItem`, `ContactMessage`, and `SiteSettings` in `backend/shop/models.py`.
- Request logic: `backend/shop/views.py`; serialization/validation: `backend/shop/serializers.py`.
- Authentication: HttpOnly access/refresh JWT cookies through `backend/shop/auth.py`; `POST /api/auth/refresh/` renews an expired access cookie, and protected endpoints use DRF permissions plus explicit admin checks.
- Persistence: Microsoft SQL Server through `mssql-django` and `pyodbc` for normal runs. Any SQLite test settings are test-only and must not be confused with production configuration.
- Seed command: `python manage.py seed_data`; it must be idempotent and must never publish or log a fixed administrator password.
- Hermetic tests: `backend/shop/tests.py` with `backend/reza_backend/test_settings.py` use in-memory SQLite and never touch the configured SQL Server.
- Uploaded files: Django media storage under `backend/media/` locally or the mounted `/app/media` volume in Docker. Runtime media is ignored by Git.

### Docker request flow

The `frontend` image builds Vite assets and serves them with Nginx. Nginx proxies `/api/` to Gunicorn and serves `/media/` directly from the read-only `django_media` volume shared with the backend. The backend waits for SQL Server, optionally creates the application database, applies migrations, collects static files, and runs seed data before Gunicorn starts.

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
| `backend/shop/views.py` | Authentication, products, orders, settings, contact, and admin behavior. |
| `backend/shop/models.py` | Persistent data model and order relationships. |
| `backend/shop/management/commands/seed_data.py` | Idempotent initial data/bootstrap behavior. |
| `backend/shop/tests.py` | Backend authentication, validation, stock/order, admin, and seed regressions. |
| `backend/reza_backend/test_settings.py` | Isolated SQLite test settings that never contact SQL Server. |
| `backend/shop/migrations/` | Schema history; never edit applied migrations casually. |
| `frontend/nginx.conf` | Container API proxy plus static and shared-media serving behavior. |
| `docs/DOCKER_SETUP.md` | Detailed Docker workflow. |

## API surface

All application endpoints are under `/api/`:

- `/auth/register/`, `/auth/login/`, `/auth/refresh/`, `/auth/me/`, `/auth/me/update/`, `/auth/logout/`, `/auth/send-otp/`, `/auth/google/`
- `/products/`, `/products/<id>/`
- `/orders/create/`, `/orders/my/`, `/orders/<id>/cancel/`
- `/settings/`, `/contact/`
- `/admin/stats/`, `/admin/orders/`, `/admin/users/`, `/admin/messages/`, `/admin/products/` and their detail/action routes

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
- Order creation, cancellation, and admin cancellation must keep stock changes atomic and idempotent.
- User emails are normalized and database-unique. Migration `0005` deliberately stops on blank/duplicate legacy emails and clears unusable secrets created by the retired 2FA delivery flow.
- Keep cookie flags and allowed origins environment-aware; production cookies must be secure.
- Cookie auth currently permits only `SameSite=Lax` or `Strict`; use same-site frontend/API domains or add a complete CSRF token flow before considering `SameSite=None`.
- OTP delivery/enrollment and the frontend Google Identity flow are intentionally disabled until real providers are configured; the backend never echoes an OTP or trusts an unsigned Google token.
- Validate uploaded files and keep the Nginx/Django upload-size limits aligned.
- Use bundled `frontend/public/images/` assets for default UI imagery; fresh installs must not depend on remote placeholder-image services.
- Pass raw ODBC keywords such as `Encrypt` and `TrustServerCertificate` through `DATABASES['default']['OPTIONS']['extra_params']`; unsupported top-level option names are silently ignored by `mssql-django`.
- Do not retry failed production API writes against a hard-coded localhost address.
- Vercel, if used, hosts only the frontend; the stateful Django/SQL Server stack needs a separate compatible host.
- Do not commit local `.env` files, databases, media, virtual environments, build output, cookies, archives, or temporary debug scripts.
