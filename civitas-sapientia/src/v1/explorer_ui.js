
/* ================= PLATFORM DATA ================= */
const hex = c => '#' + new THREE.Color(c).getHexString();
const DINFO = {
  'Compute Forest': { role: 'Green compute, chips & data trust', p: "Seventh Generation", k: [['60 ha', 'Area'], ['100%', 'Renewable'], ['20k', 'Homes heated'], ['Trust', 'City data vault']], f: ['Data halls under a forested hill, cooled by earth & water', 'Waste heat feeds homes, greenhouses & baths', 'AI chip design & test campus', 'City data trust with privacy vault'], e: ['compute', 'energy', 'water'], cam: [-230, 95, 40], tg: [-150, 5, -55] },
  'Model Valley': { role: 'Foundation-model labs & research campuses', p: 'Socratic', k: [['80 ha', 'Area'], ['12k', 'Researchers'], ['30+', 'Labs'], ['Open', 'Model hub']], f: ['Vertical-forest research towers', 'University–industry shared floors', 'Open-source model commons', 'AI safety & alignment institute'], e: ['compute', 'habitat'], cam: [-20, 90, 30], tg: [-75, 30, -60] },
  'Agora Commons': { role: 'Civic heart · AI society & governance', p: "Ma'at · Ubuntu", k: [['50 ha', 'Area'], ['150 m', 'Sapientia Tower'], ['24/7', 'Services'], ['Council', 'Civic AI board']], f: ['Sapientia Tower: civic AI center, observatory & digital twin', "Ma'at AI Audit Office", 'Resident council amphitheater', 'One-window services for talent & firms'], e: ['people', 'compute'], cam: [60, 70, 80], tg: [0, 40, -15] },
  'Proving Grounds': { role: 'Robotics, autonomous vehicles & drones', p: 'Vitruvian', k: [['120 ha', 'Area'], ['40 km', 'AV test streets'], ['Sandbox', 'Regulatory'], ['Vertiport', 'Drone hub']], f: ['Open-road AV test zone with a regulatory sandbox', 'Humanoid robot training homes & factories', 'Drone delivery & air-taxi vertiport', 'Robot sports arena'], e: ['people', 'energy'], cam: [150, 80, 0], tg: [85, 20, -60] },
  'Maker Arc': { role: 'Fabrication, startups & living villages', p: 'Feng Shui', k: [['140 ha', 'Area'], ['40%', 'Talent housing'], ['15 min', 'Everything'], ['48 h', 'Prototype']], f: ['Glowing vertical farm towers', 'Greenhouse arcs & terrace farms', 'Car-light eco-villages with roof gardens', 'Startup studios with live-work units'], e: ['food', 'soil', 'people'], cam: [150, 80, 170], tg: [75, 10, 50] },
  'Sanctuary Gardens': { role: 'Healing campus, food forest & water gardens', p: 'Hippocratic · Seventh Gen', k: [['90 ha', 'Area'], ['Thermal', 'Recovered-heat baths'], ['Biodome', 'Healing forest'], ['Clinic', 'Integrative care']], f: ['Crystal biodome forest for forest bathing', 'Thermal pools heated by data-center waste heat', 'Lotus meditation & sound pavilion', 'Integrative clinic: clinicians lead, AI assists'], e: ['healing', 'water', 'habitat'], cam: [260, 70, 160], tg: [170, 10, 55] },
  'Energy Fields': { role: 'Solar leaves, wind & microgrid', p: 'Feng Shui · Vitruvian', k: [['110 ha', 'Area'], ['26', 'Solar leaves'], ['4', 'Helix turbines'], ['Microgrid', 'AI balanced']], f: ['Solar-leaf canopy that tracks the sun', 'Silent helix wind turbines', 'Battery hub & AI microgrid', 'Every district can island itself'], e: ['energy'], cam: [-210, 80, 170], tg: [-110, 5, 55] },
  'Soil Commons': { role: 'Biodigester, compost & mycelium web', p: 'Seventh Generation', k: [['30 ha', 'Area'], ['95%', 'Organics returned'], ['Biogas', '→ power'], ['Terra preta', 'Dark earth']], f: ['Bronze biodigester turning waste into biogas', 'Compost terraces & biochar', 'Mycelium soil web under the commons', 'Living soil back to the farms'], e: ['soil', 'food'], cam: [-20, 70, 150], tg: [-10, 5, 62] },
};
const LANDMARKS = [
  { n: 'Sapientia Tower', d: 'Agora Commons', pos: [0, 150, -15], cam: [70, 120, 90], tg: [0, 80, -15], t: 'A 150 m civic AI tower crowned by three floating halo rings, with a beam of light at the top. It houses the observatory, the digital twin and the AI audit office.' },
  { n: 'Healing Biodome', d: 'Sanctuary Gardens', pos: [160, 30, 50], cam: [210, 45, 110], tg: [160, 10, 50], t: 'A crystal geodesic dome around an indoor forest used for forest bathing, open all year.' },
  { n: 'Thermal Baths', d: 'Sanctuary Gardens', pos: [192, 4, 38], cam: [225, 30, 85], tg: [192, 0, 38], t: 'Glowing pools heated entirely by recovered data-center waste heat.' },
  { n: 'Meditation Pavilion', d: 'Sanctuary Gardens', pos: [135, 12, 85], cam: [150, 22, 120], tg: [135, 5, 85], t: 'A lotus-ring pavilion tuned for sound, stillness and breath work.' },
  { n: 'Vertical Farms', d: 'Maker Arc', pos: [62, 48, 38], cam: [110, 55, 110], tg: [70, 25, 35], t: 'Magenta-lit growing towers: leafy greens and herbs year-round under AI climate control.' },
  { n: 'Terrace Farms', d: 'Maker Arc', pos: [108, 14, 38], cam: [140, 40, 80], tg: [108, 5, 38], t: 'Stepped green rings of crops, edged with light.' },
  { n: 'Forest Data Hall', d: 'Compute Forest', pos: [-150, 15, -55], cam: [-150, 45, 30], tg: [-150, 5, -45], t: 'The city\'s brain, under a forested hill. Cyan light slits mark the cooled data halls.' },
  { n: 'Biodigester', d: 'Soil Commons', pos: [-15, 22, 62], cam: [15, 35, 110], tg: [-15, 10, 62], t: 'A bronze egg that turns food scraps into biogas and compost.' },
  { n: 'Solar Leaves', d: 'Energy Fields', pos: [-110, 14, 55], cam: [-150, 35, 110], tg: [-110, 8, 55], t: 'Hexagonal solar panels on stalks, angled to the sun.' },
  { n: 'Helix Turbines', d: 'Energy Fields', pos: [-160, 32, 40], cam: [-200, 40, 80], tg: [-160, 18, 50], t: 'Vertical-axis spiral wind turbines that turn quietly.' },
  { n: 'Vertiport', d: 'Proving Grounds', pos: [88, 32, -78], cam: [120, 55, -30], tg: [88, 28, -78], t: 'Drone delivery and air-taxi hub on a hexagonal sky deck.' },
  { n: 'Green Bridge', d: 'Habitat', pos: [-30, 18, -95], cam: [-30, 50, -40], tg: [-30, 10, -95], t: 'A planted arch that carries wildlife over the maglev, from the forest hills down to the wetlands.' },
  { n: 'Civic Amphitheater', d: 'Agora Commons', pos: [0, 4, -15], cam: [30, 35, 25], tg: [0, 2, -15], t: 'Resident councils gather here to review the city\'s algorithms in public.' },
  { n: 'Healing Lake', d: 'Sanctuary Gardens', pos: [200, 2, 82], cam: [240, 40, 140], tg: [200, 0, 82], t: 'A lake fed by the river of light, used for water therapy and wetland habitat.' },
];

/* ================= DOM ================= */
const $ = s => document.querySelector(s);
const info = $('#info'), labelBox = $('#labels'), toast = $('#toast');
function showToast(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(showToast.h); showToast.h = setTimeout(() => toast.classList.remove('on'), 2400); }

// navigator
const nav = $('#navList');
function buildNav(q = '') {
  q = q.toLowerCase(); const m = s => s.toLowerCase().includes(q);
  const ecoItems = Object.entries(ECO).filter(([k, e]) => k !== 'overview' && (m(e.t) || m(e.s))).map(([k, e]) => `<button class="item" data-eco="${k}"><i style="background:${hex(e.c)}"></i><span>${e.t.split(' ·')[0]}<small>${e.t.split('· ')[1] || ''}</small></span></button>`).join('');
  const dItems = districts.filter(d => m(d.n) || m(DINFO[d.n].role)).map(d => `<button class="item" data-dist="${d.n}"><i style="background:${hex(d.c)}"></i><span>${d.n}<small>${DINFO[d.n].role}</small></span></button>`).join('');
  const lItems = LANDMARKS.filter(l => m(l.n) || m(l.d)).map((l, i) => `<button class="item" data-lm="${LANDMARKS.indexOf(l)}"><i class="sq"></i><span>${l.n}<small>${l.d}</small></span></button>`).join('');
  nav.innerHTML = (ecoItems ? `<h4>Ecosystems</h4>${ecoItems}` : '') + (dItems ? `<h4>Districts</h4>${dItems}` : '') + (lItems ? `<h4>Landmarks</h4>${lItems}` : '') || '<p class="empty">No matches</p>';
}
buildNav();
$('#search').addEventListener('input', e => buildNav(e.target.value));
nav.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setMode('orbit');
  if (b.dataset.eco) selectEco(b.dataset.eco); else if (b.dataset.dist) selectDistrict(b.dataset.dist); else selectLandmark(+b.dataset.lm);
  if (innerWidth < 800) document.body.classList.remove('navOpen'); });

/* ================= SELECTION ================= */
let active = 'overview', tween = null, labels = [], selDist = null;
function flyTo(cam, tg, dur = 1.8) { tween = { t: 0, d: dur, fp: camera.position.clone(), ft: controls.target.clone(), tp: V(...cam), tt: V(...tg) }; }
function setLabels(list, col) {
  labelBox.querySelectorAll('.lbl.eco').forEach(n => n.remove());
  labels = labels.filter(l => l.persist);
  list.forEach(l => { const el = document.createElement('div'); el.className = 'lbl eco'; el.style.setProperty('--c', col); el.innerHTML = `<i></i>${l[3]}`; labelBox.appendChild(el); labels.push({ p: V(l[0], l[1], l[2]), el }); });
}
function showFlows(k) { for (const [fk, f] of Object.entries(flows)) f.g.visible = layers.flows && (k === 'overview' || k === 'all' || fk === k); }
function selectEco(k) {
  active = k; selDist = null; const e = ECO[k];
  showFlows(k); setLabels(layers.labels ? e.L : [], hex(e.c)); flyTo(e.cam, e.tg);
  controls.autoRotate = k === 'overview' && layers.rotate;
  const ds = districts.filter(d => DINFO[d.n].e.includes(k));
  info.innerHTML = `<div class="k" style="color:${hex(e.c)}">${k === 'overview' ? 'City overview' : 'Ecosystem'}</div><h2>${e.t}</h2><p class="sub">${e.s}</p><p>${e.d}</p>
   ${ds.length ? `<h5>Where to see it</h5><div class="chips">${ds.map(d => `<button data-dist="${d.n}" style="--c:${hex(d.c)}">${d.n}</button>`).join('')}</div>` : ''}
   ${k === 'overview' ? `<h5>Try this</h5><ul><li>Click any district in the city to inspect it</li><li><b>Tour</b> runs a guided fly-through</li><li><b>Walk</b> drops you onto the street</li><li><b>Ride</b> boards the maglev</li></ul>` : ''}`;
  openInfo();
}
function selectDistrict(n) {
  const d = districts.find(x => x.n === n), I = DINFO[n]; selDist = d; active = 'district';
  showFlows('off'); I.e.forEach(k => { if (flows[k] && layers.flows) flows[k].g.visible = true; });
  setLabels([], hex(d.c)); flyTo(I.cam, I.tg); controls.autoRotate = false;
  info.innerHTML = `<div class="k" style="color:${hex(d.c)}">District · ${I.p}</div><h2>${n}</h2><p class="sub">${I.role}</p>
   <div class="kpis">${I.k.map(k => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('')}</div>
   <h5>Signature projects</h5><ul>${I.f.map(f => `<li>${f}</li>`).join('')}</ul>
   <h5>Ecosystems here</h5><div class="chips">${I.e.map(k => `<button data-eco="${k}" style="--c:${hex(ECO[k].c)}">${ECO[k].t.split(' ·')[0]}</button>`).join('')}</div>
   <h5>Landmarks</h5><div class="chips">${LANDMARKS.map((l, i) => l.d === n ? `<button data-lm="${i}" style="--c:${hex(d.c)}">${l.n}</button>` : '').join('') || '<span class="muted">—</span>'}</div>
   <button class="cta" data-walk="${n}">Walk the streets here →</button>`;
  openInfo();
}
function selectLandmark(i) {
  const l = LANDMARKS[i]; active = 'landmark'; selDist = districts.find(d => d.n === l.d) || null;
  setLabels([[...l.pos, l.n]], '#d6b46a'); flyTo(l.cam, l.tg); controls.autoRotate = false;
  info.innerHTML = `<div class="k">Landmark · ${l.d}</div><h2>${l.n}</h2><p>${l.t}</p>${DINFO[l.d] ? `<div class="chips"><button data-dist="${l.d}" style="--c:${hex(selDist.c)}">Open ${l.d}</button></div>` : ''}`;
  openInfo();
}
info.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.eco) selectEco(b.dataset.eco); else if (b.dataset.dist) selectDistrict(b.dataset.dist); else if (b.dataset.lm) selectLandmark(+b.dataset.lm);
  else if (b.dataset.walk) { const d = districts.find(x => x.n === b.dataset.walk); setMode('walk', V(d.x, 3.2, d.z + d.r * .9)); } });
function openInfo() { document.body.classList.add('infoOpen'); }
$('#infoClose').addEventListener('click', () => document.body.classList.remove('infoOpen'));
$('#navToggle').addEventListener('click', () => document.body.classList.toggle('navOpen'));

// click-to-pick in 3D
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || mode !== 'orbit') return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null; if (moved > 5) return;
  const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(scene.children, true).find(h => h.object !== sky && h.object.type !== 'Points' && h.object.type !== 'LineSegments');
  if (!hit) return; const p = hit.point;
  // landmark proximity first
  let best = null, bd = 1e9; LANDMARKS.forEach((l, i) => { const d = Math.hypot(p.x - l.pos[0], p.z - l.pos[2]); if (d < bd) { bd = d; best = i; } });
  if (bd < 9) return selectLandmark(best);
  const d = districts.map(d => [d, Math.hypot(p.x - d.x, p.z - d.z) / d.r]).sort((a, b) => a[1] - b[1])[0];
  if (d && d[1] < 1.25) selectDistrict(d[0].n); else showToast('Open land: click a district, landmark or tower');
});

/* ================= MODES ================= */
let mode = 'orbit'; const keys = {}; let yaw = 0, pitch = 0;
const modeBtns = document.querySelectorAll('#modes button');
const help = { orbit: 'Drag to orbit · scroll to zoom · right-drag to pan · click a district', fly: 'Fly: W A S D to move · Q / E down & up · drag to look · Shift = fast', walk: 'Walk: W A S D or the pad to move · drag to look · Shift = run', ride: 'Riding the maglev loop: drag to look around · Esc to exit', tour: 'Guided tour: sit back, or use ◀ ▶ to skip' };
function setMode(m, startPos) {
  if (mode === 'tour' && m !== 'tour') stopTour();
  mode = m; modeBtns.forEach(b => b.classList.toggle('on', b.dataset.m === m)); $('#help').textContent = help[m];
  document.body.dataset.mode = m;
  controls.enabled = m === 'orbit'; tween = null;
  if (m === 'orbit') { controls.target.copy(camera.position.clone().add(camera.getWorldDirection(V(0, 0, 0)).multiplyScalar(80)).setY(Math.max(0, camera.position.y - 60))); }
  if (m === 'fly' || m === 'walk' || m === 'ride') {
    const dir = camera.getWorldDirection(V(0, 0, 0)); yaw = Math.atan2(-dir.x, -dir.z); pitch = m === 'walk' ? 0 : Math.asin(dir.y);
    if (m === 'walk') { camera.position.copy(startPos || V(0, 3.2, 40)); pitch = .05; }
    if (m === 'fly' && startPos) camera.position.copy(startPos);
    if (m === 'ride') pitch = -.1;
  }
  if (m === 'tour') startTour();
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys[e.code] = true; if (e.code === 'Escape' && mode !== 'orbit') setMode('orbit'); });
addEventListener('keyup', e => keys[e.code] = false);
// drag-to-look for fly/walk/ride
let look = null;
renderer.domElement.addEventListener('pointerdown', e => { if (mode === 'fly' || mode === 'walk' || mode === 'ride') { look = [e.clientX, e.clientY]; renderer.domElement.setPointerCapture(e.pointerId); } });
renderer.domElement.addEventListener('pointermove', e => { if (!look) return; yaw -= (e.clientX - look[0]) * .004; pitch = Math.max(-1.4, Math.min(1.4, pitch - (e.clientY - look[1]) * .004)); look = [e.clientX, e.clientY]; });
addEventListener('pointerup', () => look = null);
// touch pad
document.querySelectorAll('#pad button').forEach(b => { const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => keys[k] = false)); });

/* ================= TOUR ================= */
const tourStops = ['overview', 'water', 'food', 'energy', 'compute', 'soil', 'healing', 'habitat', 'people'].map(k => ({ k, ...ECO[k] }))
  .concat([{ k: 'lm', ...ECO.overview, t: 'Sapientia Tower', s: 'Landmark', d: LANDMARKS[0].t, cam: LANDMARKS[0].cam, tg: LANDMARKS[0].tg }]);
let tourI = 0, tourT = 0;
function startTour() { tourI = 0; tourT = 0; $('#tourBar').classList.add('on'); goStop(); }
function stopTour() { $('#tourBar').classList.remove('on'); }
function goStop() { const s = tourStops[tourI]; if (s.k !== 'lm') { const keep = mode; selectEco(s.k); } else selectLandmark(0); controls.enabled = false; controls.autoRotate = false; tourT = 0;
  $('#tourCap').innerHTML = `<b>${tourI + 1}/${tourStops.length}</b> ${s.t}`; }
$('#tourPrev').onclick = () => { tourI = (tourI - 1 + tourStops.length) % tourStops.length; goStop(); };
$('#tourNext').onclick = () => { tourI = (tourI + 1) % tourStops.length; goStop(); };
$('#tourStop').onclick = () => setMode('orbit');

/* ================= LAYERS ================= */
const layers = { flows: true, labels: true, names: true, drones: true, rotate: true };
document.querySelectorAll('#layers input').forEach(i => { i.checked = layers[i.dataset.l]; i.addEventListener('change', () => { layers[i.dataset.l] = i.checked; applyLayers(); }); });
$('#layersBtn').onclick = () => $('#layers').classList.toggle('on');
function applyLayers() {
  showFlows(active === 'district' || active === 'landmark' ? 'off' : active);
  if (active === 'district' && selDist && layers.flows) DINFO[selDist.n].e.forEach(k => flows[k].g.visible = true);
  labelBox.querySelectorAll('.lbl.eco').forEach(n => n.style.display = layers.labels ? '' : 'none');
  labelBox.querySelectorAll('.lbl.name').forEach(n => n.style.display = layers.names ? '' : 'none');
  drones.forEach(d => d.m.visible = layers.drones); birds.forEach(b => b.m.visible = layers.drones);
  controls.autoRotate = layers.rotate && active === 'overview' && mode === 'orbit';
}
// persistent district name labels
districts.forEach(d => { const el = document.createElement('div'); el.className = 'lbl name'; el.style.setProperty('--c', hex(d.c)); el.textContent = d.n; el.onclick = () => { setMode('orbit'); selectDistrict(d.n); }; labelBox.appendChild(el); labels.push({ p: V(d.x, 2, d.z + d.r * .2), el, persist: true, name: true }); });

/* ================= TIME OF DAY ================= */
const TOD = {
  dawn: { top: 0x1a2a4a, mid: 0x6a7aa0, hor: 0xf0c0a0, hemi: 1.0, sun: 2.0, sc: 0xffc8a0, sp: [320, 90, -150], exp: 1.05, bloom: .6, fog: 0x8a8aa0, fd: .0016, stars: .15 },
  day: { top: 0x2a6ab0, mid: 0x6aa8e0, hor: 0xcfe6f0, hemi: 1.5, sun: 3.0, sc: 0xfff4e0, sp: [-200, 400, -100], exp: 1.0, bloom: .32, fog: 0xa8c8d8, fd: .0011, stars: 0 },
  dusk: { top: 0x1a1838, mid: 0x6a3a5a, hor: 0xe0905a, hemi: .9, sun: 2.2, sc: 0xff9a5a, sp: [-400, 60, -50], exp: 1.1, bloom: .7, fog: 0x3a2a3a, fd: .0017, stars: .3 },
  night: { top: 0x050914, mid: 0x10304a, hor: 0x3a5a5a, hemi: .75, sun: 1.6, sc: 0xffd9a0, sp: [-300, 220, -120], exp: 1.05, bloom: .85, fog: 0x0a1520, fd: .0019, stars: .8 },
};
let todFrom = null, todTo = TOD.night, todT = 1;
const cur = { top: new THREE.Color(), mid: new THREE.Color(), hor: new THREE.Color(), sc: new THREE.Color(), fog: new THREE.Color(), sp: V(0, 0, 0) };
function snapTOD(s) { cur.top.set(s.top); cur.mid.set(s.mid); cur.hor.set(s.hor); cur.sc.set(s.sc); cur.fog.set(s.fog); cur.sp.set(...s.sp); Object.assign(cur, { hemi: s.hemi, sun: s.sun, exp: s.exp, bloom: s.bloom, fd: s.fd, stars: s.stars }); }
snapTOD(TOD.night);
function setTOD(name) { todFrom = { ...cur, top: cur.top.clone(), mid: cur.mid.clone(), hor: cur.hor.clone(), sc: cur.sc.clone(), fog: cur.fog.clone(), sp: cur.sp.clone() }; todTo = TOD[name]; todT = 0;
  document.querySelectorAll('#tod button').forEach(b => b.classList.toggle('on', b.dataset.t === name)); }
document.querySelectorAll('#tod button').forEach(b => b.addEventListener('click', () => setTOD(b.dataset.t)));
function stepTOD(dt) {
  if (todT < 1 && todFrom) { todT = Math.min(1, todT + dt / 1.6); const k = todT, F = todFrom, Tt = todTo;
    cur.top.copy(F.top).lerp(new THREE.Color(Tt.top), k); cur.mid.copy(F.mid).lerp(new THREE.Color(Tt.mid), k); cur.hor.copy(F.hor).lerp(new THREE.Color(Tt.hor), k);
    cur.sc.copy(F.sc).lerp(new THREE.Color(Tt.sc), k); cur.fog.copy(F.fog).lerp(new THREE.Color(Tt.fog), k); cur.sp.copy(F.sp).lerp(V(...Tt.sp), k);
    ['hemi', 'sun', 'exp', 'bloom', 'fd', 'stars'].forEach(p => cur[p] = F[p] + (Tt[p] - F[p]) * k); }
  sky.material.uniforms.top.value.copy(cur.top); sky.material.uniforms.mid.value.copy(cur.mid); sky.material.uniforms.hor.value.copy(cur.hor);
  hemi.intensity = cur.hemi; sunL.intensity = cur.sun; sunL.color.copy(cur.sc); sunL.position.copy(cur.sp);
  renderer.toneMappingExposure = cur.exp; bloom.strength = cur.bloom; scene.fog.color.copy(cur.fog); scene.fog.density = cur.fd; starMat.opacity = cur.stars;
}

/* ================= HUD (simulated live feed) ================= */
const hud = [['Solar output', 'MW', 38, 2], ['Water recycled', 'ML/day', 46, 1.2], ['Food harvested', 't/day', 21, .6], ['Heat recovered', 'MWh', 112, 3], ['Maglev pods', 'running', 7, 0], ['Drones aloft', '', 26, 2], ['Species detected', 'today', 214, 3], ['Resident trust', '%', 78, .4]];
$('#hud').innerHTML = hud.map((h, i) => `<div><span>${h[0]}</span><b id="h${i}">${h[2]}</b><em>${h[1]}</em></div>`).join('');
setInterval(() => hud.forEach((h, i) => { if (!h[3]) return; const base = h[2]; const todk = (i === 0) ? (cur.sun / 3) : 1; const v = (base * (i === 0 ? todk : 1) + (Math.random() - .5) * h[3] * 2); document.getElementById('h' + i).textContent = v.toFixed(v < 30 ? 1 : 0); }), 1500);

/* ================= MINIMAP ================= */
const mm = $('#minimap'), mx = mm.getContext('2d'), MW = 220, MH = 140;
mm.width = MW * 2; mm.height = MH * 2; mx.scale(2, 2);
const toMM = (x, z) => [(x + 330) / 660 * MW, (z + 200) / 370 * MH], fromMM = (u, v) => [u / MW * 660 - 330, v / MH * 370 - 200];
function drawMM() {
  mx.clearRect(0, 0, MW, MH); mx.fillStyle = 'rgba(7,13,20,.85)'; mx.fillRect(0, 0, MW, MH);
  mx.fillStyle = '#123a2a'; mx.fillRect(0, 0, MW, toMM(0, -105)[1]);
  mx.strokeStyle = '#2a6a9a'; mx.lineWidth = 7; mx.beginPath(); river.getPoints(40).forEach((p, i) => { const [u, v] = toMM(p.x, p.z); i ? mx.lineTo(u, v) : mx.moveTo(u, v); }); mx.stroke();
  mx.strokeStyle = '#d6b46a'; mx.lineWidth = 1.5; mx.beginPath(); spine.getPoints(30).forEach((p, i) => { const [u, v] = toMM(p.x, p.z); i ? mx.lineTo(u, v) : mx.moveTo(u, v); }); mx.stroke();
  mx.strokeStyle = 'rgba(159,208,255,.6)'; mx.lineWidth = 1; mx.beginPath(); loop.getPoints(60).forEach((p, i) => { const [u, v] = toMM(p.x, p.z); i ? mx.lineTo(u, v) : mx.moveTo(u, v); }); mx.closePath(); mx.stroke();
  districts.forEach(d => { const [u, v] = toMM(d.x, d.z); mx.beginPath(); mx.arc(u, v, d.r / 660 * MW, 0, 7); mx.fillStyle = hex(d.c) + (selDist === d ? '88' : '33'); mx.fill(); mx.strokeStyle = hex(d.c); mx.stroke(); });
  pods.forEach(p => { const [u, v] = toMM(p.m.position.x, p.m.position.z); mx.fillStyle = '#fff'; mx.fillRect(u - 1.5, v - 1.5, 3, 3); });
  const [cu, cv] = toMM(camera.position.x, camera.position.z); const dir = camera.getWorldDirection(V(0, 0, 0)); const a = Math.atan2(dir.z, dir.x);
  mx.fillStyle = 'rgba(214,180,106,.25)'; mx.beginPath(); mx.moveTo(cu, cv); mx.arc(cu, cv, 26, a - .45, a + .45); mx.closePath(); mx.fill();
  mx.fillStyle = '#d6b46a'; mx.beginPath(); mx.arc(cu, cv, 3.5, 0, 7); mx.fill();
}
mm.addEventListener('click', e => { const r = mm.getBoundingClientRect(); const [x, z] = fromMM((e.clientX - r.left) / r.width * MW, (e.clientY - r.top) / r.height * MH);
  const d = districts.map(d => [d, Math.hypot(x - d.x, z - d.z) / d.r]).sort((a, b) => a[1] - b[1])[0];
  setMode('orbit'); if (d[1] < 1.2) selectDistrict(d[0].n); else { flyTo([x + 60, 90, z + 110], [x, 0, z]); controls.autoRotate = false; } });

/* ================= LOOP ================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .85, .55, .22); composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host); resize();

const clock = new THREE.Clock(), dummy = new THREE.Object3D(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let fpsAcc = 0, fpsN = 0, lowQ = false;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), T = clock.elapsedTime;
  // adaptive quality
  fpsAcc += dt; fpsN++; if (fpsAcc > 3) { const fps = fpsN / fpsAcc; if (fps < 28 && !lowQ) { lowQ = true; renderer.setPixelRatio(1); resize(); } fpsAcc = 0; fpsN = 0; }
  stepTOD(dt);
  // camera
  if (tween) { tween.t = Math.min(1, tween.t + dt / tween.d); const k = ease(tween.t); camera.position.lerpVectors(tween.fp, tween.tp, k); controls.target.lerpVectors(tween.ft, tween.tt, k); camera.lookAt(controls.target); if (tween.t >= 1) tween = null; }
  if (mode === 'orbit') controls.update();
  else if (mode === 'tour') { if (!tween) { camera.lookAt(controls.target); tourT += dt; if (tourT > 7) { tourI = (tourI + 1) % tourStops.length; goStop(); } } $('#tourProg').style.width = (tween ? 0 : Math.min(1, tourT / 7) * 100) + '%'; }
  else if (mode === 'fly' || mode === 'walk') {
    const sp = (mode === 'fly' ? 70 : 16) * (keys.ShiftLeft || keys.ShiftRight ? 3 : 1) * dt;
    const fw = V(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = V(Math.cos(yaw), 0, -Math.sin(yaw));
    if (mode === 'fly') fw.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    if (keys.KeyW || keys.ArrowUp) camera.position.addScaledVector(fw, sp);
    if (keys.KeyS || keys.ArrowDown) camera.position.addScaledVector(fw, -sp);
    if (keys.KeyA || keys.ArrowLeft) camera.position.addScaledVector(rt, -sp);
    if (keys.KeyD || keys.ArrowRight) camera.position.addScaledVector(rt, sp);
    if (mode === 'fly') { if (keys.KeyE) camera.position.y += sp; if (keys.KeyQ) camera.position.y -= sp; camera.position.y = Math.max(3, Math.min(500, camera.position.y)); }
    else camera.position.y = 3.2 + Math.sin(T * 9) * .05 * ((keys.KeyW || keys.KeyS || keys.ArrowUp || keys.ArrowDown) ? 1 : 0);
    { const nat = !!window.NATURE, x0 = nat ? -900 : -420, x1 = nat ? 520 : 420, z0 = nat ? -640 : -420, z1 = nat ? 920 : 420; camera.position.x = Math.max(x0, Math.min(x1, camera.position.x)); camera.position.z = Math.max(z0, Math.min(z1, camera.position.z)); }
    eul.set(pitch, yaw, 0); camera.quaternion.setFromEuler(eul);
  } else if (mode === 'ride') {
    const p = pods[0], a = loop.getPointAt(p.t), b = loop.getPointAt((p.t + .01) % 1); camera.position.set(a.x, a.y + 5, a.z);
    const base = Math.atan2(-(b.x - a.x), -(b.z - a.z)); eul.set(pitch, base + yaw * .0 + rideLook, 0); camera.quaternion.setFromEuler(eul);
  }
  // animations
  halos.forEach(h => h.m.rotation.z += h.s * dt); spinners.forEach(s => s.m.rotation.y += s.s * dt);
  pods.forEach(p => { p.t = (p.t + dt * .018) % 1; const a = loop.getPointAt(p.t), b = loop.getPointAt((p.t + .002) % 1); p.m.position.copy(a).y += 1.6; p.m.lookAt(b.x, b.y + 1.6, b.z); p.m.rotateX(Math.PI / 2); });
  pods[0].m.visible = mode !== 'ride';
  drones.forEach(d => { const a = T * d.s + d.o; d.m.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(T + d.o) * 3, d.cz + Math.sin(a) * d.r * .6); d.m.rotation.y += dt * 2; });
  birds.forEach((b, i) => { const a = T * .25 + b.o; b.m.position.set(-40 + Math.cos(a) * 120 + Math.sin(i) * 6, 70 + Math.sin(T * 2 + i) * 2 + (i % 5), -60 + Math.sin(a) * 70 + Math.cos(i) * 6); b.m.rotation.y = -a; });
  { const { p, seed } = steam; seed.forEach((s, i) => { const t = (s[2] + T * .12) % 1; p[i * 3] = s[0] + Math.sin(T + i) * .8; p[i * 3 + 1] = 1 + t * 22; p[i * 3 + 2] = s[1]; }); steam.pts.geometry.attributes.position.needsUpdate = true; }
  pools.forEach((p, i) => p.material.emissiveIntensity = 1.4 + Math.sin(T * 2 + i) * .3);
  mycelium.material.opacity = (active === 'soil' || selDist?.n === 'Soil Commons') ? .55 + Math.sin(T * 3) * .25 : .1;
  districts.forEach((d, i) => d.ring.material.opacity = selDist === d ? .8 + Math.sin(T * 4) * .2 : .35 + Math.sin(T * 1.5 + i) * .15);
  for (const f of Object.values(flows)) if (f.g.visible) f.beads.forEach(b => { for (let i = 0; i < b.n; i++) { const t = (i / b.n + T * .045 + b.off) % 1; dummy.position.copy(b.curve.getPointAt(t)); dummy.scale.setScalar(.7 + .5 * Math.sin(t * 40)); dummy.updateMatrix(); b.im.setMatrixAt(i, dummy.matrix); } b.im.instanceMatrix.needsUpdate = true; });
  // labels
  const w = host.clientWidth, h = host.clientHeight, cp = camera.position;
  labels.forEach(l => { const v = l.p.clone().project(camera); const dist = cp.distanceTo(l.p);
    let show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && !(tween && !l.name);
    if (l.name) show = show && layers.names && dist < 520 && dist > 25 && mode !== 'tour' && !(active === 'district' && selDist && l.el.textContent === selDist.n && dist < 60);
    l.el.style.opacity = show ? 1 : 0; l.el.style.pointerEvents = show && l.name ? 'auto' : 'none';
    l.el.style.transform = `translate(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px)`; });
  if ((T * 10 | 0) % 2 === 0) drawMM();
  composer.render();
}
let rideLook = 0;
renderer.domElement.addEventListener('pointermove', e => { if (mode === 'ride' && look) rideLook = yaw; });
selectEco('overview');
document.body.classList.remove('infoOpen');
frame();
host.classList.add('ready');
