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

    function pos(n, t) {
      return {
        x: (n.hx + Math.sin(t * n.sp + n.ax) * 0.03) * W,
        y: (n.hy + Math.cos(t * n.sp + n.ay) * 0.03) * H,
      };
    }

    const t0 = performance.now();
    let raf;
    function frame() {
      const t = (performance.now() - t0);
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

      // Traveling data packets — phase across each edge
      for (const e of edges) {
        const A = pos(nodes[e.a], t);
        const B = pos(nodes[e.b], t);
        const p = ((t * 0.0006 * e.sp) + e.ph) % 1;
        const x = A.x + (B.x - A.x) * p;
        const y = A.y + (B.y - A.y) * p;
        const alpha = Math.sin(p * Math.PI);
        ctx.fillStyle = rgbA(nodes[e.a].c, 0.7 * alpha);
        ctx.beginPath();
        ctx.arc(x, y, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes (halo + dot)
      for (const n of nodes) {
        const P = pos(n, t);
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.002 + n.ax);
        ctx.fillStyle = rgbA(n.c, 0.10 * pulse);
        ctx.beginPath();
        ctx.arc(P.x, P.y, 12 * scale, 0, Math.PI * 2);
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
    return () => cancelAnimationFrame(raf);
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

    const PHASES = ['Context', 'Plan', 'Generate', 'Review', 'Deploy', 'Operate'];
    const COLORS = [BRAND.purple, BRAND.purple, BRAND.orange, BRAND.orange, BRAND.green, BRAND.green];
    const t0 = performance.now();
    let raf;
    function frame() {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const R1 = Math.min(W, H) * 0.32;
      const R2 = Math.min(W, H) * 0.42;
      const R3 = Math.min(W, H) * 0.20;
      ctx.strokeStyle = 'rgba(18,19,23,0.10)'; ctx.lineWidth = scale;
      ctx.setLineDash([2*scale, 5*scale]);
      ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(18,19,23,0.06)';
      ctx.beginPath(); ctx.arc(cx, cy, R1, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R3, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = 'rgba(18,19,23,0.07)'; ctx.lineWidth = scale;
      for (let i = 0; i < PHASES.length; i++) {
        const a = -Math.PI/2 + (i/PHASES.length) * Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a)*R1, cy + Math.sin(a)*R1); ctx.stroke();
      }
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
      const hubR = R3 * 0.45;
      const grd = ctx.createLinearGradient(cx-hubR, cy-hubR, cx+hubR, cy+hubR);
      grd.addColorStop(0,    `rgb(${BRAND.purple.join(',')})`);
      grd.addColorStop(0.55, `rgb(${BRAND.green.join(',')})`);
      grd.addColorStop(1,    `rgb(${BRAND.orange.join(',')})`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, Math.PI*2); ctx.fill();
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
                <textarea name="brief" rows="4" placeholder="A sentence or two about the programme, the constraints, and the outcome you need."></textarea>
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
              <button type="button" class="btn ghost gx-modal-close">Close</button>
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

  // ============================================================
  // GRADUAL BLUR — vanilla port of the React component
  // https://reactbits.dev "GradualBlur" by Ansh Dhanani.
  // Stacks N absolutely-positioned <div> layers inside a host element,
  // each with an increasing backdrop-filter blur, masked by a linear
  // gradient so the blur fades along one edge. Same math, same look.
  // ============================================================
  const GB_CURVES = {
    linear: p => p,
    bezier: p => p * p * (3 - 2 * p),
    'ease-in': p => p * p,
    'ease-out': p => 1 - Math.pow(1 - p, 2),
    'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  };
  const GB_DIRECTIONS = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' };

  Galent.gradualBlur = function (host, opts) {
    if (!host) return () => {};
    const config = Object.assign({
      position: 'bottom',
      strength: 2,
      height: '7rem',
      width: null,
      divCount: 5,
      exponential: true,
      curve: 'bezier',
      opacity: 1,
      zIndex: 4,
      target: 'parent',
    }, opts || {});

    const isVertical = config.position === 'top' || config.position === 'bottom';
    const isPageTarget = config.target === 'page';

    const wrap = document.createElement('div');
    wrap.className = 'gradual-blur ' + (isPageTarget ? 'gradual-blur-page' : 'gradual-blur-parent');
    Object.assign(wrap.style, {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: 'none',
      zIndex: String(isPageTarget ? config.zIndex + 100 : config.zIndex),
    });
    if (isVertical) {
      wrap.style.height = config.height;
      wrap.style.width  = config.width || '100%';
      wrap.style[config.position] = '0';
      wrap.style.left = '0';
      wrap.style.right = '0';
    } else {
      wrap.style.width  = config.width || config.height;
      wrap.style.height = '100%';
      wrap.style[config.position] = '0';
      wrap.style.top = '0';
      wrap.style.bottom = '0';
    }

    const inner = document.createElement('div');
    inner.className = 'gradual-blur-inner';
    Object.assign(inner.style, { position: 'relative', width: '100%', height: '100%' });

    const curveFunc = GB_CURVES[config.curve] || GB_CURVES.linear;
    const increment = 100 / config.divCount;
    const direction = GB_DIRECTIONS[config.position] || 'to bottom';

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);
      let blurValue;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * config.strength;
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * config.strength;
      }
      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;
      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;
      const maskValue = `linear-gradient(${direction}, ${gradient})`;
      const layer = document.createElement('div');
      Object.assign(layer.style, {
        position: 'absolute',
        inset: '0',
        maskImage: maskValue,
        WebkitMaskImage: maskValue,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: String(config.opacity),
      });
      inner.appendChild(layer);
    }
    wrap.appendChild(inner);

    if (!isPageTarget) {
      const cs = window.getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
    }
    host.appendChild(wrap);

    return () => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  };

  // Auto-init scanner — reads [data-gradual-blur="<position>"] plus
  // optional data-blur-* attribute overrides. Also injects a page-level
  // bottom blur strip on every page so the effect is always visible
  // somewhere — opt out by setting <body data-no-page-blur>.
  Galent.initGradualBlurs = function () {
    document.querySelectorAll('[data-gradual-blur]').forEach(host => {
      if (host.__gbApplied) return;
      host.__gbApplied = true;
      const position = host.getAttribute('data-gradual-blur') || 'bottom';
      const opts = { position };
      const h = host.getAttribute('data-blur-height');     if (h) opts.height = h;
      const s = host.getAttribute('data-blur-strength');   if (s) opts.strength = parseFloat(s);
      const d = host.getAttribute('data-blur-divs');       if (d) opts.divCount = parseInt(d, 10);
      const c = host.getAttribute('data-blur-curve');      if (c) opts.curve = c;
      const e = host.getAttribute('data-blur-exponential');if (e !== null) opts.exponential = e !== 'false';
      const o = host.getAttribute('data-blur-opacity');    if (o) opts.opacity = parseFloat(o);
      const t = host.getAttribute('data-blur-target');     if (t) opts.target = t;
      const z = host.getAttribute('data-blur-z');          if (z) opts.zIndex = parseInt(z, 10);
      Galent.gradualBlur(host, opts);
    });

    // Page-level bottom strip — always visible, blurs whatever scrolls past.
    if (!document.body.hasAttribute('data-no-page-blur') && !document.body.__gbPageApplied) {
      document.body.__gbPageApplied = true;
      Galent.gradualBlur(document.body, {
        target: 'page',
        position: 'bottom',
        height: '6rem',
        strength: 2,
        divCount: 6,
        curve: 'bezier',
        exponential: true,
        opacity: 1,
        zIndex: 50,
      });
    }
  };

  // Run the scanner once on DOMContentLoaded so pages don't have to call it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Galent.initGradualBlurs);
  } else {
    setTimeout(Galent.initGradualBlurs, 0);
  }

  window.Galent = Galent;
})();
