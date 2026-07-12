# Frontend/backend connection

The React application uses `frontend/services/api.ts` as its integration with the Django API. Requests include credentials; on a protected-request 401, the client uses `/api/auth/refresh/` once and retries after Django renews the HttpOnly access cookie.

## Local Docker path

```powershell
Copy-Item .env.docker.example .env
# Set the required secrets in .env.
docker compose up --build
```

- Browser entry point: http://localhost:3000
- Direct API: http://localhost:8000/api/products/
- Frontend build setting: `VITE_API_BASE=/api`

The API helper avoids duplicating the `/api` prefix. Nginx proxies `/api/...` to `backend:8000` and serves `/media/...` directly from the backend's shared read-only `django_media` volume.

## Manual development path

Run Django on port 8000 and Vite on port 3000. The active `frontend/vite.config.ts` proxies `/api` and `/media` to `http://localhost:8000`, so no frontend API environment override is required for this path.

```powershell
# Terminal 1
Set-Location backend
python manage.py runserver

# Terminal 2
Set-Location frontend
npm.cmd run dev
```

## API base rules

`VITE_API_BASE` is a Vite build-time value:

- Empty/unset: same-origin requests such as `/api/products/`; Vite or Nginx must proxy them.
- `/api`: same-origin API prefix; the API helper prevents `/api/api/...` paths.
- `https://api.example.com`: cross-origin Django API; use this for a separately hosted production backend.

Do not include `/api` twice. Rebuild the frontend after changing any `VITE_*` value.

Cookie auth permits only `SameSite=Lax`/`Strict`, so a separately hosted frontend and API must still share the same registrable site (for example `www.example.com` and `api.example.com`) or be joined by a same-origin proxy. Unrelated hosting domains require a separately designed CSRF-protected auth strategy.

## Backend origin settings

For a cross-origin frontend, configure the backend environment with complete origins (scheme plus hostname and optional port):

```env
ALLOWED_HOSTS=api.example.com
ALLOWED_ORIGINS=https://www.example.com
CSRF_TRUSTED_ORIGINS=https://www.example.com
```

Cookie authentication requires `CORS_ALLOW_CREDENTIALS=True`, which is already enabled in `backend/reza_backend/settings.py`. For production, set the `AUTH_COOKIE_*`, session/CSRF secure-cookie, redirect/HSTS, and trusted-proxy variables for the verified HTTPS topology.

## Implemented endpoint groups

All paths below are under `/api/` and are defined in `backend/shop/urls.py`.

- Authentication: register, login, access refresh, current user, profile update, logout, disabled OTP delivery, and verified Google-token handling
- Catalog: product list and product detail
- Orders: create, current-user list, and pending-order cancellation
- Site content: settings and contact messages
- Admin: statistics, orders/status, users, messages/read state, and product CRUD

The exact HTTP methods and payload normalization live in `frontend/services/api.ts`; server validation and permissions live in `backend/shop/serializers.py` and `backend/shop/views.py`.

## Quick checks

Public product request:

```powershell
curl.exe http://localhost:8000/api/products/
```

Frontend verification:

```powershell
Set-Location frontend
npm.cmd run typecheck
npm.cmd run build
```

Backend verification (with valid SQL Server settings):

```powershell
Set-Location backend
python manage.py check
python manage.py makemigrations --check --dry-run
```

## Troubleshooting

### HTML is returned instead of JSON

Confirm the request URL contains exactly one `/api` segment and rebuild after changing `VITE_API_BASE`. In Docker, inspect both `docker compose logs frontend` and `docker compose logs backend`.

### Browser reports a CORS or CSRF error

Confirm the browser's exact origin is present in both `ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. Origins must include `http://` or `https://`; `ALLOWED_HOSTS` contains hostnames only.

### API returns 401

Log in again, confirm the browser accepted the authentication cookies, and ensure requests use `credentials: 'include'`. Do not copy access/refresh cookie values into issue reports or committed test files.

### Images fail after deployment

Confirm the backend's `MEDIA_URL` is reachable and uploaded media uses persistent storage. The local Docker path persists media in the `django_media` named volume; Vercel serves only the frontend and does not host Django media.
