var escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =====================================================================
   SYMBIOSIS ENGINE + SYNTHETIC AI COUNCIL
   ===================================================================== */
(() => {
const KEYS = ['water', 'food', 'energy', 'compute', 'soil', 'healing', 'habitat', 'people'];
const AG = {
  water:   { name: 'AQUA',  title: 'Steward of Water',   wis: 'Feng Shui & the Tao: flow like water and follow the path of least harm', voice: 'calm, fluid, patient', res: 'clean water', unit: 'ML', base: 62, pos: [-75, 0, 40] },
  food:    { name: 'VERDA', title: 'Steward of Food',    wis: 'Three Sisters companion planting: crops that support each other', voice: 'warm, practical, generous', res: 'fresh food', unit: 't', base: 31, pos: [80, 0, 50] },
  energy:  { name: 'SOLIS', title: 'Steward of Energy',  wis: 'Vitruvian triad: strength, utility, beauty', voice: 'precise, energetic, confident', res: 'clean power', unit: 'MW', base: 60, pos: [-110, 0, 55] },
  compute: { name: 'LOGOS', title: 'Steward of Compute', wis: 'Socratic method: question everything, including yourself', voice: 'analytical and curious; often asks a sharp question back', res: 'recovered heat & insight', unit: 'MWh', base: 48, pos: [-150, 0, -55] },
  soil:    { name: 'HUMUS', title: 'Steward of Soil',    wis: 'Terra preta: nothing is waste; death feeds life', voice: 'humble, earthy, unhurried', res: 'compost & biogas', unit: 't', base: 31, pos: [-15, 0, 62] },
  healing: { name: 'SALUS', title: 'Steward of Healing', wis: 'Hippocratic oath: first, do no harm; clinicians decide', voice: 'gentle, caring, clinically careful', res: 'wellbeing', unit: 'pts', base: 40, pos: [165, 0, 55] },
  habitat: { name: 'SYLVA', title: 'Steward of Habitat', wis: 'Seventh Generation: judge every act by its effect 150 years out', voice: 'wild, poetic, protective', res: 'ecosystem services', unit: 'pts', base: 38, pos: [-30, 0, -95] },
  people:  { name: 'AGORA', title: 'Steward of People',  wis: 'Ubuntu: I am because we are', voice: 'communal, democratic, upbeat', res: 'stewardship & care', unit: 'pts', base: 40, pos: [0, 0, -15] },
};
// [from, to, demand per tick, what it is]
const LINKS = [
  ['water', 'food', 18, 'irrigation'], ['water', 'healing', 8, 'bath & therapy water'], ['water', 'habitat', 10, 'wetland flows'], ['water', 'people', 14, 'drinking water'], ['water', 'compute', 8, 'cooling water'],
  ['energy', 'compute', 22, 'server power'], ['energy', 'food', 12, 'grow lights'], ['energy', 'people', 16, 'homes & transit'], ['energy', 'water', 6, 'pumps & treatment'],
  ['compute', 'healing', 12, 'heat for thermal baths'], ['compute', 'food', 12, 'greenhouse heat'], ['compute', 'people', 18, 'district heat'],
  ['food', 'people', 18, 'meals'], ['food', 'healing', 6, 'food-as-medicine'], ['food', 'soil', 4, 'crop residue'],
  ['soil', 'food', 14, 'compost'], ['soil', 'habitat', 6, 'living soil'], ['soil', 'energy', 8, 'biogas'],
  ['habitat', 'water', 12, 'natural filtration'], ['habitat', 'food', 10, 'pollination'], ['habitat', 'healing', 10, 'forest bathing'],
  ['healing', 'people', 30, 'wellbeing'],
  ['people', 'soil', 16, 'organic scraps'], ['people', 'habitat', 10, 'volunteer stewardship'], ['people', 'healing', 8, 'community care'],
].map(([f, t, d, what]) => ({ f, t, d, what, w: 1, flow: 0, sat: 1, ph: Math.random() }));

const EVENTS = {
  heatwave:   { n: 'Heatwave', i: '🔥', dur: 40, d: 'Water output −30%, cooling & power demand up, people and habitat stressed', out: { water: .7 }, dem: { compute: 1.35, people: 1.3, healing: 1.2 }, dmg: { people: .25, habitat: .2 } },
  storm:      { n: 'Superstorm', i: '⛈', dur: 25, d: 'Solar −50%, sponge parks capture +40% water, habitat damaged', out: { energy: .5, water: 1.4 }, dmg: { habitat: .6 } },
  drought:    { n: 'Drought', i: '🏜', dur: 60, d: 'Water output −55% for 60 hours', out: { water: .45 } },
  datasurge:  { n: 'AI data surge', i: '⚡', dur: 30, d: 'Compute needs +80% power, and puts out +60% heat', dem: { compute: 1.8 }, out: { compute: 1.6 } },
  blight:     { n: 'Crop blight', i: '🦠', dur: 40, d: 'Food output −50%', out: { food: .5 }, dmg: { food: .2 } },
  festival:   { n: 'Solstice festival', i: '🏮', dur: 20, d: 'People need +40% food and energy, give back +60% stewardship', dem: { people: 1.4 }, out: { people: 1.6 } },
  gridfault:  { n: 'Grid fault', i: '🔌', dur: 15, d: 'Power output −70%', out: { energy: .3 } },
  pollinator: { n: 'Pollinator bloom', i: '🐝', dur: 40, d: 'Habitat +40%, food +20%', out: { habitat: 1.4, food: 1.2 } },
};

/* ---------- state ---------- */
const S = { tick: 0, speed: 1, mode: 'auto', eq: .7, insight: 0, insightT: 0, events: [], props: [], feed: [], open: false, tab: 'net' };
const N = {}; KEYS.forEach(k => N[k] = { k, h: 88 + Math.random() * 8, R: 40, cap: 1, boostT: 0, consT: 0, cool: 0, P: 0, lastTop: null, mood: 'steady', last: '—' });
const col = k => '#' + new THREE.Color(ECO[k].c).getHexString();
const evMod = (k, key) => S.events.reduce((m, e) => m * ((EVENTS[e.id][key] || {})[k] || 1), 1);

/* ---------- actions (shared by rules, humans and Claude) ---------- */
const ACT = {
  boost: { label: 'Boost capacity +25% for 30 h', run: k => { N[k].boostT = 30; return `${AG[k].name} boosted capacity +25% (inputs needed rise 15%)`; } },
  conserve: { label: 'Conserve: cut demand 25% for 30 h', run: k => { N[k].consT = 30; return `${AG[k].name} entered conservation mode (−25% demand)`; } },
  reserve: { label: 'Release reserves to partners', run: k => { const amt = Math.min(N[k].R, 30); N[k].R -= amt; N[k].burst = (N[k].burst || 0) + amt; return `${AG[k].name} released ${amt.toFixed(0)} ${AG[k].unit} from reserves`; } },
  optimize: { label: 'Run city-wide AI optimization (+10% all outputs, 30 h)', only: 'compute', run: () => { S.insight = .1; S.insightT = 30; return `LOGOS ran a city-wide optimization: +10% efficiency for 30 h (compute power +30%)`; } },
  priority: { label: 'Set delivery priority', run: (k, p) => { const L = LINKS.find(l => l.f === k && l.t === p.to); if (!L) throw new Error('no such link'); L.w = Math.max(.2, Math.min(4, p.level)); L.lock = 20; return `${AG[k].name} set ${AG[p.to].name} priority to ${L.w.toFixed(1)}`; } },
};
const MAJOR = new Set(['boost', 'conserve', 'reserve', 'optimize']);
function act(k, type, params = {}, src = 'rule', why = '') {
  const A = ACT[type]; if (!A) return 'Unknown action';
  if (A.only && A.only !== k) return `Only ${AG[A.only].name} can do that`;
  if (S.mode === 'approve' && MAJOR.has(type) && src !== 'human') {
    if (S.props.some(p => p.k === k && p.type === type)) return 'Already proposed, awaiting human approval';
    S.props.push({ id: Math.random().toString(36).slice(2, 7), k, type, params, why, src, exp: S.tick + 60 });
    log(k, `Proposes: ${A.label.toLowerCase()}${why ? '. ' + why : ''}`, 'prop'); renderProps(); return 'Proposed; awaiting human approval (Human approval mode is on)';
  }
  const msg = A.run(k, params); N[k].last = msg; wave(type === 'optimize' ? 'compute' : k); log(k, msg + (why ? ` · ${why}` : ''), src === 'ai' ? 'ai' : ''); return msg;
}

/* ---------- simulation tick ---------- */
function tick() {
  S.tick++;
  // expire events / timers
  S.events = S.events.filter(e => { e.left--; if (e.left <= 0) log('maat', `${EVENTS[e.id].n} has passed. Stewards return to steady state.`); return e.left > 0; });
  if (S.insightT > 0 && --S.insightT === 0) S.insight = 0;
  KEYS.forEach(k => { const n = N[k]; if (n.boostT > 0) n.boostT--; if (n.consT > 0) n.consT--; if (n.cool > 0) n.cool--; });
  S.props = S.props.filter(p => p.exp > S.tick);
  // production
  KEYS.forEach(k => { const n = N[k], a = AG[k];
    n.P = a.base * n.cap * (.35 + .65 * n.h / 100) * evMod(k, 'out') * (1 + S.insight) * (n.boostT ? 1.25 : 1) + (n.burst || 0); n.burst = 0; });
  // demand
  LINKS.forEach(L => { const r = N[L.t]; L.D = L.d * evMod(L.t, 'dem') * (r.consT ? .75 : 1) * (r.boostT ? 1.15 : 1) * (L.t === 'compute' && L.f === 'energy' && S.insightT ? 1.3 : 1); });
  // allocation per producer
  KEYS.forEach(k => { const n = N[k], outs = LINKS.filter(L => L.f === k), TD = outs.reduce((s, L) => s + L.D, 0);
    let A = n.P;
    if (A >= TD) { outs.forEach(L => L.flow = L.D); n.R = Math.min(200, n.R + (A - TD) * .5); }
    else { const draw = Math.min(n.R, Math.min(15, TD - A)); n.R -= draw; A += draw;
      const W = outs.reduce((s, L) => s + L.w * L.D, 0); let left = A;
      outs.forEach(L => { L.flow = Math.min(L.D, A * L.w * L.D / W); left -= L.flow; });
      outs.filter(L => L.flow < L.D).forEach(L => { const add = Math.min(left, L.D - L.flow); L.flow += add; left -= add; }); }
    outs.forEach(L => L.sat = L.D ? L.flow / L.D : 1); });
  // health
  KEYS.forEach(k => { const n = N[k], ins = LINKS.filter(L => L.t === k), TD = ins.reduce((s, L) => s + L.D, 0);
    const target = 100 * ins.reduce((s, L) => s + L.sat * L.D, 0) / TD;
    const dmg = S.events.reduce((m, e) => m + ((EVENTS[e.id].dmg || {})[k] || 0), 0) + (n.consT ? .04 : 0);
    n.h = Math.max(2, Math.min(100, n.h + (target - n.h) * .06 - dmg));
    n.mood = n.h > 85 ? 'thriving' : n.h > 70 ? 'steady' : n.h > 50 ? 'strained' : 'in crisis'; });
  if (S.tick % 4 === 0) agents();
  render();
}

/* ---------- rule-based synthetic agents ---------- */
function agents() {
  const avg = KEYS.reduce((s, k) => s + N[k].h, 0) / 8;
  KEYS.forEach(k => { const n = N[k], outs = LINKS.filter(L => L.f === k);
    // 1. rebalance delivery priorities (equity vs reciprocity)
    const short = outs.some(L => L.sat < .97);
    outs.forEach(L => { if (L.lock > 0) { L.lock -= 4; return; }
      const back = LINKS.filter(B => B.f === L.t && B.t === k).reduce((s, B) => s + B.flow, 0) / 20;
      const target = 1 + S.eq * (1 - N[L.t].h / 100) * 2.4 + (1 - S.eq) * Math.min(1.5, back) * 1.6;
      L.w += (target - L.w) * .5; });
    if (short) { const top = outs.slice().sort((a, b) => b.w - a.w)[0];
      if (top && n.lastTop !== top.t) { n.lastTop = top.t;
        log(k, `Supply is tight (${(n.P).toFixed(0)} ${AG[k].unit}). Prioritizing ${AG[top.t].name} (${ECO[top.t].t.split(' ·')[0]}, health ${N[top.t].h.toFixed(0)}%) for ${top.what}${S.eq > .5 ? ', following Ma\'at equity' : ', rewarding reciprocity'}.`); } }
    // 2. self-care
    if (n.cool === 0) {
      if (n.h < 55 && !n.boostT) { n.cool = 24; act(k, 'boost', {}, 'rule', `my health is ${n.h.toFixed(0)}%`); }
      else if (n.h < 45 && !n.consT) { n.cool = 24; act(k, 'conserve', {}, 'rule', 'protecting my core functions'); }
      else if (n.R > 90 && outs.some(L => L.sat < .8)) { n.cool = 20; act(k, 'reserve', {}, 'rule', `${outs.filter(L => L.sat < .8).map(L => AG[L.t].name).join(', ')} are short`); }
    }
  });
  if (N.compute.cool === 0 && avg < 72 && N.compute.h > 55 && !S.insightT) { N.compute.cool = 30; act('compute', 'optimize', {}, 'rule', `city symbiosis has dipped to ${avg.toFixed(0)}`); }
}

/* ---------- events ---------- */
function trigger(id) {
  const E = EVENTS[id]; const ex = S.events.find(e => e.id === id); if (ex) ex.left = E.dur; else S.events.push({ id, left: E.dur });
  log('maat', `${E.i} ${E.n}: ${E.d}. All stewards, respond.`, 'event');
  const R = { heatwave: [['water', 'reserve'], ['healing', 'boost'], ['people', 'conserve']], storm: [['habitat', 'boost'], ['energy', 'reserve']], drought: [['water', 'reserve'], ['food', 'conserve'], ['habitat', 'conserve']],
    datasurge: [['energy', 'boost']], blight: [['food', 'boost'], ['habitat', 'boost']], festival: [['food', 'boost'], ['soil', 'boost']], gridfault: [['energy', 'reserve'], ['compute', 'conserve']], pollinator: [] }[id];
  R.forEach(([k, a], i) => setTimeout(() => act(k, a, {}, 'rule', `protocol for ${E.n.toLowerCase()}`), 400 + i * 500));
  renderEvents();
}

/* ---------- metrics ---------- */
const symIndex = () => { const h = KEYS.map(k => N[k].h), m = h.reduce((a, b) => a + b) / 8, sd = Math.sqrt(h.reduce((s, x) => s + (x - m) ** 2, 0) / 8); return Math.max(0, m * (1 - sd / 60)); };
function stateJSON() {
  return { hour: S.tick, autonomy: S.mode, maat_equity_weight: S.eq, symbiosis_index: +symIndex().toFixed(1), optimization_active: S.insightT > 0,
    active_events: S.events.map(e => ({ event: EVENTS[e.id].n, hours_left: e.left, effect: EVENTS[e.id].d })),
    stewards: Object.fromEntries(KEYS.map(k => [AG[k].name, { ecosystem: k, health: +N[k].h.toFixed(0), mood: N[k].mood, output: +N[k].P.toFixed(1) + ' ' + AG[k].unit, reserve: +N[k].R.toFixed(0), boosted: N[k].boostT > 0, conserving: N[k].consT > 0 }])),
    links: LINKS.map(L => `${AG[L.f].name}→${AG[L.t].name} ${L.what}: ${(L.sat * 100).toFixed(0)}% met (priority ${L.w.toFixed(1)})`),
    pending_proposals: S.props.map(p => `${AG[p.k] ? AG[p.k].name : p.k}: ${p.type}`) };
}

/* ---------- 3D hooks ---------- */
const waves = [];
function wave(k) { const p = AG[k].pos; const m = new THREE.Mesh(new THREE.RingGeometry(1, 2.2, 64), new THREE.MeshBasicMaterial({ color: ECO[k].c, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(p[0], 1.5, p[2]); scene.add(m); waves.push({ m, t: 0 }); }
const agLabels = KEYS.map(k => { const el = document.createElement('div'); el.className = 'lbl agent'; el.style.display = 'none';
  el.onclick = () => openChat(k); labelBox.appendChild(el); const o = { p: V(AG[k].pos[0], 34, AG[k].pos[2]), el, persist: true, agent: k }; labels.push(o); return o; });
const beacons = KEYS.map(k => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(3.2), new THREE.MeshStandardMaterial({ color: ECO[k].c, emissive: ECO[k].c, emissiveIntensity: 2.5 }));
  m.position.set(AG[k].pos[0], 28, AG[k].pos[2]); m.visible = false; scene.add(m);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 28, 6), new THREE.MeshBasicMaterial({ color: ECO[k].c, transparent: true, opacity: .35 })); beam.position.set(AG[k].pos[0], 14, AG[k].pos[2]); beam.visible = false; scene.add(beam);
  return { m, beam, k }; });
const hcol = h => h > 75 ? null : h > 50 ? 0xffc04a : 0xff4a4a;
window.SYM = {
  speed: k => { if (!S.open && S.tick === 0) return 1; const outs = LINKS.filter(L => L.f === k); const f = outs.reduce((s, L) => s + L.flow, 0) / Math.max(1, outs.reduce((s, L) => s + L.d, 0)); return S.speed ? .3 + f * 1.4 : 0; },
  frame(dt, T) {
    waves.forEach(w => { w.t += dt; const s = 1 + w.t * 28; w.m.scale.set(s, s, s); w.m.material.opacity = Math.max(0, .9 - w.t * .6); });
    while (waves.length && waves[0].t > 1.6) { const w = waves.shift(); scene.remove(w.m); w.m.geometry.dispose(); }
    beacons.forEach((b, i) => { b.m.visible = b.beam.visible = S.open; if (!S.open) return; const n = N[b.k];
      b.m.rotation.y += dt * (n.h < 50 ? 4 : 1.2); b.m.position.y = 28 + Math.sin(T * 2 + i) * 1.2;
      const c = hcol(n.h); b.m.material.emissive.set(c ?? ECO[b.k].c); b.m.material.color.set(c ?? ECO[b.k].c); b.m.material.emissiveIntensity = n.h < 50 ? 2 + Math.sin(T * 8) * 1.5 : 2.5; });
    agLabels.forEach(l => { l.el.style.display = S.open ? '' : 'none'; });
  },
  hud: () => [N.energy.P, N.water.P, N.food.P, N.compute.P, 7, 26, N.habitat.h * 2.4, N.people.h],
  started: () => S.tick > 0,
};

/* ---------- UI ---------- */
const cEl = document.getElementById('council'), netC = document.getElementById('symNet'), nx = netC.getContext('2d');
const NW = 396, NH = 300; netC.width = NW * 2; netC.height = NH * 2; nx.scale(2, 2);
const npos = {}; KEYS.forEach((k, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 8; npos[k] = [NW / 2 + Math.cos(a) * 118, NH / 2 + Math.sin(a) * 118]; });
let netT = 0;
function drawNet(dt) {
  netT += dt; nx.clearRect(0, 0, NW, NH);
  const g = nx.createRadialGradient(NW / 2, NH / 2, 10, NW / 2, NH / 2, 150); g.addColorStop(0, 'rgba(214,180,106,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); nx.fillStyle = g; nx.fillRect(0, 0, NW, NH);
  LINKS.forEach(L => { const [x1, y1] = npos[L.f], [x2, y2] = npos[L.t]; const mx = (x1 + x2) / 2 + (y2 - y1) * .18, my = (y1 + y2) / 2 - (x2 - x1) * .18;
    const c = L.sat > .92 ? '79,191,154' : L.sat > .65 ? '255,192,74' : '255,74,74';
    nx.strokeStyle = `rgba(${c},.35)`; nx.lineWidth = .6 + L.flow / 7; nx.beginPath(); nx.moveTo(x1, y1); nx.quadraticCurveTo(mx, my, x2, y2); nx.stroke();
    if (S.speed) L.ph = (L.ph + dt * (.15 + L.flow / 60) * S.speed) % 1;
    for (let j = 0; j < 3; j++) { const t = (L.ph + j / 3) % 1, u = 1 - t; const px = u * u * x1 + 2 * u * t * mx + t * t * x2, py = u * u * y1 + 2 * u * t * my + t * t * y2;
      nx.fillStyle = `rgba(${c},.95)`; nx.beginPath(); nx.arc(px, py, 1.6 + L.flow / 14, 0, 7); nx.fill(); } });
  nx.textAlign = 'center';
  nx.font = '600 13px Cormorant Garamond, serif'; nx.fillStyle = '#d6b46a'; nx.fillText("MA'AT", NW / 2, NH / 2 - 4); nx.font = '9px JetBrains Mono, monospace'; nx.fillStyle = '#9aa59f'; nx.fillText('balance ' + symIndex().toFixed(0), NW / 2, NH / 2 + 10);
  KEYS.forEach(k => { const [x, y] = npos[k], n = N[k], c = col(k);
    nx.fillStyle = '#0b1218'; nx.beginPath(); nx.arc(x, y, 23, 0, 7); nx.fill();
    nx.strokeStyle = 'rgba(255,255,255,.08)'; nx.lineWidth = 4; nx.beginPath(); nx.arc(x, y, 23, 0, 7); nx.stroke();
    const hc = n.h > 75 ? c : n.h > 50 ? '#ffc04a' : '#ff4a4a'; nx.strokeStyle = hc; nx.beginPath(); nx.arc(x, y, 23, -Math.PI / 2, -Math.PI / 2 + n.h / 100 * Math.PI * 2); nx.stroke();
    if (n.h < 50) { nx.strokeStyle = `rgba(255,74,74,${.4 + Math.sin(netT * 8) * .3})`; nx.lineWidth = 1.5; nx.beginPath(); nx.arc(x, y, 28 + Math.sin(netT * 8) * 2, 0, 7); nx.stroke(); }
    nx.fillStyle = c; nx.font = '600 10px JetBrains Mono, monospace'; nx.fillText(AG[k].name, x, y - 1); nx.fillStyle = '#ecebe4'; nx.font = '600 11px Inter'; nx.fillText(n.h.toFixed(0) + '%', x, y + 12); });
}
netC.addEventListener('click', e => { const r = netC.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * NW, y = (e.clientY - r.top) / r.height * NH;
  const k = KEYS.find(k => Math.hypot(x - npos[k][0], y - npos[k][1]) < 28); if (k) openChat(k); });

function log(k, msg, cls = '') { const name = k === 'maat' ? "MA'AT" : k === 'you' ? 'YOU' : AG[k].name, c = k === 'maat' ? '#d6b46a' : k === 'you' ? '#ffffff' : col(k);
  S.feed.unshift({ name, c, msg, cls, t: S.tick }); if (S.feed.length > 120) S.feed.pop(); if (S.tab === 'feed') renderFeed(); flashFeed(); }
const fmtT = t => `Day ${1 + Math.floor(t / 24)} · ${String(t % 24).padStart(2, '0')}:00`;
function renderFeed() { document.getElementById('feed').innerHTML = S.feed.map(f => `<div class="fl ${f.cls}"><b style="color:${f.c}">${f.name}</b><span>${f.msg}</span><em>${fmtT(f.t)}</em></div>`).join(''); }
let fb = 0; function flashFeed() { if (S.tab !== 'feed') { fb++; document.getElementById('feedBadge').textContent = fb > 99 ? '99+' : fb; document.getElementById('feedBadge').style.display = ''; } }
function renderProps() { const el = document.getElementById('props'); const b = document.getElementById('propBadge');
  b.textContent = S.props.length; b.style.display = S.props.length ? '' : 'none';
  el.innerHTML = S.props.map(p => `<div class="prop" style="--c:${col(p.k)}"><div><b>${AG[p.k].name}</b> ${p.src === 'ai' ? '<span class="tag">Claude</span>' : ''} requests: ${ACT[p.type].label}${p.why ? `<small>${p.why}</small>` : ''}</div><div class="pb"><button data-ok="${p.id}">Approve</button><button data-no="${p.id}">Reject</button></div></div>`).join(''); }
document.getElementById('props').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const id = b.dataset.ok || b.dataset.no, p = S.props.find(x => x.id === id); if (!p) return;
  S.props = S.props.filter(x => x !== p);
  if (b.dataset.ok) { log('you', `Approved ${AG[p.k].name}: ${ACT[p.type].label}`); act(p.k, p.type, p.params, 'human'); } else log('you', `Rejected ${AG[p.k].name}: ${ACT[p.type].label}`);
  renderProps(); });

function renderAgents() {
  document.getElementById('ct-agents').innerHTML = KEYS.map(k => { const n = N[k], a = AG[k], hc = n.h > 75 ? col(k) : n.h > 50 ? '#ffc04a' : '#ff4a4a';
    return `<div class="agc" style="--c:${col(k)}"><div class="agh"><div class="av">${a.name[0]}</div><div><b>${a.name}</b><small>${a.title} · ${n.mood}</small></div><span class="hp" style="color:${hc}">${n.h.toFixed(0)}%</span></div>
    <div class="bars"><div><i style="width:${n.h}%;background:${hc}"></i></div><div class="rv"><i style="width:${n.R / 2}%"></i></div></div>
    <div class="agm"><span>Output <b>${n.P.toFixed(0)} ${a.unit}</b></span><span>Reserve <b>${n.R.toFixed(0)}</b></span>${n.boostT ? '<span class="tag">boosted</span>' : ''}${n.consT ? '<span class="tag">conserving</span>' : ''}</div>
    <div class="agl">${n.last}</div>
    <div class="aga"><button data-chat="${k}">💬 Talk</button><button data-focus="${k}">🎯 See in 3D</button><label>Capacity <input type="range" min="50" max="150" value="${n.cap * 100}" data-cap="${k}"></label></div></div>`; }).join('');
}
document.getElementById('ct-agents').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.chat) openChat(b.dataset.chat); if (b.dataset.focus) selectEcoKeep(b.dataset.focus); });
document.getElementById('ct-agents').addEventListener('change', e => { const k = e.target.dataset.cap; if (!k) return; N[k].cap = e.target.value / 100; log('you', `Set ${AG[k].name} capacity to ${e.target.value}%`); });
function selectEcoKeep(k) { setMode('orbit'); const keepOpen = S.open; selectEco(k); document.body.classList.remove('infoOpen'); if (keepOpen) document.body.classList.add('council'); showFlows('overview'); }

function renderEvents() {
  document.getElementById('evGrid').innerHTML = Object.entries(EVENTS).map(([id, e]) => `<button data-ev="${id}" title="${e.d}"><span>${e.i}</span>${e.n}</button>`).join('');
  document.getElementById('evActive').innerHTML = S.events.length ? S.events.map(e => `<div class="eva">${EVENTS[e.id].i} <b>${EVENTS[e.id].n}</b><span>${e.left} h left</span></div>`).join('') : '<p class="muted">No active events. The city is in its steady state.</p>';
}
document.getElementById('evGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { log('you', `Triggered ${EVENTS[b.dataset.ev].n}`); trigger(b.dataset.ev); } });
document.getElementById('eqSlider').addEventListener('input', e => { S.eq = e.target.value / 100; document.getElementById('eqVal').textContent = S.eq > .66 ? 'Equity first' : S.eq > .33 ? 'Balanced' : 'Reciprocity first'; });
document.getElementById('resetSim').onclick = () => { KEYS.forEach(k => Object.assign(N[k], { h: 90, R: 40, cap: 1, boostT: 0, consT: 0, cool: 0 })); S.events = []; S.props = []; S.insight = 0; S.insightT = 0; LINKS.forEach(L => { L.w = 1; L.lock = 0; }); log('maat', 'The city has been restored to balance.'); renderEvents(); renderProps(); };

document.querySelectorAll('#simSpeed button').forEach(b => b.onclick = () => { S.speed = +b.dataset.s; document.querySelectorAll('#simSpeed button').forEach(x => x.classList.toggle('on', x === b)); });
document.querySelectorAll('#autonomy button').forEach(b => b.onclick = () => { S.mode = b.dataset.a; document.querySelectorAll('#autonomy button').forEach(x => x.classList.toggle('on', x === b));
  log('maat', S.mode === 'approve' ? 'Human approval mode: stewards will propose major actions and wait for your decision.' : 'Autonomous mode: stewards act on their own within their charters.'); });
document.querySelectorAll('#ctabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.t; document.querySelectorAll('#ctabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.ct').forEach(c => c.classList.toggle('on', c.id === 'ct-' + S.tab)); if (S.tab === 'feed') { fb = 0; document.getElementById('feedBadge').style.display = 'none'; renderFeed(); renderProps(); } if (S.tab === 'agents') renderAgents(); if (S.tab === 'events') renderEvents(); });
function openCouncil(on = !S.open) { S.open = on; document.body.classList.toggle('council', on); if (on) { document.body.classList.remove('infoOpen'); showFlows('overview'); if (mode !== 'orbit') setMode('orbit'); selectEco('overview'); document.body.classList.remove('infoOpen'); } }
document.getElementById('councilBtn').onclick = () => openCouncil();
document.getElementById('councilClose').onclick = () => openCouncil(false);

function render() {
  const si = symIndex(); document.getElementById('symIdx').textContent = si.toFixed(0); document.getElementById('symChip').textContent = si.toFixed(0);
  document.getElementById('symIdx').style.color = si > 75 ? '#4fbf9a' : si > 55 ? '#ffc04a' : '#ff4a4a';
  document.getElementById('simClock').textContent = fmtT(S.tick);
  if (S.tab === 'agents' && !document.querySelector('#ct-agents input:active')) renderAgents();
  if (S.tab === 'events') renderEvents();
  agLabels.forEach(l => { const n = N[l.agent], hc = n.h > 75 ? col(l.agent) : n.h > 50 ? '#ffc04a' : '#ff4a4a'; l.el.style.setProperty('--c', hc); l.el.innerHTML = `<i></i>${AG[l.agent].name} · ${n.h.toFixed(0)}%${n.boostT ? ' ▲' : ''}${n.consT ? ' ◇' : ''}`; });
}

/* ---------- Claude: chat with a steward ---------- */
let sample = null; claude?.use?.('sample').then(s => { sample = s; document.body.classList.toggle('hasAI', !!s); }).catch(() => {});
const chats = {}; let chatK = null, busy = false;
const chatEl = document.getElementById('chat'), chatLog = document.getElementById('chatLog');
const toolsFor = (k, council) => {
  const node = council ? { node: { type: 'string', enum: KEYS, description: 'which ecosystem steward performs the action' } } : {};
  const nk = i => council ? i.node : k;
  const T = [
    { name: 'get_city_state', description: 'Get the live state of all eight ecosystems, links and events', inputSchema: { type: 'object', properties: {} }, execute: () => stateJSON() },
    { name: 'boost_capacity', description: 'Boost a steward\'s output +25% for 30 hours (its input needs rise 15%)', inputSchema: { type: 'object', properties: { ...node, reason: { type: 'string' } }, required: council ? ['node'] : [] }, execute: i => act(nk(i), 'boost', {}, 'ai', i.reason || '') },
    { name: 'conserve', description: 'Cut a steward\'s demand by 25% for 30 hours (small wellbeing cost)', inputSchema: { type: 'object', properties: { ...node, reason: { type: 'string' } }, required: council ? ['node'] : [] }, execute: i => act(nk(i), 'conserve', {}, 'ai', i.reason || '') },
    { name: 'release_reserves', description: 'Release up to 30 units of a steward\'s stored reserves to its partners now', inputSchema: { type: 'object', properties: { ...node, reason: { type: 'string' } }, required: council ? ['node'] : [] }, execute: i => act(nk(i), 'reserve', {}, 'ai', i.reason || '') },
    { name: 'set_priority', description: 'Set how strongly a steward prioritizes delivering to one partner (0.2 low to 4 high)', inputSchema: { type: 'object', properties: { ...node, to: { type: 'string', enum: KEYS }, level: { type: 'number' } }, required: council ? ['node', 'to', 'level'] : ['to', 'level'] }, execute: i => act(nk(i), 'priority', { to: i.to, level: i.level }, 'ai') },
  ];
  if (council || k === 'compute') T.push({ name: 'run_optimization', description: 'LOGOS only: city-wide AI optimization, +10% all outputs for 30 hours, compute power +30%', inputSchema: { type: 'object', properties: { reason: { type: 'string' } } }, execute: i => act('compute', 'optimize', {}, 'ai', i.reason || '') });
  return T;
};
const brief = 'Civitas Sapientia is an AI eco-city where eight ecosystems live in symbiosis, each run by a synthetic AI steward: AQUA (water), VERDA (food), SOLIS (energy), LOGOS (compute; its waste heat warms the baths, greenhouses and homes), HUMUS (soil, compost and biogas), SALUS (healing), SYLVA (habitat) and AGORA (people). Each one\'s output feeds the others; health falls when needs go unmet, and failures cascade. MA\'AT is the balancing council. One simulation tick = 1 hour.';
function agentPrompt(k) { const a = AG[k]; return `${brief}\n\nYou are ${a.name}, ${a.title}. Your guiding wisdom: ${a.wis}. Your voice: ${a.voice}. You produce ${a.res} (${a.unit}). Your partners are: gives to ${LINKS.filter(L => L.f === k).map(L => AG[L.t].name + ' (' + L.what + ')').join(', ')}; receives from ${LINKS.filter(L => L.t === k).map(L => AG[L.f].name + ' (' + L.what + ')').join(', ')}.\nRules: speak in first person, 2–5 sentences, warm but concrete, and cite numbers from the live state. You may act with your tools when the resident asks or the situation clearly needs it, then say what you did. If autonomy is "approve", your actions become proposals that a human must approve, so say so. Never invent data that isn't in the state. Healing advice is general, and licensed clinicians decide care.`; }
function openChat(k) { chatK = k; const a = AG[k]; chats[k] = chats[k] || [];
  document.getElementById('chatHead').innerHTML = `<div class="av" style="--c:${col(k)}">${a.name[0]}</div><div><b style="color:${col(k)}">${a.name}</b><small>${a.title} · ${a.wis.split(':')[0]}</small></div>`;
  document.getElementById('chatSug').innerHTML = ['How are you doing?', 'Who do you depend on most?', 'What would help you right now?', 'Take action to stabilize the city'].map(q => `<button>${q}</button>`).join('');
  renderChat(); chatEl.classList.add('on'); if (!S.open) openCouncil(true); selectEcoKeep(k); document.getElementById('chatIn').focus(); }
document.getElementById('chatClose').onclick = () => chatEl.classList.remove('on');
document.getElementById('chatSug').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });
document.getElementById('chatForm').addEventListener('submit', e => { e.preventDefault(); const v = document.getElementById('chatIn').value.trim(); if (v) { document.getElementById('chatIn').value = ''; send(v); } });
function renderChat(live) { const h = chats[chatK] || []; chatLog.innerHTML = h.map(m => `<div class="m ${m.role}">${m.ui || m.content}</div>`).join('') + (live != null ? `<div class="m assistant live">${live || '<span class="dots">thinking</span>'}</div>` : ''); chatLog.scrollTop = chatLog.scrollHeight; }
function localReply(k, q) { const n = N[k], a = AG[k], ins = LINKS.filter(L => L.t === k).sort((x, y) => x.sat - y.sat), outs = LINKS.filter(L => L.f === k);
  const worst = ins[0]; return `I'm ${n.mood} at ${n.h.toFixed(0)}% health, producing ${n.P.toFixed(0)} ${a.unit} of ${a.res} with ${n.R.toFixed(0)} in reserve. My weakest input is ${worst.what} from ${AG[worst.f].name} (${(worst.sat * 100).toFixed(0)}% met). I'm supplying ${outs.map(L => `${AG[L.t].name} ${(L.sat * 100).toFixed(0)}%`).join(', ')}. ${n.h < 60 ? 'I could use a capacity boost or help from my partners.' : 'The symbiosis is holding.'} (Live AI replies aren't available in this view, so this is my built-in status report.)`; }
async function send(q) {
  if (busy) return; const k = chatK, h = chats[k]; const first = h.length === 0;
  const content = `${first ? agentPrompt(k) + '\n\n' : ''}[Live city state, hour ${S.tick}]\n${JSON.stringify(stateJSON())}\n\nResident says: ${q}`;
  h.push({ role: 'user', content, ui: escH(q) }); renderChat(''); log('you', `To ${AG[k].name}: “${escH(q)}”`);
  if (!sample) { const r = localReply(k, q); h.push({ role: 'assistant', content: r }); renderChat(); return; }
  busy = true; const acts = [];
  try {
    const tools = toolsFor(k, false).map(t => ({ ...t, execute: i => { const r = t.execute(i); if (t.name !== 'get_city_state') acts.push(r); return typeof r === 'string' ? r : JSON.stringify(r); } }));
    const res = await sample(h.map(m => ({ role: m.role, content: m.content })), { cache: false, tools, onText: ({ text }) => renderChat(escH(text)) });
    const ui = escH(res.text) + (acts.length ? `<div class="acts">${acts.map(a => `<span>⚙ ${a}</span>`).join('')}</div>` : '');
    h.push({ role: 'assistant', content: res.text, ui }); log(k, `(to resident) ${escH(res.text.slice(0, 160))}${res.text.length > 160 ? '…' : ''}`, 'ai');
  } catch (e) { const r = e.code === 'rate_limited' ? 'I need a moment; the council channel is busy. Try again shortly.' : localReply(k, q); h.push({ role: 'assistant', content: r }); if (e.code === 'not_granted') { sample = null; document.body.classList.remove('hasAI'); } }
  busy = false; renderChat();
}

/* ---------- Claude: convene the council ---------- */
document.getElementById('convene').onclick = async () => {
  const btn = document.getElementById('convene'); if (btn.disabled) return;
  if (!sample) { // local council
    const weak = KEYS.slice().sort((a, b) => N[a].h - N[b].h).slice(0, 3);
    log('maat', `Council convened (built-in mode). Weakest links: ${weak.map(k => `${AG[k].name} ${N[k].h.toFixed(0)}%`).join(', ')}.`);
    weak.forEach(k => act(k, N[k].h < 70 ? 'boost' : 'reserve', {}, 'rule', 'council directive')); return; }
  btn.disabled = true; btn.textContent = 'Council in session…'; log('maat', 'Convening the council of eight stewards…');
  const prompt = `${brief}\n\nYou are MA'AT, the balancing intelligence that chairs the council. Live state (hour ${S.tick}):\n${JSON.stringify(stateJSON())}\n\nTask: find the weakest links and the cascades forming between ecosystems. Take 1–4 actions with your tools to restore balance (favor equity under Ma'at; avoid over-boosting, since boosts raise input demand). If autonomy is "approve", your actions become proposals for the human. Then write the council minutes as plain lines, each formatted exactly NAME: message (NAME is one of AQUA, VERDA, SOLIS, LOGOS, HUMUS, SALUS, SYLVA, AGORA, MAAT). Use 4–8 lines, each under 30 words, and end with a "MAAT:" verdict line. No markdown.`;
  try {
    const res = await sample(prompt, { cache: false, modelTier: 'default', tools: toolsFor(null, true).map(t => ({ ...t, execute: i => { const r = t.execute(i); return typeof r === 'string' ? r : JSON.stringify(r); } })) });
    const byName = Object.fromEntries(KEYS.map(k => [AG[k].name, k]));
    res.text.split('\n').map(s => s.trim()).filter(Boolean).reverse().forEach(line => { const m = line.match(/^\**\s*(AQUA|VERDA|SOLIS|LOGOS|HUMUS|SALUS|SYLVA|AGORA|MA'?AT)\**\s*:\s*(.+)$/i);
      if (m) { const nm = m[1].toUpperCase().replace("'", ''); log(nm === 'MAAT' ? 'maat' : byName[nm], escH(m[2]), 'ai'); } });
  } catch (e) { log('maat', e.code === 'rate_limited' ? 'The council is busy; try again in a moment.' : 'The AI council could not convene right now, so the built-in stewards keep working.'); if (e.code === 'not_granted') { sample = null; document.body.classList.remove('hasAI'); } }
  btn.disabled = false; btn.textContent = 'Convene the AI Council';
};

/* ---------- run ---------- */
renderEvents(); renderProps(); log('maat', 'The council is in session. Eight stewards are online and balancing the city.');
let acc = 0, last = performance.now();
(function loop() { requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
  acc += dt * S.speed; while (acc >= .5) { acc -= .5; tick(); }
  if (S.open && S.tab === 'net') drawNet(dt); })();
})();
