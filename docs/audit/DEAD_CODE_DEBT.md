# Dead code and compatibility debt

See [architecture](ARCHITECTURE_AUDIT.md) for live boundaries. Reachability was checked against repository routes, imports, client call sites and tests, not inferred from names.

| Candidate | Reachability / disposition | Removal precondition |
| --- | --- | --- |
| `views.create_order / my_orders / cancel_order` and legacy order serializers | Importable but not routed; production order URLs resolve to `commerce_views` (probe P01) | Route and snapshot tests; search direct callers before removal |
| Two ProductVariantSerializer classes | Both live: catalog versus commerce summary/cart payload | Choose wire contract and preserve aliases |
| `api.createOrder` | No repository call site outside its definition; old direct-order wrapper | Confirm external consumers, then remove with contract cleanup |
| `UserSerializer` in serializers.py | No live view use found; manual `serialize_user` is live | Preserve API account representation |
| `db.ts` local catalog fallback | Live GlobalContext import; constructor removes retired local backend keys | Do not delete as dead code; decide offline policy explicitly |
| `User.address`, flat shipping_address and item id/qty aliases | Live compatibility paths, including tests and frontend profile | Data migration and client deprecation, not simple deletion |
| Product.stock / default-variant synthesis | Live read/write compatibility used by seed, admin and checkout | Inventory remediation and migration strategy |
| two_factor_secret / pyotp / 2fa modal | Password-login check is live; enrollment/delivery absent; 0005 clears legacy values | Security decision; preserve intentional 501 send-otp behavior until replacement |
| Google backend auth | Routed and conditional on GOOGLE_OAUTH_CLIENT_ID; frontend button absent | Provider/MFA account-linking decision, SEC-004 |
| NotificationOutbox | Rows created by commerce/bespoke, registered in admin; no worker found | Implement delivery or explicitly retain pending records; not dead data |
| online payment enum/capability, bank_transfer UI union, quote_id input | Online explicitly rejected; bank_transfer not offered by backend; quote_id accepted but unused | Document boundaries; no simulated success |
| Old code comments about placeholders / unchanged handlers | Stale commentary, not evidence of runtime dependence | Remove only in relevant future work |
| Parent patch/archive directories | Outside active Git root | Out of scope; no deletion authorized by this audit |

Historical June analysis and SQL migration/setup documents are evidence of earlier work, not the current contract. New audit documents and the current code take precedence when they conflict. No legacy files were deleted in Batch 1.

<a id="arch-004"></a>

## ARCH-004 - Unrouted legacy order implementation remains beside commerce

| Attribute | Audit record |
| --- | --- |
| ID | ARCH-004 |
| Severity | P3 |
| Confidence | High |
| Status | Open - maintenance debt |
| Evidence | P01 resolves create/cancel to shop.commerce_views; URL/import/call-site search distinguishes definitions from live routes. |
| File/function references | backend/shop/views.py:617,653,660; backend/shop/serializers.py:111,118; backend/shop/urls.py:67; frontend/services/api.ts:810 |
| Current behaviour | Legacy handlers write Product.stock directly and serialize live products. Current order URLs call commerce handlers instead. |
| Impact | Future accidental reuse could bypass payment, variant and snapshot invariants; duplicate names obscure reviews. No active alternate legacy order route was found. |
| Reproduction/proof | P01 resolves create/cancel to shop.commerce_views; URL/import/call-site search distinguishes definitions from live routes. |
| Root cause | Old implementation retained when the commerce routes replaced it. |
| Remediation recommendation | Remove unrouted handlers/unused serializers and wrapper only after documenting remaining compatibility inputs. |
| Regression testing needed | Resolve every order URL, verify service invocation and immutable historical item responses. |
| Dependencies | ARCH-003, BE-001, TEST-003 |
| Migration implications | No DB migration merely to remove dead functions; retain live legacy data fields until migrated. |
| Recommended remediation batch | 4 |
