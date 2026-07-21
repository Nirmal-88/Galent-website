/* Galent — scroll-reveal motion (cross-browser).
 *
 * Fades + rises content into view on scroll, via IntersectionObserver — which
 * works in EVERY browser. This replaces the CSS `animation-timeline: view()`
 * reveals that only fire in Chromium (in Safari/Firefox they played once on
 * load, so nothing animated on scroll).
 *
 * - On the scene pages (homepage #g6-root, blueprint .bp-scene) it runs at ALL
 *   widths. On desktop it reveals only the author-marked [data-reveal] blocks
 *   (the cinematic scenes animate themselves via their own scroll script, so we
 *   leave those alone). On phones it also reveals general content blocks so the
 *   linearized page feels alive.
 * - On other pages it runs on phones only (their desktop reveals already work).
 * - Robust: hides via inline !important, de-dupes nested matches, skips
 *   nav/footer + fixed chrome, and a 2.6s failsafe + first-scroll kick ensure
 *   nothing can ever stay hidden. Skips under reduced-motion / no-IO.
 */
(function () {
  var mqMobile = window.matchMedia && window.matchMedia('(max-width: 860px)');
  var isMobile = !!(mqMobile && mqMobile.matches);
  // Scene pages get reveals on desktop too (their CSS view() reveals don't
  // fire outside Chromium); everything else keeps desktop as-is.
  var scenePage = !!document.querySelector('#g6-root, .bp-scene');
  if (!isMobile && !scenePage) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var BROAD = [
    'h1', 'h2', 'h3', 'p', 'img', 'article', 'blockquote', '.btn',
    '.section-head', '.stat-strip', '.cta-card', '.kh-banner', '.subscribe-band',
    '.bp-dive-stage', '.bp-chapter', '.bp-proofwall', '.bp-schematic',
    '[class*="card"]', '[class*="pillar"]', '[class*="leader"]',
    '[class*="slide"]', '[class*="engine"]', '[class*="tile"]', '[class*="dig"]',
    '#g6-s1-stage'
  ].join(',');
  // On desktop scene pages, only reveal author-marked blocks so we never fight
  // the cinematic scrubbed scenes (which are not marked [data-reveal]).
  var SELECTOR = isMobile ? BROAD : '[data-reveal]';

  var EXCLUDE = 'nav,header,footer,.sh-nav,.footer,.nav,.bp-nav,.g6-nav';
  var EASE = 'cubic-bezier(.16,1,.3,1)';

  function hide(el) {
    el.style.setProperty('transition', 'opacity .8s ' + EASE + ', transform .8s ' + EASE, 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('transform', 'translateY(44px)', 'important');
    el.style.setProperty('will-change', 'opacity, transform');
  }
  function show(el) {
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('transform', 'none', 'important');
  }

  function collect() {
    var all = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    var set = new Set(all);
    return all.filter(function (el) {
      if (el.closest(EXCLUDE)) return false;
      var r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 16) return false;
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') return false;
      var p = el.parentElement;
      while (p) { if (set.has(p)) return false; p = p.parentElement; }
      return true;
    });
  }

  function start() {
    var els = collect().filter(function (el) { return !el.__mm; });
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    els.forEach(function (el) { el.__mm = 1; hide(el); io.observe(el); });
    setTimeout(function () { els.forEach(show); }, 2600);
    var kick = function () { requestAnimationFrame(function () {
      els.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 0.92) show(el); });
    }); };
    addEventListener('scroll', kick, { passive: true, once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
