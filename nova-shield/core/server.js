import express from 'express';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildConfig, loadDotEnv, parseAppKeys } from './config.js';
import { MemoryStore } from './store.js';
import { SessionService, publicSession } from './sessions.js';
import { Vault } from './vault.js';
import { safeEqual } from './crypto.js';

const here = dirname(fileURLToPath(import.meta.url));
const MIN_KEY = 24;

/**
 * Nova Shield Core — the central service every app plugs into.
 * Holds sessions and the self-destruct token vault, makes the security decisions,
 * keeps the audit log and serves the Shield Console.
 */
export function createCore({ appKeys = {}, adminKey, config: overrides, clock = Date.now, store = new MemoryStore() } = {}) {
  if (!adminKey || adminKey.length < MIN_KEY) throw new Error(`SHIELD_ADMIN_KEY must be set (${MIN_KEY}+ characters)`);
  for (const [id, key] of Object.entries(appKeys)) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/i.test(id)) throw new Error(`Bad app id "${id}"`);
    if (!key || key.length < MIN_KEY) throw new Error(`App key for "${id}" must be ${MIN_KEY}+ characters`);
  }
  const config = buildConfig(overrides);

  const log = (type, who = {}, data = {}) => store.addEvent({
    at: clock(), type, appId: who.appId || null, sessionId: who.id || null, userId: who.userId || null,
    severity: 'info', ...data,
  });
  const sessions = new SessionService({ store, config, clock, log });
  const vault = new Vault({ store, clock, log });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    });
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  const bearer = (req) => (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const appAuth = (req, res, next) => {
    const presented = bearer(req);
    const match = Object.entries(appKeys).find(([, key]) => safeEqual(key, presented));
    if (!match) return res.status(401).json({ error: 'bad_app_key' });
    req.appId = match[0];
    next();
  };
  const adminAuth = (req, res, next) => {
    if (!safeEqual(adminKey, bearer(req))) return res.status(401).json({ error: 'bad_admin_key' });
    next();
  };
  const body = (req) => req.body || {};

  app.get('/health', (req, res) => res.json({ ok: true, service: 'nova-shield-core', version: '0.1.0' }));

  // ---- App API (server-to-server, called by the middleware) ----
  const v1 = express.Router();
  v1.use(appAuth);
  v1.post('/sessions', async (req, res) => {
    const { userId, publicKeyJwk, ctx, mfa } = body(req);
    res.json(await sessions.create(req.appId, { userId, publicKeyJwk, ctx, mfa }));
  });
  v1.post('/sessions/verify', async (req, res) => {
    const { accessToken, ctx, proof, stepUpWithinSec } = body(req);
    res.json(await sessions.verify(req.appId, accessToken, { ctx, proof, stepUpWithinSec }));
  });
  v1.post('/sessions/challenge', async (req, res) => res.json(await sessions.challenge(req.appId, body(req).accessToken)));
  v1.post('/sessions/refresh', async (req, res) => {
    const { accessToken, nonce, signature, ctx } = body(req);
    res.json(await sessions.refresh(req.appId, accessToken, { nonce, signature, ctx }));
  });
  v1.post('/sessions/stepup', async (req, res) => {
    const { accessToken, ctx } = body(req);
    res.json(await sessions.stepUp(req.appId, accessToken, { ctx }));
  });
  v1.post('/sessions/logout', async (req, res) => res.json(await sessions.logout(req.appId, body(req).accessToken)));
  v1.post('/vault/issue', async (req, res) => res.json(await vault.issue(req.appId, body(req))));
  v1.post('/vault/redeem', async (req, res) => {
    const { token, ctx, sessionId, match } = body(req);
    res.json(await vault.redeem(req.appId, token, { ctx, sessionId, match }));
  });
  // ---- Admin API (Shield Console) ----
  const admin = express.Router();
  admin.use(adminAuth);
  admin.get('/overview', async (req, res) => {
    const all = await store.listSessions();
    const dayAgo = clock() - 86400_000;
    const events = await store.listEvents({ since: dayAgo, limit: 5000 });
    const apps = Object.keys(appKeys).map((appId) => {
      const mine = all.filter((s) => s.appId === appId);
      return {
        appId,
        active: mine.filter((s) => !s.revokedAt).length,
        revoked24h: mine.filter((s) => s.revokedAt && s.revokedAt >= dayAgo).length,
        alerts24h: events.filter((e) => e.appId === appId && e.severity === 'alert').length,
      };
    });
    res.json({
      now: clock(),
      totals: {
        apps: apps.length,
        active: apps.reduce((n, a) => n + a.active, 0),
        revoked24h: apps.reduce((n, a) => n + a.revoked24h, 0),
        alerts24h: events.filter((e) => e.severity === 'alert').length,
      },
      apps,
    });
  });
  admin.get('/sessions', async (req, res) => {
    const list = await store.listSessions({ appId: req.query.appId || undefined, active: req.query.all ? undefined : true });
    res.json({ sessions: list.sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, 500).map(publicSession) });
  });
  admin.post('/sessions/:id/revoke', async (req, res) => res.json({ ok: await sessions.revokeById(req.params.id) }));
  admin.post('/apps/:appId/kill', async (req, res) => res.json({ revoked: await sessions.killApp(req.params.appId) }));
  admin.post('/kill-all', async (req, res) => res.json({ revoked: await sessions.killAll() }));
  admin.get('/events', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    res.json({ events: await store.listEvents({ limit, appId: req.query.appId || undefined }) });
  });
  app.use('/v1/admin', admin);
  app.use('/v1', v1);   // after /v1/admin so admin calls aren't caught by the app-key check

  // ---- Shield Console (static) ----
  app.get('/', (req, res) => res.redirect('/console'));
  app.get('/console', (req, res) => res.sendFile(join(here, 'console', 'index.html')));
  app.use('/console', express.static(join(here, 'console')));

  app.use((req, res) => res.status(404).json({ error: 'not_found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
    if (err.expose) return res.status(err.status || 400).json({ error: err.message });
    console.error('[nova-shield-core]', err);
    res.status(500).json({ error: 'internal_error' });
  });

  const sweeper = setInterval(() => store.sweep(clock(), config).catch(() => {}), 30_000);
  sweeper.unref();

  return { app, sessions, vault, store, config, close: () => clearInterval(sweeper) };
}

// Run directly: node core/server.js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  const appKeys = parseAppKeys(process.env.SHIELD_APP_KEYS);
  const core = createCore({ appKeys, adminKey: process.env.SHIELD_ADMIN_KEY });
  const host = process.env.SHIELD_HOST || '127.0.0.1';
  const port = Number(process.env.SHIELD_PORT || 4000);
  core.app.listen(port, host, () => {
    console.log(`Nova Shield Core listening on http://${host}:${port}`);
    console.log(`Shield Console: http://${host}:${port}/console`);
    console.log(`Apps connected: ${Object.keys(appKeys).join(', ') || 'none'}`);
  });
}
