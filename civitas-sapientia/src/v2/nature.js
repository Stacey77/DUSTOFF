
/* ---------- NATURE SURROUND: southern jungle, western beaches, ocean & waterways ---------- */
const NAT = { boats: [], foam: null, mist: null };
{
  const R = Math.random;
  const SHORE = z => -440 + 38 * Math.sin(z / 140) + 22 * Math.sin(z / 47);   // west coastline x(z)
  const SAND = new THREE.MeshStandardMaterial({ color: 0xe9d7a8, roughness: 1, map: noiseTex('#e6d4a4', ['#d8c492', '#f2e4bc', '#cdb884', '#efe0b4'], 256, 40, 12000) });
  // ocean & beach as shapes with a wavy coastline
  const zs = []; for (let z = -1300; z <= 1300; z += 20) zs.push(z);
  const oc = new THREE.Shape(); oc.moveTo(-2600, 1300); zs.forEach(z => oc.lineTo(SHORE(z), -z)); oc.lineTo(-2600, -1300); oc.lineTo(-2600, 1300);
  const ocean = new THREE.Mesh(new THREE.ShapeGeometry(oc), waterMat); ocean.rotation.x = -Math.PI / 2; ocean.position.y = .26; ocean.userData.noCast = true; scene.add(ocean);
  const bs = new THREE.Shape(); bs.moveTo(SHORE(-1300) - 6, 1300); zs.forEach(z => bs.lineTo(SHORE(z) - 6, -z)); zs.slice().reverse().forEach(z => bs.lineTo(SHORE(z) + 70 + 18 * Math.sin(z / 90), -z));
  const beach = new THREE.Mesh(new THREE.ShapeGeometry(bs), SAND); beach.rotation.x = -Math.PI / 2; beach.position.y = .16; beach.userData.noCast = true; scene.add(beach);
  // surf foam line
  const fc = new THREE.CatmullRomCurve3(zs.map(z => V(SHORE(z) - 3, 0, z)));
  NAT.foam = ribbon(fc, 5, .3, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false }), 260); NAT.foam.userData.noCast = true;
  // waterways from the outer waterway to the sea, and a lagoon
  [[2.82, [[-245, 0, 88], [-300, 0, 120], [-360, 0, 150], [SHORE(170) + 10, 0, 170]]], [3.62, [[-224, 0, -112], [-290, 0, -150], [-350, 0, -170], [SHORE(-190) + 10, 0, -190]]]].forEach(([, pts]) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p))); const m = ribbon(c, 15, .24, waterMat, 80); m.userData.noCast = true;
    ribbon(c, 21, .14, SAND, 80); });
  { const lag = new THREE.Mesh(new THREE.CircleGeometry(42, 64), waterMat); lag.rotation.x = -Math.PI / 2; lag.position.set(-372, .25, 40); lag.userData.noCast = true; scene.add(lag);
    const ring = new THREE.Mesh(new THREE.RingGeometry(42, 52, 64), SAND); ring.rotation.x = -Math.PI / 2; ring.position.set(-372, .17, 40); scene.add(ring); }
  // marina: piers + boats
  for (let i = 0; i < 4; i++) { const z = -60 + i * 28, x0 = SHORE(z); const p = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 4), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: .9 })); p.position.set(x0 - 30, 1.2, z); scene.add(p);
    for (let k = 0; k < 6; k++) { const pile = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 4, 6), M.metal); pile.position.set(x0 - 5 - k * 12, 0, z + 2.2); scene.add(pile); } }
  const hullGeo = (() => { const h = new THREE.CylinderGeometry(1.6, .6, 9, 8, 1); h.rotateZ(Math.PI / 2); h.scale(1, .55, 1); h.translate(0, .5, 0); return h; })();
  const sailGeo = new THREE.BufferGeometry().setFromPoints([V(0, 1.5, 0), V(0, 12, 0), V(4, 1.8, 0)]); sailGeo.computeVertexNormals();
  for (let i = 0; i < 22; i++) { const g = new THREE.Group(); const moored = i < 10; const z = moored ? -60 + (i % 4) * 28 + 6 : (R() - .5) * 1100, x = moored ? SHORE(z) - 18 - Math.floor(i / 4) * 16 : SHORE(z) - 80 - R() * 500;
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: [0xf4f2ee, 0x1e3a5a, 0xe0e4e8, 0x8a1c1c][i % 4], roughness: .4 })); g.add(hull);
    if (i % 2 === 0) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 12, 5), M.metal); mast.position.y = 7; g.add(mast); const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xfbfaf6, side: THREE.DoubleSide, roughness: .6 })); g.add(sail); }
    else { const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2), M.slab); cab.position.set(-.5, 1.6, 0); g.add(cab); }
    g.position.set(x, .3, z); g.rotation.y = moored ? 0 : R() * 6.28; scene.add(g); NAT.boats.push({ g, moored, sp: moored ? 0 : 2 + R() * 4, ph: R() * 6.28, z0: z }); }
  // beach palms (instanced: trunk + fronds)
  const palms = [];
  zs.forEach(z => { for (let k = 0; k < 3; k++) if (R() < .7) palms.push([SHORE(z) + 12 + R() * 60, z + (R() - .5) * 18, .8 + R() * .6, R() * 6.28, (R() - .5) * .35]); });
  // southern jungle: dense layered rainforest beyond the outer waterway
  const jungleIn = (x, z) => z > 262 + Math.max(0, -x - 200) * .2 && x > SHORE(z) + 80;
  for (let i = 0; i < 2600; i++) { const x = -420 + R() * 1150, z = 255 + R() * 640; if (!jungleIn(x, z)) continue; if (Math.hypot(x, z) < 262) continue;
    const r = R(); if (r < .55) addTree(x, z, 1.1 + R() * 1.3); else if (r < .62) addTree(x, z, 2.6 + R() * 1.2); else if (r < .82) palms.push([x, z, .9 + R() * .7, R() * 6.28, (R() - .5) * .3]); else addBall(x, .6, z, 1.2 + R() * 1.6); }
  // jungle river winding south from the outer waterway
  { const pts = [V(70, 0, 250), V(40, 0, 340), V(110, 0, 430), V(60, 0, 540), V(140, 0, 660), V(90, 0, 820)]; const c = new THREE.CatmullRomCurve3(pts); const m = ribbon(c, 18, .24, waterMat, 160); m.userData.noCast = true; NAT.river = c; }
  { const tr = new THREE.CylinderGeometry(.22, .4, 9, 6); tr.translate(0, 4.5, 0);
    const fr = []; for (let i = 0; i < 8; i++) { const f = new THREE.ConeGeometry(.9, 6, 4, 1); f.scale(1, 1, .18); f.translate(0, 3, 0); f.rotateZ(-1.15); f.rotateY(i / 8 * Math.PI * 2); f.translate(0, 9, 0); fr.push(f); } const frG = mergeGeometries(fr);
    const tIM = new THREE.InstancedMesh(tr, new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 }), palms.length), fIM = new THREE.InstancedMesh(frG, new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: .8, side: THREE.DoubleSide }), palms.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    palms.forEach(([x, z, s, ry, lean], i) => { d.position.set(x, 0, z); d.rotation.set(lean, ry, lean * .5); d.scale.setScalar(s); d.updateMatrix(); tIM.setMatrixAt(i, d.matrix); fIM.setMatrixAt(i, d.matrix); col.setHSL(.27 + R() * .06, .5, .3 + R() * .08); fIM.setColorAt(i, col); });
    tIM.castShadow = fIM.castShadow = true; scene.add(tIM, fIM); }
  // jungle mist
  { const n = 500, p = []; for (let i = 0; i < n; i++) { const x = -300 + R() * 950, z = 300 + R() * 560; if (!jungleIn(x, z)) continue; p.push(x, 8 + R() * 22, z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    NAT.mist = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xeef6f0, size: 26, map: DOT, transparent: true, opacity: .16, depthWrite: false })); scene.add(NAT.mist); }
  NAT.SHORE = SHORE;
}
window.NATURE = { frame(dt, T) {
  NAT.boats.forEach(b => { b.g.position.y = .3 + Math.sin(T * 1.4 + b.ph) * .25; b.g.rotation.z = Math.sin(T * 1.1 + b.ph) * .05;
    if (!b.moored) { const f = V(Math.sin(b.g.rotation.y), 0, Math.cos(b.g.rotation.y)); b.g.position.addScaledVector(f, b.sp * dt); if (b.g.position.x > NAT.SHORE(b.g.position.z) - 40 || b.g.position.x < -1100 || Math.abs(b.g.position.z) > 900) b.g.rotation.y += Math.PI * .6; } });
  if (NAT.foam) NAT.foam.material.opacity = .35 + Math.sin(T * 1.6) * .2;
  if (NAT.mist) NAT.mist.position.x = Math.sin(T * .05) * 20;
} };
