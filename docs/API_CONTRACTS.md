# Backend API contracts and schema decision

Batch 4, 2026-09-30. The project remains a Django modular monolith. Routes in
`backend/shop/urls.py`, request/read serializers and `frontend/services/api.ts`
are the executable contract. No database migration or provider integration is introduced.

## Boundaries

- `commerce_services.py` owns checkout, money limits and order/payment/return transitions.
- `product_services.py` owns the atomic product/variant/ledger/media write orchestration.
  Views parse aliases and multipart files, validate serializers, authorize staff, invoke
  the service and map errors. Both staff and public-detail compatibility mutations use it.
- `subscription_services.py` owns normalized, idempotent subscribe/reactivate transactions.
- `selectors.py` contains only the reused product aggregate/variant and order read graphs.
  Product approved review count/average and variant loading use two queries for 1 or 100 products.
  Simple endpoint queries remain in their views. Existing cart/address/return creation
  transactions are retained for incremental follow-up, not broadly rewritten.

## Deliberate representations

`PublicProductReadSerializer` explicitly exposes catalog fields, variant details,
approved review count/rating and timestamps. `AdminProductReadSerializer` adds the
inventory version. `AdminProductWriteSerializer` limits product model inputs and validated
media; variants and inventory-version input are parsed separately and enforced by the service.
Database additions cannot automatically expand these contracts. Contact/settings/account
fields are also explicit. Commerce order reads and checkout writes remain separate.

Public product arrays retain their shape. Only active products are publicly readable.
Staff catalog includes inactive products and requires authentication plus `user.is_admin()`
(custom admin role or Django staff flag). Both mutation routes retain the same staff guard;
native commerce admin remains inspection-only. Product stock/variant edits still require
the current inventory version. Public reads no longer include this staff write token.

Preserved live compatibility includes public `/products/<id>/` POST/PUT/DELETE,
flat shipping addresses, item `id/qty`, camelCase aliases, default variants and
`User.address`. The public product mutation route has inventory/media compatibility tests;
it is not proven dead and has not been removed. Retiring it requires a separate deprecation.
The unused frontend `createOrder` adapter wrapper is retained; its underlying order URL is live.

## Administrative pagination

`/api/admin/orders/`, `users/`, `messages/` and `products/` now share the existing
commerce pagination envelope:

```json
{"results": [], "count": 0, "page": 1, "page_size": 25,
 "total_pages": 1, "next": null, "previous": null}
```

Default size is 25; size is clamped to 1..100, page to at least 1.
Malformed page/size values reset both to 1/25. Out-of-range pages return an empty
results array. All pages have deterministic primary-key tie breakers; this is offset
pagination, not a frozen snapshot across concurrent inserts/deletes. Links are relative
API URLs and preserve query parameters. Existing commerce collections use the same helper.

The four existing staff adapter methods load successive numeric pages at size 100,
normalize each record and reject the complete load if any page fails or repeats invalid
metadata. Legacy arrays remain readable for deployment overlap. This prevents silent
truncation without redesigning the admin/global catalog UI in this batch. API responses
are bounded, but browser memory and total fetching are still proportional to the
collection; server-driven screen pagination remains PERF-002/FE-005 follow-up.

## Validation and errors

Profile input accepts only bounded strings (first/last name 150, phone 32, address 2000);
`name` remains an alias for first name. Role/email/staff flags are not writable there.
Checkout accepts at most 100 lines, preserves string addresses up to 2000 characters,
and validates structured address types/lengths before writes. Monetary subtotal/total
must fit the existing Decimal(12,2) storage; server pricing remains authoritative.
Coupon/shipping validation checks ranges and merged partial-update state before persistence.
Codes normalize before uniqueness validation. Repeated newsletter subscription returns
200, a new one 201; explicit resubscription reactivates and clears the unsubscribe timestamp.

Quotes use a separate representation that ignores delivery-address input: the storefront
prices the cart before the form is completed. Order creation still validates it.
Legacy orders without payment records remain readable with `payment: null`; pending,
delivered and cancelled fixtures preserve status and ownership checks. Refund attempts
fail with `payment_not_found` and do not create financial history. DB-003 remains open
for a verified reconciliation/import workflow and broader capability policy.

Commerce and profile validation errors use `{detail, code: "validation_error", errors}`.
Existing product field-error responses remain compatible; domain conflicts use
`{detail, code}`. Product database exceptions return a fixed `product_conflict` response,
never a driver exception. Coupon/shipping database conflicts are classified as duplicates
only after a matching code is found; otherwise they return `write_conflict`.
This is incremental consistency, not a claim that every historical endpoint now has
an identical error envelope.

## OpenAPI evaluation

Decision: evaluate and defer runtime adoption in Batch 4. DRF's own OpenAPI generation
is deprecated; its documentation recommends drf-spectacular. That is the preferred
candidate for a future explicit schema milestone, rather than building on the deprecated
generator. [DRF schema guidance](https://www.django-rest-framework.org/api-guide/schemas/).

This API uses function views with multiple methods, custom cookie JWT plus CSRF/header
authentication, hand-built quote/order envelopes, multipart galleries and input aliases.
Automatic inference alone would omit or misdescribe these behaviors. drf-spectacular
supports method annotations and custom authentication extensions, so it fits the existing
DRF project without a framework rewrite.
[Customization documentation](https://drf-spectacular.readthedocs.io/en/latest/customization.html),
[function-view guidance](https://drf-spectacular.readthedocs.io/en/stable/faq.html).

Adoption gate: annotate supported routes/methods, request/response media types, aliases,
page/error envelopes, cookie/header auth and CSRF semantics; distinguish unsupported online
payment (503), OTP delivery (501), and conditional Google auth; validate generation in CI
and compare schema examples with actual response/permission tests before publishing.
No new schema dependency, schema endpoint or generated client is presented as authoritative
by this batch. Frontend DTO strictness remains ARCH-003/TEST-002 follow-up.
