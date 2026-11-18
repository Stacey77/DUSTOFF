import express from 'express';
import { fileURLToPath } from 'node:url';

const SDK_FILE = fileURLToPath(new URL('../sdk/nova-shield-sdk.js', import.meta.url));

const defaultContext = (req) => ({
  ip: req.ip,
  ua: req.get('user-agent') || '',
  country: req.get('cf-ipcountry') || req.get('x-country') || null,
});

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    if (!(k in out)) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/**
 * Nova Shield middleware — drop this into any Express app to plug it into Nova Shield Core.
 *
 *   const shield = createShield({ coreUrl, appKey });
 *   app.use(shield.routes());                      // refresh endpoints + browser SDK
 *   app.get('/api/me', shield.protect(), ...);     // any protected route
 *   app.post('/api/pay', shield.protect({ proof: true, stepUp: 300 }), ...);  // sensitive route
 */
export function createShield({
  coreUrl,
  appKey,
  cookieName = '__Host-nova_sid',
  secure = true,
  sameSite = 'Lax',
  cookieMaxAgeSec = 86400,
  basePath = '/_shield',
  getContext = defaultContext,
  failOpen = false,
  timeoutMs = 3000,
} = {}) {
  if (!coreUrl) throw new Error('createShield: coreUrl is required');
  if (!appKey) throw new Error('createShield: appKey is required');
  if (cookieName.startsWith('__Host-') && !secure) throw new Error('__Host- cookies require secure: true');
  const base = coreUrl.replace(/\/$/, '');

  async function core(path, payload) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${appKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error || `core_http_${res.status}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  const cookieAttrs = () => `Path=/; HttpOnly; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
  const setCookie = (res, token) => res.append('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; Max-Age=${cookieMaxAgeSec}; ${cookieAttrs()}`);
  const clearCookie = (res) => res.append('Set-Cookie', `${cookieName}=; Max-Age=0; ${cookieAttrs()}`);
  const tokenOf = (req) => parseCookies(req.headers.cookie)[cookieName] || null;
  const deny = (res, status, error) => res.status(status).json({ error });
  const isDead = (reason) => reason === 'revoked' || reason === 'unknown_session';

  function proofOf(req) {
    const header = req.get('x-shield-proof');
    if (!header) return null;
    const i = header.indexOf('.');
    if (i < 1) return { ts: '', signature: '', method: req.method, path: req.originalUrl };
    return { ts: header.slice(0, i), signature: header.slice(i + 1), method: req.method, path: req.originalUrl };
  }

  /**
   * Protect a route.
   *   proof:      require a per-request signature from the device key (sensitive routes)
   *   stepUp:     require a passkey/MFA within this many seconds
   *   allowRisky: let a step-up-pending session through (use only on the MFA route itself)
   *   onDeny:     (req, res, reason, status) => handle a refusal yourself, e.g. redirect a page to /login
   */
  function protect({ proof: requireProof = false, stepUp = null, allowRisky = false, onDeny = null } = {}) {
    return async (req, res, next) => {
      const deny = (r, status, reason) => (onDeny ? onDeny(req, r, reason, status) : r.status(status).json({ error: reason }));
      const accessToken = tokenOf(req);
      if (!accessToken) return deny(res, 401, 'no_session');
      const proof = proofOf(req);
      if (requireProof && !proof) return deny(res, 401, 'proof_required');

      let r;
      try {
        r = await core('/v1/sessions/verify', { accessToken, ctx: getContext(req), proof, stepUpWithinSec: stepUp });
      } catch (err) {
        if (failOpen) return next();
        return deny(res, 503, 'shield_unavailable');
      }
      if (!r.valid) {
        if (isDead(r.reason)) clearCookie(res);
        return deny(res, 401, r.reason);
      }
      if (r.stepUpRequired && !allowRisky) return deny(res, 401, 'step_up_required');
      req.shield = { session: r.session, risk: r.risk, proof: r.proof };
      next();
    };
  }

  /** Refresh endpoints the browser SDK calls, plus the SDK file itself. */
  function routes() {
    const router = express.Router();
    const sdkOnly = (req, res, next) => (req.get('x-shield-sdk') === '1' ? next() : deny(res, 403, 'sdk_header_required'));

    router.get(`${basePath}/sdk.js`, (req, res) => {
      res.type('application/javascript').set('Cache-Control', 'public, max-age=300').sendFile(SDK_FILE);
    });
    router.post(`${basePath}/challenge`, sdkOnly, async (req, res) => {
      try {
        const r = await core('/v1/sessions/challenge', { accessToken: tokenOf(req) });
        if (!r.ok) { if (isDead(r.reason)) clearCookie(res); return deny(res, 401, r.reason); }
        res.set('Cache-Control', 'no-store').json({ nonce: r.nonce });
      } catch { deny(res, 503, 'shield_unavailable'); }
    });
    router.post(`${basePath}/refresh`, sdkOnly, express.json({ limit: '4kb' }), async (req, res) => {
      try {
        const { nonce, signature } = req.body || {};
        const r = await core('/v1/sessions/refresh', { accessToken: tokenOf(req), nonce, signature, ctx: getContext(req) });
        if (!r.ok) { if (isDead(r.reason)) clearCookie(res); return deny(res, 401, r.reason); }
        setCookie(res, r.accessToken);
        res.set('Cache-Control', 'no-store').json({ expiresAt: r.expiresAt });
      } catch { deny(res, 503, 'shield_unavailable'); }
    });
    return router;
  }

  /** Call from your login route after you've checked the user's credentials. */
  async function startSession(req, res, { userId, publicKeyJwk }) {
    const old = tokenOf(req);
    if (old) await core('/v1/sessions/logout', { accessToken: old }).catch(() => {});
    const r = await core('/v1/sessions', { userId, publicKeyJwk, ctx: getContext(req) });
    setCookie(res, r.accessToken);
    return { sessionId: r.sessionId, expiresAt: r.expiresAt };
  }

  /** Call after the user passes a passkey / MFA check. */
  async function markStepUp(req) {
    return core('/v1/sessions/stepup', { accessToken: tokenOf(req), ctx: getContext(req) });
  }

  async function endSession(req, res) {
    const token = tokenOf(req);
    if (token) await core('/v1/sessions/logout', { accessToken: token }).catch(() => {});
    clearCookie(res);
  }

  /** Self-destruct token vault. */
  const vault = {
    issue: (opts) => core('/v1/vault/issue', opts),
    redeem: (token, req, { match } = {}) => core('/v1/vault/redeem', {
      token, ctx: getContext(req), sessionId: req.shield?.session?.id || null, match: match || null,
    }),
  };

  return { protect, routes, startSession, markStepUp, endSession, vault };
}
