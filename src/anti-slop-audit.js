(() => {
  'use strict';

  const rule = (id, weight, pass, detail) => ({ id, weight, pass: Boolean(pass), detail });

  const audit = () => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    const uniqueIds = new Set(ids);
    const search = document.querySelector('#search');
    const searchLabel = document.querySelector('label[for="search"]');
    const themeControls = [...document.querySelectorAll('[data-theme-select]')];
    const themeOptionsValid = themeControls.length > 0 && themeControls.every((control) => control.options.length >= 4);

    const resultsText = document.querySelector('.results-count')?.textContent || '';
    const runtimeCommandCount = Number(resultsText.match(/OF\s+(\d+)\s+COMMANDS/i)?.[1] || 0);
    const promptStat = document.querySelector('[data-catalog-stat="prompts"]') || document.querySelector('.hero-stats span:nth-child(1) b');
    const categoryStat = document.querySelector('[data-catalog-stat="categories"]') || document.querySelector('.hero-stats span:nth-child(2) b');
    const runtimeCategoryCount = Math.max(0, (document.querySelector('#category-filter')?.options.length || 1) - 1);
    const statsMatch = runtimeCommandCount > 0
      && Number(promptStat?.textContent || 0) === runtimeCommandCount
      && runtimeCategoryCount > 0
      && Number(categoryStat?.textContent || 0) === runtimeCategoryCount;

    const rules = [
      rule('design-tokens', 20, Boolean(styles.getPropertyValue('--ui-bg').trim() && styles.getPropertyValue('--ui-accent').trim()), 'Core visual decisions are tokenized.'),
      rule('theme-engine', 20, Boolean(window.SamsonTheme && window.SamsonTheme.themes?.length >= 4), 'Theme state is centralized and exposes the four supported UI personalities.'),
      rule('theme-controls', 15, themeOptionsValid, 'Desktop and mobile controls expose the supported UI personalities.'),
      rule('runtime-truth', 20, statsMatch, 'Visible catalog statistics match runtime data.'),
      rule('accessible-search', 15, Boolean(search && searchLabel), 'Primary search retains an explicit accessible label.'),
      rule('unique-dom-ids', 10, ids.length === uniqueIds.size, 'Interactive shell does not introduce duplicate DOM ids.')
    ];

    const score = rules.reduce((total, item) => total + (item.pass ? item.weight : 0), 0);
    const result = {
      score,
      status: score >= 85 ? 'PASS' : 'REVIEW',
      theme: window.SamsonTheme?.get?.() || root.dataset.theme || 'default',
      rules,
      auditedAt: new Date().toISOString()
    };

    root.dataset.antiSlopScore = String(score);
    root.dataset.antiSlopStatus = result.status.toLowerCase();
    window.__SAMSON_ANTI_SLOP__ = result;
    return result;
  };

  const scheduleAudit = () => setTimeout(audit, 80);
  window.SamsonAntiSlop = Object.freeze({ audit, threshold: 85 });
  document.addEventListener('samson:shell-ready', scheduleAudit);
  document.addEventListener('samson:theme-change', scheduleAudit);
  window.addEventListener('load', () => setTimeout(audit, 250));
})();
