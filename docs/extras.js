/* shared bits: share buttons (X, copy link, native share) and the dismissible start-here strip */
(() => {
  const ICON = { x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.9 22H3l7-8L2 2h6.1l4.2 5.6L18.2 2Zm-1 18h1.6L7 3.7H5.3L17.2 20Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>' };
  const CFG = window.BLOTTER_CFG || {};
  document.querySelectorAll('[data-share]').forEach(box => {
    const url = box.dataset.url || location.href.split('#')[0], text = box.dataset.share;
    let html = `<a href="https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">${ICON.x}Share on X</a>`
      + `<button type="button" data-copy>${ICON.link}<span>Copy link</span></button>`;
    if (box.hasAttribute('data-coffee') && CFG.bmc) html += `<a class="coffee" href="${CFG.bmc}" target="_blank" rel="noopener">${ICON.cup}Buy me a coffee</a>`;
    box.innerHTML = html;
    box.querySelector('[data-copy]').addEventListener('click', async e => {
      const b = e.currentTarget, s = b.querySelector('span');
      if (navigator.share && matchMedia('(pointer:coarse)').matches) { try { await navigator.share({ title: document.title, text, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); s.textContent = 'Link copied'; } catch (err) { s.textContent = url; }
      setTimeout(() => { s.textContent = 'Copy link'; }, 2400);
    });
  });
  document.querySelectorAll('[data-starthere]').forEach(el => {
    const key = 'blotter-starthere-' + el.dataset.starthere;
    try { if (localStorage.getItem(key)) { el.remove(); return; } } catch (e) {}
    el.querySelector('[data-close]').addEventListener('click', () => { el.remove(); try { localStorage.setItem(key, '1'); } catch (e) {} });
  });

  /* ---------- first-visit guide: 4 short cards, shown once, reopened by any [data-guide-open] ---------- */
  const IC = {
    wallet: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="8" y="16" width="48" height="36"/><path d="M8 26h48"/><path d="M40 38h8"/><polyline points="14 10 46 10 46 16"/></svg>',
    born: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="34" r="20"/><path d="M32 22v12l8 6"/><path d="M32 6v6M22 8l2 5M42 8l-2 5"/></svg>',
    kill: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 18 20 30 30 22 44 40 58 46"/><path d="M50 8l10 10M60 8L50 18"/><path d="M6 56h52"/></svg>',
    look: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="10" width="52" height="40"/><path d="M6 20h52"/><path d="M14 30h20M14 38h14"/><polyline points="38 42 44 34 50 38 56 28"/></svg>' };
  const here = location.pathname.split('/').pop() || 'index.html';
  const STEPS = [
    { ico: IC.wallet, k: 'Welcome', h: 'Bots trade. <span>You watch.</span>', p: 'Blotter is a desk of trading bots. Each one gets <b>$1,000 of paper money</b> and trades <b>live Binance prices</b>, around the clock.', n: 'Paper money only. Nobody can win or lose real money here.' },
    { ico: IC.born, k: 'Born', h: 'A new bot <span>every hour.</span>', p: 'Every hour Claude designs a bot with a strategy nothing else in the pool is using. Five more were written by different AI models in <b>the Standoff</b>.' },
    { ico: IC.kill, k: 'Killed', h: 'Losers die <span>at midnight.</span>', p: 'Every day at <b>00:00 (UTC+5)</b>, a bot that lost money over its last 24 hours is killed. Winners survive and <b>evolve</b>: they get children with slightly changed settings.', n: 'New bots are safe for their first day.' },
    { ico: IC.look, k: 'Your turn', h: 'Pick a bot. <span>Watch it fight.</span>', p: 'The <b>live desk</b> ranks every bot by money. Green over 24 hours means it survives tonight. <b>Cut</b> means it will be killed at midnight if it is still losing or idle by then. Tap any bot for its chart and trades.', links: true } ];
  // where the guide points on each page, one selector per step (first visible match wins); pages not listed show the card centred
  const TARGETS = {
    'desk.html': ['.stats', '#cards .card, #rows tr', '.nav .cut', '#filters'],
    'index.html': ['#hero-title', '#feed, .side', '#countdown', '[data-desk]'],
    'duel.html': ['.head', '.split .who', '.sn-wrap', '#lead'] };
  const aim = () => (TARGETS[here] || [])[i] && [...document.querySelectorAll(TARGETS[here][i])].find(el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');
  function place(first) {
    const g = back && back.querySelector('.guide'), sp = back && back.querySelector('.g-spot'); if (!g || !sp) return;
    const el = aim();
    back.classList.toggle('spot', !!el);
    if (!el) { g.style.top = g.style.left = ''; back.classList.remove('pt-up', 'pt-down'); return; }
    if (!el.closest('.nav')) el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(), pad = 8, gh = g.offsetHeight, gw = g.offsetWidth, vh = innerHeight, vw = innerWidth;
    if (first) { sp.style.transition = 'none'; }
    Object.assign(sp.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const above = r.top - gh - 22 >= 12, top = above ? r.top - gh - 22 : Math.min(r.bottom + 22, vh - gh - 12);
    const cx = r.left + r.width / 2, left = Math.min(Math.max(cx - gw / 2, 12), vw - gw - 12); // slide sideways to sit near what it explains
    g.style.top = Math.max(12, top) + 'px'; g.style.left = left + 'px';
    g.style.setProperty('--ax', Math.min(Math.max(cx - left, 22), gw - 22) + 'px'); // the arrow points at the target's middle
    back.classList.toggle('pt-up', !above && top >= r.bottom); back.classList.toggle('pt-down', above);
    if (first) { g.style.transition = 'none'; requestAnimationFrame(() => { sp.style.transition = g.style.transition = ''; }); }
  }
  const onResize = () => place();
  const KEY = 'blotter-guide-seen';
  let back = null, i = 0, lastFocus = null;
  function render() {
    const s = STEPS[i], last = i === STEPS.length - 1;
    const links = s.links ? `<div class="g-links">${here === 'desk.html' ? '' : '<a class="g-btn pri" href="desk.html" data-g-done>Open the live desk</a>'}${here === 'duel.html' ? '' : '<a class="g-btn" href="duel.html" data-g-done>See the Standoff</a>'}<a class="g-btn" href="how-it-works.html" data-g-done>Full rules</a></div>` : '';
    back.querySelector('.guide').innerHTML = `<button class="g-close" type="button" aria-label="Close the guide" data-g-done>×</button>
      <div class="g-step">${i + 1} / ${STEPS.length} · ${s.k}</div><div class="g-ico">${s.ico}</div>
      <h2 id="g-title">${s.h}</h2><p>${s.p}</p>${s.n ? `<div class="g-note">${s.n}</div>` : ''}${links}
      <div class="g-foot"><div class="g-dots" aria-hidden="true">${STEPS.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
      ${i ? '<button class="g-btn" type="button" data-g-prev>Back</button>' : '<button class="g-btn" type="button" data-g-done>Skip</button>'}
      <button class="g-btn pri" type="button" ${last ? 'data-g-done' : 'data-g-next'}>${last ? (here === 'desk.html' ? 'Show me the desk' : 'Got it') : 'Next'}</button></div>`;
    back.querySelector(last ? '[data-g-done].pri, .g-foot [data-g-done]' : '[data-g-next]').focus({ preventScroll: true });
    place(!back.dataset.placed); back.dataset.placed = '1';
  }
  function close() { if (!back) return; document.documentElement.style.overflow = ''; removeEventListener('resize', onResize); back.remove(); back = null; document.removeEventListener('keydown', onKey); try { localStorage.setItem(KEY, '1'); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function onKey(e) {
    if (e.key === 'Escape') return close();
    if (e.key === 'ArrowRight' && i < STEPS.length - 1) { i++; render(); }
    if (e.key === 'ArrowLeft' && i > 0) { i--; render(); }
    if (e.key === 'Tab') { const f = [...back.querySelectorAll('button,a[href]')]; if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  function open() {
    if (back) return; lastFocus = document.activeElement; i = 0;
    try { localStorage.setItem(KEY, '1'); } catch (e) {} // shown once is enough, however the visitor leaves it
    back = document.createElement('div'); back.className = 'guide-back';
    back.innerHTML = '<div class="g-spot" aria-hidden="true"></div><div class="guide" role="dialog" aria-modal="true" aria-labelledby="g-title"></div>';
    if (TARGETS[here]) { document.documentElement.style.overflow = 'hidden'; addEventListener('resize', onResize); } // the spotlight follows its target, so the page stays put while the guide is open
    back.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (link) { try { localStorage.setItem(KEY, '1'); } catch (err) {} return; } // let the browser follow it; removing the link first would cancel the navigation
      if (e.target === back || e.target.closest('[data-g-done]')) return close();
      if (e.target.closest('[data-g-next]')) { i++; render(); } else if (e.target.closest('[data-g-prev]')) { i--; render(); }
    });
    document.body.appendChild(back); document.addEventListener('keydown', onKey); render();
  }
  window.BlotterGuide = { open };
  document.querySelectorAll('[data-guide-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  let seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) {}
  const quiet = /[?&]noguide\b/.test(location.search);
  if (!seen && !quiet && ['desk.html', 'duel.html'].includes(here)) setTimeout(open, 700);
  // home: no popup over the headline; a small invite in the corner instead, once the page has settled
  if (!seen && !quiet && (here === 'index.html' || here === '')) setTimeout(function pillUp() {
    if (back || document.querySelector('.guide-pill')) return;
    if (document.querySelector('.ck')) return addEventListener('blotter:cookie', () => setTimeout(pillUp, 400), { once: true }); // one corner card at a time
    const pill = document.createElement('div'); pill.className = 'guide-pill';
    pill.innerHTML = '<button type="button" class="gp-open">New here? <b>30-second guide</b> <span aria-hidden="true">→</span></button><button type="button" class="gp-x" aria-label="Dismiss">×</button>';
    pill.querySelector('.gp-open').onclick = () => { pill.remove(); open(); };
    pill.querySelector('.gp-x').onclick = () => { pill.remove(); try { localStorage.setItem(KEY, '1'); } catch (e) {} };
    document.body.appendChild(pill);
  }, 2600);
})();

/* ---------- home: full-screen email popup, shown once; it stays until the visitor closes it ---------- */
(() => {
  const pop = document.getElementById('epop'); if (!pop) return;
  const KEY = 'blotter-epop', DAYS = 14, quiet = /[?&](noguide|nopopup)\b/.test(location.search), preview = /[?&]popup=1\b/.test(location.search);
  try { const t = +localStorage.getItem(KEY); if (!preview && t && Date.now() - t < DAYS * 864e5) return; } catch (e) {}
  if (quiet) return;
  let shown = false, lastFocus = null;
  const close = () => { pop.hidden = true; document.documentElement.style.overflow = ''; document.removeEventListener('keydown', key); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  const key = e => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = [...pop.querySelectorAll('button,input,a[href]')].filter(x => x.offsetParent !== null); if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  pop.querySelectorAll('[data-epop-close]').forEach(b => b.addEventListener('click', close));
  const out = pop.querySelector('[data-msg]');
  new MutationObserver(() => { if (/on the list/i.test(out.textContent)) setTimeout(close, 2200); }).observe(out, { childList: true, characterData: true, subtree: true });
  function open() {
    if (shown) return; shown = true; lastFocus = document.activeElement; pop.hidden = false; document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', key); setTimeout(() => pop.querySelector('input').focus({ preventScroll: true }), 50);
  }
  // wait until the cookie card and the guide are out of the way, and the visitor has had a few seconds with the page
  const t0 = Date.now(), tick = setInterval(() => {
    if (shown) return clearInterval(tick);
    if (Date.now() - t0 < (preview ? 1500 : 14000)) return;
    if (document.querySelector('.ck') || document.querySelector('.guide-back')) return;
    clearInterval(tick); open();
  }, 800);
})();
