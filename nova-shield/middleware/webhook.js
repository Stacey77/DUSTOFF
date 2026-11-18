import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Self-destructing webhooks: each delivery is signed with a timestamp and
 * rejected once it is older than toleranceSec, so a captured webhook can't be replayed.
 * Header format: "t=<unix seconds>,v1=<hex hmac-sha256 of `${t}.${body}`>"
 */
export function signWebhook(secret, body, ts = Math.floor(Date.now() / 1000)) {
  const sig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

export function verifyWebhook(secret, body, header, { toleranceSec = 60, now = Date.now(), seen } = {}) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')));
  const ts = Number(parts.t);
  if (!Number.isInteger(ts) || !parts.v1) return { valid: false, reason: 'malformed' };
  if (Math.abs(now / 1000 - ts) > toleranceSec) return { valid: false, reason: 'self_destructed' };
  const expected = Buffer.from(createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex'));
  const got = Buffer.from(parts.v1);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return { valid: false, reason: 'bad_signature' };
  // Optional replay cache (a Set or anything with has/add) blocks a second delivery inside the window.
  if (seen) {
    if (seen.has(parts.v1)) return { valid: false, reason: 'replayed' };
    seen.add(parts.v1);
  }
  return { valid: true, ts };
}
