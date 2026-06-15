/* Galent — premium interactions layer.
 *
 * Vanilla JS replacements for the things a Framer Motion / Lenis stack
 * would normally do, scoped to this static-HTML codebase. Loaded on every
 * page after animations.js. All animations are GPU-accelerated, respect
 * prefers-reduced-motion, and produce zero layout shift.
 *
 * Modules:
 *   1. Lenis smooth scroll (loaded from CDN at the bottom of the page)
 *   2. Magnetic buttons — subtle cursor-follow on .btn and .card-cta
 *   3. Index-based stagger reveals — replaces ad-hoc transition-delay
 *      inline styles. Children of [data-stagger] get delays from their
 *      DOM order.
 *   4. Card sheen — soft cursor-following gradient on hover for cards.
 *   5. Section observers — adds .in-view to sections as they enter, so
 *      backgrounds can react to scroll position without JS recomputation.
 */
(function () {
  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------
   * 1. Lenis smooth scroll
   * Loaded lazily; Lenis is framework-free and ~6 KB gzipped.
   * ---------------------------------------------------------------- */
  function initLenis() {
    if (REDUCED_MOTION) return;
    // Skip on touch devices — native momentum scroll is already smooth there.
    if (window.matchMedia('(hover: none)').matches) return;
    if (typeof window.Lenis !== 'function') return; // CDN script didn't load — fail silently

    const lenis = new window.Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // ease-out expo
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Hook anchor links so Lenis handles them smoothly
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.2 });
      });
    });

    window.Galent && (window.Galent._lenis = lenis);
  }

  /* ----------------------------------------------------------------
   * 2. Magnetic buttons
   * .btn elements pull subtly toward the cursor when within range.
   * Pure transform — no layout cost. Disabled under reduced-motion.
   * ---------------------------------------------------------------- */
  function initMagneticButtons() {
    if (REDUCED_MOTION) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const STRENGTH = 0.22;        // 0..1 — how far the button follows the cursor (capped)
    const ACTIVATE_RADIUS = 0.6;  // multiplier of button bounding-box radius — engages outside the button too

    const targets = document.querySelectorAll('.btn, .leader-cta, .card-cta');

    targets.forEach((btn) => {
      const inner = btn.querySelector('.arr') || null;
      let frame = 0;

      function onMove(e) {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = btn.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const radius = Math.max(r.width, r.height) / 2;
          const reach = radius * (1 + ACTIVATE_RADIUS);
          if (dist > reach) return reset();
          const tx = Math.max(-r.width * STRENGTH, Math.min(r.width * STRENGTH, dx * STRENGTH));
          const ty = Math.max(-r.height * STRENGTH, Math.min(r.height * STRENGTH, dy * STRENGTH));
          btn.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
          if (inner) {
            inner.style.transform = `translate3d(${(tx * 0.4).toFixed(2)}px, ${(ty * 0.4).toFixed(2)}px, 0)`;
          }
        });
      }
      function reset() {
        btn.style.transform = '';
        if (inner) inner.style.transform = '';
      }

      // Use the document so the button engages slightly before cursor enters it
      const onMouseEnterParent = () => document.addEventListener('mousemove', onMove);
      const onMouseLeaveParent = () => { document.removeEventListener('mousemove', onMove); reset(); };

      // Find a sensible parent — the button's nearest stable container
      const parent = btn.closest('section, header, footer, .container, body');
      if (!parent) return;
      parent.addEventListener('mouseenter', onMouseEnterParent);
      parent.addEventListener('mouseleave', onMouseLeaveParent);
      // Defensive — reset on blur / page hide
      window.addEventListener('blur', reset);
    });
  }

  /* ----------------------------------------------------------------
   * 3. Index-based stagger reveals
   * Replaces inline `style="transition-delay:.06s"` patterns. For any
   * [data-stagger] container, children with [data-reveal] get an animated
   * delay based on their index. Limits the total stagger time so a row
   * of 12 doesn't take 2 seconds to finish.
   * ---------------------------------------------------------------- */
  function initStaggerReveals() {
    document.querySelectorAll('[data-stagger]').forEach((group) => {
      const children = group.querySelectorAll('[data-reveal]');
      const STEP = REDUCED_MOTION ? 0 : 60; // ms between siblings
      const MAX_TOTAL = 480; // never let stagger exceed this
      const total = STEP * (children.length - 1);
      const step = total > MAX_TOTAL ? MAX_TOTAL / (children.length - 1) : STEP;
      children.forEach((child, i) => {
        // Only set if not already explicitly set inline
        if (!child.style.transitionDelay) {
          child.style.transitionDelay = `${(i * step / 1000).toFixed(3)}s`;
        }
      });
    });
  }

  /* ----------------------------------------------------------------
   * 4. Card sheen — cursor-following soft gradient
   * Listens on a delegated parent (faster than per-card listeners) and
   * writes --mx / --my CSS vars onto the hovered card. CSS picks these
   * up via a ::after layer (see design-system.css).
   * ---------------------------------------------------------------- */
  function initCardSheen() {
    if (REDUCED_MOTION) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const SELECTORS = '.feature, .svc, .case-study, .about-sector, .home-sector-card, .engine-card, .delivery-step, .cap, .fde-rich, .belief, .card-item, .contact-card, .office-card, .leader-card, .sector-tile';

    let frame = 0;
    document.addEventListener('mousemove', (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = e.target.closest(SELECTORS);
        if (!card) return;
        const r = card.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * 100;
        const my = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--mx', `${mx.toFixed(1)}%`);
        card.style.setProperty('--my', `${my.toFixed(1)}%`);
      });
    });
  }

  /* ----------------------------------------------------------------
   * 5. Section in-view observer
   * Adds .in-view to <section> elements as they enter the viewport so
   * background gradients / depth layers can react to scroll position.
   * Cheap — no per-frame work, just IntersectionObserver.
   * ---------------------------------------------------------------- */
  function initSectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('main > section, main section[id]').forEach((s) => io.observe(s));
  }

  /* ----------------------------------------------------------------
   * Boot
   * ---------------------------------------------------------------- */
  function boot() {
    initLenis();
    initMagneticButtons();
    initStaggerReveals();
    initCardSheen();
    initSectionObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
