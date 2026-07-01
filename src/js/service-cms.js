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
        <div class="num num--icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z"/><circle cx="18" cy="18" r="2.3"/><circle cx="6" cy="17.5" r="1.6"/></svg></div>
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
