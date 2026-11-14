(() => {
  'use strict';
  if (window.actuatorAuditInstalled) return;
  window.actuatorAuditInstalled = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const chart = entry.target;
      observer.unobserve(chart);
      if (!reduced.matches) {
        chart.classList.add('is-revealing');
        setTimeout(() => chart.classList.remove('is-revealing'), 750);
      }
    }
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' }) : null;
  function init() {
    document.querySelectorAll('[data-actuator-chart]:not([data-visual-ready])').forEach(chart => {
      chart.dataset.visualReady = 'true';
      if (observer && !reduced.matches) observer.observe(chart);
    });
  }
  document.addEventListener('pjax:send', () => { if (observer) observer.disconnect(); });
  document.addEventListener('pjax:complete', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
