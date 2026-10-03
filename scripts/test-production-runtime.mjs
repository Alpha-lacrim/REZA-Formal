// Local/CI fixtures only. Unique containers/volumes; no application Compose/env.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import https from 'node:https';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporary = mkdtempSync(join(tmpdir(), 'reza-runtime-fixture-'));
const prefix = 'reza-ops-' + randomBytes(6).toString('hex');
const network = prefix + '-network';
const db = prefix + '-db';
const backend = prefix + '-backend';
const frontend = prefix + '-frontend';
const edge = prefix + '-tls-edge';
const volumes = ['media', 'static', 'restored-media', 'certificates', 'legacy-restored'].map(name => prefix + '-' + name);
const backendImage = process.env.OPS_BACKEND_IMAGE || 'reza-b10-backend:local';
const frontendImage = process.env.OPS_FRONTEND_IMAGE || 'reza-b10-frontend:local';
const sqlImage = readFileSync(join(root, 'docker-compose.sql-test.yml'), 'utf8').match(/image: (\S+)/)[1];
const containers = new Set();
const createdVolumes = [];
let createdNetwork = false;
// Keep bounded startup retries and finally cleanup alive while sockets retry.
const keepAlive = setInterval(() => {}, 1000);
const docker = (...args) => {
  try { return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }).trim(); }
  catch { throw new Error('Docker fixture command failed: ' + args[0] + ' (configuration output withheld)'); }
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const request = async (url, options = {}) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), ...options });
  await response.arrayBuffer();
  return response;
};
const port = (name, internal) => 'http://' + docker('port', name, internal + '/tcp').split(/\r?\n/)[0];
async function waitFor(check, label, timeout = 210_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch { /* Startup/recreation only. */ }
    await delay(500);
  }
  throw new Error('Fixture timed out: ' + label);
}
const sql = query => docker('exec', db, 'sh', '-c',
  'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -h -1 -W -Q "$1"', 'sh', query);
const common = ['--network', network, '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true'];
const backendEnv = join(temporary, 'backend.env');
const password = randomBytes(30).toString('hex') + '!aA1';
const runtimePassword = randomBytes(30).toString('hex') + '!aA1';
const key = randomBytes(40).toString('hex');
const caBundle = join(temporary, 'fixture-ca-bundle.crt');
const sqlConfig = join(temporary, 'mssql.conf');
function configureBackend(bootstrap) {
  writeFileSync(backendEnv, Object.entries({
    DEBUG: 'False', DJANGO_SECRET_KEY: key, ALLOWED_HOSTS: 'localhost,127.0.0.1,backend',
    DB_HOST: 'db', DB_PORT: '1433', DB_NAME: 'reza_ops_fixture',
    DB_USER: bootstrap ? 'sa' : 'reza_ops_runtime', DB_PASSWORD: bootstrap ? password : runtimePassword,
    DB_DRIVER: 'ODBC Driver 18 for SQL Server', DB_ENCRYPT: 'yes', DB_TRUST_SERVER_CERTIFICATE: 'no',
    DB_CONNECTION_TIMEOUT: '3', DB_WAIT_TIMEOUT: '180', DB_AUTO_CREATE: bootstrap ? 'true' : 'false',
    RUN_MIGRATIONS: bootstrap ? 'true' : 'false', RUN_COLLECTSTATIC: bootstrap ? 'true' : 'false',
    RUN_SEED_DATA: 'false', LOG_LEVEL: 'INFO',
    AUTH_COOKIE_SECURE: 'True', SESSION_COOKIE_SECURE: 'True', CSRF_COOKIE_SECURE: 'True',
  }).map(([name, value]) => name + '=' + value).join('\n'), { mode: 0o600 });
}
function startBackend() {
  containers.add(backend);
  docker('run', '-d', '--name', backend, ...common, '--init', '--stop-timeout', '45',
    '--network-alias', 'backend', '--env-file', backendEnv, '-p', '127.0.0.1::8000',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/app/media',
    '--mount', 'type=volume,src=' + volumes[1] + ',dst=/app/staticfiles',
    '--mount', 'type=bind,src=' + caBundle + ',dst=/etc/ssl/certs/ca-certificates.crt,readonly', backendImage);
}
function secureRequest(url, extra = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { ca: readFileSync(caBundle), ...extra }, response => {
      response.resume();
      response.on('end', () => resolve(response));
      response.on('error', reject);
    });
    req.setTimeout(7000, () => req.destroy(new Error('TLS fixture request timed out')));
    req.on('error', reject);
  });
}
try {
  docker('network', 'create', network); createdNetwork = true;
  for (const name of volumes) { docker('volume', 'create', name); createdVolumes.push(name); }
  // Model a root-owned legacy volume, then make and verify a recovery archive
  // before permissions change. Never mount an existing application volume.
  docker('run', '--rm', '--user', '0:0', '--entrypoint', 'python', '--network', 'none',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/volume', backendImage, '-c',
    'from pathlib import Path; import os; p=Path("/volume/legacy/private.txt"); p.parent.mkdir(); p.write_bytes(b"synthetic legacy media"); os.chown(p,0,0); os.chmod(p,0o600); os.chown(p.parent,0,0); os.chmod(p.parent,0o700)');
  const prepareArgs = ['run', '--rm', '--user', '0:0', '--network', 'none', '--read-only',
    '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'FOWNER', '--cap-add', 'DAC_OVERRIDE',
    '--security-opt', 'no-new-privileges:true', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/volume',
    '--mount', 'type=bind,src=' + temporary + ',dst=/backup',
    '--mount', 'type=bind,src=' + join(root, 'scripts/prepare-volume-ownership.py') + ',dst=/prepare.py,readonly',
    backendImage, '/prepare.py'];
  const preparation = JSON.parse(docker(...prepareArgs, '--apply'));
  assert.equal(JSON.parse(docker(...prepareArgs)).needs_preparation, 0);
  const recoveryManifest = JSON.parse(readFileSync(join(temporary, preparation.recovery_id + '.json')));
  assert.ok(recoveryManifest.files['legacy/private.txt']);
  docker('run', '--rm', '--user', '0:0', '--entrypoint', 'tar',
    '--mount', 'type=volume,src=' + volumes[4] + ',dst=/volume',
    '--mount', 'type=bind,src=' + temporary + ',dst=/backup,readonly', backendImage,
    '-xf', '/backup/' + preparation.recovery_id + '.tar', '-C', '/volume');
  docker('run', '--rm', '--user', '0:0', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[4] + ',dst=/volume,readonly', backendImage, '-c',
    'from pathlib import Path; import stat; p=Path("/volume/legacy/private.txt"); assert p.read_bytes()==b"synthetic legacy media"; assert p.stat().st_uid==0; assert stat.S_IMODE(p.stat().st_mode)==0o600');
  docker('run', '--rm', '--user', '0:0', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/volume', backendImage, '-c',
    'from pathlib import Path; Path("/volume/escape").symlink_to("/tmp",target_is_directory=True)');
  assert.throws(() => docker(...prepareArgs, '--apply'), /Docker fixture command failed/);
  docker('run', '--rm', '--user', '0:0', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/volume', backendImage, '-c',
    'from pathlib import Path; Path("/volume/escape").unlink()');
  docker('run', '--rm', '--user', '10001:10001', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/volume,readonly', backendImage, '-c',
    'from pathlib import Path; assert Path("/volume/legacy/private.txt").read_bytes()==b"synthetic legacy media"');
  console.log('Runtime fixture: legacy ownership preparation and verified recovery archive pass');

  // A short-lived CA is trusted only inside these fixtures, never on the host.
  docker('run', '--rm', '--user', '0:0', '--network', 'none', '--entrypoint', 'sh',
    '--mount', 'type=volume,src=' + volumes[3] + ',dst=/certificates', backendImage, '-ec', `
      cd /certificates; umask 077; mkdir db edge
      openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=REZA disposable fixture CA' -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' -keyout ca.key -out ca.crt
      for service in db edge; do
        if [ "$service" = db ]; then name=db; uid=10001; else name=localhost; uid=101; fi
        openssl req -new -newkey rsa:2048 -nodes -subj "/CN=$name" -keyout "$service/server.key" -out "$service/server.csr"
        printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:%s,DNS:localhost,IP:127.0.0.1\n' "$name" > "$service/extensions.cnf"
        openssl x509 -req -in "$service/server.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 2 -extfile "$service/extensions.cnf" -out "$service/server.crt"
        chown -R "$uid:$uid" "$service"; chmod 700 "$service"; chmod 600 "$service/server.key"; chmod 644 "$service/server.crt"
      done
      cat /etc/ssl/certs/ca-certificates.crt ca.crt > ca-bundle.crt; chmod 644 ca-bundle.crt
    `);
  writeFileSync(caBundle, docker('run', '--rm', '--user', '0:0', '--entrypoint', 'cat',
    '--mount', 'type=volume,src=' + volumes[3] + ',dst=/certificates,readonly', backendImage, '/certificates/ca-bundle.crt'));
  writeFileSync(sqlConfig, '[network]\ntlscert = /certificates/db/server.crt\ntlskey = /certificates/db/server.key\ntlsprotocols = 1.2\nforceencryption = 1\n');
  const dbEnv = join(temporary, 'sql.env');
  writeFileSync(dbEnv, 'ACCEPT_EULA=Y\nMSSQL_PID=Developer\nMSSQL_SA_PASSWORD=' + password, { mode: 0o600 });
  containers.add(db);
  docker('run', '-d', '--name', db, '--network', network, '--network-alias', 'db', '--network-alias', 'wrong-db', '--env-file', dbEnv,
    '--mount', 'type=volume,src=' + volumes[3] + ',dst=/certificates,readonly',
    '--mount', 'type=bind,src=' + sqlConfig + ',dst=/var/opt/mssql/mssql.conf,readonly', sqlImage);
  await waitFor(() => sql('SELECT 1').includes('1'), 'SQL Server');
  console.log('Runtime fixture: isolated SQL ready');
  configureBackend(true); startBackend();
  await waitFor(async () => (await request(port(backend, 8000) + '/api/health/ready/')).ok, 'bootstrap and Gunicorn');
  assert.equal(docker('exec', backend, 'id', '-u'), '10001');
  const connect = 'import os,pyodbc; connection=pyodbc.connect("DRIVER={ODBC Driver 18 for SQL Server};SERVER=db,1433;DATABASE=reza_ops_fixture;UID="+os.environ["DB_USER"]+";PWD="+os.environ["DB_PASSWORD"]+";Encrypt=yes;TrustServerCertificate=no;"+extra,timeout=4)';
  docker('exec', backend, 'python', '-c', 'extra=""; ' + connect + '; assert connection.cursor().execute("SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id=@@SPID").fetchone()[0]=="TRUE"');
  docker('exec', backend, 'python', '-c', 'extra=""\ntry:\n ' + connect.replace('SERVER=db,1433', 'SERVER=wrong-db,1433') + '\nexcept pyodbc.Error as error:\n assert "certificate" in str(error).lower(); raise SystemExit(0)\nraise SystemExit("SQL hostname verification unexpectedly bypassed")');
  docker('run', '--rm', '--network', network, '--env-file', backendEnv, '--entrypoint', 'python', backendImage, '-c',
    'extra=""\ntry:\n ' + connect + '\nexcept pyodbc.Error as error:\n assert "certificate" in str(error).lower(); raise SystemExit(0)\nraise SystemExit("Untrusted SQL CA unexpectedly accepted")');
  console.log('Runtime fixture: encrypted SQL with trusted CA, hostname rejection and untrusted CA rejection pass');
  docker('exec', backend, 'python', '-c',
    'from pathlib import Path; import base64; Path("/app/media/fixture.png").write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAIAAADZSiLoAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=="))');
  containers.add(frontend);
  docker('run', '-d', '--name', frontend, ...common, '--network-alias', 'frontend', '--stop-timeout', '45', '-p', '127.0.0.1::8080',
    '--mount', 'type=volume,src=' + volumes[0] + ',dst=/var/www/media,readonly', frontendImage);
  const origin = port(frontend, 8080);
  await waitFor(async () => (await request(origin + '/api/health/ready/')).ok, 'edge readiness');
  const edgeConfig = join(temporary, 'tls-edge.conf');
  writeFileSync(edgeConfig, `server { listen 8080; return 308 https://localhost$request_uri; }
    server { listen 8443 ssl; server_name localhost;
      ssl_certificate /certificates/edge/server.crt; ssl_certificate_key /certificates/edge/server.key;
      ssl_protocols TLSv1.2 TLSv1.3; add_header Strict-Transport-Security "max-age=300" always;
      location / { proxy_set_header Host localhost; proxy_pass http://frontend:8080; }
    }`);
  containers.add(edge);
  docker('run', '-d', '--name', edge, ...common, '-p', '127.0.0.1::8080', '-p', '127.0.0.1::8443',
    '--mount', 'type=volume,src=' + volumes[3] + ',dst=/certificates,readonly',
    '--mount', 'type=bind,src=' + edgeConfig + ',dst=/etc/nginx/conf.d/default.conf,readonly', frontendImage);
  const tlsOrigin = port(edge, 8443).replace('http:', 'https:');
  await waitFor(async () => (await secureRequest(tlsOrigin + '/api/health/ready/')).statusCode === 200, 'verified HTTPS ingress');
  const tlsResponse = await secureRequest(tlsOrigin + '/api/auth/csrf/');
  assert.equal(tlsResponse.statusCode, 200);
  assert.equal(tlsResponse.headers['strict-transport-security'], 'max-age=300');
  assert.ok(tlsResponse.headers['set-cookie'].some(cookie => /; Secure(?:;|$)/.test(cookie)));
  const redirect = await request(port(edge, 8080) + '/api/health/ready/', { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://localhost/api/health/ready/');
  await assert.rejects(secureRequest(tlsOrigin + '/', { ca: undefined }));
  await assert.rejects(secureRequest(tlsOrigin + '/', { servername: 'wrong.example.invalid' }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
  console.log('Runtime fixture: trusted HTTPS, redirect/HSTS/Secure cookies and rejected CA/hostname pass');
  assert.equal(docker('exec', frontend, 'id', '-u'), '101');
  assert.ok((await request(origin + '/media/fixture.png')).ok);
  assert.ok((await request(origin + '/static/admin/css/base.css')).ok, 'WhiteNoise manifest is reachable');
  const response = await request(origin + '/api/products/?probe=private-fixture-query', { headers: { 'X-Request-ID': 'forged-id' } });
  assert.equal(response.status, 200);
  const requestId = response.headers.get('x-request-id');
  assert.match(requestId, /^[a-f0-9]{32}$/);
  const events = docker('logs', backend).split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
  assert.ok(events.some(event => event.request_id === requestId && event.status === 200));
  assert.ok(!JSON.stringify(events).includes('private-fixture-query'));
  console.log('Runtime fixture: non-root/read-only, startup, static/media and correlated logs pass');

  // Dedicated runtime credentials cannot perform schema changes. Only this
  // synthetic SQL instance is ever provisioned; the real deployment is owner work.
  sql(`CREATE LOGIN [reza_ops_runtime] WITH PASSWORD=N'${runtimePassword}';
       USE [reza_ops_fixture]; CREATE USER [reza_ops_runtime] FOR LOGIN [reza_ops_runtime];
       ALTER ROLE db_datareader ADD MEMBER [reza_ops_runtime];
       ALTER ROLE db_datawriter ADD MEMBER [reza_ops_runtime];
       GRANT EXECUTE ON SCHEMA::dbo TO [reza_ops_runtime];`);

  // A new backend must inherit media/static and be rediscovered by the edge.
  const oldIp = Object.values(JSON.parse(docker('inspect', '--format', '{{json .NetworkSettings.Networks}}', backend)))[0].IPAddress;
  docker('stop', '--time', '45', backend);
  assert.equal(docker('inspect', '--format', '{{.State.ExitCode}}', backend), '0');
  docker('rm', backend); containers.delete(backend);
  const blocker = prefix + '-old-address'; containers.add(blocker);
  docker('run', '-d', '--name', blocker, '--network', network, '--ip', oldIp, '--entrypoint', 'sleep', frontendImage, '300');
  configureBackend(false); startBackend();
  await waitFor(async () => (await request(origin + '/api/health/ready/')).ok, 'DNS rediscovery', 90_000);
  assert.ok((await request(origin + '/media/fixture.png')).ok);
  assert.ok((await request(origin + '/static/admin/css/base.css')).ok);
  assert.ok((await request(origin + '/api/products/')).ok, 'Restricted runtime login can serve application reads');
  docker('exec', backend, 'python', '-c',
    'import os,django; os.environ["DJANGO_SETTINGS_MODULE"]="reza_backend.settings"; django.setup(); from django.db import connection,DatabaseError\ntry:\n    connection.cursor().execute("CREATE TABLE dbo.forbidden_runtime_schema (id int)")\nexcept DatabaseError:\n    raise SystemExit(0)\nraise SystemExit("Restricted runtime login unexpectedly has DDL permission")');
  console.log('Runtime fixture: restricted DB login, graceful stop, container recreation and DNS rediscovery pass');

  docker('exec', db, 'mkdir', '-p', '/var/opt/mssql/backup');
  sql("BACKUP DATABASE [reza_ops_fixture] TO DISK=N'/var/opt/mssql/backup/fixture.bak' WITH COPY_ONLY, CHECKSUM; RESTORE VERIFYONLY FROM DISK=N'/var/opt/mssql/backup/fixture.bak' WITH CHECKSUM;");
  sql("RESTORE DATABASE [reza_ops_restored] FROM DISK=N'/var/opt/mssql/backup/fixture.bak' WITH MOVE N'reza_ops_fixture' TO N'/var/opt/mssql/data/reza_ops_restored.mdf', MOVE N'reza_ops_fixture_log' TO N'/var/opt/mssql/data/reza_ops_restored_log.ldf';");
  const rows = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM reza_ops_fixture.dbo.django_migrations;');
  assert.equal(sql('SET NOCOUNT ON; SELECT COUNT(*) FROM reza_ops_restored.dbo.django_migrations;'), rows);
  assert.ok(Number(rows) > 10);
  // Stream the archive; Docker Desktop cp can fail on read-only/tmpfs roots.
  writeFileSync(join(temporary, 'media.tar'), execFileSync('docker',
    ['exec', backend, 'tar', '-cf', '-', '-C', '/app/media', '.'],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }));
  docker('run', '--rm', '--entrypoint', 'tar',
    '--mount', 'type=volume,src=' + volumes[2] + ',dst=/app/media',
    '--mount', 'type=bind,src=' + temporary + ',dst=/backup,readonly', backendImage,
    '-xf', '/backup/media.tar', '-C', '/app/media');
  const restored = docker('run', '--rm', '--entrypoint', 'python',
    '--mount', 'type=volume,src=' + volumes[2] + ',dst=/app/media', backendImage,
    '-c', 'from pathlib import Path; print(Path("/app/media/fixture.png").read_bytes().hex())');
  assert.equal(restored, docker('exec', backend, 'python', '-c', 'from pathlib import Path; print(Path("/app/media/fixture.png").read_bytes().hex())'));
  console.log('Runtime fixture: SQL checksum backup/new-database restore and media archive/new-volume restore pass');

  docker('stop', '--time', '45', db);
  assert.equal((await request(origin + '/healthz')).status, 200);
  assert.equal((await request(origin + '/api/health/live/')).status, 200);
  assert.equal((await request(origin + '/api/health/ready/')).status, 503);
  docker('stop', '--time', '45', frontend);
  assert.equal(docker('inspect', '--format', '{{.State.ExitCode}}', frontend), '0');
  docker('stop', '--time', '45', backend);
  assert.equal(docker('inspect', '--format', '{{.State.ExitCode}}', backend), '0');
  console.log('Runtime fixture: dependency-failure readiness, independent liveness and graceful shutdown pass');
} finally {
  clearInterval(keepAlive);
  for (const name of [...containers].reverse()) { try { docker('rm', '-f', name); } catch { /* Owned fixtures only. */ } }
  for (const name of createdVolumes) { try { docker('volume', 'rm', name); } catch { /* Owned fixture volumes only. */ } }
  if (createdNetwork) { try { docker('network', 'rm', network); } catch { /* Owned fixture network only. */ } }
  const target = resolve(temporary);
  if (target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('reza-runtime-fixture-')) rmSync(target, { recursive: true, force: true });
}
