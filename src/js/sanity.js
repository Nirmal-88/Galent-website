/* Galent — Sanity data layer.
 *
 * Two jobs:
 *   1. Run GROQ queries against the Sanity CDN straight from the browser.
 *   2. Turn Portable Text into HTML.
 *
 * There is no build step on this site, so this is deliberately dependency-free
 * vanilla JS rather than @sanity/client + @portabletext/to-html.
 *
 * Reads go to apicdn.sanity.io, which is a cache that Sanity invalidates when
 * content is published — so an edit in the Studio shows up on the site within
 * seconds, with no redeploy. That is the main practical difference from the
 * old Decap setup, where publishing meant a Git commit and a ~1 minute Vercel
 * rebuild.
 *
 * Exposes window.Sanity = { query, imageUrl, toHTML, escapeHTML }.
 */
(function () {
  const Sanity = {};

  function config() {
    const cfg = window.SANITY_CONFIG || {};
    if (!cfg.projectId || cfg.projectId === 'REPLACE_WITH_PROJECT_ID') {
      throw new Error(
        'Sanity is not configured — set projectId in js/sanity-config.js (see migration/README.md).'
      );
    }
    return cfg;
  }

  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  Sanity.escapeHTML = escapeHTML;

  /* ------------------------------------------------------------------
   * Query
   * ------------------------------------------------------------------ */

  /**
   * Run a GROQ query. Params are JSON-encoded per the HTTP API contract.
   *
   *   await Sanity.query('*[_type=="post" && slug.current==$slug][0]', {slug})
   */
  Sanity.query = async function (groq, params) {
    const cfg = config();
    const search = new URLSearchParams({ query: groq });
    Object.keys(params || {}).forEach((key) => {
      search.set('$' + key, JSON.stringify(params[key]));
    });

    const url =
      'https://' + cfg.projectId + '.apicdn.sanity.io/v' + cfg.apiVersion +
      '/data/query/' + encodeURIComponent(cfg.dataset) + '?' + search.toString();

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body && body.error && body.error.description ? ' — ' + body.error.description : '';
      } catch (_) { /* response wasn't JSON; the status code is enough */ }
      throw new Error('Sanity query failed: HTTP ' + res.status + detail);
    }
    const json = await res.json();
    return json.result;
  };

  /**
   * Add Sanity's image transform params to an asset URL.
   * Passing width/height keeps the CDN doing the resizing rather than shipping
   * a 3MB original and letting the browser scale it down.
   */
  Sanity.imageUrl = function (url, opts) {
    if (!url) return '';
    const o = opts || {};
    const params = [];
    if (o.width) params.push('w=' + o.width);
    if (o.height) params.push('h=' + o.height);
    if (o.quality) params.push('q=' + o.quality);
    params.push('auto=format');
    return url + (url.indexOf('?') === -1 ? '?' : '&') + params.join('&');
  };

  /* ------------------------------------------------------------------
   * Portable Text -> HTML
   * ------------------------------------------------------------------ */

  const STYLE_TAG = {
    normal: 'p',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    blockquote: 'blockquote',
  };

  const DECORATOR_TAG = {
    strong: 'strong',
    em: 'em',
    code: 'code',
    'strike-through': 's',
  };

  /* Render one span's text wrapped in its marks. Marks are either decorators
   * (a known key like "strong") or a reference to a markDef in the same block
   * (currently only links). Unknown marks are ignored rather than dropped
   * along with their text. */
  function renderSpan(span, markDefs) {
    let html = escapeHTML(span.text || '');
    const marks = span.marks || [];

    // Applied innermost-first so nesting order matches the author's intent.
    for (let i = marks.length - 1; i >= 0; i--) {
      const mark = marks[i];
      const tag = DECORATOR_TAG[mark];
      if (tag) {
        html = '<' + tag + '>' + html + '</' + tag + '>';
        continue;
      }
      const def = (markDefs || []).find((d) => d._key === mark);
      if (def && def._type === 'link' && def.href) {
        const href = String(def.href);
        // Only http(s), mailto and tel are allowed through, so a javascript:
        // URL saved in the CMS can never become a live link.
        if (/^(https?:|mailto:|tel:)/i.test(href)) {
          const external = /^https?:/i.test(href) && href.indexOf('galent.com') === -1;
          html =
            '<a href="' + escapeHTML(href) + '"' +
            (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
            '>' + html + '</a>';
        }
      }
    }
    return html;
  }

  function renderChildren(block) {
    return (block.children || [])
      .map((child) => renderSpan(child, block.markDefs))
      .join('');
  }

  function renderTextBlock(block) {
    const tag = STYLE_TAG[block.style] || 'p';
    const inner = renderChildren(block);
    if (!inner.trim()) return '';
    return '<' + tag + '>' + inner + '</' + tag + '>';
  }

  function renderImage(block) {
    const url = block.url || (block.asset && block.asset.url);
    if (!url) return '';
    const alt = escapeHTML(block.alt || '');
    const caption = block.caption ? '<figcaption>' + escapeHTML(block.caption) + '</figcaption>' : '';
    const isAvatar = block.variant === 'avatar';
    return (
      '<figure class="post-figure' + (isAvatar ? ' is-avatar' : '') + '">' +
      '<img src="' + escapeHTML(Sanity.imageUrl(url, { width: isAvatar ? 256 : 1200 })) + '"' +
      ' alt="' + alt + '" loading="lazy">' +
      caption +
      '</figure>'
    );
  }

  function renderTable(block) {
    const rows = block.rows || [];
    if (!rows.length) return '';
    const headerRows = typeof block.headerRows === 'number' ? block.headerRows : 1;
    const cell = (text, isHeader) => {
      const tag = isHeader ? 'th' : 'td';
      return '<' + tag + '>' + escapeHTML(text) + '</' + tag + '>';
    };
    let head = '';
    let body = '';
    rows.forEach((row, i) => {
      const cells = (row.cells || []).map((c) => cell(c, i < headerRows)).join('');
      const tr = '<tr>' + cells + '</tr>';
      if (i < headerRows) head += tr;
      else body += tr;
    });
    return (
      '<div class="post-table-wrap"><table class="post-table">' +
      (head ? '<thead>' + head + '</thead>' : '') +
      (body ? '<tbody>' + body + '</tbody>' : '') +
      '</table></div>'
    );
  }

  /**
   * Portable Text array -> HTML string.
   *
   * List items arrive as a flat sequence of blocks that each carry `listItem`
   * and `level`, so consecutive items of the same kind and depth are grouped
   * back into a single <ul>/<ol> here.
   */
  Sanity.toHTML = function (blocks) {
    if (!Array.isArray(blocks)) return '';
    let html = '';
    let i = 0;

    while (i < blocks.length) {
      const block = blocks[i];
      if (!block || !block._type) { i++; continue; }

      if (block._type === 'image') { html += renderImage(block); i++; continue; }
      if (block._type === 'table') { html += renderTable(block); i++; continue; }
      if (block._type === 'divider') { html += '<hr class="post-rule">'; i++; continue; }

      if (block._type !== 'block') { i++; continue; }

      if (block.listItem) {
        const kind = block.listItem;
        const level = block.level || 1;
        const tag = kind === 'number' ? 'ol' : 'ul';
        let items = '';
        while (
          i < blocks.length &&
          blocks[i] &&
          blocks[i]._type === 'block' &&
          blocks[i].listItem === kind &&
          (blocks[i].level || 1) === level
        ) {
          items += '<li>' + renderChildren(blocks[i]) + '</li>';
          i++;
        }
        html += '<' + tag + '>' + items + '</' + tag + '>';
        continue;
      }

      html += renderTextBlock(block);
      i++;
    }

    return html;
  };

  /** Plain text of a Portable Text array — used for meta descriptions. */
  Sanity.toPlainText = function (blocks) {
    if (!Array.isArray(blocks)) return '';
    return blocks
      .filter((b) => b && b._type === 'block')
      .map((b) => (b.children || []).map((c) => c.text || '').join(''))
      .join('\n\n');
  };

  window.Sanity = Sanity;
})();
