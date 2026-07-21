/* Galent Knowledge Hub — content-driven CMS layer.
 *
 * Content lives in /content/knowledge.json. This module fetches that JSON
 * on page load, renders the cards into the existing tab panels, then wires
 * up the tab switching and search/filter behaviour.
 *
 * Editing flow:
 *   1. Edit content/knowledge.json (locally or via GitHub web editor)
 *   2. Commit + push
 *   3. Vercel redeploys, page reflects the change
 *
 * No build step, no auth, no framework. Vanilla JS.
 */
(function () {
  const HubCMS = {};
  const CONTENT_URL = 'content/knowledge.json';

  /* ------------------------------------------------------------------
   * Renderers
   * ------------------------------------------------------------------ */
  function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderThumb(item) {
    const style = escapeHTML(item.thumbStyle || 'alt-1');
    const hasImage = !!(item.cardImage && String(item.cardImage).trim());
    const runtime = item.runtime ? `<div class="runtime">${escapeHTML(item.runtime)}</div>` : '';
    if (hasImage) {
      // When a card image is uploaded, show it edge-to-edge inside the thumb.
      const img = escapeHTML(item.cardImage);
      const playOverlay = item.category === 'videocasts'
        ? `<div class="play-btn">▶</div>${runtime}`
        : '';
      // Two layers: a blurred backdrop that fills the box, plus the real
      // image shown in full (object-fit: contain) so nothing is cropped.
      return `<div class="card-thumb has-image ${style}"><img class="thumb-fill" src="${img}" alt="" aria-hidden="true" loading="lazy"><img class="thumb-img" src="${img}" alt="" loading="lazy">${playOverlay}</div>`;
    }
    if (item.category === 'videocasts') {
      return `<div class="card-thumb ${style}"><div class="play-btn">▶</div>${runtime}</div>`;
    }
    // No image → just a clean coloured tile (no glyph).
    return `<div class="card-thumb ${style}"></div>`;
  }

  function renderCard(item, index, ctaLabel) {
    const delay = index === 0 ? '' : ` style="transition-delay:${(index * 0.06).toFixed(2)}s"`;
    const length = item.length ? `<span>${escapeHTML(item.length)}</span>` : '';
    const author = item.author ? `<span>${escapeHTML(item.author)}</span>` : '';
    const domainTag = item.domain
      ? `<span class="domain-tag ${escapeHTML(item.domain)}">${escapeHTML(item.domain).toUpperCase()}</span>`
      : '';
    return `
      <a class="card-item" href="${escapeHTML(item.href || '#')}" data-reveal${delay}>
        ${renderThumb(item)}
        <div class="card-body">
          <div class="card-meta">
            ${domainTag}
            <span class="category">${escapeHTML(item.kind || '')}</span>
            ${length}
            ${author}
          </div>
          <h3>${escapeHTML(item.title || 'Untitled')}</h3>
          <p class="excerpt">${escapeHTML(item.excerpt || '')}</p>
          <span class="card-cta">${escapeHTML(ctaLabel)} <span class="arr">→</span></span>
        </div>
      </a>
    `;
  }

  // How many cards to show per page within a panel before paginating.
  const PAGE_SIZE = 8;

  function renderPanel(panel, items, ctaLabel) {
    const grid = panel.querySelector('.card-grid');
    if (!grid) return;
    // Empty categories simply render nothing (no "Nothing here yet" notice).
    grid.innerHTML = items.length
      ? items.map((item, i) => renderCard(item, i, ctaLabel)).join('')
      : '';
    paginatePanel(panel);
  }

  // Build (or rebuild) the pager for a panel and show its first page.
  function paginatePanel(panel) {
    if (!panel) return;
    const grid = panel.querySelector('.card-grid');
    if (!grid) return;
    const existing = panel.querySelector('.hub-pager');
    if (existing) existing.remove();

    const cards = Array.prototype.slice.call(grid.querySelectorAll('.card-item'));
    if (cards.length <= PAGE_SIZE) {
      cards.forEach((c) => { c.style.display = ''; });
      panel._page = 1;
      return;
    }

    const totalPages = Math.ceil(cards.length / PAGE_SIZE);
    const pager = document.createElement('div');
    pager.className = 'hub-pager';
    let html = '<button class="hub-page-btn" data-page="prev" aria-label="Previous page">←</button>';
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="hub-page-btn" data-page="${p}">${p}</button>`;
    }
    html += '<button class="hub-page-btn" data-page="next" aria-label="Next page">→</button>';
    pager.innerHTML = html;
    grid.parentNode.insertBefore(pager, grid.nextSibling);

    pager.addEventListener('click', (e) => {
      const btn = e.target.closest('.hub-page-btn');
      if (!btn) return;
      const cur = panel._page || 1;
      let target = btn.getAttribute('data-page');
      if (target === 'prev') target = Math.max(1, cur - 1);
      else if (target === 'next') target = Math.min(totalPages, cur + 1);
      else target = parseInt(target, 10);
      showPage(panel, target);
    });

    showPage(panel, 1);
  }

  function showPage(panel, page) {
    const grid = panel.querySelector('.card-grid');
    if (!grid) return;
    const cards = Array.prototype.slice.call(grid.querySelectorAll('.card-item'));
    const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);
    panel._page = page;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    cards.forEach((c, i) => { c.style.display = (i >= start && i < end) ? '' : 'none'; });
    const pager = panel.querySelector('.hub-pager');
    if (pager) {
      pager.querySelectorAll('.hub-page-btn').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-page') === String(page));
      });
    }
  }

  HubCMS.showPage = showPage;
  HubCMS.paginatePanel = paginatePanel;

  function updateTabCount(targetId, count) {
    const tab = document.querySelector(`.hub-tab[data-target="${targetId}"]`);
    if (!tab) return;
    const counter = tab.querySelector('.count');
    if (counter) counter.textContent = String(count);
  }

  // Normalise categories to a list of { id, label, ctaLabel } — supports both
  // the new array form and the legacy object map.
  function normaliseCategories(input) {
    if (Array.isArray(input)) {
      return input
        .filter((c) => c && c.id)
        .map((c) => ({
          id: String(c.id),
          label: c.label || c.id,
          ctaLabel: c.ctaLabel || 'Read',
        }));
    }
    if (input && typeof input === 'object') {
      return Object.keys(input).map((id) => ({
        id,
        label: (input[id] && input[id].label) || id,
        ctaLabel: (input[id] && input[id].ctaLabel) || 'Read',
      }));
    }
    return [];
  }

  // Build the tab bar + panel containers from the categories list.
  // The "All" tab is always present and selected by default.
  function buildShell(categories) {
    const tabsHost = document.querySelector('.hub-tabs');
    const panelsHost = document.querySelector('.hub-panels');
    if (!tabsHost || !panelsHost) return;

    const totalAll = categories.reduce((sum, c) => sum + (c._count || 0), 0);

    // Tabs — "All" first, then one per category
    const tabsHTML = [
      `<button class="hub-tab active" data-target="panel-all" role="tab" aria-selected="true" aria-controls="panel-all" tabindex="0">All <span class="count">${totalAll}</span></button>`,
    ].concat(
      categories.map(
        (c) =>
          `<button class="hub-tab" data-target="panel-${escapeHTML(c.id)}" role="tab" aria-selected="false" aria-controls="panel-${escapeHTML(c.id)}" tabindex="0">${escapeHTML(c.label)} <span class="count">${c._count || 0}</span></button>`
      )
    );
    tabsHost.innerHTML = tabsHTML.join('');

    // Panels — one per category, each with an empty card-grid the
    // existing rendering pipeline fills below.
    panelsHost.innerHTML = categories
      .map(
        (c) =>
          `<div class="hub-panel" id="panel-${escapeHTML(c.id)}" role="tabpanel" aria-hidden="true"><h3 class="hub-cat-title">${escapeHTML(c.label)}</h3><div class="card-grid"></div></div>`
      )
      .join('');
  }

  // Normalise an editor-typed category value to its slug form so
  // "Case Study", "case study", "Case-Study" all match "case-study".
  function slugifyCategory(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /* Hero "running slides" — a clickable, cross-fading slideshow of the latest
   * posts' card images. Driven by the same knowledge.json as the grid, so it
   * auto-updates on add/edit/delete. Only items that have a card image and a
   * link are shown; falls back to the static markup if there are none. */
  let heroTimer = null;
  HubCMS.renderHeroStack = function (items) {
    const host = document.querySelector('[data-kh-slides]');
    if (!host) return;
    const list = (Array.isArray(items) ? items : []).filter((it) => it && it.cardImage && it.href);
    if (!list.length) return; // keep the static fallback markup

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slides = list.slice(0, 8); // newest first (array order)

    host.innerHTML = slides.map((it, i) => {
      const img = escapeHTML(it.cardImage);
      const kind = escapeHTML(it.kind || '');
      const title = escapeHTML(it.title || '');
      const href = escapeHTML(it.href);
      return `<a class="kh-slide${i === 0 ? ' is-active' : ''}" href="${href}" aria-label="${title}">`
        + `<img src="${img}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}">`
        + `<span class="kh-slide__veil" aria-hidden="true"></span>`
        + `<span class="kh-slide__cap"><b class="kh-slide__kind">${kind}</b>${title}</span>`
        + `</a>`;
    }).join('');

    const els = Array.prototype.slice.call(host.querySelectorAll('.kh-slide'));

    // Size the card to the active image's own aspect ratio — fills exactly,
    // so the banner is never cropped and there's no empty letterbox space.
    const sizeTo = (el) => {
      const img = el && el.querySelector('img');
      if (!img) return;
      const apply = () => {
        if (img.naturalWidth && img.naturalHeight) {
          host.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
        }
      };
      if (img.complete) apply(); else img.addEventListener('load', apply, { once: true });
    };
    sizeTo(els[0]);

    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    if (!reduce && els.length > 1) {
      let active = 0;
      heroTimer = setInterval(() => {
        els[active].classList.remove('is-active');
        active = (active + 1) % els.length;
        els[active].classList.add('is-active');
        sizeTo(els[active]);
      }, 4500);
    }
  };

  HubCMS.render = function (data) {
    const categories = normaliseCategories(data && data.categories);
    const items = Array.isArray(data && data.items) ? data.items : [];
    const knownIds = new Set(categories.map((c) => slugifyCategory(c.id)));

    // Group items by category id (lenient match)
    const grouped = {};
    items.forEach((item) => {
      const raw = item.category || 'other';
      const cat = slugifyCategory(raw);
      // If the slugified value matches a known category, use that.
      // Otherwise still group under the raw value so unmatched items don't disappear silently.
      const key = knownIds.has(cat) ? cat : raw;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    // Decorate categories with their item counts (used by the shell builder)
    categories.forEach((c) => {
      c._count = (grouped[c.id] || []).length;
    });

    // Build tabs + empty panels (or update counts if shell already there)
    buildShell(categories);

    // Render each panel's cards
    categories.forEach((c) => {
      const panel = document.getElementById(`panel-${c.id}`);
      if (!panel) return;
      const list = grouped[c.id] || [];
      renderPanel(panel, list, c.ctaLabel);
    });

    // Hero "running slides" — newest items into the angled stack, auto-cycled.
    HubCMS.renderHeroStack(items);

    // Re-trigger reveal animation on freshly inserted cards
    if (window.Galent && typeof window.Galent.persistentReveal === 'function') {
      try { window.Galent.persistentReveal(); } catch (_) { /* no-op */ }
    } else {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in'));
    }
  };

  /* ------------------------------------------------------------------
   * Tabs + search (preserved from the previous cms.js)
   * ------------------------------------------------------------------ */
  HubCMS.initTabs = function () {
    const tabs = document.querySelectorAll('.hub-tab');
    const panels = document.querySelectorAll('.hub-panel');
    if (!tabs.length) return;

    function activate(target) {
      tabs.forEach((t) => {
        const on = t.dataset.target === target;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const showAll = target === 'panel-all';
      panels.forEach((p) => {
        const on = showAll || p.id === target;
        p.classList.toggle('active', on);
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      const input = document.querySelector('.hub-search input');
      if (input && input.value) HubCMS.applyFilter(input.value);
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab.dataset.target));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(tab.dataset.target);
        }
      });
    });

    const initial = document.querySelector('.hub-tab.active');
    if (initial) activate(initial.dataset.target);
  };

  HubCMS.initSearch = function () {
    const input = document.querySelector('.hub-search input');
    if (!input) return;
    input.addEventListener('input', () => HubCMS.applyFilter(input.value));
  };

  HubCMS.applyFilter = function (query) {
    const q = (query || '').trim().toLowerCase();
    const activePanels = document.querySelectorAll('.hub-panel.active');
    if (!activePanels.length) return;

    activePanels.forEach((active) => {
      const cards = active.querySelectorAll('.card-item');
      const pager = active.querySelector('.hub-pager');

      // No query → restore the paginated view for this panel.
      if (!q) {
        if (pager) { pager.style.display = ''; showPage(active, active._page || 1); }
        else cards.forEach((card) => { card.style.display = ''; });
        const emptyEl = active.querySelector('.hub-empty');
        if (emptyEl) emptyEl.style.display = 'none';
        return;
      }

      // Searching → ignore pagination, match across the whole section.
      if (pager) pager.style.display = 'none';
      let visible = 0;
      cards.forEach((card) => {
        const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const excerpt = (card.querySelector('.excerpt')?.textContent || '').toLowerCase();
        const meta = (card.querySelector('.card-meta')?.textContent || '').toLowerCase();
        const match = title.includes(q) || excerpt.includes(q) || meta.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      let empty = active.querySelector('.hub-empty');
      if (!visible && q) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'hub-empty';
          empty.innerHTML = `<strong>No results in this section.</strong>Try a different keyword, or switch tabs above.`;
          active.appendChild(empty);
        }
        empty.style.display = '';
      } else if (empty && !q) {
        empty.style.display = 'none';
      }
    });
  };

  /* ------------------------------------------------------------------
   * Init — fetch content, then wire UI
   * ------------------------------------------------------------------ */
  HubCMS.init = async function () {
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      HubCMS.render(data);
    } catch (err) {
      console.error('[HubCMS] Failed to load content:', err);
      const panelsHost = document.querySelector('.hub-panels');
      if (panelsHost) {
        panelsHost.innerHTML = `<div class="hub-panel active"><div class="card-grid"><div class="hub-empty" style="display:block;"><strong>Couldn't load content.</strong>Check <code>content/knowledge.json</code> for syntax errors.</div></div></div>`;
      }
    }
    // Tabs + search wired AFTER render() builds the shell
    HubCMS.initTabs();
    HubCMS.initSearch();
  };

  window.HubCMS = HubCMS;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', HubCMS.init);
  } else {
    HubCMS.init();
  }
})();
