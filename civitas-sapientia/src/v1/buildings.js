
/* =====================================================================
   URBAN FABRIC: realistic procedural buildings, roads, cars, lights
   ===================================================================== */
(() => {
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// ---------- facade textures ----------
function facade(type) {
  const S = 256, c = document.createElement('canvas'), e = document.createElement('canvas'); c.width = e.width = S; c.height = e.height = S;
  const g = c.getContext('2d'), x = e.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  const cols = 8, rows = 8, cw = S / cols, rh = S / rows;
  if (type === 'glass') {
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#2b5468'); gr.addColorStop(.5, '#16303f'); gr.addColorStop(1, '#244a5c'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) { g.fillStyle = 'rgba(10,20,26,.85)'; g.fillRect(0, r * rh + rh - 5, S, 5);
      for (let k = 0; k < cols; k++) { g.fillStyle = `rgba(160,210,230,${.05 + rnd() * .12})`; g.fillRect(k * cw + 1, r * rh + 1, cw - 2, rh - 7);
        if (rnd() < .38) { x.fillStyle = rnd() < .7 ? '#ffdcaa' : '#cfe8ff'; x.globalAlpha = .55 + rnd() * .45; x.fillRect(k * cw + 2, r * rh + 2, cw - 4, rh - 9); } } }
    g.strokeStyle = 'rgba(190,220,232,.55)'; g.lineWidth = 1.5; for (let k = 0; k <= cols; k++) { g.beginPath(); g.moveTo(k * cw, 0); g.lineTo(k * cw, S); g.stroke(); }
  } else if (type === 'resi') {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const wx = k * cw + 6, wy = r * rh + 6;
      g.fillStyle = '#23303a'; g.fillRect(wx, wy, cw - 12, rh - 14); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(wx, wy, cw - 12, 3);
      if (k % 2 === 0) { g.fillStyle = '#efe9de'; g.fillRect(k * cw + 1, r * rh + rh - 7, cw * 2 - 2, 4); g.fillStyle = 'rgba(80,140,80,.9)'; if (rnd() < .5) g.fillRect(k * cw + 4, r * rh + rh - 11, 8, 4); }
      if (rnd() < .45) { x.fillStyle = '#ffd39a'; x.globalAlpha = .5 + rnd() * .5; x.fillRect(wx, wy, cw - 12, rh - 14); } }
  } else if (type === 'timber') {
    g.fillStyle = '#9a6a40'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(60,35,15,.35)'; for (let i = 0; i < S; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); }
    for (let r = 0; r < rows; r++) { g.fillStyle = '#6a4424'; g.fillRect(0, r * rh + rh - 4, S, 4);
      for (let k = 0; k < cols; k++) if ((k + r) % 3 !== 0) { const wx = k * cw + 7, wy = r * rh + 7; g.fillStyle = '#1e2a30'; g.fillRect(wx, wy, cw - 14, rh - 15);
        if (rnd() < .4) { x.fillStyle = '#ffc98a'; x.globalAlpha = .55 + rnd() * .45; x.fillRect(wx, wy, cw - 14, rh - 15); } } }
  } else { // lab
    g.fillStyle = '#e4e9ec'; g.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) { g.fillStyle = '#2a3a44'; g.fillRect(0, r * rh + 8, S, rh - 16); g.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < S; k += 16) g.fillRect(k, r * rh + 8, 2, rh - 16);
      if (rnd() < .55) { x.fillStyle = '#e8f4ff'; x.globalAlpha = .6; x.fillRect(rnd() * S * .5, r * rh + 8, S * (.3 + rnd() * .5), rh - 16); } }
  }
  const T = t => { const tx = new THREE.CanvasTexture(t); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; };
  return { map: T(c), emi: T(e) };
}
const TEX = { glass: facade('glass'), resi: facade('resi'), timber: facade('timber'), lab: facade('lab') };
const MAT = {
  glass: new THREE.MeshStandardMaterial({ map: TEX.glass.map, emissiveMap: TEX.glass.emi, emissive: 0xffffff, emissiveIntensity: 1.2, metalness: .45, roughness: .22, vertexColors: true }),
  resi: new THREE.MeshStandardMaterial({ map: TEX.resi.map, emissiveMap: TEX.resi.emi, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .8, vertexColors: true }),
  timber: new THREE.MeshStandardMaterial({ map: TEX.timber.map, emissiveMap: TEX.timber.emi, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .75, vertexColors: true }),
  lab: new THREE.MeshStandardMaterial({ map: TEX.lab.map, emissiveMap: TEX.lab.emi, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .5, metalness: .2, vertexColors: true }),
};
const ROOF = { green: new THREE.MeshStandardMaterial({ color: 0x4f8a3f, roughness: 1 }), solar: new THREE.MeshStandardMaterial({ color: 0x1a3060, metalness: .7, roughness: .25, emissive: 0x112244, emissiveIntensity: .3 }),
  plain: new THREE.MeshStandardMaterial({ color: 0x8a9296, roughness: .9 }), hvac: new THREE.MeshStandardMaterial({ color: 0xc2c8cc, metalness: .6, roughness: .35 }) };
const GLOW = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe0a0, emissiveIntensity: 2.2 });

// ---------- placement ----------
const occupied = [[-150, -55, 50], [-110, 55, 48], [-15, 62, 26], [160, 50, 36], [195, 40, 15], [135, 85, 13], [196, 70, 11], [0, -15, 34], [-88, -70, 13], [-60, -52, 11], [-92, -38, 10], [70, -72, 11], [102, -48, 10], [88, -78, 17], [80, 50, 44], [200, 82, 30], [-30, -95, 28], [140, -88, 28], [40, -42, 13], [10, 72, 14]];
const canal = [[[-75, -40], [-60, 40], [-40, 110]], [[85, -40], [95, 30], [110, 100]]];
const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
const ringRoads = [['Model Valley', -75, -60, 34], ['Agora Commons', 0, -15, 40], ['Proving Grounds', 85, -60, 36]].map(([n, x, z, r]) => ({ n, x, z, r: r + 4 }));
function free(x, z, pad) {
  const e = Math.hypot(x / 215, z / 105); if (e > .9 || Math.abs(e - 1) < .06) return false;
  if (z < -100 || z > 86) return false;
  if (Math.abs(z - (1 + 5 * Math.cos(2 * Math.PI * x / 300))) < 13 + pad) return false;
  if (occupied.some(([ox, oz, r]) => Math.hypot(x - ox, z - oz) < r + pad)) return false;
  if (canal.some(p => Math.min(segD(x, z, p[0], p[1]), segD(x, z, p[1], p[2])) < 7 + pad)) return false;
  if (ringRoads.some(R => Math.abs(Math.hypot(x - R.x, z - R.z) - R.r) < 4 + pad)) return false;
  return true;
}
const nearestDistrict = (x, z) => districts.slice().sort((a, b) => Math.hypot(x - a.x, z - a.z) - Math.hypot(x - b.x, z - b.z))[0].n;
const B = []; const SP = 15; const roofBalls = []; const addBallLate = (x, y, z, s) => roofBalls.push([x, y, z, s]);
for (let gx = -240; gx <= 240; gx += SP) for (let gz = -96; gz <= 90; gz += SP) {
  const x = gx + (rnd() - .5) * 3, z = gz + (rnd() - .5) * 3;
  const dc = Math.hypot(x, z + 15); let type, w = 7 + rnd() * 4, d = 7 + rnd() * 4, h;
  const dn = nearestDistrict(x, z);
  if ((dn === 'Model Valley' || dn === 'Proving Grounds') && rnd() < .35) { type = 'lab'; w = 12 + rnd() * 2; d = 8; h = 9 + rnd() * 7; }
  else if (dc < 120 && rnd() < .55) { type = 'glass'; h = Math.max(26, (34 + rnd() * 75) * (1 - dc / 190)); }
  else if (z > 35 || dc > 170 || rnd() < .25) { type = 'timber'; h = 8 + rnd() * 10; }
  else { type = 'resi'; h = 14 + rnd() * 22; }
  if (!free(x, z, Math.max(w, d) / 2 - 2)) continue;
  B.push({ id: B.length, x, z, w, d, h, type, dn, boxes: [], stress: 0, retro: {}, shm: 93 + rnd() * 6, year: 2027 + Math.floor(rnd() * 9) });
}
// ---------- geometry ----------
const parts = { glass: [], resi: [], timber: [], lab: [] }, roofs = { green: [], solar: [], plain: [], hvac: [] }, glows = [], boxOwner = { glass: [], resi: [], timber: [], lab: [] };
function box(b, type, w, d, h, y0, offU, offV) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); if (f === 2 || f === 3) { uv.setXY(i, 0, 0); continue; } const fw = f < 2 ? d : w; uv.setXY(i, uv.getX(i) * fw / 32 + offU, uv.getY(i) * h / 28 + offV); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(1), 3));
  g.translate(b.x, y0 + h / 2, b.z); parts[type].push(g); boxOwner[type].push(b.id); b.boxes.push([type, parts[type].length - 1]);
}
const slab = (arr, x, y, z, w, d, t = .7) => { const g = new THREE.BoxGeometry(w, t, d); g.translate(x, y + t / 2, z); arr.push(g); };
B.forEach(b => {
  const oU = Math.floor(rnd() * 8) / 8, oV = Math.floor(rnd() * 8) / 8;
  if (b.type === 'glass') {
    if (b.h > 45) { // podium + shaft + crown setback
      box(b, 'resi', b.w + 4, b.d + 4, 8, 0, oU, oV); slab(roofs.green, b.x, 8, b.z, b.w + 4.4, b.d + 4.4);
      const h1 = (b.h - 8) * .72; box(b, 'glass', b.w, b.d, h1, 8, oU, oV); slab(roofs.plain, b.x, 8 + h1, b.z, b.w + .4, b.d + .4, .5);
      const h2 = b.h - 8 - h1; box(b, 'glass', b.w * .72, b.d * .72, h2, 8 + h1, oU, oV);
      slab(glows, b.x, b.h - .2, b.z, b.w * .72 + .5, b.d * .72 + .5, .45); slab(roofs.plain, b.x, b.h + .25, b.z, b.w * .72, b.d * .72, .4);
      if (b.h > 75) { const s = new THREE.CylinderGeometry(.25, .4, 14, 6); s.translate(b.x, b.h + 7.5, b.z); roofs.hvac.push(s); }
      for (let i = 0; i < 2; i++) slab(roofs.hvac, b.x + (i - .5) * 2.4, 8 + h1 + .5, b.z + b.d * .32, 1.8, 1.4, 1.2);
      b.hvac = [b.x, 8 + h1 + 1.5, b.z + b.d * .32];
    } else { box(b, 'glass', b.w, b.d, b.h, 0, oU, oV); slab(glows, b.x, b.h - .2, b.z, b.w + .5, b.d + .5, .4); slab(roofs.plain, b.x, b.h + .2, b.z, b.w, b.d, .4); slab(roofs.hvac, b.x, b.h + .6, b.z, 2.2, 1.6, 1.2); b.hvac = [b.x, b.h + 1.5, b.z]; }
  } else {
    box(b, b.type, b.w, b.d, b.h, 0, oU, oV);
    const roofT = b.type === 'lab' ? 'solar' : (rnd() < .7 ? 'green' : 'solar'); slab(roofs[roofT], b.x, b.h, b.z, b.w + .5, b.d + .5, .6);
    if (roofT === 'green') for (let i = 0; i < 3; i++) addBallLate(b.x + (rnd() - .5) * b.w * .7, b.h + 1, b.z + (rnd() - .5) * b.d * .7, .8 + rnd() * .6);
  }
});
const meshes = {};
Object.entries(parts).forEach(([t, arr]) => { if (!arr.length) return; const m = new THREE.Mesh(mergeGeometries(arr), MAT[t]); m.userData.bldType = t; scene.add(m); meshes[t] = m; arr.forEach(g => g.dispose()); });
Object.entries(roofs).forEach(([t, arr]) => { if (arr.length) scene.add(new THREE.Mesh(mergeGeometries(arr), ROOF[t])); });
scene.add(new THREE.Mesh(mergeGeometries(glows), GLOW));
{ const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5aa060, roughness: .8 }), roofBalls.length); const dm = new THREE.Object3D();
  roofBalls.forEach(([x, y, z, s], i) => { dm.position.set(x, y, z); dm.scale.setScalar(s); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); scene.add(im); }

// ---------- ring roads, cars, streetlights ----------
const roadMat = new THREE.MeshStandardMaterial({ color: 0x1b2024, roughness: .95 }), laneMat = new THREE.MeshBasicMaterial({ color: 0xd6c48a, transparent: true, opacity: .6 });
const carCurves = [];
ringRoads.forEach(R => { const c = new THREE.EllipseCurve(R.x, R.z, R.r, R.r); const pts = c.getPoints(96).map(p => V(p.x, 0, p.y)); const cc = new THREE.CatmullRomCurve3(pts, true);
  ribbon(cc, 6, .16, roadMat, 160); ribbon(cc, .25, .2, laneMat, 160); carCurves.push(cc); });
// avenues linking districts (straight, dashed)
[[[-75, -26], [0, 25]], [[0, 25], [85, -24]], [[-41, -60], [-38, -15]]].forEach(([a, b]) => { const cc = new THREE.CatmullRomCurve3([V(a[0], 0, a[1]), V(b[0], 0, b[1])]); ribbon(cc, 5, .15, roadMat, 20); carCurves.push(cc); });
const cars = []; { const geo = new THREE.BoxGeometry(2, 1.1, 4); const cols = [0xe8eef2, 0x2a2f36, 0x8a1c1c, 0x3a6aa0, 0xd6b46a];
  carCurves.forEach((cc, ci) => { const n = ci < 3 ? 9 : 3; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[(i + ci) % 5], metalness: .6, roughness: .3, emissive: 0x111111 })); scene.add(m);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .3, .2), new THREE.MeshBasicMaterial({ color: 0xfff2d0 })); hl.position.set(0, .1, 2.05); m.add(hl);
    cars.push({ m, cc, t: i / n, s: (ci < 3 ? .012 : .03) * (ci % 2 ? 1 : -1) * (.8 + rnd() * .4), loop: ci < 3 }); } }); }
const lampMat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 2.2, transparent: true, opacity: .9 });
{ const p = []; carCurves.slice(0, 3).forEach(cc => { for (let i = 0; i < 40; i++) { const q = cc.getPointAt(i / 40); p.push(q.x, 5, q.z); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); scene.add(new THREE.Points(g, lampMat)); }

// ---------- API ----------
const TYPES = { glass: 'Glass curtain-wall tower · steel diagrid + CLT floors', resi: 'Residential mid-rise · post-tensioned concrete, balconies, green roof', timber: 'Mass-timber low-rise · CLT & glulam, green roof', lab: 'Research lab · steel frame, vibration-isolated floors, solar roof' };
const NAMES = { glass: ['Helios', 'Lumen', 'Aether', 'Nova', 'Zenith', 'Vega', 'Orion', 'Atlas', 'Lyra', 'Sirius'], resi: ['Ubuntu Court', 'Willow House', 'Jade Terrace', 'Cedar Row', 'Lotus Court', 'Palm Yard'], timber: ['Oak Hall', 'Birch Lofts', 'Maple Lane', 'Hemlock Yard', 'Ash Commons'], lab: ['Lab', 'Institute', 'Works', 'Foundry'] };
B.forEach((b, i) => { const L = NAMES[b.type]; b.name = b.type === 'lab' ? `${b.dn.split(' ')[0]} ${L[i % L.length]} ${1 + (i % 9)}` : `${L[i % L.length]}${b.type === 'glass' ? ' Tower' : ''} ${String.fromCharCode(65 + (i % 26))}`;
  b.floors = Math.max(2, Math.round(b.h / 3.6)); b.area = Math.round(b.w * b.d * b.floors * (b.type === 'glass' && b.h > 45 ? 1.1 : 1)); b.people = Math.round(b.area / (b.type === 'lab' ? 40 : 28));
  b.carbon = Math.round({ glass: 420, resi: 310, timber: 140, lab: 360 }[b.type] * (.85 + rnd() * .3)); b.eui = Math.round({ glass: 78, resi: 52, timber: 38, lab: 110 }[b.type] * (.85 + rnd() * .3)); });
function setColor(b, rgb) { b.boxes.forEach(([t, idx]) => { const m = meshes[t]; if (!m) return; const ca = m.geometry.attributes.color, start = idx * 24; for (let v = start; v < start + 24; v++) ca.setXYZ(v, rgb[0], rgb[1], rgb[2]); ca.needsUpdate = true; }); }
let hi = null;
window.BLD = {
  list: B, meshes, TYPES, setColor,
  resetColors() { B.forEach(b => setColor(b, [1, 1, 1])); },
  highlight(b) { if (hi && hi !== b && !hi.tinted) setColor(hi, [1, 1, 1]); hi = b; if (b && !b.tinted) setColor(b, [1.6, 1.45, 1]); },
  pick(hit) { const t = hit.object.userData.bldType; const box = Math.floor(hit.faceIndex / 12); const id = boxOwner[t][box]; return B[id]; },
  tod(night) { Object.values(MAT).forEach(m => m.emissiveIntensity = .08 + night * 1.25); GLOW.emissiveIntensity = .4 + night * 2; lampMat.opacity = .15 + night * .85; },
  frame(dt) { cars.forEach(c => { c.t = (c.t + c.s * dt + 1) % 1; if (!c.loop) { c.t = c.t % 1; } const p = c.cc.getPointAt(c.t), q = c.cc.getPointAt((c.t + (c.s > 0 ? .004 : -.004) + 1) % 1);
    c.m.position.set(p.x, .75, p.z); c.m.lookAt(q.x, .75, q.z); }); },
};
})();
