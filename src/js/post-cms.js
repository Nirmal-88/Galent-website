/* Galent — Markdown post renderer.
 *
 * URL: /post.html?slug=<slug>
 * Fetches /content/posts/<slug>.md, parses the YAML front-matter,
 * renders the body via marked.js, and fills the page template.
 */
(function () {
  if (!document.body || document.body.dataset.page !== 'post') return;

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('slug') || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // Tiny YAML front-matter parser — handles strings, numbers and one-line lists.
  // Supports both quoted ("foo") and unquoted (foo) values.
  function parseFrontMatter(raw) {
    const out = { _body: raw };
    if (!raw.startsWith('---')) return out;
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return out;
    const fmBlock = raw.slice(3, end).trim();
    const body = raw.slice(end + 4).replace(/^\s+/, '');
    out._body = body;
    fmBlock.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!m) return;
      let key = m[1];
      let value = m[2].trim();
      // strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    });
    return out;
  }

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showNotFound(slug) {
    const titleEl = document.querySelector('.post-title');
    const bodyEl = document.querySelector('.post-body');
    const excerptEl = document.querySelector('.post-excerpt');
    const meta = document.querySelector('.post-meta');
    if (titleEl) titleEl.textContent = 'Post not found.';
    if (excerptEl) excerptEl.textContent = '';
    if (meta) meta.style.display = 'none';
    if (bodyEl) {
      bodyEl.innerHTML = `
        <p>We couldn't find a post called <code>${escapeHTML(slug)}</code>.</p>
        <p>Head back to the <a href="knowledge-hub.html">Knowledge Hub</a> to browse what's published, or <a href="contact.html">drop us a line</a> if you think this is a broken link.</p>
      `;
    }
    document.title = 'Not found — Galent';
  }

  async function render() {
    const slug = getSlug();
    if (!slug) { showNotFound('(missing)'); return; }

    try {
      const res = await fetch(`content/posts/${slug}.md`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      const data = parseFrontMatter(raw);

      const title = data.title || 'Untitled';
      document.title = `${title} — Galent`;
      const desc = data.excerpt || '';
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', desc);

      const titleEl = document.querySelector('.post-title');
      const excerptEl = document.querySelector('.post-excerpt');
      const kindEl = document.querySelector('.post-kind');
      const lengthEl = document.querySelector('.post-length');
      const authorEl = document.querySelector('.post-author');
      const bodyEl = document.querySelector('.post-body');

      if (titleEl) titleEl.textContent = title;
      if (excerptEl) excerptEl.textContent = desc;
      if (kindEl) kindEl.textContent = (data.kind || 'ESSAY').toUpperCase();
      if (lengthEl) lengthEl.textContent = data.length || '';
      if (authorEl) authorEl.textContent = data.author || '';

      // Banner image — try the matching Knowledge Hub card first (bannerImage),
      // fall back to a coverImage on the post front-matter for older posts.
      let bannerSrc = data.coverImage || '';
      try {
        const hubRes = await fetch('content/knowledge.json', { cache: 'no-store' });
        if (hubRes.ok) {
          const hub = await hubRes.json();
          const items = Array.isArray(hub && hub.items) ? hub.items : [];
          const match = items.find((it) => {
            const href = String(it.href || '');
            return href.indexOf('post.html?slug=' + slug) !== -1;
          });
          if (match && match.bannerImage) bannerSrc = match.bannerImage;
        }
      } catch (_) { /* non-fatal: fall back to coverImage or none */ }

      if (bannerSrc) {
        const header = document.querySelector('.post-header');
        if (header && !header.querySelector('.post-cover')) {
          const cover = document.createElement('div');
          cover.className = 'post-cover';
          // Blurred backdrop fills the banner area; the real image sits on top
          // shown in full (object-fit: contain) so it is never cropped.
          cover.innerHTML = `<img class="cover-fill" src="${escapeHTML(bannerSrc)}" alt="" aria-hidden="true" loading="eager"><img class="cover-img" src="${escapeHTML(bannerSrc)}" alt="${escapeHTML(title)}" loading="eager">`;
          header.insertBefore(cover, header.firstChild);
        }
      }

      // Render Markdown body via marked.js
      if (bodyEl && window.marked) {
        // Configure marked to be safe-ish — escape raw HTML
        const html = window.marked.parse(data._body || '', { breaks: true });
        bodyEl.innerHTML = html;
      } else if (bodyEl) {
        bodyEl.innerHTML = `<pre style="white-space:pre-wrap;">${escapeHTML(data._body || '')}</pre>`;
      }
    } catch (err) {
      console.error('[PostCMS] Failed to load:', err);
      showNotFound(slug);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
