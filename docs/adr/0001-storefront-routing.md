# ADR 0001: retain hash routing until the public deployment rollout

Date: 2026-10-03. Status: accepted for Batch 11; revisit before storefront SEO launch.

## Context

`frontend/App.tsx` uses HashRouter. Existing links, browser tests and documented
Vercel deployments use `/#/product/:id`. Container Nginx already has
`try_files $uri $uri/ /index.html`, whereas `vercel.json` has no SPA rewrites.
The supported frontend-only Vercel deployment and same-origin container deployment
both remain in scope; no chosen production canonical domain or redirect strategy
is recorded. Production deployment remains disabled in the operations program.

BrowserRouter would give crawlers distinct request paths, but requires hosting
rewrites and legacy hash-link handling. It would still serve the same initial
HTML, so it alone cannot provide product social previews, server product metadata
or genuine product/not-found HTTP status codes. Hash fragments are not sent to
the server and cannot be redirected there. [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics#use-history-api)
supports a deliberate move to History API routes for discoverable public content.

## Decision

Retain HashRouter in this batch. Preserve deep-link refresh and the supported
static hosting contract. Do not invent a production hostname, emit fragment
canonicals, canonicalize all products to the homepage, or advertise path routes
that do not exist. Home gets the current origin's root canonical in React;
other routes omit canonical links. Product Offer/OG URLs retain the working hash
link, without claiming it is a distinct crawlable document. Route metadata resets
on transitions/unmount and private/error views have client noindex metadata.

Add a static `robots.txt` allowing the public document. It cannot distinguish
private hash views and is not an access-control mechanism. Do not list hash URLs
in a sitemap. An XML sitemap is deliberately deferred until a selected canonical
origin and crawlable public route model exist. This is an unresolved SEO launch
requirement, not a completed sitemap implementation. Initial HTML has truthful
generic social text; product-specific previews still require prerendering/SSR.

## Future migration acceptance criteria

1. Select the public origin, rendering strategy (SSR or reliable catalog-aware
   prerendering), freshness/unpublish behavior and deployment topology.
2. Add BrowserRouter in a dedicated commit; handle existing `/#/...` links in the
   client before route matching, preserving product IDs and query parameters.
3. Verify Nginx's existing fallback and add Vercel rewrites if that host remains
   supported. Keep API/media/static/health and missing assets outside fallback.
4. Emit absolute path canonicals, server-rendered title/description/social/product
   data, published-product XML sitemap and an origin-qualified robots sitemap
   entry. Exclude private/unpublished/error views and tracking/filter duplicates.
5. Return appropriate public not-found statuses and test direct URLs, reload,
   back/forward, old hash links, canonical/OG/schema URLs, product availability
   changes and unauthenticated social-crawler fetches on every supported host.

No routing migration, Nginx change, new public configuration variable, deployment
or database migration is performed by this decision.
