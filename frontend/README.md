# REZA Formal frontend

React 19 + TypeScript storefront built with Vite. The Django API is the primary data source; localStorage remains only for cart, wishlist, theme, and selected fallback behavior.

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

## API configuration

`VITE_API_BASE` is optional and embedded at build time:

- empty/unset: same-origin `/api/...` requests (the local Vite proxy and Docker Nginx support this)
- `/api`: same-origin prefix without duplicating the path
- `https://api.example.com`: separately hosted API origin for production

Rebuild after changing the value. Cross-origin deployments must also configure Django's allowed hosts, CORS origins, and CSRF trusted origins.

The root `vercel.json` installs/builds this directory and publishes `frontend/dist`; it does not deploy Django or SQL Server.
