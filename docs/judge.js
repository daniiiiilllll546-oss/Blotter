/* The OpenJev judge on the page. BJudge.panel() fills one bot's judge box; BJudge.booth() runs the live strip.
   OpenJev answers multiple-choice questions with probabilities, not sentences, so the note is assembled by the desk
   from its answers (see src/judge.js) and typed out here when a new judgment arrives. */
window.BJudge = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROWS = [
    ['VERDICT', 'v', { keep: ['KEEP', 'g'], watch: ['WATCH', 'a'], cut: ['CUT', 'r'] }],
    ['EDGE', 'e', { skill: ['REAL EDGE', 'g'], luck: ['LUCK', 'a'], too_early: ['TOO EARLY', 'm'] }],
    ['RISK', 'r', { calm: ['CALM', 'g'], hot: ['RUNNING HOT', 'a'], reckless: ['RECKLESS', 'r'] }],
    ['IDEA', 'f', { true_to_idea: ['TRUE TO IT', 'g'], off_idea: ['OFF IDEA', 'r'], cant_tell: ["CAN'T TELL", 'm'] }],
  ];
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  function type(node, text, done) {
    clearInterval(node._ty); node.textContent = '';
    if (reduce) { node.textContent = text; done && done(); return; }
    let i = 0; node._ty = setInterval(() => { i += 1 + (i % 7 === 0); node.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(node._ty); done && done(); } }, 20);
  }
  function panel(el, j, key, info, botId, live) {
    if (!el) return;
    const stamp = j ? key + ':' + j.t : key + ':none:' + (info ? (info.enabled ? 1 : 0) + ((live && info.judging && info.judging.id === botId) ? 'j' : '') : 'x');
    if (el.dataset.jd === stamp) { const h = el.querySelector('.jd-h em'); if (h && j) h.textContent = ago(j.t).toUpperCase(); return; }
    el.dataset.jd = stamp; clearInterval((el.querySelector('.jd-note') || {})._ty);
    const head = `<div class="jd-h"><i class="jd-dot"></i>THE JUDGE · OPENJEV${j ? `<em>${esc(ago(j.t).toUpperCase())}</em>` : ''}</div>`;
    if (!j) {
      const off = info && info.enabled === false, now = live && info && info.judging && info.judging.id === botId;
      el.innerHTML = `<div class="jd ${now ? 'live' : ''}">${head}<div class="jd-wait">${off ? "The judge is off: OpenJev isn't connected to this desk." : now ? 'OpenJev is reading this bot right now…' : 'Not judged yet. OpenJev reads every bot about 20 minutes after it is born, then again every few hours.'}</div></div>`;
      return;
    }
    const rows = ROWS.map(([k, f, map]) => { const a = j[f] || {}, m = map[a.c] || [String(a.c || '—').toUpperCase(), 'm'], p = Math.round((a.p || 0) * 100);
      return `<div class="jd-r"><span class="k">${k}</span><span class="c ${m[1]}">${esc(m[0])}</span><span class="b ${m[1]}"><i data-w="${p}"></i></span><span class="p">${p}%</span></div>`; }).join('');
    el.innerHTML = `<div class="jd">${head}${rows}<p class="jd-note"><span></span><i class="jd-caret"></i></p></div>`;
    const box = el.querySelector('.jd'), note = el.querySelector('.jd-note span');
    requestAnimationFrame(() => requestAnimationFrame(() => { box.classList.add('on'); box.querySelectorAll('.b i').forEach(i => { i.style.width = i.dataset.w + '%'; }); }));
    const go = () => type(note, j.note || '', () => box.classList.add('done'));
    reduce ? go() : setTimeout(() => { if (el.dataset.jd === stamp) go(); }, 900);
  }
  let boothT = null;
  function booth(el, bots, info, onPick, live) {
    if (!el) return;
    const off = !info || info.enabled === false, judged = (bots || []).filter(b => b.judge), latest = judged.slice().sort((a, b) => b.judge.t - a.judge.t)[0];
    el.hidden = off && !latest; if (el.hidden) return;
    el.classList.toggle('off', off);
    el.querySelector('.lab').innerHTML = `<i class="jd-dot" style="width:7px;height:7px;border-radius:50%;background:currentColor;${off ? '' : 'animation:jdpulse 1.1s ease-in-out infinite'}"></i>THE JUDGE · OPENJEV`;
    el.querySelector('.cnt').textContent = `${judged.length}/${(bots || []).length} BOTS JUDGED`;
    const txt = el.querySelector('.txt'), j = live && info && info.judging;
    if (j) { clearInterval(boothT); el.dataset.bj = 'j' + j.id; txt.innerHTML = `Reading <b>${esc(j.name)}</b>…`; return; }
    if (!latest) { txt.textContent = off ? "OpenJev isn't connected to this desk." : 'Waiting for the first bot to reach 20 minutes old…'; return; }
    const stamp = latest.id + ':' + latest.judge.t; if (el.dataset.bj === stamp) return; el.dataset.bj = stamp;
    txt.innerHTML = `<b data-id="${esc(latest.id)}">${esc(latest.name)}</b><span></span>`;
    const s = txt.querySelector('span'), b = txt.querySelector('b'); b.onclick = () => onPick && onPick(latest.id);
    type(s, latest.judge.note || '');
  }
  return { panel, booth };
})();
