/* ============================================================================
 * Galent — Motion Engine (motion.js)
 * ----------------------------------------------------------------------------
 * GSAP 3.13 + ScrollTrigger + ScrollSmoother + SplitText. Full premium feature
 * set, built so CONTENT CAN NEVER BE STRANDED INVISIBLE.
 *
 * The reliability rule (non-negotiable, learned the hard way):
 *   Content visibility is the CSS `.in` system. `.in` is toggled by THREE
 *   independent layers so a miss in one is caught by another:
 *     1) IntersectionObserver  (efficient; perfect on native scroll)
 *     2) a ScrollTrigger.onUpdate + scroll/raf backstop that checks the real,
 *        transform-aware getBoundingClientRect (this is what makes it reliable
 *        even under ScrollSmoother, where IO alone is flaky)
 *     3) a load + safety sweep
 *   GSAP never hides content waiting on a trigger; every GSAP effect is
 *   decorative or animates `from` a state (visible-by-default).
 * ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function markBooted() { window.__galentMotionBooted = true; }

  function revealAll() {
    document.querySelectorAll('[data-reveal], [data-stagger]').forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('main > section, main section[id]').forEach(function (s) { s.classList.add('in-view'); });
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
    if (!gsap || !window.ScrollTrigger) { revealAll(); markBooted(); return; }

    gsap.registerPlugin(window.ScrollTrigger);
    if (window.ScrollSmoother) gsap.registerPlugin(window.ScrollSmoother);
    if (window.SplitText)      gsap.registerPlugin(window.SplitText);
    var ScrollTrigger = window.ScrollTrigger;
    var ScrollSmoother = window.ScrollSmoother;

    root.classList.add('gsap-ready');

    // Global motion language — one premium decel curve as the default so every
    // un-eased tween shares the same feel (individual tweens still override).
    gsap.defaults({ ease: 'power3.out', duration: 0.8 });

    if (REDUCED) { revealAll(); markBooted(); return; }

    var isHome = document.body && document.body.dataset && document.body.dataset.page === 'home';

    // Hero intro (home): logo → contour lines → settle → hero primary. Runs
    // immediately against the preloader so it never delays the real content.
    if (isHome) setupHeroIntro(gsap);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });

    var mm = gsap.matchMedia();
    mm.add({
      isDesktop: '(min-width: 1025px) and (prefers-reduced-motion: no-preference)',
      isMobile:  '(max-width: 1024px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var c = ctx.conditions;
      var smoother = null;

      // FEATURE 1 — smooth scrolling (desktop). Wrapper is built so the fixed
      // header/modal stay outside the transform. Reveals are made reliable
      // under the transform by the backstop below, so this is safe.
      if (c.isDesktop && ScrollSmoother) {
        buildSmoothScaffold();
        root.classList.add('gsap-smooth');
        smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper', content: '#smooth-content',
          // Heavier, more luxurious glide. normalizeScroll off — it was
          // intercepting the wheel and causing the rough, patchy stutter;
          // native scroll + transform smoothing is far smoother on desktop.
          smooth: 1.4, effects: true, normalizeScroll: false, ignoreMobileResize: true
        });
        routeAnchorsThroughSmoother(smoother);
      }

      // Reveals (content) — three-layer reliable system.
      setupReveals(ScrollTrigger);
      setupHeadlineReveals(c);

      // Effects (decorative / visible-by-default — never gate content).
      setupParallaxLayers(gsap, ScrollTrigger);
      setupOutcomes(gsap, ScrollTrigger);
      setupStatStrips(gsap, ScrollTrigger);
      setupArchitectureDraw(gsap, ScrollTrigger);
      setupSectionContinuity(gsap, ScrollTrigger);
      setupCtaSystem(gsap, ScrollTrigger);
      setupOffscreenPause(ScrollTrigger);

      var heroCleanup = function () {};
      if (isHome) {
        setupHeroEntrance(gsap);
        heroCleanup = setupHeroLogo(gsap, ScrollTrigger);
        if (c.isDesktop) {
          setupPinnedComparison(gsap, ScrollTrigger);
          setupHorizontalIndustries(gsap, ScrollTrigger);
        }
      }

      // Platform GalentAI engine diagram — pinned executive storytelling.
      var engineCleanup = c.isDesktop ? setupPlatformEngines(gsap, ScrollTrigger) : function () {};

      var hoverCleanup = c.isDesktop ? setupHoverSystem(gsap) : function () {};
      ScrollTrigger.refresh();
      return function () { root.classList.remove('gsap-smooth'); if (smoother) smoother.kill(); engineCleanup(); heroCleanup(); hoverCleanup(); };
    });

    markBooted();
  }

  /* ==========================================================================
   * SMOOTH SCROLL SCAFFOLD — wrap <main>+<footer>; fixed header/modal stay out.
   * ======================================================================== */
  function buildSmoothScaffold() {
    if (document.getElementById('smooth-wrapper')) return;
    var main = document.querySelector('main');
    if (!main) return;
    var footer = document.querySelector('footer.footer') || document.querySelector('footer');
    var wrapper = document.createElement('div'); wrapper.id = 'smooth-wrapper';
    var content = document.createElement('div'); content.id = 'smooth-content';
    main.parentNode.insertBefore(wrapper, main);
    wrapper.appendChild(content);
    content.appendChild(main);
    if (footer) content.appendChild(footer);
  }
  function routeAnchorsThroughSmoother(smoother) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      smoother.scrollTo(target, true, 'top 72px');
    });
  }

  /* ==========================================================================
   * FEATURE 2 — reveals via the CSS `.in` system. Three layers toggle `.in`
   * so content can never be stranded (see header). CSS does the visual reveal.
   * ======================================================================== */
  function setupReveals(ScrollTrigger) {
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-stagger]'));
    var sectionEls = Array.prototype.slice.call(document.querySelectorAll('main > section, main section[id]'));

    function showEl(el) { el.classList.add('in'); }
    function showSec(s) { s.classList.add('in-view'); }

    // Layer 1 — IntersectionObserver (efficient).
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); showEl(e.target); } });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });

      var ioS = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { ioS.unobserve(e.target); showSec(e.target); } });
      }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
      sectionEls.forEach(function (s) { if (!s.classList.contains('in-view')) ioS.observe(s); });
    } else {
      revealEls.forEach(showEl); sectionEls.forEach(showSec);
    }

    // Layer 2 — transform-aware backstop. Reveals anything whose real on-screen
    // box is in view, even if IO missed it (this is what survives ScrollSmoother
    // and content-visibility timing). Runs on scroll (rAF) + ScrollTrigger ticks.
    var pendingR = revealEls.slice(), pendingS = sectionEls.slice();
    function sweep() {
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      pendingR = pendingR.filter(function (el) {
        if (el.classList.contains('in')) return false;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.96 && r.bottom > -80) { showEl(el); return false; }
        return true;
      });
      pendingS = pendingS.filter(function (s) {
        if (s.classList.contains('in-view')) return false;
        var r = s.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) { showSec(s); return false; }
        return true;
      });
      if (!pendingR.length && !pendingS.length && st) { st.kill(); window.removeEventListener('scroll', onScroll); }
    }
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; sweep(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', function () { setTimeout(sweep, 60); });
    var st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: onScroll, onRefresh: sweep });
    sweep();

    // Layer 3 — CMS-injected content (case studies, knowledge cards).
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            var p = n.parentElement && n.parentElement.closest && n.parentElement.closest('[data-stagger]');
            if (p) p.classList.add('in');
            if (n.matches && n.matches('[data-reveal], [data-stagger]')) n.classList.add('in');
            if (n.querySelectorAll) n.querySelectorAll('[data-reveal], [data-stagger]').forEach(function (c) { c.classList.add('in'); });
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  /* ==========================================================================
   * FEATURE 9 — headline line reveals. SplitText builds masked lines; the CSS
   * `.in` on the section head slides them up (per-line delay). Because it rides
   * the reliable `.in` reveal, headlines can never be left hidden; if SplitText
   * fails, the headline simply shows normally.
   * ======================================================================== */
  function setupHeadlineReveals(c) {
    if (!window.SplitText) return;
    var run = function () {
      document.querySelectorAll('.section-head > h2').forEach(function (h) {
        if (h.closest('#hero') || h.dataset.split === 'done') return;
        h.dataset.split = 'done';
        try {
          // Words nested inside masked lines: the line clips, each word rises
          // independently with a per-word delay (TRIONN-style word reveal).
          // propIndex writes a `--word` custom property the CSS uses to stagger.
          new window.SplitText(h, {
            type: 'lines,words', mask: 'lines',
            linesClass: 'gx-line', wordsClass: 'gx-word',
            propIndex: true, aria: 'auto'
          });
          h.classList.add('gx-split');
        } catch (err) { /* headline stays normal, still revealed by .in */ }
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run();
  }

  /* ==========================================================================
   * FEATURE 6 — parallax depth (decorative scrub).
   * ======================================================================== */
  function setupParallaxLayers(gsap, ScrollTrigger) {
    document.querySelectorAll('.gd-orb, .signal-bg, .cta-orb').forEach(function (el) {
      var sec = el.closest('section') || el;
      gsap.to(el, { yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ==========================================================================
   * HERO LOGO SYSTEM (home). The Galent mark IMAGE is the centerpiece — only
   * transforms / filters animate it; the geometry is never recreated. It
   * floats at rest, then on scroll it scales + lights up while an intelligence
   * network radiates OUT FROM the mark (paths drawn from its centre, nodes
   * resolve, pulses travel) — the logo "evolving" into the platform. The hero
   * copy lifts away as you leave. Returns a cleanup fn.
   * ======================================================================== */
  function setupHeroLogo(gsap, ScrollTrigger) {
    var main = document.getElementById('top');
    var hero = document.getElementById('hero');
    var mark = document.querySelector('.travel-mark');
    var img = mark && mark.querySelector('img');
    var headline = document.querySelector('#problem .section-head h2') ||
                   document.querySelector('#problem .section-head');
    if (!main || !hero || !mark || !img) return function () {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var GAP = 22;             // gap to the left of the headline
    var START = 1.05;         // entrance begins as the loading screen fades
    var ASPECT = 320 / 395;   // mark width / height

    // Geometry relative to <main>; recomputed on refresh / resize. The docked
    // mark is sized to the headline's height so it matches "The Delivery Model…".
    var geo = { heroCX: 0, heroCY: 0, dockCX: 0, dockCY: 0, smallScale: 1 };
    function layout() {
      var m = main.getBoundingClientRect();
      var h = hero.getBoundingClientRect();
      var mw = mark.offsetWidth || 1;
      geo.heroCX = (h.left - m.left) + h.width / 2;
      geo.heroCY = (h.top - m.top) + h.height / 2;
      if (headline) {
        var hl = headline.getBoundingClientRect();
        var targetH = Math.max(96, Math.min(240, hl.height));
        var targetW = targetH * ASPECT;
        geo.smallScale = targetW / mw;
        geo.dockCX = (hl.left - m.left) - GAP - targetW / 2;
        geo.dockCY = (hl.top - m.top) + hl.height / 2;
      } else {
        geo.smallScale = 150 / mw;
        geo.dockCX = geo.heroCX;
        geo.dockCY = geo.heroCY + 900;
      }
      gsap.set(mark, { left: geo.heroCX, top: geo.heroCY });
    }

    gsap.set(mark, { xPercent: -50, yPercent: -50, opacity: 0, scale: 1, transformOrigin: '50% 50%' });
    layout();
    ScrollTrigger.addEventListener('refresh', layout);

    // Entrance: hand off from the loading screen — start compact, then (as the
    // subtext fades in) expand into the full-bleed, blurred aurora.
    gsap.set(mark, { scale: geo.smallScale, filter: 'blur(7px)' });
    var entrance = gsap.timeline();
    entrance.to(mark, { opacity: 1, duration: 0.45, ease: 'power1.out' }, START - 0.15);
    entrance.to(mark, { scale: 1, filter: 'blur(72px)', duration: 1.2, ease: 'power2.inOut' }, START + 0.1);
    entrance.to(mark, { opacity: 0.24, duration: 1.2, ease: 'power2.inOut' }, START + 0.1);

    // Travel: on scroll the aurora shrinks, sharpens and flies to dock just left
    // of the second section's headline. immediateRender:false so it doesn't fight
    // the entrance at rest; function values survive refresh/resize.
    var travel = gsap.timeline({
      scrollTrigger: {
        trigger: hero, start: 'top top',
        endTrigger: '#problem', end: 'top 45%',
        scrub: 1, invalidateOnRefresh: true,
        // In the hero the mark is the aurora (behind copy, under the opaque
        // section 2). Once it has set off it lifts above section 2 so it shows
        // when docked — but stays below the nav.
        onUpdate: function (self) { mark.style.zIndex = self.progress < 0.4 ? '1' : '30'; }
      }
    });
    travel.fromTo(mark,
      { x: 0, y: 0, scale: 1, opacity: 0.24, filter: 'blur(72px)' },
      {
        x: function () { return geo.dockCX - geo.heroCX; },
        y: function () { return geo.dockCY - geo.heroCY; },
        scale: function () { return geo.smallScale; },
        opacity: 0.96, filter: 'blur(2px)', ease: 'power1.inOut',
        immediateRender: false
      }, 0);

    // Constant fast rotation + cursor parallax in the hero, both easing to a stop
    // as the mark docks — so in section 2 it sits still and upright. Rotation +
    // parallax live on the IMG (screen-aligned translate), independent of the
    // wrapper's travel/scale transform.
    var DEG_PER_SEC = 60;            // ~6s per turn (much faster than before)
    var cur = { x: 0, y: 0 };         // cursor target offset
    var off = { x: 0, y: 0 };         // smoothed offset
    var rot = 0;
    var tick = null;
    if (!reduce) {
      tick = function (time, dt) {
        var p = (travel.scrollTrigger && travel.scrollTrigger.progress) || 0;
        if (p < 0.8) {
          rot += DEG_PER_SEC * (dt / 1000) * (1 - p / 0.8);   // spin, slowing
        } else {
          rot += (Math.round(rot / 360) * 360 - rot) * 0.12;  // settle upright, stop
        }
        var k = Math.max(0, 1 - p / 0.8);                     // parallax fades out by dock
        off.x += (cur.x * k - off.x) * 0.08;
        off.y += (cur.y * k - off.y) * 0.08;
        gsap.set(img, { rotation: rot, x: off.x, y: off.y });
      };
      gsap.ticker.add(tick);
    }

    var onMove = null;
    if (!reduce && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      onMove = function (e) {
        cur.x = ((e.clientX / window.innerWidth) - 0.5) * 80;
        cur.y = ((e.clientY / window.innerHeight) - 0.5) * 80;
      };
      window.addEventListener('pointermove', onMove);
    }

    var onResize = function () { layout(); };
    window.addEventListener('resize', onResize);

    return function () {
      if (tick) gsap.ticker.remove(tick);
      if (onMove) window.removeEventListener('pointermove', onMove);
      entrance.kill();
      if (travel.scrollTrigger) travel.scrollTrigger.kill();
      travel.kill();
      ScrollTrigger.removeEventListener('refresh', layout);
      window.removeEventListener('resize', onResize);
      gsap.set([mark, img], { clearProps: 'all' });
    };
  }

  /* ==========================================================================
   * FEATURE 5 — orchestration SVG behind "The Galent Difference" (decorative).
   * ======================================================================== */
  function setupSvgNetworkGrowth(gsap, ScrollTrigger) {
    var host = document.querySelector('#how .gd-bg');
    if (!host || host.querySelector('.gx-netlines')) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gx-netlines'); svg.setAttribute('viewBox', '0 0 1200 700');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); svg.setAttribute('aria-hidden', 'true');
    var nodes = [[600,350],[240,160],[980,150],[180,520],[1020,540],[430,110],[760,600],[120,330],[1080,330],[600,90],[600,620]];
    var links = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,8],[5,9],[6,10],[1,5],[2,9],[3,7],[4,8]];
    var paths = [];
    links.forEach(function (lk) {
      var a = nodes[lk[0]], b = nodes[lk[1]];
      var mx = (a[0]+b[0])/2, my = (a[1]+b[1])/2 - 40;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M'+a[0]+','+a[1]+' Q'+mx+','+my+' '+b[0]+','+b[1]);
      p.setAttribute('class', 'gx-netline'); svg.appendChild(p); paths.push(p);
    });
    nodes.forEach(function (n, i) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', n[0]); c.setAttribute('cy', n[1]); c.setAttribute('r', i === 0 ? 7 : 4);
      c.setAttribute('class', 'gx-netnode' + (i === 0 ? ' is-hub' : '')); svg.appendChild(c);
    });
    host.appendChild(svg);
    paths.forEach(function (p) { var len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
    gsap.to(paths, { strokeDashoffset: 0, ease: 'none', stagger: 0.04,
      scrollTrigger: { trigger: '#how', start: 'top 80%', end: 'center center', scrub: 1 } });
  }

  /* ==========================================================================
   * FEATURE 7 — pinned "Galent Difference". Content stays visible; the scrub
   * only assembles panes + dims the conventional column.
   * ======================================================================== */
  function setupPinnedComparison(gsap, ScrollTrigger) {
    var section = document.getElementById('how');
    if (!section) return;
    var left = section.querySelector('.pane.left');
    var right = section.querySelector('.pane.right');
    if (!left || !right) return;
    section.classList.add('cv-visible');
    var leftItems = left.querySelectorAll('li');
    // No pin / no scrub — a one-time, non-blocking entrance as the card comes
    // into view, so scrolling stays smooth. The conventional (left) column
    // settles dimmed to contrast with how Galent delivers.
    gsap.set([left, right], { xPercent: 0 });
    var trigger = section.querySelector('.compare-card') || section;
    gsap.timeline({ scrollTrigger: { trigger: trigger, start: 'top 82%', toggleActions: 'play none none none' } })
      .from(left,  { xPercent: -3, autoAlpha: 0.4, duration: 0.5, ease: 'power2.out' }, 0)
      .from(right, { xPercent: 3, autoAlpha: 0.4, duration: 0.5, ease: 'power2.out' }, 0.05)
      .to(leftItems, { opacity: 0.5, duration: 0.4, stagger: 0.05 }, 0.3);
  }

  /* ==========================================================================
   * FEATURE 3 — horizontal Industries deck (desktop). Cards are revealed by
   * the `.in` system (always visible); the pin + x-translate is presentation.
   * Falls back to the normal grid if there's nothing to scroll.
   * ======================================================================== */
  function setupHorizontalIndustries(gsap, ScrollTrigger) {
    var section = document.getElementById('industries');
    if (!section) return;
    var track = section.querySelector('.home-sector-grid');
    if (!track) return;
    var cards = Array.prototype.slice.call(track.children);
    if (cards.length < 4) return;
    track.classList.add('in'); // ensure cards visible regardless of pin
    section.classList.add('cv-visible', 'is-horizontal');

    var getShift = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 120); };
    if (getShift() <= 0) { section.classList.remove('is-horizontal'); return; }

    var scrollTween = gsap.to(track, {
      x: function () { return -getShift(); }, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: function () { return '+=' + getShift(); },
        pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true }
    });
    cards.forEach(function (cardEl) {
      gsap.fromTo(cardEl, { scale: 0.95 }, { scale: 1, ease: 'power2.out', duration: 0.4,
        scrollTrigger: { trigger: cardEl, containerAnimation: scrollTween, start: 'left 80%', end: 'right 55%', toggleActions: 'play none none reverse' } });
    });
  }

  /* ==========================================================================
   * FEATURE 8 — hover: magnetic lean + soft cursor lighting (desktop).
   * ======================================================================== */
  function setupHoverSystem(gsap) {
    var cardSel = '.svc, .home-sector-card, .proof-card, .fde-rich, .case-study, .engine-deep-card, .feature, .cta-card, .kh-tile, .leader-card, .bento-tile';
    var bound = [];
    var MAX_TILT = 5;   // deg — capped low; expensive/intentional, never a flip

    document.querySelectorAll(cardSel).forEach(function (el) {
      if (el.closest('.is-horizontal')) return;
      el.classList.add('gx-magnetic', 'gx-tilt');
      // Lazily initialised on first hover so the card's scroll-reveal entrance
      // (a CSS transform) isn't overwritten by an inline transform at boot.
      var rxTo, ryTo, zTo, inited = false;
      function init() {
        gsap.set(el, { transformPerspective: 1000, transformStyle: 'preserve-3d' });
        // Longer glide = weighty, expensive feel; a touch of back-ease gives a
        // spring-like settle without the jitter of easing a live pointer stream.
        rxTo = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power2.out' });
        ryTo = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power2.out' });
        zTo  = gsap.quickTo(el, 'z',         { duration: 0.7, ease: 'back.out(1.4)' });
        inited = true;
      }
      function enter() { if (!inited) init(); el.classList.add('gx-tilting'); }
      function move(e) {
        if (!inited) init();
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;   // 0..1
        var py = (e.clientY - r.top) / r.height;   // 0..1
        ryTo((px - 0.5) * 2 * MAX_TILT);           // left/right → rotateY
        rxTo((0.5 - py) * 2 * MAX_TILT);           // up/down    → rotateX
        zTo(18);                                   // lift toward viewer
        // Cursor light (::after) + soft shadow that drifts opposite the tilt.
        el.style.setProperty('--mx', (px * 100) + '%');
        el.style.setProperty('--my', (py * 100) + '%');
        el.style.setProperty('--sx', ((0.5 - px) * 22).toFixed(1) + 'px');
        el.style.setProperty('--sy', ((py - 0.5) * 22 + 16).toFixed(1) + 'px');
        // Subtle inner parallax — foreground elements drift with the cursor.
        el.style.setProperty('--gpx', ((px - 0.5) * 10).toFixed(1) + 'px');
        el.style.setProperty('--gpy', ((py - 0.5) * 8).toFixed(1) + 'px');
      }
      function leave() {
        if (inited) { rxTo(0); ryTo(0); zTo(0); }
        el.classList.remove('gx-tilting');
        el.style.setProperty('--sx', '0px');
        el.style.setProperty('--sy', '16px');
        el.style.setProperty('--gpx', '0px');
        el.style.setProperty('--gpy', '0px');
      }
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      bound.push(function () {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        el.classList.remove('gx-magnetic', 'gx-tilt', 'gx-tilting');
        if (inited) gsap.set(el, { clearProps: 'rotationX,rotationY,z,transformPerspective,transformStyle' });
      });
    });

    // Buttons — magnetic pull toward the cursor (transform-only, 60fps).
    document.querySelectorAll('.btn').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      function move(e) { var r = el.getBoundingClientRect(); xTo(((e.clientX-r.left)/r.width-0.5)*10); yTo(((e.clientY-r.top)/r.height-0.5)*8); }
      function leave() { xTo(0); yTo(0); }
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      bound.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    });
    return function () { bound.forEach(function (fn) { fn(); }); };
  }

  /* ==========================================================================
   * FEATURE 4 — Outcomes count-up on scroll into view. Numbers baseline at
   * their final value (so they're never blank), then count from 0 when seen.
   * ======================================================================== */
  function setupOutcomes(gsap, ScrollTrigger) {
    var section = document.getElementById('outcomes');
    if (!section) return;
    var counters = [];
    section.querySelectorAll('[data-countup]').forEach(function (b) {
      var target = parseFloat(b.getAttribute('data-countup'));
      if (isFinite(target)) { b.textContent = String(target); counters.push({ el: b, target: target }); }
    });
    if (!counters.length) return;
    ScrollTrigger.create({
      trigger: section, start: 'top 80%', once: true,
      onEnter: function () {
        counters.forEach(function (c) {
          var o = { v: 0 };
          gsap.to(o, { v: c.target, duration: 1.2, ease: 'power3.out',
            onUpdate: function () { c.el.textContent = Math.round(o.v).toString(); },
            onComplete: function () { c.el.textContent = String(c.target); } });
        });
      }
    });
  }

  /* =========================================================================
   * PLATFORM ARCHITECTURE STACK — GSAP ScrollTrigger PINNED PRESENTATION
   * -------------------------------------------------------------------------
   * Replaces the CSS position:sticky deck with a real pinned, scrubbed
   * timeline (ScrollSmoother-safe; ScrollTrigger drives the pin via transform).
   *
   * The five layers become an absolutely-stacked deck; scrubbing walks the
   * narrative order (Signals → Backbone → Engines → Workflows → Outcomes).
   * As each layer becomes active it scales up, brightens and comes to front,
   * while every prior layer compresses, dims and recedes — a clear hierarchy
   * that reads like an executive product presentation.
   *
   * Transform-only (scale / y / opacity / z-index). Runs on desktop AND mobile
   * (motion-on). Reduced-motion / no-GSAP: never called from the motion
   * matchMedia, so the layers stay in natural flow, fully visible.
   * ======================================================================== */
  function setupArchitectureDraw(gsap, ScrollTrigger) {
    var stack = document.querySelector('.arch-stack');
    if (!stack) return;
    // REVERTED — no pin, no scrub, no deck. The stack reveals through the
    // standard reliable `.in` system in natural document flow; layers stay
    // fully visible and the execution-path line is drawn complete. This keeps
    // scrolling perfectly smooth (a pinned/scrubbed section here was the main
    // source of the rough, "patchy" feel).
    stack.style.setProperty('--arch-progress', '1');
  }

  /* Generic stat strips — count up on enter (items visible by default). */
  function setupStatStrips(gsap, ScrollTrigger) {
    document.querySelectorAll('.stat-strip--animated').forEach(function (strip) {
      var cells = [];
      strip.querySelectorAll('.item [data-countup]').forEach(function (b) {
        var target = parseFloat(b.getAttribute('data-countup'));
        if (isFinite(target)) { b.textContent = String(target); cells.push({ el: b, target: target }); }
      });
      if (!cells.length) return;
      ScrollTrigger.create({ trigger: strip, start: 'top 82%', once: true, onEnter: function () {
        cells.forEach(function (c) {
          var o = { v: 0 };
          gsap.to(o, { v: c.target, duration: 1.1, ease: 'power3.out',
            onUpdate: function () { c.el.textContent = Math.round(o.v).toString(); },
            onComplete: function () { c.el.textContent = String(c.target); } });
        });
      } });
    });
  }

  /* CTA system — inject decorations + decorative scroll parallax. */
  function setupCtaSystem(gsap, ScrollTrigger) {
    document.querySelectorAll('.cta-card').forEach(function (card) {
      if (!card.querySelector('.cta-fx')) {
        var fx = document.createElement('div');
        fx.className = 'cta-fx'; fx.setAttribute('aria-hidden', 'true');
        fx.innerHTML = '<div class="cta-grid"></div>'
          + '<div class="cta-orb cta-orb--a"></div><div class="cta-orb cta-orb--b"></div><div class="cta-orb cta-orb--c"></div>'
          + '<div class="cta-rings"><span></span><span></span><span></span></div>'
          + '<div class="cta-spark cta-spark--1"></div><div class="cta-spark cta-spark--2"></div>'
          + '<div class="cta-spark cta-spark--3"></div><div class="cta-spark cta-spark--4"></div>';
        card.insertBefore(fx, card.firstChild);
      }
      card.setAttribute('data-cta-parallax', '');
      var o = { v: -1 };
      gsap.fromTo(o, { v: -1 }, { v: 1, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
        onUpdate: function () {
          card.style.setProperty('--cta-shift', (o.v * 60).toFixed(2) + 'px');
          card.style.setProperty('--cta-shift-x', (o.v * 18).toFixed(2) + 'px');
        } });
    });
  }

  function setupOffscreenPause(ScrollTrigger) {
    document.querySelectorAll('.cta-card').forEach(function (card) {
      ScrollTrigger.create({ trigger: card, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { card.classList.toggle('gx-active-fx', self.isActive); } });
    });
  }

  /* ==========================================================================
   * PLATFORM — GalentAI engine diagram pinned storytelling (executive).
   * Pins the radial diagram and walks focus through the engines in the order
   * Knowledge Graph -> Context Graph -> NeuroQL -> RCM, growing the hub->node
   * connectors as a network and dimming the rest. Content/markup untouched.
   *
   * SAFETY: nodes/hub are centered via `transform: translate(-50%,-50%)`, so we
   * animate ONLY opacity / filter / SVG attributes — never transform. The
   * connectors are re-applied every frame so the diagram's own ResizeObserver
   * repaint can't strand them. Desktop-only; reduced-motion/mobile keep the
   * native interactive diagram. Returns a cleanup fn.
   * ======================================================================== */
  function setupPlatformEngines(gsap, ScrollTrigger) {
    var diagram = document.querySelector('#engine-diagram-root .engine-diagram');
    if (!diagram) return function () {};
    var svg = diagram.querySelector('.engine-diagram-svg');
    var hub = diagram.querySelector('.engine-hub');
    var n = {
      neuroql: diagram.querySelector('.engine-node[data-engine="neuroql"]'),
      rcm:     diagram.querySelector('.engine-node[data-engine="rcm"]'),
      kg:      diagram.querySelector('.engine-node[data-engine="kg"]'),
      context: diagram.querySelector('.engine-node[data-engine="context"]')
    };
    if (!n.neuroql || !n.rcm || !n.kg || !n.context) return function () {};
    var all = [n.neuroql, n.rcm, n.kg, n.context];
    var section = diagram.closest('section');
    if (section) section.classList.add('cv-visible');

    // Don't let the default-active node fight our static state.
    all.forEach(function (node) { node.classList.remove('active'); });

    // Static, fully-visible diagram — no pin, no scrub, no one-by-one node
    // lighting. The page scrolls through normally; the hub, nodes and the
    // connector lines (drawn by enginesDiagram in animations.js) all render
    // at full strength from the start.
    gsap.set(all, { opacity: 1, filter: 'none' });

    return function () {
      gsap.set(all, { clearProps: 'opacity,filter' });
    };
  }

  /* Hero entrance (home) — headline first, then the subtext + CTAs come in with
     a delay (synced to the loading-screen fade), per the reference frames. */
  function setupHeroEntrance(gsap) {
    var hero = document.getElementById('hero');
    if (!hero) { root.classList.remove('hero-entering'); return; }
    var headline = hero.querySelector('.t-hero');
    var rest = [hero.querySelector('.hero-lede'), hero.querySelector('.cta-row'),
      hero.querySelector('.scroll-chevron')].filter(Boolean);
    gsap.set([headline].filter(Boolean).concat(rest), { autoAlpha: 0, y: 20 });
    root.classList.remove('hero-entering');
    var START = 1.15;   // matches the mark entrance / loading-screen fade
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (headline) tl.to(headline, { autoAlpha: 1, y: 0, duration: 0.8 }, START);
    if (rest.length) tl.to(rest, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.14 }, START + 0.7);
  }

  /* ==========================================================================
   * PRIORITY 4 — SECTION CONTINUITY. Injects a decorative divider between
   * consecutive major sections (like setupCtaSystem injects .cta-fx — no
   * content/structure change) and animates a thin gradient line drawing across
   * as the next section enters. Transform-only (scaleX); the divider defaults
   * invisible, so a miss can never hide content. Desktop + mobile.
   * ======================================================================== */
  function setupSectionContinuity(gsap, ScrollTrigger) {
    var main = document.querySelector('main');
    if (!main) return;
    var sections = Array.prototype.slice.call(main.children).filter(function (el) {
      return el.tagName === 'SECTION';
    });
    if (sections.length < 2) return;

    sections.forEach(function (sec, i) {
      if (i === 0) return;                       // no divider above the first
      if (sec.previousElementSibling && sec.previousElementSibling.classList.contains('gx-divider')) return;
      var d = document.createElement('div');
      d.className = 'gx-divider';
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<span class="gx-divider__line"></span>';
      sec.parentNode.insertBefore(d, sec);
      var line = d.firstChild;
      gsap.set(line, { scaleX: 0, transformOrigin: '50% 50%' });
      gsap.to(line, {
        scaleX: 1, ease: 'power2.out', duration: 1.1,
        scrollTrigger: { trigger: d, start: 'top 92%', toggleActions: 'play none none reverse' }
      });
    });
  }

  /* ==========================================================================
   * PRIORITY 5 — HERO INTRO (home). A lightweight ≤2.5s sequence played over
   * the existing preloader so it can never delay or obscure the real hero:
   *   1) the Galent mark is already showing (preloader);
   *   2) fine contour lines briefly draw *inside* the mark;
   *   3) the motion eases to a stop;
   *   4) the preloader fades and the hero content becomes primary
   *      (handled by setupHeroEntrance / setupHeroLogo).
   * Transform/opacity + SVG stroke only. Skipped under reduced motion.
   * ======================================================================== */
  function setupHeroIntro(gsap) {
    if (REDUCED) return;
    var mark = document.querySelector('#preloader .preloader-mark');
    if (!mark || mark.querySelector('.gx-contour')) return;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gx-contour');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    // Concentric rounded contours that read as "inside" the mark.
    var rings = [
      { r: 12, o: 0.9 }, { r: 22, o: 0.7 }, { r: 32, o: 0.5 }, { r: 42, o: 0.32 }
    ];
    var paths = [];
    rings.forEach(function (ring) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '50'); c.setAttribute('cy', '50');
      c.setAttribute('r', String(ring.r));
      c.setAttribute('class', 'gx-contour__ring');
      c.style.opacity = String(ring.o);
      svg.appendChild(c);
      paths.push(c);
    });
    mark.appendChild(svg);

    // Draw the rings, then let them fade — all wrapped up well under 2.5s.
    paths.forEach(function (p) {
      var len = 2 * Math.PI * parseFloat(p.getAttribute('r'));
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    var tl = gsap.timeline();
    tl.to(paths, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.08 }, 0.15)
      .to(svg, { opacity: 0, duration: 0.45, ease: 'power1.out' }, 1.15);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
