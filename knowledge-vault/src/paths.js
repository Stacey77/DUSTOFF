import { homedir } from 'node:os';
import { join } from 'node:path';

// Where the vault file lives. Override with KV_HOME (e.g. to a synced folder).
export function defaultVaultPath() {
  const dir = process.env.KV_HOME || join(homedir(), '.knowledge-vault');
  return join(dir, 'vault.db');
}
