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
   * Hero entrance timeline (home only).
   * One purposeful animation: badge -> headline -> lede -> CTAs ->
   * scroll chevron, with the kinetic-network canvas fading in behind.
   * Runs ONCE on first paint. Skipped under reduced-motion. Cleans up
   * the .hero-entering class either way so content always becomes
   * visible.
   * ---------------------------------------------------------------- */
  function initHeroEntrance() {
    const root = document.documentElement;
    const isHome = document.body && document.body.dataset && document.body.dataset.page === 'home';
    const hero = document.getElementById('hero');
    if (!isHome || !hero) { root.classList.remove('hero-entering'); return; }

    // Reduced motion: skip the timeline, just show content.
    if (REDUCED_MOTION) { root.classList.remove('hero-entering'); return; }

    // If GSAP didn't load (CDN blocked / offline), reveal and bail.
    if (typeof window.gsap !== 'object' && typeof window.gsap !== 'function') {
      root.classList.remove('hero-entering');
      return;
    }
    const gsap = window.gsap;

    const network = hero.querySelector('.hero-network');
    const badge   = hero.querySelector('.badge');
    const title   = hero.querySelector('.t-hero');
    const lede    = hero.querySelector('.hero-lede');
    const ctaRow  = hero.querySelector('.cta-row');
    const chevron = hero.querySelector('.scroll-chevron');
    const fg = [badge, title, lede, ctaRow, chevron].filter(Boolean);

    // Lock the initial hidden state via GSAP first, THEN drop the CSS hide-class.
    // This avoids any one-frame flash between class removal and timeline start.
    gsap.set(fg, { opacity: 0, y: 16, force3D: true });
    if (network) gsap.set(network, { opacity: 0 });
    root.classList.remove('hero-entering');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out', force3D: true },
      onComplete: function () {
        // Clean up inline styles so subsequent layout work doesn't fight transforms.
        gsap.set(fg, { clearProps: 'transform,opacity' });
        if (network) gsap.set(network, { clearProps: 'opacity' });
      },
    });

    // The kinetic network backdrop fades up first, setting the stage.
    if (network) tl.to(network, { opacity: 1, duration: 1.2 }, 0);

    // Foreground sequence
    if (badge)   tl.to(badge,   { opacity: 1, y: 0, duration: 0.6 }, 0.10);
    if (title)   tl.to(title,   { opacity: 1, y: 0, duration: 0.85 }, 0.22);
    if (lede)    tl.to(lede,    { opacity: 1, y: 0, duration: 0.7 }, 0.46);
    if (ctaRow)  tl.to(ctaRow,  { opacity: 1, y: 0, duration: 0.6 }, 0.62);
    if (chevron) tl.to(chevron, { opacity: 1, y: 0, duration: 0.5 }, 0.95);
  }

  function boot() {
    initStaggerReveals();
    initSectionObserver();
    initHeroEntrance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
