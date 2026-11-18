function subnet(ip) {
  if (!ip) return null;
  const v4 = String(ip).replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 3).join('.'); // IPv4 /24
  return String(ip).toLowerCase().split(':').slice(0, 4).join(':');                 // IPv6 /64
}

/**
 * Compare the request's context with the session's baseline.
 * Returns { score, signals, action: 'allow' | 'step_up' | 'revoke' }.
 */
export function assessRisk(baseline = {}, ctx = {}, cfg) {
  const w = cfg.weights;
  const signals = [];
  let score = 0;

  // A missing user agent counts as changed, so stripping it is no way around the check.
  if (baseline.ua && baseline.ua !== (ctx.ua || '')) { score += w.ua; signals.push('user_agent_changed'); }
  if (baseline.ip && ctx.ip && subnet(baseline.ip) !== subnet(ctx.ip)) { score += w.ipSubnet; signals.push('network_changed'); }
  if (baseline.country && ctx.country && baseline.country !== ctx.country) { score += w.country; signals.push('country_changed'); }

  const action = score >= cfg.revokeAt ? 'revoke' : score >= cfg.stepUpAt ? 'step_up' : 'allow';
  return { score, signals, action };
}

export const pickContext = (ctx = {}) => ({
  ip: ctx.ip ? String(ctx.ip).slice(0, 64) : null,
  ua: ctx.ua ? String(ctx.ua).slice(0, 512) : null,
  country: ctx.country ? String(ctx.country).slice(0, 8) : null,
});
