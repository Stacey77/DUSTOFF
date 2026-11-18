import { randomToken, sha256 } from './crypto.js';
import { httpError } from './errors.js';

/** Self-destruct defaults per token type. maxUses: null = unlimited until it expires. */
export const PRESETS = {
  'api':        { ttlSec: 900,   maxUses: null },
  'magic-link': { ttlSec: 600,   maxUses: 1 },
  'reset-link': { ttlSec: 900,   maxUses: 1 },
  'oauth-code': { ttlSec: 60,    maxUses: 1 },
  'download':   { ttlSec: 300,   maxUses: 1 },
  'export':     { ttlSec: 3600,  maxUses: 1 },
  'payment':    { ttlSec: 300,   maxUses: 1 },
  'share':      { ttlSec: 86400, maxUses: 1 },
  'custom':     { ttlSec: 60,    maxUses: 1 },
};

const MAX_TTL_SEC = 30 * 86400;

/**
 * The self-destruct token vault. Every token is short-lived, optionally single-use,
 * and optionally locked to a session, an IP, or exact data values (such as a payment amount).
 * A token presented from the wrong place self-destructs immediately.
 */
export class Vault {
  constructor({ store, clock, log }) {
    this.store = store;
    this.clock = clock;
    this.log = log;
  }

  async issue(appId, { type = 'custom', subject = null, ttlSec, maxUses, bind = {}, data = null } = {}) {
    const preset = PRESETS[type];
    if (!preset) throw httpError(400, 'unknown_token_type');
    const ttl = Math.floor(Number(ttlSec ?? preset.ttlSec));
    if (!Number.isFinite(ttl) || ttl < 1 || ttl > MAX_TTL_SEC) throw httpError(400, 'invalid_ttl');
    const uses = maxUses === undefined ? preset.maxUses : maxUses;
    if (uses !== null && (!Number.isInteger(uses) || uses < 1)) throw httpError(400, 'invalid_max_uses');
    if (data !== null && JSON.stringify(data).length > 8192) throw httpError(400, 'data_too_large');

    const token = randomToken(`nsv_${type}_`, 24);
    const now = this.clock();
    const rec = {
      hash: sha256(token), appId, type, subject: subject == null ? null : String(subject).slice(0, 200),
      data, bind: { sessionId: bind.sessionId || null, ip: bind.ip || null },
      issuedAt: now, expiresAt: now + ttl * 1000, maxUses: uses, uses: 0,
    };
    await this.store.putVault(rec);
    await this.log('vault.issued', { appId, userId: rec.subject }, { tokenType: type, ttlSec: ttl, maxUses: uses });
    return { token, type, expiresAt: rec.expiresAt, maxUses: uses };
  }

  async redeem(appId, token, { ctx = {}, sessionId = null, match = null } = {}) {
    const rec = typeof token === 'string' ? await this.store.getVault(sha256(token)) : null;
    if (!rec || rec.appId !== appId) return { valid: false, reason: 'unknown_or_destroyed' };

    const destroy = async (reason, severity = 'info') => {
      await this.store.deleteVault(rec.hash);
      await this.log('vault.self_destructed', { appId, userId: rec.subject }, { tokenType: rec.type, reason, severity });
      return { valid: false, reason: 'self_destructed', detail: reason };
    };

    if (this.clock() > rec.expiresAt) return destroy('expired');
    if (rec.bind.sessionId && rec.bind.sessionId !== sessionId) return destroy('wrong_session', 'alert');
    if (rec.bind.ip && rec.bind.ip !== ctx.ip) return destroy('wrong_network', 'alert');
    if (match && typeof match === 'object') {
      for (const [k, v] of Object.entries(match)) {
        if (rec.data?.[k] !== v) return destroy('data_mismatch', 'alert');
      }
    }

    rec.uses += 1;
    const remainingUses = rec.maxUses === null ? null : rec.maxUses - rec.uses;
    if (remainingUses === 0) {
      await this.store.deleteVault(rec.hash);
      await this.log('vault.burned', { appId, userId: rec.subject }, { tokenType: rec.type });
    } else {
      await this.store.putVault(rec);
    }
    return { valid: true, type: rec.type, subject: rec.subject, data: rec.data, remainingUses, expiresAt: rec.expiresAt };
  }
}
