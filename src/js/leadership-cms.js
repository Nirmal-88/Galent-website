/* Galent About — Leadership renderer.
 * Reads src/content/leadership.json and renders the team cards into the
 * .leadership-grid container. Editor changes via /admin/ → repo → Vercel
 * redeploy → live page reflects.
 */
(function () {
  const CONTENT_URL = 'content/leadership.json';

  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    // Attribute values get the same treatment as HTML.
    return escapeHTML(value);
  }

  function renderCard(item) {
    const name = escapeHTML(item.name || '');
    const role = escapeHTML(item.role || '');
    const bio = escapeHTML(item.bio || '');
    const photo = escapeAttr(item.photo || '');
    const alt = escapeAttr(item.alt || `${item.name || 'Leader'}, ${item.role || ''}`.trim());
    const url = escapeAttr(item.connectUrl || '#');
    return `
      <article class="leader-card">
        <div class="leader-photo">
          <img src="${photo}" alt="${alt}" loading="lazy">
        </div>
        <div class="leader-body">
          <h3>${name}</h3>
          <span class="role">${role}</span>
          <p>${bio}</p>
          <a class="leader-cta" href="${url}" target="_blank" rel="noopener">Connect <span class="arr">→</span></a>
        </div>
      </article>
    `;
  }

  async function render() {
    const grid = document.querySelector('.leadership-grid');
    if (!grid) return; // No leadership section on this page.
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data && data.items) ? data.items : [];
      grid.innerHTML = items.map(renderCard).join('');

      // Re-trigger reveal animation on newly inserted cards
      if (window.Galent && typeof window.Galent.persistentReveal === 'function') {
        try { window.Galent.persistentReveal(); } catch (_) {}
      } else {
        grid.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in'));
      }
    } catch (err) {
      console.error('[LeadershipCMS] Failed to load leadership content:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
