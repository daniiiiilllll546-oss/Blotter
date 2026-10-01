/* Blotter visitor stats + the cookie banner.
   Nothing is sent until the visitor accepts the cookie. After that, each page view records: which page,
   the site that linked here (host only), any utm_* tags, the country (worked out from the browser's time zone,
   never from the IP address), language, device size, local hour, and how long the page stayed open.
   Cookies (first-party, this site only): bl_consent (the choice), bl_vid (random visitor id, 12 months),
   bl_src (the first link that brought you here, 12 months), bl_sid (this visit; gone when the browser closes).
   Also handles the "email me when it goes real" forms ([data-notify]) and the remove-my-email form ([data-unsub]).
   `[data-cookie-settings]` reopens the banner. */
(function () {
  'use strict';
  const API = 'https://yvjpukoztlfofdvdhiup.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_Ju0euXUagUtalU6M0ImFEw_D3N8wsss'; // publishable: it can only call the four write functions below
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && !/[?&]track=1/.test(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const YEAR = 31536000, PATH = location.pathname.replace(/[^/]*$/, '') || '/';
  const secure = location.protocol === 'https:' ? '; Secure' : '';

  /* ---------- cookies ---------- */
  const getC = n => { const m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; };
  const setC = (n, v, age) => { document.cookie = `${n}=${encodeURIComponent(v)}; Path=${PATH}${age ? '; Max-Age=' + age : ''}; SameSite=Lax${secure}`; };
  const delC = n => { document.cookie = `${n}=; Path=${PATH}; Max-Age=0; SameSite=Lax${secure}`; };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));

  const call = (fn, body, keep) => fetch(API + fn, {
    method: 'POST', keepalive: !!keep, headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.ok ? r.json().catch(() => null) : null).catch(() => null);

  /* ---------- what brought them here ---------- */
  const qs = new URLSearchParams(location.search);
  function refHost() {
    if (!document.referrer) return '';
    try {
      const u = new URL(document.referrer);
      if (u.host === location.host) return 'internal';
      const h = u.hostname.replace(/^www\./, '');
      return h === 't.co' ? 'x.com' : h;
    } catch (e) { return ''; }
  }
  const page = (location.pathname.replace(/^\/Blotter/i, '').replace(/\/$/, '/index.html') || '/index.html');
  const ref = refHost();
  const src = qs.get('utm_source') || qs.get('ref') || '';

  /* ---------- page view + time on page ---------- */
  let started = false;
  function track() {
    if (started || local) return; started = true;
    let vid = getC('bl_vid'); const isNew = !vid; if (!vid) vid = uuid();
    setC('bl_vid', vid, YEAR);
    let sid = getC('bl_sid'); if (!sid) { sid = uuid(); setC('bl_sid', sid); }
    let first = getC('bl_src');
    if (!first) { first = src || (ref && ref !== 'internal' ? ref : 'direct'); setC('bl_src', first, YEAR); }
    const id = uuid();
    call('hit', { p: {
      id, vid, sid, page, ref, first, src, med: qs.get('utm_medium') || '', camp: qs.get('utm_campaign') || '',
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), lang: (navigator.language || '').slice(0, 12),
      w: innerWidth, hour: new Date().getHours(), new: isNew,
    } });
    // count only the time the tab is actually visible
    let shown = document.visibilityState === 'visible' ? performance.now() : null, total = 0, sent = 0;
    const secs = () => Math.round((total + (shown != null ? performance.now() - shown : 0)) / 1000);
    const send = keep => { const s = secs(); if (s > sent) { sent = s; call('hit_time', { p_id: id, p_s: s }, keep); } };
    [10, 30, 60, 120, 300, 600, 1200].forEach(t => setTimeout(function tick() { if (shown == null) return setTimeout(tick, 5000); send(); }, t * 1000));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (shown != null) { total += performance.now() - shown; shown = null; } send(true); }
      else shown = performance.now();
    });
    addEventListener('pagehide', () => send(true));
  }

  function forget() {
    const vid = getC('bl_vid');
    if (vid && !local) call('forget_visitor', { p_vid: vid });
    ['bl_vid', 'bl_src', 'bl_sid'].forEach(delC);
  }

  /* ---------- the cookie ---------- */
  const CSS = `
.ck{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:125;width:min(400px,calc(100vw - 32px));
  display:grid;grid-template-columns:76px 1fr;gap:6px 16px;align-items:start;padding:18px 18px 16px;background:var(--panel,#16130f);
  color:var(--text,#f2ead9);border:1px solid var(--line,rgba(255,255,255,.12));box-shadow:0 18px 50px rgba(0,0,0,.4);
  font:400 14px/1.5 var(--f-body,system-ui,sans-serif);animation:ck-in .55s cubic-bezier(.2,.8,.2,1.15) both}
@keyframes ck-in{from{opacity:0;transform:translateY(24px) scale(.96)}}
.ck-bisc{grid-row:1/span 3;width:76px;height:76px;display:block;overflow:visible;transform-origin:50% 50%}
.ck-bisc .bite{transform-box:fill-box;transform-origin:center;transform:scale(0)}
.ck h2{margin:2px 0 0;font:800 22px/1.05 var(--f-disp,inherit);text-transform:uppercase;letter-spacing:.01em}
.ck p{margin:0;color:var(--soft,#bfb5a3);font-size:13.5px}
.ck p a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.ck-row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.ck-row button{appearance:none;cursor:pointer;font:600 13px/1 var(--f-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;
  padding:11px 14px;border:1px solid var(--line,rgba(255,255,255,.18));background:transparent;color:var(--text,#f2ead9)}
.ck-row .ck-yes{background:var(--amber,#f2a83b);border-color:var(--amber,#f2a83b);color:var(--amber-ink,#1a1206)}
.ck-row button:hover{filter:brightness(1.08)} .ck-row button:focus-visible{outline:2px solid var(--amber,#f2a83b);outline-offset:2px}
.ck-crumb{position:fixed;z-index:126;width:6px;height:6px;border-radius:2px;background:#b9773a;pointer-events:none}
.ck-crumb.dk{background:#3a2316;width:5px;height:5px}
@media (max-width:600px){.ck{right:12px;left:12px;width:auto;grid-template-columns:56px 1fr;padding:14px}.ck-bisc{width:56px;height:56px;grid-row:1/span 2}.ck h2{font-size:19px}.ck-row{grid-column:1/-1}.ck-row button{flex:1 1 0;padding:12px 8px}}`;

  const BISCUIT = `<svg class="ck-bisc" viewBox="0 0 100 100" aria-hidden="true">
<defs><mask id="ck-m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><rect x="-20" y="-20" width="140" height="140" fill="#fff"/>
<g fill="#000"><circle class="bite" cx="86" cy="18" r="17"/><circle class="bite" cx="97" cy="50" r="15"/><circle class="bite" cx="84" cy="82" r="18"/>
<circle class="bite" cx="50" cy="98" r="19"/><circle class="bite" cx="14" cy="80" r="20"/></g></mask>
<radialGradient id="ck-g" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#e2a865"/><stop offset=".75" stop-color="#c98a49"/><stop offset="1" stop-color="#a86a32"/></radialGradient></defs>
<g mask="url(#ck-m)"><circle cx="50" cy="50" r="44" fill="url(#ck-g)"/><circle cx="50" cy="50" r="44" fill="none" stroke="#8f5626" stroke-width="2.5" opacity=".55"/>
<g fill="#9c612c" opacity=".55"><circle cx="30" cy="62" r="1.3"/><circle cx="62" cy="30" r="1.1"/><circle cx="70" cy="66" r="1.2"/><circle cx="40" cy="26" r="1"/><circle cx="56" cy="76" r="1.1"/><circle cx="22" cy="44" r="1"/></g>
<g fill="#3a2316"><path d="M33 31c3-2 7 0 7 3s-3 5-6 4-4-5-1-7z"/><path d="M58 44c3-1 6 1 6 4s-3 5-6 4-3-6 0-8z"/><path d="M38 58c2-2 6-1 6 2s-2 5-5 4-3-4-1-6z"/>
<path d="M66 64c2-1 5 0 5 3s-3 4-5 3-2-5 0-6z"/><path d="M48 24c2-1 4 0 4 2s-2 3-4 3-2-4 0-5z"/><path d="M24 46c2-1 4 1 4 3s-2 3-4 2-2-4 0-5z"/><path d="M52 70c2-1 4 1 4 3s-3 3-4 2-2-4 0-5z"/></g>
<g fill="#fff" opacity=".18"><circle cx="34" cy="31" r="1.1"/><circle cx="59" cy="45" r="1"/></g></g></svg>`;

  function crumbs(svg, cx, cy, n) {
    const r = svg.getBoundingClientRect(), x0 = r.left + cx / 100 * r.width, y0 = r.top + cy / 100 * r.height;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'ck-crumb' + (i % 3 === 0 ? ' dk' : '');
      c.style.left = x0 + 'px'; c.style.top = y0 + 'px'; document.body.appendChild(c);
      const dx = (Math.random() - .3) * 70, up = -18 - Math.random() * 26, fall = 60 + Math.random() * 70, rot = (Math.random() - .5) * 540;
      c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dx * .5}px,${up}px) rotate(${rot * .4}deg)`, opacity: 1, offset: .3 },
        { transform: `translate(${dx}px,${fall}px) rotate(${rot}deg)`, opacity: 0 }], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.3,.1,.6,1)' }).onfinish = () => c.remove();
    }
  }

  function close(box, ms) { setTimeout(() => { const a = box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: reduce ? 1 : 320, easing: 'ease-in', fill: 'forwards' }); a.onfinish = () => { box.remove(); dispatchEvent(new Event('blotter:cookie')); }; }, ms); }

  function eat(box) {
    const svg = box.querySelector('.ck-bisc'), bites = [...svg.querySelectorAll('.bite')];
    box.querySelector('h2').textContent = 'Nom. Thank you!';
    box.querySelector('p').textContent = 'That helps a lot.';
    box.querySelector('.ck-row').style.visibility = 'hidden';
    if (reduce) return close(box, 900);
    const spots = [[86, 18], [97, 50], [84, 82], [50, 98], [14, 80]];
    bites.forEach((b, i) => setTimeout(() => {
      b.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.08)', offset: .7 }, { transform: 'scale(1)' }], { duration: 160, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'forwards' });
      svg.animate([{ transform: 'rotate(0) scale(1)' }, { transform: `rotate(${i % 2 ? 6 : -6}deg) scale(.94)` }, { transform: 'rotate(0) scale(1)' }], { duration: 170, easing: 'ease-out' });
      crumbs(svg, spots[i][0], spots[i][1], 7);
    }, 120 + i * 230));
    // the last crumb of cookie goes down in one gulp
    setTimeout(() => {
      crumbs(svg, 40, 45, 10);
      svg.animate([{ transform: 'scale(1) rotate(0)', opacity: 1 }, { transform: 'scale(1.12) rotate(-10deg)', opacity: 1, offset: .35 }, { transform: 'scale(0) rotate(25deg)', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    }, 120 + bites.length * 230 + 60);
    close(box, 120 + bites.length * 230 + 1100);
  }

  function roll(box) {
    const svg = box.querySelector('.ck-bisc');
    box.querySelector('h2').textContent = 'No cookie. Fair enough.';
    box.querySelector('p').textContent = 'Nothing is tracked.';
    box.querySelector('.ck-row').style.visibility = 'hidden';
    if (reduce) return close(box, 1200);
    svg.animate([{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-14px) rotate(-60deg)', offset: .2 }, { transform: `translateX(${innerWidth}px) rotate(900deg)` }], { duration: 1300, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    close(box, 1500);
  }

  function banner() {
    if (document.querySelector('.ck')) return;
    if (!document.getElementById('ck-css')) { const s = document.createElement('style'); s.id = 'ck-css'; s.textContent = CSS; document.head.appendChild(s); }
    const box = document.createElement('aside'); box.className = 'ck'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'ck-h');
    box.innerHTML = `${BISCUIT}<h2 id="ck-h">Want a cookie?</h2>
<p>We use one cookie to count visitors. No ads, nothing sold. <a href="privacy.html#cookies">Details</a></p>
<div class="ck-row"><button class="ck-yes" type="button">Accept cookie</button><button class="ck-no" type="button">No thanks</button></div>`;
    document.body.appendChild(box);
    box.querySelector('.ck-yes').addEventListener('click', () => { setC('bl_consent', 'yes', YEAR); track(); eat(box); });
    box.querySelector('.ck-no').addEventListener('click', () => { setC('bl_consent', 'no', YEAR); forget(); roll(box); });
  }

  /* ---------- email forms ---------- */
  function wireForms() {
    document.querySelectorAll('form[data-notify]').forEach(f => f.addEventListener('submit', async e => {
      e.preventDefault();
      const out = f.querySelector('[data-msg]'), btn = f.querySelector('button'), email = f.email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) { out.textContent = 'That email doesn’t look right.'; return; }
      btn.disabled = true; out.textContent = 'Saving…';
      const ok = getC('bl_consent') === 'yes';
      const r = await call('subscribe', { p_email: email, p_page: page, p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        p_src: ok ? (getC('bl_src') || '') : '', p_ref: ref === 'internal' ? '' : ref, p_vid: ok ? getC('bl_vid') : null });
      btn.disabled = false;
      out.textContent = r === 'ok' ? 'You’re on the list. One email when the bots trade real money, nothing else.' : r === 'invalid' ? 'That email doesn’t look right.' : 'Couldn’t save that just now. Try again in a minute.';
      if (r === 'ok') f.reset();
    }));
    document.querySelectorAll('form[data-unsub]').forEach(f => f.addEventListener('submit', async e => {
      e.preventDefault();
      const out = f.querySelector('[data-msg]'); out.textContent = 'Removing…';
      const r = await call('unsubscribe', { p_email: f.email.value });
      out.textContent = r === 'ok' ? 'Done. If that email was on the list, it has been deleted.' : 'Couldn’t reach the list just now. Try again in a minute.';
    }));
    document.querySelectorAll('[data-cookie-settings]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); delC('bl_consent'); banner(); }));
  }

  /* ---------- start ---------- */
  window.BlotterCookie = { open: banner, choice: () => getC('bl_consent') };
  function start() {
    wireForms();
    const c = getC('bl_consent');
    if (c === 'yes') track();
    else if (c !== 'no') setTimeout(banner, document.documentElement.hasAttribute('data-tx-wait') ? 2200 : 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
