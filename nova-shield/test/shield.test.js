import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomBytes } from 'node:crypto';
import { createCore } from '../core/server.js';
import { createDemoApp } from '../demo/server.js';
import { signWebhook, verifyWebhook } from '../middleware/webhook.js';

const { subtle } = webcrypto;
const APP_KEY = randomBytes(24).toString('base64url');
const ADMIN_KEY = randomBytes(24).toString('base64url');
const UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/131';

let now = Date.now();
const clock = () => now;
const advance = (sec) => { now += sec * 1000; };

let core, coreSrv, appSrv, APP;

before(async () => {
  core = createCore({ appKeys: { demo: APP_KEY, helix: randomBytes(24).toString('base64url') }, adminKey: ADMIN_KEY, clock });
  coreSrv = core.app.listen(0, '127.0.0.1');
  await new Promise((r) => coreSrv.once('listening', r));
  const coreUrl = `http://127.0.0.1:${coreSrv.address().port}`;
  appSrv = createDemoApp({ coreUrl, appKey: APP_KEY, trustProxy: true }).listen(0, '127.0.0.1');
  await new Promise((r) => appSrv.once('listening', r));
  APP = `http://127.0.0.1:${appSrv.address().port}`;
});

after(() => { appSrv.close(); coreSrv.close(); core.close(); });

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** A simulated browser: its own non-exportable device key, cookie jar, UA and IP. */
class Browser {
  constructor({ ua = UA, ip = '203.0.113.10' } = {}) { this.ua = ua; this.ip = ip; this.cookie = null; }
  async init() {
    this.keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    return this;
  }
  async sign(msg) { return b64url(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, this.keys.privateKey, new TextEncoder().encode(msg))); }
  async req(path, { method = 'GET', body, proof = false, sdk = false } = {}) {
    const headers = { 'user-agent': this.ua, 'x-forwarded-for': this.ip };
    if (this.cookie) headers.cookie = this.cookie;
    if (body) headers['content-type'] = 'application/json';
    if (sdk) headers['x-shield-sdk'] = '1';
    if (proof) {
      const ts = Math.floor(now / 1000);
      headers['x-shield-proof'] = `${ts}.${await this.sign(`${ts}\n${method}\n${path}`)}`;
    }
    const res = await fetch(APP + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      this.cookie = /Max-Age=0/.test(c) ? null : pair;
    }
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  async login() {
    const jwk = await subtle.exportKey('jwk', this.keys.publicKey);
    return this.req('/login', { method: 'POST', body: { username: 'demo', password: 'demo', publicKeyJwk: jwk } });
  }
  async refresh() {
    const c = await this.req('/_shield/challenge', { method: 'POST', sdk: true });
    if (c.status !== 200) return c;
    return this.req('/_shield/refresh', { method: 'POST', sdk: true, body: { nonce: c.body.nonce, signature: await this.sign(`refresh\n${c.body.nonce}`) } });
  }
}

const victim = async () => { const b = await new Browser().init(); assert.equal((await b.login()).status, 200); return b; };

test('login sets a __Host- HttpOnly Secure cookie and protected routes work', async () => {
  const b = await new Browser().init();
  const res = await fetch(APP + '/login', {
    method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ username: 'demo', password: 'demo', publicKeyJwk: await subtle.exportKey('jwk', b.keys.publicKey) }),
  });
  const cookie = res.headers.getSetCookie()[0];
  assert.match(cookie, /^__Host-nova_sid=nst_/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Path=\//);
  const v = await victim();
  const me = await v.req('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.userId, 'user_demo');
});

test('login refuses a JWK that contains a private key', async () => {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const priv = await subtle.exportKey('jwk', pair.privateKey);
  const b = new Browser();
  const r = await b.req('/login', { method: 'POST', body: { username: 'demo', password: 'demo', publicKeyJwk: priv } });
  assert.equal(r.status, 400);
});

test('legit refresh rotates the token; the browser stays logged in', async () => {
  const v = await victim();
  const before = v.cookie;
  const r = await v.refresh();
  assert.equal(r.status, 200);
  assert.notEqual(v.cookie, before);
  assert.equal((await v.req('/api/me')).status, 200);
});

test('STOLEN COOKIE: attacker without the device key cannot refresh, and the session is killed', async () => {
  const v = await victim();
  const attacker = await new Browser().init();   // same UA and IP, so only device binding can stop it
  attacker.cookie = v.cookie;
  advance(601);                                  // the stolen access token has expired
  assert.equal((await attacker.req('/api/me')).body.error, 'expired');
  const r = await attacker.refresh();            // tries to refresh, signing with its own key
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'revoked');
  assert.equal((await v.refresh()).body.error, 'revoked'); // victim's session is dead too; they log in again
});

test('STOLEN COOKIE: a signed-request route rejects the attacker even before expiry', async () => {
  const v = await victim();
  const attacker = await new Browser().init();
  attacker.cookie = v.cookie;
  const noProof = await attacker.req('/api/transfer', { method: 'POST', body: { amount: 9999 } });
  assert.equal(noProof.body.error, 'proof_required');
  const wrongKey = await attacker.req('/api/transfer', { method: 'POST', body: { amount: 9999 }, proof: true });
  assert.equal(wrongKey.body.error, 'revoked');
  assert.equal((await v.req('/api/me')).status, 401);
});

test('legit signed request with fresh login passes; a replayed proof fails', async () => {
  const v = await victim();
  const ok = await v.req('/api/transfer', { method: 'POST', body: { amount: 250 }, proof: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  // capture and replay the exact same proof header
  const ts = Math.floor(now / 1000);
  const header = `${ts}.${await v.sign(`${ts}\nPOST\n/api/transfer`)}`;
  const send = () => fetch(APP + '/api/transfer', { method: 'POST', headers: { cookie: v.cookie, 'user-agent': UA, 'x-forwarded-for': v.ip, 'x-shield-proof': header } });
  assert.equal((await send()).status, 200);
  assert.equal((await (await send()).json()).error, 'proof_replayed');
});

test('a proof older than 60 seconds self-destructs', async () => {
  const v = await victim();
  const ts = Math.floor(now / 1000) - 61;
  const header = `${ts}.${await v.sign(`${ts}\nGET\n/api/me`)}`;
  const res = await fetch(APP + '/api/me', { headers: { cookie: v.cookie, 'user-agent': UA, 'x-forwarded-for': v.ip, 'x-shield-proof': header } });
  assert.equal((await res.json()).error, 'proof_expired');
});

test('ROTATION REPLAY: reusing an old token after rotation kills the whole session', async () => {
  const v = await victim();
  const stolen = v.cookie;
  assert.equal((await v.refresh()).status, 200);
  advance(11);                                   // past the 10s race grace window
  const attacker = await new Browser().init();
  attacker.cookie = stolen;
  assert.equal((await attacker.req('/api/me')).body.error, 'revoked');
  assert.equal((await v.req('/api/me')).status, 401);
});

test('inside the 10s grace window an old token is only "superseded", not an attack', async () => {
  const v = await victim();
  const old = v.cookie;
  await v.refresh();
  const other = new Browser(); other.cookie = old;
  assert.equal((await other.req('/api/me')).body.error, 'superseded');
  assert.equal((await v.req('/api/me')).status, 200);
});

test('RISK ENGINE: new browser + new network revokes; new browser alone asks for MFA', async () => {
  const v = await victim();
  const thief = new Browser({ ua: 'curl/8.4', ip: '198.51.100.7' });
  thief.cookie = v.cookie;
  assert.equal((await thief.req('/api/me')).body.error, 'revoked');

  const v2 = await victim();
  const sameNetwork = new Browser({ ua: 'Mozilla/5.0 (Macintosh) Safari/17' });
  sameNetwork.cookie = v2.cookie;
  sameNetwork.keys = v2.keys;
  assert.equal((await sameNetwork.req('/api/me')).body.error, 'step_up_required');
  assert.equal((await sameNetwork.req('/api/mfa', { method: 'POST', body: { code: '123456' } })).status, 200);
  assert.equal((await sameNetwork.req('/api/me')).status, 200);   // baseline updated after step-up
});

test('STEP-UP: sensitive route needs MFA within 5 minutes', async () => {
  const v = await victim();
  advance(301);
  await v.refresh();
  const r = await v.req('/api/transfer', { method: 'POST', body: { amount: 1 }, proof: true });
  assert.equal(r.body.error, 'step_up_required');
  await v.req('/api/mfa', { method: 'POST', body: { code: '123456' } });
  assert.equal((await v.req('/api/transfer', { method: 'POST', body: { amount: 1 }, proof: true })).status, 200);
});

test('SELF-DESTRUCT LINK: works once, then is gone', async () => {
  const v = await victim();
  const link = (await v.req('/api/download-link', { method: 'POST' })).body.url;
  assert.equal((await v.req(link)).status, 200);
  const second = await v.req(link);
  assert.equal(second.status, 410);
});

test('SELF-DESTRUCT LINK: a forwarded link opened in another session destroys itself', async () => {
  const v = await victim();
  const link = (await v.req('/api/download-link', { method: 'POST' })).body.url;
  const other = await victim();                    // a different logged-in session
  assert.equal((await other.req(link)).body.detail, 'wrong_session');
  assert.equal((await v.req(link)).status, 410);   // gone for everyone now
});

test('SELF-DESTRUCT LINK: expires after 5 minutes', async () => {
  const v = await victim();
  const link = (await v.req('/api/download-link', { method: 'POST' })).body.url;
  advance(301);
  await v.refresh();
  assert.equal((await v.req(link)).body.detail, 'expired');
});

test('VAULT: payment token is locked to its amount; OAuth code lives 60s', async () => {
  const pay = await core.vault.issue('demo', { type: 'payment', data: { amount: 250, currency: 'USD' } });
  assert.equal((await core.vault.redeem('demo', pay.token, { match: { amount: 9999 } })).detail, 'data_mismatch');
  const pay2 = await core.vault.issue('demo', { type: 'payment', data: { amount: 250 } });
  assert.equal((await core.vault.redeem('demo', pay2.token, { match: { amount: 250 } })).valid, true);
  const code = await core.vault.issue('demo', { type: 'oauth-code' });
  advance(61);
  assert.equal((await core.vault.redeem('demo', code.token)).detail, 'expired');
  const otherApp = await core.vault.issue('helix', { type: 'api' });
  assert.equal((await core.vault.redeem('demo', otherApp.token)).reason, 'unknown_or_destroyed');
});

test('WEBHOOK: signed deliveries self-destruct after 60s and cannot be replayed', () => {
  const secret = 'whsec_test_secret_value';
  const body = '{"event":"paid"}';
  const t = Math.floor(Date.now() / 1000);
  const header = signWebhook(secret, body, t);
  const seen = new Set();
  assert.equal(verifyWebhook(secret, body, header, { seen }).valid, true);
  assert.equal(verifyWebhook(secret, body, header, { seen }).reason, 'replayed');
  assert.equal(verifyWebhook(secret, body + 'x', header).reason, 'bad_signature');
  assert.equal(verifyWebhook(secret, body, header, { now: (t + 61) * 1000 }).reason, 'self_destructed');
});

test('KILL SWITCH + console API: admin can see and revoke every session in an app', async () => {
  const v = await victim();
  const auth = { authorization: `Bearer ${ADMIN_KEY}` };
  const base = `http://127.0.0.1:${coreSrv.address().port}`;
  assert.equal((await fetch(`${base}/v1/admin/overview`)).status, 401);
  const ov = await (await fetch(`${base}/v1/admin/overview`, { headers: auth })).json();
  assert.ok(ov.totals.active >= 1);
  assert.ok(ov.totals.alerts24h >= 1);
  const kill = await (await fetch(`${base}/v1/admin/apps/demo/kill`, { method: 'POST', headers: auth })).json();
  assert.ok(kill.revoked >= 1);
  assert.equal((await v.req('/api/me')).status, 401);
  const ev = await (await fetch(`${base}/v1/admin/events?limit=500`, { headers: auth })).json();
  const reasons = new Set(ev.events.map((e) => e.reason).filter(Boolean));
  for (const r of ['token_replay', 'bad_proof', 'bad_refresh_proof', 'risk', 'kill_switch']) assert.ok(reasons.has(r), `missing ${r}`);
});

test('core rejects unknown app keys and weak config', async () => {
  const base = `http://127.0.0.1:${coreSrv.address().port}`;
  const r = await fetch(`${base}/v1/sessions/verify`, { method: 'POST', headers: { authorization: 'Bearer nope', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
  assert.throws(() => createCore({ adminKey: 'short' }));
  assert.throws(() => createCore({ adminKey: ADMIN_KEY, appKeys: { demo: 'short' } }));
});
