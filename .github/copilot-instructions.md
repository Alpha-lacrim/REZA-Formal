## Purpose
This file gives fast, actionable context for AI coding agents working on this repo so suggestions and code edits align with project structure and conventions.

### Big picture
- Vite + React single-page app. Entry is `index.tsx` / `App.tsx`.
- State and cross-app actions are centralized in `contexts/GlobalContext.tsx` (cart, auth, products, site settings, theme, toasts).
- `services/db.ts` is the single simulated backend: it reads/writes to `localStorage` and implements auth (including 2FA), product CRUD, orders, messages and site settings.
- UI pages live in `pages/` and small UI pieces are under `components/`. Admin UI that exercises most backend flows is `pages/AdminPanel.tsx`.

### Important patterns & conventions (do not change lightly)
- Single-source-of-truth backend is `services/db.ts`. Prefer adding/updating methods there for data changes rather than touching localStorage elsewhere.
- Local storage keys use repo prefixes (e.g. `reza_cart_v1`, `reza_session_v1`) and constants inside `services/db.ts` (K_USERS, K_PRODUCTS...). Keep migrations additive.
- Sanitization: `db.sanitize()` is applied to user-supplied strings; follow that pattern when adding new text fields.
- Images: AdminPanel supports uploading images as data URLs (FileReader) and `db.isValidUrl()` accepts `data:image/` URIs — store image data directly when appropriate.
- Auth: an admin user is auto-created on first run (`admin@reza.com`, password `admin`). Default 2FA secret is `DEFAULT_ADMIN_2FA_SECRET` in `services/db.ts`.

### Dev / build / run
- Install: `npm install`
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`
- Preview built site: `npm run preview`
- No external runtime env vars are required for local dev. The project has `firebase` listed in `package.json` but there is no runtime Firebase usage in source files — treat as an unused dependency unless you discover otherwise.

### Integration points & testing notes
- `services/db.ts` is the place to simulate or wire a real backend. If replacing with a real API, keep the same method signatures used by `GlobalContext` and `pages/*`.
- `GlobalContext` uses `db` methods directly; changes to `db` signatures require updating context wrappers.
- Admin flows (product save/delete, settings upload, order status) are exercised in `pages/AdminPanel.tsx` — use this page for manual testing after code changes.

### Helpful file references (quick)
- `services/db.ts` — simulated backend and localStorage schema
- `contexts/GlobalContext.tsx` — app-level state, methods used by UI
- `pages/AdminPanel.tsx` — admin CRUD + settings + file upload examples
- `components/*` — reusable UI; follow existing styling and toast usage (`showToast`)
- `types.ts` — canonical types for Product, User, Order, SiteSettings
- `data.ts` — seed products used at first run

### Examples agents should follow
- To add a new product field: update `types.ts`, accept and sanitize it in `db.saveProduct()`, and surface it in `pages/AdminPanel.tsx` and `ProductCard.tsx`.
- To change admin credentials/2FA seed: edit `DEFAULT_ADMIN_2FA_SECRET` in `services/db.ts`. Remember this file also bootstraps the admin user on first run.
- To add a backend endpoint replacement: implement a new module that exposes the same functions as `db` and switch `GlobalContext` to import that module.

If anything here is unclear or you want the instructions to emphasize additional files or workflows, tell me what to add or adjust.
