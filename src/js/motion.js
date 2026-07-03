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
      setupArchitectureDeck(gsap, ScrollTrigger, !!c.isDesktop);
      setupSectionContinuity(gsap, ScrollTrigger);
      setupCtaSystem(gsap, ScrollTrigger);
      setupOffscreenPause(ScrollTrigger);
      var mediaCleanup = setupMediaRolling(gsap, ScrollTrigger, !!c.isDesktop, smoother);

      var heroCleanup = function () {};
      if (isHome) {
        setupHeroEntrance(gsap);
        heroCleanup = setupHeroMark3D(gsap, ScrollTrigger, !!c.isDesktop);
        setupHeroCopyParallax(gsap, ScrollTrigger);
        if (c.isDesktop) {
          setupPinnedComparison(gsap, ScrollTrigger);
          setupIndustriesRing(gsap, ScrollTrigger);
        }
      }

      // Platform GalentAI engine diagram — pinned executive storytelling.
      var engineCleanup = c.isDesktop ? setupPlatformEngines(gsap, ScrollTrigger) : function () {};

      var hoverCleanup = c.isDesktop ? setupHoverSystem(gsap) : function () {};
      ScrollTrigger.refresh();
      return function () { root.classList.remove('gsap-smooth'); if (smoother) smoother.kill(); engineCleanup(); heroCleanup(); hoverCleanup(); mediaCleanup(); };
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
   * HERO LIVING MARK — true-3D logo assembly (home). The Galent mark's three
   * shapes (per the brand SVG: green rounded shape, larger purple rounded
   * shape behind, small orange accent upper-right) are rebuilt as layered
   * 3D orbs at DIFFERENT Z-DEPTHS inside a perspective stage:
   *   * entrance: the shapes fly in from scattered depth and assemble into
   *     the exact mark formation (orange pops last with a spring) — ≤2.5s,
   *     riding the preloader handoff;
   *   * idle: the whole formation slowly turns in 3D while each shape
   *     breathes on its own period — alive, never repeating visibly;
   *   * two tilted orbital rings (with travelling light dots) circle the
   *     formation — the mark reads as a system, not a sticker;
   *   * cursor: the stage tilts with heavy lerp; because each shape sits at
   *     a different translateZ, perspective creates REAL depth parallax;
   *   * scroll: the formation rotates away, lifts and dissolves as the
   *     hero exits (numeric scrub).
   * It sits BEHIND the hero copy (z-index 1 vs copy's 2) so readability is
   * never touched. All transform/opacity; blurs are static (rendered once).
   * Reduced-motion / no-GSAP: never called — .travel-mark keeps its CSS
   * default opacity:0, page looks identical. Returns a cleanup fn.
   * ======================================================================== */
  function setupHeroMark3D(gsap, ScrollTrigger, isDesktop) {
    var hero = document.getElementById('hero');
    if (!hero) return function () {};
    var copy = hero.querySelector('.hero-content');

    var START = 1.05;   // entrance begins as the loading screen fades

    // Build the 3D stage INSIDE the hero section (z-index 1) so the copy
    // (z-index 2, same stacking context) always paints on top — the old
    // .travel-mark lives outside the section and would cover the headline.
    var mark = hero.querySelector('.gx-mark3d-host');
    if (!mark) {
      mark = document.createElement('div');
      mark.className = 'gx-mark3d-host';
      mark.setAttribute('aria-hidden', 'true');
      hero.insertBefore(mark, copy || hero.firstChild);
    }
    var stage = mark.querySelector('.gx-mark3d');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'gx-mark3d';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML =
        '<div class="gx-halo"></div>' +
        '<div class="gx-orbit gx-orbit--a"><span></span></div>' +
        '<div class="gx-orbit gx-orbit--b"><span></span></div>' +
        '<div class="gx-orb gx-orb--p"></div>' +
        '<div class="gx-orb gx-orb--g"></div>' +
        '<div class="gx-orb gx-orb--o"></div>';
      mark.appendChild(stage);
    }
    var halo   = stage.querySelector('.gx-halo');
    var orbitA = stage.querySelector('.gx-orbit--a');
    var orbitB = stage.querySelector('.gx-orbit--b');
    var orbP   = stage.querySelector('.gx-orb--p');
    var orbG   = stage.querySelector('.gx-orb--g');
    var orbO   = stage.querySelector('.gx-orb--o');

    var PERSP = 1100;
    gsap.set(mark,  { xPercent: -50, yPercent: -50, opacity: 0, transformPerspective: PERSP, transformStyle: 'preserve-3d', transformOrigin: '50% 50%' });
    gsap.set(stage, { transformPerspective: PERSP, transformStyle: 'preserve-3d', transformOrigin: '50% 50%' });

    // Formation depths — purple deepest, green mid, orange in front.
    var FORM = { p: -70, g: 0, o: 55 };

    // Scattered pre-assembly poses.
    gsap.set(orbP, { z: -360, x: -140, y: 110, opacity: 0, force3D: true });
    gsap.set(orbG, { z: -280, x: 120, y: -100, opacity: 0, force3D: true });
    gsap.set(orbO, { z: 260, x: 180, y: -60, opacity: 0, scale: 0.4, force3D: true });
    gsap.set(halo, { scale: 0.55, opacity: 0 });
    // Tilt the ring planes via GSAP (not CSS) so the infinite rotationZ spin
    // composes with the tilt instead of overwriting it.
    gsap.set(orbitA, { opacity: 0, rotationX: 72, rotationZ: 0, transformOrigin: '50% 50%' });
    gsap.set(orbitB, { opacity: 0, rotationX: 64, rotationY: 24, rotationZ: 0, transformOrigin: '50% 50%' });

    // ENTRANCE — assemble the mark out of deep space (≤2.5s total).
    var entrance = gsap.timeline();
    entrance.to(mark, { opacity: 1, duration: 0.4, ease: 'power1.out' }, START);
    entrance.to(orbP, { z: FORM.p, x: 0, y: 0, opacity: 1, duration: 1.15, ease: 'power3.out' }, START + 0.05);
    entrance.to(orbG, { z: FORM.g, x: 0, y: 0, opacity: 1, duration: 1.15, ease: 'power3.out' }, START + 0.2);
    entrance.to(orbO, { z: FORM.o, x: 0, y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(2.2)' }, START + 0.65);
    entrance.to(halo, { scale: 1, opacity: 0.55, duration: 1.3, ease: 'power2.out' }, START + 0.35);
    entrance.to([orbitA, orbitB], { opacity: 1, duration: 1.0, ease: 'power1.inOut' }, START + 0.9);

    // IDLE — the formation lives. Offset periods so it never visibly loops.
    var idleDelay = START + 1.5;
    var idle = [
      gsap.to(stage, { rotationY: 13, duration: 9.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      gsap.to(stage, { rotationX: -7, duration: 7.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      gsap.to(orbP, { y: '+=12', z: FORM.p - 18, duration: 6.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      gsap.to(orbG, { y: '-=10', z: FORM.g + 14, duration: 4.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      gsap.to(orbO, { y: '-=8', x: '+=6', duration: 3.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      gsap.to(halo, { scale: 1.07, duration: 5.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: idleDelay }),
      // Orbital rings spin forever — the travelling dots ride the rotation.
      gsap.to(orbitA, { rotationZ: 360, duration: 26, repeat: -1, ease: 'none', delay: idleDelay - 1 }),
      gsap.to(orbitB, { rotationZ: -360, duration: 38, repeat: -1, ease: 'none', delay: idleDelay - 1 })
    ];

    // CURSOR — heavy-lerp tilt on the host; per-shape parallax comes free
    // from perspective, because each orb sits at a different Z.
    var cur = { rx: 0, ry: 0 };
    var off = { rx: 0, ry: 0 };
    var tick = null, onMove = null, onLeave = null;
    if (isDesktop && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      onMove = function (e) {
        cur.ry = ((e.clientX / window.innerWidth) - 0.5) * 22;
        cur.rx = (0.5 - (e.clientY / window.innerHeight)) * 14;
      };
      onLeave = function () { cur.rx = 0; cur.ry = 0; };
      tick = function () {
        off.rx += (cur.rx - off.rx) * 0.05;
        off.ry += (cur.ry - off.ry) * 0.05;
        gsap.set(mark, { rotationX: off.rx, rotationY: off.ry });
      };
      gsap.ticker.add(tick);
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    // SCROLL EXIT — the system rotates away and dissolves as the hero
    // leaves. yPercent/opacity on the host (never the cursor's rotations);
    // extra spin on the inner stage so the two never fight.
    var exit = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: 0.8, invalidateOnRefresh: true }
    });
    exit.fromTo(mark, { yPercent: -50, opacity: 1 },
      { yPercent: -78, opacity: 0, ease: 'power1.in', immediateRender: false }, 0);
    exit.fromTo(stage, { scale: 1 }, { scale: 1.18, rotationY: '+=38', ease: 'power1.in', immediateRender: false }, 0);

    return function () {
      if (tick) gsap.ticker.remove(tick);
      if (onMove) window.removeEventListener('pointermove', onMove);
      if (onLeave) document.documentElement.removeEventListener('pointerleave', onLeave);
      entrance.kill();
      idle.forEach(function (t) { t.kill(); });
      if (exit.scrollTrigger) exit.scrollTrigger.kill();
      exit.kill();
      gsap.set([mark, stage, halo, orbitA, orbitB, orbP, orbG, orbO], { clearProps: 'all' });
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
   * FEATURE 3 — INDUSTRIES 3D RING (desktop, home). The TRIONN signature:
   * the existing sector cards arrange on a full 3D cylinder — real
   * perspective, heavy curvature — and scrolling rotates the ring so every
   * card sweeps through the front. An oversized, aria-hidden echo of the
   * section's own heading drifts behind the ring (decorative duplicate of
   * EXISTING text — no content change). Rules that keep it smooth + safe:
   *   * cards stay visible (opacity floor 0.35, links stay clickable);
   *   * `.is-ring` kills the data-stagger transform transition on the cards
   *     — per-frame transform writes must never be CSS-transitioned;
   *   * one proxy tween + a manual render of 7 transform strings per frame
   *     (compositor-only after recalc); preserve-3d does the depth sorting —
   *     no z-index writes, no filters, no layout;
   *   * mobile / reduced-motion / no-GSAP: the approved grid, untouched.
   * ======================================================================== */
  function setupIndustriesRing(gsap, ScrollTrigger) {
    var section = document.getElementById('industries');
    if (!section) return;
    var track = section.querySelector('.home-sector-grid');
    if (!track) return;
    var cards = Array.prototype.slice.call(track.children);
    var n = cards.length;
    if (n < 5) return;   // a ring needs enough panels to read as a ring

    track.classList.add('in');   // cards visible no matter what
    section.classList.add('cv-visible', 'is-ring');

    // Giant echo type behind the ring — duplicates the existing heading.
    var head = section.querySelector('.section-head h2');
    var echo = section.querySelector('.gx-ring-echo');
    if (!echo && head && track.parentNode) {
      echo = document.createElement('div');
      echo.className = 'gx-ring-echo';
      echo.setAttribute('aria-hidden', 'true');
      echo.textContent = head.textContent.replace(/\s+/g, ' ').trim();
      track.parentNode.insertBefore(echo, track);
    }

    var STEP = 360 / n;
    var state = { rot: 0 };
    var radius = 480;
    function measure() {
      var w = cards[0].offsetWidth || 340;
      // Chord-fit the cards around the cylinder, plus breathing room.
      radius = Math.round((w / 2) / Math.tan(Math.PI / n)) + 40;
    }

    function render() {
      for (var i = 0; i < n; i++) {
        var a = STEP * i + state.rot;
        var depth = Math.cos(a * Math.PI / 180);   // 1 = front, -1 = back
        cards[i].style.transform =
          'translate(-50%, -50%) rotateY(' + a.toFixed(2) + 'deg) translateZ(' + radius + 'px)';
        cards[i].style.opacity = (0.35 + 0.65 * (depth + 1) / 2).toFixed(3);
      }
      if (echo) {
        echo.style.transform =
          'translate(-50%, -50%) translateX(' + (state.rot * 0.6).toFixed(1) + 'px)';
      }
    }
    measure();
    render();

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * 0.5 * n); },
        pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: function () { measure(); render(); }
      }
    });
    // One proxy tween; scrub smooths the playhead, render paints the ring.
    tl.to(state, {
      rot: -STEP * (n - 1), ease: 'none', duration: 1, onUpdate: render
    });
  }

  /* SECTION SETTLE — REMOVED. Scrubbing scale/opacity on entire sections
     rasterises multi-thousand-pixel GPU layers every frame; it was a main
     source of the rough, patchy scroll. Sections flow naturally again. */

  /* Hero copy back-plane parallax (home) — the copy drifts slower than the
     scroll, so leaving the hero has depth. Numeric scrub so wheel ticks
     glide instead of stepping. */
  function setupHeroCopyParallax(gsap, ScrollTrigger) {
    var copy = document.querySelector('#hero .hero-content');
    if (!copy) return;
    gsap.to(copy, { yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
  }

  /* ==========================================================================
   * FEATURE 8 — hover: magnetic lean + soft cursor lighting (desktop).
   * ======================================================================== */
  function setupHoverSystem(gsap) {
    var cardSel = '.svc, .home-sector-card, .proof-card, .fde-rich, .case-study, .engine-deep-card, .feature, .cta-card, .kh-tile, .leader-card, .bento-tile';
    var bound = [];
    var MAX_TILT = 5;   // deg — capped low; expensive/intentional, never a flip

    document.querySelectorAll(cardSel).forEach(function (el) {
      // Ring cards get per-frame transform strings from the ring renderer —
      // the tilt system must never write transforms on the same elements.
      if (el.closest('.is-horizontal') || el.closest('.is-ring')) return;
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
   * PLATFORM ARCHITECTURE STACK — NATURAL FLOW (no effects).
   * -------------------------------------------------------------------------
   * Reverted per request: the pinned/scrubbed 3D deck is gone. The five
   * layers scroll normally (05 → 01, top to bottom) and reveal through the
   * standard reliable `.in` system; the execution-path line is drawn
   * complete. No pin, no scrub, no scale/opacity/rotation choreography —
   * exactly the plain section the rest of the page uses.
   * ======================================================================== */
  function setupArchitectureDeck(gsap, ScrollTrigger, isDesktop) {
    var stack = document.querySelector('.arch-stack');
    if (!stack) return;
    stack.style.setProperty('--arch-progress', '1');
  }

  /* ==========================================================================
   * TRIONN "PICTURE ROLLING" — velocity-reactive media (site-wide).
   * Two parts, both decorative:
   *   1) Reveal: media un-clips + settles from a slight zoom as it enters
   *      (fromTo + immediateRender:false + once — if the trigger never fires
   *      the image simply stays in its natural, fully-visible state).
   *   2) Velocity skew: while scrolling, media WRAPPERS shear slightly with
   *      scroll velocity and ease back to rest — driven by ONE root CSS var
   *      per frame (consumed by a transform), so it never touches the inline
   *      transforms GSAP owns on the images themselves.
   * Desktop-only for the skew (touch velocity is spiky); reveal runs on all.
   * Returns a cleanup fn.
   * ======================================================================== */
  function setupMediaRolling(gsap, ScrollTrigger, isDesktop, smoother) {
    var mediaSel = '.sector-media img, .service-hero-banner img, .kh-tile img, ' +
                   '.proof-card img, .fde-rich img, .post-hero img, .case-study img';

    // 1) Clip reveal — never gates content (partial clip, once, natural state
    //    if the trigger never activates).
    document.querySelectorAll(mediaSel).forEach(function (img) {
      if (img.closest('.travel-mark') || img.closest('.nav')) return;
      gsap.fromTo(img,
        { clipPath: 'inset(12% 5% 12% 5%)', scale: 1.1 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.1, ease: 'power3.out',
          immediateRender: false, overwrite: 'auto',
          scrollTrigger: { trigger: img, start: 'top 90%', once: true } });
    });

    // 2) Velocity skew (desktop) — small card-media wrappers ONLY (never
    //    full-width banners: huge skewed layers cost real GPU time). Writes
    //    go straight through GSAP's transform cache per element — a root
    //    CSS var was invalidating style for the WHOLE document every frame,
    //    a main source of the rough, patchy scroll.
    if (!isDesktop) return function () {};
    var wraps = Array.prototype.slice.call(
      document.querySelectorAll('.sector-media, .kh-tile__media, .kh-tile figure'));
    if (!wraps.length) return function () {};
    wraps.forEach(function (w) { w.classList.add('gx-rollwrap'); });

    var lastY = window.pageYOffset, skew = 0, resting = true;
    var tick = function (time, dt) {
      var v;
      if (smoother && smoother.getVelocity) v = smoother.getVelocity();
      else {
        var y = window.pageYOffset;
        v = (y - lastY) / Math.max(0.001, dt / 1000);
        lastY = y;
      }
      var target = Math.max(-2.5, Math.min(2.5, v / 1100));
      skew += (target - skew) * 0.12;
      if (Math.abs(skew) < 0.02 && Math.abs(target) < 0.02) {
        if (!resting) { resting = true; gsap.set(wraps, { skewY: 0 }); }
        return;   // at rest — write nothing at all
      }
      resting = false;
      gsap.set(wraps, { skewY: skew });
    };
    gsap.ticker.add(tick);
    return function () {
      gsap.ticker.remove(tick);
      gsap.set(wraps, { clearProps: 'transform' });
      wraps.forEach(function (w) { w.classList.remove('gx-rollwrap'); });
    };
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

  /* Hero entrance (home) — kinetic type: the headline rises word by word out
     of masked lines (SplitText), then the subtext + CTAs follow (synced to the
     loading-screen fade). If SplitText is missing or fails, the original plain
     entrance runs — the headline can never be left hidden. */
  function setupHeroEntrance(gsap) {
    var hero = document.getElementById('hero');
    if (!hero) { root.classList.remove('hero-entering'); return; }
    var headline = hero.querySelector('.t-hero');
    var rest = [hero.querySelector('.hero-lede'), hero.querySelector('.cta-row'),
      hero.querySelector('.scroll-chevron')].filter(Boolean);
    root.classList.remove('hero-entering');
    var START = 1.15;   // matches the panel entrance / loading-screen fade
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    var words = null;
    if (headline && window.SplitText) {
      try {
        var split = new window.SplitText(headline, { type: 'lines,words', mask: 'lines', linesClass: 'gx-line', wordsClass: 'gx-word' });
        words = split.words;
        // The home headline paints via background-clip:text on .hero-line;
        // split word wrappers break that painting, so .gx-split-hero moves
        // the gradient onto the words themselves (see design-system.css).
        headline.classList.add('gx-split-hero');
      } catch (err) { words = null; }
    }
    if (headline && words && words.length) {
      // Headline itself stays visible; only the words start below their masks.
      gsap.set(headline, { autoAlpha: 1 });
      tl.from(words, { yPercent: 112, rotation: 2.5, duration: 1.0, stagger: 0.07, ease: 'power4.out' }, START);
    } else if (headline) {
      gsap.set(headline, { autoAlpha: 0, y: 20 });
      tl.to(headline, { autoAlpha: 1, y: 0, duration: 0.8 }, START);
    }
    if (rest.length) {
      gsap.set(rest, { autoAlpha: 0, y: 20 });
      tl.to(rest, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.14 }, START + 0.7);
    }
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
   *      (handled by setupHeroEntrance / setupHeroMark3D).
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
