# Frontend state ownership — Batch 6

Decision date: 2026-10-01. Findings: ARCH-001, FE-004, FE-006, FE-007.

Reconciled through Batch 12 on 2026-10-04. The ownership decision remains;
later pagination/cache/staff changes are reflected below. Exact original session
evidence remains in Handoff and [final review](audit/FINAL_REVIEW.md).

## Classification before changing ownership

| Class | Existing examples | Owner after this batch |
| --- | --- | --- |
| Authentication/session | Bootstrap `/auth/me`, login/register/logout, current user, expiry | `state/auth.ts`; cookie lifecycle remains in `services/auth.ts` and `http/client.ts`. No persistent browser user/token snapshot. |
| Remote/server | Products, site settings, admin stats/orders/users/messages/commerce collections; product detail/reviews and customer orders/addresses | TanStack Query for shared catalog/settings and admin collections (`remote.ts`, `admin.ts`). Detail/review and customer screen reads remain local, with existing identity/cancellation controls. |
| Persistent client | Guest/account cart and wishlist intent, outstanding changes, theme; emergency catalog | `commerce.ts` + validated `persistence.ts`, `ui.ts` theme store, and the existing read-only `services/db.ts` fallback. |
| Ephemeral UI | Cart drawer, auth modal, toast timer; forms, tab/search/sort/page selection, upload previews | Independent overlay/toast stores; feature forms and selections stay local to their screens. Checkout form lifetime is keyed by session identity. |
| Derived | Aggregated cart map, wishlist membership, visible items, subtotals/filtering, authenticated user/loading projections | Calculated from canonical snapshots by hooks/screens; no second persistent state copy. Server quote/checkout owns actual money and stock. |

Previously `GlobalContext.tsx` mixed all five classes and seven unrelated domains. It is now an eight-line compatibility hook for regression probes. Application components use `useAuth`, `useCart`, `useWishlist`, `useCatalog`, `useSettings`, `useTheme`, `useOverlays`, `useToast`, and `useActions`.

One `AppStateProvider` supplies a stable runtime, with independent `useSyncExternalStore` subscriptions. Query hooks receive that runtime's QueryClient explicitly. There is no domain-provider nesting. `runtime.ts` composes lifecycles and cross-domain actions; it holds no duplicate catalog/settings/account data. Action-only product cards do not subscribe to cart, toast, theme or auth snapshots. A render-count regression proves unrelated updates do not rerender those consumers; no latency benchmark or blanket memoization claim is made.

## Server-state decision

Adopt `@tanstack/react-query` v5 for shared catalog/settings and admin reads. The previous catalog's owner/request/controller bookkeeping and AdminPanel's repeated data/loading/error setters were duplicating query-cache responsibilities. The library provides enough concrete benefit here to justify two additional packages. Context-only domain hooks would separate ownership but retain that remote bookkeeping; a custom generic cache would add another infrastructure implementation to maintain. Replacing all client state with Query would not solve guest intent, persisted removals or account-write ordering.

The implementation uses shared keyed reads, in-flight deduplication, freshness, cancellation, error/loading state and invalidation. Mutation functions stay explicit API actions: settings commit their returned snapshot after cancelling stale reads; catalog/order mutations invalidate affected queries. Cart/wishlist use their own serialized write queues and persistent intent, because query-cache optimism alone cannot represent their offline merge rules. Form submission state remains local; no automatic write retries were introduced.

- Keys: `['catalog', identity]`, `['settings']`, `['admin', identity, collection]`. Catalog/admin data waits for resolved auth. No previous-identity placeholder data is used.
- Freshness: 30 seconds for catalog/admin; 60 seconds for public settings. Focus refetch is disabled; reconnect/default mount freshness checks remain. Reads and mutations have `retry: false` so failures are visible and writes are never silently repeated.
- Base catalog/settings keys stay in memory for the application session (`gcTime: Infinity`). Paged catalog/facet, nonempty selected-ID and admin keys expire five minutes after becoming inactive. Identity changes cancel/remove every identity-bound query; provider teardown clears the client. Nothing in Query is persisted to browser storage.
- Successful product writes, checkout and cancellation invalidate catalog and admin stats. Admin order/commerce/message actions invalidate admin collections as appropriate. Settings use the authoritative write response. Failed admin reads keep any same-session snapshot with an error/retry affordance; a failed staff catalog never substitutes public/fallback data.
- Public catalog failure retains the explicitly labelled emergency fallback. Checkout requires `catalogSource === 'server'`; the server still revalidates stock and prices.
- Admin features use server pages and load only the selected commerce section. Customer order/return/review page controls and server-filtered public catalog are implemented in later batches without changing these ownership boundaries.

References considered: [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview), [defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation), and [invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation). Defaults above are deliberately set for this application.

## Commerce invariants and transitions

1. During unresolved auth, no account data is shown or synchronized. Anonymous state loads only the guest bucket. Customer and admin buckets use role plus user ID; staff startup does not load customer commerce or consume guest intent.
2. On customer startup/login, guest quantities merge by product/variant using **max**, preserving the existing policy rather than summing. Wishlist merges by union. Guest intent is transferred into that customer's pending record before the guest bucket is emptied. A later account cannot inherit that transferred intent, even if synchronization fails. New guest intent supersedes older pending operations for the same item.
3. Logout/expiry immediately changes the visible owner, cancels reads/debounce work, and invalidates old callbacks. Account records remain recoverable only through that same account's bucket. They are not copied to the guest bucket. Failed server logout still clears local session state.
4. Cart and wishlist hydrate independently. Replacement cart PUT is forbidden until its GET succeeds. A failed GET never becomes an empty successful snapshot. Edits made during hydration overlay the eventual server snapshot.
5. Persisted cart intent includes per-line changes/removals and a clear marker. Wishlist intent includes additions **and removal tombstones**. Successful writes acknowledge only the version sent; new edits remain pending. Each domain has one active write per session. Clear-cart uses that same queue, so an earlier PUT cannot resurrect it through a concurrent DELETE/PUT race.
6. Explicit Retry and browser `online` retry hydration or pending writes. Failures retain local intent and show status; repeated writes are not put in an automatic retry loop. A reload re-reads the server before replaying pending intent, preserving unrelated server lines.
7. The HTTP layer tracks dispatched unsafe account requests. Explicit login/register/logout invalidates the old session immediately, then waits for those writes and refresh-cookie writes before changing cookies. A non-secret browser change marker expires other open app runtimes; every dispatch checks it too, preventing a queued write from outrunning the storage event. Other tabs must reload/sign in to resolve their new session. Queued old work cannot begin under a later account. This cannot undo an operation already accepted by the server.
8. Adds/increases require known finite active stock and valid variants; quantities are finite positive integers. Unknown stock is not treated as infinity. Decreases/removals remain possible while catalog is unavailable. Persisted lines contain only IDs/quantity, never trusted price/stock snapshots. Saved lines are not silently dropped when catalog is stale: server quotes and checkout validate availability.
9. Checkout forms/addresses/quotes/idempotency keys reset when session identity changes. A version guard prevents optional address save from continuing into checkout, or an old checkout response from clearing the next account's cart. Quote requests abort on input changes/unmount; stale successes/failures cannot replace the latest quote, and the prior quote is cleared during debounce.

These queues govern one application runtime. Simultaneous edits from independent tabs/devices retain the backend's existing last-write semantics; no server cart revision/conflict protocol is introduced. Browser storage can be disabled/full: the UI remains usable in memory and reports the failed persistence. There is no guarantee of reload durability when browser writes are rejected.

## Browser persistence inventory and deletion evidence

Audited all active `frontend` sources and repository references using `rg` for `localStorage`, `sessionStorage` and the literal key names; archived outer-workspace copies are not application code. No `sessionStorage` usage or browser-storage security-token writer exists in the active app.

| Key | Reader/writer and treatment |
| --- | --- |
| `reza_commerce_v3:guest` | New validated guest intent envelope; written even when empty, preventing legacy resurrection. |
| `reza_commerce_v3:customer:<id>` | Account snapshot plus unacknowledged cart/wishlist intent. Customer lifecycle selects only its own ID. |
| `reza_commerce_v3:admin:<id>` | Separate staff-local intent; no customer endpoint synchronization or guest adoption. |
| `reza_cart_v2` | Legacy migration reader only. Valid empty arrays are authoritative; absent/malformed v2 can fall back to v1. Kept, not deleted or overwritten. |
| `reza_cart_v1` | Legacy product map migration reader only. Finite positive values become variant-less lines. Kept, not deleted or overwritten. |
| `reza_wishlist_v1` | Legacy migration reader only; string IDs validated/deduplicated. Kept, not deleted or overwritten. |
| `reza_session_v1` | Before this batch, only GlobalContext wrote/deleted the user copy; there was **no auth reader**. Cookie `/me` owns auth. The new migration checks its presence only to quarantine ambiguous legacy commerce rather than importing a former user's data into a guest/new account. The obsolete copy is removed only after writing the guest migration/quarantine bucket successfully. No new session snapshot is stored. |
| `reza_session_epoch_v1` | New non-secret change notification written before explicit cookie-session mutations; storage events and pre-dispatch reads invalidate other app runtimes. Contains no user identity or credential and cannot authorize any request. If storage is blocked, this cross-tab notification is unavailable; in-memory session guards still apply. |
| `reza_refresh_epoch_v1` | Batch 9 non-secret random completion marker for refresh, checked under the same-origin Web Lock. A waiting tab retries with current cookies rather than rotating again. Contains no identity/token; blocked storage falls back to per-tab coordination and concurrent refresh can require sign-in. |
| `reza_theme_pref` | Active `ui.ts` reader/writer. Only `dark` and `light` are accepted. |
| `reza_db_products_v1` | Active read-only fallback cache in `services/db.ts`; retained. Storage exceptions return bundled seed data. |
| `reza_db_users_v1`, `reza_db_orders_v1`, `reza_db_messages_v1`, `reza_db_settings_v1` | Existing retired-key cleanup in `services/db.ts`; repository search found no active readers/writers outside that cleanup. Existing deletion policy is retained (old user data could include plaintext passwords). No additional fallback key is deleted. |

Old unowned cart/wishlist data cannot be reliably attributed retrospectively. When the obsolete session marker is present, it is left intact in legacy keys but quarantined from automatic adoption. This deliberately prevents cross-user import; it does not pretend to reconstruct historical ownership. No migration, production-data change or credential rotation is required by this batch.

## Verification

`tests/state-ownership.test.tsx`, existing Node startup probes, commerce MSW tests and HTTP concurrency tests cover anonymous/customer/admin bootstrap, guest transfer, logout/account isolation, persistence/migration/corruption/storage failure, failed GET/write/retry, removal tombstones, hydration edits, serialized cart clear, stock limits, late response rejection, catalog/settings/admin invalidation, quote cancellation, checkout session changes, StrictMode and subscription boundaries. Existing Chrome smoke journeys exercise real-Django catalog, customer COD checkout/history, and admin product persistence against a disposable SQLite fixture.

See `Handoff.md` and FINAL_REVIEW for exact checks. Batch 9's user DTO reflects the backend's effective staff capability; admin feature decomposition and customer paging are implemented. Price-change confirmation policy, multi-device conflict resolution and prior production/security obligations remain separately documented follow-ups.
