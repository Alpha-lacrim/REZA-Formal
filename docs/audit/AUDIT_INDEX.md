# Batch 1 forensic audit index

Source/probe audit: **2026-09-10**; documentation completion review: **2026-09-13**. Application baseline: `94d665881e3e929c41121d057385c28f822002fe` (Batch 0 integration tip), descended from `pre-codex-remediation-2026-09-10` at `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e`. Branch: `codex/batch-01-forensic-audit`; integration target: `codex/remediation-program`.

This batch establishes documentation and evidence only. **No application defect was fixed, no migration changed, no dependency upgraded, and no production database accessed.** Passing baseline checks are not a production-readiness approval.

## Reading order and ownership

| Document | Purpose |
| --- | --- |
| [Architecture](ARCHITECTURE_AUDIT.md) | System boundaries, contract/state ownership and end-to-end workflow traces |
| [Backend](BACKEND_AUDIT.md) | Validation, state transitions, transactions, inventory and financial correctness |
| [Frontend](FRONTEND_AUDIT.md) | Authentication hydration, API/state/races, media and pagination |
| [Database](DATABASE_AUDIT.md) | Schema, migrations, authority, SQL Server/SQLite differences and locking limits |
| [Security](SECURITY_AUDIT.md) | JWT/CSRF/CORS/permissions/uploads, dependency evidence and historical secrets |
| [Performance](PERFORMANCE_AUDIT.md) | Measured query growth, unbounded data and request/render costs |
| [Testing/CI/operations](TESTING_CI_AUDIT.md) | Exact baseline commands/results, test inventory, reproducible probes and infrastructure gaps |
| [UX/accessibility/SEO](UX_A11Y_SEO_AUDIT.md) | Static markup/RTL/routing/metadata review and limits |
| [Dead code/debt](DEAD_CODE_DEBT.md) | Routed versus retained compatibility implementations and removal preconditions |
| [Roadmap](../ROADMAP.md) | Priority, dependencies, acceptance gates and owner decisions |
| [Program](../CODEX_PROGRAM.md) | Batch/Git tracking |
| [Handoff](../../Handoff.md) | Chronological session record |

File/function line references describe the unchanged application baseline. A finding has exactly one canonical record; other documents reference its stable ID. Later batches must update that record's status/evidence and this register, not renumber or reuse an ID.

## Classification

- **P0:** verified immediate critical compromise/data-loss emergency. None established.
- **P1:** serious integrity/security defect or high-impact risk/verification gap to resolve before relying on affected workflows.
- **P2:** material functional/scalability/tooling issue or scoped design/deployment risk.
- **P3:** lower-priority maintenance debt with no demonstrated current critical effect.

Severity is remediation priority, **not confidence or a vulnerability scanner's severity**. Confidence is High (direct code/probe evidence for stated behavior) or Medium (credible conditional mechanism requiring target-environment verification). Every record remains Open: confirmed defect/validation defect/compatibility gap, maintenance debt, design/configuration/conditional risk, or coverage/tooling/operational gap as labeled. Architectural size/coupling is not classified as a confirmed application defect.

**43 findings: P0 0; P1 8; P2 33; P3 2.** P1 entries include DB-002 (unverified SQL concurrency risk) and TEST-003 (coverage gap); do not report all P1 entries as reproduced bugs. No production incident or successful deployed exploit was demonstrated.

## Supplied hypotheses: verdicts

| # | Hypothesis | Verdict and scope | Canonical finding |
| --- | --- | --- | --- |
| 1 | Auth hydration uses stale user for public/admin product load | Confirmed by closure/control-flow trace; initial effect captures null | FE-001 |
| 2 | Product image admin persists/transmits base64 Data URLs | Confirmed by multipart DB/response probe; primary File also uploads | FE-002 |
| 3 | ProductSerializer aggregates reviews per product | Confirmed: 1 product uses 5 queries, 2 products use 7; two aggregates each | PERF-001 |
| 4 | fields='__all__' makes fragile contracts | Present; maintenance risk, not proof of current sensitive disclosure; active commerce Order is explicit | ARCH-003 |
| 5 | Legacy order code coexists with commerce | Confirmed as unrouted definitions; active order URLs use commerce, not both implementations | ARCH-004 |
| 6 | GlobalContext owns too many domains | Broad ownership confirmed; maintenance debt, no arbitrary size defect | ARCH-001 |
| 7 | AdminPanel combines unrelated features | Confirmed six tabs/seven commerce sections; maintenance debt | ARCH-002 |
| 8 | API service has excessive any/normalization/casts | 48 lexical any occurrences, unchecked request<T>, many alias normalizers; type/contract debt confirmed | ARCH-003, TEST-002 |
| 9 | Concurrent 401s duplicate refresh | Confirmed by actual adapter with mocked transport: two 401s/two refreshes | FE-003 |
| 10 | Frontend automated tests insufficient | Confirmed absent tracked runner/test suite/test script | TEST-001 |
| 11 | Frontend lint missing | Confirmed no lint script/config/CI job | TEST-002 |
| 12 | SQLite does not prove SQL Server transactions | Confirmed test-evidence limitation; no equivalent SQL concurrency lane | TEST-003, DB-002 |
| 13 | Staff endpoints unbounded | Partly confirmed: orders/users/messages/products; new commerce endpoints already paginated | PERF-002, FE-005 |
| 14 | Multiple product mutation surfaces | Confirmed staff API, public detail mutations with admin guard, native admin; no unauthenticated mutation found | BE-002, ARCH-003 |
| 15 | Upload security incomplete | Confirmed gallery bypass and orphan persistence; primary/site ImageFields do validate images | SEC-001 |
| 16 | Product vs variant stock authority unclear | Partly confirmed: intended projection exists, default-variant input and bypass writers violate a single authority | BE-001, BE-002, DB-001 |
| 17 | Runtime config needs hardening | Confirmed development defaults/gaps; actual production configuration is unknown | OPS-002, OPS-003 |
| 18 | Hash routing imposes SEO limitations | Confirmed architecture limitation; actual index/ranking loss not measured | UX-002 |

No hypothesis was accepted merely because it was supplied. Several claims require qualification: old commerce staff lists differ from new pages; legacy order handlers are dead routes; primary image validation exists; stock projection logic exists; SQL concurrency and production exposure remain unverified.

## Finding register

| ID | Priority | Confidence | Status | Finding / canonical record | Batch |
| --- | --- | --- | --- | --- | --- |
| ARCH-001 | P2 | High | Open - maintenance debt | [GlobalContext couples unrelated state domains](ARCHITECTURE_AUDIT.md#arch-001) | 6 |
| ARCH-002 | P2 | High | Open - maintenance debt | [AdminPanel combines unrelated administration features](ARCHITECTURE_AUDIT.md#arch-002) | 7 |
| ARCH-003 | P2 | High | Open - maintenance debt | [API contracts depend on model-wide fields and duplicate adapters](ARCHITECTURE_AUDIT.md#arch-003) | 4 |
| ARCH-004 | P3 | High | Open - maintenance debt | [Unrouted legacy order implementation remains beside commerce](DEAD_CODE_DEBT.md#arch-004) | 4 |
| BE-001 | P1 | High | Fixed - Batch 2; SQL evidence open | [Stale product saves can overwrite sold stock](BACKEND_AUDIT.md#be-001) | 2 |
| BE-002 | P1 | High | Fixed - Batch 2 | [Native Django admin bypasses inventory and lifecycle services](BACKEND_AUDIT.md#be-002) | 2 |
| BE-003 | P1 | High | Fixed - Batch 2 | [Return refunds ignore discounts and overstate item entitlement](BACKEND_AUDIT.md#be-003) | 2 |
| BE-004 | P1 | High | Fixed - Batch 2 | [Manual partial refunds change status without recording money](BACKEND_AUDIT.md#be-004) | 2 |
| BE-005 | P1 | High | Fixed - Batch 2 | [Staff order update commits before validating the full request](BACKEND_AUDIT.md#be-005) | 2 |
| BE-006 | P2 | High | Fixed - Batch 2 | [Cancellation leaves the order payment projection stale](BACKEND_AUDIT.md#be-006) | 2 |
| BE-007 | P2 | High | Open - confirmed defect | [Input validation falls through to database errors](BACKEND_AUDIT.md#be-007) | 4 (prioritize unsafe write cases in 2) |
| BE-008 | P2 | High | Open - confirmed defect | [Newsletter repeat/reactivation path is rejected by serializer uniqueness](BACKEND_AUDIT.md#be-008) | 4 |
| BE-009 | P2 | High | Open - confirmed defect | [Customer cancellation capability describes staff transitions](BACKEND_AUDIT.md#be-009) | 5 |
| FE-001 | P2 | High | Open - confirmed defect | [Authentication hydration loads products with stale user state](FRONTEND_AUDIT.md#fe-001) | 5 |
| FE-002 | P2 | High | Open - confirmed defect | [Product previews persist and transmit inline gallery images](FRONTEND_AUDIT.md#fe-002) | 7 (SEC-001 containment in 2) |
| FE-003 | P2 | High | Open - confirmed defect | [Concurrent 401 responses each refresh the token](FRONTEND_AUDIT.md#fe-003) | 5 |
| FE-004 | P2 | High | Open - confirmed defect | [Cart and wishlist synchronization lacks identity and ordering guards](FRONTEND_AUDIT.md#fe-004) | 6 |
| FE-005 | P2 | High | Open - confirmed defect | [Pagination is discarded by customer and commerce admin screens](FRONTEND_AUDIT.md#fe-005) | 5 (complete staff surfaces in 7) |
| FE-006 | P2 | High | Open - confirmed defect | [Late detail and quote responses can replace newer state](FRONTEND_AUDIT.md#fe-006) | 6 |
| FE-007 | P2 | High | Open - confirmed defect | [Legacy cart migration returns before reading legacy entries](FRONTEND_AUDIT.md#fe-007) | 6 |
| FE-008 | P2 | High | Open - confirmed defect | [Frontend staff access disagrees with backend role rules](FRONTEND_AUDIT.md#fe-008) | 5 |
| DB-001 | P2 | High | Open - design risk | [Several cross-record invariants rely on cooperative application writers](DATABASE_AUDIT.md#db-001) | 8 |
| DB-002 | P1 | Medium | Open - unverified concurrency risk | [Lock acquisition order differs between mutation paths](DATABASE_AUDIT.md#db-002) | 2 (SQL verification in 3) |
| DB-003 | P2 | High | Open - confirmed compatibility gap | [Legacy migration does not establish payment history](DATABASE_AUDIT.md#db-003) | 4 |
| DB-004 | P3 | High | Open - maintenance debt | [SKU has an explicit index alongside a uniqueness index](DATABASE_AUDIT.md#db-004) | 8 |
| SEC-001 | P1 | High | Open - confirmed validation defect | [Gallery upload bypasses image validation and persists before validation](SECURITY_AUDIT.md#sec-001) | 2 (complete media pipeline in 7/9) |
| SEC-002 | P2 | High | Open - confirmed lifecycle gap | [Logout cannot revoke a copied refresh token](SECURITY_AUDIT.md#sec-002) | 9 (coordinate API work in 5) |
| SEC-003 | P2 | High | Open - configuration risk | [Throttle identity and cache are weak across proxies/workers](SECURITY_AUDIT.md#sec-003) | 9 |
| SEC-004 | P2 | Medium | Open - conditional security risk | [Dormant identity features do not share a complete MFA policy](SECURITY_AUDIT.md#sec-004) | 9 |
| SEC-005 | P2 | High | Open - dependency assurance gap | [Known dependency advisories and incomplete repeatable scanning](SECURITY_AUDIT.md#sec-005) | 9 (scanning foundation in 3) |
| PERF-001 | P2 | High | Open - confirmed query growth | [Product review aggregates run twice per product](PERFORMANCE_AUDIT.md#perf-001) | 8 |
| PERF-002 | P2 | High | Open - confirmed scalability gap | [Several endpoints return unbounded collections](PERFORMANCE_AUDIT.md#perf-002) | 8 (contract/UI groundwork in 5/7) |
| PERF-003 | P2 | High | Open - confirmed query growth | [Saved-cart summaries refetch variants for each line](PERFORMANCE_AUDIT.md#perf-003) | 8 |
| TEST-001 | P2 | High | Open - coverage gap | [Frontend behavior has no automated regression suite](TESTING_CI_AUDIT.md#test-001) | 3 |
| TEST-002 | P2 | High | Open - tooling gap | [Linting is absent and TypeScript safety checks are relaxed](TESTING_CI_AUDIT.md#test-002) | 3 (API typing work in 5) |
| TEST-003 | P1 | High | Open - coverage gap | [SQLite tests do not establish SQL Server transactional safety](TESTING_CI_AUDIT.md#test-003) | 3 (required evidence for Batch2 concurrency fixes) |
| OPS-001 | P2 | High | Open - confirmed CI gap | [Remediation branch pushes are outside CI triggers](TESTING_CI_AUDIT.md#ops-001) | 3 |
| OPS-002 | P2 | High | Open - deployment hardening gap | [Runtime containers retain development defaults](TESTING_CI_AUDIT.md#ops-002) | 10 |
| OPS-003 | P2 | High | Open - conditional deployment risk | [TLS forwarding and security header inheritance need an explicit ingress design](TESTING_CI_AUDIT.md#ops-003) | 10 |
| OPS-004 | P2 | High | Open - operational evidence gap | [Recovery and provider-dependent workflows lack launch evidence](TESTING_CI_AUDIT.md#ops-004) | 10 (provider work requires explicit scoped batch) |
| UX-001 | P2 | High | Open - accessibility gap | [Dialogs and controls lack consistent keyboard and naming semantics](UX_A11Y_SEO_AUDIT.md#ux-001) | 11 |
| UX-002 | P2 | High | Open - SEO limitation | [Hash routes and client-only metadata limit storefront discoverability](UX_A11Y_SEO_AUDIT.md#ux-002) | 11 |
| UX-003 | P2 | High | Open - confirmed navigation/metadata gap | [Unknown routes and metadata cleanup have incomplete fallbacks](UX_A11Y_SEO_AUDIT.md#ux-003) | 11 |

## Baseline summary and open evidence

Required isolated Django check/drift/50-test suite, frontend typecheck/production build and Compose config pass. The first build was blocked by sandbox filesystem access and passed after approved retry. Compose warned about unreadable global Docker config. npm advisory query completed with six affected package entries; Python advisory scan was unavailable. Exact commands/results and fixture probes are in [testing](TESTING_CI_AUDIT.md).

No SQL Server concurrency/production schema test, live Docker launch, browser/a11y run, production load test, restore drill, external provider verification or external credential-history remediation was performed. Historical July verification remains historical. Signature scanning found no current tracked-tree token/private-key/credential-URL matches, and audit changes were reviewed without copying ignored configuration values.

The principal correctness work is stock authority/native admin writes, atomic order updates, refund accounting, upload validation and SQL Server evidence. The [roadmap](../ROADMAP.md) sequences that work before general refactoring.
