/* Blotter desk page.
   Data, in order of preference:
     1. same-origin /api/state  (when this page is served by the droplet itself: real-time)
     2. the desk's report on GitHub (desk-data branch, published by the droplet every 10 min)
     3. clearly-labelled sample data
   Open positions are re-marked to live Binance prices in the browser, so equity moves between reports. */
(() => {
'use strict';

const CFG = { repo: 'daniiiiilllll546-oss/Blotter', syms: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC'], START: 1000 };
const REPORT_URL = `https://raw.githubusercontent.com/${CFG.repo}/desk-data/state.json`;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fin = Number.isFinite, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usd = (v, d = 2) => fin(v) ? (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const susd = (v, d = 2) => fin(v) ? (v > 0 ? '+' : '') + usd(v, d) : '—';
const pct = (v, d = 1) => fin(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(d) + '%' : '—';
const cls = v => v > 0 ? 'up' : v < 0 ? 'dn' : 'mu';
const fmtPx = v => { if (!fin(v)) return '—'; const d = v >= 1000 ? 2 : v >= 10 ? 3 : v >= 1 ? 4 : 5; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const base = s => String(s || '').replace('USDT', '');
const agoS = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const hhmm = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m}m` : m < 2880 ? `${(m / 60).toFixed(m < 600 ? 1 : 0)}h` : `${Math.round(m / 1440)}d`; };
const FAM = { trend: 'EMA trend', donchian: 'Donchian breakout', bollinger: 'Bollinger reversion', rsi: 'RSI reversion', scalper: 'Breakout scalper', macd: 'MACD momentum', momentum: 'Momentum z-score', ml: 'GBM classifier', jev: 'OpenJev' };
const famLabel = b => b.famLabel || (S.strategies && S.strategies[b.fam] && S.strategies[b.fam].label) || FAM[b.fam] || String(b.fam).replace(/^lab\//, '').replace(/-/g, ' ');

/* ================================================================ data */
let S = null, MODE = 'sample';
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function sample() {
  const r = rng(424242), now = Date.now(), names = ['Kestrel', 'Osprey', 'Merlin', 'Harrier', 'Condor', 'Shrike', 'Heron', 'Falcon', 'Raven', 'Swift', 'Plover', 'Lapwing', 'Tern', 'Petrel', 'Gannet', 'Kite', 'Hobby', 'Buzzard', 'Egret', 'Ibis', 'Avocet', 'Curlew'];
  const fams = ['trend', 'donchian', 'bollinger', 'rsi', 'scalper', 'macd', 'momentum', 'ml', 'lab/failed-breakout', 'lab/trend-pullback', 'jev'];
  const PX = { BTC: 64000, ETH: 3100, SOL: 150, BNB: 580, XRP: .6, DOGE: .12, ADA: .45, AVAX: 28, LINK: 13, LTC: 70 };
  const bots = names.map((name, i) => {
    const drift = (r() - .5) * .0004, vol = .0004 + r() * .0008, ageH = 1 + r() * 20, n = Math.max(8, Math.min(96, Math.round(ageH))); let e = 1000, peak = 1000; const curve = [];
    for (let k = 0; k < n; k++) { curve.push([Math.floor((now - (n - 1 - k) * ageH * 3.6e6 / n) / 1000), +e.toFixed(2)]); e *= 1 + drift + (r() - .5) * vol * 2; peak = Math.max(peak, e); }
    const fam = fams[Math.floor(r() * fams.length)], s = CFG.syms[Math.floor(r() * 10)], tf = ['1m', '5m', '15m'][Math.floor(r() * 3)], trades3d = Math.floor(r() * 3), pnl3d = e - curve[Math.max(0, n - 72)][1];
    const verdict = ageH < 24 ? 'grace' : pnl3d > 0 ? 'safe' : 'kill';
    const side = r() < .6 ? (r() < .5 ? 1 : -1) : 0, avg = PX[s] * (1 + (r() - .5) * .01), q = side ? e * (1 + r() * 2) / avg : 0;
    const recent = []; let tc = now - r() * 3e6;
    for (let k = 0; k < 6; k++) { const d = r() < .5 ? 1 : -1, en = PX[s] * (1 + (r() - .5) * .04), ret = (r() - .45) * .03, o = tc - (1 + r() * 8) * 3.6e6; recent.push({ o, c: tc, side: d, entry: en, exit: en * (1 + ret * d), pnl: +(ret * 400).toFixed(2), ret }); tc = o - r() * 4e6; }
    return { id: 100 + i, name, fam, author: fam.startsWith('lab/') ? 'claude' : fam === 'jev' ? 'Jev' : null, sym: s + 'USDT', tf, maxLev: [1, 2, 3, 5, 10][Math.floor(r() * 5)], gen: Math.floor(r() * 5), parent: r() < .5 ? names[Math.floor(r() * names.length)] : null,
      ageH, status: 'live', equity: +e.toFixed(2), pnl: e - 1000, maxDD: r() * .01, trades: trades3d, win: null, pnl3d, trades3d, verdict,
      reason: verdict === 'grace' ? `first day, ${Math.round(24 - ageH)}h to go` : verdict === 'kill' ? `24h P&L ${pnl3d.toFixed(2)}` : `24h P&L +${Math.max(0, pnl3d).toFixed(2)}`,
      now: side ? `holding ${side > 0 ? 'long' : 'short'}, trailing stop at 2.0 ATR` : 'no signal: EMA spread inside the dead zone',
      params: { fast: 12 + Math.floor(r() * 10), slow: 40 + Math.floor(r() * 30), adxMin: 18, stopATR: +(1.2 + r() * 1.6).toFixed(1), tpATR: 0, trailATR: +(1 + r() * 2).toFixed(1), risk: +(.01 + r() * .025).toFixed(4) },
      pos: side ? { side, q, avg, stop: avg * (1 - side * .012), tp: r() < .4 ? avg * (1 + side * .03) : null, upnl: 0 } : null, lev: side ? q * avg / e : 0, peak, recent, curve };
  }).sort((a, b) => b.equity - a.equity);
  const ev = (kind, text, m) => ({ kind, text, t: now - m * 60e3 });
  return { sample: true, generatedAt: new Date(now).toISOString(), gen: 0, prices: {}, bots: [],
    events: [],
    culls: [], graveyard: [] };
}
function fromServer(j) { // /api/state shape (droplet) → report shape
  const t = j.now || Date.now();
  return { generatedAt: new Date(t).toISOString(), gen: j.gen, nextCull: j.nextCull, prices: j.prices || {}, events: j.events || [], culls: j.culls || [], strategies: null, judge: j.judge || null,
    graveyard: (j.graveyard || []).map(g => ({ name: g.name, fam: g.g ? g.g.fam : g.fam, sym: g.g ? g.g.sym : g.sym, tf: g.g ? g.g.tf : g.tf, author: g.author, equity: g.equity, trades: g.trades, reason: g.reason, livedH: g.died && g.born ? (g.died - g.born) / 3.6e6 : null })),
    bots: (j.bots || []).map(b => ({ ...b, pnl3d: b.w ? b.w.pnl : b.pnl3d, trades3d: b.w ? b.w.trades : b.trades3d, now: b.why, ageH: b.born ? (t - b.born) / 3.6e6 : null, parent: b.parent, params: null, recent: null })) };
}
function finish(j, mode) {
  j.bots = (j.bots || []).filter(b => fin(b.equity));
  j.bots.forEach(b => { if ((b.fam || '').startsWith('lab/duel-') && b.verdict === 'kill' && b.status !== 'stopped') { b.verdict = 'safe'; b.reason = 'Standoff bot: never cut'; } }); // the engine skips them at midnight; keep the label honest even from an older report
  j.nextCull = j.nextCull ? (typeof j.nextCull === 'number' ? j.nextCull : Date.parse(j.nextCull)) : null;
  j.sample = mode === 'sample'; MODE = mode; return j;
}
async function getJSON(url, ms = 9000) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal, cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(tm); }
}
const onDroplet = /^https?:$/.test(location.protocol) && !/github\.io$|claude\.ai$|claudeusercontent|localhost$/.test(location.hostname);
async function load() {
  if (onDroplet || MODE === 'server') { try { S = finish(fromServer(await getJSON('/api/state', 6000)), 'server'); return; } catch (e) {} }
  try { const j = await getJSON(`${REPORT_URL}?t=${Date.now()}`); if (j.bots && j.bots.length) { S = finish(j, 'report'); return; } } catch (e) {}
  if (!S) S = finish(sample(), 'sample');
}

/* ========================================================= live marking */
const px = {}; // 'BTC' → { c, o }
function livePx(b) { const p = px[base(b.sym)]; return p && fin(p.c) ? p.c : null; }
function mark(b) { // equity/uPnL re-marked to the live price (not for sample data)
  const P = b.pos, lp = livePx(b);
  if (!P || S.sample || !fin(lp)) return { eq: b.equity, upnl: P ? P.upnl : 0, px: lp, live: false };
  const upnl = (lp - P.avg) * P.q * P.side;
  return { eq: b.equity - (P.upnl || 0) + upnl, upnl, px: lp, live: true };
}

/* ============================================================ status UI */
function nextCullMs() { if (S && S.nextCull && S.nextCull > Date.now()) return S.nextCull; const t = new Date(); t.setUTCHours(19, 0, 0, 0); if (t <= new Date()) t.setUTCDate(t.getUTCDate() + 1); return +t; }
function tick() { const s = Math.max(0, Math.floor((nextCullMs() - Date.now()) / 1000)), p = n => String(n).padStart(2, '0'); $('#cut').textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; }
function renderStatus() {
  const live = $('#live'), txt = $('#livetext'), gAt = Date.parse(S.generatedAt), age = Date.now() - gAt, note = $('#srcnote');
  $('#gen').textContent = `Generation ${S.gen ?? '—'} · ${S.bots.length} bots`;
  if (MODE === 'server') { live.className = 'live'; txt.textContent = 'LIVE'; note.innerHTML = '<b>Real-time</b> straight from the desk server. Positions are marked to live Binance prices.'; }
  else if (MODE === 'report') {
    const fresh = age < 25 * 60e3; live.className = fresh ? 'live' : 'live stale'; txt.textContent = fresh ? 'LIVE' : `REPORT ${agoS(gAt).toUpperCase()}`;
    note.innerHTML = `Open positions are <b>marked to live Binance prices</b> in your browser. Trades and decisions arrive with the desk's report every 10 minutes (latest <b>${agoS(gAt)}</b>).`;
  } else { live.className = 'live sample'; txt.textContent = 'WAITING FOR DESK'; note.innerHTML = "<b>Waiting for the desk's first report.</b> No bots are shown until the desk publishes real ones. Prices on the tape are live."; }
  renderJev(); renderBooth();
}
function renderBooth() { if (window.BJudge) BJudge.booth($('#jbooth'), S.bots, S.judge, id => select(id, true), MODE === 'server'); }

function jevState() {
  const J = S && S.jev; if (!J || !J.enabled) return null;
  const errRecent = J.lastError && (!J.lastOk || J.lastError.t > J.lastOk), paused = J.pausedUntil > Date.now();
  return { J, bad: errRecent && !paused, idle: !J.calls && !J.lastError, paused };
}
function renderJev() {
  const c = $('#jevchip'), t = $('#jevtext'), st = jevState(); if (!c) return;
  if (!st) { c.hidden = true; return; }
  const { J, bad, idle, paused } = st; c.hidden = false;
  c.className = 'jevchip' + (bad ? ' bad' : idle ? ' idle' : '');
  t.textContent = bad ? 'OPENJEV ERROR' : paused ? 'OPENJEV PAUSED' : idle ? 'OPENJEV STARTING' : `OPENJEV · ${J.calls.toLocaleString('en-US')} CALLS`;
  c.title = bad ? `Last error ${agoS(J.lastError.t)}: ${J.lastError.m}` : `${J.label || 'OpenJev'} connected · ${J.calls} answers, ${J.errors} errors · last reply ${J.lastMs} ms${J.lastOk ? ', ' + agoS(J.lastOk) : ''}`;
}
function renderJevDetail(b) {
  const box = $('#d-jev'); if (!box) return;
  if (b.fam !== 'jev') { box.hidden = true; return; }
  box.hidden = false; const L = b.jevLast, st = jevState();
  if (!L) { box.innerHTML = `<b>OPENJEV'S LAST ANSWER</b><span class="mu">${st && st.bad ? 'OpenJev is failing: ' + esc(st.J.lastError.m) : 'No answer yet. It asks on every closed candle.'}</span>`; return; }
  const P = L.probs && Object.keys(L.probs).length ? L.probs : { [L.choice]: L.pr };
  const bars = ['long', 'short', 'flat'].filter(k => k in P).map(k => `<div class="row${k === L.choice ? ' pick' : ''}"><span>${L.need != null ? (k === 'long' ? 'UP' : k === 'short' ? 'DOWN' : k.toUpperCase()) : k.toUpperCase()}</span><span class="bar"><span style="width:${(P[k] * 100).toFixed(0)}%"></span></span><span>${(P[k] * 100).toFixed(0)}%</span></div>`).join('');
  const head = `<b>OPENJEV'S LAST ANSWER${fin(L.t) ? ' · ' + esc(agoS(L.t).toUpperCase()) : ''}</b>`;
  if (!L.checks || !L.checks.length) { // an answer stored before the risk engine existed
    box.innerHTML = head + bars + `<div class="mu" style="margin-top:6px">${L.need != null ? `Trades when one side reaches ${Math.round(L.need * 100)}% · ${L.pr >= L.need ? '<span style="color:var(--amber)">cleared</span>' : 'holding'}` : `Confidence ${(L.conf * 100).toFixed(0)}%`}</div>`;
    return;
  }
  const stage = L.action === 'ORDER' ? 5 : L.action === 'BLOCKED' ? 4 : 3;
  const steps = ['DATA', 'STATE', 'ASK', 'DECIDE', 'RISK', 'ORDER', 'REPEAT'].map((n, k) => `<i class="${k < stage + 1 ? 'on' : ''}${k === stage ? ' now' : ''}">${n}</i>`).join('');
  const dec = L.decision || 'HOLD', cls = dec === 'BUY' ? 'buy' : dec === 'SELL' ? 'sell' : 'hold';
  const failed = L.checks.filter(c => !c.ok);
  const note = L.action === 'ORDER' ? 'All checks passed. The engine placed the order.' : L.action === 'BLOCKED' ? `Risk engine blocked it: ${failed.map(c => c.label.toLowerCase()).join(', ')}.` : 'No edge, so no order.';
  const plan = L.plan ? `<div class="jsec">ORDER PLAN${L.action === 'ORDER' ? '' : ' (NOT PLACED)'}</div><div class="plan"><span>ENTRY <u>${fmtPx(L.plan.entry)}</u></span><span>STOP <u>${fmtPx(L.plan.stop)}</u></span><span>TARGET <u>${fmtPx(L.plan.target)}</u></span><span class="mu">${L.plan.rr}:1</span></div>` : '';
  box.innerHTML = head + `<div class="jloop">${steps}</div>` +
    `<div class="jdec"><span class="jbadge ${cls}">${dec}</span><span class="mu">confidence ${(L.conf * 100).toFixed(0)}%</span></div>` + bars +
    `<div class="jsec">RISK ENGINE</div>` + L.checks.map(c => `<div class="chk ${c.ok ? 'ok' : 'no'}"><span class="mk">${c.ok ? '✓' : '✗'}</span><span>${esc(c.label)}</span><span class="mu">${esc(c.detail)}</span></div>`).join('') +
    `<div class="mu" style="margin-top:6px">${esc(note)}</div>` + plan +
    (L.facts && L.facts.length ? `<div class="jsec">WHAT JEV WAS SHOWN</div><div class="mu">${L.facts.map(esc).join(' · ')}</div>` : '') +
    (L.reason ? `<div class="jsec">JEV'S REASON</div><div class="mu">${esc(L.reason)}</div>` : '') +
    `<div class="jsec">NEXT CHECK</div><div class="mu">on the next ${esc(L.nextCheck || b.tf)} candle close</div>`;
}

/* ================================================================ stats */
const shown = {};
function setNum(id, v, fmt, first) {
  const el = $('#' + id); if (!el) return;
  if (first && !reduce && window.gsap) { const o = { v: shown[id] ?? 0 }; gsap.to(o, { v, duration: 1.4, ease: 'expo.out', onUpdate: () => el.textContent = fmt(o.v) }); }
  else el.textContent = fmt(v);
  shown[id] = v;
}
function renderStats(first) {
  const bots = S.bots.filter(b => b.status !== 'stopped'), all = S.bots, m = all.map(mark);
  const eq = m.reduce((a, x) => a + x.eq, 0), start = all.length * CFG.START, open = all.filter(b => b.pos), longs = open.filter(b => b.pos.side > 0).length;
  setNum('s-eq', eq, v => usd(v, 0), first); $('#s-eq2').textContent = `vs ${usd(start, 0)} start`;
  setNum('s-pnl', eq - start, v => susd(v, 0), first); $('#s-pnl').className = 'v mono ' + cls(eq - start); $('#s-pnl2').textContent = start ? pct((eq - start) / start, 2) + ' overall' : '';
  setNum('s-alive', bots.length, v => Math.round(v), first); $('#s-alive2').textContent = `${all.filter(b => b.author === 'claude').length} by Claude · ${all.filter(b => b.fam === 'jev').length} OpenJev`;
  setNum('s-open', open.length, v => Math.round(v), first); $('#s-open2').textContent = `${longs} long · ${open.length - longs} short`;
  const risk = all.filter(b => b.verdict === 'kill').length;
  setNum('s-risk', risk, v => Math.round(v), first); $('#s-risk').className = 'v mono ' + (risk ? 'dn' : ''); $('#s-risk2').textContent = 'if the cut were now';
  setNum('s-dead', S.graveyard.length, v => Math.round(v), first); $('#s-dead2').textContent = S.graveyard.length >= 40 ? 'most recent 40' : 'since launch';
}

/* ========================================================== leaderboard */
const FILTERS = [['all', 'All', () => true], ['safe', 'Survives', b => b.verdict === 'safe'], ['grace', 'Protected', b => b.verdict === 'grace'], ['kill', 'Facing cut', b => b.verdict === 'kill'],
  ['pos', 'In a trade', b => !!b.pos], ['claude', 'By Claude', b => b.author === 'claude'], ['jev', 'OpenJev', b => b.fam === 'jev']];
let filt = 'all', sortK = 'equity', sortD = -1, sel = null;
function renderFilters() {
  $('#filters').innerHTML = FILTERS.map(([k, l, f]) => { const n = S.bots.filter(f).length; return (k === 'all' || n) ? `<button class="fchip" type="button" data-f="${k}" aria-pressed="${filt === k}">${l}<b>${n}</b></button>` : ''; }).join('');
}
function list() {
  const f = FILTERS.find(x => x[0] === filt)[2], val = b => sortK === 'equity' ? mark(b).eq : sortK === 'name' ? b.name : b[sortK] ?? -Infinity;
  return S.bots.filter(f).sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortD; });
}
function spark(curve, w, h, col, extra = '') {
  if (!curve || curve.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
  const vs = curve.map(c => c[1]), mn = Math.min(...vs, CFG.START), mx = Math.max(...vs, CFG.START), rg = mx - mn || 1, y = v => (h - 2 - (v - mn) / rg * (h - 4)).toFixed(1);
  const d = vs.map((v, i) => `${i ? 'L' : 'M'}${(i / (vs.length - 1) * w).toFixed(1)} ${y(v)}`).join('');
  return `<svg class="spk" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${y(CFG.START)}H${w}" style="stroke:var(--line2)" stroke-dasharray="2 3" fill="none" vector-effect="non-scaling-stroke"/><path ${extra} d="${d}" style="stroke:${col}" stroke-width="1.5" fill="none" stroke-linejoin="round" vector-effect="non-scaling-stroke" pathLength="1"/></svg>`;
}
const colOf = b => b.status === 'stopped' || b.verdict === 'kill' ? 'var(--red)' : b.equity >= CFG.START ? 'var(--green)' : 'var(--muted)';
const vchip = b => b.status === 'stopped' ? '<span class="vchip stopped">stopped</span>' : b.verdict === 'kill' ? '<span class="vchip kill" title="Will be killed at the midnight cut if nothing changes">cut tonight</span>' : b.verdict === 'grace' ? '<span class="vchip grace">protected</span>' : '<span class="vchip safe">survives</span>';
const tagOf = b => b.author === 'claude' ? '<span class="tag claude">Claude</span>' : b.fam === 'jev' ? '<span class="tag jev">OpenJev</span>' : '';
function posHTML(b) {
  if (!b.pos) return '<span class="pos flat">FLAT</span>';
  const m = mark(b);
  return `<span class="pos ${b.pos.side > 0 ? 'long' : 'short'}">${b.pos.side > 0 ? 'LONG' : 'SHORT'} ${fin(b.lev) ? (b.lev || 0).toFixed(1) + '×' : ''}</span> <span class="${cls(m.upnl)}" data-up="${b.id}">${susd(m.upnl)}</span>`;
}
function renderBoard() {
  const L = list();
  $('#lbmeta').textContent = `${L.length} shown`;
  $('#rows').innerHTML = L.map((b, i) => { const m = mark(b); return `<tr class="row${b.id === sel ? ' sel' : ''}${b.status === 'stopped' ? ' dead' : ''}" data-id="${b.id}" tabindex="0" aria-label="${esc(b.name)}, open details">
    <td class="l rk">${String(i + 1).padStart(2, '0')}</td>
    <td class="l bot"><span class="nm">${esc(b.name)}</span>${tagOf(b)}<span class="sub">${esc(base(b.sym))} ${esc(b.tf)} · ${b.maxLev}× · ${esc(famLabel(b))} · gen ${b.gen ?? 0}${fin(b.ageH) ? ' · ' + dur(b.ageH * 3.6e6) + ' old' : ''}</span></td>
    <td class="l">${posHTML(b)}</td>
    <td><span class="eqv" data-eq="${b.id}">${usd(m.eq)}</span></td>
    <td class="${cls(b.pnl3d)}">${susd(b.pnl3d)}</td>
    <td>${b.trades3d ?? '—'}</td>
    <td class="l cv">${spark(b.curve, 96, 28, colOf(b))}</td>
    <td class="l">${vchip(b)}</td></tr>`; }).join('') || `<tr><td colspan="8" class="l empty">${S.bots.length ? 'No bots match this filter.' : "No bots yet. They appear as soon as the desk publishes its first report."}</td></tr>`;
  $('#cards').innerHTML = L.map((b, i) => { const m = mark(b); return `<button class="card${b.id === sel ? ' sel' : ''}" type="button" data-id="${b.id}">
    <span><span class="nm">${esc(b.name)}</span>${tagOf(b)}<span class="sub">${String(i + 1).padStart(2, '0')} · ${esc(base(b.sym))} ${esc(b.tf)} · ${esc(famLabel(b))}</span></span>
    <span class="eqc"><span class="eqv" data-eq="${b.id}">${usd(m.eq)}</span><small class="${cls(b.pnl3d)}">${susd(b.pnl3d)} 24h</small></span>
    <span class="r2"><span>${posHTML(b)}</span>${spark(b.curve, 90, 24, colOf(b))}${vchip(b)}</span></button>`; }).join('') || `<div class="empty">${S.bots.length ? 'No bots match this filter.' : 'No bots yet. They appear as soon as the desk publishes its first report.'}</div>`;
  for (const th of $$('.lb th[data-k]')) th.toggleAttribute('aria-sort', th.dataset.k === sortK), th.dataset.k === sortK && th.setAttribute('aria-sort', sortD < 0 ? 'descending' : 'ascending');
}

/* ========================================================= small multiples */
function renderMult() {
  const L = S.bots.slice().sort((a, b) => mark(b).eq - mark(a).eq);
  if (!L.length) { $('#mult').innerHTML = '<div class="empty" style="background:var(--panel);grid-column:1/-1">Nothing to draw yet.</div>'; return; }
  $('#mult').innerHTML = L.map(b => { const m = mark(b); return `<button class="mc${b.id === sel ? ' sel' : ''}" type="button" data-id="${b.id}">
    <span class="t"><span class="n">${esc(b.name)}</span><span class="e ${cls(m.eq - CFG.START)}" data-eq2="${b.id}">${usd(m.eq, 0)}</span></span>
    <span class="m">${esc(base(b.sym))} ${esc(b.tf)} · ${esc(famLabel(b))}</span>
    ${spark(b.curve, 200, 64, colOf(b), 'class="ln"')}</button>`; }).join('');
}

/* ================================================================ log */
const EVC = { spawn: 'var(--violet)', fastfail: 'var(--red)', claudekill: 'var(--red)', laberror: 'var(--muted)', cull: 'var(--amber)', reset: 'var(--amber)' };
const EVL = { spawn: 'Born', fastfail: 'Fast-fail', claudekill: 'Removed by Claude', laberror: 'Rejected', reset: 'Desk reset', rules: 'Rules' };
function renderLog() {
  const items = (S.events || []).map(e => ({ ...e, t: typeof e.t === 'number' ? e.t : Date.parse(e.t) }));
  for (const c of S.culls || []) items.push({ kind: 'cull', t: c.t, c });
  items.sort((a, b) => b.t - a.t);
  $('#log').innerHTML = items.slice(0, 80).map(e => {
    if (e.kind === 'cull') { const c = e.c; return `<div class="ev cull"><time>${hhmm(c.t)}<br>${agoS(c.t)}</time><span class="dot" style="background:${EVC.cull}"></span><div class="tx"><b>Midnight cut · generation ${c.gen}</b><small>Removed ${c.killed.length ? c.killed.map(k => `${esc(k.name)} (${esc(k.reason)})`).join(', ') : 'nobody'}</small><small>Born ${c.born.length ? c.born.map(k => `${esc(k.name)}${k.parent ? ' ← ' + esc(k.parent) : ''}`).join(', ') : 'nobody'}</small></div></div>`; }
    return `<div class="ev"><time>${fin(e.t) ? hhmm(e.t) + '<br>' + agoS(e.t) : ''}</time><span class="dot" style="background:${EVC[e.kind] || 'var(--muted)'}"></span><div class="tx"><b>${EVL[e.kind] || 'Event'}</b> · ${esc(e.text)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</div></div>`;
  }).join('') || '<div class="empty">Nothing yet. Claude adds a bot every hour and the cut is every midnight Tashkent time.</div>';
  $('#graves').innerHTML = (S.graveyard || []).map(g => `<div class="grave"><div class="n">${esc(g.name)}</div><div class="r">${esc(g.reason)}</div><div class="q"><span class="${cls((g.equity || 0) - CFG.START)}">${usd(g.equity, 0)}</span> · ${g.trades ?? 0} trades${fin(g.livedH) ? ' · lived ' + dur(g.livedH * 3.6e6) : ''}</div><div class="r">${esc(base(g.sym))} ${esc(g.tf || '')} · ${esc(famLabel(g))}</div></div>`).join('') || '<div class="empty" style="background:var(--panel)">Empty. Nobody has been cut yet.</div>';
  $('#gravemeta').textContent = S.graveyard.length ? `${S.graveyard.length} bots` : '';
}

/* ============================================================== detail */
let chart = null, series = null, lines = [], chartTf = null, chartKey = '', kws = null;
const GENE = { fast: 'Fast EMA', slow: 'Slow EMA', adxMin: 'Min ADX', entryN: 'Entry bars', exitN: 'Exit bars', stopATR: 'Stop ATR', tpATR: 'Target ATR', trailATR: 'Trail ATR', risk: 'Risk / trade', n: 'Lookback', k: 'Band width', lo: 'Buy below', hi: 'Sell above', minProb: 'Edge bar', minConf: 'Min conf.', minLev: 'Min leverage' };
const geneVal = (k, v) => k === 'risk' ? (v * 100).toFixed(2) + '%' : k === 'minLev' ? v + '×' : fin(v) ? (Math.abs(v) < 10 && v % 1 ? +v.toFixed(2) : v) : String(v);
function select(id, openSheet) {
  const b = S.bots.find(x => x.id === +id); if (!b) return;
  const changed = sel !== b.id; sel = b.id;
  for (const el of $$('[data-id]')) el.classList.toggle('sel', +el.dataset.id === sel);
  renderDetail(b, changed);
  if (openSheet && matchMedia('(max-width: 1180px)').matches) { $('#detail').classList.add('open'); document.body.classList.add('sheet'); $('#detail').scrollTop = 0; }
  if (changed) history.replaceState(null, '', '#bot-' + b.id);
  if (MODE === 'server' && changed) getJSON('/api/bot/' + b.id).then(d => { if (sel !== b.id) return; b.params = d.genome && d.genome.p; b.recent = (d.recent || []).slice(0, 8); renderDetail(b, false); }).catch(() => {});
}
function closeSheet() { $('#detail').classList.remove('open'); document.body.classList.remove('sheet'); }
function renderDetail(b, changed) {
  const m = mark(b), nameEl = $('#d-name');
  if (changed && !reduce && window.ScrambleTextPlugin) gsap.to(nameEl, { duration: .7, scrambleText: { text: b.name, chars: 'ABCDEFGHIJKLMNOPRSTUVWXYZ', speed: .5 } }); else nameEl.textContent = b.name;
  $('#d-fam').innerHTML = `${esc(famLabel(b))} · ${esc(base(b.sym))} ${esc(b.tf)} · up to ${b.maxLev}×${b.author === 'claude' ? ' · <span style="color:var(--violet)">designed by Claude</span>' : b.fam === 'jev' ? ' · <span style="color:var(--cyan)">asks OpenJev</span>' : ''}`;
  $('#d-eq').innerHTML = `<span data-eq="${b.id}" class="eqv">${usd(m.eq)}</span>`;
  $('#d-pnl').innerHTML = `<span class="${cls(m.eq - CFG.START)}">${susd(m.eq - CFG.START)} · ${pct((m.eq - CFG.START) / CFG.START)}</span>`;
  $('#d-verdict').innerHTML = `${vchip(b)}<span>${esc(b.reason || '')}</span>${fin(b.ageH) ? `<span class="mu">· ${dur(b.ageH * 3.6e6)} old</span>` : ''}`;
  $('#d-think span').textContent = b.now || '—';
  renderJevDetail(b);
  if (window.BJudge) BJudge.panel($('#d-judge'), b.judge, 'b' + b.id, S.judge, b.id, MODE === 'server');
  renderPos(b);
  renderEquity(b);
  const p = b.params;
  $('#d-genes').innerHTML = p ? Object.entries(p).map(([k, v], i) => `<div class="gene" style="--gc:${['var(--amber)', 'var(--cyan)', 'var(--violet)', 'var(--green)', 'var(--red)'][i % 5]}"><div class="k">${esc(GENE[k] || k)}</div><div class="v">${esc(geneVal(k, v))}</div></div>`).join('') : '<div class="mu mono" style="font-size:12px">Genes arrive with the desk report.</div>';
  $('#d-gen').textContent = `gen ${b.gen ?? 0}`;
  $('#d-lineage').innerHTML = b.parent ? `Mutant of <b>${esc(b.parent)}</b>` : b.author === 'claude' ? 'New species, written by Claude' : 'Founder, no parent';
  const R = b.recent || [];
  $('#d-tcount').textContent = `${b.trades ?? 0} total · ${fin(b.win) && b.win != null ? Math.round(b.win * 100) + '% won' : '—'}`;
  $('#d-trades').innerHTML = R.length ? `<table class="trades">${R.map(t => `<tr><td><span class="pos ${t.side > 0 ? 'long' : 'short'}">${t.side > 0 ? 'L' : 'S'}</span> <span class="mu">${fin(t.c) ? agoS(t.c) : ''}</span></td><td class="mu">${fmtPx(t.entry)} → ${fmtPx(t.exit)}</td><td class="mu">${fin(t.o) && fin(t.c) ? dur(t.c - t.o) : ''}</td><td class="${cls(t.pnl)}">${susd(t.pnl)}</td></tr>`).join('')}</table>` : '<div class="mu mono" style="font-size:12px">No closed trades in the report yet.</div>';
  if (changed || chartKey !== b.sym) { chartTf = ['1m', '5m', '15m'].includes(b.tf) ? b.tf : '5m'; loadChart(b); }
  else drawLines(b);
}
function renderPos(b) {
  const P = b.pos, m = mark(b), box = $('#d-pos');
  $('#d-posmark').innerHTML = P ? (m.live ? '<span class="up">MARKED LIVE</span>' : S.sample ? 'SAMPLE' : 'AT REPORT PRICE') : '';
  if (!P) { box.innerHTML = '<div class="mu mono" style="font-size:13px">Flat. Waiting for its next signal.</div>'; return; }
  const lp = m.px ?? P.avg, stopD = P.stop ? Math.abs(lp - P.stop) / lp : null;
  box.innerHTML = `<div class="poscard">
    <div><div class="k">SIDE · ${(b.lev || 0).toFixed(1)}×</div><div class="v ${P.side > 0 ? 'up' : 'dn'}">${P.side > 0 ? 'LONG' : 'SHORT'}</div></div>
    <div><div class="k">ENTRY</div><div class="v">${fmtPx(P.avg)}</div></div>
    <div><div class="k">NOW</div><div class="v" data-px="${b.id}">${fmtPx(m.px ?? P.avg)}</div></div>
    <div><div class="k">STOP</div><div class="v dn">${fmtPx(P.stop)}</div></div>
    <div><div class="k">TARGET</div><div class="v up">${P.tp ? fmtPx(P.tp) : 'trail'}</div></div>
    <div><div class="k">UNREALIZED</div><div class="v ${cls(m.upnl)}" data-up="${b.id}">${susd(m.upnl)}</div></div></div>
    ${stopD != null ? `<div class="risk"><span class="rs" style="width:${Math.min(100, Math.max(4, 100 - stopD * 2500)).toFixed(0)}%"></span></div><div class="risk-lb"><span>${(stopD * 100).toFixed(2)}% from its stop</span><span>size ${usd(P.q * lp, 0)}</span></div>` : ''}`;
}
function renderEquity(b) {
  const c = (b.curve || []).slice(), m = mark(b), svg = $('#d-eqsvg'); if (m.live) c.push([Math.floor(Date.now() / 1000), m.eq]);
  $('#d-peak').textContent = fin(b.peak) && b.peak ? `peak ${usd(b.peak, 0)} · max drawdown ${pct(-(b.maxDD || 0))}` : '';
  if (c.length < 2) { svg.innerHTML = ''; return; }
  const W = 400, H = 120, vs = c.map(x => x[1]), mn = Math.min(...vs, CFG.START), mx = Math.max(...vs, CFG.START), rg = mx - mn || 1, y = v => (H - 6 - (v - mn) / rg * (H - 12)).toFixed(1);
  const pts = vs.map((v, i) => `${(i / (vs.length - 1) * W).toFixed(1)},${y(v)}`), col = colOf(b);
  svg.innerHTML = `<defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col}" stop-opacity=".28"/><stop offset="1" style="stop-color:${col}" stop-opacity="0"/></linearGradient></defs>
    <path d="M0 ${y(CFG.START)}H${W}" style="stroke:var(--line2)" stroke-dasharray="3 4" fill="none" vector-effect="non-scaling-stroke"/>
    <path d="M${pts.join('L')}L${W},${H}L0,${H}Z" fill="url(#eqg)"/>
    <path d="M${pts.join('L')}" style="stroke:${col}" stroke-width="2" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
}

/* candles: straight from Binance in the visitor's browser */
const TFS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
// canvas colours for the price chart, per theme (CSS variables can't reach a canvas)
const CT = () => (window.BTHEME && BTHEME.light)
  ? { text: '#6B7278', grid: '#E6DFD2', border: '#DED6C6', cross: '#E7C58C', amber: '#B8700F', green: '#1D8350', red: '#CC3F37' }
  : { text: '#8593A0', grid: '#1A2630', border: '#22313D', cross: '#6B4E1F', amber: '#E8A33D', green: '#3EC690', red: '#F0625A' };
const chartOpts = c => ({ layout: { background: { type: 'solid', color: 'transparent' }, textColor: c.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 },
  grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } }, rightPriceScale: { borderColor: c.border }, timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
  crosshair: { mode: 0, vertLine: { color: c.cross, labelBackgroundColor: c.amber }, horzLine: { color: c.cross, labelBackgroundColor: c.amber } } });
const seriesOpts = c => ({ upColor: c.green, downColor: c.red, borderVisible: false, wickUpColor: c.green, wickDownColor: c.red });
function ensureChart() {
  if (chart || !window.LightweightCharts) return !!chart;
  chart = LightweightCharts.createChart($('#chart'), { autoSize: true, localization: { locale: 'en-US' }, ...chartOpts(CT()), handleScroll: true, handleScale: true });
  series = chart.addCandlestickSeries({ ...seriesOpts(CT()), priceFormat: { type: 'price', precision: 4, minMove: .0001 } });
  return true;
}
addEventListener('themechange', () => {
  if (!chart) return;
  chart.applyOptions(chartOpts(CT())); series.applyOptions(seriesOpts(CT()));
  const b = S && S.bots && S.bots.find(x => x.id === sel); if (b) drawLines(b);
});
function drawLines(b) {
  if (!series) return;
  for (const l of lines) series.removePriceLine(l); lines = [];
  const c = CT(), P = b.pos, add = (price, color, title, style = 2) => fin(price) && lines.push(series.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }));
  if (P) { add(P.avg, c.amber, 'entry'); add(P.stop, c.red, 'stop'); if (P.tp) add(P.tp, c.green, 'target'); }
  const tf = TFS[chartTf], first = series.data().length ? series.data()[0].time : 0;
  const mk = [];
  for (const t of b.recent || []) {
    if (fin(t.o) && t.o / 1000 >= first) mk.push({ time: Math.floor(t.o / 1000 / tf) * tf, position: t.side > 0 ? 'belowBar' : 'aboveBar', color: t.side > 0 ? c.green : c.red, shape: t.side > 0 ? 'arrowUp' : 'arrowDown', text: t.side > 0 ? 'L' : 'S' });
    if (fin(t.c) && t.c / 1000 >= first) mk.push({ time: Math.floor(t.c / 1000 / tf) * tf, position: 'inBar', color: t.pnl >= 0 ? c.green : c.red, shape: 'circle', text: '' });
  }
  if (P && fin(P.ot) && P.ot / 1000 >= first) mk.push({ time: Math.floor(P.ot / 1000 / tf) * tf, position: P.side > 0 ? 'belowBar' : 'aboveBar', color: c.amber, shape: P.side > 0 ? 'arrowUp' : 'arrowDown', text: 'open' });
  mk.sort((a, b) => a.time - b.time);
  try { series.setMarkers(mk); } catch (e) {}
}
async function loadChart(b) {
  const empty = $('#chartempty'), key = b.sym + chartTf; chartKey = b.sym;
  $('#d-chartlb').textContent = `${base(b.sym)} / USDT · ${chartTf}`;
  $('#d-tfs').innerHTML = Object.keys(TFS).map(t => `<button type="button" data-tf="${t}" aria-pressed="${t === chartTf}">${t}</button>`).join('');
  if (!ensureChart()) { empty.textContent = 'Chart library unavailable.'; empty.style.display = ''; return; }
  empty.textContent = 'Loading candles…'; empty.style.display = '';
  const p = livePx(b) ?? (b.pos && b.pos.avg) ?? 1, prec = p >= 1000 ? 2 : p >= 10 ? 3 : p >= 1 ? 4 : 5;
  series.applyOptions({ priceFormat: { type: 'price', precision: prec, minMove: 1 / 10 ** prec } });
  try {
    const k = await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${b.sym}&interval=${chartTf}&limit=300`);
    if (sel !== b.id || b.sym + chartTf !== key) return;
    series.setData(k.map(x => ({ time: x[0] / 1000, open: +x[1], high: +x[2], low: +x[3], close: +x[4] })));
    chart.timeScale().fitContent(); empty.style.display = 'none';
    drawLines(b); streamKline(b.sym, chartTf);
  } catch (e) {
    series.setData([]); drawLines(b);
    empty.innerHTML = "Couldn't reach Binance from this browser.<br>Positions and equity above still work.";
  }
}
function streamKline(sym, tf) {
  if (kws) { kws.onclose = null; kws.close(); kws = null; }
  try {
    kws = new WebSocket(`wss://data-stream.binance.vision/ws/${sym.toLowerCase()}@kline_${tf}`);
    kws.onmessage = m => { try { const k = JSON.parse(m.data).k; series.update({ time: k.t / 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c }); } catch (e) {} };
  } catch (e) {}
}

/* ========================================================= live prices */
function initTape() { const set = `<div class="tape-set">${CFG.syms.map(s => `<span data-sym="${s}"><b>${s}</b><em class="p">—</em><em class="c"></em></span>`).join('')}</div>`; $('#tape').innerHTML = set + set; }
function paintSym(s) {
  const d = px[s]; if (!d) return; const ch = d.o ? (d.c / d.o - 1) : 0;
  for (const el of $$(`[data-sym="${s}"]`)) { el.querySelector('.p').textContent = fmtPx(d.c); const c = el.querySelector('.c'); c.textContent = d.o ? pct(ch, 2) : ''; c.className = 'c ' + cls(ch); }
}
let dirty = false;
function onPrice(s, c, o) { const prev = px[s]; px[s] = { c, o: o ?? (prev && prev.o) }; paintSym(s); dirty = true; }
function initPrices() {
  const list = CFG.syms.map(s => s + 'USDT');
  const rest = async () => { try { const d = await getJSON(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(list))}`); for (const t of d) onPrice(base(t.symbol), +t.lastPrice, +t.openPrice); } catch (e) {} };
  rest(); let tries = 0, poll = null;
  const connect = () => {
    let ws; try { ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${list.map(s => s.toLowerCase() + '@miniTicker').join('/')}`); } catch (e) { return; }
    ws.onopen = () => { tries = 0; };
    ws.onmessage = m => { try { const d = JSON.parse(m.data).data; onPrice(base(d.s), +d.c, +d.o); } catch (e) {} };
    ws.onclose = () => { if (++tries < 6) setTimeout(connect, 2500 * tries); else if (!poll) poll = setInterval(rest, 20000); };
  };
  connect();
}
const lastEq = {};
function remark() { // update live-marked numbers in place, once a second at most
  if (!dirty || !S) return; dirty = false;
  for (const b of S.bots) {
    if (!b.pos) continue; const m = mark(b); if (!m.live) continue;
    const prev = lastEq[b.id]; lastEq[b.id] = m.eq;
    for (const el of $$(`[data-eq="${b.id}"]`)) { el.textContent = usd(m.eq); if (prev != null && Math.abs(m.eq - prev) >= .005) { el.classList.remove('fu', 'fd'); void el.offsetWidth; el.classList.add(m.eq > prev ? 'fu' : 'fd'); setTimeout(() => el.classList.remove('fu', 'fd'), 60); } }
    for (const el of $$(`[data-eq2="${b.id}"]`)) { el.textContent = usd(m.eq, 0); el.className = 'e ' + cls(m.eq - CFG.START); }
    for (const el of $$(`[data-up="${b.id}"]`)) { el.textContent = susd(m.upnl); el.className = el.className.replace(/\b(up|dn|mu)\b/g, '').trim() + ' ' + cls(m.upnl); }
    for (const el of $$(`[data-px="${b.id}"]`)) el.textContent = fmtPx(m.px);
  }
  renderStats(false);
  const b = S.bots.find(x => x.id === sel); if (b && b.pos) { const m = mark(b); $('#d-pnl').innerHTML = `<span class="${cls(m.eq - CFG.START)}">${susd(m.eq - CFG.START)} · ${pct((m.eq - CFG.START) / CFG.START)}</span>`; }
}

/* ================================================================ wiring */
function renderAll(first) {
  renderStatus(); renderStats(first); renderFilters(); renderBoard(); renderMult(); renderLog();
  const want = sel ?? +(location.hash.match(/bot-(\d+)/) || [])[1];
  select(S.bots.some(b => b.id === want) ? want : S.bots[0] && S.bots[0].id, false);
}
function wire() {
  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; filt = b.dataset.f; renderFilters(); renderBoard(); });
  $('.lb thead').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; const k = b.dataset.sort; if (sortK === k) sortD = -sortD; else { sortK = k; sortD = k === 'name' ? 1 : -1; } renderBoard(); });
  const pick = e => { const r = e.target.closest('[data-id]'); if (r && !e.target.closest('#detail')) select(r.dataset.id, true); };
  for (const id of ['#rows', '#cards', '#mult']) $(id).addEventListener('click', pick);
  $('#rows').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.id) { e.preventDefault(); select(e.target.dataset.id, true); } });
  $('#dtclose').addEventListener('click', closeSheet);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  $('#d-tfs').addEventListener('click', e => { const t = e.target.closest('[data-tf]'); if (!t) return; chartTf = t.dataset.tf; const b = S.bots.find(x => x.id === sel); if (b) loadChart(b); });
  addEventListener('hashchange', () => { const m = location.hash.match(/bot-(\d+)/); if (m && +m[1] !== sel) select(+m[1], true); });
}
async function boot() {
  initTape(); initPrices(); tick(); setInterval(tick, 1000); wire();
  await load(); renderAll(true);
  if (window.gsap && !reduce) gsap.to('.rise', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .07 });
  else for (const el of $$('.rise')) { el.style.opacity = 1; el.style.transform = 'none'; }
  setInterval(remark, 1000);
  setInterval(async () => {
    const was = S.generatedAt; await load();
    if (S.generatedAt !== was) { renderStatus(); renderStats(false); renderFilters(); renderBoard(); renderMult(); renderLog(); const b = S.bots.find(x => x.id === sel); if (b) renderDetail(b, false); else if (S.bots[0]) select(S.bots[0].id, false); }
    else renderStatus();
  }, MODE === 'server' ? 15000 : 60000);
}
boot();
})();
