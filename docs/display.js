/* Font switcher: pick one of 8 title fonts for the whole site. Choice is remembered on this device (?font=name also works). */
(() => {
  const KEY = 'blotter-font', html = document.documentElement;
  const FONTS = [
    ['home', 'DM Serif Display', 'real font'], ['how', 'Playfair Display', 'real font'], ['savage', 'Bodoni Moda', 'Savage Roses look'],
    ['vindey', 'Cormorant Garamond', 'Wasted Vindey look'], ['support', 'Instrument Serif', 'Delamoore look'], ['desk', 'Unbounded', 'Nura look'],
    ['standoff', 'Syne', 'Surgena look'], ['privacy', 'Outfit', 'Qurova look'], ['original', 'Big Shoulders', 'original Blotter'],
  ];
  const ok = n => FONTS.some(f => f[0] === n);
  let cur = null; try { cur = new URLSearchParams(location.search).get('font') || localStorage.getItem(KEY); } catch (e) {}
  const apply = n => { if (n && ok(n)) html.dataset.font = n; else delete html.dataset.font; };
  apply(cur);
  const build = () => {
    const w = document.createElement('div'); w.className = 'fpick';
    w.innerHTML = '<button type="button" aria-label="Change title font" aria-haspopup="true" aria-expanded="false">Aa</button>';
    const ul = document.createElement('ul'); ul.hidden = true; ul.setAttribute('role', 'menu');
    const li = (n, label, sub, fam) => { const l = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.dataset.f = n; b.innerHTML = label + '<small>' + sub + '</small>'; if (fam) b.style.fontFamily = fam; l.appendChild(b); return l; };
    ul.appendChild(li('', 'Each page’s own', 'default for every page', 'inherit'));
    FONTS.forEach(([n, label, sub]) => ul.appendChild(li(n, label, sub, n === 'original' ? "'Big Shoulders Display',sans-serif" : `'Disp ${n}',Georgia,serif`)));
    w.appendChild(ul); document.body.appendChild(w);
    const btn = w.querySelector('button'), mark = () => ul.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String((b.dataset.f || '') === (html.dataset.font || ''))));
    mark();
    btn.addEventListener('click', () => { ul.hidden = !ul.hidden; btn.setAttribute('aria-expanded', String(!ul.hidden)); });
    ul.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; apply(b.dataset.f); try { b.dataset.f ? localStorage.setItem(KEY, b.dataset.f) : localStorage.removeItem(KEY); } catch (x) {} mark(); ul.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('click', e => { if (!w.contains(e.target)) { ul.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
