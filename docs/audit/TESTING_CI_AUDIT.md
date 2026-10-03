# Testing, CI and operations audit

## Batch 9 verification - 2026-10-03

Full disposable SQL Server: 161/161, zero skips (46.458s); SQLite: 161 cases, 149 pass/12 SQL skips (11.754s). Frontend 9 Node + 69 Vitest, lint/type/build and four Chrome journeys pass. Ten real Nginx status/header/media cases plus two spoofed forwarding probes pass; native admin account/IP throttle negative passes. Production npm/resolved Python advisory reports are clear; full npm retains five dev-only high entries under an exact gate expiring 2026-11-02. PR/push/weekly/manual security workflow added; hosted CI/image OS scans and actual TLS ingress remain unverified. See [security evidence and rollout](../SECURITY_HARDENING.md) and Handoff for iterations/provenance.

## Batch 8 verification - 2026-10-03

- Full disposable SQL Server suite: 130/130 pass, zero skips, 76.941s; includes independent connections/transactions, query budgets, JSON/Decimal revenue, unique SKU lookup plan and 0008 forward/reverse. Final six-test performance module (including newly added read-only inventory report case) passes on SQL in 2.671s. SQLite full 130 cases: 121 passes/nine intentional SQL-only skips, 15.376s; final six performance tests pass in 1.069s. Current discovery is 131 cases. No production DB, row-lock inference from SQLite or hosted result.
- Frontend: 9 Node + 67 Vitest pass; final changed state/catalog/cancellation subset 20/20 passes. Lint/typecheck/build pass; baseline build main 392.64 KB/117.39 gzip, final before cleanup 395.78/118.38, AdminPanel unchanged 85.32/20.67. Four real-Django Chrome journeys pass (20.7s); final customer cache/HTTP rerun passes (7.8s), one product detail request and zero expanded-order detail requests. Test data/media disposable. Dependency junction cleanup mistake/restoration and final rechecks are recorded in Handoff.
- Django system/drift checks and both Compose configs pass. SQL test database destruction/container/network teardown and temporary baseline worktree cleanup completed. Sandbox network/ODBC/esbuild errors passed with approved retries. Initial incomplete return fixture was corrected and baseline rerun: 77 -> 3 queries. [Full evidence/limits/rollout](../DATABASE_PERFORMANCE.md).

## Batch 5 verification - 2026-09-30

- `npm.cmd run lint` and `npm.cmd run typecheck`: pass, including no-explicit-any for extracted auth/catalog/HTTP/helper modules.
- `npm.cmd test`: 12 Node regressions pass (5.94s), 33 Vitest tests pass (4.35s). New concurrency, DTO/error, mounted session and navigation cases exercise the actual adapter or deferred domain calls. Concurrent success/failure, late 401s, one retry, CSRF rotation, multipart replay, auth endpoint exclusions, abort isolation, logout ordering and response-body identity guards are covered.
- `npm.cmd run build`: pass, 2.37s; main bundle 349.35 kB / 104.00 kB gzip. Initial Vitest startup failed on the already-documented sandbox esbuild directory read; authorized outside-sandbox test/build execution passes.
- `REZA_E2E_FRONTEND_PORT=18180`, `PLAYWRIGHT_CHANNEL=chrome`, `npm.cmd run test:e2e`: three real-Django Chrome smoke journeys pass in 11.3s (catalog, customer authentication/cart/COD checkout/history, staff authentication/product edit). Temporary synthetic database/media only; no production data.
- Source/test/contract diff reviewed; baseline-to-final whitespace and changed-file credential signature checks completed during closeout. No backend/SQL/Compose source changed, so those suites were not repeated. No production deployment or hosted CI result is claimed. Legacy commerce DTOs, full cart mutation ordering, quote races and effective staff capability policy remain scoped follow-ups.

## Batch 4 verification - 2026-09-30

- SQL Server: full suite **116/116 passes, zero skips**, 28.683s, using the existing isolated `reza-sql-tests` topology and native ODBC runner. This includes the constant product query budget, large staff pages, legacy missing-payment characterization, quote/address regression and seven SQL-only cases (new concurrent newsletter creation/reactivation). Final SQL coverage also includes malformed body, multipart normalization and conflict-classification regressions.
- Final SQLite: **116 cases, 109 passes/seven deliberate SQL-only skips**, 6.528s. Django `check` and `makemigrations --check --dry-run` with `reza_backend.test_settings` pass; no migrations.
- Frontend: `npm.cmd run lint`, `npm.cmd run typecheck`, ten retained Node tests, fourteen Vitest tests (six new admin-page cases), and production build pass. Build 4.67s, main bundle 345.04 kB / 102.16 kB gzip. Sandbox esbuild parent-directory reads failed; the same unit/build gates passed outside the sandbox.
- Browser: three real-backend Chrome smoke tests pass in 11.0s. Windows reserved 3100; used `PLAYWRIGHT_CHANNEL=chrome` and `REZA_E2E_FRONTEND_PORT=18180`, coordinated with disposable backend CSRF. An intermediate run exposed quote validation wrongly requiring a completed address; a separate quote serializer and regression fixed it, then all journeys passed. Synthetic COD checkout remains unpaid; staff product edit persists.
- Both Compose configurations validate (sandbox warns about unreadable global Docker config). An initial SQL compose command from frontend used the wrong relative file path; the root-directory rerun passes. Django test runner reports database destruction; disposable test container/network removal and empty project-filtered container inventory are confirmed. A supplementary database-count SQL command had quoting syntax failure, so no separate post-test database inventory claim is made.
- Review: batch-to-base full source/test/contract diff, UTF-8 text, explicit field declarations, permissions, page completeness, secret-signature/path checks and `git diff --check`. No production data, deployment, main branch or applied migrations changed. Wider DB-002/TEST-003 schedules, hosted CI, frontend strict DTOs and actual server-driven staff screen pagination remain open.


The original baseline commands and probes below ran on September 10, 2026 on Windows/PowerShell in the nested repository. Documentation was reviewed on September 13 against unchanged application files. After the initial completion handoff, the owner requested a fresh completion check before publication; those six repeated checks are recorded separately below. Isolated Django settings use in-memory SQLite and were asserted again in the original probes. No test used the configured SQL Server or live commerce data. Build output is ignored and not committed.

## Exact baseline commands and results

### SQL Server follow-up - 2026-09-28

Docker Desktop was started after the resumed session found its Linux-engine pipe missing. Used only `docker-compose.sql-test.yml`, project `reza-sql-tests`: inspected mounts `[]` and binding `127.0.0.1:11434`. The prior full-image build had been stopped during slow base-image downloads, then an automatic approval usage limit blocked the container start. This run used the documented native Python/ODBC runner against the cached disposable SQL image; no production database, application volume or application container was used for testing.

Environment: SQL Server 2022 Developer Edition 16.0.4255.1; ODBC Driver 18; existing backend virtual environment. Set only test-lane variables `REZA_SQL_TEST=disposable`, `REZA_SQL_TEST_HOST=127.0.0.1`, and a disposable `REZA_SQL_TEST_PASSWORD`.

| Directory | Command / check | Observed result |
| --- | --- | --- |
| root | `docker compose -f docker-compose.sql-test.yml up -d --wait sql-test` | PASS; disposable service healthy |
| backend | `.\.venv\Scripts\python.exe -u manage.py test --noinput --settings=reza_backend.sql_test_settings --verbosity=2` (initial) | FAIL; 98 cases, one invalid media fixture and one same-key concurrency failure; 29.183s |
| backend | Same command with labels `shop.test_sql_concurrency shop.test_product_media` after fixes | PASS; 14 cases, 5.328s |
| backend | Full SQL command after fixes | PASS; 99 cases, zero skips, 27.621s; fresh migrations and legacy migration-backfill test passed; database destroyed |
| backend | `manage.py check --settings=reza_backend.test_settings`; `manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` using the same Python | PASS; no issues or migration drift |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS; 99 discovered, 93 passed, six SQL-only skips; 7.573s |
| isolated SQL server | Query for `test_reza_ci_disposable` after the run | Zero databases with that name remained |
| root | `docker compose -f docker-compose.sql-test.yml down`; project-filtered `docker ps -a` | PASS; only test container/network removed; no test containers remained |

The initial root-directory discovery found zero tests and is not counted as verification. Correct discovery and all reported suite results above ran from `backend`.

The concurrency failure reproduced a committed order plus an `insufficient_stock` response from its simultaneous same-key duplicate. After a validation/integrity rollback, checkout now rechecks the key and returns the same customer's committed order; a different customer receives `idempotency_key_conflict`. No stock guard, transaction or assertion was weakened. Added a cross-customer concurrent-key regression. The media fixture now stores a JSON array accepted by SQL Server's JSONField CHECK while retaining direct legacy JSON-string representation coverage and the multipart conversion path.

All six SQL-only tests pass: last-unit contention, same-key replay, cross-customer key conflict, rollback/restock, blocking row lock and database stock constraint. TEST-003 is partially addressed with executed production-engine baseline evidence. DB-002 remains open for mixed mutation lock order and broader coupon/edit/cancel/refund race schedules. No hosted CI or full Linux test-runner image execution is claimed. Frontend files were unchanged; the September 16 frontend/Chrome results remain applicable.

### Batch 3 verification - 2026-09-16

Working branch: `codex/batch-03-testing-ci`. Commands and isolation design: [TESTING.md](../TESTING.md). All new fast gates and local browser smoke pass. The SQL lane is the documented environment-specific exception; no SQL transactional-safety claim is made.

| Directory | Command / check | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS; no issues |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS; no changes |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS September 14: 98 discovered, 93 passed, five SQL-only skips; 6.768s |
| frontend | `npm.cmd ci --prefer-offline --no-audit --no-fund --fetch-retries=1 --fetch-timeout=60000 --maxsockets=4` | PASS; clean lockfile install, 367 packages, 18s |
| frontend | `npm.cmd run lint`; `npm.cmd run typecheck` | PASS; ESLint 10 and TypeScript |
| frontend | `npm.cmd test` | PASS; ten retained Node tests (7.529s) plus eight Vitest tests (4.96s) |
| frontend | `npm.cmd run build` | PASS after lint cleanups; 1738 modules, 4.29s, outside the esbuild sandbox restriction |
| frontend | `$env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e` | PASS; 3 real-backend smoke tests, 19.7s, installed Chrome 152.0.7977.84 with temporary profile |
| frontend | `npx.cmd playwright install chromium` | UNAVAILABLE locally; CDN returned HTTP 403 location restriction. The supported installed-Chrome channel passed instead; CI-pinned Chromium has not run locally |
| root | Both Compose topologies `config --quiet` | PASS; global Docker-config read warnings only |
| backend | `e2e_server.py` with HTTP health/catalog/CSRF-cookie-login probe | PASS; synthetic customer authenticated against temporary SQLite; not a browser run |
| root | `docker info --format '{{.ServerVersion}}'` | UNAVAILABLE on both dates; daemon pipe absent. No SQL integration pass |

The September 14 dependency install failed with registry resets/timeouts and incomplete cache. September 16 recovered by reusing downloaded cache, reducing parallel downloads and retrying. Lockfile installation is now verified. Build initially failed on sandbox parent-directory access; automatic review rejected the first escalation due to a usage limit. The resumed build was approved and passed. Browser setup fixes were Windows interpreter quoting, dedicated available ports 3100/18080 (Windows rejected 8000), and scoping the desktop login locator to navigation. No application auth/checkout behavior was relaxed to make tests pass.

Added nine backend boundary tests and three lane-isolation guards. Existing 81 regressions retain upload-negative, coupon-limit, inventory/version, refund and lifecycle coverage. Five SQL-only tests cover independent connections, last-unit contention, duplicate idempotency, a held row lock, constraints, rollback/decrement and one-time restock. SQLite skips these explicitly.

Frontend additions use Vitest/RTL/user-event/MSW for cart variants/stock/update/removal, persistence/recovery, cart/wishlist account synchronization and failures, catalog fallback, and real-adapter CSRF/login/logout/refresh. The default command retains mounted AdminPanel edit/media and bootstrap race regressions. Three Playwright tests cover all seven requested smoke flows through real Django, with COD checkout asserted unpaid and no simulated provider success.

Fast CI adds lint/tests and `codex/**` triggers. Browser/SQL jobs are separately dispatched. SQL has a standalone Compose project without application volumes/network, fixed test database, local host/port allowlist and opt-in guard. No production database or hosted CI run was accessed; DB-002/TEST-003 remain open.

Both workflow YAML files parsed successfully and their job/trigger structures were checked. Lint excludes generated output and the retained .mjs harness; existing any/unused-symbol debt remains explicit. Four small lint cleanups use const, remove a redundant initializer, and reuse two array-guard values. Runtime dependency versions, Vite and TypeScript were preserved. No formatting rewrite, schema migration or backend runtime change was introduced.

### Batch 2 final checks - 2026-09-14

All commands used the isolated test configuration, not the configured SQL Server. The original Batch 1 evidence below is retained for comparison.

| Working directory | Command | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS; no issues |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS; no changes detected |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS; 81 tests in 7.671s; expected negative-input warnings; test DB destroyed |
| frontend | `npm.cmd test` | PASS; 10 tests in 7.530s using the actual mounted React provider/AdminPanel and actual API adapter with fixture transport |
| frontend | `npm.cmd run typecheck` | PASS |
| frontend | `npm.cmd run build` | Sandbox failed with esbuild parent-directory access denied; approved outside-sandbox retry PASS, Vite 6.4.3, 1738 modules, 3.24s |
| root | `docker compose config --quiet` | PASS; two unreadable global Docker-config warnings; interpolated configuration was not printed |
| root | `docker ps --format '{{.Names}} {{.Image}}'`; `docker image ls --format '{{.Repository}}:{{.Tag}}'` | UNAVAILABLE; Docker daemon pipe missing. No SQL Server concurrency or live Nginx header test claimed |

Added 31 backend tests: `test_order_atomicity.py` (3), `test_inventory_authority.py` (7), `test_native_admin_integrity.py` (3), `test_refund_accounting.py` (10), `test_product_media.py` (8). Existing checkout authority, stock, idempotency, permissions, historical snapshot, cancellation and lifecycle regressions remain green. The existing variant adjustment fixture now supplies the required fresh inventory version; commerce rules were not relaxed to satisfy tests.

Before implementation, targeted tests reproduced committed cancellation/details after failure, stale sold stock restoration, native state/deletion bypasses, gross discounted refunds, status-only refunds, active gallery uploads, orphan files, inline persistence and mounted admin bootstrap loading the public catalog. Review extensions additionally reproduced stale PUT recreating deleted stock and incomplete legacy full-refund history reopening payment state.

`frontend/tests/` adds six session/catalog tests, three mounted media-form tests and one adapter/multipart/CSRF/normalization test. The suite uses Node's built-in test runner and installed TypeScript compiler with test-only React Testing Library/jsdom dependencies. It is now part of the AGENTS baseline; broader CI wiring, linting, other browser journeys and production-engine concurrency remain Batch 3. No real-browser rendering/accessibility, SQL Server, provider, restore or production test is claimed.

### Original Batch 1 baseline

| Working directory | Command | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS; System check identified no issues (0 silenced) |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS; No changes detected |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS, exit 0; 50 tests in 5.794s; test DB destroyed; expected invalid-product warning logged, no failing test |
| frontend | `npm.cmd run typecheck` | PASS; tsc --noEmit; also repeated independently after the initial combined typecheck/build invocation |
| frontend | `npm.cmd run build` (sandbox) | FAIL, exit 1; esbuild could not read parent directory / resolve vite.config.ts due to Access is denied |
| frontend | `npm.cmd run build` (approved execution outside sandbox) | PASS, exit 0; Vite 6.4.3, 1,738 modules, built in 4.91s; main JS 344.28 kB, admin 80.65 kB, CSS 54.98 kB |
| root | `docker compose config --quiet` | PASS, exit 0; two warnings that the user's .docker/config.json could not be read. Config was not printed, so interpolated secrets were not exposed |
| root | `backend/.venv/Scripts/python.exe -m pip check` | PASS; No broken requirements found |
| root | `backend/.venv/Scripts/python.exe -m pip_audit --version` | UNAVAILABLE; No module named pip_audit; no Python advisory scan claimed |
| frontend | `npm.cmd audit --json` (sandbox) | BLOCKED by advisory endpoint/network/cache access error, exit 1 |
| frontend | `npm.cmd audit --json` (approved execution outside sandbox) | Completed, exit 1 for findings: 6 affected entries, 5 high/1 moderate. No install/update/fix performed |
| frontend | `node --version`; `npm.cmd --version` | v22.21.0; 10.9.4 |

Required baseline checks pass after the build access retry. A nonzero dependency advisory result is an audit finding, not a repaired or silently waived vulnerability. Documentation-only merge gates are completeness, consistency, secret review and an unchanged application tree; production launch gates remain open.

Installed backend versions: Django 5.2.16, DRF 3.17.1, SimpleJWT 5.5.1, mssql-django 1.7.3, pyodbc 5.3.0, Pillow 12.3.0, pyotp 2.10.0, google-auth 2.55.2, Gunicorn 23.0.0 and WhiteNoise 6.12.0. These local resolutions are not a reproducible lock.

## September 13 completion recheck before publication

All six required checks were rerun after the owner's explicit request to verify that Batch 1 was complete. Application source, configuration and dependencies were unchanged from the audited tree.

| Working directory | Exact command | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS, exit 0; no issues (0 silenced) |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS, exit 0; no changes detected |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS, exit 0; 50 tests in 5.950s; test DB destroyed; expected invalid-product validation warning |
| frontend | `npm.cmd run typecheck` | PASS, exit 0; tsc --noEmit |
| frontend | `npm.cmd run build` (sandbox) | FAIL, exit 1; esbuild parent-directory access denied and vite.config.ts resolution failed |
| frontend | `npm.cmd run build` (approved execution outside sandbox) | PASS, exit 0; Vite 6.4.3, 1,738 modules, 3.75s; main JS 344.28 kB, admin 80.65 kB, CSS 54.98 kB |
| root | `docker compose config --quiet` | PASS, exit 0; two unreadable global .docker/config.json warnings; interpolated config was not printed |

Document checks confirmed all ten requested audit files, roadmap/program/handoff, 43 canonical records with every required attribute, matching register classification/batches, all 18 hypothesis rows, and valid local links/anchors/source paths. Git review confirmed 14 intended Markdown changes only and an unchanged application/AGENTS tree; the baseline-to-merge whitespace check passed. The audit is complete for analysis/documentation scope. Existing defects remain Open, and SQL Server/browser/production evidence remains a recorded future gate. Dependency scans and disposable probes were not rerun during this publication recheck.

## Existing test coverage inventory

| File | Test methods | Coverage inspected |
| --- | --- | --- |
| shop/tests.py | 22 | ODBC options, registration/password/email validation, JWT refresh, Google verification mocks, OTP disabled, contact protection, order totals/cancel, product validation, settings clear, seed and SameSite |
| shop/test_commerce_api.py | 10 | Quotes/coupons, idempotency/ownership, snapshots/inventory, online rejection, cancellation, scoped address/cart/wishlist, review/return eligibility, admin endpoints |
| shop/test_commerce_models.py | 9 | Model constraints/normalization, admin registration/inlines, one MigrationExecutor legacy backfill |
| shop/test_commerce_routes.py | 3 | Actual route integration, default shipping/idempotency, order/payment lifecycle, multi-item returns/note update |
| shop/test_product_variants.py | 2 | Staff create/reconcile variants; default variant and inactive visibility |
| shop/test_security.py | 4 | Public/auth cookie CSRF, lead CSRF, one in-process registration throttle |

The suite combines APIRequestFactory/force_authenticate, APIClient and focused CSRF-enforced clients. Those forced authentication tests do not exercise cookie authentication. The one TransactionTestCase is a migration test, not concurrent SQL validation. No row-lock/thread race tests, query budgets, native admin mutation tests, discount-refund allocation tests, upload-negative matrix or coverage percentage gate was found. No frontend automated test files/runner/test script were tracked.

## CI and infrastructure trace

GitHub Actions runs backend Python 3.11 install/check/drift/tests, frontend Node 22 npm ci/typecheck/build, and Compose config. It grants contents:read and cancels older runs per ref. Push branches are main, dev and feature/**; pull_request is unrestricted. Direct pushes to codex/** do not trigger the push workflow. There is no SQL Server service, frontend test/lint, image build/scan, deployment smoke, dependency advisory or backup/restore job.

Compose is a development stack: SQL Server 2022 Developer tag, loopback DB/backend ports, all-interface frontend port; backend waits for SQL, may create DB, migrates, collects static, seeds, then runs 3 Gunicorn workers. SQL data/media/static are separate named volumes, with media mounted read-only in Nginx. Health readiness uses SELECT 1; it does not check migrations/provider readiness. Config validation is not an image build, service health or deployment test.

Backend Dockerfile runs as inherited root, retains build tools, and has no capability drop/read-only filesystem/resource profile. Nginx uses a mutable 1.27-alpine tag; Python/node/SQL tags are also not digest pinned. TLS is absent here; debug/insecure-cookie/SA/unencrypted-DB defaults are intended for development. Production must have explicit configuration and a supported SQL edition.

Vercel config builds only frontend/dist; it supplies no Django/SQL host or API/media rewrite. VITE_API_BASE is public build-time configuration; the backend must remain reachable with the documented same-site cookie/CSRF topology.

## Audit probes and observed proof ledger

The disposable Python probe reproduced source behavior using migrated in-memory SQLite, synthetic .invalid accounts and a TemporaryDirectory media store. It did not add regression tests or change the application. The full script is retained below as documentation; the temporary executable was removed before commit. P08 intentionally sequences a stale loaded instance around checkout, not two real SQL transactions.

| Probe | Exact observed facts | Finding |
| --- | --- | --- |
| P01 | create/cancel URL modules = shop.commerce_views | ARCH-004 |
| P02 | 1 product: 5 queries/2 review aggregates; 2 products: 7 queries/4 aggregates | PERF-001 |
| P03 | multipart product: HTTP 201; images stored as str; inline data in DB/response=true | FE-002 |
| P04 | harmless HTML gallery: HTTP 201; one .html file stored | SEC-001 |
| P05 | invalid product: HTTP 400; one new orphan .txt file | SEC-001 |
| P06 | cancelled order; payment record cancelled; order payment_status unpaid | BE-006 |
| P07 | invalid tracking update: HTTP 400; order persisted processing | BE-005 |
| P08 | stock after sale: 8; after stale name-only update: 10 | BE-001 |
| P09 | native Payment/Return admin status writable=true | BE-002 |
| P10 | native variant stock: 99; product projection: 10; new movements: 0 | BE-002 |
| P11 | 2 units bought, 1 returned; paid: 100; refund: 100; status refunded | BE-003 |
| P12 | partially_refunded; amount_recorded=false | BE-004 |
| P13 | newsletter: first HTTP 201/repeat HTTP 400 | BE-008 |
| P14 | coupon 101% -> HTTP 409 coupon_exists; invalid shipping days -> HTTP 409 shipping_code_exists | BE-007 |
| P15 | orders: count 35/returned 25/pages 2/next null | FE-005 |
| P16 | copied refresh after logout: refresh 200/me 200; disabled user: refresh 200/me 401 | SEC-002 |
| P17 | actual transpiled API adapter + mocked fetch: 2 concurrent protected 401s -> 2 refresh calls | FE-003 |
| P18 | actual cart reader + mocked localStorage: v1 has 1 item/v2 absent -> 0 loaded | FE-007 |

P17/P18 use Node plus the installed TypeScript transpiler; they prove isolated adapter/reader behavior, not a mounted React/browser end-to-end workflow. FE-001/FE-004/FE-006 are source-based execution schedules and still require browser regression coverage.

## Verification not performed

No SQL Server integration/load/locking test; no live Docker build/start or external deployment smoke; no keyboard/screen-reader/mobile/visual browser check; no production performance timing; no Python/container vulnerability scan; no backup/restore or external secret rotation/history purge. The prior Handoff records July smoke tests, which are not rerun results.

The current tracked-tree secret signature scan returned zero matches for private-key blocks, common API token formats and credential URLs. Full audit diff review must additionally reject copied environment/cookie/token/password values. Historical exposure is carried forward in SECURITY_AUDIT and Handoff.

<a id="test-001"></a>

## TEST-001 - Frontend behavior has no automated regression suite

| Attribute | Audit record |
| --- | --- |
| ID | TEST-001 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 3 initial regression foundation |
| Batch 3 evidence | 18 frontend tests and three real-backend browser smoke tests pass; lint/tests are in fast CI. Further pagination, identity races and accessibility cases remain in their feature batches. |
| Batch 2 evidence | Ten mounted React/API regressions and an npm test script now exist and pass. CI integration and other critical journeys remain Batch 3; this does not close the wider coverage gap. |
| Evidence | Tracked-file and package/CI inspection; FE-001..FE-007 illustrate missing behavioral coverage. |
| File/function references | frontend/package.json; frontend source tree; .github/workflows/ci.yml:frontend |
| Current behaviour | Combined Node/Vitest suite, lint/typecheck/build gates and a separate real-backend Playwright lane exist; dated results above distinguish local from hosted evidence. |
| Impact | Effects, API races, account synchronization, upload forms and pagination can regress while typecheck/build remain green. |
| Reproduction/proof | Tracked-file and package/CI inspection; FE-001..FE-007 illustrate missing behavioral coverage. |
| Root cause | Verification relies on compilation and historical manual smoke testing. |
| Remediation recommendation | Add a focused component/adapter suite and critical browser journeys with deterministic API fixtures; prioritize confirmed defects. |
| Regression testing needed | Auth hydration/refresh/logout, cart/wishlist identity, quote/checkout replay, pagination, staff media and keyboard flows. |
| Dependencies | Batch 2 defect-specific coverage first; FE findings define scenarios. |
| Migration implications | None. |
| Recommended remediation batch | 3 |

<a id="test-002"></a>

## TEST-002 - Linting is absent and TypeScript safety checks are relaxed

| Attribute | Audit record |
| --- | --- |
| ID | TEST-002 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - lint and auth/catalog DTO gates added; remaining strict typing deferred |
| Batch 5 evidence | Extracted auth/catalog/HTTP/helper modules forbid explicit any; response JSON is unknown, auth/catalog parsers reject malformed DTOs, UI catches use unknown and typed API errors. Remaining legacy commerce adapters and repository-wide strict TypeScript migration remain open. |
| Evidence | Scripts/config inspection and 48 lexical any tokens in api.ts. This is a tooling/debt finding, not proof every assertion fails. |
| File/function references | frontend/package.json; frontend/tsconfig.json; .github/workflows/ci.yml; frontend/services/api.ts |
| Current behaviour | ESLint 10/typescript-eslint gate passes without broad formatting. strict/noImplicitAny/strictNullChecks and unchecked request<T>/any adapter debt remain Batch 5; hooks dependency auditing is not claimed. |
| Impact | Passing typecheck does not detect missing effect dependencies or invalid response shapes; maintenance errors lack automatic checks. |
| Reproduction/proof | Scripts/config inspection and 48 lexical any tokens in api.ts. This is a tooling/debt finding, not proof every assertion fails. |
| Root cause | Generated baseline TS config and no agreed lint/runtime DTO policy. |
| Remediation recommendation | Introduce scoped lint and strictness gates with a measured adoption plan; validate API data as unknown at the boundary. |
| Regression testing needed | Meaningful adapter malformed-payload tests; lint hooks rules on hydration; build/typecheck after gradual strictness changes. |
| Dependencies | ARCH-003, TEST-001 |
| Migration implications | None. |
| Recommended remediation batch | 3 (API typing work in 5) |

<a id="test-003"></a>

## TEST-003 - SQLite tests do not establish SQL Server transactional safety

| Attribute | Audit record |
| --- | --- |
| ID | TEST-003 |
| Severity | P1 |
| Confidence | High |
| Status | Partial - SQL baseline passes; broader races remain |
| Batch 3 evidence | September 28 native runner against disposable SQL Server passed all 99 cases, including six SQL-only tests, after reproducing/fixing duplicate-key replay and correcting an invalid JSON fixture. See dated evidence above; hosted execution and broader schedules remain unverified. |
| Batch 2 evidence | 81 isolated SQLite tests pass, including deterministic stale-write schedules, rollback and idempotent/refund invariants. Docker daemon was unavailable; no SQL Server transactions or separate-connection concurrency tests ran. This finding and DB-002 remain open. |
| Evidence | Suite inventory and settings; mssql-django emits lock hints whereas SQLite does not implement equivalent SELECT FOR UPDATE. |
| File/function references | backend/reza_backend/test_settings.py; backend/shop/test_commerce_models.py:261; .github/workflows/ci.yml |
| Current behaviour | Fast DB checks use SQLite. The separate disposable SQL baseline has executed successfully for migrations, constraints, locking, checkout, duplicate idempotency/ownership, rollback, decrement and restock. Broader mutation races remain follow-up. |
| Impact | Most consequential stock/coupon/idempotency/refund assumptions lack production-engine evidence despite 50 passing tests. |
| Reproduction/proof | Suite inventory and settings; mssql-django emits lock hints whereas SQLite does not implement equivalent SELECT FOR UPDATE. |
| Root cause | Hermetic tests are the only automated database lane; historical manual SQL smoke was sequential. |
| Remediation recommendation | Keep fast isolated tests and add an isolated SQL Server lane with real separate connections and migration fixtures; never use production data. |
| Regression testing needed | Final-unit checkout, last coupon use, same key, edit/cancel/return/refund races, deadlock handling, length/Decimal/collation and rollback. |
| Dependencies | DB-002, BE-001..BE-005; disposable SQL infrastructure. |
| Migration implications | Test database migrations only; owner database/volumes remain untouched. |
| Recommended remediation batch | 3 (required evidence for Batch2 concurrency fixes) |

<a id="ops-001"></a>

## OPS-001 - Remediation branch pushes are outside CI triggers

| Attribute | Audit record |
| --- | --- |
| ID | OPS-001 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 3 branch filters; hosted run unverified |
| Evidence | Static workflow branch filter compared with required program branches. |
| File/function references | .github/workflows/ci.yml:3; docs/CODEX_PROGRAM.md |
| Current behaviour | Push workflow includes main/dev/feature/**/codex/** and unrestricted pull requests. Local workflow parsing and commands pass; hosted runs and branch protection need verification after publication. |
| Impact | Direct integration/batch pushes can bypass automated baseline checks; no actual failed/absent hosted run was queried. |
| Reproduction/proof | Static workflow branch filter compared with required program branches. |
| Root cause | CI predates remediation branch naming. |
| Remediation recommendation | Include authorized program branches or enforce required PR checks before integration; retain least-privilege workflow permissions. |
| Regression testing needed | Trigger on test batch/integration push and PR; confirm actual hosted jobs and required checks. |
| Dependencies | TEST-001, TEST-002, TEST-003 |
| Migration implications | None. |
| Recommended remediation batch | 3 |

<a id="ops-002"></a>

## OPS-002 - Runtime containers retain development defaults

| Attribute | Audit record |
| --- | --- |
| ID | OPS-002 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - runtimes/locks/production template verified; owner provisioning/capacity gates |
| Batch 10 evidence | 2026-10-03: digest-pinned multi-stage non-root images, complete Python hash lock, npm/Node inputs, bounded logs/shutdown/probes and read-only/capability restrictions. Synthetic production override disables bootstrap/migration/seed/static tasks, removes public DB/API ports, requires separate runtime login/licensed edition and validated SQL TLS. Real-SQL runtime fixture verifies restricted login with denied DDL, volume ownership/static/media, graceful stop and recreation at a different IP. Production certificate/login/capacity/legacy-volume preparation and hosted image scan execution remain owner gates. See [operations](../OPERATIONS.md) and Handoff. |
| Evidence | Baseline static Compose/Dockerfile/entrypoint review; Batch 10 locked builds, synthetic production config and isolated runtime/recovery fixture pass. Runtime credentials/config were not dumped. |
| Local follow-up | Patched Alpine/Nginx 1.28.3-r7 runtime removes 67 fixable HIGH/CRITICAL findings; frontend full scan reports zero advisories. 2026-10-04 Debian 13 remediation retains Python/ODBC/hash-lock versions and removes all five reported CRITICAL and fifteen previous advisory IDs. Backend has 44 unfixed HIGH package findings across eight IDs; strict all-HIGH/CRITICAL gate fails, including on unfixed findings. Runtime setuid/setgid bits removed and fixture-verified. [Vendor matrix/next steps](../RUNTIME_VULNERABILITIES.md), full reports, DB provenance and local actionlint checks remain visible. No hosted run or risk acceptance claimed. |
| File/function references | docker-compose.yml; backend/Dockerfile; frontend/Dockerfile; backend/docker-entrypoint.sh |
| Current behaviour | Local Compose preserves explicit development bootstrap assumptions; production override and operations runbook provide separate restricted preparation. Images are non-root, bases use digests and Python/npm dependencies are locked; Debian package repositories still vary. Actual production hosting/provisioning and measured resource limits are not selected. |
| Impact | Unsafe if promoted unchanged; migration startup can race across replicas. This audit did not establish that production currently uses these defaults. |
| Reproduction/proof | Static Compose/Dockerfile/entrypoint review. Config validation passed; runtime credentials/config were not dumped. |
| Root cause | Baseline local first-launch topology lacked a separate production contract; owner provisioning and capacity still require review. |
| Remediation recommendation | Provide production configuration, least-privilege runtime/DB, durable media, pinned/scanned images, one controlled migration job and resource limits; keep local development usable. |
| Regression testing needed | Build/run as intended user, writable media/static paths, TLS/security settings, multi-replica startup/migrations, readiness and rollback. |
| Dependencies | SEC-001, SEC-003, SEC-005, TEST-003; hosting decisions |
| Migration implications | No app migration required for hardening; volume permissions/backups and controlled migration execution need planning. |
| Recommended remediation batch | 10 |

<a id="ops-003"></a>

## OPS-003 - TLS forwarding and security header inheritance need an explicit ingress design

| Attribute | Audit record |
| --- | --- |
| ID | OPS-003 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - proxy headers/ingress contract verified; real TLS/IP trust remains |
| Batch 10 evidence | 2026-10-03: Nginx unprivileged/read-only fixtures verify effective per-location/error headers, overwritten XFF/request IDs, caching, map blocking and backend rediscovery. Private loopback production ingress contract assigns HTTPS redirect/HSTS to the external TLS edge, with Django forwarded scheme/redirect disabled to prevent loops. No real TLS, certificates, original-client-IP ingress policy or DNS change was performed. |
| Evidence | Static config plus Nginx documented inheritance: child add_header overrides inherited set. No production ingress was tested. |
| Local follow-up | Disposable CA/HTTPS edge tests verified trust, wrong-host/unknown-CA rejection, HTTPS redirects, HSTS and Secure cookies; certificate-validated encrypted SQL and its negative cases also pass. Trust is confined to fixtures. Actual deployment remains unverified under the reconfirmed local-only scope. |
| File/function references | frontend/nginx.conf:10,26,30,37; backend/reza_backend/settings.py:SECURE_PROXY_SSL_HEADER |
| Current behaviour | Nginx overwrites protocol/XFF/IDs and supplies headers on each location/error. The production template is a private HTTP inner edge behind owner-operated TLS redirect/HSTS; Django does not trust external protocol. A reviewed real-IP policy and deployed TLS verification remain necessary. |
| Impact | Secure-redirect loops or incorrect absolute URLs are possible in that TLS topology; media/static do not inherit all stated headers. |
| Reproduction/proof | Static config plus Nginx documented inheritance: child add_header overrides inherited set. No production ingress was tested. |
| Root cause | Proxy trust/TLS termination is unspecified; location header inheritance is assumed. |
| Remediation recommendation | Choose trusted ingress forwarding/termination, reject spoofed headers and verify effective headers per location/status; apply safe media policy with SEC-001. |
| Regression testing needed | HTTPS proxy-chain request tests, redirects/cookies/absolute media URLs; API/media/static/404 header checks. |
| Dependencies | OPS-002, SEC-001, SEC-003 |
| Migration implications | Ingress/config rollout only; rebuild frontend if API base changes. |
| Recommended remediation batch | 10 |

<a id="ops-004"></a>

## OPS-004 - Recovery and provider-dependent workflows lack launch evidence

| Attribute | Audit record |
| --- | --- |
| ID | OPS-004 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - isolated SQL/media recovery verified; real objectives/providers remain |
| Batch 10 evidence | 2026-10-03: disposable real SQL checksum/COPY_ONLY backup, VERIFYONLY and restore into a NEW database preserve migration rows; media archive restores identical bytes into a NEW owned volume. Runtime/health/shutdown tests and all 166 SQL cases pass without application volumes. Runbooks document environment isolation, one migration operator, off-host encrypted recovery sets, ownership/static rollback, redacted logs and health. Actual owner backup scheduling/destinations/retention/RPO/RTO, restored financial reconciliation and provider/outbox delivery remain unapproved and unverified. |
| Evidence | Baseline code/capability/management-command inventory and prior Handoff; Batch 10 disposable SQL/media backup and restore pass. No production restore or provider call was run. |
| Local follow-up | Explicit maintenance tool creates/verifies checksum archive and manifest before UID/GID/mode changes, rejects unsafe files and detects a changed inventory. Fixture proves legacy root-owned archive restoration with original bytes/modes, readable prepared files and symlink rejection. Actual backup schedules/destinations/RPO/RTO remain owner decisions; no live volume is modified. |
| File/function references | docs/COMMERCE_OPERATIONS.md; Handoff.md; backend/shop/models.py:NotificationOutbox; backend/shop/commerce_services.py:commerce_capabilities |
| Current behaviour | Local/CI recovery fixtures and monitoring integration points are implemented and runbooks are executable operator checklists. Production backup/restore/monitoring owners and external providers remain decisions; outbox rows still have no delivery worker. |
| Impact | Production cannot promise delivery/refunds/notifications/recovery beyond the supported offline bookkeeping; pending outbox requires retention/operations ownership. |
| Reproduction/proof | Isolated runtime fixture restores SQL into a new database and media into a new volume; real recovery objectives and provider calls remain unverified. |
| Root cause | Provider/hosting/process choices remain external dependencies. |
| Remediation recommendation | Assign owners and measurable recovery objectives, perform isolated restore, implement selected provider flows with retries/idempotency and reconcile offline payment references. |
| Regression testing needed | Restore DB plus media, rollback drill, outbox retry/duplicate delivery, signed provider callbacks and failure reconciliation once configured. |
| Dependencies | Owner provider/policy/hosting decisions; BE-003, BE-004, OPS-002 |
| Migration implications | Provider/outbox/refund schema may be additive; migrations and media require separate backups. |
| Recommended remediation batch | 10 (provider work requires explicit scoped batch) |

## Reproduce P01-P16 without live services

Save this block temporarily as `tmp_audit_probes.py` in the repository root (ignored), then run the exact audit command:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
backend/.venv/Scripts/python.exe tmp_audit_probes.py
```

Expected output is the proof ledger above. The script asserts SQLite/:memory: before migrating. Tokens never leave memory or appear in output; media uses an automatically cleaned temporary directory. Remove the disposable script after use. It is evidence documentation, not a replacement for maintained regression tests.

```python
"""Disposable Batch 1 probes: synthetic SQLite fixtures only; no live services."""
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'reza_backend.test_settings'
import django
django.setup()
import io
import json
import logging
import tempfile
import uuid
from pathlib import Path
from django.conf import settings
from django.contrib import admin
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, transaction
from django.test import RequestFactory, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import resolve
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from PIL import Image
from shop.models import (User, Product, ProductVariant, Order, Payment, ReturnRequest,
                         InventoryMovement, ProductReview, Coupon)
from shop.serializers import ProductSerializer
from shop.commerce_services import (create_checkout_order, cancel_customer_order,
                                   transition_order_status, transition_payment, transition_return)
from shop.views import _sync_product_variants

assert connection.vendor == 'sqlite' and settings.DATABASES['default']['NAME'] == ':memory:'
logging.disable(logging.CRITICAL)
call_command('migrate', verbosity=0)

def emit(label, **values):
    print(label, json.dumps(values, default=str, sort_keys=True))

def product(key, stock=10, price='100'):
    p = Product.objects.create(id=key, name=key, price=price, stock=stock)
    v = ProductVariant.objects.create(product=p, sku=key, stock=stock)
    return p, v

def checkout(p, v, qty=1, **extra):
    return create_checkout_order(buyer, {
        'items': [{'product_id': p.pk, 'variant_id': v.pk, 'quantity': qty}],
        'shipping_address': 'Synthetic audit address', 'idempotency_key': uuid.uuid4(), **extra,
    })[0]

buyer = User.objects.create_user(username='audit-buyer', email='buyer@example.invalid', password=None)
staff = User.objects.create_superuser(username='audit-staff', email='staff@example.invalid', password=None)
client = APIClient()
client.force_authenticate(staff)

with tempfile.TemporaryDirectory(prefix='reza-audit-') as media, override_settings(MEDIA_ROOT=media, ALLOWED_HOSTS=['testserver']):
    emit('P01-routes', create=resolve('/api/orders/create/').func.__module__,
         cancel=resolve('/api/orders/example/cancel/').func.__module__)
    for i in range(2):
        p, v = product('query-' + str(i))
        ProductReview.objects.create(product=p, user=buyer, rating=5, status='approved')
    for count in (1, 2):
        with CaptureQueriesContext(connection) as queries:
            list(ProductSerializer(Product.objects.filter(id__startswith='query-').order_by('id')[:count]
                 .prefetch_related('variants', 'reviews'), many=True).data)
        emit('P02-product-queries', products=count, queries=len(queries),
             review_aggregates=sum('AVG(' in q['sql'] or 'COUNT(' in q['sql'] for q in queries))

    image_bytes = io.BytesIO()
    Image.new('RGB', (1, 1)).save(image_bytes, format='PNG')
    data_url = 'data:image/png;base64,audit-placeholder'
    response = client.post('/api/admin/products/', {
        'name': 'audit-gallery', 'price': '10', 'stock': '1',
        'image': SimpleUploadedFile('audit.png', image_bytes.getvalue(), content_type='image/png'),
        'images': json.dumps([data_url]),
    }, format='multipart')
    saved = Product.objects.get(pk=response.data['id'])
    emit('P03-data-url', status=response.status_code, stored_type=type(saved.images).__name__,
         stored_inline='data:image/' in json.dumps(saved.images),
         response_inline='data:image/' in json.dumps(response.data, default=str))

    response = client.post('/api/admin/products/', {
        'name': 'audit-gallery-file', 'price': '10', 'stock': '1',
        'images': SimpleUploadedFile('audit.html', b'<p>Harmless audit fixture</p>', content_type='text/html'),
    }, format='multipart')
    emit('P04-gallery-file', status=response.status_code, html_files=len(list(Path(media).rglob('*.html'))))
    before = len(list(Path(media).rglob('*.txt')))
    response = client.post('/api/admin/products/', {
        'name': 'invalid', 'price': '-1', 'stock': '1',
        'images': SimpleUploadedFile('audit.txt', b'Harmless audit fixture', content_type='text/plain'),
    }, format='multipart')
    emit('P05-orphan', status=response.status_code, new_files=len(list(Path(media).rglob('*.txt'))) - before)

    p, v = product('cancel')
    order = checkout(p, v)
    cancel_customer_order(order.pk, buyer)
    order.refresh_from_db()
    emit('P06-cancel-projection', order_status=order.status,
         payment_status=order.payment_status, payment_record=order.payment.status)

    p, v = product('partial-update')
    order = checkout(p, v)
    response = client.put(f'/api/admin/orders/{order.pk}/status/',
                          {'status': 'processing', 'tracking_code': 'x' * 129}, format='json')
    order.refresh_from_db()
    emit('P07-partial-update', response=response.status_code, persisted_status=order.status)

    p, v = product('stale-stock')
    stale_product = Product.objects.get(pk=p.pk)
    checkout(p, v, qty=2)
    v.refresh_from_db()
    after_sale = v.stock
    serializer = ProductSerializer(stale_product, data={'name': 'Renamed'}, partial=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        serializer.save()
        _sync_product_variants(serializer.instance, None, staff)
    v.refresh_from_db()
    emit('P08-stale-product', after_sale=after_sale, after_name_only_update=v.stock)

    req = RequestFactory().get('/admin/')
    req.user = staff
    payment_admin = admin.site._registry[Payment]
    return_admin = admin.site._registry[ReturnRequest]
    emit('P09-admin-forms', payment_status_writable='status' in payment_admin.get_form(req).base_fields,
         return_status_writable='status' in return_admin.get_form(req).base_fields)
    p, v = product('native-admin-stock')
    movements = InventoryMovement.objects.count()
    variant_admin = admin.site._registry[ProductVariant]
    v.stock = 99
    variant_admin.save_model(req, v, form=None, change=True)
    p.refresh_from_db()
    emit('P10-admin-stock', variant=v.stock, product_projection=p.stock,
         new_movements=InventoryMovement.objects.count() - movements)

    p, v = product('discount-refund')
    Coupon.objects.create(code='AUDIT50', discount_type='percent', value='50')
    order = checkout(p, v, qty=2, coupon_code='AUDIT50')
    transition_order_status(order.pk, 'processing', staff)
    transition_order_status(order.pk, 'shipped', staff)
    transition_order_status(order.pk, 'delivered', staff)
    item = order.items.get()
    rr = ReturnRequest.objects.create(user=buyer, order=order, order_item=item, quantity=1, reason='audit')
    for state in ('approved', 'received', 'refunded'):
        transition_return(rr.pk, state, staff)
    pay = Payment.objects.get(order=order)
    emit('P11-discount-refund', units_bought=2, units_returned=1, paid_amount=pay.amount,
         refunded_amount=pay.metadata['refunded_amount'], payment_status=pay.status)

    p, v = product('manual-partial-refund')
    order = checkout(p, v)
    transition_payment(order.payment.pk, 'paid', staff)
    pay = transition_payment(order.payment.pk, 'partially_refunded', staff)
    emit('P12-manual-refund', status=pay.status, amount_recorded='refunded_amount' in pay.metadata)

    public = APIClient()
    first = public.post('/api/newsletter/subscribe/', {'email': 'news@example.invalid'}, format='json')
    second = public.post('/api/newsletter/subscribe/', {'email': 'news@example.invalid'}, format='json')
    emit('P13-newsletter', first=first.status_code, repeat=second.status_code)

    response = client.post('/api/admin/coupons/', {'code': 'INVALID101', 'type': 'percent', 'value': '101'}, format='json')
    emit('P14-coupon-validation', status=response.status_code, code=response.data.get('code'))
    response = client.post('/api/admin/shipping-methods/',
        {'name': 'Invalid days', 'price': '1', 'estimated_days_min': 5, 'estimated_days_max': 1}, format='json')
    emit('P14-shipping-validation', status=response.status_code, code=response.data.get('code'))

    for i in range(30):
        Order.objects.create(id='PAGE-' + str(i), user=buyer, total=0)
    client.force_authenticate(buyer)
    response = client.get('/api/orders/my/')
    emit('P15-pagination', count=response.data['count'], returned=len(response.data['results']),
         pages=response.data['total_pages'], next=response.data['next'])

    csrf_client = APIClient(enforce_csrf_checks=True)
    csrf = csrf_client.get('/api/auth/csrf/').data['csrfToken']
    refresh = str(RefreshToken.for_user(buyer))
    csrf_client.cookies['refresh'] = refresh
    csrf_client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=csrf)
    csrf_client.cookies['refresh'] = refresh
    response = csrf_client.post('/api/auth/refresh/', HTTP_X_CSRFTOKEN=csrf)
    authenticated = csrf_client.get('/api/auth/me/').status_code
    emit('P16-refresh-replay', refresh_after_logout=response.status_code, me_after_replay=authenticated)
    buyer.is_active = False
    buyer.save(update_fields=['is_active'])
    response = csrf_client.post('/api/auth/refresh/', HTTP_X_CSRFTOKEN=csrf)
    emit('P16-disabled-refresh', refresh=response.status_code, me=csrf_client.get('/api/auth/me/').status_code)

emit('complete', database=connection.vendor, live_database_used=False)
```

## Reproduce P17-P18 without a browser/server

From the repository root, the following exact Node probe evaluates the current adapter/reader using installed TypeScript and synthetic transport/storage:

```powershell
@'
const fs = require('fs');
const ts = require('./frontend/node_modules/typescript');
const source = fs.readFileSync('frontend/services/api.ts', 'utf8').replace('import.meta.env.VITE_API_BASE', "''");
const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports = {};
new Function('exports', output)(moduleExports);
global.document = {cookie:'csrftoken=audit-only'};
const attempts = {};
let refreshes = 0;
global.fetch = async path => {
 if (path.endsWith('/refresh/')) { refreshes++; return new Response('{}',{status:200}); }
 attempts[path]=(attempts[path]||0)+1;
 return new Response('[]',{status:attempts[path]===1?401:200});
};
(async()=>{
 await Promise.all([moduleExports.api.myOrders(),moduleExports.api.getAddresses()]);
 console.log('P17-concurrent-401',JSON.stringify({protectedRequests:2,refreshCalls:refreshes}));
 const context=fs.readFileSync('frontend/contexts/GlobalContext.tsx','utf8');
 const reader=context.slice(context.indexOf('const readLocalCart ='),context.indexOf('const readLocalWishlist ='));
 const readJs=ts.transpileModule(reader,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 global.localStorage={getItem:key=>key==='reza_cart_v1'?'{\"legacy-product\":2}':null};
 const readCart=new Function(readJs+';return readLocalCart;')();
 console.log('P18-legacy-cart',JSON.stringify({v1Items:1,v2Absent:true,loadedItems:readCart().length}));
})();
'@ | node
```

For OPS-003, Nginx documents that local add_header directives replace inherited header sets under the standard inheritance behavior; the deployed image tag predates the newer explicit merge option. [Nginx header module documentation](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header).
