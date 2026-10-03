import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

// This single temporary exception is confined to repository-owned build globs.
// New advisories, runtime packages or an expired exception always fail the gate.
const expires = Date.parse('2026-11-02T00:00:00Z');
const acceptedUrl = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const acceptedPackages = new Set(['braces', 'chokidar', 'micromatch', 'fast-glob', 'tailwindcss']);
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
let report;
try {
  report = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], { encoding: 'utf8' }));
} catch (error) {
  try { report = JSON.parse(error.stdout); } catch { throw new Error('npm advisory service did not return a valid report'); }
}
if (report.error || !report.vulnerabilities) throw new Error('npm audit failed to retrieve advisories');
let accepted = 0;
const rejected = [];
for (const [name, finding] of Object.entries(report.vulnerabilities)) {
  const devOnly = finding.nodes.length > 0 && finding.nodes.every(path => lock.packages[path]?.dev === true);
  const known = acceptedPackages.has(name) && finding.via.every(item => typeof item === 'string'
    ? acceptedPackages.has(item) : item.url === acceptedUrl);
  if (devOnly && known && Date.now() < expires) accepted++;
  else rejected.push(name);
}
console.log(`npm security gate: ${rejected.length} unaccepted entries; ${accepted} temporary build-only entries (expires 2026-11-02)`);
if (rejected.length) { console.error('Unaccepted packages: ' + rejected.join(', ')); process.exitCode = 1; }
