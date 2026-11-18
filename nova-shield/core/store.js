/**
 * In-memory store. Every method is async so a Redis or Postgres adapter can drop in
 * with the same interface. Tokens and vault entries are stored only as SHA-256 hashes.
 */
export class MemoryStore {
  constructor({ maxEvents = 5000 } = {}) {
    this.sessions = new Map();
    this.tokens = new Map();
    this.nonces = new Map();
    this.proofs = new Map();
    this.vault = new Map();
    this.events = [];
    this.maxEvents = maxEvents;
  }

  async getSession(id) { return this.sessions.get(id) || null; }
  async putSession(s) { this.sessions.set(s.id, s); }
  async listSessions({ appId, active } = {}) {
    let list = [...this.sessions.values()];
    if (appId) list = list.filter((s) => s.appId === appId);
    if (active !== undefined) list = list.filter((s) => !s.revokedAt === active);
    return list;
  }

  async getToken(hash) { return this.tokens.get(hash) || null; }
  async putToken(t) { this.tokens.set(t.hash, t); }

  async putNonce(n) { this.nonces.set(n.nonce, n); }
  async takeNonce(nonce) {
    const n = this.nonces.get(nonce) || null;
    this.nonces.delete(nonce);
    return n;
  }

  /** Returns true the first time a proof is seen, false on replay. */
  async markProof(key, expiresAt) {
    if (this.proofs.has(key)) return false;
    this.proofs.set(key, expiresAt);
    return true;
  }

  async getVault(hash) { return this.vault.get(hash) || null; }
  async putVault(v) { this.vault.set(v.hash, v); }
  async deleteVault(hash) { this.vault.delete(hash); }

  async addEvent(e) {
    this.events.push(e);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
  }
  async listEvents({ limit = 100, appId, since } = {}) {
    let list = this.events;
    if (appId) list = list.filter((e) => e.appId === appId);
    if (since) list = list.filter((e) => e.at >= since);
    return list.slice(-limit).reverse();
  }

  /** Remove anything that has self-destructed. */
  async sweep(now, cfg) {
    for (const [k, n] of this.nonces) if (n.expiresAt < now) this.nonces.delete(k);
    for (const [k, exp] of this.proofs) if (exp < now) this.proofs.delete(k);
    for (const [k, v] of this.vault) if (v.expiresAt < now) this.vault.delete(k);
    // Rotated tokens are kept until their refresh window closes, so a late replay is still caught.
    for (const [k, t] of this.tokens) {
      const s = this.sessions.get(t.sessionId);
      if (!s || s.revokedAt || now > t.expiresAt + cfg.refreshGraceSec * 1000) this.tokens.delete(k);
    }
    for (const [k, s] of this.sessions) if (s.revokedAt && now - s.revokedAt > 7 * 86400_000) this.sessions.delete(k);
  }
}
