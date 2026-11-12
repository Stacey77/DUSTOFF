// ---------- placement (V2 radial) ----------
Object.values(MAT).forEach(m => m.side = THREE.DoubleSide);
const nearestDistrict = (x, z) => { const r = Math.hypot(x, z); if (r < 72) return 'Agora Core'; if (r < 120) return 'Living Ring'; return districts.slice(1).sort((a, b) => Math.hypot(x - a.x, z - a.z) - Math.hypot(x - b.x, z - b.z))[0].n; };
const B = []; const roofBalls = []; const addBallLate = (x, y, z, s) => roofBalls.push([x, y, z, s]);
const angD = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
const nearSpoke = (r, a, half) => { for (let s = 0; s < 8; s++) if (angD(a, SPOKE(s)) * r < half) return true; return false; };
const DSITE = PO(160, SA('soil') - .24);
// geometry stores with per-building vertex ranges (for stress tinting)
const parts = { glass: [], resi: [], timber: [], lab: [] }, vcount = { glass: 0, resi: 0, timber: 0, lab: 0 }, roofs = { green: [], solar: [], plain: [], hvac: [] }, glows = [];
function addPiece(b, type, g) { g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(1), 3)); if (g.index === null) return;
  b.ranges.push([type, vcount[type], g.attributes.position.count]); vcount[type] += g.attributes.position.count; parts[type].push(g); }
function boxGeo(w, h, d, oU, oV) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); if (f === 2 || f === 3) { uv.setXY(i, 0, 0); continue; } const fw = f < 2 ? d : w; uv.setXY(i, uv.getX(i) * fw / 32 + oU, uv.getY(i) * h / 28 + oV); } return g; }
function box(b, type, w, d, h, y0, oU, oV) { const g = boxGeo(w, h, d, oU, oV); g.rotateY(-(b.rot || 0)); g.translate(b.x, y0 + h / 2, b.z); addPiece(b, type, g); }
const slab = (arr, x, y, z, w, d, t = .7, rot = 0) => { const g = new THREE.BoxGeometry(w, t, d); g.rotateY(-rot); g.translate(x, y + t / 2, z); arr.push(g); };
function arcFace(b, type, r, h, y0, a0, a1, oV) { const len = r * (a1 - a0), g = new THREE.CylinderGeometry(r, r, h, Math.max(8, Math.round(len / 2.5)), 1, true, Math.PI / 2 - a1, a1 - a0), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 32, uv.getY(i) * h / 28 + oV); g.translate(0, y0 + h / 2, 0); addPiece(b, type, g); }
function arcRoof(arr, r0, r1, y, a0, a1) { const g = new THREE.RingGeometry(r0, r1, Math.max(8, Math.round(r1 * (a1 - a0) / 3)), 1, -a1, a1 - a0); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); arr.push(g); }
// terraced crescent / research arc
function crescent(type, r0, r1, a0, a1, tiers, hs, label) {
  const am = (a0 + a1) / 2, rm = (r0 + r1) / 2, step = (r1 - r0 - 6) / tiers;
  const b = { id: B.length, arc: { r0, r1, a0, a1 }, x: Math.cos(am) * rm, z: Math.sin(am) * rm, w: 14, d: 14, h: tiers * hs, type, dn: nearestDistrict(Math.cos(am) * rm, Math.sin(am) * rm), ranges: [], stress: 0, retro: {}, shm: 93 + rnd() * 6, year: 2027 + Math.floor(rnd() * 9), label };
  const oV = Math.floor(rnd() * 8) / 8;
  for (let i = 0; i < tiers; i++) { const ro = r1 - i * step, y = i * hs;
    arcFace(b, type, ro, hs, y, a0, a1, oV);
    [a0, a1].forEach(a => { const g = boxGeo(ro - r0, hs, .8, 0, oV); g.rotateY(-a); g.translate(Math.cos(a) * (r0 + ro) / 2, y + hs / 2, Math.sin(a) * (r0 + ro) / 2); addPiece(b, type, g); });
    if (i < tiers - 1) { arcRoof(roofs.green, r1 - (i + 1) * step, ro, y + hs + .05, a0, a1);
      for (let k = 0; k < 6; k++) { const aa = a0 + (a1 - a0) * (k + .5) / 6, rr = ro - step * .4; addBallLate(Math.cos(aa) * rr, y + hs + 1, Math.sin(aa) * rr, .9 + rnd() * .5); } }
    else arcRoof(type === 'lab' ? roofs.solar : roofs.green, r0, ro, y + hs + .05, a0, a1); }
  arcFace(b, type, r0, tiers * hs, 0, a0, a1, oV);
  const arcA = (a1 - a0) * rm * (r1 - r0); b.area = Math.round(arcA * tiers * .6); B.push(b); return b; }
// 1) research ring: 8 terraced lab arcs
for (let k = 0; k < 8; k++) { const ac = k * Math.PI / 4, half = Math.PI / 8; const g0 = 15 / 55; crescent('lab', RAD.r1[0], RAD.r1[1], ac - half + g0, ac + half - g0, 3, 5.2, 'Research arc · terraced labs, solar roof'); }
// 2) living ring: 16 terraced residential crescents (two per sector, a garden gap between)
for (let k = 0; k < 8; k++) { const ac = k * Math.PI / 4, half = Math.PI / 8, g0 = 27 / 98, mid = 5 / 98;
  crescent('resi', RAD.liv[0], RAD.liv[1], ac - half + g0, ac - mid, 4, 4.4, 'Terraced residential crescent · CLT + concrete, garden terraces');
  crescent('resi', RAD.liv[0], RAD.liv[1], ac + mid, ac + half - g0, 4, 4.4, 'Terraced residential crescent · CLT + concrete, garden terraces'); }
// 3) tower pairs flanking every boulevard through the living ring
for (let s = 0; s < 8; s++) { const a = SPOKE(s); [88, 110].forEach((r, j) => [-1, 1].forEach(side => { const off = 19 * side, x = Math.cos(a) * r - Math.sin(a) * off, z = Math.sin(a) * r + Math.cos(a) * off;
  const h = 55 + rnd() * 70 * (j === 0 ? 1 : .8); B.push({ id: B.length, x, z, w: 8.5, d: 8.5, h, type: 'glass', rot: a, dn: 'Living Ring', ranges: [], stress: 0, retro: {}, shm: 93 + rnd() * 6, year: 2027 + Math.floor(rnd() * 9) }); })); }
// 4) outer-belt villages (timber) and a few mid-rises, avoiding sector features
const featR = 40, noVillage = new Set(['habitat', 'food']);
for (let r = 146; r <= 198; r += 12) for (let a = 0; a < Math.PI * 2; a += 12.5 / r) {
  const aj = a + (rnd() - .5) * .02, x = Math.cos(aj) * r, z = Math.sin(aj) * r;
  const sec = SEC[Math.round(((aj % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8];
  if (noVillage.has(sec) || nearSpoke(r, aj, 17)) continue;
  const c = SC(sec); if (Math.hypot(x - c.x, z - c.z) < featR) continue;
  if (TURB.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 10) || Math.hypot(x - VERT[0], z - VERT[2]) < 18 || Math.hypot(x - DSITE[0], z - DSITE[2]) < 15) continue;
  if (rnd() < .3) continue;
  const tall = rnd() < .18; B.push({ id: B.length, x, z, w: tall ? 9 : 6.5 + rnd() * 2, d: tall ? 9 : 6.5 + rnd() * 2, h: tall ? 16 + rnd() * 14 : 7 + rnd() * 6, type: tall ? 'resi' : 'timber', rot: aj, dn: nearestDistrict(x, z), ranges: [], stress: 0, retro: {}, shm: 93 + rnd() * 6, year: 2027 + Math.floor(rnd() * 9) });
}
// ---------- geometry for box buildings ----------
B.forEach(b => { if (b.arc) return;
  const oU = Math.floor(rnd() * 8) / 8, oV = Math.floor(rnd() * 8) / 8, rot = b.rot || 0;
  const rp = (dx, dz) => [b.x + Math.cos(rot) * dx - Math.sin(rot) * dz, b.z + Math.sin(rot) * dx + Math.cos(rot) * dz];
  if (b.type === 'glass') {
    box(b, 'resi', b.w + 4, b.d + 4, 8, 0, oU, oV); slab(roofs.green, b.x, 8, b.z, b.w + 4.4, b.d + 4.4, .7, rot);
    const h1 = (b.h - 8) * .72; box(b, 'glass', b.w, b.d, h1, 8, oU, oV); slab(roofs.plain, b.x, 8 + h1, b.z, b.w + .4, b.d + .4, .5, rot);
    const h2 = b.h - 8 - h1; box(b, 'glass', b.w * .72, b.d * .72, h2, 8 + h1, oU, oV);
    slab(glows, b.x, b.h - .2, b.z, b.w * .72 + .5, b.d * .72 + .5, .45, rot); slab(roofs.plain, b.x, b.h + .25, b.z, b.w * .72, b.d * .72, .4, rot);
    if (b.h > 90) { const s = new THREE.CylinderGeometry(.25, .4, 14, 6); s.translate(b.x, b.h + 7.5, b.z); roofs.hvac.push(s); }
    const [hx, hz] = rp(0, b.d * .32); for (let i = 0; i < 2; i++) { const [px, pz] = rp((i - .5) * 2.4, b.d * .32); slab(roofs.hvac, px, 8 + h1 + .5, pz, 1.8, 1.4, 1.2, rot); }
    b.hvac = [hx, 8 + h1 + 1.5, hz];
  } else {
    box(b, b.type, b.w, b.d, b.h, 0, oU, oV);
    const roofT = rnd() < .7 ? 'green' : 'solar'; slab(roofs[roofT], b.x, b.h, b.z, b.w + .5, b.d + .5, .6, rot);
    if (roofT === 'green') for (let i = 0; i < 2; i++) addBallLate(b.x + (rnd() - .5) * b.w * .6, b.h + 1, b.z + (rnd() - .5) * b.d * .6, .8 + rnd() * .5);
  }
});
const meshes = {};
Object.entries(parts).forEach(([t, arr]) => { if (!arr.length) return; const m = new THREE.Mesh(mergeGeometries(arr), MAT[t]); m.userData.bldType = t; scene.add(m); meshes[t] = m; arr.forEach(g => g.dispose()); });
Object.entries(roofs).forEach(([t, arr]) => { if (arr.length) { const m = new THREE.Mesh(mergeGeometries(arr), ROOF[t]); m.userData.roof = true; scene.add(m); } });
{ const m = new THREE.Mesh(mergeGeometries(glows), GLOW); m.userData.roof = true; scene.add(m); }
{ const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5aa060, roughness: .8 }), roofBalls.length); const dm = new THREE.Object3D();
  roofBalls.forEach(([x, y, z, s], i) => { dm.position.set(x, y, z); dm.scale.setScalar(s); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); scene.add(im); }

// ---------- roads: inner ring, canal ring, 8 boulevards; cars & lamps ----------
const laneMat = new THREE.MeshBasicMaterial({ color: 0xd6c48a, transparent: true, opacity: .6 });
const carCurves = [spine, ringCurve(119.5)];
ribbon(spine, .25, .2, laneMat, 200);
for (let s = 0; s < 8; s++) { const a = SPOKE(s); carCurves.push(new THREE.CatmullRomCurve3([V(...PO(40, a)), V(...PO(248, a))])); }
const cars = []; { const geo = new THREE.BoxGeometry(2, 1.1, 4); const cols = [0xe8eef2, 0x2a2f36, 0x8a1c1c, 0x3a6aa0, 0xd6b46a];
  carCurves.forEach((cc, ci) => { const ring = ci < 2, n = ring ? 14 : 4; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[(i + ci) % 5], metalness: .6, roughness: .3, emissive: 0x111111 })); scene.add(m);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .3, .2), new THREE.MeshBasicMaterial({ color: 0xfff2d0 })); hl.position.set(0, .1, 2.05); m.add(hl);
    const lane = (i % 2 ? 1 : -1) * 2; cars.push({ m, cc, t: i / n, s: (ring ? .012 : .035) * (i % 2 ? 1 : -1) * (.8 + rnd() * .4), loop: ring, lane }); } }); }
const lampMat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 2.2, transparent: true, opacity: .9 });
const LAMPS = []; carCurves.forEach((cc, ci) => { const n = ci < 2 ? 60 : 24; for (let i = 0; i < n; i++) { const t = i / n, q = cc.getPointAt(t); if (ci < 2) { const r = Math.hypot(q.x, q.z), k = (r + 5.5) / r; LAMPS.push([q.x * k, q.z * k]); } else { const a = Math.atan2(q.z, q.x); [-6, 6].forEach(o => LAMPS.push([q.x - Math.sin(a) * o, q.z + Math.cos(a) * o])); } } });
{ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(LAMPS.flatMap(([x, z]) => [x, 6.2, z]), 3)); scene.add(new THREE.Points(g, lampMat)); }
window.LAMPS = LAMPS;
