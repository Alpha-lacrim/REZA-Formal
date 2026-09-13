# Remediation roadmap

Source/probe baseline established 2026-09-10 by Batch 1, with documentation completion review on 2026-09-13, on unchanged application commit `94d665881e3e929c41121d057385c28f822002fe`. Start with [AUDIT_INDEX](audit/AUDIT_INDEX.md), which owns the 43-finding register and all 18 hypothesis verdicts. This roadmap schedules work; it does not authorize starting another batch in this session or claim that any finding is fixed.

## Priority and execution rules

Address P1 integrity/security issues before architectural cleanup. Eight P1 records include five reproduced backend defects, one confirmed upload validation defect, one unverified SQL concurrency risk and one SQL coverage gap. There are no established P0 findings. A passing SQLite suite/build does not close these findings.

Keep one dedicated branch/session per batch, created from `codex/remediation-program`. Do not change human-owned main without separate authorization. Preserve applied migrations and unrelated work. Every fix requires meaningful regression coverage, and every architectural change must preserve characterized behavior. Update canonical finding status, evidence, index, roadmap, program and Handoff after each batch.

Batch 2 must include the defect-specific tests needed to prove its fixes, including a disposable SQL Server lane where transaction claims require it. The broader testing foundation remains Batch 3; that ordering must not postpone evidence needed to accept Batch 2. Do not claim a concurrency issue fixed based on SQLite alone.

## Batch sequence and acceptance gates

| Batch / proposed branch | Scope and finding IDs | Dependencies and completion gate |
| --- | --- | --- |
| 1 / codex/batch-01-forensic-audit | Baseline audit and documentation only; all 43 findings recorded, none remediated | Complete after documentation consistency/secret review, baseline attempts, commit and authorized integration merge |
| 2 / codex/batch-02-critical-correctness | BE-001 stale stock, BE-002 native admin bypass, BE-003 discount refunds, BE-004 amount-less refunds, BE-005 partial order commit; SEC-001 immediate upload containment; BE-006 projection; investigate DB-002 and high-impact BE-007 write validation | Reproduce first; obtain refund-allocation semantics; prove atomicity, rollback, stock/payment/ledger agreement through all mutation surfaces; include required TEST-003 SQL cases. Leave unverified conditions explicitly open |
| 3 / codex/batch-03-tests-ci | TEST-001 frontend suite, TEST-002 lint/TS adoption, TEST-003 SQL integration, OPS-001 branch CI; SEC-005 automated advisory foundation | CI must run on program branches/PRs; use isolated DBs, real separate SQL connections, API/component fixtures and critical browser journeys; publish precise results, not merely test counts |
| 4 / codex/batch-04-backend-architecture | ARCH-003 explicit contract/serializer ownership, ARCH-004 dead order code, BE-007 remaining request validation, BE-008 newsletter, DB-003 legacy commerce handling | Keep API behavior characterized; remove only proven dead paths; validate DTO fields/errors; define legacy payment capabilities without fabricating financial data |
| 5 / codex/batch-05-api-auth-frontend | FE-001 catalog hydration, FE-003 shared refresh, FE-005 pagination contract/customer UI, FE-008 staff capability, BE-009 actor actions; ARCH-003/TEST-002 adapter typing | Mock concurrent/failed auth, account changes, expired sessions, malformed DTOs and >25 records; keep CSRF/cookie policy coherent with SEC-002 |
| 6 / codex/batch-06-frontend-state | ARCH-001 state split, FE-004 cart/wishlist identity/order, FE-006 request races, FE-007 legacy local cart | Document guest/account merge and logout policy; no stale response may overwrite a new session; checkout clear and pending cart PUT must converge |
| 7 / codex/batch-07-admin-media | ARCH-002 feature extraction, FE-002 full media pipeline/migration, FE-005 staff pagination completion, SEC-001 all upload paths | Staff forms preserve data on errors, page through records and use validated assets; quarantine/migrate old galleries with rollback; shared accessible dialogs feed Batch 11 |
| 8 / codex/batch-08-performance-database | PERF-001 product aggregates, PERF-002 bounded lists/stats, PERF-003 cart queries; DB-001 enforce/reconcile invariants, DB-004 index review | Query-count/response-byte budgets on representative data; SQL plans before index changes; clients must understand pagination before endpoints are bounded |
| 9 / codex/batch-09-security | SEC-002 session revocation policy, SEC-003 trusted-IP/shared throttles, SEC-004 dormant identity policy, SEC-005 dependency triage; SEC-001 defense/serving review | Threat/applicability review, dependency updates with fresh checks, replay/CSRF/CORS/provider-negative tests and real proxy abuse tests; no claim of rotation/history cleanup without external evidence |
| 10 / codex/batch-10-production-infrastructure | OPS-002 runtime hardening, OPS-003 TLS/headers, OPS-004 recovery/operations; scoped provider work only after owner choices | Production config/image build and smoke; least-privilege users, durable media, controlled migration job, isolated DB/media restore and monitoring; provider integrations need separate explicit scope if too large |
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
| Discount allocation, rounding, refundable shipping/tax, manual refund amount/reference and confirmation | BE-003/BE-004 final design | Never record more money than verified remaining entitlement; do not infer a transfer from status alone |
| Customer/staff cancellation, return windows/condition, bespoke rules, failed/refused delivery | Lifecycle/policy changes and public launch | Preserve current explicit rules until approved; document mismatches instead of expanding permissions |
| Guest/account cart merge and logout/shared-device semantics | FE-004/FE-007 | Prevent cross-account writes and stale overwrite; preserve recoverable guest data |
| Effective staff permissions versus custom role | FE-008/BE-002 | Backend remains authoritative; do not mass-elevate users to make UI checks pass |
| Production hosting/domain/TLS ingress, SQL edition/account/isolation, media storage and backup ownership | OPS-002/OPS-003/OPS-004 | Current Compose is development only; do not test against live SQL or dump environment values |
| Payment/email/SMS/carrier/tax/monitoring providers and credentials | Provider integrations | COD/manual bookkeeping only, online unavailable, outbox pending; no simulated delivery/payment success |
| Google/MFA enrollment/linking/recovery and session revocation expectations | SEC-002/SEC-004 | Keep unsupported provider UI/enrollment disabled |
| Previous exposed credential rotation outside fresh dev and repository-history cleanup | Security closure | Prior Handoff says new development secrets superseded old values; external revocation/history purge remains unverified |
| Public URL/canonical domain and redirect strategy | UX-002 | Keep current links usable until a deliberate routing rollout |

## Migration and rollout safeguards

No migration is introduced by Batch 1. Likely later data work includes gallery string/list/Data-URL normalization, stock projection reconciliation, net item/refund allocations, legacy-payment handling and optional constraints/session records. Back up SQL and media, preflight existing values and stage SQL Server migration execution. Do not repair stock, payment or historical financial truth by guessing. Do not edit 0005/0006 to conceal incompatibilities already deployed.

## Batch 1 completion evidence

Isolated Django check/drift and all 50 tests passed; frontend typecheck/build passed after one build sandbox-access retry; Compose config passed with a global Docker-config access warning. npm audit completed with six affected package entries, and Python advisory tooling was unavailable. Eighteen labeled disposable probes/source experiments are recorded in [TESTING_CI_AUDIT](audit/TESTING_CI_AUDIT.md). No SQL/browser/live-deployment/restore check was claimed. Exact audit/final/merge commit provenance is recorded in [CODEX_PROGRAM](CODEX_PROGRAM.md).
