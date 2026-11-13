
/* =====================================================================
   SPACE AGE × RAIL AGE LAYER: saucer sky homes, Sky Loop, Grand Skyport,
   streamliner trains, flying cars on sky lanes
   ===================================================================== */
(() => {
const R = Math.random, G = new THREE.Group(); scene.add(G);
const CREAM = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: .45, metalness: .15 });
const SAUC = [0xff6b4a, 0xf4b13e, 0x16a39a, 0xe85a8a];
const GLASSB = new THREE.MeshStandardMaterial({ color: 0x9fe8e0, roughness: .05, metalness: .3, transparent: true, opacity: .4, envMapIntensity: 1.2 });
const IRON = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: .7, roughness: .45 });
const BRASS = new THREE.MeshStandardMaterial({ color: 0xb8893a, metalness: .85, roughness: .3 });
// ---------- saucer sky homes ----------
const saucerProfile = (r, t) => { const p = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; p.push(new THREE.Vector2(Math.max(.01, Math.sin(a) * r), -Math.cos(a) * t * (a < Math.PI / 2 ? 1 : .55))); } return p; };
const SAUCERS = [];
SEC.forEach((k, i) => {
  const a = SA(k), r = 98, [x, , z] = PO(r, a), H = 58 + (i % 4) * 7, rad = 12, g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, H, 16), CREAM); stalk.position.y = H / 2; g.add(stalk);
  const flare = new THREE.Mesh(new THREE.ConeGeometry(4.2, 9, 16, 1, true), CREAM); flare.position.y = 4.5; g.add(flare);
  for (const f of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.5, H * .55, 3.2), CREAM); fin.position.set(0, H * .32, 0); fin.rotation.y = f * Math.PI / 4 + a; fin.translateX(2.2 * f); g.add(fin); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile(rad, 3.4), 48), new THREE.MeshStandardMaterial({ color: SAUC[i % 4], roughness: .4, metalness: .25 })); body.position.y = H; g.add(body);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(rad * .82, rad * .9, .9, 48), CREAM); deck.position.y = H + 1.2; g.add(deck);
  const win = new THREE.Mesh(new THREE.TorusGeometry(rad * .97, .45, 8, 64), M.glow(0xffd9a0, 1.4)); win.rotation.x = Math.PI / 2; win.position.y = H + .2; g.add(win);
  const garden = new THREE.Mesh(new THREE.TorusGeometry(rad * .7, .9, 8, 48), M.green); garden.rotation.x = Math.PI / 2; garden.position.y = H + 2; g.add(garden);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(rad * .5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), GLASSB); dome.position.y = H + 1.6; g.add(dome);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 9, 5), CREAM); ant.position.y = H + 8.5; g.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), M.glow(0xff4a3a, 3)); tip.position.y = H + 13.2; g.add(tip);
  for (let k2 = 0; k2 < 6; k2++) addBallLate2(x + Math.cos(k2) * rad * .7, H + 2.6, z + Math.sin(k2) * rad * .7);
  SAUCERS.push({ g, tip, H, x, z, k, name: `${['Aqua', 'Salus', 'Verda', 'Humus', 'Solis', 'Logos', 'Sylva', 'Agora'][i]} Sky Home` });
});
function addBallLate2(x, y, z) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), M.green); b.position.set(x, y, z); G.add(b); }
// ---------- Sky Loop: glass tube walkway linking every saucer stalk ----------
const loopC = new THREE.CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => { const a = i / 64 * Math.PI * 2; return V(Math.cos(a) * 98, 40, Math.sin(a) * 98); }), true);
G.add(new THREE.Mesh(new THREE.TubeGeometry(loopC, 256, 1.7, 14, true), GLASSB));
G.add(new THREE.Mesh(new THREE.TubeGeometry(loopC, 256, .18, 6, true), M.glow(0x5fd6cf, 1.5)));
const movers = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.9, 2.2, 4, 10), M.glow([0xff6b4a, 0xf4b13e][i % 2], .8)); G.add(m); return { m, t: i / 16, s: (i % 2 ? 1 : -1) * .012 }; });
// ---------- Grand Skyport at the boulevard × rail ring ----------
const SKY = { a: SPOKE(7) };
{ const a = SKY.a, g = new THREE.Group(); const [cx, , cz] = PO(210, a); g.position.set(cx, 0, cz); g.rotation.y = -a; G.add(g); SKY.g = g; SKY.pos = [cx, 30, cz];
  // local axes: +x = radial outward, z = lateral
  const parab = (off, hgt, span) => new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => { const t = i / 24 * 2 - 1; return V(t * span, hgt * (1 - t * t), off); }));
  [-13, 13].forEach(o => { g.add(new THREE.Mesh(new THREE.TubeGeometry(parab(o, 52, 24), 80, 1.3, 10), CREAM)); g.add(new THREE.Mesh(new THREE.TubeGeometry(parab(o * 1.08, 44, 21), 80, .35, 6), M.glow(0xf4b13e, 1.6))); });
  for (let i = -5; i <= 5; i++) { const t = i / 6, y = 52 * (1 - t * t); const rib = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 26, 5), IRON); rib.rotation.x = Math.PI / 2; rib.position.set(t * 24, y, 0); g.add(rib); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 30), new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: .8 })); deck.position.set(0, 13, 0); g.add(deck);
  [-1, 1].forEach(s => { const roof = new THREE.Mesh(new THREE.BoxGeometry(26, .5, 16), CREAM); roof.position.set(0, 25 + 2.5, s * 7.5); roof.rotation.x = s * .32; g.add(roof); });
  for (const [x, zz] of [[-10, -12], [10, -12], [-10, 12], [10, 12]]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(.45, .6, 13, 8), IRON); col.position.set(x, 19.5, zz); g.add(col); const leg = new THREE.Mesh(new THREE.CylinderGeometry(.6, .9, 13, 8), IRON); leg.position.set(x, 6.5, zz); g.add(leg); }
  // railway clock tower
  const tw = new THREE.Group(); tw.position.set(-8, 0, 20); g.add(tw);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 34, 3.4), IRON); shaft.position.y = 17; tw.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5, 4), BRASS); cap.position.y = 41; cap.rotation.y = Math.PI / 4; tw.add(cap);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const ctx = cv.getContext('2d'); const ctex = new THREE.CanvasTexture(cv); ctex.colorSpace = THREE.SRGBColorSpace; SKY.clock = { ctx, ctex };
  [[0, 1.75], [Math.PI, -1.75], [Math.PI / 2, 0], [-Math.PI / 2, 0]].forEach(([ry], i) => { const face = new THREE.Mesh(new THREE.CircleGeometry(2.9, 40), new THREE.MeshStandardMaterial({ map: ctex, emissive: 0xfff2d0, emissiveMap: ctex, emissiveIntensity: .35 })); face.position.y = 35.5; face.rotation.y = ry; face.translateZ(1.75); tw.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3, .32, 8, 40), BRASS); rim.position.copy(face.position); rim.rotation.y = ry; tw.add(rim); });
  // Space-Age starburst sign
  const star = new THREE.Group(); star.position.set(12, 34, 16); g.add(star); SKY.star = star;
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(9, .5, .5), M.glow(0xf4b13e, 2)); b.rotation.z = i * Math.PI / 6; star.add(b); }
  star.add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), M.glow(0xff6b4a, 2)));
  // smaller arch canopies at the other seven boulevard crossings
  for (let s = 0; s < 7; s++) { const a2 = SPOKE(s), [x2, , z2] = PO(210, a2); const g2 = new THREE.Group(); g2.position.set(x2, 0, z2); g2.rotation.y = -a2; G.add(g2);
    g2.add(new THREE.Mesh(new THREE.TubeGeometry(parab(0, 30, 15), 50, .9, 8), CREAM)); const d2 = new THREE.Mesh(new THREE.BoxGeometry(16, .8, 20), new THREE.MeshStandardMaterial({ color: 0xd8d2c4 })); d2.position.y = 13; g2.add(d2);
    const st2 = new THREE.Group(); st2.position.set(0, 31, 0); g2.add(st2); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, .35, .35), M.glow(0xf4b13e, 2)); b.rotation.z = i * Math.PI / 4; st2.add(b); } }
}
function drawClock() { const { ctx, ctex } = SKY.clock, d = new Date(), c = 128; ctx.fillStyle = '#fbf3e2'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#13213c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(c, c, 118, 0, 7); ctx.stroke();
  ctx.fillStyle = '#13213c'; ctx.font = 'bold 28px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; ctx.fillText(n, c + Math.cos(a) * 92, c + Math.sin(a) * 92); });
  const hand = (ang, len, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(ang - Math.PI / 2) * len, c + Math.sin(ang - Math.PI / 2) * len); ctx.stroke(); };
  hand((d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, 56, 10, '#13213c'); hand(d.getMinutes() / 60 * Math.PI * 2, 84, 7, '#13213c'); hand(d.getSeconds() / 60 * Math.PI * 2, 92, 3, '#ff6b4a');
  ctx.fillStyle = '#b8893a'; ctx.beginPath(); ctx.arc(c, c, 9, 0, 7); ctx.fill(); ctex.needsUpdate = true; }
drawClock();
// ---------- streamliner trains: restyle the maglev pods ----------
{ const prof = []; for (let i = 0; i <= 20; i++) { const t = i / 20, y = -7 + t * 15.5; let r = 1.75; if (t > .72) r = 1.75 * Math.sqrt(Math.max(0, 1 - Math.pow((t - .72) / .28, 2))); if (t < .06) r = 1.75 * Math.sqrt(Math.max(0, 1 - Math.pow((.06 - t) / .06, 2))); prof.push(new THREE.Vector2(Math.max(.02, r), y)); }
  const bodyG = new THREE.LatheGeometry(prof, 32); const bodyM = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: .25, metalness: .4 });
  const stripeM = new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: .4, emissive: 0xff6b4a, emissiveIntensity: .25 }), winM = new THREE.MeshStandardMaterial({ color: 0x163040, roughness: .1, metalness: .6, emissive: 0xffd9a0, emissiveIntensity: .5 });
  pods.forEach(p => { p.m.geometry = bodyG; p.m.material = bodyM;
    [[Math.PI / 2 - .32, .64], [3 * Math.PI / 2 - .32, .64]].forEach(([ts, tl]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 11.5, 8, 1, true, ts, tl), stripeM); st.position.y = -1.2; p.m.add(st);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 9.5, 8, 1, true, ts + .18, tl - .36), winM); w.position.y = -.9; p.m.add(w); });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfffbe0 })); nose.position.y = 8.4; p.m.add(nose); }); }
// ---------- flying cars on sky lanes ----------
const lanes = [ringCurve(160, 82, 96), ringCurve(122, 104, 96), ringCurve(185, 64, 96)];
const laneMat = new THREE.LineDashedMaterial({ color: 0x5fd6cf, dashSize: 6, gapSize: 5, transparent: true, opacity: .45 });
lanes.forEach(c => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(300)), laneMat); l.computeLineDistances(); G.add(l); });
const beacons = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lanes.flatMap(c => c.getSpacedPoints(48).flatMap(p => [p.x, p.y - 1.5, p.z])), 3)), new THREE.PointsMaterial({ color: 0x5fd6cf, size: 2, map: DOT, transparent: true, depthWrite: false })); G.add(beacons);
function aerocar(col) { const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: col, roughness: .3, metalness: .35 })); body.scale.set(1.9, .7, 3.4); g.add(body);
  const can = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GLASSB); can.position.set(0, .35, .6); can.scale.set(1, .9, 1.3); g.add(can);
  [-1, 1].forEach(s => { const fin = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.4, 1.6), CREAM); fin.position.set(s * 1.3, .7, -2.6); fin.rotation.z = s * .35; g.add(fin); });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.3, .16, 6, 24), M.glow(0x5fd6cf, 2.5)); glow.rotation.x = Math.PI / 2; glow.position.y = -.65; g.add(glow);
  const tl = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4a3a })); tl.position.set(0, .1, -3.4); g.add(tl);
  return g; }
const CARS2 = []; lanes.forEach((c, li) => { const n = [9, 7, 8][li]; for (let i = 0; i < n; i++) { const m = aerocar([0xff6b4a, 0xf4b13e, 0x16a39a, 0xe85a8a, 0xf6efe2][(i + li) % 5]); G.add(m); CARS2.push({ m, c, t: i / n + R() * .03, s: (li % 2 ? -1 : 1) * (.006 + R() * .003) }); } });
// ---------- navigation, tour, layer toggle ----------
LANDMARKS.push({ n: 'Grand Skyport', d: 'Festival Commons', pos: SKY.pos, cam: [...PO(285, SKY.a + .12, 62)], tg: [SKY.pos[0], 22, SKY.pos[2]], t: 'Where a boulevard meets the heritage rail ring: twin parabolic arches, a boomerang-roof platform, a railway clock tower showing your local time, and streamliner trains gliding through.' },
  { n: 'Saucer Sky Homes & Sky Loop', d: 'Agora Core', pos: [...PO(98, SA('food'), 62)], cam: [...PO(175, SA('food') + .3, 95)], tg: [...PO(98, SA('food'), 50)], t: 'Eight Space-Age saucer homes on slender stalks, with sky gardens on top, linked by a glass tube walkway with people movers.' },
  { n: 'Sky Lanes', d: 'Agora Core', pos: [0, 90, 0], cam: [0, 150, 300], tg: [0, 80, 0], t: 'Three lit air-taxi corridors at 64, 82 and 104 m, where flying cars glide above the rings.' });
{ const li = LANDMARKS.length - 3; tourStops.splice(1, 0, { k: 'lm', li, t: 'Grand Skyport', s: 'Space Age × Rail Age', d: LANDMARKS[li].t, cam: LANDMARKS[li].cam, tg: LANDMARKS[li].tg, c: GOLD }); }
buildNav();
layers.retro = true;
{ const lab = document.createElement('label'); lab.innerHTML = '<input type="checkbox" data-l="retro" checked> Space-Age rail layer'; document.getElementById('layers').prepend(lab);
  lab.querySelector('input').addEventListener('change', e => { layers.retro = e.target.checked; G.visible = layers.retro; });
  const a = document.createElement('a'); a.href = '../vision-2/index.html'; a.textContent = 'Development Vision 2.0 ↗'; a.style.cssText = 'display:block;margin-top:8px;color:#f4b13e;font-size:12.5px'; document.getElementById('layers').append(a); }
let ck = 0;
window.RETRO = { frame(dt, T) { if (!G.visible) return;
  movers.forEach(m => { m.t = (m.t + m.s * dt + 1) % 1; const p = loopC.getPointAt(m.t), q = loopC.getPointAt((m.t + .002 * Math.sign(m.s) + 1) % 1); m.m.position.copy(p); m.m.lookAt(q); m.m.rotateX(Math.PI / 2); });
  CARS2.forEach(c => { c.t = (c.t + c.s * dt + 1) % 1; const p = c.c.getPointAt(c.t), q = c.c.getPointAt((c.t + .003 * Math.sign(c.s) + 1) % 1); c.m.position.set(p.x, p.y + Math.sin(T * 1.3 + c.t * 40) * .6, p.z); c.m.lookAt(q.x, p.y, q.z); c.m.rotateZ(Math.sign(c.s) * .12); });
  SAUCERS.forEach((s, i) => { s.tip.visible = Math.sin(T * 3 + i) > 0; });
  if (SKY.star) SKY.star.rotation.z += dt * .4;
  ck += dt; if (ck > 1) { ck = 0; drawClock(); }
} };
})();
