# Frontend audit

The frontend has React 19, TypeScript 5.8 and Vite 6, with locally compiled Tailwind/PostCSS and lazy route chunks. [Baseline typecheck/build](TESTING_CI_AUDIT.md) pass. Those checks do not exercise effects, concurrent requests, accessibility or wire-data validation.

## State, loading and API boundaries

`api.ts` centralizes credentials, URL prefix normalization, CSRF bootstrap/header injection, one retry after 401, JSON error parsing and snake/camel adapters. The CSRF bootstrap promise is shared; refresh requests are not. There is no general timeout/abort, response schema check or auth-session generation token. Forty-eight lexical `any` occurrences exist in its 1,009 lines; this count is a static search measure, not a lint score. `request<T>` casts parsed JSON, normalizers often turn missing/malformed fields into empty IDs, zero amounts or current timestamps. Typescript strict/noImplicitAny/strictNullChecks are not enabled (TEST-002).

GlobalContext stores catalog/settings/account state with presentation concerns. Page-level product, review, order, address and admin arrays duplicate server state. ProductCard and other consumers re-render when any provider value changes; no profiler measurement was collected (ARCH-001).

ProtectedRoute waits for auth hydration. ProductPage and UserPanel have loaders, and checkout has error/loading flags; catalog uses an initially empty array without a distinct loading/error state. Several failures become empty lists, zero stats or a temporary toast. Auth logout reports success after network failure even though HttpOnly server cookies may remain. Local storage access during theme/fallback initialization and persistence can throw when storage is unavailable; this was inspected, not browser-tested.

The read-only catalog fallback prevents checkout when `catalogSource !== 'server'`, which is a useful safety boundary. It is not refreshed from server successes; seed or historical browser entries can be stale. CartPage silently omits unknown products from visible lines while still sending all cartLines to quote; deletion/unavailability needs an explicit repairable line state.

Product/setting upload flows differ: settings retains raw Files and clear flags; product uploads add preview Data URLs to the persistent gallery model. Product form omits images when the last entry is removed, so an empty gallery is not sent; it also cannot reliably clear the primary image or compare-at price. Include these edge cases in FE-002's remediation.

No browser session, visual comparison, assistive technology run or frontend test suite was executed in this batch. Static race proofs and isolated mocked transport probes are identified below.

<a id="fe-001"></a>

## FE-001 - Authentication hydration loads products with stale user state

| Attribute | Audit record |
| --- | --- |
| ID | FE-001 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | Static closure proof: setUser schedules a render; the ongoing empty-dependency effect still uses render-one refreshProducts. Load an admin session with an inactive product and inspect initial /api/products/ request. |
| File/function references | frontend/contexts/GlobalContext.tsx:146,179,188,335,354; frontend/pages/AdminPanel.tsx:109 |
| Current behaviour | Mount effect captures user=null, awaits me/setUser, then invokes the captured refreshProducts. Login/logout do not independently reload catalog by identity/role; admin loadData does not load products. |
| Impact | Admin initial list misses inactive products; a later admin refresh can leave inactive entries in shared storefront state after logout. Server permissions remain enforced. |
| Reproduction/proof | Static closure proof: setUser schedules a render; the ongoing empty-dependency effect still uses render-one refreshProducts. Load an admin session with an inactive product and inspect initial /api/products/ request. |
| Root cause | Catalog query identity is implicit in closure state rather than an explicit role/session dependency. |
| Remediation recommendation | Use the hydrated identity explicitly or a role-keyed catalog effect/cache; keep public and staff catalog representations separate. |
| Regression testing needed | Mock delayed me, admin login/reload/logout and overlapping catalog responses; inactive products visible only in intended context. |
| Dependencies | ARCH-001, TEST-001, FE-008 |
| Migration implications | None. |
| Recommended remediation batch | 5 |

<a id="fe-002"></a>

## FE-002 - Product previews persist and transmit inline gallery images

| Attribute | Audit record |
| --- | --- |
| ID | FE-002 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P03 reproduces multipart form behavior: HTTP 201, stored images type=str containing data:image/, same inline content in response. A harmless sentinel proves persistence; primary PNG passes ImageField. |
| File/function references | frontend/pages/AdminPanel.tsx:160,196,218; frontend/services/api.ts:936; backend/shop/views.py:182; backend/shop/models.py:Product.images |
| Current behaviour | FileReader Data URLs enter editingProduct.images; save JSON-stringifies them while separately uploading the first raw File. Backend JSONField accepts the string without gallery normalization. |
| Impact | Images inflate requests/database/API responses and may be duplicated as files plus base64. Multiple galleries and empty/clear operations have inconsistent semantics. |
| Reproduction/proof | P03 reproduces multipart form behavior: HTTP 201, stored images type=str containing data:image/, same inline content in response. A harmless sentinel proves persistence; primary PNG passes ImageField. |
| Root cause | Preview and persisted asset state share fields; JSON string/list handling and clear semantics are underspecified. |
| Remediation recommendation | Keep preview URLs separate from asset identities; upload each file through validated storage; use a bounded array of canonical URLs/IDs and explicit empty/clear behavior. |
| Regression testing needed | Multi-file upload, edit without upload, clear last/primary image, errors/retry, unsupported URL schemes, byte limits and response payload budget. |
| Dependencies | SEC-001, ARCH-002, ARCH-003 |
| Migration implications | Existing images may be JSON strings, lists or inline data; plan audited extraction/normalization with backups and orphan reconciliation. |
| Recommended remediation batch | 7 (SEC-001 containment in 2) |

<a id="fe-003"></a>

## FE-003 - Concurrent 401 responses each refresh the token

| Attribute | Audit record |
| --- | --- |
| ID | FE-003 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P17 loads the actual transpiled API adapter with mocked fetch: two simultaneous protected 401s cause two refresh calls. |
| File/function references | frontend/services/api.ts:674,704,715 |
| Current behaviour | Each failing protected request independently POSTs refresh and retries once. Only CSRF acquisition is deduplicated. |
| Impact | A burst of expired-token requests multiplies refresh traffic; shared state may see mixed failures/successes. No refresh rotation currently exists, so rotation-token invalidation is not claimed. |
| Reproduction/proof | P17 loads the actual transpiled API adapter with mocked fetch: two simultaneous protected 401s cause two refresh calls. |
| Root cause | No shared in-flight refresh promise or session generation guard. |
| Remediation recommendation | Coalesce refresh, bound retry once, settle all waiters consistently and invalidate old-session work on logout. |
| Regression testing needed | Concurrent 401 success/failure, invalid refresh, CSRF renewal, no loops on auth endpoints and logout during refresh. |
| Dependencies | SEC-002, TEST-001 |
| Migration implications | None unless server revocation design adds tables. |
| Recommended remediation batch | 5 |

<a id="fe-004"></a>

## FE-004 - Cart and wishlist synchronization lacks identity and ordering guards

| Attribute | Audit record |
| --- | --- |
| ID | FE-004 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | Static schedule: delay GET >700ms, observe PUT of pre-hydration local cart; reorder two PUT completions. Logout/login B while A hydration waits; shared keys and callbacks have no user-generation check. Browser reproduction not run. |
| File/function references | frontend/contexts/GlobalContext.tsx:192,232,316,323,354; backend/shop/commerce_views.py:263 |
| Current behaviour | hydratedUserId is marked before GET completes, permitting a 700ms PUT meanwhile. Background writes can overlap; local keys survive logout and are merged into the next account; async work is not cancelled. |
| Impact | Saved cart can be overwritten before hydration or by an older write. Another account on the same browser inherits prior cart/wishlist selections; late work may operate with new cookies. |
| Reproduction/proof | Static schedule: delay GET >700ms, observe PUT of pre-hydration local cart; reorder two PUT completions. Logout/login B while A hydration waits; shared keys and callbacks have no user-generation check. Browser reproduction not run. |
| Root cause | One flag represents both hydration-start and hydration-complete; browser storage and writes are not account scoped/versioned. |
| Remediation recommendation | Separate guest/account state, mark hydration only on completion, serialize or version writes, and ignore stale session responses; define merge/logout policy. |
| Regression testing needed | Deferred GET/PUT ordering, rapid edits, checkout clear vs pending PUT, switch accounts, failed sync/retry, unavailable variants and rapid wishlist toggles. |
| Dependencies | ARCH-001, FE-003, TEST-001; user-row DB locking review |
| Migration implications | Possible cart revision token; localStorage key migration and guest merge policy required. |
| Recommended remediation batch | 6 |

<a id="fe-005"></a>

## FE-005 - Pagination is discarded by customer and commerce admin screens

| Attribute | Audit record |
| --- | --- |
| ID | FE-005 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P15: 35 orders produce count=35, returned=25, total_pages=2, next=null. Client calls accept no page in myOrders/getReturns; admin load supplies none. |
| File/function references | frontend/services/api.ts:818,869,959; frontend/pages/AdminPanel.tsx:140; frontend/pages/ProductPage.tsx:65; frontend/pages/UserPanel.tsx:loadAccount; backend/shop/commerce_views.py:84 |
| Current behaviour | myOrders/getReturns return only results; admin and reviews use the first Page.results without storing pagination or requesting later pages. Backend returns next/previous=null even with more pages. |
| Impact | Orders, returns, reviews and commerce records after the first 25 are unreachable through these screens. Existing client-side pagination on unbounded old lists does not fix this. |
| Reproduction/proof | P15: 35 orders produce count=35, returned=25, total_pages=2, next=null. Client calls accept no page in myOrders/getReturns; admin load supplies none. |
| Root cause | Array convenience wrappers and UI discard pagination metadata. |
| Remediation recommendation | Carry Page envelopes through adapters, implement server pagination/filter state and deterministic ordering; establish next/previous or page-number contract. |
| Regression testing needed | More than 25/100 records, later-page update/delete, empty/out-of-range pages, filters and preserved selection. |
| Dependencies | PERF-002, TEST-001 |
| Migration implications | No DB change unless new query indexes are justified. |
| Recommended remediation batch | 5 (complete staff surfaces in 7) |

<a id="fe-006"></a>

## FE-006 - Late detail and quote responses can replace newer state

| Attribute | Audit record |
| --- | --- |
| ID | FE-006 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | Static schedule: start A request, change to B, resolve B then A; unconditional setters accept A. For quote, change quantity and resolve requests out of order; no fingerprint links quote to submission. Browser schedule not run. |
| File/function references | frontend/pages/ProductPage.tsx:38,65; frontend/pages/CartPage.tsx:131,145,192 |
| Current behaviour | Changing product ID or checkout inputs starts new requests without abort/version checks; cleanup cancels only not-yet-fired timers. A previous quote remains during the debounce interval. |
| Impact | Older product/reviews can display on a new route; displayed checkout amount/options can disagree with submitted inputs. Server recalculation protects pricing authority but does not confirm the displayed total. |
| Reproduction/proof | Static schedule: start A request, change to B, resolve B then A; unconditional setters accept A. For quote, change quantity and resolve requests out of order; no fingerprint links quote to submission. Browser schedule not run. |
| Root cause | Async results lack identity/request-generation ownership. |
| Remediation recommendation | Abort or ignore superseded requests, clear/invalidate quote immediately on input change, and tie submit eligibility to matching inputs; decide price-change confirmation. |
| Regression testing needed | Out-of-order product/review/quote success and failure, unmount/session changes, rapid coupon/shipping edits and create-price changes. |
| Dependencies | FE-001, FE-004, TEST-001 |
| Migration implications | None; optional versioned quote contract would require backend changes. |
| Recommended remediation batch | 6 |

<a id="fe-007"></a>

## FE-007 - Legacy cart migration returns before reading legacy entries

| Attribute | Audit record |
| --- | --- |
| ID | FE-007 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | P18 evaluates the actual reader: v1 has one product, v2 absent, loadedItems=0. |
| File/function references | frontend/contexts/GlobalContext.tsx:62,123 |
| Current behaviour | Missing reza_cart_v2 is parsed as [], recognized as an array and returned immediately. The v1 migration executes only when v2 is malformed/non-array. |
| Impact | A browser with only a legitimate v1 cart loads empty and then persistence overwrites the v1 copy. |
| Reproduction/proof | P18 evaluates the actual reader: v1 has one product, v2 absent, loadedItems=0. |
| Root cause | Absent new storage is treated as a valid empty migrated cart. |
| Remediation recommendation | Distinguish absent storage from explicit empty v2; migrate once and validate shapes without overwriting the source before success. |
| Regression testing needed | Absent, valid-empty, malformed v1/v2 and variant-less legacy lines; preserve deliberate cart clearing. |
| Dependencies | FE-004, TEST-001 |
| Migration implications | Browser storage migration only. |
| Recommended remediation batch | 6 |

<a id="fe-008"></a>

## FE-008 - Frontend staff access disagrees with backend role rules

| Attribute | Audit record |
| --- | --- |
| ID | FE-008 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed defect |
| Evidence | Construct is_staff=True, role=user, non-superuser: is_admin returns true; returned role remains user and ProtectedRoute redirects. Superuser sync does not cover ordinary staff. |
| File/function references | backend/shop/models.py:User.is_admin; backend/shop/views.py:125; frontend/App.tsx:ProtectedRoute; frontend/contexts/GlobalContext.tsx:149 |
| Current behaviour | API permits is_staff users even when role=user. serialize_user returns raw role; React requires role=admin. |
| Impact | Legitimate Django staff without the custom role can use staff APIs but are denied the React admin interface; capability ownership is inconsistent. |
| Reproduction/proof | Construct is_staff=True, role=user, non-superuser: is_admin returns true; returned role remains user and ProtectedRoute redirects. Superuser sync does not cover ordinary staff. |
| Root cause | Authorization capability is duplicated as raw role checks. |
| Remediation recommendation | Expose a documented effective capability and use it consistently for UI routing/loading; keep backend enforcement authoritative. |
| Regression testing needed | User/admin-role/staff/superuser/inactive combinations across me, protected routes and staff endpoints. |
| Dependencies | ARCH-003, FE-001 |
| Migration implications | No automatic privilege changes; reconcile role data only with owner-approved semantics. |
| Recommended remediation batch | 5 |
