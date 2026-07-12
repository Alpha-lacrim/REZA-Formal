# Session Handoff

Last updated: 2026-07-13

This is the chronological continuity log for the repository. Keep the newest session first. Each new session must create an entry at startup and finalize it before handoff, even when no code changed.

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
