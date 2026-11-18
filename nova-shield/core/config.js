import { readFileSync, existsSync } from 'node:fs';

/** Load KEY=value lines from a local .env file without overriding real env vars. */
export function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

/** "helix:key1,nexum:key2" -> { helix: 'key1', nexum: 'key2' } */
export function parseAppKeys(raw = '') {
  const out = {};
  for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i < 1) throw new Error(`Bad SHIELD_APP_KEYS entry "${pair}" — use appId:key`);
    out[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return out;
}

export const defaults = {
  accessTtlSec: 600,          // access cookie value lives 10 minutes, then must be refreshed with device proof
  refreshGraceSec: 86400,     // an expired token can still be refreshed (with proof) for 24h
  sessionIdleSec: 7 * 86400,  // sessions idle for 7 days are revoked
  rotationGraceSec: 10,       // a just-rotated token is "superseded" (not an attack) for 10s to absorb races
  nonceTtlSec: 60,            // refresh challenges self-destruct after 60s
  proofWindowSec: 60,         // signed request proofs self-destruct after 60s
  risk: {
    weights: { ua: 50, ipSubnet: 25, country: 45 },
    stepUpAt: 30,
    revokeAt: 70,
  },
};

export function buildConfig(overrides = {}) {
  return {
    ...defaults,
    ...overrides,
    risk: {
      ...defaults.risk,
      ...(overrides.risk || {}),
      weights: { ...defaults.risk.weights, ...(overrides.risk?.weights || {}) },
    },
  };
}
