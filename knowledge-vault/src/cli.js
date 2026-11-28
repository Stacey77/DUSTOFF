#!/usr/bin/env node
// Human CLI. This is the only place approvals, revocations, and source checks happen.
import { Vault } from './store.js';
import { defaultVaultPath } from './paths.js';
import { snapshotEncrypted, decryptBackup, uploadToR2, downloadFromR2 } from './backup.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [cmd, ...rest] = process.argv.slice(2);

function flags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

const usage = `knowledge-vault (kv)

  kv add --title "..." --body "..." [--tags a,b] [--source URL] [--private] [--ttl DAYS]
  kv search "query words" [--limit N]
  kv get <id>
  kv approve <id> [--minutes 15]      human approval window for a private entry
  kv revoke <id>
  kv check <id>                       fetch source_url and compare to last snapshot
  kv attention                        stale, unverified, disputed, or flagged entries
  kv status
  kv delete <id> --yes                 permanently remove an entry (human-only)
  kv audit [--limit N]                 who did what, most recent first
  kv backup [--out FILE] [--r2 BUCKET --key NAME]   encrypted snapshot to file and/or R2
  kv restore --from FILE | --r2 BUCKET --key NAME [--to PATH]

Env: KV_PASSPHRASE (needed for private entries), KV_HOME (vault folder).`;

if (!cmd || cmd === 'help' || cmd === '--help') {
  console.log(usage);
  process.exit(0);
}

const f = flags(rest);
let vault;
try {
  vault = new Vault(defaultVaultPath(), { passphrase: process.env.KV_PASSPHRASE });
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
const out = (x) => console.log(JSON.stringify(x, null, 2));

try {
  switch (cmd) {
    case 'add':
      out(vault.add({
        title: f.title, body: f.body,
        tags: f.tags ? String(f.tags).split(',') : [],
        source_url: f.source ?? null,
        sensitivity: f.private ? 'private' : 'public',
        ttl_days: f.ttl ? Number(f.ttl) : 30,
      }));
      break;
    case 'search':
      out(vault.search(f._.join(' '), { limit: f.limit ? Number(f.limit) : 10 }));
      break;
    case 'get':
      out(vault.get(f._[0]));
      break;
    case 'approve':
      out(vault.approve(f._[0], f.minutes ? Number(f.minutes) : 15));
      break;
    case 'revoke':
      out(vault.revoke(f._[0]));
      break;
    case 'check':
      out(await vault.checkSource(f._[0]));
      break;
    case 'attention':
      out(vault.needsAttention());
      break;
    case 'status':
      out(vault.status());
      break;
    case 'delete':
      if (!f.yes) throw new Error('Deleting is permanent. Re-run with --yes to confirm.');
      out(vault.delete(f._[0]));
      break;
    case 'audit':
      out(vault.auditLog({ limit: f.limit ? Number(f.limit) : 50 }));
      break;
    case 'backup': {
      const data = snapshotEncrypted(vault);
      const result = {};
      if (f.out) { writeFileSync(f.out, data, { mode: 0o600 }); result.file = f.out; }
      if (f.r2) {
        const key = f.key || `vault-${new Date().toISOString().replace(/[:.]/g, '-')}.kvbak`;
        result.r2 = await uploadToR2(data, { bucket: f.r2, key });
      }
      if (!f.out && !f.r2) throw new Error('Pass --out FILE and/or --r2 BUCKET.');
      out({ ...result, encrypted_bytes: data.length });
      break;
    }
    case 'restore': {
      const data = f.from ? readFileSync(f.from) : await downloadFromR2({ bucket: f.r2, key: f.key });
      const to = f.to || join(defaultVaultPath() + '.restored');
      decryptBackup(vault, data, to);
      out({ restored_to: to, note: 'Open it with KV_HOME pointing at its folder. Existing vault was not changed.' });
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.error(usage);
      process.exitCode = 1;
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
} finally {
  vault.close();
}
