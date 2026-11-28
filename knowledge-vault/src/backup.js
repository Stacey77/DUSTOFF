// Encrypted backups. A consistent snapshot of the vault is encrypted as a whole
// with the vault key before it is written anywhere, so cloud storage only sees ciphertext.
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encryptBuffer, decryptBuffer } from './crypto.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const MAGIC = Buffer.from('KVBAK1\n');

export function snapshotEncrypted(vault) {
  if (!vault.key) throw new Error('Backups need the vault passphrase (KV_PASSPHRASE).');
  const dir = mkdtempSync(join(tmpdir(), 'kv-snap-'));
  const plain = join(dir, 'snap.db');
  try {
    vault.db.exec(`VACUUM INTO '${plain.replace(/'/g, "''")}'`); // consistent copy, WAL-safe
    return Buffer.concat([MAGIC, encryptBuffer(vault.key, readFileSync(plain))]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function decryptBackup(vault, data, outPath) {
  if (!data.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a knowledge-vault backup.');
  if (!vault.key) throw new Error('Restore needs the vault passphrase (KV_PASSPHRASE).');
  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, decryptBuffer(vault.key, data.subarray(MAGIC.length)), { mode: 0o600 });
  return outPath;
}

export function r2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

export async function uploadToR2(data, { bucket, key }) {
  await r2Client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: 'application/octet-stream' }));
  return { bucket, key, bytes: data.length };
}

export async function downloadFromR2({ bucket, key }) {
  const res = await r2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await res.Body.transformToByteArray());
}
