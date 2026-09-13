# Performance audit

No production timing, load test or React profiler run was performed. Findings separate observed query/request growth from unmeasured performance effects.

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
| Status | Open - confirmed query growth |
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
| Status | Open - confirmed scalability gap |
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
| Status | Open - confirmed query growth |
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
