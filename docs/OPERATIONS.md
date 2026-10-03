# Production operations runbook

This is a reviewable self-hosted plan, not deployment approval. Batch 10 changes
only repository code and disposable local fixtures. Hosting, DNS, licensed SQL
edition, real certificates, capacity, backup destinations and on-call ownership
remain owner decisions. No workflow logs in to a registry, pushes an image or
deploys. The local developer stack remains `docker-compose.yml`.

## Environment and isolation

Require Docker Compose 2.24.4 or newer for the production override's `!reset` and
`!override` port rules. Copy `.env.production.example` to an ignored environment
file and populate it through the owner's secret store. That template documents
names only. Never print `docker compose config`, `docker inspect` environment
payloads, credentials, cookies or connection strings into a ticket/log. Use
`config --quiet` or the synthetic `scripts/validate-production-config.py` gate.

Every environment needs a distinct Compose project name, environment file,
database/login, media volume and backup namespace. Project names determine volume
names; changing a project name creates different volumes rather than moving data.
The override resets local fixed container names so projects can coexist; assign
distinct loopback ingress ports when they share a host.
Do not attach development/test services to production networks or restore customer
data into CI. The SQL test topology is standalone and must never be combined with
the application Compose files.

| Variable names | Responsibility |
| --- | --- |
| `DJANGO_SECRET_KEY` | Stable signing secret; rotate only through an approved session invalidation plan |
| `DB_PASSWORD` | SQL container bootstrap/admin credential; existing data volumes retain the original login secret |
| `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_DRIVER` | Owner-reviewed application database and ODBC connection target |
| `PRODUCTION_DB_USER`, `PRODUCTION_DB_PASSWORD` | Separately provisioned runtime login; must not be `sa` or a schema owner |
| `PRODUCTION_MSSQL_PID` | Owner-selected licensed production SQL edition; Developer is test/development only |
| `PRODUCTION_ALLOWED_HOSTS`, `PRODUCTION_CSRF_TRUSTED_ORIGINS` | Exact storefront hosts/origins and internal health-probe hosts |
| `TRUSTED_PROXY_CIDRS` | Only verified immediate Nginx peer networks; empty means ignore forwarded client IPs |
| `LOG_LEVEL` | Application/Gunicorn verbosity; expected negative probes should not trigger routine paging |
| `GUNICORN_WORKERS`, `GUNICORN_TIMEOUT`, `GUNICORN_GRACEFUL_TIMEOUT` | Measured worker/capacity and shutdown budgets |
| `FRONTEND_PORT` | Loopback ingress socket in the production override |
| `VITE_API_BASE` | Public build-time browser API configuration; container contract is same-origin |
| `PIP_INDEX_URL` | Optional public build mirror; credentials must never be passed as Docker build arguments |

Other local names and their responsibilities are listed in [Docker setup](DOCKER_SETUP.md)
and [security hardening](SECURITY_HARDENING.md). Production overrides debug, database
auto-creation, migrations, seeding and runtime static collection off, removes DB/API
host ports and empty admin-bootstrap credentials. It enforces secure cookies and
certificate-validated SQL encryption. It does not provision the application login,
database or SQL certificate; these must exist before startup. The bundled SQL
container's default self-signed certificate will fail this validation, deliberately.
The owner must configure a trusted certificate whose name matches the database
host and install its approved public CA in the backend image when needed.

The runtime login needs application table read/write and required execution
permissions, including shared throttle/session tables. It needs neither master
access nor schema mutation privileges. Database creation and schema migrations
use a separate, short-lived operator login. Named SQL instances use instance
discovery instead of the explicit port; container connections use TCP and ODBC
Driver 18. Do not substitute SQLite for production SQL Server.

Review the actual runtime login grants before launch; requiring a separately named
configuration variable does not prove a login has restricted privileges.

## Ingress contract

The override exposes Nginx only on loopback. An owner-configured TLS ingress on
that host must redirect public HTTP to HTTPS, set HSTS after validation, forward
the canonical Host, and prevent all direct public access to the inner HTTP socket.
For this topology Django intentionally ignores external forwarded protocol and
does not perform SSL redirects: Nginx overwrites protocol with its own HTTP scheme.
This avoids redirect loops and forged protocol headers. HSTS belongs at TLS ingress.
Readiness checks continue over internal HTTP without redirects. Django deploy checks
will report HSTS/SSL-redirect warnings until those responsibilities are explicitly
verified at ingress; do not silence them globally.

Nginx overwrites client XFF and request IDs. Do not enable broad proxy trust to
recover client IPs: first verify the actual network peer and document the chain.
The stock template's throttles may group requests behind an external TLS ingress;
correct original-IP forwarding requires a reviewed trusted-ingress/real-IP policy.
If Django must know the external HTTPS scheme for a future absolute-URL feature,
review the whole trusted proxy chain and its health path before changing protocol
forwarding or enabling redirects. Production TLS/client-IP forwarding is still an
owner launch gate. No real TLS, DNS or ingress configuration was changed here.

## Build inputs and release record

`backend/requirements.in` owns compatible ranges. `requirements.txt` locks the
complete Python dependency graph and artifact hashes, including Windows timezone
data. Initial pins preserve the installed Batch 9 versions; hashes come from PyPI
release metadata. Runtime and CI use pip with hash enforcement and binary wheels;
no package-manager migration. Regenerate in an isolated Python 3.11 tooling venv
with pip-tools 7.5.2, then review the diff and run Python/SQL/security gates:

```bash
python -m pip install pip-tools==7.5.2
python -m piptools compile --generate-hashes --strip-extras --no-emit-index-url --no-emit-trusted-host --output-file backend/requirements.txt backend/requirements.in
python -m pip install --require-hashes --only-binary=:all: -r backend/requirements.txt
python scripts/check-build-inputs.py
```

Use `--upgrade-package` deliberately for security/version updates; never overwrite
the lock with a freeze of an unrelated development environment. Test the lock on
Windows Python 3.12 and Linux Python 3.11. A missing platform wheel must stop a build
rather than silently compile a different artifact.

Frontend uses the existing npm lock and `npm ci`; `.nvmrc` aligns CI with the
digest-pinned Node builder. Vite variables are embedded at build time, never private.
Docker excludes every local env variant, forces its public API argument, and rejects
an incompatible remote API URL. General frontend builds keep their existing API
configuration support; a different host must separately review CSP/CORS/same-site
cookie assumptions. Source maps are disabled and Nginx blocks map requests. Index
HTML revalidates, Vite hashed assets cache immutably for a year, non-hashed public
assets retain seven-day caching and media retains one-hour caching.

All base images, including SQL test images, use digests. The Microsoft repository
bootstrap is checksum-verified and ODBC Driver 18 is version-pinned. Runtime images
exclude compilers/development headers, Python package installers and frontend Node dependencies. Debian apt
packages/security repositories and image metadata still prevent a claim of byte-for-byte
reproducible whole images. Archive the tested application images, their digests,
Git SHA, lockfiles, scan reports, migration plan and rollback image before release.
Refresh digest/ODBC/OS inputs deliberately and rerun gates; a frozen vulnerable
image is not an acceptable long-term update policy.

The frontend removes unused dynamic Nginx modules and updates packages within the
pinned base's Alpine release. Nginx itself uses the explicit maintained Alpine
security package version in `NGINX_PACKAGE_VERSION` (currently 1.28.3-r7), preserving
the 1.28 branch. APK signatures remain enforced. This replaces the old upstream
package pin that prevented security updates; Nginx configuration, numeric UID 101,
port 8080 and shutdown/read-only contracts are verified after the change. Like apt,
Alpine repository updates prevent byte-identical whole images; release the scanned
image digest rather than rebuilding an unverified image during rollout.

## Startup and one controlled migration job

These commands are an operator checklist, not authorization to deploy. First
verify the selected environment/project and inspect only variable names. The
following PowerShell helper keeps that selection consistent:

```powershell
function Invoke-RezaOps {
  docker compose --env-file .env.production -p reza-production -f docker-compose.yml -f docker-compose.production.yml @args
}
Invoke-RezaOps config --quiet
```

1. Confirm the licensed SQL host/database, validated TLS connection, restricted
   runtime login, distinct volumes, disk space, SQL memory floor and measured host
   capacity. Set worker counts and host CPU/memory limits after load testing; this
   repository does not guess production sizing. SQL Server needs at least 2 GiB.
2. Back up SQL and media as a consistent recovery set, verify checksums, and confirm
   the latest successful isolated restore drill before schema changes.
3. Freeze order/payment/inventory/upload writes during the migration window. Record
   the database's actual `showmigrations` output and run `migrate --plan` with the
   new backend image, using a separately reviewed migration environment/login.
4. Run exactly one `manage.py migrate --noinput` process per database. Do not run
   migrations in every web replica and do not use `--fake` to bypass drift.
5. Run `collectstatic --noinput` once with the new image into that environment's
   static volume. Keep historical media intact; it is not collectstatic output.
6. Start the web services with migration/seed/create flags disabled. Verify direct
   and proxied readiness, storefront catalog, authentication/CSRF/Secure cookies,
   a harmless staff image round-trip, cache headers and verified TLS ingress.
7. Resume writes only after these checks; monitor error/latency/429 events. Schedule
   `manage.py prune_security_state` daily using the intended runtime environment.

A manual Django task bypasses the normal startup entrypoint:

```powershell
Invoke-RezaOps run --rm --no-deps --entrypoint python backend manage.py showmigrations
Invoke-RezaOps run --rm --no-deps --entrypoint python backend manage.py migrate --plan
Invoke-RezaOps run --rm --no-deps --entrypoint python backend manage.py collectstatic --noinput
Invoke-RezaOps run --rm --no-deps --entrypoint python backend manage.py check --deploy
```

For the actual migration, use the same explicit project/files with an ignored
operator env file containing the same variable names and the short-lived migration
login, then run `manage.py migrate --noinput`. Revoke its privileges afterward.
There is no unattended production startup/deployment script. Migration 0005 stops
on ambiguous legacy emails; 0008 removes a redundant SKU index; 0009/0010 create
session/throttle state and require re-login. Backups and application rollback must
account for these data semantics, not just reverse DDL.

## Static/media ownership and persistence

Backend UID/GID is 10001; media/static directories initialize with that owner on
fresh Docker volumes. Upload files are readable by the Nginx UID 101 with file mode
0644 and directory mode 0755. Nginx mounts media read-only and runs on container
port 8080; public local port remains unchanged. WhiteNoise serves Django's static
manifest through Nginx `/static/`. Frontend assets live in the immutable frontend
image. Only media is irreplaceable customer content; collected static is rebuildable
from the matching image but needs regeneration on image rollback.

Container recreation preserves named SQL/media/static volumes. `stop` and ordinary
`down` preserve named volumes; `down -v`, volume pruning/removal and changing project
names can destroy or detach data. Existing volumes/bind mounts may be root-owned:
after backup and an owner-reviewed maintenance window, correct ownership to UID/GID
10001 and restore directory/file readability for UID 101. Do not use world-writable
modes or add an automatic recursive root chown to every startup. Validate actual
host ACLs for bind mounts. The new non-root runtime will fail visibly on an
unprepared existing volume; it does not silently change persistent ownership.

`scripts/prepare-volume-ownership.py` provides a separate maintenance tool. Check
mode reports only entry counts and returns 2 when preparation is needed. `--apply`
first writes a new mode-0600 tar archive and JSON checksum manifest to a separate
backup mount, verifies archived bytes and rejects a changed inventory before
ownership changes. It then sets UID/GID 10001 and file/directory modes 0644/0755.
Symlinks, special files, hard links and nested filesystems require manual review
and are rejected. It cannot safely coordinate active writers: stop every container
or host process using the volume first. Ownership changes are not atomic; preserve
the verified archive if a later filesystem operation fails.

The following is an operator example, not an executed application-volume change:

```powershell
$opsImage = 'reza-b10-backend:local'
$opsVolume = 'REPLACE_WITH_VERIFIED_MEDIA_OR_STATIC_VOLUME'
docker volume inspect $opsVolume | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The exact named volume must already exist' }
docker ps --filter "volume=$opsVolume" --format '{{.Names}}'
# Stop all writers; bind mounts require a separately reviewed host ACL plan.
$opsScript = (Resolve-Path .\scripts\prepare-volume-ownership.py).Path
docker run --rm --user 0:0 --network none --read-only --cap-drop ALL --cap-add DAC_OVERRIDE --entrypoint python --mount "type=volume,src=$opsVolume,dst=/volume,readonly" --mount "type=bind,src=$opsScript,dst=/prepare.py,readonly" $opsImage /prepare.py
```

For an approved preparation window, create a private backup directory, mount it at
`/backup`, mount the selected volume writable, add only CHOWN and FOWNER to the
capabilities above and append `--apply`. Copy the archive/manifest to encrypted
off-host custody and perform a restore drill before rollout. Restore the archive
into a NEW volume first; it preserves the original ownership/modes for rollback.
The disposable runtime gate tests legacy root-only files, byte/mode-preserving
archive restoration, readable non-root results and rejected symlinks. No real
application volume was repaired in this local-only batch.

For a media backup, pause uploads/deletes and archive the entire media root from a
read-only mount using a matching backend image or trusted archive tool. Include
the relative paths, per-file checksums, capture time, SQL backup ID and application
release in a manifest. Copy the archive off the Docker host, encrypt it, restrict
access and retain multiple versions. A volume on the same host is persistence,
not a backup. Test extraction into a NEW empty media volume, then verify checksums,
ownership and database image references through the isolated frontend.

For multiple backend hosts, plan object storage behind Django's storage abstraction:
immutable/random keys, private write credentials, tightly scoped public image reads,
versioning, retention, lifecycle/restore tests and controlled historical-file transfer.
Preserve existing DB paths/URLs and validated image handling during a dual-read
cutover; test cache invalidation and rollback before switching writes. The provider,
bucket, domain and CDN are owner decisions; no cloud/storage dependency is installed.

## SQL backup and restore

The DBA owns backup scheduling, off-host encrypted retention, access audits,
alerting, recovery-point/recovery-time targets and periodic restore drills. Select
recovery mode deliberately: full recovery needs an initial full backup plus ongoing
log backups; simple recovery cannot provide point-in-time log restore. Do not change
recovery mode casually. Normal scheduled full/differential/log chains belong to the
DBA; use a checksummed COPY_ONLY full backup for an ad-hoc pre-release snapshot.

Use an operator connection and SQLCMDPASSWORD supplied through the owner's secret
store, never the `sqlcmd -P` command line. Backup paths are SERVER-local paths and
must be writable by the SQL Server account. A bind-mounted backup directory needs
correct SQL ownership; do not mount the live data directory into an archive job and
copy running MDF/LDF files as a database backup. Illustrative SQL placeholders must
be replaced only after the intended database and fresh backup destination are verified:

```sql
BACKUP DATABASE [<database>] TO DISK = N'<server-backup-path>' WITH COPY_ONLY, CHECKSUM;
RESTORE VERIFYONLY FROM DISK = N'<server-backup-path>' WITH CHECKSUM;
RESTORE FILELISTONLY FROM DISK = N'<server-backup-path>';
```

VERIFYONLY checks the backup, not application recovery. Copy it off-host and verify
its file checksum after transfer. Restore first to a NEW database on an isolated SQL
instance of a supported same/newer version, using FILELISTONLY logical names and
WITH MOVE to fresh MDF/LDF paths. Never use WITH REPLACE on a live target. Preserve
required TDE certificates/keys in separately secured, tested recovery custody if
TDE is used. Document collation, SQL version/CU, compatibility level and login/user
mapping; database users can be orphaned after restore. Reprovision the restricted
login and review grants without copying privileged production credentials into tests.

Verify migration records/schema, representative catalog/order/payment/inventory
counts and invariants, media references and disabled external integrations. Apply
approved differential/log backups in order with NORECOVERY until the final RECOVERY
step when testing a full-recovery chain. Record duration and the achieved recovery
point. Real restored production data requires owner-controlled isolation/access and
must never be used in the synthetic CI fixtures.

## Logs, health and incident triage

Django/Gunicorn emit JSON to stdout. Nginx emits JSON access events to stdout and
only critical native diagnostics to stderr. Request events contain UTC timestamp,
level, bounded request ID, method, route pattern/class, status and elapsed time.
They exclude raw paths/IDs, queries, bodies, cookies, auth headers, IPs and exception
text. Django failures preserve exception type and stack locations without SQL,
locals or source lines. Logs are operational diagnostics, not a financial/security
audit ledger. Startup/migration management-command progress remains plain text.
Native critical Nginx diagnostics may contain raw URLs and need restricted access.

Nginx overwrites untrusted IDs and sends one `X-Request-ID` upstream and downstream.
Direct API clients may supply a bounded syntactically valid ID; IDs are correlation
labels, never authentication. Search the response ID in both services' request events.
Successful health probes are quiet; dependency failures still produce events.
Docker's local logging driver rotates five 10 MiB files per service. Export selected
redacted events to an owner-operated collector for retention beyond container deletion.
An optional external error reporter can consume JSON events or attach a reviewed
handler through `logging_config` in `reza_backend/observability.py`. Any SDK must
disable request-body/cookie/header/user capture and redact errors before transport.
No vendor, DSN, network reporter or paid subscription is required/enabled.

```powershell
Invoke-RezaOps ps
Invoke-RezaOps logs --tail 100 backend frontend
Invoke-RezaOps exec backend python /app/healthcheck.py live
Invoke-RezaOps exec backend python /app/healthcheck.py ready
Invoke-RezaOps exec frontend wget --quiet -O - http://127.0.0.1:8080/healthz
Invoke-RezaOps exec frontend wget --quiet -O - http://127.0.0.1:8080/api/health/ready/
```

`/api/health/live/` proves Django serves HTTP without a database dependency;
`/api/health/ready/` runs a SQL query and returns generic 503 on failure. `/healthz`
proves Nginx is alive independently; Compose frontend health uses proxied readiness.
Docker marks unhealthy containers but does not automatically restart them solely
for that status. Operators should remove unready traffic and investigate SQL
availability, cert/login/volume errors, worker saturation, disk and memory before
restarting. Readiness is not a full commerce/schema/backup correctness assertion.

Keep alerts for persistent readiness failures, 5xx rates, request latency, upload
failures, 429 anomalies, disk/volume pressure and missing backup/restore-drill success.
Owner must choose recipients, thresholds and retention. Daily security-state pruning,
backup and certificate-expiry monitoring need a reviewed scheduler; none is silently
installed. Increase logging temporarily only after reviewing redaction/retention.

When increasing `GUNICORN_GRACEFUL_TIMEOUT`, also increase Compose's stop grace
period above it. Align `GUNICORN_TIMEOUT` with Nginx proxy deadlines and measured
upload/SQL latency. The shipped defaults are bounded; changing only one budget can
terminate an otherwise valid request or kill workers before graceful completion.

## Rollback

Freeze writes and keep the failed release's logs/backups. If the old app supports
the current schema/data, run the archived old images and regenerate their static
manifest; keep media and DB volumes. Preserve previous hashed frontend assets at
the ingress/CDN during rollout where possible; a single Docker edge image replacement
can strand an open tab's old lazy chunks, so coordinate releases and test reload.

If schema/data changes are incompatible, prefer a forward fix. Inspect reverse
migration code/plan in an isolated restored copy before proposing reversal. Reversing
data migrations may not undo transformed/lost data or recreated sessions. Never
automatically run `migrate <old-target>` during web startup. Recovery from a backup
replaces committed orders/payments/inventory/uploads after its recovery point and
requires explicit owner/DBA approval, write freeze, matched SQL/media recovery sets
and financial reconciliation. Restore to a new target first; verify it before any
approved cutover. This batch runs no destructive production migration/restore.

## Pre-deployment evidence and remaining gates

CI runs the normal suites, hash-lock/image/env hygiene checks, synthetic production
Compose validation, both image builds, proxy regressions and a disposable real-SQL
runtime/recovery fixture. That fixture verifies non-root/read-only execution,
startup, static/media, restricted runtime DB access, graceful stop, backend recreation
at a different IP, database-failure readiness and SQL/media restore into new targets.
It also uses a two-day disposable CA to test certificate-validated encrypted SQL,
rejected unknown CAs/wrong hostnames, HTTPS ingress, HTTP redirect, HSTS and Secure
cookies. Trust is confined to test containers and per-request clients; no host trust
store, real certificates or production SQL provisioning is changed.
It creates/removes only uniquely named fixture containers/networks/volumes, not the
application's persistent data. Run it after local image builds:

```powershell
docker build -t reza-b10-backend:local backend
docker build -t reza-b10-frontend:local frontend
node scripts/test-nginx-security.mjs
node scripts/test-production-runtime.mjs
node scripts/scan-runtime-images.mjs
```

CI locks action commits and runs on program pushes, PRs, weekly and manual triggers.
It installs checksum-verified Trivy 0.75.0 directly from its immutable release and
runs `scan-runtime-images.mjs --trivy <verified-binary>`. Local mode uses the
digest-pinned scanner container and owned cache. The script attempts official Docker
Hub, GHCR and public ECR database sources in order, requires a successful update,
stores full-severity reports and verifies that scanned filesystems/timestamps match
the selected images. Fixable HIGH/CRITICAL findings or scanner/download failures
fail the gate; unfixed findings are recorded for review, never silently accepted.
Reports and source/worktree provenance live in ignored `.ops-reports/`; CI retains
JSON artifacts for 14 days. The script performs no registry login, push or deployment.
Checksum-verified actionlint validates workflow syntax/expressions locally and in CI.
The existing dev-only npm advisory exception expires 2026-11-02; it is not expanded.
Hosted CI, actual ingress/TLS, owner backup storage/retention, real recovery targets,
production certificate/login grants, legacy volume permissions and historical secret
rotation/history cleanup remain launch gates. Local fixtures cannot close them.

The initial Batch 10 scans failed database downloads. The local follow-up completed
through the official Docker Hub source and found fixable frontend OS/Nginx findings;
the rebuilt runtime is re-scanned after patching. See Handoff for exact image IDs,
severity counts and report locations. A fixable-finding gate pass is not a claim of
zero advisories, deployed TLS assurance or observed GitHub-hosted execution.

## Primary references

- [Docker Compose merge/reset rules](https://docs.docker.com/reference/compose-file/merge/)
- [Docker service health, logging and shutdown settings](https://docs.docker.com/reference/compose-file/services/)
- [NGINX unprivileged runtime and digest guidance](https://github.com/nginx/docker-nginx-unprivileged)
- [NGINX JSON access-log escaping](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [pip secure installs and hash enforcement](https://pip.pypa.io/en/stable/topics/secure-installs/)
- [SQL Server container restore](https://learn.microsoft.com/en-us/sql/linux/tutorial-restore-backup-in-sql-server-container?view=sql-server-ver16)
- [sqlcmd authentication/environment behavior](https://learn.microsoft.com/en-us/sql/tools/sqlcmd/sqlcmd-utility?view=sql-server-ver17)
- [Trivy immutable release](https://github.com/aquasecurity/trivy/releases/tag/v0.75.0)
- [Trivy official database locations](https://trivy.dev/docs/latest/configuration/db/)
- [Nginx security advisories](https://nginx.org/en/security_advisories.html)
- [SQL Server certificate-validated encryption](https://learn.microsoft.com/en-us/sql/linux/security/encrypted-connections?view=sql-server-ver16)
- [actionlint release](https://github.com/rhysd/actionlint/releases/tag/v1.7.12)
