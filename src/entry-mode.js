(() => {
  'use strict';

  const root = document.documentElement;

  const modeFromHash = () => {
    if (/^#tools(?:\/|$)/.test(location.hash)) return 'tools';
    if (location.hash === '#prompts') return 'prompts';
    if (location.hash === '#workflows' || /^#cheatcodes\//.test(location.hash) || /^#work-assistant(?:\/|$)/.test(location.hash)) return 'workflows';
    return 'chooser';
  };

  const setMode = (mode) => {
    root.dataset.entryMode = mode;
  };

  const syncFromHash = () => setMode(modeFromHash());

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-route-prompts], #hero-prompts, #nav-recent, #nav-categories, #nav-favorites, [data-prompt-category]')) {
      setMode('prompts');
      return;
    }

    if (target.closest('#nav-tools, [data-open-tools], [data-mobile-nav="tools"]')) {
      setMode('tools');
      return;
    }

    if (target.closest('[data-show-workflows], [data-open-cheatcode], [data-workflow-mode], [data-open-work-assistant], [data-work-problem]')) {
      setMode('workflows');
      return;
    }

    if (target.closest('#hero-cheatcodes, #nav-cheatcodes')) {
      setMode('chooser');
    }
  }, true);

  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();
})();
