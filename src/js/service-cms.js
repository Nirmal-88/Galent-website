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
    } catch (err) {
      console.error('[ServiceCMS] Failed to load services content:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
