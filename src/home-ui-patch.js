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
        const categoryCount = window.__samsonCategoryCount ?? document.querySelectorAll('#category-filter option:not([value="all"])').length;
        const value = spans[1].querySelector('b');
        if (value) value.textContent = String(categoryCount || 20);
      }
    }
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
})();
