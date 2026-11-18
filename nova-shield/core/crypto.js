import { randomBytes, createHash, webcrypto, timingSafeEqual } from 'node:crypto';

const { subtle } = webcrypto;
const encoder = new TextEncoder();

export const randomToken = (prefix = '', bytes = 32) => prefix + randomBytes(bytes).toString('base64url');

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('base64url');

export function safeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
}

/** Only public P-256 keys are accepted — a JWK carrying a private part ("d") is rejected. */
export function isPublicP256Jwk(jwk) {
  return !!jwk && typeof jwk === 'object' && jwk.kty === 'EC' && jwk.crv === 'P-256'
    && typeof jwk.x === 'string' && typeof jwk.y === 'string' && jwk.d === undefined;
}

export const publicJwk = (jwk) => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });

/** Short, display-only fingerprint of a device key. */
export const keyThumbprint = (jwk) => sha256(`${jwk.x}.${jwk.y}`).slice(0, 12);

const keyCache = new Map();

/** Verify a WebCrypto ECDSA P-256 / SHA-256 signature (64-byte r||s, base64url). */
export async function verifySignature(jwk, message, signatureB64url) {
  try {
    if (typeof signatureB64url !== 'string') return false;
    const sig = Buffer.from(signatureB64url, 'base64url');
    if (sig.length !== 64) return false;
    const id = `${jwk.x}.${jwk.y}`;
    let key = keyCache.get(id);
    if (!key) {
      key = await subtle.importKey('jwk', publicJwk(jwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      keyCache.set(id, key);
      if (keyCache.size > 10000) keyCache.delete(keyCache.keys().next().value);
    }
    return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, encoder.encode(message));
  } catch {
    return false;
  }
}
