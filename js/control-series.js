(() => {
  'use strict';
  if (window.controlSeriesDetails) return;
  window.controlSeriesDetails = true;

  function reveal(hash, focus = false) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
    if (!id.startsWith('reward-')) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    requestAnimationFrame(() => {
      if (focus) target.querySelector('summary')?.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return true;
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    if (!reveal(url.hash, true)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
  }, true);

  const restore = () => reveal(location.hash);
  window.addEventListener('hashchange', restore);
  window.addEventListener('popstate', restore);
  document.addEventListener('pjax:complete', restore);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore);
  else restore();
})();
