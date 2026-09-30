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
    el.querySelector('button').addEventListener('click', () => { el.remove(); try { localStorage.setItem(key, '1'); } catch (e) {} });
  });
})();
