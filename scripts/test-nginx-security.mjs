// Disposable proxy fixtures only: no application database, volume or credentials.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, basename, sep } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = mkdtempSync(join(tmpdir(), 'reza-security-proxy-'));
const prefix = 'reza-security-' + process.pid;
const network = prefix + '-network';
const upstream = prefix + '-upstream';
const edge = prefix + '-edge';
const image = process.env.NGINX_TEST_IMAGE || readFileSync(join(root, 'frontend', 'Dockerfile'), 'utf8')
  .match(/^FROM (nginxinc\/nginx-unprivileged:\S+)/m)[1];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let createdNetwork = false;
const containers = [];
try {
  mkdirSync(join(fixture, 'html'));
  mkdirSync(join(fixture, 'media'));
  writeFileSync(join(fixture, 'html', 'index.html'), '<!doctype html><p>Synthetic storefront</p>');
  writeFileSync(join(fixture, 'html', 'fixture.js'), '/* synthetic static asset */');
  mkdirSync(join(fixture, 'html', 'assets'));
  writeFileSync(join(fixture, 'html', 'assets', 'fixture-hash.js'), '/* hashed synthetic static asset */');
  writeFileSync(join(fixture, 'html', 'assets', 'fixture-hash.js.map'), 'inert synthetic map');
  writeFileSync(join(fixture, 'media', 'fixture.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
  writeFileSync(join(fixture, 'media', 'legacy.html'), '<p>Inert legacy fixture</p>');
  writeFileSync(join(fixture, 'upstream.conf'), `server {
    listen 8000;
    add_header X-Seen-Xff $http_x_forwarded_for always;
    add_header X-Seen-Id $http_x_request_id always;
    add_header X-Seen-Uri $uri always;
    add_header X-Seen-Query $arg_probe always;
    add_header X-Powered-By synthetic-server always;
    location /api/health/live/ { return 200 '{"status":"ok"}'; }
    location /api/auth/me/ { return 401 '{"detail":"synthetic denied"}'; }
    location /api/denied/ { return 403 '{"detail":"synthetic forbidden"}'; }
    location / { return 404 '{"detail":"synthetic missing"}'; }
  }`);
  docker('network', 'create', network); createdNetwork = true;
  docker('run', '-d', '--name', upstream, '--network', network, '--network-alias', 'backend',
         '--mount', 'type=bind,src=' + join(fixture, 'upstream.conf') + ',dst=/etc/nginx/conf.d/default.conf,readonly', image);
  containers.push(upstream);
  docker('run', '-d', '--name', edge, '--network', network, '-p', '127.0.0.1::8080',
         '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--cap-drop', 'ALL',
         '--security-opt', 'no-new-privileges:true',
         '--mount', 'type=bind,src=' + join(root, 'frontend', 'nginx-main.conf') + ',dst=/etc/nginx/nginx.conf,readonly',
         '--mount', 'type=bind,src=' + join(root, 'frontend', 'nginx.conf') + ',dst=/etc/nginx/conf.d/default.conf,readonly',
         '--mount', 'type=bind,src=' + join(fixture, 'html') + ',dst=/usr/share/nginx/html,readonly',
         '--mount', 'type=bind,src=' + join(fixture, 'media') + ',dst=/var/www/media,readonly',
         '--entrypoint', 'nginx', image, '-g', 'daemon off;');
  containers.push(edge);
  docker('exec', edge, 'nginx', '-t');
  const origin = 'http://' + docker('port', edge, '8080/tcp').split(/\r?\n/)[0];
  let available = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { available = (await fetch(origin + '/')).ok; if (available) break; } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(available, 'Disposable proxy must start');
  for (const [path, status] of [['/', 200], ['/fixture.js', 200], ['/media/fixture.png', 200],
      ['/media/legacy.html', 404], ['/media/missing.png', 404], ['/api/health/live/', 200],
      ['/api/auth/me/', 401], ['/api/denied/', 403], ['/api/missing/', 404]]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, status, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
    assert.ok(response.headers.get('permissions-policy')?.includes('camera=()'), path);
    assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), path);
    assert.ok(!/\d/.test(response.headers.get('server') || ''), 'No server version');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.match(response.headers.get('x-request-id'), /^[a-f0-9]{32}$/);
    if (path.startsWith('/media/')) assert.ok(response.headers.get('content-security-policy').includes('sandbox'));
  }
  const forwarded = [];
  for (const value of ['192.0.2.1', '198.51.100.2, 203.0.113.3']) {
    const response = await fetch(origin + '/api/health/live/', { headers: { 'X-Forwarded-For': value } });
    forwarded.push(response.headers.get('x-seen-xff'));
    assert.notEqual(forwarded.at(-1), value);
    assert.ok(!forwarded.at(-1).includes(','));
  }
  assert.equal(forwarded[0], forwarded[1], 'Spoofing cannot vary the upstream identity');
  const correlated = await fetch(origin + '/api/health/live/?probe=synthetic', { headers: { 'X-Request-ID': 'forged-id' } });
  assert.equal(correlated.headers.get('x-request-id'), correlated.headers.get('x-seen-id'));
  assert.notEqual(correlated.headers.get('x-request-id'), 'forged-id');
  assert.equal(correlated.headers.get('x-seen-uri'), '/api/health/live/');
  assert.equal(correlated.headers.get('x-seen-query'), 'synthetic');
  assert.ok((await fetch(origin + '/index.html')).headers.get('cache-control').includes('no-cache'));
  const asset = await fetch(origin + '/assets/fixture-hash.js');
  assert.ok(asset.headers.get('cache-control').includes('immutable'));
  assert.ok(asset.headers.get('cache-control').includes('max-age=31536000'));
  assert.equal((await fetch(origin + '/assets/fixture-hash.js.map')).status, 404);
  assert.equal((await fetch(origin + '/healthz')).status, 200);
  const events = docker('logs', edge).split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
  assert.ok(events.length > 0);
  assert.ok(events.every(event => event.request_id && !JSON.stringify(event).includes('probe=')));
  assert.equal(docker('exec', edge, 'id', '-u'), '101');
  docker('stop', '-t', '1', upstream);
  const unavailable = await fetch(origin + '/api/health/live/');
  assert.ok([502, 504].includes(unavailable.status), 'Failed upstream returns a gateway failure');
  assert.equal(unavailable.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(unavailable.headers.get('x-frame-options'), 'DENY');
  assert.equal(unavailable.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.ok(unavailable.headers.get('permissions-policy')?.includes('camera=()'));
  assert.ok(unavailable.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
  console.log('Nginx: status/header/media, forwarding, request IDs, cache, source-map, JSON log and non-root checks passed');
} finally {
  for (const name of containers.reverse()) { try { docker('rm', '-f', name); } catch { /* Best effort owned fixtures only. */ } }
  if (createdNetwork) { try { docker('network', 'rm', network); } catch { /* Owned network only. */ } }
  const target = resolve(fixture);
  if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('reza-security-proxy-')) {
    rmSync(target, { recursive: true, force: true });
  }
}
