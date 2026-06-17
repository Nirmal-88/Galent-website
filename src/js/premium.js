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

  /* ----------------------------------------------------------------
   * Shared helper — IntersectionObserver that fires once per element.
   * ---------------------------------------------------------------- */
  function onceInView(el, threshold, cb) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    let fired = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || fired) continue;
        fired = true;
        cb();
        io.disconnect();
      }
    }, { threshold: threshold });
    io.observe(el);
  }

  /* ----------------------------------------------------------------
   * A. Home Outcomes — choreographed count-up + label reveal.
   * When the dark "Numbers from live programmes" panel enters the
   * viewport, the 4 big numbers count up smoothly and each label
   * fades in 0.2s after its number lands.
   * ---------------------------------------------------------------- */
  function initOutcomesGSAP() {
    if (REDUCED_MOTION) return;
    if (typeof window.gsap !== 'object' && typeof window.gsap !== 'function') return;
    if (!document.body || document.body.dataset.page !== 'home') return;

    const section = document.getElementById('outcomes');
    if (!section) return;
    const stats = Array.from(section.querySelectorAll('.outcome-stat'));
    if (!stats.length) return;
    const gsap = window.gsap;

    // Snapshot original numbers, hide initial state.
    const cells = stats.map((stat) => {
      const bigs = Array.from(stat.querySelectorAll('[data-countup]'));
      const label = stat.querySelector('.label');
      const targets = bigs.map((b) => parseFloat(b.getAttribute('data-countup')));
      bigs.forEach((b) => { b.textContent = '0'; });
      gsap.set(stat,  { opacity: 0, y: 12 });
      if (label) gsap.set(label, { opacity: 0, y: 6 });
      return { stat, bigs, label, targets };
    });

    onceInView(section, 0.3, function () {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      cells.forEach((cell, i) => {
        const stagger = i * 0.12;
        tl.to(cell.stat, { opacity: 1, y: 0, duration: 0.5 }, stagger);
        cell.bigs.forEach((big, j) => {
          const target = cell.targets[j];
          if (!isFinite(target)) return;
          const counter = { v: 0 };
          tl.to(counter, {
            v: target,
            duration: 1.0,
            ease: 'power3.out',
            onUpdate: function () { big.textContent = Math.round(counter.v).toString(); },
            onComplete: function () { big.textContent = String(target); },
          }, stagger + 0.05);
        });
        if (cell.label) tl.to(cell.label, { opacity: 1, y: 0, duration: 0.45 }, stagger + 0.65);
      });
    });
  }

  /* ----------------------------------------------------------------
   * B. Section narrative timelines.
   * Sections marked [data-tl] play their reveal as a coordinated
   * timeline: badge -> headline -> lede -> grid items staggered.
   * One-shot per section when it enters viewport.
   * ---------------------------------------------------------------- */
  function initSectionTimelines() {
    if (REDUCED_MOTION) return;
    if (typeof window.gsap !== 'object' && typeof window.gsap !== 'function') return;
    const gsap = window.gsap;

    document.querySelectorAll('[data-tl]').forEach((section) => {
      const head = section.querySelector('.section-head');
      const badge    = head && head.querySelector('.badge');
      const headline = head && head.querySelector('.t-h1, .t-display-italic, .t-h2');
      const lede     = head && head.querySelector('.t-body-lg, p');
      const grid = section.querySelector('[data-stagger]');
      const items = grid ? Array.from(grid.children) : [];

      // Initial hidden state
      [badge, headline, lede].forEach((el) => { if (el) gsap.set(el, { opacity: 0, y: 16 }); });
      if (items.length) gsap.set(items, { opacity: 0, y: 20 });

      onceInView(section, 0.15, function () {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        if (badge)    tl.to(badge,    { opacity: 1, y: 0, duration: 0.5 }, 0);
        if (headline) tl.to(headline, { opacity: 1, y: 0, duration: 0.7 }, 0.15);
        if (lede)     tl.to(lede,     { opacity: 1, y: 0, duration: 0.6 }, 0.4);
        if (items.length) {
          tl.to(items, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07 }, 0.6);
        }
      });
    });
  }

  /* ----------------------------------------------------------------
   * C. Architecture diagram — line draw + dot pop + layer fade.
   * On /platform.html the 5-layer reference stack has a vertical line
   * down the left. When the stack enters viewport, the line draws
   * top-to-bottom; each numbered dot appears as the line reaches it;
   * each layer card fades in just behind its dot. Self-assembling.
   * ---------------------------------------------------------------- */
  function initArchitectureDraw() {
    if (REDUCED_MOTION) return;
    if (typeof window.gsap !== 'object' && typeof window.gsap !== 'function') return;
    const gsap = window.gsap;

    const stack = document.querySelector('.arch-stack');
    if (!stack) return;
    const layers = Array.from(stack.querySelectorAll('.arch-layer'));
    if (!layers.length) return;

    // Initial hidden state — CSS reads --arch-progress on the spine.
    stack.style.setProperty('--arch-progress', '0');
    gsap.set(layers, { opacity: 0, y: 14 });

    onceInView(stack, 0.2, function () {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      // Vertical spine grows top -> bottom over 0.85s
      tl.to(stack, {
        duration: 0.85,
        ease: 'power2.inOut',
        onUpdate: function () {
          stack.style.setProperty('--arch-progress', String(this.progress()));
        },
      }, 0);
      // Layers fade in in sync with the line passing their dots
      layers.forEach((layer, i) => {
        const t = 0.15 + (i / layers.length) * 0.7;
        tl.to(layer, { opacity: 1, y: 0, duration: 0.45 }, t);
      });
    });
  }

  /* ----------------------------------------------------------------
   * Final CTA — scroll-driven parallax.
   * As the .cta-card scrolls into and out of the viewport, sets a
   * CSS custom property --cta-shift on the card (range roughly
   * -80px..+80px). CSS layers consume that value at different
   * multipliers so the grid, orbs, rings and content all move at
   * different rates, producing a subtle parallax effect.
   * ---------------------------------------------------------------- */
  function initCTAParallax() {
    if (REDUCED_MOTION) return;
    const card = document.querySelector('.cta-card[data-cta-parallax]');
    if (!card) return;

    let ticking = false;
    let inView = false;

    function update() {
      ticking = false;
      const rect = card.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // progress: -1 when card is fully below viewport, 0 when centred, +1 when fully above
      const center = rect.top + rect.height / 2;
      const progress = (center - vh / 2) / (vh / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      const shift = clamped * 80; // px
      const shiftX = clamped * 24; // px (horizontal drift, smaller)
      card.style.setProperty('--cta-shift', shift.toFixed(2) + 'px');
      card.style.setProperty('--cta-shift-x', shiftX.toFixed(2) + 'px');
    }

    function onScroll() {
      if (!inView) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          inView = e.isIntersecting;
          if (inView) update();
        });
      }, { rootMargin: '20% 0px 20% 0px' });
      io.observe(card);
    } else {
      inView = true;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ----------------------------------------------------------------
   * Generic stat-strip count-up.
   * Any .stat-strip--animated with [data-countup] spans inside its
   * .big numbers will count from 0 to the target value when the
   * strip enters viewport. Used by the Applied AI at Scale strip
   * on platform.html and any future strip flagged the same way.
   * ---------------------------------------------------------------- */
  function initStatStripCountup() {
    if (REDUCED_MOTION) return;
    if (typeof window.gsap !== 'object' && typeof window.gsap !== 'function') return;
    const gsap = window.gsap;
    const strips = document.querySelectorAll('.stat-strip--animated');
    if (!strips.length) return;

    strips.forEach(function (strip) {
      const items = Array.from(strip.querySelectorAll('.item'));
      if (!items.length) return;

      const cells = items.map(function (item) {
        const bigs = Array.from(item.querySelectorAll('[data-countup]'));
        const targets = bigs.map(function (b) { return parseFloat(b.getAttribute('data-countup')); });
        bigs.forEach(function (b) { b.textContent = '0'; });
        gsap.set(item, { opacity: 0, y: 14 });
        return { item: item, bigs: bigs, targets: targets };
      });

      onceInView(strip, 0.25, function () {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        cells.forEach(function (cell, i) {
          const stagger = i * 0.10;
          tl.to(cell.item, { opacity: 1, y: 0, duration: 0.5 }, stagger);
          cell.bigs.forEach(function (big, j) {
            const target = cell.targets[j];
            if (!isFinite(target)) return;
            const counter = { v: 0 };
            tl.to(counter, {
              v: target,
              duration: 1.1,
              ease: 'power3.out',
              onUpdate: function () { big.textContent = Math.round(counter.v).toString(); },
              onComplete: function () { big.textContent = String(target); },
            }, stagger + 0.05);
          });
        });
      });
    });
  }

  function boot() {
    initStaggerReveals();
    initSectionObserver();
    initHeroEntrance();
    initOutcomesGSAP();
    initSectionTimelines();
    initArchitectureDraw();
    initCTAParallax();
    initStatStripCountup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
