/* Injected into the HELIX Console: keeps the device-bound session rotating, shows a Shield badge,
   and sends the user to sign in again the moment Nova Shield ends the session. */
(function () {
  if (!window.NovaShield) return;
  NovaShield.start();

  var toLogin = function (r) { location.replace('/login?next=%2F&r=' + r); };
  NovaShield.on('revoked', function () { toLogin('revoked'); });

  var badge = document.createElement('div');
  badge.setAttribute('role', 'status');
  badge.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;' +
    'padding:6px 8px 6px 12px;border-radius:999px;background:#151A16;color:#E8ECE7;font:500 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.18);max-width:calc(100vw - 24px)';
  var dot = document.createElement('span');
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#3FB68B;flex:none';
  var label = document.createElement('span');
  label.textContent = 'Nova Shield';
  label.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  var out = document.createElement('button');
  out.type = 'button';
  out.textContent = 'Log out';
  out.style.cssText = 'border:0;border-radius:999px;padding:4px 10px;background:#2A332D;color:#E8ECE7;font:inherit;cursor:pointer';
  out.onclick = function () {
    fetch('/logout', { method: 'POST' }).finally(function () {
      NovaShield.reset().finally(function () { location.replace('/login'); });
    });
  };
  badge.append(dot, label, out);
  document.body.appendChild(badge);

  // Check the session every 30s (signed request), so a Console kill switch takes effect right away.
  function check() {
    NovaShield.fetch('/api/session').then(function (res) {
      if (res.ok) return res.json().then(function (j) { label.textContent = 'Nova Shield · ' + j.userId; });
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (j.error === 'revoked' || j.error === 'unknown_session' || j.error === 'no_session') toLogin('kill');
      });
    }).catch(function () { dot.style.background = '#C2470E'; });
  }
  check();
  setInterval(check, 30000);
})();
