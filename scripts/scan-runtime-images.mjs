// Full reports plus a fail-closed HIGH/CRITICAL gate, including unfixed advisories.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { assessImageVulnerabilities } from './image-vulnerability-policy.mjs';

const args = process.argv.slice(2);
const nativeIndex = args.indexOf('--trivy');
assert.ok(args.length === 0 || (args.length === 2 && nativeIndex === 0), 'Usage: node scripts/scan-runtime-images.mjs [--trivy PATH]');
const native = nativeIndex === 0 ? args[1] : null;
const output = resolve('.ops-reports', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(4).toString('hex'));
mkdirSync(output, { recursive: true });
const cache = 'reza-image-scan-' + randomBytes(6).toString('hex');
const scanner = 'aquasec/trivy:0.75.0@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa';
const repositories = ['docker.io/aquasec/trivy-db:2', 'ghcr.io/aquasecurity/trivy-db:2', 'public.ecr.aws/aquasecurity/trivy-db:2'];
const run = (command, parameters, timeout = 60_000) => execFileSync(command, parameters,
  { encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
let scannerCounter = 0;
const scan = parameters => {
  if (native) return run(native, ['--cache-dir', join(output, 'cache'), ...parameters], 16 * 60_000);
  const name = cache + '-' + scannerCounter++;
  try {
    return run('docker', ['run', '--rm', '--name', name, '--network', 'bridge',
      '--mount', 'type=volume,src=' + cache + ',dst=/cache',
      '--mount', 'type=bind,src=' + output + ',dst=/reports', scanner,
      '--cache-dir', '/cache', ...parameters], 16 * 60_000);
  } finally {
    // A timed-out Docker client can leave its container running despite --rm.
    try { run('docker', ['rm', '-f', name]); } catch { /* May already be removed. */ }
  }
};
const summary = { scanner: '0.75.0', git_commit: run('git', ['rev-parse', 'HEAD']).trim(), images: [] };
summary.source_worktree_dirty = Boolean(run('git', ['status', '--porcelain']).trim());
let createdCache = false;
try {
  if (!native) { run('docker', ['volume', 'create', cache]); createdCache = true; }
  assert.match(scan(['--version']), /^Version: 0\.75\.0\s/m);
  let downloaded = false;
  for (const repository of repositories) {
    try {
      scan(['image', '--timeout', '8m', '--download-db-only', '--db-repository', repository, '--no-progress']);
      summary.database_repository = repository; downloaded = true; break;
    } catch { console.log('Scanner database source failed: ' + repository); }
  }
  assert.ok(downloaded, 'All official database sources failed; images are NOT verified');
  summary.database_metadata = JSON.parse(scan(['version', '--format', 'json'])).VulnerabilityDB;
  assert.ok(summary.database_metadata?.UpdatedAt && summary.database_metadata?.DownloadedAt,
    'Scanner database provenance is missing; images are NOT verified');
  let blocked = false;
  for (const name of ['backend', 'frontend']) {
    const image = process.env['OPS_' + name.toUpperCase() + '_IMAGE'] || 'reza-b10-' + name + ':local';
    const inspected = JSON.parse(run('docker', ['image', 'inspect', image]))[0];
    const reportPath = join(output, name + '.json');
    const options = ['image', '--timeout', '15m', '--skip-db-update', '--scanners', 'vuln', '--no-progress', '--format', 'json', '--output'];
    if (native) {
      scan([...options, reportPath, image]);
    } else {
      const archive = join(output, name + '.tar');
      run('docker', ['save', '--output', archive, inspected.Id]);
      scan([...options, '/reports/' + name + '.json', '--input', '/reports/' + name + '.tar']);
      unlinkSync(archive); // Only this invocation's generated image export.
    }
    const report = JSON.parse(readFileSync(reportPath));
    assert.deepEqual(report.Metadata.ImageConfig.rootfs.diff_ids, inspected.RootFS.Layers, 'Scanned image filesystem differs from selected image');
    assert.equal(report.Metadata.ImageConfig.created, inspected.Created, 'Scanned image build timestamp differs');
    const findings = report.Results.flatMap(result => result.Vulnerabilities || []);
    const assessment = assessImageVulnerabilities(findings);
    summary.images.push({ name, image, image_id: inspected.Id, os: report.Metadata.OS, ...assessment });
    blocked ||= assessment.release_blocked;
    console.log(`${name}: fixable HIGH/CRITICAL=${assessment.fixable_high_critical}; unfixed HIGH/CRITICAL=${assessment.unfixed_high_critical}`);
  }
  summary.gate_passed = !blocked;
  summary.report_directory = output;
  writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(resolve('.ops-reports', 'latest-summary.json'), JSON.stringify(summary, null, 2));
  console.log('Full scan reports: ' + output);
  assert.ok(!blocked, 'All HIGH/CRITICAL findings block release, including unfixed advisories; see full reports');
} finally {
  if (createdCache) run('docker', ['volume', 'rm', cache]);
}
