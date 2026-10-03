# Frontend API and session contract

Batch 5, 2026-09-30. The UI layout, routes and server authorization policy are unchanged.

## Boundaries and types

- `services/http/client.ts` owns URL construction, cookie credentials, CSRF, refresh,
  cancellation and JSON decoding. `request` returns `unknown`; callers cannot assert
  a generic success type at this boundary.
- `services/auth.ts` validates raw `UserDto` fields and returns domain `User` objects.
  Missing identities/emails/roles and unknown roles fail closed with `invalid_response`.
  Login/register return only `{ user }`; token/envelope fields never reach context.
  Profile writes whitelist name, phone and address. Context no longer normalizes DTOs.
- `services/catalog.ts` checks catalog scalar types and nested variants before
  normalizing decimal strings, aliases, flags and JSON-string galleries. It exposes
  domain `Product`/`ProductVariant` objects. Optional compatibility fields keep defaults.
- `services/api.ts` remains the stable facade and houses the remaining commerce,
  staff and settings adapters. Shared page inputs are unknown and require arrays or
  a recognized collection envelope. Existing numeric staff pagination remains intact.
  Other legacy normalizers still contain `any` and enum assertions: ARCH-003/TEST-002
  remain partial, not a claim of complete runtime validation.
- `services/normalization.ts` contains reused value conversion helpers. Dependencies
  flow from facade/domain modules toward HTTP/helpers; domains do not import the facade.
  New boundary modules have a no-explicit-any lint gate.

Batch 4 published no trustworthy OpenAPI schema. Generating types from inferred,
unannotated views would provide misleading assurance; the [schema adoption gate](API_CONTRACTS.md#openapi-evaluation)
still applies. Future generated DTOs belong behind domain parsers, not in components.

## Refresh and explicit session state

Each eligible request captures the session and refresh versions. Concurrent 401s await
one refresh promise; delayed 401s from the previous access token reuse its completed
refresh. Eligible requests retry once. Login/register/logout/refresh/Google/CSRF endpoints
never recursively refresh, including URLs with query parameters. Unsafe retries rebuild
CSRF headers while preserving JSON or multipart bodies and cookie credentials.

A rejected refresh, network failure during refresh, or second 401 expires the local
session once for that session version. Context clears the cached user, hides staff data,
aborts catalog/account reads and cancels queued cart synchronization. Old requests cannot
commit or retry under the new identity, including a response whose body arrives late.
Login/register/logout operations serialize and wait for pending refresh cookie writes;
new 401s cannot initiate refresh during these mutations. Logout invalidates local state
immediately and then asks the server to revoke its family and clear cookies. Failed logout
rejects and displays an unconfirmed-server-logout message. Offline expiry cannot guarantee
server-side revocation. Same-origin Web Locks serialize cookie mutations across tabs, and
`reza_refresh_epoch_v1` lets waiting tabs reuse a completed refresh. The epoch contains no
credentials or identity. Without Locks/storage, only per-tab coordination is available.

`GlobalContext.authState` distinguishes loading, anonymous, customer and admin.
`user` and `isAuthLoading` are derived compatibility fields. Catalog selection waits for
resolution; login/register use the validated auth response instead of falling back to
an unchecked response after a failed `/me`. Late bootstrap/profile/hydration responses
cannot replace a newer session. Static site settings are explicitly independent of
session identity so anonymous bootstrap does not discard a successful settings read.

## Errors and cancellation

`ApiError` contains `status` (0 for network failures), safe `message`, `fields` mapping
dotted field paths to string arrays, and optional machine `code`. Both DRF field dictionaries
and `{detail, code, errors}` normalize here. Proxy HTML, internal 5xx details and raw
response objects are not exposed to components. Known machine codes survive 5xx masking.
UI catches accept unknown and use the shared error helper or typed status/code checks.

AbortSignal is used for superseded catalog/account reads and product detail/reviews.
Cancelling a refresh waiter rejects that request without cancelling the shared refresh
or other waiters. Mutations are not indiscriminately aborted or retried after network
errors; abort is not proof that an already-sent server mutation was rolled back.

## Coverage and remaining work

Tests cover concurrent/delayed 401s, success/failure/network paths, one retry, endpoint
exclusions, multipart/CSRF renewal, abort isolation, logout during refresh, body-stream
identity changes, malformed DTOs/errors, bootstrap roles and stale account/product reads.
The existing real-Django Chrome smoke suite covers customer checkout and staff editing.

Batches 6-9 subsequently addressed commerce ordering/guest isolation, request races,
pagination, effective staff capability mapping and cross-tab cookie-session lifecycle.
Backend access requires an active family; 15-minute access and rotating refresh use a
fixed seven-day expiry. See [security policies and rollout](SECURITY_HARDENING.md).
Remaining work includes other domain DTO typing, independent-device commerce conflicts,
actual TLS/proxy configuration and unsupported provider activation.
