# Codex Remediation Program

Baseline tag:
pre-codex-remediation-2026-09-10

| Program metadata | Value |
| --- | --- |
| Program | REZA-Formal Codex Remediation |
| Program status | Partially complete - final source review finished; 15 original findings remain; production release blocked |
| Baseline commit | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` |
| Baseline tag | `pre-codex-remediation-2026-09-10` (annotated) |
| Integration branch | `codex/remediation-program` |
| Current batch | Batch 12 - final architecture review and program closeout |
| Batch status | Review/docs complete; supported runtime clears the image gate; owner-authorized PR #2 source acceptance recommended, conditional on final-head checks |
| Batch branch | `codex/batch-12-final-review` |
| Batch start commit | `31e72ea` (clean Batch 11 head); integration initially `db565f6` |
| Final batch / integration merge | Initial review `0a99f80`/`ecb7867`; container follow-up `83d77e2`/`d23e71c`; documentation-only hosted evidence record follows on integration |
| Audit IDs handled | All 43 reassessed; 28 addressed/contained at recorded scope, 15 open/partial (P0 0, P1 2, P2 13, P3 0) |
| Verification performed | 80 frontend cases, 16 Chrome/axe journeys, SQLite 154 pass/12 deliberate skips, SQL 166/166, lint/typecheck/build/check/drift, both images, proxy/runtime/restore/TLS, configuration/dependency/policy/actionlint gates |
| Remaining risks | Broader SQL races, actor actions/DTOs, owner policies, production provisioning/recovery, arm64 validation if selected, manual browser/SQL hosted lanes and absent classic main protection, historical secrets/financial/provider work and expiring build advisory remain. Original Debian image blocker cleared without an exception |
| Next batch | No automatic next batch; owner-reviewed follow-up milestones in ROADMAP; source merge is explicitly authorized through reviewed PR #2 |

## Batch 12 - Final review and closeout (2026-10-04)

### Owner-authorized source acceptance

- The owner's latest instruction explicitly authorizes merging PR #2 into main
  after a satisfactory plan/engineering review. Earlier automatic integration
  preserved main correctly; this reviewed source merge has separate authorization.
- Review begins at clean integration `33ee963`, main baseline `99a1ea5`, with all
  hosted CI/security/container/Vercel checks green and retained scan artifacts.
  High-risk boundaries and additive migrations match the plan. Fresh local SQL
  **166/166, zero skips (59.161s)** and browser/axe **16/16 (3.8m)** pass, as do
  Django checks/drift, configuration/build-input and whitespace checks.
- Optional hosted dispatch is unavailable before the workflow reaches default
  main (404); classic main branch protection is absent. Those observations replace
  earlier unverified wording without claiming hosted SQL/browser execution.
- Recommend source acceptance, preserving partial status and all 15 residual IDs.
  Publish the documentation-only review, require its final-head checks, then use an
  exact-head guarded GitHub merge without bypass. [PR #2](https://github.com/Alpha-lacrim/REZA-Formal/pull/2)
  records the actual merge SHA/status. No manual backend deployment, production
  database/data operation, branch deletion or history rewrite belongs to this acceptance.

### Requested container CI repair

- Starts from clean published candidate `77f1292`, fast-forwarding the required
  Batch 12 branch. PR/push container failures are the same Linux EACCES reading
  root-only recovery files, before image scanning. Owned Docker backup volumes
  replace host-directory access; fixture checks root/mode preservation and denial
  to the application UID. Production backups/data are untouched.
- Fresh Debian no-cache rebuild reproduces the historical 44 HIGHs. Supported
  Alpine 3.23/Python 3.11.17/ODBC 18.7.1.1 clears every image advisory with the
  original dependency hash lock and unchanged strict policy. Both vendor APKs
  were detached-signature verified before checksum pinning; [ADR 0002](adr/0002-backend-runtime-base.md)
  records compatibility and arm64 limits. No application/schema redesign or waiver.
- Both final no-cache builds, proxy/configuration/build-input/actionlint/policy,
  runtime/TLS/ownership/recovery, built-image SQLite check/drift/full suite and
  completed full image scan pass. Final built-image disposable SQL check/drift and
  166/166 tests (zero skips, 39.364s) pass. Hosted outcomes/publication follow in
  Handoff/[FINAL_REVIEW](audit/FINAL_REVIEW.md).
- Residual counts remain 15 (P0 0/P1 2/P2 13/P3 0). OPS-002 still requires actual
  production owners/artifact promotion/capacity/grants/volume evidence. Historical
  review and scan results below remain intact.
- First fix `7d8219a`, integration merge `bc80739`, normal atomic push of both
  branches. Hosted push/PR fast and security lanes pass; container jobs confirm the
  backup fix but next fail reserving the old IP for DNS recovery. A scoped explicit
  IPAM/different-address assertion follows, retaining all recovery and scan gates.
  Fix `8712384` merged at `4225f9b` and was normally pushed on both branches.
  Push CI `37161305686` and PR CI `37161309746` pass all jobs, including complete
  runtime/DNS/recovery and the strict image scan. Both security workflows and
  Vercel pass; PR #2 remains open/CLEAN, with main untouched.
- Hosted artifact inspection finds that upload-artifact silently excludes hidden
  `.ops-reports`. Enable hidden files only within the existing JSON report glob;
  no scanner/release policy changes. Fix `83d77e2` merged at `d23e71c`; normal
  atomic push updates both branches. Push CI `37161600860` and PR CI `37161604699`
  and both security workflows pass. Both retain scan artifacts; downloaded full
  push reports show zero findings at every severity, clean `d23e71c` and a fresh
  official DB. PR #2 remains OPEN/CLEAN. This documentation-only hosted evidence
  record follows on integration; final SHA resolves from that branch. Main is untouched.

### Initial review

- [FINAL_REVIEW](audit/FINAL_REVIEW.md) maps all system owners, compares the original
  audit, records remaining severities/owner decisions/retained tradeoffs and gives
  explicit boundaries against further speculative refactoring. No runtime artifact
  was deleted, no new abstraction/schema/dependency introduced and no production
  system or application volume modified.
- Branch created at clean Batch 11 `31e72ea`; startup log `ec683d7`. Merge `be915be`
  preserves Batch 10 follow-up `82a9459` and Batch 11 history, resolving only
  continuity/program documentation conflicts. Batches 9–11 are included in the
  resulting application tree. The separate operations worktree remains intact.
- Rerun results: frontend 9 Node + 71 Vitest, 16 real-Django/synthetic-read-stress
  Chrome/axe journeys; SQLite 166 discovered/154 pass/12 deliberate SQL skips;
  full disposable SQL 166/166 (157.427s), check and drift; locked image builds,
  proxy/TLS/ownership/restart/SQL+media recovery and synthetic configuration gates.
  Runtime npm/Python advisory reports are clear; full npm retains five exact
  temporary build-only entries. Actionlint and three strict image-policy cases pass.
- Initial full image scan completes, rather than failing to download: backend 44
  unfixed HIGH package findings across eight IDs, zero CRITICAL; frontend zero
  findings. Strict release gate exits 1. Integration of the reviewed candidate
  carries that visible blocker; it does not accept risk or approve deployment.
- Documentation roles reconciled: operating contract in AGENTS, durable map in
  Codex, chronological Handoff, this control board, historical/canonical audit,
  routing ADR and remaining ROADMAP. Previous roadmap updates remain in
  [PROGRAM_ROADMAP_HISTORY](audit/PROGRAM_ROADMAP_HISTORY.md). All unresolved
  historical rollout, provider, secret and financial obligations remain.
- Program is **partially complete**, not fully remediated: DB-002/TEST-003 P1
  evidence remains; 13 P2 records retain explicit closure gates. Local source
  verification does not establish deployed production safety or hosted CI success.

### Batch 12 integration and publication

- Final review commit: `0a99f80472db69e4fdbd7a44d5634fe81b15dada` on the required
  Batch 12 branch. Non-fast-forward merge:
  `ecb78672f8cfa3e02df5e9d8443457f45da55338`, first parent integration start
  `db565f6c279d1b60d96e981cb2911014903106a4`, second parent final review commit.
  Merge tree equals the reviewed batch tree. All Batch 9/10/11/12 tips are ancestors;
  subsequent changes here/Handoff/FINAL_REVIEW are documentation only.
- Normal atomic push succeeded: created origin Batch 12 at `0a99f80` and advanced
  origin integration from `db565f6` to `ecb7867`. This publication record follows
  on integration with subject `docs(audit): record final candidate publication`;
  resolve its final SHA from `git rev-parse codex/remediation-program` after push.
  No force push, main/dev/stash update, deployment or hosted CI outcome is claimed.
- Local main `449c5a142c0f840b55b468d88e6b17f8d7ff329d`, dev
  `f76f232ab658e836f594fb9dc40ff53b1ddececf`, stash
  `bd371510428d76e6587eaa20913c23bfd12af3c8` and remote main
  `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` are preserved. Earlier Batch 9–11
  local-only/unmerged statements describe their original sessions and are superseded
  by this authorized candidate integration/publication, not by a production rollout.
- Initial candidate verification is successful at application/database/browser/operations
  scope. The independently executed image release gate remains visibly blocked;
  integration accepts the partial review outcome, not the production security risk.
  Human PR/review into main and the remaining ROADMAP gates are the next owner steps.
  The later requested container repair supersedes this historical image blocker;
  it preserves the strict policy and all prior scan evidence.

## Batch 11 - UX, accessibility, RTL and SEO (2026-10-03)

- Shared native dialogs, initial/return focus, skip navigation, visible focus,
  persistent form labels/Persian validation, selected/disclosure state, live
  feedback and explicit failed-read recovery improve the key customer/staff flows.
- Responsive navbar/gallery/cart/checkout/table/dialog sizing and measured
  contrast changes preserve the gold/black identity. Mixed-direction address,
  email, product attributes and Persian pagination are verified in browser states.
  Hero/detail priority and lazy decoding/containers reduce unnecessary waiting.
- Metadata cleanup/defaults, absolute social/schema URLs, private/error noindex,
  one product h1, breadcrumbs and route/policy/product recovery address UX-003.
  [ADR 0001](adr/0001-storefront-routing.md) keeps supported hash deep links; product
  canonicals/sitemap and server product/social/status rendering remain UX-002.
- Pinned dev-only axe adds no production dependency. WCAG-tagged scans run without
  disabled rules/exclusions, alongside keyboard/native-validation/viewport tests.
  The long-copy/gallery and delivered return-read overrides are explicit UI stress
  fixtures; actual COD/admin writes remain real Django. Manual NVDA/VoiceOver/user
  review and broader browser/device/zoom coverage remain UX-001 evidence work.
- Local commits only on the required branch; no merge/push, deployment, new
  configuration, backend mutation code or migration. [Audit](audit/UX_A11Y_SEO_AUDIT.md)
  and Handoff retain verification and prior unresolved launch obligations.

## Batch 10 - Production infrastructure and operations (2026-10-03)

- 2026-10-04 advisory remediation is isolated in the required Batch 10 worktree,
  preserving completed Batch 11 in the primary checkout. Debian 13 security updates
  remove all five reported CRITICAL and fifteen prior advisory IDs while retaining
  Python/ODBC/hash-lock versions. Forty-four HIGH package findings across eight IDs
  remain; every HIGH/CRITICAL now blocks release, including unfixed advisories.
  No exceptions or unstable package mixing. Runtime privilege bits removed;
  [vendor matrix and next steps](RUNTIME_VULNERABILITIES.md) track remaining work.
- Local-only follow-up resolves scanner connectivity through official DB fallback:
  frontend fixes remove 67 fixable HIGH/CRITICAL findings and the patched snapshot
  reports zero advisories; the original backend retained 63 unfixed HIGH/CRITICAL
  findings before the later remediation above. Full reports/provenance retained;
  no silent exception.
  Backup-before-ownership maintenance, legacy restore/symlink rejection, disposable
  HTTPS/SQL certificate validation and local actionlint checks pass. Cleanup remains
  blocked by automatic review; real production and hosted workflow runs remain out
  of the owner's explicitly reconfirmed local-only scope.
- Required branch starts clean at the Batch 9 local head above. No external deployment,
  real cloud/DNS/payment/production DB change, integration merge or remote publication.
- Digest-pinned multi-stage images, complete Python hash lock and existing npm lock;
  no package manager migration. Backend UID 10001, Nginx UID 101/read-only port 8080,
  no runtime installers/compilers, bounded logs/probes/shutdown and safe static/media
  ownership. Backend image is approximately 69 MB versus prior local 181 MB.
- Production override is a review template: no unattended DB creation/migration/seed,
  separate restricted runtime login, certified SQL encryption/licensed edition,
  Secure cookies, no DB/API host ports and loopback TLS-ingress contract. Provisioning
  and actual ingress/client-IP trust are explicitly owner work.
- Redacted JSON request/error events and overwritten IDs correlate proxy/Django;
  safe cache/map policies, WhiteNoise static proxy and Docker DNS rediscovery verified.
  Real-SQL runtime fixture proves denied runtime DDL, restart persistence, graceful
  shutdown, dependency-failure health and SQL/media recovery to NEW disposable targets.
- CI pins action commits and runtime patch versions, adds lock/secret-signature checks,
  synthetic Compose validation, both builds, proxy/recovery and all high/critical
  image scan gates using checksum-verified Trivy. Actual deployment remains absent.
- [OPERATIONS](OPERATIONS.md) owns operator runbooks and explicit limitations.
  Handoff records the public mirror build workaround, exact verification/scanner
  results and owner obligations. Earlier provider/outbox/financial/secret/TLS gates
  are not erased by synthetic recovery success.

## Batch 9 - Security hardening (2026-10-03)

- Required branch `codex/batch-09-security` starts at `db565f6c279d1b60d96e981cb2911014903106a4`, clean integration. Main/dev/stash and ignored configuration remain preserved. No fetch, push, merge, production deployment or next batch is claimed in this scope.
- Auth family rotation/revocation, cross-tab cookies, failed logout, effective staff DTO/native escalation restrictions and disabled incomplete Google/MFA flows address SEC-002/SEC-004/FE-008. Shared atomic throttles/trusted forwarding address SEC-003; site image staging and Nginx containment reinforce SEC-001.
- Dependency updates retain supported Python/Vite/Router lines; Vitest major has explicit Node/Vite/full-suite compatibility evidence. Zero known production npm/resolved Python advisories at this date. SEC-005 remains partial for five dev-only GHSA-vfj7-8cjw-p6xm entries, with a gate expiring 2026-11-02 00:00 UTC; no forced Tailwind major.
- Full SQL 161/161 with zero skips, full frontend 9 Node + 69 Vitest, four Chrome and ten proxy status/header/media cases plus two forwarding probes pass. See Handoff for SQLite/check/drift/configuration counts, iterations and durations; see [security policy/evidence/rollout](SECURITY_HARDENING.md).
- Apply migrations 0009/0010 with coordinated app rollout and require re-login; configure verified proxy CIDRs/TLS/HSTS, schedule security-state pruning and inspect legacy media. Historical credential rotation/history cleanup, financial reconciliation, hosted CI and production image/OS verification remain owner gates.
- Theme commits: `84c2dc1` sessions/identity; `c10f9b2` shared limits; `28d3248` decorator correction; `98acddd` site media; `647ea09` response/ingress/native login; `afc6c21` dependencies/gates. Final documentation commit is resolvable from the local branch. Local source completion is distinct from integration/publication.

## Batch 8 - Database and performance (2026-10-03)

- Required branch starts at `7ac1a7805ee1e1598c4027868536749fdbdd3c6a`, after fetching unchanged origin integration `7343e237f1282e03ca5e239a390f29a0f053814f` and integrating the previously verified prerequisites below with non-fast-forward merges. Main/dev/stash/ignored configuration preserved. All later closeout operations concern program/batch branches only.
- Backend commit `d0ff928bc6ee98addcbfd2118d3117e5c70e4467`: constant cart/return graphs, compact/public page/filter contract, batched unlocked quotes, SQL net revenue, read-only inventory report, redundant SKU-index migration and query/byte/SQL regressions.
- Frontend commit `bb14c6e5afacfb3f83e09ef820a7a017bbdec27c`: server catalog/search/home previews, customer/review page controls, beyond-preview cart metadata and fresh stock precedence, stable product derivation, suppressed disposed/detail-context duplicate requests, embedded order expansion and regression/browser budgets.
- [DATABASE_PERFORMANCE](DATABASE_PERFORMANCE.md) owns the full measurements, reader/writer/canonical stock trace, transactional review, SQL index plan/shape/round-trip evidence, rollout and limits. No stock redesign, Redis, speculative index addition, production mutation or provider change. Migration 0008 removes only the measured redundant SKU index, with unique SKU preserved.
- Checks: full 130-case SQL suite, full 130-case SQLite suite (nine explicit SQL skips), six final performance/inventory probes on each engine, 9 Node + 67 Vitest checks and 20 targeted final state/catalog/cancellation checks, lint/typecheck/build, four Chrome smoke journeys plus final customer rerun, Django check/drift and both Compose configurations. Final dependency restoration/rechecks and exact timings are in Handoff. Test SQL DB/container/network and baseline worktree removed; hosted CI not claimed.
- PERF-003/DB-004 addressed; FE-005 consumers complete; PERF-002 remains partial for whole saved snapshots/historical inline media, DB-001 partial for broader cross-record invariants, DB-002 mixed lock schedules open. Locked checkout remains 24/256 queries for 1/30 lines; no SQLite row-lock claim. Deploy coordinated public pagination/card clients and backend; backup/inspect SQL schema before applying 0008.

### Batch 8 closeout provenance

- Batch start: `7ac1a7805ee1e1598c4027868536749fdbdd3c6a`; application commits `d0ff928bc6ee98addcbfd2118d3117e5c70e4467` and `bb14c6e5afacfb3f83e09ef820a7a017bbdec27c`; batch documentation/final tip `23ede44436df788a42bf76f5e8d5e17e4a8e2d6f`.
- Verified non-fast-forward merge `d28aabd363a460ef87123b884e2afebaac7b4ec8`; parents are the exact start and final tip above. `git diff --quiet codex/batch-08-database-performance d28aabd` returns zero: merge tree equals tested batch tree. Full diff/whitespace, credential signatures and documentation path checks pass. Main `449c5a142c0f840b55b468d88e6b17f8d7ff329d`, dev `f76f232ab658e836f594fb9dc40ff53b1ddececf` and stash `bd371510428d76e6587eaa20913c23bfd12af3c8` preserved.
- Normal atomic push succeeded: created remote Batch 5/6/7 at preserved tips in the table below, created remote Batch 8 at `23ede44436df788a42bf76f5e8d5e17e4a8e2d6f`, advanced integration from `7343e237f1282e03ca5e239a390f29a0f053814f` to merge `d28aabd363a460ef87123b884e2afebaac7b4ec8`. No main update, force push, branch deletion, deployment or hosted CI claim.
- Publication closeout commit `2ed17b973eb959d37fb38a0c63b08b7955c13bc4` followed the merge and was pushed normally; origin integration advanced from `d28aabd363a460ef87123b884e2afebaac7b4ec8` to that exact SHA. This final documentation tidy records the now-known closeout SHA and removes an empty heading. A commit cannot embed its own literal SHA; resolve this final record as the first first-parent child of `2ed17b973eb959d37fb38a0c63b08b7955c13bc4`, expected subject `docs(perf): finalize publication provenance`. Its normal push and local/remote tip verification follow its commit and are reported in the final response.

### Prerequisite integration record

These local verified branch tips were not yet on integration at session start. This session's authorized integration preserves each branch and its history:

| Branch | Final SHA | Non-fast-forward merge SHA |
| --- | --- | --- |
| `codex/batch-05-frontend-api-auth` | `1e336c064b4ebfbf66976f5d844dce9dc526dfba` | `b20585020d9b8630bf1fd902bb66c3e1ae058122` |
| `codex/batch-06-frontend-state` | `755653b11322167205ade43b8810ababc38c4bed` | `48c5bfcfbff22973b1b4dfc9559b881de7567178` |
| `codex/batch-07-admin-media` | `6ee3771621e7f2bd46672dbb57e9017a664bb4e2` | `7ac1a7805ee1e1598c4027868536749fdbdd3c6a` |

Earlier Batch 5/6/7 session statements about local-only/unmerged work describe those original sessions and are superseded by this integration record. All batch starts are retained in their original sections/Handoff. Prerequisite commits: `debc6301cce21568cd4fb5f732ca3274652e2a32`, `b7f52f7345a0c1bf30f91cc4c75dfa0c2d536d23`, `37f73780d87066b019d5f69ccb3a0a676a5bb789`, `1e336c064b4ebfbf66976f5d844dce9dc526dfba`, `755653b11322167205ade43b8810ababc38c4bed`, `ffa6d3ccea7dd16f5c370ee308cb8757f45562f1`, `6de1934e423da4bb63c45e47150a46e6f5323078`, `6ee3771621e7f2bd46672dbb57e9017a664bb4e2`.

## Batch 7 - Admin frontend and product media

- Extracted feature responsibilities from AdminPanel while retaining the visual system and Persian RTL. Editor metadata/pricing/variants/media have independent drafts and explicit validation/save/cancel/conflict behavior; shared dialogs manage focus and keyboard operation.
- Staff screens consume server pagination/filter/sort and load only the active commerce section. Order customer data comes from the order representation. Old array helpers are bounded previews; complete management uses paginated screens.
- Managed binary product uploads, object previews, explicit primary/gallery semantics and coordinated limits are verified. Existing gallery storage meets requirements, so no migration/data rewrite was justified. Rollout and rollback are in [ADMIN_MEDIA](ADMIN_MEDIA.md).
- Local feature commits remain on the required batch branch. No integration merge, remote push, deployment, production-data access, dependency addition or next-batch work is included. Earlier security/financial/SQL/provider obligations remain open.
- Verification: 74 frontend tests; lint/typecheck/build; 116 backend passes plus seven SQL-only skips (123 cases); Django check/drift; Compose config; four real-Django Chrome journeys, including managed gallery rendering after reload and desktop/mobile keyboard dialogs. Implementation commits are `ffa6d3c` and `6de1934`; the final docs/whitespace commit is the branch tip.

## Batch 5 - Frontend API client and authentication

- Started clean on integration `7343e237`; required branch spelling follows the owner's explicit request. Commits: `debc630` typed auth/catalog/HTTP/errors and single-flight refresh; `b7f52f7` explicit context session/expiry, UI error consumers and stale-read guards. `37f7378` suppresses newly initiated refresh during session mutations. Final documentation commit follows these application commits.
- No visual redesign, runtime dependency, database migration or backend authorization change. OpenAPI generation evaluated against Batch 4's explicit deferral; checked DTO parsers used instead. See [contract/scope](FRONTEND_API_AUTH.md) and [verification](audit/TESTING_CI_AUDIT.md#batch-5-verification---2026-09-30).
- FE-003 addressed with concurrent/delayed refresh, failure, CSRF, abort and logout tests. Legacy commerce typing and broader cart/quote/pagination/staff capability issues remain open; completion refers to the user's requested transport/session scope.
- Work remains on the local batch branch. No merge, remote push, production data access or deployment occurred. No new migration/configuration action is needed for this frontend change. Exact provenance: `git log --reverse --oneline 7343e237..codex/batch-05-frontend-api-auth`.

## Batch 4 - Backend/API cleanup

- Started from clean/fetched integration `820d5ebb69dde31ddd28a729f7d8c00e4eabe6f2`; required branch `codex/batch-04-backend-api`. No main/dev/stash or unrelated changes.
- Commits: `92ddae4` dead legacy order handlers/serializers, `a406f8c` product contracts/services/aggregates, `eb2fd9b` write validation/newsletter, `5de6836` pagination/adapters/legacy tests, `e7ca669` browser port override, `194b8cc` malformed bodies, `20001d4` multipart/conflict compatibility.
- Preserved routed order behavior, stock/refund transactions, public product mutation compatibility and historical financial truth. New services/read helpers stay inside the existing Django app. No database migration, dependency update, provider, production write or framework rewrite.
- Closed ARCH-004, BE-007, BE-008 and PERF-001; kept ARCH-003/PERF-002 partial and DB-003 open with characterization. OpenAPI evaluated and deferred pending accurate annotations/auth/error/media coverage. See [API contracts](API_CONTRACTS.md), [verification](audit/TESTING_CI_AUDIT.md#batch-4-verification---2026-09-30).
- Final batch documentation commit `732ee09267dfdfb00695241f6d515f303b1adefa` merged with `--no-ff` at `9f5a203029b5770dc5d7277e0beabfed391a05fc`; first parent is start `820d5ebb69dde31ddd28a729f7d8c00e4eabe6f2`. Merge tree equals the verified batch tree. Full diff/whitespace, all 43 audit status categories, six exact changed statuses, changed-document links and added credential signatures pass. Main/dev/stash are unchanged.
- Normal atomic push successfully created origin Batch 4 at `732ee09` and advanced origin integration to `9f5a203`. This documentation-only closeout follows on integration and is published normally; hosted CI results are not claimed.
- Remaining: actual server-driven staff screen pagination, strict frontend DTOs, broader SQL mutation schedules, verified legacy financial reconciliation, schema implementation and hosted CI/deployment evidence. Deploy the frontend adapter with/before the paginated backend; no migration is required.

## Batch 3 - Testing and CI

- September 30: owner authorized publication. Atomic push successfully created `origin/codex/batch-03-testing-ci` at `7317cb3` and advanced integration through publication record `5d48220`; this completion record follows on integration. Hosted CI results remain unobserved; main/dev and deployment are unchanged.

- SQL follow-up commits `7193ead` (checkout replay and regressions) and `7317cb3` (evidence) merged at `dff0d91`, parents `517996d` and `7317cb3`. The following closeout is documentation-only. Batch branch remains `codex/batch-03-testing-ci`.

- September 28 supersedes the initial SQL exception below: native Python/ODBC execution against disposable SQL Server 2022 Developer 16.0.4255.1 passed 99/99 cases. The run reproduced/fixed concurrent same-key replay and corrected an invalid JSON fixture. Six SQL-only cases pass; broader mixed mutation schedules and hosted/full-image CI remain unverified. Temporary database and test container/network were removed. See [SQL results](audit/TESTING_CI_AUDIT.md#sql-server-follow-up---2026-09-28).

- Preserve the Node/RTL auth/admin-media regressions and add Vitest, user-event and MSW for commerce state and HTTP sessions. Add frontend lint without a repository formatting rewrite.
- Add checkout/permission/malformed-input and isolation regressions, a disposable real-backend Playwright runner, and a separate SQL Server Compose lane with independent-connection transaction tests.
- Fast workflow covers `codex/**` and PRs; browser/SQL jobs are separately dispatched. No provider is simulated: browser checkout uses COD and asserts unpaid state.
- Local verification passed on September 16. Browser used installed Chrome 152.0.7977.84 because pinned Chromium's CDN rejected this location. SQL Server was not run because Docker's daemon pipe is missing; this explicitly documented environment lane is excluded from local merge acceptance, not claimed passing. Hosted GitHub runs remain unobserved.
- Only four small lint-required source cleanups were needed; no runtime dependency upgrades or formatting rewrite. Commits: backend `3a0966b`, frontend `d3d65a4`, CI/docs `8c6735f`. Local merge `1618a13` has parents `7bec4bc` and `8c6735f`; the subsequent integration closeout changes documentation only.
- Commands/isolation constraints: [TESTING.md](TESTING.md). Actual results: [testing audit](audit/TESTING_CI_AUDIT.md). No SQL execution or hosted CI success is implied by configured workflows.
- Resolve final batch and merge provenance with `git rev-parse codex/batch-03-testing-ci` and `git log --merges --oneline codex/remediation-program --grep="batch-03-testing-ci"`. Publication was separately authorized September 30; no production deployment is included.

## Batch 2 - Critical correctness

- Read/revalidated Batch 1 before edits. Fixed the six confirmed P1 defects and the explicitly requested authentication/media paths. BE-006 was covered as part of the cancellation invariant. No P0 finding was established and unverified SQL risks were not presented as reproduced bugs.
- Finding commits: `3109735` (BE-005/BE-006), `d400b60` (BE-001), `46e62b1` (BE-002), `30a0825` (BE-003/BE-004), `d98b051` (FE-001), `b4bcc1d` (SEC-001/FE-002), `899ce0a` (BE-001 deleted identities), `59db209` (BE-004 historical consistency). Final documentation records follow these commits.
- New regression tests reproduced each defect before its fix. Checkout remains server-priced, inventory mutations transactional, order snapshots historical and lifecycle guards enforced. The owner selected proportional net item refunds excluding shipping, with reconciled pennies; no external transfer was simulated.
- No schema migration, production-data mutation, bulk media deletion, broad architecture refactor or state-management framework was introduced. Frontend/backend contracts now require inventory versions and explicit manual-refund fields; native commerce admin screens are inspection-only.
- Final checks (2026-09-14): all 81 backend tests (7.671s) and 10 frontend tests (7.530s), Django check/drift, typecheck, build and Compose config pass. Build required an approved sandbox-access retry. [Exact evidence](audit/TESTING_CI_AUDIT.md#batch-2-final-checks---2026-09-14).
- Docker daemon was unavailable. DB-002/TEST-003 remain open, with no SQL Server concurrency or live Nginx verification claimed. Historical financial discrepancies require reconciliation and older media requires backed-up deployment review. Other audit findings retain their later-batch scope.
- The authorized local merge follows the final documentation commit and passing checks; no remote push or main/dev merge is included. Preserve the batch branch. The final response reports the observed merge; these commands provide durable exact provenance:

```powershell
git rev-parse codex/batch-02-critical-correctness
git log --reverse --format='%H %s' 8d867c2017f627c69d533de5d5dfacd9dd70a4f8..codex/batch-02-critical-correctness
git rev-list --reverse --first-parent --merges 8d867c2017f627c69d533de5d5dfacd9dd70a4f8..codex/remediation-program | Select-Object -First 1
```

Expected merge subject: `Merge Batch 2 critical correctness remediation`. The final batch tip is the second parent of that merge; its first parent is the recorded start commit.

## Batch 1 - Forensic audit

### Scope and results

- Started September 10, 2026 from the clean Batch 0 integration tip above. Resumed September 13 on the same branch/commit with the audit drafts preserved. All application files, dependencies, migrations, local `main`/`dev`, the existing stash and baseline tag are unchanged.
- Created all ten requested `docs/audit/` documents and [ROADMAP.md](ROADMAP.md); updated this program and Handoff. `Codex.md` receives only durable navigation/authority facts; `AGENTS.md` is unchanged.
- Traced authentication, catalog/variants, cart/wishlist, quotes/checkout, order cancellation, payments/refunds/returns, staff/native admin, uploads/content, SQL schema/migrations, Docker/Nginx, CI and deployment assumptions.
- Recorded **43 stable findings: P0 0, P1 8, P2 33, P3 2** and verdicts for all 18 supplied hypotheses. Five backend defects and one upload validation defect are reproduced at P1; DB-002 is an unverified SQL concurrency risk and TEST-003 is a coverage gap. Architecture size/coupling is maintenance debt, not a confirmed application defect.
- September 10 checks: isolated Django check/drift and 50 tests passed; frontend typecheck and production build passed (build required an approved sandbox-access retry); Compose config passed with an unreadable global Docker-config warning. npm audit completed with six affected package entries; Python advisory tooling was unavailable. The dates/results are preserved, not represented as September 13 reruns.
- No production SQL/data access, SQL Server concurrency test, live Docker launch, browser/a11y run, restore drill or external provider/credential-history verification was performed. The [testing audit](audit/TESTING_CI_AUDIT.md) includes exact commands and all disposable proof scripts.

### Git completion and publication

The documentation-only merge followed consistency, scope and secret review. Audit commit `dbafbf2a68a01ce27d1769fab274cd9e9e8b4322` is the second parent of integration merge `fc17a0788aa973f1626c876be29619c76ab3f98b`; its first parent is the recorded Batch 0 tip. The initial handoff was local-only. On September 13 the owner requested a completion recheck and conditional push. All six required checks passed again, and the atomic push published both audit and integration branches with matching upstreams. These commands independently resolve the original audit provenance:

```powershell
# Audit commit (first branch descendant; expected subject below).
git log --reverse --format='%H %s' 94d665881e3e929c41121d057385c28f822002fe..codex/batch-01-forensic-audit

# Batch 1 integration merge (first first-parent merge after the fixed start).
git rev-list --reverse --first-parent --merges 94d665881e3e929c41121d057385c28f822002fe..codex/remediation-program | Select-Object -First 1
```

Expected subjects: `docs(audit): establish remediation baseline` and `Merge Batch 1 forensic audit`. Preserve these branch references for later provenance. This subsequent publication record follows the observed push and uses subject `docs(audit): record completion recheck and publication`; resolve its SHA as the first first-parent descendant after `fc17a0788aa973f1626c876be29619c76ab3f98b`. Its own push and final remote-tip verification follow its commit and are reported in the session response.

September 13 recheck: the isolated system/drift checks passed; all 50 backend tests passed in 5.950 seconds; typecheck passed; production build passed in 3.75 seconds after an approved sandbox-access retry; Compose config passed with the documented global-config warnings. All 43 records/18 hypotheses and their links, source paths and required fields passed consistency review. The [testing audit](audit/TESTING_CI_AUDIT.md) preserves the September 10 evidence and separately records this rerun. Dependency scans/probes and SQL/browser/deployment checks were not rerun by the publication check.

Quality gates: all 43 canonical records have the required attributes and matching register classification; all 18 hypothesis verdicts and roadmap assignments are present; local document links/anchors resolve; whitespace, complete diff and secret review pass; changed paths are only the requested Markdown documentation and stable project map. No finding is closed by this documentation merge.

### Remaining risks and next work

The [roadmap](ROADMAP.md) is the detailed batch schedule and owner-decision register. Batch 2 prioritizes stock authority/native admin writes, financial refund accounting, atomic order updates, gallery upload containment and the SQL evidence needed for its fixes. Defect-specific regression tests must accompany Batch 2; the broader testing foundation remains Batch 3. Do not begin Batch 2 in this continuation.

## Batch 0 - Git/bootstrap

### Verified starting state and preservation

- Repository root: `C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal`; origin fetch/push target: `https://github.com/Alpha-lacrim/REZA-Formal.git`.
- Started on `feature/complete-commerce` at `dc225f5f344389afdbe9448537e56589ac861f1a`. There were no tracked or staged changes; this program document was the only untracked file.
- The original program document was carried unchanged onto integration before metadata edits. Its SHA-256 was `434e19a67f5d838453e5fa7e99e79dd9ad469e30411c48606a00368ebbe0a9b3`; an exact backup is retained outside the repository at `..\CODEX_PROGRAM.batch-0.original.md`. The original batch roadmap and rules are preserved; the old proposed baseline tag name was corrected to the authorized name above.
- Local `main` remains at `449c5a142c0f840b55b468d88e6b17f8d7ff329d` (zero local-only commits, six behind verified origin). Local `dev` remains at `f76f232ab658e836f594fb9dc40ff53b1ddececf`.
- Existing `stash@{0}` at `bd371510428d76e6587eaa20913c23bfd12af3c8` is preserved without applying or inspecting its contents. No new stash was created. Ignored local files were not changed.
- No pre-existing tag or integration branch existed locally or remotely. `main` is human-owned and its local/remote history is unchanged by this bootstrap.

### Historical commerce verification

- `git fetch --prune origin` succeeded with network access outside the sandbox. Remote heads were independently confirmed with `git ls-remote --heads --tags origin`.
- Verified original `origin/main`: `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e`; commerce tip: `dc225f5f344389afdbe9448537e56589ac861f1a`.
- `git merge-base --is-ancestor origin/feature/complete-commerce origin/main` returned 0. `git rev-list --left-right --count origin/main...origin/feature/complete-commerce` returned `1 0`; `git log origin/main..origin/feature/complete-commerce` was empty.
- `git diff --quiet origin/feature/complete-commerce origin/main` returned 0; diff statistics were empty. Both trees were `56307d0dec946d6d2c9619036f21ab778812003f`. No unique commits or file changes would be lost by deleting the branch references.
- Baseline parents are local-main starting commit `449c5a142c0f840b55b468d88e6b17f8d7ff329d` and the commerce tip. The merge message names PR #1. [GitHub PR #1](https://github.com/Alpha-lacrim/REZA-Formal/pull/1) independently reports merged into `main` with that same head and merge SHA.

### Bootstrap results

| Item | Result |
| --- | --- |
| Local commerce branch | Deleted safely with `git branch -d feature/complete-commerce` after switching to integration |
| Remote commerce branch | Deleted with `git push origin --delete feature/complete-commerce` after rechecking the exact tip; absence confirmed by remote heads inspection |
| Baseline tag | Pushed; local/remote tag object `f239cf0af592ddb81c8b0b1ad4873082a61a1568` peels to the verified baseline |
| Integration branch | Pushed at bootstrap SHA `b638e63813c972fe096a7830131a233a69606416`; upstream is `origin/codex/remediation-program` |
| Unrelated user work | Local `main`, `dev`, existing stash, and ignored files preserved; no unrelated work included |
| Unresolved Git issues | None at bootstrap verification; local `main` intentionally remains six commits behind origin |

### Completion verification and commit lookup

- Post-push `git status --short --branch`, `git branch -vv`, `git branch -a`, and the last 30 graph/decorated commits confirmed a clean integration worktree, matching upstream, the baseline ancestry, and absence of the local commerce branch and its remote-tracking ref.
- `git ls-remote --heads --tags origin` confirmed integration at the bootstrap SHA above, remote `main` still at the baseline, the exact annotated tag object and peeled commit, and no commerce branch.
- `git cat-file -t` returned `tag`; `git rev-parse pre-codex-remediation-2026-09-10^{commit}` returned the baseline; `git ls-tree codex/remediation-program docs/CODEX_PROGRAM.md` confirmed the program file is committed.
- `git diff --check`, staged whitespace checks, and `git diff --check 99a1ea5d1a5d3444d4063ad6c9ac29303830f14e HEAD` passed. Review of the full bootstrap diff and changed-path list confirmed only `Handoff.md` and `docs/CODEX_PROGRAM.md` changed.
- Local `main`, `dev`, and the existing stash still resolve to their recorded starting SHAs. No unrelated uncommitted work remains in the repository; the original program backup remains outside it.

This final verification record follows the published bootstrap commit. A commit cannot embed its own literal SHA; the final Batch 0 integration SHA is the first descendant of the bootstrap commit on integration, resolved by:

```powershell
git rev-list --reverse --first-parent b638e63813c972fe096a7830131a233a69606416..codex/remediation-program | Select-Object -First 1
```

The expected subject is `docs(codex): record Batch 0 verification`. The successful publication documented above concerns the bootstrap commit; publication and clean/upstream checks for this final record are performed after committing it and reported in the session's final response.

Batch 0 changes are limited to this document and the session entry required by `AGENTS.md` in `Handoff.md`. Application checks are not run because application files do not change. Prior application/deployment follow-ups in `Handoff.md` remain open for the appropriate future batches.

The historical Batch 0 handoff scheduled Batch 1 on `codex/batch-01-forensic-audit`, created from `codex/remediation-program`, for a separate session. That follow-up is fulfilled by the Batch 1 record above.

## Status

- [x] Batch 0 — Git/bootstrap
- [x] Batch 1 — Forensic audit
- [x] Batch 2 — Critical correctness (confirmed defects; SQL/deployment gates remain open)
- [x] Batch 3 - Tests and CI foundation (broader concurrency/hosted gates remain open)
- [x] Batch 4 - Backend/API cleanup (scoped completion; follow-ups documented)
- [x] Batch 5 — API/auth frontend (verified scope; integrated in Batch 8)
- [x] Batch 6 — Frontend state (verified scope; integrated in Batch 8)
- [x] Batch 7 — Admin/media (verified scope; integrated in Batch 8)
- [x] Batch 8 — Performance/database (measured remediation; explicit residuals)
- [x] Batch 9 — Security (verified source scope; SEC-005 and production owner gates remain)
- [x] Batch 10 — Production infrastructure (source/isolated operations scope; owner launch gates remain)
- [x] Batch 11 — scoped UX/accessibility/SEO work verified; assistive/SEO rollout residuals tracked
- [ ] Batch 12 — Final architecture review

## Rules

- One batch per Codex session.
- One dedicated branch per batch.
- No unrelated cleanup.
- Every bug fix requires regression coverage.
- Every architectural change must preserve existing behaviour.
- P0/P1 findings take priority over refactoring.
- Never use production data for automated testing.
- Never expose secrets.
- Review migrations manually.
- Update audit status after every batch.
- Merge only after quality gates pass.
- Create batch branches from `codex/remediation-program`; record start/final/merge commits and verification before moving to the next batch.
- Keep remediation commits off human-owned `main`; merging integration into `main` requires a separate owner-authorized action.

## Current blockers

Batch 8 has no verification/integration blocker. Broader stock-lock schedules, whole saved collection/media payload contracts and production/financial/security obligations remain as qualified in DATABASE_PERFORMANCE and Handoff. The following Batch 6 local-only and older Docker statements preserve historical session context; Batch 8 integrates those branches and executes disposable SQL successfully.

Batch 6 local implementation: `codex/batch-06-frontend-state` starts at `1e336c064b4ebfbf66976f5d844dce9dc526dfba` on the existing Batch 5 branch, preserving its API/auth prerequisite rather than dropping it by rebasing onto older integration. State classification, query choice, scoped persistence and synchronization policies are in [FRONTEND_STATE.md](FRONTEND_STATE.md). ARCH-001/FE-004/FE-007 implementation and FE-006 stale-request guards are verified; price-confirmation policy and independent-device conflict protocol remain separate. Final commit is the Batch 6 branch tip (`git rev-parse codex/batch-06-frontend-state`); no merge or push is part of this session. Handoff records final checks and owner actions.

No confirmed-defect implementation or isolated-check blocker remains for Batch 2. Production readiness remains unproven: DB-002/TEST-003 and live media-serving/legacy reconciliation gates remain open. Docker daemon was unavailable during verification.

## Owner decisions

See [roadmap owner decisions](ROADMAP.md#owner-decisions-and-evidence-still-needed): refund allocation/reference policy, cancellation/returns/bespoke rules, guest/account merge semantics, effective staff capability, production hosting/TLS/SQL/media/recovery, providers, identity/session policy, public URL migration, and external credential/history evidence. None is required to record this audit; do not invent financial history or provider success while awaiting later decisions.

## Completed batches

| Batch | Status | Branch | Start | Bootstrap | Final | Merge | Audit IDs | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 - Git/bootstrap | Complete | `codex/remediation-program` | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` | `b638e63813c972fe096a7830131a233a69606416` | `94d665881e3e929c41121d057385c28f822002fe` | Not applicable | None | Batch 1 audit complete |
| 1 - Forensic audit | Complete and published | `codex/batch-01-forensic-audit` | `94d665881e3e929c41121d057385c28f822002fe` | Not applicable | `dbafbf2a68a01ce27d1769fab274cd9e9e8b4322` | `fc17a0788aa973f1626c876be29619c76ab3f98b` | All 43 recorded; none fixed | Batch 2 pending |
| 2 - Critical correctness | Confirmed defects verified; local merge is final operation | `codex/batch-02-critical-correctness` | `8d867c2017f627c69d533de5d5dfacd9dd70a4f8` | Not applicable | Batch tip via commands above | First merge after fixed start, via commands above | BE-001..BE-006, SEC-001, FE-001/FE-002; TEST-001 partial | Batch 3 pending; DB-002/TEST-003 open |

Record:
- Batch
- Status
- Branch
- Start commit
- End commit
- Merge commit
- Audit IDs handled
- Verification performed
- Remaining risks
- Next batch

## Example

| Batch | Status | Branch | Start | Final | Merge | Findings |
|---|---|---|---|---|---|---|
| 01 | Complete | codex/batch-01-forensic-audit | abc123 | def456 | 789abc | Audit |
| 02 | In progress | codex/batch-02-critical-correctness | ... | — | — | FE-001, SEC-002 |
