/* Galent — unified site header behaviour (self-contained).
 * Powers the .sh-nav header on pages that don't load the main design-system
 * scripts: sticky "scrolled" state, the Tech Services dropdown, and the
 * mobile hamburger menu. No dependencies.
 */
(function () {
  function init() {
    var nav = document.querySelector('.sh-nav');
    if (!nav) return;

    // Sticky "scrolled" hairline.
    var onScroll = function () {
      nav.classList.toggle('scrolled', (window.pageYOffset || document.documentElement.scrollTop || 0) > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Tech Services dropdown (click to toggle, click-away to close).
    var dd = nav.querySelector('.sh-dd');
    var ddToggle = nav.querySelector('.sh-dd-toggle');
    if (dd && ddToggle) {
      ddToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = dd.classList.toggle('open');
        ddToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (dd.classList.contains('open') && !dd.contains(e.target)) {
          dd.classList.remove('open');
          ddToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Mobile hamburger.
    var toggle = nav.querySelector('.sh-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
