// Usage: node apps/helix/hash-password.js "your password"
// Prints an scrypt hash for HELIX_PASSWORD_HASH. The password itself is never stored.
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Give a password of 12+ characters: node apps/helix/hash-password.js "your password"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);
console.log(`scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`);
