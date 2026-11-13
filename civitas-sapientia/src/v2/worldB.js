/* ---------- build the radial city (V2) ---------- */
const ringCurve = (r, y = 0, n = 96) => new THREE.CatmullRomCurve3(Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return V(Math.cos(a) * r, y, Math.sin(a) * r); }), true);
const annulus = (r0, r1, y, mat, a0 = 0, al = Math.PI * 2, seg = 160) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, seg, 1, a0, al), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.noCast = true; scene.add(m); return m; };
// annulus helper: RingGeometry angles are measured in XY plane; after -90° X rotation, +y maps to -z, so angle a there = -a in world. Use aW(a)= -a.
const annW = (r0, r1, y, mat, a0, a1, seg = 48) => annulus(r0, r1, y, mat, -a1, a1 - a0, seg);

// "spine" = inner ring road (kept name for engine compatibility), "river" = outer waterway
const spine = ringCurve(RAD.ringRd);
const river = ringCurve((RAD.moat[0] + RAD.moat[1]) / 2);

// --- water: canal ring + outer waterway (moat) ---
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0f3a55, emissive: 0x1a6a9a, emissiveIntensity: .7, roughness: .08, metalness: .5, transparent: true, opacity: .92 });
annulus(RAD.canal[0], RAD.canal[1], .2, waterMat);
annulus(RAD.moat[0], RAD.moat[1], .2, waterMat);
// stone embankments
[[RAD.canal[0] - 1.2, RAD.canal[0]], [RAD.canal[1], RAD.canal[1] + 1.2], [RAD.moat[0] - 1.5, RAD.moat[0]], [RAD.moat[1], RAD.moat[1] + 1.5]].forEach(([a, b]) => annulus(a, b, .35, PAVE));
// core plaza + promenade rings (paving)
annulus(0, 41, .08, PAVE, 0, Math.PI * 2, 96);
annulus(68.5, 77.5, .09, PAVE); annulus(119, 123, .09, PAVE); annulus(135, 139, .09, PAVE);

// --- 8 boulevards (spokes): paving + road + median ---
const roadMatW = new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: .9 });
for (let s = 0; s < 8; s++) { const a = SPOKE(s); const c = new THREE.CatmullRomCurve3([V(...PO(38, a)), V(...PO(250, a))]);
  ribbon(c, 22, .1, PAVE, 40); ribbon(c, 9, .14, roadMatW, 40); ribbon(c, 1.4, .18, M.green, 40);
  [RAD.canal, RAD.moat].forEach(([r0, r1]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(r1 - r0 + 6, 1.2, 22), M.slab); const m = PO((r0 + r1) / 2, a, .7); b.position.set(...m); b.rotation.y = -a; scene.add(b); }); }
ribbon(spine, 8, .13, roadMatW, 200);
ribbon(ringCurve(129 - 9.5), 6, .13, roadMatW, 200);

// --- central dome + Sapientia Tower ---
sapientia(0, 0);
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(32, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.dome); dome.scale.y = .62; dome.userData.noCast = true; scene.add(dome);
  const ribs = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(32.1, 3)), new THREE.LineBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: .5 })); ribs.scale.y = .62; scene.add(ribs);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(32.5, 33, 1.2, 96, 1, true), M.slab); base.position.y = .6; scene.add(base); }

// --- sector: WATER GARDENS (wetlands & sponge park) ---
{ const c = SC('water'); [[0, 0, 13], [-16, 18, 7], [18, -14, 8], [-14, -20, 6], [20, 16, 6], [2, 26, 5]].forEach(([dx, dz, r]) => { const p = new THREE.Mesh(new THREE.CircleGeometry(r, 40), waterMat); p.rotation.x = -Math.PI / 2; p.position.set(c.x + dx, .22, c.z + dz); p.userData.noCast = true; scene.add(p);
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; const m = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 2 + Math.random() * 2.5, 4), M.green); m.position.set(c.x + dx + Math.cos(a) * (r + .5), 1.4, c.z + dz + Math.sin(a) * (r + .5)); scene.add(m); } });
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, d = 14 + Math.random() * 18; addTree(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, .6 + Math.random() * .5); }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 18, 12), M.slab); tower.position.set(c.x - 24, 9, c.z - 2); scene.add(tower);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), M.glass); tank.position.set(c.x - 24, 21, c.z - 2); scene.add(tank); }
const PUMPS = (() => { const c = SC('water'); return [[c.x - 24, 3, c.z - 2, 'Wetland pump station'], [...PO(129, SPOKE(0), 2), 'Canal pump NE'], [...PO(129, SPOKE(4), 2), 'Canal pump SW'], [...PO(242, SPOKE(2), 2), 'Outer waterway pump']].map(p => [p[0], p[1], p[2], p[3]]); })();

// --- sector: SANCTUARY GARDENS (healing) ---
const HEAL = SC('healing');
biodome(HEAL.x, HEAL.z, 24, 20);
const POOLS = [[HEAL.x + 26, HEAL.z - 16, 6], [HEAL.x + 32, HEAL.z - 3, 4.5], [HEAL.x + 22, HEAL.z - 4, 3.5]];
const pools = [];
POOLS.forEach(([x, z, r]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .6, 32), M.glow(TEAL, 1.6)); p.position.set(x, .3, z); scene.add(p); pools.push(p); annulus(r, r + 1.4, .4, PAVE).position.set(x, .4, z); });
{ const pv = group(HEAL.x - 18, HEAL.z + 26); for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 8, 6), M.slab); const a = i / 8 * 6.28; c.position.set(Math.cos(a) * 7, 4, Math.sin(a) * 7); pv.add(c); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 5, 8), M.bronze); roof.position.y = 10.5; pv.add(roof);
  const lotus = new THREE.Mesh(new THREE.TorusGeometry(5, .2, 6, 48), M.glow(GOLD, 2)); lotus.rotation.x = Math.PI / 2; lotus.position.y = .6; pv.add(lotus); }
forestTower(HEAL.x + 6, HEAL.z + 30, 36, 7, .2, TEAL);

// --- sector: AGRI BELT (food) ---
const FOOD = SC('food');
{ const crops = [0x7aa040, 0xb0a040, 0x5e8a3a, 0x9ab84a, 0xc0a858, 0x6a9a48].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  const a0 = SA('food') - Math.PI / 8 + .07, a1 = SA('food') + Math.PI / 8 - .07; let i = 0;
  for (let r = 141; r < 200; r += 6.5) { const n = 5; for (let j = 0; j < n; j++) { const s0 = a0 + (a1 - a0) * j / n, s1 = a0 + (a1 - a0) * (j + 1) / n - .006; annW(r, r + 5.8, .1, crops[(i++) % crops.length], s0, s1, 12); } } }
vfarm(FOOD.x - 14, FOOD.z - 8, 44, 6); vfarm(FOOD.x + 14, FOOD.z - 8, 36, 5); vfarm(FOOD.x, FOOD.z + 14, 30, 5);
greenhouse(FOOD.x - 30, FOOD.z + 12, 26, 5, 0); greenhouse(FOOD.x + 30, FOOD.z + 12, 26, 5, 0); terrace(FOOD.x, FOOD.z - 34, 3, 9);

// --- sector: SOIL COMMONS ---
const SOIL = SC('soil');
{ const egg = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 24), M.bronze); egg.scale.y = 1.35; egg.position.set(SOIL.x, 9, SOIL.z); scene.add(egg);
  const band = new THREE.Mesh(new THREE.TorusGeometry(9.1, .25, 6, 48), M.glow(0xe6c040, 2)); band.rotation.x = Math.PI / 2; band.position.set(SOIL.x, 9, SOIL.z); scene.add(band);
  terrace(SOIL.x + 22, SOIL.z + 14, 3, 9); terrace(SOIL.x - 22, SOIL.z + 10, 2, 7); }
const mycelium = (() => { const pts = [];
  const branch = (x, z, a, len, depth) => { if (depth > 5) return; const x2 = x + Math.cos(a) * len, z2 = z + Math.sin(a) * len; pts.push(x, .35, z, x2, .35, z2); const n = 2 + (depth < 2 ? 1 : 0); for (let i = 0; i < n; i++) branch(x2, z2, a + (Math.random() - .5) * 1.3, len * .78, depth + 1); };
  for (let i = 0; i < 14; i++) branch(SOIL.x, SOIL.z, i / 14 * 6.28, 14, 0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xf2e6cc, transparent: true, opacity: .35 })); scene.add(l); return l; })();

// --- sector: ENERGY FIELDS ---
const EN = SC('energy');
for (let i = 0; i < 30; i++) { const a = i * 2.4, d = 6 + Math.sqrt(i) * 5.4; solarLeaf(EN.x + Math.cos(a) * d, EN.z + Math.sin(a) * d, 6 + (i % 3) * 2.5, 3.8, -.35); }
const TURB = [[EN.x - 6, EN.z - 38], [EN.x + 10, EN.z - 36], [EN.x - 6, EN.z + 38], [EN.x + 10, EN.z + 36]];
TURB.forEach(([x, z]) => helixTurbine(x, z, 30));
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 5, 6), M.slab); b.position.set(EN.x + 30, 2.5, EN.z); scene.add(b);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 3.6, .3), M.glow(JADE, 2.5)); const a = i / 6 * 6.28 + .52; s.position.set(EN.x + 30 + Math.cos(a) * 6, 2.6, EN.z + Math.sin(a) * 6); s.lookAt(EN.x + 30, 2.6, EN.z); scene.add(s); } }

// --- sector: COMPUTE FOREST ---
const CMP = SC('compute');
dataHill(CMP.x, CMP.z, 32);

// --- sector: WILD RESERVE (habitat) ---
const HAB = SC('habitat');
for (let i = 0; i < 260; i++) { const a = SA('habitat') + (Math.random() - .5) * (Math.PI / 4 - .08), r = 142 + Math.random() * 60; if (Math.abs(r - 170) < 6 && Math.random() < .7) continue; (Math.random() < .5 ? addPine : addTree)(Math.cos(a) * r, Math.sin(a) * r, .7 + Math.random() * .7); }
function greenBridge(x, z, rot) { const g = group(x, z); g.rotation.y = rot;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(22, 4, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 1 })); arch.scale.set(1, .7, 2.2); g.add(arch);
  for (let i = 0; i < 9; i++) { const a = .3 + i / 8 * (Math.PI - .6); const tx = Math.cos(a) * 22, ty = Math.sin(a) * 22 * .7 + 2; const v = V(tx, 0, 0).applyAxisAngle(V(0, 1, 0), rot); addTree(x + v.x, z + v.z + (i % 2 ? 3 : -3), .7, ty); } }
{ const a = SA('habitat'); const p = PO(RAD.mag, a); greenBridge(p[0], p[2], -a); const a2 = SA('habitat') + .25, p2 = PO(RAD.mag, a2); greenBridge(p2[0], p2[2], -a2); }

// --- sector: FESTIVAL COMMONS (people) ---
const FEST = SC('people');
{ const g = group(FEST.x, FEST.z); g.rotation.y = -SA('people') + Math.PI / 2;
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(10 + i * 3, .9, 4, 48, Math.PI), M.slab); t.rotation.x = -Math.PI / 2; t.position.y = .5 + i * .8; g.add(t); }
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1, 32, 1, false, 0, Math.PI), PAVE); stage.position.y = .5; stage.rotation.y = Math.PI; g.add(stage);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 12, 0, Math.PI, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2efe8, side: THREE.DoubleSide, roughness: .6 })); canopy.rotation.y = Math.PI / 2; canopy.position.set(0, 1, -2); g.add(canopy); }
for (let i = 0; i < 24; i++) { const a = SA('people') + .14 + (i % 6) * .035, r = 150 + Math.floor(i / 6) * 5; const b = new THREE.Mesh(new THREE.BoxGeometry(4.5, .7, 3), new THREE.MeshStandardMaterial({ color: [0x6aae4a, 0x8ac04a, 0x4f9a4a][i % 3] })); b.position.set(Math.cos(a) * r, .35, Math.sin(a) * r); b.rotation.y = -a; scene.add(b); }
// vertiport (drone & air-taxi hub) in the people sector
const VERT = [...PO(186, SA('people') - .22, 32)];
{ const vp = group(VERT[0], VERT[2]); const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 30, 12), M.slab); pole.position.y = 15; vp.add(pole);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(13, 11, 1.2, 6), M.slab); deck.position.y = 30; vp.add(deck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, .3, 6, 6), M.glow(VIOLET, 3)); ring.rotation.x = Math.PI / 2; ring.position.y = 30.8; vp.add(ring); }

// --- maglev ring (elevated) with pods ---
const loop = ringCurve(RAD.mag, 16, 64);
scene.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 400, 1.1, 8, true), M.slab));
scene.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 400, .3, 6, true), M.glow(0x9fd0ff, 2.5)));
for (let i = 0; i < 64; i++) { const p = loop.getPointAt(i / 64); const c = new THREE.Mesh(new THREE.CylinderGeometry(.8, 1.4, p.y, 8), M.slab); c.position.set(p.x, p.y / 2, p.z); scene.add(c); }
const pods = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 7, 6, 12), M.glow(0xe8f6ff, 1.6)); m.rotation.order = 'YXZ'; scene.add(m); return { m, t: i / 9 }; });

// drones, birds, steam
const drones = Array.from({ length: 30 }, (_, i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), M.glow(i % 3 ? VIOLET : 0xffffff, 3)); scene.add(m);
  return { m, cx: (Math.random() - .5) * 360, cz: (Math.random() - .5) * 360, r: 20 + Math.random() * 60, y: 45 + Math.random() * 50, s: (.15 + Math.random() * .25) * (i % 2 ? 1 : -1), o: Math.random() * 6 }; });
const birds = Array.from({ length: 30 }, (_, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(.5, 2, 3), new THREE.MeshBasicMaterial({ color: 0xdfe7ea })); m.rotation.z = Math.PI / 2; scene.add(m); return { m, o: i * .21 }; });
const steam = (() => { const n = 160, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { const pl = POOLS[i % 3]; seed.push([pl[0] + (Math.random() - .5) * pl[2], pl[1] + (Math.random() - .5) * pl[2], Math.random()]); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcffff4, size: 3, transparent: true, opacity: .35, depthWrite: false })); scene.add(pts); return { pts, p, seed }; })();
// festival lanterns along the inner ring road and every boulevard
{ const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 160; i++) { const q = spine.getPointAt(i / 160); p.push(q.x, 8 + Math.sin(i * .7), q.z); }
  for (let s = 0; s < 8; s++) for (let r = 44; r < 228; r += 7) { const a = SPOKE(s); p.push(Math.cos(a) * r, 7.5 + Math.sin(r) * .6, Math.sin(a) * r); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc070, size: 2.2, transparent: true, opacity: .95 }))); }
