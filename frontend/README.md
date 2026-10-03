# REZA Formal frontend

React 19 + TypeScript storefront built with Vite, route-level code splitting, and locally compiled Tailwind CSS. The Django API is authoritative; localStorage provides offline cart/wishlist/theme continuity, while writes synchronize to the authenticated account when available.

State ownership, TanStack Query defaults, account isolation and browser storage migration are documented in [FRONTEND_STATE.md](../docs/FRONTEND_STATE.md). Application components use focused hooks from `state/AppState.tsx`; the aggregate `useGlobal` hook is retained for regression probes only.

## Local development

Use Node 22/npm 10, with the tested patch baseline in `.nvmrc` and the
`packageManager` field in `package.json`; keep the checked-in npm lock.

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite serves http://localhost:3000 and proxies `/api` and `/media` to http://localhost:8000. Start the Django backend separately.

No third-party AI key is required; the stale key-injection setup has been removed.

## Checks and production build

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Build output is written to `dist/` and is ignored by Git.

The real-Django Playwright/axe suite runs with `npm.cmd run test:e2e`; see
[TESTING](../docs/TESTING.md) for isolated ports, browser installation and SQL lanes.

Checkout is disabled whenever only the emergency offline catalog is available. The browser never submits an offline order or treats an unavailable payment provider as successful.

## API configuration

`VITE_API_BASE` is optional and embedded at build time:

- empty/unset: same-origin `/api/...` requests (the local Vite proxy and Docker Nginx support this)
- `/api`: same-origin prefix without duplicating the path
- `https://api.example.com`: separately hosted, same-site API origin for an owner-reviewed frontend deployment

Rebuild after changing the value. Cross-origin deployments must also configure Django's allowed hosts, CORS origins, and CSRF trusted origins. Third-party-cookie deployments are unsupported; the Docker build permits only the same-origin contract.

The root `vercel.json` describes frontend-only hosting; it does not deploy Django or SQL Server.

## Production build and container operations

Use `npm ci` with the checked-in lock and the Node version in `.nvmrc`. The
multi-stage Docker builder fixes the Node/npm image digest; its runtime is
unprivileged Nginx on port 8080. Compose retains the existing local public port.
`VITE_API_BASE` is public build-time configuration; the container's same-origin
API/CSP/cookie contract is validated during its build. Source maps are disabled.
See [operations](../docs/OPERATIONS.md) for cache, media, ingress and rollback rules.
