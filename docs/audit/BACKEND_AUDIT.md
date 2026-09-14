# Backend audit

See [architecture workflow traces](ARCHITECTURE_AUDIT.md), [database](DATABASE_AUDIT.md), [security](SECURITY_AUDIT.md) and [verification/probes](TESTING_CI_AUDIT.md). This is a documentation-only baseline; no service or application defect was repaired.

## Verified strengths and boundaries

- Active order APIs use explicit commerce serializers and server-side Decimal arithmetic. Duplicate request lines are coalesced; quantities are constrained to 1..100 per variant. Inactive products/variants and mixed currencies are rejected.
- Checkout is atomic across inventory, immutable item/address/shipping/coupon snapshots, payment, redemption, event, outbox and removal of purchased saved-cart lines. The UUID is globally unique and checked against the requesting user; it is optional and has no request-payload fingerprint.
- Customer addresses, carts, wishlists, orders and return requests are scoped to the authenticated user. Staff checks use `User.is_admin()` (role admin OR is_staff). Public product/settings writes explicitly check authenticated administrator status.
- Address/cart writes lock the user row in most mutation paths; address detail loads its instance before locking. Saved-cart DELETE does not take the same user lock as PUT. Neither is a stock reservation.
- Customer cancellation accepts only pending orders. Staff transitions permit pending -> processing/cancelled, processing -> shipped/cancelled, shipped -> delivered. Duplicate/invalid transitions return conflict.
- Payment transitions and return transitions are distinct. Paid/partially refunded payments block cancellation; manual shipment requires paid status when a payment exists; COD collection is recorded at delivery. Return creation checks delivered ownership and cumulative quantity; receiving restocks only on its permitted transition.
- Public reviews require a delivered purchase and begin pending; rating and uniqueness constraints exist. Coupon limits, dates and minimums are checked during quote/create, with coupon locks at creation.
- Expected commerce errors carry `code/detail`; serializer validation often uses `code/errors`. Older views return field dictionaries or plain detail. Database errors and arbitrary JSON/type failures do not share one public error contract.
- `ProductSerializer` review query growth and unbounded lists are recorded under PERF-001/PERF-002. Upload behavior is under SEC-001/FE-002. Generic native admin writes are not protected just because REST endpoints use services.

## Other limits requiring design decisions

Idempotency currently means replaying the first order for a user/key, even if a retry's payload changed. The client key lives only in a CartPage ref; reloading after an ambiguous network result generates a new key. No quote version/expiry or price-change confirmation exists; create recalculates current prices. These are contract/UX risks, not proof that a particular duplicate order occurred.

Return policy timing, bespoke eligibility, refused-delivery transitions, tax treatment and shipping-zone rules are not enforced as complete business policies. Tax is zero and absent active shipping defaults to zero shipping. Owner decisions are recorded in the roadmap; this audit does not invent legal or commercial requirements.

The native admin permits deletion of some financial parents and direct lifecycle edits. Use the service boundary when remediating, and consider preserving historical records without removing the already-protected event/movement records.

<a id="be-001"></a>

## BE-001 - Stale product saves can overwrite sold stock

| Attribute | Audit record |
| --- | --- |
| ID | BE-001 |
| Severity | P1 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P08: load product at stock 10, checkout two units (8), save a name-only serializer from stale instance and call the actual synchronization helper: variant becomes 10. Deterministic interleaving, not a SQL concurrency test. |
| File/function references | backend/shop/views.py:591,923,930,293; backend/shop/serializers.py:82; backend/shop/commerce_services.py:467 |
| Current behaviour | Product instances are read before atomic mutation and ModelSerializer.save writes their loaded fields. Default-variant synchronization then treats stale Product.stock as authoritative. |
| Impact | A descriptive edit can restore units already sold, causing inventory overstatement and potential overselling. |
| Reproduction/proof | P08: load product at stock 10, checkout two units (8), save a name-only serializer from stale instance and call the actual synchronization helper: variant becomes 10. Deterministic interleaving, not a SQL concurrency test. |
| Root cause | Unversioned model-wide save and dual stock write authority; request/admin forms also submit old absolute stock values. |
| Remediation recommendation | Lock/reload product before mutation, restrict updated fields, and give stock adjustments an explicit version/delta contract shared by all writers. |
| Regression testing needed | Checkout interleaved with descriptive edit and inventory adjustment, named/default variants, rollback; real SQL Server two-connection tests. |
| Dependencies | DB-002, BE-002, TEST-003 |
| Migration implications | Possibly add stock version/adjustment schema; reconcile existing product/variant projections and movement history without inventing stock. |
| Recommended remediation batch | 2 |

<a id="be-002"></a>

## BE-002 - Native Django admin bypasses inventory and lifecycle services

| Attribute | Audit record |
| --- | --- |
| ID | BE-002 |
| Severity | P1 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P09: payment and return forms contain writable status. P10: ProductVariantAdmin.save_model sets variant stock 99 while Product.stock stays 10 and creates zero movements. |
| File/function references | backend/shop/admin.py:49,61,87,172,287; backend/reza_backend/urls.py:7 |
| Current behaviour | Variant stock, Payment status/method (including order inline) and ReturnRequest status remain writable through default ModelAdmin saving. No service hooks reconcile them. |
| Impact | Stock projections/ledger, payment/order state and return/restock rules can disagree after authorized staff edits. Native admin is available on Django's /admin/ even though storefront Nginx does not proxy it. |
| Reproduction/proof | P09: payment and return forms contain writable status. P10: ProductVariantAdmin.save_model sets variant stock 99 while Product.stock stays 10 and creates zero movements. |
| Root cause | REST services are not the exclusive mutation boundary; readonly order fields do not cover child models/inlines. |
| Remediation recommendation | Make unmanaged state fields read-only and expose service-backed admin actions/forms; review destructive financial deletes and native permissions. |
| Regression testing needed | Actual native admin POSTs for stock, paid/refunded/received states, inlines, deletions and permission combinations; verify ledger/snapshots. |
| Dependencies | BE-001, BE-003, BE-004, DB-001 |
| Migration implications | No migration for read-only guards; reconciliation may be required for existing divergent records. |
| Recommended remediation batch | 2 |

<a id="be-003"></a>

## BE-003 - Return refunds ignore discounts and overstate item entitlement

| Attribute | Audit record |
| --- | --- |
| ID | BE-003 |
| Severity | P1 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P11: two units at 100 with 50% coupon cost 100 total; return one unit and progress approved/received/refunded: refunded_amount=100 and payment status=refunded. |
| File/function references | backend/shop/commerce_services.py:769; backend/shop/commerce_serializers.py:383; backend/shop/models.py:OrderItem |
| Current behaviour | Refund amount is gross unit price times return quantity; only cumulative metadata total is capped by Payment.amount. Per-refund entries still store the uncapped amount. |
| Impact | One discounted item can exhaust the whole payment; later legitimate returns cannot be refunded. Refund history and financial reports can contradict actual paid entitlement. |
| Reproduction/proof | P11: two units at 100 with 50% coupon cost 100 total; return one unit and progress approved/received/refunded: refunded_amount=100 and payment status=refunded. |
| Root cause | No immutable per-line discount allocation or remaining refundable entitlement. |
| Remediation recommendation | Define owner-approved discount/shipping/tax allocation and rounding; persist net refundable item amounts; reject excess before recording a refund. |
| Regression testing needed | Partial/full discounted returns, multiple lines/quantities, rounding pennies, shipping treatment, repeated/concurrent refunds and total consistency. |
| Dependencies | BE-004, DB-002; owner allocation decision |
| Migration implications | Likely additive allocation/refund records and a careful historical backfill; never infer that money was actually transferred. |
| Recommended remediation batch | 2 |

<a id="be-004"></a>

## BE-004 - Manual partial refunds change status without recording money

| Attribute | Audit record |
| --- | --- |
| ID | BE-004 |
| Severity | P1 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P12: paid -> partially_refunded succeeds while refunded_amount is absent. UI offers this transition through the status dropdown. |
| File/function references | backend/shop/commerce_serializers.py:427; backend/shop/commerce_services.py:671,696; backend/shop/views.py:756; frontend/pages/AdminPanel.tsx:965 |
| Current behaviour | PaymentUpdateSerializer accepts only status. Transition to partially_refunded records no amount/reference; stats subtract metadata.refunded_amount, which remains absent. |
| Impact | An apparently completed partial refund has no auditable amount and revenue remains overstated; future return refunds cannot account for that transfer. |
| Reproduction/proof | P12: paid -> partially_refunded succeeds while refunded_amount is absent. UI offers this transition through the status dropdown. |
| Root cause | Financial movement is modeled as a status-only operation. |
| Remediation recommendation | Require refund amount, currency, reason, reference and confirmation; reuse one cumulative refund service for manual and return flows. |
| Regression testing needed | Paid/partial/full/refused transitions, amount bounds, duplicate reference/idempotency, admin reporting and offline confirmation semantics. |
| Dependencies | BE-003, BE-002; owner manual payment/refund process |
| Migration implications | Add immutable refund ledger if selected; reconcile prior partial statuses using verified financial records. |
| Recommended remediation batch | 2 |

<a id="be-005"></a>

## BE-005 - Staff order update commits before validating the full request

| Attribute | Audit record |
| --- | --- |
| ID | BE-005 |
| Severity | P1 |
| Confidence | High |
| Status | Fixed - Batch 2; isolated regression verified |
| Batch 2 revalidation/fix | 2026-09-14: new API regressions failed before the fix (400 after transition and event failure after restock). Validate details before mutation; update_staff_order owns one transaction including transition, details, events and stock. shop.test_order_atomicity plus shop.test_commerce_routes: 6 tests pass. SQL Server concurrency remains TEST-003. |
| Evidence | P07: pending order PUT with status=processing and 129-character tracking_code returns 400, but persisted status is processing. Cancellation has the same control-flow ordering. |
| File/function references | backend/shop/views.py:788,801,814,828 |
| Current behaviour | transition_order_status completes its own transaction before tracking/admin-note validation and later saves/events. |
| Impact | An HTTP 400 can accompany changed fulfillment or cancelled/restocked stock; retries cannot safely infer whether the action happened. |
| Reproduction/proof | P07: pending order PUT with status=processing and 129-character tracking_code returns 400, but persisted status is processing. Cancellation has the same control-flow ordering. |
| Root cause | Validation and related writes are split around an already-committed service action. |
| Remediation recommendation | Validate all fields before mutation; execute transition, fulfillment details and event as one transaction with one result. |
| Regression testing needed | Invalid tracking/note with every state transition, cancellation stock rollback and failures during detail/event save. |
| Dependencies | DB-002, TEST-003 |
| Migration implications | No schema change expected. |
| Recommended remediation batch | 2 |

<a id="be-006"></a>

## BE-006 - Cancellation leaves the order payment projection stale

| Attribute | Audit record |
| --- | --- |
| ID | BE-006 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 2; cancellation invariant |
| Batch 2 revalidation/fix | The BE-005 cancellation regression also reproduced unpaid Order versus cancelled Payment. The same atomic cancellation now copies the final Payment status into Order; valid cancellation/retry regression proves matching state and no second restock. |
| Evidence | P06: cancelled order has Payment.status=cancelled but Order.payment_status=unpaid (manual begins pending). |
| File/function references | backend/shop/commerce_services.py:540,584,588; backend/shop/commerce_serializers.py:231 |
| Current behaviour | Cancelling initialized/pending payment changes Payment.status but not Order.payment_status. |
| Impact | API exposes conflicting payment states; payment-status indexes, filters and consumers can classify cancelled orders as unpaid/pending. |
| Reproduction/proof | P06: cancelled order has Payment.status=cancelled but Order.payment_status=unpaid (manual begins pending). |
| Root cause | Cancellation bypasses the payment projection update used by transition_payment. |
| Remediation recommendation | Centralize payment/order projection updates within the cancel transaction; retain refunded/failed semantics. |
| Regression testing needed | COD/manual cancellation and paid/refunded edge states; assert both persisted and serialized status. |
| Dependencies | BE-004 |
| Migration implications | Data reconciliation for existing mismatches; schema migration not necessarily required. |
| Recommended remediation batch | 2 |

<a id="be-007"></a>

## BE-007 - Input validation falls through to database errors

| Attribute | Audit record |
| --- | --- |
| ID | BE-007 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P14: 101-percent coupon reports coupon_exists; min-days 5/max-days 1 shipping reports shipping_code_exists. Static profile None assignment and unbounded address strings bypass model full_clean. |
| File/function references | backend/shop/commerce_serializers.py:87,113,313; backend/shop/commerce_views.py:487,534; backend/shop/views.py:486; backend/shop/commerce_services.py:317 |
| Current behaviour | Cross-field coupon/shipping checks are largely deferred to database constraints; IntegrityError is labeled as duplicate code. Profile and inline-address writes bypass bounded typed serializers. |
| Impact | Validly formed but invalid business inputs get misleading 409s, or database/type errors instead of field errors. SQL Server length/decimal limits have weaker coverage than SQLite. |
| Reproduction/proof | P14: 101-percent coupon reports coupon_exists; min-days 5/max-days 1 shipping reports shipping_code_exists. Static profile None assignment and unbounded address strings bypass model full_clean. |
| Root cause | Model constraints are not request validation; broad exception classification hides the actual failure. |
| Remediation recommendation | Validate ranges, dates, days, field lengths/types and merged partial-update state; map only identified uniqueness conflicts; bound list and aggregate totals. |
| Regression testing needed | Invalid/null/oversized profile/address values; coupon/shipping cross-fields, normalized duplicates, monetary total overflow on SQL Server. |
| Dependencies | ARCH-003, TEST-003 |
| Migration implications | No weakening of DB constraints; cleanup only if pre-existing invalid data blocks future constraints. |
| Recommended remediation batch | 4 (prioritize unsafe write cases in 2) |

<a id="be-008"></a>

## BE-008 - Newsletter repeat/reactivation path is rejected by serializer uniqueness

| Attribute | Audit record |
| --- | --- |
| ID | BE-008 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P13: first email POST returns 201; identical second POST returns 400. Serializer validation precedes intended idempotent lookup. |
| File/function references | backend/shop/commerce_serializers.py:418; backend/shop/commerce_views.py:439 |
| Current behaviour | ModelSerializer validates unique email before get_or_create can return or reactivate an existing subscription. |
| Impact | Repeat subscription produces an error and inactive subscription cannot be reactivated through the intended path. |
| Reproduction/proof | P13: first email POST returns 201; identical second POST returns 400. Serializer validation precedes intended idempotent lookup. |
| Root cause | Create-only uniqueness validation is reused for subscribe/upsert semantics. |
| Remediation recommendation | Normalize input, validate email without preempting upsert, and define consent/reactivation semantics. |
| Regression testing needed | Repeat, mixed-case, inactive/reactivated and concurrent subscription requests. |
| Dependencies | ARCH-003; owner subscription policy |
| Migration implications | None expected; retain unique email constraint. |
| Recommended remediation batch | 4 |

<a id="be-009"></a>

## BE-009 - Customer cancellation capability describes staff transitions

| Attribute | Audit record |
| --- | --- |
| ID | BE-009 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | Static trace: processing includes cancelled in ORDER_TRANSITIONS; canCancel returns true; cancel_customer_order raises order_not_cancellable for non-pending. |
| File/function references | backend/shop/commerce_serializers.py:287; backend/shop/commerce_services.py:610; frontend/pages/UserPanel.tsx:canCancel |
| Current behaviour | OrderSerializer exposes the generic ORDER_TRANSITIONS. UserPanel trusts allowedTransitions to show cancellation; customer endpoint accepts only pending. |
| Impact | Customers see a cancellation action for processing orders that always fails; paid pending orders also offer a blocked cancellation. |
| Reproduction/proof | Static trace: processing includes cancelled in ORDER_TRANSITIONS; canCancel returns true; cancel_customer_order raises order_not_cancellable for non-pending. |
| Root cause | State topology is exposed as actor capability without actor/payment checks. |
| Remediation recommendation | Return actor-aware allowed actions shared with enforcement; avoid expanding customer permissions merely to match the UI. |
| Regression testing needed | Pending/processing/shipped/paid orders under buyer/staff; UI actions and endpoint denial must agree. |
| Dependencies | ARCH-003, BE-006 |
| Migration implications | None. |
| Recommended remediation batch | 5 |
