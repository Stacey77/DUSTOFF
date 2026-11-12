/* ---------- ground & terrain (V2 radial city) ---------- */
const SEC = ['water', 'healing', 'food', 'soil', 'energy', 'compute', 'habitat', 'people'];
const SA = k => SEC.indexOf(k) * Math.PI / 4;              // sector centre angle
const SPOKE = i => i * Math.PI / 4 + Math.PI / 8;           // boulevard angles (between sectors)
const PO = (r, a, y = 0) => [Math.cos(a) * r, y, Math.sin(a) * r];
const SC = (k, r = 170) => { const p = PO(r, SA(k)); return { x: p[0], z: p[2] }; };
const RAD = { core: 34, r1: [42, 68], ringRd: 72, liv: [78, 118], canal: [123, 135], belt: [140, 202], mag: 210, moat: [232, 252] };
// procedural grass / paving textures
function noiseTex(base, var1, n = 256, rep = 80, speck = 9000) { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, n, n);
  for (let i = 0; i < speck; i++) { g.fillStyle = var1[i % var1.length]; g.globalAlpha = .25 + Math.random() * .35; g.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t; }
const GRASS = noiseTex('#6a8a4a', ['#4f6e36', '#7c9a52', '#5c7c3e', '#8aa860', '#3e5a2c']);
M.ground.map = GRASS; M.ground.needsUpdate = true;
const PAVE = new THREE.MeshStandardMaterial({ color: 0xbfbab0, roughness: .85, map: noiseTex('#c8c2b6', ['#b0aa9e', '#d8d2c6', '#a8a296'], 128, 1, 3000) });
const ground = new THREE.Mesh(new THREE.CircleGeometry(1300, 96), M.ground); ground.rotation.x = -Math.PI / 2; ground.userData.noCast = true; scene.add(ground);
// Feng Shui shelter: hills to the north beyond the outer waterway
[[-300, -430, 170, 80], [-40, -470, 210, 100], [220, -440, 170, 85], [420, -330, 140, 60], [-450, -320, 140, 55]].forEach(([x, z, r, h]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 1, flatShading: true }));
  m.scale.y = h / r; m.position.set(x, 0, z); scene.add(m);
});
const districts = [
  { n: 'Agora Core', x: 0, z: 0, r: 70, c: VIOLET },
  { n: 'Water Gardens', ...SC('water'), r: 34, c: SKY },
  { n: 'Sanctuary Gardens', ...SC('healing'), r: 34, c: TEAL },
  { n: 'Agri Belt', ...SC('food'), r: 34, c: LEAF },
  { n: 'Soil Commons', ...SC('soil'), r: 30, c: 0xc79a6a },
  { n: 'Energy Fields', ...SC('energy'), r: 34, c: 0xe6c040 },
  { n: 'Compute Forest', ...SC('compute'), r: 34, c: CLAY },
  { n: 'Wild Reserve', ...SC('habitat'), r: 34, c: 0x7fe08a },
  { n: 'Festival Commons', ...SC('people'), r: 32, c: GOLD },
];
districts.forEach((d, i) => {
  if (i) { const p = new THREE.Mesh(new THREE.CircleGeometry(d.r, 48), M.pad); p.rotation.x = -Math.PI / 2; p.position.set(d.x, .05, d.z); p.userData.noCast = true; scene.add(p); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(d.r - .6, d.r, 128), new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: .55 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(d.x, .12, d.z); ring.userData.noCast = true; scene.add(ring); d.ring = ring;
});

/* ---------- instanced vegetation ---------- */
const trees = [], pines = [], balls = [];
const addTree = (x, z, s = 1, y = 0) => trees.push([x, y, z, s]);
const addPine = (x, z, s = 1, y = 0) => pines.push([x, y, z, s]);
const addBall = (x, y, z, s = 1) => balls.push([x, y, z, s]);
function flushVeg() {
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const mk = (geo, list, lift, hue) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .85 }), list.length);
    list.forEach(([x, y, z, s], i) => { dummy.position.set(x, y + lift * s, z); dummy.scale.setScalar(s); dummy.rotation.y = i; dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); col.setHSL(hue + (Math.sin(i * 12.9) * .04), .5, .27 + (Math.cos(i * 7.1) * .06)); im.setColorAt(i, col); });
    scene.add(im);
    // trunks for realism
    if (lift > 1) { const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .32, 1, 6), new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }), list.length);
      list.forEach(([x, y, z, s], i) => { dummy.position.set(x, y + lift * s * .45, z); dummy.scale.set(s, lift * s * .9, s); dummy.rotation.y = 0; dummy.updateMatrix(); tr.setMatrixAt(i, dummy.matrix); }); scene.add(tr); }
  };
  mk(new THREE.IcosahedronGeometry(3.2, 1), trees, 3.6, .3);
  mk(new THREE.ConeGeometry(2.6, 9, 7), pines, 4.5, .36);
  mk(new THREE.IcosahedronGeometry(1, 0), balls, 0, .3);
}
// outer forest beyond the moat (north, Feng Shui shelter) and an outer park ring
for (let i = 0; i < 420; i++) { const a = Math.random() * Math.PI * 2, r = 262 + Math.random() * 120; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 120 && Math.random() < .6) continue; (Math.random() < .55 ? addPine : addTree)(x, z, .8 + Math.random() * .8); }
// boulevard street trees (both sides of each spoke)
for (let s = 0; s < 8; s++) { const a = SPOKE(s); for (let r = 40; r < 228; r += 9) { if (Math.abs(r - 129) < 9 || Math.abs(r - 210) < 6) continue; [-9.5, 9.5].forEach(o => addTree(Math.cos(a) * r - Math.sin(a) * o, Math.sin(a) * r + Math.cos(a) * o, .5 + Math.random() * .15)); } }
