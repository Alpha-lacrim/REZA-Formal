# Remediation roadmap

Source/probe baseline established 2026-09-10 by Batch 1, with documentation completion review on 2026-09-13, on unchanged application commit `94d665881e3e929c41121d057385c28f822002fe`. Start with [AUDIT_INDEX](audit/AUDIT_INDEX.md), which owns the 43-finding register and all 18 hypothesis verdicts. This roadmap schedules work; it does not authorize starting another batch in this session or claim that any finding is fixed.

## Batch 10 update - 2026-10-03

Verified source/isolated operations scope on required `codex/batch-10-production-ops`
from clean Batch 9 head `5e9e89d`. OPS-002/003/004 are partial with explicit evidence:
locked non-root builds, production override, redacted JSON/request IDs, safe static/media
and shutdown, synthetic configuration, proxy/recreation and real SQL/media recovery.
All 166 SQL cases, SQLite/frontend/Chrome, image builds, proxy/runtime and Compose
gates pass. Image scans could not complete because vulnerability DB downloads failed;
Handoff records the exact network failures. [OPERATIONS](OPERATIONS.md)
owns migration/backup/restore/ownership/health/log/rollback and TLS-ingress instructions.

Production TLS/IP trust, SQL certificate/login/license, measured capacity, legacy-volume
permissions, real backup scheduling/objectives and hosted CI remain owner launch gates.
Providers/outbox, historical credentials/financial reconciliation and the expiring
dev-only advisory retain their previous obligations. No external deployment, actual
cloud/DNS/payment/production DB configuration, merge/push or next batch was performed.

## Batch 9 update - 2026-10-03

Security scope is verified on `codex/batch-09-security` from integration `db565f6`.
SEC-002/SEC-003 and FE-008 are fixed in source and isolated SQL/browser/proxy fixtures;
SEC-004 unfinished identity paths fail closed. SEC-001 now includes all site fields
and tested media serving headers. SEC-005 remains partial under an exact build-only
exception expiring 2026-11-02; runtime dependency scans are clear at this date.
See [security evidence, limits and rollout](SECURITY_HARDENING.md).

Deploy both applications with migrations 0009/0010 and require re-login. Verified
proxy CIDRs/TLS/HSTS, pruning, legacy media review, OS/image scanning and historical
credential rotation remain owner/Batch 10 gates. No production deployment, integration
merge/push, or next batch is claimed for Batch 9.

## Batch 8 update - 2026-10-03

Measured critical paths and implemented cart/return read graphs, batched unlocked quotes, SQL net revenue aggregation, compact paginated public catalog with coordinated search/filters, customer/review page controls and confirmed detail-request suppression. [Evidence, stock ownership/transaction review, index assessment, rollout and residuals](DATABASE_PERFORMANCE.md) owns before/after counts/bytes. DB-004 and PERF-003 addressed; FE-005 page consumers addressed; DB-001/PERF-002 partial for wider invariants and whole saved snapshots/legacy inline media. PERF-001 remains verified from Batch 4.

Disposable SQL Server confirms the redundant SKU key/index seek and migration 0008 forward/reverse. No speculative indexes or stock redesign; checkout lock/write budget unchanged. DB-002 mixed schedules and production/hosted evidence remain open. Deploy the coordinated public page contract and apply 0008 after normal SQL backup/schema review. Current required branch is `codex/batch-08-database-performance` (the older proposed branch row below is historical).

## Batch 7 update - 2026-10-02

Admin/media scope is implemented on `codex/batch-07-admin-media`, based on the completed Batch 6 branch. AdminPanel composes coherent features; product drafts separate metadata/pricing/variants/media; managed uploads, validation and dialog lifecycle are verified. All staff collection screens use server pages. Existing gallery storage is adequate: no ProductImage model or migration. See [media trace, limits, rollout and rollback](ADMIN_MEDIA.md).

ARCH-002 is addressed. FE-002/SEC-001 product safeguards are reinforced; FE-005 remains partial for customer/review pagination, and PERF-002 remains partial for public reads/stats. No arbitrary redesign, external provider, user-management expansion or next batch is included. Final checks/provenance are in Handoff and CODEX_PROGRAM.

## Batch 5 update - 2026-09-30

Implemented the requested transport/session scope on `codex/batch-05-frontend-api-auth`: independent auth/catalog boundaries, checked DTOs, unknown HTTP responses, normalized errors, single-flight refresh and explicit session initialization/expiry. Selective cancellation and identity guards cover catalog/account/product reads. Visual layout is unchanged. See [contract and remaining work](FRONTEND_API_AUTH.md).

FE-003 is addressed. ARCH-003/TEST-002 remain partial for legacy commerce DTOs/repository-wide strict typing. The older broad batch row below does not imply closure of pagination/staff-capability/actor-action work (FE-005/FE-008/BE-009), nor later cart/quote work. No backend schema was published in Batch 4, so transport generation remains deferred. No migration or new runtime dependency.

## Batch 4 update - 2026-09-30

Completed the authorized incremental cleanup on `codex/batch-04-backend-api`: proven-dead order code removed, product/account/content contracts explicit, product/subscription services extracted, request validation tightened, and older admin collections paginated with complete-page adapters. Product review aggregates now have a constant two-query read budget. No migration or Django rewrite.

ARCH-004, BE-007, BE-008 and PERF-001 are addressed. ARCH-003 and PERF-002 remain partial for frontend typing, server-driven screen pagination and other unbounded reads/stats. DB-003 missing-payment history is characterized (readable, owner-scoped, refund denied); verified financial reconciliation remains open. Public product mutation compatibility stays because tests use it. OpenAPI was evaluated and deferred with an adoption gate in [API_CONTRACTS](API_CONTRACTS.md).

Gates: SQL Server 116/116; final SQLite 109 passes/seven SQL-only skips (116 cases); frontend 24 tests, lint/typecheck/build and three Chrome smoke journeys; Django check/drift and both Compose configurations. Initial browser runs exposed reserved port 3100 and quote/address coupling; both corrected and rerun. Final verification and merge provenance are in [CODEX_PROGRAM](CODEX_PROGRAM.md).

## Priority and execution rules

Batch 3 SQL follow-up (2026-09-28): all 99 cases pass on disposable SQL Server 2022 Developer, including six SQL-only cases, after fixing concurrent duplicate-key replay and correcting the media fixture. SQLite passes 93 cases with six intentional skips; Django check/drift pass. This supersedes the initial SQL availability exception below. TEST-003 now has executed baseline evidence but remains partial for wider schedules; DB-002 mixed mutation lock order and hosted CI evidence remain open. Test database/container/network cleanup was verified. See [SQL results](audit/TESTING_CI_AUDIT.md#sql-server-follow-up---2026-09-28).

Batch 2 update (2026-09-14): BE-001..BE-006, SEC-001 and explicitly requested FE-001/FE-002 are addressed with regression coverage. The owner selected proportional net item refunds with shipping excluded and penny reconciliation. All 81 backend tests, 10 frontend tests and relevant baseline checks pass. DB-002/TEST-003 remain open: Docker daemon was unavailable, so this batch does not establish SQL Server concurrency safety or production readiness. No broad Batch 3+ work is included.

Batch 3 update (2026-09-16): the initial testing/CI foundation passes local acceptance: clean lockfile install, lint, typecheck, 18 frontend tests, build, three Chrome smoke journeys spanning all seven flows, Django check/drift, 93 backend tests and both Compose validations. Five SQL-only tests are explicitly skipped locally. Separate disposable SQL and browser workflows are configured; SQL execution remains blocked by absent Docker, and hosted workflows are not yet observed. TEST-001/OPS-001 foundation gaps are addressed; TEST-002 strict DTO typing remains Batch 5. DB-002/TEST-003 require the SQL lane to run successfully before transactional-safety claims or production acceptance. See [testing commands](TESTING.md) and [dated evidence](audit/TESTING_CI_AUDIT.md#batch-3-verification---2026-09-16).

Address P1 integrity/security issues before architectural cleanup. Eight P1 records include five reproduced backend defects, one confirmed upload validation defect, one unverified SQL concurrency risk and one SQL coverage gap. There are no established P0 findings. A passing SQLite suite/build does not close these findings.

Keep one dedicated branch/session per batch, created from `codex/remediation-program`. Do not change human-owned main without separate authorization. Preserve applied migrations and unrelated work. Every fix requires meaningful regression coverage, and every architectural change must preserve characterized behavior. Update canonical finding status, evidence, index, roadmap, program and Handoff after each batch.

Batch 2 must include the defect-specific tests needed to prove its fixes, including a disposable SQL Server lane where transaction claims require it. The broader testing foundation remains Batch 3; that ordering must not postpone evidence needed to accept Batch 2. Do not claim a concurrency issue fixed based on SQLite alone.

## Batch sequence and acceptance gates

| Batch / proposed branch | Scope and finding IDs | Dependencies and completion gate |
| --- | --- | --- |
| 1 / codex/batch-01-forensic-audit | Baseline audit and documentation only; all 43 findings recorded, none remediated | Complete after documentation consistency/secret review, baseline attempts, commit and authorized integration merge |
| 2 / codex/batch-02-critical-correctness | BE-001 stale stock, BE-002 native admin bypass, BE-003 discount refunds, BE-004 amount-less refunds, BE-005 partial order commit; SEC-001 immediate upload containment; BE-006 projection; investigate DB-002 and high-impact BE-007 write validation | Reproduce first; obtain refund-allocation semantics; prove atomicity, rollback, stock/payment/ledger agreement through all mutation surfaces; include required TEST-003 SQL cases. Leave unverified conditions explicitly open |
| 3 / codex/batch-03-testing-ci | TEST-001 frontend suite, TEST-002 lint adoption, TEST-003 SQL integration, OPS-001 branch CI | CI must run on program branches/PRs; use isolated DBs, real separate SQL connections, API/component fixtures and critical browser journeys; publish precise results, not merely test counts. Dependency advisory remediation remains SEC-005 follow-up |
| 4 / codex/batch-04-backend-api | ARCH-003 explicit contract/serializer ownership, ARCH-004 dead order code, BE-007 remaining request validation, BE-008 newsletter, DB-003 legacy commerce handling | Keep API behavior characterized; remove only proven dead paths; validate DTO fields/errors; define legacy payment capabilities without fabricating financial data |
| 5 / codex/batch-05-frontend-api-auth | FE-001 catalog hydration, FE-003 shared refresh, FE-005 pagination contract/customer UI, FE-008 staff capability, BE-009 actor actions; ARCH-003/TEST-002 adapter typing | Mock concurrent/failed auth, account changes, expired sessions, malformed DTOs and >25 records; keep CSRF/cookie policy coherent with SEC-002; completed scope qualified above |
| 6 / codex/batch-06-frontend-state | ARCH-001 state split, FE-004 cart/wishlist identity/order, FE-006 request races, FE-007 legacy local cart | Document guest/account merge and logout policy; no stale response may overwrite a new session; checkout clear and pending cart PUT must converge |
| 7 / codex/batch-07-admin-media | ARCH-002 feature extraction, FE-002 full media pipeline/migration, FE-005 staff pagination completion, SEC-001 all upload paths | Staff forms preserve data on errors, page through records and use validated assets; quarantine/migrate old galleries with rollback; shared accessible dialogs feed Batch 11 |
| 8 / codex/batch-08-performance-database | PERF-001 product aggregates, PERF-002 bounded lists/stats, PERF-003 cart queries; DB-001 enforce/reconcile invariants, DB-004 index review | Query-count/response-byte budgets on representative data; SQL plans before index changes; clients must understand pagination before endpoints are bounded |
| 9 / codex/batch-09-security | SEC-002 session revocation policy, SEC-003 trusted-IP/shared throttles, SEC-004 dormant identity policy, SEC-005 dependency triage; SEC-001 defense/serving review | Threat/applicability review, dependency updates with fresh checks, replay/CSRF/CORS/provider-negative tests and real proxy abuse tests; no claim of rotation/history cleanup without external evidence |
| 10 / codex/batch-10-production-ops | OPS-002 runtime hardening, OPS-003 TLS/headers, OPS-004 recovery/operations; scoped provider work only after owner choices | Source/template and isolated image/runtime/recovery gates verified; actual ingress, certificates/login/license/capacity, legacy ownership and real recovery objectives remain owner launch gates. Provider integrations require separate explicit scope |
| 11 / codex/batch-11-ux-a11y-seo | UX-001 keyboard/semantics, UX-002 crawlable public routes, UX-003 metadata/not-found; state/action UX follow-through | Manual keyboard/screen-reader/mobile RTL plus automated checks, direct-link/status/metadata/social preview tests, owner-approved policies and routing migration |
| 12 / codex/batch-12-final-review | Reassess every open ID and cross-domain invariants; no new ID reuse | Repeat supported baseline and targeted production-engine/browser/security/recovery gates; record accepted residual risks, owners and evidence; main merge remains separately authorized |

## Dependency chains

- Stock safety: BE-001/BE-002 -> DB-002/TEST-003 proof -> DB-001 reconciliation -> DB-004/PERF query/index work.
- Refund integrity: owner allocation/reference policy -> BE-003/BE-004 -> immutable ledger/data reconciliation -> provider/operational proof under OPS-004.
- API/UI: ARCH-003 contract decisions -> FE-001/FE-003/FE-005/FE-008 and BE-009 -> state/admin extraction. Avoid replacing a permissive adapter without preserving real aliases deliberately.
- Media: SEC-001 containment -> FE-002 preview/storage separation -> migration/quarantine/cleanup -> production media serving and backup verification.
- Tests: defect-specific tests accompany Batch 2; Batch 3 generalizes them. Unit/SQLite, SQL concurrency, browser and deployment evidence answer different questions.

## Owner decisions and evidence still needed

| Decision/evidence | Needed before | Safe current assumption |
| --- | --- | --- |
| Discount allocation selected in Batch 2: proportional net items, shipping excluded, reconciled pennies. Tax remains zero in checkout; future tax/shipping refund policy is separate | Future policy/provider changes | Manual refund entries require amount/currency/reason/reference and explicit offline-transfer confirmation; inconsistent historical amounts require reconciliation |
| Customer/staff cancellation, return windows/condition, bespoke rules, failed/refused delivery | Lifecycle/policy changes and public launch | Preserve current explicit rules until approved; document mismatches instead of expanding permissions |
| Guest/account cart merge and logout/shared-device semantics | FE-004/FE-007 | Prevent cross-account writes and stale overwrite; preserve recoverable guest data |
| Effective staff permissions versus custom role | FE-008/BE-002 | Backend remains authoritative; do not mass-elevate users to make UI checks pass |
| Production hosting/domain/TLS ingress, SQL edition/account/isolation, media storage and backup ownership | OPS-002/OPS-003/OPS-004 | Current Compose is development only; do not test against live SQL or dump environment values |
| Payment/email/SMS/carrier/tax/monitoring providers and credentials | Provider integrations | COD/manual bookkeeping only, online unavailable, outbox pending; no simulated delivery/payment success |
| Google/MFA enrollment/linking/recovery and session revocation expectations | SEC-002/SEC-004 | Keep unsupported provider UI/enrollment disabled |
| Previous exposed credential rotation outside fresh dev and repository-history cleanup | Security closure | Prior Handoff says new development secrets superseded old values; external revocation/history purge remains unverified |
| Public URL/canonical domain and redirect strategy | UX-002 | Keep current links usable until a deliberate routing rollout |

## Migration and rollout safeguards

Batch 2 introduces no schema migration or bulk data cleanup. Deploy frontend/backend together for the required inventory-version and explicit refund contracts; rebuild/reload Nginx for the media CSP. Use the staff UI/API for service-owned writes because native commerce admin screens are read-only. Existing safe inline images convert only on edit; files already referenced by historical orders are retained. Audit/quarantine older uploads with backup and verify media headers on the actual serving deployment. Reconcile any legacy refund discrepancies using verified financial records before further refunds.

No migration is introduced by Batch 1. Likely later data work includes gallery string/list/Data-URL normalization, stock projection reconciliation, net item/refund allocations, legacy-payment handling and optional constraints/session records. Back up SQL and media, preflight existing values and stage SQL Server migration execution. Do not repair stock, payment or historical financial truth by guessing. Do not edit 0005/0006 to conceal incompatibilities already deployed.

## Batch 1 completion evidence

Isolated Django check/drift and all 50 tests passed; frontend typecheck/build passed after one build sandbox-access retry; Compose config passed with a global Docker-config access warning. npm audit completed with six affected package entries, and Python advisory tooling was unavailable. Eighteen labeled disposable probes/source experiments are recorded in [TESTING_CI_AUDIT](audit/TESTING_CI_AUDIT.md). No SQL/browser/live-deployment/restore check was claimed. Exact audit/final/merge commit provenance is recorded in [CODEX_PROGRAM](CODEX_PROGRAM.md).
