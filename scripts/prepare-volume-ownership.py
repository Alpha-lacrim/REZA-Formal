"""Run in an isolated maintenance container; only /volume and /backup mounts.

Check by default. --apply first makes a checksummed, verified recovery archive.
Stop all writers before invoking this operator tool. Never run during web startup.
"""
import argparse
import hashlib
import json
import os
import stat
import tarfile
import uuid
from pathlib import Path


def inventory(root):
    entries = []
    device = root.stat().st_dev

    def visit(path):
        info = path.lstat()
        if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
            raise ValueError('Volume contains a symlink or special file; review manually')
        if info.st_dev != device or (stat.S_ISREG(info.st_mode) and info.st_nlink != 1):
            raise ValueError('Volume contains a nested filesystem or hard link; review manually')
        entries.append(path)
        if stat.S_ISDIR(info.st_mode):
            for child in sorted(path.iterdir()):
                visit(child)

    visit(root)
    return entries


def checksum(stream):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    root = Path('/volume')
    if root.resolve() != root or not root.is_mount() or os.geteuid() != 0:
        raise ValueError('Requires root in a maintenance container with an explicit /volume mount')
    entries = inventory(root)
    incorrect = sum(
        item.lstat().st_uid != 10001 or item.lstat().st_gid != 10001
        or stat.S_IMODE(item.lstat().st_mode) != (0o755 if item.is_dir() else 0o644)
        for item in entries
    )
    if not args.apply:
        print(json.dumps({'entries': len(entries), 'needs_preparation': incorrect}))
        return 2 if incorrect else 0
    backup = Path('/backup')
    if backup.resolve() != backup or not backup.is_mount():
        raise ValueError('--apply requires a separate writable /backup mount')
    os.umask(0o077)
    identifier = 'volume-recovery-' + uuid.uuid4().hex
    archive = backup / (identifier + '.tar')
    manifest_path = backup / (identifier + '.json')
    manifest = {}
    stamps = {}
    for item in entries:
        info = item.lstat()
        stamps[str(item)] = (info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        if item.is_file():
            with item.open('rb') as stream:
                manifest[item.relative_to(root).as_posix()] = checksum(stream)
    with archive.open('xb') as output:
        os.chmod(archive, 0o600)
        with tarfile.open(fileobj=output, mode='w') as recovery:
            for item in entries:
                recovery.add(item, arcname=item.relative_to(root).as_posix(), recursive=False)
    with tarfile.open(archive, 'r') as recovery:
        for name, expected in manifest.items():
            with recovery.extractfile(name) as stream:
                if checksum(stream) != expected:
                    raise ValueError('Recovery archive verification failed; ownership unchanged')
    if entries != inventory(root) or any(
        stamps[str(item)] != (item.lstat().st_ino, item.lstat().st_size,
                             item.lstat().st_mtime_ns, item.lstat().st_ctime_ns)
        for item in entries
    ):
        raise ValueError('Volume changed during backup; stop writers before retrying')
    with archive.open('rb') as stream:
        archive_hash = checksum(stream)
    with manifest_path.open('x') as output:
        os.chmod(manifest_path, 0o600)
        json.dump({'archive': archive.name, 'sha256': archive_hash,
                   'files': manifest, 'uid': 10001, 'gid': 10001}, output, indent=2)
    for item in entries:
        os.chown(item, 10001, 10001, follow_symlinks=False)
        os.chmod(item, 0o755 if item.is_dir() else 0o644, follow_symlinks=False)
    print(json.dumps({'prepared_entries': len(entries), 'recovery_id': identifier}))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except ValueError as error:
        raise SystemExit(str(error))
    except (OSError, tarfile.TarError):
        raise SystemExit('Volume preparation failed; inspect mounts, stop writers and preserve recovery files')
