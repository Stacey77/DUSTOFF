
/* =====================================================================
   V2 REALISM: physical sky, sun shadows, reflections, people & things
   ===================================================================== */
(() => {
const RM = { mode: 'real', glowKey: '', envKey: '' };
const rnd = Math.random;
// --- physical sky + environment ---
const phys = new Sky(); phys.scale.setScalar(4500); scene.add(phys);
const envSky = new Sky(); envSky.scale.setScalar(4500); const envScene = new THREE.Scene(); envScene.add(envSky);
[phys, envSky].forEach(s => { const u = s.material.uniforms; u.turbidity.value = 4.5; u.rayleigh.value = 1.3; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .82; });
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
// --- shadows ---
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sunL.shadow.mapSize.set(2048, 2048); { const c = sunL.shadow.camera; c.left = -320; c.right = 320; c.top = 320; c.bottom = -320; c.near = 10; c.far = 1700; }
sunL.shadow.bias = -.0005; sunL.shadow.normalBias = .8;
// --- water ripples (procedural normal map) ---
const waterN = (() => { const n = 256, h = new Float32Array(n * n);
  for (let k = 0; k < 90; k++) { const cx = rnd() * n, cy = rnd() * n, r = 6 + rnd() * 26, a = (rnd() - .5) * 2; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let dx = Math.abs(x - cx), dy = Math.abs(y - cy); dx = Math.min(dx, n - dx); dy = Math.min(dy, n - dy); const d = Math.hypot(dx, dy); if (d < r) h[y * n + x] += a * (1 + Math.cos(Math.PI * d / r)) * .5; } }
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const hx = h[y * n + (x + 1) % n] - h[y * n + (x - 1 + n) % n], hy = h[((y + 1) % n) * n + x] - h[((y - 1 + n) % n) * n + x]; const v = new THREE.Vector3(-hx * 2, -hy * 2, 1).normalize(), i = (y * n + x) * 4;
    img.data[i] = (v.x * .5 + .5) * 255; img.data[i + 1] = (v.y * .5 + .5) * 255; img.data[i + 2] = (v.z * .5 + .5) * 255; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); return t; })();

/* ---------- PEOPLE ---------- */
const PATHS = []; // walker definitions
for (let s = 0; s < 8; s++) for (const side of [-1, 1]) for (let i = 0; i < 34; i++) PATHS.push({ k: 'spoke', a: SPOKE(s), off: side * (6.5 + rnd() * 3.5), r: 42 + rnd() * 184, dir: rnd() < .5 ? 1 : -1, sp: 1 + rnd() * .7 });
[[37.5, 90], [121, 150], [137, 170]].forEach(([R, n]) => { for (let i = 0; i < n; i++) PATHS.push({ k: 'ring', R: R + (rnd() - .5) * 2.5, a: rnd() * Math.PI * 2, dir: rnd() < .5 ? 1 : -1, sp: 1 + rnd() * .6 }); });
[[0, 0, 30, 70, 36], [HEAL.x, HEAL.z, 34, 50, 0], [FEST.x, FEST.z, 30, 90, 0], [SC('water').x, SC('water').z, 30, 30, 0], [FOOD.x, FOOD.z, 34, 30, 0]].forEach(([cx, cz, R, n, rmin]) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, r = rmin + rnd() * (R - rmin); PATHS.push({ k: 'wander', cx, cz, R, rmin, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, h: rnd() * 6.28, sp: .5 + rnd() * .7, idle: rnd() < .3 ? 1e9 : 0 }); } });
const NP = PATHS.length;
const torsoGeo = (() => { const t = new THREE.CapsuleGeometry(.2, .5, 4, 8); t.translate(0, 1.13, 0); const arms = [-.27, .27].map(x => { const a = new THREE.CapsuleGeometry(.065, .5, 3, 6); a.translate(x, 1.1, 0); return a; }); return mergeGeometries([t, ...arms]); })();
const headGeo = new THREE.SphereGeometry(.115, 10, 8); headGeo.translate(0, 1.62, 0);
const legGeo = new THREE.CapsuleGeometry(.075, .7, 3, 6); legGeo.translate(0, -.42, 0);
const mk = (geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .8 }), NP); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; scene.add(m); return m; };
const IM = { torso: mk(torsoGeo), head: mk(headGeo), legL: mk(legGeo), legR: mk(legGeo) };
const CLOTH = [0xe8e4dc, 0x2a3a5a, 0xc0392b, 0x2e7d5b, 0xd6b46a, 0x5a4a7a, 0x1e1e22, 0x3a8ac0, 0xe07a5a, 0xf2f2f2, 0x7a9a5a, 0xa05a8a];
const SKIN = [0x3b2219, 0x5a3825, 0x7a4e32, 0x8d5a3b, 0xa86e4b, 0xc68a62, 0xe0ac86, 0xf1c9a5];
const PANTS = [0x22262e, 0x3a4a6a, 0x5a4a3a, 0xd8d2c4, 0x2a2a2a, 0x4a5a3a];
const col = new THREE.Color();
PATHS.forEach((p, i) => { IM.torso.setColorAt(i, col.set(CLOTH[i % CLOTH.length])); IM.head.setColorAt(i, col.set(SKIN[(i * 7) % SKIN.length])); const pc = col.set(PANTS[(i * 3) % PANTS.length]); IM.legL.setColorAt(i, pc); IM.legR.setColorAt(i, pc); p.ph = rnd() * 6.28; p.sc = .92 + rnd() * .16; });
// delivery robots on the promenades
const ROB = Array.from({ length: 48 }, (_, i) => ({ a: SPOKE(i % 8), off: (i % 2 ? 1 : -1) * 4.8, r: 45 + rnd() * 180, dir: rnd() < .5 ? 1 : -1, sp: 1.6 + rnd() }));
const robGeo = (() => { const b = new THREE.BoxGeometry(.7, .55, .9); b.translate(0, .45, 0); const l = new THREE.BoxGeometry(.5, .08, .05); l.translate(0, .62, .46); return mergeGeometries([b, l]); })();
const robIM = new THREE.InstancedMesh(robGeo, new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: .4, metalness: .2, emissive: 0x4fbf9a, emissiveIntensity: .15 }), ROB.length); robIM.castShadow = true; robIM.frustumCulled = false; scene.add(robIM);
// street furniture: benches along boulevards & plaza, lamp posts
{ const pos = []; for (let s = 0; s < 8; s++) { const a = SPOKE(s); for (let r = 48; r < 226; r += 16) { if (Math.abs(r - 129) < 10 || Math.abs(r - 210) < 6 || Math.abs(r - 242) < 14) continue; [-10.6, 10.6].forEach(o => pos.push([Math.cos(a) * r - Math.sin(a) * o, Math.sin(a) * r + Math.cos(a) * o, a])); } }
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; pos.push([Math.cos(a) * 39.5, Math.sin(a) * 39.5, a + Math.PI / 2]); }
  const g = (() => { const seat = new THREE.BoxGeometry(1.8, .12, .5); seat.translate(0, .45, 0); const back = new THREE.BoxGeometry(1.8, .45, .08); back.translate(0, .72, -.22); const l1 = new THREE.BoxGeometry(.08, .45, .45); l1.translate(-.8, .22, 0); const l2 = l1.clone(); l2.translate(1.6, 0, 0); return mergeGeometries([seat, back, l1, l2]); })();
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: .8 }), pos.length); const d = new THREE.Object3D();
  pos.forEach(([x, z, a], i) => { d.position.set(x, 0, z); d.rotation.set(0, -a, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = true; scene.add(im); }
{ const L = window.LAMPS || []; const pole = new THREE.CylinderGeometry(.08, .12, 6, 6); pole.translate(0, 3, 0); const head = new THREE.BoxGeometry(.9, .15, .35); head.translate(0, 6.05, 0);
  const pm = new THREE.InstancedMesh(mergeGeometries([pole, head]), new THREE.MeshStandardMaterial({ color: 0x3a4248, metalness: .6, roughness: .4 }), L.length); const d = new THREE.Object3D();
  L.forEach(([x, z], i) => { d.position.set(x, 0, z); d.rotation.set(0, Math.atan2(x, z), 0); d.updateMatrix(); pm.setMatrixAt(i, d.matrix); }); scene.add(pm); }

/* ---------- apply shadows to everything built so far ---------- */
scene.traverse(o => { if (!o.isMesh) return; const m = o.material, tr = m && (m.transparent || m.isMeshBasicMaterial); o.castShadow = o.castShadow || (!o.userData.noCast && !tr && !o.isInstancedMesh) || (o.isInstancedMesh && !tr); o.receiveShadow = !tr; });
ground.receiveShadow = true;

/* ---------- mode switching ---------- */
const MODE = {
  real: { ground: 0xdfe8d2, pad: 0xa9a59a, pave: 0xffffff, water: { color: 0x1d4a66, emissive: 0x08202e, emissiveIntensity: .15, roughness: .03, metalness: .25, opacity: .96 }, hemiSky: 0xbfd8ff, hemiGround: 0x5a6a4a },
  stylized: { ground: 0x1c2e24, pad: 0x15281f, pave: 0x3a4046, water: { color: 0x0f3a55, emissive: 0x1a6a9a, emissiveIntensity: .7, roughness: .08, metalness: .5, opacity: .92 }, hemiSky: 0x8fb8e0, hemiGround: 0x0b120f },
};
function applyMode(m) {
  RM.mode = m; const S = MODE[m]; RM.glowKey = ''; RM.envKey = '';
  M.ground.color.set(S.ground); M.pad.color.set(S.pad); PAVE.color.set(S.pave);
  Object.assign(waterMat, { roughness: S.water.roughness, metalness: S.water.metalness, opacity: S.water.opacity, emissiveIntensity: S.water.emissiveIntensity }); waterMat.color.set(S.water.color); waterMat.emissive.set(S.water.emissive);
  waterMat.normalMap = m === 'real' ? waterN : null; waterMat.needsUpdate = true;
  hemi.color.set(S.hemiSky); hemi.groundColor.set(S.hemiGround);
  districts.forEach(d => d.ring.visible = m === 'stylized');
  layers.flows = m === 'stylized'; const cb = document.querySelector('#layers input[data-l=flows]'); if (cb) cb.checked = layers.flows; applyLayers();
  if (m === 'stylized') { scene.environment = null; }
  document.querySelectorAll('#rmode button').forEach(b => b.classList.toggle('on', b.dataset.r === m));
  document.body.dataset.render = m;
}
document.querySelectorAll('#rmode button').forEach(b => b.onclick = () => { applyMode(b.dataset.r); showToast(b.dataset.r === 'real' ? 'Realistic: physical sky, sun shadows, reflections' : 'Stylized: neon 3D with glowing ecosystem flows'); });
const todName = () => document.querySelector('#tod button.on')?.dataset.t || 'night';

/* ---------- per-frame ---------- */
const dO = new THREE.Object3D(), dL = new THREE.Object3D(); dL.rotation.order = 'YXZ';
let pAcc = 0;
window.REAL = {
  get mode() { return RM.mode; },
  frame(dt, T) {
    const real = RM.mode === 'real', t = todName(), night = t === 'night';
    phys.visible = real && !night; sky.visible = !real || night;
    sunL.castShadow = real && !night;
    if (real) {
      const dir = cur.sp.clone().normalize(); phys.material.uniforms.sunPosition.value.copy(dir);
      sunL.intensity = night ? .35 : t === 'day' ? 3.4 : 2.4; hemi.intensity = night ? .4 : t === 'day' ? 1.0 : .75;
      renderer.toneMappingExposure = night ? .95 : t === 'day' ? .62 : .7;
      bloom.strength = night ? .5 : t === 'day' ? .05 : .18; bloom.threshold = night ? .45 : .95;
      scene.fog.color.set(night ? 0x0a1520 : t === 'day' ? 0xbcd2de : t === 'dusk' ? 0xc8987a : 0xd8b8a8); scene.fog.density = night ? .0014 : .0006;
      starMat.opacity = night ? .8 : 0;
      if (RM.envKey !== t && todT >= 1) { RM.envKey = t; envSky.material.uniforms.sunPosition.value.copy(night ? new THREE.Vector3(0, -.2, -1) : dir); envRT?.dispose(); envRT = pmrem.fromScene(envScene, .02); scene.environment = envRT.texture; scene.environmentIntensity = night ? .15 : 1; }
      waterN.offset.x = (T * .006) % 1; waterN.offset.y = (T * .004) % 1;
    } else bloom.threshold = .22;
    const gk = RM.mode + t; if (RM.glowKey !== gk) { RM.glowKey = gk; const f = real ? (night ? .75 : t === 'day' ? .12 : .35) : 1; GLOWS.forEach(([m, i]) => m.emissiveIntensity = i * f); }
    // people & robots
    const vis = layers.people !== false; IM.torso.visible = IM.head.visible = IM.legL.visible = IM.legR.visible = robIM.visible = vis; if (!vis) return;
    const far = camera.position.length() > 650; pAcc += dt; if (far && pAcc < .2) return; const step = pAcc; pAcc = 0;
    for (let i = 0; i < NP; i++) { const p = PATHS[i]; let x, z, yaw, mv = 1;
      if (p.k === 'spoke') { p.r += p.dir * p.sp * step; if (p.r > 226) p.dir = -1; if (p.r < 42) p.dir = 1; const ca = Math.cos(p.a), sa = Math.sin(p.a); x = ca * p.r - sa * p.off; z = sa * p.r + ca * p.off; yaw = Math.atan2(ca * p.dir, sa * p.dir); }
      else if (p.k === 'ring') { p.a += p.dir * p.sp * step / p.R; x = Math.cos(p.a) * p.R; z = Math.sin(p.a) * p.R; const hx = -Math.sin(p.a) * p.dir, hz = Math.cos(p.a) * p.dir; yaw = Math.atan2(hx, hz); }
      else { if (p.idle > 0 && p.idle < 1e8) { p.idle -= step; mv = 0; } else if (p.idle >= 1e8) mv = 0; else { p.h += (rnd() - .5) * step * 1.5; p.x += Math.sin(p.h) * p.sp * step; p.z += Math.cos(p.h) * p.sp * step; const d = Math.hypot(p.x - p.cx, p.z - p.cz); if (d > p.R || d < p.rmin) p.h += Math.PI; if (rnd() < step * .05) p.idle = 2 + rnd() * 6; }
        x = p.x; z = p.z; yaw = p.h; }
      p.ph += step * p.sp * 5.5 * mv; const sw = Math.sin(p.ph) * .55 * mv, bob = Math.abs(Math.cos(p.ph)) * .035 * mv;
      dO.position.set(x, bob, z); dO.rotation.set(0, yaw, 0); dO.scale.setScalar(p.sc); dO.updateMatrix(); IM.torso.setMatrixAt(i, dO.matrix); IM.head.setMatrixAt(i, dO.matrix);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      dL.scale.setScalar(p.sc); dL.position.set(x - c * .1 * p.sc, .86 * p.sc + bob, z + s * .1 * p.sc); dL.rotation.set(sw, yaw, 0); dL.updateMatrix(); IM.legL.setMatrixAt(i, dL.matrix);
      dL.position.set(x + c * .1 * p.sc, .86 * p.sc + bob, z - s * .1 * p.sc); dL.rotation.set(-sw, yaw, 0); dL.updateMatrix(); IM.legR.setMatrixAt(i, dL.matrix); }
    Object.values(IM).forEach(m => m.instanceMatrix.needsUpdate = true);
    ROB.forEach((p, i) => { p.r += p.dir * p.sp * step; if (p.r > 226) p.dir = -1; if (p.r < 44) p.dir = 1; const ca = Math.cos(p.a), sa = Math.sin(p.a); dO.position.set(ca * p.r - sa * p.off, 0, sa * p.r + ca * p.off); dO.rotation.set(0, Math.atan2(ca * p.dir, sa * p.dir), 0); dO.scale.setScalar(1); dO.updateMatrix(); robIM.setMatrixAt(i, dO.matrix); });
    robIM.instanceMatrix.needsUpdate = true;
  },
  count: () => NP,
};
applyMode('real');
})();
