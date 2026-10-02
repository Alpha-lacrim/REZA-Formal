# Batch 8 database and performance evidence

Measured 2026-10-03 on synthetic, disposable databases. Baseline is `7ac1a7805ee1e1598c4027868536749fdbdd3c6a`; the same fixture runs in a detached baseline worktree and the batch tree. No production data, production plans or load/latency claims. `shop.test_performance` captures executed Django SQL, excluding authentication with `force_authenticate`; checkout counts include transaction statements. Body sizes are rendered JSON bytes before compression, not a universal limit for historical inline media.

## Query and payload measurements

Fixture: 30 products, one variant/review/order/payment/cart line/return per product, 4,000-character descriptions and eight URL-backed gallery entries. Default collection page is 25. Return fixtures have valid subtotal/item snapshots; the initial exploratory incomplete fixture understated the old return budget (52); the corrected repeatable baseline below is authoritative.

| Path | Baseline queries | Batch 8 queries | Baseline / Batch 8 body bytes |
| --- | ---: | ---: | ---: |
| Public products | 2 (30 full products) | 3 (25 cards + count) | 144,401 / 16,879 |
| Product detail | 2 | 2 | 4,811 / 4,811 |
| Admin products | 3 | 3 | 122,635 / 122,635 |
| Customer orders | 5 | 5 | 29,452 / 29,452 |
| Admin orders | 5 | 5 | 29,455 / 29,455 |
| Public reviews | 3 | 3 | 333 / 333 |
| Admin reviews | 2 | 2 | 6,200 / 6,200 |
| Users | 2 | 2 | 455 / 455 |
| Messages | 2 | 2 | 3,601 / 3,601 |
| Customer returns | 77 | 3 | 6,485 / 6,485 |
| Admin returns | 77 | 3 | 6,491 / 6,491 |
| Cart (30 lines) | 31 | 2 | 153,219 / 32,709 |
| Stats | 10; materializes payment metadata | 9; SQL scalar revenue aggregation | 202 / 202 |
| Quote, 1 line | 5 | 4 | 412 / 412 |
| Quote, 30 lines | 92 | 4 | 6,718 / 6,718 |

Batch SQL Server measurements match query budgets; variable generated IDs/timestamps can change a few bytes. The full SQL run reported customer/admin orders 29,560/29,563, reviews 335/6,254, returns 6,493/6,499 and cart 32,712. Repeat targeted runs produce the table's sizes. Tests assert 1-row and 25-row page budgets, 1/30 cart-line budgets, approved-only rating semantics (retained Batch 4 tests), public <20 KB and cart <40 KB fixture bodies, selected IDs/hidden products, filters, refund arithmetic and inventory audit non-mutation.

Locked checkout remains deliberately unchanged: measured 24 queries for one line and 256 for 30 lines, with idempotent replay and stock/ledger checks. It writes line snapshots, movements, decrements and product projections atomically; the read-only quote optimization does not replace its locks or bulk-update inventory. This remains a candidate for a separately designed, measured SQL locking/bulk-write change.

## Loading and network contracts

- `product_reads` retains approved-only AVG/COUNT annotations and a variants prefetch. Product list cards omit descriptions and expose one gallery reference; detail and staff editor reads retain full content. Public lists now use the shared page envelope (25 default, 100 maximum), stable PK tie breakers, search, category, fabric, price bounds, allowlisted sort and at most 100 exact IDs per request. Facets use a separate bounded DISTINCT query (100 fabrics maximum); exceptionally more fabric values require a searchable facet API.
- Catalog screen uses 24-row server pages; homepage category previews use eight rows; navbar waits 300 ms and requests five server search results. Page/search keys expire after five inactive minutes. The compatibility catalog is a preview; referenced cart/wishlist products outside that preview are retrieved in exact-ID batches, and a product on any catalog/detail page can be added without depending on the preview. The recent clicked-product buffer holds at most 100 products, resets with identity/stock invalidation, and does not replace server checkout validation.
- Cart prefetches only variants of its joined products and excludes unused long-form descriptions. Return reads join order/payment/item and prefetch only the selected page's order lines. A correlated refunded-quantity annotation plus ordered prefetched items preserves proportional allocation, split-return rounding, missing-payment denial and legacy snapshot handling; mutation paths use fresh unannotated rows. Unlocked quote/cart resolution batches only products/variants referenced by the submitted lines; compatibility default-variant creation and unavailable/mismatched/ambiguous checks remain.
- Stats computes net revenue in SQL from paid/partially-refunded payments and existing `metadata.refunded_amount`, preserving decimal subtraction, missing-refund zero, fully refunded exclusion and clamping. JSON extraction/decimal CASE/SUM is executed and checked on SQL Server, including legacy paid metadata. Orders total/pending use one aggregate. No refund field/backfill or fabricated financial history.
- Customer order/return and product review screens use eight-row pages. Account reads load the active tab; opening orders formerly loaded orders/addresses/returns (three requests), now one order page. Expanding an order formerly fetched its already embedded detail, now zero extra requests. Obsolete customer pages abort/ignore responses. Product detail no longer refetches when its context item arrives; immediately disposed effects cancel before dispatch. Chrome asserts one product-detail request and zero order-detail requests for the customer journey.
- Existing admin pages remain bounded and load only the selected feature. No Redis, blanket prefetch, dependency or bundle split was added. Vite baseline main JS 392.64 KB / 117.39 KB gzip; initial Batch 8 395.17 / 118.18, AdminPanel unchanged 85.32 / 20.67. Final build values are recorded in Handoff. Additional paging/query code is a small increase, not a demonstrated bundle bottleneck. Build wall time varies with concurrent checks and is not a benchmark.

## Index assessment and migration

| Real access pattern | Existing coverage / decision |
| --- | --- |
| Visible category/featured products | `prod_active_cat_idx`, `prod_featured_idx`; no guessed new index for low-cardinality booleans or contains search |
| Product detail/slug | String product PK; no slug field or slug query exists |
| SKU equality | `sku unique=True` creates a unique single-column index; explicit `variant_sku_idx` duplicates its key |
| Active variant/product and inventory | `variant_prod_active_idx`, product FK, stock checks, inventory variant/reason+date indexes. Low-stock COUNT is measured; no measured plan justifies an additional stock index |
| User/order/status/timestamps | Order user+created, status+created, payment-status+created; item FK, event order+created; user PK. Date-cast and contains filters can scan; no new production selectivity evidence |
| Checkout/outbox idempotency | Existing unique UUID indexes; no additional index |
| Coupons/redemptions | Unique code, active date index, coupon+user index and unique order redemption; preserve serialized coupon limits |
| Reviews/returns | Product+status+created and return user/status+requested indexes; return item FK supports correlated refund quantity lookup |
| Payments/refunds | One-to-one order index, status+created. Reference/refund history is guarded within order/payment locks; no standalone reference search path or new JSON index justified |
| Users/messages | PK/default ordering and bounded contains search; no evidence for speculative full-text/index infrastructure |

Disposable SQL Server `sys.indexes`/key-column inventory confirmed both SKU indexes have only `sku` as their key, one unique and one nonunique. A 1,000-variant `SHOWPLAN_XML` equality lookup used **Index Seek** on the unique index before removal and after. `0008_remove_redundant_sku_index` removes only `variant_sku_idx`; the unique field/constraint remains. SQL migration tests run 0008 -> 0007 -> 0008 -> 0007 -> 0008 and confirm shapes; the existing duplicate-SKU test remains. This is disposable-schema evidence, not a claim about an inspected deployed database. Before deployment inspect the deployed schema and take the normal SQL backup; apply 0008. Rollback to 0007 recreates the redundant index without modifying data.

## Stock ownership and transaction review

| Record | Canonical meaning / readers |
| --- | --- |
| `ProductVariant.stock` | Purchasable units for that SKU. Availability additionally requires active product AND active variant. Read by quote/checkout, cart, selected-option UI and low-stock stats. Price is variant override or current product price; checkout always revalidates |
| `Product.stock` | Compatibility projection: SUM(stock) over active variants whenever variants exist, independent of parent visibility. Public/staff lists, legacy UI, optimistic inventory version and pre-variant compatibility/default creation read it. It is not a second independently editable SKU pool |
| `InventoryMovement` | Audit of service-owned stock deltas/resulting SKU stock; deleted SKU/order history may retain snapshots without FK. A missing or disagreeing ledger is reconciliation evidence, not permission to guess stock |

Writers:

- `product_services.save_product/_sync_product_variants`: product lock; optimistic inventory version; variant locks; default/SKU writes plus movement; active sum projection; omitted historical variants deactivate rather than delete. Single blank default stock input updates that SKU. Multiple/sized variants cause product-level input to be projected back from variants.
- `commerce_services.create_checkout_order`: atomic idempotency/address/quote/stock/item/payment/redemption/outbox/event writes; variant decrement and sale movement, then `_sync_product_stock`. Explicit SKU path takes variant then product; compatibility product path takes product then default variant.
- `_cancel_locked_order`: order/payment guards; fresh variant/product restoration, cancellation movement, active projection, redemption removal and payment/order/event state in one transaction; repeated cancellation does not restore twice. A legacy item whose variant was deleted can restore the surviving product compatibility field directly, with documented divergence risk when other variants remain.
- `transition_return(received)`: order/return guard, purchased variant or surviving legacy product restoration and return movement in one transaction. Receipt restocks; approval alone does not. Refund uses order/payment locks and `record_refund` atomically, preserving allocation/reference replay and confirmed manual transfer policy.
- `_default_variant`: lazy pre-variant compatibility bootstrap copies nonnegative Product stock; seed command and historical migration 0006 also initialize variants from Product stock. These bootstrap paths do not establish a complete movement history. Native product/variant/order/payment/return admin writers remain inspection-only; service-backed API owns current writes.
- Direct ORM, imports, database operators and applied legacy migration data are possible bypasses. No production/bulk repair was executed.

Divergence scenarios: direct Product/variant writes; legacy/deleted variant restocking; activating/deactivating a variant outside services; partial/imported history; product with no variants awaiting compatibility bootstrap; mixed lock schedules; missing movement history. `audit_inventory --limit 25` is a bounded-sample, read-only ORM report of all projection/last-movement mismatch counts, no-variant products and no-ledger variants. It excludes no-variant records from projection-equality accusations and never repairs financial/inventory truth. Test fixtures prove it reports discrepancies without modifying either stock field. Run only against an owner-selected backed-up environment; interpret missing history before remediation.

No stock ownership redesign is implemented, so no redesign ADR is required. A future change to eliminate compatibility stock/bootstrap, normalize refund history, bulk-decrement inventory or establish a new global lock order requires a consequential design ADR and broader SQL race coverage first. DB-001 is partial; unrelated default-address/settings/financial cross-record invariants remain. DB-002 remains open: passing covered SQL schedules does not establish a universal lock order, coupon final-use races or checkout/edit/cancel/return/refund interleavings. SQLite is not SQL row-lock evidence.

## Rollout and residuals

Deploy frontend/backend together for the public page/card contract; old clients expecting a full array cannot search a growing catalog correctly. Detail/staff full reads and array normalization for mixed deployment remain. Apply migration 0008 after backup/schema review. No production command was run. Legacy inline images remain readable until managed edit conversion, so historical media can still exceed synthetic byte budgets. Wishlist/address/saved-cart synchronization still uses whole account snapshots; wishlist mutation replies are broad and intrinsic saved collections need a separately coordinated bounded synchronization contract. Catalog/staff/customer history search no longer downloads the full catalog. PERF-003 and DB-004 addressed; PERF-002 partial for these saved-collection/legacy-media limits. Broader SQL schedules, deployed plans/latency, hosted CI and earlier security/provider/financial/deployment obligations remain open.
