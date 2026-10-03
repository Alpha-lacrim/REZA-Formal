# Final architecture review and remediation closeout

Reviewed 2026-10-04 (Asia/Tehran) on `codex/batch-12-final-review`.
Verdict: **partially complete remediation; suitable as a human-review candidate,
blocked for production release**. No P0 was established. Functional, database,
browser and disposable operations checks pass; the image release gate correctly
fails on 44 unfixed backend HIGH package findings. No risk exception was added.

## Scope and evidence

This review re-mapped the tracked implementation against the 43 original findings
in [AUDIT_INDEX](AUDIT_INDEX.md), inspected imports/routes/writers and compatibility
call sites, and reran the available safe suites. It is an independent-style review
of the accumulated work, not a claim of a separate external audit or production
certification. Original observations and probe history remain intact.

The clean starting application was Batch 11 `31e72ea`; integration still ended at
Batch 8 `db565f6`. Batch 10's later `82a9459` security follow-up was merged without
rewriting either branch at `be915be`. That candidate contains Batches 9, 10 and 11,
including Debian 13, the stricter image gate and the UX work. Only documentation
changes follow this tested application tree. Batch 12 adds no runtime abstraction,
dependency, schema migration, persistence deletion or production change.

Final review commit `0a99f80` merged into `codex/remediation-program` at `ecb7867`;
the merge tree equals the reviewed branch and includes all Batch 9–12 ancestors.
Normal atomic push published Batch 12 and the integration candidate. A subsequent
documentation-only publication record on integration records those exact SHAs.
Local and remote main, dev and stash retain their starting refs. Human review/PR
into main remains an owner action; this publication does not clear the release gate.

## Current architecture

| Area | Current owner and flow | Change from the original audit |
| --- | --- | --- |
| Frontend features | React 19/TypeScript/Vite; `App.tsx` lazy-loads public catalog/detail/cart/wishlist, account, bespoke/content and staff routes. HashRouter preserves current deep links. Shared dialogs/form fields provide RTL keyboard/focus/validation behavior. | Unknown-route recovery, metadata reset, responsive/accessible customer/staff flows and browser evidence replace incomplete fallbacks. Hash SEO remains constrained by ADR 0001. |
| State | `state/AppState.tsx` provides one stable runtime and focused subscriptions. `auth.ts`, `commerce.ts`, `ui.ts` own session, intent queues and presentation; `runtime.ts` composes actions. Query owns catalog/settings/admin reads; forms/detail/reviews/customer screens retain local lifetimes. | Broad GlobalContext ownership replaced by explicit owners, identity-scoped reads, serialized commerce writes and validated v3 storage. Aggregate context remains test compatibility. |
| API | `services/http/client.ts` owns cookies, CSRF, refresh, session generations and normalized `ApiError`; `auth.ts`/`catalog.ts` validate unknown DTOs. `services/api.ts` remains the domain facade and home of remaining commerce/content normalization. | UI/context duplicate normalization removed; transport is shared. Other DTOs still use permissive aliases/casts. No published OpenAPI/generated client exists. |
| Authentication | Backend `sessions.py`/AuthSession authorizes cookie and bearer access, rotates refresh atomically and revokes logout/password-changed sessions. Access 15 minutes; absolute family expiry seven days. Frontend explicit loading/anonymous/customer/admin state, single-flight refresh, Web Locks and non-secret epochs coordinate cookie changes. | Copied refresh replay/logout revocation and staff-role mismatch addressed. Google/OTP return 501; legacy MFA markers fail closed. |
| Backend HTTP | One Django `shop` app. `urls.py` routes auth/catalog/content to `views.py`, commerce to `commerce_views.py`; explicit serializers, `pagination.py` and `selectors.py` share contracts/read graphs. | Dead legacy order handlers/serializers removed. Product/subscription/site services extracted within the existing modular monolith. |
| Commerce | `commerce_services.py` and `refunds.py` own server quotes, transactional idempotent checkout, stock movements, immutable purchase snapshots and order/payment/return/refund transitions. COD/manual bookkeeping is supported. | Stock-version guards, payment projection, atomic admin updates and recorded net item refunds replace the reproduced integrity defects. Online payment remains unavailable. |
| Database | SQL Server via mssql-django/pyodbc normally; SQLite only for isolated tests/browser fixtures. Applied migrations stay immutable. 0008 removes redundant SKU index; 0009/0010 add session and shared throttle state. | Real SQL integration/index/migration/security schedules now exist; production data reconciliation and broader mixed lock schedules remain open. |
| Inventory | `ProductVariant.stock` is SKU authority; `Product.stock` projects active variants. Product writes require inventory version; checkout/cancel/received returns write stock and ledger transactionally. `audit_inventory` reports mismatches without repair. | Authority is documented/tested. No-variant bootstrap and deleted-variant legacy restoration remain qualified compatibility cases. See [DATABASE_PERFORMANCE](../DATABASE_PERFORMANCE.md). |
| Media | Django storage owns binary files in local/media volume; product primary plus JSON gallery stores references. Product/site services stage validated decoded/re-encoded still images and clean newly staged files on failure. Browser object URLs are previews; Nginx reads media only. | Inline previews no longer become new gallery persistence; safe historical inline images convert on edit. Historical references are retained; no ProductImage model/object-store migration introduced. |
| Administration | React shell composes `features/admin/*`; server pages/filtering and selected-section reads bound work. Native product/variant/site/order/payment/return forms are inspection-only; user mutations require superuser. | Broad AdminPanel decomposed and native invariant bypass contained. Ordinary model-admin surfaces still require an authorized operator and broader invariant review. |
| Tests | Node regressions + Vitest/RTL/MSW, real-Django Playwright/axe, isolated Django suite, standalone disposable SQL Server, proxy/runtime/restore/image-policy fixtures. | Reproducible characterization and critical regression evidence replace absent frontend/lint/SQL lanes. |
| CI | Read-only, pinned-action workflows: normal PR/program pushes and weekly/manual fast/container gates; security dependency/proxy lanes; manually dispatched SQL/browser lanes. No deployment/registry publishing job. | Remediation branch filters and locks/build/restore/scan gates added. Hosted results and branch protection remain unverified locally. |
| Operations | Digest-pinned non-root Gunicorn/Nginx, hash-locked Python/npm inputs, bounded health/shutdown/logs and request IDs. Production Compose is a disabled-bootstrap, private-edge review template; controlled migrations, ownership, backup and rollback runbooks live in OPERATIONS. | Development startup is separated from owner-controlled production provisioning; disposable TLS/SQL/media recovery has execution evidence. Production capacity/ingress/recovery objectives remain unproven. |

## Architecture consistency conclusions

- Source import inspection finds services depending on types/data and their own
  boundary helpers, state depending on services/types, and pages/features/components
  depending on state/services/shared UI. No service imports UI/state, and no state
  module imports a page/feature. The provider and explicit runtime composition are
  sensible; neither a new provider tower nor a state-library replacement is justified.
- Active order creation/cancellation/payment/return transitions invoke the commerce
  services. Staff and public-detail product creation/updates share `save_product`; site
  image mutations use `save_site_settings`. Native service-owned forms deny writes.
  HTTP-local address/cart/return-creation transactions remain visible, validated and
  scoped; moving them just for uniformity is unnecessary. Both staff-authorized
  catalog DELETE paths still call the ORM directly: model SET_NULL relations retain
  purchase snapshots, and media files remain retained. Deletion/restoration and mixed
  mutation schedules remain DB-001/DB-002 considerations, not an unqualified claim
  that every HTTP write lives in a service. Direct ORM/operator writes can still
  bypass cooperative cross-record rules (DB-001).
- Commerce remains the money/stock/lifecycle authority. Browser totals, saved intent,
  quote IDs and capabilities cannot authorize checkout. **BE-009 remains:** serializer
  `allowed_transitions` describes staff topology; UserPanel offers cancellation for
  processing/paid orders that the customer service rejects. This is a misleading
  action, not an authorization bypass; do not widen customer permissions to close it.
- Authentication has one server session family and one shared browser transport
  lifecycle. Web Lock support and working browser storage affect cross-tab coordination;
  per-runtime isolation still works, and backend refresh remains single-use. Failed
  logout reports an unconfirmed server result after clearing local state.
- Normalization has an obvious API-boundary home. Auth/catalog are checked; remaining
  commerce DTOs and endpoint error envelopes are incremental contract debt, not a
  reason to add UI normalization or a second HTTP client.
- Inventory and media each have documented authority. The product stock projection,
  local fallback catalog and historical inline galleries are compatibility concerns,
  not independent production databases or competing media stores.

## Remaining original findings

Counts include every open/partial original record, including FE-006's implemented
race guards with an unresolved price-confirmation policy. Fixed/implemented/addressed
source scope and disabled SEC-004 count as contained; their deployment/owner obligations
are separately retained below. This prevents both erasing risks and counting the same
deployment gap under every repaired defect. Scanner severity is not audit priority.

| Priority | Original | Remaining open/partial | Addressed/contained at recorded scope |
| --- | ---: | ---: | ---: |
| P0 | 0 | **0** | 0 |
| P1 | 8 | **2** | 6 |
| P2 | 33 | **13** | 20 |
| P3 | 2 | **0** | 2 |
| Total | 43 | **15** | 28 |

| IDs / priority | Residual and closure evidence needed | Responsible role to assign |
| --- | --- | --- |
| DB-002, TEST-003 / P1 | Mixed checkout/product-edit/cancel/return/refund lock order and coupon final-use schedules are not covered exhaustively. Define lock discipline and run separate-connection SQL tests; covered last-unit/idempotency/replay schedules already pass. | Backend/database maintainer |
| BE-009 / P2 | Actor/payment-aware action DTO must agree with pending-only customer cancellation. Characterize buyer/staff status/payment cases first. | Backend/frontend maintainer, business policy owner |
| ARCH-003, TEST-002 / P2 | Remaining permissive commerce/content DTOs, enum casts, non-strict TS and suppressed general any/unused checks. Tighten one wire contract at a time; publish schema only after verified auth/CSRF/aliases/media/error annotations. | API/frontend maintainer |
| FE-006 / P2 | Stale detail/quote/session responses are guarded; explicit confirmation for checkout price changes remains a policy decision. | Product/business owner, frontend maintainer |
| DB-001 / P2 | Wider default-address/settings/financial relationships rely on cooperative writers; legacy/deleted-variant inventory and missing ledger history require verified reconciliation. | Database/commerce maintainer, operations owner |
| DB-003 / P2 | Legacy orders with no Payment remain readable and reject refunds; verified financial import/reconciliation and capability policy are absent. Never fabricate a paid record from an order total. | Finance/business owner, backend maintainer |
| SEC-005 / P2 | Five exact dev-only npm advisory entries have a temporary gate expiring 2026-11-02 00:00 UTC. Runtime npm/Python scans are clear; runtime image findings are additionally tracked by OPS-002. | Dependency/security maintainer |
| PERF-002 / P2 | Wishlist/address/saved-cart whole snapshots and historical inline media can remain large. Coordinate a bounded synchronization contract if measured usage requires it. | API/frontend maintainer |
| OPS-002 / P2 | 44 backend HIGH package findings across eight IDs block release. Production SQL certificate/login/license, immutable artifact promotion, capacity and existing-volume permissions require owner evidence. | Security/release and infrastructure owners |
| OPS-003 / P2 | Actual TLS ingress, trusted client-IP chain, redirect/HSTS/cookies and per-location headers require deployed verification. Disposable checks do not establish the real topology. | Infrastructure/security owner |
| OPS-004 / P2 | Real off-host backup schedule/retention/RPO/RTO, monitoring/alerts, finance recovery and selected provider/outbox delivery remain unprovisioned. | Operations/business/provider owners |
| UX-001 / P2 | Keyboard/axe/RTL evidence exists; NVDA/VoiceOver/inclusive user review and wider real-device/browser/zoom coverage remain. | UX/accessibility owner |
| UX-002 / P2 | Public origin/rendering/legacy-link decisions precede crawlable paths, server product/status/social metadata, canonicals and XML sitemap. | Product/hosting/SEO owners |

Roles above are recommendations; this review does not invent named owners or deadlines
accepted by them. Canonical records remain in the audit documents/index.

## Retained tradeoffs, accepted scope and unaccepted risks

Engineering decisions intentionally retained: the existing Django modular monolith,
one frontend runtime, incremental checked DTOs, current max-quantity/union guest
transfer, supported COD/manual bookkeeping, primary-plus-JSON gallery storage, and
HashRouter pending [ADR 0001](../adr/0001-storefront-routing.md) acceptance criteria.
The exact temporary build-only advisory exception is documented in
[SECURITY_HARDENING](../SECURITY_HARDENING.md); it is neither indefinite nor a runtime
release waiver. Independent tabs/devices retain last-write commerce semantics.

**No blanket production risk acceptance is granted.** Backend image HIGHs have no
approved VEX/exception and remain a release blocker. Historical exposed credential
revocation/history cleanup, legacy refund/payment/stock reconciliation, historical
upload inspection, actual ingress/storage/backup/security rollout and hosted CI
require owner evidence. A clean current tree or disposable restore cannot close them.

Owner decisions still required: cancellation/return/bespoke/refused-delivery policies,
price-change confirmation and pricing/tax units; canonical domain/rendering topology;
production SQL edition/grants/certificates/isolation/capacity; storage/backup/monitoring
ownership and recovery objectives; payment/email/SMS/carrier/accounting providers;
Google/MFA enrollment/linking/recovery if ever enabled. Existing offline/refund rules
remain authoritative until a separately approved change.

## Second-order debt and deletion proof

The review searched tracked imports, URLs, symbol/key names, serializers, manifests,
test consumers and operational commands. Name similarity and absent UI call sites
alone are insufficient proof of safe deletion. **No runtime artifact is deleted in
Batch 12.** The useful small cleanup here is documentation reconciliation.

| Candidate | Evidence and disposition |
| --- | --- |
| `contexts/GlobalContext.tsx` | Live in auth-bootstrap, commerce and state-ownership regression probes. Application uses focused hooks. Retain this small test facade. |
| `features/admin/Dialog.tsx` | Re-exports the shared native dialog; AdminPanel and admin features import it. Retain the compatibility import path; no parallel dialog implementation exists. |
| Two ProductVariantSerializer classes | Catalog serializer feeds public/admin products; commerce serializer feeds cart and product summaries. Different fields/semantics make these live contracts, not duplicate dead DTOs. |
| `api.createOrder` | Repository search finds its definition only; underlying order URL is live via createCheckout and route tests. Candidate for a separate documented compatibility deprecation, not an unreachable backend route. No external-use guarantee is inferred. |
| Older array helpers | Some are bounded compatibility previews; current pages use paginated methods. Retire only after individual caller/probe/deployment-overlap proof; do not silently change their completeness assumptions. |
| Legacy local keys | v1/v2 cart/wishlist keys and `reza_session_v1` are read by migration/quarantine. Retired fake backend keys are actively purged by the live fallback constructor; removing this list would stop credential-data cleanup for old clients. v3 commerce and session/refresh epochs are live. |
| `services/db.ts` | Imported by `state/remote.ts`; retains an explicitly labeled read-only emergency catalog with checkout disabled. Its persisted fallback can be stale; it is not server authority. |
| Unrouted order handlers/UserSerializer | Already removed in Batch 4. Route tests resolve only commerce order handlers. Historical dead-code inventory is now clearly labeled as baseline evidence. |
| Google/OTP routes, MFA fields, quote ID and legacy address/item aliases | Unsupported identity endpoints intentionally return 501; stored MFA marker fails closed. Quote ID is advisory (checkout reprices), aliases/default variants support live tests/data. No silent contract/data deletion. |
| NotificationOutbox | Checkout/cancellation/returns/bespoke create rows; no delivery worker exists. Retain pending intent and assign retention/delivery ownership; absence of a worker is not dead data. |
| Dependencies/helpers | All five direct frontend runtime dependencies have source consumers. Build/test dependencies have runner/config/peer roles; Python lock includes framework/ODBC/runtime/transitive support. No unused package is proven. Shared errors/normalizers/pagination have callers; small HTTP error mappers and stock projection helpers reflect existing contracts and lock contexts. Unify only with behavioral/SQL proof. |

Stale API pagination/identity descriptions, state cache durations, README tool/check
guidance and program metadata are reconciled. The old roadmap is archived under
audit with its links rebased; ROADMAP now owns remaining future work. Audit probe
history, applied migrations, earlier decisions and chronological Handoff remain.

## Verification and CI coverage

Executed locally against `be915be`'s application/configuration tree on 2026-10-04.
Local Node/npm are 22.21.0/10.9.4; the image builder uses the pinned
22.23.3/10.9.9 baseline. Backend local Python is the existing 3.12 environment;
Docker's Python 3.11.17 runtime also passes the full runtime drill. Tests use
synthetic SQLite or isolated SQL Server Developer, never application databases.

| Gate | Actual result |
| --- | --- |
| Frontend lint/typecheck | Pass, zero lint warnings |
| `npm test` | 9 Node + 71 Vitest = **80 passing cases** |
| Production build | Pass locally and in the locked frontend image; 1,811 modules, lazy route chunks |
| Chrome Playwright smoke/accessibility | **16/16 pass**, 2.9 minutes; actual Django COD/admin writes plus explicitly synthetic gallery/return read stress cases; axe, keyboard, metadata, 320/390/768/1280px and light/dark checks |
| Django isolated check/migration drift | Pass; no changes detected |
| SQLite full suite | **166 discovered, 154 pass, 12 deliberate SQL-only skips**, 48.533 seconds |
| Disposable SQL check/migration drift/full suite | Pass, **166/166, zero skips**, 157.427 seconds; migration/index round trips and independent-connection commerce/session/throttle tests |
| Compose/build inputs/production template | Base and standalone SQL quiet validation, synthetic production override and 16-package hash/image/npm/tracked-filename checks pass |
| Both runtime image builds | Pass with pinned bases and `--pull`; dependency/security layers may use cache, not claimed a no-cache rebuild |
| Nginx proxy | Pass: status/header/media/XFF/request ID/cache/source-map/JSON/non-root assertions |
| Production runtime/recovery fixture | Pass: non-root/read-only/privilege bits, legacy ownership archive/symlink rejection, HTTPS and SQL trusted CA plus negative hostname/CA, denied runtime DDL, static/media/logs, graceful restart/DNS, SQL checksum restore to NEW DB, media restore to NEW volume, dependency failure health |
| Dependency audits | npm production: zero; full npm policy: zero unaccepted, five expiring build-only entries. Resolved Python hash-lock pip-audit: no known vulnerabilities |
| Image policy tests | **3/3 pass**, including unfixed HIGH/CRITICAL denial |
| Fresh full image scan | **Completed, release gate fails (exit 1)**: backend 44 HIGH/0 CRITICAL across eight IDs, 60 MEDIUM/81 LOW/2 UNKNOWN; frontend zero findings |
| Workflow syntax | Existing checksum-verified actionlint 1.7.12 passes all workflows locally |
| Repository hygiene | Final diff/links/whitespace/status and preserved-ref checks recorded at closeout |

Scan provenance: Trivy 0.75.0, official Docker Hub DB, updated
`2026-10-03T19:02:38Z`. Full ignored JSON reports and summary are in
`.ops-reports/2026-10-03T21-51-51-410Z-e001aa1a/` (UTC artifact timestamp).
Selected/scanned filesystem/build identities are checked. Backend image
`reza-b12-backend:review` is `sha256:6e791e04aabb758f086a9b76a39e00313d4dfdda237dff7e5f020191a9faeb3d`;
frontend `reza-b12-frontend:review` is
`sha256:e031b42debf59b0773b9d81f79acf7d7fc9f616d2b6d352dc45b8dc24f8c9bee`.
See [RUNTIME_VULNERABILITIES](../RUNTIME_VULNERABILITIES.md) for the vendor matrix;
this run confirms the same residual IDs, not new vendor fix availability.

Configured CI covers installs/checks/unit/build, Compose/workflow validation,
locked images, proxy/recovery, dependencies and the strict image gate. Browser/SQL
are separate manual lanes. Normal authorized branch pushes trigger configured
workflows; no hosted outcome is claimed here. The current image gate is expected
to block a release. There is no measured production load/capacity, universal SQL
race proof, external provider integration or assistive-user certification.

## Production limitations and next 3–6 months

1. **First month:** assign release/security/database/operations/business owners;
   resolve image HIGHs through supported vendor fixes or independently reviewed
   artifact-specific VEX before changing any policy. Retire the temporary build
   exception before 2026-11-02. Obtain hosted CI and branch-protection evidence.
2. **Months 1–2:** characterize/fix BE-009 without widening permissions; prioritize
   DB-002/TEST-003 mixed SQL schedules and a documented lock order. Reconcile
   legacy financial/inventory data from verified records in a backed-up staging
   environment. Select and exercise real ingress, restricted SQL and backup owners.
3. **Months 2–3:** stage coordinated migrations 0008–0010 and forced re-login;
   verify real TLS/IP/headers, existing-volume ownership, immutable artifacts,
   restore objectives, monitoring delivery and measured load. Approve customer
   policies and assistive/device review before public promises.
4. **Months 3–6:** incrementally check commerce/content DTOs and, if useful, publish
   a verified OpenAPI contract. Implement the selected canonical/rendering rollout
   from ADR 0001. Bound saved snapshots only with measured growth. Add selected
   provider/outbox integrations under separate scope with replay/retry/accounting
   tests; never present unimplemented delivery/payment as successful.

The owner must review this candidate through a PR into main. Source integration
is not release approval. Previous policy-blocked external Temp leftovers remain
operator cleanup work in Handoff; new disposable containers/networks/volumes are
removed by their owned fixtures. Existing application volumes/configuration remain.

## Areas that should NOT be refactored further at closeout

- Keep React/Vite, the Django modular monolith, SQL Server and existing package
  managers. No microservices, framework migration, Redis or generic domain framework.
- Keep transactional commerce/refund services and immutable purchase history.
  Do not consolidate serializers, bypass transitions or bulk-update stock for size.
- Keep the focused state runtime, query ownership and explicit intent queues.
  Avoid a second cache, provider tower, global form state or blanket memoization.
- Keep primary-plus-JSON gallery/file persistence and historical references;
  no ProductImage/object-store migration or orphan purge without new requirements
  and reference/backup proof.
- Keep hash links until ADR rollout prerequisites exist; changing Router alone
  does not provide server metadata, social previews or public HTTP status codes.
- Keep compatibility stock/default variants, data aliases, disabled identity
  endpoints, migration/quarantine keys and test facades until deprecation/data
  evidence supports removal. Do not rewrite applied migrations or audit history.
- Keep the fail-closed advisory policy. No essential-package purge, unstable
  core-library substitution, scan ignore or invented owner risk acceptance.
