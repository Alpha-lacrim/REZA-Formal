# Session Handoff

Last updated: 2026-10-03

This is the chronological continuity log for the repository. Keep the newest session first. Each new session must create an entry at startup and finalize it before handoff, even when no code changed.

## 2026-10-03 - Batch 8 database and performance

- Objective: measure critical query/network paths, fix demonstrated growth, trace stock ownership and transaction boundaries, assess indexes with disposable SQL evidence, and publish a verified non-fast-forward integration merge.
- Starting state: clean Batch 7 at `6ee3771621e7f2bd46672dbb57e9017a664bb4e2`; fetched origin successfully after network approval; integration matched `7343e237f1282e03ca5e239a390f29a0f053814f`. Integrated previously verified Batches 5, 6 and 7 using non-fast-forward merges `b20585020d9b8630bf1fd902bb66c3e1ae058122`, `48c5bfcfbff22973b1b4dfc9559b881de7567178`, and `7ac1a7805ee1e1598c4027868536749fdbdd3c6a`. Required `codex/batch-08-database-performance` starts at the latter SHA. Main, dev, existing stash and ignored configuration preserved.
- Completed: backend cart 31 -> 2 queries (153,219 -> 32,709 bytes); return pages 77 -> 3; 30-line unlocked quote 92 -> 4; compact public catalog 144,401 -> 16,879 bytes with three queries/count; stats 10 -> 9 and scalar SQL decimal/JSON revenue. Product approved-review aggregation remains two-query detail/serializer budget. Staff/customer orders 5, reviews/users/messages 2-3 queries. Locked checkout unchanged at 24/256 queries for 1/30 lines, with replay/stock/ledger checks. `docs/DATABASE_PERFORMANCE.md` records fixtures, complete before/after data, stock readers/writers/canonical meanings/divergence, transaction boundaries, index assessment and residuals.
- Frontend: 24-row server catalog/filter/sort and bounded facets; five-row debounced server navbar search; eight-row home previews/customer order/return/review pages. Active account tab only; embedded order expansion makes no extra read. Referenced products outside compatibility preview remain purchasable through exact-ID reads and passed product metadata; identity/stock caches clear, derived products stay stable. Product detail context arrival/disposed effects do not duplicate HTTP. Existing Persian RTL/style retained.
- Index/invariants: SQL sys.indexes confirmed duplicate single-column SKU keys; 1,000-row equality plan seeks unique index before/after. Migration 0008 removes only variant_sku_idx; forward/reverse/uniqueness checks pass. Read-only audit_inventory reports projection/latest-ledger mismatches and missing history with bounded samples; no stock repair/redesign or production access. DB-004/PERF-003 and FE-005 addressed, DB-001/PERF-002 partial; DB-002 broader mixed SQL schedules remain open.
- Verification: full SQL Server 130/130 passes, zero skips (76.941s); full SQLite 130 cases, 121 pass/nine explicit SQL-only skips (15.376s). The subsequently added inventory-audit case and final query budgets pass with all six performance tests on SQL (2.671s) and SQLite (1.069s); final discovery has 131 cases. Django check/drift and both Compose configurations pass. Frontend 9 Node tests (5.09s), full 67 Vitest tests (12.54s), and final changed state/catalog/cancellation subset 20/20 (6.51s) pass; lint/typecheck pass. Four Chrome journeys pass (20.7s), asserting one detail request and no expanded-order detail read; final cache-precedence customer rerun passes (7.8s). Final build before dependency cleanup 3.01s: main 395.78 KB/118.38 gzip versus measured baseline 392.64/117.39; AdminPanel unchanged 85.32/20.67. This small increase is recorded, not presented as a bundle reduction.
- Environment/iterations: network/ODBC/Docker/esbuild sandbox restrictions required approved retries. Initial old array-contract assertions were adapted to the coordinated public envelope. An unstable derived product array caused repeat quotes and was memoized; exact-ID mocks and fixture types corrected. Immediately cancelled StrictMode effects avoid detail/review dispatch. Disposable SQL DB/container/network and baseline worktree were removed. Baseline junction cleanup failed and removed generated main node_modules files; source/lockfile untouched, dependencies restored by npm ci and final rechecks recorded below. No external/live DB or ignored configuration values read.
- Commits: backend `d0ff928bc6ee98addcbfd2118d3117e5c70e4467`; frontend `bb14c6e5afacfb3f83e09ef820a7a017bbdec27c`; final documentation and merge/publication SHAs recorded in CODEX_PROGRAM closeout.
- Owner rollout/residuals: deploy frontend/backend together for public envelope/cards; inspect deployed SQL indexes, take normal backup and apply 0008 (reverse recreates redundant index, no data rewrite). Legacy inline media, whole saved cart/wishlist/address snapshots, broader lock/coupon/edit/refund schedules, financial reconciliation, hosted CI and earlier provider/security/deployment obligations remain. Read inventory audit as evidence, never guessed repair. No main merge/deployment or next batch authorized/performed.
- Dependency restoration: npm ci restored 369 packages from the unchanged lockfile (26s); existing eight advisories (three moderate/five high) remain Security Batch 9 scope. Lint/typecheck pass again; restored build passes (3.71s) with byte-identical chunk names/sizes to the prior final build. Cleanup was restricted to the explicitly created baseline; no persistent application/user data was removed.
- Final Git: batch documentation tip `23ede44436df788a42bf76f5e8d5e17e4a8e2d6f`; non-fast-forward integration merge `d28aabd363a460ef87123b884e2afebaac7b4ec8` with exact starting SHA/final tip as parents. Merge tree equals tested batch tree. Full source/docs diff, whitespace, added credential signatures and documentation paths pass. Normal atomic push created Batch 5/6/7/8 remote branches and advanced program to d28aabd. Main/dev/stash preserved. This documentation-only publication record follows; final closeout SHA resolves as documented in CODEX_PROGRAM and is pushed normally. No required Batch 8 implementation/verification work remains; earlier explicitly documented residuals/owner rollout remain.

## 2026-10-02 - Batch 7 admin frontend and product media (started 2026-10-01)

- Objective: extract coherent admin features, clarify product editor lifecycle and managed media, consume bounded server pagination, and verify accessible product/order workflows without redesign.
- Starting state: clean `codex/batch-06-frontend-state` at `755653b11322167205ade43b8810ababc38c4bed`; confirmed repository root and read AGENTS, Codex and Handoff. Created `codex/batch-07-admin-media` from the current prerequisite; resumed after the date changed at the owner's request. Existing obligations below are preserved.
- Completed: AdminPanel is shell/navigation/composition; `frontend/features/admin/` owns products/editor, orders, dashboard, commerce, messages, settings and shared dialog/query/page primitives. All staff collection screens consume server pages; products search/sort and orders search/status filter on the server. No full user-directory fetch to render orders. Commerce loads only the selected section and preserves failed coupon/shipping drafts. Existing visual system/Persian RTL retained; Tailwind includes the new feature directory.
- Product/media: independent metadata, pricing, stock, variant and media drafts; binary multipart files and revocable object previews; inline/announced validation, pending-save lock, conflict refresh and cancel lifecycle. Persisted primary is distinguished from display fallback, preventing gallery-only image loss on edit. Settings previews also use object URLs. Empty compare-at prices clear explicitly. Backend caps combined binary input at 40 MiB and total images at 12, including primary; existing per-image decoding/MIME/extension/dimension/animation/re-encoding/random-filename protections remain. Existing Product primary/JSON gallery storage is sufficient; no schema/data migration or new dependency. Files referenced by historical orders remain intact.
- Final verification: full backend suite 123 cases, 116 pass/seven existing SQL-only skips (8.829s); Django check and migration drift pass. Frontend 74 tests (9 Node + 65 Vitest), lint/typecheck and production build pass (2.95s). Four real-Django Chrome journeys pass (16.8s), including create/upload/render after reload/edit/Escape/focus wrapping/mobile menu. Desktop/mobile screenshots were visually checked; editor header/footer stay visible with a scrolling form body. Compose configuration passes with only the known global Docker-config read warnings. Reviewed the source/test/docs diff and passed the full baseline-to-worktree whitespace check after trimming inherited whitespace from extracted JSX. No SQL Server suite was rerun; its seven explicit skips remain visible.
- Iterations/environment: Windows/esbuild parent-directory sandbox restriction required authorized outside-sandbox tests/build/browser commands. Browser tests caught the missing Tailwind feature scan, then temporary-server media 404s; only the disposable E2E settings enable DEBUG media serving. Gallery-only primary fallback was corrected during trace review. Explicit Tab wrapping prevents focus moving to browser chrome at dialog boundaries. Node media probes migrated into expanded Vitest workflow coverage; no test cases were dropped without replacement. No production data, environment values, media or SQL Server accessed.
- Rollout/remaining obligations: deploy frontend/backend together for server filters and explicit decimal clearing; rebuild assets, retain the 50 MiB Nginx body limit/media mount. No migration, credential rotation or configuration decision introduced. Shared staff catalog compatibility helpers now expose a maximum 100-record preview; complete management uses the paginated products screen. Customer/public pagination, stats aggregation, broader staff capabilities, SQL plans/concurrency and production media-header/legacy-file review remain in later batches. `docs/ADMIN_MEDIA.md` records compatibility and application-only rollback. No merge/push/deployment requested or performed.
- Git: backend/media/filter commit `ffa6d3c`; feature/editor/test commit `6de1934`; final documentation/whitespace closeout follows. All work stays on `codex/batch-07-admin-media`. AGENTS remains unchanged because continuity responsibilities and verification rules did not change. Temporary extraction scripts were removed; no generated output, uploaded media or browser traces are committed.

## 2026-10-01 - Batch 6 frontend state architecture (started 2026-09-30)

- Objective: classify state ownership, separate unrelated subscriptions without a provider tower, evaluate server caching, and protect cart/wishlist identity, persistence and synchronization.
- Starting state: clean `codex/batch-05-frontend-api-auth` at `1e336c064b4ebfbf66976f5d844dce9dc526dfba`; confirmed active repository root and read AGENTS, Codex and Handoff. Created required `codex/batch-06-frontend-state` from the current Batch 5 prerequisite, preserving its work rather than returning to older integration. Resumed at the owner's request after the date changed.
- Initial findings: GlobalContext owns seven domains; account and guest persistence share keys, logout retains account commerce data, failed hydration enables destructive replacement, and legacy cart migration skips an absent v2 key.
- Completed architecture: `frontend/state/{AppState,auth,commerce,persistence,remote,runtime,store,ui,admin}` replaces the responsibility concentration with one stable provider and focused subscriptions. All application consumers migrated; `contexts/GlobalContext.tsx` is a small regression compatibility facade. TanStack Query owns shared catalog/settings and admin snapshots with identity-scoped caching, deduplication, explicit invalidation/error handling and cancellation. No blanket memo/useMemo/useCallback changes. `docs/FRONTEND_STATE.md` records the classification, alternatives, decision/defaults and every browser key; Codex and audit status updated.
- Commerce/session fixes: role/user-scoped persistence, max/union guest transfer once, logout isolation, independently gated GET hydration, serialized cart/wishlist writes, persisted removals/clear, retry UI and online recovery, stale-response rejection, stock/quantity validation, and storage exception handling. Legacy commerce sources are retained; unused user-session copy is removed only after migration/quarantine persistence. HTTP cookie mutations wait for dispatched account writes; a non-secret epoch marker expires other app tabs before queued writes. No browser security tokens. Checkout form/continuations reset by session; stale quotes abort and clear during input debounce.
- Final verification: `npm.cmd run lint` and `npm.cmd run typecheck` pass; `npm.cmd test` passes 64 cases (12 Node + 52 Vitest, including 19 new regressions); production `npm.cmd run build` passes in 2.45s. Three isolated real-Django Chrome journeys pass in 10.3s (storefront, customer COD checkout/history, admin product persistence). Final source/diff/key audit finds no unrelated files, persisted credentials or generated artifacts. `git diff --check` passes. Backend/SQL/Compose suites are not rerun because their sources/configuration are unchanged; browser fixtures use only the disposable test database. Prior unresolved owner obligations below remain unchanged.
- Environment: sandbox npm registry access and Windows/esbuild parent-directory reads failed; authorized outside-sandbox installation/checks worked. Query adds two locked dependencies. Install reports eight dependency audit findings (three moderate/five high); no unrelated audit-fix upgrades were applied. Browser checks use installed Chrome, port 13100 and the repository's synthetic disposable SQLite backend; no production DB/SQL/Compose changes.
- Remaining scope/owner actions: no migration, configuration or credential rotation is introduced. Run `npm ci` when consuming the updated lockfile. Legacy commerce with an old session marker is deliberately quarantined rather than attributed to a new user. Independent-device conflict semantics, price-change confirmation, staff capabilities, later admin/pagination decomposition and earlier production/security obligations remain open. Storage-blocked browsers cannot guarantee reload durability or cross-tab notifications. No merge or push requested/performed; integration/publication remains a separate step.

## 2026-09-30 - Batch 5 frontend API and authentication

- Objective: coherent API boundaries, explicit transport/domain types, single-flight refresh, session bootstrap/expiry, normalized errors and selective cancellation; preserve the visual UI.
- Starting state: clean `codex/remediation-program` at `7343e237f1282e03ca5e239a390f29a0f053814f`; created required `codex/batch-05-frontend-api-auth`. Read AGENTS, Codex, Handoff and prior API contract decision. No generated trustworthy OpenAPI exists; checked transport parsers cover the extracted domains.
- Completed: `services/auth.ts` and `catalog.ts` own DTO validation/normalization; `http/client.ts` owns unknown JSON, CSRF, shared refresh, one retry and identity guards; `http/errors.ts` provides safe status/message/fields/code. `api.ts` remains the compatibility facade. New modules prohibit explicit any. UI catches consume the normalized error contract; duplicate context user normalization removed. Existing multipart and numeric staff pagination behavior retained.
- Session behavior: explicit loading/anonymous/customer/admin state; expiry clears cached user and cancels catalog/account reads and pending cart timer; late bootstrap/profile/hydration work cannot restore an old identity. Login/register/logout serialize after in-flight refresh cookie writes and suppress new refresh during session mutations. Product detail/review reads cancel on navigation. Static settings reads remain independent of identity changes. No visual UI redesign.
- Final verification: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` (12 Node + 33 Vitest = 45 passes), `npm.cmd run build` (2.37s), and three disposable real-Django Chrome journeys (11.3s) pass. Browser run used `REZA_E2E_FRONTEND_PORT=18180` and `PLAYWRIGHT_CHANNEL=chrome`. Vitest initially hit the documented Windows/esbuild parent-directory sandbox restriction; authorized outside-sandbox runs passed. One trailing blank line was removed during final diff review. Backend/SQL/Compose suites were not rerun because their source/configuration is unchanged; browser fixtures used only a temporary test database.
- Regression coverage: concurrent and delayed 401s, failed/network refresh, second 401, auth endpoint exclusion, CSRF/multipart renewal, independent aborts, logout during refresh, delayed response bodies, malformed auth/catalog DTOs, safe error fields/codes, bootstrap roles, stale account hydration and product navigation.
- Documentation: updated Codex/AGENTS boundary guidance, roadmap/program/audit status and `docs/FRONTEND_API_AUTH.md`. FE-003 addressed; ARCH-003/TEST-002 remain partial for legacy commerce normalizers and strict typing. Existing FE-004/FE-005/FE-006/FE-008/BE-009 and deployment/provider/financial obligations remain open. No schema, dependency or backend authorization change.
- Git: implementation commits `debc630`, `b7f52f7` and `37f7378`; final documentation commit follows. Work stays on the required batch branch; no merge/push or deployment performed. No production data or environment values accessed. Owner action: no migration/configuration decision required for this change; normal frontend release/review remains. Per-tab refresh coordination does not introduce cross-tab synchronization or server-side token revocation.

## 2026-09-30 - Batch 4 backend/API cleanup

- Objective: incremental backend cleanup, explicit contracts and bounded staff collections with coordinated consumers and regression coverage.
- Started clean at `820d5ebb69dde31ddd28a729f7d8c00e4eabe6f2` on integration; fetched origin and verified the same tip. Created `codex/batch-04-backend-api`. Read repository guidance, program, roadmap and relevant audits before edits.
- Completed: removed only proven-unreachable customer order handlers/serializers and unused imports; explicit product/account/contact/settings serializers; shared product transaction and newsletter subscription services; bounded orders/users/messages/products endpoints with complete-page frontend adapters; approved-review query aggregation; bounded profile/address/checkout and promotion validation; sanitized conflict responses. Retained tested public product mutations and live compatibility aliases.
- OpenAPI evaluated in `docs/API_CONTRACTS.md`: drf-spectacular is the preferred future candidate; runtime adoption deferred until method/auth/CSRF/media/alias/error contracts are fully annotated and verified. No misleading generated schema is published.
- Final verification: SQL Server 116/116 pass (28.683s), SQLite 109 passes/seven explicit SQL-only skips out of 116 (6.528s), Django check/drift, frontend lint/typecheck, 24 frontend tests, production build (4.67s), three Chrome smoke journeys (11.0s), and both Compose configurations. Final malformed-body/multipart/conflict tests pass on both engines. No production database access or migration.
- Environment/iterations: sandbox esbuild read restriction resolved by authorized outside-sandbox execution; Windows reserves port 3100, so browser tests use optional `REZA_E2E_FRONTEND_PORT=18180` with matching disposable CSRF origin. Browser regression caught premature address validation in quotes; split quote/checkout serializers and reran successfully. Full tests caught a contact field typo; a focused regression reproduced the multipart normalization issue before correction. Compose emits only global-config access warnings. SQL runner reports test-database destruction; test container/network removed and project-filtered container inventory empty. A supplementary SQL inventory query had quoting failure, so no separate database-count claim is made.
- Audit: ARCH-004, BE-007, BE-008 and PERF-001 addressed; ARCH-003/PERF-002 partial; DB-003 missing-payment reads/ownership/refund denial characterized without inventing history. Broader SQL races, UI-driven pagination, frontend DTOs, legacy financial reconciliation and hosted/deployment evidence remain open.
- Owner rollout: deploy the frontend adapter before/with the paginated backend; no schema migration. Staff screens still collect all API pages, so browser-scale pagination remains follow-up. Historical financial records require verified reconciliation; no provider or policy is invented.
- Reviewed the complete source/test/docs diff, whitespace, 43 audit status categories, changed-document links and added credential signatures. Main/dev/stash and all unrelated work are preserved. Source commits end at `20001d4`; final batch documentation `732ee09` merged with `--no-ff` at `9f5a203` (first parent `820d5eb`). Merge tree equals the verified batch tree. The normal atomic push successfully published Batch 4 at `732ee09` and integration at `9f5a203` to the designated origin. This documentation-only provenance closeout follows on integration and is pushed normally. Exact full hashes are in CODEX_PROGRAM; hosted CI success is not claimed.

## 2026-09-30 - Publish Batch 3

- Owner explicitly requested a Git commit and push. Started with a clean integration worktree at `94ac9bd`; Batch 3 is already committed at `7317cb3`. Verified origin is `https://github.com/Alpha-lacrim/REZA-Formal.git`, remote integration remains `7bec4bc`, and the remote Batch 3 branch does not yet exist.
- Reviewed the outgoing file summary and whitespace check. Existing September 16 frontend/browser and September 28 backend/SQL evidence remains applicable: this session changes publication documentation only. No application changes or test reruns are needed.
- Committed the publication entry as `5d48220`, then successfully pushed both branches atomically without force: Batch 3 at `7317cb3`, integration at `5d48220`. Both now track their origin branches. This documentation-only completion record follows on integration; exact current remote tips can be checked with `git ls-remote --heads origin codex/batch-03-testing-ci codex/remediation-program`.
- Hosted CI results have not been observed. No main/dev branch or deployment was changed.

## 2026-09-28 - Resume SQL Server verification

- Resumed on `codex/batch-03-testing-ci` at `517996d`, preserving the prior uncommitted SQL follow-up entry. Previous build was stopped during base-image download; the subsequent isolated-container start was rejected by automatic approval review due to a usage limit. No SQL result was obtained.
- Initial Docker probe now reports the Docker Desktop Linux engine pipe missing. Checking startup before continuing the same disposable lane; production services/data remain outside scope.
- Started Docker Desktop and only the `reza-sql-tests` SQL service; verified no mounts and loopback port 11434. Used the native Python/ODBC runner. Initial root-directory discovery found zero tests and was not counted; all real runs used `backend`.
- Initial SQL run reproduced an invalid JSON-string media fixture and a same-key concurrent checkout returning insufficient_stock. Corrected the fixture while retaining legacy-string representation coverage. Checkout now rechecks the key after validation/integrity rollback, replays the same customer's committed order and rejects foreign key reuse. Added a cross-customer race regression; no transaction/stock guard was relaxed.
- Verification: targeted SQL 14/14 pass (5.328s); full SQL 99/99 pass with no skips (27.621s), including fresh migrations and legacy backfill. SQL Server 2022 Developer 16.0.4255.1, ODBC Driver 18. SQLite: 93 passes/six SQL skips out of 99 (7.573s); Django check/drift pass. Frontend unchanged; September 16 results remain applicable.
- Confirmed zero remaining test databases, then removed only the disposable container/network; project-filtered inventory is empty. No production database, application volume, main/dev, remote or deployment was modified.
- Updated all continuity/audit documents and native SQL commands. TEST-003 is partial with executed baseline evidence; DB-002 mixed mutation locking and wider coupon/edit/cancel/refund schedules remain open. Hosted/full Linux test-image execution is not claimed.
- Final review passed: scoped source/document diff, whitespace, document links, updated audit status and added-line credential signatures. Commits `7193ead` (fix/tests) and `7317cb3` (SQL evidence) merged locally into integration at `dff0d9105db3ead321a619b1286ac0d05f09174e`, with parents `517996d` and `7317cb3`. Batch branch preserved; no push. This closeout changes documentation only; verified application/test trees are unchanged.

## 2026-09-16 - Execute disposable SQL Server lane

- Owner reported Docker is available. Confirmed Docker 29.1.3 outside the sandbox; the initial sandbox probe was denied access to the daemon.
- Starting state: clean integration at `517996d`. Fast-forwarded the preserved Batch 3 branch to integration before this follow-up. Only the standalone `reza-sql-tests` project is in scope; no existing test-project containers were found.
- Attempt stopped during slow image download; native-runner startup then hit an automatic approval usage-limit rejection. No SQL tests ran then. The September 28 entry records successful continuation.

## 2026-09-16 - Resume Batch 3

- Resumed on `codex/batch-03-testing-ci`, preserving all uncommitted Batch 3 changes. Prior run: 93 backend tests passed, five SQL-only skips, ten retained frontend tests passed; disposable browser backend health/catalog/cookie login and isolation guards passed.
- Prior blockers: npm registry resets/timeouts and missing cached packages prevented lockfile generation and frontend lint/Vitest/typecheck; Docker daemon absent; build sandbox failure followed by automatic approval usage-limit rejection. No merge or push occurred.
- Completed dependency/lockfile installation, Vitest/RTL/user-event/MSW cart/wishlist/session tests, ESLint 10, Playwright fixtures, fast CI gates and separate browser/SQL jobs. Runtime dependency versions, Vite and TypeScript are unchanged. Only four lint-required declaration/array-guard cleanups touch application source; no formatting rewrite or schema/runtime backend change.
- Verification: clean `npm ci` passed (367 packages, 18s), lint/typecheck passed, all 18 frontend tests passed (10 retained Node + 8 Vitest), production build passed (4.29s), all three browser smoke tests passed (19.7s) in installed Chrome 152.0.7977.84 using temporary profiles and a disposable SQLite database. Real COD checkout asserts unpaid state; no provider simulated. Prior 98-case backend run has 93 passes and five deliberate SQL-only skips; Django check/drift pass. Both Compose files validate; both workflow YAML files parse. Exact commands/results are in docs/audit/TESTING_CI_AUDIT.md.
- Environment corrections: dependency download recovered using cached packages/retries/reduced connections. Chromium CDN returned 403 location restriction; documented `PLAYWRIGHT_CHANNEL=chrome` runs the same smoke suite. Windows rejected port 8000, so E2E uses dedicated loopback ports 3100/18080 with its own Vite config. Fixed Windows interpreter quoting and scoped desktop login locator to navigation. Normal development ports remain unchanged.
- SQL Server remains unrun because the Docker daemon pipe is missing. Its independent connection/concurrency/migration lane is configured and documented, not claimed passing. DB-002/TEST-003 remain open. Hosted GitHub runs/branch protection, pinned Chromium on CI, further identity/pagination/DTO/accessibility tests and dependency advisories remain follow-up evidence/work.
- Updated durable commands and all requested audit/roadmap/program/handoff files, plus docs/TESTING.md and AGENTS lint baseline. Commits: backend `3a0966b`, frontend `d3d65a4`, CI/docs `8c6735f`. After passing gates and full diff/whitespace/link/credential-signature review, merged Batch 3 into `codex/remediation-program` at `1618a130b5b28ea56d2502e1926b5eb7d2c9f024`; parents are start `7bec4bc` and batch tip `8c6735f`. Batch branch preserved. This documentation-only closeout records the observed merge. No push, deployment, production data/credential/volume access or main/dev change is included.
- Final review confirmed all 43 audit status categories agree, the four changed statuses match exactly, document links resolve and lockfile packages have npm registry URLs/integrity metadata. Application/test tree at the merge is identical to the verified batch tip; final worktree check follows the closeout commit.
- Owner follow-up: run the manual SQL lane on a Docker-capable disposable host; review hosted fast and extended CI after separately authorized publication. Do not treat SQLite or configured workflows as SQL concurrency proof.

## 2026-09-14 - Batch 3 testing and CI foundation

- Objective: establish frontend, backend, browser and isolated SQL Server test lanes, lint and CI without unrelated refactoring.
- Starting state: clean `codex/remediation-program`; repository root and mandatory guidance verified. Working branch: `codex/batch-03-testing-ci`.
- Implementation and verification in progress; no production database access is authorized or needed.

## 2026-09-14 - Complete authorized Batch 2 publication

- Objective and starting state: resume publication after the owner explicitly approved both branches to `https://github.com/Alpha-lacrim/REZA-Formal`; integration was clean at `2550a2f`, with Batch 2 at `36fbd4eb04ba5b9c3e2b522c1d1388f585b2a42c`.
- The destination-specific authorization resolved the earlier approval block. `git push --atomic --set-upstream origin codex/batch-02-critical-correctness codex/remediation-program` succeeded: GitHub created Batch 2 and advanced integration from `8d867c2` to `2550a2f`. Both upstreams are configured.
- This handoff-only follow-up records the observed publication and is pushed to integration. Application files are unchanged, so the prior 81 backend tests, 10 frontend tests and baseline checks remain applicable. Whitespace, diff and final remote-tip/worktree checks accompany publication.
- No deployment or production data change was performed. Existing SQL Server concurrency, deployment verification and historical refund reconciliation work remains open; owner rollout requirements below still apply.

## 2026-09-14 - Publish Batch 2

- Objective: publish Batch 2 and integration after the owner's explicit push instruction.
- Starting state: clean integration at `8d219f94f9c1e82f2478f7fd6bf106f82ed2d772`; batch branch at `36fbd4eb04ba5b9c3e2b522c1d1388f585b2a42c`. Confirmed merge parents and preserved main/dev. The prior 81 backend tests, 10 frontend tests and baseline results apply to the unchanged application tree.
- Read-only remote verification succeeded: origin is `https://github.com/Alpha-lacrim/REZA-Formal.git`, remote integration matches the published baseline `8d867c2017f627c69d533de5d5dfacd9dd70a4f8`, and the prior audit branch matches `dbafbf2a68a01ce27d1769fab274cd9e9e8b4322`. The Batch 2 remote branch does not yet exist.
- Publication blocked: automatic approval review rejected the atomic push before execution. After remote verification, the retry was also rejected because destination ownership was not independently verified and the user had not explicitly named this GitHub destination. No branch was pushed. Explicit authorization naming that repository is required to continue; do not work around the rejection.
- Reviewed outgoing paths and whitespace; application code is unchanged from the passing checks. This documentation-only record preserves the blocked result. Existing SQL/deployment/legacy-reconciliation gaps remain open; no deployment is included.

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
