# REZA Formal frontend

React 19 + TypeScript storefront built with Vite, route-level code splitting, and locally compiled Tailwind CSS. The Django API is authoritative; localStorage provides offline cart/wishlist/theme continuity, while writes synchronize to the authenticated account when available.

## Local development

Prerequisite: a current Node.js LTS release.

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite serves http://localhost:3000 and proxies `/api` and `/media` to http://localhost:8000. Start the Django backend separately.

No third-party AI key is required; the stale key-injection setup has been removed.

## Checks and production build

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

Build output is written to `dist/` and is ignored by Git.

Checkout is disabled whenever only the emergency offline catalog is available. The browser never submits an offline order or treats an unavailable payment provider as successful.

## API configuration

`VITE_API_BASE` is optional and embedded at build time:

- empty/unset: same-origin `/api/...` requests (the local Vite proxy and Docker Nginx support this)
- `/api`: same-origin prefix without duplicating the path
- `https://api.example.com`: separately hosted API origin for production

Rebuild after changing the value. Cross-origin deployments must also configure Django's allowed hosts, CORS origins, and CSRF trusted origins.

The root `vercel.json` installs/builds this directory and publishes `frontend/dist`; it does not deploy Django or SQL Server.
