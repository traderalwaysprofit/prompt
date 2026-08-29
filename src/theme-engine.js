(() => {
  'use strict';

  const STORAGE_KEY = 'samsonTheme';
  const THEMES = Object.freeze([
    { id: 'default', label: 'Samson Default', description: 'Clean, professional, neutral' },
    { id: 'developer', label: 'Developer', description: 'Dark, technical, compact' },
    { id: 'swiss', label: 'Swiss', description: 'Editorial, typographic, high-contrast' },
    { id: 'pixel', label: 'Pixel', description: 'Retro arcade, blocky, high-contrast' }
  ]);

  const ids = new Set(THEMES.map((theme) => theme.id));
  const normalize = (value) => ids.has(value) ? value : 'default';
  const isDarkTheme = (theme) => theme === 'developer' || theme === 'pixel';

  const read = () => {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY) || 'default');
    } catch (_) {
      return 'default';
    }
  };

  const syncControls = (theme) => {
    document.querySelectorAll('[data-theme-select]').forEach((control) => {
      if (control.value !== theme) control.value = theme;
    });
  };

  const apply = (value, options = {}) => {
    const theme = normalize(value);
    const persist = options.persist !== false;
    const announce = options.announce !== false;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = isDarkTheme(theme) ? 'dark' : 'light';

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    }

    syncControls(theme);

    if (announce) {
      document.dispatchEvent(new CustomEvent('samson:theme-change', { detail: { theme } }));
    }

    return theme;
  };

  const current = () => normalize(document.documentElement.dataset.theme || read());

  window.SamsonTheme = Object.freeze({
    themes: THEMES,
    storageKey: STORAGE_KEY,
    get: current,
    set: (theme) => apply(theme),
    reset: () => apply('default')
  });

  apply(read(), { persist: false, announce: false });
})();
