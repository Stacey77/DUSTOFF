// Vault storage: SQLite + FTS5 keyword retrieval, freshness tracking,
// encrypted private entries, and an approval gate for reads of private data.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { deriveKey, newSalt, encrypt, decrypt } from './crypto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const VERDICTS = ['supported', 'contradicted', 'unclear'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entries (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT,              -- plaintext, public entries only
  body_enc      TEXT,              -- AES-GCM ciphertext, private entries only
  sensitivity   TEXT NOT NULL CHECK (sensitivity IN ('public','private')),
  tags          TEXT NOT NULL DEFAULT '',
  source_url    TEXT,
  content_hash  TEXT NOT NULL,     -- sha256 of the body as stored
  source_hash   TEXT,              -- sha256 of the source page at last fetch
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  verified_at   INTEGER,           -- last time a check confirmed it
  ttl_days      INTEGER NOT NULL DEFAULT 30,
  expires_at    INTEGER,
  needs_review  INTEGER NOT NULL DEFAULT 0,
  disputed      INTEGER NOT NULL DEFAULT 0,
  approved_until INTEGER           -- human approval window for private reads
);
CREATE TABLE IF NOT EXISTS verifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  verdict     TEXT NOT NULL,
  evidence_url TEXT,
  note        TEXT,
  checker     TEXT,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,
  actor     TEXT NOT NULL,
  action    TEXT NOT NULL,
  entry_id  TEXT,
  detail    TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  id UNINDEXED, title, tags, body, tokenize = 'porter unicode61'
);
`;

// Reduce a web page to its visible text so markup-only changes don't count as content changes.
export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class Vault {
  constructor(path, { passphrase, actor } = {}) {
    this.actor = actor || process.env.KV_ACTOR || 'unknown';
    mkdirSync(dirname(path), { recursive: true });
    const fresh = !existsSync(path);
    this.db = new DatabaseSync(path);
    if (fresh) chmodSync(path, 0o600);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
    this.key = null;
    this.#initKey(passphrase);
  }

  #meta(key) {
    return this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null;
  }

  #initKey(passphrase) {
    const salt = this.#meta('salt');
    if (!salt) {
      // First run: create a salt and a check token so wrong passphrases are caught.
      const newS = newSalt();
      this.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('salt', newS);
      if (passphrase) {
        const k = deriveKey(passphrase, newS);
        this.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
          .run('check', encrypt(k, 'knowledge-vault-ok'));
        this.key = k;
      }
      return;
    }
    if (!passphrase) return; // public-only mode: private entries stay locked
    const k = deriveKey(passphrase, salt);
    const check = this.#meta('check');
    let ok = false;
    try { ok = !check || decrypt(k, check) === 'knowledge-vault-ok'; } catch { ok = false; }
    if (!ok) throw new Error('Wrong passphrase for this vault.');
    this.key = k;
  }

  #requireKey() {
    if (!this.key) throw new Error('This operation needs the vault passphrase (set KV_PASSPHRASE).');
  }

  #audit(action, entryId, detail = null) {
    this.db.prepare('INSERT INTO audit (ts, actor, action, entry_id, detail) VALUES (?,?,?,?,?)')
      .run(Date.now(), this.actor, action, entryId, detail ? JSON.stringify(detail) : null);
  }

  auditLog({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(limit)
      .map((r) => ({ ...r, ts: new Date(r.ts).toISOString(), detail: r.detail ? JSON.parse(r.detail) : null }));
  }

  #fts(id, title, tags, body) {
    this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(id);
    this.db.prepare('INSERT INTO entries_fts (id, title, tags, body) VALUES (?, ?, ?, ?)')
      .run(id, title, tags, body ?? '');
  }

  #status(row, now = Date.now()) {
    if (row.disputed) return 'disputed';
    if (row.needs_review) return 'needs_review';
    if (!row.verified_at) return 'unverified';
    if (row.expires_at && now > row.expires_at) return 'stale';
    return 'fresh';
  }

  #access(row, now = Date.now()) {
    if (row.sensitivity === 'public') return 'open';
    return row.approved_until && row.approved_until > now ? 'approved' : 'locked';
  }

  #summary(row, now = Date.now()) {
    return {
      id: row.id,
      title: row.title,
      sensitivity: row.sensitivity,
      tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
      source_url: row.source_url,
      freshness: this.#status(row, now),
      verified_at: row.verified_at ? new Date(row.verified_at).toISOString() : null,
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      access: this.#access(row, now),
    };
  }

  add({ title, body, tags = [], source_url = null, sensitivity = 'public', ttl_days = 30 }) {
    if (!title || !body) throw new Error('title and body are required.');
    if (!['public', 'private'].includes(sensitivity)) throw new Error('sensitivity must be public or private.');
    if (sensitivity === 'private') this.#requireKey();
    const now = Date.now();
    const id = randomUUID();
    const tagStr = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].join(',');
    const contentHash = createHash('sha256').update(body).digest('hex');
    const stored = sensitivity === 'public' ? body : null;
    const enc = sensitivity === 'private' ? encrypt(this.key, body) : null;
    this.db.exec('BEGIN');
    try {
      this.db.prepare(`INSERT INTO entries
        (id, title, body, body_enc, sensitivity, tags, source_url, content_hash,
         created_at, updated_at, ttl_days)
        VALUES ($id,$title,$body,$enc,$sens,$tags,$url,$hash,$now,$now,$ttl)`)
        .run({ $id: id, $title: title, $body: stored, $enc: enc, $sens: sensitivity,
          $tags: tagStr, $url: source_url, $hash: contentHash, $now: now, $ttl: ttl_days });
      this.#fts(id, title, tagStr, stored);
      this.#audit('add', id, { sensitivity, source_url });
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return this.#summary(this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id), now);
  }

  search(query, { limit = 10 } = {}) {
    const terms = String(query).split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(Boolean)
      .map((t) => `"${t}"`);
    if (terms.length === 0) return [];
    const now = Date.now();
    const rows = this.db.prepare(`
      SELECT e.* FROM entries_fts f JOIN entries e ON e.id = f.id
      WHERE entries_fts MATCH $q ORDER BY bm25(entries_fts) LIMIT $lim`)
      .all({ $q: terms.join(' OR '), $lim: limit });
    return rows.map((r) => this.#summary(r, now));
  }

  // Returns the entry. Private bodies come back only inside an approval window.
  get(id) {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!row) throw new Error(`No entry with id ${id}.`);
    const now = Date.now();
    const summary = this.#summary(row, now);
    if (row.sensitivity === 'public') {
      this.#audit('read', id);
      return { ...summary, body: row.body };
    }
    if (summary.access !== 'approved') {
      this.#audit('read_denied_locked', id);
      return { ...summary, body: null, note: 'Locked. A human must approve access first.' };
    }
    this.#requireKey();
    this.#audit('read_private', id);
    return { ...summary, body: decrypt(this.key, row.body_enc) };
  }

  // Human-only (CLI). Opens a time-limited read window for one private entry.
  approve(id, minutes = 15) {
    // Logged so the human's approvals are reviewable later.
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!row) throw new Error(`No entry with id ${id}.`);
    if (row.sensitivity !== 'private') throw new Error('Only private entries need approval.');
    const until = Date.now() + minutes * 60 * 1000;
    this.db.prepare('UPDATE entries SET approved_until = ? WHERE id = ?').run(until, id);
    this.#audit('approve', id, { minutes });
    return { id, title: row.title, approved_until: new Date(until).toISOString() };
  }

  revoke(id) {
    this.db.prepare('UPDATE entries SET approved_until = NULL WHERE id = ?').run(id);
    this.#audit('revoke', id);
    return { id, revoked: true };
  }

  // A fact-checking subagent reports a verdict with evidence.
  // Human-only (CLI). Permanently removes an entry, its verdicts, and its index row.
  delete(id) {
    const row = this.db.prepare('SELECT title FROM entries WHERE id = ?').get(id);
    if (!row) throw new Error(`No entry with id ${id}.`);
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);
      this.#audit('delete', id, { title: row.title });
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return { id, title: row.title, deleted: true };
  }

  recordVerification({ id, verdict, evidence_url = null, note = '', checker = 'unknown' }) {
    if (!VERDICTS.includes(verdict)) throw new Error(`verdict must be one of ${VERDICTS.join(', ')}.`);
    // A "supported" verdict resets the freshness clock, so it must cite evidence.
    if (verdict === 'supported' && !evidence_url) throw new Error('A "supported" verdict needs an evidence_url.');
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!row) throw new Error(`No entry with id ${id}.`);
    const now = Date.now();
    this.db.exec('BEGIN');
    try {
      this.#audit('verify', id, { verdict, checker, evidence_url });
      this.db.prepare(`INSERT INTO verifications (entry_id, verdict, evidence_url, note, checker, created_at)
        VALUES (?,?,?,?,?,?)`).run(id, verdict, evidence_url, note, checker, now);
      if (verdict === 'supported') {
        this.db.prepare(`UPDATE entries SET verified_at = ?, expires_at = ? + ttl_days * ?,
          needs_review = 0, disputed = 0 WHERE id = ?`).run(now, now, DAY_MS, id);
      } else if (verdict === 'contradicted') {
        this.db.prepare('UPDATE entries SET disputed = 1 WHERE id = ?').run(id);
      } else {
        this.db.prepare('UPDATE entries SET needs_review = 1 WHERE id = ?').run(id);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return this.#summary(this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id), now);
  }

  // Fetches the entry's source URL and compares it to the last snapshot.
  // Unchanged source = verified. Changed source = needs review. Failed fetch = unclear.
  async checkSource(id, fetchImpl = fetch) {
    const row = this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
    if (!row) throw new Error(`No entry with id ${id}.`);
    if (!row.source_url) throw new Error('This entry has no source_url to check.');
    let verdict, note;
    try {
      const res = await fetchImpl(row.source_url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = visibleText(await res.text());
      const hash = createHash('sha256').update(text).digest('hex');
      if (!row.source_hash) {
        this.db.prepare('UPDATE entries SET source_hash = ? WHERE id = ?').run(hash, id);
        verdict = 'supported';
        note = 'Source reachable; baseline snapshot recorded.';
      } else if (hash === row.source_hash) {
        verdict = 'supported';
        note = 'Source unchanged since last check.';
      } else {
        this.db.prepare('UPDATE entries SET source_hash = ? WHERE id = ?').run(hash, id);
        verdict = 'unclear';
        note = 'Source content changed since last check. Review the entry against the new page.';
      }
    } catch (e) {
      verdict = 'unclear';
      note = `Source could not be checked: ${e.message}`;
    }
    return this.recordVerification({ id, verdict, evidence_url: row.source_url, note, checker: 'source-check' });
  }

  // Entries that are stale, unverified, or flagged. Used to plan re-checks.
  needsAttention(limit = 50) {
    const now = Date.now();
    return this.db.prepare(`SELECT * FROM entries
      WHERE disputed = 1 OR needs_review = 1 OR verified_at IS NULL OR expires_at < $now
      ORDER BY COALESCE(expires_at, 0) ASC LIMIT $lim`).all({ $now: now, $lim: limit })
      .map((r) => this.#summary(r, now));
  }

  status() {
    const counts = {};
    const now = Date.now();
    for (const r of this.db.prepare('SELECT * FROM entries').all()) {
      const s = this.#status(r, now);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    const total = this.db.prepare('SELECT COUNT(*) n FROM entries').get().n;
    return { total, by_freshness: counts };
  }

  close() {
    this.db.close();
  }
}
