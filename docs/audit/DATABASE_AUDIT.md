# Database audit

Normal settings use `mssql` with `mssql-django`/`pyodbc`; isolated tests replace DATABASES with in-memory SQLite. No SQL Server connection, live schema inspection, query plan, production dataset, collation or isolation-level query was performed. Historical July SQL smoke tests are prior evidence only.

## Schema and relationship map

| Aggregate | Relationships / deletion behavior | Existing protection |
| --- | --- | --- |
| User | AbstractUser; email unique, role/staff flags, optional 2FA secret; addresses/cart/wishlist/reviews CASCADE; Order.user SET_NULL; return/redemption user PROTECT | Email normalized on save; 0005 preflights blanks/duplicates; password validators on registration |
| Product/Variant | String product PK; UUID variant PK; product -> variants CASCADE; unique SKU and product/size/color | Nonnegative product/variant stock and price; active/category, featured/active and variant active indexes |
| Order/Item | String order PK; globally unique UUID idempotency key; user/address/shipping/coupon SET_NULL; items CASCADE; product/variant SET_NULL | Nonnegative totals; qty >=1; positive price bounds; user/status/payment-status + created indexes; immutable item/address/shipping/coupon snapshots |
| Payment | OneToOne Order CASCADE; status/amount/provider/reference/JSON metadata | Nonnegative amount; status/date and reference indexes; no separate refund ledger |
| Coupon/Redemption | Unique code; redemption order OneToOne CASCADE, coupon/user PROTECT | Nonnegative amounts, percentage <=100, date order; coupon/user lookup index |
| Shipping/Address | Unique shipping code; address user FK | Nonnegative rates, ordered days; address user/active index; default address is service-enforced |
| Cart/Wishlist | user-variant / user-product pairs | Unique pairs, positive cart quantity |
| Review | user-product unique; optional order-item OneToOne SET_NULL | Rating 1..5; product/status/date index |
| Return | user/order/item PROTECT; item nullable in schema | Positive quantity, user/status date indexes; cumulative quantity/state rules in services |
| Movement/Event | movement variant/item/actor SET_NULL; event order CASCADE, actor SET_NULL | Resulting stock >=0; lookup indexes; admin read-only on ledger/event forms |
| Leads/content/outbox | Bespoke optional user SET_NULL; newsletter unique email; singleton-by-convention settings; outbox user SET_NULL | Outbox UUID unique and status/available index; no worker or singleton DB constraint |

## Inventory and money authority

Checkout resolves an active variant and uses its override price or product price. `_sync_product_stock` sums active variants into Product.stock. Product administration with a single blank-size/blank-color variant instead accepts Product.stock as input, then writes that variant. With named/multiple variants, aggregate stock is projected. Default-variant creation also occurs during quote/cart resolution when a legacy product has none. Thus authority is intended but not universal (BE-001/BE-002).

Cancellation/restock use variant inventory where available and Product.stock fallback for legacy/null-variant items. If catalog rows were deleted, immutable order snapshots survive but restoration cannot recreate physical SKU stock automatically. Money uses Decimal(12,2), with two decimal places even though UI prices are presented as Toman. Large multi-line totals can exceed column capacity; no aggregate bound is validated. Refund and projection inconsistencies are BE-003/BE-004/BE-006.

## Migration history and deployment preconditions

| Migration | Purpose | Audit considerations |
| --- | --- | --- |
| 0001 | Custom User foundation | Historical auth shape |
| 0002 | Products/orders/items/content plus auth relations/changes | Legacy catalog and order base |
| 0003 | URL-backed images become ImageFields; removes settings timestamp | Changes schema, does not copy remote images or normalize historical gallery values |
| 0004 | Legacy User.address | Still live in profile and compatibility checkout |
| 0005 | Normalized unique emails; clears legacy 2FA secrets | Aborts on blank/case-normalized duplicates, reports IDs not values; reverse data operation is noop |
| 0006 | Commerce models, FKs, indexes, checks, snapshots and variants | Adds nullable order UUID, backfills each row, then makes unique/non-null. Builds legacy SKU from uppercase product ID; creates addresses from flat text. No payment/refund history backfill; most checks are installed before data backfill. Negative legacy stock/totals can fail constraints before max(...,0) code runs |
| 0007 | Partial/full refund/payment states and bespoke scheduled choice | Primarily state field/choice evolution, not financial data repair |

The existing MigrationExecutor test covers one positive legacy catalog/order/address case on SQLite. Blank/duplicate emails, invalid legacy amounts, SKU collisions under SQL collation, all seven migrations on existing SQL data and rollback/restore need separate staging evidence. `RunPython.noop` reverse functions do not restore cleared secrets or recover commerce data removed by reverse schema operations. Use backups and forward corrective migrations; do not casually edit applied migrations.

## SQL Server behavior and evidence limits

Installed mssql-django 1.7.3 advertises select-for-update and emits `WITH (ROWLOCK, UPDLOCK)` in `mssql/operations.py:318`; its compiler injects hints and rejects outside-transaction use. Application settings do not explicitly set isolation_level or collation. Actual lock order, escalation, deadlocks and deployment isolation remain unknown; do not transplant PostgreSQL locking assumptions.

SQLite does not implement the same row-lock semantics, and decimal/length/collation behavior differs. Django explicitly documents SQLite select-for-update limitations and database differences. [Django queryset reference](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#select-for-update), [SQLite notes](https://docs.djangoproject.com/en/5.2/ref/databases/#sqlite-notes). SQL Server lock behavior also depends on isolation/index access; testing requires independent transactions against SQL Server. [Microsoft locking guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver16).

SQL JSONField storage and query/index capabilities must be checked against the deployed server/driver. The current source mostly uses JSON as opaque snapshots; the gallery probe confirms a JSONField may contain a string instead of the intended list. Normalization and case-insensitive uniqueness must be validated against actual SQL collation, not inferred from the SQLite test result.

<a id="db-001"></a>

## DB-001 - Several cross-record invariants rely on cooperative application writers

| Attribute | Audit record |
| --- | --- |
| ID | DB-001 |
| Severity | P2 |
| Confidence | High |
| Status | Open - design risk |
| Evidence | Static constraint inventory; BE-002 and BE-006 demonstrate concrete bypasses. SiteSettings.objects.first is the singleton convention. |
| File/function references | backend/shop/models.py:Address,SiteSettings,Order,Payment,InventoryMovement; backend/shop/admin.py |
| Current behaviour | Schema checks protect row-level nonnegativity/uniqueness, but not one active default address, one settings row, stock projection equality, total equation or synchronized lifecycle state. |
| Impact | Native/admin/concurrent writers can produce mutually inconsistent records despite valid individual rows; no production incidence is asserted. |
| Reproduction/proof | Static constraint inventory; BE-002 and BE-006 demonstrate concrete bypasses. SiteSettings.objects.first is the singleton convention. |
| Root cause | Some invariants are cross-row and some are service conventions; database choices alone do not enforce the entire domain. |
| Remediation recommendation | First centralize writers; add SQL-compatible constraints for suitable invariants and reconciliation/audit queries for cross-record ones. |
| Regression testing needed | Concurrent default-address mutations, duplicate settings, financial equations, relation consistency and projection reconciliation. |
| Dependencies | BE-001, BE-002, BE-006, TEST-003 |
| Migration implications | Preflight/repair duplicates before adding constraints; SQL Server-compatible filtered/unique design needs staging validation. |
| Recommended remediation batch | 8 |

<a id="db-002"></a>

## DB-002 - Lock acquisition order differs between mutation paths

| Attribute | Audit record |
| --- | --- |
| ID | DB-002 |
| Severity | P1 |
| Confidence | Medium |
| Status | Open - unverified concurrency risk |
| Batch 2 revalidation | Inventory paths still have mixed lock acquisition order. Refund/payment mutations now lock their order before payment/return state, but this does not establish SQL-wide safety. Docker daemon was unavailable (docker_engine pipe missing), so no isolated SQL Server lane or concurrent production-engine test ran. SQLite stale-write/rollback regressions pass; no deadlock/oversell claim is closed. |
| Evidence | Static order-of-operations trace plus installed mssql-django hint implementation. Reproduction requires barriers and separate SQL Server connections; SQLite P08 only proves a stale-write interleaving. |
| File/function references | backend/shop/commerce_services.py:134,321,540,622,671,715; backend/shop/views.py:293,933; backend/shop/commerce_views.py:195,277 |
| Current behaviour | Checkout can lock variant then product or product then default variant; catalog updates write product then lock variants. Fulfillment locks order then payment; payment transition starts at payment. |
| Impact | Potential deadlocks/retry failures or inconsistent concurrent state. No deadlock/oversell frequency was measured; this is a high-impact verification priority, not a confirmed SQL incident. |
| Reproduction/proof | Static order-of-operations trace plus installed mssql-django hint implementation. Reproduction requires barriers and separate SQL Server connections; SQLite P08 only proves a stale-write interleaving. |
| Root cause | No documented global lock order; mixed compatibility paths and no bounded deadlock retry policy. |
| Remediation recommendation | Establish a canonical locking order and explicit atomic service boundaries; inspect actual generated SQL/locks before adding targeted retries. |
| Regression testing needed | Concurrent checkout/checkout, checkout/edit, cancel/edit, order/payment, returns/refunds, same/different SKU and coupon final-use races. |
| Dependencies | TEST-003, BE-001, BE-005 |
| Migration implications | Usually no schema change for ordering; index/isolation changes require measured SQL plans and staging checks. |
| Recommended remediation batch | 2 (SQL verification in 3) |

<a id="db-003"></a>

## DB-003 - Legacy migration does not establish payment history

| Attribute | Audit record |
| --- | --- |
| ID | DB-003 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed compatibility gap |
| Evidence | Backfill function imports/creates no Payment; positive migration test asserts snapshots/variants/address only. Inspect a migrated legacy order's absent payment and follow refund lookup. |
| File/function references | backend/shop/migrations/0006_address_bespokerequest_coupon_couponredemption_and_more.py:10; backend/shop/commerce_services.py:638,758; backend/shop/commerce_serializers.py:219 |
| Current behaviour | Legacy orders receive IDs/subtotals/snapshots and variants, but no Payment rows or confirmed payment state. Service guards permit missing payments in some fulfillment paths; refunds require a payment. |
| Impact | Historical orders cannot uniformly use modern payment/refund workflows; a migration pass does not prove commerce lifecycle parity. |
| Reproduction/proof | Backfill function imports/creates no Payment; positive migration test asserts snapshots/variants/address only. Inspect a migrated legacy order's absent payment and follow refund lookup. |
| Root cause | Historical financial truth was unavailable and not modeled as an explicit legacy/unknown capability. |
| Remediation recommendation | Define legacy-order capabilities and a verified reconciliation/import workflow; never fabricate paid status from order delivery alone. |
| Regression testing needed | Legacy pending/delivered/cancelled orders without payment, refund denial, native admin, historical image paths and snapshots. |
| Dependencies | BE-002, BE-004; owner financial records |
| Migration implications | May need additive legacy marker/reconciliation migration; verified records and staging backup required. |
| Recommended remediation batch | 4 |

<a id="db-004"></a>

## DB-004 - SKU has an explicit index alongside a uniqueness index

| Attribute | Audit record |
| --- | --- |
| ID | DB-004 |
| Severity | P3 |
| Confidence | High |
| Status | Open - maintenance debt |
| Evidence | Static field/index definitions; inspect SQL Server sys.indexes/key columns before deciding removal. |
| File/function references | backend/shop/models.py:ProductVariant.sku,ProductVariant.Meta; migration 0006 variant_sku_idx |
| Current behaviour | SKU unique=True and a separate single-column variant_sku_idx describe overlapping index coverage. |
| Impact | Potential redundant write/storage cost; no SQL query-plan penalty measured. |
| Reproduction/proof | Static field/index definitions; inspect SQL Server sys.indexes/key columns before deciding removal. |
| Root cause | Explicit lookup index retained with a uniqueness requirement. |
| Remediation recommendation | Compare deployed index shapes/plans; remove only a proven redundant index through a new migration. |
| Regression testing needed | SKU uniqueness and lookup plans, migration forward/reverse on SQL Server. |
| Dependencies | TEST-003 |
| Migration implications | New RemoveIndex migration only after deployed-schema confirmation. |
| Recommended remediation batch | 8 |
