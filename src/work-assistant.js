(() => {
  'use strict';

  const DATA_URL = '/data/work-assistant.json';
  const state = {
    data: null,
    mode: 'guided',
    selectedMenu: null,
    selectedProblem: null,
    mounted: false,
    bound: false,
    initializing: false
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[character]);

  const catalog = () => document.querySelector('#workflow-catalog');
  const assistant = () => document.querySelector('#work-assistant');

  const menuById = (id) => state.data?.menus?.find((item) => item.id === id) || null;
  const problemById = (id) => state.data?.whatsappProblems?.find((item) => item.id === id) || null;

  const mount = () => {
    if (state.mounted) return true;
    const root = catalog();
    const header = root?.querySelector('.workflow-catalog-header');
    const grid = root?.querySelector('.workflow-catalog-grid');
    if (!root || !header || !grid) return false;

    const switcher = document.createElement('div');
    switcher.className = 'workflow-mode-switch';
    switcher.setAttribute('role', 'tablist');
    switcher.setAttribute('aria-label', 'Workflow mode');
    switcher.innerHTML = `
      <button type="button" class="workflow-mode-tab is-active" data-workflow-mode="guided" role="tab" aria-selected="true" aria-controls="workflow-catalog-grid">Guided Workflows</button>
      <button type="button" class="workflow-mode-tab" data-workflow-mode="assistant" role="tab" aria-selected="false" aria-controls="work-assistant">Work Assistant</button>`;

    const section = document.createElement('section');
    section.id = 'work-assistant';
    section.className = 'work-assistant';
    section.hidden = true;
    section.setAttribute('aria-labelledby', 'work-assistant-title');
    section.innerHTML = '<p class="work-assistant-loading" role="status">Memuat Work Assistant…</p>';

    root.insertBefore(switcher, header);
    root.appendChild(section);
    header.dataset.guidedCatalog = '1';
    grid.dataset.guidedCatalog = '1';
    state.mounted = true;
    return true;
  };

  const waitForMount = () => new Promise((resolve) => {
    let attempts = 0;
    const tick = () => {
      if (mount()) {
        resolve(true);
        return;
      }
      attempts += 1;
      if (attempts >= 40) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  const renderOverview = () => {
    const root = assistant();
    if (!root || !state.data) return;
    root.innerHTML = `
      <div class="work-assistant-header">
        <div>
          <span class="work-assistant-eyebrow">AI WORK ASSISTANT</span>
          <h2 id="work-assistant-title" tabindex="-1">Pilih masalah pekerjaan yang ingin diselesaikan</h2>
        </div>
        <p>${escapeHtml(state.data.description)}</p>
      </div>
      <div class="work-assistant-grid" aria-label="Work Assistant menu">
        ${state.data.menus.map((item) => {
          const available = item.status === 'pilot';
          return `<article class="work-assistant-card ${available ? 'is-available' : 'is-planned'}" data-work-assistant-card="${escapeHtml(item.id)}">
            <div class="work-assistant-card-meta"><span>${escapeHtml(item.domain)}</span><span>${escapeHtml(item.statusLabel)}</span></div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${available
              ? `<button type="button" data-open-work-assistant="${escapeHtml(item.id)}" aria-label="Buka ${escapeHtml(item.title)}">Buka Menu <span aria-hidden="true">→</span></button>`
              : `<div class="work-assistant-card-status" aria-label="${escapeHtml(item.title)} direncanakan">Menu berikutnya</div>`}
          </article>`;
        }).join('')}
      </div>
      <p class="work-assistant-note">Tahap ini hanya menyiapkan navigasi pekerjaan. AI execution dan koneksi tools Gemini belum dijalankan.</p>`;
  };

  const renderWhatsApp = () => {
    const root = assistant();
    const menu = menuById('whatsapp-broadcast');
    if (!root || !menu || !state.data) return;
    const selected = problemById(state.selectedProblem);
    root.innerHTML = `
      <div class="work-assistant-detail-head">
        <button type="button" class="work-assistant-back" data-work-assistant-back><span aria-hidden="true">←</span> Work Assistant</button>
        <span class="work-assistant-eyebrow">${escapeHtml(menu.domain)} / FIRST PILOT</span>
        <h2 id="work-assistant-title" tabindex="-1">${escapeHtml(menu.title)}</h2>
        <p>${escapeHtml(menu.description)}</p>
      </div>
      <div class="work-problem-intro">
        <strong>Apa yang ingin Anda lakukan?</strong>
        <span>Pilih jenis masalah broadcast. Form input, Gemini tool mapping, dan quality gate akan ditambahkan pada tahap berikutnya.</span>
      </div>
      <div class="work-problem-grid" aria-label="Jenis masalah WhatsApp Broadcast">
        ${state.data.whatsappProblems.map((item) => {
          const active = item.id === state.selectedProblem;
          return `<button type="button" class="work-problem-card ${active ? 'is-selected' : ''}" data-work-problem="${escapeHtml(item.id)}" aria-pressed="${active ? 'true' : 'false'}">
            <span class="work-problem-title">${escapeHtml(item.title)}</span>
            <span class="work-problem-description">${escapeHtml(item.description)}</span>
            <span class="work-problem-arrow" aria-hidden="true">→</span>
          </button>`;
        }).join('')}
      </div>
      ${selected ? `<div class="work-problem-selection" role="status"><span>PILIHAN ANDA</span><strong>${escapeHtml(selected.title)}</strong><p>${escapeHtml(selected.description)}</p><small>Menu siap. Workflow AI akan dibangun pada tahap berikutnya.</small></div>` : ''}`;
  };

  const setMode = (mode, options = {}) => {
    const root = catalog();
    const section = assistant();
    const header = root?.querySelector('[data-guided-catalog="1"].workflow-catalog-header');
    const grid = root?.querySelector('[data-guided-catalog="1"].workflow-catalog-grid');
    if (!root || !section || !header || !grid) return;

    const nextMode = mode === 'assistant' ? 'assistant' : 'guided';
    state.mode = nextMode;
    root.hidden = false;
    header.hidden = nextMode === 'assistant';
    grid.hidden = nextMode === 'assistant';
    section.hidden = nextMode !== 'assistant';

    root.querySelectorAll('[data-workflow-mode]').forEach((button) => {
      const active = button.dataset.workflowMode === nextMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });

    if (nextMode === 'assistant') {
      if (state.selectedMenu === 'whatsapp-broadcast') renderWhatsApp();
      else renderOverview();
    }

    if (options.updateHash !== false) {
      history.replaceState(null, '', nextMode === 'assistant' ? '#work-assistant' : '#workflows');
    }
    if (options.scroll !== false) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (options.focus) requestAnimationFrame(() => root.querySelector(nextMode === 'assistant' ? '#work-assistant-title' : '#workflow-catalog-title')?.focus({ preventScroll: true }));
  };

  const openAssistantMenu = (id, options = {}) => {
    const menu = menuById(id);
    if (!menu || menu.status !== 'pilot') return;
    state.selectedMenu = id;
    state.selectedProblem = options.problemId && problemById(options.problemId) ? options.problemId : null;
    setMode('assistant', { updateHash: false, scroll: options.scroll !== false });
    if (id === 'whatsapp-broadcast') renderWhatsApp();
    if (options.updateHash !== false) {
      const suffix = state.selectedProblem ? `/${state.selectedProblem}` : '';
      history.replaceState(null, '', `#work-assistant/${id}${suffix}`);
    }
    if (options.focus !== false) requestAnimationFrame(() => assistant()?.querySelector('#work-assistant-title')?.focus({ preventScroll: true }));
  };

  const selectProblem = (id) => {
    if (!problemById(id)) return;
    state.selectedMenu = 'whatsapp-broadcast';
    state.selectedProblem = id;
    renderWhatsApp();
    history.replaceState(null, '', `#work-assistant/whatsapp-broadcast/${id}`);
    requestAnimationFrame(() => assistant()?.querySelector(`[data-work-problem="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }));
  };

  const routeFromHash = () => {
    if (!state.data || !state.mounted) return;
    const match = location.hash.match(/^#work-assistant(?:\/([^/]+))?(?:\/([^/]+))?$/);
    if (!match) return;
    const menuId = match[1] || null;
    const problemId = match[2] || null;
    if (menuId === 'whatsapp-broadcast') {
      openAssistantMenu(menuId, { problemId, updateHash: false, scroll: false, focus: false });
      return;
    }
    state.selectedMenu = null;
    state.selectedProblem = null;
    setMode('assistant', { updateHash: false, scroll: false });
  };

  const bindEvents = () => {
    if (state.bound) return;
    state.bound = true;
    document.addEventListener('click', (event) => {
      const mode = event.target.closest('[data-workflow-mode]');
      if (mode) {
        if (mode.dataset.workflowMode === 'assistant') {
          state.selectedMenu = null;
          state.selectedProblem = null;
        }
        setMode(mode.dataset.workflowMode, { focus: true });
        return;
      }

      const menu = event.target.closest('[data-open-work-assistant]');
      if (menu) {
        openAssistantMenu(menu.dataset.openWorkAssistant);
        return;
      }

      if (event.target.closest('[data-work-assistant-back]')) {
        state.selectedMenu = null;
        state.selectedProblem = null;
        renderOverview();
        history.replaceState(null, '', '#work-assistant');
        requestAnimationFrame(() => assistant()?.querySelector('#work-assistant-title')?.focus({ preventScroll: true }));
        return;
      }

      const problem = event.target.closest('[data-work-problem]');
      if (problem) selectProblem(problem.dataset.workProblem);
    });
    window.addEventListener('hashchange', routeFromHash);
  };

  const loadData = async () => {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Work Assistant menu data unavailable');
    const data = await response.json();
    if (!Array.isArray(data.menus) || !Array.isArray(data.whatsappProblems)) throw new Error('Invalid Work Assistant menu data');
    state.data = data;
  };

  const initialize = async () => {
    if (state.initializing || state.data) {
      routeFromHash();
      return;
    }
    state.initializing = true;
    const ready = await waitForMount();
    if (!ready) {
      state.initializing = false;
      return;
    }
    bindEvents();
    try {
      await loadData();
      renderOverview();
      routeFromHash();
    } catch (error) {
      console.error(error);
      const root = assistant();
      if (root) root.innerHTML = '<p class="work-assistant-loading" role="status">Work Assistant belum tersedia. Guided Workflows tetap dapat digunakan.</p>';
    } finally {
      state.initializing = false;
    }
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.querySelector('.site-header')) initialize();
})();
