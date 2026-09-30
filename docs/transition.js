/* Blotter page transitions: a stage curtain.
   Load synchronously in <head> on every page. Leaving: one heavy curtain rises from the bottom (curved leading edge,
   fabric folds, an amber hem), the destination's name lifts in and an equity line draws under it, then we navigate.
   Arriving: the curtain is already down over the new page and drops away once the page is ready. A page can hold the reveal until it is ready by setting
   data-tx-wait on <html> and dispatching `blotter:ready` on window. */
(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGES = {
    'index.html': { word: 'Blotter', sub: 'THE STORY' },
    'desk.html': { word: 'The desk', sub: 'OPENING THE POOL' },
    'support.html': { word: 'Support', sub: 'KEEP THE BOTS ALIVE' },
    'duel.html': { word: 'Standoff', sub: 'FIVE MODELS, ONE BRIEF' },
  };
  const KEY = 'blotter-tx';
  const pageOf = u => { const f = (u.pathname.split('/').pop() || 'index.html'); return PAGES[f] ? f : null; };
  const here = pageOf(location);

  let arriving = false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) { sessionStorage.removeItem(KEY); const j = JSON.parse(raw); arriving = !reduce && j.to === here && Date.now() - j.t < 6000; }
  } catch (e) { /* storage blocked: no arrival card, the page just loads */ }
  window.BLOTTER_TX_ENTER = arriving;
  if (arriving) html.classList.add('ptx-enter');

  const css = `
html.ptx-enter::before{content:"";position:fixed;inset:0;z-index:9000;background:var(--ink,#0B1116)}
.ptx{position:fixed;inset:0;z-index:9001;display:none}
.ptx.on{display:block}
.ptx-cur{position:absolute;left:-2px;right:-2px;top:0;bottom:0;transform:translateY(102%);box-shadow:inset 0 3px 0 var(--amber,#E8A33D);
  background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.035) 2.6vw,rgba(0,0,0,.30) 6.2vw,rgba(255,255,255,0) 8.4vw),var(--ink,#0B1116)}
.ptx-cur::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18),transparent 22%,transparent 78%,rgba(0,0,0,.22))}
html[data-theme="light"] .ptx-cur{background:repeating-linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.45) 2.6vw,rgba(90,70,40,.10) 6.2vw,rgba(255,255,255,0) 8.4vw),var(--ink,#F3EEE3)}
html[data-theme="light"] .ptx-cur::after{background:linear-gradient(180deg,rgba(90,70,40,.08),transparent 22%,transparent 78%,rgba(90,70,40,.10))}
.ptx.on .ptx-cur{will-change:transform,border-radius}
.ptx-mid{position:absolute;inset:0;display:grid;place-items:center;padding:0 16px}
.ptx-in{display:flex;flex-direction:column;align-items:center;gap:18px;width:min(720px,100%)}
.ptx-word{font:900 clamp(64px,13vw,190px)/.8 'Big Shoulders Display','Arial Narrow',sans-serif;letter-spacing:.02em;text-transform:uppercase;color:var(--text,#ECE6D6);display:flex;overflow:hidden;padding-top:.06em;white-space:nowrap}
.ptx-word span{display:inline-block;transform:translateY(110%)}
.ptx-word span.sp{width:.28em}
.ptx-line{width:min(420px,70vw);height:56px;overflow:visible}
.ptx-line path{fill:none;stroke:var(--amber,#E8A33D);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.ptx-line circle{fill:var(--amber,#E8A33D);opacity:0}
.ptx-sub{font:500 12px 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.24em;color:var(--muted,#8593A0);opacity:0}
`;
  const st = document.createElement('style'); st.textContent = css; (document.head || html).appendChild(st);

  const ease = 'cubic-bezier(.76,0,.24,1)', easeOut = 'cubic-bezier(.16,1,.3,1)';
  let el, cur, word, path, dot, sub, len = 0, busy = false;
  const DOME = '50% 16vh', FLAT = '50% 0vh'; // the curtain's leading edge: bowed while moving, flat when it lands

  function build() {
    el = document.createElement('div'); el.className = 'ptx'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="ptx-cur"></div>
      <div class="ptx-mid"><div class="ptx-in"><div class="ptx-word"></div>
      <svg class="ptx-line" viewBox="0 0 420 56"><path d="M2 44 L48 38 L82 46 L120 30 L156 36 L196 22 L232 28 L270 14 L306 20 L346 8 L380 12 L418 4"/><circle r="4.5" cx="418" cy="4"/></svg>
      <div class="ptx-sub"></div></div></div>`;
    (document.body || html).appendChild(el); // arriving: attach to <html> right away, before <body> even exists
    cur = el.querySelector('.ptx-cur'); word = el.querySelector('.ptx-word'); sub = el.querySelector('.ptx-sub');
    path = el.querySelector('path'); dot = el.querySelector('circle');
    len = 0; // measured when first shown (the overlay is display:none until then)
  }
  function label(page) {
    const p = PAGES[page] || PAGES['index.html'];
    word.innerHTML = [...p.word].map(c => c === ' ' ? '<span class="sp"></span>' : `<span>${c}</span>`).join('');
    sub.textContent = p.sub;
    return [...word.querySelectorAll('span:not(.sp)')];
  }
  const measure = () => { if (!len) { try { len = path.getTotalLength(); } catch (e) {} if (!len) len = 480; } };
  const anim = (node, kf, o) => node.animate(kf, Object.assign({ fill: 'both' }, o));
  const done = a => a.finished.catch(() => {});

  /* ---------------- leaving ---------------- */
  function leave(href, to) {
    if (busy) return; busy = true; if (!el) build();
    try { sessionStorage.setItem(KEY, JSON.stringify({ to, t: Date.now() })); } catch (e) {}
    const letters = label(to);
    el.classList.add('on'); measure();
    // the curtain comes up: domed edge first, flattening as it reaches the top
    anim(cur, [{ transform: 'translateY(102%)', borderTopLeftRadius: DOME, borderTopRightRadius: DOME }, { transform: 'translateY(0)', borderTopLeftRadius: FLAT, borderTopRightRadius: FLAT }], { duration: 760, easing: 'cubic-bezier(.65,0,.25,1)' });
    letters.forEach((s, i) => anim(s, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 600, delay: 540 + i * 26, easing: easeOut }));
    anim(path, [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 600, delay: 600, easing: 'cubic-bezier(.4,0,.2,1)' });
    anim(dot, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 1150 });
    const last = anim(sub, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 760 });
    let gone = false; const go = () => { if (!gone) { gone = true; location.href = href; } };
    done(last).then(() => setTimeout(go, 140));
    setTimeout(go, 1700); // never strand the visitor
  }

  /* ---------------- arriving ---------------- */
  function arrive() {
    const letters = label(here);
    el.classList.add('on'); measure();
    cur.style.transform = 'translateY(0)';
    letters.forEach(s => { s.style.transform = 'translateY(0)'; });
    path.style.strokeDasharray = len; path.style.strokeDashoffset = 0; dot.style.opacity = 1; sub.style.opacity = 1;
    html.classList.remove('ptx-enter');

    const dom = document.readyState === 'loading' ? new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true })) : Promise.resolve();
    const fonts = dom.then(() => Promise.race([document.fonts ? document.fonts.ready.catch(() => {}) : null, new Promise(r => setTimeout(r, 700))]));
    const waits = [fonts];
    if (html.hasAttribute('data-tx-wait')) waits.push(new Promise(r => { addEventListener('blotter:ready', r, { once: true }); setTimeout(r, 5000); }));
    else waits.push(new Promise(r => setTimeout(r, 180)));
    Promise.all(waits).then(() => {
      letters.forEach((s, i) => anim(s, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { duration: 480, delay: i * 22, easing: 'cubic-bezier(.7,0,.84,0)' }));
      anim(path, [{ strokeDashoffset: 0 }, { strokeDashoffset: -len }], { duration: 520, easing: 'cubic-bezier(.7,0,.84,0)' });
      anim(dot, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      anim(sub, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      anim(el.querySelector('.ptx-mid'), [{ opacity: 1 }, { opacity: 0 }], { duration: 180, delay: 300 });
      // ...and the curtain comes down: it drops away, its edge bowing like falling cloth
      const out = anim(cur, [{ transform: 'translateY(0)', borderTopLeftRadius: FLAT, borderTopRightRadius: FLAT }, { transform: 'translateY(102%)', borderTopLeftRadius: DOME, borderTopRightRadius: DOME }], { duration: 820, delay: 380, easing: 'cubic-bezier(.7,0,.3,1)' });
      done(out).then(reset);
    });
  }
  function reset() {
    busy = false; if (!el) return;
    el.getAnimations({ subtree: true }).forEach(a => a.cancel());
    el.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
    el.classList.remove('on');
  }

  /* ---------------- wiring ---------------- */
  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    const to = pageOf(u); if (!to || to === here) return; // same page (e.g. #anchors) scrolls as usual
    e.preventDefault(); e.stopPropagation();
    leave(u.href, to);
  }
  // Arriving: draw the card immediately, while the rest of the page (and its libraries) is still loading,
  // so the card never blinks out between the old page and the new one.
  if (arriving) { build(); arrive(); }
  if (!reduce) document.addEventListener('click', onClick, true);
  const lazy = () => { if (!el) build(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lazy); else lazy();
  // coming back with the browser's back button can restore a page mid-transition: clear it
  addEventListener('pageshow', e => { if (e.persisted) { html.classList.remove('ptx-enter'); reset(); } });
})();
