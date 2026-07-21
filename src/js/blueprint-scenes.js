/* ==================================================================
 * BLUEPRINT SCENES ENGINE — shared scroll-scene runtime for inner pages
 * that opt into the full homepage-style experience. Generalised from the
 * v6 home page: boot preloader, crosshair cursor, progress + chapter/pct
 * HUD, magnetic buttons, and data-scene scrubbers (dive / odometer /
 * schematic / fan / wipe / iris). Handles any number of cards/slides/nodes.
 * On <=860px it linearises every scene and presents final states.
 * ================================================================== */
(function () {
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(pointer:fine)');
  var mobile = mq('(max-width: 860px)');
  var clamp = function (x) { return Math.min(Math.max(x, 0), 1); };
  var ease = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeIO = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mk = function (t, css, html) { var e = document.createElement(t); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; };

  /* ---------- chrome ---------- */
  function injectChrome() {
    var bar = mk('div', 'position:fixed;top:0;left:0;height:2px;width:0;background:#6fe3ff;z-index:9997;pointer-events:none;'); bar.id = 'bp-progress';
    document.body.appendChild(bar);
    // Section "chapter" label + percent HUD removed (they sat fixed at the
    // bottom of every scene, e.g. "01 — about galent"). Progress bar kept.
    if (fine && !reduce) {
      var ring = mk('div', 'position:fixed;top:0;left:0;width:36px;height:36px;border:1px solid rgba(238,242,246,.5);transform:translate(-50%,-50%) rotate(45deg);pointer-events:none;z-index:9998;transition:width .3s,height .3s,border-color .3s,background .3s,border-radius .3s;mix-blend-mode:difference;'); ring.id = 'bp-ring';
      var dot = mk('div', 'position:fixed;top:0;left:0;width:5px;height:5px;background:#6fe3ff;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:9999;'); dot.id = 'bp-dot';
      document.body.appendChild(ring); document.body.appendChild(dot);
      document.documentElement.classList.add('bp-cursor');
    }
  }

  function boot() {
    if (reduce) return;
    try { if (sessionStorage.getItem('bp-booted')) return; } catch (e) {}
    var pre = mk('div', 'position:fixed;inset:0;z-index:10000;background:#06080f;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;padding:40px;gap:6px;font-family:\'Spline Sans Mono\',monospace;font-size:13px;color:#5d6570;',
      '<span>&#9656; loading knowledge graph &hellip;</span>' +
      '<span id="bp-b2" style="opacity:0">&#9656; compiling context &hellip; ok</span>' +
      '<span id="bp-b3" style="opacity:0">&#9656; engines online <span style="color:#6fe3ff">&#9632; &#9632; &#9632; &#9632;</span></span>' +
      '<div style="display:flex;justify-content:space-between;width:100%;align-items:flex-end;margin-top:16px"><span style="color:#6fe3ff">galent_</span><span id="bp-n" style="font-family:\'Cabinet Grotesk\',sans-serif;font-weight:800;font-size:clamp(70px,12vw,170px);line-height:.8;color:#eef2f6">0</span></div>');
    pre.id = 'bp-pre';
    document.body.appendChild(pre);
    var t0 = performance.now(), n = pre.querySelector('#bp-n'), b2 = pre.querySelector('#bp-b2'), b3 = pre.querySelector('#bp-b3');
    (function tick(now) { var p = clamp((now - t0) / 1300); if (n) n.textContent = Math.round(p * 100); if (b2 && p > 0.35) b2.style.opacity = 1; if (b3 && p > 0.7) b3.style.opacity = 1; if (p < 1) requestAnimationFrame(tick); })(t0);
    pre.style.transition = 'transform .7s cubic-bezier(.75,0,.25,1)';
    setTimeout(function () { pre.style.transform = 'translateY(-101%)'; }, 1500);
    setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 2300);
    try { sessionStorage.setItem('bp-booted', '1'); } catch (e) {}
  }

  function cursor() {
    var ring = document.getElementById('bp-ring'), dot = document.getElementById('bp-dot');
    if (!ring || !dot) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
    (function raf() { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(raf); })();
    var grow = function () { ring.style.width = '60px'; ring.style.height = '60px'; ring.style.borderRadius = '50%'; ring.style.background = 'rgba(111,227,255,.12)'; ring.style.borderColor = 'rgba(111,227,255,.7)'; };
    var shrink = function () { ring.style.width = '36px'; ring.style.height = '36px'; ring.style.borderRadius = '0'; ring.style.background = 'transparent'; ring.style.borderColor = 'rgba(238,242,246,.5)'; };
    $$('a,button,.btn,[data-magnetic],.bp-card,.bp-pillar,.bp-leader,input,textarea,select').forEach(function (x) { x.addEventListener('mouseenter', grow); x.addEventListener('mouseleave', shrink); });
  }

  function magnetic() {
    $$('.btn,[data-magnetic]').forEach(function (x) {
      x.addEventListener('mousemove', function (e) { var r = x.getBoundingClientRect(); x.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px)'; });
      x.addEventListener('mouseleave', function () { x.style.transform = ''; });
    });
  }

  function navToggle() {
    var nav = $('.bp-nav'); if (!nav) return;
    var burger = $('.bp-burger', nav); if (!burger) return;
    burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    $$('.bp-nav-links a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });
  }

  function pillarHovers() {
    $$('.bp-pillar').forEach(function (p) {
      p.addEventListener('mouseenter', function () { p.style.transform = 'translateY(-8px)'; p.style.borderColor = 'rgba(111,227,255,.55)'; p.style.background = 'rgba(111,227,255,.07)'; });
      p.addEventListener('mouseleave', function () { p.style.transform = 'translateY(0)'; p.style.borderColor = 'rgba(111,227,255,.18)'; p.style.background = 'rgba(111,227,255,.035)'; });
    });
    $$('.bp-leader').forEach(function (l) {
      var img = l.querySelector('img'), bio = l.querySelector('.bp-bio');
      l.addEventListener('mouseenter', function () { if (img) img.style.transform = 'scale(1.06)'; if (bio) { bio.style.maxHeight = '240px'; bio.style.opacity = '1'; } });
      l.addEventListener('mouseleave', function () { if (img) img.style.transform = 'scale(1)'; if (bio) { bio.style.maxHeight = '0'; bio.style.opacity = '0'; } });
    });
  }

  /* ---------- scene scrubbers ---------- */
  var secProgress = function (el) { var r = el.getBoundingClientRect(); var total = el.offsetHeight - innerHeight; if (total <= 0) return 0; return clamp(-r.top / total); };
  function rollDigits(digs, p) { digs.forEach(function (d) { var strip = d.querySelector('.bp-dig-strip'); if (!strip) return; var lines = strip.textContent.split('\n').length - 1; strip.style.transform = 'translateY(' + (-ease(p) * lines).toFixed(3) + 'em)'; }); }

  function collectScenes() {
    return $$('.bp-scene').map(function (sec) {
      var type = sec.getAttribute('data-scene'), a = { sec: sec, type: type };
      if (type === 'dive') { a.stage = $('.bp-dive-stage', sec); a.h1 = $('.bp-dive-h1', sec); a.img = $('.bp-dive-img', sec); a.veil = $('.bp-dive-veil', sec); a.sub = $('.bp-dive-sub', sec); a.cue = $('.bp-dive-cue', sec); a.after = $('.bp-dive-after', sec); }
      else if (type === 'odometer') { a.digs = $$('.bp-dig', sec); a.words = $$('.bp-word', sec); a.words.forEach(function (w) { w.style.opacity = '.15'; w.style.transition = 'opacity .35s ease'; }); a.quote = $('.bp-quote', sec); }
      else if (type === 'schematic') { a.core = $('.bp-bp-core', sec); a.coreLen = a.core && a.core.getTotalLength ? a.core.getTotalLength() : 351.9; a.coreL = $$('.bp-bp-corelabel', sec); a.lines = $$('.bp-bp-line', sec); a.nodes = $$('.bp-bp-node', sec); a.texts = $$('.bp-bp-text', sec); a.n = a.nodes.length; a.details = $$('.bp-bp-d', sec); a.init = $('.bp-bp-init', sec); a.imgs = $$('.bp-bp-img', sec); a.ph = $('.bp-bp-ph', sec); a.count = $('.bp-bp-count', sec); a.names = (sec.getAttribute('data-names') || '').split('|'); a.lineLen = 150; }
      else if (type === 'fan') { a.cards = $$('.bp-card', sec); }
      else if (type === 'wipe') { a.slides = $$('.bp-slide', sec); }
      else if (type === 'iris') { a.iris = $('.bp-iris', sec); a.pre = $('.bp-iris-pre', sec); }
      return a;
    });
  }

  function updateScene(s) {
    var p = secProgress(s.sec);
    if (s.type === 'dive' && s.h1) {
      var dp = clamp((p - 0.15) / 0.7), dive = dp * dp * dp, sc = 1 + dive * 24;
      s.h1.style.transform = 'scale(' + sc.toFixed(2) + ')'; s.h1.style.transformOrigin = '50.5% 30%';
      s.h1.style.opacity = clamp(1 - (sc - 1.6) / 1.4).toFixed(3);
      if (s.stage) s.stage.style.opacity = clamp(1 - (sc - 1.6) / 1.6).toFixed(3);
      if (s.sub) s.sub.style.opacity = clamp(1 - clamp((p - 0.22) * 5)).toFixed(3);
      if (s.cue) s.cue.style.opacity = clamp(1 - clamp((p - 0.16) * 6)).toFixed(3);
      if (s.img) { s.img.style.opacity = clamp((sc - 1.4) / 1.8).toFixed(3); s.img.style.transform = 'scale(' + (1.25 - clamp((sc - 1.4) / 3) * 0.25).toFixed(3) + ')'; }
      if (s.veil) s.veil.style.opacity = clamp((sc - 2.2) / 2.5).toFixed(3);
      if (s.after) { var av = clamp((p - 0.62) * 3.5); s.after.style.opacity = av.toFixed(3); s.after.style.transform = 'translateY(' + (40 - ease(av) * 40).toFixed(1) + 'px)'; }
    } else if (s.type === 'odometer') {
      rollDigits(s.digs, clamp(p * 1.6));
      if (s.words.length) { var nn = Math.floor(clamp(p * 1.35) * s.words.length); s.words.forEach(function (w, i) { w.style.opacity = i < nn ? '1' : '.15'; }); }
      if (s.quote) s.quote.style.opacity = clamp((p - 0.55) * 3).toFixed(3);
    } else if (s.type === 'schematic') {
      var seg = clamp(p * 0.9999) * (s.n + 1), idx = Math.min(Math.floor(seg), s.n), local = seg - idx;
      var coreP = idx > 0 ? 1 : ease(local);
      if (s.core) s.core.setAttribute('stroke-dashoffset', (s.coreLen * (1 - coreP)).toFixed(1));
      s.coreL.forEach(function (t) { t.setAttribute('opacity', coreP > 0.7 ? '1' : '0'); });
      for (var i = 0; i < s.n; i++) {
        var nodeSeg = i + 1, np = 0;
        if (idx > nodeSeg) np = 1; else if (idx === nodeSeg) np = ease(local);
        if (s.lines[i]) s.lines[i].setAttribute('stroke-dashoffset', (s.lineLen * (1 - np)).toFixed(1));
        if (s.nodes[i]) { s.nodes[i].setAttribute('opacity', np > 0.55 ? '1' : '0'); s.nodes[i].setAttribute('fill', np > 0.9 ? '#6fe3ff' : '#06080f'); }
        if (s.texts[i]) s.texts[i].setAttribute('opacity', np > 0.7 ? '1' : '0');
      }
      var active = idx - 1;
      if (s.init) s.init.style.opacity = idx === 0 ? '1' : '0';
      s.details.forEach(function (d) { var on = +d.getAttribute('data-i') === active; d.style.opacity = on ? '1' : '0'; d.style.transform = on ? 'translateY(0)' : 'translateY(24px)'; d.style.transition = 'opacity .4s ease, transform .4s ease'; });
      s.imgs.forEach(function (im) { im.style.opacity = +im.getAttribute('data-i') === active ? '1' : '0'; im.style.transition = 'opacity .45s ease'; });
      if (s.ph) s.ph.style.opacity = active < 0 ? '1' : '0';
      if (s.count && s.names[idx] != null) s.count.textContent = s.names[idx];
    } else if (s.type === 'fan' && s.cards.length) {
      var e = easeIO(clamp(p * 1.15)), unit = Math.min(innerWidth * 0.145, 260), n = s.cards.length;
      s.cards.forEach(function (c, i) {
        var k = i - (n - 1) / 2;
        var x = k * unit * 1.9 * e, y = Math.abs(k) * 14 * e + (1 - e) * i * -6, rot = k * 5 * e + (1 - e) * i * 1.5;
        c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
        c.style.zIndex = String(10 - Math.abs(k) * 2 | 0);
      });
    } else if (s.type === 'wipe' && s.slides.length) {
      var m = s.slides.length, sg = clamp(p * 0.9999) * (m - 1);
      s.slides.forEach(function (sl, i) { if (i === 0) return; var lp = clamp(sg - (i - 1)); sl.style.clipPath = 'inset(' + (100 - easeIO(lp) * 100).toFixed(2) + '% 0 0 0)'; });
    } else if (s.type === 'iris' && s.iris) {
      var r = ease(clamp(p * 1.2)) * 120;
      s.iris.style.clipPath = 'circle(' + r.toFixed(1) + '% at 50% 50%)';
      if (s.pre) s.pre.style.opacity = clamp(1 - p * 3).toFixed(3);
    }
  }

  function setFinal(s) {
    if (s.type === 'odometer') { rollDigits(s.digs, 1); s.words.forEach(function (w) { w.style.opacity = '1'; }); if (s.quote) s.quote.style.opacity = '1'; }
    else if (s.type === 'schematic') {
      if (s.core) s.core.setAttribute('stroke-dashoffset', '0'); s.coreL.forEach(function (t) { t.setAttribute('opacity', '1'); });
      s.lines.forEach(function (l) { l.setAttribute('stroke-dashoffset', '0'); });
      s.nodes.forEach(function (nd) { nd.setAttribute('opacity', '1'); nd.setAttribute('fill', '#6fe3ff'); });
      s.texts.forEach(function (t) { t.setAttribute('opacity', '1'); });
      if (s.init) s.init.style.opacity = '0';
      s.details.forEach(function (d) { d.style.opacity = '1'; d.style.transform = 'none'; });
      if (s.imgs[0]) s.imgs[0].style.opacity = '1';
      if (s.ph) s.ph.style.opacity = '0';
    }
  }

  /* ---------- progress + chapter HUD ---------- */
  function progressHUD() {
    var bar = document.getElementById('bp-progress'), pct = document.getElementById('bp-pct'), chap = document.getElementById('bp-chapter');
    var chapters = $$('.bp-scene, .bp-chapter').filter(function (s) { return s.getBoundingClientRect().height > 0; });
    var cur = -1, ticking = false, tops = [];
    function measure() { tops = chapters.map(function (s) { return s.getBoundingClientRect().top + (pageYOffset || document.documentElement.scrollTop || 0); }); }
    function label(i, s) { var t = s.getAttribute('data-label'); if (!t) { var h = s.querySelector('h1,h2,h3'); t = h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : (s.id || 'section'); } return (String(i + 1).padStart(2, '0')) + ' — ' + t.toLowerCase(); }
    function on() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var st = pageYOffset || document.documentElement.scrollTop, dh = document.documentElement.scrollHeight - innerHeight, gp = dh > 0 ? st / dh : 0;
        if (bar) bar.style.width = (gp * 100) + '%';
        if (pct) pct.textContent = String(Math.round(gp * 100)).padStart(2, '0') + '%';
        if (chap && chapters.length) { var probe = st + innerHeight * 0.4, ci = 0; for (var i = 0; i < tops.length; i++) { if (tops[i] <= probe) ci = i; } if (ci !== cur) { cur = ci; chap.textContent = label(ci, chapters[ci]); } }
      });
    }
    measure(); addEventListener('scroll', on, { passive: true });
    addEventListener('resize', function () { measure(); on(); }, { passive: true });
    addEventListener('load', function () { setTimeout(function () { measure(); on(); }, 200); });
    on();
  }

  function start() {
    injectChrome();
    boot();
    navToggle();
    pillarHovers();
    if (fine && !reduce) { cursor(); magnetic(); }
    progressHUD();
    var scenes = collectScenes();
    if (mobile) { scenes.forEach(setFinal); return; }
    var ticking = false;
    function loop() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; scenes.forEach(updateScene); }); }
    addEventListener('scroll', loop, { passive: true });
    addEventListener('resize', loop, { passive: true });
    loop(); [300, 900].forEach(function (t) { setTimeout(loop, t); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
