# Testing and CI

Run commands from the nested `REZA-Formal` Git root. Node 22 and Python 3.11 are the CI baselines. Install Python dependencies from `backend/requirements.txt` into a virtual environment. No command below uses the application SQL Server database.

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

Three tests cover seven requested flows: storefront; customer authentication; product/cart; COD checkout; history; staff authentication; product edit. The customer and staff cases run sequentially against the disposable seed. Traces/reports are ignored and contain only synthetic data. A process killed forcibly may leave its temporary directory for the OS to clean; it contains no live data.

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

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, `dev`, `feature/**`, and `codex/**`: lockfile install, lint, typecheck, both frontend suites, build, Django system/drift/tests and validation of both Compose topologies. It has read-only repository permissions and cancels superseded runs.

`.github/workflows/extended-tests.yml` is manually dispatched with `e2e`, `sql`, or `all`. Browser reports upload on failure; SQL teardown runs even after failure. These expensive jobs are separate from the fast gates. Hosted workflow success and branch protection must be verified after publication; local success is not a hosted CI run. See the dated testing audit for actual execution evidence and unavailable lanes.
