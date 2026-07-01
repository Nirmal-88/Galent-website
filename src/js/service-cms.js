/* Galent — Service-page outcomes renderer.
 * On any service page (body[data-page="service-<slug>"]), fetches
 * content/services.json, looks up the matching service, and renders the
 * outcomes stat-strip + section title.
 */
(function () {
  const CONTENT_URL = '../content/services.json';

  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Title is allowed to contain inline <em class="ac-*"> accents — we
  // sanitise only enough to keep that working while blocking script tags.
  function sanitiseTitle(value) {
    if (value == null) return '';
    return String(value).replace(/<(\/?)(script|iframe|object|embed)\b[^>]*>/gi, '');
  }

  function renderStat(stat) {
    const tint = escapeHTML(stat.tint || 'p');
    const value = escapeHTML(stat.value || '');
    const unit = stat.unit ? `<span class="unit">${escapeHTML(stat.unit)}</span>` : '';
    const label = escapeHTML(stat.label || '');
    return `<div class="item ${tint}"><div class="big">${value}${unit}</div><div class="label">${label}</div></div>`;
  }

  async function render() {
    const body = document.body;
    const pageId = body && body.dataset && body.dataset.page;
    if (!pageId || pageId.indexOf('service-') !== 0) return;
    const slug = pageId.replace(/^service-/, '');

    const titleEl = document.querySelector('#outcomes .section-head .t-h1');
    const strip = document.querySelector('#outcomes .stat-strip');
    if (!titleEl && !strip) return;

    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const service = data && data[slug];
      if (!service || !service.outcomes) return;

      if (titleEl && service.outcomes.title) {
        titleEl.innerHTML = sanitiseTitle(service.outcomes.title);
      }
      if (strip && Array.isArray(service.outcomes.stats)) {
        strip.innerHTML = service.outcomes.stats.map(renderStat).join('');
      }

      // --- Capabilities (6 engine-card grid) ---
      if (service.capabilities) {
        const capGrid = document.querySelector('.engines-grid');
        const capSection = capGrid ? capGrid.closest('section') : null;
        const capTitleEl = capSection ? capSection.querySelector('.section-head .t-h1') : null;
        if (capTitleEl && service.capabilities.title) {
          capTitleEl.innerHTML = sanitiseTitle(service.capabilities.title);
        }
        if (capGrid && Array.isArray(service.capabilities.items)) {
          capGrid.innerHTML = service.capabilities.items.map(renderCapability).join('');
        }
      }

      if (window.Galent && typeof window.Galent.persistentReveal === 'function') {
        try { window.Galent.persistentReveal(); } catch (_) {}
      }
    } catch (err) {
      console.error('[ServiceCMS] Failed to load services content:', err);
    }
  }

  // Topic icons — pick one that represents the capability from its title.
  var CAP_ICONS = {
    data:    '<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    code:    '<path d="M8 6l-6 6 6 6"/><path d="M16 6l6 6-6 6"/>',
    migrate: '<path d="M4 8h13"/><path d="M13 4l4 4-4 4"/><path d="M20 16H7"/><path d="M11 20l-4-4 4-4"/>',
    shield:  '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
    check:   '<path d="M20 7L10 17l-5-5"/>',
    activity:'<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    cloud:   '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.3A3.5 3.5 0 0118 18H7z"/>',
    graph:   '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7.5 7.5l3.5 9M16.5 7.5l-3.5 9"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    cpu:     '<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="10" y="10" width="4" height="4"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    bolt:    '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
    grid:    '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    ticket:  '<path d="M4 8a2 2 0 012-2h12a2 2 0 012 2 2 2 0 000 4 2 2 0 01-2 2H6a2 2 0 01-2-2 2 2 0 000-4z"/><path d="M14 6v12"/>',
    user:    '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/>',
    refresh: '<path d="M4 12a8 8 0 0114-5l2 2"/><path d="M20 12a8 8 0 01-14 5l-2-2"/><path d="M18 4v5h-5M6 20v-5h5"/>',
    spark:   '<path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z"/><circle cx="18" cy="18" r="2.3"/><circle cx="6" cy="17.5" r="1.6"/>'
  };
  function pickIconKey(t) {
    t = (t || '').toLowerCase();
    var m = [
      [/ticket|service desk|routing|help ?desk|itsm|incident intake/, 'ticket'],
      [/monitor|observ|\bsre\b|reliab|alert|telemetr|uptime|self-heal/, 'activity'],
      [/databas|\bdata\b|\betl\b|schema|warehouse|lakehouse/, 'data'],
      [/migrat/, 'migrate'],
      [/security|complian|\bpolic|governan|\brisk|audit|hipaa|privacy/, 'shield'],
      [/test|qualit|validat|verif|assur/, 'check'],
      [/cloud|gcp|aws|azure|kubernetes/, 'cloud'],
      [/knowledge|graph|context|memory|ontolog|semantic/, 'graph'],
      [/legacy|analys|assess|discover|depend|mapp/, 'search'],
      [/perform|speed|veloc|accelerat|throughput/, 'bolt'],
      [/integrat|\bapi\b|microservice|platform|system|interoper/, 'grid'],
      [/talent|workforce|people|team|skill|staff|hiring/, 'user'],
      [/modern|transform|upgrade|refactor|re-?platform/, 'refresh'],
      [/code|coding|program|develop|engineer/, 'code'],
      [/automat|agent|orchestrat|\bai\b|autonom|intelligen/, 'cpu']
    ];
    for (var i = 0; i < m.length; i++) { if (m[i][0].test(t)) return m[i][1]; }
    return 'spark';
  }
  function capIcon(title) {
    var paths = CAP_ICONS[pickIconKey(title)] || CAP_ICONS.spark;
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  function renderCapability(item, i) {
    const delay = i === 0 ? '' : ` style="transition-delay:${(i * 0.06).toFixed(2)}s"`;
    const num = escapeHTML(item.num || '');
    const title = escapeHTML(item.title || '');
    const description = escapeHTML(item.description || item.kicker || '');
    const bullets = Array.isArray(item.bullets) ? item.bullets : [];
    const bulletsHtml = bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join('');
    const descHtml = description ? `<p class="desc">${description}</p>` : '';
    return `
      <article class="engine-card" data-reveal${delay}>
        <div class="num num--icon" aria-hidden="true">${capIcon(item.title || '')}</div>
        <h3 class="t-h3">${title}</h3>
        ${descHtml}
        <ul>${bulletsHtml}</ul>
      </article>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
