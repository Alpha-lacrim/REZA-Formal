# Changes Performed - 2026-06-28

## Frontend

- Added API normalization in `frontend/services/api.ts` for products, users, orders, and site settings.
- Changed API errors to real `Error` objects so UI screens can display backend `detail` messages.
- Added `cancelOrder` API support.
- Clamped cart additions and quantity updates to tracked stock in `GlobalContext`.
- Preserved normalized user address/session data in `GlobalContext`.
- Disabled product-card add buttons for explicitly out-of-stock products.
- Treated missing stock as untracked stock on the product detail page instead of sold out.
- Added checkout-side validation for over-stock cart items and whitespace-only addresses.
- Replaced the empty/commented fallback catalog with a compact stocked seed catalog using existing assets.
- Removed the stale `/index.css` link from `index.html` to clear the Vite build warning.

## Backend

- Added `User.address` and migration `0004_user_address.py`.
- Included address in user serialization and auth/profile responses.
- Improved registration validation and avoided username collisions for same local-part emails.
- Made order creation atomic:
  - validates all products and quantities before writing,
  - locks product rows during stock changes,
  - recalculates total server-side,
  - deducts stock only after validation passes.
- Added `POST /api/orders/<id>/cancel/` for pending-order cancellation with stock restoration.
- Prevented reopening cancelled orders from the admin status endpoint.
- Returned saved `SiteSettings` serializer instances after updates.
- Added request context to product detail serialization for consistent media URLs.

## Verification

- `npm.cmd run build` passed after running outside the sandbox because Vite/esbuild needed parent-directory reads blocked by the managed sandbox.
- `python manage.py check` passed outside the sandbox after `python.exe` failed to start inside the sandbox.
- `python manage.py makemigrations --check --dry-run` passed and reported no pending model changes.

## Repository Hygiene Follow-up

- Added ignore rules for local virtual environments, Python bytecode/cache folders, local SQLite DB files, Django runtime media, and frontend build output.
- Removed generated/runtime paths from Git tracking with `git rm --cached` while leaving local files available on disk where they still exist.
- The cleanup covered `backend/.venv`, `backend/db.sqlite3`, `backend/media`, Python `__pycache__` folders, `frontend/build`, and `frontend/dist`.
