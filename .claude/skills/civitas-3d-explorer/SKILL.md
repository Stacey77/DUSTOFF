---
name: civitas-3d-explorer
description: "Build, extend or debug Three.js 3D city explorers like Civitas Sapientia's: module layout, realism pipeline, crowds, AI tools, headless QA and known pitfalls."
---

# Civitas 3D Explorer

Use this when adding a layer, district, mode or AI feature to a Three.js city explorer, or when building a new one. The reference code is github.com/Stacey77/DUSTOFF, under `civitas-sapientia/explorer-v2/index.html` (assembled) and `src/v2/*.js` (modules).

## Architecture
- One self-contained HTML page. The import map loads three@0.160.0 and its addons from cdn.jsdelivr.net.
- The modules are concatenated into one `<script type="module">`. Each layer exposes itself on `window.X` (BLD, NATURE, LIFE, TESLA, KIN, RETRO, ENG, SYM, REAL) and gets a `frame(dt, T)` hook from the main loop.
- Every new layer gets a toggle in `layers` and stops its work entirely when hidden. Don't let time pile up while hidden; cap any resumed step at about 0.5 s.
- Edit the src module, rebuild the assembled page, and keep the two in sync.

## Realism pipeline
- Run EffectComposer → UnrealBloom → a NaN-sanitize ShaderPass → OutputPass. Without the sanitize pass, NaN pixels spread through the bloom and black out the screen.
- Use the Sky shader into PMREM for the environment, PCFSoft shadows and camera far = 7000.
- Draw round point sprites from a radial dot texture (never square points), and hide them in daytime.
- Merge buildings with `mergeGeometries`, with per-building vertex-color ranges so stress tinting doesn't add draw calls. Use CanvasTexture facades.
- Use InstancedMesh for crowds and wildlife.
- Ground-plane shapes: map y = -z, then `rotation.x = -π/2`.

## Movement and cameras
- Fly and walk bounds must cover every terrain layer. With nature loaded the V2 limits are x −900…520 and z −640…920.
- Keep tour and landmark cameras out of hills.

## AI features (claude.ai artifact runtime)
- Call `window.claude.use('sample')` with tools. If it's missing or `not_granted`, fall back to built-in rule-based replies.
- Pass every user and AI string through `escH()` before it reaches `innerHTML`.
- Simulation tools must be deterministic for verification. Re-tests reuse the stored hazard (epicenter or wind direction), start immediately, and refuse while a test is running.
- Store delayed callbacks such as the wind study, clear them on stop or restart, and tie each one to its own run ID.
- When rebuilding meshes, dispose materials as well as geometries.

## Headless QA (cloud workspace)
- The CDN is blocked here. Use Playwright to route `cdn.jsdelivr.net/npm/three@0.160.0/**` to a local `npm i three@0.160.0`, and stub Google Fonts.
- Launch Chromium with `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`. Wait with `wait_for_function` on a `window.*` hook, using a timeout of up to 420 s, because heavy scenes are slow there.
- Before any page ships, run `node --check` on the extracted module script, then do one load with no page errors.

## Delivery
- Publish it as an artifact. Use relative links when it goes into her GitHub repo, and check that no `.env*` file is ever included.
- Offer the GitHub push and the Obsidian vault note.
