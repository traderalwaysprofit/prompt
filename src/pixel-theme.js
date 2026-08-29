(() => {
  'use strict';

  const PIXEL_THEME = 'pixel';
  const META_DEFAULT = '#18202b';

  const ensureWireChrome = () => {
    if (!document.body) return null;
    let chrome = document.querySelector('.pixel-wire-chrome');
    if (chrome) return chrome;

    chrome = document.createElement('div');
    chrome.className = 'pixel-wire-chrome';
    chrome.setAttribute('aria-hidden', 'true');
    chrome.innerHTML = `
      <div class="pixel-wire-strip lead">
        <span class="pixel-wire-brand">SAMSON</span>
        <span class="pixel-wire-title">AI WORKFLOW + PROMPT SYSTEM</span>
        <span class="pixel-wire-status">PIXEL MODE</span>
      </div>
      <div class="pixel-wire-strip pixel-wire-ticker">
        <span>WORKFLOWS &nbsp;&gt;&gt;&gt;&nbsp; PROMPT LIBRARY &nbsp;&gt;&gt;&gt;&nbsp; BUILD &nbsp;&gt;&gt;&gt;&nbsp; RESEARCH &nbsp;&gt;&gt;&gt;&nbsp; AUTOMATION &nbsp;&gt;&gt;&gt;&nbsp; WORDPRESS &nbsp;&gt;&gt;&gt;&nbsp; TRADING &nbsp;&gt;&gt;&gt;&nbsp; NO RANKING, JUST TOOLS</span>
      </div>`;

    document.body.insertBefore(chrome, document.body.firstChild);
    return chrome;
  };

  const removeLegacyArcadeLayers = () => {
    document.querySelectorAll('.pixel-crt-overlay,.pixel-vignette,.pixel-boot-message').forEach((node) => node.remove());
    document.body?.classList.remove('pixel-arcade-active');
  };

  const setThemeColor = (active) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (!meta.dataset.defaultThemeColor) meta.dataset.defaultThemeColor = meta.content || META_DEFAULT;
    meta.content = active ? '#0c0c0c' : meta.dataset.defaultThemeColor;
  };

  const syncPixelMode = (theme) => {
    const active = theme === PIXEL_THEME;
    removeLegacyArcadeLayers();
    const chrome = ensureWireChrome();
    if (!chrome || !document.body) return;

    document.body.classList.toggle('pixel-wire-active', active);
    chrome.hidden = !active;
    setThemeColor(active);
  };

  const currentTheme = () => window.SamsonTheme?.get?.() || document.documentElement.dataset.theme || 'default';

  document.addEventListener('samson:theme-change', (event) => {
    syncPixelMode(event.detail?.theme || currentTheme());
  });

  const init = () => syncPixelMode(currentTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
