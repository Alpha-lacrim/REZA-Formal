# Commerce operations

This document defines the honest operating boundary for REZA Formal. It is an
operational checklist, not a legal guarantee. Customer-facing promises and
business policies must be reviewed by the owner before launch.

## Provider-free order flow

Until external providers are configured, the supported checkout methods are:

- cash on delivery (COD), only for destinations and orders the business accepts;
- manual payment, where staff provide official instructions and verify the
  transaction reference before marking the order paid.

The server remains authoritative for product availability, unit prices,
discounts, shipping charges, tax, and the final total. Creating an order number
does not prove payment. Staff must keep payment state separate from fulfillment
state and must not ship a manual-payment order until its payment is verified.

For COD, staff confirm the order, prepare it, record the shipment or manual
tracking reference, and collect payment at delivery. Failed or refused delivery
must be recorded before stock, fees, or a refund are adjusted.

## Integrations still required

These features require a provider choice, account, credentials, and production
testing. A simulated success response must never be shown as a real service.

- **Online payment:** gateway adapter, merchant credentials, signed callback or
  webhook verification, amount/currency reconciliation, replay protection, and
  a sandbox-to-production launch review.
- **Transactional email/SMS:** verified sender, provider credentials, templates,
  delivery monitoring, retries, and unsubscribe handling where applicable.
- **Shipping carrier:** supported destinations, rate/label API, pickup process,
  tracking events, failed-delivery rules, and carrier account credentials.
- **Tax/accounting:** owner-approved pricing unit, tax rules, invoice fields, and
  financial export or accounting integration.
- **Production media/monitoring:** durable object storage, error monitoring,
  uptime checks, alert delivery, and access-controlled operational logs.

## Order and payment responsibilities

- Recalculate every total on the server; never accept browser-submitted totals.
- Store immutable order-item snapshots so later catalog edits do not rewrite an
  order's history.
- Make checkout idempotent and protect stock changes with database transactions.
- Record payment attempts and provider references without storing card secrets.
- Verify online payment from the trusted provider callback/webhook, not from the
  customer's browser redirect.
- Use explicit, audited transitions for payment, fulfillment, cancellation,
  return, and refund states. Revenue reports must include only qualifying paid
  orders under the business's approved accounting rule.
- Restrict order and customer data to the customer concerned and authorized
  staff. Avoid placing personal or payment information in application logs.

## Backups and recovery

- Back up the SQL Server database and uploaded media independently on a defined
  schedule, encrypt backups, and restrict restore access.
- Keep more than one retention point and a copy outside the application host.
- Test a restore into an isolated environment before launch and repeat the drill
  after material schema or infrastructure changes.
- Record recovery time and recovery point objectives, the responsible operator,
  and the procedure for pausing orders during an incident.
- Never treat a persistent Docker volume as a backup.

## Cancellation, returns, and refunds

- Link every request to an order, requester, reason, timestamps, evidence, and
  staff decision.
- Prevent duplicate stock restoration or duplicate refunds with transactional,
  idempotent operations.
- For paid orders, confirm the captured amount and prior refunds before issuing
  another refund. Record the refund method and external reference.
- Do not mark a refund complete until the provider or manual financial record
  confirms it. Explain any bank/provider processing delay separately.
- Publish only owner-approved eligibility, timing, shipping-cost, bespoke-item,
  and warranty terms. Applicable non-waivable customer rights take precedence.

## Launch checklist

- [ ] Replace development/COD defaults with the owner-approved payment methods;
      remove every unavailable option from checkout.
- [ ] Verify prices, currency unit, shipping zones/rates, tax, stock, variants,
      cancellation rules, and customer contact details.
- [ ] Review the customer policy pages and replace placeholders or unsupported
      marketing, delivery, warranty, review, and trust-badge claims.
- [ ] Configure HTTPS, secure cookies, CSRF protection, rate limits, production
      hosts/origins, a least-privilege database account, and staff access controls.
- [ ] Run migrations on a staging copy, exercise COD/manual checkout and refund
      flows, and test any provider in its sandbox with replay/failure cases.
- [ ] Complete browser, mobile, accessibility, concurrency, backup/restore, and
      security checks; confirm monitoring and alerts reach a responsible person.
- [ ] Document support ownership, fulfillment cutoffs, incident handling, data
      retention, privacy requests, and the production rollback procedure.
