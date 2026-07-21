/* Galent — mobile motion layer.
 *
 * On phones (<=860px) the scroll-scene pages present every section in its
 * final static state (blueprint-scenes.js setFinal). That's readable but
 * flat. This module adds a premium reveal: each section/card fades + rises
 * into view as it scrolls on, via IntersectionObserver. Desktop is untouched.
 *
 * Safety: initial hidden state is applied with inline !important so it wins
 * over any existing inline/stylesheet rules; a failsafe timer reveals
 * everything after 2.6s so content can never get stuck hidden (and reduced
 * motion / no-IO environments are skipped entirely).
 */
(function () {
  var mqMobile = window.matchMedia && window.matchMedia('(max-width: 860px)');
  if (!mqMobile || !mqMobile.matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  // Section-level blocks to reveal (kept coarse so the effect reads as clean
  // section-by-section motion, not twitchy per-word animation).
  var SELECTOR = [
    // Blueprint pages (platform/about/fde/industries)
    '.bp-dive-stage',
    '.bp-grid2 > *',
    '.bp-card',
    '.bp-slide',
    '.bp-schematic',
    '.bp-chapter',
    '.bp-proofwall',
    '.bp-cols4',
    '.bp-cols3',
    '.leader-card',
    // Homepage (g6) linearized scene blocks
    '.g6-pillar',
    '.g6-leader',
    '.g6-card',
    '.g6-slide',
    '#g6-s1-stage',
    '#g6-s2 > div > div > div',
    '#g6-s3 .g6-bp-d',
    '#g6-bp-d-init',
    '#g6-s6 [style*="align-items:baseline"]',
    // Design-system pages (services / knowledge-hub / contact / posts)
    '.section-head',
    '.stat-strip',
    '.engine-card',
    '.card-item',
    '.feature',
    '.svc',
    '.contact-card',
    '.office-card',
    '.cta-card',
    '.diff-list li',
    '.service-related a',
    '.cap',
    '.archetype-card',
    '.kh-banner',
    '.subscribe-band',
    '.hub-cat-title'
  ].join(',');

  var EASE = 'cubic-bezier(.16,1,.3,1)';

  function hide(el) {
    el.style.setProperty('transition', 'opacity .8s ' + EASE + ', transform .8s ' + EASE, 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('transform', 'translateY(28px)', 'important');
    el.style.setProperty('will-change', 'opacity, transform');
  }
  function show(el) {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  }

  function start() {
    var els = Array.prototype.slice.call(document.querySelectorAll(SELECTOR))
      .filter(function (el) { return !el.__mm; });
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    els.forEach(function (el) {
      el.__mm = 1;
      hide(el);
      io.observe(el);
    });

    // Failsafe: never leave anything hidden.
    setTimeout(function () { els.forEach(show); }, 2600);
    // Also reveal on first touch/scroll if IO is slow to fire.
    var kick = function () { requestAnimationFrame(function () {
      els.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.94) show(el); });
    }); };
    addEventListener('scroll', kick, { passive: true, once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
