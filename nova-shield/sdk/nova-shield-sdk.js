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
  var keyPromise = null;

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

  function getKeyPair() {
    if (!keyPromise) {
      keyPromise = idb('readonly', function (s) { return s.get(KEY_ID); }).then(function (pair) {
        if (pair && pair.privateKey) return pair;
        return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
          .then(function (fresh) {
            return idb('readwrite', function (s) { return s.put(fresh, KEY_ID); }).then(function () { return fresh; });
          });
      });
      keyPromise.catch(function () { keyPromise = null; });
    }
    return keyPromise;
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

  function schedule(expiresAt) {
    clearTimeout(timer);
    var wait = Math.max(5000, (expiresAt - Date.now()) - 60000); // refresh a minute before expiry
    timer = setTimeout(function () {
      refresh().catch(function (e) { emit('error', e); });
    }, wait);
  }

  var listeners = {};
  function emit(type, detail) { (listeners[type] || []).forEach(function (fn) { try { fn(detail); } catch (_) {} }); }

  /** fetch() that adds a per-request proof signed by the device key. Retries once after refresh. */
  function shieldFetch(input, init) {
    init = init || {};
    var url = new URL(typeof input === 'string' ? input : input.url, location.href);
    var method = (init.method || 'GET').toUpperCase();
    var attempt = function () {
      var ts = Math.floor(Date.now() / 1000);
      return sign(ts + '\n' + method + '\n' + url.pathname + url.search).then(function (sig) {
        var headers = new Headers(init.headers || {});
        headers.set('x-shield-proof', ts + '.' + sig);
        return fetch(url.toString(), Object.assign({}, init, { headers: headers, credentials: 'same-origin' }));
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
      keyPromise = null;
      return idb('readwrite', function (s) { return s.delete(KEY_ID); });
    },
  };
})(window);
