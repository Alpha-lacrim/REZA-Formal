# UX, accessibility, RTL and SEO audit

The original Batch 1 tables below preserve the static baseline symptoms. Batch 11
(2026-10-03) adds browser/axe, keyboard, responsive/RTL and metadata evidence in the
update below. Neither phase claims WCAG conformance or measured search indexing;
NVDA/VoiceOver and inclusive user review remain unperformed.

## Batch 11 implementation and verification

Required branch: `codex/batch-11-ux-a11y-seo`, from clean Batch 10 `a2865f5`.
The gold/black identity and existing feature structure are preserved.

- Navigation/auth/search/cart/return/admin overlays share native `dialog` modality,
  with initial focus, Tab/Shift-Tab wrap, Escape, focus restoration and scroll lock.
  Closed mobile menus are unmounted. Account disclosure uses normal buttons/links,
  expanded state, blur/Escape handling, and isolated email text.
- A skip link and route focus preserve the initial keyboard entry point. Global
  focus-visible and reduced-motion rules apply; small gold/status/gray text and
  gold buttons have measured contrast fixes. The mobile navbar remains active
  below 1280px, where the previous desktop layout crowded tablet widths.
- Auth/address/checkout/contact fields have persistent native labels, autocomplete,
  phone/numeric input hints, and Persian native-validation messages linked with
  described-by/invalid attributes. Checkout is a real submit form; incidental
  controls are buttons and invalid required fields prevent an order request.
  Async checkout errors and successful confirmation receive focus.
- Gallery/variant/wishlist/section controls expose selected state and accessible
  names. Product detail has one h1 and semantic breadcrumbs; cards link their
  titles and use an appropriate heading depth. RTL back arrows point right;
  carousel arrows are named and keyboard-visible, with a focusable scroll region.
  pagination digits, email/phone/postal values and product attributes use Persian
  formatting or directional isolation. Dialog sizing uses logical properties.
- Tables have captions/column headers and keyboard-focusable scroll regions.
  Cart summary is sticky only on desktop; grids use bounded columns. Product
  transport/review/search/account/checkout-option errors have explicit retries
  instead of false empty/not-found states. Toast is a persistent live region.
- Hero/detail imagery loads eagerly with high priority; other images remain lazy
  and decode asynchronously inside reserved containers. Broken-image skeletons
  terminate with named fallbacks. The artificial 350ms startup overlay is removed.
  The previously inert homepage newsletter form now calls the existing API and
  communicates pending/success/failure; no new provider is simulated.
- SEO replaces normal/social descriptions, Twitter titles, absolute image URLs,
  locale, OG URLs, schema and robots on every route, with cleanup. Home uses the
  actual origin rather than the previously hard-coded domain. Unknown route/policy
  and API-confirmed missing product views are named recovery pages with noindex;
  an outage is a separate retry view. Product JSON-LD uses absolute images and
  visible variant stock/price; Toman is converted to IRR ×10. Offers are omitted
  for legacy non-Toman currency rather than asserting an incorrect conversion.

[ADR 0001](../adr/0001-storefront-routing.md) retains HashRouter based on both
supported hosts and unresolved production origin/rendering/legacy redirects.
Container Nginx already has fallback; Vercel has no rewrites. Home has a runtime
root canonical; product fragment canonicals are deliberately omitted. `robots.txt`
allows the public document. XML sitemap, crawlable product paths/canonicals,
server product/status/social metadata and domain-qualified initial metadata remain
UX-002 rollout work. Client noindex is neither a private-route crawler boundary
nor a security mechanism under hash routing. No deployment/indexing/social-fetch
success is inferred from React metadata checks.

Verification uses pinned dev-only `@axe-core/playwright` 4.13.0 and the existing
disposable Django/SQLite browser fixture. WCAG 2 A/AA and 2.1 A/AA tagged scans have
no disabled rules or excluded nodes. Browser tests cover 320/390/768/1280px,
light/dark checkout and account addresses, mobile menu/search/auth focus cycles,
catalog/product/gallery/mini-cart, long mixed Persian/Latin content, admin product
tables/editor/coupon/shipping/settings/invoice, customer orders/return dialog,
missing routes, API outage vs 404, deep-link reload and JSON-LD conversion.
Newsletter checks cover sanitized failure then a real successful retry; native
required return selection prevents a POST. A four-card carousel stress response
verifies keyboard-visible arrows and both RTL scroll directions. The carousel,
long-copy/gallery stress responses and delivered return-read state are explicit
UI-only overrides; the original checkout/admin writes still use real Django.
No delivered transition or return success is fabricated. JSON axe reports and
screenshots are retained in ignored Playwright output, with visual review of
gallery, checkout, editor and invoice. Detailed final counts are in Handoff.

Manual assistive-technology announcements/reading order, real devices, broader
browser/zoom coverage, owner policy approval, legacy currencies and actual crawler
previews remain review/launch work. Automated checks cover only tested states;
see [Playwright's accessibility testing guidance](https://playwright.dev/docs/accessibility-testing).

## Positive baseline and observed limits

The document declares Persian language and RTL direction. Most customer copy is Persian, several numeric/identifier fields use explicit ltr, fonts include Vazirmatn, and prices/digits use helpers. Source was read as UTF-8; mojibake seen in default Windows PowerShell decoding was not treated as a source corruption defect.

Cart quantity/remove buttons and some other icons have accessible names. Checkout/bespoke errors use role=alert, PageLoader uses status/live semantics, and the site has headings/nav/main in many screens. Gaps remain in auth/search/admin dialogs, icon labels and placeholder-only fields. CSS has animations/smooth scrolling and no prefers-reduced-motion rule found; contrast, zoom, touch targets and full mobile RTL layout require measurement.

API error strings can appear in English inside Persian flows; stats/loading failures can appear as zero/empty data. UserPanel cancellation uses staff transitions (BE-009); payment/return dropdowns offer invalid state transitions and rely on server rejection. ProductCard automatically adds the first available variant with an explicit generic label, but omits size/color in the action; a product-selection UX decision is needed before changing that behavior.

Product SEO schema uses IRR and multiplies display Toman price by 10; this matches the current intended pricing convention but does not support arbitrary backend currency values. Public metadata changes only after React effects; schema is inserted via textContent. Owner policy text, refund eligibility/timings, shipping zones/rates, currency/tax and bespoke restrictions remain launch decisions, not legal conclusions of this audit.

[Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) recommends crawlable URLs and History API routing rather than fragment-driven page content. The code-level limitations below do not prove that every crawler fails or that the domain has any measured indexing loss.

<a id="ux-001"></a>

## UX-001 - Dialogs and controls lack consistent keyboard and naming semantics

| Attribute | Audit record |
| --- | --- |
| ID | UX-001 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - keyboard/semantics verified; assistive review pending |
| Evidence | Static markup/event inspection and aria/keyboard search; AuthModal close is an icon-only button and no focus-management effect exists. |
| File/function references | frontend/components/AuthModal.tsx:68; frontend/components/Navbar.tsx; frontend/components/ChatWidget.tsx:37; frontend/pages/AdminPanel.tsx:product modal; frontend/App.tsx:Toast |
| Current behaviour | Auth/modal markup lacks dialog/aria-modal/name, focus trap/restore and Escape handling; some close/menu controls have no accessible name and forms use unassociated labels/placeholders. Toast is not a live region. |
| Impact | Keyboard/screen-reader users may lose context, reach background content or miss status. Visual severity/contrast has not been measured. |
| Reproduction/proof | Static markup/event inspection and aria/keyboard search; AuthModal close is an icon-only button and no focus-management effect exists. |
| Root cause | Custom overlays and form controls were implemented without a shared accessible primitive contract. |
| Remediation recommendation | Implement reusable accessible dialogs/fields/toasts; preserve RTL visual order and logical keyboard order; support reduced-motion preferences. |
| Regression testing needed | Keyboard open/Tab/Shift-Tab/Escape/restore, accessible names, announcements, zoom/mobile RTL and automated axe checks plus manual assistive testing. |
| Dependencies | TEST-001, ARCH-002 |
| Migration implications | None. |
| Recommended remediation batch | 11 |

<a id="ux-002"></a>

## UX-002 - Hash routes and client-only metadata limit storefront discoverability

| Attribute | Audit record |
| --- | --- |
| ID | UX-002 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - metadata/robots improved; routing deferred |
| Evidence | Static route/build output inspection; Google source linked above. No Search Console or crawler experiment performed. |
| File/function references | frontend/App.tsx:HashRouter; frontend/components/SEO.tsx; frontend/index.html; vercel.json; frontend/nginx.conf |
| Current behaviour | Distinct product/catalog content uses # fragments and the same initial HTML shell. Metadata/JSON-LD are added after JS; no canonical links/sitemap/server rendering found. |
| Impact | Crawlers/social previews cannot rely on distinct server URLs or initial product metadata; actual ranking/indexing impact is unmeasured. |
| Reproduction/proof | Static route/build output inspection; Google source linked above. No Search Console or crawler experiment performed. |
| Root cause | SPA hash navigation is the sole storefront routing/rendering model. |
| Remediation recommendation | Decide crawlable path routing and prerender/SSR strategy for public pages; add canonical/sitemap/robots and deployment rewrites with old-link compatibility. |
| Regression testing needed | Direct public deep links, server metadata per product, canonical/structured data, status codes, redirects and social preview fetches. |
| Dependencies | OPS-002, ARCH-003; production domain/routing decision |
| Migration implications | No DB migration expected; URL migration/redirect strategy required. |
| Recommended remediation batch | 11 |

<a id="ux-003"></a>

## UX-003 - Unknown routes and metadata cleanup have incomplete fallbacks

| Attribute | Audit record |
| --- | --- |
| ID | UX-003 |
| Severity | P2 |
| Confidence | High |
| Status | Addressed - client fallback/metadata verified |
| Evidence | Inspect Routes without path='*'; navigate from a described page to title-only cart/profile/admin: description branch never removes/resets meta[name=description]. Browser navigation not executed. |
| File/function references | frontend/App.tsx:Routes; frontend/components/SEO.tsx:description branch; frontend/pages/ProductPage.tsx:not-found |
| Current behaviour | No wildcard route exists. SEO with no description removes social descriptions but retains the preceding normal description; cleanup is empty. |
| Impact | Unknown hash routes render only surrounding chrome, and title-only routes can retain another page's description. |
| Reproduction/proof | Inspect Routes without path='*'; navigate from a described page to title-only cart/profile/admin: description branch never removes/resets meta[name=description]. Browser navigation not executed. |
| Root cause | Page lifecycle assumes every next route will fully overwrite document metadata. |
| Remediation recommendation | Provide an accessible not-found route and explicit page/default metadata cleanup; noindex private/error pages according to rendering strategy. |
| Regression testing needed | Unknown routes, invalid product IDs, description/schema cleanup across customer/private routes, back/forward navigation. |
| Dependencies | UX-002, TEST-001 |
| Migration implications | None; server status/rewrite work may accompany routing migration. |
| Recommended remediation batch | 11 |
