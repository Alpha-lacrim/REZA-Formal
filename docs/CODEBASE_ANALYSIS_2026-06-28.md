# REZA Formal Codebase Analysis - 2026-06-28

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

## Remaining Risks

- OTP delivery is still development-style: the backend returns the OTP and the UI displays it in a toast. A production store should send OTP via email/SMS and never expose it in the API response.
- Google auth currently decodes the token without signature verification. This should be replaced with a verified provider flow before production use.
- The repo contains unrelated pre-existing dirty files, deleted media/database files, and generated cache/build artifacts. I did not revert or clean those because they predated this pass.
