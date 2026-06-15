/* Galent — premium layer (reduced).
 *
 * Lenis smooth scroll, magnetic buttons, and card sheen have been removed.
 * Native browser scrolling is restored. This file now only does work that
 * improves readability and accessibility — no extra motion, no extra
 * interaction effects.
 *
 * Kept:
 *   - Index-based stagger reveals (replaces inline transition-delay hacks)
 *   - Section in-view observer (adds .in-view to <section> as it enters
 *     the viewport, so background gradients can fade in once)
 *
 * Focus rings, reduced-motion handling, and section depth are pure CSS
 * (see design-system.css). They stay.
 */
(function () {
  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initStaggerReveals() {
    document.querySelectorAll('[data-stagger]').forEach((group) => {
      const children = group.querySelectorAll('[data-reveal]');
      const STEP = REDUCED_MOTION ? 0 : 60;
      const MAX_TOTAL = 480;
      const total = STEP * (children.length - 1);
      const step = total > MAX_TOTAL ? MAX_TOTAL / (children.length - 1) : STEP;
      children.forEach((child, i) => {
        if (!child.style.transitionDelay) {
          child.style.transitionDelay = `${(i * step / 1000).toFixed(3)}s`;
        }
      });
    });
  }

  function initSectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); });
    }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('main > section, main section[id]').forEach((s) => io.observe(s));
  }

  function boot() {
    initStaggerReveals();
    initSectionObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
