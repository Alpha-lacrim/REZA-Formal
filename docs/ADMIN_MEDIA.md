# Admin features and product media

Batch 7, 2026-10-02. The existing Persian RTL presentation is retained. No schema migration, new dependency, provider integration or deployment is included.

## Responsibility and state

`frontend/pages/AdminPanel.tsx` owns navigation, responsive shell and composition. Feature implementations live in `frontend/features/admin/`:

| Module | Responsibility |
| --- | --- |
| `Dashboard` | Aggregate dashboard presentation |
| `Products` | Server search/sort/page, selected editor and deletion |
| `ProductEditor`, `productForm` | Editor session, independent metadata/pricing/stock/variant/media drafts, validation and multipart payload |
| `Orders` | Server search/status/page, transitions, tracking and printable detail; customer information comes from the order response |
| `Commerce` | Coupon/shipping forms and payment/review/return/bespoke operations; only the selected section loads |
| `Messages` | Paginated inbox and mark-read action |
| `SiteSettingsFeature` | Text settings and separate file/clear/preview state |
| `Dialog`, `shared` | Native modal focus/Escape/return behavior; page navigation, query errors and identity-scoped page queries |

Commerce's smaller operational sections remain together; they share an action lifecycle and navigation. Users were previously loaded solely to enrich orders: that redundant whole-directory fetch is removed, without inventing a new user management screen. Capability policy remains the existing backend policy.

Each mounted editor initializes a fresh draft. Cancel/unmount discards it and releases object URLs. Metadata, pricing, variants, stock and media have independent state. Invalid inputs focus an announced error summary and associate errors with controls. Server validation preserves the draft; inventory conflicts invalidate staff reads and ask the operator to close/reopen with a fresh version. Save locks the form and dismissal until the request completes, avoiding duplicate submission. The progress announcement is indeterminate (upload plus server save); the shared fetch transport does not report byte percentages. Network loss can leave a write's outcome uncertain; create requests are not automatically retried.

Stock/price remain server-authoritative. Variant stock is shown as an active-variant sum. Existing variants are deactivated to retain history; only unsaved variants can be removed locally. New products without variants omit the variants payload so Django creates the default inventory variant. An empty compare-at price explicitly clears the nullable server decimal.

## Pagination contract

Products, orders, messages and all six commerce collections request one eight-row page. Numeric page, filters and identity belong to query keys; obsolete page reads receive abort signals. Filters/section changes reset page one. Mutations invalidate cached staff pages; an empty last page moves back to the new last page. Errors expose retry, rather than treating a failed request as a successful empty collection. Inactive page caches expire after five minutes.

Product API filters are `search` (name/category) and `ordering` (`default`, `price-asc`, `price-desc`, `stock-asc`, `stock-desc`, `name-asc`). Orders accept `search` (ID/address/recipient/account name), `status`, and ISO `date_start`/`date_end`; invalid dates/status/orderings return field errors. All filters apply before count/slice and use the existing stable PK tie breaker. Messages also accept server `search`. Counts/navigation come from the server.

The retained array compatibility adapters now return at most the first 100 records. Admin feature screens never use them. The shared staff catalog used by other site components is a bounded preview; the admin products screen is the complete management surface. Public storefront/account pagination and revenue aggregation remain later work (FE-005/PERF-002); this batch does not claim to resolve them.

## File-to-render trace and storage decision

1. The browser retains `File` objects in editor-local state. `URL.createObjectURL` creates separate local previews; removal, replacement and unmount revoke them.
2. `productPayload` sends binary `image`/`images[]` parts and JSON `images` containing retained persistent references. No newly created Data URL or object URL enters a product record.
3. The shared API client sends multipart with cookies/CSRF and normalizes server errors. It leaves the multipart Content-Type/boundary to the browser.
4. Django `prepare_product_data` checks aggregate file limits before image decoding. `ProductImageField` checks each image's actual decoded content, MIME/extension agreement, dimensions and animation, then re-encodes pixels without supplied metadata/appended content.
5. `product_services.save_product` stages validated files under randomized storage names and writes product/variants/inventory within the existing transaction. A failure removes newly staged files only.
6. `Product.image` stores the primary storage name; `Product.images` already stores an ordered JSON array of gallery URLs. `AdminProductReadSerializer` exposes usable references. The frontend keeps the actual `primaryImage` separate from `image`'s display fallback so editing a gallery-only product cannot accidentally remove its first gallery image.
7. The product/editor render returned URLs. In production Nginx serves `/media/` from the shared read-only volume with `nosniff`; the disposable browser-test server explicitly serves its temporary files.

The existing model supports the required primary image and ordered gallery. There is no per-image caption, role, ownership, independent lifecycle or query requirement justifying `ProductImage` now. Therefore no table, migration or bulk data rewrite is introduced. Arbitrary URL entry is removed from the product editor; existing local/external references remain readable and retainable for compatibility. Valid legacy inline galleries convert to managed files when submitted on edit through the existing validator. Invalid legacy images produce a validation error rather than being silently deleted.

## Upload limits

| Layer | Enforced limit/behavior |
| --- | --- |
| Browser | 12 total retained/new images; 10 MiB/file, 40 MiB/new selection; PNG/JPEG/WebP/GIF MIME and filename checks |
| Product request normalization | At most 12 uploaded files, one primary file, and 40 MiB total binary input before decoding |
| Django image validation | At most 10 MiB input/output per image; still PNG/JPEG/WebP/GIF; actual decoding; maximum side 8,000 px and area 20 million px; randomized filenames |
| Product serializer | At most 12 gallery-plus-primary images; an existing primary URL also retained in the gallery counts once |
| Django multipart buffering | 2 MiB in-memory threshold, then temporary disk files; this is not a rejection limit |
| Django non-file body | 50 MiB memory limit; Django excludes uploaded files from this setting |
| Nginx | Existing 50 MiB complete-body cap, leaving multipart overhead above the 40 MiB binary allowance |

The backend is authoritative; browser `accept`, MIME and filename checks alone cannot establish safety. The new cap can require removing a reference when editing an old over-limit gallery; old records are not rewritten on deployment. Existing historical files are deliberately retained because order snapshots may reference them. Storage cleanup requires a separate reference-aware retention policy, backup and owner decision.

## Rollout and rollback

Deploy the frontend and backend together so server filters and empty compare-price handling match the UI. No migration or environment-variable change is needed. Rebuild frontend assets: Tailwind now scans `features/`. Keep the existing Nginx 50 MiB cap and shared media mount. Reverting this batch requires only an application rollback; URLs/files and the schema remain compatible with the previous release. Do not delete newly uploaded or historical media during rollback. Production media-serving headers/permissions and prior legacy-media review obligations remain deployment checks.

## Verification

Regression coverage includes product create/edit, binary primary/gallery uploads, retained gallery-only images, clearing images/compare-price, preview cleanup, validation/server errors, save locking, paginated search/sort/retry, active commerce loading and failed-draft retention, and staff order cancellation. Backend tests cover filter-before-pagination, malformed filters, image count/size/content/dimensions/animation/filenames, forward media persistence and failed-write cleanup. Real-Django Chrome journeys verify saved media renders after reload and dialog focus/Escape behavior. Exact final check results are recorded in `Handoff.md`.
