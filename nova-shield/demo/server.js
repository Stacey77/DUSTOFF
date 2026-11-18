import express from 'express';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createShield } from '../middleware/index.js';
import { loadDotEnv } from '../core/config.js';

const here = dirname(fileURLToPath(import.meta.url));

// Demo-only credentials. A real app checks its own user store (with hashed passwords).
const DEMO_USER = { username: 'demo', password: 'demo', id: 'user_demo' };
const DEMO_MFA_CODE = '123456';

/** A sample app showing how any Nova Digitus app plugs into Nova Shield. */
export function createDemoApp({ coreUrl, appKey, trustProxy = false, secure = true }) {
  const shield = createShield({ coreUrl, appKey, secure, cookieName: secure ? '__Host-nova_sid' : 'nova_sid' });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  // 1. Mount the Shield routes: /_shield/sdk.js, /_shield/challenge, /_shield/refresh
  app.use(shield.routes());
  app.use(express.static(join(here, 'public')));

  // 2. Login: check credentials yourself, then start a device-bound session
  app.post('/login', async (req, res) => {
    const { username, password, publicKeyJwk } = req.body || {};
    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
      return res.status(401).json({ error: 'bad_credentials' });
    }
    try {
      const s = await shield.startSession(req, res, { userId: DEMO_USER.id, publicKeyJwk });
      res.json({ ok: true, expiresAt: s.expiresAt });
    } catch (err) {
      res.status(err.status === 400 ? 400 : 503).json({ error: err.message });
    }
  });

  app.post('/logout', async (req, res) => {
    await shield.endSession(req, res);
    res.json({ ok: true });
  });

  // 3. Ordinary protected route
  app.get('/api/me', shield.protect(), (req, res) => {
    res.json({ userId: req.shield.session.userId, device: req.shield.session.device, risk: req.shield.risk });
  });

  // 4. Sensitive route: needs a request signed by the device key AND a passkey/MFA within 5 minutes
  app.post('/api/transfer', shield.protect({ proof: true, stepUp: 300 }), (req, res) => {
    res.json({ ok: true, message: `Transfer of ${req.body?.amount ?? 0} approved for ${req.shield.session.userId}` });
  });

  // 5. MFA / passkey check (demo code 123456). Clears a pending step-up.
  app.post('/api/mfa', shield.protect({ allowRisky: true }), async (req, res) => {
    if (req.body?.code !== DEMO_MFA_CODE) return res.status(401).json({ error: 'bad_code' });
    await shield.markStepUp(req);
    res.json({ ok: true });
  });

  // 6. Self-destruct download link: one use, 5 minutes, only for this session
  app.post('/api/download-link', shield.protect(), async (req, res) => {
    const t = await shield.vault.issue({
      type: 'download', subject: req.shield.session.userId,
      bind: { sessionId: req.shield.session.id }, data: { file: 'q4-report.pdf' },
    });
    res.json({ url: `/download/${encodeURIComponent(t.token)}`, expiresAt: t.expiresAt });
  });

  app.get('/download/:token', shield.protect(), async (req, res) => {
    const r = await shield.vault.redeem(req.params.token, req);
    if (!r.valid) return res.status(410).json({ error: 'This link has self-destructed', detail: r.detail || r.reason });
    res.json({ ok: true, file: r.data.file, note: 'A real app streams the file here.' });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  const coreUrl = process.env.SHIELD_CORE_URL || 'http://127.0.0.1:4000';
  const appKey = process.env.SHIELD_APP_KEY;
  if (!appKey) { console.error('Set SHIELD_APP_KEY in .env (the key you gave the "demo" app in SHIELD_APP_KEYS)'); process.exit(1); }
  const port = Number(process.env.DEMO_PORT || 3000);
  createDemoApp({ coreUrl, appKey }).listen(port, '127.0.0.1', () => {
    console.log(`Demo app on http://localhost:${port}  (log in with demo / demo, MFA code 123456)`);
  });
}
