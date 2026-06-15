/* Galent — Client Outcomes (case studies) renderer.
 * Reads content/cases.json and fills the .cases-grid container on the
 * home page's "What Gets Delivered" section. Editor changes via /admin/.
 */
(function () {
  const CONTENT_URL = 'content/cases.json';

  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderCard(item) {
    return `
      <article class="case-study">
        <div class="case-headline">
          <span class="metric-big">${escapeHTML(item.metricBig || '')}</span>
          <span class="metric-desc">${escapeHTML(item.metricDesc || '')}</span>
        </div>
        <div class="case-footer">
          <span class="anon">${escapeHTML(item.sector || '')}</span>
          <p class="problem">${escapeHTML(item.problem || '')}</p>
        </div>
      </article>
    `;
  }

  async function render() {
    // Use a scoped selector so we don't accidentally fill the KH preview grid
    // that also uses .case-grid further down the home page.
    const grid = document.querySelector('#cases .case-grid');
    if (!grid) return;
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data && data.items) ? data.items : [];
      grid.innerHTML = items.map(renderCard).join('');

      if (window.Galent && typeof window.Galent.persistentReveal === 'function') {
        try { window.Galent.persistentReveal(); } catch (_) {}
      }
    } catch (err) {
      console.error('[CasesCMS] Failed to load cases:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
