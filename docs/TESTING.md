# Testing and CI

Run commands from the nested `REZA-Formal` Git root. Node 22 and Python 3.11 are the CI baselines. Install Python dependencies from `backend/requirements.txt` into a virtual environment. No command below uses the application SQL Server database.

## Production infrastructure gates (Batch 10)

CI pins the patch versions in the runtime builders and installs the complete Python
hash lock. `python scripts/check-build-inputs.py` checks input/lock compatibility,
image digests, npm root metadata and tracked secret/backup filenames. It does not
claim a history or ignored-file secret audit. `python scripts/validate-production-config.py`
uses only a synthetic env file to check the production override and never starts
services or prints resolved configuration.

`docker build -t reza-b10-backend:local backend` and
`docker build -t reza-b10-frontend:local frontend`, then
`node scripts/test-production-runtime.mjs` exercise real Gunicorn/Nginx/SQL on a
unique disposable network with synthetic credentials/data and owned volumes. The
fixture tests restricted DB runtime login, startup flags, non-root/read-only paths,
static/media serving, correlation/redaction, graceful stop, recreation at a new IP,
SQL checksum/new-database restore and media/new-volume restore, plus liveness when
SQL is unavailable. `OPS_BACKEND_IMAGE`/`OPS_FRONTEND_IMAGE` may select local test
images. Cleanup touches only this fixture's names; no application env or volume is used.

The expanded fixture also restores a root-owned legacy archive with original bytes/
modes, prepares non-root volume ownership and rejects symlinks. It uses a short-lived
test CA to prove encrypted/certificate-validated SQL, wrong-host/unknown-CA rejection
and HTTPS ingress with redirects/HSTS/Secure cookies. No host trust store is modified.

CI also gates fixable high/critical image advisories with checksum-verified Trivy
0.75.0 through `scripts/scan-runtime-images.mjs`; local mode uses its pinned Docker
image, CI passes the checksum-verified native binary. Official database fallback
sources are tried without allowing unavailable or stale-scan evidence to pass.
Full-severity reports and a summary are stored in ignored `.ops-reports/` and CI
JSON artifacts; unfixed findings remain visible for review. The final local snapshot
has zero frontend advisories and zero fixable HIGH/CRITICAL backend findings, with
63 unfixed HIGH/CRITICAL package findings (23 advisory IDs). No risk acceptance or
hosted execution is implied. Workflow syntax/expressions pass actionlint 1.7.12.
CI has no image push/deployment job. Full launch approval, TLS/backup targets,
unfixed vulnerabilities and hosted execution remain owner gates. See
[operations runbook](OPERATIONS.md). Runtime evidence is recorded in Handoff.

## Security gates (Batch 9)

Run `npm.cmd audit --omit=dev` and `npm.cmd run audit:security` in frontend.
The full policy gate accepts only GHSA-vfj7-8cjw-p6xm in five dev-only build entries,
expires 2026-11-02 00:00 UTC, and rejects new/runtime advisories or service errors.
Python: install `pip-audit==2.10.1` as verification tooling, then run
`python -m pip_audit -r backend/requirements.txt` from the root. This audits fresh
runtime resolution rather than all incidental packages in an existing environment.

`node scripts/test-nginx-security.mjs` runs disposable Docker fixtures: ten
status/header/media cases (including 502/504), two spoofed forwarding probes, and cleanup
of only its own containers/network/temp media. It defaults to the digest-pinned
unprivileged image from `frontend/Dockerfile` and tests JSON logs, request IDs,
index/hashed-asset cache policies, source-map blocking and non-root/read-only runtime.
`NGINX_TEST_IMAGE` can select an available compatible unprivileged Nginx image. Batch 9 locally used the cached
`reza-formal-frontend:latest` (Nginx 1.27.5) with the checked-in source config mounted read-only.
No real application media/DB is mounted. Actual TLS/HSTS deployment remains separate.

`test_sessions.py` and `test_hardening.py` cover session/cookie/CSRF, role/ownership,
image/storage, counter/proxy and disclosure/header negatives. `test_security_sql.py`
adds three separate-connection refresh reuse, refresh/logout and shared counter tests.
Twelve SQL-only cases skip explicitly under SQLite. Migration-backfill/index tests
restore the latest graph before subsequent security tests; no assertion is removed.
Native admin login is also throttled across IPs/accounts and returns Retry-After.
The security workflow runs dependency/proxy gates on PRs, program pushes, weekly and
manually. Hosted CI results are not implied by local success.

Vitest 4.1.11 was compatibility-tested against Node 22 and Vite 6 with the full suite.
Four Chrome journeys include a save/reopen gallery assertion; the editor waits for
fresh staff records before closing. No live provider is used. See
[security rollout and remaining limitations](SECURITY_HARDENING.md).

## Fast gates

```powershell
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
cd ..\backend
.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings
.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings
cd ..
docker compose config --quiet
```

`npm test` runs the retained Node regression suite followed by Vitest. `npm run test:watch` watches Vitest cases; `npm run test:unit -- tests/commerce.test.tsx` selects one file. Vitest uses RTL/user-event and MSW with unhandled requests treated as errors. Its fixed synthetic API origin cannot reach the production backend. Test cleanup resets handlers, mounted trees and local storage. Existing mounted AdminPanel media/edit and auth race regressions remain in `test:regression`.

Lint uses ESLint and typescript-eslint recommended correctness rules. Existing `any` and unused-symbol debt is deliberately excluded; strict DTO typing remains Batch 5. This is not a formatting gate, a hooks-dependency audit or a claim that TypeScript strict mode is enabled. The baseline .mjs regression harness is excluded from ESLint and remains executable in CI.

Backend SQLite tests exercise permissions, serializer input boundaries, checkout authority, inventory, idempotency, cancellation, coupons, media validation and transactional rollback. SQL-only cases report explicit skips under SQLite. A green SQLite run does not prove SQL Server locking.

## Browser smoke lane

```powershell
cd frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright starts Vite on loopback port 3100 and `backend/e2e_server.py` on loopback port 18080. Both ports must be unused; existing servers are never reused. On Windows the default interpreter is `backend/.venv/Scripts/python.exe`; elsewhere it is `python`. Override with `E2E_PYTHON` when needed. `vite.e2e.config.ts` gives the smoke lane dedicated ports and a fixed local API proxy; Vite receives an empty `VITE_API_BASE`. Normal development ports/configuration are unchanged.

If the Chromium download is unavailable, an installed Chrome or Edge can run the same tests with `$env:PLAYWRIGHT_CHANNEL='chrome'` (or `'msedge'`) before `npm.cmd run test:e2e`. Playwright creates a temporary profile; it does not use the owner's browsing session. CI leaves this variable unset and installs pinned Chromium. External fonts/assets are blocked by the smoke fixture; local API responses are never mocked.

The backend runner creates a marked temporary directory, migrates SQLite and seeds synthetic `.invalid` customer/admin accounts plus one product/variant/shipping method. `e2e_settings.py` rejects directories lacking that marker. Test account passwords are fixtures confined to this runner, not development or production credentials. No HTTP mock reports checkout/payment success. The customer journey submits supported COD and asserts the order is unpaid; no provider is simulated. The administrator edits the product through the actual staff form and verifies it after reload.

Four tests cover customer/staff/media flows: storefront; customer authentication; product/cart; COD checkout; history; staff authentication; product edit. The customer and staff cases run sequentially against the disposable seed. Traces/reports are ignored and contain only synthetic data. A process killed forcibly may leave its temporary directory for the OS to clean; it contains no live data.

If Windows reserves frontend port 3100, set `$env:REZA_E2E_FRONTEND_PORT='18180'`
(or another free loopback port) before running the browser suite. Playwright, Vite and
the disposable backend's CSRF trusted origin use the same value. The backend remains
on 18080, existing servers are never reused, and production CSRF settings are unchanged.

## SQL Server integration lane

Requires Docker with enough resources for SQL Server 2022 Developer. This is a standalone Compose project, not an override of the application stack. It has no application volumes or network and stores database state only in its disposable container. Never attach production volumes, import production backups, change the allowlisted host, or combine it with `docker-compose.yml`.

```powershell
# Supply a fresh disposable strong password, not any application credential.
$env:REZA_SQL_TEST_PASSWORD = 'Disposable-local-test-only-493!'
docker compose -f docker-compose.sql-test.yml config --quiet
docker compose -f docker-compose.sql-test.yml up --build --abort-on-container-exit --exit-code-from tests
docker compose -f docker-compose.sql-test.yml down
```

The test image includes ODBC Driver 18. `sql_test_settings.py` requires `REZA_SQL_TEST=disposable`, allows only `sql-test` or loopback port 11434, and fixes the test database name to `test_reza_ci_disposable`. The normal DB environment variables are not used for its connection. Django creates the test database from migrations and runs the full regression suite, including legacy migration backfill and database constraints.

`test_sql_concurrency.py` adds six separate-connection tests for final-unit concurrent checkout, duplicate idempotency, cross-customer key reuse, a held row lock blocking another writer, database stock constraints, mid-checkout rollback, decrement and one-time cancellation restock. Thread/barrier/future waits are bounded; SQL deadlocks/errors fail the lane, not silently retried into a pass. A database-level failure requires investigation before claiming DB-002 resolved. Further coupon/edit/refund race matrices remain follow-up coverage.

To run directly against this same disposable container with ODBC installed, set `REZA_SQL_TEST=disposable`, `REZA_SQL_TEST_HOST=127.0.0.1`, and the same test password, then run `python manage.py test --noinput --settings=reza_backend.sql_test_settings` from backend. The lane never uses `--keepdb`.

The native path avoids rebuilding the Python image when Python requirements and ODBC Driver 18 are already installed:

```powershell
# From the repository root, with REZA_SQL_TEST_PASSWORD set as above:
docker compose -f docker-compose.sql-test.yml up -d --wait sql-test
$env:REZA_SQL_TEST = 'disposable'
$env:REZA_SQL_TEST_HOST = '127.0.0.1'
cd backend
.\.venv\Scripts\python.exe manage.py test --noinput --settings=reza_backend.sql_test_settings --verbosity=2
cd ..
docker compose -f docker-compose.sql-test.yml down
```

Run discovery from `backend`, not the repository root. On September 28 this native runner passed all 99 tests on SQL Server 2022 Developer 16.0.4255.1; the test database was destroyed and the disposable container/network removed. This establishes the covered scenarios, not every lock-order/coupon/refund race or hosted container-job execution.

## CI behavior

Batch 8 adds `shop.test_performance` API query/byte budgets and read-only inventory probes, plus `shop.test_sql_indexes` SQL-only SKU plan/introspection/migration round trips (two additional SQLite skips). Run the performance module on either isolated settings; run index tests only on the disposable SQL lane. [DATABASE_PERFORMANCE.md](DATABASE_PERFORMANCE.md) records fixtures, baseline/after evidence and limits. Frontend catalog/customer tests cover server page ownership, beyond-preview cart selection and embedded order expansion; Chrome counts product/order detail requests.

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, `dev`, `feature/**`, and `codex/**`: lockfile install, lint, typecheck, both frontend suites, build, Django system/drift/tests and validation of both Compose topologies. It has read-only repository permissions and cancels superseded runs.

`.github/workflows/extended-tests.yml` is manually dispatched with `e2e`, `sql`, or `all`. Browser reports upload on failure; SQL teardown runs even after failure. These expensive jobs are separate from the fast gates. Hosted workflow success and branch protection must be verified after publication; local success is not a hosted CI run. See the dated testing audit for actual execution evidence and unavailable lanes.
