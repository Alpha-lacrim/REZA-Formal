# Session Handoff

Last updated: 2026-07-13

This is the chronological continuity log for the repository. Keep the newest session first. Each new session must create an entry at startup and finalize it before handoff, even when no code changed.

## 2026-07-13 - Build the complete commerce feature set

### Objective and starting state

- Create a dedicated branch and expand the verified storefront into a complete first production-capable shopping workflow from database models through customer/admin UI.
- The repository started clean on `main`, aligned with `origin/main`, after the first-launch audit and Docker verification.

### Changed

- Created and stayed on `feature/complete-commerce`; no remote push or merge was performed.
- Added migrations `0006` and `0007` with variants, addresses, shipping, coupons/redemptions, enriched orders and immutable item/address/shipping/coupon snapshots, payments and partial/full refund state, inventory movements, order events, persistent carts/wishlists, verified reviews, returns, bespoke requests, newsletters, and notification outbox records.
- Added server-authoritative Decimal quotes, default paid shipping selection, user-scoped UUID idempotency, locked variant inventory, coupon limits, COD/manual payment records, strict order/payment/return transitions, COD collection on delivery, manual-payment shipment guard, cancellation/restock, multi-item returns, refund accounting, tracking/admin notes, and historical order serialization.
- Replaced legacy shopping routes with the commerce API; added customer/staff endpoints, health/readiness, sensitive endpoint throttles, and explicit CSRF bootstrap/header enforcement for public and authenticated browser mutations.
- Completed variant-aware customer cart/wishlist synchronization, structured checkout, coupon/shipping/payment selection, confirmation/history/addresses/returns, real ratings/reviews, bespoke/newsletter submission, and safe offline-catalog behavior.
- Completed staff product/variant, order/tracking, coupon, shipping, payment, review, return, bespoke, message, settings, and dashboard flows.
- Added Persian policy pages and removed the unverified trust badge. Added `docs/COMMERCE_OPERATIONS.md` for provider, fulfillment, refund, backup, and launch boundaries.
- Replaced runtime Tailwind CDN use with audited local PostCSS/Tailwind builds, fixed Persian metadata/seed copy, added route-level code splitting, Nginx security/cache headers, chained Docker health checks, and GitHub Actions checks.
- Created phase commits `57b8e27` (commerce schema), `f3c6fda` (transactional backend), `db4efc5` (customer/staff frontend), and `eb2b972` (operations, CI, documentation, and browser-found fixes).

### Verification

- Django isolated system check and migration-drift check passed; all 50 backend tests passed with SQLite.
- Frontend TypeScript check and production Vite build passed. The initial 512.81 kB bundle was split; the final shared chunk is 344.12 kB and route chunks load separately.
- Full `npm audit`, including development dependencies, reports zero known vulnerabilities after updating PostCSS.
- `docker compose config --quiet` passed. Backend and frontend images rebuilt successfully; SQL Server applied migrations `0006` and `0007` and seeded the two default shipping methods.
- SQL Server, Django readiness, and Nginx-proxied readiness all report healthy. Live-container `manage.py check` passed.
- A real Nginx/API smoke flow passed: temporary admin product with two variants, coupon, user registration, address, cart, wishlist, discounted quote, first/idempotent order creation (`201`/`200`), tracking, cancellation/restock, order snapshot after catalog deletion, bespoke request, and newsletter subscription. All temporary users and records were removed and cleanup counts were zero.
- Headless Microsoft Edge rendered and visually verified the live product and returns-policy routes at 1440x1200 with local assets, RTL layout, variant stock, and policy content.
- `git diff --check` and tracked secret-name review passed before final commit.

### Incomplete / follow-up

- COD and staff-confirmed manual payment are functional. Online payment, outbox email/SMS delivery, carrier label/tracking APIs, tax/accounting, monitoring, and durable production object storage still require provider/account choices and credentials; no fake success path was added.
- OTP delivery/enrollment and the frontend Google Identity button remain intentionally unavailable until their real provider flows are configured.
- Policy text, return eligibility, shipping prices/zones, currency/tax interpretation, and bespoke restrictions require owner/legal/operations approval before public launch.
- A production backup/restore drill was not run. Per owner instruction, no backup was taken before applying these migrations to the disposable development database.

### Owner actions required

- Review and approve the five customer policy pages plus the default `STANDARD` (150,000 Toman; free over 20,000,000) and `PICKUP` shipping rules.
- Create a non-default administrator when staff access is needed; no fixed admin account was left behind.
- Choose/configure real payment, email/SMS, carrier, tax/accounting, media, and monitoring providers before production; then run their sandbox/failure/webhook and backup/restore checks from `docs/COMMERCE_OPERATIONS.md`.
- Decide when to merge `feature/complete-commerce` into `main` and push it. This session intentionally does neither.
- The verified development stack remains running at `http://localhost:3000` (SQL host port `11433`); use `docker compose down` to stop it without deleting data.

## 2026-07-13 - Confirm the local main merge

### Objective and starting state

- Confirm the owner's request to merge the completed development work into `main`.
- The repository started clean with both local `main` and `dev` already pointing to verified commit `f76f232` because the prior session completed a fast-forward merge.

### Changed

- No application code changed and no second merge was necessary.
- Recorded the confirmed branch state in this continuity log; local `main` remains the active branch.

### Verification

- `git status --short --branch` showed a clean local `main` before this continuity entry.
- `git branch --verbose --verbose` and `git log -4 --oneline --decorate` confirmed `main` and `dev` both contained commits `e4f2505`, `04218a3`, and `f76f232`.
- The merge was a fast-forward; no merge commit or conflict was introduced.

### Incomplete / follow-up

- `origin/main` remains behind the verified local history because no remote push was authorized.

### Owner actions required

- Push `main` when the local commits should be published to the remote repository.

## 2026-07-13 - Prepare the first development launch

### Objective and starting state

- Complete the remaining local setup actions from the audit before the project's first launch.
- The repository started clean on local branch `dev` at commit `04218a3`; no database, deployed environment, or legacy administrator account has been created.

### Changed

- Added `scripts/Setup-DevelopmentEnv.ps1` to create ignored development env files, generate fresh Django/SQL secrets without printing them, synchronize the initial database password, remove obsolete Gemini variable names, preserve existing secrets on later runs, and optionally override the host SQL port.
- Generated new ignored root/backend secrets for the first launch. The previously tracked SQL value is not used by the new SQL Server, and `frontend/.env.local` contains no Gemini/Generative AI key.
- Refreshed `backend/.venv` from `backend/requirements.txt`, moving it from Django 6.0 to Django 5.2.16 and installing the missing Google Auth, WhiteNoise, and Gunicorn packages.
- Built and launched the complete Docker stack. Windows refused host port `1433`, so the ignored root `.env` now maps SQL Server to host port `11433`; container-to-container traffic remains on `1433`.
- Fixed Django's live ODBC configuration: `mssql-django` requires `Encrypt` and `TrustServerCertificate` inside `OPTIONS.extra_params` and `connection_timeout` as its supported option. Added a regression test and validation for the environment values.
- Replaced runtime `picsum.photos`/texture placeholders with bundled image assets so fresh installs render meaningful hero, about, category, bespoke, SEO, and decorative imagery without third-party placeholder availability.
- Confirmed there is no legacy `admin@reza.com` account or superuser. The first seed intentionally skipped admin creation because credentials were not configured.
- Completed a cookie-authenticated register/profile/order/history/cancel/stock/logout flow through Nginx, then removed the temporary smoke user, order, and order items.
- Prepared this verified history for a local fast-forward from `dev` to `main`; no remote push is performed automatically.

### Verification

- The setup helper succeeded on first run, preserved existing secrets on a second run, produced synchronized SQL passwords with required complexity, and kept all env files ignored.
- `pip install --upgrade -r requirements.txt` completed; `pip check` reports no broken requirements.
- Isolated Django `check`, migration-drift check, and 22/22 tests passed with SQLite and no live SQL access.
- `npm.cmd run typecheck` and the Vite production build passed after the local-image changes.
- `docker compose config --quiet` passed; the frontend and backend images built successfully, including Nginx, Node, Python 3.11, Microsoft ODBC Driver 18, all Python dependencies, and Gunicorn.
- The fresh SQL Server container created database `reza`; migrations `0001` through `0005`, static collection, catalog/site-settings seed, and Gunicorn startup completed successfully.
- Live-container `manage.py check` passed. Frontend, direct API, proxied product/settings API, and Django admin-login routes returned HTTP 200.
- The authenticated Nginx/API flow returned the expected 201/200/401 statuses and restored product stock after cancellation.
- Headless Microsoft Edge produced a populated React DOM and a visually inspected 1440x1000 screenshot with the RTL navigation, local hero image, and page content rendered correctly.
- Final Compose state: SQL Server, backend, and frontend are all running; host ports are `11433`, `8000`, and `3000` respectively.

### Incomplete / follow-up

- No interactive admin CRUD flow was run because no administrator was requested or created; public/user flows and the Django admin login route were tested.
- Tailwind still loads from its browser CDN. Move it to the build pipeline before enforcing a strict production Content Security Policy.
- OTP delivery/enrollment and the frontend Google Identity flow remain deliberately unavailable until real providers/flows are implemented.
- Production still requires same-site HTTPS deployment configuration and durable external media storage or a persistent compatible volume.

### Owner actions required

- No database backup, legacy-email repair, old admin deletion, or live SQL credential change was necessary: this was a new database initialized with a freshly generated ignored password.
- The development stack is currently available at `http://localhost:3000`; stop it without deleting data using `docker compose down` when finished.
- Create an administrator only when needed, using `docker compose exec backend python manage.py createsuperuser` or by configuring both optional seeded-admin variables and rerunning the seed command. Do not use the retired fixed admin credentials.
- The old SQL string remains in local Git history but is unused by any launched service. Only purge history if that old value was reused for another real system or the repository was shared before redaction.
- Local `main` will contain the verified commits after this session; pushing to the remote remains an explicit owner decision.

## 2026-07-12 - Complete the full-project audit

### Objective and starting state

- Resume the 2026-07-10 audit, reconcile the existing frontend/backend/infrastructure changes, finish remaining cleanup, and run final verification.
- The audit began from clean `main`; during the interrupted continuation it was checkpointed as commit `e4f2505` on branch `dev`. No pre-existing user changes were discarded.

### Changed

- Added the requested continuity layer: `AGENTS.md`, `Codex.md`, and this session log, plus a pointer from Copilot instructions.
- Removed tracked cookie/debug scripts, obsolete root Vite/package files, a source snapshot archive, duplicate/empty frontend files, generated artifacts, fixed demo credentials, and unused Firebase/Gemini/OTP browser dependencies.
- Replaced stale setup/migration/connection docs; scrubbed a live SQL password from the current tree; made Docker secrets and optional seeded-admin credentials environment-driven; and made Vercel explicitly frontend-only.
- Corrected frontend API-base handling (`/api` no longer becomes `/api/api`), removed unsafe retries to a visitor's localhost, added the Vite API/media proxy, protected profile/admin routes, and made Django data authoritative.
- Reduced localStorage support to a read-only emergency catalog and retired legacy browser-only account/admin/order/message/settings data so failed admin writes cannot be reported as local success.
- Fixed registration cookies and validation, stale/invalid-user cookie login/logout behavior, access-token refresh/retry, signed Google ID-token verification, safe disabled OTP delivery, cookie/HTTPS settings, default permissions, and production secret checks.
- Added migration `0005` to normalize and enforce unique user emails and clear unusable legacy 2FA secrets; concurrent register/Google account creation now handles database uniqueness races deterministically.
- Made catalog seeding idempotent and credential-free by default; seeded orderable backend products matching frontend IDs; hardened product/contact validation and collision-resistant IDs.
- Kept order totals server-calculated and made creation, user/admin cancellation, and concurrent stock restoration atomic/idempotent.
- Fixed explicit settings-image deletion/storage cleanup, production media serving through Nginx's shared read-only volume, named SQL Server instance ports, API response normalization, catalog/cart stock behavior, protected-page loading, metadata cleanup, UTF-8 Persian text, and duplicated custom CSS.
- Added an isolated SQLite backend suite with 21 passing tests covering auth/refresh, validation, Google/OTP safety, stock/order invariants, settings deletion, product validation, and seeding.

### Verification

- `npm.cmd ls --depth=0` passed with no missing/extraneous top-level frontend packages.
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed with Vite 6.4.3 (1,736 modules transformed).
- `python manage.py test --settings=reza_backend.test_settings` passed: 21/21 tests; no live SQL Server connection.
- Isolated `manage.py check` and `makemigrations --check --dry-run` passed with no model drift.
- Production-like `manage.py check --deploy` passed with temporary validation-only secure settings.
- Python `compileall` and `pip check` passed for the installed environment.
- `docker compose config --quiet` and `vercel.json` JSON parsing passed; the Docker client emitted only a sandbox access warning for the user's global Docker config.
- `git diff --check`, tracked-current-tree secret scans, mojibake scans, and referenced static-image checks passed.

### Incomplete / follow-up

- A full Docker image build/start and browser end-to-end checkout/admin test were not run; they require dependency/image downloads and a running Docker Desktop/SQL Server stack.
- The frontend still uses Tailwind's browser CDN. Migrate it to a build-time Tailwind/PostCSS setup before enforcing a strict production Content Security Policy.
- OTP enrollment/delivery is deliberately unavailable (`501`) until an authenticator enrollment or independently verified email/SMS provider is implemented.
- Google backend verification is ready, but no Google Identity frontend flow/button is currently implemented or rendered.
- Uploaded media uses local/mounted filesystem storage; production needs durable external media storage or a persistent compatible volume.

### Owner actions required

- **Rotate the SQL password now.** The value previously committed in `SQL_SERVER_MIGRATION_SUMMARY.md` matched the current `backend/.env` value. Change the SQL login itself and every ignored/deployment secret that uses it.
- If this repository was pushed or shared, coordinate a `git filter-repo` history purge and force update after rotation; current-file redaction does not remove the old secret from Git history.
- Remove the now-unused ignored `.env.local` Gemini key. If it was ever used in a browser build or shared, rotate/revoke it even though current code no longer injects or reads it.
- Refresh the existing virtual environment with `backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`, then rerun the backend checks. Download approval was unavailable during this audit; the existing venv is on Django 6 and lacks Google Auth, WhiteNoise, and Gunicorn, while the project now targets Django 5.2 LTS.
- If the old seeded `admin@reza.com` / `admin` account exists in SQL Server, change its password or remove it. New seeds no longer create fixed credentials.
- Before first Docker run, copy `.env.docker.example` to root `.env`, set strong `DJANGO_SECRET_KEY` and `DB_PASSWORD` values, and optionally set both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD`.
- Back up an existing database before migration `0005`, run `python manage.py migrate`, and resolve any user IDs it reports with blank or case-insensitive duplicate emails. The migration intentionally clears legacy `two_factor_secret` values and cannot restore them on reverse migration.
- For production, configure same-site HTTPS frontend/API domains, allowed hosts/origins, secure cookies/proxy/HSTS settings, persistent media, and optional Google identity settings.
- The completed changes are local on branch `dev`, which has no upstream. Pushing or merging them into `main` is still an owner decision.

## 2026-07-10 - Full-project audit and continuity setup

### Objective and starting state

- Review the complete React/Django/SQL Server/Docker project structure and fix verified issues.
- Add durable project context and mandatory session handoff maintenance.
- Starting branch: `main`, clean and aligned with `origin/main` before this audit.

### Changed

- Began the repository map, security review, frontend/backend/infrastructure audit, and continuity-file setup that was completed in the 2026-07-12 session above.

### Verification

- Initial frontend build, Django checks, repository mapping, and secret/configuration scans informed the completed verification recorded above.

### Incomplete / follow-up

- Work continued and was completed under the 2026-07-12 entry.

### Owner actions required

- Carried forward to the completed 2026-07-12 entry.

## Entry template for future sessions

Copy this section to the top of the session list when a new session starts:

```markdown
## YYYY-MM-DD - Short session title

### Objective and starting state
- Goal and relevant pre-existing changes.

### Changed
- Files and behavior actually changed.

### Verification
- Exact commands and their results.

### Incomplete / follow-up
- Remaining work, risks, or checks not run.

### Owner actions required
- Credentials, configuration, deployment, migrations, or decisions needed from the repository owner; write `None` if there are none.
```
