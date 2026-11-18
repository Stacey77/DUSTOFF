(() => {
  const $ = (id) => document.getElementById(id);
  let key = '';
  try { key = sessionStorage.getItem('shieldAdminKey') || ''; } catch (_) {}
  let timer = null;

  const LABELS = {
    'session.created': 'Session started',
    'session.revoked': 'Session revoked',
    'session.step_up': 'Step-up passed',
    'vault.issued': 'Self-destruct token issued',
    'vault.burned': 'Token used and burned',
    'vault.self_destructed': 'Token self-destructed',
  };
  const REASONS = {
    token_replay: 'stolen token replayed',
    bad_proof: 'wrong device key on request',
    bad_refresh_proof: 'cookie used without device key',
    risk: 'risk engine',
    logout: 'logout',
    kill_switch: 'kill switch',
    kill_switch_all: 'kill switch (all apps)',
    admin: 'revoked from console',
    idle_timeout: 'idle timeout',
    refresh_window_closed: 'refresh window closed',
    expired: 'expired',
    wrong_session: 'used from another session',
    wrong_network: 'used from another network',
    data_mismatch: 'data did not match',
  };

  const ago = (t, now) => {
    const s = Math.max(0, Math.round((now - t) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    return `${Math.round(s / 3600)}h ago`;
  };
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k.startsWith('on')) n[k] = v; else n.setAttribute(k, v);
    }
    for (const kid of kids) n.append(kid instanceof Node ? kid : document.createTextNode(String(kid ?? '')));
    return n;
  };

  async function api(path, method = 'GET') {
    const res = await fetch(path, { method, headers: { authorization: `Bearer ${key}` } });
    if (res.status === 401) throw new Error('Wrong admin key');
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json();
  }

  async function act(path, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    await api(path, 'POST');
    load();
  }

  async function load() {
    try {
      const [ov, ss, ev] = await Promise.all([api('/v1/admin/overview'), api('/v1/admin/sessions'), api('/v1/admin/events?limit=150')]);
      const now = ov.now;
      $('sApps').textContent = ov.totals.apps;
      $('sActive').textContent = ov.totals.active;
      $('sRevoked').textContent = ov.totals.revoked24h;
      $('sAlerts').textContent = ov.totals.alerts24h;

      $('apps').replaceChildren(...(ov.apps.length ? ov.apps.map((a) => el('tr', {},
        el('td', {}, a.appId), el('td', { class: 'num' }, a.active), el('td', { class: 'num' }, a.revoked24h),
        el('td', { class: 'num' }, a.alerts24h ? el('span', { class: 'pill alert' }, a.alerts24h) : '0'),
        el('td', {}, el('button', { class: 'danger', onclick: () => act(`/v1/admin/apps/${encodeURIComponent(a.appId)}/kill`, `Revoke every session in ${a.appId}?`) }, 'Kill switch')),
      )) : [el('tr', {}, el('td', { colspan: 5, class: 'empty' }, 'No apps connected yet. Add one to SHIELD_APP_KEYS.'))]));

      $('sessions').replaceChildren(...(ss.sessions.length ? ss.sessions.map((s) => el('tr', {},
        el('td', {}, s.appId), el('td', {}, s.userId), el('td', { class: 'mono' }, s.device),
        el('td', {}, ago(s.lastSeenAt, now)),
        el('td', {}, el('button', { onclick: () => act(`/v1/admin/sessions/${encodeURIComponent(s.id)}/revoke`) }, 'Revoke')),
      )) : [el('tr', {}, el('td', { colspan: 5, class: 'empty' }, 'No active sessions.'))]));

      $('events').replaceChildren(...(ev.events.length ? ev.events.map((e) => {
        const bits = [e.appId, e.userId, e.tokenType, e.reason && (REASONS[e.reason] || e.reason)];
        if (e.risk && e.risk.signals && e.risk.signals.length) bits.push(`signals: ${e.risk.signals.join(', ')}`);
        if (e.detail) bits.push(e.detail);
        return el('div', { class: `event ${e.severity === 'alert' ? 'alert' : ''}` },
          el('div', { class: 't' }, new Date(e.at).toLocaleTimeString()),
          el('div', { class: 'what' }, LABELS[e.type] || e.type),
          el('div', { class: 'meta' }, bits.filter(Boolean).join(' · ')),
        );
      }) : [el('div', { class: 'empty' }, 'No events yet.')]));

      $('status').textContent = `Live · updated ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      $('status').textContent = err.message;
      if (err.message === 'Wrong admin key') logoutGate(err.message);
    }
  }

  function logoutGate(msg) {
    clearInterval(timer);
    try { sessionStorage.removeItem('shieldAdminKey'); } catch (_) {}
    $('app').classList.add('hidden');
    $('gate').classList.remove('hidden');
    $('gateErr').textContent = msg || '';
  }

  function start() {
    $('gate').classList.add('hidden');
    $('app').classList.remove('hidden');
    load();
    clearInterval(timer);
    timer = setInterval(load, 5000);
  }

  $('connect').onclick = () => {
    key = $('key').value.trim();
    try { sessionStorage.setItem('shieldAdminKey', key); } catch (_) {}
    start();
  };
  $('key').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('connect').click(); });
  $('killAll').onclick = () => act('/v1/admin/kill-all', 'Revoke EVERY session in EVERY app?');
  if (key) start();
})();
