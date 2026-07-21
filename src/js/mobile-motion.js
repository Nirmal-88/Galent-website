/* Galent — mobile motion layer.
 *
 * On phones (<=860px) the scroll-scene pages present sections in a mostly
 * static, linearized flow. This adds a premium reveal: each content block
 * fades + rises into view as it scrolls on, via IntersectionObserver — so the
 * phone experience feels alive, not like a PDF. Desktop is untouched.
 *
 * Robust by design:
 *  - Targets block-level containers (cards, sections, headings, media) and
 *    de-dupes nested matches so only the outermost block animates (no double
 *    motion, no fragile inline-style attribute selectors).
 *  - Skips the nav/header/footer and any fixed/sticky chrome.
 *  - Hides via inline !important so it beats existing inline/stylesheet rules;
 *    a 2.6s failsafe + first-scroll kick guarantee nothing stays hidden.
 *  - Skips entirely under reduced-motion or without IntersectionObserver.
 */
(function () {
  var mq = window.matchMedia && window.matchMedia('(max-width: 860px)');
  if (!mq || !mq.matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var SELECTOR = [
    'h1', 'h2', 'h3',
    'p',
    'img',
    'article',
    'blockquote',
    '.btn',
    '.section-head', '.stat-strip', '.cta-card', '.kh-banner', '.subscribe-band',
    '.bp-dive-stage', '.bp-chapter', '.bp-proofwall', '.bp-schematic',
    '[class*="card"]', '[class*="pillar"]', '[class*="leader"]',
    '[class*="slide"]', '[class*="engine"]', '[class*="tile"]', '[class*="dig"]',
    '#g6-s1-stage'
  ].join(',');

  // Never animate the persistent chrome.
  var EXCLUDE = 'nav,header,footer,.sh-nav,.footer,.nav,.bp-nav,.g6-nav';

  var EASE = 'cubic-bezier(.16,1,.3,1)';
  function hide(el) {
    el.style.setProperty('transition', 'opacity .7s ' + EASE + ', transform .7s ' + EASE, 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('transform', 'translateY(42px)', 'important');
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
      if (r.width < 40 || r.height < 16) return false;         // skip tiny/inline bits
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky') return false;
      // keep only the OUTERMOST match (skip if an ancestor is also targeted)
      var p = el.parentElement;
      while (p) { if (set.has(p)) return false; p = p.parentElement; }
      return true;
    });
  }

  function start() {
    var els = collect().filter(function (el) { return !el.__mm; });
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    els.forEach(function (el) { el.__mm = 1; hide(el); io.observe(el); });

    setTimeout(function () { els.forEach(show); }, 2600);        // failsafe
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
