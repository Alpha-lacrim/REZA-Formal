# AI contributor instructions

## Start here

Before changing the repository, read and follow root `AGENTS.md`, then use `Codex.md` for maintained project context and `Handoff.md` for the latest completed/incomplete work. Update the continuity files as directed by `AGENTS.md` at the start and end of each session.

## Architecture

- `frontend/` is the React 19 + TypeScript + Vite single-page application. Its entry points are `frontend/index.tsx` and `frontend/App.tsx`.
- `backend/` is the Django REST API. URL routing starts in `backend/reza_backend/urls.py` and `backend/shop/urls.py`.
- Microsoft SQL Server is the persistent database through `mssql-django` and `pyodbc`.
- `frontend/services/api.ts` is the primary data/auth integration. It normalizes Django responses to the frontend types and sends cookie-authenticated requests.
- `frontend/services/db.ts` is a read-only emergency catalog fallback. It never performs authoritative admin, account, order, message, or settings writes.
- `frontend/contexts/GlobalContext.tsx` owns cross-application state and actions. Cart, wishlist, and theme preferences are intentionally browser-local; accounts, products, orders, messages, and site settings use the API where implemented.

## Integration rules

- Keep frontend request paths aligned with `backend/shop/urls.py`. When an endpoint or payload changes, update the Django view/serializer and `frontend/services/api.ts` together.
- Keep normalization at the API boundary. Django generally returns snake_case fields; React types in `frontend/types.ts` generally use camelCase.
- Authentication uses JWT cookies and `credentials: 'include'`. Cross-origin deployments therefore require matching `ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` values in the backend environment.
- Product/settings image writes use `FormData`. Do not manually set multipart `Content-Type`; the browser must add its boundary.
- Treat `frontend/services/db.ts` as browse-only compatibility behavior. Do not add authoritative business data or false-success admin writes to localStorage.
- Database writes that span validation, stock, and orders should remain atomic and server-authoritative.

## Configuration and run paths

- Full local stack: copy `.env.docker.example` to root `.env`, set the required secrets, then run `docker compose up --build`.
- Backend-only local development: copy `backend/.env.example` to `backend/.env`, install `backend/requirements.txt`, then run Django from `backend/`.
- Frontend-only local development: run `npm ci` and `npm run dev` from `frontend/`. Vite proxies `/api` and `/media` to `http://localhost:8000`.
- `VITE_API_BASE` may be an API origin such as `https://api.example.com`, an `/api` prefix, or empty for same-origin requests. Do not append a second `/api` prefix.
- Root `vercel.json` deploys only the static frontend. The Django/SQL Server backend needs a separate persistent host; set Vercel's `VITE_API_BASE` to that HTTPS origin.

## Verification

- Frontend: `npm run typecheck` and `npm run build` from `frontend/`.
- Backend tests: `python manage.py test --settings=reza_backend.test_settings` from `backend/`. The isolated settings use an in-memory SQLite database and do not contact the configured SQL Server.
- Backend: `python manage.py check` and `python manage.py makemigrations --check --dry-run` from `backend/` with a valid environment.
- Compose shape: set validation-only secret environment variables, then run `docker compose config --quiet` from the repository root.
- Browser end-to-end tests are not included. Do not recreate the removed one-off credential/cookie login and upload scripts as substitutes.

## Security and repository hygiene

- Never commit `.env` files, API keys, SQL credentials, cookie jars, uploads, database files, build output, virtual environments, or source snapshot archives.
- Do not publish seeded credentials. `seed_data` creates an admin only when both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are provided; keep those values outside Git.
- Do not expose OTP values in production responses or accept unverified third-party identity tokens. These flows require production hardening before public deployment.
- Do not log access/refresh cookies or full authentication responses.

## Important files

- `frontend/services/api.ts`: API URL handling, request behavior, and response normalization.
- `frontend/contexts/GlobalContext.tsx`: application state and API/local fallback orchestration.
- `frontend/types.ts`: canonical frontend domain types.
- `backend/shop/models.py`: persistent domain model.
- `backend/shop/serializers.py`: API validation and representation.
- `backend/shop/views.py` and `backend/shop/urls.py`: API behavior and routes.
- `backend/shop/tests.py` and `backend/reza_backend/test_settings.py`: hermetic backend API tests and isolated settings.
- `backend/reza_backend/settings.py`: environment, database, CORS/CSRF, static/media, and auth settings.
- `docker-compose.yml`, `.env.docker.example`, and `docs/DOCKER_SETUP.md`: full-stack local container workflow.
