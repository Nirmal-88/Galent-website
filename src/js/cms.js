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
    const icon = escapeHTML(item.icon || '◆');
    return `<div class="card-thumb ${style}"><div class="icon">${icon}</div></div>`;
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

  HubCMS.render = function (data) {
    const categories = (data && data.categories) || {};
    const items = Array.isArray(data && data.items) ? data.items : [];

    // Group items by category
    const grouped = {};
    items.forEach((item) => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Render each known panel
    Object.keys(categories).forEach((catKey) => {
      const panel = document.getElementById(`panel-${catKey}`);
      if (!panel) return;
      const list = grouped[catKey] || [];
      renderPanel(panel, list, categories[catKey].ctaLabel || 'Read');
      updateTabCount(`panel-${catKey}`, list.length);
    });

    // Update the "All" tab count
    updateTabCount('panel-all', items.length);

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
      const panels = document.querySelectorAll('.hub-panel .card-grid');
      panels.forEach((g) => {
        g.innerHTML = `<div class="hub-empty" style="display:block;"><strong>Couldn't load content.</strong>Check <code>content/knowledge.json</code> for syntax errors.</div>`;
      });
    }
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
