import { getToolByRoute, isToolsRoute, TOOLS, TOOLS_HOME_ROUTE } from './tools-registry.js';

(() => {
  'use strict';

  let initialized = false;
  let activeController = null;
  let routeRequest = 0;

  const icon = (path) => `<svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;

  const shellMarkup = () => `
    <section class="tools-section" id="tools" aria-label="SAMSON Practical Tools">
      <div class="tools-inner" id="tools-view"></div>
    </section>`;

  const toolCardMarkup = (tool) => `
    <a class="tools-catalog-card" href="${tool.route}" data-tool-id="${tool.id}">
      <span class="tools-card-topline">
        <span class="tools-card-icon">${icon(tool.iconPath)}</span>
        <span class="tools-card-status is-${tool.status}"><span aria-hidden="true"></span>${tool.statusLabel}</span>
      </span>
      <span class="tools-kicker">${tool.category}</span>
      <h3>${tool.title}</h3>
      <p>${tool.description}</p>
      <span class="tools-card-formats" aria-label="Format yang didukung">
        ${tool.formats.map((format) => `<span>${format}</span>`).join('')}
      </span>
      <span class="tools-card-action">Buka Tool ${icon('M5 12h14M13 6l6 6-6 6')}</span>
    </a>`;

  const hubMarkup = () => `
    <header class="tools-page-header tools-hub-header">
      <a class="tools-back" href="#cheatcodes" data-tools-exit>${icon('M15 18l-6-6 6-6')}<span>Kembali</span></a>
      <div class="tools-product-heading">
        <span class="tools-product-icon">${icon('M4 7h16M7 4v6M4 17h16M17 14v6')}</span>
        <div class="tools-heading">
          <span class="tools-kicker">SAMSON / PRACTICAL TOOLS</span>
          <h1 id="tools-title" tabindex="-1">Tools</h1>
          <p>Peralatan praktis untuk data, marketing, konten, dan website.</p>
        </div>
      </div>
    </header>

    <section class="tools-catalog" aria-labelledby="tools-catalog-title">
      <header class="tools-catalog-heading">
        <div>
          <span class="tools-kicker">AVAILABLE NOW</span>
          <h2 id="tools-catalog-title">Tools tersedia</h2>
          <p>Pilih tool sesuai pekerjaan yang ingin diselesaikan.</p>
        </div>
        <span class="tools-count-pill"><b>${TOOLS.length}</b> tool tersedia</span>
      </header>
      <div class="tools-catalog-grid">
        ${TOOLS.map(toolCardMarkup).join('')}
      </div>
      <p class="tools-catalog-note">Tool lainnya akan ditambahkan secara bertahap tanpa memenuhi menu utama SAMSON.</p>
    </section>`;

  const loadingMarkup = (tool) => `
    <div class="tools-route-state" role="status">
      <span class="tools-card-icon">${icon(tool.iconPath)}</span>
      <strong>Membuka ${tool.title}…</strong>
    </div>`;

  const errorMarkup = () => `
    <div class="tools-route-state is-error" role="alert">
      <span class="tools-card-icon">${icon('M12 9v4m0 4h.01M10.3 4.4L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.4a2 2 0 00-3.4 0z')}</span>
      <strong>Tool belum dapat dimuat</strong>
      <p>Muat ulang halaman atau kembali ke katalog Tools.</p>
      <a class="tool-button tool-button-secondary" href="${TOOLS_HOME_ROUTE}">Kembali ke Tools</a>
    </div>`;

  const getView = () => document.querySelector('#tools-view');

  const focusCurrentTitle = () => {
    requestAnimationFrame(() => document.querySelector('#tools-title')?.focus({ preventScroll: true }));
  };

  const showToolsSection = ({ focus = true, scroll = true } = {}) => {
    document.documentElement.dataset.entryMode = 'tools';
    if (scroll) document.querySelector('#tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus) focusCurrentTitle();
  };

  const destroyActiveTool = () => {
    activeController?.destroy?.();
    activeController = null;
  };

  const renderHub = ({ focus = true, scroll = true } = {}) => {
    const view = getView();
    const section = document.querySelector('#tools');
    if (!view || !section) return;

    routeRequest += 1;
    destroyActiveTool();
    section.dataset.toolsView = 'catalog';
    view.removeAttribute('aria-busy');
    view.innerHTML = hubMarkup();
    showToolsSection({ focus, scroll });
  };

  const renderTool = async (tool, { focus = true, scroll = true } = {}) => {
    const view = getView();
    const section = document.querySelector('#tools');
    if (!view || !section) return;

    const request = ++routeRequest;
    destroyActiveTool();
    section.dataset.toolsView = tool.id;
    view.setAttribute('aria-busy', 'true');
    view.innerHTML = loadingMarkup(tool);
    showToolsSection({ focus: false, scroll });

    try {
      const module = await tool.load();
      if (request !== routeRequest || location.hash !== tool.route) return;
      view.removeAttribute('aria-busy');
      activeController = module.mountGoogleContactsTool(view, { icon });
      if (focus) focusCurrentTitle();
    } catch (error) {
      if (request !== routeRequest) return;
      console.error('Tools module loading error:', error);
      view.removeAttribute('aria-busy');
      view.innerHTML = errorMarkup();
    }
  };

  const renderRoute = ({ focus = true, scroll = true } = {}) => {
    if (!isToolsRoute(location.hash)) return;

    if (location.hash === TOOLS_HOME_ROUTE || location.hash === `${TOOLS_HOME_ROUTE}/`) {
      renderHub({ focus, scroll });
      return;
    }

    const tool = getToolByRoute(location.hash);
    if (tool) {
      renderTool(tool, { focus, scroll });
      return;
    }

    history.replaceState(null, '', TOOLS_HOME_ROUTE);
    renderHub({ focus, scroll });
  };

  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#nav-tools, [data-open-tools]')) return;

      event.preventDefault();
      if (location.hash === TOOLS_HOME_ROUTE) renderHub();
      else location.hash = TOOLS_HOME_ROUTE;
    });

    window.addEventListener('hashchange', () => renderRoute());
  };

  const initialize = () => {
    if (initialized || document.querySelector('#tools')) return;
    const featured = document.querySelector('#featured');
    if (!featured) return;

    initialized = true;
    featured.insertAdjacentHTML('beforebegin', shellMarkup());
    bindEvents();

    if (isToolsRoute(location.hash)) renderRoute({ focus: false, scroll: false });
    else {
      const view = getView();
      const section = document.querySelector('#tools');
      if (view && section) {
        section.dataset.toolsView = 'catalog';
        view.innerHTML = hubMarkup();
      }
    }
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
