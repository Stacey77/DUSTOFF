(function () {
  var params = new URLSearchParams(location.search);
  // Only ever return to a page on this site. Resolving against our origin (rather than checking
  // characters) also catches tricks like "/\\evil.example" that browsers treat as another site.
  var next = '/';
  try {
    var target = new URL(params.get('next') || '/', location.origin);
    if (target.origin === location.origin) next = target.pathname + target.search + target.hash;
  } catch (_) { next = '/'; }
  var reason = params.get('r');
  var $ = function (id) { return document.getElementById(id); };

  var MESSAGES = {
    revoked: 'Your session was ended by Nova Shield. Please sign in again.',
    kill: 'Your session was ended from the Shield Console. Please sign in again.',
    bad_credentials: 'That username or password is wrong.',
    too_many_attempts: 'Too many tries. Wait 15 minutes and try again.',
    shield_unavailable: 'Nova Shield Core is not reachable. Is it running?',
  };

  function showForm(text) {
    $('status').textContent = 'Use your HELIX credentials.';
    $('form').classList.remove('hidden');
    $('msg').textContent = text || '';
    $('u').focus();
  }

  // A returning visitor with a live session and this browser's device key gets back in silently.
  if (reason === 'expired' || reason === 'superseded') {
    NovaShield.refresh().then(function () { location.replace(next); }).catch(function () { showForm(); });
  } else {
    showForm(MESSAGES[reason] || '');
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('go').disabled = true;
    $('msg').textContent = '';
    NovaShield.reset()
      .then(function () { return NovaShield.loginPayload(); })
      .then(function (p) {
        return fetch('/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: $('u').value, password: $('p').value, publicKeyJwk: p.publicKeyJwk }),
        });
      })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok) throw new Error(j.error || 'error');
          location.replace(next);
        });
      })
      .catch(function (err) {
        $('msg').textContent = MESSAGES[err.message] || 'Sign-in failed (' + err.message + ').';
        $('go').disabled = false;
      });
  });
})();
