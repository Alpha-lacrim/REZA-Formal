# Testing, CI and operations audit

The original baseline commands and probes below ran on September 10, 2026 on Windows/PowerShell in the nested repository. Documentation was reviewed on September 13 against unchanged application files. After the initial completion handoff, the owner requested a fresh completion check before publication; those six repeated checks are recorded separately below. Isolated Django settings use in-memory SQLite and were asserted again in the original probes. No test used the configured SQL Server or live commerce data. Build output is ignored and not committed.

## Exact baseline commands and results

| Working directory | Command | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS; System check identified no issues (0 silenced) |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS; No changes detected |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS, exit 0; 50 tests in 5.794s; test DB destroyed; expected invalid-product warning logged, no failing test |
| frontend | `npm.cmd run typecheck` | PASS; tsc --noEmit; also repeated independently after the initial combined typecheck/build invocation |
| frontend | `npm.cmd run build` (sandbox) | FAIL, exit 1; esbuild could not read parent directory / resolve vite.config.ts due to Access is denied |
| frontend | `npm.cmd run build` (approved execution outside sandbox) | PASS, exit 0; Vite 6.4.3, 1,738 modules, built in 4.91s; main JS 344.28 kB, admin 80.65 kB, CSS 54.98 kB |
| root | `docker compose config --quiet` | PASS, exit 0; two warnings that the user's .docker/config.json could not be read. Config was not printed, so interpolated secrets were not exposed |
| root | `backend/.venv/Scripts/python.exe -m pip check` | PASS; No broken requirements found |
| root | `backend/.venv/Scripts/python.exe -m pip_audit --version` | UNAVAILABLE; No module named pip_audit; no Python advisory scan claimed |
| frontend | `npm.cmd audit --json` (sandbox) | BLOCKED by advisory endpoint/network/cache access error, exit 1 |
| frontend | `npm.cmd audit --json` (approved execution outside sandbox) | Completed, exit 1 for findings: 6 affected entries, 5 high/1 moderate. No install/update/fix performed |
| frontend | `node --version`; `npm.cmd --version` | v22.21.0; 10.9.4 |

Required baseline checks pass after the build access retry. A nonzero dependency advisory result is an audit finding, not a repaired or silently waived vulnerability. Documentation-only merge gates are completeness, consistency, secret review and an unchanged application tree; production launch gates remain open.

Installed backend versions: Django 5.2.16, DRF 3.17.1, SimpleJWT 5.5.1, mssql-django 1.7.3, pyodbc 5.3.0, Pillow 12.3.0, pyotp 2.10.0, google-auth 2.55.2, Gunicorn 23.0.0 and WhiteNoise 6.12.0. These local resolutions are not a reproducible lock.

## September 13 completion recheck before publication

All six required checks were rerun after the owner's explicit request to verify that Batch 1 was complete. Application source, configuration and dependencies were unchanged from the audited tree.

| Working directory | Exact command | Observed result |
| --- | --- | --- |
| backend | `.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings` | PASS, exit 0; no issues (0 silenced) |
| backend | `.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings` | PASS, exit 0; no changes detected |
| backend | `.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings` | PASS, exit 0; 50 tests in 5.950s; test DB destroyed; expected invalid-product validation warning |
| frontend | `npm.cmd run typecheck` | PASS, exit 0; tsc --noEmit |
| frontend | `npm.cmd run build` (sandbox) | FAIL, exit 1; esbuild parent-directory access denied and vite.config.ts resolution failed |
| frontend | `npm.cmd run build` (approved execution outside sandbox) | PASS, exit 0; Vite 6.4.3, 1,738 modules, 3.75s; main JS 344.28 kB, admin 80.65 kB, CSS 54.98 kB |
| root | `docker compose config --quiet` | PASS, exit 0; two unreadable global .docker/config.json warnings; interpolated config was not printed |

Document checks confirmed all ten requested audit files, roadmap/program/handoff, 43 canonical records with every required attribute, matching register classification/batches, all 18 hypothesis rows, and valid local links/anchors/source paths. Git review confirmed 14 intended Markdown changes only and an unchanged application/AGENTS tree; the baseline-to-merge whitespace check passed. The audit is complete for analysis/documentation scope. Existing defects remain Open, and SQL Server/browser/production evidence remains a recorded future gate. Dependency scans and disposable probes were not rerun during this publication recheck.

## Existing test coverage inventory

| File | Test methods | Coverage inspected |
| --- | --- | --- |
| shop/tests.py | 22 | ODBC options, registration/password/email validation, JWT refresh, Google verification mocks, OTP disabled, contact protection, order totals/cancel, product validation, settings clear, seed and SameSite |
| shop/test_commerce_api.py | 10 | Quotes/coupons, idempotency/ownership, snapshots/inventory, online rejection, cancellation, scoped address/cart/wishlist, review/return eligibility, admin endpoints |
| shop/test_commerce_models.py | 9 | Model constraints/normalization, admin registration/inlines, one MigrationExecutor legacy backfill |
| shop/test_commerce_routes.py | 3 | Actual route integration, default shipping/idempotency, order/payment lifecycle, multi-item returns/note update |
| shop/test_product_variants.py | 2 | Staff create/reconcile variants; default variant and inactive visibility |
| shop/test_security.py | 4 | Public/auth cookie CSRF, lead CSRF, one in-process registration throttle |

The suite combines APIRequestFactory/force_authenticate, APIClient and focused CSRF-enforced clients. Those forced authentication tests do not exercise cookie authentication. The one TransactionTestCase is a migration test, not concurrent SQL validation. No row-lock/thread race tests, query budgets, native admin mutation tests, discount-refund allocation tests, upload-negative matrix or coverage percentage gate was found. No frontend automated test files/runner/test script were tracked.

## CI and infrastructure trace

GitHub Actions runs backend Python 3.11 install/check/drift/tests, frontend Node 22 npm ci/typecheck/build, and Compose config. It grants contents:read and cancels older runs per ref. Push branches are main, dev and feature/**; pull_request is unrestricted. Direct pushes to codex/** do not trigger the push workflow. There is no SQL Server service, frontend test/lint, image build/scan, deployment smoke, dependency advisory or backup/restore job.

Compose is a development stack: SQL Server 2022 Developer tag, loopback DB/backend ports, all-interface frontend port; backend waits for SQL, may create DB, migrates, collects static, seeds, then runs 3 Gunicorn workers. SQL data/media/static are separate named volumes, with media mounted read-only in Nginx. Health readiness uses SELECT 1; it does not check migrations/provider readiness. Config validation is not an image build, service health or deployment test.

Backend Dockerfile runs as inherited root, retains build tools, and has no capability drop/read-only filesystem/resource profile. Nginx uses a mutable 1.27-alpine tag; Python/node/SQL tags are also not digest pinned. TLS is absent here; debug/insecure-cookie/SA/unencrypted-DB defaults are intended for development. Production must have explicit configuration and a supported SQL edition.

Vercel config builds only frontend/dist; it supplies no Django/SQL host or API/media rewrite. VITE_API_BASE is public build-time configuration; the backend must remain reachable with the documented same-site cookie/CSRF topology.

## Audit probes and observed proof ledger

The disposable Python probe reproduced source behavior using migrated in-memory SQLite, synthetic .invalid accounts and a TemporaryDirectory media store. It did not add regression tests or change the application. The full script is retained below as documentation; the temporary executable was removed before commit. P08 intentionally sequences a stale loaded instance around checkout, not two real SQL transactions.

| Probe | Exact observed facts | Finding |
| --- | --- | --- |
| P01 | create/cancel URL modules = shop.commerce_views | ARCH-004 |
| P02 | 1 product: 5 queries/2 review aggregates; 2 products: 7 queries/4 aggregates | PERF-001 |
| P03 | multipart product: HTTP 201; images stored as str; inline data in DB/response=true | FE-002 |
| P04 | harmless HTML gallery: HTTP 201; one .html file stored | SEC-001 |
| P05 | invalid product: HTTP 400; one new orphan .txt file | SEC-001 |
| P06 | cancelled order; payment record cancelled; order payment_status unpaid | BE-006 |
| P07 | invalid tracking update: HTTP 400; order persisted processing | BE-005 |
| P08 | stock after sale: 8; after stale name-only update: 10 | BE-001 |
| P09 | native Payment/Return admin status writable=true | BE-002 |
| P10 | native variant stock: 99; product projection: 10; new movements: 0 | BE-002 |
| P11 | 2 units bought, 1 returned; paid: 100; refund: 100; status refunded | BE-003 |
| P12 | partially_refunded; amount_recorded=false | BE-004 |
| P13 | newsletter: first HTTP 201/repeat HTTP 400 | BE-008 |
| P14 | coupon 101% -> HTTP 409 coupon_exists; invalid shipping days -> HTTP 409 shipping_code_exists | BE-007 |
| P15 | orders: count 35/returned 25/pages 2/next null | FE-005 |
| P16 | copied refresh after logout: refresh 200/me 200; disabled user: refresh 200/me 401 | SEC-002 |
| P17 | actual transpiled API adapter + mocked fetch: 2 concurrent protected 401s -> 2 refresh calls | FE-003 |
| P18 | actual cart reader + mocked localStorage: v1 has 1 item/v2 absent -> 0 loaded | FE-007 |

P17/P18 use Node plus the installed TypeScript transpiler; they prove isolated adapter/reader behavior, not a mounted React/browser end-to-end workflow. FE-001/FE-004/FE-006 are source-based execution schedules and still require browser regression coverage.

## Verification not performed

No SQL Server integration/load/locking test; no live Docker build/start or external deployment smoke; no keyboard/screen-reader/mobile/visual browser check; no production performance timing; no Python/container vulnerability scan; no backup/restore or external secret rotation/history purge. The prior Handoff records July smoke tests, which are not rerun results.

The current tracked-tree secret signature scan returned zero matches for private-key blocks, common API token formats and credential URLs. Full audit diff review must additionally reject copied environment/cookie/token/password values. Historical exposure is carried forward in SECURITY_AUDIT and Handoff.

<a id="test-001"></a>

## TEST-001 - Frontend behavior has no automated regression suite

| Attribute | Audit record |
| --- | --- |
| ID | TEST-001 |
| Severity | P2 |
| Confidence | High |
| Status | Open - coverage gap |
| Evidence | Tracked-file and package/CI inspection; FE-001..FE-007 illustrate missing behavioral coverage. |
| File/function references | frontend/package.json; frontend source tree; .github/workflows/ci.yml:frontend |
| Current behaviour | Only dev/build/typecheck/preview scripts exist; no tracked frontend tests, test runner or test CI step. |
| Impact | Effects, API races, account synchronization, upload forms and pagination can regress while typecheck/build remain green. |
| Reproduction/proof | Tracked-file and package/CI inspection; FE-001..FE-007 illustrate missing behavioral coverage. |
| Root cause | Verification relies on compilation and historical manual smoke testing. |
| Remediation recommendation | Add a focused component/adapter suite and critical browser journeys with deterministic API fixtures; prioritize confirmed defects. |
| Regression testing needed | Auth hydration/refresh/logout, cart/wishlist identity, quote/checkout replay, pagination, staff media and keyboard flows. |
| Dependencies | Batch 2 defect-specific coverage first; FE findings define scenarios. |
| Migration implications | None. |
| Recommended remediation batch | 3 |

<a id="test-002"></a>

## TEST-002 - Linting is absent and TypeScript safety checks are relaxed

| Attribute | Audit record |
| --- | --- |
| ID | TEST-002 |
| Severity | P2 |
| Confidence | High |
| Status | Open - tooling gap |
| Evidence | Scripts/config inspection and 48 lexical any tokens in api.ts. This is a tooling/debt finding, not proof every assertion fails. |
| File/function references | frontend/package.json; frontend/tsconfig.json; .github/workflows/ci.yml; frontend/services/api.ts |
| Current behaviour | No lint script/config/job; strict/noImplicitAny/strictNullChecks are not enabled; unchecked request<T> and extensive any hide wire contracts. |
| Impact | Passing typecheck does not detect missing effect dependencies or invalid response shapes; maintenance errors lack automatic checks. |
| Reproduction/proof | Scripts/config inspection and 48 lexical any tokens in api.ts. This is a tooling/debt finding, not proof every assertion fails. |
| Root cause | Generated baseline TS config and no agreed lint/runtime DTO policy. |
| Remediation recommendation | Introduce scoped lint and strictness gates with a measured adoption plan; validate API data as unknown at the boundary. |
| Regression testing needed | Meaningful adapter malformed-payload tests; lint hooks rules on hydration; build/typecheck after gradual strictness changes. |
| Dependencies | ARCH-003, TEST-001 |
| Migration implications | None. |
| Recommended remediation batch | 3 (API typing work in 5) |

<a id="test-003"></a>

## TEST-003 - SQLite tests do not establish SQL Server transactional safety

| Attribute | Audit record |
| --- | --- |
| ID | TEST-003 |
| Severity | P1 |
| Confidence | High |
| Status | Open - coverage gap |
| Evidence | Suite inventory and settings; mssql-django emits lock hints whereas SQLite does not implement equivalent SELECT FOR UPDATE. |
| File/function references | backend/reza_backend/test_settings.py; backend/shop/test_commerce_models.py:261; .github/workflows/ci.yml |
| Current behaviour | All automated DB checks use SQLite; no SQL Server CI service or concurrent transaction tests exist. |
| Impact | Most consequential stock/coupon/idempotency/refund assumptions lack production-engine evidence despite 50 passing tests. |
| Reproduction/proof | Suite inventory and settings; mssql-django emits lock hints whereas SQLite does not implement equivalent SELECT FOR UPDATE. |
| Root cause | Hermetic tests are the only automated database lane; historical manual SQL smoke was sequential. |
| Remediation recommendation | Keep fast isolated tests and add an isolated SQL Server lane with real separate connections and migration fixtures; never use production data. |
| Regression testing needed | Final-unit checkout, last coupon use, same key, edit/cancel/return/refund races, deadlock handling, length/Decimal/collation and rollback. |
| Dependencies | DB-002, BE-001..BE-005; disposable SQL infrastructure. |
| Migration implications | Test database migrations only; owner database/volumes remain untouched. |
| Recommended remediation batch | 3 (required evidence for Batch2 concurrency fixes) |

<a id="ops-001"></a>

## OPS-001 - Remediation branch pushes are outside CI triggers

| Attribute | Audit record |
| --- | --- |
| ID | OPS-001 |
| Severity | P2 |
| Confidence | High |
| Status | Open - confirmed CI gap |
| Evidence | Static workflow branch filter compared with required program branches. |
| File/function references | .github/workflows/ci.yml:3; docs/CODEX_PROGRAM.md |
| Current behaviour | Push workflow includes main/dev/feature/**, but neither codex/remediation-program nor batch branches; PR workflow still applies. |
| Impact | Direct integration/batch pushes can bypass automated baseline checks; no actual failed/absent hosted run was queried. |
| Reproduction/proof | Static workflow branch filter compared with required program branches. |
| Root cause | CI predates remediation branch naming. |
| Remediation recommendation | Include authorized program branches or enforce required PR checks before integration; retain least-privilege workflow permissions. |
| Regression testing needed | Trigger on test batch/integration push and PR; confirm actual hosted jobs and required checks. |
| Dependencies | TEST-001, TEST-002, TEST-003 |
| Migration implications | None. |
| Recommended remediation batch | 3 |

<a id="ops-002"></a>

## OPS-002 - Runtime containers retain development defaults

| Attribute | Audit record |
| --- | --- |
| ID | OPS-002 |
| Severity | P2 |
| Confidence | High |
| Status | Open - deployment hardening gap |
| Evidence | Static Compose/Dockerfile/entrypoint review. Config validation passed; runtime credentials/config were not dumped. |
| File/function references | docker-compose.yml; backend/Dockerfile; frontend/Dockerfile; backend/docker-entrypoint.sh |
| Current behaviour | Debug/insecure-cookie/default-SA/no-encryption development options, root backend, mutable images, startup migrations and no resource/capability limits. |
| Impact | Unsafe if promoted unchanged; migration startup can race across replicas. This audit did not establish that production currently uses these defaults. |
| Reproduction/proof | Static Compose/Dockerfile/entrypoint review. Config validation passed; runtime credentials/config were not dumped. |
| Root cause | Local first-launch topology is also the only checked-in deployment topology. |
| Remediation recommendation | Provide production configuration, least-privilege runtime/DB, durable media, pinned/scanned images, one controlled migration job and resource limits; keep local development usable. |
| Regression testing needed | Build/run as intended user, writable media/static paths, TLS/security settings, multi-replica startup/migrations, readiness and rollback. |
| Dependencies | SEC-001, SEC-003, SEC-005, TEST-003; hosting decisions |
| Migration implications | No app migration required for hardening; volume permissions/backups and controlled migration execution need planning. |
| Recommended remediation batch | 10 |

<a id="ops-003"></a>

## OPS-003 - TLS forwarding and security header inheritance need an explicit ingress design

| Attribute | Audit record |
| --- | --- |
| ID | OPS-003 |
| Severity | P2 |
| Confidence | High |
| Status | Open - conditional deployment risk |
| Evidence | Static config plus Nginx documented inheritance: child add_header overrides inherited set. No production ingress was tested. |
| File/function references | frontend/nginx.conf:10,26,30,37; backend/reza_backend/settings.py:SECURE_PROXY_SSL_HEADER |
| Current behaviour | Nginx sets X-Forwarded-Proto=$scheme. If an upstream terminates TLS then forwards HTTP, backend sees http. Media/static locations define their own add_header and omit several server headers. |
| Impact | Secure-redirect loops or incorrect absolute URLs are possible in that TLS topology; media/static do not inherit all stated headers. |
| Reproduction/proof | Static config plus Nginx documented inheritance: child add_header overrides inherited set. No production ingress was tested. |
| Root cause | Proxy trust/TLS termination is unspecified; location header inheritance is assumed. |
| Remediation recommendation | Choose trusted ingress forwarding/termination, reject spoofed headers and verify effective headers per location/status; apply safe media policy with SEC-001. |
| Regression testing needed | HTTPS proxy-chain request tests, redirects/cookies/absolute media URLs; API/media/static/404 header checks. |
| Dependencies | OPS-002, SEC-001, SEC-003 |
| Migration implications | Ingress/config rollout only; rebuild frontend if API base changes. |
| Recommended remediation batch | 10 |

<a id="ops-004"></a>

## OPS-004 - Recovery and provider-dependent workflows lack launch evidence

| Attribute | Audit record |
| --- | --- |
| ID | OPS-004 |
| Severity | P2 |
| Confidence | High |
| Status | Open - operational evidence gap |
| Evidence | Code/capability/management-command inventory and unresolved prior Handoff. No backup restore or provider call was run. |
| File/function references | docs/COMMERCE_OPERATIONS.md; Handoff.md; backend/shop/models.py:NotificationOutbox; backend/shop/commerce_services.py:commerce_capabilities |
| Current behaviour | Backup/restore and monitoring are documented obligations, not automated/verified procedures here. Outbox rows remain pending with no worker; online payment/carrier/tax integrations are absent. |
| Impact | Production cannot promise delivery/refunds/notifications/recovery beyond the supported offline bookkeeping; pending outbox requires retention/operations ownership. |
| Reproduction/proof | Code/capability/management-command inventory and unresolved prior Handoff. No backup restore or provider call was run. |
| Root cause | Provider/hosting/process choices remain external dependencies. |
| Remediation recommendation | Assign owners and measurable recovery objectives, perform isolated restore, implement selected provider flows with retries/idempotency and reconcile offline payment references. |
| Regression testing needed | Restore DB plus media, rollback drill, outbox retry/duplicate delivery, signed provider callbacks and failure reconciliation once configured. |
| Dependencies | Owner provider/policy/hosting decisions; BE-003, BE-004, OPS-002 |
| Migration implications | Provider/outbox/refund schema may be additive; migrations and media require separate backups. |
| Recommended remediation batch | 10 (provider work requires explicit scoped batch) |

## Reproduce P01-P16 without live services

Save this block temporarily as `tmp_audit_probes.py` in the repository root (ignored), then run the exact audit command:

```powershell
$env:PYTHONPATH = (Join-Path (Get-Location) 'backend')
backend/.venv/Scripts/python.exe tmp_audit_probes.py
```

Expected output is the proof ledger above. The script asserts SQLite/:memory: before migrating. Tokens never leave memory or appear in output; media uses an automatically cleaned temporary directory. Remove the disposable script after use. It is evidence documentation, not a replacement for maintained regression tests.

```python
"""Disposable Batch 1 probes: synthetic SQLite fixtures only; no live services."""
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'reza_backend.test_settings'
import django
django.setup()
import io
import json
import logging
import tempfile
import uuid
from pathlib import Path
from django.conf import settings
from django.contrib import admin
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, transaction
from django.test import RequestFactory, override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import resolve
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from PIL import Image
from shop.models import (User, Product, ProductVariant, Order, Payment, ReturnRequest,
                         InventoryMovement, ProductReview, Coupon)
from shop.serializers import ProductSerializer
from shop.commerce_services import (create_checkout_order, cancel_customer_order,
                                   transition_order_status, transition_payment, transition_return)
from shop.views import _sync_product_variants

assert connection.vendor == 'sqlite' and settings.DATABASES['default']['NAME'] == ':memory:'
logging.disable(logging.CRITICAL)
call_command('migrate', verbosity=0)

def emit(label, **values):
    print(label, json.dumps(values, default=str, sort_keys=True))

def product(key, stock=10, price='100'):
    p = Product.objects.create(id=key, name=key, price=price, stock=stock)
    v = ProductVariant.objects.create(product=p, sku=key, stock=stock)
    return p, v

def checkout(p, v, qty=1, **extra):
    return create_checkout_order(buyer, {
        'items': [{'product_id': p.pk, 'variant_id': v.pk, 'quantity': qty}],
        'shipping_address': 'Synthetic audit address', 'idempotency_key': uuid.uuid4(), **extra,
    })[0]

buyer = User.objects.create_user(username='audit-buyer', email='buyer@example.invalid', password=None)
staff = User.objects.create_superuser(username='audit-staff', email='staff@example.invalid', password=None)
client = APIClient()
client.force_authenticate(staff)

with tempfile.TemporaryDirectory(prefix='reza-audit-') as media, override_settings(MEDIA_ROOT=media, ALLOWED_HOSTS=['testserver']):
    emit('P01-routes', create=resolve('/api/orders/create/').func.__module__,
         cancel=resolve('/api/orders/example/cancel/').func.__module__)
    for i in range(2):
        p, v = product('query-' + str(i))
        ProductReview.objects.create(product=p, user=buyer, rating=5, status='approved')
    for count in (1, 2):
        with CaptureQueriesContext(connection) as queries:
            list(ProductSerializer(Product.objects.filter(id__startswith='query-').order_by('id')[:count]
                 .prefetch_related('variants', 'reviews'), many=True).data)
        emit('P02-product-queries', products=count, queries=len(queries),
             review_aggregates=sum('AVG(' in q['sql'] or 'COUNT(' in q['sql'] for q in queries))

    image_bytes = io.BytesIO()
    Image.new('RGB', (1, 1)).save(image_bytes, format='PNG')
    data_url = 'data:image/png;base64,audit-placeholder'
    response = client.post('/api/admin/products/', {
        'name': 'audit-gallery', 'price': '10', 'stock': '1',
        'image': SimpleUploadedFile('audit.png', image_bytes.getvalue(), content_type='image/png'),
        'images': json.dumps([data_url]),
    }, format='multipart')
    saved = Product.objects.get(pk=response.data['id'])
    emit('P03-data-url', status=response.status_code, stored_type=type(saved.images).__name__,
         stored_inline='data:image/' in json.dumps(saved.images),
         response_inline='data:image/' in json.dumps(response.data, default=str))

    response = client.post('/api/admin/products/', {
        'name': 'audit-gallery-file', 'price': '10', 'stock': '1',
        'images': SimpleUploadedFile('audit.html', b'<p>Harmless audit fixture</p>', content_type='text/html'),
    }, format='multipart')
    emit('P04-gallery-file', status=response.status_code, html_files=len(list(Path(media).rglob('*.html'))))
    before = len(list(Path(media).rglob('*.txt')))
    response = client.post('/api/admin/products/', {
        'name': 'invalid', 'price': '-1', 'stock': '1',
        'images': SimpleUploadedFile('audit.txt', b'Harmless audit fixture', content_type='text/plain'),
    }, format='multipart')
    emit('P05-orphan', status=response.status_code, new_files=len(list(Path(media).rglob('*.txt'))) - before)

    p, v = product('cancel')
    order = checkout(p, v)
    cancel_customer_order(order.pk, buyer)
    order.refresh_from_db()
    emit('P06-cancel-projection', order_status=order.status,
         payment_status=order.payment_status, payment_record=order.payment.status)

    p, v = product('partial-update')
    order = checkout(p, v)
    response = client.put(f'/api/admin/orders/{order.pk}/status/',
                          {'status': 'processing', 'tracking_code': 'x' * 129}, format='json')
    order.refresh_from_db()
    emit('P07-partial-update', response=response.status_code, persisted_status=order.status)

    p, v = product('stale-stock')
    stale_product = Product.objects.get(pk=p.pk)
    checkout(p, v, qty=2)
    v.refresh_from_db()
    after_sale = v.stock
    serializer = ProductSerializer(stale_product, data={'name': 'Renamed'}, partial=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        serializer.save()
        _sync_product_variants(serializer.instance, None, staff)
    v.refresh_from_db()
    emit('P08-stale-product', after_sale=after_sale, after_name_only_update=v.stock)

    req = RequestFactory().get('/admin/')
    req.user = staff
    payment_admin = admin.site._registry[Payment]
    return_admin = admin.site._registry[ReturnRequest]
    emit('P09-admin-forms', payment_status_writable='status' in payment_admin.get_form(req).base_fields,
         return_status_writable='status' in return_admin.get_form(req).base_fields)
    p, v = product('native-admin-stock')
    movements = InventoryMovement.objects.count()
    variant_admin = admin.site._registry[ProductVariant]
    v.stock = 99
    variant_admin.save_model(req, v, form=None, change=True)
    p.refresh_from_db()
    emit('P10-admin-stock', variant=v.stock, product_projection=p.stock,
         new_movements=InventoryMovement.objects.count() - movements)

    p, v = product('discount-refund')
    Coupon.objects.create(code='AUDIT50', discount_type='percent', value='50')
    order = checkout(p, v, qty=2, coupon_code='AUDIT50')
    transition_order_status(order.pk, 'processing', staff)
    transition_order_status(order.pk, 'shipped', staff)
    transition_order_status(order.pk, 'delivered', staff)
    item = order.items.get()
    rr = ReturnRequest.objects.create(user=buyer, order=order, order_item=item, quantity=1, reason='audit')
    for state in ('approved', 'received', 'refunded'):
        transition_return(rr.pk, state, staff)
    pay = Payment.objects.get(order=order)
    emit('P11-discount-refund', units_bought=2, units_returned=1, paid_amount=pay.amount,
         refunded_amount=pay.metadata['refunded_amount'], payment_status=pay.status)

    p, v = product('manual-partial-refund')
    order = checkout(p, v)
    transition_payment(order.payment.pk, 'paid', staff)
    pay = transition_payment(order.payment.pk, 'partially_refunded', staff)
    emit('P12-manual-refund', status=pay.status, amount_recorded='refunded_amount' in pay.metadata)

    public = APIClient()
    first = public.post('/api/newsletter/subscribe/', {'email': 'news@example.invalid'}, format='json')
    second = public.post('/api/newsletter/subscribe/', {'email': 'news@example.invalid'}, format='json')
    emit('P13-newsletter', first=first.status_code, repeat=second.status_code)

    response = client.post('/api/admin/coupons/', {'code': 'INVALID101', 'type': 'percent', 'value': '101'}, format='json')
    emit('P14-coupon-validation', status=response.status_code, code=response.data.get('code'))
    response = client.post('/api/admin/shipping-methods/',
        {'name': 'Invalid days', 'price': '1', 'estimated_days_min': 5, 'estimated_days_max': 1}, format='json')
    emit('P14-shipping-validation', status=response.status_code, code=response.data.get('code'))

    for i in range(30):
        Order.objects.create(id='PAGE-' + str(i), user=buyer, total=0)
    client.force_authenticate(buyer)
    response = client.get('/api/orders/my/')
    emit('P15-pagination', count=response.data['count'], returned=len(response.data['results']),
         pages=response.data['total_pages'], next=response.data['next'])

    csrf_client = APIClient(enforce_csrf_checks=True)
    csrf = csrf_client.get('/api/auth/csrf/').data['csrfToken']
    refresh = str(RefreshToken.for_user(buyer))
    csrf_client.cookies['refresh'] = refresh
    csrf_client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=csrf)
    csrf_client.cookies['refresh'] = refresh
    response = csrf_client.post('/api/auth/refresh/', HTTP_X_CSRFTOKEN=csrf)
    authenticated = csrf_client.get('/api/auth/me/').status_code
    emit('P16-refresh-replay', refresh_after_logout=response.status_code, me_after_replay=authenticated)
    buyer.is_active = False
    buyer.save(update_fields=['is_active'])
    response = csrf_client.post('/api/auth/refresh/', HTTP_X_CSRFTOKEN=csrf)
    emit('P16-disabled-refresh', refresh=response.status_code, me=csrf_client.get('/api/auth/me/').status_code)

emit('complete', database=connection.vendor, live_database_used=False)
```

## Reproduce P17-P18 without a browser/server

From the repository root, the following exact Node probe evaluates the current adapter/reader using installed TypeScript and synthetic transport/storage:

```powershell
@'
const fs = require('fs');
const ts = require('./frontend/node_modules/typescript');
const source = fs.readFileSync('frontend/services/api.ts', 'utf8').replace('import.meta.env.VITE_API_BASE', "''");
const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports = {};
new Function('exports', output)(moduleExports);
global.document = {cookie:'csrftoken=audit-only'};
const attempts = {};
let refreshes = 0;
global.fetch = async path => {
 if (path.endsWith('/refresh/')) { refreshes++; return new Response('{}',{status:200}); }
 attempts[path]=(attempts[path]||0)+1;
 return new Response('[]',{status:attempts[path]===1?401:200});
};
(async()=>{
 await Promise.all([moduleExports.api.myOrders(),moduleExports.api.getAddresses()]);
 console.log('P17-concurrent-401',JSON.stringify({protectedRequests:2,refreshCalls:refreshes}));
 const context=fs.readFileSync('frontend/contexts/GlobalContext.tsx','utf8');
 const reader=context.slice(context.indexOf('const readLocalCart ='),context.indexOf('const readLocalWishlist ='));
 const readJs=ts.transpileModule(reader,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 global.localStorage={getItem:key=>key==='reza_cart_v1'?'{\"legacy-product\":2}':null};
 const readCart=new Function(readJs+';return readLocalCart;')();
 console.log('P18-legacy-cart',JSON.stringify({v1Items:1,v2Absent:true,loadedItems:readCart().length}));
})();
'@ | node
```

For OPS-003, Nginx documents that local add_header directives replace inherited header sets under the standard inheritance behavior; the deployed image tag predates the newer explicit merge option. [Nginx header module documentation](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header).
