
/* =====================================================================
   TESLA WIRELESS GRID: resonant relay towers, crown coil, beams, lanes
   ===================================================================== */
(() => {
const rnd = Math.random, $ = s => document.querySelector(s);
const CU = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: .85, roughness: .3, emissive: 0x3a1a08, emissiveIntensity: .3 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x9aa4aa, metalness: .7, roughness: .4 });
const COIL = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x6fb8ff, emissiveIntensity: 2.2 });
const ARCM = new THREE.LineBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
const FIELDM = new THREE.MeshBasicMaterial({ color: 0x8fc8ff, transparent: true, opacity: .5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
const DOMEM = new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false });

// ---------- Wardenclyffe-style lattice relay tower ----------
function latticeGeo(H = 46, rb = 6, rt = 2.6, sides = 8) {
  const parts = []; const legR = .28;
  const pt = (r, a, y) => V(Math.cos(a) * r, y, Math.sin(a) * r);
  const strut = (a, b, rad = legR) => { const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(rad, rad, L, 5); g.translate(0, L / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()); g.applyQuaternion(q); g.translate(a.x, a.y, a.z); parts.push(g); };
  const lv = 6; for (let i = 0; i < sides; i++) { const a = i / sides * Math.PI * 2, a2 = (i + 1) / sides * Math.PI * 2;
    for (let j = 0; j < lv; j++) { const y0 = j / lv * H, y1 = (j + 1) / lv * H, r0 = rb + (rt - rb) * j / lv, r1 = rb + (rt - rb) * (j + 1) / lv;
      strut(pt(r0, a, y0), pt(r1, a, y1), .32); strut(pt(r1, a, y1), pt(r1, a2, y1), .18); strut(pt(r0, a, y0), pt(r1, a2, y1), .12); } }
  return mergeGeometries(parts);
}
const LAT = latticeGeo();
const TOWERS = [];
function tower(i, k) {
  const a = SA(k) + .13, r = 223, [x, , z] = PO(r, a); const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const lat = new THREE.Mesh(LAT, STEEL); lat.castShadow = true; g.add(lat);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 2.2, 8), M.slab); base.position.y = 1.1; g.add(base);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(7.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), CU); cap.position.y = 46; cap.scale.y = .62; cap.castShadow = true; g.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.2, .45, 10, 48), COIL); rim.rotation.x = Math.PI / 2; rim.position.y = 46; g.add(rim);
  for (let c = 0; c < 5; c++) { const t = new THREE.Mesh(new THREE.TorusGeometry(5.6 - c * .2, .22, 8, 40), COIL); t.rotation.x = Math.PI / 2; t.position.y = 3 + c * 1.1; g.add(t); }
  const field = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 96), FIELDM.clone()); field.rotation.x = -Math.PI / 2; field.position.y = .6; g.add(field);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(78, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), DOMEM); dome.visible = false; g.add(dome);
  const arcs = Array.from({ length: 3 }, () => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => V())), ARCM); g.add(l); return l; });
  const names = { water: 'Aqua', healing: 'Salus', food: 'Verda', soil: 'Humus', energy: 'Solis', compute: 'Logos', habitat: 'Sylva', people: 'Agora' };
  TOWERS.push({ id: i + 1, n: `Relay ${i + 1} · ${names[k]}`, k, x, z, top: V(x, 48, z), g, rim, field, dome, arcs, out: 100, load: 0, st: 'ok', surge: 0, ft: rnd() * 3 });
}
SEC.forEach((k, i) => tower(i, k));
// ---------- Tesla Crown on the Sapientia Tower (master transmitter) ----------
const CROWN = { y: 120 };
{ const g = new THREE.Group(); g.position.y = CROWN.y; scene.add(g); CROWN.g = g;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17, .9, 12, 96), COIL); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(10 + i * 1.1, .2, 6, 64), CU); t.rotation.x = Math.PI / 2; t.position.y = -3 + i * .25; g.add(t); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 17, 5), STEEL); s.rotation.z = Math.PI / 2; s.rotation.y = -a; s.position.set(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5); g.add(s); }
  CROWN.arcs = Array.from({ length: 5 }, () => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => V())), ARCM); scene.add(l); return l; }); }
// resonant links crown → relays (faint), beams to drones & pods
const linkGeo = new THREE.BufferGeometry(); linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TOWERS.length * 6), 3));
const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(links);
TOWERS.forEach((t, i) => { const p = linkGeo.attributes.position; p.setXYZ(i * 2, 0, CROWN.y, 0); p.setXYZ(i * 2 + 1, t.top.x, t.top.y, t.top.z); });
const NB = drones.length + pods.length;
const beamGeo = new THREE.BufferGeometry(); beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NB * 6), 3));
const beams = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(beams);
// inductive charging lanes along every boulevard
const LANE = new THREE.MeshStandardMaterial({ color: 0x4ac0ff, emissive: 0x3aa8ff, emissiveIntensity: 1.6, transparent: true, opacity: .85 });
for (let s = 0; s < 8; s++) { const a = SPOKE(s); [-2, 2].forEach(o => { const c = new THREE.CatmullRomCurve3([V(...PO(42, a)).add(V(-Math.sin(a) * o, 0, Math.cos(a) * o)), V(...PO(246, a)).add(V(-Math.sin(a) * o, 0, Math.cos(a) * o))]); const m = ribbon(c, .5, .19, LANE, 30); m.userData.noCast = true; }); }
{ const m = ribbon(spine, .5, .19, LANE, 200); m.userData.noCast = true; }
// space-based solar: orbital collector + microwave beam to a rectenna field outside the waterway
const RECT = PO(282, SA('energy') + .06);
const SAT = V(RECT[0] * 1.6, 1500, RECT[2] * 1.6 - 400);
{ const sat = new THREE.Group(); sat.position.copy(SAT); scene.add(sat);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 30, 12), STEEL); core.rotation.z = Math.PI / 2; sat.add(core);
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(90, 1, 36), new THREE.MeshStandardMaterial({ color: 0x1a3a7a, metalness: .6, roughness: .2, emissive: 0x2a5aa0, emissiveIntensity: .6 })); p.position.x = s * 62; sat.add(p); });
  sat.lookAt(RECT[0], 0, RECT[2]);
  const rect = new THREE.Group(); rect.position.set(RECT[0], 0, RECT[2]); scene.add(rect);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(24, 64), M.pad); pad.rotation.x = -Math.PI / 2; pad.position.y = .12; rect.add(pad);
  const panel = new THREE.BoxGeometry(2.2, .15, 1.4); panel.rotateX(-.5); const pts = []; for (let r = 4; r < 22; r += 3.2) for (let a = 0; a < Math.PI * 2; a += 2.6 / r) { const g = panel.clone(); g.rotateY(-a); g.translate(Math.cos(a) * r, 1.1, Math.sin(a) * r); pts.push(g); }
  rect.add(new THREE.Mesh(mergeGeometries(pts), new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: .6, roughness: .3 })));
  const beamLen = SAT.distanceTo(V(RECT[0], 0, RECT[2]));
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(3, 22, beamLen, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  bm.position.copy(SAT).add(V(RECT[0], 0, RECT[2])).multiplyScalar(.5); bm.lookAt(SAT); bm.rotateX(Math.PI / 2); scene.add(bm); CROWN.spaceBeam = bm; }

// ---------- grid state ----------
const G = { cover: false, beams: true, lanes: true, log: [], eff: 91.5 };
const todName = () => $('#tod button.on')?.dataset.t || 'night';
function mix() { const t = todName(), sun = t === 'day' ? 1 : t === 'dusk' || t === 'dawn' ? .45 : 0; const e = window.SYM?.started() ? window.SYM.hud()[0] : 60;
  return [['Solar leaves & roofs', e * .55 * (.2 + .8 * sun), '#e6c040'], ['Space-solar beam', 22, '#ffc98a'], ['Helix wind', 11 + Math.sin(Date.now() / 7000) * 3, '#cfe6ff'], ['Geothermal', 9, '#d4805a'], ['Waste heat → power', 4.5, '#ff8a4a'], ['Biogas', 5.5, '#c79a6a'], ['Batteries', sun ? -4 : 9, '#4fbf9a']]; }
const demand = () => { const t = todName(); return 74 + (t === 'night' ? 8 : t === 'day' ? 4 : 10) + TOWERS.reduce((s, x) => s + x.surge * 6, 0); };
function state() { const m = mix(), sup = m.reduce((s, x) => s + x[1], 0), dem = demand();
  return { supply_MW: +sup.toFixed(1), demand_MW: +dem.toFixed(1), margin_MW: +(sup - dem).toFixed(1), wireless_efficiency_pct: G.eff, resident_bill_usd: 0, generation: m.map(x => `${x[0]}: ${x[1].toFixed(1)} MW`),
    towers: TOWERS.map(t => ({ id: t.id, name: t.n, output_pct: t.out, load_MW: +t.load.toFixed(1), status: t.st })), devices_powered: { drones: drones.length, maglev_pods: pods.length, delivery_robots: 48, buildings: window.BLD.list.length, vehicles_charging_on_lanes: 'all boulevard traffic' } }; }
function setTower(id, pct) { const t = TOWERS.find(x => x.id === +id); if (!t) return 'No such tower'; t.out = Math.max(0, Math.min(130, +pct)); glog(`${t.n} output set to ${t.out}%`); render(); return `${t.n} now at ${t.out}%`; }
function surge() { const t = TOWERS[Math.floor(rnd() * TOWERS.length)]; t.surge = 1; t.st = 'overload'; t.out = 100; G.eff = 84.2; glog(`⚡ Geomagnetic surge: ${t.n} overloaded (load 168%)`); flyTo([t.x * 1.35, 90, t.z * 1.35], [t.x, 30, t.z]); controls.autoRotate = false; render(); return `${t.n} is overloaded. Run the AI load balance to reroute power through neighboring relays.`; }
function balance() { const over = TOWERS.filter(t => t.surge); TOWERS.forEach(t => { if (t.surge) { t.out = 70; t.surge = 0; t.st = 'ok'; } else t.out = Math.min(115, t.out + (over.length ? 6 : 0)); });
  G.eff = 91.5 + rnd(); glog(over.length ? `✓ TESLA rebalanced: ${over.map(t => t.n).join(', ')} throttled to 70%, neighbors raised; field phase re-synchronized` : '✓ Grid already balanced; phases re-synchronized across all relays');
  render(); return over.length ? `Rebalanced: ${over.map(t => t.n).join(', ')} throttled to 70% while the neighboring relays pick up the load. Wireless efficiency is back to ${G.eff.toFixed(1)}%.` : `The grid is balanced. Wireless efficiency is ${G.eff.toFixed(1)}%.`; }
function coverage(on) { G.cover = on ?? !G.cover; TOWERS.forEach(t => t.dome.visible = G.cover); const cb = $('#tgCover'); if (cb) cb.checked = G.cover; if (G.cover) { flyTo([0, 520, 520], [0, 0, 0]); controls.autoRotate = false; } return G.cover ? 'Showing resonant coverage fields: every street is inside at least one field.' : 'Coverage fields hidden'; }
function glog(t) { G.log.unshift(t); G.log = G.log.slice(0, 20); }
function localReply(q) { const s = state(); if (/surge|storm|overload/i.test(q)) return surge(); if (/balanc|fix|reroute/i.test(q)) return balance(); if (/cover|field/i.test(q)) return coverage(true);
  return `TESLA: supply ${s.supply_MW} MW against demand ${s.demand_MW} MW (margin ${s.margin_MW}). Eight relay towers and the Crown deliver power wirelessly at ${s.wireless_efficiency_pct}% efficiency. Resident bills: $0. <em>(built-in mode)</em>`; }

// ---------- UI ----------
function render() {
  const el = $('#elecBody'); if (!el) return; const m = mix(), sup = m.reduce((s, x) => s + x[1], 0), dem = demand(), tot = m.filter(x => x[1] > 0).reduce((s, x) => s + x[1], 0);
  el.innerHTML = `<div class="tri q"><div class="g"><b>${sup.toFixed(0)}</b>MW supply</div><div><b>${dem.toFixed(0)}</b>MW demand</div><div class="${G.eff > 88 ? 'g' : 'a'}"><b>${G.eff.toFixed(1)}%</b>wireless eff.</div><div class="g"><b>$0</b>resident bills</div></div>
   <h5>Generation mix (live)</h5><div class="mixbar">${m.filter(x => x[1] > 0).map(x => `<i style="width:${x[1] / tot * 100}%;background:${x[2]}" title="${x[0]}"></i>`).join('')}</div>
   <div class="mixl">${m.map(x => `<span><i style="background:${x[2]}"></i>${x[0]} <b>${x[1].toFixed(1)}</b></span>`).join('')}</div>
   <h5>Resonant relay towers</h5>${TOWERS.map(t => `<div class="asset ${t.st === 'overload' ? 'fault' : ''}"><div class="ah"><span class="ic">🗼</span><div><b>${t.n}</b><small>load ${t.load.toFixed(1)} MW · field ${(78 * t.out / 100).toFixed(0)} m</small></div><span class="pill" style="--c:${t.st === 'ok' ? '#4fbf9a' : '#ff6a5a'}">${t.st}</span></div>
     <div class="am"><span>Output</span><input type="range" min="0" max="130" value="${t.out}" data-tw="${t.id}"><b style="font-family:JetBrains Mono;font-size:11px;color:var(--ink)">${t.out}%</b><button data-loc="${t.id}">Locate</button></div></div>`).join('')}
   <h5>Grid log</h5><div class="mlog">${G.log.slice(0, 6).map(t => `<div>${t}</div>`).join('') || '<div>Grid nominal. All relays phase-locked to the Crown.</div>'}</div>`;
}
const tab = $('#et-elec');
tab.innerHTML = `<p class="fix">⚡ <b>Energy as a commons.</b> Every home, vehicle, drone and device is powered wirelessly from Tesla-style resonant relay towers and a crown coil, and residents pay nothing. Wireless transmission is real physics (resonant induction, microwave beaming). The power comes from the city's renewables and a space-solar beam, not from nothing.</p>
  <div class="btns"><button class="cta" id="tgBal">Run AI load balance</button><button class="ghost" id="tgSurge">⚡ Simulate grid surge</button></div>
  <label class="tog"><input type="checkbox" id="tgCover"> Show wireless coverage fields</label><label class="tog"><input type="checkbox" id="tgBeams" checked> Show power beams to drones &amp; pods</label><label class="tog"><input type="checkbox" id="tgLanes" checked> Charging lanes in boulevards</label>
  <div id="elecBody"></div>
  <div class="aicon" id="ai-elec" data-k="elec"><h5>Ask TESLA</h5><div class="log"></div><div class="sug chips"><button>How is the city powered right now?</button><button>Simulate a surge and fix it</button><button>Show me the wireless coverage</button></div><form><input placeholder="Ask the AI electrical engineer…"><button>Ask</button></form></div>`;
$('#tgBal').onclick = () => window.ENG_AILOG?.('elec', balance());
$('#tgSurge').onclick = () => window.ENG_AILOG?.('elec', surge());
$('#tgCover').onchange = e => coverage(e.target.checked);
$('#tgBeams').onchange = e => { G.beams = e.target.checked; beams.visible = G.beams; };
$('#tgLanes').onchange = e => { G.lanes = e.target.checked; LANE.visible = G.lanes; };
$('#elecBody').addEventListener('input', e => { const id = e.target.dataset.tw; if (id) { const t = TOWERS.find(x => x.id === +id); t.out = +e.target.value; e.target.nextElementSibling.textContent = t.out + '%'; } });
$('#elecBody').addEventListener('change', e => { const id = e.target.dataset.tw; if (id) glog(`Relay ${id} output set to ${e.target.value}% by engineer`); });
$('#elecBody').addEventListener('click', e => { const b = e.target.closest('button[data-loc]'); if (!b) return; const t = TOWERS.find(x => x.id === +b.dataset.loc); setMode('orbit'); flyTo([t.x * 1.3, 70, t.z * 1.3], [t.x, 28, t.z]); controls.autoRotate = false; });

// landmarks for navigation
LANDMARKS.push({ n: 'Tesla Crown', d: 'Agora Core', pos: [0, CROWN.y, 0], cam: [70, 150, 90], tg: [0, 110, 0], t: 'The master resonant coil around the Sapientia Tower, phase-locking all eight relay towers into one wireless grid.' },
  { n: 'Tesla Relay Towers', d: 'Energy Fields', pos: [TOWERS[4].x, 46, TOWERS[4].z], cam: [TOWERS[4].x * 1.35, 80, TOWERS[4].z * 1.35], tg: [TOWERS[4].x, 30, TOWERS[4].z], t: 'Eight Wardenclyffe-style lattice towers with copper domes ring the city, beaming power to drones, pods, vehicles and buildings.' },
  { n: 'Space-solar Rectenna', d: 'Energy Fields', pos: [RECT[0], 2, RECT[2]], cam: [RECT[0] * 1.25, 120, RECT[2] * 1.25 + 60], tg: [RECT[0], 40, RECT[2]], t: 'A receiving antenna field that catches the microwave beam from an orbital solar collector, about 22 MW day and night.' });
buildNav();

// ---------- animation ----------
let at = 0, uiT = 0;
const jag = (l, a, b, amp) => { const p = l.geometry.attributes.position, n = p.count; for (let i = 0; i < n; i++) { const t = i / (n - 1), q = a.clone().lerp(b, t), j = Math.sin(t * Math.PI) * amp; p.setXYZ(i, q.x + (rnd() - .5) * j, q.y + (rnd() - .5) * j, q.z + (rnd() - .5) * j); } p.needsUpdate = true; };
window.TESLA = { state, setTower, surge, balance, coverage, localReply, render, towers: TOWERS,
  frame(dt, T) {
    const real = window.REAL?.mode === 'real', t = todName(), dim = real && t === 'day' ? .35 : 1;
    COIL.emissiveIntensity = (1.6 + Math.sin(T * 6) * .5) * dim; LANE.emissiveIntensity = (1.1 + Math.sin(T * 3) * .5) * dim;
    CROWN.g.rotation.y += dt * .15;
    const sup = mix().reduce((s, x) => s + x[1], 0);
    TOWERS.forEach((tw, i) => { tw.load = sup / 8 * tw.out / 100 * (1 + tw.surge * .68) * (.95 + Math.sin(T * .7 + i) * .05);
      tw.ft += dt; const k = (tw.ft % 3) / 3; tw.field.scale.setScalar(4 + k * 78 * tw.out / 100); tw.field.material.opacity = (1 - k) * .45 * dim * (tw.out / 100);
      tw.field.material.color.set(tw.surge ? 0xff6a5a : 0x8fc8ff); tw.rim.scale.setScalar(1 + (tw.surge ? Math.sin(T * 30) * .05 : 0)); });
    at += dt; if (at > .07) { at = 0;
      TOWERS.forEach(tw => tw.arcs.forEach((l, j) => { const show = rnd() < (tw.surge ? .9 : .35); l.visible = show; if (!show) return; const a = V(0, 47, 0), ang = rnd() * 6.28, b = V(Math.cos(ang) * (8 + rnd() * 10), 40 + rnd() * 14 - (tw.surge ? 30 * rnd() : 0), Math.sin(ang) * (8 + rnd() * 10)); jag(l, a, b, tw.surge ? 4 : 2.2); }));
      CROWN.arcs.forEach(l => { const show = rnd() < .5; l.visible = show; if (!show) return; const a1 = rnd() * 6.28, a2 = a1 + .4 + rnd(); jag(l, V(Math.cos(a1) * 17, CROWN.y, Math.sin(a1) * 17), V(Math.cos(a2) * (6 + rnd() * 14), CROWN.y + 6 + rnd() * 12, Math.sin(a2) * (6 + rnd() * 14)), 3); }); }
    links.material.opacity = (.12 + Math.sin(T * 2) * .08) * dim + (real ? 0 : .1);
    if (beams.visible) { const p = beamGeo.attributes.position; let i = 0; const tgts = drones.map(d => d.m.position).concat(pods.map(q => q.m.position));
      tgts.forEach(pos => { let best = TOWERS[0], bd = 1e9; TOWERS.forEach(tw => { const d = Math.hypot(pos.x - tw.x, pos.z - tw.z); if (d < bd) { bd = d; best = tw; } });
        const near = bd < 170 || Math.hypot(pos.x, pos.z) < 130; const src = Math.hypot(pos.x, pos.z) < 130 ? V(0, CROWN.y, 0) : best.top;
        if (near) { p.setXYZ(i * 2, src.x, src.y, src.z); p.setXYZ(i * 2 + 1, pos.x, pos.y, pos.z); } else { p.setXYZ(i * 2, 0, -999, 0); p.setXYZ(i * 2 + 1, 0, -999, 0); } i++; });
      p.needsUpdate = true; beams.material.opacity = (.25 + Math.sin(T * 8) * .1) * dim; }
    if (CROWN.spaceBeam) CROWN.spaceBeam.material.opacity = (.08 + Math.sin(T * 1.3) * .03) * (real && t === 'day' ? .6 : 1);
    uiT += dt; if (uiT > 1.5) { uiT = 0; if (document.body.classList.contains('eng') && $('#et-elec').classList.contains('on') && !document.activeElement?.dataset?.tw) render(); }
  } };
render();
})();
