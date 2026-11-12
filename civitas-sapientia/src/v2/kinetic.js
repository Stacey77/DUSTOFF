
/* =====================================================================
   KINETIC HARVEST: footstep tiles, regen braking, road humps, wake turbines
   ===================================================================== */
(() => {
const rnd = Math.random;
const K = { steps: 0, stepRate: 0, stops: 0, stopRate: 0, humps: 0, humpRate: 0, podStops: 0, podRate: 0, t0: 0, hist: [], last: performance.now() };
const CARS = window.CARS || [];
// --- regen underglow per car ---
const ugGeo = new THREE.PlaneGeometry(2.6, 4.6); ugGeo.rotateX(-Math.PI / 2);
CARS.forEach(c => { const m = new THREE.Mesh(ugGeo, new THREE.MeshBasicMaterial({ color: 0x5affc8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.y = -.68; c.m.add(m); c.ug = m; c.brk = 0; c.prevT = c.t; });
// --- electromagnetic energy humps across every boulevard ---
const HUMPS = []; const humpMat = () => new THREE.MeshStandardMaterial({ color: 0x2a3a44, emissive: 0x3affc8, emissiveIntensity: .2, metalness: .5, roughness: .4 });
for (let s = 0; s < 8; s++) { const a = SPOKE(s); [60, 100, 160, 196].forEach(r => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, .25, 9), humpMat()); const p = PO(r, a, .22); m.position.set(...p); m.rotation.y = -a; scene.add(m); HUMPS.push({ m, x: p[0], z: p[2], f: 0 }); }); }
// --- vehicle-wake micro turbines in boulevard medians ---
const TURBS = []; for (let s = 0; s < 8; s++) { const a = SPOKE(s); for (let r = 52; r < 226; r += 22) { if (Math.abs(r - 129) < 9 || Math.abs(r - 210) < 6) continue; const p = PO(r, a); TURBS.push({ x: p[0], z: p[2], rot: rnd() * 6, w: .5 }); } }
const tPole = new THREE.CylinderGeometry(.06, .08, 3, 5); tPole.translate(0, 1.5, 0);
const tBlade = (() => { const parts = []; for (let i = 0; i < 3; i++) { const b = new THREE.BoxGeometry(.05, 1.6, .5); b.translate(.45, 3.6, 0); b.rotateY(i * Math.PI * 2 / 3); parts.push(b); } const hub = new THREE.CylinderGeometry(.08, .08, 1.8, 6); hub.translate(0, 3.6, 0); parts.push(hub); return mergeGeometries(parts); })();
const poleIM = new THREE.InstancedMesh(tPole, new THREE.MeshStandardMaterial({ color: 0x8a949a, metalness: .6, roughness: .4 }), TURBS.length);
const bladeIM = new THREE.InstancedMesh(tBlade, new THREE.MeshStandardMaterial({ color: 0xeef2f4, metalness: .3, roughness: .35, emissive: 0x3affc8, emissiveIntensity: .1 }), TURBS.length);
const d = new THREE.Object3D(); TURBS.forEach((t, i) => { d.position.set(t.x, 0, t.z); d.rotation.set(0, 0, 0); d.updateMatrix(); poleIM.setMatrixAt(i, d.matrix); }); scene.add(poleIM, bladeIM);
// --- maglev stations (regen braking) at each boulevard crossing ---
const ST = Array.from({ length: 8 }, (_, s) => SPOKE(s));
const podGlow = pods.map(p => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.6, .25, 8, 32), new THREE.MeshBasicMaterial({ color: 0x5affc8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(m); return m; });

// ---------- physics constants (real-world orders of magnitude) ----------
const J_STEP = 3;                      // J per footstep on an electromagnetic floor tile
const CAR_M = 1600, CAR_V = 13.9, ETA_REGEN = .65;                 // kg, m/s (50 km/h), regen efficiency
const J_STOP = .5 * CAR_M * CAR_V * CAR_V * ETA_REGEN;             // ≈ 100 kJ per stop recovered
const J_HUMP = 600;                    // J per vehicle crossing an EM speed hump
const POD_M = 22000, POD_V = 25, J_POD = .5 * POD_M * POD_V * POD_V * .6; // ≈ 4.1 MJ per maglev stop
const W_TURB = 60;                     // W average per median wake turbine in traffic
const W_SUSP = 80;                     // W per cruising vehicle from regenerative suspension
const CITY_PEOPLE = 120000 * .25, CITY_CARS = 9000 * .3;           // city-scale: people walking at any time, cars moving
const SIM_PEOPLE = () => window.REAL ? 1100 : 1, SIM_CARS = () => Math.max(1, CARS.length);
function rates() { const pW = K.stepRate * J_STEP, cW = K.stopRate * J_STOP, hW = K.humpRate * J_HUMP, tW = TURBS.length * W_TURB * Math.min(1, CARS.length / 40), sW = CARS.length * W_SUSP, mW = K.podRate * J_POD;
  const sp = CITY_PEOPLE / SIM_PEOPLE(), sc = CITY_CARS / SIM_CARS();
  return { live: { feet: pW, regen: cW, humps: hW, wake: tW, susp: sW, maglev: mW }, city: { feet: pW * sp, regen: cW * sc, humps: hW * sc, wake: tW * 20, susp: sW * sc, maglev: mW * 3 } }; }
const fmt = w => w >= 1e6 ? (w / 1e6).toFixed(2) + ' MW' : w >= 1e3 ? (w / 1e3).toFixed(1) + ' kW' : w.toFixed(0) + ' W';
function html() { const R = rates(), L = R.live, C = R.city, tot = o => Object.values(o).reduce((a, b) => a + b, 0);
  const rows = [['👣', 'Footstep tiles', 'Electromagnetic floor tiles, ~3 J per step', 'feet'], ['🚗', 'Regenerative braking', 'Motors run as generators when vehicles slow down', 'regen'], ['〰', 'Energy speed humps', 'Electromagnetic plates pressed by passing wheels', 'humps'], ['🌀', 'Wake micro-turbines', 'Median turbines spun by passing traffic', 'wake'], ['🛞', 'Regenerative suspension', 'Shock absorbers that generate power over bumps', 'susp'], ['🚄', 'Maglev regen braking', 'Pods return braking energy at every station', 'maglev']];
  return `<h5>Kinetic harvest: people &amp; vehicles in motion</h5>
  <div class="kchain"><span>Motion</span><i>→</i><span>Generator / piezo<small>AC pulses</small></span><i>→</i><span>Rectifier<small>48 V DC bus</small></span><i>→</i><span>Supercaps + battery</span><i>→</i><span>Inverter<small>400 V AC · 60 Hz</small></span><i>→</i><span>Tesla relays</span></div>
  <table class="mt kt"><tr><th>Source</th><th>Live crowd</th><th>City scale</th></tr>${rows.map(r => `<tr><td>${r[0]} ${r[1]}<small>${r[2]}</small></td><td>${fmt(L[r[3]])}</td><td class="gd">${fmt(C[r[3]])}</td></tr>`).join('')}
  <tr><td><b>Total</b></td><td><b>${fmt(tot(L))}</b></td><td class="gd"><b>${fmt(tot(C))}</b></td></tr></table>
  <div class="kv"><span>Steps / min (visible crowd)</span><b>${Math.round(K.stepRate * 60).toLocaleString()}</b></div><div class="kv"><span>Vehicle regen stops / min</span><b>${Math.round(K.stopRate * 60)}</b></div><div class="kv"><span>Share of city demand</span><b>${(tot(C) / 72e6 * 100).toFixed(1)}%</b></div>
  <p class="hint">City scale assumes ~30,000 people walking and ~2,700 vehicles moving at any moment. Kinetic harvesting is a real but modest supplement, and its biggest wins are regenerative braking and the maglev. Footstep power is small per step but lights up, and powers, the streets it is collected from.</p>`; }

window.KIN = { html, rates, cityMW: () => { const C = rates().city; return Object.values(C).reduce((a, b) => a + b, 0) / 1e6; },
  step(n) { K.steps += n; },
  frame(dt, T) {
    // regen braking detection: spoke cars slow near ends & ring crossings; ring cars at boulevard crossings
    CARS.forEach(c => { const p = c.m.position, r = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x);
      let brake = 0; if (c.loop) { for (const s of ST) { let dd = Math.abs(a - s); dd = Math.min(dd, Math.PI * 2 - dd); if (dd * r < 9) brake = 1; } } else if (r < 52 || r > 236 || Math.abs(r - 72) < 7 || Math.abs(r - 129) < 6) brake = 1;
      if (brake && !c.brk) K.stops++; c.brk = brake; c.ug.material.opacity += ((brake ? .75 : 0) - c.ug.material.opacity) * Math.min(1, dt * 8); });
    HUMPS.forEach(h => { let hit = 0; for (const c of CARS) { const p = c.m.position; if (Math.abs(p.x - h.x) < 3 && Math.abs(p.z - h.z) < 3) { hit = 1; break; } } if (hit && !h.on) { K.humps++; h.f = 1; } h.on = hit; h.f = Math.max(0, h.f - dt * 2); h.m.material.emissiveIntensity = .2 + h.f * 2.4; });
    TURBS.forEach((t, i) => { let near = 0; for (const c of CARS) { const p = c.m.position; if (Math.abs(p.x - t.x) < 10 && Math.abs(p.z - t.z) < 10) { near = 1; break; } } t.w += ((near ? 9 : 1.2) - t.w) * Math.min(1, dt * 1.5); t.rot += t.w * dt;
      d.position.set(t.x, 0, t.z); d.rotation.set(0, t.rot, 0); d.updateMatrix(); bladeIM.setMatrixAt(i, d.matrix); }); bladeIM.instanceMatrix.needsUpdate = true;
    pods.forEach((p, i) => { const pos = p.m.position, a = Math.atan2(pos.z, pos.x); let st = 0; for (const s of ST) { let dd = Math.abs(a - s); dd = Math.min(dd, Math.PI * 2 - dd); if (dd < .05) st = 1; } if (st && !p.st) K.podStops++; p.st = st;
      const g = podGlow[i]; g.position.copy(pos); g.lookAt(0, pos.y, 0); g.material.opacity += ((st ? .9 : 0) - g.material.opacity) * Math.min(1, dt * 6); });
    // rolling rates
    K.t0 += dt; if (K.t0 >= 2) { K.stepRate = K.steps / K.t0; K.stopRate = K.stops / K.t0; K.humpRate = K.humps / K.t0; K.podRate = K.podStops / K.t0; K.steps = K.stops = K.humps = K.podStops = 0; K.t0 = 0; }
  } };
})();
