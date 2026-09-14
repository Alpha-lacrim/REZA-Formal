# Session Handoff

Last updated: 2026-09-14

This is the chronological continuity log for the repository. Keep the newest session first. Each new session must create an entry at startup and finalize it before handoff, even when no code changed.

## 2026-09-14 - Batch 2 critical correctness remediation

- Objective: revalidate Batch 1 P0/P1 findings, add regression coverage, implement scoped correctness fixes, and merge only after relevant checks. Explicitly inspect authentication bootstrap and the complete product media path.
- Starting state: clean `codex/remediation-program` at `8d867c2017f627c69d533de5d5dfacd9dd70a4f8`; created `codex/batch-02-critical-correctness`. Read AGENTS, Codex, Handoff and Batch 1 audit before edits. No production database or secret values accessed.
- Scope: BE-001..BE-005 and SEC-001; FE-001/FE-002 are included because the Batch 2 request explicitly calls them out despite their original P2 classification. DB-002/TEST-003 remain evidence gaps unless SQL Server verification establishes more.
- Completed fixes: BE-001 locks/reloads catalog updates, limits field writes, requires inventory_version for stock/variant adjustments, and rejects stale/deleted identity updates; BE-002 makes native product/variant/order/payment/return admins and inlines inspection-only; BE-005/BE-006 validate before atomically updating status/details/events/restock/payment projection; BE-003/BE-004 record net item allocations and confirmed refund amounts/references with replay, remainder and historical consistency guards.
- Owner decision: proportional net merchandise refunds, shipping excluded, with penny reconciliation. Existing Payment metadata and OrderEvent records hold allocations/refund entries; no schema redesign or migration, external transfer, or invented historical amount.
- FE-001 catalog loading now follows resolved session state and rejects late results from prior identities. SEC-001/FE-002 separate File/preview state, transmit all files as multipart, validate/re-encode bounded product images, normalize legacy galleries on edit, clean only newly staged files after failure and preserve existing referenced media. Nginx media responses add restrictive CSP/sandbox headers.
- Regression process: new tests failed before each main fix. Final checks: 81 backend tests passed in 7.671s; 10 mounted React/API tests passed in 7.530s; Django system check, migration drift, frontend typecheck and Compose config passed. Production build passed in 3.24s after an approved retry for the same esbuild sandbox parent-directory restriction seen in Batch 1. Compose reported two unreadable global Docker-config warnings. Exact commands and test inventory are in docs/audit/TESTING_CI_AUDIT.md.
- Test-only React Testing Library/jsdom were added with lockfile entries; the first sandbox install stalled and was cancelled, and the approved install completed. The Node/TypeScript test runner is now in the AGENTS baseline. No runtime dependency upgrade, broad architecture/routing/state-framework refactor, Redis or unrelated later-batch work was performed.
- Remaining evidence: DB-002/TEST-003 stay open. Docker daemon pipe was missing, so no SQL Server concurrency or live Nginx/production/browser/provider test is claimed. TEST-001 is partially addressed by targeted tests; broader suite/CI work remains Batch 3. Other Batch 1 findings and existing external credential/provider/recovery obligations remain open.
- Owner rollout: deploy the frontend and backend together for inventory-version/refund payload changes; use the staff UI/API for commerce mutations; rebuild/reload Nginx and verify actual media-serving headers. Reconcile historical inconsistent refund totals from verified financial records, and review older media with backup rather than deleting blindly. No production SQL, media or secrets were accessed or altered.
- Git completion: finding-ID commits on codex/batch-02-critical-correctness; final documentation/diff review and local integration merge follow this record's commit. Exact final/merge lookup commands are in docs/CODEX_PROGRAM.md, with observed merge IDs reported in the final response. No remote push is included; main/dev and the existing stash are preserved.
- Final review passed: baseline-to-current whitespace check, all 43 audit records with nine matching fixed statuses, changed-document local links, and added-line secret signature scan. Reviewed application/test/contract changes; no migrations or ignored configuration changes are included. main/dev/stash still match the recorded Batch 0 targets. This documentation-only finalization does not change the application tree tested above.

## 2026-09-13 - Revalidate and publish Batch 1

- Objective: independently check Batch 1 against the original requirements and publish only after confirming completion, as explicitly requested after the local-only handoff.
- Starting state: clean `codex/remediation-program` at `fc17a0788aa973f1626c876be29619c76ab3f98b`, two commits ahead of its cached upstream; audit branch at `dbafbf2a68a01ce27d1769fab274cd9e9e8b4322`.
- Re-read repository guidance and confirmed both local branch tips. All ten audit documents, the roadmap, program and handoff are present. Rechecked 43 canonical records for every required attribute, matching index classification/batch, all 18 hypotheses, source paths and local links. No document validation errors were found.
- Reran the six required checks: isolated Django system check and migration drift passed; all 50 backend tests passed in 5.950 seconds; frontend typecheck passed; production build passed in 3.75 seconds after the same sandbox filesystem failure and approved retry; Compose config passed with two global Docker-config access warnings. Exact commands/results are appended to `docs/audit/TESTING_CI_AUDIT.md`.
- Confirmed the audit merge contains only the 14 intended Markdown paths; application files and `AGENTS.md` are unchanged. The full baseline-to-merge whitespace check passed. No application fix, migration, dependency change or Batch 2 work was introduced.
- Completion conclusion: Batch 1 is complete for its analysis/documentation scope. The open defects, SQL Server/browser/production evidence gaps and dated dependency results remain explicit later-batch work; no finding was closed during this recheck.
- The first sandbox `git ls-remote --heads origin refs/heads/codex/remediation-program refs/heads/codex/batch-01-forensic-audit` failed with Windows credential access unavailable. The initial outside-sandbox read was interrupted by the user's request to recheck completion; no push had occurred at that point.
- After the completion checks, `git push --atomic --set-upstream origin codex/batch-01-forensic-audit codex/remediation-program` succeeded outside the sandbox. Origin acknowledged the new audit branch at `dbafbf2a68a01ce27d1769fab274cd9e9e8b4322` and integration advancement from `94d6658` to `fc17a0788aa973f1626c876be29619c76ab3f98b`. Both upstreams are configured.
- This documentation-only verification record updates `Handoff.md`, `docs/CODEX_PROGRAM.md` and `docs/audit/TESTING_CI_AUDIT.md` after that observed publication. Its follow-up commit is pushed to integration; final remote-tip and clean-worktree verification are reported in the session response.
- No new owner action is required for Batch 1 publication. Existing policy/provider/recovery/credential-history obligations in the roadmap remain unchanged. No production data, volume, secret store, `main` or `dev` was changed.

## 2026-09-13 - Resume Batch 1 forensic audit

### Objective and starting state

- Resume the documentation-only audit after interruption. Active branch is `codex/batch-01-forensic-audit`, still at `94d665881e3e929c41121d057385c28f822002fe`.
- Preserved the existing Batch 1 drafts: modified `Handoff.md`, untracked `docs/audit/` and `docs/ROADMAP.md`. No tracked application changes exist.

### Changed

- Completed the ten requested audit documents: `docs/audit/AUDIT_INDEX.md`, `ARCHITECTURE_AUDIT.md`, `BACKEND_AUDIT.md`, `FRONTEND_AUDIT.md`, `DATABASE_AUDIT.md`, `SECURITY_AUDIT.md`, `PERFORMANCE_AUDIT.md`, `TESTING_CI_AUDIT.md`, `UX_A11Y_SEO_AUDIT.md` and `DEAD_CODE_DEBT.md`.
- Created `docs/ROADMAP.md` with remediation batches, dependencies, migration safeguards and owner decisions. Updated `docs/CODEX_PROGRAM.md` with Batch 1 results and commit/merge lookups.
- Updated only stable missing facts in `Codex.md`: audit/program navigation, live versus legacy order routing, native Django admin as a separate writer, and product/variant stock authority. `AGENTS.md` is unchanged.
- Recorded 43 findings (P0 0, P1 8, P2 33, P3 2), all Open, and qualified verdicts for all 18 hypotheses. The P1 set contains five reproduced backend defects, one reproduced upload validation defect, an unverified SQL concurrency risk and a SQL coverage gap. No application defect was fixed.
- Removed the ignored disposable probe script; its reproducible code remains in the testing audit. No application, dependency, migration, deployment or persistent-data changes are included.

### Verification

- Re-read operating/continuity records and reviewed all audit drafts against the application baseline. The September 10 application checks below are preserved with their original execution date; unchanged source did not justify repeating them on September 13.
- Programmatic document review confirmed exactly 43 canonical records, all required attributes, matching index severity/confidence/status/batch, all 18 hypothesis rows, valid source paths and local document links/anchors. The embedded Python probe parses successfully.
- Current-tree signature scan across 117 text files, including the new documentation, found zero private-key/common-token/credential-URL/JWT matches. Ignored environment values were not read or copied. This does not certify historical secrets or external rotation.
- `git diff --check`, full documentation/path review, and preservation checks passed before committing. Local `main`, `dev`, stash and baseline-tag targets still match the recorded Batch 0 SHAs. Final staged checks and clean-worktree/merge-parent verification follow this record's commit.
- Main commit subject: `docs(audit): establish remediation baseline`; authorized merge subject: `Merge Batch 1 forensic audit`. Exact self/subsequent commit hashes resolve using the fixed-start commands in `docs/CODEX_PROGRAM.md`; observed commit/merge results are reported in the session final response. No remote push is included.

### Incomplete / follow-up

- Batch 1 audit/documentation is complete; its local Git commit/merge is the final step after this record. Batch 2 is not started. All findings remain open for their scheduled remediation/evidence gates.
- No SQL Server concurrency/live schema test, browser/a11y run, live Docker deployment check, load test, restore drill or provider verification was performed in this batch. Python advisory status remains unknown; npm has six affected package entries as of September 10.
- Preserve earlier historical notes below. Their old application-completion and zero-advisory statements are dated evidence, superseded where the current audit demonstrates gaps.

### Owner actions required

- No decision is required for this documentation merge. Before relevant later fixes/launch, decide refund allocation and manual confirmation, cancellation/return/bespoke policies, guest/account merge semantics, staff capability, provider accounts, identity/session policy and production hosting/TLS/SQL/media/recovery. See `docs/ROADMAP.md` for the exact gates.
- Previous development-secret replacement is documented historically; revocation in other environments and repository-history cleanup remain unverified. No rotation or history rewrite was performed. No migration or deployment action is required by Batch 1.

## 2026-09-10 - Batch 1 forensic codebase audit

### Objective and starting state

- Analysis and documentation only: establish the remediation baseline, trace system workflows, verify the 18 supplied hypotheses, and attempt the repository baseline checks. Do not change application code or repair defects.
- Started from clean `codex/remediation-program` at `94d6658`; created `codex/batch-01-forensic-audit`. Local `main`, `dev`, existing stash, and ignored runtime files are preserved.

### Changed

- Traced the backend/frontend/database/infrastructure and drafted the audit register, workflow maps and roadmap. Reproduced findings using synthetic in-memory SQLite and mocked Node transport/storage; no live commerce records were used.
- Documentation completion and local Git integration continue in the September 13 entry above; no application files changed.

### Verification

- Confirmed the nested Git root, clean starting status and repository guidance.
- From `backend/`: `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` passed; `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` reported no changes; `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` passed all 50 tests in 5.794 seconds and destroyed the test database.
- From `frontend/`: `npm.cmd run typecheck` passed. `npm.cmd run build` initially failed on sandbox parent-directory/Vite config access; an approved retry passed (Vite 6.4.3, 1,738 modules, 4.91 seconds).
- From the repository root: `docker compose config --quiet` passed with two global Docker-config access warnings; expanded configuration was not printed. `backend/.venv/Scripts/python.exe -m pip check` passed; `backend/.venv/Scripts/python.exe -m pip_audit --version` reported the module unavailable.
- `npm.cmd audit --json` from `frontend/` first failed on sandbox network/cache access; an approved retry completed with exit 1 and six affected package entries (five high, one moderate). No dependency was changed. Advisory applicability and exact proof scripts/results are in `docs/audit/TESTING_CI_AUDIT.md` and `SECURITY_AUDIT.md`.

### Incomplete / follow-up

- Audit drafts and baseline/probe evidence were retained across interruption. September 13 completes the document consistency/secret review and authorized local Git completion.

### Owner actions required

- No input required to continue the audit. Prior unresolved launch/provider/credential-history obligations remain pending reassessment.

## 2026-09-10 - Batch 0 Git bootstrap

### Objective and starting state

- Establish the Git foundation for the REZA-Formal Codex Remediation program; application audit and remediation are out of scope.
- Active Git root: `C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal`.
- Started on `feature/complete-commerce` at `dc225f5f344389afdbe9448537e56589ac861f1a`, tracking the matching cached remote branch. The only untracked file was the user-authored `docs/CODEX_PROGRAM.md`; no tracked or staged changes existed.
- Local `main` was `449c5a1`, six commits behind `origin/main`; local `dev` and an existing stash were present. All remain unchanged.

### Changed

- Preserved the user-authored program document and its roadmap/rules, corrected the proposed baseline tag name, and added Git bootstrap metadata and evidence in `docs/CODEX_PROGRAM.md`. An exact original backup remains at `..\CODEX_PROGRAM.batch-0.original.md` outside the repository.
- Created `codex/remediation-program` directly from verified origin baseline `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` and the annotated tag `pre-codex-remediation-2026-09-10` at that baseline.
- Safely deleted the local `feature/complete-commerce` branch after switching to integration and proving it was fully merged. No application files changed; no `main` history was modified.
- Created and pushed bootstrap commit `b638e63813c972fe096a7830131a233a69606416` (`docs(codex): initialize remediation program`) and the annotated baseline tag; set the integration upstream. Deleted only the authorized commerce remote branch after rechecking its tip.
- Added the subsequent documentation-only verification record. `docs/CODEX_PROGRAM.md` records the exact bootstrap SHA and a stable lookup for this final Batch 0 commit without attempting a self-referential SHA.

### Verification

- Read repository instructions, project context, prior handoff, program document, and `.gitignore`; inspected the Git root, status, branches, history, worktrees, and sanitized origin configuration.
- `git fetch --prune origin` and remote heads/tags inspection succeeded. Commerce ancestry returned 0; main/commerce unique-commit counts were `1 0`; tree diff was empty. GitHub PR #1 reports the same merged head and baseline merge SHA as Git history.
- The baseline tag is annotated and resolves to the verified baseline. The program document's SHA-256 matched its original backup before edits. Detailed evidence is in `docs/CODEX_PROGRAM.md`.
- Post-push status, verbose/all branches, last 30 graph/decorated commits, and remote heads/tags inspection confirmed clean integration at the published bootstrap SHA, configured matching upstream, unchanged main, matching annotated tag object/target, and successful local/remote commerce deletion.
- `git diff --check`, staged checks, and the complete baseline-to-bootstrap whitespace check passed. Full diff/path review showed only this handoff and the program document. Local `main`, `dev`, and stash SHAs remain unchanged; no application checks were run for this documentation-only batch.

### Incomplete / follow-up

- Batch 0 bootstrap is complete. The final verification record is committed and published after these observed results are recorded; its publication and final clean/upstream state are reported in the session's final response.
- Existing stash contents were preserved without review. The obsolete historical instruction below to merge/push commerce is resolved by the independently verified PR #1 merge and this authorized branch cleanup.
- Earlier unresolved application and deployment items remain in the prior entries; none are reassessed in Batch 0.

### Owner actions required

- Start Batch 1 on `codex/batch-01-forensic-audit` from `codex/remediation-program`; Batch 1 is not started here. No bootstrap push/delete owner actions remain from the verified operations above.

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
