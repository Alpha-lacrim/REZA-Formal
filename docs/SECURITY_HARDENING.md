# Batch 9 security hardening

Verified 2026-10-03 on `codex/batch-09-security`, based on integration `db565f6`.
The dated audit below supersedes the historical behavior in the Batch 1 security audit.
Only synthetic, isolated fixtures were used. No production access, destructive exploitation,
external credential rotation, history rewriting or historical media deletion was performed.

## Findings and boundaries

| Finding / surface | Result | Evidence / remaining boundary |
| --- | --- | --- |
| SEC-002 sessions | Fixed | Persistent session family, rotating refresh, immediate access revocation, failed-refresh cookie clearing; SQLite and separate SQL connections |
| SEC-003 abuse controls | Fixed in application/proxy source | Atomic shared database counters; untrusted forwarding ignored; real disposable Nginx spoofing probes. Deployed peer CIDRs still require owner configuration |
| SEC-004 dormant identity | Disabled / fail closed | Google and OTP return 501; legacy MFA-marked password accounts return 503; no enrollment/linking/recovery assurance claimed |
| SEC-001 uploads | Product protection retained; site/serving strengthened | Seven site fields share decoded image validation and rollback cleanup; disposable proxy blocks active extensions. Historical media inventory and actual deployment remain open |
| FE-008 staff semantics | Fixed | Serialized effective role agrees with backend is_admin; stored flags are not elevated; all sensitive API route/method combinations tested |
| SEC-005 dependencies | Partial | Runtime npm and resolved Python requirements have zero known advisories at this date; five build-only npm affected entries remain under a narrowly scoped temporary gate |
| OPS-002/OPS-003 | Source safeguards added; deployment pending | Explicit origins/hosts, production key guard, response headers, generic health/errors. TLS/HSTS, container/OS scanning and production topology remain Batch 10 |

## Session and CSRF contract

`shop/sessions.py` creates an AuthSession with a UUID, user ownership, a SHA-256
refresh-JTI digest, a keyed password-hash digest, absolute expiry and revocation time.
Raw tokens/passwords are not stored. Every access token, including bearer headers, must
resolve that active session and active user. Password changes invalidate the family.
Pre-Batch-9 stateless JWTs require a fresh sign-in after rollout.

| Cookie | Lifetime | HttpOnly / Secure | SameSite / scope |
| --- | --- | --- | --- |
| access | 15 minutes | HttpOnly; Secure defaults true outside DEBUG | Lax; host-only; path / |
| refresh | Original 7-day absolute session | HttpOnly; same Secure policy | Strict; host-only; path / |

Max-Age/Expires reflect the signed token's remaining lifetime. Rotation preserves the
original refresh expiry and atomically replaces its JTI digest; a reused refresh cannot
rotate again. Logout revokes the entire family using signed cookies or the authenticated
header token, even when a rotated cookie or refresh races logout. Missing, malformed,
expired, disabled-user, changed-password and deleted-user refreshes return 401 and clear
both cookies with matching flags. Login/register replace and revoke the prior browser family.
Other devices retain their own families unless the password/account is changed.

Cookie mutations require Django CSRF validation. Login, registration, refresh, logout and
public content submissions also explicitly require CSRF. Header-only protected account
writes retain their established CSRF-free bearer contract; logout still requires the public
CSRF bootstrap/header. CORS credentials are allowed only for explicit trusted HTTP(S)
origins; wildcard, credential-bearing, path/query/fragment origins are rejected. Production
same-origin hosting defaults to no CORS exceptions. Third-party cookie hosting is unsupported.

The client uses per-tab refresh single flight plus same-origin Web Locks for cookie writes.
A non-secret refresh epoch lets a second tab reuse a completed refresh; the session epoch
invalidates old identity work. No token/user snapshot is added to browser storage. Browsers
without Web Locks/storage retain per-tab coordination; concurrent refresh reuse fails closed
and can require sign-in. A failed logout clears local data and reports that server logout
was not confirmed; it does not show a successful logout toast.

## Authorization and dormant services

The REST staff policy remains `user.is_admin` (custom admin role or Django staff).
Anonymous/customer/admin fixtures exercise every sensitive staff route and supported
method, including public product/settings mutation aliases. Anonymous requests return 401,
customers 403, and authorized staff reach validation/business behavior. Address/order/return
and cancellation fixtures verify sibling-account isolation. Profile/registration cannot set
role/staff flags. Native `/admin/login/` also uses shared IP/account limits with Retry-After; invalid
credentials cannot bypass them via another IP. Native Django UserAdmin add/change/delete
now requires a superuser, even
when a staff user has model permissions. Service-owned product/site/payment/order writes
remain inspection-only in native admin.

Google account linking and token issuance are disabled even if obsolete configuration is
present. No OTP delivery, TOTP enrollment or recovery flow exists; the misleading frontend
challenge is removed. A populated legacy MFA marker is preserved and blocks password login
until an owner chooses a supported recovery/identity policy. There is no password-recovery
endpoint to throttle or present as working. Online payment providers remain absent from
capabilities; supported COD/manual records stay unpaid unless authorized offline workflow
records real payment. Notification outbox/contact/newsletter storage does not claim delivery.
Provider activation requires a separately implemented and verified integration.

## Abuse limits and trusted forwarding

Sensitive counters use ThrottleBucket, a keyed HMAC identity/window and an atomic conditional
increment in SQL. They work across application workers; no raw email/IP is stored in the
bucket. Fixed windows deliberately permit a boundary burst. Safe reads bypass these scoped
write counters; existing general DRF read quotas are still best-effort local-cache controls.

| Endpoint/action | Identity | Limit |
| --- | --- | --- |
| REST login / native admin login | IP plus normalized email / native username across IPs | 10/min plus 20/hour each |
| Registration | IP | 5/hour |
| Refresh | IP | 60/min |
| Contact | IP | 10/hour |
| Newsletter / bespoke | IP | 5/hour / 10/hour |
| Checkout | Account, otherwise IP | 30/hour |
| Quote, including coupon validation | Account, otherwise IP | 300/hour |
| Review / return writes | Account, otherwise IP | 10/hour / 20/hour |

429 includes Retry-After. An untrusted peer's X-Forwarded-For is ignored. Set
`TRUSTED_PROXY_CIDRS` only to verified immediate proxy networks; the default is empty.
A trusted peer must send exactly one parseable IP. The checked-in Nginx overwrites XFF with
its socket peer, so browser-supplied chains cannot change the upstream throttle identity.
Without verified CIDRs, proxy users share the immediate-peer limit. Do not guess broad
private ranges. Additional outer load balancers require explicit topology review. Edge DoS
controls and legitimate NAT/traffic monitoring remain deployment work.

Schedule `python manage.py prune_security_state` daily against the intended application
DB. It deletes only expired sessions/windows and prints counts. This batch did not execute
cleanup against live data. Revoked but unexpired families remain for replay rejection.
Quote checks add constant security work: first-window 1-line/30-line fixture queries are
9/6 versus Batch 8's 4/4; locked checkout is 29/258 versus 24/256. Session authentication
adds one indexed lookup in normal authenticated HTTP requests, outside force-auth fixtures.

## Uploads, content, disclosure and headers

All product and seven site images pass the same still PNG/JPEG/WebP/GIF decoder, extension
and MIME agreement, 10 MiB/file, 8,000-pixel-side and 20-million-pixel limits. Product count
is 12; site fields allow one each. Binary batches are bounded to 40 MiB before decoding;
decoded site outputs also have a total bound. Images are re-encoded to strip trailing active
content/metadata and use UUID filenames. Malformed/animated/spoofed inputs are rejected.
Inline legacy data URLs go through that same validation. Storage writes occur only after
validation, and failed writes remove only new assets. Existing images remain for references
and rollback. Local storage behavior is tested; alternative storage must honor these APIs.
Nginx's 50 MiB body cap includes multipart overhead and is not the image policy itself.

Source review found no application dangerouslySetInnerHTML, innerHTML, insertAdjacentHTML
or eval sinks. User/product/contact/review copy renders as React text; JSON-LD uses
JSON.stringify plus textContent. HTML content is not a supported feature, so no sanitizer
or HTML editor was introduced. External image URLs remain images under the existing policy.

Django uses JSON-only REST responses; production DEBUG false, no wildcard hosts and a
non-placeholder key of at least 50 characters are enforced. Health live/ready return only
status, ignore bearer parsing/throttles, and mask database failures as generic 503. Product
rejection logs and database-wait timeout messages no longer echo validation/driver diagnostics.
This does not prove the deployed logging platform, historical secrets or Git history clean.

| Response boundary | Policy |
| --- | --- |
| Storefront Nginx | CSP self scripts/connect/forms/base, no objects/frames, approved font hosts, images https/data/blob; inline styles retained for existing UI |
| Native Django admin | Private no-store, frame-ancestors none/base self/objects none; native login has shared IP/account counters |
| Django and proxy API | CSP default-src none; frame-ancestors/base/form none; authenticated/auth/staff responses private no-store in Django |
| Media | Extension allowlist, symlinks disabled, CSP sandbox/default-src none, nosniff; legacy HTML/SVG/document paths return 404 |
| All configured locations, including errors | nosniff, DENY framing, strict-origin-when-cross-origin, camera/microphone/geolocation/payment disabled; Nginx version and upstream powered-by hidden |
| HTTPS | Django HSTS only on verified secure requests; redirect/HSTS remain explicit owner configuration |

Local HTTP examples deliberately retain HSTS=0 and redirect false. Production TLS ingress
has not been proven. The supplied port-80 Nginx reports its own scheme; an external TLS
terminator needs a verified forwarding policy before enabling trusted protocol/redirect/HSTS.
No public launch or production-ready TLS claim follows from the disposable header checks.

## Dependencies and repeatable checks

Supported-line updates: Django 5.2.17, DRF 3.17.2, PyJWT 2.15.1, sqlparse 0.6.0;
removed unused Google-auth/pyotp provider dependencies. Requirements remain bounded ranges,
not a hash lock. Python advisory checking uses fresh `pip-audit -r requirements.txt` resolution,
not a claim that the developer's entire existing venv is advisory-free.

Frontend updates include React Router 7.18.4, PostCSS 8.5.28, compatible Vite 6.4.3 and
updated transitive browser tools. Vitest 4.1.11 was deliberately evaluated against Node 22,
Vite 6 and this repository's simple node/jsdom suite before accepting that major upgrade;
all tests, lint, typecheck/build and Chrome journeys pass. No Tailwind major was forced.

Full npm audit has five high affected entries: braces/chokidar/micromatch/fast-glob/tailwindcss,
all from GHSA-vfj7-8cjw-p6xm in development-only repository-authored build globs. No compatible
patched Tailwind 3 dependency route is available in the current report; its suggested fix is
Tailwind 4.3.3 and needs CSS/RTL compatibility work. This remains SEC-005 partial. The exact
package/advisory/dev-only exception expires **2026-11-02 00:00 UTC**. Resolve it before then
or the gate fails. It accepts neither new advisories nor runtime exposure.

`.github/workflows/security.yml` runs production npm audit, that full-audit policy gate,
resolved Python advisory checks and disposable Nginx probes on PRs/program pushes, weekly
and manually. It fails on advisory-service errors. Hosted CI has not run in this local batch.
Container base-image/OS scanning and immutable Python/image resolution remain Batch 10.

## Verification and rollout

See Handoff for final exact counts, durations and commit provenance. Coverage includes full
SQLite and SQL suites, three separate-connection refresh/logout/throttle SQL schedules,
frontend regression/unit/type/lint/build, four real-Django Chrome flows and real Nginx
200/401/403/404/502/media/header/spoofing fixtures. All databases/media/proxies are disposable.

Deploy frontend and backend together. Review backup/schema, apply migrations 0009/0010,
then require re-login for existing sessions. Reversing those migrations deletes only their
new security-state tables and requires sign-in again; do not revert to stateless auth policy
silently. Configure verified proxy CIDRs and exact origins/hosts, confirm secure cookies and
TLS/HSTS at real ingress, schedule pruning and monitor 429/NAT behavior. Review legacy media
with backups. Historical credential rotation and history cleanup remain owner obligations.
The Tailwind advisory exception and legacy MFA account recovery need explicit follow-through.
