# Security audit

## Batch 9 revalidation - 2026-10-03

SEC-002/SEC-003 and FE-008 are fixed in the application; SEC-004 exposed identity
paths are disabled/fail closed. SEC-001 protection now covers site images and a
verified disposable proxy. SEC-005 is partial: runtime npm/resolved Python reports
are clear, while five development-only affected npm entries remain until a
Tailwind compatibility migration. The exact exception expires 2026-11-02 00:00 UTC.
See [security policies, fixtures and rollout](../SECURITY_HARDENING.md).

Full SQL Server: 161/161, zero skips; frontend: 9 Node + 69 Vitest; four Chrome
journeys; ten Nginx status/header/media checks plus two spoofed-XFF probes pass.
Production TLS/proxy CIDRs, HSTS, image/OS scanning, historical media and credential
rotation/history cleanup remain owner/deployment obligations.

The records below preserve the Batch 1 evidence and original behavior. Dated
revalidation/status rows supersede their historical remediation recommendations.

Audit scope is current tracked application/configuration plus isolated fixtures. No credential values were read from ignored environment files or recorded. No exploit against a deployed system was attempted. A current-tree signature scan for private keys, token formats and credential-bearing URLs produced no matches; that is not proof that all secrets or Git history are clean.

## Existing controls and trust boundaries

HttpOnly access/refresh cookies are used; settings accept only Lax/Strict SameSite, and secure flags are configurable. JWT lifetimes are 60 minutes/7 days, while issued cookies have no explicit Max-Age/Expires (browser session cookies). Cookie authentication calls Django CSRF validation for unsafe requests. Public auth/contact/bespoke/newsletter mutations enforce CSRF explicitly. Header JWT remains a separate authentication path. If both a cookie and header exist, the cookie authenticator runs first. CORS uses explicit origins with credentials; production origin/cookie/proxy settings require deployment verification.

Registration validates email/password, normalizes email and assigns no client-supplied role. Profile updates whitelist fields, although validation is incomplete (BE-007). Password login rejects inactive users; JWT user resolution rejects inactive/deleted users. Google tokens use the verification library and checked email claims, not unsigned decoding. send-otp returns 501 without generating/disclosing a code.

REST staff routes check administrator status; customer resources use owner filters. Native Django permissions govern a separate admin surface. UI role checks are convenience only (FE-008). The storefront Nginx proxies /api/, not native /admin/; direct Django/local port or another deployment proxy can expose native admin.

React text interpolation and SEO JSON-LD textContent avoid raw HTML sinks. Search found no app dangerouslySetInnerHTML/eval/innerHTML assignments. This does not neutralize same-origin active uploaded documents. Main product/site ImageFields use serializer image validation; the gallery helper does not. Existing 50 MiB settings are body/memory thresholds, not a complete file validation policy.

No token/password/body logging was found in live application handlers. Product warnings log serializer errors; upload debug info logs field names/content type. Returning str(IntegrityError) from product mutation may disclose database diagnostic details to staff. Wait-for-DB prints driver exceptions on timeout; deployment logging should avoid connection-secret leakage. No connection secrets were tested or displayed.

## Dependency baseline: 2026-09-10

`npm.cmd audit --json` initially failed in sandbox, then completed outside it with exit 1: **6 affected package entries (5 high, 1 moderate; 0 critical)**. These are registry labels, not six demonstrated storefront exploits. No dependency was updated.

| Locked package | Version | npm classification / applicability |
| --- | --- | --- |
| baseline-browser-mapping | 2.10.42 | Moderate; development build dependency; invalid-input termination advisory |
| browserslist | 4.28.5 | High; development build tooling; memory/custom-stats input advisories |
| nanoid | 3.3.15 | High; development dependency; non-secure/custom generator loop conditions |
| postcss | 8.5.10 | High; development CSS tool; source-map file-reading advisories |
| react-router | 7.18.1 | High in npm output; upstream calls RSC-specific advisory moderate |
| react-router-dom | 7.18.1 | High dependency propagation from react-router |

The [React Router maintainer advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2) says the condition applies to unstable RSC APIs. This client HashRouter SPA has no RSC server path, so application exposure to that advisory was **not established**. The [PostCSS maintainer advisory](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q) concerns attacker-controlled CSS/source-map input; the repository compiles its own CSS, so the threat boundary is build inputs, not public checkout requests. Additional npm-reported follow-up advisories require rechecking at remediation time.

`pip check` passes, but `python -m pip_audit --version` fails because the module is not installed. Python/container OS advisory scanning was not completed. Requirements are bounded ranges rather than a complete lock with hashes; container tags are mutable. A July zero-advisory record must not be reused as current evidence.

## Historical secrets and unresolved owner obligations

Handoff records a previously committed SQL password and obsolete Gemini key exposure concern. Later July first-launch notes say fresh development secrets were generated, the former SQL value is unused by the new development database and the ignored frontend Gemini key was removed. Those historical statements were not revalidated against external credential stores. Rotation/revocation in any other environment and repository-history cleanup remain unverified. Do not paste the old value or inspect it into audit logs; handle history work separately with the owner's existing approval rules.

<a id="sec-001"></a>

## SEC-001 - Gallery upload bypasses image validation and persists before validation

| Attribute | Audit record |
| --- | --- |
| ID | SEC-001 |
| Severity | P1 |
| Confidence | High |
| Status | Fixed - product/site validation and disposable proxy verified; historical/deployment review open |
| Batch 9 revalidation | 2026-10-03: seven site fields share decoder/budgets/random names/staged rollback; native site writes are read-only; Nginx blocks active extensions and symlinks. Ten status/header/media fixtures and two forwarding probes pass. Existing media retained. |
| Batch 2 revalidation/fix | 2026-09-14: API tests reproduced HTML/SVG acceptance, rejected-write orphans and appended active content. Product primary/gallery files now share decoded/re-encoded still-image validation (PNG/JPEG/WebP/GIF; 10 MiB per file, 8000 px per side, 20 million pixels, 12 gallery entries), MIME/extension checks, URL/shape validation and transaction-owned storage cleanup. Newly written files are removed on validation/DB/storage failure; existing referenced files are retained. Both REST mutation surfaces are covered and native catalog writes are read-only. Nginx media adds restrictive CSP sandbox for legacy active content; live Nginx serving remains unverified because Docker is unavailable. Eight media tests pass; combined media/inventory/variant suite: 15. No historical media was deleted or quarantined. |
| Evidence | P04: harmless .html upload accepted with 201 and saved. P05: invalid negative-price request returns 400 but leaves a .txt file. Nginx serves media by extension without attachment/sandbox policy. |
| File/function references | backend/shop/views.py:139,182,214; backend/reza_backend/settings.py:DATA_UPLOAD_MAX_MEMORY_SIZE; frontend/nginx.conf:30 |
| Batch 1 behaviour | Gallery files keep the submitted extension and are read/stored directly without image decoding, type allowlist, dimension/file-count/explicit byte checks. Files save before product validation/transaction. JSON gallery URLs are also unrestricted. |
| Impact | Staff-uploaded active content is served on the application's media origin; stored-script execution is an exposure risk. Rejected writes leave orphans and large inputs consume memory/storage. No browser exploit was run. |
| Reproduction/proof | P04: harmless .html upload accepted with 201 and saved. P05: invalid negative-price request returns 400 but leaves a .txt file. Nginx serves media by extension without attachment/sandbox policy. |
| Root cause | Gallery helper bypasses ImageField and storage writes are outside domain success/cleanup ownership. |
| Remediation recommendation | Contain active uploads immediately; use shared verified image pipeline, bounded content/count/dimensions, canonical URL policy and safe serving origin/headers; coordinate cleanup after DB commit/failure. |
| Regression testing needed | MIME/extension mismatch, HTML/SVG/polyglot, oversized/decompression inputs, invalid product rollback, replacement/delete and every public/admin upload surface. |
| Dependencies | FE-002, OPS-002, OPS-003; native admin upload review |
| Migration implications | Inventory/quarantine existing media and inline galleries with backup; no blind deletion. Optional asset model migration. |
| Recommended remediation batch | 2 (complete media pipeline in 7/9) |

<a id="sec-002"></a>

## SEC-002 - Logout cannot revoke a copied refresh token

| Attribute | Audit record |
| --- | --- |
| ID | SEC-002 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - Batch 9 session rotation/revocation |
| Batch 9 revalidation | 2026-10-03: AuthSession family, JTI/password digests, 15-minute access, absolute seven-day rotating refresh, immediate cookie/header logout revocation and failed-refresh clearing. Access/reuse/disabled/password/expiry/CSRF and separate SQL refresh/logout schedules pass; migration 0009 requires re-login. |
| Evidence | P16: restore an in-memory synthetic refresh after CSRF-protected logout: refresh=200 and me=200. Disable user: refresh=200, me=401. No token values were emitted. |
| File/function references | backend/shop/views.py:448,459; backend/reza_backend/settings.py:SIMPLE_JWT,INSTALLED_APPS; frontend/contexts/GlobalContext.tsx:354 |
| Batch 1 behaviour | Logout deletes browser cookies only. Refresh validates signed token and issues access without rotation/revocation or checking current user activity; access use still checks the user. |
| Impact | A copied refresh token remains replayable after logout until expiry. Disabled-user refresh reports success but its access token is rejected. Network-failed logout can leave browser cookies active. |
| Reproduction/proof | P16: restore an in-memory synthetic refresh after CSRF-protected logout: refresh=200 and me=200. Disable user: refresh=200, me=401. No token values were emitted. |
| Root cause | Stateless token lifetime is the only revocation boundary; client success messaging ignores server logout failure. |
| Remediation recommendation | Define revocation/session policy, align refresh with current user status, and coordinate rotation/replay handling with shared frontend refresh; clarify failed logout state. |
| Regression testing needed | Logout replay, password/account disable, refresh reuse/expiry, concurrent refresh and network-failed logout. |
| Dependencies | FE-003, TEST-001; owner session policy |
| Migration implications | Blacklist/session records may require migrations and rollout invalidation; do not rotate external secrets in this batch. |
| Recommended remediation batch | 9 (coordinate API work in 5) |

<a id="sec-003"></a>

## SEC-003 - Throttle identity and cache are weak across proxies/workers

| Attribute | Audit record |
| --- | --- |
| ID | SEC-003 |
| Severity | P2 |
| Confidence | High |
| Status | Fixed - shared atomic counters and explicit proxy trust; deployment CIDRs pending |
| Batch 9 revalidation | 2026-10-03: ThrottleBucket atomic conditional increments share workers; HMAC keys contain no raw IP/email; normalized account and IP REST/native-admin login limits; bounded contact/register/refresh/quote/checkout/review/bespoke/return/newsletter writes. Untrusted XFF ignored; Nginx overwrites it. Separate SQL counter creation/update and real proxy spoofing fixtures pass. Migration 0010; daily prune and verified deployment CIDRs required. |
| Evidence | Static configuration and installed DRF get_ident implementation; no trusted-proxy sanitization or shared cache configured. Existing throttle test exercises one in-process instance. |
| File/function references | backend/shop/throttles.py:ScopedIPRateThrottle; backend/reza_backend/settings.py:REST_FRAMEWORK; backend/Dockerfile:CMD; frontend/nginx.conf:25 |
| Batch 1 behaviour | Django default local-memory cache is used by three Gunicorn workers. NUM_PROXIES is unset; Nginx appends incoming X-Forwarded-For. DRF then uses the supplied chain for IP identity. |
| Impact | Limits are per worker and forwarded-header variation can change login/register/contact identity; exact abuse limits are not guaranteed. |
| Reproduction/proof | Static configuration and installed DRF get_ident implementation; no trusted-proxy sanitization or shared cache configured. Existing throttle test exercises one in-process instance. |
| Root cause | Development throttle/cache defaults are used without an explicit edge trust model. |
| Remediation recommendation | Set verified client-IP policy at trusted ingress, shared cache or edge controls and monitor limits; preserve account-scoped checkout behavior. |
| Regression testing needed | Header spoofing through real proxy, multiple workers, legitimate NAT traffic and throttle recovery; confirm 429 behavior. |
| Dependencies | OPS-002, OPS-003, TEST-003 |
| Migration implications | External shared cache/ingress configuration; no DB migration expected. |
| Recommended remediation batch | 9 |

<a id="sec-004"></a>

## SEC-004 - Dormant identity features do not share a complete MFA policy

| Attribute | Audit record |
| --- | --- |
| ID | SEC-004 |
| Severity | P2 |
| Confidence | Medium |
| Status | Disabled - Batch 9 dormant paths fail closed |
| Batch 9 revalidation | 2026-10-03: Google and OTP return 501; legacy MFA-marked accounts return 503 without clearing markers/bypassing MFA; frontend incomplete TOTP challenge removed; unused provider dependencies/configuration removed. Recovery/provider enrollment is not implemented. |
| Evidence | Static branch comparison; GOOGLE_OAUTH_CLIENT_ID is a gate, Google frontend absent, and migration 0005 clears historical secrets. |
| File/function references | backend/shop/views.py:430,504,545,552; backend/shop/models.py:User.two_factor_secret; frontend/components/AuthModal.tsx |
| Batch 1 behaviour | Password login checks two_factor_secret. Google login links by verified email and issues tokens without checking that field. OTP enrollment/delivery/recovery are absent. |
| Impact | If Google is configured and a user has a populated second-factor secret, login methods have different assurance. This is not evidence that such accounts/configuration exist. |
| Reproduction/proof | Static branch comparison; GOOGLE_OAUTH_CLIENT_ID is a gate, Google frontend absent, and migration 0005 clears historical secrets. |
| Root cause | Partially retired MFA fields coexist with an independently implemented social login path. |
| Remediation recommendation | Decide supported identity methods and account-link/MFA assurance before enabling Google or enrollment; explicitly disable unsupported paths or complete them. |
| Regression testing needed | Verified Google claims, existing MFA account, inactive user, linking collisions, replay/recovery and intentionally disabled provider behavior. |
| Dependencies | SEC-002; owner identity-provider/MFA decisions |
| Migration implications | Potential identity-link/enrollment/recovery schema; preserve intentional removal of unsafe legacy secrets. |
| Recommended remediation batch | 9 |

<a id="sec-005"></a>

## SEC-005 - Known dependency advisories and incomplete repeatable scanning

| Attribute | Audit record |
| --- | --- |
| ID | SEC-005 |
| Severity | P2 |
| Confidence | High |
| Status | Partial - runtime checks clear; five build-only npm entries remain |
| Batch 9 revalidation | 2026-10-03: supported Python lines and frontend dependencies updated; npm ci/lint/type/build/78 tests/Chrome pass. npm production audit and pip-audit requirements resolution report zero known vulnerabilities. GHSA-vfj7-8cjw-p6xm affects five dev-only build entries; exact scoped gate expires 2026-11-02. Tailwind major requires compatibility work. Scheduled security/proxy workflow added; hosted execution and OS/image scan remain unverified. |
| Evidence | Exact npm result/version table above and TESTING_CI_AUDIT commands. RSC advisory is not reached by the current SPA architecture; Python advisory status unknown. |
| File/function references | frontend/package-lock.json; frontend/package.json; backend/requirements.txt; .github/workflows/ci.yml; Dockerfiles |
| Batch 1 behaviour | npm audit reports six affected entries. CI has no advisory/OS scans; Python requirements resolve ranges; pip-audit is unavailable locally. |
| Impact | Known package risks and future resolution drift are not automatically triaged; applicability must be distinguished from raw severity. |
| Reproduction/proof | Exact npm result/version table above and TESTING_CI_AUDIT commands. RSC advisory is not reached by the current SPA architecture; Python advisory status unknown. |
| Root cause | Security verification is manual/historical and build dependencies/images are not fully pinned. |
| Remediation recommendation | Triage current advisories by reachable usage, update in a dedicated batch with checks, lock reproducible Python/image inputs as appropriate and automate scanning. |
| Regression testing needed | Clean installs, typecheck/build/backend suite after updates; verify advisory reports and document justified exceptions with expiry. |
| Dependencies | TEST-002, OPS-001, OPS-002 |
| Migration implications | No schema change expected from scanning; dependency upgrades require migration drift checks. |
| Recommended remediation batch | 9 (scanning foundation in 3) |

DRF documents proxy-count and cache configuration for throttles and does not position its non-atomic application throttles as comprehensive brute-force/DoS protection. [DRF throttling documentation](https://www.django-rest-framework.org/api-guide/throttling/). Django separately documents that uploaded content requires safe serving and validation boundaries. [Django user-uploaded content guidance](https://docs.djangoproject.com/en/5.2/topics/security/#user-uploaded-content).
