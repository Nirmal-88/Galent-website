/* Galent Knowledge Hub — tab switching + search filter.
 * Dependency-free, vanilla JS. Initialise once on DOMContentLoaded.
 */
(function () {
  const HubCMS = {};

  // ---- Tab switching ------------------------------------------------
  HubCMS.initTabs = function () {
    const tabs = document.querySelectorAll('.hub-tab');
    const panels = document.querySelectorAll('.hub-panel');
    if (!tabs.length) return;

    function activate(target) {
      tabs.forEach(t => {
        const on = t.dataset.target === target;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(p => {
        const on = p.id === target;
        p.classList.toggle('active', on);
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      // Reset any active search filter — apply to the new panel.
      const input = document.querySelector('.hub-search input');
      if (input && input.value) HubCMS.applyFilter(input.value);
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => activate(tab.dataset.target));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(tab.dataset.target); }
      });
    });
  };

  // ---- Search filter ------------------------------------------------
  HubCMS.initSearch = function () {
    const input = document.querySelector('.hub-search input');
    if (!input) return;
    input.addEventListener('input', () => HubCMS.applyFilter(input.value));
  };

  HubCMS.applyFilter = function (query) {
    const q = (query || '').trim().toLowerCase();
    const active = document.querySelector('.hub-panel.active');
    if (!active) return;
    const cards = active.querySelectorAll('.card-item');
    let visible = 0;
    cards.forEach(card => {
      if (!q) { card.style.display = ''; visible++; return; }
      const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
      const excerpt = (card.querySelector('.excerpt')?.textContent || '').toLowerCase();
      const meta = (card.querySelector('.card-meta')?.textContent || '').toLowerCase();
      const match = title.includes(q) || excerpt.includes(q) || meta.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    // Show empty-state if no matches in this panel.
    let empty = active.querySelector('.hub-empty');
    if (!visible && q) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'hub-empty';
        empty.innerHTML = `<strong>No results in this section.</strong>Try a different keyword, or switch tabs above.`;
        active.appendChild(empty);
      }
      empty.style.display = '';
    } else if (empty) {
      empty.style.display = 'none';
    }
  };

  HubCMS.init = function () {
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
