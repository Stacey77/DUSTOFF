
/* =====================================================================
   LIFE IN NATURE: beachgoers, swimmers, umbrellas, boardwalk, wildlife
   ===================================================================== */
(() => {
const R = Math.random, SH = z => -440 + 38 * Math.sin(z / 140) + 22 * Math.sin(z / 47);
const beachX = (z, f) => SH(z) + 6 + f * 60;   // f: 0 = waterline, 1 = back of beach
const dO = new THREE.Object3D(), dL = new THREE.Object3D(); dL.rotation.order = 'YXZ'; const col = new THREE.Color();
// people geometry (same proportions as the city crowd)
const torsoG = (() => { const t = new THREE.CapsuleGeometry(.2, .5, 4, 8); t.translate(0, 1.13, 0); const a = [-.27, .27].map(x => { const g = new THREE.CapsuleGeometry(.065, .5, 3, 6); g.translate(x, 1.1, 0); return g; }); return mergeGeometries([t, ...a]); })();
const headG = new THREE.SphereGeometry(.115, 10, 8); headG.translate(0, 1.62, 0);
const legG = new THREE.CapsuleGeometry(.075, .7, 3, 6); legG.translate(0, -.42, 0);
const SWIM = [0xe04a4a, 0x2a6ac0, 0xf2c230, 0x1aa88a, 0xe07ad8, 0x111111, 0xff8a3a, 0xffffff];
const SKIN = [0x3b2219, 0x5a3825, 0x7a4e32, 0x8d5a3b, 0xa86e4b, 0xc68a62, 0xe0ac86, 0xf1c9a5];
const P = [];
for (let i = 0; i < 170; i++) P.push({ k: 'walk', z: (R() - .5) * 1600, f: R() * .25, dir: R() < .5 ? 1 : -1, sp: .9 + R() * .6, ph: R() * 6 });
for (let i = 0; i < 110; i++) P.push({ k: 'lie', z: (R() - .5) * 1500, f: .35 + R() * .5, ry: R() * 6.28 });
for (let i = 0; i < 60; i++) P.push({ k: 'swim', z: (R() - .5) * 1400, off: 8 + R() * 30, ph: R() * 6 });
for (let i = 0; i < 40; i++) P.push({ k: 'stand', z: (R() - .5) * 1400, f: .05 + R() * .5, ry: R() * 6.28, ph: R() * 6 });
const N = P.length, mk = g => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: .7 }), N); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; scene.add(m); return m; };
const IM = { t: mk(torsoG), h: mk(headG), l: mk(legG), r: mk(legG) };
P.forEach((p, i) => { const sw = col.set(SWIM[i % SWIM.length]); IM.t.setColorAt(i, sw); IM.l.setColorAt(i, col.set(SKIN[(i * 5) % 8])); IM.r.setColorAt(i, col.set(SKIN[(i * 5) % 8])); IM.h.setColorAt(i, col.set(SKIN[(i * 5) % 8])); p.sc = .85 + R() * .2; });
// umbrellas + towels
const umb = []; for (let i = 0; i < 90; i++) umb.push([(R() - .5) * 1500, .4 + R() * .45]);
{ const pole = new THREE.CylinderGeometry(.05, .05, 2.6, 5); pole.translate(0, 1.3, 0); const can = new THREE.ConeGeometry(1.6, .7, 8, 1, true); can.translate(0, 2.6, 0);
  const pIM = new THREE.InstancedMesh(pole, new THREE.MeshStandardMaterial({ color: 0xeeeeee }), umb.length), cIM = new THREE.InstancedMesh(can, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .7 }), umb.length);
  const tw = new THREE.BoxGeometry(1, .03, 1.9), tIM = new THREE.InstancedMesh(tw, new THREE.MeshStandardMaterial({ roughness: 1 }), umb.length);
  umb.forEach(([z, f], i) => { dO.position.set(beachX(z, f), .18, z); dO.rotation.set(0, R() * 3, (R() - .5) * .15); dO.scale.setScalar(1); dO.updateMatrix(); pIM.setMatrixAt(i, dO.matrix); cIM.setMatrixAt(i, dO.matrix); cIM.setColorAt(i, col.set([0xe04a4a, 0xf2c230, 0x2a8ac0, 0xffffff, 0x1aa88a, 0xff8a3a][i % 6]));
    dO.position.set(beachX(z, f) + 1.4, .2, z + .5); dO.rotation.set(0, R(), 0); dO.updateMatrix(); tIM.setMatrixAt(i, dO.matrix); tIM.setColorAt(i, col.set([0x3a8ac0, 0xf2c230, 0xe07ad8, 0xffffff, 0x1aa88a][i % 5])); });
  cIM.castShadow = pIM.castShadow = true; scene.add(pIM, cIM, tIM); }
// boardwalk at the back of the beach + lifeguard towers + beach cafés
{ const zs = []; for (let z = -760; z <= 760; z += 16) zs.push(z); const c = new THREE.CatmullRomCurve3(zs.map(z => V(beachX(z, 1.05), 0, z))); ribbon(c, 5, .45, new THREE.MeshStandardMaterial({ color: 0xa07a52, roughness: .9 }), 240).userData.noCast = true;
  for (let z = -600; z <= 600; z += 150) { const g = new THREE.Group(); g.position.set(beachX(z, .3), 0, z); scene.add(g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 4, 5), new THREE.MeshStandardMaterial({ color: 0xffffff })); l.position.set(a * .9, 2, b * .9); g.add(l); });
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.6), new THREE.MeshStandardMaterial({ color: 0xe04a4a })); box.position.y = 4.9; g.add(box); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xffffff })); roof.position.y = 6.4; roof.rotation.y = Math.PI / 4; g.add(roof); }
  for (let z = -525; z <= 525; z += 210) { const g = new THREE.Group(); g.position.set(beachX(z, 1.25), 0, z); scene.add(g);
    const hut = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 1 })); hut.position.y = 1.6; g.add(hut);
    const thatch = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 8), new THREE.MeshStandardMaterial({ color: 0xb89858, roughness: 1 })); thatch.position.y = 4.6; g.add(thatch); } }
// seagulls (beach) + parrots (jungle) + dolphins (sea)
const flock = (n, cx, cz, r, y, colors, size) => Array.from({ length: n }, (_, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(.35 * size, 1.4 * size, 3), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: .15 })); m.rotation.z = Math.PI / 2; scene.add(m); return { m, cx, cz, r: r * (.6 + R() * .6), y: y + R() * 12, s: (.15 + R() * .2) * (i % 2 ? 1 : -1), o: R() * 6.28 }; });
const BIRDS = [...flock(40, -470, 0, 160, 18, [0xf4f4f4, 0xdadada], 1.4), ...flock(36, 120, 480, 180, 34, [0xe03030, 0x2a8ae0, 0xf2c230, 0x22b060], 1)];
const DOL = Array.from({ length: 8 }, (_, i) => { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0x6a7a88, roughness: .4, metalness: .2 })); body.scale.set(.9, .8, 3); g.add(body);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.2, 4), body.material); fin.position.set(0, .9, -.2); fin.rotation.x = -.4; g.add(fin); const tail = new THREE.Mesh(new THREE.BoxGeometry(2, .12, .7), body.material); tail.position.z = -3; g.add(tail);
  scene.add(g); return { g, z0: (R() - .5) * 900, x0: -560 - R() * 300, ph: R() * 10, sp: 6 + R() * 4 }; });
// guided tour gets the nature stops
const bi = LANDMARKS.findIndex(l => l.n === 'Western Beaches & Marina'), ji = LANDMARKS.findIndex(l => l.n === 'Southern Jungle');
[bi, ji].forEach(li => { if (li >= 0) { const L = LANDMARKS[li]; tourStops.splice(tourStops.length - 1, 0, { k: 'lm', li, t: L.n, s: 'Nature', d: L.t, cam: L.cam, tg: L.tg, c: GOLD }); } });

let acc = 0;
window.LIFE = { frame(dt, T) {
  const vis = layers.people !== false; Object.values(IM).forEach(m => m.visible = vis);
  // only animate when the camera is near the coast or high enough to see it
  const near = Math.hypot(camera.position.x + 460, camera.position.z) < 900; acc += dt; if (!vis || (!near && acc < .3)) return; const st = acc; acc = 0;
  for (let i = 0; i < N; i++) { const p = P[i]; let x, y = 0, z, yaw = 0, sw = 0, lie = false, sink = 0;
    if (p.k === 'walk') { p.z += p.dir * p.sp * st; if (Math.abs(p.z) > 760) p.dir *= -1; x = beachX(p.z, p.f); z = p.z; yaw = p.dir > 0 ? 0 : Math.PI; p.ph += st * p.sp * 5.5; sw = Math.sin(p.ph) * .5; }
    else if (p.k === 'lie') { x = beachX(p.z, p.f); z = p.z; lie = true; yaw = p.ry; }
    else if (p.k === 'swim') { x = SH(p.z) - p.off + Math.sin(T * .3 + p.ph) * 2; z = p.z + Math.sin(T * .2 + p.ph) * 3; sink = 1.25 + Math.sin(T * 2 + p.ph) * .12; sw = Math.sin(T * 4 + p.ph) * .6; yaw = Math.PI / 2; }
    else { x = beachX(p.z, p.f); z = p.z; yaw = p.ry + Math.sin(T * .3 + p.ph) * .3; }
    dO.position.set(x, .18 + y - sink, z); dO.rotation.set(lie ? -Math.PI / 2 : 0, yaw, 0); dO.scale.setScalar(p.sc); if (lie) dO.position.y = .45; dO.updateMatrix(); IM.t.setMatrixAt(i, dO.matrix); IM.h.setMatrixAt(i, dO.matrix);
    if (lie) { IM.l.setMatrixAt(i, dO.matrix); IM.r.setMatrixAt(i, dO.matrix); continue; }
    const c = Math.cos(yaw), s = Math.sin(yaw); dL.scale.setScalar(p.sc);
    dL.position.set(x - c * .1 * p.sc, (.86 * p.sc) + .18 - sink, z + s * .1 * p.sc); dL.rotation.set(sw, yaw, 0); dL.updateMatrix(); IM.l.setMatrixAt(i, dL.matrix);
    dL.position.set(x + c * .1 * p.sc, (.86 * p.sc) + .18 - sink, z - s * .1 * p.sc); dL.rotation.set(-sw, yaw, 0); dL.updateMatrix(); IM.r.setMatrixAt(i, dL.matrix); }
  Object.values(IM).forEach(m => m.instanceMatrix.needsUpdate = true);
  BIRDS.forEach(b => { const a = T * b.s + b.o; b.m.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(T * 1.7 + b.o) * 2, b.cz + Math.sin(a) * b.r * .7); b.m.rotation.y = -a; b.m.scale.y = 1 + Math.sin(T * 10 + b.o) * .45; });
  DOL.forEach(d => { const t = (T * .35 + d.ph) % 4; const jump = t < 1.2 ? Math.sin(t / 1.2 * Math.PI) : 0; const zz = d.z0 + ((T * d.sp + d.ph * 30) % 300) - 150;
    d.g.position.set(d.x0 + Math.sin(T * .1 + d.ph) * 40, -1.2 + jump * 4.5, zz); d.g.rotation.set(t < 1.2 ? Math.cos(t / 1.2 * Math.PI) * .7 : 0, 0, 0); d.g.visible = t < 1.4; });
} };
})();
