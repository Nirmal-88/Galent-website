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
      return `<div class="card-thumb has-image ${style}"><img src="${img}" alt="" loading="lazy">${playOverlay}</div>`;
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

  function renderPanel(panel, items, ctaLabel) {
    const grid = panel.querySelector('.card-grid');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = `<div class="hub-empty" style="display:block;"><strong>Nothing here yet.</strong>Add an item to <code>content/knowledge.json</code>.</div>`;
      return;
    }
    grid.innerHTML = items.map((item, i) => renderCard(item, i, ctaLabel)).join('');
  }

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
          `<div class="hub-panel" id="panel-${escapeHTML(c.id)}" role="tabpanel" aria-hidden="true"><div class="card-grid"></div></div>`
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

  /* Hero "running slides" — fills the angled .kh-stack tiles from the newest
   * knowledge items and cycles through all of them. Driven by the same
   * knowledge.json as the grid, so it auto-updates on add/edit/delete.
   * The hero visual is aria-hidden, so this is purely decorative. */
  let heroTimer = null;
  HubCMS.renderHeroStack = function (items) {
    const stack = document.querySelector('.kh-hero-visual .kh-stack');
    if (!stack) return;
    const tiles = Array.prototype.slice.call(stack.querySelectorAll('.kh-tile'));
    if (!tiles.length) return;
    const list = (Array.isArray(items) ? items : []).filter((it) => it && it.title);
    if (!list.length) return; // keep the static fallback markup

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kindOf = (it) => {
      const k = String(it.kind || '').trim();
      const len = String(it.length || '').trim();
      return len ? `${k} · ${len}` : k;
    };
    const metaOf = (it) => String(it.author || '').replace(/^by\s+/i, '').trim();
    const fill = (offset) => {
      tiles.forEach((tile, i) => {
        const it = list[(offset + i) % list.length];
        const kindEl = tile.querySelector('.kh-tile-kind');
        const titleEl = tile.querySelector('h4');
        const metaEl = tile.querySelector('.kh-tile-meta');
        if (kindEl) kindEl.textContent = kindOf(it);
        if (titleEl) titleEl.textContent = it.title;
        if (metaEl) metaEl.textContent = metaOf(it);
      });
    };

    fill(0);
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    // Only "run" through the catalogue when there's more than fits the stack.
    if (!reduce && list.length > tiles.length) {
      let offset = 0;
      tiles.forEach((t) => { t.style.transition = 'opacity 0.5s ease'; });
      heroTimer = setInterval(() => {
        offset = (offset + 1) % list.length;
        tiles.forEach((t) => { t.style.opacity = '0'; });
        setTimeout(() => {
          fill(offset);
          tiles.forEach((t) => { t.style.opacity = '1'; });
        }, 450);
      }, 4200);
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
      let visible = 0;
      cards.forEach((card) => {
        if (!q) {
          card.style.display = '';
          visible++;
          return;
        }
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
