/* Blotter theme: dark (default) or light. Load synchronously in <head> so the right theme paints first.
   Any element with [data-theme-toggle] flips it; pages listen for the `themechange` event to recolour
   canvases (3D scenes, charts) that CSS can't reach. The choice is remembered on this device. */
(() => {
  const KEY = 'blotter-theme', html = document.documentElement;
  let t = null; try { t = localStorage.getItem(KEY); } catch (e) {}
  const apply = light => {
    html.dataset.theme = light ? 'light' : 'dark';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = light ? '#F3EEE3' : '#0B1116';
    document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.setAttribute('aria-pressed', light); b.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); b.title = light ? 'Dark mode' : 'Light mode'; });
  };
  apply(t ? t === 'light' : html.dataset.defaultTheme !== 'dark'); // light unless the visitor chose dark (a page can force dark with <html data-default-theme="dark">)
  window.BTHEME = {
    get light() { return html.dataset.theme === 'light'; },
    css: name => getComputedStyle(html).getPropertyValue(name).trim(),
    set(light) {
      html.classList.add('theming'); apply(light);
      try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) {}
      dispatchEvent(new CustomEvent('themechange', { detail: { light } }));
      setTimeout(() => html.classList.remove('theming'), 600);
    },
  };
  const ICON = '<svg class="ic-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="ic-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const init = () => {
    document.querySelectorAll('[data-theme-toggle]').forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = ICON; b.addEventListener('click', () => window.BTHEME.set(!window.BTHEME.light)); });
    apply(html.dataset.theme === 'light');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
