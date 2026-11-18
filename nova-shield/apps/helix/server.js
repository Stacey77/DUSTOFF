import express from 'express';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createShield } from '../../middleware/index.js';
import { loadDotEnv } from '../../core/config.js';

const scrypt = promisify(scryptCb);
const here = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER = join(here, 'public', 'placeholder.html');

/** Password hashes look like scrypt$<salt b64url>$<hash b64url> (made by hash-password.js). */
export async function checkPassword(password, stored) {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const got = await scrypt(String(password ?? ''), Buffer.from(salt, 'base64url'), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * HELIX pilot: the HELIX Console served behind Nova Shield.
 * Login → device-bound session → the console page, with silent token rotation,
 * a Shield badge, and an instant kick-out if the Console's kill switch is used.
 */
export function createHelixApp({
  coreUrl, appKey, username, passwordHash, consoleFile,
  trustProxy = false, secure = true,
}) {
  if (!username || !passwordHash) throw new Error('HELIX_USERNAME and HELIX_PASSWORD_HASH are required');
  const shield = createShield({ coreUrl, appKey, secure, cookieName: secure ? '__Host-helix_sid' : 'helix_sid' });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.use(shield.routes());

  // Simple login throttle: 5 failed tries per IP per 15 minutes.
  const fails = new Map();
  const tooMany = (ip) => {
    const f = fails.get(ip);
    if (!f || Date.now() - f.first > 15 * 60_000) return false;
    return f.count >= 5;
  };
  const recordFail = (ip) => {
    const f = fails.get(ip);
    if (!f || Date.now() - f.first > 15 * 60_000) fails.set(ip, { first: Date.now(), count: 1 });
    else f.count += 1;
  };

  const pageCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
  // HELIX Console is one self-contained page with inline scripts and Google Fonts.
  const consoleCsp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

  app.get('/login', (req, res) => res.set('Content-Security-Policy', pageCsp).sendFile(join(here, 'public', 'login.html')));
  app.use('/assets', express.static(join(here, 'public', 'assets'), { maxAge: '5m' }));

  app.post('/login', async (req, res) => {
    const ip = req.ip;
    if (tooMany(ip)) return res.status(429).json({ error: 'too_many_attempts' });
    const { username: u, password, publicKeyJwk } = req.body || {};
    // Compare fixed-length digests so any input (including non-ASCII) is a clean yes/no, never a throw.
    const digest = (v) => createHash('sha256').update(String(v)).digest();
    const userOk = typeof u === 'string' && timingSafeEqual(digest(u), digest(username));
    const passOk = await checkPassword(password, passwordHash);
    if (!userOk || !passOk) { recordFail(ip); return res.status(401).json({ error: 'bad_credentials' }); }
    fails.delete(ip);
    try {
      await shield.startSession(req, res, { userId: username, publicKeyJwk });
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status === 400 ? 400 : 503).json({ error: err.message });
    }
  });

  app.post('/logout', async (req, res) => { await shield.endSession(req, res); res.json({ ok: true }); });

  app.get('/api/session', shield.protect(), (req, res) => {
    res.set('Cache-Control', 'no-store').json({ userId: req.shield.session.userId, device: req.shield.session.device });
  });

  // The console page: logged-out or expired visitors go to /login, which refreshes silently if it can.
  const toLogin = (req, res, reason) => res.redirect(302, `/login?next=${encodeURIComponent(req.originalUrl)}&r=${encodeURIComponent(reason)}`);
  app.get(['/', '/index.html'], shield.protect({ onDeny: toLogin }), async (req, res) => {
    const file = consoleFile && existsSync(consoleFile) ? consoleFile : PLACEHOLDER;
    let html = await readFile(file, 'utf8');
    const inject = '<script src="/_shield/sdk.js"></script><script src="/assets/helix-shield.js"></script>';
    html = html.includes('</body>') ? html.replace('</body>', `${inject}</body>`) : html + inject;
    res.set({ 'Content-Security-Policy': consoleCsp, 'Cache-Control': 'no-store' }).type('html').send(html);
  });

  app.use((req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  const required = ['HELIX_SHIELD_APP_KEY', 'HELIX_USERNAME', 'HELIX_PASSWORD_HASH'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) { console.error(`Missing in .env: ${missing.join(', ')}`); process.exit(1); }
  const consoleFile = process.env.HELIX_CONSOLE_FILE ? resolve(process.env.HELIX_CONSOLE_FILE) : null;
  const app = createHelixApp({
    coreUrl: process.env.SHIELD_CORE_URL || 'http://127.0.0.1:4000',
    appKey: process.env.HELIX_SHIELD_APP_KEY,
    username: process.env.HELIX_USERNAME,
    passwordHash: process.env.HELIX_PASSWORD_HASH,
    consoleFile,
  });
  const port = Number(process.env.HELIX_PORT || 4100);
  app.listen(port, '127.0.0.1', () => {
    console.log(`HELIX (Shield-protected) on http://localhost:${port}`);
    console.log(consoleFile && existsSync(consoleFile) ? `Serving ${consoleFile}` : 'HELIX_CONSOLE_FILE not found, so serving a placeholder page');
  });
}
