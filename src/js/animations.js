/* Galent — shared animations + canvas visuals.
 * Each function returns its own cleanup so the loop can be cancelled if needed.
 * Page-specific motifs: aurora (everywhere), network (home), signal (legacy),
 * compass (legacy fallback), enginesDiagram (platform interactive).
 */
(function () {
  const Galent = {};

  const BRAND = {
    purple: [123, 44, 191],
    green:  [30, 209, 151],
    orange: [255, 90, 31],
    indigo: [79, 70, 229],
    ink:    [18, 19, 23],
  };
  Galent.BRAND = BRAND;

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
  // AURORA — softly drifting brand-colour radial blobs (hero backdrop)
  // ============================================================
  Galent.aurora = function (canvas, opts) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    let raf;
    const palette = (opts && opts.palette) || [BRAND.purple, BRAND.green, BRAND.orange];
    const blobs = [
      { color: rgbA(palette[0], 0.30), r: 0.55, x: 0.2, y: 0.3, sx: 0.18, sy: 0.22, speed: 0.00012 },
      { color: rgbA(palette[1], 0.22), r: 0.50, x: 0.8, y: 0.6, sx: 0.22, sy: 0.18, speed: 0.00018 },
      { color: rgbA(palette[2] || palette[0], 0.16), r: 0.40, x: 0.5, y: 0.85, sx: 0.20, sy: 0.14, speed: 0.00015 }
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
  // NETWORK — Home hero motif. Nodes connected by edges with
  // data packets traversing — feels expansive and kinetic.
  // ============================================================
  Galent.network = function (canvas) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, scale = 1;
    function size() {
      const m = fit(canvas, host);
      W = canvas.width; H = canvas.height; scale = m.dpr;
    }
    size();
    new ResizeObserver(size).observe(host);

    // Build a graph of nodes. Spread across the canvas at random anchors
    // and slowly drift them around their home position.
    const NODES = 22;
    const nodes = [];
    for (let i = 0; i < NODES; i++) {
      nodes.push({
        hx: 0.08 + Math.random() * 0.84,
        hy: 0.08 + Math.random() * 0.84,
        ax: Math.random() * Math.PI * 2,
        ay: Math.random() * Math.PI * 2,
        sp: 0.0004 + Math.random() * 0.0009,
        r:  1.8 + Math.random() * 2.8,
        c:  [BRAND.purple, BRAND.green, BRAND.orange, BRAND.indigo][i % 4],
      });
    }
    // Edges: connect each node to a few nearby neighbours
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const neighbours = nodes
        .map((n, j) => ({ j, d: (n.hx - nodes[i].hx) ** 2 + (n.hy - nodes[i].hy) ** 2 }))
        .filter(x => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of neighbours) {
        if (!edges.some(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
          edges.push({ a: i, b: j, ph: Math.random(), sp: 0.18 + Math.random() * 0.35 });
        }
      }
    }

    // ---- Cursor tracking (normalised 0..1 over the canvas host) ----
    // targetMouse* receives the raw cursor; smoothMouse* is LERP-smoothed
    // so node attraction feels organic, not snappy. mouseActive falls
    // off when the pointer leaves so nodes return to their drift state.
    let targetMouseX = 0.5, targetMouseY = 0.5;
    let smoothMouseX = 0.5, smoothMouseY = 0.5;
    let mouseStrength = 0;          // 0..1 — eases in on hover, out on leave
    let mouseTarget = 0;
    const ATTRACT_RADIUS = 0.32;    // normalised distance — within ~32% of canvas
    const ATTRACT_PULL  = 0.10;     // max displacement, normalised

    function onMove(clientX, clientY) {
      const r = host.getBoundingClientRect();
      targetMouseX = (clientX - r.left) / r.width;
      targetMouseY = (clientY - r.top)  / r.height;
      mouseTarget = 1;
    }
    function handleMouseMove(e) { onMove(e.clientX, e.clientY); }
    function handleTouchMove(e) {
      if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    function handleLeave() { mouseTarget = 0; }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    host.addEventListener('mouseleave', handleLeave);

    function pos(n, t) {
      // Base drift — same gentle sine/cosine wander as before.
      let nx = n.hx + Math.sin(t * n.sp + n.ax) * 0.03;
      let ny = n.hy + Math.cos(t * n.sp + n.ay) * 0.03;

      // Cursor attraction — falls off with distance, scaled by smoothed
      // proximity strength so it never snaps.
      if (mouseStrength > 0.001) {
        const dx = smoothMouseX - nx;
        const dy = smoothMouseY - ny;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACT_RADIUS) {
          // Eased falloff (1 at cursor, 0 at radius)
          const falloff = Math.pow(1 - dist / ATTRACT_RADIUS, 1.6);
          const pull = falloff * ATTRACT_PULL * mouseStrength;
          nx += dx * pull;
          ny += dy * pull;
        }
      }
      return { x: nx * W, y: ny * H };
    }

    const t0 = performance.now();
    let raf;
    function frame() {
      const t = (performance.now() - t0);

      // Smooth the cursor with a low-pass LERP.
      smoothMouseX += (targetMouseX - smoothMouseX) * 0.08;
      smoothMouseY += (targetMouseY - smoothMouseY) * 0.08;
      mouseStrength += (mouseTarget - mouseStrength) * 0.05;

      ctx.clearRect(0, 0, W, H);

      // Edges
      ctx.lineWidth = scale;
      for (const e of edges) {
        const A = pos(nodes[e.a], t);
        const B = pos(nodes[e.b], t);
        ctx.strokeStyle = rgbA(BRAND.ink, 0.06);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      // Traveling data packets — phase across each edge. Speed boost
      // when the cursor is near the edge midpoint.
      const cursorPx = { x: smoothMouseX * W, y: smoothMouseY * H };
      for (const e of edges) {
        const A = pos(nodes[e.a], t);
        const B = pos(nodes[e.b], t);
        // Distance from cursor to the segment midpoint (cheap proxy)
        const mx = (A.x + B.x) * 0.5, my = (A.y + B.y) * 0.5;
        const cdx = cursorPx.x - mx, cdy = cursorPx.y - my;
        const near = Math.max(0, 1 - Math.sqrt(cdx*cdx + cdy*cdy) / (Math.max(W, H) * 0.30));
        const speedBoost = 1 + near * mouseStrength * 1.8;

        const p = ((t * 0.0006 * e.sp * speedBoost) + e.ph) % 1;
        const x = A.x + (B.x - A.x) * p;
        const y = A.y + (B.y - A.y) * p;
        const alpha = Math.sin(p * Math.PI);
        ctx.fillStyle = rgbA(nodes[e.a].c, 0.7 * alpha);
        ctx.beginPath();
        ctx.arc(x, y, (2 + near * mouseStrength) * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes (halo + dot)
      for (const n of nodes) {
        const P = pos(n, t);
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.002 + n.ax);

        // Subtle proximity glow — halo grows when cursor is near this node.
        const dxPx = cursorPx.x - P.x;
        const dyPx = cursorPx.y - P.y;
        const distPx = Math.sqrt(dxPx*dxPx + dyPx*dyPx);
        const haloBoost = 1 + Math.max(0, 1 - distPx / (Math.max(W, H) * 0.18)) * mouseStrength * 1.2;

        ctx.fillStyle = rgbA(n.c, 0.10 * pulse * haloBoost);
        ctx.beginPath();
        ctx.arc(P.x, P.y, 12 * scale * haloBoost, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgbA(n.c, 0.92);
        ctx.beginPath();
        ctx.arc(P.x, P.y, n.r * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(P.x, P.y, n.r * scale * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      host.removeEventListener('mouseleave', handleLeave);
    };
  };

  // ============================================================
  // COMPASS (kept for backward compat / fallback)
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

    // ---- Cursor parallax — the whole compass leans slightly toward
    // the cursor and orbital tokens speed up when the cursor is near.
    let targetOffX = 0, targetOffY = 0;
    let smoothOffX = 0, smoothOffY = 0;
    let mouseStrength = 0, mouseTarget = 0;
    function onMove(clientX, clientY) {
      const r = host.getBoundingClientRect();
      // Normalised offset from the host centre, -1..1
      const nx = ((clientX - r.left) / r.width  - 0.5) * 2;
      const ny = ((clientY - r.top)  / r.height - 0.5) * 2;
      targetOffX = Math.max(-1, Math.min(1, nx));
      targetOffY = Math.max(-1, Math.min(1, ny));
      mouseTarget = 1;
    }
    function handleMouseMove(e) { onMove(e.clientX, e.clientY); }
    function handleTouchMove(e) {
      if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    function handleLeave() { mouseTarget = 0; }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    host.addEventListener('mouseleave', handleLeave);

    const PHASES = ['Context', 'Plan', 'Generate', 'Review', 'Deploy', 'Operate'];
    const COLORS = [BRAND.purple, BRAND.purple, BRAND.orange, BRAND.orange, BRAND.green, BRAND.green];
    const t0 = performance.now();
    let tWarp = 0;   // accumulates time-warped seconds (faster when cursor is near)
    let raf;
    function frame() {
      // LERP-smooth the cursor offset and the engagement strength
      smoothOffX += (targetOffX - smoothOffX) * 0.08;
      smoothOffY += (targetOffY - smoothOffY) * 0.08;
      mouseStrength += (mouseTarget - mouseStrength) * 0.04;

      // Time warp — orbital tokens speed up smoothly when the cursor is engaged.
      const dt = (performance.now() - t0) / 1000;
      const speedMul = 1 + mouseStrength * 1.1;
      tWarp = dt * speedMul;
      const t = tWarp;

      // Parallax offset — compass leans up to ~6% of its radius toward the cursor.
      const maxShift = Math.min(W, H) * 0.06;
      const offX = smoothOffX * maxShift * mouseStrength;
      const offY = smoothOffY * maxShift * mouseStrength;
      const ccx = cx + offX, ccy = cy + offY;

      ctx.clearRect(0, 0, W, H);
      const R1 = Math.min(W, H) * 0.32;
      const R2 = Math.min(W, H) * 0.42;
      const R3 = Math.min(W, H) * 0.20;
      ctx.strokeStyle = 'rgba(18,19,23,0.10)'; ctx.lineWidth = scale;
      ctx.setLineDash([2*scale, 5*scale]);
      ctx.beginPath(); ctx.arc(ccx, ccy, R2, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(18,19,23,0.06)';
      ctx.beginPath(); ctx.arc(ccx, ccy, R1, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ccx, ccy, R3, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = 'rgba(18,19,23,0.07)'; ctx.lineWidth = scale;
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        ctx.beginPath(); ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + Math.cos(a)*R1, ccy + Math.sin(a)*R1); ctx.stroke();
      }
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        const x = ccx + Math.cos(a)*R1, y = ccy + Math.sin(a)*R1;
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
        ctx.fillText(PHASES[i], ccx + Math.cos(a)*(R1+22*scale), ccy + Math.sin(a)*(R1+22*scale));
      }
      const hubR = R3 * 0.45;
      const grd = ctx.createLinearGradient(ccx-hubR, ccy-hubR, ccx+hubR, ccy+hubR);
      grd.addColorStop(0,    `rgb(${BRAND.purple.join(',')})`);
      grd.addColorStop(0.55, `rgb(${BRAND.green.join(',')})`);
      grd.addColorStop(1,    `rgb(${BRAND.orange.join(',')})`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(ccx, ccy, hubR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 ${12*scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GalentAI', ccx, ccy);
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      host.removeEventListener('mouseleave', handleLeave);
    };
  };

  // ============================================================
  // SIGNAL — 64 phase-shifted bars (legacy, kept for compat)
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
    for (let i = 0; i < N; i++) bars.push({ ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.4 });
    function mix(a, b, k) {
      return [Math.round(a[0]+(b[0]-a[0])*k), Math.round(a[1]+(b[1]-a[1])*k), Math.round(a[2]+(b[2]-a[2])*k)];
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
  Galent.spectrum = Galent.signal;

  // ============================================================
  // GALAXY — vanilla-WebGL port of the reactbits.dev <Galaxy/> shader.
  // Cursor-interactive, transparent-background starfield. Brand-tuned
  // defaults (hueShift around the Galent purple). Same fragment shader
  // as the upstream component — no ogl / React dependency.
  // ============================================================
  Galent.galaxy = function (canvas, opts) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return () => {};

    const config = Object.assign({
      focal: [0.5, 0.5],
      rotation: [1.0, 0.0],
      starSpeed: 0.5,
      density: 1.0,
      hueShift: 270,           // Galent brand purple
      speed: 1.0,
      mouseInteraction: true,
      glowIntensity: 0.4,
      saturation: 0.55,
      mouseRepulsion: true,
      twinkleIntensity: 0.4,
      rotationSpeed: 0.06,
      repulsionStrength: 2.0,
      autoCenterRepulsion: 0.0,
      transparent: true,
    }, opts || {});

    const vertexSrc = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader — copied verbatim from the upstream Galaxy component
    // (reactbits.dev) so the visual output matches exactly.
    const fragmentSrc = `
      precision highp float;

      uniform float uTime;
      uniform vec3  uResolution;
      uniform vec2  uFocal;
      uniform vec2  uRotation;
      uniform float uStarSpeed;
      uniform float uDensity;
      uniform float uHueShift;
      uniform float uSpeed;
      uniform vec2  uMouse;
      uniform float uGlowIntensity;
      uniform float uSaturation;
      uniform bool  uMouseRepulsion;
      uniform float uTwinkleIntensity;
      uniform float uRotationSpeed;
      uniform float uRepulsionStrength;
      uniform float uMouseActiveFactor;
      uniform float uAutoCenterRepulsion;
      uniform bool  uTransparent;

      varying vec2 vUv;

      #define NUM_LAYER 4.0
      #define STAR_COLOR_CUTOFF 0.2
      #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
      #define PERIOD 3.0

      float Hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float tri(float x)  { return abs(fract(x) * 2.0 - 1.0); }
      float tris(float x) {
        float t = fract(x);
        return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
      }
      float trisn(float x) {
        float t = fract(x);
        return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
      }
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      float Star(vec2 uv, float flare) {
        float d = length(uv);
        float m = (0.05 * uGlowIntensity) / d;
        float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
        m += rays * flare * uGlowIntensity;
        uv *= MAT45;
        rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
        m += rays * 0.3 * flare * uGlowIntensity;
        m *= smoothstep(1.0, 0.2, d);
        return m;
      }
      vec3 StarLayer(vec2 uv) {
        vec3 col = vec3(0.0);
        vec2 gv = fract(uv) - 0.5;
        vec2 id = floor(uv);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 si = id + offset;
            float seed = Hash21(si);
            float size = fract(seed * 345.32);
            float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
            float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
            float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
            float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
            float grn = min(red, blu) * seed;
            vec3 base = vec3(red, grn, blu);
            float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
            hue = fract(hue + uHueShift / 360.0);
            float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
            float val = max(max(base.r, base.g), base.b);
            base = hsv2rgb(vec3(hue, sat, val));
            vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
            float star = Star(gv - offset - pad, flareSize);
            vec3 color = base;
            float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
            twinkle = mix(1.0, twinkle, uTwinkleIntensity);
            star *= twinkle;
            col += star * size * color;
          }
        }
        return col;
      }
      void main() {
        vec2 focalPx = uFocal * uResolution.xy;
        vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
        vec2 mouseNorm = uMouse - vec2(0.5);
        if (uAutoCenterRepulsion > 0.0) {
          vec2 centerUV = vec2(0.0, 0.0);
          float centerDist = length(uv - centerUV);
          vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
          uv += repulsion * 0.05;
        } else if (uMouseRepulsion) {
          vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
          float mouseDist = length(uv - mousePosUV);
          vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
          uv += repulsion * 0.05 * uMouseActiveFactor;
        } else {
          vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
          uv += mouseOffset;
        }
        float autoRotAngle = uTime * uRotationSpeed;
        mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
        uv = autoRot * uv;
        uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
        vec3 col = vec3(0.0);
        for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
          float depth = fract(i + uStarSpeed * uSpeed);
          float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
          float fade  = depth * smoothstep(1.0, 0.9, depth);
          col += StarLayer(uv * scale + i * 453.32) * fade;
        }
        if (uTransparent) {
          float alpha = length(col);
          alpha = smoothstep(0.0, 0.3, alpha);
          alpha = min(alpha, 1.0);
          gl_FragColor = vec4(col, alpha);
        } else {
          gl_FragColor = vec4(col, 1.0);
        }
      }
    `;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Galaxy shader compile:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }
    const vs = compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return () => {};
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Galaxy link:', gl.getProgramInfoLog(program));
      return () => {};
    }
    gl.useProgram(program);

    // Full-screen triangle (one big triangle that covers the entire clip space)
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1,  3, -1,  -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0,  2, 0,  0, 2]), gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    const U = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uFocal: gl.getUniformLocation(program, 'uFocal'),
      uRotation: gl.getUniformLocation(program, 'uRotation'),
      uStarSpeed: gl.getUniformLocation(program, 'uStarSpeed'),
      uDensity: gl.getUniformLocation(program, 'uDensity'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uGlowIntensity: gl.getUniformLocation(program, 'uGlowIntensity'),
      uSaturation: gl.getUniformLocation(program, 'uSaturation'),
      uMouseRepulsion: gl.getUniformLocation(program, 'uMouseRepulsion'),
      uTwinkleIntensity: gl.getUniformLocation(program, 'uTwinkleIntensity'),
      uRotationSpeed: gl.getUniformLocation(program, 'uRotationSpeed'),
      uRepulsionStrength: gl.getUniformLocation(program, 'uRepulsionStrength'),
      uMouseActiveFactor: gl.getUniformLocation(program, 'uMouseActiveFactor'),
      uAutoCenterRepulsion: gl.getUniformLocation(program, 'uAutoCenterRepulsion'),
      uTransparent: gl.getUniformLocation(program, 'uTransparent'),
    };
    gl.uniform2f(U.uFocal,    config.focal[0],   config.focal[1]);
    gl.uniform2f(U.uRotation, config.rotation[0], config.rotation[1]);
    gl.uniform1f(U.uDensity,           config.density);
    gl.uniform1f(U.uHueShift,          config.hueShift);
    gl.uniform1f(U.uSpeed,             config.speed);
    gl.uniform1f(U.uGlowIntensity,     config.glowIntensity);
    gl.uniform1f(U.uSaturation,        config.saturation);
    gl.uniform1i(U.uMouseRepulsion,    config.mouseRepulsion ? 1 : 0);
    gl.uniform1f(U.uTwinkleIntensity,  config.twinkleIntensity);
    gl.uniform1f(U.uRotationSpeed,     config.rotationSpeed);
    gl.uniform1f(U.uRepulsionStrength, config.repulsionStrength);
    gl.uniform1f(U.uAutoCenterRepulsion, config.autoCenterRepulsion);
    gl.uniform1i(U.uTransparent,       config.transparent ? 1 : 0);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(1, Math.floor(host.offsetWidth));
      const h = Math.max(1, Math.floor(host.offsetHeight));
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(U.uResolution, canvas.width, canvas.height, canvas.width / Math.max(1, canvas.height));
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener('resize', resize);

    // Mouse — bind to window so the host's pointer-events:none doesn't block us.
    let targetMouseX = 0.5, targetMouseY = 0.5;
    let smoothMouseX = 0.5, smoothMouseY = 0.5;
    let targetMouseActive = 0, smoothMouseActive = 0;
    function onMove(e) {
      const r = host.getBoundingClientRect();
      targetMouseX = (e.clientX - r.left) / r.width;
      targetMouseY = 1.0 - (e.clientY - r.top) / r.height;
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      targetMouseActive = inside ? 1.0 : 0.0;
    }
    function onTouch(e) {
      if (e.touches && e.touches[0]) onMove(e.touches[0]);
    }
    if (config.mouseInteraction) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onTouch, { passive: true });
    }

    if (config.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    let raf;
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const s = t * 0.001;
      gl.uniform1f(U.uTime, s);
      gl.uniform1f(U.uStarSpeed, (s * config.starSpeed) / 10.0);

      const L = 0.05;
      smoothMouseX += (targetMouseX - smoothMouseX) * L;
      smoothMouseY += (targetMouseY - smoothMouseY) * L;
      smoothMouseActive += (targetMouseActive - smoothMouseActive) * L;

      gl.uniform2f(U.uMouse, smoothMouseX, smoothMouseY);
      gl.uniform1f(U.uMouseActiveFactor, smoothMouseActive);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      if (config.mouseInteraction) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onTouch);
      }
      try { gl.getExtension('WEBGL_lose_context') && gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) {}
    };
  };

  // ============================================================
  // ENGINES — Interactive 4-engine diagram on Platform page.
  // Clicking a .engine-node populates .engine-detail.
  // Also draws SVG connector lines from hub to each node.
  // ============================================================
  Galent.enginesDiagram = function (root, engines) {
    if (!root) return () => {};
    const nodes = root.querySelectorAll('.engine-node');
    const detail = root.querySelector('.engine-detail');
    const svg = root.querySelector('.engine-diagram-svg');

    function paintLines() {
      if (!svg) return;
      const r = root.querySelector('.engine-diagram').getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      svg.innerHTML = '';
      const ns = 'http://www.w3.org/2000/svg';
      const cx = r.width / 2, cy = r.height / 2;
      const hubR = 66; // half of .engine-hub width
      nodes.forEach((n) => {
        const nr = n.getBoundingClientRect();
        const offsetParent = root.querySelector('.engine-diagram').getBoundingClientRect();
        const nx = nr.left - offsetParent.left + nr.width / 2;
        const ny = nr.top - offsetParent.top + nr.height / 2;
        const dx = nx - cx, dy = ny - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const fromX = cx + (dx / dist) * hubR;
        const fromY = cy + (dy / dist) * hubR;
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', fromX); line.setAttribute('y1', fromY);
        line.setAttribute('x2', nx); line.setAttribute('y2', ny);
        line.setAttribute('stroke', '#4F46E5');
        line.setAttribute('stroke-opacity', '0.25');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', '4 6');
        svg.appendChild(line);
      });
    }

    let runningCleanups = [];
    function activate(key) {
      // Tear down any live canvas animations from the previous engine
      runningCleanups.forEach(fn => { try { fn(); } catch (e) {} });
      runningCleanups = [];

      nodes.forEach(n => n.classList.toggle('active', n.dataset.engine === key));
      const e = engines[key];
      if (!e || !detail) return;
      detail.innerHTML = `
        <div class="body">
          <span class="code">${e.code}</span>
          <h3>${e.name}</h3>
          <p>${e.description}</p>
          <ul>${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </div>
        <div class="mockup">${e.mockup}</div>
      `;
      // Initialise any data-galent-anim canvases inside the injected mockup
      detail.querySelectorAll('[data-galent-anim]').forEach(cv => {
        const kind = cv.getAttribute('data-galent-anim');
        if (kind === 'signal' && typeof Galent.signal === 'function') {
          const stop = Galent.signal(cv);
          if (typeof stop === 'function') runningCleanups.push(stop);
        } else if (kind === 'network' && typeof Galent.network === 'function') {
          const stop = Galent.network(cv);
          if (typeof stop === 'function') runningCleanups.push(stop);
        }
      });
    }

    nodes.forEach(n => {
      n.addEventListener('click', () => activate(n.dataset.engine));
      n.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(n.dataset.engine); }
      });
    });

    activate(nodes[0]?.dataset.engine);
    paintLines();
    const ro = new ResizeObserver(paintLines);
    ro.observe(root);
    window.addEventListener('resize', paintLines);

    return () => { ro.disconnect(); window.removeEventListener('resize', paintLines); };
  };

  // ============================================================
  // REVEAL — fades + lifts elements into view as they scroll on.
  // Supports [data-reveal], [data-reveal="left|right|scale"].
  // [data-stagger] containers add 80ms cascade to their direct children.
  // ============================================================
  Galent.persistentReveal = function () {
    const els = document.querySelectorAll('[data-reveal], [data-stagger]');
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  };

  // Sticky-nav scrolled border + hamburger + dropdown
  Galent.stickyNav = function (id) {
    const nav = document.getElementById(id);
    if (!nav) return;
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 12); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const toggle = nav.querySelector('.nav-toggle');
    const menu = nav.querySelector('.menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
      });
    }
    nav.querySelectorAll('.has-dropdown').forEach(dd => {
      const t = dd.querySelector('.dropdown-toggle');
      const p = dd.querySelector('.dropdown-panel');
      if (!t || !p) return;
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dd.classList.toggle('open');
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
        p.setAttribute('aria-hidden', open ? 'false' : 'true');
      });
    });
    document.addEventListener('click', (e) => {
      nav.querySelectorAll('.has-dropdown.open').forEach(dd => {
        if (!dd.contains(e.target)) {
          dd.classList.remove('open');
          const t = dd.querySelector('.dropdown-toggle'); if (t) t.setAttribute('aria-expanded', 'false');
          const p = dd.querySelector('.dropdown-panel'); if (p) p.setAttribute('aria-hidden', 'true');
        }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      nav.querySelectorAll('.has-dropdown.open').forEach(dd => {
        dd.classList.remove('open');
        const t = dd.querySelector('.dropdown-toggle'); if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); }
        const p = dd.querySelector('.dropdown-panel'); if (p) p.setAttribute('aria-hidden', 'true');
      });
    });
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

  // ============================================================
  // KNOWLEDGE GRAPH — animated, interactive node-edge graph for the
  // Platform Architecture section. 18 named nodes, breathing scale,
  // signal dots travelling along edges, hover highlight, click tooltip.
  // ============================================================
  Galent.knowledgeGraph = function (canvas, panelHost) {
    if (!canvas) return () => {};
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    function size() {
      const m = fit(canvas, host);
      W = canvas.width; H = canvas.height; dpr = m.dpr;
    }
    size();
    // Defensive re-size — if the host had zero dimensions at init
    // (data-reveal section, font/grid layout not yet settled), pick
    // them up once the browser is finished laying out.
    requestAnimationFrame(() => requestAnimationFrame(size));
    setTimeout(size, 150);
    window.addEventListener('load', size, { once: true });
    new ResizeObserver(size).observe(host);

    // 18 nodes with hand-tuned normalised positions (stable layout).
    // Each: { id, label, short, x (0-1), y (0-1), description }
    const NODES = [
      { id: 0,  label: 'Codebase',      short: 'Code',     x: 0.18, y: 0.22, desc: 'AST-parsed source tree. GalentAI maps every function, dependency, and change history.' },
      { id: 1,  label: 'Logs',          short: 'Logs',     x: 0.30, y: 0.10, desc: 'Streaming runtime telemetry. Correlated against deploys, SLOs, and changesets.' },
      { id: 2,  label: 'Schemas',       short: 'Schemas',  x: 0.45, y: 0.18, desc: 'Live data contracts. Drift detected before it reaches production.' },
      { id: 3,  label: 'Tickets',       short: 'Tickets',  x: 0.62, y: 0.10, desc: 'Linked work items. Decisions, owners, and history threaded back into the graph.' },
      { id: 4,  label: 'Runbooks',      short: 'Runbooks', x: 0.78, y: 0.20, desc: 'Operational playbooks. Auto-triggered against alert signatures.' },
      { id: 5,  label: 'CI/CD',         short: 'CI/CD',    x: 0.88, y: 0.36, desc: 'Pipeline state. Every change traced from PR to production.' },
      { id: 6,  label: 'Infra',         short: 'Infra',    x: 0.84, y: 0.55, desc: 'Live topology of clouds, clusters, and services. State refreshed continuously.' },
      { id: 7,  label: 'APIs',          short: 'APIs',     x: 0.74, y: 0.72, desc: 'Live contracts and consumers. Breaking-change blast radius computed in real time.' },
      { id: 8,  label: 'Events',        short: 'Events',   x: 0.60, y: 0.84, desc: 'Domain event flow across services. Order, timing, retries — all observable.' },
      { id: 9,  label: 'ML Models',     short: 'Models',   x: 0.45, y: 0.78, desc: 'Model registry, lineage, evaluations. Performance drift gated by RCM.' },
      { id: 10, label: 'SLOs',          short: 'SLOs',     x: 0.30, y: 0.88, desc: 'Live reliability targets. GalentAI tracks breach risk and triggers auto-remediation.' },
      { id: 11, label: 'Policies',      short: 'Policy',   x: 0.16, y: 0.78, desc: 'Compliance, security, and architectural constraints enforced before generation.' },
      { id: 12, label: 'Data Pipelines',short: 'Pipelines',x: 0.08, y: 0.58, desc: 'AI-native pipelines. Quality, lineage, and lineage-aware schema evolution.' },
      { id: 13, label: 'Architecture',  short: 'Arch',     x: 0.14, y: 0.40, desc: 'Live architectural model. Patterns, constraints, and decisions kept addressable.' },
      { id: 14, label: 'Business Rules',short: 'Rules',    x: 0.34, y: 0.32, desc: 'Domain logic, encoded and queryable. Discoverable across the codebase.' },
      { id: 15, label: 'Test Coverage', short: 'Tests',    x: 0.56, y: 0.30, desc: 'Coverage modelling per function. Gaps surfaced before code is generated.' },
      { id: 16, label: 'Deployments',   short: 'Deploys',  x: 0.66, y: 0.50, desc: 'Every release attributed. Roll-forward and roll-back wired into the graph.' },
      { id: 17, label: 'Alerts',        short: 'Alerts',   x: 0.42, y: 0.50, desc: 'Active and historic incidents. Pattern-matched against runbooks and SLOs.' },
    ];

    // Edge list (hand-picked, ~1.8 connections per node). Stable topology.
    const EDGES = [
      [0,14],[0,15],[0,13],[0,5],
      [1,17],[1,10],[1,6],
      [2,12],[2,15],[2,14],
      [3,17],[3,16],[3,11],
      [4,17],[4,6],[4,11],
      [5,16],[5,15],
      [6,10],[6,7],
      [7,8],[7,16],
      [8,9],[8,17],
      [9,15],[9,11],
      [10,17],[10,11],
      [11,13],
      [12,2],[12,9],
      [13,14],
      [14,15],
      [16,5],
    ];
    // Deduplicate
    const seen = new Set();
    const edges = EDGES.filter(([a,b]) => {
      const k = a < b ? a+'-'+b : b+'-'+a;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Phase offsets for breathing animation
    NODES.forEach((n, i) => n.phase = i * 0.41);

    // Active signal dots travelling along edges
    const signals = [];
    let lastSpawn = 0;
    const SPAWN_INTERVAL = 1200; // ms

    // Node activation timestamps (for the brief glow on signal arrival)
    NODES.forEach(n => { n.activeUntil = 0; });

    // Pointer state
    let hoverId = -1;
    let activeId = -1; // clicked / tooltip-open
    let pointerInside = false;

    function nodeAtPointer(px, py) {
      // px,py in CSS pixels relative to host
      for (let i = NODES.length - 1; i >= 0; i--) {
        const n = NODES[i];
        const nx = n.x * (W / dpr);
        const ny = n.y * (H / dpr);
        const dx = px - nx, dy = py - ny;
        if (dx*dx + dy*dy <= 26*26) return i;
      }
      return -1;
    }

    // Tooltip panel — HTML overlay, positioned smart-relative to host.
    const panel = document.createElement('div');
    panel.className = 'kg-panel';
    panel.style.cssText = 'position:absolute; background:#0a0a0a; border:1px solid #1e1e1e; border-radius:8px; padding:14px 16px; max-width:240px; font-family:inherit; color:#fff; box-shadow:0 8px 32px rgba(0,0,0,0.4); opacity:0; transform:translateY(4px); transition:opacity .15s ease, transform .15s ease; pointer-events:none; z-index:5; font-size:13px;';
    panel.innerHTML = '<button class="kg-close" aria-label="Close" style="position:absolute;top:6px;right:6px;background:transparent;border:0;color:rgba(255,255,255,0.6);font-size:16px;line-height:1;cursor:pointer;padding:4px 6px;">×</button><div class="kg-title" style="font-weight:700;font-size:13px;color:#fff;padding-right:18px;margin-bottom:6px;"></div><div class="kg-desc" style="font-size:12.5px;line-height:1.5;color:rgba(255,255,255,0.72);margin-bottom:8px;"></div><div class="kg-neighbours" style="display:flex;flex-wrap:wrap;gap:4px;"></div>';
    (panelHost || host).appendChild(panel);
    const panelTitle = panel.querySelector('.kg-title');
    const panelDesc  = panel.querySelector('.kg-desc');
    const panelNeigh = panel.querySelector('.kg-neighbours');
    const panelClose = panel.querySelector('.kg-close');

    function showPanel(id) {
      activeId = id;
      const n = NODES[id];
      panelTitle.textContent = n.label;
      panelDesc.textContent  = n.desc;
      // Connected neighbours
      const conns = edges.filter(([a,b]) => a === id || b === id).map(([a,b]) => a === id ? b : a);
      panelNeigh.innerHTML = '';
      conns.forEach(j => {
        const pill = document.createElement('span');
        pill.style.cssText = 'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.86);font-size:10px;padding:3px 8px;border-radius:9999px;letter-spacing:0.2px;font-family:"JetBrains Mono", monospace;';
        pill.textContent = NODES[j].label;
        panelNeigh.appendChild(pill);
      });
      // Smart-position
      const cssW = W / dpr, cssH = H / dpr;
      const nx = n.x * cssW, ny = n.y * cssH;
      const placeLeft = n.x > 0.55;
      const placeAbove = n.y > 0.65;
      panel.style.left = placeLeft ? '' : (nx + 34) + 'px';
      panel.style.right = placeLeft ? (cssW - nx + 34) + 'px' : '';
      panel.style.top = placeAbove ? '' : (ny - 8) + 'px';
      panel.style.bottom = placeAbove ? (cssH - ny - 8) + 'px' : '';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
      panel.style.pointerEvents = 'auto';
    }
    function hidePanel() {
      activeId = -1;
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(4px)';
      panel.style.pointerEvents = 'none';
    }

    panelClose.addEventListener('click', (e) => { e.stopPropagation(); hidePanel(); });
    document.addEventListener('click', (e) => {
      if (activeId === -1) return;
      if (!host.contains(e.target) && !panel.contains(e.target)) hidePanel();
    });

    function handleMove(e) {
      const r = host.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      pointerInside = px >= 0 && py >= 0 && px < r.width && py < r.height;
      hoverId = pointerInside ? nodeAtPointer(px, py) : -1;
      host.style.cursor = hoverId >= 0 ? 'pointer' : '';
    }
    function handleClick(e) {
      const r = host.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const id = nodeAtPointer(px, py);
      if (id >= 0) {
        e.stopPropagation();
        if (activeId === id) hidePanel();
        else showPanel(id);
      }
    }
    host.addEventListener('mousemove', handleMove);
    host.addEventListener('mouseleave', () => { hoverId = -1; pointerInside = false; host.style.cursor = ''; });
    host.addEventListener('click', handleClick);

    const t0 = performance.now();
    let raf;
    function frame() {
      const now = performance.now();
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      // Spawn signal dots
      if (now - lastSpawn > SPAWN_INTERVAL) {
        lastSpawn = now;
        const ei = (Math.random() * edges.length) | 0;
        const [a, b] = edges[ei];
        signals.push({ a, b, start: now, duration: 800 + Math.random()*400 });
      }

      // Determine highlighted edges/neighbours based on hover or active
      const focusId = hoverId !== -1 ? hoverId : activeId;
      const focusNeighbours = new Set();
      if (focusId !== -1) {
        edges.forEach(([a,b]) => {
          if (a === focusId) focusNeighbours.add(b);
          else if (b === focusId) focusNeighbours.add(a);
        });
      }

      // ---- Draw edges ----
      ctx.lineWidth = 1 * dpr;
      edges.forEach(([a, b]) => {
        const A = NODES[a], B = NODES[b];
        const isFocus = focusId !== -1 && (a === focusId || b === focusId);
        ctx.strokeStyle = isFocus
          ? rgbA(BRAND.purple, 0.5)
          : rgbA(BRAND.ink, 0.10);
        ctx.beginPath();
        ctx.moveTo(A.x * W, A.y * H);
        ctx.lineTo(B.x * W, B.y * H);
        ctx.stroke();
      });

      // ---- Draw signal dots and check arrivals ----
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        const p = Math.min(1, (now - s.start) / s.duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const A = NODES[s.a], B = NODES[s.b];
        const x = (A.x + (B.x - A.x) * eased) * W;
        const y = (A.y + (B.y - A.y) * eased) * H;
        ctx.fillStyle = rgbA(BRAND.green, 0.92);
        ctx.beginPath();
        ctx.arc(x, y, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgbA(BRAND.green, 0.20);
        ctx.beginPath();
        ctx.arc(x, y, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        if (p >= 1) {
          NODES[s.b].activeUntil = now + 400;
          signals.splice(i, 1);
        }
      }

      // ---- Draw nodes ----
      ctx.font = `500 ${9 * dpr}px Inter, "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < NODES.length; i++) {
        const n = NODES[i];
        const breathe = 1 + 0.08 * Math.sin(t * 0.9 + n.phase);
        const r = 22 * dpr * breathe;
        const cx = n.x * W;
        const cy = n.y * H;

        const isHover = hoverId === i;
        const isActive = activeId === i;
        const isNeighbour = focusNeighbours.has(i);
        const isSignalActive = now < n.activeUntil;

        // Neighbour halo
        if (isNeighbour) {
          ctx.fillStyle = rgbA(BRAND.purple, 0.08);
          ctx.beginPath();
          ctx.arc(cx, cy, 30 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node body
        let fill = '#FFFFFF';
        if (isSignalActive) fill = `rgba(241,232,251, 1)`;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Node stroke
        ctx.lineWidth = (isHover || isActive ? 2 : 1.5) * dpr;
        ctx.strokeStyle = (isHover || isActive)
          ? rgbA(BRAND.purple, 1)
          : rgbA(BRAND.ink, 0.18);
        ctx.stroke();

        // Label
        ctx.fillStyle = rgbA(BRAND.ink, isHover || isActive ? 1 : 0.78);
        ctx.fillText(n.short, cx, cy);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('mousemove', handleMove);
      host.removeEventListener('click', handleClick);
      if (panel.parentElement) panel.parentElement.removeChild(panel);
    };
  };

  // ============================================================
  // CONTACT MODAL — injected sitewide. Binds to a[href="#"] and any
  // [data-contact] trigger. Submits via mailto: fallback (no backend).
  // ============================================================
  Galent.contactModal = function (opts) {
    const to = (opts && opts.to) || 'nirmal.r@galent.com';

    // Inject markup once.
    if (!document.querySelector('.gx-modal-backdrop')) {
      const wrap = document.createElement('div');
      wrap.className = 'gx-modal-backdrop';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('aria-labelledby', 'gx-modal-title');
      wrap.innerHTML = `
        <div class="gx-modal">
          <button class="close" aria-label="Close">×</button>
          <div class="gx-form-view">
            <span class="badge"><span class="dot">→</span>Talk to Galent</span>
            <h3 id="gx-modal-title">Tell us what you're trying to deliver.</h3>
            <p>We'll come back with how we'd approach it, what to expect, and which FDE archetypes you'll be working with.</p>
            <form novalidate>
              <label>Name
                <input name="name" type="text" required autocomplete="name" placeholder="Jane Doe">
              </label>
              <label>Company
                <input name="company" type="text" required autocomplete="organization" placeholder="Company name">
              </label>
              <label>Work email
                <input name="email" type="email" required autocomplete="email" placeholder="jane@company.com">
              </label>
              <label>What are you trying to deliver?
                <textarea name="brief" rows="4" required placeholder="A sentence or two about the programme, the constraints, and the outcome you need."></textarea>
              </label>
              <div class="submit-row">
                <button type="submit" class="btn">Send <span class="arr">→</span></button>
              </div>
            </form>
          </div>
          <div class="gx-confirm" hidden>
            <div class="check">✓</div>
            <h3>Your draft is ready in your email client.</h3>
            <p>Hit send from there and we'll be in touch within one business day.</p>
            <div class="submit-row">
              <button type="button" aria-label="Close" class="btn ghost gx-modal-close">Close</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(wrap);
    }

    const backdrop = document.querySelector('.gx-modal-backdrop');
    const formView = backdrop.querySelector('.gx-form-view');
    const confirmView = backdrop.querySelector('.gx-confirm');
    const form = backdrop.querySelector('form');
    let lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      backdrop.classList.add('open');
      formView.hidden = false;
      confirmView.hidden = true;
      form.reset();
      setTimeout(() => backdrop.querySelector('input[name="name"]').focus(), 80);
    }
    function close() {
      backdrop.classList.remove('open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('.close').addEventListener('click', close);
    backdrop.querySelectorAll('.gx-modal-close').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) close();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const company = (data.get('company') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const brief = (data.get('brief') || '').toString().trim();
      if (!name || !company || !email) {
        form.querySelectorAll('input[required]').forEach(i => {
          if (!i.value.trim()) i.style.borderColor = '#DC2626';
        });
        return;
      }
      const subject = encodeURIComponent(`Galent enquiry — ${company}`);
      const body = encodeURIComponent(
        `Name: ${name}\nCompany: ${company}\nEmail: ${email}\n\nWhat we're trying to deliver:\n${brief || '(not provided)'}\n\n— Sent from galent-website.vercel.app`
      );
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      formView.hidden = true;
      confirmView.hidden = false;
    });

    // Bind every "dead" link or [data-contact] trigger to open the modal.
    function bind() {
      const selectors = [
        'a[href="#"]:not([data-no-modal])',
        'a[href="#cta"]:not([data-no-modal])',
        '[data-contact]'
      ];
      document.querySelectorAll(selectors.join(',')).forEach(a => {
        if (a.__gxBound) return;
        a.__gxBound = true;
        a.addEventListener('click', (e) => {
          // Only intercept if the anchor truly goes nowhere or is an explicit contact CTA.
          e.preventDefault();
          open();
        });
      });
    }
    bind();
    // Re-bind if the DOM mutates (modals injected by other code, etc.)
    if ('MutationObserver' in window) {
      new MutationObserver(() => bind()).observe(document.body, { childList: true, subtree: true });
    }

    Galent.openContactModal = open;
    Galent.closeContactModal = close;
  };

  window.Galent = Galent;
})();
