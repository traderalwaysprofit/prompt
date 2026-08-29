(() => {
  'use strict';

  const PIXEL_THEME = 'pixel';
  const META_DEFAULT = '#18202b';
  let bootTimer = null;

  const ensureVisualLayer = () => {
    if (!document.body) return null;

    let crt = document.querySelector('.pixel-crt-overlay');
    if (!crt) {
      crt = document.createElement('div');
      crt.className = 'pixel-crt-overlay';
      crt.setAttribute('aria-hidden', 'true');
      document.body.appendChild(crt);
    }

    let vignette = document.querySelector('.pixel-vignette');
    if (!vignette) {
      vignette = document.createElement('div');
      vignette.className = 'pixel-vignette';
      vignette.setAttribute('aria-hidden', 'true');
      document.body.appendChild(vignette);
    }

    let boot = document.querySelector('.pixel-boot-message');
    if (!boot) {
      boot = document.createElement('div');
      boot.className = 'pixel-boot-message';
      boot.setAttribute('aria-hidden', 'true');
      boot.textContent = '► ARCADE MODE READY ◄';
      document.body.appendChild(boot);
    }

    return { crt, vignette, boot };
  };

  const setThemeColor = (active) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (!meta.dataset.defaultThemeColor) meta.dataset.defaultThemeColor = meta.content || META_DEFAULT;
    meta.content = active ? '#000000' : meta.dataset.defaultThemeColor;
  };

  const showBootMessage = (boot) => {
    clearTimeout(bootTimer);
    boot.classList.remove('is-visible');
    void boot.offsetWidth;
    boot.classList.add('is-visible');
    bootTimer = setTimeout(() => boot.classList.remove('is-visible'), 1500);
  };

  const syncPixelMode = (theme, options = {}) => {
    const active = theme === PIXEL_THEME;
    const layers = ensureVisualLayer();
    if (!layers) return;

    document.body.classList.toggle('pixel-arcade-active', active);
    setThemeColor(active);

    if (active && options.announce !== false) {
      showBootMessage(layers.boot);
    } else if (!active) {
      clearTimeout(bootTimer);
      layers.boot.classList.remove('is-visible');
    }
  };

  const currentTheme = () => window.SamsonTheme?.get?.() || document.documentElement.dataset.theme || 'default';

  document.addEventListener('samson:theme-change', (event) => {
    syncPixelMode(event.detail?.theme || currentTheme());
  });

  const init = () => syncPixelMode(currentTheme(), { announce: currentTheme() === PIXEL_THEME });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
