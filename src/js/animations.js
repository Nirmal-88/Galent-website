/* Galent — shared animations + canvas visuals.
 * Compass + Signal use the production Galent marketing-site code (dependency-free
 * Canvas2D, ~60fps, retina-aware). Each function returns its own cleanup so the
 * loop can be cancelled if needed.
 */
(function () {
  const Galent = {};

  // ============================================================
  // BRAND PALETTE — single source of truth
  // ============================================================
  const BRAND = {
    purple: [123, 44, 191],   // #7B2CBF
    green:  [30, 209, 151],   // #1ED197
    orange: [255, 90, 31],    // #FF5A1F
    ink:    [18, 19, 23],     // #121317
  };
  Galent.BRAND = BRAND;

  // ============================================================
  // SHARED HELPERS
  // ============================================================
  // Retina-aware canvas sizing. Returns CSS w/h + device pixel ratio.
  function fit(canvas, host) {
    const r = (host || canvas.parentElement).getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    return { w, h, dpr };
  }
  function rgbA([r, g, b], a) { return `rgba(${r},${g},${b},${a})`; }
  Galent.fit = fit;
  Galent.rgbA = rgbA;

  // ============================================================
  // AURORA — hero backdrop (drifting brand-colour radial blobs)
  // ============================================================
  Galent.aurora = function (canvas) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    let raf;
    const blobs = [
      { color: rgbA(BRAND.purple, 0.32), r: 0.55, x: 0.2, y: 0.3, sx: 0.18, sy: 0.22, speed: 0.00012 },
      { color: rgbA(BRAND.green,  0.22), r: 0.50, x: 0.8, y: 0.6, sx: 0.22, sy: 0.18, speed: 0.00018 },
      { color: rgbA(BRAND.orange, 0.16), r: 0.40, x: 0.5, y: 0.85, sx: 0.20, sy: 0.14, speed: 0.00015 }
    ];
    function size() { fit(canvas, host); }
    size();
    new ResizeObserver(size).observe(host);
    const ctx = canvas.getContext('2d');
    function draw(t) {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.speed) * b.sx) * W;
        const cy = (b.y + Math.cos(t * b.speed * 1.1) * b.sy) * H;
        const radius = b.r * Math.max(W, H);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, b.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  };

  // ============================================================
  // COMPASS — Orbital "GalentAI core" with 6 phase nodes
  // ============================================================
  Galent.compass = function (canvas) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, cx = 0, cy = 0, scale = 1;
    function size() {
      const m = fit(canvas, host);
      W = canvas.width; H = canvas.height; ctx.setTransform(1,0,0,1,0,0);
      cx = W / 2; cy = H / 2; scale = m.dpr;
    }
    size();
    new ResizeObserver(size).observe(host);

    const PHASES = ['Context', 'Plan', 'Generate', 'Review', 'Deploy', 'Operate'];
    const COLORS = [BRAND.purple, BRAND.purple, BRAND.orange, BRAND.orange, BRAND.green, BRAND.green];

    const t0 = performance.now();
    let raf;
    function frame() {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      const R1 = Math.min(W, H) * 0.32;  // phase ring
      const R2 = Math.min(W, H) * 0.42;  // outer ring
      const R3 = Math.min(W, H) * 0.20;  // inner ring

      // Outer dashed ring
      ctx.strokeStyle = 'rgba(18,19,23,0.10)'; ctx.lineWidth = scale;
      ctx.setLineDash([2*scale, 5*scale]);
      ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);

      // Mid + inner rings
      ctx.strokeStyle = 'rgba(18,19,23,0.06)';
      ctx.beginPath(); ctx.arc(cx, cy, R1, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R3, 0, Math.PI*2); ctx.stroke();

      // Rotating outer tick marks
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.08);
      ctx.strokeStyle = 'rgba(18,19,23,0.20)'; ctx.lineWidth = scale;
      for (let i = 0; i < 36; i++) {
        const a = (i/36) * Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*(R2+6*scale), Math.sin(a)*(R2+6*scale));
        ctx.lineTo(Math.cos(a)*(R2+12*scale), Math.sin(a)*(R2+12*scale));
        ctx.stroke();
      }
      ctx.restore();

      // Hub -> phase connector lines
      ctx.strokeStyle = 'rgba(18,19,23,0.07)'; ctx.lineWidth = scale;
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a)*R1, cy + Math.sin(a)*R1); ctx.stroke();
      }

      // Traveling tokens along each connector
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        const x = cx + Math.cos(a)*R1, y = cy + Math.sin(a)*R1;
        const p = (t * 0.35 + i * 0.17) % 1;
        const alpha = Math.sin(p * Math.PI);
        ctx.fillStyle = rgbA(COLORS[i], 0.9 * alpha);
        ctx.beginPath();
        ctx.arc(cx + (x-cx)*p, cy + (y-cy)*p, 2.5*scale, 0, Math.PI*2); ctx.fill();
      }

      // Phase nodes (pulsing halo + ring + dot + label)
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        const x = cx + Math.cos(a)*R1, y = cy + Math.sin(a)*R1;
        const c = COLORS[i];
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.3 + i);
        ctx.fillStyle = rgbA(c, 0.10 * pulse);
        ctx.beginPath(); ctx.arc(x, y, 18*scale, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = rgbA(c, 1); ctx.lineWidth = 1.6*scale;
        ctx.beginPath(); ctx.arc(x, y, 6*scale, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = rgbA(c, 1);
        ctx.beginPath(); ctx.arc(x, y, 2.5*scale, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(18,19,23,1)';
        ctx.font = `500 ${11*scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(PHASES[i], cx + Math.cos(a)*(R1+22*scale), cy + Math.sin(a)*(R1+22*scale));
      }

      // Center hub (brand gradient disc + label)
      const hubR = R3 * 0.45;
      const grd = ctx.createLinearGradient(cx-hubR, cy-hubR, cx+hubR, cy+hubR);
      grd.addColorStop(0,    `rgb(${BRAND.purple.join(',')})`);
      grd.addColorStop(0.55, `rgb(${BRAND.green.join(',')})`);
      grd.addColorStop(1,    `rgb(${BRAND.orange.join(',')})`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(18,19,23,0.08)'; ctx.lineWidth = scale;
      ctx.beginPath(); ctx.arc(cx, cy, hubR + 6*scale, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 ${12*scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GalentAI', cx, cy);

      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(raf);
  };

  // ============================================================
  // SIGNAL (Spectrum Bars) — 64 bars, phase-shifted, brand gradient
  // Exposed as both Galent.signal and Galent.spectrum so existing
  // index.html (which calls Galent.spectrum) keeps working.
  // ============================================================
  Galent.signal = function (canvas) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    function size() { fit(canvas, host); W = canvas.width; H = canvas.height; ctx.setTransform(1,0,0,1,0,0); }
    size();
    new ResizeObserver(size).observe(host);

    const N = 64;
    const bars = [];
    for (let i = 0; i < N; i++) {
      bars.push({ ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.4 });
    }

    function mix(a, b, k) {
      return [
        Math.round(a[0] + (b[0]-a[0])*k),
        Math.round(a[1] + (b[1]-a[1])*k),
        Math.round(a[2] + (b[2]-a[2])*k),
      ];
    }

    const t0 = performance.now();
    let raf;
    function frame() {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const gap = W / N;
      const barW = gap * 0.5;

      for (let i = 0; i < N; i++) {
        const b = bars[i];
        const h = (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * b.sp + b.ph))) * H * 0.7;
        const x = i * gap + (gap - barW) / 2;
        const y = H - h - H * 0.15;

        const u = i / (N - 1);
        const col = u < 0.5
          ? mix(BRAND.purple, BRAND.green, u / 0.5)
          : mix(BRAND.green, BRAND.orange, (u - 0.5) / 0.5);
        ctx.fillStyle = rgbA(col, 0.85);

        const r = barW * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, y + h - r);
        ctx.arcTo(x + barW, y + h, x + barW - r, y + h, r);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.closePath();
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(raf);
  };
  // Alias — existing HTML uses Galent.spectrum.
  Galent.spectrum = Galent.signal;

  // ============================================================
  // REVEAL — fades + lifts elements into view as they scroll on
  // ============================================================
  Galent.persistentReveal = function () {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  };

  // Sticky-nav scrolled border + mobile hamburger toggle.
  Galent.stickyNav = function (id) {
    const nav = document.getElementById(id);
    if (!nav) return;
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 12); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Hamburger toggle — opens/closes the menu on mobile.
    const toggle = nav.querySelector('.nav-toggle');
    const menu = nav.querySelector('.menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // Close menu when an in-menu link is clicked (mobile UX).
      menu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
      });
    }
  };

  // Count-up — animates [data-countup] integers when revealed.
  Galent.countUps = function () {
    const els = document.querySelectorAll('[data-countup]');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        const target = parseFloat(el.getAttribute('data-countup'));
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = Math.round(target * eased);
          el.textContent = val.toString();
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      }
    }, { threshold: 0.35 });
    els.forEach(el => io.observe(el));
  };

  window.Galent = Galent;
})();
