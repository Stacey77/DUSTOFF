const $ = (id) => document.getElementById(id);
let lastLink = null;

function log(label, data, ok = true) {
  const line = document.createElement('div');
  line.className = ok ? 'ok' : 'bad';
  line.textContent = `${new Date().toLocaleTimeString()}  ${label}  ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  $('log').prepend(line);
}

async function call(label, promise) {
  try {
    const res = await promise;
    const body = await res.json().catch(() => ({}));
    log(label, body, res.ok);
    return { res, body };
  } catch (err) {
    log(label, err.message, false);
    return {};
  }
}

NovaShield.on('revoked', () => log('Shield', 'Session revoked by Nova Shield', false));
NovaShield.on('stepup', () => log('Shield', 'Step-up required: enter the MFA code', false));

$('login').onclick = async () => {
  const { publicKeyJwk } = await NovaShield.loginPayload();
  const { res } = await call('Login', fetch('/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: $('user').value, password: $('pass').value, publicKeyJwk }),
  }));
  if (res && res.ok) NovaShield.start();
};

$('logout').onclick = async () => {
  await call('Logout', fetch('/logout', { method: 'POST' }));
  await NovaShield.reset();
};

$('me').onclick = () => call('Who am I', NovaShield.fetch('/api/me'));

$('refresh').onclick = async () => {
  try { const r = await NovaShield.refresh(); log('Rotate', { newExpiry: new Date(r.expiresAt).toLocaleTimeString() }); }
  catch (e) { log('Rotate', e.message, false); }
};

$('transfer').onclick = () => call('Transfer', NovaShield.fetch('/api/transfer', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: 250 }),
}));

$('mfa').onclick = () => call('MFA', NovaShield.fetch('/api/mfa', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: $('code').value }),
}));

$('link').onclick = async () => {
  const { body } = await call('New link', NovaShield.fetch('/api/download-link', { method: 'POST' }));
  if (body && body.url) {
    lastLink = body.url;
    await call('Open link (1st)', fetch(lastLink));
    await call('Open link (2nd)', fetch(lastLink));
  }
};
