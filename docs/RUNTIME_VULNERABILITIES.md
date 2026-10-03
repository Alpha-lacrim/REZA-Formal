# Runtime image advisory remediation

Reviewed on 2026-10-04. No production deployment, cloud/DNS/payment change or real
database operation is part of this work. Hosted follow-up evidence belongs in
[FINAL_REVIEW](audit/FINAL_REVIEW.md) and Handoff.

## Current supported-runtime follow-up

The GitHub push/PR container jobs first failed in the recovery fixture: a Linux
runner cannot read a root-owned mode-0600 manifest written to its bind-mounted
temporary directory. The fixture now keeps recovery archives/manifests in its
own uniquely named Docker backup volume. Read-only maintenance containers verify
the manifest's original mode/owner and recovery bytes; UID 10001 is explicitly
denied access. Media archive creation/restoration uses the same owned volume.
Production backup permissions are not relaxed and no application volume is used.

A fresh no-cache Debian rebuild reproduced all 44 HIGH findings below. The
supported replacement is digest-pinned Python 3.11.17 on Alpine 3.23 with Microsoft
ODBC 18.7.1.1, the unchanged 16-package hash lock and same UID/startup/storage
contract. Microsoft supports this distribution/driver pair. Both architecture
packages were detached-signature verified and are checksum-pinned; only the
selected package is mounted into the build. See [ADR 0002](adr/0002-backend-runtime-base.md)
for sources, the libc change, tooling and architecture-validation limits.

Both final `--pull --no-cache` runtime builds pass. Fresh full Trivy 0.75.0 reports
**zero advisories at every severity in both images**, and the unchanged gate exits
0. Backend SQLite checks/drift/full suite and the final TLS/ownership/restart/
shutdown/SQL+media recovery fixture pass. Full SQL/hosted outcomes are recorded
separately as completed. No CVE ignore, VEX exception or essential-package purge
clears this result.

Final local reports: `.ops-reports/2026-10-03T23-01-55-283Z-d10fc3f8/` (UTC).
Official Docker Hub vulnerability DB updated `2026-10-03T19:02:38Z`, downloaded
`2026-10-03T23:02:37Z`. The summary records parent Git `77f1292` with a dirty worktree
because it scanned the pending container fix; hosted checks validate the committed
candidate separately. Images:

| Selected image | Scanned Docker identity |
| --- | --- |
| `reza-b12-backend:ci-fix` | `sha256:904cbf6b37f248d83f321d9a9ad549305f955dcad938e46897af63b6d6ab98dd` |
| `reza-b12-frontend:ci-fix` | `sha256:befe0f3002e6a47383bf5b349b05a15f3daf0ed356e09d2e131f1a3c9b8de83b` |

Keep the strict all-HIGH/CRITICAL policy and full report retention. Archive and
promote tested immutable images, repeat fresh scans on updates and require arm64
runtime/SQL validation before deploying there. Production licensing, grants,
ingress, capacity, backups and remaining audit work are still owner gates.

## Historical Debian 13 result and scope

The backend moves from Debian 12 to the supported Debian 13 Python image, with
same-release security updates applied at build time. Python **3.11.17**, the
**16-package version/hash lock**, Microsoft ODBC **18.6.2.1-1**, UID/GID 10001 and
the application/startup contract remain unchanged. The Microsoft repository
bootstrap now matches Debian 13 and is checksum-verified. Microsoft's
[support matrix](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/system-requirements?view=sql-server-ver17)
includes Debian 13 for ODBC 18.6.

| Observed full scan | Prior Debian 12 backend | Debian 13 backend | Rebuilt frontend |
| --- | ---: | ---: | ---: |
| CRITICAL package findings | 5 | 0 | 0 |
| HIGH package findings | 58 | 44 | 0 |
| Distinct HIGH/CRITICAL advisory IDs | 23 | 8 | 0 |
| MEDIUM / LOW / UNKNOWN | 114 / 104 / 1 | 60 / 81 / 2 | 0 / 0 / 0 |

These are scanner observations, not a claim that every vulnerability is fixed.
Fifteen previous advisory IDs disappear after supported package updates. Package
counts also reflect Debian's changed binary-package split: the four remaining
util-linux IDs each match nine packages instead of eight. No findings are ignored,
downgraded or given an exception. Exact images, database timestamps and full reports
are recorded in the latest Handoff entry and ignored `.ops-reports/`.

The release gate fails on **every HIGH/CRITICAL finding**, including those with
an empty fixed version. This historical Debian backend therefore **blocks release**. Scanner
or database errors also fail closed. CI retains full JSON reports even on failure;
the regression tests cover the previously permitted unfixed-advisory case.

## Updates that removed previous advisory IDs

Installed versions below are observed in the rebuilt amd64 runtime. Source links
are Debian's vendor tracker; packages receive Debian backports of fixes even when
their upstream major/minor version stays the same.

| Source family and installed version | Previous advisory IDs no longer reported |
| --- | --- |
| util-linux `2.41.5-0+deb13u1` | [CVE-2026-53613](https://security-tracker.debian.org/tracker/CVE-2026-53613) |
| gzip `1.13-1+deb13u1` | [CVE-2026-41992](https://security-tracker.debian.org/tracker/CVE-2026-41992) |
| pcre2 `10.46-1~deb13u3` | [CVE-2026-103111](https://security-tracker.debian.org/tracker/CVE-2026-103111) |
| sqlite3 `3.46.1-7+deb13u2` | [CVE-2025-7458](https://security-tracker.debian.org/tracker/CVE-2025-7458), [CVE-2026-11822](https://security-tracker.debian.org/tracker/CVE-2026-11822), [CVE-2026-11824](https://security-tracker.debian.org/tracker/CVE-2026-11824) |
| perl `5.40.1-6+deb13u1` | [CVE-2026-13221](https://security-tracker.debian.org/tracker/CVE-2026-13221), [CVE-2026-42496](https://security-tracker.debian.org/tracker/CVE-2026-42496), [CVE-2026-42497](https://security-tracker.debian.org/tracker/CVE-2026-42497), [CVE-2026-48962](https://security-tracker.debian.org/tracker/CVE-2026-48962), [CVE-2026-57432](https://security-tracker.debian.org/tracker/CVE-2026-57432), [CVE-2026-57433](https://security-tracker.debian.org/tracker/CVE-2026-57433), [CVE-2026-8376](https://security-tracker.debian.org/tracker/CVE-2026-8376) |
| OpenSSL `3.5.7-1~deb13u3` | [CVE-2026-84782](https://security-tracker.debian.org/tracker/CVE-2026-84782) |
| zlib `1:1.3.dfsg+really1.3.1-1+b1` | [CVE-2023-45853](https://security-tracker.debian.org/tracker/CVE-2023-45853); the old source-level finding concerned MiniZip, which Debian also notes was not built into the old zlib binary |

## Historical Debian findings and vendor limits

All 44 are HIGH. None has a fixed version in the scanner's Debian 13 report.
Debian's tracker still lists the installed stable versions as vulnerable. A direct
check of the official `trixie-backports/main/binary-amd64/Packages.xz` index found no
backported package for these families. Fixes in testing/unstable are useful targets
for vendor backports, but are not replacements to mix into this stable image.

| Advisory and package count | Installed source version / reported binaries | Vendor fix and remaining action |
| --- | --- | --- |
| [CVE-2026-76642](https://security-tracker.debian.org/tracker/CVE-2026-76642), 9 | util-linux `2.41.5-0+deb13u1` | Mount post-hook privilege issue. Debian unstable `2.42.3-1` fixes it; await a stable/vendor backport. |
| [CVE-2026-78408](https://security-tracker.debian.org/tracker/CVE-2026-78408), 9 | Same util-linux family | nsenter cgroup descriptor issue. Debian unstable `2.42.4-1` fixes it; await a stable/vendor backport. |
| [CVE-2026-78409](https://security-tracker.debian.org/tracker/CVE-2026-78409), 9 | Same util-linux family | Mount subdirectory traversal. Debian unstable `2.42.3-1` fixes it; await a stable/vendor backport. |
| [CVE-2026-78410](https://security-tracker.debian.org/tracker/CVE-2026-78410), 9 | Same util-linux family | Restricted bind-mount race. Debian unstable `2.42.3-1` fixes it; await a stable/vendor backport. |
| [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720), 4 | ncurses `6.5+20250216-2`: libncursesw6, libtinfo6, ncurses-base, ncurses-bin | infocmp overflow; upstream correction starts at `6.5-20251213`, Debian unstable at `6.6+20251231-1`. Stable has no fix; infocmp is present but unused by the application. |
| [CVE-2026-16742](https://security-tracker.debian.org/tracker/CVE-2026-16742), 2 | systemd `257.13-1~deb13u1`: libsystemd0, libudev1 | systemd-homed group escalation; tracker fixes start at unstable `261.2-1`. systemd-homed is absent from this image. Obtain artifact-specific security review before any not-affected disposition. |
| [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369), 1 | libacl1 `2.3.2-2+b1` | Upstream/Debian unstable `2.4.0` adds a new API. Debian plans a point-release update and notes compatibility concerns. Retain the library required by archive tools; await the vendor-compatible update. |
| [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538), 1 | perl-base `5.40.1-6+deb13u1` | Archive::Tar correction starts at module `3.10`, Debian unstable perl `5.42.3-1`; stable is postponed pending regressions. Archive::Tar is absent from the minimal perl-base runtime; obtain artifact-specific review before any not-affected disposition. |

The nine util-linux binaries are bsdutils, libblkid1, liblastlog2-2, libmount1,
libsmartcols1, libuuid1, login, mount and util-linux. Binary/source version epochs
for bsdutils and login differ; the full JSON report preserves them.

Runtime hardening additionally removes setuid/setgid bits from executables under
`/usr` and `/opt`, verified by the disposable runtime fixture. The application and
maintenance jobs do not require these privilege transitions. Existing non-root,
no-new-privileges, capability drops and read-only production settings remain in
force. These constrain local privilege-escalation paths; **they do not patch the
packages or clear the scan findings**. Do not add a privileged container, host
namespaces, SYS_ADMIN or host device mounts to bypass this boundary.

## Historical Debian remediation options

These options describe the blocked Debian artifacts above. The supported Alpine
follow-up supersedes waiting for Debian fixes for the current candidate; it does
not accept the older images for release. Retain this vendor history for review.

1. Keep rollout blocked while these HIGH findings remain unresolved. Review the
   full reports and this matrix with the security/release owner.
2. Monitor the linked Debian advisories for stable security/point-release fixes.
   When available, refresh the Python image digest if needed and rebuild with
   `--pull --no-cache` so apt security updates are not reused from build cache.
   Do not change the Python hash lock unless the application dependency graph changes.
3. Run the local commands below on the rebuilt artifacts. Require zero
   HIGH/CRITICAL findings, or a separately reviewed, artifact-specific not-affected
   VEX (Vulnerability Exploitability eXchange) policy for proven absent vulnerable
   components. No VEX/exception policy is
   implemented or approved here; a blanket CVE ignore would hide future exposure.
4. If an earlier zero-HIGH release is required, commission maintained Debian 13
   backports of the vendor fixes or a tested move to another supported base.
   Confirm Microsoft ODBC support and repeat SQL/TLS/restore/image gates. Do not
   force-remove Essential packages, install unstable binaries, or compile ad-hoc
   replacements into the runtime to obtain a green scanner count.
5. Archive the tested image IDs, Git revision, database timestamps and scan/test
   reports. Run the hosted CI checks through the repository's approved review flow
   before any separately authorized rollout. Do not rebuild images during deployment.

```powershell
node --test scripts/test-image-vulnerability-policy.mjs
docker build --pull --no-cache -t reza-b10-backend:local backend
docker build --pull --no-cache -t reza-b10-frontend:local frontend
# Select the built frontend for the proxy gate.
$env:NGINX_TEST_IMAGE = 'reza-b10-frontend:local'
node scripts/test-nginx-security.mjs
node scripts/test-production-runtime.mjs
node scripts/scan-runtime-images.mjs
```

Also repeat the standalone disposable SQL lane in [TESTING](TESTING.md), build-input
and synthetic configuration gates. Scanner exit 1 with completed JSON reports means
the severity policy blocked release; a database/download error means the scan was
not completed. Neither is a successful release gate.

Image-only remediation introduces no application migration or data rewrite. Retain
the previous immutable images for investigation, but they contain more reported
HIGH/CRITICAL findings and are not a security-approved rollback target. Existing
production backup/TLS/ownership/hosted-CI obligations in [OPERATIONS](OPERATIONS.md)
remain separate from this local evidence.
