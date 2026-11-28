import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Vault } from '../src/store.js';

const dirs = [];
function tmpPath() {
  const d = mkdtempSync(join(tmpdir(), 'kv-test-'));
  dirs.push(d);
  return join(d, 'vault.db');
}
test.after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

test('public entries are searchable and open', () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'Next.js caching', body: 'Use the revalidate option for ISR pages.', tags: ['Next.js'] });
  const hits = v.search('revalidate');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, e.id);
  assert.equal(hits[0].access, 'open');
  assert.equal(v.get(e.id).body, 'Use the revalidate option for ISR pages.');
  v.close();
});

test('private entries never return a body without approval', () => {
  const v = new Vault(tmpPath(), { passphrase: 'correct horse' });
  const e = v.add({ title: 'API key note', body: 'secret-value-123', sensitivity: 'private' });
  const locked = v.get(e.id);
  assert.equal(locked.access, 'locked');
  assert.equal(locked.body, null);
  // The body text must not be in the FTS index either.
  assert.equal(v.search('secret-value-123').length, 0);
  v.close();
});

test('approval opens a time window, and it closes again', () => {
  const v = new Vault(tmpPath(), { passphrase: 'pw' });
  const e = v.add({ title: 'Client contract', body: 'rate is 120/hr', sensitivity: 'private' });
  v.approve(e.id, 1);
  assert.equal(v.get(e.id).body, 'rate is 120/hr');
  v.revoke(e.id);
  assert.equal(v.get(e.id).body, null);
  v.close();
});

test('an expired approval window is locked again', () => {
  const v = new Vault(tmpPath(), { passphrase: 'pw' });
  const e = v.add({ title: 'Doc', body: 'hidden', sensitivity: 'private' });
  v.approve(e.id, 1);
  v.db.prepare('UPDATE entries SET approved_until = ? WHERE id = ?').run(Date.now() - 1000, e.id);
  assert.equal(v.get(e.id).body, null);
  v.close();
});

test('wrong passphrase is rejected on reopen', () => {
  const path = tmpPath();
  new Vault(path, { passphrase: 'right' }).close();
  assert.throws(() => new Vault(path, { passphrase: 'wrong' }), /Wrong passphrase/);
});

test('private entries need a passphrase to be written', () => {
  const v = new Vault(tmpPath());
  assert.throws(() => v.add({ title: 't', body: 'b', sensitivity: 'private' }), /passphrase/);
  v.close();
});

test('freshness: unverified, then supported, then stale after expiry', () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'Fact', body: 'Node 22 is LTS', ttl_days: 30 });
  assert.equal(v.get(e.id).freshness, 'unverified');
  const verified = v.recordVerification({ id: e.id, verdict: 'supported', evidence_url: 'https://nodejs.org', checker: 'test' });
  assert.equal(verified.freshness, 'fresh');
  v.db.prepare('UPDATE entries SET expires_at = ? WHERE id = ?').run(Date.now() - 1, e.id);
  assert.equal(v.search('LTS')[0].freshness, 'stale');
  v.close();
});

test('contradicted verdict marks an entry disputed and it is listed for attention', () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'Claim', body: 'Pricing is $5', source_url: 'https://example.com/pricing' });
  const r = v.recordVerification({ id: e.id, verdict: 'contradicted', evidence_url: 'https://example.com/pricing', note: 'now $7' });
  assert.equal(r.freshness, 'disputed');
  assert.ok(v.needsAttention().some((x) => x.id === e.id));
  v.close();
});

test('checkSource: baseline, unchanged, then changed', async () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'Docs page', body: 'summary', source_url: 'https://example.com/docs' });
  let page = '<p>version one</p>';
  const fakeFetch = async () => ({ ok: true, status: 200, text: async () => page });

  let r = await v.checkSource(e.id, fakeFetch);
  assert.equal(r.freshness, 'fresh'); // baseline recorded

  r = await v.checkSource(e.id, fakeFetch);
  assert.equal(r.freshness, 'fresh'); // unchanged

  page = '<p>version two</p>';
  r = await v.checkSource(e.id, fakeFetch);
  assert.equal(r.freshness, 'needs_review'); // changed, so a human or subagent must look
  v.close();
});

test('checkSource: unreachable source is flagged, not marked fresh', async () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'Down page', body: 'x', source_url: 'https://example.com/gone' });
  const r = await v.checkSource(e.id, async () => { throw new Error('network down'); });
  assert.equal(r.freshness, 'needs_review');
  v.close();
});

test('search handles punctuation and empty queries safely', () => {
  const v = new Vault(tmpPath());
  v.add({ title: 'Quotes', body: 'He said "hello" -- AND NOT *' });
  assert.doesNotThrow(() => v.search('"hello" -- * AND ('));
  assert.deepEqual(v.search('   '), []);
  v.close();
});

test('a supported verdict without evidence is rejected', () => {
  const v = new Vault(tmpPath());
  const e = v.add({ title: 'No evidence', body: 'claim' });
  assert.throws(() => v.recordVerification({ id: e.id, verdict: 'supported' }), /evidence_url/);
  assert.equal(v.get(e.id).freshness, 'unverified');
  v.close();
});

test('backup encrypts the whole vault and restores it with the passphrase', async () => {
  const { snapshotEncrypted, decryptBackup } = await import('../src/backup.js');
  const src = new Vault(tmpPath(), { passphrase: 'bk-pass' });
  src.add({ title: 'Public fact', body: 'kept in backup' });
  src.add({ title: 'Secret', body: 'private backup body', sensitivity: 'private' });
  const blob = snapshotEncrypted(src);
  assert.ok(!blob.includes(Buffer.from('Public fact')), 'backup must not contain plaintext');
  const restoredPath = tmpPath();
  decryptBackup(src, blob, restoredPath);
  const restored = new Vault(restoredPath, { passphrase: 'bk-pass' });
  assert.equal(restored.search('kept in backup').length, 1);
  const secret = restored.search('Secret')[0];
  restored.approve(secret.id, 1);
  assert.equal(restored.get(secret.id).body, 'private backup body');
  restored.close(); src.close();
  assert.throws(() => decryptBackup(src, Buffer.from('nope'), tmpPath()), /Not a knowledge-vault backup/);
});

test('audit log records reads, denials, approvals and verifications', () => {
  const v = new Vault(tmpPath(), { passphrase: 'pw', actor: 'tester' });
  const pub = v.add({ title: 'A', body: 'public body' });
  const priv = v.add({ title: 'B', body: 'secret', sensitivity: 'private' });
  v.get(pub.id);
  v.get(priv.id);
  v.approve(priv.id, 1);
  v.recordVerification({ id: pub.id, verdict: 'unclear', checker: 'x' });
  const actions = v.auditLog().map((r) => r.action);
  for (const a of ['add', 'read', 'read_denied_locked', 'approve', 'verify']) assert.ok(actions.includes(a), a);
  assert.equal(v.auditLog()[0].actor, 'tester');
  v.close();
});

test('visibleText ignores markup-only changes', async () => {
  const { visibleText } = await import('../src/store.js');
  const a = visibleText('<html><script>var x=1</script><p class="a">Hello   <b>world</b></p></html>');
  const b = visibleText('<div><p class="b">Hello world</p><!-- note --></div>');
  assert.equal(a, b);
  assert.equal(a, 'Hello world');
});

test('delete removes the entry from search and records it in the audit log', () => {
  const v = new Vault(tmpPath(), { actor: 'tester' });
  const e = v.add({ title: 'Disposable', body: 'temporary fact' });
  assert.equal(v.search('temporary').length, 1);
  v.delete(e.id);
  assert.equal(v.search('temporary').length, 0);
  assert.throws(() => v.get(e.id), /No entry/);
  assert.ok(v.auditLog().some((r) => r.action === 'delete' && r.entry_id === e.id));
  v.close();
});
