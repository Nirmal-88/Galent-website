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

    if (REDUCED) { revealAll(); markBooted(); return; }

    var isHome = document.body && document.body.dataset && document.body.dataset.page === 'home';

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
          smooth: 1.15, effects: true, normalizeScroll: true, ignoreMobileResize: true
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
          new window.SplitText(h, { type: 'lines', mask: 'lines', linesClass: 'gx-line', propIndex: true, aria: 'auto' });
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
    var hero = document.getElementById('hero');
    var mark = document.querySelector('.travel-mark');   // the dim ambient aurora
    var img = mark && mark.querySelector('img');
    var orbit = document.querySelector('.hero-orbit');
    var stage = orbit && orbit.querySelector('.hero-orbit__stage');
    if (!hero || !mark || !img || !orbit || !stage) return function () {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var START = 1.05;         // entrance begins as the loading screen fades

    // The aurora sits centred behind the copy as ambient glow — no travel/dock.
    gsap.set(mark, { left: '50%', top: '50%', xPercent: -50, yPercent: -50, opacity: 0, scale: 1, transformOrigin: '50% 50%' });

    // Entrance: hand off from the loading screen — bloom the aurora to a dim
    // full-bleed glow, and ease the orbital compass in over it.
    gsap.set(mark, { filter: 'blur(72px)' });
    var entrance = gsap.timeline();
    entrance.to(mark, { opacity: 0.24, duration: 1.3, ease: 'power2.out' }, START - 0.1);
    if (!reduce) {
      entrance.fromTo(orbit, { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.4, ease: 'power3.out' }, START + 0.05);
    } else {
      gsap.set(orbit, { opacity: 1 });
    }

    // --- Orbital compass ---------------------------------------------------
    // Continuous revolution of rings + brand tokens around the copy, with the
    // Galent mark leading the outer orbit. Driven from a single ticker so the
    // cursor can speed it up and tilt the whole assembly in 3D (premium feel).
    var rings = {
      outer: orbit.querySelector('.orbit-ring--outer'),
      mid:   orbit.querySelector('.orbit-ring--mid'),
      inner: orbit.querySelector('.orbit-ring--inner')
    };
    var arms = {
      green:  orbit.querySelector('.orbit-arm--green'),
      violet: orbit.querySelector('.orbit-arm--violet'),
      orange: orbit.querySelector('.orbit-arm--orange'),
      mk:     orbit.querySelector('.orbit-arm--mark')
    };
    var markSat = orbit.querySelector('.orbit-mark');

    // Centre every rotating element and let GSAP own its transform.
    var centred = [rings.outer, rings.mid, rings.inner, arms.green, arms.violet, arms.orange, arms.mk];
    centred.forEach(function (el) { if (el) gsap.set(el, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%' }); });
    if (markSat) gsap.set(markSat, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%' });

    // Per-element angular speed (deg/sec) + starting offset (deg).
    var A = {
      ringO: { v: 5,   a: 0   }, ringM: { v: -7, a: 0   }, ringI: { v: 9,  a: 0   },
      green: { v: 16,  a: 140 }, violet:{ v: 22, a: 60  }, orange:{ v: 28, a: 220 },
      mk:    { v: 12,  a: 0   }
    };
    // Cursor engagement (speed) + smoothed tilt of the whole stage.
    var engage = 0, engageTarget = 0;
    var tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
    var auroraRot = 0, auroraOff = { x: 0, y: 0 }, auroraCur = { x: 0, y: 0 };

    var tick = null;
    if (!reduce) {
      tick = function (time, dtMs) {
        var dt = Math.min(dtMs, 50) / 1000;   // clamp big frame gaps
        engage += (engageTarget - engage) * 0.05;
        var spd = 1 + engage * 0.9;           // cursor near → orbit speeds up

        A.ringO.a += A.ringO.v * dt * spd; A.ringM.a += A.ringM.v * dt * spd; A.ringI.a += A.ringI.v * dt * spd;
        A.green.a += A.green.v * dt * spd; A.violet.a += A.violet.v * dt * spd; A.orange.a += A.orange.v * dt * spd;
        A.mk.a    += A.mk.v    * dt * spd;

        if (rings.outer) gsap.set(rings.outer, { rotation: A.ringO.a });
        if (rings.mid)   gsap.set(rings.mid,   { rotation: A.ringM.a });
        if (rings.inner) gsap.set(rings.inner, { rotation: A.ringI.a });
        gsap.set(arms.green,  { rotation: A.green.a });
        gsap.set(arms.violet, { rotation: A.violet.a });
        gsap.set(arms.orange, { rotation: A.orange.a });
        gsap.set(arms.mk,     { rotation: A.mk.a });
        if (markSat) gsap.set(markSat, { rotation: -A.mk.a });   // keep the mark upright as it revolves

        // 3D tilt of the whole assembly toward the cursor.
        tiltX += (tiltTX - tiltX) * 0.06;
        tiltY += (tiltTY - tiltY) * 0.06;
        gsap.set(stage, { rotationX: tiltX, rotationY: tiltY });

        // Ambient aurora: gentle spin + faint parallax drift.
        auroraRot += 6 * dt;
        auroraOff.x += (auroraCur.x - auroraOff.x) * 0.05;
        auroraOff.y += (auroraCur.y - auroraOff.y) * 0.05;
        gsap.set(img, { rotation: auroraRot, x: auroraOff.x, y: auroraOff.y });

        engageTarget *= 0.96;   // engagement decays unless the cursor keeps moving
      };
      gsap.ticker.add(tick);
    } else {
      // Static premium poster — rings + tokens at rest, mark upright.
      gsap.set(arms.green,  { rotation: A.green.a });
      gsap.set(arms.violet, { rotation: A.violet.a });
      gsap.set(arms.orange, { rotation: A.orange.a });
    }

    var onMove = null;
    if (!reduce && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      onMove = function (e) {
        var nx = (e.clientX / window.innerWidth) - 0.5;   // -0.5..0.5
        var ny = (e.clientY / window.innerHeight) - 0.5;
        tiltTY = nx * 18;          // rotateY follows horizontal cursor
        tiltTX = -ny * 12;         // rotateX follows vertical cursor
        auroraCur.x = nx * 60; auroraCur.y = ny * 60;
        engageTarget = 1;
      };
      window.addEventListener('pointermove', onMove);
    }

    // Scroll: the orbit gracefully scales down + fades, and the aurora dims,
    // so section two arrives clean — no docking mark.
    var scrollST = ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: function (self) {
        var p = self.progress;
        gsap.set(stage, { scale: 1 - p * 0.16, y: -p * 50 });
        if (p > 0.001) {   // at the very top, leave the entrance fade in control
          gsap.set(orbit, { opacity: Math.max(0, 1 - p / 0.55) });
          gsap.set(mark, { opacity: 0.24 * Math.max(0, 1 - p / 0.7) });
        }
      }
    });

    return function () {
      if (tick) gsap.ticker.remove(tick);
      if (onMove) window.removeEventListener('pointermove', onMove);
      entrance.kill();
      if (scrollST) scrollST.kill();
      gsap.set([mark, img, orbit, stage], { clearProps: 'all' });
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
    var cardSel = '.svc, .home-sector-card, .proof-card, .fde-rich, .case-study, .engine-deep-card, .feature, .cta-card';
    var bound = [];
    document.querySelectorAll(cardSel).forEach(function (el) {
      if (el.closest('.is-horizontal')) return;
      el.classList.add('gx-magnetic');
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      function move(e) {
        var r = el.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 14);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 12);
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      }
      function leave() { xTo(0); yTo(0); }
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      bound.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.classList.remove('gx-magnetic'); });
    });
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
   * PLATFORM FIVE LAYERS ARCHITECTURE STACK — Premium ScrollTrigger Storytelling
   * 
   * Enterprise narrative experience: progressive activation of architecture
   * layers (Signals → Backbone → Engines → Workflows → Outcomes) with
   * scrubbed timeline, pinned section, and smooth 60fps animation.
   * 
   * Phases:
   *   1. Section enters — pin, all layers neutral
   *   2. Enterprise Signals activates (emphasis, others dim)
   *   3. Intelligence Backbone activates + connection animates
   *   4. AI Engines activate (progressive)
   *   5. Workflows activates
   *   6. Outcomes activates
   *   7. Full architecture connected + execution path drawn
   *   8. Unpin, resume normal scroll
   * 
   * Mobile: Reduced pinning, normal scroll flow.
   * Reduced motion: All layers visible, minimal animations.
   * No GSAP: All content visible by default (CSS --arch-progress: 1).
   * ======================================================================== */
  function setupArchitectureDraw(gsap, ScrollTrigger) {
    var stack = document.querySelector('.arch-stack');
    if (!stack) return;
    var layers = Array.prototype.slice.call(stack.querySelectorAll('.arch-layer'));
    if (!layers.length) return;

    var isDesktop = window.innerWidth >= 1025;
    var isReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Map layers by order (top to bottom): 5 → 1
    var layerMap = {
      5: layers.find(function (l) { return l.getAttribute('data-layer') === '5'; }),
      4: layers.find(function (l) { return l.getAttribute('data-layer') === '4'; }),
      3: layers.find(function (l) { return l.getAttribute('data-layer') === '3'; }),
      2: layers.find(function (l) { return l.getAttribute('data-layer') === '2'; }),
      1: layers.find(function (l) { return l.getAttribute('data-layer') === '1'; })
    };

    // Fallback: all layers visible if GSAP disabled or reduced motion
    if (!gsap || isReduced) {
      stack.style.setProperty('--arch-progress', '1');
      layers.forEach(function (l) { gsap.set(l, { autoAlpha: 1, y: 0 }); });
      return;
    }

    // Desktop — premium pinned storytelling experience
    if (isDesktop) {
      // Initial state: all layers muted (reduced opacity)
      gsap.set(layers, { autoAlpha: 0.3, y: 8 });
      stack.style.setProperty('--arch-progress', '0');

      // No pin / no scrub — the section scrolls naturally like every other
      // one; the layers simply colour in (top→bottom) once, on enter. This
      // removes the scroll-jacking "wait" while keeping the staged reveal.
      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: stack,
          start: 'top 72%',
          toggleActions: 'play none none none'
        }
      });

      // PHASE 1 — Section pinned, everything neutral (hold 0-8%)
      tl.to({}, { duration: 0.1 });
      
      // PHASE 2 — Outcomes (Layer 5) activates (8-22%)
      // Top layer highlighted, others dim
      if (layerMap[5]) {
        tl.to(layerMap[5], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.08);
        tl.to([layerMap[4], layerMap[3], layerMap[2], layerMap[1]], 
          { autoAlpha: 0.2, duration: 0.3 }, 0.08);
      }

      // PHASE 3 — Workflows (Layer 4) activates, connection (22-36%)
      // Workflows becomes prominent, Outcomes visible but reduced focus
      if (layerMap[4]) {
        tl.to(layerMap[4], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.22);
        tl.to(layerMap[5], { autoAlpha: 0.55, duration: 0.3 }, 0.22);
        tl.to([layerMap[3], layerMap[2], layerMap[1]], 
          { autoAlpha: 0.2, duration: 0.3 }, 0.22);
        // Animate execution path 0→40%
        tl.to(stack, { '--arch-progress': 0.4, duration: 0.4 }, 0.22);
      }

      // PHASE 4 — AI Engines (Layer 3) activate (36-52%)
      // Engines highlighted, Outcomes+Workflows visible, Backbone+Signals dim
      if (layerMap[3]) {
        tl.to(layerMap[3], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.36);
        tl.to([layerMap[5], layerMap[4]], { autoAlpha: 0.55, duration: 0.3 }, 0.36);
        tl.to([layerMap[2], layerMap[1]], { autoAlpha: 0.2, duration: 0.3 }, 0.36);
        // Execution path 40→60%
        tl.to(stack, { '--arch-progress': 0.6, duration: 0.4 }, 0.36);
      }

      // PHASE 5 — Intelligence Backbone (Layer 2) activates (52-66%)
      // Backbone highlighted, Outcomes+Workflows+Engines visible, Signals dim
      if (layerMap[2]) {
        tl.to(layerMap[2], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.52);
        tl.to([layerMap[5], layerMap[4], layerMap[3]], { autoAlpha: 0.55, duration: 0.3 }, 0.52);
        tl.to(layerMap[1], { autoAlpha: 0.2, duration: 0.3 }, 0.52);
        // Execution path 60→76%
        tl.to(stack, { '--arch-progress': 0.76, duration: 0.4 }, 0.52);
      }

      // PHASE 6 — Enterprise Signals (Layer 1) activates (66-80%)
      // Bottom layer highlighted, all other layers visible
      if (layerMap[1]) {
        tl.to(layerMap[1], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.66);
        tl.to([layerMap[5], layerMap[4], layerMap[3], layerMap[2]], 
          { autoAlpha: 0.55, duration: 0.3 }, 0.66);
        // Execution path 76→88%
        tl.to(stack, { '--arch-progress': 0.88, duration: 0.4 }, 0.66);
      }

      // PHASE 7 — Full architecture connected + execution path complete (80-92%)
      // All layers visible, full connection
      tl.to(layers, { autoAlpha: 1, duration: 0.3 }, 0.80);
      tl.to(stack, { '--arch-progress': 1, duration: 0.3 }, 0.80);

      // PHASE 8 — Hold finale, then release pin (92-100%)
      tl.to({}, { duration: 0.08 });

      return;
    }

    // Mobile fallback — reduced animation, normal scroll behavior
    if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
      stack.style.setProperty('--arch-progress', '1');
      ScrollTrigger.create({
        trigger: stack,
        start: 'top 75%',
        once: true,
        onEnter: function () {
          gsap.set(layers, { autoAlpha: 0 });
          gsap.to(layers, {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
            stagger: 0.08
          });
        }
      });
      return;
    }

    // Fallback — content visible by default
    stack.style.setProperty('--arch-progress', '1');
    layers.forEach(function (l) { gsap.set(l, { autoAlpha: 1, y: 0 }); });
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
