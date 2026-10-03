# Remaining roadmap

Reviewed 2026-10-04. The remediation program is **partially complete**: 15 original
findings remain open/partial (P0 0, P1 2, P2 13, P3 0). Batch 12 closes the review
and integration work, not production acceptance. [FINAL_REVIEW](audit/FINAL_REVIEW.md)
owns the current architecture, evidence, risks and no-further-refactor boundaries.
[CODEX_PROGRAM](CODEX_PROGRAM.md) owns batch/Git provenance; the
[original batch plan and dated updates](audit/PROGRAM_ROADMAP_HISTORY.md) are retained
as historical audit evidence.

## First month: unblock release and assign owners

| Work | Finding / obligation | Acceptance gate |
| --- | --- | --- |
| Resolve backend runtime HIGHs | OPS-002; 44 package findings across eight IDs | Supported vendor fixes and fresh scan with zero HIGH/CRITICAL, or separately reviewed artifact-specific not-affected policy. Current gate remains fail-closed; see [runtime matrix](RUNTIME_VULNERABILITIES.md). |
| Retire build-only advisory exception | SEC-005 | Compatible dependency change, full frontend/browser checks and unexcepted full audit before 2026-11-02 00:00 UTC. No forced major solely to clear a count. |
| Verify hosted CI and branch protection | TEST/OPS evidence | Observe required fast/security/container and manual SQL/browser checks on the candidate; record image release failures separately. Human PR/review into main, no automatic deployment. |
| Assign operational/business owners | OPS-002/003/004 and historical obligations | Named security/release, database, infrastructure, backup/monitoring and business/finance owners; credential-history and policy obligations explicitly tracked. |

## Months 1–2: close correctness and reconciliation gaps

| Work | Finding | Acceptance gate |
| --- | --- | --- |
| Mixed SQL mutation schedules and lock discipline | DB-002, TEST-003 (P1) | Separate-connection checkout/product-edit/cancel/return/refund and final-use coupon schedules with bounded failures, rollback/ledger assertions and documented lock acquisition order. Existing last-unit/idempotency/session tests remain. |
| Actor-aware order actions | BE-009 | Buyer/staff pending/processing/shipped/payment-state matrix; returned actions agree with actual service authorization. Keep pending-only customer cancellation unless the business explicitly changes policy. |
| Verified legacy financial/inventory reconciliation | DB-001, DB-003 | Backed-up staging data, verified financial/stock records, immutable snapshots and explicit missing-history dispositions. No guessed payments, ledger or stock repair. |
| Checkout price-change decision | FE-006 | Owner-selected confirmation behavior with session/quote/checkout tests; retain current stale-response guards. |

## Months 2–3: prove the selected production environment

| Work | Finding / obligation | Acceptance gate |
| --- | --- | --- |
| SQL/ingress/storage provisioning and measured capacity | OPS-002, OPS-003 | Licensed SQL edition, restricted runtime grants/separate migration login, validated SQL certificate, actual HTTPS/IP trust/HSTS/cookies/per-location headers, prepared existing volumes and measured load. Production Compose remains a template until this evidence exists. |
| Recovery and monitoring | OPS-004 | Off-host encrypted SQL/media backups, retention/RPO/RTO and responsible operators; isolated restore with financial checks, immutable artifact rollback and confirmed alert delivery. |
| Coordinated deployment preparation | Prior fixed finding rollout | Stage migrations 0008–0010 after backup/schema/data preflight, deploy both applications and require re-login. Review historical uploads and exposed credential revocation/history cleanup. No production mutation authorized by this roadmap. |
| Assistive/device and business-policy review | UX-001, launch policy obligations | NVDA/VoiceOver/inclusive user checks, wider browser/device/zoom coverage and approved cancellation/return/bespoke/shipping/tax/privacy/customer promises. |

## Months 3–6: measured contract and product work

| Work | Finding | Acceptance gate |
| --- | --- | --- |
| Incremental DTO/typing and optional schema publication | ARCH-003, TEST-002 | Check commerce/content unknown responses one domain at a time. Verified schema annotations for auth/CSRF/aliases/media/errors precede generated clients. Preserve characterized compatibility. |
| Public routing/rendering/canonical rollout | UX-002 | Select public origin/rendering/hosting and satisfy [ADR 0001](adr/0001-storefront-routing.md): old-link handling, server metadata/status/social responses, canonicals and published-product sitemap on supported hosts. |
| Bound saved collection synchronization when needed | PERF-002 | Measure growth; coordinate server/client pagination or revision protocol with offline/session semantics. No arbitrary snapshot redesign. |
| Selected provider/outbox integration | OPS-004 | Explicit provider choice/scope; trusted payment callbacks and amount/replay checks, notification delivery/retry/retention, carrier/accounting evidence. COD/manual bookkeeping remains the honest current boundary. |

These are recommendations, not assigned owner commitments. Keep framework/database,
transactional services, focused state, current gallery model, historical migrations
and compatibility keys stable as described in FINAL_REVIEW. No new architecture is
required to complete this program.
