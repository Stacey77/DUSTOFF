import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomBytes, scryptSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore } from '../core/server.js';
import { createHelixApp, checkPassword } from '../apps/helix/server.js';

const { subtle } = webcrypto;
const APP_KEY = randomBytes(24).toString('base64url');
const ADMIN_KEY = randomBytes(24).toString('base64url');
const PASSWORD = 'correct horse battery staple';
const salt = randomBytes(16);
const HASH = `scrypt$${salt.toString('base64url')}$${scryptSync(PASSWORD, salt, 32).toString('base64url')}`;
const UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/131';

let core, coreSrv, helixSrv, HELIX, CORE;

before(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'helix-'));
  const consoleFile = join(dir, 'index.html');
  writeFileSync(consoleFile, '<!doctype html><html><body><h1>HELIX CONSOLE MARKER</h1></body></html>');
  core = createCore({ appKeys: { helix: APP_KEY }, adminKey: ADMIN_KEY });
  coreSrv = core.app.listen(0, '127.0.0.1');
  await new Promise((r) => coreSrv.once('listening', r));
  CORE = `http://127.0.0.1:${coreSrv.address().port}`;
  helixSrv = createHelixApp({ coreUrl: CORE, appKey: APP_KEY, username: 'stacey', passwordHash: HASH, consoleFile }).listen(0, '127.0.0.1');
  await new Promise((r) => helixSrv.once('listening', r));
  HELIX = `http://127.0.0.1:${helixSrv.address().port}`;
});
after(() => { helixSrv.close(); coreSrv.close(); core.close(); });

async function newKey() {
  const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  return { keys, jwk: await subtle.exportKey('jwk', keys.publicKey) };
}
async function login(password = PASSWORD, ip = '203.0.113.5') {
  const { jwk } = await newKey();
  const res = await fetch(`${HELIX}/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': UA, 'x-forwarded-for': ip },
    body: JSON.stringify({ username: 'stacey', password, publicKeyJwk: jwk }),
  });
  const cookie = (res.headers.getSetCookie()[0] || '').split(';')[0] || null;
  return { status: res.status, cookie };
}
const page = (cookie) => fetch(`${HELIX}/`, { headers: { 'user-agent': UA, ...(cookie ? { cookie } : {}) }, redirect: 'manual' });

test('password hashes verify, and wrong ones fail', async () => {
  assert.equal(await checkPassword(PASSWORD, HASH), true);
  assert.equal(await checkPassword('nope', HASH), false);
  assert.equal(await checkPassword(PASSWORD, 'garbage'), false);
});

test('the console redirects to /login without a session', async () => {
  const res = await page(null);
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /^\/login\?next=%2F&r=no_session/);
});

test('wrong password is refused', async () => {
  assert.equal((await login('wrong password!!', '198.51.100.1')).status, 401);
});

test('signed-in user gets the HELIX Console with Shield injected', async () => {
  const { status, cookie } = await login();
  assert.equal(status, 200);
  assert.match(cookie, /^__Host-helix_sid=/);
  const res = await page(cookie);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /HELIX CONSOLE MARKER/);
  assert.match(html, /\/_shield\/sdk\.js/);
  assert.match(html, /\/assets\/helix-shield\.js/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('kill switch in the Shield Console kicks the HELIX user out', async () => {
  const { cookie } = await login();
  assert.equal((await page(cookie)).status, 200);
  const kill = await fetch(`${CORE}/v1/admin/apps/helix/kill`, { method: 'POST', headers: { authorization: `Bearer ${ADMIN_KEY}` } });
  assert.ok((await kill.json()).revoked >= 1);
  const res = await page(cookie);
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /r=revoked/);
});

test('login is throttled after 5 failures from one IP', async () => {
  for (let i = 0; i < 5; i++) await login('bad password 123', '192.0.2.99');
  assert.equal((await login(PASSWORD, '192.0.2.99')).status, 429);
});

test('requires credentials to start', () => {
  assert.throws(() => createHelixApp({ coreUrl: CORE, appKey: APP_KEY }));
});
