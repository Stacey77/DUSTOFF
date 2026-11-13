import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const host = document.getElementById('city3d');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a1520, 0.0019);
const camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
camera.position.set(0, 210, 330);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .06;
controls.maxPolarAngle = Math.PI * .47; controls.minDistance = 40; controls.maxDistance = 700;
controls.autoRotate = true; controls.autoRotateSpeed = .35;

// sky dome
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, fog: false, depthWrite: false,
  uniforms: { top: { value: new THREE.Color(0x050914) }, mid: { value: new THREE.Color(0x10304a) }, hor: { value: new THREE.Color(0x3a5a5a) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.15 ? mix(mid,top,smoothstep(.15,.7,h)) : mix(hor,mid,smoothstep(-.05,.15,h)); gl_FragColor=vec4(c,1.); }'
}));
scene.add(sky);
// stars
{ const g = new THREE.BufferGeometry(), p = [];
  for (let i = 0; i < 1800; i++) { const t = Math.random() * Math.PI * 2, u = Math.random() * .9 + .1, r = 1300; p.push(Math.cos(t) * Math.sqrt(1 - u * u) * r, u * r, Math.sin(t) * Math.sqrt(1 - u * u) * r); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 2.2, fog: false, transparent: true, opacity: .8 }))); }

scene.add(new THREE.HemisphereLight(0x8fb8e0, 0x0b120f, .75));
const sunL = new THREE.DirectionalLight(0xffd9a0, 1.6); sunL.position.set(-300, 220, -120); scene.add(sunL);
const fill = new THREE.DirectionalLight(0x5fd0c0, .35); fill.position.set(200, 80, 250); scene.add(fill);

/* ---------- materials ---------- */
const M = {
  ground: new THREE.MeshStandardMaterial({ color: 0x0f1e19, roughness: 1 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x15281f, roughness: .9 }),
  slab: new THREE.MeshStandardMaterial({ color: 0xdfe6e2, roughness: .45, metalness: .2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x0d2230, emissive: 0x1e6a8a, emissiveIntensity: .55, roughness: .15, metalness: .6, transparent: true, opacity: .9 }),
  glow: (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i }),
  dome: new THREE.MeshPhysicalMaterial({ color: 0x9fe8d8, roughness: .05, transmission: .6, transparent: true, opacity: .28, metalness: 0, side: THREE.DoubleSide }),
  green: new THREE.MeshStandardMaterial({ color: 0x3f9a5a, roughness: .8 }),
  solar: new THREE.MeshStandardMaterial({ color: 0x1a3a6a, emissive: 0x2a5aa0, emissiveIntensity: .35, metalness: .7, roughness: .25 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb8c4c8, metalness: .8, roughness: .3 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: .7, roughness: .3, emissive: 0x3a2410, emissiveIntensity: .4 }),
};
const GOLD = 0xd6b46a, JADE = 0x4fbf9a, SKY = 0x6fa8dc, CLAY = 0xff8a4a, VIOLET = 0xa58bd8, TEAL = 0x5fd0c0, LEAF = 0x9bdc6a, BLOOM = 0xe07ad8;

/* ---------- ground & terrain ---------- */
const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), M.ground); ground.rotation.x = -Math.PI / 2; scene.add(ground);
// north hills (Feng Shui shelter)
[[-260, -230, 140, 70], [-60, -260, 170, 85], [170, -240, 150, 75], [330, -200, 120, 55]].forEach(([x, z, r, h]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshStandardMaterial({ color: 0x173a2a, roughness: 1, flatShading: true }));
  m.scale.y = h / r; m.position.set(x, 0, z); scene.add(m);
});
// district pads with glowing rings
const districts = [
  { n: 'Compute Forest', x: -150, z: -55, r: 46, c: CLAY },
  { n: 'Model Valley', x: -75, z: -60, r: 34, c: JADE },
  { n: 'Agora Commons', x: 0, z: -15, r: 40, c: VIOLET },
  { n: 'Proving Grounds', x: 85, z: -60, r: 36, c: SKY },
  { n: 'Maker Arc', x: 80, z: 50, r: 38, c: LEAF },
  { n: 'Sanctuary Gardens', x: 165, z: 55, r: 44, c: TEAL },
  { n: 'Energy Fields', x: -110, z: 55, r: 44, c: 0xe6c040 },
  { n: 'Soil Commons', x: -15, z: 62, r: 30, c: 0xc79a6a },
];
districts.forEach(d => {
  const p = new THREE.Mesh(new THREE.CircleGeometry(d.r, 48), M.pad); p.rotation.x = -Math.PI / 2; p.position.set(d.x, .05, d.z); scene.add(p);
  const ring = new THREE.Mesh(new THREE.RingGeometry(d.r - .6, d.r, 96), new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: .55 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(d.x, .12, d.z); scene.add(ring); d.ring = ring;
});

/* ---------- instanced vegetation ---------- */
const trees = [], pines = [], balls = [];
const addTree = (x, z, s = 1, y = 0) => trees.push([x, y, z, s]);
const addPine = (x, z, s = 1, y = 0) => pines.push([x, y, z, s]);
const addBall = (x, y, z, s = 1) => balls.push([x, y, z, s]);
function flushVeg() {
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const mk = (geo, list, lift, hue) => {
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .8 }), list.length);
    list.forEach(([x, y, z, s], i) => { dummy.position.set(x, y + lift * s, z); dummy.scale.setScalar(s); dummy.rotation.y = i; dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); col.setHSL(hue + (Math.sin(i * 12.9) * .04), .55, .3 + (Math.cos(i * 7.1) * .06)); im.setColorAt(i, col); });
    scene.add(im);
  };
  mk(new THREE.IcosahedronGeometry(3.2, 1), trees, 3.6, .33);
  mk(new THREE.ConeGeometry(2.6, 9, 7), pines, 4.5, .38);
  mk(new THREE.IcosahedronGeometry(1, 0), balls, 0, .3);
}
// northern forest band + spine food forest
for (let i = 0; i < 260; i++) { const x = -330 + Math.random() * 660, z = -110 - Math.random() * 90; (Math.random() < .6 ? addPine : addTree)(x, z, .8 + Math.random() * .7); }
for (let i = 0; i < 120; i++) { const x = -260 + i * 4.4, z = 2 + Math.sin(i * .2) * 6 + (i % 2 ? 9 : -9); addTree(x, z, .55 + Math.random() * .3); }

/* ---------- builders ---------- */
const group = (x = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); return g; };
const spinners = [], halos = [];

function forestTower(x, z, h, r, twist = .12, accent = GOLD) {
  const g = group(x, z), n = Math.floor(h / 4.2);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * .55, r * .7, h, 24), M.glass); core.position.y = h / 2; g.add(core);
  const slabGeo = new THREE.CylinderGeometry(1, 1, .9, 7);
  for (let i = 0; i < n; i++) {
    const k = 1 - (i / n) * .35, y = 3 + i * 4.2;
    const s = new THREE.Mesh(slabGeo, M.slab); s.scale.set(r * k, 1, r * k * .82); s.position.y = y; s.rotation.y = i * twist; g.add(s);
    for (let j = 0; j < 7; j++) { const a = i * twist + j * Math.PI * 2 / 7; if ((i + j) % 2) addBall(x + Math.cos(a) * r * k * .92, y + 1.3, z + Math.sin(a) * r * k * .75, 1.1 + Math.random() * .6); }
    if (i % 5 === 0) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * k * .62, .18, 6, 40), M.glow(accent, 2.2)); t.rotation.x = Math.PI / 2; t.position.y = y + .6; g.add(t); }
  }
  const crown = new THREE.Mesh(new THREE.ConeGeometry(r * .5, 8, 6), M.glow(accent, 1.4)); crown.position.y = h + 4; g.add(crown);
  return g;
}

function sapientia(x, z) {
  const g = group(x, z), pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(9 * (1 - t) ** 1.3 + 1.2 + Math.sin(t * Math.PI) * 3, t * 150)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.glass); g.add(body);
  for (let i = 0; i < 24; i++) { const y = 6 + i * 6; const t = y / 150; const r = 9 * (1 - t) ** 1.3 + 1.4 + Math.sin(t * Math.PI) * 3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .22, 6, 48), M.glow(i % 4 ? 0x9fd0ff : GOLD, i % 4 ? 1 : 2.5)); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  [[60, 26], [100, 20], [138, 14]].forEach(([y, r], i) => { const h = new THREE.Mesh(new THREE.TorusGeometry(r, .5, 8, 96), M.glow(GOLD, 3)); h.position.y = y; h.rotation.x = Math.PI / 2 + .25; halos.push({ m: h, s: (i % 2 ? -1 : 1) * (.25 + i * .1) }); g.add(h); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 3, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 230; g.add(beam);
  // amphitheater / civic council ring
  for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(22 + i * 4, 1, 4, 64, Math.PI * 1.3), M.slab); a.rotation.x = -Math.PI / 2; a.rotation.z = Math.PI * .85; a.position.y = .6 + i * .9; g.add(a); }
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 48), M.glow(VIOLET, .5)); plaza.rotation.x = -Math.PI / 2; plaza.position.y = .2; g.add(plaza);
  return g;
}

function biodome(x, z, r, inner = 14) {
  const g = group(x, z);
  const glassD = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.dome); g.add(glassD);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.002, 3)), new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: .45 })); g.add(wire);
  for (let i = 0; i < inner; i++) { const a = Math.random() * 6.28, d = Math.random() * r * .7; addTree(x + Math.cos(a) * d, z + Math.sin(a) * d, .7 + Math.random() * .6); }
  return g;
}

function vfarm(x, z, h, r) {
  const g = group(x, z);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), M.dome); shell.position.y = h / 2; g.add(shell);
  for (let y = 3; y < h; y += 3.2) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r * .85, r * .85, .5, 24), M.glow(BLOOM, 1.3)); d.position.y = y; g.add(d);
    for (let j = 0; j < 9; j++) { const a = j / 9 * 6.28 + y; addBall(x + Math.cos(a) * r * .65, y + .8, z + Math.sin(a) * r * .65, .9); } }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, 6.28, 0, Math.PI / 2), M.glass); cap.position.y = h; g.add(cap);
  return g;
}

function greenhouse(x, z, len, r, rot = 0) {
  const g = group(x, z); g.rotation.y = rot;
  const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32, 1, true, 0, Math.PI), M.dome); s.rotation.z = Math.PI / 2; s.rotation.y = Math.PI / 2; g.add(s);
  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12, 8, true, 0, Math.PI), new THREE.MeshBasicMaterial({ color: LEAF, wireframe: true, transparent: true, opacity: .35 })); ribs.rotation.copy(s.rotation); g.add(ribs);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(len * .9, .6, r * 1.4), M.green); bed.position.y = .3; g.add(bed);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(len * .9, .2, .4), M.glow(BLOOM, 2)); lamp.position.y = r * .8; g.add(lamp);
  return g;
}

function terrace(x, z, tiers, r) {
  const g = group(x, z);
  for (let i = 0; i < tiers; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r - i * 3.4, r - i * 3.4 + .6, 3, 40), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x4f9a4a : 0x6aae4a, roughness: .9 })); t.position.y = 1.5 + i * 3; g.add(t);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(r - i * 3.4, .15, 4, 64), M.glow(LEAF, 1.2)); edge.rotation.x = Math.PI / 2; edge.position.y = 3 + i * 3; g.add(edge); }
  return g;
}

function solarLeaf(x, z, h, s, tilt) {
  const g = group(x, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, h, 8), M.metal); pole.position.y = h / 2; g.add(pole);
  const leaf = new THREE.Mesh(new THREE.CylinderGeometry(s, s, .35, 6), M.solar); leaf.position.y = h; leaf.rotation.set(tilt, Math.random(), .2); g.add(leaf);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(s * .98, .12, 4, 6), M.glow(0xe6c040, 1.5)); rim.position.y = h + .2; rim.rotation.set(tilt + Math.PI / 2, 0, 0); g.add(rim);
}

function helixTurbine(x, z, h) {
  const g = group(x, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, h, 10), M.metal); pole.position.y = h / 2; g.add(pole);
  const rot = new THREE.Group(); rot.position.y = h * .45;
  for (let b = 0; b < 3; b++) { const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 1.2 + b * 2.09; pts.push(V(Math.cos(a) * 4, t * h * .5, Math.sin(a) * 4)); }
    rot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .35, 6), M.glow(0xe6f0ff, .6))); }
  g.add(rot); spinners.push({ m: rot, s: 1.6 });
}

function dataHill(x, z, r) {
  const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, 6.28, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1f4a32, roughness: 1, flatShading: true }));
  hill.scale.y = .32; hill.position.set(x, 0, z); scene.add(hill);
  for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r * .85; const y = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * r * .32; (i % 3 ? addTree : addPine)(x + Math.cos(a) * d, z + Math.sin(a) * d, .7 + Math.random() * .5, y - .5); }
  for (let i = 0; i < 7; i++) { const a = Math.PI * .25 + i * .09; const slit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, .6), M.glow(0x46e0ff, 3)); slit.position.set(x + Math.cos(a) * r * .97, 2, z + Math.sin(a) * r * .97); slit.lookAt(x, 2, z); scene.add(slit); }
  const pond = new THREE.Mesh(new THREE.CircleGeometry(12, 32), M.glow(SKY, .8)); pond.rotation.x = -Math.PI / 2; pond.position.set(x + 30, .2, z + 38); scene.add(pond);
}

function ribbon(curve, w, y, mat, seg = 220) {
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) { const t = i / seg, p = curve.getPointAt(t), tg = curve.getTangentAt(t), n = V(-tg.z, 0, tg.x).normalize();
    pos.push(p.x + n.x * w / 2, y, p.z + n.z * w / 2, p.x - n.x * w / 2, y, p.z - n.z * w / 2);
    if (i < seg) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); scene.add(m); return m;
}

/* ---------- build the city ---------- */
// Heritage rail spine (gold light line)
const spine = new THREE.CatmullRomCurve3([V(-300, 0, 8), V(-150, 0, -4), V(0, 0, 6), V(150, 0, -4), V(300, 0, 8)]);
ribbon(spine, 7, .15, new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: .9 }));
ribbon(spine, .8, .25, M.glow(GOLD, 2.4));

// River of light + lake + canals (water)
const river = new THREE.CatmullRomCurve3([V(-420, 0, 120), V(-200, 0, 100), V(-40, 0, 118), V(110, 0, 98), V(260, 0, 112), V(420, 0, 100)]);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0f3a55, emissive: 0x1a6a9a, emissiveIntensity: .7, roughness: .08, metalness: .5, transparent: true, opacity: .92 });
ribbon(river, 26, .2, waterMat);
const lake = new THREE.Mesh(new THREE.CircleGeometry(26, 48), waterMat); lake.rotation.x = -Math.PI / 2; lake.position.set(200, .22, 82); scene.add(lake);
[[V(-75, 0, -40), V(-60, 0, 40), V(-40, 0, 110)], [V(85, 0, -40), V(95, 0, 30), V(110, 0, 100)]].forEach(p => ribbon(new THREE.CatmullRomCurve3(p), 3, .21, waterMat, 80));
for (let i = 0; i < 90; i++) { const t = Math.random(), p = river.getPointAt(t); const m = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 3 + Math.random() * 3, 4), M.green); m.position.set(p.x + (Math.random() - .5) * 8, 2, p.z + (Math.random() < .5 ? -15 : 15)); scene.add(m); }

// Compute Forest
dataHill(-150, -55, 44);
// Model Valley vertical-forest towers
forestTower(-88, -70, 92, 9, .14, JADE); forestTower(-60, -52, 70, 7.5, -.12, JADE); forestTower(-92, -38, 52, 6.5, .1, GOLD);
// Agora / Sapientia Tower
sapientia(0, -15);
// Proving Grounds: towers + vertiport
forestTower(70, -72, 64, 7.5, .1, SKY); forestTower(102, -48, 48, 6.5, -.14, SKY);
{ const vp = group(88, -78); const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 30, 12), M.slab); pole.position.y = 15; vp.add(pole);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 1.2, 6), M.slab); deck.position.y = 30; vp.add(deck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10, .3, 6, 6), M.glow(VIOLET, 3)); ring.rotation.x = Math.PI / 2; ring.position.y = 30.8; vp.add(ring); }
// Maker Arc & Living Villages: vertical farms, greenhouses, terraces
vfarm(62, 38, 46, 6); vfarm(80, 30, 36, 5); greenhouse(92, 62, 30, 6, .3); greenhouse(60, 66, 24, 5, .3); terrace(108, 38, 4, 15);
for (let i = 0; i < 10; i++) { const a = i * .62, d = 30 + (i % 3) * 4; const hx = 80 + Math.cos(a) * d, hz = 50 + Math.sin(a) * d * .7; const h = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 6, 6), M.slab); h.position.set(hx, 3, hz); scene.add(h); const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, .6, 6), M.green); roof.position.set(hx, 6.3, hz); scene.add(roof); addBall(hx, 7, hz, 1.6); }
// Sanctuary Gardens: biodome, thermal pools, meditation pavilion
biodome(160, 50, 30, 22);
const pools = [];
[[190, 30, 7], [202, 42, 5], [186, 48, 4]].forEach(([x, z, r]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .6, 32), M.glow(TEAL, 1.6)); p.position.set(x, .3, z); scene.add(p); pools.push(p); });
{ const pv = group(135, 85); for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 8, 6), M.slab); const a = i / 8 * 6.28; c.position.set(Math.cos(a) * 7, 4, Math.sin(a) * 7); pv.add(c); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 5, 8), M.bronze); roof.position.y = 10.5; pv.add(roof);
  const lotus = new THREE.Mesh(new THREE.TorusGeometry(5, .2, 6, 48), M.glow(GOLD, 2)); lotus.rotation.x = Math.PI / 2; lotus.position.y = .6; pv.add(lotus); }
forestTower(196, 70, 34, 7, .2, TEAL); // integrative clinic
// Energy Fields: solar leaf canopy + helix turbines + battery hub
for (let i = 0; i < 26; i++) { const a = i * 2.4, d = 8 + Math.sqrt(i) * 7; solarLeaf(-110 + Math.cos(a) * d, 55 + Math.sin(a) * d * .8, 7 + (i % 3) * 2.5, 4.2, -.35); }
[[-160, 40], [-165, 70], [-150, 92], [-70, 88]].forEach(([x, z]) => helixTurbine(x, z, 30));
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 5, 6), M.slab); b.position.set(-110, 2.5, 55); scene.add(b);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 3.6, .3), M.glow(JADE, 2.5)); const a = i / 6 * 6.28 + .52; s.position.set(-110 + Math.cos(a) * 7, 2.6, 55 + Math.sin(a) * 7); s.lookAt(-110, 2.6, 55); scene.add(s); } }
// Soil Commons: biodigester egg + compost terraces + mycelium web
{ const egg = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 24), M.bronze); egg.scale.y = 1.35; egg.position.set(-15, 9, 62); scene.add(egg);
  const band = new THREE.Mesh(new THREE.TorusGeometry(9.1, .25, 6, 48), M.glow(0xe6c040, 2)); band.rotation.x = Math.PI / 2; band.position.set(-15, 9, 62); scene.add(band);
  terrace(10, 72, 3, 10); }
const mycelium = (() => { const pts = [];
  const branch = (x, z, a, len, depth) => { if (depth > 5) return; const x2 = x + Math.cos(a) * len, z2 = z + Math.sin(a) * len; pts.push(x, .35, z, x2, .35, z2); const n = 2 + (depth < 2 ? 1 : 0); for (let i = 0; i < n; i++) branch(x2, z2, a + (Math.random() - .5) * 1.3, len * .78, depth + 1); };
  for (let i = 0; i < 14; i++) branch(-15, 62, i / 14 * 6.28, 16, 0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xf2e6cc, transparent: true, opacity: .35 })); scene.add(l); return l; })();
// Habitat: green bridges over maglev + bird flocks
function greenBridge(x, z, rot) { const g = group(x, z); g.rotation.y = rot;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(22, 4, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: 0x2f6b4a, roughness: 1 })); arch.scale.set(1, .7, 2.2); g.add(arch);
  for (let i = 0; i < 9; i++) { const a = .3 + i / 8 * (Math.PI - .6); const tx = Math.cos(a) * 22, ty = Math.sin(a) * 22 * .7 + 2; const v = V(tx, 0, 0).applyAxisAngle(V(0, 1, 0), rot); addTree(x + v.x, z + v.z + (i % 2 ? 3 : -3), .7, ty); } }
greenBridge(-30, -95, 0); greenBridge(140, -88, .25);

// Maglev loop (elevated) with pods
const loop = new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * 6.28; return V(Math.cos(a) * 215, 16 + Math.sin(a * 2) * 2, Math.sin(a) * 105); }), true);
scene.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 300, 1, 8, true), M.slab));
scene.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 300, .3, 6, true), M.glow(0x9fd0ff, 2.5)));
for (let i = 0; i < 40; i++) { const p = loop.getPointAt(i / 40); const c = new THREE.Mesh(new THREE.CylinderGeometry(.8, 1.4, p.y, 8), M.slab); c.position.set(p.x, p.y / 2, p.z); scene.add(c); }
const pods = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 7, 6, 12), M.glow(0xe8f6ff, 1.6)); m.rotation.order = 'YXZ'; scene.add(m); return { m, t: i / 7 }; });

// Drones
const drones = Array.from({ length: 26 }, (_, i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), M.glow(i % 3 ? VIOLET : 0xffffff, 3)); scene.add(m);
  return { m, cx: (Math.random() - .5) * 360, cz: (Math.random() - .5) * 180, r: 20 + Math.random() * 60, y: 45 + Math.random() * 50, s: (.15 + Math.random() * .25) * (i % 2 ? 1 : -1), o: Math.random() * 6 }; });
// Birds
const birds = Array.from({ length: 30 }, (_, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(.5, 2, 3), new THREE.MeshBasicMaterial({ color: 0xdfe7ea })); m.rotation.z = Math.PI / 2; scene.add(m); return { m, o: i * .21 }; });
// Steam over pools
const steam = (() => { const n = 160, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { const pl = [[190, 30, 7], [202, 42, 5], [186, 48, 4]][i % 3]; seed.push([pl[0] + (Math.random() - .5) * pl[2], pl[1] + (Math.random() - .5) * pl[2], Math.random()]); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcffff4, size: 3, transparent: true, opacity: .35, depthWrite: false })); scene.add(pts); return { pts, p, seed }; })();
// Festival lanterns along spine (people)
{ const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 140; i++) { const q = spine.getPointAt(i / 140); p.push(q.x, 9 + Math.sin(i * .7) * 1.5, q.z + (i % 2 ? 5 : -5)); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc070, size: 2.4, transparent: true, opacity: .95 }))); }
// Community gardens grid near villages (people + food)
for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, .8, 3), new THREE.MeshStandardMaterial({ color: [0x6aae4a, 0x8ac04a, 0x4f9a4a][i % 3] })); b.position.set(30 + (i % 6) * 6.5, .4, 85 + Math.floor(i / 6) * 5); scene.add(b); }

flushVeg();

/* ---------- ecosystem flows (glowing beads on paths) ---------- */
const C = pts => new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => V(x, y, z)));
const flowDefs = {
  water: [[SKY, C([[-200, 1, 100], [-75, 1, 40], [-75, 2, -40], [-88, 20, -70]])], [SKY, C([[110, 1, 98], [95, 1, 40], [62, 4, 38]])], [SKY, C([[200, 1, 82], [160, 1, 55], [196, 2, 70]])]],
  food: [[LEAF, C([[62, 6, 38], [100, 3, 30], [160, 3, 50], [196, 4, 70]])], [LEAF, C([[108, 6, 38], [60, 3, 85], [0, 3, 40], [0, 3, -15]])], [LEAF, C([[-260, 2, 6], [0, 2, 10], [260, 2, 6]])]],
  energy: [[0xffd84a, C([[-110, 8, 55], [-60, 6, 20], [0, 8, -15], [75, 8, -60]])], [0xffd84a, C([[-160, 6, 40], [-110, 5, 55], [80, 5, 50]])], [CLAY, C([[-130, 2, -30], [-60, 2, 10], [60, 2, 40], [160, 2, 50], [190, 2, 30]])]],
  compute: [[CLAY, C([[-130, 2, -30], [-60, 2, 10], [60, 2, 40], [160, 2, 50], [190, 2, 30]])], [0x46e0ff, C([[-150, 14, -55], [-80, 50, -60], [0, 120, -15], [85, 40, -70], [160, 40, 50]])], [0x46e0ff, C([[-120, 4, -20], [-140, 3, -5], [-120, 2, -17]])]],
  soil: [[0xc79a6a, C([[80, 3, 50], [40, 2, 60], [-15, 4, 62]])], [0xc79a6a, C([[-15, 2, 62], [10, 4, 72], [60, 3, 66], [92, 3, 62]])], [0xf2e6cc, C([[-15, 1, 62], [-80, 1, 30], [-150, 1, -40]])]],
  healing: [[TEAL, C([[-130, 2, -30], [60, 2, 40], [190, 2, 30]])], [TEAL, C([[62, 5, 38], [130, 4, 70], [196, 6, 70]])], [TEAL, C([[0, 3, -15], [80, 3, 10], [160, 3, 50]])]],
  habitat: [[0x7fe08a, C([[-330, 3, -150], [-30, 12, -95], [40, 4, 0], [110, 2, 100]])], [0x7fe08a, C([[300, 3, -150], [140, 14, -88], [160, 4, 50], [200, 2, 82]])], [0xe0b040, C([[-110, 6, 55], [-15, 6, 62], [80, 6, 50], [160, 6, 55]])]],
  people: [[GOLD, C([[-260, 9, 6], [0, 9, 6], [260, 9, 6]])], [VIOLET, C([[60, 3, 85], [0, 3, 30], [0, 3, -15]])], [GOLD, C([[0, 3, -15], [-80, 3, -50], [-150, 3, -55]])]],
};
const flows = {};
const beadGeo = new THREE.SphereGeometry(.9, 10, 8);
for (const [k, list] of Object.entries(flowDefs)) {
  const g = new THREE.Group(); g.visible = false; scene.add(g); const beads = [];
  list.forEach(([c, curve], li) => { const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .25, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .35 })); g.add(line);
    const n = Math.max(10, Math.floor(curve.getLength() / 9)); const im = new THREE.InstancedMesh(beadGeo, M.glow(c, 4), n); g.add(im); beads.push({ im, curve, n, off: li * .13 }); });
  flows[k] = { g, beads };
}

/* ---------- ecosystem tour data ---------- */
const ECO = {
  overview: { t: 'The Living City', s: 'All eight ecosystems, one organism', d: 'Vertical-forest towers, biodomes, a maglev loop, and a river of light. Every system feeds another. Pick an ecosystem below to fly in.', c: GOLD, cam: [0, 210, 330], tg: [0, 10, 0], L: [] },
  water: { t: 'Water · Sponge City', s: 'Wetlands & qanats + smart sensors & recycling', d: 'A river of light, sponge parks, and canals capture every storm. Recycled water climbs the towers to irrigate the sky gardens and feed the farms.', c: SKY, cam: [-40, 90, 230], tg: [0, 0, 60], L: [[-200, 6, 100, 'Living river · wetland filtration'], [-75, 6, 40, 'Bioswale canal'], [200, 6, 82, 'Healing lake'], [-88, 96, -70, 'Rain capture → sky gardens']] },
  food: { t: 'Food · Farms Everywhere', s: 'Food forests & terraces + vertical farms & aquaponics', d: 'Glowing vertical farm towers, greenhouse arcs, terraced fields, and a 12 km food forest along the rail spine. The harvest flows to clinics and community tables.', c: LEAF, cam: [150, 80, 170], tg: [75, 10, 50], L: [[62, 52, 38, 'Vertical farm · LED + AI climate'], [92, 12, 62, 'Greenhouse arcs'], [108, 16, 38, 'Terrace farms'], [-150, 10, 4, 'Rail-spine food forest']] },
  energy: { t: 'Energy · Sun, Wind & Heat', s: 'Passive design + solar leaves, helix turbines, microgrid', d: 'Solar leaves track the sun above the Energy Fields, and helix turbines turn silently beside them. A battery hub balances the microgrid, while data-center waste heat warms homes and baths.', c: 0xe6c040, cam: [-210, 80, 170], tg: [-110, 5, 55], L: [[-110, 16, 40, 'Solar-leaf canopy'], [-160, 36, 40, 'Helix wind turbines'], [-110, 8, 55, 'Battery hub · AI microgrid'], [-60, 6, 10, 'District heat loop']] },
  compute: { t: 'Compute · Forest Data Hall', s: 'Earth-cooled green AI + digital twin', d: 'The city\'s brain sits beneath a forested hill, cooled by earth and water. Its waste heat feeds the greenhouses and baths, and its data streams light up the Sapientia Tower\'s digital twin.', c: 0x46e0ff, cam: [-240, 110, 60], tg: [-130, 10, -40], L: [[-150, 20, -55, 'Data center under forest canopy'], [-120, 4, -17, 'Cooling pond'], [0, 155, -15, 'Sapientia Tower · digital twin'], [60, 6, 40, 'Waste heat → greenhouses']] },
  soil: { t: 'Soil · Nothing Is Waste', s: 'Compost, terra preta & mycelium + biodigester & AI sorting', d: 'The bronze biodigester turns the city\'s organic waste into biogas and rich compost. A glowing mycelium web spreads under the commons, and living soil returns to the terraces and farms.', c: 0xc79a6a, cam: [-20, 70, 150], tg: [-10, 5, 62], L: [[-15, 24, 62, 'Biodigester · biogas → power'], [10, 12, 72, 'Compost terraces'], [-40, 2, 50, 'Mycelium soil web']] },
  healing: { t: 'Healing · Sanctuary Gardens', s: 'Forest bathing, thermal baths, herbs + AI-assisted care', d: 'A crystal biodome forest for forest bathing, thermal pools heated by recovered data-center heat, a lotus meditation pavilion, and an integrative clinic tower where licensed clinicians lead care and AI assists.', c: TEAL, cam: [260, 70, 160], tg: [170, 10, 55], L: [[160, 34, 50, 'Biodome healing forest'], [190, 6, 30, 'Thermal baths · recovered heat'], [135, 16, 85, 'Meditation pavilion'], [196, 40, 70, 'Integrative clinic']] },
  habitat: { t: 'Habitat · Wild Corridors', s: 'Native forests & meadows + bio-sensing AI', d: 'Planted green bridges arc over the maglev, so wildlife moves from the northern forest hills to the southern wetlands. Birds circle the towers and pollinator corridors link every district.', c: 0x7fe08a, cam: [60, 120, -230], tg: [40, 0, -60], L: [[-30, 20, -95, 'Green bridge · wildlife crossing'], [140, 20, -88, 'Green bridge'], [0, 10, -150, 'Northern forest hills'], [-200, 6, 112, 'Southern wetlands']] },
  people: { t: 'People · Ubuntu Commons', s: 'Shared gardens, meals, festivals + civic AI', d: 'Lantern lines run the length of the rail spine. Residents gather in the amphitheater at the foot of the Sapientia Tower to review the city\'s algorithms, and the community gardens feed shared tables.', c: VIOLET, cam: [40, 60, 120], tg: [0, 10, 10], L: [[0, 4, -15, 'Civic council amphitheater'], [-60, 12, 6, 'Festival lantern spine'], [45, 3, 90, 'Community gardens']] },
};

/* ---------- UI ---------- */
const info = document.getElementById('c3dInfo'), tabs = document.getElementById('c3dTabs'), labelBox = document.getElementById('c3dLabels');
tabs.innerHTML = Object.entries(ECO).map(([k, e]) => `<button data-k="${k}" style="--c:#${new THREE.Color(e.c).getHexString()}">${k === 'overview' ? 'Whole City' : e.t.split(' ·')[0]}</button>`).join('');
let active = 'overview', tween = null, labels = [];
function go(k) {
  active = k; const e = ECO[k];
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  info.innerHTML = `<div class="k" style="color:#${new THREE.Color(e.c).getHexString()}">${e.s}</div><h3>${e.t}</h3><p>${e.d}</p>`;
  for (const [fk, f] of Object.entries(flows)) f.g.visible = k === 'overview' || fk === k;
  labelBox.innerHTML = e.L.map(l => `<div class="lbl" style="--c:#${new THREE.Color(e.c).getHexString()}"><i></i>${l[3]}</div>`).join('');
  labels = e.L.map((l, i) => ({ p: V(l[0], l[1], l[2]), el: labelBox.children[i] }));
  tween = { t: 0, fp: camera.position.clone(), ft: controls.target.clone(), tp: V(...e.cam), tt: V(...e.tg) };
  controls.autoRotate = k === 'overview';
}
tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => go(b.dataset.k)));
go('overview');

/* ---------- post-processing ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .85, .55, .22); composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host); resize();

let visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);

/* ---------- animate ---------- */
const clock = new THREE.Clock(), dummy = new THREE.Object3D();
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), .05), T = clock.elapsedTime;
  if (tween) { tween.t = Math.min(1, tween.t + dt / 1.8); const k = ease(tween.t); camera.position.lerpVectors(tween.fp, tween.tp, k); controls.target.lerpVectors(tween.ft, tween.tt, k); if (tween.t >= 1) tween = null; }
  controls.update();
  halos.forEach(h => h.m.rotation.z += h.s * dt);
  spinners.forEach(s => s.m.rotation.y += s.s * dt);
  pods.forEach(p => { p.t = (p.t + dt * .018) % 1; const a = loop.getPointAt(p.t), b = loop.getPointAt((p.t + .002) % 1); p.m.position.copy(a).y += 1.6; p.m.lookAt(b.x, b.y + 1.6, b.z); p.m.rotateX(Math.PI / 2); });
  drones.forEach(d => { const a = T * d.s + d.o; d.m.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(T + d.o) * 3, d.cz + Math.sin(a) * d.r * .6); d.m.rotation.y += dt * 2; });
  birds.forEach((b, i) => { const a = T * .25 + b.o; b.m.position.set(-40 + Math.cos(a) * 120 + Math.sin(i) * 6, 70 + Math.sin(T * 2 + i) * 2 + (i % 5), -60 + Math.sin(a) * 70 + Math.cos(i) * 6); b.m.rotation.y = -a; });
  { const { p, seed } = steam; seed.forEach((s, i) => { const t = (s[2] + T * .12) % 1; p[i * 3] = s[0] + Math.sin(T + i) * .8; p[i * 3 + 1] = 1 + t * 22; p[i * 3 + 2] = s[1]; }); steam.pts.geometry.attributes.position.needsUpdate = true; }
  pools.forEach((p, i) => p.material.emissiveIntensity = 1.4 + Math.sin(T * 2 + i) * .3);
  mycelium.material.opacity = active === 'soil' ? .55 + Math.sin(T * 3) * .25 : .22;
  districts.forEach((d, i) => d.ring.material.opacity = .4 + Math.sin(T * 1.5 + i) * .2);
  for (const f of Object.values(flows)) if (f.g.visible) f.beads.forEach(b => { for (let i = 0; i < b.n; i++) { const t = (i / b.n + T * .045 + b.off) % 1; dummy.position.copy(b.curve.getPointAt(t)); dummy.scale.setScalar(.7 + .5 * Math.sin(t * 40)); dummy.updateMatrix(); b.im.setMatrixAt(i, dummy.matrix); } b.im.instanceMatrix.needsUpdate = true; });
  // labels
  const w = host.clientWidth, h = host.clientHeight;
  labels.forEach(l => { const v = l.p.clone().project(camera); const show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && !tween;
    l.el.style.opacity = show ? 1 : 0; l.el.style.transform = `translate(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px)`; });
  composer.render();
}
frame();
host.classList.add('ready');
