/* Blotter landing site.
   Data: the desk's report (desk-data branch, refreshed by the droplet every 10 min) + Binance's public price feed.
   If the report isn't reachable yet, the page runs on clearly-labelled sample data. */
(() => {
'use strict';

const CFG = {
  repo: 'daniiiiilllll546-oss/Blotter',
  desk: 'desk.html',                         // the live desk page on this site (droplet server: http://164.92.132.200:8420)
  bmc: (window.BLOTTER_CFG || {}).bmc || '',  // Buy Me a Coffee link lives in docs/config.js
  syms: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC'],
};
const RAW = `https://raw.githubusercontent.com/${CFG.repo}`;
const REPORT_URL = `${RAW}/desk-data/state.json`;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fin = Number.isFinite;
const usd = (v, d = 2) => fin(v) ? (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const susd = v => fin(v) ? (v > 0 ? '+' : '') + usd(v) : '—';
const FAM = { trend: 'EMA trend', donchian: 'Donchian breakout', bollinger: 'Bollinger reversion', rsi: 'RSI reversion', scalper: 'Breakout scalper', macd: 'MACD momentum', momentum: 'Momentum z-score', ml: 'GBM classifier', jev: 'OpenJev' };
const famLabel = (f, strategies) => (strategies && strategies[f] && strategies[f].label) || FAM[f] || String(f).replace(/^lab\//, '').replace(/-/g, ' ');
const famShort = f => ({ trend: 'TREND', donchian: 'DONCH', bollinger: 'BOLL', rsi: 'RSI', scalper: 'SCALP', macd: 'MACD', momentum: 'MOM', ml: 'GBM', jev: 'JEV' }[f] || 'LAB');

/* ====================================================================== data */
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function sampleState() {
  const r = rng(20260929), names = ['Kestrel', 'Osprey', 'Merlin', 'Harrier', 'Condor', 'Shrike', 'Heron', 'Falcon', 'Raven', 'Swift', 'Plover', 'Lapwing', 'Tern', 'Petrel', 'Gannet', 'Kite', 'Hobby', 'Buzzard', 'Egret', 'Ibis', 'Avocet', 'Curlew', 'Dunlin', 'Godwit'];
  const fams = ['trend', 'donchian', 'bollinger', 'rsi', 'scalper', 'macd', 'momentum', 'ml', 'lab/failed-breakout', 'lab/trend-pullback', 'jev'];
  const tfs = ['1m', '5m', '15m'], now = Date.now();
  const bots = names.map((name, i) => {
    const drift = (r() - 0.5) * 0.0004, vol = 0.0004 + r() * 0.0008; let e = 1000; const curve = [];
    for (let k = 0; k < 64; k++) { curve.push([Math.floor((now - (63 - k) * 3600e3) / 1000), +e.toFixed(2)]); e *= 1 + drift + (r() - 0.5) * vol * 2; }
    const fam = fams[Math.floor(r() * fams.length)], ageH = 1 + r() * 20, trades3d = Math.floor(r() * 3), pnl3d = e - curve[Math.max(0, 63 - 72)][1];
    const verdict = ageH < 24 ? 'grace' : pnl3d > 0 ? 'safe' : 'kill';
    return { id: i + 1, name, fam, author: fam.startsWith('lab/') ? 'claude' : fam === 'jev' ? 'Jev' : null, sym: CFG.syms[Math.floor(r() * 10)] + 'USDT', tf: tfs[Math.floor(r() * 3)], maxLev: [1, 2, 3, 5][Math.floor(r() * 4)], gen: Math.floor(r() * 4), parent: null, ageH, status: 'live', equity: +e.toFixed(2), pnl: e - 1000, trades: trades3d, pnl3d, trades3d, verdict, curve,
      params: { entryN: 22, exitN: 11, stopATR: 1.6, tpATR: 0, trailATR: 2, risk: 0.0175 } };
  }).sort((a, b) => b.equity - a.equity);
  const ev = (kind, text, m) => ({ kind, text, t: now - m * 60e3 });
  return { sample: true, generatedAt: new Date(now).toISOString(), gen: 0, nextCull: null, bots,
    events: [ev('reset', 'Fresh desk: 20 founders at $1,000 each', 5)],
    culls: [], graveyard: [],
    strategies: null };
}
function normalize(j) {
  const bots = (j.bots || []).filter(b => fin(b.equity)).sort((a, b) => b.equity - a.equity);
  return { sample: false, generatedAt: j.generatedAt, gen: j.gen, nextCull: j.nextCull ? Date.parse(j.nextCull) : null, bots, events: j.events || [], culls: j.culls || [], graveyard: j.graveyard || [], strategies: j.strategies || null, prices: j.prices || {} };
}
async function getJSON(url, ms = 8000) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal, cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(tm); }
}
async function getText(url, ms = 8000) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal, cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return await r.text(); } finally { clearTimeout(tm); }
}
let S = null;
async function loadState() {
  try { S = normalize(await getJSON(`${REPORT_URL}?t=${Date.now()}`)); if (!S.bots.length) throw new Error('empty'); }
  catch (e) { if (!S || S.sample) S = sampleState(); }
  return S;
}

/* ================================================================ small UI */
function nextCullMs() { if (S && S.nextCull && S.nextCull > Date.now()) return S.nextCull; const t = new Date(); t.setUTCHours(19, 0, 0, 0); if (t <= new Date()) t.setUTCDate(t.getUTCDate() + 1); return +t; }
function tickCountdown() {
  const s = Math.max(0, Math.floor((nextCullMs() - Date.now()) / 1000)), p = n => String(n).padStart(2, '0');
  $('#countdown').textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  renderClock();
}
/* the big cull clock: live countdown to the next cut; scrolling fast-forwards it (CLK.ff 0→1) */
const CLK = { ff: 0 };
function renderClock() {
  const el = $('#clock'); if (!el) return;
  const rem = Math.max(0, Math.round((nextCullMs() - Date.now()) / 1000)), shown = CLK.ff >= .999 ? 0 : Math.round(rem * (1 - CLK.ff)), p = n => String(n).padStart(2, '0');
  const html = `${p(Math.floor(shown / 3600))}:${p(Math.floor(shown / 60) % 60)}<span class="s">:${p(shown % 60)}</span>`;
  if (el.innerHTML !== html) el.innerHTML = html;
  el.classList.toggle('zero', shown === 0);
  const lb = $('#clocklb'), lt = $('#clocklbt'), state = shown === 0 ? 'zero' : CLK.ff > .001 ? 'ff' : 'live';
  lb.className = 'clock-lb' + (state === 'live' ? '' : ' ' + state);
  lt.textContent = state === 'zero' ? "MIDNIGHT TASHKENT · THE CUT" : state === 'ff' ? 'FAST-FORWARDING TO THE CUT' : 'NEXT CUT IN · MIDNIGHT TASHKENT';
}
function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; }
function renderStatus() {
  const age = Date.now() - Date.parse(S.generatedAt), badge = $('#livebadge'), txt = $('#livetext');
  const alive = S.bots.length;
  $('#poolchip').textContent = S.sample ? 'POOL —' : `POOL ${alive}`;
  $('#genlabel').textContent = S.sample ? 'GEN —' : `GEN ${S.gen ?? '—'}`;
  if (S.sample) { badge.className = 'live sample'; txt.textContent = 'WAITING FOR DESK'; $('#datanote').textContent = 'The desk\'s first report hasn\'t arrived yet, so no bots are listed. The lines above are decoration; prices on the tape are live.'; }
  else if (age > 3 * 3600e3) { badge.className = 'live sample'; txt.textContent = `REPORT ${ago(Date.parse(S.generatedAt)).toUpperCase()}`; $('#datanote').textContent = `Last desk report ${ago(Date.parse(S.generatedAt))}.`; }
  else { badge.className = 'live'; txt.textContent = 'LIVE'; $('#datanote').textContent = `From the desk's report, ${ago(Date.parse(S.generatedAt))} · refreshes every 10 min.`; }
}
const EVK = { spawn: ['Born', 'var(--violet)'], fastfail: ['Removed', 'var(--red)'], claudekill: ['Removed', 'var(--red)'], laberror: ['Rejected', 'var(--muted)'], cull: ['Cull', 'var(--amber)'], reset: ['Reset', 'var(--amber)'] };
function feedItems() {
  const ev = S.events.map(e => ({ t: e.t, kind: e.kind, text: e.text }));
  for (const c of S.culls || []) ev.push({ t: c.t, kind: 'cull', text: `gen ${c.gen}: ${c.killed.length} removed, ${c.born.length} born` });
  return ev.filter(e => fin(e.t)).sort((a, b) => b.t - a.t).slice(0, 4);
}
function renderFeed(animate) {
  const items = S.sample ? [] : feedItems(), box = $('#feed');
  box.innerHTML = items.length ? items.map(e => { const [k, c] = EVK[e.kind] || ['Event', 'var(--muted)']; return `<div class="ev"><b style="color:${c}">${k}</b> · ${esc(e.text.replace(/^(\w[\w-]*) created by Claude: /, 'Claude designed $1: '))}<time>${ago(e.t)}</time></div>`; }).join('')
    : `<div class="ev" style="color:var(--muted)">${S.sample ? "Waiting for the desk's first report." : 'Quiet so far. Claude adds a bot every hour.'}</div>`;
  if (animate && !reduce && window.gsap) gsap.from(box.children, { y: 14, opacity: 0, stagger: .07, duration: .7, ease: 'expo.out' });
}

/* ============================================================== live prices */
const px = {};
function tapeHTML() { return `<div class="tape-set">${CFG.syms.map(s => `<span data-sym="${s}"><b>${s}</b><em class="p">—</em> <em class="c"></em></span>`).join('')}</div>`; }
function initTape() { $('#tape').innerHTML = tapeHTML() + tapeHTML(); }
function fmtPx(v) { const d = v >= 1000 ? 2 : v >= 10 ? 3 : v >= 1 ? 4 : 5; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function paintPrice(sym) {
  const d = px[sym]; if (!d) return;
  for (const el of $$(`[data-sym="${sym}"]`)) {
    const p = el.querySelector('.p'), c = el.querySelector('.c'), ch = d.o ? (d.c / d.o - 1) * 100 : 0;
    p.textContent = fmtPx(d.c); p.style.fontStyle = 'normal';
    c.textContent = d.o ? `${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(2)}%` : ''; c.className = 'c ' + (ch >= 0 ? 'up' : 'dn'); c.style.fontStyle = 'normal';
  }
}
function initPrices() {
  const list = CFG.syms.map(s => s + 'USDT');
  const rest = async () => {
    try { const d = await getJSON(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(list))}`); for (const t of d) { const s = t.symbol.replace('USDT', ''); px[s] = { c: +t.lastPrice, o: +t.openPrice }; paintPrice(s); } }
    catch (e) { if (S && S.prices) for (const [k, v] of Object.entries(S.prices)) { const s = k.replace('USDT', ''); if (!px[s]) { px[s] = { c: v, o: 0 }; paintPrice(s); } } }
  };
  rest();
  let tries = 0;
  const connect = () => {
    let ws; try { ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${list.map(s => s.toLowerCase() + '@miniTicker').join('/')}`); } catch (e) { return; }
    ws.onmessage = m => { try { const d = JSON.parse(m.data).data, s = d.s.replace('USDT', ''); px[s] = { c: +d.c, o: +d.o }; paintPrice(s); } catch (e) {} };
    ws.onclose = () => { if (++tries < 6) setTimeout(connect, 3000 * tries); else setInterval(rest, 30000); };
  };
  connect();
}

/* ============================================================ 3D: the pool */
function heroScene(canvas) {
  if (!window.THREE) return null;
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  // colours per theme: glowing additive ribbons on ink, solid tinted ribbons on paper
  const PAL = () => (window.BTHEME && BTHEME.light)
    ? { light: true, bg: '#F3EEE3', amber: '#B8700F', green: '#1D8350', red: '#CC3F37', grey: '#9EA3A5', violet: '#7650BE', cyan: '#2B779A', g1: 0xD5CCBA, g2: 0xE3DCCE }
    : { light: false, bg: '#0B1116', amber: '#E8A33D', green: '#3EC690', red: '#F0625A', grey: '#6F7E8A', violet: '#B99BE8', cyan: '#72B8D8', g1: 0x1c2933, g2: 0x141e26 };
  let pal = PAL();
  const ink = new THREE.Color(pal.bg), COL = { amber: new THREE.Color(pal.amber), green: new THREE.Color(pal.green), red: new THREE.Color(pal.red), grey: new THREE.Color(pal.grey), violet: new THREE.Color(pal.violet), cyan: new THREE.Color(pal.cyan) };
  const small = innerWidth < 760, touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  // tablets and phones: fewer pixels and fewer ribbons, so the GPU keeps up (desktop keeps full quality)
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? (small ? 1.25 : 1) : 2)); renderer.setClearColor(ink, 1);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(ink, 34, 112);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 220);
  let grid = new THREE.GridHelper(160, 80, pal.g1, pal.g2); grid.position.y = -1.2; scene.add(grid);
  const N = 120, X0 = -30, X1 = 40, MAX = small ? 16 : touch ? 20 : 30, DZ = small ? 3.6 : 3.1, K = 24;
  const fogU = { fogNear: { value: 34 }, fogFar: { value: 112 } }, capU = { uCap: { value: pal.light ? 1 : 100 } };
  const blend = m => { m.blending = pal.light ? THREE.NormalBlending : THREE.AdditiveBlending; m.premultipliedAlpha = pal.light; m.needsUpdate = true; return m; };
  const curtainMat = () => blend(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: COL.green.clone() }, uAlpha: { value: 0 }, ...fogU, ...capU },
    vertexShader: 'attribute float aT; varying float vT; varying float vD; void main(){ vT=aT; vec4 mv=modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; uniform float uCap; uniform float fogNear; uniform float fogFar; varying float vT; varying float vD; void main(){ float f=1.-smoothstep(fogNear,fogFar,vD); float a=min(pow(vT,1.8)*.4*uAlpha*f,uCap); gl_FragColor=vec4(uColor*a,a); }' }));
  const lineMat = seed => blend(new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uColor: { value: COL.green.clone() }, uAlpha: { value: 0 }, uTime: { value: 0 }, uSeed: { value: seed }, ...fogU, ...capU },
    vertexShader: 'varying float vX; varying float vD; void main(){ vX=(position.x+30.)/70.; vec4 mv=modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; uniform float uTime; uniform float uSeed; uniform float uCap; uniform float fogNear; uniform float fogFar; varying float vX; varying float vD; void main(){ float p=fract(uTime*.09+uSeed); float g=exp(-pow((vX-p)*16.,2.)); float f=1.-smoothstep(fogNear,fogFar,vD); float a=min(uAlpha*f*(.7+1.8*g),uCap); gl_FragColor=vec4(uColor*a,a); }' }));
  const ribbons = [];
  function makeRibbon(slot) {
    const pos = new Float32Array(N * 6), at = new Float32Array(N * 2), idx = [];
    for (let i = 0; i < N; i++) { at[i * 2] = 1; if (i < N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(at, 1)); g.setIndex(idx);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const r = { slot, mesh: new THREE.Mesh(g, curtainMat()), line: new THREE.Line(lg, lineMat(Math.random())), head: new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 14), new THREE.MeshBasicMaterial({ color: COL.green.clone(), transparent: true, opacity: 0 })),
      vals: new Float32Array(N), target: new Float32Array(N), id: null, state: 'empty', a: 0, lift: -5, col: COL.grey.clone(), headCol: COL.green.clone(), top: false, sim: null };
    scene.add(r.mesh, r.line, r.head); ribbons.push(r); return r;
  }
  for (let i = 0; i < MAX; i++) makeRibbon(i);
  const zOf = slot => (slot - (MAX - 1) / 2) * DZ;
  function resample(curve) {
    const out = new Float32Array(N); if (!curve || curve.length < 2) return out;
    for (let i = 0; i < N; i++) { const f = i / (N - 1) * (curve.length - 1), a = Math.floor(f), b = Math.min(curve.length - 1, a + 1), w = f - a; out[i] = ((curve[a][1] * (1 - w) + curve[b][1] * w) / 1000 - 1) * K; }
    return out;
  }
  let lastA = null;
  function assign(bots, sample) {
    lastA = [bots, sample];
    const show = bots.slice(0, MAX), ids = new Set(show.map(b => b.id));
    for (const r of ribbons) if (r.id != null && !ids.has(r.id) && r.state !== 'dying') { r.state = 'dying'; r.t = 0; }
    const top = new Set(show.slice(0, 3).map(b => b.id));
    for (const b of show) {
      let r = ribbons.find(x => x.id === b.id);
      if (!r) { r = ribbons.find(x => x.state === 'empty') || ribbons.find(x => x.state === 'dying' && x.a < .05); if (!r) continue; r.id = b.id; r.state = 'born'; r.t = 0; r.lift = -5; r.a = 0; r.vals.fill(0); }
      r.target = resample(b.curve); r.bot = b; r.top = top.has(b.id);
      const v = r.target[N - 1];
      r.col = (b.verdict === 'kill' || b.status === 'stopped') ? COL.red.clone() : r.top ? COL.amber.clone() : v > 0 ? COL.green.clone() : COL.grey.clone();
      r.headCol = b.author === 'claude' ? COL.violet : b.fam === 'jev' ? COL.cyan : r.col;
      r.sim = sample ? { drift: (Math.random() - .45) * .05, vol: .1 + Math.random() * .2 } : null;
    }
    ribbons.sort((a, b) => a.slot - b.slot);
  }
  function write(r) {
    const pos = r.mesh.geometry.attributes.position.array, lp = r.line.geometry.attributes.position.array, z = zOf(r.slot);
    for (let i = 0; i < N; i++) {
      const x = X0 + (X1 - X0) * i / (N - 1), y = Math.max(-1.15, r.vals[i] + r.lift);
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x; pos[i * 6 + 4] = -1.2; pos[i * 6 + 5] = z;
      lp[i * 3] = x; lp[i * 3 + 1] = y + .02; lp[i * 3 + 2] = z;
    }
    r.mesh.geometry.attributes.position.needsUpdate = true; r.line.geometry.attributes.position.needsUpdate = true;
    r.head.position.set(X1, Math.max(-1.15, r.vals[N - 1] + r.lift), z);
  }
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; }, { passive: true });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 760 ? 56 : 38; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  let visible = true, last = performance.now(), T = 0, acc = 0, intro = 0;
  let running = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }).observe(canvas);
  function frame(dt) {
    T += dt; intro = Math.min(1, intro + dt / 2.6);
    if (!reduce) { acc += dt; while (acc > .09) { acc -= .09; for (const r of ribbons) if (r.sim && r.state === 'live') { r.target.copyWithin(0, 1); r.target[N - 1] = r.target[N - 2] + r.sim.drift + (Math.random() - .5) * r.sim.vol * 2; } } }
    for (const r of ribbons) {
      if (r.state === 'empty') { r.mesh.visible = r.line.visible = r.head.visible = false; continue; }
      if (r.state === 'born') { r.t += dt; r.lift = Math.min(0, r.lift + dt * 4); r.a = Math.min(1, r.a + dt / 1.4); if (r.t > 1.8) r.state = 'live'; }
      if (r.state === 'dying') { r.t += dt; r.lift -= dt * 2.4; r.a = Math.max(0, r.a - dt / 2.2); r.col = COL.red; if (r.a <= 0) { r.state = 'empty'; r.id = null; } }
      const k = reduce ? 1 : Math.min(1, dt * 3);
      for (let i = 0; i < N; i++) r.vals[i] += (r.target[i] - r.vals[i]) * k;
      const reveal = Math.max(0, Math.min(1, intro * 1.6 - r.slot / MAX * .6));
      r.mesh.visible = r.line.visible = r.head.visible = true;
      r.mesh.material.uniforms.uColor.value.lerp(r.col, .06); r.mesh.material.uniforms.uAlpha.value = r.a * reveal * (r.top ? 1.45 : 1);
      r.line.material.uniforms.uColor.value.lerp(r.col, .06); r.line.material.uniforms.uAlpha.value = r.a * reveal; r.line.material.uniforms.uTime.value = T;
      r.head.material.color.lerp(r.headCol, .06); r.head.material.opacity = r.a * reveal;
      r.head.scale.setScalar(1 + (r.top ? .4 * (1 + Math.sin(T * 3.4 + r.slot)) : 0));
      write(r);
    }
    ptr.x += (ptr.tx - ptr.x) * .04; ptr.y += (ptr.ty - ptr.y) * .04;
    const orbit = reduce ? 0 : Math.sin(T * .06) * 7, sy = Math.min(1, scrollY / innerHeight);
    camera.position.set(34 + orbit + ptr.x * 8, 17 - ptr.y * 6 + sy * 10, 44 - (1 - intro) * 18 + sy * 8);
    camera.lookAt(8 + ptr.x * 3, sy * -4, -4);
    renderer.render(scene, camera);
  }
  const FRAME = touch ? 1000 / 30 : 0; let drawn = 0; // tablets and phones: 30 fps is plenty for slow ribbons, and halves the GPU work
  function loop(now) { if (!visible) { running = false; return; } if (FRAME && now - drawn < FRAME - 2) { requestAnimationFrame(loop); return; } drawn = now; const dt = Math.max(0, Math.min(.1, (now - last) / 1000)); last = Math.max(last, now); frame(reduce ? 5 : dt); if (!reduce) requestAnimationFrame(loop); else running = false; }
  addEventListener('themechange', () => {
    pal = PAL(); ink.set(pal.bg); renderer.setClearColor(ink, 1); scene.fog.color.set(pal.bg);
    for (const k of Object.keys(COL)) COL[k].set(pal[k]);
    scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); grid = new THREE.GridHelper(160, 80, pal.g1, pal.g2); grid.position.y = -1.2; scene.add(grid);
    capU.uCap.value = pal.light ? 1 : 100;
    for (const r of ribbons) { blend(r.mesh.material); blend(r.line.material); }
    if (lastA) assign(lastA[0], lastA[1]);
    if (!running) renderer.render(scene, camera);
  });
  return { assign, start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } } };
}

/* ========================================================= 3D: genome helix */
function helixScene(canvas) {
  if (!window.THREE) return null;
  let renderer; try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(hover: none), (pointer: coarse)').matches ? 1 : 2)); renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.set(0, 0, 26);
  const group = new THREE.Group(); scene.add(group);
  const HP = () => (window.BTHEME && BTHEME.light)
    ? { nodes: ['#B8700F', '#2B779A', '#2B779A', '#7650BE', '#7650BE', '#1D8350', '#1D8350', '#CC3F37', '#CC3F37'], rung: 0xCDC3B0, b1: 0xB8700F, b2: 0x9EA3A5, amber: '#B8700F', dim: 1.35 }
    : { nodes: ['#E8A33D', '#72B8D8', '#72B8D8', '#B99BE8', '#B99BE8', '#3EC690', '#3EC690', '#F0625A', '#F0625A'], rung: 0x2B3C4A, b1: 0xE8A33D, b2: 0x6F7E8A, amber: '#E8A33D', dim: .55 };
  let hp = HP();
  const amber = new THREE.Color(hp.amber);
  const palette = hp.nodes.map(c => new THREE.Color(c));
  const PAIRS = 26, nodes = [], rungs = [];
  const sph = new THREE.SphereGeometry(.34, 16, 16);
  for (let i = 0; i < PAIRS; i++) {
    const y = (i - PAIRS / 2) * .62, ang = i * .52;
    const c = palette[i % palette.length];
    const a = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color: c.clone() })), b = new THREE.Mesh(sph, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(hp.dim) }));
    a.position.set(Math.cos(ang) * 3.4, y, Math.sin(ang) * 3.4); b.position.set(-Math.cos(ang) * 3.4, y, -Math.sin(ang) * 3.4);
    const g = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
    const rung = new THREE.Line(g, new THREE.LineBasicMaterial({ color: hp.rung, transparent: true, opacity: .8 }));
    group.add(a, b, rung); nodes.push({ a, b, base: c.clone(), mut: i % 4 === 1 }); rungs.push(rung);
  }
  const backbone = (sign, col) => { const pts = []; for (let i = 0; i <= 200; i++) { const t = i / 200 * (PAIRS - 1), y = (t - PAIRS / 2) * .62, ang = t * .52; pts.push(new THREE.Vector3(sign * Math.cos(ang) * 3.4, y, sign * Math.sin(ang) * 3.4)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .55 })); };
  const bb1 = backbone(1, hp.b1), bb2 = backbone(-1, hp.b2); group.add(bb1, bb2);
  addEventListener('themechange', () => {
    hp = HP(); amber.set(hp.amber);
    nodes.forEach((n, i) => { const c = new THREE.Color(hp.nodes[i % hp.nodes.length]); n.base.copy(c); n.a.material.color.copy(c); n.b.material.color.copy(c.clone().multiplyScalar(hp.dim)); });
    rungs.forEach(r => r.material.color.set(hp.rung)); bb1.material.color.set(hp.b1); bb2.material.color.set(hp.b2);
    if (!running) renderer.render(scene, camera);
  });
  group.rotation.z = .35;
  const state = { spin: 0, mutate: 0 };
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  let visible = false, last = performance.now(), T = 0;
  let running = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }).observe(canvas);
  function loop(now) {
    if (!visible) { running = false; return; } const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = Math.max(last, now); T += dt;
    group.rotation.y = (reduce ? 0 : T * .25) + state.spin * Math.PI * 2;
    nodes.forEach((n, i) => { const on = n.mut && state.mutate > 0; n.a.material.color.copy(n.base).lerp(amber, on ? state.mutate : 0); n.a.scale.setScalar(1 + (on ? state.mutate * .5 * (1 + Math.sin(T * 5 + i)) * .5 : 0)); });
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(loop); else running = false;
  }
  return state;
}

/* ================================================================ sections */
function buildTiles() {
  const pick = [...S.bots.filter(b => b.verdict === 'kill').slice(0, 5), ...S.bots.filter(b => b.verdict !== 'kill')].slice(0, 16);
  const order = pick.sort((a, b) => a.id - b.id), box = $('#tiles');
  box.innerHTML = order.map((b, i) => `<div class="tile ${b.verdict === 'kill' ? 'kill' : b.verdict === 'grace' ? 'grace' : ''}" data-v="${b.verdict}"><div class="t1"><span class="nm">${S.sample ? 'Bot ' + String(i + 1).padStart(2, '0') : esc(b.name)}</span><span class="fm">${famShort(b.fam)}</span></div><div class="st">${b.verdict === 'kill' ? 'CULLED' : b.verdict === 'grace' ? 'PROTECTED' : 'SURVIVES'}</div></div>`).join('');
  const winners = S.sample ? ['a winner'] : S.bots.filter(b => b.verdict === 'safe' && b.pnl3d > 0).map(b => b.name);
  let w = 0;
  for (const t of $$('.tile.kill', box)) {
    const nb = document.createElement('div'); nb.className = 'tile born'; nb.setAttribute('aria-hidden', 'true');
    nb.innerHTML = `<div class="t1"><span class="nm">Mutant</span><span class="fm">NEW</span></div><div class="st">${winners.length ? 'OF ' + esc(winners[w++ % winners.length]).toUpperCase() : 'NEW GENOME'}</div>`;
    box.appendChild(nb); t._born = nb;
  }
  const kills = $$('.tile.kill', box).length;
  $('#tilescount').textContent = S.sample ? 'AN EXAMPLE NIGHT, NOT REAL BOTS' : kills ? `${kills} OF ${order.length} SHOWN FACE THE CUT` : 'NOBODY FACES THE CUT RIGHT NOW';
  placeBorn();
}
function placeBorn() { for (const t of $$('.tile.kill')) if (t._born) Object.assign(t._born.style, { left: t.offsetLeft + 'px', top: t.offsetTop + 'px', width: t.offsetWidth + 'px' }); }

function geneModel() {
  const src = S.bots.find(b => b.params && Object.keys(b.params).length) || S.bots[0];
  const p = src.params || {}, extra = Object.keys(p).filter(k => !['stopATR', 'tpATR', 'trailATR', 'risk'].includes(k)).slice(0, 3);
  const g = [['STRATEGY', famShort(src.fam), 'var(--amber)'], ['PAIR', src.sym.replace('USDT', ''), 'var(--cyan)'], ['CHART', src.tf, 'var(--cyan)'],
    ...extra.map(k => [k.toUpperCase(), String(p[k]), 'var(--violet)']), ['STOP ATR', String(p.stopATR ?? '—'), 'var(--green)'], ['RISK', p.risk ? (p.risk * 100).toFixed(2) + '%' : '—', 'var(--red)'], ['LEVERAGE', src.maxLev + '×', 'var(--red)']].slice(0, 9);
  const child = g.map(([k, v, c], i) => {
    if (i === 2) return [k, v === '15m' ? '5m' : v === '5m' ? '1m' : '5m', c, 1];
    if (i === 3 && fin(+v)) return [k, String(Math.round(+v * 1.15 * 100) / 100), c, 1];
    if (i === 8) return [k, v === '10×' ? '5×' : ({ '1×': '2×', '2×': '3×', '3×': '5×', '5×': '10×' }[v] || v), c, 1];
    return [k, v, c, 0];
  });
  return { name: src.name, gen: src.gen || 0, parent: g, child };
}
function buildGenes() {
  const m = geneModel();
  $('#genes').innerHTML = m.parent.map(([k, v, c], i) => `<div class="gene" style="--c:${c}" data-i="${i}"><span class="k">${esc(k)}</span><span class="v mono">${esc(v)}</span></div>`).join('');
  $('#genewho').textContent = S.sample ? 'PARENT · EXAMPLE' : `PARENT · ${m.name.toUpperCase()} · GEN ${m.gen}`;
  return m;
}
function setGenes(m, child) {
  $('#genewho').textContent = S.sample ? (child ? 'CHILD · EXAMPLE' : 'PARENT · EXAMPLE') : child ? `CHILD · ${m.name.toUpperCase()}-II · GEN ${m.gen + 1} · EXAMPLE` : `PARENT · ${m.name.toUpperCase()} · GEN ${m.gen}`;
  $('#genemut').textContent = child ? `${m.child.filter(x => x[3]).length} GENES MUTATED` : ' ';
  for (const el of $$('#genes .gene')) {
    const i = +el.dataset.i, [, v, , mut] = (child ? m.child : m.parent)[i], vEl = el.querySelector('.v');
    el.classList.toggle('mut', !!(child && mut));
    if (vEl.textContent !== v) { if (!reduce && window.ScrambleTextPlugin) gsap.to(vEl, { duration: .8, scrambleText: { text: v, chars: '0123456789.×%', speed: .6 } }); else vEl.textContent = v; }
  }
}
function buildFams() {
  const list = S.strategies ? Object.entries(S.strategies).map(([k, v]) => [k, v.label, v.lab]) : Object.entries(FAM).map(([k, v]) => [k, v, false]).concat([['lab/failed-breakout', 'Failed breakout', true], ['lab/trend-pullback', 'Trend pullback', true]]);
  $('#fams').innerHTML = list.map(([k, l, lab]) => `<span><i style="background:${lab ? 'var(--violet)' : k === 'jev' ? 'var(--cyan)' : 'var(--amber)'}"></i>${esc(l)}${lab ? ' <em class="mono" style="font-style:normal;font-size:11px;color:var(--violet)">BY CLAUDE</em>' : ''}</span>`).join('');
}

/* lab: real code + journal from the repo */
const FALLBACK_CODE = `module.exports = {
  label: 'Failed breakout',
  desc: 'Fade bars that poke through the range and close back inside, only when ADX says ranging.',
  space: { n: [20, 40, 1], adxMax: [15, 30, 1] },
  warm: p => p.n * 3,
  decide(D, p, d) {
    // probe above the range, close back inside: short the fake-out
    const hi = I.hiN(D.h, D.i, p.n), lo = I.loN(D.l, D.i, p.n);
    ...
  },
};`;
let codeText = FALLBACK_CODE;
async function loadLab() {
  try {
    const labs = S.strategies ? Object.keys(S.strategies).filter(k => k.startsWith('lab/')) : ['lab/trend-pullback', 'lab/failed-breakout'];
    const id = labs[labs.length - 1].slice(4);
    const src = await getText(`${RAW}/main/lab/strategies/${id}.js`);
    codeText = src.split('\n').filter(l => !/^\s*\/\/\s*(Example|Available)/.test(l)).slice(0, 24).join('\n') + (src.split('\n').length > 24 ? '\n  …' : '');
    $('.lab .card-h').lastChild.textContent = `lab/strategies/${id}.js`;
  } catch (e) {}
  try {
    const j = await getText(`${RAW}/main/lab/journal.md`), parts = j.split(/\n## /).slice(1), lastE = parts[parts.length - 1];
    if (lastE) {
      const head = lastE.split('\n')[0], idea = (lastE.match(/Idea:\s*(.+)/) || [])[1];
      if (idea) $('.journal').innerHTML = `<b>JOURNAL · ${esc(head)}</b>${esc(idea.length > 260 ? idea.slice(0, 257) + '…' : idea)}`;
    }
  } catch (e) {}
}
function hl(src) {
  return esc(src).replace(/(\/\/[^\n]*)|('(?:[^'\\]|\\.)*')|\b(const|return|if|let|module|exports|function)\b/g, (m, c, s, k) => c ? `<span class="k-c">${c}</span>` : s ? `<span class="k-s">${s}</span>` : `<span class="k-k">${k}</span>`);
}
let typed = false;
function typeCode() {
  if (typed) return; typed = true;
  const el = $('#code');
  if (reduce) { el.innerHTML = hl(codeText); return; }
  let i = 0; const step = () => { i = Math.min(codeText.length, i + 3); el.innerHTML = hl(codeText.slice(0, i)) + '<span class="caret"></span>'; if (i < codeText.length) setTimeout(step, 14); }; step();
}

/* pool board */
function spark(curve, col) {
  if (!curve || curve.length < 2) return '';
  const w = 140, h = 34, vs = curve.map(c => c[1]), mn = Math.min(...vs, 1000), mx = Math.max(...vs, 1000), rg = mx - mn || 1;
  const d = vs.map((v, i) => `${i ? 'L' : 'M'}${(i / (vs.length - 1) * w).toFixed(1)} ${(h - 3 - (v - mn) / rg * (h - 6)).toFixed(1)}`).join(' ');
  const base = (h - 3 - (1000 - mn) / rg * (h - 6)).toFixed(1);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M0 ${base}H${w}" style="stroke:var(--line2)" stroke-dasharray="2 3" fill="none"/><path class="sp" d="${d}" style="stroke:${col}" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>`;
}
function renderBoard() {
  const rows = S.sample ? [] : S.bots.slice(0, 12);
  if (!rows.length) $('#board').innerHTML = `<tr><td colspan="8" class="l" style="padding:28px 12px;color:var(--muted)">${S.sample ? "Waiting for the desk's first report. Bots appear here as soon as it arrives." : 'No bots yet.'}</td></tr>`;
  else $('#board').innerHTML = rows.map((b, i) => {
    const col = b.verdict === 'kill' ? 'var(--red)' : b.pnl >= 0 ? 'var(--green)' : 'var(--muted)';
    const chip = b.verdict === 'kill' ? '<span class="chip kill">cull</span>' : b.verdict === 'grace' ? '<span class="chip grace">protected</span>' : '<span class="chip safe">safe</span>';
    const by = b.author === 'claude' ? ' <span class="chip claude">by Claude</span>' : b.fam === 'jev' ? ' <span class="chip jev">OpenJev</span>' : '';
    return `<tr><td class="l mono">${String(i + 1).padStart(2, '0')}</td><td class="l nm">${esc(b.name)}${by}<small>${esc(famLabel(b.fam, S.strategies))} · gen ${b.gen ?? 0}</small></td><td class="l">${esc(b.sym.replace('USDT', ''))} · ${esc(b.tf)} · ${b.maxLev}×</td><td>${usd(b.equity)}</td><td class="${b.pnl3d >= 0 ? 'c-green' : 'c-red'}">${susd(b.pnl3d)}</td><td>${b.trades3d ?? b.trades ?? '—'}</td><td class="l">${spark(b.curve, col)}</td><td class="l">${chip}</td></tr>`;
  }).join('');
  $('#boardnote').textContent = S.sample ? 'No bots listed until the desk publishes its first report.' : `Desk report from ${ago(Date.parse(S.generatedAt))}. Top 12 by equity.`;
  const grave = S.sample ? [] : S.graveyard.slice(0, 14), set = g => `<div class="grave-set">${g.map(x => `<span>${esc(x.name)}<em>${esc(String(x.reason || '').replace(/^fast-fail: /, ''))}</em></span>`).join('')}</div>`;
  $('#grave').innerHTML = grave.length ? set(grave) + set(grave) : '<div class="grave-set"><span style="text-decoration:none;color:var(--muted)">Empty for now</span></div>';
}
function statTargets() { if (S.sample) return { pool: 0, gen: 0, risk: 0, dead: 0 }; return { pool: S.bots.length, gen: S.gen || 0, risk: S.bots.filter(b => b.verdict === 'kill').length, dead: S.graveyard.length }; }
function setStats(animate) {
  const t = statTargets();
  for (const [k, v] of Object.entries(t)) {
    const el = $('#st-' + k);
    if (animate && !reduce) { const o = { v: 0 }; gsap.to(o, { v, duration: 1.6, ease: 'expo.out', onUpdate: () => el.textContent = Math.round(o.v) }); } else el.textContent = v;
  }
}

/* ================================================================== motion */
function initMotion(hero, helix, genes) {
  gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []), ...(window.ScrambleTextPlugin ? [ScrambleTextPlugin] : []), ...(window.DrawSVGPlugin ? [DrawSVGPlugin] : []), ...(window.CustomEase ? [CustomEase] : []));
  const EASE = window.CustomEase ? CustomEase.create('blotter', 'M0,0 C0.18,0.72 0.1,1 1,1') : 'expo.out';

  /* smooth scroll */
  if (reduce) { const how = $('.how'), track = $('#howtrack'); how.classList.add('swipe'); track.addEventListener('scroll', () => gsap.set('#howprog', { scaleX: track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) }), { passive: true }); }
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  for (const a of $$('a[href^="#"]')) a.addEventListener('click', e => { const id = a.getAttribute('href'); if (id.length < 2) return; const el = $(id); if (!el) return; e.preventDefault(); lenis ? lenis.scrollTo(el, { offset: id === '#top' ? 0 : -60, duration: 1.4 }) : el.scrollIntoView(); });

  /* nav */
  ScrollTrigger.create({ start: 60, onUpdate: s => $('#nav').classList.toggle('solid', s.scroll() > 60) });

  /* hero intro (after preloader) */
  const intro = gsap.timeline({ paused: true });
  intro.from('.hero h1 .li', { yPercent: 110, duration: 1.3, ease: EASE, stagger: .11 })
    .from('[data-hero-fade]', { y: 24, opacity: 0, duration: 1, ease: EASE, stagger: .08 }, .25)
    .from('.side > *', { y: 20, opacity: 0, duration: .9, ease: EASE, stagger: .06 }, .45)
    .from('.nav > *', { y: -20, opacity: 0, duration: .8, ease: EASE, stagger: .05 }, .1)
    .from('.tape', { yPercent: 100, duration: .9, ease: EASE }, .6);
  /* hero parallax out */
  gsap.to('.hero-grid', { yPercent: -18, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* manifesto: words light up as you scroll */
  const mp = $('#manifesto'), parts = [];
  for (const node of Array.from(mp.childNodes)) {
    const amber = node.nodeType === 1, words = node.textContent.trim().split(/\s+/);
    for (const w of words) parts.push(`<span class="w${amber ? ' amber' : ''}">${esc(w)}</span>`);
  }
  mp.innerHTML = parts.join(' ');
  gsap.to('#manifesto .w', { opacity: 1, stagger: .5, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 72%', end: 'bottom 62%', scrub: .6 } });

  const mm = gsap.matchMedia();
  // mouse + wide screen: pinned, scrubbed 3D sections. Touch devices (iPad too) and narrow screens: native swipe, no pinning.
  const DESK = '(min-width: 861px) and (hover: hover) and (pointer: fine)', TOUCH = '(max-width: 860px), (hover: none), (pointer: coarse)';
  mm.add(DESK, () => {
    /* how: horizontal pinned track */
    const track = $('#howtrack');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.how', start: 'top top', end: () => '+=' + dist(), pin: '.how-pin', scrub: .8, invalidateOnRefresh: true, onUpdate: s => gsap.set('#howprog', { scaleX: s.progress }) } });
    gsap.from('.step', { rotateY: -18, opacity: .7, transformOrigin: 'left center', stagger: .2, ease: 'none', scrollTrigger: { trigger: '.how', start: 'top top', end: () => '+=' + dist() * .4, scrub: true } });

    /* cull: pinned, scrubbed sequence */
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.cull', start: 'top top', end: '+=1900', pin: '.cull-pin', scrub: .6 } });
    tl.to(CLK, { ff: 1, duration: 5, ease: 'power3.in', onUpdate: renderClock });
    const kills = $$('.tile.kill');
    tl.to(kills, { y: () => innerHeight * .9, rotation: () => gsap.utils.random(-28, 28), opacity: 0, duration: 3, ease: 'power2.in', stagger: .25 }, 5.2);
    tl.fromTo($$('.tile.born'), { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'back.out(2)', stagger: .2 }, 7.4);
    tl.to(CLK, { ff: 0, duration: 1.8, ease: 'power2.out', onUpdate: renderClock }, '+=.6');
    tl.to({}, { duration: .6 });
    return () => { CLK.ff = 0; renderClock(); };
  });
  mm.add(TOUCH, () => {
    /* how: native swipe with snapping; the progress bar follows the swipe */
    const how = $('.how'), track = $('#howtrack');
    how.classList.add('swipe'); gsap.set(track, { clearProps: 'transform' });
    const onSwipe = () => gsap.set('#howprog', { scaleX: track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) });
    track.addEventListener('scroll', onSwipe, { passive: true }); onSwipe();
    gsap.from('.step', { x: 60, opacity: 0, duration: 1, ease: EASE, stagger: .08, scrollTrigger: { trigger: track, start: 'top 85%' } });
    const nudge = ScrollTrigger.create({ trigger: track, start: 'top 60%', once: true, onEnter: () => { if (track.scrollLeft < 4) gsap.to('.step', { x: -56, duration: .6, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: .9 }); } });
    return () => { how.classList.remove('swipe'); track.removeEventListener('scroll', onSwipe); nudge.kill(); };
  });
  mm.add(TOUCH, () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#tiles', start: 'top 75%', toggleActions: 'play none none none' } });
    tl.to(CLK, { ff: 1, duration: 2.2, ease: 'power3.in', onUpdate: renderClock })
      .to($$('.tile.kill'), { y: 500, rotation: () => gsap.utils.random(-25, 25), opacity: 0, duration: 1.2, ease: 'power2.in', stagger: .12 })
      .fromTo($$('.tile.born'), { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: .8, ease: 'back.out(2)', stagger: .1 })
      .to(CLK, { ff: 0, duration: 1.6, ease: 'power2.out', onUpdate: renderClock }, '+=1.2');
    return () => { CLK.ff = 0; renderClock(); };
  });

  /* section headings rise */
  for (const h of $$('.h2')) {
    if (window.SplitText) {
      const sp = new SplitText(h, { type: 'lines', mask: 'lines' });
      gsap.from(sp.lines, { yPercent: 105, duration: 1.2, ease: EASE, stagger: .1, scrollTrigger: { trigger: h, start: 'top 85%' } });
    } else gsap.from(h, { y: 40, opacity: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: h, start: 'top 85%' } });
  }
  gsap.utils.toArray('.body, .rules div, .legend, .fams span, .scard, .stat').forEach(el => gsap.from(el, { y: 28, opacity: 0, duration: 1, ease: EASE, scrollTrigger: { trigger: el, start: 'top 90%' } }));

  /* genome: helix spins with scroll, genes mutate halfway */
  if (helix) gsap.to(helix, { spin: 1, ease: 'none', scrollTrigger: { trigger: '.genome', start: 'top bottom', end: 'bottom top', scrub: .8 } });
  ScrollTrigger.create({ trigger: '#genes', start: 'top 45%', onEnter: () => { setGenes(genes, true); if (helix) gsap.to(helix, { mutate: 1, duration: 1 }); }, onLeaveBack: () => { setGenes(genes, false); if (helix) gsap.to(helix, { mutate: 0, duration: .6 }); } });
  gsap.from('.gene', { y: 30, opacity: 0, stagger: .05, duration: .9, ease: EASE, scrollTrigger: { trigger: '#genes', start: 'top 85%' } });

  /* lab */
  ScrollTrigger.create({ trigger: '#code', start: 'top 80%', once: true, onEnter: typeCode });
  ScrollTrigger.create({ trigger: '#jevbars', start: 'top 80%', once: true, onEnter: () => {
    $$('#jevbars .tr i').forEach((i, k) => gsap.to(i, { scaleX: +i.dataset.p, duration: 1.4, ease: EASE, delay: k * .12 }));
    $$('#jevbars .val').forEach((v, k) => { const o = { x: 0 }; gsap.to(o, { x: +v.dataset.v, duration: 1.4, ease: EASE, delay: k * .12, onUpdate: () => v.textContent = o.x.toFixed(2) }); });
  } });

  /* pool */
  ScrollTrigger.create({ trigger: '.stats', start: 'top 85%', once: true, onEnter: () => setStats(true) });
  ScrollTrigger.create({ trigger: '.board', start: 'top 85%', once: true, onEnter: () => { if (window.DrawSVGPlugin) gsap.from('.board .sp', { drawSVG: '0%', duration: 1.6, ease: EASE, stagger: .05 }); gsap.from('#board tr', { x: -20, opacity: 0, duration: .8, stagger: .04, ease: EASE }); } });

  /* big CTA: letters spread on hover */
  const bigw = $('#bigw');
  if (window.SplitText) {
    const sp = new SplitText(bigw, { type: 'words,chars', charsClass: 'c' }), mid = (sp.chars.length - 1) / 2;
    gsap.from(sp.chars, { yPercent: 100, opacity: 0, stagger: .03, duration: 1, ease: EASE, scrollTrigger: { trigger: bigw, start: 'top 88%' } });
    const a = bigw.closest('a');
    a.addEventListener('mouseenter', () => gsap.to(sp.chars, { x: i => (i - mid) * 7, duration: .8, ease: EASE }));
    a.addEventListener('mouseleave', () => gsap.to(sp.chars, { x: 0, duration: .8, ease: EASE }));
  }

  /* magnetic buttons + cursor */
  if (fine && !reduce) {
    for (const el of $$('.magnetic')) {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .3, duration: .5, ease: 'power3.out' }); });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }));
    }
    const c = $('.cursor'), xTo = gsap.quickTo(c, 'x', { duration: .35, ease: 'power3' }), yTo = gsap.quickTo(c, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); c.style.opacity = 1; }, { passive: true });
    document.addEventListener('pointerover', e => c.classList.toggle('big', !!e.target.closest('a,button')));
  }

  addEventListener('resize', () => { placeBorn(); });
  ScrollTrigger.refresh();
  return { intro, lenis };
}

/* ================================================================== boot */
async function boot() {
  for (const a of $$('[data-desk]')) { a.href = CFG.desk; if (/^https?:/.test(CFG.desk)) { a.target = '_blank'; a.rel = 'noopener'; } }
  if (CFG.bmc) { $('#bmc').href = CFG.bmc; $('#bmc').target = '_blank'; $('#bmc').rel = 'noopener'; }
  else { $('#bmc').setAttribute('aria-disabled', 'true'); $('#bmctext').textContent = 'Coffee link coming soon'; }
  initTape(); initPrices(); tickCountdown(); setInterval(tickCountdown, 1000);

  /* preloader: progress while fonts + the desk report load */
  const pct = $('#pre-pct'), bar = $('.pre-bar i'), prog = { p: 0 };
  const hasGsap = !!window.gsap;
  const loading = Promise.all([loadState(), document.fonts ? document.fonts.ready.catch(() => {}) : null, new Promise(r => setTimeout(r, reduce || window.BLOTTER_TX_ENTER ? 0 : 900))]);
  const capped = Promise.race([loading, new Promise(r => setTimeout(r, 4000))]);
  if (hasGsap && !reduce) gsap.to(prog, { p: 90, duration: 1.6, ease: 'power2.out', onUpdate: () => { pct.textContent = Math.round(prog.p); bar.style.transform = `scaleX(${prog.p / 100})`; } });
  await capped; if (!S) S = sampleState();
  loadLab(); // code sample and journal fill in when they arrive; they sit far below the fold, so don't hold the page for them

  renderStatus(); renderFeed(false); buildTiles(); const genes = buildGenes(); buildFams(); renderBoard(); setStats(false);
  const hero = heroScene($('#hero3d')); if (hero) { hero.assign(S.bots, S.sample); hero.start(); }
  const helix = helixScene($('#helix'));

  const pre = $('.pre');
  if (window.BLOTTER_TX_ENTER) {
    // arrived from another page: the page transition covers the load, so skip the preloader and play the hero intro as it lifts
    pre.remove(); document.body.classList.remove('loading');
    if (!hasGsap) $('#code').textContent = codeText;
    else { const m = initMotion(hero, helix, genes); ScrollTrigger.refresh(); if (reduce) m.intro.progress(1); else gsap.delayedCall(.2, () => m.intro.play()); }
    dispatchEvent(new Event('blotter:ready'));
  } else if (!hasGsap) { pre.remove(); document.body.classList.remove('loading'); $('#code').textContent = codeText; return; }
  else {
    const m = initMotion(hero, helix, genes);
    const out = gsap.timeline({ onComplete: () => { pre.remove(); document.body.classList.remove('loading'); ScrollTrigger.refresh(); } });
    if (reduce) { out.set(pre, { autoAlpha: 0 }); m.intro.progress(1); }
    else {
      out.to(prog, { p: 100, duration: .35, onUpdate: () => { pct.textContent = Math.round(prog.p); bar.style.transform = `scaleX(${prog.p / 100})`; } })
        .to('.pre-word span', { yPercent: -110, stagger: .04, duration: .7, ease: 'expo.in' })
        .to('.pre-bar, .pre-num', { opacity: 0, duration: .3 }, '<')
        .fromTo(pre, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.05, ease: 'expo.inOut' }, '-=.15') // the loading curtain comes down
        .add(() => m.intro.play(), '-=.55');
    }
  }

  /* keep it alive: re-read the desk report every 5 minutes */
  setInterval(async () => {
    const was = S.generatedAt; await loadState();
    if (S.generatedAt !== was) { renderStatus(); renderFeed(true); renderBoard(); setStats(false); if (hero) hero.assign(S.bots, S.sample); }
    else renderStatus();
  }, 5 * 60e3);
  setInterval(() => renderFeed(false), 60e3);
}
boot();
})();
