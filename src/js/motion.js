/* ============================================================================
 * Galent — Motion Engine (motion.js)
 * ----------------------------------------------------------------------------
 * Built on GSAP 3.13 + ScrollTrigger. Native scroll (reliable).
 *
 * RELIABILITY CONTRACT — the rule that matters most:
 *   Content visibility is driven ONLY by the proven CSS `.in` system toggled
 *   via IntersectionObserver (exactly how the original site revealed content).
 *   GSAP NEVER hides content waiting on a scroll trigger. Every GSAP effect
 *   here is either decorative or "visible-by-default" (animates *from* a state,
 *   so if it never fires the content is already shown). If GSAP fails entirely,
 *   everything is revealed immediately. A page can never be left blank.
 *
 * Regimes (gsap.matchMedia): reduce / desktop / mobile.
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

  // Shared reveal observer — adds .in (CSS does the transition). One callback
  // per element. Robust on native scroll; this is the original proven model.
  var _revIO = null;
  function onReveal(el, cb) {
    if (!el || el.__revBound) return;
    el.__revBound = true;
    el.__rev = cb;
    if (!_revIO) {
      _revIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          _revIO.unobserve(e.target);
          if (typeof e.target.__rev === 'function') { try { e.target.__rev(); } catch (err) {} }
        });
      }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    }
    _revIO.observe(el);
  }

  function boot() {
    var gsap = window.gsap;
    if (!gsap || !window.ScrollTrigger) { revealAll(); markBooted(); return; }

    gsap.registerPlugin(window.ScrollTrigger);
    var ScrollTrigger = window.ScrollTrigger;

    root.classList.add('gsap-ready');

    // Reveals work in EVERY regime (including reduced motion) — content first.
    setupReveals();
    watchDynamicReveals(); // CMS-injected content

    if (REDUCED) { finalizeCountups(); markBooted(); return; }

    var isHome = document.body && document.body.dataset && document.body.dataset.page === 'home';

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });

    var mm = gsap.matchMedia();
    mm.add({
      isDesktop: '(min-width: 1025px) and (prefers-reduced-motion: no-preference)',
      isMobile:  '(max-width: 1024px) and (prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var c = ctx.conditions;

      // Effects only — none of these gate content visibility.
      setupParallaxLayers(gsap, ScrollTrigger, c);
      setupOutcomes(gsap);
      setupStatStrips(gsap);
      setupArchitectureDraw(gsap);
      setupCtaSystem(gsap, ScrollTrigger);

      if (isHome) {
        setupHeroEntrance(gsap);
        setupHeroScrub(gsap, ScrollTrigger);
        setupSvgNetworkGrowth(gsap, ScrollTrigger);
        if (c.isDesktop) setupPinnedComparison(gsap, ScrollTrigger);
      }

      var hoverCleanup = c.isDesktop ? setupHoverSystem(gsap) : function () {};
      ScrollTrigger.refresh();
      return function () { hoverCleanup(); };
    });

    markBooted();
  }

  /* ==========================================================================
   * FEATURE 2 — section reveals. CSS `.in` (opacity/translate/scale +
   * stagger) toggled by IntersectionObserver. Never hides via GSAP.
   * ======================================================================== */
  function setupReveals() {
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-stagger]'));
    var sectionEls = Array.prototype.slice.call(document.querySelectorAll('main > section, main section[id]'));

    revealEls.forEach(function (el) { if (!el.classList.contains('in')) onReveal(el, function () { el.classList.add('in'); }); });
    sectionEls.forEach(function (s) { if (!s.classList.contains('in-view')) onReveal(s, function () { s.classList.add('in-view'); }); });

    // Scroll-position backstop — GUARANTEES anything that reaches the viewport
    // is revealed, even if IntersectionObserver misses it (tall elements at a
    // section edge, content-visibility timing, etc.). This is what makes the
    // system bulletproof: content can never stay hidden once scrolled to.
    var pendingR = revealEls.slice(), pendingS = sectionEls.slice();
    function sweep() {
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      pendingR = pendingR.filter(function (el) {
        if (el.classList.contains('in')) return false;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.95 && r.bottom > -40) { el.classList.add('in'); return false; }
        return true;
      });
      pendingS = pendingS.filter(function (s) {
        if (s.classList.contains('in-view')) return false;
        var r = s.getBoundingClientRect();
        if (r.top < vh * 0.98 && r.bottom > -40) { s.classList.add('in-view'); return false; }
        return true;
      });
      if (!pendingR.length && !pendingS.length) window.removeEventListener('scroll', onScroll);
    }
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; sweep(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', function () { setTimeout(sweep, 60); });
    sweep();
  }

  // CMS-rendered content (case studies, knowledge cards) is injected after
  // boot — reveal anything added later so it can never be stranded hidden.
  function watchDynamicReveals() {
    if (!('MutationObserver' in window)) return;
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          var stag = n.parentElement && n.parentElement.closest && n.parentElement.closest('[data-stagger]');
          if (stag) stag.classList.add('in');
          if (n.matches && n.matches('[data-reveal], [data-stagger]')) onReveal(n, function () { n.classList.add('in'); });
          if (n.querySelectorAll) n.querySelectorAll('[data-reveal], [data-stagger]').forEach(function (c) {
            onReveal(c, function () { c.classList.add('in'); });
          });
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ==========================================================================
   * FEATURE 6 — parallax depth (decorative, native-scroll scrub).
   * ======================================================================== */
  function setupParallaxLayers(gsap, ScrollTrigger, c) {
    document.querySelectorAll('.gd-orb, .signal-bg, .cta-orb').forEach(function (el) {
      var sec = el.closest('section') || el;
      gsap.to(el, { yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ==========================================================================
   * FEATURE 10 — hero network scrub. Hero copy is shown by the entrance; the
   * scrub only adds motion as you leave, so nothing is ever stranded.
   * ======================================================================== */
  function setupHeroScrub(gsap, ScrollTrigger) {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var content = hero.querySelector('.hero-content');
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: function (self) {
        if (window.Galent && window.Galent.setNetworkProgress) window.Galent.setNetworkProgress(self.progress);
      }
    });
    if (content) gsap.to(content, { yPercent: -16, autoAlpha: 0, ease: 'power1.in',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
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
   * FEATURE 7 — pinned "Galent Difference". Content stays VISIBLE; the scrub
   * only assembles the panes and dims the conventional column. If it never
   * runs, everything is fully visible.
   * ======================================================================== */
  function setupPinnedComparison(gsap, ScrollTrigger) {
    var section = document.getElementById('how');
    if (!section) return;
    var left = section.querySelector('.pane.left');
    var right = section.querySelector('.pane.right');
    if (!left || !right) return;
    section.classList.add('cv-visible');
    var leftItems = left.querySelectorAll('li');
    gsap.set(left,  { xPercent: -4 });
    gsap.set(right, { xPercent: 4 });
    var tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: '+=110%', pin: true, scrub: 1, anticipatePin: 1 }
    });
    tl.to(left,  { xPercent: 0, ease: 'power2.out' }, 0)
      .to(right, { xPercent: 0, ease: 'power2.out' }, 0)
      .to(leftItems, { opacity: 0.5, duration: 0.4, stagger: 0.06 }, 0.5);
  }

  /* ==========================================================================
   * FEATURE 8 — hover: magnetic lean + soft cursor lighting (desktop).
   * ======================================================================== */
  function setupHoverSystem(gsap) {
    var cardSel = '.svc, .home-sector-card, .proof-card, .fde-rich, .case-study, .engine-deep-card, .feature, .cta-card';
    var bound = [];
    document.querySelectorAll(cardSel).forEach(function (el) {
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
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      bound.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.classList.remove('gx-magnetic'); });
    });
    document.querySelectorAll('.btn').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      function move(e) { var r = el.getBoundingClientRect(); xTo(((e.clientX-r.left)/r.width-0.5)*10); yTo(((e.clientY-r.top)/r.height-0.5)*8); }
      function leave() { xTo(0); yTo(0); }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      bound.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    });
    return function () { bound.forEach(function (fn) { fn(); }); };
  }

  /* ==========================================================================
   * FEATURE 4 — Outcomes: count-up on scroll into view. Stats are visible by
   * default (the section's .in reveal shows them); numbers start at their
   * final value as a baseline, then count from 0 when scrolled to.
   * ======================================================================== */
  function setupOutcomes(gsap) {
    var section = document.getElementById('outcomes');
    if (!section) return;
    var grid = section.querySelector('.outcomes-grid');
    var counters = [];
    section.querySelectorAll('[data-countup]').forEach(function (b) {
      var target = parseFloat(b.getAttribute('data-countup'));
      if (isFinite(target)) { b.textContent = String(target); counters.push({ el: b, target: target }); }
    });
    if (!counters.length) return;
    onReveal(grid || section, function () {
      counters.forEach(function (c) {
        var o = { v: 0 };
        gsap.to(o, { v: c.target, duration: 1.2, ease: 'power3.out',
          onUpdate: function () { c.el.textContent = Math.round(o.v).toString(); },
          onComplete: function () { c.el.textContent = String(c.target); } });
      });
    });
  }

  /* Platform architecture spine — visible by default; draws + lifts on enter. */
  function setupArchitectureDraw(gsap) {
    var stack = document.querySelector('.arch-stack');
    if (!stack) return;
    var layers = Array.prototype.slice.call(stack.querySelectorAll('.arch-layer'));
    if (!layers.length) return;
    stack.style.setProperty('--arch-progress', '1');
    onReveal(stack, function () {
      stack.style.setProperty('--arch-progress', '0');
      var tl = gsap.timeline();
      tl.to(stack, { duration: 0.9, ease: 'power2.inOut',
        onUpdate: function () { stack.style.setProperty('--arch-progress', String(this.progress())); },
        onComplete: function () { stack.style.setProperty('--arch-progress', '1'); } }, 0);
      tl.from(layers, { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power2.out', stagger: 0.16 }, 0.1);
    });
  }

  /* Generic stat strips — count up on enter (items visible by default). */
  function setupStatStrips(gsap) {
    document.querySelectorAll('.stat-strip--animated').forEach(function (strip) {
      var cells = [];
      strip.querySelectorAll('.item [data-countup]').forEach(function (b) {
        var target = parseFloat(b.getAttribute('data-countup'));
        if (isFinite(target)) { b.textContent = String(target); cells.push({ el: b, target: target }); }
      });
      if (!cells.length) return;
      onReveal(strip, function () {
        cells.forEach(function (c) {
          var o = { v: 0 };
          gsap.to(o, { v: c.target, duration: 1.1, ease: 'power3.out',
            onUpdate: function () { c.el.textContent = Math.round(o.v).toString(); },
            onComplete: function () { c.el.textContent = String(c.target); } });
        });
      });
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

  /* Hero entrance (home) — reveals the hero copy once on load. */
  function setupHeroEntrance(gsap) {
    var hero = document.getElementById('hero');
    if (!hero) { root.classList.remove('hero-entering'); return; }
    var network = hero.querySelector('.hero-network');
    var fg = [hero.querySelector('.badge'), hero.querySelector('.t-hero'), hero.querySelector('.hero-lede'),
      hero.querySelector('.cta-row'), hero.querySelector('.scroll-chevron')].filter(Boolean);
    gsap.set(fg, { autoAlpha: 0, y: 18 });
    if (network) gsap.set(network, { autoAlpha: 0 });
    root.classList.remove('hero-entering');
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (network) tl.to(network, { autoAlpha: 1, duration: 1.2 }, 0);
    tl.to(fg, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.13 }, 0.1);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
