/* Galent — post renderer.
 *
 * URL: /post.html?slug=<slug>
 * Queries Sanity for the matching post and fills the page template,
 * rendering the Portable Text body via window.Sanity.toHTML.
 *
 * The banner used to be looked up from the post's Knowledge Hub card in a
 * second request, because Decap kept the card and the essay in separate files.
 * In Sanity they are one document, so the single query below returns both.
 */
(function () {
  if (!document.body || document.body.dataset.page !== 'post') return;

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('slug') || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /* One document, one request. Drafts are excluded so an unpublished post is
   * not readable by anyone who guesses its slug on a public dataset. */
  const POST_QUERY = `*[
    _type == "post"
    && slug.current == $slug
    && !(_id in path("drafts.**"))
  ][0]{
    title,
    excerpt,
    kind,
    length,
    author,
    embedUrl,
    embedTitle,
    "bannerImage": bannerImage.asset->url,
    body[]{
      ...,
      _type == "image" => { ..., "url": asset->url }
    }
  }`;

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Hosts we're willing to embed, once the URL is already in its player form.
  // Anything not on this list is dropped rather than rendered.
  const EMBED_HOSTS = [
    'youtube-nocookie.com', 'player.vimeo.com', 'loom.com', 'fast.wistia.net',
    'open.spotify.com', 'podcasters.spotify.com', 'w.soundcloud.com',
    'anchor.fm', 'docs.google.com', 'drive.google.com', 'players.brightcove.net',
  ];

  // Turn whatever the editor pasted into a player URL we trust, or '' to skip.
  // Accepts a plain share link or a full <iframe> tag — in both cases we keep
  // only the URL and build our own tag, so pasted attributes can never ride along.
  function embedSrc(input) {
    let raw = String(input || '').trim();
    if (!raw) return '';

    const tag = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
    if (tag) raw = tag[1].trim();
    if (raw.indexOf('//') === 0) raw = 'https:' + raw;

    let u;
    try { u = new URL(raw); } catch (_) { return ''; }
    if (u.protocol !== 'https:') return '';

    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const isId = (s) => /^[\w-]{6,}$/.test(s || '');

    // Normalise the share-link shapes people actually copy.
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return isId(id) ? 'https://www.youtube-nocookie.com/embed/' + id : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (isId(v)) return 'https://www.youtube-nocookie.com/embed/' + v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
      return m && isId(m[1]) ? 'https://www.youtube-nocookie.com/embed/' + m[1] : '';
    }
    if (host === 'vimeo.com') {
      const m = u.pathname.match(/^\/(?:video\/)?(\d+)/);
      return m ? 'https://player.vimeo.com/video/' + m[1] : '';
    }

    return EMBED_HOSTS.indexOf(host) === -1 ? '' : u.href;
  }

  // Responsive 16:9 player, optionally captioned.
  function buildEmbed(input, caption) {
    if (!String(input || '').trim()) return '';
    const src = embedSrc(input);
    if (!src) {
      console.warn('[PostCMS] Unsupported embed, skipped:', input);
      return '';
    }
    const cap = String(caption || '').trim();
    return '<figure class="post-embed">' +
      '<div class="post-embed-frame">' +
        '<iframe src="' + escapeHTML(src) + '"' +
          ' title="' + escapeHTML(cap || 'Embedded media') + '"' +
          ' loading="lazy" referrerpolicy="strict-origin-when-cross-origin"' +
          ' allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"' +
          ' allowfullscreen></iframe>' +
      '</div>' +
      (cap ? '<figcaption>' + escapeHTML(cap) + '</figcaption>' : '') +
    '</figure>';
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
      if (!window.Sanity) throw new Error('js/sanity.js did not load');
      const data = await window.Sanity.query(POST_QUERY, { slug });
      if (!data) { showNotFound(slug); return; }

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

      // Length and author are optional, so drop any separator dot that would
      // dangle without a value on both sides of it.
      const metaEl = document.querySelector('.post-meta');
      if (metaEl) {
        const parts = Array.from(metaEl.children);
        const isDot = (el) => el.classList.contains('post-dot');
        const values = parts.filter((el) => !isDot(el));
        const dots = parts.filter(isDot);
        values.forEach((el) => { el.style.display = el.textContent.trim() ? '' : 'none'; });
        // n visible values need n-1 separators; hidden values collapse, so
        // showing the first n-1 dots always lands them in the right gaps.
        const needed = Math.max(0, values.filter((el) => el.textContent.trim()).length - 1);
        dots.forEach((d, i) => { d.style.display = i < needed ? '' : 'none'; });
      }

      // Banner image — part of the same document, so no second request.
      const bannerSrc = data.bannerImage
        ? window.Sanity.imageUrl(data.bannerImage, { width: 1600 })
        : '';

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

      // Optional video / embed, shown above the article body.
      const embedHTML = buildEmbed(data.embedUrl, data.embedTitle);

      // Render the Portable Text body.
      if (bodyEl) {
        bodyEl.innerHTML = embedHTML + window.Sanity.toHTML(data.body);
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
