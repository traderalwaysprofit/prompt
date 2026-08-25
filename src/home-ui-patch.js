(() => {
  const apply = () => {
    document.title = 'SAMSON PROMPT Library';
    const logoText = document.querySelector('.logo-text');
    const subtitle = logoText?.querySelector('span');
    if (subtitle) subtitle.textContent = 'AI COMMAND LIBRARY';
    const stats = document.querySelector('.hero-stats');
    if (stats) {
      const spans = stats.querySelectorAll('span');
      if (spans[1]) {
        const value = spans[1].querySelector('b');
        if (value) {
          const count = window.__samsonCategoryCount;
          value.textContent = String(Number.isFinite(count) && count > 0 ? count : 20);
        }
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
  window.__samsonApplyHomePatch = apply;
})();
