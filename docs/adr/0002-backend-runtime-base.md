# ADR 0002: supported Alpine backend runtime

Date: 2026-10-04. Status: accepted for the review candidate; deployment remains a
separate owner action.

## Context

The Debian 13 runtime still reports 44 HIGH package findings across eight IDs after
a fresh `--pull --no-cache` rebuild. Debian's stable tracker has no supported fixes
for that snapshot. The release policy blocks every HIGH/CRITICAL finding, including
unfixed advisories. Suppressing those findings or mixing unstable packages into
stable would not repair the artifact.

Microsoft's [support matrix](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/system-requirements?view=sql-server-ver17)
supports Alpine 3.23 with ODBC 18.7. The official Python 3.11.17 Alpine image exists,
and the existing hash lock includes musllinux wheels for Pillow and pyodbc.

## Decision

Use digest-pinned `python:3.11.17-alpine3.23`, apply same-release APK security updates
and install Microsoft's pinned ODBC `18.7.1.1-1` package. Preserve the Python version,
16-package hash lock, Django/SQL Server architecture, UID/GID 10001, startup flags,
media/static paths, read-only/capability boundary and health/shutdown contracts.
This changes the container platform and driver patch, not application ownership.

Microsoft publishes [detached signatures](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server?view=sql-server-ver17)
for its APKs. Before pinning, both amd64 and arm64 signatures were verified against
the official release key fingerprint `BC528686B50D79E339D3721CEB3E94ADBE1229CF`.
Docker `ADD --checksum` enforces those verified bytes on every build. A build-only
stage supplies only the selected package through a read-only BuildKit mount;
downloads and GPG tooling are absent from the runtime. `--allow-untrusted` is needed
for the vendor's detached-signature APK format, after checksum enforcement.

Bash supports the existing entrypoints, GNU find retains the privilege-bit check,
and BusyBox tar provides the archive operations exercised by the recovery drill.
No compiler, custom core-library build, vulnerable-package metadata removal or
scanner exception is introduced. Runtime pip/setuptools remain removed.

## Verification and consequences

Require both runtime builds, build-input/configuration/policy checks, full image
reports, Nginx probes, the TLS/ownership/recovery/runtime fixture and the full backend
suite on disposable SQL Server. Record actual image/scan/hosted evidence in
[Handoff](../../Handoff.md) and the [final review](../audit/FINAL_REVIEW.md).

The final Alpine artifacts pass the full runtime drill, SQLite checks/suite and
166/166 disposable SQL tests. Hosted push/PR checks pass and retain full reports
with zero advisories under the unchanged gate; immutable evidence is in the final
review/execution log. Local and hosted verification targets linux/amd64.
The arm64 package is pinned and signature-verified, but a full
arm64 runtime/SQL validation is required before deploying that architecture.

musl replaces glibc, and future native dependencies must provide compatible wheels
or receive a separately reviewed build strategy. Do not copy a Debian venv into
this image. OS package repositories still change over time: archive and deploy the
tested immutable image, rerun scans on refreshes and keep production TLS, licensing,
capacity, grants and backup approval separate. Historical Debian findings remain
in [the advisory record](../RUNTIME_VULNERABILITIES.md).
