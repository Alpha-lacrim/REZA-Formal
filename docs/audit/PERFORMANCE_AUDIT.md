# Performance audit

No production timing, load test or React profiler run was performed. Findings separate observed query/request growth from unmeasured performance effects. The baseline table below is historical; [Batch 8 measurements and residuals](../DATABASE_PERFORMANCE.md) supersede remediated paths.

## Batch 8 - 2026-10-03

Repeated synthetic baseline/after probes and SQL Server budgets cover products/detail/admin, orders, reviews, users/messages, returns, cart, quotes and checkout. Cart 31 -> 2 queries / 153,219 -> 32,709 bytes; returns 77 -> 3; 30-line quote 92 -> 4; public catalog 144,401 -> 16,879 bytes with three queries including count; stats 10 -> 9 and SQL scalar net revenue. Checkout locks/writes remain unchanged (24/256 queries for 1/30 lines). Staff pages remain bounded; public/server search, catalog cards, customer orders/returns and review page controls are coordinated. Chrome asserts one product detail request and no extra expanded-order read. Main bundle grows slightly (392.64 KB baseline; final in Handoff), without a demonstrated bundle bottleneck. Saved account snapshots and historical inline media remain explicit residuals.

| Surface | Baseline behavior |
| --- | --- |
| Product list/detail/admin | Prefetch variants and all reviews, then filtered review AVG/COUNT per product; unbounded collection |
| Saved cart | Main items join variant/product, but nested ProductSummarySerializer fetches product.variants per line |
| Wishlist | Product/variants prefetched; full list returned even for a single toggle |
| Orders | Items/variant and events/actor prefetched; active customer orders page=25/max=100; old staff orders unbounded |
| Coupons | Staff list annotates usage_count, avoiding serializer count per row; quote has bounded coupon lookup/count operations per request |
| Checkout | Product/variant lookups per input, locked at commit; duplicate inputs coalesced after lookups; list length not globally bounded |
| Admin stats | Iterates every paid/partially_refunded payment in Python, loading metadata to subtract refunds |
| Admin UI | Entering commerce or any commerce action loads seven endpoints; orders tab sequentially fetches all orders and users |
| Storefront/UI | Local filtering/sorting over all catalog entries, fresh global context value, separate detail/review loads |
| Assets | Vite lazy route chunks, gzip and static cache headers present; gallery Data URLs defeat normal file caching |
| Build size | Main JS 344.28 kB (101.86 gzip); AdminPanel 80.65 kB (17.13 gzip); CSS 54.98 kB (9.54 gzip), no new bundle threshold failure |

Existing DB indexes cover many commerce status/user/date paths. No generic claim that all indexes are missing is supported. See DB-004 for a possible duplicate SKU index, DB-002 for lock/plan validation, ARCH-001 for rendering coupling, FE-002 for base64 storage and FE-005 for pagination correctness.

<a id="perf-001"></a>

## PERF-001 - Product review aggregates run twice per product

| Attribute | Audit record |
| --- | --- |
| ID | PERF-001 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 4; constant product read query budget |
| Batch 4 evidence | product_reads annotates approved rating/count and prefetches variants without loading all reviews. Public/staff read serializers consume that graph. Tests assert two queries for 1 and 100 products, pending-review exclusion, no-review null/count behavior and explicit response fields on SQLite and SQL Server. No index migration or production timing claim. |
| Evidence | P02 CaptureQueriesContext: one product=5 queries/2 review aggregates; two=7 queries/4 aggregates using actual serializer/prefetch. |
| File/function references | backend/shop/serializers.py:94,98; backend/shop/views.py:562,876 |
| Current behaviour | Prefetching reviews does not satisfy later filtered aggregate/count calls; each serialized product performs two extra review queries and loads the prefetched reviews as well. |
| Impact | Public/admin catalog cost grows with products and review rows; unnecessary memory/payload work accompanies unbounded listing. |
| Reproduction/proof | P02 CaptureQueriesContext: one product=5 queries/2 review aggregates; two=7 queries/4 aggregates using actual serializer/prefetch. |
| Root cause | Serializer methods own database aggregation independently of the queryset plan. |
| Remediation recommendation | Annotate approved average/count or consume an intentionally filtered prefetch; remove unused review prefetch and keep output parity. |
| Regression testing needed | Query-count budget for 1/25/100 products, approved-only average/count, no-review/null and variant payload parity. |
| Dependencies | ARCH-003, PERF-002 |
| Migration implications | Likely no migration; existing product/status review index should be measured before additions. |
| Recommended remediation batch | 8 |

<a id="perf-002"></a>

## PERF-002 - Several endpoints return unbounded collections

| Attribute | Audit record |
| --- | --- |
| ID | PERF-002 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - Batch 8 public/staff/history pages and SQL stats; saved snapshots/legacy inline media remain |
| Batch 8 evidence | [Measured query/byte/request budgets](../DATABASE_PERFORMANCE.md); public filters/search/paging/cards and SQL revenue aggregation verified. Whole saved cart/wishlist/address contracts and historical inline payloads require separate coordination. No Redis or speculative index additions. |
| Batch 7 evidence | Staff UI consumes eight-row pages with server search/filter/sort and no client-side all-record scan. Legacy array compatibility helpers are bounded to 100 records and are not used by staff feature screens. Public/account reads, revenue aggregation and SQL query-plan measurement remain later work. |
| Batch 4 evidence | Orders/users/messages/products now use the shared 25-default/100-max page envelope with deterministic PK tie breakers and relative navigation links. Four staff adapters traverse numeric pages and reject incomplete loads; 103-record and permission/API tests plus MSW pagination tests pass. Browser collections still load all pages, public catalog/account collections and revenue aggregation remain unbounded; server-driven screen pagination is deferred. |
| Evidence | Static queryset/serializer trace has no slice/paginator on these routes; contrast _page default25/max100 used for coupons/shipping/payments/reviews/returns/bespoke. |
| File/function references | backend/shop/views.py:561,746,774,842,851,871; backend/shop/commerce_views.py:187,238,287 |
| Current behaviour | Products, old staff orders/users/messages/products, addresses/cart/wishlist return all records. Admin revenue loops all qualifying payments. New commerce staff lists already use bounded _page. |
| Impact | Growing database can increase latency, memory, response bytes and browser work; staff orders include all items/events. |
| Reproduction/proof | Static queryset/serializer trace has no slice/paginator on these routes; contrast _page default25/max100 used for coupons/shipping/payments/reviews/returns/bespoke. |
| Root cause | Mixed endpoint generations use incompatible pagination/aggregation strategies. |
| Remediation recommendation | Define bounded query/filter contracts, summary/detail projections and DB aggregation for stats; coordinate clients before truncating existing arrays. |
| Regression testing needed | Large fixture page boundaries, deterministic ordering, counts, response-byte/query budgets and client navigation. |
| Dependencies | FE-005, PERF-001, ARCH-003 |
| Migration implications | Indexes for new filters/orderings only after SQL measurement; API rollout needed. |
| Recommended remediation batch | 8 (contract/UI groundwork in 5/7) |

<a id="perf-003"></a>

## PERF-003 - Saved-cart summaries refetch variants for each line

| Attribute | Audit record |
| --- | --- |
| ID | PERF-003 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 8; two-query cart read graph and compact product copy |
| Batch 8 evidence | Joined cart products plus targeted variant prefetch hold at two queries for 1 and 30 lines on SQLite/SQL Server; descriptions omitted, fixture bytes 153,219 -> 32,709. Cart/domain normalizers and beyond-preview product selection verified. |
| Evidence | Static serializer access trace: select_related('variant__product') does not prefetch the reverse variants collection. No production timing asserted. |
| File/function references | backend/shop/commerce_views.py:238,253; backend/shop/commerce_serializers.py:73 |
| Current behaviour | Cart query joins variant/product but does not prefetch product.variants, which ProductSummarySerializer traverses for every line. |
| Impact | Additional variant queries and repeated full product descriptions/images/variant arrays per cart line; inline images amplify responses. |
| Reproduction/proof | Static serializer access trace: select_related('variant__product') does not prefetch the reverse variants collection. No production timing asserted. |
| Root cause | Reusing a broad product summary embeds a catalog graph in each cart line. |
| Remediation recommendation | Select a compact cart DTO or prefetch the required graph once; keep server price/availability and client normalization explicit. |
| Regression testing needed | Query count and byte budget across cart sizes and multiple variants of the same product; payload parity. |
| Dependencies | ARCH-003, FE-002, FE-004 |
| Migration implications | None expected. |
| Recommended remediation batch | 8 |
