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

  /* ----------------------------------------------------------------
   * Flagship — GalentAI Operating Model scroll-driven animation.
   *
   * The .opmodel-stage is taller than the viewport. As the user scrolls
   * through it, .opmodel-sticky pins the diagram. We compute scroll
   * progress (0..1) from the stage's position relative to the viewport,
   * then drive:
   *   - which of 5 layers is active (rail dot + node + detail card)
   *   - the spine stroke-dashoffset (path draws in as you progress)
   *   - 3 travelling tokens moving down the spine
   *
   * Only animation we ship by design — explains the operating model.
   * Disabled under prefers-reduced-motion (CSS falls back to a static layout).
   * ---------------------------------------------------------------- */
  function initOperatingModel() {
    const stage = document.querySelector('.opmodel-stage');
    if (!stage) return;
    if (REDUCED_MOTION) return;

    const railItems = Array.from(stage.querySelectorAll('.opmodel-rail li'));
    const nodes = Array.from(stage.querySelectorAll('.opmodel-node'));
    const cards = Array.from(stage.querySelectorAll('.opmodel-detail__card'));
    const spine = stage.querySelector('.opmodel-spine');
    const tokens = Array.from(stage.querySelectorAll('.opmodel-token'));

    if (!spine || !railItems.length) return;

    const LAYERS = 5;
    const SPINE_LEN = 600; // path is M280 60 L280 660 → 600 units
    let rafId = 0;
    let lastActive = -1;

    function update() {
      rafId = 0;
      const r = stage.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // progress 0..1 — 0 when stage top enters viewport bottom, 1 when stage bottom leaves viewport top
      const total = r.height - vh;
      const scrolled = Math.max(0, Math.min(total, -r.top));
      const p = total > 0 ? scrolled / total : 0;

      // Active layer index 0..4
      const idx = Math.min(LAYERS - 1, Math.floor(p * LAYERS * 1.0));
      if (idx !== lastActive) {
        lastActive = idx;
        railItems.forEach((li, i) => li.classList.toggle('is-active', i <= idx));
        nodes.forEach((n, i) => n.classList.toggle('is-active', i <= idx));
        cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      }

      // Spine — draw 0..100% based on progress
      const offset = SPINE_LEN * (1 - p);
      spine.style.setProperty('--spine-offset', offset.toFixed(1));

      // Tokens — travel along the spine, staggered. Each token has its own phase.
      // x is fixed at 280, y goes from 60 to 660 as token progresses.
      const baseY = 60;
      const reach = 600;
      tokens.forEach((tok, i) => {
        // Each token has an offset; we loop them with a phased shift
        const phase = (p * 1.6 + i * 0.27) % 1;
        // Only show tokens once we've started animating
        if (p < 0.04) { tok.setAttribute('opacity', '0'); return; }
        tok.setAttribute('opacity', String(0.9 - i * 0.18));
        const y = baseY + reach * phase;
        tok.setAttribute('cx', '280');
        tok.setAttribute('cy', y.toFixed(1));
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
  }

  function boot() {
    initStaggerReveals();
    initSectionObserver();
    initOperatingModel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
