/*!
 * Nova Shield browser SDK — device-bound sessions.
 * Generates a non-exportable P-256 key in the browser, signs refresh challenges and
 * per-request proofs with it, and keeps the short-lived session cookie rotated.
 * A copied cookie is useless without this key, and the key cannot be copied out.
 *
 *   <script src="/_shield/sdk.js"></script>
 *   const { publicKeyJwk } = await NovaShield.loginPayload();   // send with your login form
 *   NovaShield.start();                                         // after login succeeds
 *   const res = await NovaShield.fetch('/api/pay', { method: 'POST', body });  // signed request
 */
(function (global) {
  'use strict';

  var DB = 'nova-shield';
  var STORE = 'keys';
  var KEY_ID = 'device';
  var basePath = '/_shield';
  var timer = null;
  var retryDelay = 0;

  function b64url(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      var open = indexedDB.open(DB, 1);
      open.onupgradeneeded = function () { open.result.createObjectStore(STORE); };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        var tx = open.result.transaction(STORE, mode);
        var req = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { open.result.close(); resolve(req && req.result); };
        tx.onerror = function () { open.result.close(); reject(tx.error); };
      };
    });
  }

  /**
   * The device key lives in IndexedDB and is read fresh for every signature, never cached in memory,
   * so all tabs always use the same key: after a log-out and log-in in one tab, the other tabs
   * pick up the new key instead of signing the new session's cookie with the old one.
   */
  function getKeyPair() {
    return idb('readonly', function (s) { return s.get(KEY_ID); }).then(function (pair) {
      if (pair && pair.privateKey) return pair;
      return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
        .then(function (fresh) {
          // add() (not put) so two tabs generating at once can't overwrite each other: the loser re-reads.
          return idb('readwrite', function (s) { return s.add(fresh, KEY_ID); })
            .then(function () { return fresh; })
            .catch(function () { return idb('readonly', function (s) { return s.get(KEY_ID); }); });
        });
    });
  }

  function sign(message) {
    return getKeyPair().then(function (pair) {
      return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(message));
    }).then(b64url);
  }

  function post(path, body) {
    return fetch(basePath + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-shield-sdk': '1' },
      body: body ? JSON.stringify(body) : '{}',
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) { var e = new Error(json.error || 'shield_error'); e.status = res.status; throw e; }
        return json;
      });
    });
  }

  function doRefresh() {
    return post('/challenge').then(function (c) {
      return sign('refresh\n' + c.nonce).then(function (signature) {
        return post('/refresh', { nonce: c.nonce, signature: signature });
      });
    }).then(function (r) { schedule(r.expiresAt); return r; });
  }

  /** Rotate the session token. Uses a cross-tab lock so two tabs never race. */
  function refresh() {
    if (navigator.locks && navigator.locks.request) {
      return navigator.locks.request('nova-shield-refresh', doRefresh);
    }
    return doRefresh();
  }

  var FATAL = { revoked: 1, unknown_session: 1, no_session: 1 };

  function schedule(expiresAt) {
    clearTimeout(timer);
    var wait = Math.max(5000, (expiresAt - Date.now()) - 60000); // refresh a minute before expiry
    timer = setTimeout(scheduledRefresh, wait);
  }

  /** Background rotation. A temporary failure (offline, Core restarting) retries with backoff
      instead of stopping; a dead session stops and tells the page. */
  function scheduledRefresh() {
    refresh().then(function () { retryDelay = 0; }).catch(function (e) {
      if (FATAL[e.message]) { emit('revoked', e); return; }
      emit('error', e);
      retryDelay = Math.min(retryDelay ? retryDelay * 2 : 15000, 300000); // 15s, 30s, 60s ... max 5 min
      clearTimeout(timer);
      timer = setTimeout(scheduledRefresh, retryDelay);
    });
  }

  var listeners = {};
  function emit(type, detail) { (listeners[type] || []).forEach(function (fn) { try { fn(detail); } catch (_) {} }); }

  function randomNonce() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return b64url(b.buffer);
  }

  /**
   * fetch() that adds a per-request proof signed by the device key. Accepts the same arguments as
   * fetch(), including a Request object (its method, headers and body are kept). Retries once after
   * a refresh if the token had expired.
   */
  function shieldFetch(input, init) {
    // Normalize once; every attempt sends a clone, so the body is still unread for the retry.
    var base = new Request(input, init);
    var url = new URL(base.url);
    var method = base.method.toUpperCase();
    var attempt = function () {
      var ts = Math.floor(Date.now() / 1000);
      var nonce = randomNonce();
      return sign(ts + '\n' + nonce + '\n' + method + '\n' + url.pathname + url.search).then(function (sig) {
        var headers = new Headers(base.headers);
        headers.set('x-shield-proof', ts + '.' + nonce + '.' + sig);
        return fetch(new Request(base.clone(), { headers: headers, credentials: 'same-origin' }));
      });
    };
    return attempt().then(function (res) {
      if (res.status !== 401) return res;
      return res.clone().json().catch(function () { return {}; }).then(function (j) {
        if (j.error === 'expired' || j.error === 'superseded') return refresh().then(attempt);
        if (j.error === 'revoked') emit('revoked', j);
        if (j.error === 'step_up_required') emit('stepup', j);
        return res;
      });
    });
  }

  global.NovaShield = {
    configure: function (opts) { if (opts && opts.basePath) basePath = opts.basePath; },
    /** Public key to send with the login request. The private key never leaves this browser. */
    loginPayload: function () {
      return getKeyPair().then(function (pair) { return crypto.subtle.exportKey('jwk', pair.publicKey); })
        .then(function (jwk) { return { publicKeyJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } }; });
    },
    start: function () {
      schedule(Date.now() + 5 * 60000);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') refresh().catch(function (e) { emit('error', e); });
      });
    },
    refresh: refresh,
    fetch: shieldFetch,
    on: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    /** Call on logout: destroys the device key so the next login gets a fresh one. */
    reset: function () {
      clearTimeout(timer);
      return idb('readwrite', function (s) { return s.delete(KEY_ID); });
    },
  };
})(window);
