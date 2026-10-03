"""Read-only reproducibility/hygiene gate; report names, never secret values."""
import json
import re
import subprocess
from pathlib import Path

from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parent.parent
locked = {}
current = None
hash_count = 0
for line in (ROOT / 'backend/requirements.txt').read_text().splitlines():
    if not line.strip() or line.lstrip().startswith('#'):
        continue
    match = re.fullmatch(r'([\w.-]+)==([^\s]+) \\', line)
    if match:
        if current and not hash_count:
            raise SystemExit('Python lock missing hashes: ' + current)
        current = match[1].lower().replace('_', '-')
        if current in locked:
            raise SystemExit('Duplicate Python lock input: ' + current)
        locked[current] = match[2]
        hash_count = 0
    elif current and re.fullmatch(r'    --hash=sha256:[a-f0-9]{64}(?: \\)?', line):
        hash_count += 1
    else:
        raise SystemExit('Invalid Python lock line')
if not current or not hash_count:
    raise SystemExit('Python lock missing hashes')
for line in (ROOT / 'backend/requirements.in').read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    requirement = Requirement(line)
    name = requirement.name.lower().replace('_', '-')
    if name not in locked or locked[name] not in requirement.specifier:
        raise SystemExit('Python lock does not satisfy input: ' + requirement.name)

for filename in ('backend/Dockerfile', 'frontend/Dockerfile', 'docker-compose.yml', 'docker-compose.sql-test.yml'):
    source = (ROOT / filename).read_text()
    images = re.findall(r'^FROM (\S+)|^\s+image: (\S+)', source, re.MULTILINE)
    for candidates in images:
        image = next(item for item in candidates if item)
        if image in {'base'}:
            continue
        if not re.fullmatch(r'.+@sha256:[a-f0-9]{64}', image):
            raise SystemExit('Unpinned image in ' + filename)

tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
credential_signature = re.compile(
    r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|'
    r'\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b|\bAKIA[A-Z0-9]{16}\b'
)
for filename in filter(None, tracked):
    path = Path(filename)
    name = path.name.lower()
    if ((name == '.env' or name.startswith('.env.')) and not name.endswith('.example')) or path.suffix.lower() in {'.pem', '.key', '.pfx', '.p12', '.bak', '.trn'}:
        raise SystemExit('Tracked secret/backup filename: ' + filename)
    if credential_signature.search((ROOT / filename).read_text(encoding='utf-8', errors='ignore')):
        raise SystemExit('Tracked credential signature: ' + filename)

package = json.loads((ROOT / 'frontend/package.json').read_text())
lock = json.loads((ROOT / 'frontend/package-lock.json').read_text())['packages']['']
for key in ('dependencies', 'devDependencies', 'engines'):
    if package[key] != lock[key]:
        raise SystemExit('Frontend manifest/lock mismatch: ' + key)
print(f'Build inputs: {len(locked)} hash-locked Python packages; image digests, npm metadata and tracked filenames pass')
