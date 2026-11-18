# Nova Shield — Core scaffold (v0.1)

Nova Digitus Designs LLC. Hijack-proof sessions and self-destruct tokens, built once and plugged into every app.

**What a stolen cookie gets an attacker:** at most a few minutes of read access on ordinary routes, and only from the same browser and network. It gets nothing on signed routes. The first time it tries to refresh, or replays an old token, the session is killed everywhere and an alert shows up in the Console.

## What's in the box

| Folder | What it is |
| --- | --- |
| `core/` | **Nova Shield Core**: the central service. Sessions, device binding, token rotation, risk engine, self-destruct vault, audit log, admin API |
| `core/console/` | **Shield Console**: the dashboard at `/console`. Apps, live sessions, hijack alerts and kill switches |
| `middleware/` | **Drop-in middleware** for Express apps. One file to plug any app into Core |
| `middleware/webhook.js` | Self-destructing webhook signatures (60-second window and replay block) |
| `sdk/` | **Browser SDK**: makes the non-exportable device key, signs refreshes and requests, and rotates the cookie |
| `demo/` | A sample app wired up end to end |
| `apps/helix/` | **HELIX pilot**: the HELIX Console served behind a Shield sign-in, with a live Shield badge and kill-switch kick-out |
| `setup.ps1` | One-command Windows setup: makes `.env` with fresh keys (kept on your PC) |
| `test/` | 32 tests: attack scenarios, race conditions, app isolation, and the HELIX pilot |

## How it works

```
Browser (SDK + device key) ──cookie──▶ Your app (middleware) ──app key──▶ Nova Shield Core ◀── Shield Console
```

1. **Login:** the browser generates a P-256 key that *can't be exported*, even by JavaScript on the page. Only the public half goes to Core.
2. **Cookie:** `__Host-` prefixed, HttpOnly, Secure and SameSite. It holds an opaque token that lives for 10 minutes. Core stores only its hash.
3. **Refresh:** Core sends a 60-second nonce, and the browser signs it with the device key to get a rotated token. A copied cookie can't sign, so the session is revoked.
4. **Rotation replay:** if an old token shows up more than 10 seconds after rotation, it was stolen, so the whole session is revoked.
5. **Signed routes** (`protect({ proof: true })`): every request carries a signature over the time, a random nonce, the method and the path. It self-destructs after 60 seconds and works only once, even if someone re-encodes or re-signs it.
6. **Risk engine:** a new browser means step-up MFA. A new browser on a new network, or a new network in a new country, means revoke.
7. **Step-up** (`protect({ stepUp: 300 })`): sensitive actions need a passkey or MFA within the last 5 minutes. A password-only login doesn't count.
8. **Self-destruct vault:** `api`, `magic-link`, `reset-link`, `oauth-code`, `download`, `export`, `payment` and `share` tokens. Each is short-lived, can be single-use, and can be locked to a session, a network or exact data (such as a payment amount). A token presented in the wrong place destroys itself.

## Run it on Windows (PowerShell)

Requires Node 20 or later.

```powershell
# 1. Unzip and install
Expand-Archive -Path "$env:USERPROFILE\Downloads\nova-shield.zip" -DestinationPath "$env:USERPROFILE\Projects" -Force; Set-Location "$env:USERPROFILE\Projects\nova-shield"; npm install

# 2. Run the tests (should say: pass 32, fail 0)
npm test

# 3. Create .env with fresh random keys (.env stays on this machine; it's in .gitignore)
function New-Key { $b = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { '{0:x2}' -f $_ }) }; $admin = New-Key; $demo = New-Key; $helix = New-Key; $nexum = New-Key; @"
SHIELD_HOST=127.0.0.1
SHIELD_PORT=4000
SHIELD_ADMIN_KEY=$admin
SHIELD_APP_KEYS=demo:$demo,helix:$helix,nexum:$nexum
DEMO_PORT=3000
SHIELD_CORE_URL=http://127.0.0.1:4000
SHIELD_APP_KEY=$demo
"@ | Set-Content -Path .env -Encoding ascii; Write-Host "Console admin key: $admin"

# 4. Start Core (leave this window open)
npm run core

# 5. In a second PowerShell window, start the demo app
Set-Location "$env:USERPROFILE\Projects\nova-shield"; npm run demo
```

Then open:
- **Demo app:** http://localhost:3000. Log in with `demo` / `demo`. The MFA code is `123456`.
- **Shield Console:** http://localhost:4000/console. Paste the admin key printed in step 3.

Use `localhost`, not `127.0.0.1`, for the demo app, so the browser accepts the `__Host-` Secure cookie over local HTTP.

## HELIX pilot

```powershell
# From the nova-shield folder: make .env (finds the HELIX Console page in NovaSite automatically)
.\setup.ps1

# Window 1: Core
npm run core

# Window 2: HELIX behind Shield
npm run helix
```

Open http://localhost:4100 and sign in with the username and password `setup.ps1` printed. Then:

- The HELIX Console loads with a **Nova Shield** badge in the corner and a **Log out** button.
- The session token rotates in the background, and only this browser's device key can rotate it.
- Use **Kill switch** on `helix` in the Shield Console (http://localhost:4000/console), and the HELIX tab is sent back to sign-in within 30 seconds.
- Five wrong passwords from one IP lock sign-in for 15 minutes.

To change the HELIX password: `npm run hash-password -- "new password"`, then paste the result into `HELIX_PASSWORD_HASH` in `.env`.

## Plug any app in (the pattern HELIX uses)

```js
import { createShield } from 'nova-shield/middleware';

const shield = createShield({ coreUrl: process.env.SHIELD_CORE_URL, appKey: process.env.SHIELD_APP_KEY });
app.use(shield.routes());                                   // SDK + refresh endpoints

app.post('/login', async (req, res) => {
  // ...check the password / passkey yourself first...
  // mfa: true only if this login itself checked a passkey/MFA; otherwise stepUp routes ask for one
  await shield.startSession(req, res, { userId: user.id, publicKeyJwk: req.body.publicKeyJwk, mfa: false });
  res.json({ ok: true });
});

app.get('/api/anything', shield.protect(), handler);                       // normal
app.post('/api/pay', shield.protect({ proof: true, stepUp: 300 }), pay);   // sensitive
app.post('/api/mfa', shield.protect({ allowRisky: true }), async (req, res) => {
  // ...verify the code...
  await shield.markStepUp(req); res.json({ ok: true });
});
```

In the page, use this:
```html
<script src="/_shield/sdk.js"></script>
<script>
  const { publicKeyJwk } = await NovaShield.loginPayload();   // send with the login form
  NovaShield.start();                                         // after login
  NovaShield.fetch('/api/pay', { method: 'POST', body });     // signed request
</script>
```

Behind Netlify or another proxy, set `app.set('trust proxy', 1)` so the risk engine sees the real IP.

## Before production (next steps)

- [ ] Replace `MemoryStore` with Redis or Postgres. The interface is already async, so it's one file. Right now a restart logs everyone out.
- [ ] Run Core behind HTTPS on a private network. Only the middleware talks to it, never the browser.
- [ ] Use Chrome's native Device Bound Session Credentials when available, with the WebCrypto key as the fallback.
- [ ] Add middleware for Next.js, Netlify Edge and FastAPI.
- [ ] Add a Console login with a passkey instead of the shared admin key, and send alerts by email or SMS.
- [ ] Add a Command Center panel that reads `/v1/admin/overview`.

## Known limits (be honest in the sales pitch)

- If malware is running live inside the victim's own browser, it can use the key from there. Device binding stops *replay elsewhere*, which is what cookie-stealing malware and supply-chain scripts (like the Optimizely attack) rely on.
- Within its 10-minute life, a stolen token works on **unsigned** routes only from a matching browser and network. Put anything that matters behind `proof: true`.
