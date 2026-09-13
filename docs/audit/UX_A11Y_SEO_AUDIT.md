# UX, accessibility, RTL and SEO audit

This is a static UI/markup review, not a WCAG conformance statement or a search-index measurement. No browser screenshot, keyboard walkthrough or assistive technology tool was run.

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
| Status | Open - accessibility gap |
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
| Status | Open - SEO limitation |
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
| Status | Open - confirmed navigation/metadata gap |
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
