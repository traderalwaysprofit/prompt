(() => {
  'use strict';

  const DATA_URLS = ['/data/workflows-trading.json', '/data/workflows-wordpress.json'];
  const STORAGE_KEY = 'samsonCheatcodeProgress';
  const GROUPS = ['all', 'build', 'marketing', 'content', 'research', 'automation', 'wordpress', 'trading'];
  const coreGroups = new Map([
    ['Build a Website', 'build'],
    ['Build a SaaS', 'build'],
    ['Launch a Marketing Campaign', 'marketing'],
    ['Create SEO Content', 'content'],
    ['Run a Research Project', 'research'],
    ['Automate a Task', 'automation']
  ]);
  const domainMeta = {
    trading: {
      eyebrow: 'TRADING',
      title: 'Educational Trading Workflows',
      description: 'Decision-support untuk XAU/USD, forex, dan pembangunan sistem trading. Bukan AI signal.'
    },
    wordpress: {
      eyebrow: 'WORDPRESS',
      title: 'WordPress Production Workflows',
      description: 'Build, commerce, dan site-health workflow untuk WordPress yang maintainable, testable, dan production-ready.'
    }
  };

  let workflows = [];
  let commandsById = new Map();
  let activeWorkflow = null;
  let activeStepIndex = 0;
  let activeFilter = 'all';
  let observer = null;

  const escapeHtml = (value = '') => String(value).replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[character]);

  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  };
  const writeProgress = (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  const completedSteps = (id) => new Set((readProgress()[id] || []).map(Number));
  const groupOf = (workflow) => String(workflow?.group || '').toLowerCase();

  const updateRuntimeCount = () => {
    const total = 6 + workflows.filter((item) => item.status === 'active').length;
    document.querySelectorAll('[data-catalog-stat="workflows"]').forEach((node) => { node.textContent = String(total); });
    const feature = document.querySelector('#workflow-choice .choice-feature strong');
    if (feature) feature.textContent = `${total} Ready-to-run Workflows`;
    const detail = document.querySelector('#workflow-choice .choice-feature span');
    if (detail && !/sudah dimulai/i.test(detail.textContent || '')) {
      detail.textContent = 'Web · SaaS · Marketing · Content · Research · Automation · Trading · WordPress';
    }
    const button = document.querySelector('#workflow-choice [data-show-workflows]');
    if (button) button.innerHTML = 'Lihat 6 Workflow + 3 Trading + 3 WordPress <span aria-hidden="true">→</span>';
  };

  const annotateCoreCards = () => {
    document.querySelectorAll('#workflow-catalog-grid .workflow-catalog-card').forEach((card) => {
      const title = card.querySelector('h3')?.textContent?.trim() || '';
      card.dataset.workflowGroup = coreGroups.get(title) || 'all';
    });
  };

  const domainCardsMarkup = (group) => workflows
    .filter((item) => item.status === 'active' && groupOf(item) === group)
    .map((workflow) => {
      const done = completedSteps(workflow.id).size;
      const progress = Math.round((done / workflow.steps.length) * 100);
      const action = done ? 'Lanjutkan' : 'Mulai';
      const specificClass = group === 'trading' ? 'trading-workflow-card' : 'wordpress-workflow-card';
      const specificOpen = group === 'trading' ? 'data-open-trading-workflow' : 'data-open-wordpress-workflow';
      return `<article class="domain-workflow-card ${specificClass}" data-workflow-group="${group}" data-domain-id="${escapeHtml(workflow.id)}">
        <div class="trading-card-top"><span>${escapeHtml(workflow.group)}</span><span class="education-badge">${escapeHtml(workflow.badge)}</span></div>
        <h3>${escapeHtml(workflow.title)}</h3>
        <p>${escapeHtml(workflow.description)}</p>
        <div class="catalog-card-stats"><span><strong>${workflow.steps.length}</strong> langkah</span><span><strong>${escapeHtml(workflow.estimatedTime)}</strong></span></div>
        <div class="catalog-progress" aria-label="Progress ${escapeHtml(workflow.title)} ${progress}%"><span style="width:${progress}%"></span></div>
        <button type="button" data-open-domain-workflow="${escapeHtml(workflow.id)}" ${specificOpen}="${escapeHtml(workflow.id)}" aria-label="${action} ${escapeHtml(workflow.title)}">${action} Workflow <span aria-hidden="true">→</span></button>
      </article>`;
    }).join('');

  const ensureDomainGroups = () => {
    const catalog = document.querySelector('#workflow-catalog');
    const coreGrid = document.querySelector('#workflow-catalog-grid');
    if (!catalog || !coreGrid) return;
    annotateCoreCards();

    let filters = catalog.querySelector('.workflow-filters');
    if (!filters) {
      filters = document.createElement('div');
      filters.className = 'workflow-filters';
      filters.setAttribute('role', 'group');
      filters.setAttribute('aria-label', 'Filter workflow');
      filters.innerHTML = GROUPS.map((group) => `<button type="button" data-workflow-filter="${group}" ${group === 'all' ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${group.toUpperCase()}</button>`).join('');
      coreGrid.before(filters);
    }

    for (const group of ['wordpress', 'trading']) {
      const meta = domainMeta[group];
      let section = catalog.querySelector(`#${group}-workflow-group`);
      if (!section) {
        section = document.createElement('section');
        section.id = `${group}-workflow-group`;
        section.className = `domain-workflow-group ${group}-workflow-group`;
        coreGrid.after(section);
      }
      section.innerHTML = `<div class="trading-group-head"><div><span class="cheatcodes-eyebrow">${meta.eyebrow}</span><h3>${meta.title}</h3></div><p>${meta.description}</p></div><div class="domain-workflow-grid ${group}-workflow-grid">${domainCardsMarkup(group)}</div>`;
    }

    applyFilter(activeFilter);
    updateRuntimeCount();
  };

  const applyFilter = (group) => {
    activeFilter = GROUPS.includes(group) ? group : 'all';
    document.querySelectorAll('[data-workflow-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.workflowFilter === activeFilter)));
    document.querySelectorAll('#workflow-catalog-grid .workflow-catalog-card').forEach((card) => {
      card.hidden = activeFilter !== 'all' && card.dataset.workflowGroup !== activeFilter;
    });

    const domainGroups = ['wordpress', 'trading'];
    domainGroups.forEach((domain) => {
      const section = document.querySelector(`#${domain}-workflow-group`);
      if (section) section.hidden = activeFilter !== 'all' && activeFilter !== domain;
    });

    const coreGrid = document.querySelector('#workflow-catalog-grid');
    if (coreGrid) coreGrid.hidden = domainGroups.includes(activeFilter);
  };

  const copyText = async (text, button) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {}
    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.readOnly = true;
      document.body.appendChild(textarea);
      textarea.select();
      try { copied = document.execCommand('copy'); } catch {}
      textarea.remove();
    }
    if (copied && button) {
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1400);
    }
  };

  const renderDomainWorkflow = () => {
    const detail = document.querySelector('#cheatcode-detail');
    if (!detail || !activeWorkflow) return;
    const group = groupOf(activeWorkflow);
    const completed = completedSteps(activeWorkflow.id);
    const step = activeWorkflow.steps[activeStepIndex];
    const completion = Math.round((completed.size / activeWorkflow.steps.length) * 100);
    const prompts = step.promptIds.map((id) => commandsById.get(Number(id))).filter(Boolean);

    detail.hidden = false;
    delete detail.dataset.tradingDetail;
    delete detail.dataset.wordpressDetail;
    detail.dataset.domainDetail = activeWorkflow.id;
    if (group === 'trading') detail.dataset.tradingDetail = activeWorkflow.id;
    if (group === 'wordpress') detail.dataset.wordpressDetail = activeWorkflow.id;

    detail.innerHTML = `<div class="workflow-header"><div><span class="education-badge">${escapeHtml(activeWorkflow.badge)}</span><h2 tabindex="-1">${escapeHtml(activeWorkflow.title)}</h2><p>${escapeHtml(activeWorkflow.description)}</p></div><div class="workflow-progress" aria-label="Workflow progress ${completion}%"><div class="workflow-progress-label"><span>PROGRESS</span><span>${completed.size}/${activeWorkflow.steps.length}</span></div><div class="workflow-progress-track"><div class="workflow-progress-bar" style="width:${completion}%"></div></div></div></div><div class="workflow-layout"><nav class="workflow-steps" aria-label="${escapeHtml(activeWorkflow.title)} steps">${activeWorkflow.steps.map((item, index) => `<button class="workflow-step-tab" type="button" data-domain-step="${index}" ${group === 'trading' ? `data-trading-step="${index}"` : `data-wordpress-step="${index}"`} ${index === activeStepIndex ? 'aria-current="step"' : ''}><span class="workflow-step-number">${String(item.number).padStart(2, '0')}</span><span class="workflow-step-title">${escapeHtml(item.title)}</span><span class="workflow-step-state">${completed.has(item.number) ? '✓' : ''}</span></button>`).join('')}</nav><div class="workflow-content"><span class="cheatcodes-eyebrow">STEP ${String(step.number).padStart(2, '0')}</span><h3>${escapeHtml(step.title)}</h3><p class="workflow-description">${escapeHtml(step.description)}</p><div class="workflow-output"><strong>OUTPUT</strong><span>${escapeHtml(step.output)}</span></div><div class="workflow-prompts">${prompts.map((command) => `<article class="workflow-prompt"><div class="workflow-prompt-header"><code>${escapeHtml(command.name)}</code><button class="workflow-copy" type="button" data-copy-domain-prompt="${command.id}" aria-label="Copy prompt ${escapeHtml(command.name)}">Copy Prompt</button></div><p>${escapeHtml(command.description)}</p></article>`).join('')}</div><div class="workflow-actions"><button class="workflow-reset" type="button" data-reset-domain-workflow>Reset progress</button><button class="workflow-next" type="button" data-complete-domain-step>${activeStepIndex === activeWorkflow.steps.length - 1 ? 'Complete Workflow ✓' : 'Complete & Next →'}</button></div></div></div>`;
  };

  const openDomainWorkflow = (id, options = {}) => {
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow) return;
    activeWorkflow = workflow;
    const completed = completedSteps(id);
    const firstIncomplete = workflow.steps.findIndex((step) => !completed.has(step.number));
    activeStepIndex = options.stepIndex ?? (firstIncomplete === -1 ? 0 : firstIncomplete);
    renderDomainWorkflow();
    if (options.updateHash !== false) history.replaceState(null, '', `#cheatcodes/${id}/step-${activeStepIndex + 1}`);
    const detail = document.querySelector('#cheatcode-detail');
    detail?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => detail?.querySelector('h2')?.focus({ preventScroll: true }));
  };

  const completeStep = () => {
    if (!activeWorkflow) return;
    const progress = readProgress();
    const completed = completedSteps(activeWorkflow.id);
    completed.add(activeWorkflow.steps[activeStepIndex].number);
    progress[activeWorkflow.id] = [...completed].sort((a, b) => a - b);
    writeProgress(progress);
    if (activeStepIndex < activeWorkflow.steps.length - 1) activeStepIndex += 1;
    history.replaceState(null, '', `#cheatcodes/${activeWorkflow.id}/step-${activeStepIndex + 1}`);
    renderDomainWorkflow();
    ensureDomainGroups();
  };

  const resetProgress = () => {
    if (!activeWorkflow) return;
    const progress = readProgress();
    delete progress[activeWorkflow.id];
    writeProgress(progress);
    activeStepIndex = 0;
    renderDomainWorkflow();
    ensureDomainGroups();
  };

  const handleHash = () => {
    const match = location.hash.match(/^#cheatcodes\/([^/]+)(?:\/step-(\d+))?/);
    if (!match || !workflows.some((item) => item.id === match[1])) return;
    openDomainWorkflow(match[1], { stepIndex: Math.max(0, Number(match[2] || 1) - 1), updateHash: false });
  };

  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const filter = event.target.closest('[data-workflow-filter]');
      if (filter) {
        event.preventDefault();
        applyFilter(filter.dataset.workflowFilter);
        return;
      }
      const open = event.target.closest('[data-open-domain-workflow]');
      if (open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openDomainWorkflow(open.dataset.openDomainWorkflow);
        return;
      }
      const step = event.target.closest('[data-domain-step]');
      if (step && activeWorkflow) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeStepIndex = Number(step.dataset.domainStep);
        history.replaceState(null, '', `#cheatcodes/${activeWorkflow.id}/step-${activeStepIndex + 1}`);
        renderDomainWorkflow();
        return;
      }
      const copy = event.target.closest('[data-copy-domain-prompt]');
      if (copy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const command = commandsById.get(Number(copy.dataset.copyDomainPrompt));
        if (command) copyText(command.template, copy);
        return;
      }
      if (event.target.closest('[data-complete-domain-step]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        completeStep();
        return;
      }
      if (event.target.closest('[data-reset-domain-workflow]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        resetProgress();
      }
    }, true);
    window.addEventListener('hashchange', handleHash);
  };

  const observeCatalog = () => {
    const grid = document.querySelector('#workflow-catalog-grid');
    if (!grid) return;
    observer?.disconnect();
    observer = new MutationObserver(() => queueMicrotask(ensureDomainGroups));
    observer.observe(grid, { childList: true });
  };

  const init = async () => {
    const waitForCatalog = async () => {
      for (let i = 0; i < 80; i += 1) {
        if (document.querySelector('#workflow-catalog-grid')) return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return false;
    };
    if (!(await waitForCatalog())) return;
    try {
      const responses = await Promise.all([
        ...DATA_URLS.map((url) => fetch(url, { cache: 'no-store' })),
        fetch('/data/commands.json', { cache: 'no-store' }),
        fetch('/data/commands-extra.json', { cache: 'no-store' })
      ]);
      if (responses.some((response) => !response.ok)) throw new Error('Domain workflow data unavailable');
      const payloads = await Promise.all(responses.map((response) => response.json()));
      workflows = [...payloads[0], ...payloads[1]];
      const commands = payloads[2];
      const extra = payloads[3];
      commandsById = new Map([...commands, ...extra].map((command) => [Number(command.id), command]));
      bindEvents();
      observeCatalog();
      ensureDomainGroups();
      handleHash();
      window.SamsonDomainWorkflows = { getAll: () => workflows.slice(), filter: applyFilter };
      window.SamsonTradingWorkflows = { getAll: () => workflows.filter((item) => groupOf(item) === 'trading'), filter: applyFilter };
      window.SamsonWordPressWorkflows = { getAll: () => workflows.filter((item) => groupOf(item) === 'wordpress'), filter: applyFilter };
    } catch (error) {
      console.error(error);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
