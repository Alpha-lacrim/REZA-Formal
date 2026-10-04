# REZA Formal Codebase Analysis - 2026-06-28

> Historical snapshot: OTP echo and unsigned Google tokens were contained in the 2026-07-12 audit. Batch 9 (2026-10-03) disables incomplete Google/OTP flows and fails closed for legacy MFA-marked accounts; it does not offer enrollment/recovery. See [current security policies](SECURITY_HARDENING.md) and Handoff.

## Scope

Reviewed the active React/Vite storefront and Django REST backend with an e-commerce correctness lens: product data, cart behavior, checkout/order creation, profile data, admin order handling, settings, and build health.

## Key Findings

- Frontend order screens expected camelCase fields such as `userId`, `createdAt`, `shippingAddress`, and flat cart item data, while Django returned snake_case fields and nested `product` objects. This could make user/admin order views render incomplete data after a real checkout.
- Backend order creation trusted the client-submitted total and created the order before fully validating stock. If an item failed validation, partial state could be left behind.
- Cart quantity controls allowed users to exceed available stock before checkout.
- User profile address existed in the frontend type but was not persisted by the backend, so checkout address reuse was unreliable.
- User order cancellation was a placeholder in the frontend and did not call a backend endpoint.
- Site settings save returned the stale `settings` variable instead of the saved serializer instance when creating settings for the first time.
- The frontend fallback catalog was effectively empty, leaving the storefront blank when the backend/local storage had no products.
- Vite build had a stale `/index.css` link warning.

## Risks recorded in this historical snapshot

- **Resolved 2026-07-12:** the backend no longer returns OTP values; delivery/enrollment now fails closed until a real provider exists.
- **Resolved 2026-07-12:** Google ID tokens are signature- and audience-verified server-side; the frontend flow remains intentionally unimplemented.
- **Resolved 2026-07-12:** generated environments, media, build output, cookie/debug files, and snapshot artifacts were removed from tracking and covered by ignore rules.
