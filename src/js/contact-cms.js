/* Galent — Contact page renderer.
 * Reads content/contact.json. Fills hero copy, the three channels and
 * the office grid. Editor changes via /admin/ → Contact page.
 */
(function () {
  if (!document.body || document.body.dataset.page !== 'contact') return;
  const CONTENT_URL = 'content/contact.json';

  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitiseInline(value) {
    if (value == null) return '';
    return String(value).replace(/<(\/?)(script|iframe|object|embed)\b[^>]*>/gi, '');
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function fillStaticBindings(data) {
    document.querySelectorAll('[data-cms]').forEach((el) => {
      const path = el.getAttribute('data-cms');
      const value = getByPath(data, path);
      if (value == null) return;
      // Title-like fields may carry inline <em> accents; preserve them
      if (/title|lead|footnote/i.test(path)) {
        el.innerHTML = sanitiseInline(value);
      } else {
        el.textContent = String(value);
      }
    });
  }

  const ICON = {
    email: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>',
    leadership: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>',
    fde: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l-5 7 5 7M16 5l5 7-5 7"/><path d="M14 4l-4 16"/></svg>'
  };

  const TINT = ['p', 'g', 'o'];

  function renderChannel(item, i) {
    const tint = TINT[i % TINT.length];
    const icon = ICON[item.kind] || ICON.email;
    const href = escapeHTML(item.href || '#');
    const label = escapeHTML(item.label || '');
    const value = escapeHTML(item.value || '');
    const subtext = escapeHTML(item.subtext || '');
    return `
      <a class="contact-card contact-card--${tint}" href="${href}">
        <span class="contact-card__icon" aria-hidden="true">${icon}</span>
        <span class="contact-card__label">${label}</span>
        <h3 class="contact-card__value">${value}</h3>
        <p class="contact-card__subtext">${subtext}</p>
        <span class="contact-card__arr" aria-hidden="true">→</span>
      </a>
    `;
  }

  function renderOffice(item, i) {
    const tint = TINT[i % TINT.length];
    const city = escapeHTML(item.city || '');
    const label = escapeHTML(item.label || '');
    const lines = Array.isArray(item.lines) ? item.lines : [];
    const linesHtml = lines.map((ln) => `<span>${escapeHTML(ln)}</span>`).join('');
    return `
      <article class="office-card office-card--${tint}">
        <span class="office-card__label">${label}</span>
        <h3 class="office-card__city">${city}</h3>
        <address class="office-card__address">${linesHtml}</address>
      </article>
    `;
  }

  async function render() {
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      fillStaticBindings(data);

      const channels = document.querySelector('.contact-channels');
      if (channels && Array.isArray(data.channels)) {
        channels.innerHTML = data.channels.map(renderChannel).join('');
      }

      const offices = document.querySelector('.contact-offices');
      if (offices && Array.isArray(data.offices)) {
        offices.innerHTML = data.offices.map(renderOffice).join('');
      }

      if (window.Galent && typeof window.Galent.persistentReveal === 'function') {
        try { window.Galent.persistentReveal(); } catch (_) {}
      }
    } catch (err) {
      console.error('[ContactCMS] Failed to load:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
