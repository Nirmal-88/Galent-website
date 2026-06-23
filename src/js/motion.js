/* ============================================================================
 * Galent — Motion Engine (motion.js)
 * ----------------------------------------------------------------------------
 * One living motion system across the whole site. Built on GSAP 3.13 +
 * ScrollTrigger + ScrollSmoother + SplitText.
 *
 * Design intent: every motion communicates intelligence, orchestration,
 * connectivity, and transformation — never decoration for its own sake.
 *
 * Architecture
 *   - A single gsap.matchMedia() drives three regimes:
 *       reduce   → no scrub/pin/smooth; content simply appears.
 *       desktop  → smooth scroll + full scrub/pin/horizontal storytelling.
 *       mobile   → native scroll + lightweight reveals + subtle parallax.
 *   - This engine OWNS reveals. animations.js#persistentReveal stands down
 *     when window.GALENT_MOTION is set (see the head bootstrap on each page).
 *   - Hard fallback: if GSAP fails to load, every [data-reveal]/[data-stagger]
 *     is shown immediately so no content is ever stranded invisible.
 *
 * Performance contract (gsap-performance):
 *   - Transform + opacity only. will-change managed per-lifecycle.
 *   - Reveals via ScrollTrigger.batch (one observer, coalesced callbacks).
 *   - Parallax via ScrollSmoother data-speed effects (compositor-friendly).
 *   - content-visibility:auto is disabled only while smoothing is active,
 *     because smooth scroll needs an accurate total document height.
 * ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mark boot complete for the head safety-net timeout (defence in depth).
  function markBooted() { window.__galentMotionBooted = true; }

  // Reveal everything immediately — the universal floor used when GSAP is
  // unavailable or motion is reduced.
  function revealAll() {
    document.querySelectorAll('[data-reveal], [data-stagger]').forEach(function (el) {
      el.classList.add('in');
    });
    // section background-gradient depth (normally driven by .in-view)
    document.querySelectorAll('main > section, main section[id]').forEach(function (s) {
      s.classList.add('in-view');
    });
    // Reduced-motion / no-GSAP: show count-up FINAL values instantly (the
    // scroll-scrub counters never run in these paths).
    finalizeCountups();
  }

  function finalizeCountups() {
    document.querySelectorAll('[data-countup]').forEach(function (el) {
      var t = el.getAttribute('data-countup');
      if (t !== null && t !== '') el.textContent = t;
    });
  }

  function boot() {
    var gsap = window.gsap;

    // No GSAP (CDN blocked / offline) → guarantee content is visible, stop.
    if (!gsap || !window.ScrollTrigger) {
      revealAll();
      markBooted();
      return;
    }

    gsap.registerPlugin(window.ScrollTrigger);
    if (window.ScrollSmoother) gsap.registerPlugin(window.ScrollSmoother);
    if (window.SplitText)      gsap.registerPlugin(window.SplitText);

    var ScrollTrigger = window.ScrollTrigger;
    var ScrollSmoother = window.ScrollSmoother;

    // Engine is in charge of reveals from here on.
    root.classList.add('gsap-ready');

    // Build the ScrollSmoother DOM scaffold once (kept in the DOM regardless
    // of regime; the smoother *instance* is created/killed by matchMedia).
    buildSmoothScaffold();

    // ---- Reduced motion: appear instantly, nothing else. -------------------
    if (REDUCED) {
      revealAll();
      markBooted();
      return;
    }

    var isHome = document.body && document.body.dataset && document.body.dataset.page === 'home';

    // Refresh after webfonts settle so split lines + trigger positions are right.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });

    var mm = gsap.matchMedia();

    mm.add({
      isDesktop: '(min-width: 1025px) and (prefers-reduced-motion: no-preference)',
      isMobile:  '(max-width: 1024px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var c = ctx.conditions;
      var smoother = null;

      // Claim the stagger containers the flagship sequences animate themselves,
      // BEFORE the generic reveal pass runs, so the two systems never fight
      // over the same elements. Section heads stay with the generic pass.
      if (isHome) {
        markOwned('#outcomes .outcomes-grid');
        if (c.isDesktop) markOwned('#industries .home-sector-grid');
      }

      // ---- FEATURE 1 — premium smooth scrolling (desktop pointers only) ----
      if (c.isDesktop && ScrollSmoother) {
        root.classList.add('gsap-smooth');     // disables content-visibility (CSS)
        smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper',
          content: '#smooth-content',
          smooth: 1.15,          // light damping — premium, not laggy
          effects: true,         // enables data-speed / data-lag parallax
          normalizeScroll: true, // unifies wheel/touch, prevents address-bar jitter
          ignoreMobileResize: true
        });
        routeAnchorsThroughSmoother(smoother);
      }

      // ---- Sitewide motion language (both desktop + mobile) ----------------
      setupSectionInView(ScrollTrigger);
      setupReveals(gsap, ScrollTrigger, c);
      setupHeadlineReveals(gsap, c);
      setupParallaxLayers(gsap, ScrollTrigger, c, !!smoother);
      setupOutcomesScrub(gsap, ScrollTrigger);
      setupArchitectureDraw(gsap, ScrollTrigger);
      setupStatStrips(gsap, ScrollTrigger);
      setupCtaSystem(gsap, ScrollTrigger, c);
      setupOffscreenPause(ScrollTrigger);

      // ---- Flagship home choreography --------------------------------------
      if (isHome) {
        setupHeroEntrance(gsap);
        setupHeroScrub(gsap, ScrollTrigger, c);
        setupSvgNetworkGrowth(gsap, ScrollTrigger);
        if (c.isDesktop) {
          setupPinnedComparison(gsap, ScrollTrigger);
          setupHorizontalIndustries(gsap, ScrollTrigger);
        } else {
          // Mobile: comparison + industries simply reveal richly.
          revealSection('#how');
          revealSection('#industries');
        }
      }

      // ---- Hover system (fine pointers only) -------------------------------
      var hoverCleanup = function () {};
      if (c.isDesktop) hoverCleanup = setupHoverSystem(gsap);

      ScrollTrigger.refresh();

      // Cleanup when this regime stops matching (matchMedia reverts gsap +
      // ScrollTriggers automatically; we own the smoother instance + listeners).
      return function () {
        root.classList.remove('gsap-smooth');
        if (smoother) smoother.kill();
        hoverCleanup();
      };
    });

    markBooted();
  }

  /* ==========================================================================
   * SCROLLSMOOTHER SCAFFOLD
   * Wrap <main> + <footer> in #smooth-wrapper > #smooth-content. The fixed
   * header, skip link, and injected modal stay OUTSIDE the wrapper so their
   * position:fixed keeps working. Source HTML is never edited — same approach
   * as the runtime-injected contact modal.
   * ======================================================================== */
  function buildSmoothScaffold() {
    if (document.getElementById('smooth-wrapper')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var footer = document.querySelector('footer.footer') || document.querySelector('footer');

    var wrapper = document.createElement('div');
    wrapper.id = 'smooth-wrapper';
    var content = document.createElement('div');
    content.id = 'smooth-content';

    main.parentNode.insertBefore(wrapper, main);
    wrapper.appendChild(content);
    content.appendChild(main);
    if (footer) content.appendChild(footer);
  }

  // In-page anchors must travel through the smoother, not native jump.
  function routeAnchorsThroughSmoother(smoother) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;       // contact modal / no-ops
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      smoother.scrollTo(target, true, 'top 72px');                 // clear the fixed nav
    });
  }

  /* ==========================================================================
   * FEATURE 2 + 12 — LAYERED SECTION REVEALS  (motion hierarchy)
   * Replaces the flat fade-up. Section heads rise + settle; grids/cards do a
   * depth reveal (scale-from-back + lift + stagger). Batched into one observer.
   * ======================================================================== */
  function setupReveals(gsap, ScrollTrigger, c) {
    var DUR = c.isDesktop ? 0.9 : 0.7;

    // Solo reveal elements (not the direct children of a stagger container).
    var solo = Array.prototype.filter.call(
      document.querySelectorAll('[data-reveal]'),
      function (el) { return !el.parentElement.hasAttribute('data-stagger'); }
    );
    // Skip elements a flagship sequence will choreograph itself.
    solo = solo.filter(function (el) { return !el.closest('[data-motion-owned]'); });

    solo.forEach(function (el) {
      var dir = el.getAttribute('data-reveal');
      var from = { autoAlpha: 0, duration: DUR, ease: 'power3.out', overwrite: 'auto' };
      if (dir === 'left')       { from.x = -40; }
      else if (dir === 'right') { from.x = 40; }
      else if (dir === 'scale') { from.scale = 0.94; from.y = 24; }
      else                      { from.y = 34; }
      gsap.set(el, dir === 'left' || dir === 'right'
        ? { autoAlpha: 0, x: from.x }
        : { autoAlpha: 0, y: from.y || 0, scale: from.scale || 1 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 86%',
        once: true,
        onEnter: function () { gsap.to(el, Object.assign({ x: 0, y: 0, scale: 1 }, from)); }
      });
    });

    // Staggered groups — children cascade with a depth feel.
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      if (group.closest('[data-motion-owned]')) { group.classList.add('in'); return; }
      var items = Array.prototype.slice.call(group.children).filter(function (n) {
        return n.nodeType === 1;
      });
      if (!items.length) return;
      gsap.set(items, { autoAlpha: 0, y: 40, scale: 0.97 });
      group.classList.add('in'); // satisfies any CSS that keys off .in
      ScrollTrigger.create({
        trigger: group,
        start: 'top 84%',
        once: true,
        onEnter: function () {
          gsap.to(items, {
            autoAlpha: 1, y: 0, scale: 1,
            duration: DUR, ease: 'power3.out',
            stagger: { each: c.isDesktop ? 0.08 : 0.05, from: 'start' },
            overwrite: 'auto'
          });
        }
      });
    });
  }

  function markOwned(sel) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute('data-motion-owned', '');
  }

  // Force a [data-stagger]/[data-reveal] subtree visible (mobile fallbacks).
  function revealSection(sel) {
    var s = document.querySelector(sel);
    if (s) s.querySelectorAll('[data-reveal], [data-stagger]').forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* ==========================================================================
   * FEATURE 9 — TEXT ANIMATION  (line reveals via SplitText masks)
   * Section headlines reveal line-by-line behind a clip mask. No typewriter,
   * no gimmicks. Hero headline is intentionally excluded (entrance owns it).
   * ======================================================================== */
  function setupHeadlineReveals(gsap, c) {
    if (!window.SplitText) return;
    var heads = document.querySelectorAll('.section-head > h2');
    document.fonts && document.fonts.ready && document.fonts.ready.then(run);
    if (!document.fonts || !document.fonts.ready) run();

    function run() {
      heads.forEach(function (h) {
        if (h.closest('#hero') || h.dataset.split === 'done') return;
        if (h.closest('[data-motion-owned]')) return;
        h.dataset.split = 'done';
        try {
          var split = new window.SplitText(h, {
            type: 'lines', mask: 'lines', linesClass: 'gx-line', aria: 'auto'
          });
          gsap.set(split.lines, { yPercent: 115 });
          gsap.to(split.lines, {
            yPercent: 0,
            duration: c.isDesktop ? 0.9 : 0.7,
            ease: 'power4.out',
            stagger: 0.12,
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
          });
        } catch (err) { /* leave headline as-is on any split failure */ }
      });
    }
  }

  /* ==========================================================================
   * FEATURE 6 — PARALLAX DEPTH (3 layers, subtle)
   * Decorative aria-hidden layers drift at different speeds. On desktop this
   * rides ScrollSmoother's data-speed (compositor-only). On mobile we use a
   * single light scrub so the effect still reads without smoothing.
   * ======================================================================== */
  function setupParallaxLayers(gsap, ScrollTrigger, c, hasSmoother) {
    // background (slow), mid, foreground (faster-than-scroll) decorative layers
    var bg  = document.querySelectorAll('.gd-orb, .hero-network, .signal-bg, .cta-orb');
    var mid = document.querySelectorAll('.gd-bg, .cta-grid');

    if (hasSmoother) {
      bg.forEach(function (el)  { el.setAttribute('data-speed', '0.85'); });
      mid.forEach(function (el) { el.setAttribute('data-speed', '0.92'); });
      // a couple of foreground accents lead the scroll slightly
      document.querySelectorAll('.num-chip').forEach(function (el) {
        el.setAttribute('data-speed', '1.06');
      });
    } else {
      // mobile / no-smoother: gentle manual parallax, transform-only
      bg.forEach(function (el) {
        gsap.to(el, {
          yPercent: -8, ease: 'none',
          scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    }
  }

  /* ==========================================================================
   * FEATURE 10 — LOGO/HERO SYSTEM  (scrub timeline over the canvas network)
   * 0–20%  float        20–40% subtle transformation
   * 40–60% connection   60–100% network stabilisation
   * Drives the live canvas via Galent.setNetworkProgress() and parallaxes the
   * hero copy so the headline lifts away as the network resolves.
   * ======================================================================== */
  function setupHeroScrub(gsap, ScrollTrigger, c) {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var content = hero.querySelector('.hero-content');
    var network = hero.querySelector('.hero-network');

    // Network phase progress (0..1) tied to scrolling the hero out of view.
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: function (self) {
        if (window.Galent && window.Galent.setNetworkProgress) {
          window.Galent.setNetworkProgress(self.progress);
        }
      }
    });

    // Copy lifts + fades; network settles back and dims as you leave.
    var tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 }
    });
    if (content) tl.to(content, { yPercent: -22, autoAlpha: 0.0, ease: 'power1.in' }, 0);
    if (network) tl.to(network, { scale: 1.08, ease: 'none' }, 0);
  }

  /* ==========================================================================
   * FEATURE 5 — SVG NETWORK / ORCHESTRATION PATHWAYS
   * Injects an aria-hidden SVG behind the dark "Galent Difference" panel:
   * connection lines grow (stroke-dashoffset) and a pulse travels each path
   * as the section is scrubbed. No particles. No content change.
   * ======================================================================== */
  function setupSvgNetworkGrowth(gsap, ScrollTrigger) {
    var host = document.querySelector('#how .gd-bg');
    if (!host || host.querySelector('.gx-netlines')) return;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gx-netlines');
    svg.setAttribute('viewBox', '0 0 1200 700');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');

    // A small orchestration graph: hub → distributed nodes.
    var nodes = [
      [600, 350], [240, 160], [980, 150], [180, 520], [1020, 540],
      [430, 110], [760, 600], [120, 330], [1080, 330], [600, 90], [600, 620]
    ];
    var links = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,8],[5,9],[6,10],[1,5],[2,9],[3,7],[4,8]];
    var paths = [];

    links.forEach(function (lk) {
      var a = nodes[lk[0]], b = nodes[lk[1]];
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 40;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + a[0] + ',' + a[1] + ' Q' + mx + ',' + my + ' ' + b[0] + ',' + b[1]);
      p.setAttribute('class', 'gx-netline');
      svg.appendChild(p);
      paths.push(p);
    });
    nodes.forEach(function (n, i) {
      var cdot = document.createElementNS(NS, 'circle');
      cdot.setAttribute('cx', n[0]); cdot.setAttribute('cy', n[1]);
      cdot.setAttribute('r', i === 0 ? 7 : 4);
      cdot.setAttribute('class', 'gx-netnode' + (i === 0 ? ' is-hub' : ''));
      svg.appendChild(cdot);
    });
    host.appendChild(svg);

    // Grow each connection on scrub.
    paths.forEach(function (p) {
      var len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      ease: 'none',
      stagger: 0.04,
      scrollTrigger: { trigger: '#how', start: 'top 80%', end: 'center center', scrub: 1 }
    });
    gsap.fromTo(svg.querySelectorAll('.gx-netnode'),
      { scale: 0, transformOrigin: 'center' },
      { scale: 1, ease: 'back.out(2)', stagger: 0.05,
        scrollTrigger: { trigger: '#how', start: 'top 78%', end: 'center 60%', scrub: 1 } });
  }

  /* ==========================================================================
   * FEATURE 7 — PINNED STORYTELLING ("The Galent Difference")
   * Pin the section; as the user scrolls, the two panes assemble, the
   * "conventional" failings dim out line-by-line while "how Galent delivers"
   * lights up, then the platform engine pills resolve. Executive narrative.
   * ======================================================================== */
  function setupPinnedComparison(gsap, ScrollTrigger) {
    var section = document.getElementById('how');
    if (!section) return;
    var card = section.querySelector('.compare-card');
    var left = section.querySelector('.pane.left');
    var right = section.querySelector('.pane.right');
    if (!card || !left || !right) return;

    section.classList.add('cv-visible');

    var leftItems  = left.querySelectorAll('li');
    var rightItems = right.querySelectorAll('li');
    var pills = section.querySelectorAll('.engine-pill');

    gsap.set([left, right], { autoAlpha: 0 });
    gsap.set(left,  { xPercent: -6 });
    gsap.set(right, { xPercent: 6 });
    gsap.set(leftItems,  { autoAlpha: 0, x: -16 });
    gsap.set(rightItems, { autoAlpha: 0, x: 16 });
    if (pills.length) gsap.set(pills, { autoAlpha: 0, y: 24 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=130%',
        pin: true,
        scrub: 1,
        anticipatePin: 1
      }
    });

    tl.to(left,  { autoAlpha: 1, xPercent: 0, duration: 0.6, ease: 'power2.out' }, 0)
      .to(right, { autoAlpha: 1, xPercent: 0, duration: 0.6, ease: 'power2.out' }, 0.1)
      .to(leftItems,  { autoAlpha: 0.55, x: 0, duration: 0.5, stagger: 0.08 }, 0.45)
      .to(rightItems, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08 }, 0.55);
    if (pills.length) {
      tl.to(pills, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }, 1.05);
    }
  }

  /* ==========================================================================
   * FEATURE 3 — HORIZONTAL EXECUTIVE SCROLL (Industries)
   * Pins the dark Industries panel and moves its 7 sector cards horizontally
   * as the user scrolls vertically — an executive deck, not a carousel. Each
   * card lifts into focus as it reaches centre (containerAnimation).
   * Desktop only; mobile keeps the native grid.
   * ======================================================================== */
  function setupHorizontalIndustries(gsap, ScrollTrigger) {
    var section = document.getElementById('industries');
    if (!section) return;
    var track = section.querySelector('.home-sector-grid');
    if (!track) return;
    var cards = Array.prototype.slice.call(track.children);
    if (cards.length < 4) return;

    section.classList.add('cv-visible', 'is-horizontal');

    // Distance to travel = track overflow past the viewport.
    var getShift = function () {
      return Math.max(0, track.scrollWidth - window.innerWidth + 120);
    };

    var scrollTween = gsap.to(track, {
      x: function () { return -getShift(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + getShift(); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // Each card sharpens as it crosses centre — tied to horizontal motion.
    cards.forEach(function (cardEl) {
      gsap.fromTo(cardEl,
        { autoAlpha: 0.45, scale: 0.94 },
        {
          autoAlpha: 1, scale: 1, ease: 'power2.out', duration: 0.4,
          scrollTrigger: {
            trigger: cardEl,
            containerAnimation: scrollTween,
            start: 'left 78%',
            end: 'right 50%',
            toggleActions: 'play none none reverse'
          }
        });
    });
  }

  /* ==========================================================================
   * FEATURE 8 — HOVER SYSTEM (magnetic lift + cursor lighting)
   * Cards lean a few px toward the cursor (quickTo) and a soft light follows
   * via CSS custom properties. Buttons get a magnetic nudge. Nothing flashy.
   * ======================================================================== */
  function setupHoverSystem(gsap) {
    var cardSel = '.svc, .home-sector-card, .proof-card, .fde-rich, .case-study, .engine-deep-card, .feature, .cta-card';
    var btnSel = '.btn';
    var bound = [];

    document.querySelectorAll(cardSel).forEach(function (el) {
      if (el.closest('.is-horizontal')) return; // horizontal track owns its transforms
      el.classList.add('gx-magnetic');
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      function move(e) {
        var r = el.getBoundingClientRect();
        var relX = (e.clientX - r.left) / r.width - 0.5;
        var relY = (e.clientY - r.top) / r.height - 0.5;
        xTo(relX * 14);
        yTo(relY * 12);
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      }
      function leave() { xTo(0); yTo(0); }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      bound.push(function () {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        el.classList.remove('gx-magnetic');
      });
    });

    document.querySelectorAll(btnSel).forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      function move(e) {
        var r = el.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 10);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 8);
      }
      function leave() { xTo(0); yTo(0); }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      bound.push(function () {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    });

    return function () { bound.forEach(function (fn) { fn(); }); };
  }

  /* ==========================================================================
   * FEATURE 4 — SCROLL-SCRUB COUNT-UP (home Outcomes)
   * The big stats count toward their targets as the panel is scrubbed, then
   * lock. Driven by scroll progress, never autoplay.
   * ======================================================================== */
  function setupOutcomesScrub(gsap, ScrollTrigger) {
    var section = document.getElementById('outcomes');
    if (!section) return;
    var stats = Array.prototype.slice.call(section.querySelectorAll('.outcome-stat'));
    if (!stats.length) return;

    var grid = section.querySelector('.outcomes-grid');
    var items = stats;
    gsap.set(items, { autoAlpha: 0, y: 28 });

    var counters = [];
    stats.forEach(function (stat) {
      stat.querySelectorAll('[data-countup]').forEach(function (b) {
        var target = parseFloat(b.getAttribute('data-countup'));
        if (!isFinite(target)) return;
        b.textContent = '0';
        counters.push({ el: b, target: target, v: 0 });
      });
    });

    ScrollTrigger.create({
      trigger: section, start: 'top 78%', once: true,
      onEnter: function () {
        gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 });
      }
    });

    var proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: grid || section, start: 'top 75%', end: 'center 55%', scrub: 0.6 },
      onUpdate: function () {
        counters.forEach(function (c) {
          c.el.textContent = Math.round(c.target * proxy.p).toString();
        });
      },
      onComplete: function () {
        counters.forEach(function (c) { c.el.textContent = String(c.target); });
      }
    });
  }

  /* ==========================================================================
   * Platform architecture spine — line draws top→bottom on scrub, layers
   * resolve as the line reaches them. (Ported + upgraded from premium.js.)
   * ======================================================================== */
  function setupArchitectureDraw(gsap, ScrollTrigger) {
    var stack = document.querySelector('.arch-stack');
    if (!stack) return;
    var layers = Array.prototype.slice.call(stack.querySelectorAll('.arch-layer'));
    if (!layers.length) return;

    stack.style.setProperty('--arch-progress', '0');
    gsap.set(layers, { autoAlpha: 0, y: 16 });

    gsap.timeline({
      scrollTrigger: { trigger: stack, start: 'top 75%', end: 'bottom 70%', scrub: 0.8 }
    }).to(stack, {
      duration: 1, ease: 'none',
      onUpdate: function () { stack.style.setProperty('--arch-progress', String(this.progress())); }
    }, 0).to(layers, {
      autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.18
    }, 0.1);
  }

  /* ==========================================================================
   * Generic animated stat strips ([data-countup] inside .stat-strip--animated)
   * ======================================================================== */
  function setupStatStrips(gsap, ScrollTrigger) {
    document.querySelectorAll('.stat-strip--animated').forEach(function (strip) {
      var items = Array.prototype.slice.call(strip.querySelectorAll('.item'));
      if (!items.length) return;
      var cells = items.map(function (item) {
        var bigs = Array.prototype.slice.call(item.querySelectorAll('[data-countup]'));
        var targets = bigs.map(function (b) { return parseFloat(b.getAttribute('data-countup')); });
        bigs.forEach(function (b) { b.textContent = '0'; });
        gsap.set(item, { autoAlpha: 0, y: 18 });
        return { item: item, bigs: bigs, targets: targets };
      });
      ScrollTrigger.create({
        trigger: strip, start: 'top 80%', once: true,
        onEnter: function () {
          var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          cells.forEach(function (cell, i) {
            var at = i * 0.1;
            tl.to(cell.item, { autoAlpha: 1, y: 0, duration: 0.5 }, at);
            cell.bigs.forEach(function (big, j) {
              var target = cell.targets[j];
              if (!isFinite(target)) return;
              var counter = { v: 0 };
              tl.to(counter, {
                v: target, duration: 1.1, ease: 'power3.out',
                onUpdate: function () { big.textContent = Math.round(counter.v).toString(); },
                onComplete: function () { big.textContent = String(target); }
              }, at + 0.05);
            });
          });
        }
      });
    });
  }

  /* ==========================================================================
   * CTA system — decorations injected everywhere; parallax via scrub.
   * (Ported from premium.js so it survives the engine swap.)
   * ======================================================================== */
  function setupCtaSystem(gsap, ScrollTrigger, c) {
    document.querySelectorAll('.cta-card').forEach(function (card) {
      if (!card.querySelector('.cta-fx')) {
        var fx = document.createElement('div');
        fx.className = 'cta-fx';
        fx.setAttribute('aria-hidden', 'true');
        fx.innerHTML = '<div class="cta-grid"></div>'
          + '<div class="cta-orb cta-orb--a"></div><div class="cta-orb cta-orb--b"></div><div class="cta-orb cta-orb--c"></div>'
          + '<div class="cta-rings"><span></span><span></span><span></span></div>'
          + '<div class="cta-spark cta-spark--1"></div><div class="cta-spark cta-spark--2"></div>'
          + '<div class="cta-spark cta-spark--3"></div><div class="cta-spark cta-spark--4"></div>';
        card.insertBefore(fx, card.firstChild);
      }
      // The CSS parallax layers key off this attribute.
      card.setAttribute('data-cta-parallax', '');

      // Scroll-linked parallax shift, written as CSS vars the layers consume.
      var proxy = { v: -1 };
      gsap.fromTo(proxy, { v: -1 }, {
        v: 1, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
        onUpdate: function () {
          card.style.setProperty('--cta-shift', (proxy.v * 60).toFixed(2) + 'px');
          card.style.setProperty('--cta-shift-x', (proxy.v * 18).toFixed(2) + 'px');
        }
      });
    });
  }

  /* ==========================================================================
   * Section in-view flag — adds .in-view to sections so their CSS background
   * gradients fade in (the depth effect in design-system.css). Ported from
   * premium.js so dropping it doesn't regress section depth.
   * ======================================================================== */
  /* ==========================================================================
   * Perf — pause the CTA's continuous CSS effects (orbs/rings/sparks) while
   * the card is offscreen. Recovers the compositing saving we lose by turning
   * off content-visibility under smooth scroll. Scoped to .gsap-smooth in CSS.
   * ======================================================================== */
  function setupOffscreenPause(ScrollTrigger) {
    document.querySelectorAll('.cta-card').forEach(function (card) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: function (self) { card.classList.toggle('gx-active-fx', self.isActive); }
      });
    });
  }

  function setupSectionInView(ScrollTrigger) {
    document.querySelectorAll('main > section, main section[id]').forEach(function (s) {
      ScrollTrigger.create({
        trigger: s, start: 'top 92%', once: true,
        onEnter: function () { s.classList.add('in-view'); }
      });
    });
  }

  /* ==========================================================================
   * Hero entrance (home) — badge → headline → lede → CTAs, network fades up.
   * Plays once on load. Coexists with the hero scrub (separate properties).
   * ======================================================================== */
  function setupHeroEntrance(gsap) {
    var hero = document.getElementById('hero');
    if (!hero) { root.classList.remove('hero-entering'); return; }
    var network = hero.querySelector('.hero-network');
    var fg = [
      hero.querySelector('.badge'),
      hero.querySelector('.t-hero'),
      hero.querySelector('.hero-lede'),
      hero.querySelector('.cta-row'),
      hero.querySelector('.scroll-chevron')
    ].filter(Boolean);

    gsap.set(fg, { autoAlpha: 0, y: 18 });
    if (network) gsap.set(network, { autoAlpha: 0 });
    root.classList.remove('hero-entering');

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (network) tl.to(network, { autoAlpha: 1, duration: 1.2 }, 0);
    tl.to(fg, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.13 }, 0.1);
  }

  /* ---- bootstrap ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
