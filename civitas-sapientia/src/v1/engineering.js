var escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =====================================================================
   AI ENGINEERING STUDIOS: Civil · Mechanical · Scientific
   ===================================================================== */
(() => {
const $ = s => document.querySelector(s), BL = window.BLD.list, rnd = Math.random;
const E = { tab: 'civil', open: false, scen: null, run: null, insp: null, assets: [], fleetLog: [], cfd: null, design: null, built: false, mats: null, adopted: new Set(), shake: 0 };
const PERS = {
  civil: { name: 'IMHOTEP', title: 'AI Civil Engineer', c: '#d6b46a', wis: 'Named for the architect of Egypt\'s first great stone pyramid: build for eternity, and measure twice', voice: 'measured, rigorous, protective of life; speaks in loads, margins and safety factors' },
  mech: { name: 'AL-JAZARI', title: 'AI Mechanical Engineer', c: '#ff8a4a', wis: 'Named for the 12th-century author of the Book of Knowledge of Ingenious Mechanical Devices: every machine has a rhythm; listen to it', voice: 'practical, inventive, hands-on; talks about rpm, vibration, heat and wear' },
  sci: { name: 'IBN AL-HAYTHAM', title: 'AI Research Scientist', c: '#9fd0ff', wis: 'Named for the pioneer of the experimental scientific method: test every claim, trust evidence over authority', voice: 'curious, evidence-first, states uncertainty; proposes experiments' },
};
let sample = null; (window.claude && window.claude.use ? window.claude.use('sample') : Promise.resolve(null)).then(s => sample = s).catch(() => {});
const col3 = s => s < .35 ? [.55, 1.25, .85] : s < .6 ? [1.45, 1.1, .45] : [1.7, .4, .35];
const band = s => s < .35 ? 'safe' : s < .6 ? 'monitor' : 'retrofit';

/* ================= CIVIL ================= */
const SCEN = {
  quake: { n: 'Earthquake M7.2', i: '🌋', d: 'Ground shaking radiates from a fault epicenter' },
  typhoon: { n: 'Typhoon 180 km/h', i: '🌀', d: 'Sustained winds load tall facades' },
  flood: { n: '100-year flood', i: '🌊', d: 'The river overtops; low-lying blocks inundate' },
  heat: { n: 'Extreme heat 46 °C', i: '🔥', d: 'Solar gain and thermal expansion stress envelopes' },
};
const VUL = { quake: { glass: .62, resi: .7, timber: .42, lab: .5 }, typhoon: { glass: .8, resi: .45, timber: .35, lab: .3 }, flood: { glass: .5, resi: .7, timber: .8, lab: .65 }, heat: { glass: .85, resi: .45, timber: .3, lab: .55 } };
const FIX = {
  quake: { glass: 'Base isolation + tuned mass damper', resi: 'Shear walls + fiber-wrapped columns', timber: 'Upgraded hold-downs + CLT diaphragms', lab: 'Seismic bracing + isolated equipment floors' },
  typhoon: { glass: 'Corner softening + TMD + reinforced cladding anchors', resi: 'Balcony glazing ties + roof uplift straps', timber: 'Roof uplift straps + storm shutters', lab: 'Solar-array wind clips + cladding anchors' },
  flood: { glass: 'Raise MEP above flood line + deployable barriers', resi: 'Wet-proof ground floor + backflow valves', timber: 'Elevate on plinth + water-resistant CLT treatment', lab: 'Relocate labs above flood line + sealed basements' },
  heat: { glass: 'Electrochromic glazing + external fins', resi: 'Cool roof + cross-ventilation retrofit', timber: 'Green-roof irrigation + shading', lab: 'Heat-recovery chillers + reflective roof' },
};
function stressOf(b, k, epi) {
  const v = VUL[k][b.type], hf = Math.min(1.2, b.h / 100), r = b.retro[k] ? .5 : 1, n = (rnd() - .5) * .08;
  if (k === 'quake') { const d = Math.hypot(b.x - epi[0], b.z - epi[1]); return Math.max(0, (.55 * hf + .55 * v) * Math.exp(-d / 210) * 1.35 * r + n); }
  if (k === 'typhoon') { const up = (b.x * Math.cos(epi[2]) + b.z * Math.sin(epi[2])) / 230; return Math.max(0, (Math.pow(hf, 1.3) * 1.05 + .2) * v * (1.05 - up * .35) * r + n); }
  if (k === 'flood') { const depth = Math.max(0, (b.z - 38) / 52); return Math.max(0, depth * v * 1.1 * r + n * .5); }
  return Math.max(0, (.35 + hf * .4) * v * r + n);
}
let flood = null, quakeRing = null;
function runScenario(k, epiIn) {
  if (E.run) return 'A test is already running';
  const epi = epiIn ? epiIn.slice() : k === 'quake' ? [(rnd() - .5) * 300, (rnd() - .5) * 140] : k === 'typhoon' ? [0, 0, rnd() * Math.PI * 2] : [0, 0];
  BL.forEach(b => { b.stress = stressOf(b, k, epi); b.tinted = false; });
  E.scen = k; E.run = { k, t: 0, epi, dur: 3 };
  if (k === 'quake') { E.shake = 2.6; quakeRing = new THREE.Mesh(new THREE.RingGeometry(1, 3, 96), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: .9, side: THREE.DoubleSide })); quakeRing.rotation.x = -Math.PI / 2; quakeRing.position.set(epi[0], 1, epi[1]); scene.add(quakeRing); }
  if (k === 'flood') { if (!flood) { flood = new THREE.Mesh(new THREE.PlaneGeometry(900, 200), new THREE.MeshStandardMaterial({ color: 0x1a5a7a, emissive: 0x0a3a5a, emissiveIntensity: .6, transparent: true, opacity: .75, roughness: .1 })); flood.rotation.x = -Math.PI / 2; flood.position.set(0, 0, 150); scene.add(flood); } flood.visible = true; flood.position.y = 0; }
  if (k === 'typhoon') startCFD(epi[2] * 180 / Math.PI, 2.2, true);
  setMode('orbit'); flyTo([0, 230, 300], [0, 0, 0]); controls.autoRotate = false;
  renderCivil(); return `Running ${SCEN[k].n}…`;
}
function finishScenario() {
  const k = E.scen, c = { safe: 0, monitor: 0, retrofit: 0 }; BL.forEach(b => { c[band(b.stress)]++; b.tinted = true; window.BLD.setColor(b, col3(b.stress)); });
  E.report = { k, c, epi: E.run && E.run.epi, top: BL.slice().sort((a, b) => b.stress - a.stress).slice(0, 6) }; E.run = null;
  if (quakeRing) { scene.remove(quakeRing); quakeRing = null; }
  renderCivil(); return summary();
}
const summary = () => { if (!E.report) return 'No stress test has been run yet.'; const r = E.report;
  return `${SCEN[r.k].n}: ${r.c.safe} safe, ${r.c.monitor} monitor, ${r.c.retrofit} need retrofit (of ${BL.length}). Most stressed: ${r.top.slice(0, 4).map(b => `${b.name} ${(b.stress * 100).toFixed(0)}% (${b.type})`).join(', ')}.`; };
function applyRetrofits() { if (E.run) return 'A test is running; wait for it to finish before applying retrofits.'; if (!E.report) return 'Run a stress test first.'; const k = E.report.k, epi = E.report.epi; let n = 0; BL.forEach(b => { if (b.stress >= .35 && !b.retro[k]) { b.retro[k] = true; n++; } });
  E.report = null; if (flood) flood.visible = false; runScenario(k, epi); return `Applied AI-designed retrofits to ${n} structures for ${SCEN[k].n}. Re-running the same test (same hazard) to verify…`; }
function clearCivil() { E.scen = null; E.report = null; BL.forEach(b => b.tinted = false); window.BLD.resetColors(); if (flood) flood.visible = false; stopCFD(); renderCivil(); }
function inspect(b) {
  E.insp = b; window.BLD.highlight(b); setMode('orbit');
  flyTo([b.x + b.h * .7 + 25, b.h * .8 + 15, b.z + b.h * .7 + 30], [b.x, b.h * .45, b.z]); controls.autoRotate = false;
  if (E.open) { switchTab('civil'); renderCivil(); } else { $('#info').innerHTML = bldCard(b); openInfo(); }
}
function bldCard(b) {
  const f = (46 / Math.max(10, b.h)).toFixed(2), live = 30 + rnd() * 40 * (b.h / 80), sway = (b.h / 500 * (2 + rnd() * 3)).toFixed(1);
  const st = b.tinted && E.scen ? `<div class="kv warn"><span>${SCEN[E.scen].n} stress</span><b style="color:${b.stress < .35 ? '#4fbf9a' : b.stress < .6 ? '#ffc04a' : '#ff6a5a'}">${(b.stress * 100).toFixed(0)}% · ${band(b.stress)}</b></div><p class="fix">AI retrofit: ${FIX[E.scen][b.type]}${b.retro[E.scen] ? ' <span class="tag">applied</span>' : ''}</p>` : '';
  return `<div class="k">Structure · ${b.dn}</div><h2>${b.name}</h2><p class="sub">${window.BLD.TYPES[b.type]}</p>
  <div class="kpis"><div><b>${b.h.toFixed(0)} m</b><span>${b.floors} floors</span></div><div><b>${(b.area / 1000).toFixed(1)}k m²</b><span>floor area</span></div><div><b>${b.people.toLocaleString()}</b><span>occupants</span></div><div><b>${b.carbon}</b><span>kgCO₂e/m² embodied</span></div></div>
  <h5>Live structural health monitoring</h5>
  <div class="kv"><span>SHM health index</span><b>${b.shm.toFixed(1)}%</b></div><div class="kv"><span>Peak strain</span><b>${live.toFixed(0)} µε</b></div><div class="kv"><span>Roof sway</span><b>${sway} mm</b></div><div class="kv"><span>Natural frequency</span><b>${f} Hz</b></div><div class="kv"><span>Energy use</span><b>${b.eui} kWh/m²·yr</b></div><div class="kv"><span>Completed</span><b>${b.year}</b></div>${st}`;
}
function renderCivil() {
  const r = E.report, run = E.run;
  $('#civScen').innerHTML = Object.entries(SCEN).map(([k, s]) => `<button data-scen="${k}" class="${E.scen === k ? 'on' : ''}" ${run ? 'disabled' : ''}><span>${s.i}</span><b>${s.n}</b><small>${s.d}</small></button>`).join('');
  $('#civRep').innerHTML = run ? `<div class="prog"><div style="width:${run.t / run.dur * 100}%"></div></div><p class="muted">Simulating ${SCEN[run.k].n} across ${BL.length} structures…</p>` : r ? `
    <div class="tri"><div class="g"><b>${r.c.safe}</b>safe</div><div class="a"><b>${r.c.monitor}</b>monitor</div><div class="r"><b>${r.c.retrofit}</b>retrofit</div></div>
    <h5>Most stressed structures</h5>${r.top.map(b => `<button class="row" data-b="${b.id}"><i style="background:${b.stress < .35 ? '#4fbf9a' : b.stress < .6 ? '#ffc04a' : '#ff6a5a'}"></i><span>${b.name}<small>${FIX[r.k][b.type]}</small></span><b>${(b.stress * 100).toFixed(0)}%</b></button>`).join('')}
    <div class="btns"><button class="cta" id="civFix">Apply AI retrofits & re-test</button><button class="ghost" id="civClr">Clear</button></div>` : '<p class="muted">Pick a hazard to stress-test every building in the city digital twin. Buildings turn green (safe), amber (monitor) or red (needs retrofit).</p>';
  $('#civInsp').innerHTML = E.insp ? bldCard(E.insp) : '<p class="muted">Click any building in the city to inspect its live structural sensors.</p>';
  $('#civInfra').innerHTML = [['Maglev viaduct', 'strain', 120 + rnd() * 30, 'µε', 97], ['Green bridges (2)', 'deflection', 4 + rnd() * 2, 'mm', 99], ['Ring roads', 'pavement index', 88 + rnd() * 3, '/100', 94], ['Water mains', 'leak detection', rnd() * 2, 'L/s', 98], ['Sponge parks', 'storage used', 22 + rnd() * 8 + (E.scen === 'flood' ? 55 : 0), '%', 96]]
    .map(x => `<div class="kv"><span>${x[0]} · ${x[1]}</span><b>${x[2].toFixed(x[2] < 10 ? 1 : 0)} ${x[3]}</b></div>`).join('');
}
$('#civScen').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) runScenario(b.dataset.scen); });
$('#civRep').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'civFix') { aiLog('civil', applyRetrofits()); } else if (b.id === 'civClr') clearCivil(); else if (b.dataset.b) inspect(BL[+b.dataset.b]); });

/* ================= MECHANICAL ================= */
const T_ICON = { turbine: '🌀', pod: '🚄', heatpump: '♨', pump: '💧', chiller: '❄', digester: '⚙', robot: '🤖' };
const CAUSES = { turbine: ['Blade-pitch bearing wear (vibration 7.8 mm/s at 2× rpm)', 'Generator winding hot-spot', 'Yaw-gear lubrication low'], pod: ['Levitation gap drift on bogie 3', 'Linear-motor coil overheating', 'Brake-pad wear sensor alert'],
  heatpump: ['Refrigerant charge low (COP falling)', 'Compressor valve wear', 'Fouled heat-exchanger coil'], pump: ['Impeller cavitation detected', 'Seal leak (pressure loss)', 'Motor bearing noise'],
  chiller: ['Free-cooling valve stuck', 'Condenser fouling'], digester: ['Agitator torque spike', 'Gas-holder pressure anomaly'], robot: ['Lidar calibration drift', 'Battery cell imbalance'] };
function mkAsset(id, n, type, pos, getPos) { return { id, n, type, pos, getPos, h: 82 + rnd() * 16, st: 'ok', cause: null, tele: {}, ring: null }; }
[[-160, 40], [-165, 70], [-150, 92], [-70, 88]].forEach((p, i) => E.assets.push(mkAsset('T' + (i + 1), `Helix turbine ${i + 1}`, 'turbine', [p[0], 20, p[1]])));
pods.forEach((p, i) => E.assets.push(mkAsset('P' + (i + 1), `Maglev pod ${i + 1}`, 'pod', null, () => p.m.position)));
BL.filter(b => b.hvac).sort((a, b) => b.h - a.h).slice(0, 6).forEach((b, i) => E.assets.push(mkAsset('H' + (i + 1), `Heat pump · ${b.name}`, 'heatpump', b.hvac)));
[[-60, 2, 40, 'Canal pump west'], [95, 2, 30, 'Canal pump east'], [200, 2, 82, 'Lake circulation pump'], [-120, 2, -17, 'Cooling-pond pump']].forEach((p, i) => E.assets.push(mkAsset('W' + (i + 1), p[3], 'pump', p.slice(0, 3))));
E.assets.push(mkAsset('C1', 'Data-hall free cooling A', 'chiller', [-150, 6, -40]), mkAsset('C2', 'Data-hall free cooling B', 'chiller', [-135, 6, -50]), mkAsset('D1', 'Biodigester agitator', 'digester', [-15, 12, 62]));
const ringGeo = new THREE.TorusGeometry(3, .35, 6, 32);
E.assets.forEach(a => { a.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x4fbf9a })); a.ring.rotation.x = Math.PI / 2; a.ring.visible = false; scene.add(a.ring); });
const tele = a => ({ turbine: () => `${(120 + rnd() * 15).toFixed(0)} rpm · vib ${(a.st === 'ok' ? 1.2 + rnd() : 5 + rnd() * 3).toFixed(1)} mm/s`, pod: () => `gap ${(a.st === 'ok' ? 10 + rnd() * .4 : 8.6 + rnd()).toFixed(1)} mm · coil ${(a.st === 'ok' ? 54 + rnd() * 4 : 78 + rnd() * 6).toFixed(0)} °C`,
  heatpump: () => `COP ${(a.st === 'ok' ? 4.2 + rnd() * .4 : 2.6 + rnd() * .4).toFixed(1)} · ${(48 + rnd() * 4).toFixed(0)} °C supply`, pump: () => `${(a.st === 'ok' ? 410 + rnd() * 30 : 300 + rnd() * 30).toFixed(0)} L/s · ${(3.1 + rnd() * .3).toFixed(1)} bar`,
  chiller: () => `PUE ${(a.st === 'ok' ? 1.08 + rnd() * .03 : 1.25 + rnd() * .05).toFixed(2)} · ${(18 + rnd() * 2).toFixed(0)} °C`, digester: () => `${(a.st === 'ok' ? 32 + rnd() * 3 : 55 + rnd() * 8).toFixed(0)} N·m · CH₄ ${(61 + rnd() * 3).toFixed(0)}%` }[a.type] || (() => ''))();
const rul = a => Math.max(1, Math.round((a.h - 40) * 6 + rnd() * 5));
function stAsset(a) { return a.st === 'fault' ? 'fault' : a.st === 'anomaly' ? 'anomaly' : a.h < 70 ? 'warning' : 'ok'; }
function diagnose(id) { const a = E.assets.find(x => x.id === id || x.n.toLowerCase() === String(id).toLowerCase()); if (!a) return 'Unknown asset';
  if (a.st === 'ok' && a.h > 70) return `${a.n}: healthy (${a.h.toFixed(0)}%), ~${rul(a)} days to next service. Telemetry ${tele(a)}.`;
  a.cause = a.cause || CAUSES[a.type][Math.floor(rnd() * CAUSES[a.type].length)]; a.diag = true; renderMech();
  return `${a.n}: ${a.cause}. Health ${a.h.toFixed(0)}%, estimated ${rul(a)} days to failure if untreated. Recommend dispatching a repair drone.`; }
const fixers = [];
function dispatch(id) { const a = E.assets.find(x => x.id === id || x.n.toLowerCase() === String(id).toLowerCase()); if (!a) return 'Unknown asset'; if (a.repair) return `${a.n} already has a drone en route`;
  a.repair = true; const m = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff8a4a, emissiveIntensity: 2 })); m.add(body);
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .1, 12), new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: .5 })); r.position.set(x, .6, z); m.add(r); });
  m.position.set(88, 32, -78); scene.add(m); fixers.push({ m, a, t: 0, from: V(88, 32, -78) }); renderMech(); return `Repair drone dispatched from the vertiport to ${a.n}.`; }
let faultT = 6;
function mechTick(dt) {
  faultT -= dt; if (faultT < 0) { faultT = 14 + rnd() * 14; const ok = E.assets.filter(a => a.st === 'ok' && !a.repair); const a = ok[Math.floor(rnd() * ok.length)];
    if (a) { a.st = rnd() < .35 ? 'fault' : 'anomaly'; a.h = 38 + rnd() * 20; a.cause = null; a.diag = false; mlog(`⚠ ${a.n}: ${a.st} detected by AI vibration/thermal analytics`); if (E.open && E.tab === 'mech') renderMech(); } }
  E.assets.forEach(a => { if (a.st === 'ok') a.h = Math.max(55, a.h - dt * .02); });
  fixers.forEach(f => { f.t += dt / 4; const p = f.a.getPos ? f.a.getPos() : V(...f.a.pos); const k = Math.min(1, f.t), to = V(p.x ?? p[0], (p.y ?? p[1]) + 8, p.z ?? p[2]);
    f.m.position.lerpVectors(f.from, to, k); f.m.position.y += Math.sin(k * Math.PI) * 30; f.m.rotation.y += dt * 3;
    if (f.t >= 1.6) { f.a.st = 'ok'; f.a.h = 97 + rnd() * 3; f.a.repair = false; f.a.cause = null; mlog(`✓ ${f.a.n} repaired and verified by AL-JAZARI`); scene.remove(f.m); f.done = true; if (E.tab === 'mech') renderMech(); } });
  for (let i = fixers.length - 1; i >= 0; i--) if (fixers[i].done) fixers.splice(i, 1);
}
function mlog(t) { E.fleetLog.unshift(t); E.fleetLog = E.fleetLog.slice(0, 30); }
function fleetJSON() { return E.assets.map(a => ({ id: a.id, name: a.n, type: a.type, health: +a.h.toFixed(0), status: stAsset(a), telemetry: tele(a), days_to_service: rul(a), diagnosis: a.cause || null, repair_en_route: !!a.repair })); }
function renderMech() {
  const s = { ok: 0, warning: 0, anomaly: 0, fault: 0 }; E.assets.forEach(a => s[stAsset(a)]++);
  const avail = (100 * (E.assets.length - s.fault) / E.assets.length).toFixed(1);
  $('#mechSum').innerHTML = `<div class="tri q"><div class="g"><b>${s.ok}</b>OK</div><div class="a"><b>${s.warning + s.anomaly}</b>warning</div><div class="r"><b>${s.fault}</b>fault</div><div><b>${avail}%</b>available</div></div>`;
  const order = { fault: 0, anomaly: 1, warning: 2, ok: 3 };
  $('#mechList').innerHTML = E.assets.slice().sort((a, b) => order[stAsset(a)] - order[stAsset(b)] || a.h - b.h).map(a => { const st = stAsset(a), c = st === 'ok' ? '#4fbf9a' : st === 'warning' ? '#ffc04a' : '#ff6a5a';
    return `<div class="asset ${st}"><div class="ah"><span class="ic">${T_ICON[a.type]}</span><div><b>${a.n}</b><small>${tele(a)}</small></div><span class="pill" style="--c:${c}">${a.repair ? 'drone en route' : st}</span></div>
    <div class="bars"><div><i style="width:${a.h}%;background:${c}"></i></div></div><div class="am"><span>Health ${a.h.toFixed(0)}% · ~${rul(a)} d to service</span>${st !== 'ok' ? `<button data-dg="${a.id}">AI diagnose</button><button data-rp="${a.id}" ${a.repair ? 'disabled' : ''}>Dispatch drone</button>` : `<button data-fo="${a.id}">Locate</button>`}</div>${a.cause ? `<p class="fix">${a.cause}</p>` : ''}</div>`; }).join('');
  $('#mechLog').innerHTML = E.fleetLog.slice(0, 8).map(t => `<div>${t}</div>`).join('') || '<p class="muted">Fleet nominal.</p>';
}
$('#mechList').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = E.assets.find(x => x.id === (b.dataset.dg || b.dataset.rp || b.dataset.fo));
  const p = a.getPos ? a.getPos() : V(...a.pos); flyTo([p.x + 40, p.y + 35, p.z + 50], [p.x, p.y, p.z]); controls.autoRotate = false;
  if (b.dataset.dg) aiLog('mech', diagnose(a.id)); if (b.dataset.rp) aiLog('mech', dispatch(a.id)); });
// heat network x-ray
const heatNet = new THREE.Group(); heatNet.visible = false; scene.add(heatNet);
[[[-150, 1, -40], [-100, 1, -10], [-30, 1, 10], [62, 1, 38], [92, 1, 62]], [[-30, 1, 10], [80, 1, 20], [160, 1, 50], [192, 1, 38]], [[-100, 1, -10], [-60, 1, -50], [0, 1, -15], [70, 1, -60]]].forEach((pts, i) => {
  const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p))); heatNet.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: 0xff6a2a, emissiveIntensity: 1.8, transparent: true, opacity: .85 })));
  const c2 = new THREE.CatmullRomCurve3(pts.map(p => V(p[0] + 3, .9, p[2] + 3))); heatNet.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 80, .8, 8), new THREE.MeshStandardMaterial({ color: 0x4ac0ff, emissive: 0x3aa0ff, emissiveIntensity: 1.5, transparent: true, opacity: .85 }))); });
$('#heatX').addEventListener('change', e => { heatNet.visible = e.target.checked; if (e.target.checked) { flyTo([-20, 160, 200], [0, 0, 0]); controls.autoRotate = false; } });

/* ================= SCIENTIFIC ================= */
// --- wind / CFD particles ---
const NP = 2600, cfdGeo = new THREE.BufferGeometry(), cp = new Float32Array(NP * 3), cc = new Float32Array(NP * 3);
cfdGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cfdGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
const cfdPts = new THREE.Points(cfdGeo, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: .9, depthWrite: false })); cfdPts.visible = false; scene.add(cfdPts);
const grid = new Map(); const gk = (x, z) => `${Math.floor(x / 20)},${Math.floor(z / 20)}`;
BL.forEach(b => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = `${Math.floor(b.x / 20) + dx},${Math.floor(b.z / 20) + dz}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); } });
const ps = []; function seedP(i, dir, all) { const dx = Math.cos(dir), dz = Math.sin(dir); const s = (rnd() - .5) * 560, back = all ? (rnd() - .5) * 520 : -280;
  ps[i] = { x: -dx * 260 * (all ? 0 : 1) + (all ? (rnd() - .5) * 480 : 0) - dz * s * (all ? 0 : 1), z: -dz * 260 * (all ? 0 : 1) + (all ? (rnd() - .5) * 220 : 0) + dx * s * (all ? 0 : 1), y: 3 + rnd() * (all ? 40 : 60), sp: 1 };
  if (!all) { ps[i].x = -dx * 260 - dz * s; ps[i].z = -dz * 260 + dx * s; } }
var windT = null, windSeq = 0;
function startCFD(deg, speed = 1, typhoon = false) { clearTimeout(windT); windSeq++; const dir = deg * Math.PI / 180; E.cfd = { dir, speed, typhoon, hot: new Map(), t: 0 }; for (let i = 0; i < NP; i++) seedP(i, dir, true); cfdPts.visible = true; }
function stopCFD() { clearTimeout(windT); windSeq++; E.cfd = null; cfdPts.visible = false; }
function cfdStep(dt) { const C = E.cfd, dx = Math.cos(C.dir), dz = Math.sin(C.dir), U = 38 * C.speed; C.t += dt;
  for (let i = 0; i < NP; i++) { const p = ps[i]; let vx = dx, vz = dz, acc = 1;
    const near = grid.get(gk(p.x, p.z)); if (near) for (const b of near) { if (p.y > b.h + 4) continue; const rx = p.x - b.x, rz = p.z - b.z, R = Math.max(b.w, b.d) * .75 + 3, d = Math.hypot(rx, rz);
      if (d < R * 1.8) { const push = Math.max(0, 1 - d / (R * 1.8)); const nx = rx / (d || 1), nz = rz / (d || 1); const tang = nx * -dz + nz * dx;
        vx += nx * push * 1.4 + (-nz) * Math.sign(tang || 1) * push * .6 * 0; vz += nz * push * 1.4; acc += push * (b.h / 60) * .9;
        if (d < R * 1.2 && b.h > 40) { const key = b.id; C.hot.set(key, (C.hot.get(key) || 0) + push * dt); } } }
    const L = Math.hypot(vx, vz); p.x += vx / L * U * acc * dt; p.z += vz / L * U * acc * dt; p.sp = acc;
    if (Math.abs(p.x) > 300 || Math.abs(p.z) > 170) seedP(i, C.dir, false);
    cp[i * 3] = p.x; cp[i * 3 + 1] = p.y; cp[i * 3 + 2] = p.z; const s = Math.min(1, (acc - 1) * 1.2);
    cc[i * 3] = .45 + s * .55; cc[i * 3 + 1] = .75 + s * .1 - s * s * .35; cc[i * 3 + 2] = 1 - s * .75; }
  cfdGeo.attributes.position.needsUpdate = true; cfdGeo.attributes.color.needsUpdate = true; }
function windStudy(deg = 315, speed = 1) { startCFD(deg, speed); flyTo([0, 260, 260], [0, 0, 0]); controls.autoRotate = false; const id = windSeq, cfd = E.cfd;
  windT = setTimeout(() => { if (id !== windSeq || E.cfd !== cfd) return; const hot = [...E.cfd?.hot || []].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => BL[id]);
    E.windRep = `Wind from ${deg}° at ${(speed * 6).toFixed(0)} m/s. The spine, canals and ring roads act as ventilation corridors, consistent with the Feng Shui siting. Pedestrian wind-comfort hotspots (corner acceleration): ${hot.map(b => b.name + ' (' + b.h.toFixed(0) + ' m)').join(', ') || 'none significant'}. Recommendation: podium canopies and street trees at those corners.`;
    renderSci(); aiLog('sci', E.windRep); }, 3500); return `Running wind study from ${deg}°…`; }
// --- generative tower ---
const SITE = V(40, 0, -42); let tower = null;
const siteRing = new THREE.Mesh(new THREE.RingGeometry(11, 12, 64), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: .7, side: THREE.DoubleSide })); siteRing.rotation.x = -Math.PI / 2; siteRing.position.set(SITE.x, .3, SITE.z); scene.add(siteRing);
const D = { height: 110, twist: 45, timber: 60, gardens: 30, form: 'hex' };
function scoreDesign(d) { const h = d.height, area = h / 3.6 * 90;
  const carbon = Math.round(420 - d.timber * 2.6 + h * .6 + d.gardens * .4), eui = Math.round(70 - d.gardens * .25 - d.twist * .05 + h * .08 - (d.form === 'hex' ? 3 : d.form === 'round' ? 5 : 0));
  const wind = Math.round(Math.max(10, h * .7 - d.twist * .55 - (d.form === 'round' ? 12 : d.form === 'hex' ? 6 : 0))), day = Math.round(Math.min(95, 60 + d.twist * .15 + (d.form === 'round' ? 8 : 4) - d.gardens * .1));
  const cost = Math.round(3200 + h * 9 + d.twist * 12 + d.timber * 4 + d.gardens * 10), bio = Math.round(d.gardens * 1.4 + d.timber * .2);
  const score = Math.round(Math.max(0, Math.min(100, 100 - (carbon - 150) * .12 - (eui - 40) * .5 - wind * .25 + (day - 60) * .3 - (cost - 3500) * .004 + bio * .25)));
  return { carbon, eui, wind, day, cost, bio, score, floors: Math.round(h / 3.6), people: Math.round(area * h / 3.6 / 28 / 3) }; }
function buildTower(d) { if (tower) { scene.remove(tower); const mats = new Set(); tower.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => mats.add(m)); }); mats.forEach(m => m.dispose()); }
  tower = new THREE.Group(); tower.position.copy(SITE); const n = Math.round(d.height / 4), seg = d.form === 'hex' ? 6 : d.form === 'round' ? 28 : 4;
  const tm = new THREE.MeshStandardMaterial({ color: new THREE.Color().lerpColors(new THREE.Color(0xdfe6ea), new THREE.Color(0xc89a62), d.timber / 100), roughness: .6 });
  const gm = new THREE.MeshStandardMaterial({ color: 0x14303e, emissive: 0x3aa0d0, emissiveIntensity: .7, metalness: .5, roughness: .2, transparent: true, opacity: .9 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6, d.height, seg), gm); core.position.y = d.height / 2; tower.add(core);
  for (let i = 0; i < n; i++) { const k = 1 - i / n * .3, y = 2 + i * 4; const s = new THREE.Mesh(new THREE.CylinderGeometry(9 * k, 9 * k, .8, seg), tm); s.position.y = y; s.rotation.y = i / n * d.twist * Math.PI / 180 + (seg === 4 ? Math.PI / 4 : 0); tower.add(s);
    if ((i * 37) % 100 < d.gardens) for (let j = 0; j < 4; j++) { const a = s.rotation.y + j * Math.PI / 2; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: 0x4f9a4a })); b.position.set(Math.cos(a) * 8 * k, y + 1.2, Math.sin(a) * 8 * k); tower.add(b); } }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(5, .35, 6, 40), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x9fd0ff, emissiveIntensity: 2.5 })); crown.rotation.x = Math.PI / 2; crown.position.y = d.height + 1; tower.add(crown);
  scene.add(tower); }
function design(p = {}) { Object.assign(D, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null)));
  D.height = Math.max(40, Math.min(160, +D.height)); D.twist = Math.max(0, Math.min(90, +D.twist)); D.timber = Math.max(0, Math.min(100, +D.timber)); D.gardens = Math.max(0, Math.min(60, +D.gardens)); if (!['hex', 'round', 'square'].includes(D.form)) D.form = 'hex';
  buildTower(D); syncSliders(); renderDesign(); const s = scoreDesign(D);
  return `Design: ${D.height} m ${D.form}, ${D.twist}° twist, ${D.timber}% timber, ${D.gardens}% sky gardens → AI score ${s.score}/100 (carbon ${s.carbon} kgCO₂e/m², EUI ${s.eui}, wind load ${s.wind}, daylight ${s.day}%, $${s.cost}/m²).`; }
function optimize() { let best = null; for (let i = 0; i < 400; i++) { const c = { height: 60 + Math.round(rnd() * 100), twist: Math.round(rnd() * 90), timber: Math.round(rnd() * 100), gardens: Math.round(rnd() * 60), form: ['hex', 'round', 'square'][Math.floor(rnd() * 3)] };
    const s = scoreDesign(c).score + c.height * .06; if (!best || s > best.s) best = { c, s }; } return 'AI explored 400 generative variants. Best: ' + design(best.c); }
function syncSliders() { ['height', 'twist', 'timber', 'gardens'].forEach(k => { const el = $(`#ds-${k}`); if (el) { el.value = D[k]; $(`#dv-${k}`).textContent = D[k] + (k === 'height' ? ' m' : k === 'twist' ? '°' : '%'); } }); document.querySelectorAll('#dsForm button').forEach(b => b.classList.toggle('on', b.dataset.f === D.form)); }
function renderDesign() { const s = scoreDesign(D); $('#dsScore').innerHTML = `<div class="ring" style="--p:${s.score}"><b>${s.score}</b><span>AI score</span></div>
  <div class="ms">${[['Embodied carbon', s.carbon, 'kgCO₂e/m²', s.carbon < 250], ['Energy use', s.eui, 'kWh/m²·yr', s.eui < 55], ['Wind load index', s.wind, '', s.wind < 50], ['Daylight', s.day, '%', s.day > 70], ['Cost', '$' + s.cost.toLocaleString(), '/m²', s.cost < 4200], ['Biodiversity', s.bio, 'pts', s.bio > 40]].map(m => `<div><span>${m[0]}</span><b class="${m[3] ? 'gd' : ''}">${m[1]}<small> ${m[2]}</small></b></div>`).join('')}</div>`; }
// --- materials discovery ---
const MATS = [['Geopolymer concrete (fly-ash/slag)', 95, 48, 1.05, 'TRL 8'], ['Self-healing bio-concrete', 160, 42, 1.3, 'TRL 7'], ['Hempcrete infill', -110, 2, .9, 'TRL 9'], ['Mycelium composite panels', -40, 1.5, .7, 'TRL 6'], ['CLT + glulam hybrid', -500, 30, 1.1, 'TRL 9'], ['Carbon-cured CO₂-mineralized block', -60, 25, 1.0, 'TRL 7'], ['Bamboo-fiber reinforced polymer', 30, 180, 1.4, 'TRL 6'], ['Recycled-aggregate UHPC', 210, 140, 1.6, 'TRL 8']];
function materials() { if (E.mats?.run) return 'Search already running'; E.mats = { run: true, t: 0 }; renderMats();
  return 'AI materials search launched: screening 12,000 candidate formulations with a property-prediction model…'; }
const cityCarbon = () => { let base = BL.reduce((s, b) => s + b.carbon * b.area, 0) / 1e6; E.adopted.forEach(i => base *= MATS[i][1] < 0 ? .86 : .93); return base; };
function renderMats() { const M = E.mats;
  $('#matRes').innerHTML = !M ? '<p class="muted">Let the AI screen thousands of low-carbon formulations for the city\'s next buildings.</p>' : M.run ? `<div class="prog"><div style="width:${Math.min(100, M.t / 4 * 100)}%"></div></div><p class="muted mono">${Math.round(Math.min(1, M.t / 4) * 12000).toLocaleString()} candidates screened…</p>`
    : `<table class="mt"><tr><th>Material</th><th>kgCO₂e/m³</th><th>MPa</th><th>Cost×</th><th></th></tr>${MATS.map((m, i) => `<tr><td>${m[0]}<small>${m[4]}</small></td><td class="${m[1] < 0 ? 'gd' : ''}">${m[1]}</td><td>${m[2]}</td><td>${m[3]}</td><td><button data-mat="${i}" class="${E.adopted.has(i) ? 'on' : ''}">${E.adopted.has(i) ? '✓ Adopted' : 'Adopt'}</button></td></tr>`).join('')}</table>`;
  $('#cityC').textContent = cityCarbon().toFixed(0); }
$('#matRes').addEventListener('click', e => { const b = e.target.closest('button[data-mat]'); if (!b) return; const i = +b.dataset.mat; E.adopted.has(i) ? E.adopted.delete(i) : E.adopted.add(i); renderMats(); });
function renderSci() { $('#windRep').innerHTML = E.windRep ? `<p class="fix">${E.windRep}</p>` : ''; renderDesign(); renderMats(); }
$('#windGo').onclick = () => aiLog('sci', windStudy(+$('#windDir').value, +$('#windSpd').value));
$('#windStop').onclick = () => { stopCFD(); E.windRep = null; renderSci(); };
$('#windDir').oninput = e => $('#windDirV').textContent = e.target.value + '°';
['height', 'twist', 'timber', 'gardens'].forEach(k => $(`#ds-${k}`).addEventListener('input', e => design({ [k]: +e.target.value })));
document.querySelectorAll('#dsForm button').forEach(b => b.onclick = () => design({ form: b.dataset.f }));
$('#dsOpt').onclick = () => { aiLog('sci', optimize()); flyTo([SITE.x + 90, 90, SITE.z + 110], [SITE.x, 50, SITE.z]); };
$('#dsView').onclick = () => { flyTo([SITE.x + 90, 90, SITE.z + 110], [SITE.x, 50, SITE.z]); controls.autoRotate = false; };
$('#matGo').onclick = () => aiLog('sci', materials());

/* ================= AI ENGINEER CONSOLES (Claude + tools) ================= */
const TOOLS = {
  civil: [
    { name: 'run_stress_test', description: 'Run a city-wide structural stress test in the digital twin', inputSchema: { type: 'object', properties: { scenario: { type: 'string', enum: ['quake', 'typhoon', 'flood', 'heat'] } }, required: ['scenario'] }, execute: i => runScenario(i.scenario) },
    { name: 'get_results', description: 'Get the latest stress-test summary (wait ~3 s after starting a test)', inputSchema: { type: 'object', properties: {} }, execute: () => new Promise(r => { const w = () => E.run ? setTimeout(w, 400) : r(summary()); w(); }) },
    { name: 'apply_retrofits', description: 'Apply AI-designed retrofits to all monitor/retrofit structures for the last scenario and re-test', inputSchema: { type: 'object', properties: {} }, execute: () => applyRetrofits() },
    { name: 'inspect_building', description: 'Inspect a building by name and fly the camera to it', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }, execute: i => { const b = BL.find(x => x.name.toLowerCase() === i.name.toLowerCase()) || BL.find(x => x.name.toLowerCase().includes(i.name.toLowerCase())); if (!b) return 'Not found'; inspect(b); return `${b.name}: ${b.type}, ${b.h.toFixed(0)} m, ${b.floors} floors, SHM ${b.shm.toFixed(1)}%, stress ${(b.stress * 100).toFixed(0)}%`; } },
  ],
  mech: [
    { name: 'get_fleet', description: 'Live telemetry and health of all machines', inputSchema: { type: 'object', properties: {} }, execute: () => fleetJSON() },
    { name: 'diagnose', description: 'Run AI root-cause diagnosis on an asset by id (e.g. T2, P4, H1)', inputSchema: { type: 'object', properties: { asset: { type: 'string' } }, required: ['asset'] }, execute: i => diagnose(i.asset) },
    { name: 'dispatch_repair', description: 'Send a repair drone to an asset by id', inputSchema: { type: 'object', properties: { asset: { type: 'string' } }, required: ['asset'] }, execute: i => dispatch(i.asset) },
  ],
  sci: [
    { name: 'run_wind_study', description: 'Run the CFD wind study over the city', inputSchema: { type: 'object', properties: { direction_deg: { type: 'number' }, speed: { type: 'number', description: '0.5–2.5' } } }, execute: i => windStudy(i.direction_deg ?? 315, i.speed ?? 1) },
    { name: 'design_tower', description: 'Set the generative tower parameters at the design site', inputSchema: { type: 'object', properties: { height: { type: 'number' }, twist: { type: 'number' }, timber: { type: 'number' }, gardens: { type: 'number' }, form: { type: 'string', enum: ['hex', 'round', 'square'] } } }, execute: i => design(i) },
    { name: 'optimize_tower', description: 'Let the AI search 400 generative variants for the best score', inputSchema: { type: 'object', properties: {} }, execute: () => optimize() },
    { name: 'run_materials_search', description: 'Screen low-carbon material formulations', inputSchema: { type: 'object', properties: {} }, execute: () => materials() },
  ],
};
const ctx = k => k === 'civil' ? { structures: BL.length, by_type: ['glass', 'resi', 'timber', 'lab'].map(t => `${t}: ${BL.filter(b => b.type === t).length}`), last_test: summary(), inspecting: E.insp ? E.insp.name : null }
  : k === 'mech' ? { fleet: fleetJSON().filter(a => a.status !== 'ok').concat(fleetJSON().filter(a => a.status === 'ok').slice(0, 4)), assets_total: E.assets.length }
  : { tower_design: { ...D, ...scoreDesign(D) }, wind_report: E.windRep || null, adopted_materials: [...E.adopted].map(i => MATS[i][0]), city_embodied_carbon_kt: +cityCarbon().toFixed(0) };
const hist = { civil: [], mech: [], sci: [] };
function aiLog(k, text, who = 'sys') { hist[k].push({ who, text }); renderAI(k); }
function renderAI(k) { const el = $(`#ai-${k} .log`); el.innerHTML = hist[k].slice(-12).map(m => `<div class="m ${m.who}">${m.text}</div>`).join(''); el.scrollTop = el.scrollHeight; }
async function ask(k, q) {
  const P = PERS[k]; aiLog(k, escH(q), 'user');
  if (!sample) { const t = TOOLS[k]; let r;
    if (/quake|earthquake|seismic/i.test(q) && k === 'civil') r = runScenario('quake'); else if (/wind|typhoon/i.test(q) && k === 'civil') r = runScenario('typhoon'); else if (/flood/i.test(q) && k === 'civil') r = runScenario('flood'); else if (/retrofit|fix/i.test(q) && k === 'civil') r = applyRetrofits();
    else if (k === 'mech') { const bad = E.assets.filter(a => stAsset(a) !== 'ok'); r = /repair|fix|dispatch/i.test(q) && bad[0] ? dispatch(bad[0].id) : bad.length ? `${bad.length} assets need attention: ${bad.map(a => `${a.id} ${a.n} (${stAsset(a)})`).join(', ')}. Ask me to repair them.` : 'All machines nominal.'; }
    else if (k === 'sci') r = /optim|best/i.test(q) ? optimize() : /wind|air/i.test(q) ? windStudy(315, 1) : /material/i.test(q) ? materials() : design({});
    else r = summary();
    aiLog(k, `${P.name}: ${r} <em>(built-in mode)</em>`, 'ai'); return; }
  const h = hist[k].filter(m => m.who === 'user' || m.who === 'ai').slice(-6, -1).map(m => `${m.who === 'user' ? 'Engineer' : P.name}: ${m.text.replace(/<[^>]+>/g, '')}`).join('\n');
  const prompt = `You are ${P.name}, the ${P.title} of Civitas Sapientia, an AI eco-city of ${BL.length} buildings run as a live digital twin. ${P.wis}. Voice: ${P.voice}. You work for the human engineer and act through your tools on the live 3D simulation. Use tools when asked to test, design, diagnose or fix, then report concrete numbers from the tool results in 3–6 sentences. Make clear these are simulated digital-twin results, and that a licensed engineer signs off on real works. No markdown headers.\n\nLive context: ${JSON.stringify(ctx(k))}\n${h ? 'Recent conversation:\n' + h + '\n' : ''}\nEngineer: ${q}`;
  const el = $(`#ai-${k} .log`); const live = document.createElement('div'); live.className = 'm ai'; live.innerHTML = `<b>${P.name}</b> <span class="dots">working</span>`; el.appendChild(live); el.scrollTop = el.scrollHeight;
  try { const acts = [];
    const tools = TOOLS[k].map(t => ({ ...t, execute: async i => { const r = await t.execute(i); acts.push(t.name); const s = typeof r === 'string' ? r : JSON.stringify(r); return s; } }));
    const res = await sample(prompt, { cache: false, tools, onText: ({ text }) => { live.innerHTML = `<b>${P.name}</b> ${escH(text)}`; el.scrollTop = el.scrollHeight; } });
    live.remove(); aiLog(k, `<b>${P.name}</b> ${escH(res.text)}${acts.length ? `<div class="acts">${acts.map(a => `<span>⚙ ${a}</span>`).join('')}</div>` : ''}`, 'ai');
  } catch (e) { live.remove(); aiLog(k, `${P.name}: ${e.code === 'rate_limited' ? 'The channel is busy; try again shortly.' : 'Live AI is unavailable right now. Use the controls above, or ask again.'}`, 'ai'); if (e.code === 'not_granted') sample = null; }
}
document.querySelectorAll('.aicon').forEach(f => { const k = f.dataset.k;
  f.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const i = f.querySelector('input'); const v = i.value.trim(); if (v) { i.value = ''; ask(k, v); } });
  f.querySelector('.sug').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(k, b.textContent); }); });

/* ================= PANEL ================= */
function switchTab(t) { E.tab = t; document.querySelectorAll('#etabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('.et').forEach(c => c.classList.toggle('on', c.id === 'et-' + t));
  const P = PERS[t]; $('#engPers').innerHTML = `<div class="av" style="--c:${P.c}">${P.name[0]}</div><div><b style="color:${P.c}">${P.name}</b><small>${P.title} · ${P.wis.split(':')[0]}</small></div>`;
  E.assets.forEach(a => a.ring.visible = E.open && t === 'mech'); siteRing.visible = true;
  if (t === 'civil') renderCivil(); if (t === 'mech') renderMech(); if (t === 'sci') { renderSci(); if (!tower) design({}); } }
document.querySelectorAll('#etabs button').forEach(b => b.onclick = () => switchTab(b.dataset.t));
function openEng(on = !E.open) { E.open = on; document.body.classList.toggle('eng', on);
  if (on) { if (document.body.classList.contains('council')) $('#councilClose').click(); $('#chat').classList.remove('on'); document.body.classList.remove('infoOpen'); if (mode !== 'orbit') setMode('orbit'); switchTab(E.tab); }
  else { E.assets.forEach(a => a.ring.visible = false); } }
$('#engBtn').onclick = () => openEng(); $('#engClose').onclick = () => openEng(false);
$('#councilBtn').addEventListener('click', () => { if (E.open) openEng(false); });

let uiT = 0;
window.ENG = { inspect, close: () => openEng(false),
  frame(dt, T) {
    if (E.run) { E.run.t += dt; const r = E.run, k = r.t / r.dur;
      if (r.k === 'quake') { const R = k * 420; if (quakeRing) { quakeRing.scale.setScalar(R / 2); quakeRing.material.opacity = Math.max(0, 1 - k); } BL.forEach(b => { if (!b.tinted && Math.hypot(b.x - r.epi[0], b.z - r.epi[1]) < R) { b.tinted = true; window.BLD.setColor(b, col3(b.stress)); } }); }
      else if (r.k === 'typhoon') { const dx = Math.cos(r.epi[2]), dz = Math.sin(r.epi[2]); const front = -260 + k * 520; BL.forEach(b => { if (!b.tinted && b.x * dx + b.z * dz < front) { b.tinted = true; window.BLD.setColor(b, col3(b.stress)); } }); }
      else if (r.k === 'flood') { if (flood) flood.position.y = Math.min(3.2, k * 3.2); BL.forEach(b => { if (!b.tinted && b.z > 100 - k * 140) { b.tinted = true; window.BLD.setColor(b, col3(b.stress)); } }); }
      else BL.forEach(b => { if (!b.tinted && rnd() < k * .06) { b.tinted = true; window.BLD.setColor(b, col3(b.stress)); } });
      if (r.t >= r.dur) { const s = finishScenario(); aiLog('civil', s); } else if ((T * 10 | 0) % 3 === 0 && E.tab === 'civil') { const pb = $('#civRep .prog div'); if (pb) pb.style.width = (k * 100) + '%'; } }
    if (E.shake > 0) { E.shake -= dt; const a = Math.min(1, E.shake) * 1.6; camera.position.x += (rnd() - .5) * a; camera.position.y += (rnd() - .5) * a * .6; }
    if (E.cfd) cfdStep(dt);
    if (E.mats?.run) { E.mats.t += dt; if (E.mats.t > 4) { E.mats.run = false; aiLog('sci', `Screened 12,000 formulations. Top picks: CLT + glulam hybrid (−500 kgCO₂e/m³, carbon-negative), hempcrete (−110) and CO₂-mineralized block (−60). Adopting them can cut new-build embodied carbon by 14–40%.`); } if (E.tab === 'sci') renderMats(); }
    mechTick(dt);
    E.assets.forEach(a => { if (!a.ring.visible) return; const p = a.getPos ? a.getPos() : V(...a.pos); a.ring.position.set(p.x, p.y + 4 + Math.sin(T * 3) * .5, p.z); const st = stAsset(a);
      a.ring.material.color.set(st === 'ok' ? 0x4fbf9a : st === 'warning' ? 0xffc04a : 0xff4a4a); a.ring.scale.setScalar(st === 'ok' ? 1 : 1.2 + Math.sin(T * 8) * .25); });
    siteRing.material.opacity = .4 + Math.sin(T * 2) * .25;
    uiT += dt; if (uiT > 1.2) { uiT = 0; if (E.open && E.tab === 'civil' && !E.run) { $('#civInfra') && renderCivilLive(); } if (E.open && E.tab === 'mech') renderMech(); if (!E.open && E.insp && document.body.classList.contains('infoOpen') && $('#info h2')?.textContent === E.insp.name) $('#info').innerHTML = bldCard(E.insp); }
  } };
function renderCivilLive() { $('#civInsp').innerHTML = E.insp ? bldCard(E.insp) : $('#civInsp').innerHTML; }
switchTab('civil'); document.body.classList.remove('eng');
})();
