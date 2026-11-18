import { randomToken, sha256, verifySignature, isPublicP256Jwk, publicJwk, keyThumbprint } from './crypto.js';
import { assessRisk, pickContext } from './risk.js';
import { httpError } from './errors.js';

const ALERT_REASONS = new Set(['token_replay', 'bad_proof', 'bad_refresh_proof', 'risk']);

export const publicSession = (s) => ({
  id: s.id, appId: s.appId, userId: s.userId, device: s.device,
  createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, lastStepUpAt: s.lastStepUpAt,
  revokedAt: s.revokedAt, revokeReason: s.revokeReason,
});

/**
 * Device-bound sessions.
 * - The cookie holds only an opaque token; Core stores its hash.
 * - Every session is bound to a non-exportable P-256 key generated in the browser.
 * - Tokens are short-lived and rotate on refresh; refresh requires a signature from the device key.
 * - Reusing a rotated token, or presenting a cookie with the wrong device key, revokes the session.
 */
export class SessionService {
  constructor({ store, config, clock, log }) {
    this.store = store;
    this.cfg = config;
    this.clock = clock;
    this.log = log;
  }

  async create(appId, { userId, publicKeyJwk, ctx, mfa = false } = {}) {
    if (!userId) throw httpError(400, 'userId_required');
    if (!isPublicP256Jwk(publicKeyJwk)) throw httpError(400, 'invalid_public_key');
    const now = this.clock();
    const session = {
      id: randomToken('ses_', 16), appId, userId: String(userId).slice(0, 200),
      publicKeyJwk: publicJwk(publicKeyJwk), device: keyThumbprint(publicKeyJwk),
      // A password-only login is not a step-up. Only a login the app confirms included MFA/passkey counts.
      baseline: pickContext(ctx), createdAt: now, lastSeenAt: now, lastStepUpAt: mfa === true ? now : null,
      revokedAt: null, revokeReason: null,
    };
    await this.store.putSession(session);
    const issued = await this.#issueToken(session);
    await this.log('session.created', session, { device: session.device, mfa: mfa === true });
    return { sessionId: session.id, ...issued };
  }

  async #issueToken(session) {
    const token = randomToken('nst_');
    const now = this.clock();
    await this.store.putToken({
      hash: sha256(token), sessionId: session.id, issuedAt: now,
      expiresAt: now + this.cfg.accessTtlSec * 1000, rotatedAt: null,
    });
    return { accessToken: token, expiresAt: now + this.cfg.accessTtlSec * 1000 };
  }

  async #resolve(appId, accessToken, { allowExpired = false } = {}) {
    if (typeof accessToken !== 'string' || !accessToken) return { error: 'no_session' };
    const rec = await this.store.getToken(sha256(accessToken));
    if (!rec) return { error: 'unknown_session' };
    const session = await this.store.getSession(rec.sessionId);
    // A session belongs to the app that created it; another app's key can't see or change it.
    if (!session || session.appId !== appId) return { error: 'unknown_session' };
    if (session.revokedAt) return { error: 'revoked', session };
    const now = this.clock();

    if (rec.rotatedAt) {
      if (now - rec.rotatedAt <= this.cfg.rotationGraceSec * 1000) return { error: 'superseded', session };
      await this.revoke(session, 'token_replay', { detail: 'A rotated token was reused, so it was likely stolen' });
      return { error: 'revoked', session };
    }
    if (now - session.lastSeenAt > this.cfg.sessionIdleSec * 1000) {
      await this.revoke(session, 'idle_timeout');
      return { error: 'revoked', session };
    }
    if (now > rec.expiresAt) {
      if (!allowExpired) return { error: 'expired', session };
      if (now > rec.expiresAt + this.cfg.refreshGraceSec * 1000) {
        await this.revoke(session, 'refresh_window_closed');
        return { error: 'revoked', session };
      }
    }
    return { session, rec };
  }

  /** Called by the middleware on every protected request. */
  async verify(appId, accessToken, { ctx = {}, proof = null, stepUpWithinSec = null } = {}) {
    const r = await this.#resolve(appId, accessToken);
    if (r.error) return { valid: false, reason: r.error };
    const { session } = r;

    const risk = assessRisk(session.baseline, ctx, this.cfg.risk);
    if (risk.action === 'revoke') {
      await this.revoke(session, 'risk', { risk });
      return { valid: false, reason: 'revoked', risk };
    }

    let proofValid = false;
    if (proof) {
      const result = await this.#checkProof(session, proof);
      if (result === 'bad_signature') {
        await this.revoke(session, 'bad_proof', { detail: 'Request signed with the wrong device key' });
        return { valid: false, reason: 'revoked' };
      }
      if (result !== true) return { valid: false, reason: result };
      proofValid = true;
    }

    const now = this.clock();
    session.lastSeenAt = now;
    await this.store.putSession(session);

    let stepUpRequired = risk.action === 'step_up';
    if (stepUpWithinSec != null && (!session.lastStepUpAt || now - session.lastStepUpAt > Number(stepUpWithinSec) * 1000)) stepUpRequired = true;

    return { valid: true, session: publicSession(session), risk, proof: proofValid, stepUpRequired };
  }

  async #checkProof(session, { ts, nonce, signature, method, path }) {
    const now = this.clock();
    if (!/^\d{9,12}$/.test(String(ts)) || !/^[A-Za-z0-9_-]{16,64}$/.test(String(nonce))) return 'proof_malformed';
    if (Math.abs(now - Number(ts) * 1000) > this.cfg.proofWindowSec * 1000) return 'proof_expired';
    if (typeof signature !== 'string' || !method || !path) return 'proof_malformed';
    const message = `${ts}\n${nonce}\n${String(method).toUpperCase()}\n${path}`;
    if (!(await verifySignature(session.publicKeyJwk, message, signature))) return 'bad_signature';
    // Replay is keyed on what was signed (session + time + nonce), never on the signature's encoding,
    // so re-encoding or re-signing a captured proof can't sneak it through twice.
    const replayKey = sha256(`${session.id}|${ts}|${nonce}`);
    if (!(await this.store.markProof(replayKey, now + 2 * this.cfg.proofWindowSec * 1000))) return 'proof_replayed';
    return true;
  }

  /** Step 1 of refresh: hand out a single-use nonce that self-destructs in nonceTtlSec. */
  async challenge(appId, accessToken) {
    const r = await this.#resolve(appId, accessToken, { allowExpired: true });
    if (r.error) return { ok: false, reason: r.error };
    const nonce = randomToken('nnc_', 24);
    await this.store.putNonce({
      nonce, sessionId: r.session.id, tokenHash: r.rec.hash,
      expiresAt: this.clock() + this.cfg.nonceTtlSec * 1000,
    });
    return { ok: true, nonce, expiresIn: this.cfg.nonceTtlSec };
  }

  /** Step 2 of refresh: the browser signs the nonce with its device key and gets a rotated token. */
  async refresh(appId, accessToken, { nonce, signature, ctx = {} } = {}) {
    const r = await this.#resolve(appId, accessToken, { allowExpired: true });
    if (r.error) return { ok: false, reason: r.error };
    const { session, rec } = r;

    const n = typeof nonce === 'string' ? await this.store.takeNonce(nonce) : null;
    if (!n || n.sessionId !== session.id || n.tokenHash !== rec.hash || this.clock() > n.expiresAt) {
      return { ok: false, reason: 'bad_challenge' };
    }
    if (!(await verifySignature(session.publicKeyJwk, `refresh\n${nonce}`, signature))) {
      await this.revoke(session, 'bad_refresh_proof', { detail: 'Cookie presented without the device key, so it was likely stolen' });
      return { ok: false, reason: 'revoked' };
    }
    const risk = assessRisk(session.baseline, ctx, this.cfg.risk);
    if (risk.action === 'revoke') {
      await this.revoke(session, 'risk', { risk });
      return { ok: false, reason: 'revoked', risk };
    }

    const now = this.clock();
    // Atomic: only one refresh can rotate a given token, so two racing refreshes can't fork the session.
    if (!(await this.store.rotateToken(rec.hash, now))) return { ok: false, reason: 'superseded' };
    session.lastSeenAt = now;
    await this.store.putSession(session);
    return { ok: true, ...(await this.#issueToken(session)) };
  }

  /** The app calls this after the user passes a passkey / MFA check. Resets the risk baseline. */
  async stepUp(appId, accessToken, { ctx = {} } = {}) {
    const r = await this.#resolve(appId, accessToken);
    if (r.error) return { ok: false, reason: r.error };
    const { session } = r;
    session.lastStepUpAt = this.clock();
    session.baseline = pickContext(ctx);
    await this.store.putSession(session);
    await this.log('session.step_up', session);
    return { ok: true, lastStepUpAt: session.lastStepUpAt };
  }

  async logout(appId, accessToken) {
    const rec = typeof accessToken === 'string' ? await this.store.getToken(sha256(accessToken)) : null;
    const session = rec ? await this.store.getSession(rec.sessionId) : null;
    if (session && session.appId === appId && !session.revokedAt) await this.revoke(session, 'logout');
    return { ok: true };
  }

  async revoke(session, reason, extra = {}) {
    if (session.revokedAt) return;
    session.revokedAt = this.clock();
    session.revokeReason = reason;
    await this.store.putSession(session);
    await this.log('session.revoked', session, { reason, severity: ALERT_REASONS.has(reason) ? 'alert' : 'info', ...extra });
  }

  async revokeById(id, reason = 'admin') {
    const s = await this.store.getSession(id);
    if (!s) return false;
    await this.revoke(s, reason);
    return true;
  }

  async killApp(appId, reason = 'kill_switch') {
    const list = await this.store.listSessions({ appId, active: true });
    for (const s of list) await this.revoke(s, reason);
    return list.length;
  }

  async killAll(reason = 'kill_switch_all') {
    const list = await this.store.listSessions({ active: true });
    for (const s of list) await this.revoke(s, reason);
    return list.length;
  }
}
