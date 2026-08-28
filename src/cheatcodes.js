(() => {
  'use strict';

  const STORAGE_KEY = 'samsonCheatcodeProgress';
  let cheatcodes = [];
  let commandsById = new Map();
  let activeCheatcode = null;
  let activeStepIndex = 0;

  const escapeHtml = (value = '') => String(value).replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
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

  const completedSteps = (id) => {
    const stored = readProgress()[id];
    return new Set(Array.isArray(stored) ? stored.map(Number) : []);
  };

  const showNotice = (message) => {
    document.querySelector('.cheatcode-notice')?.remove();
    const notice = document.createElement('div');
    notice.className = 'cheatcode-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 2200);
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.className = 'copy-fallback-input';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    textarea.remove();
    return copied;
  };

  const copyPrompt = async (promptId, button) => {
    const command = commandsById.get(Number(promptId));
    if (!command) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command.template);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) copied = fallbackCopy(command.template);
    if (copied) {
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1600);
      showNotice(`${command.name} berhasil disalin`);
    } else {
      showNotice('Prompt belum dapat disalin');
    }
  };

  const renderFeatured = () => {
    const card = document.querySelector('#workflow-choice');
    const cheatcode = cheatcodes.find((item) => item.status === 'active');
    if (!card || !cheatcode) return;
    const done = completedSteps(cheatcode.id).size;
    const progressLabel = done ? `${done}/${cheatcode.steps.length} langkah selesai` : `${cheatcode.steps.length} langkah terpandu`;
    card.innerHTML = `
      <div class="choice-card-topline">
        <span class="choice-number" aria-hidden="true">01</span>
        <span class="choice-badge">RECOMMENDED</span>
      </div>
      <span class="choice-eyebrow">GUIDED WORKFLOW</span>
      <h3 id="workflow-choice-title">Selesaikan pekerjaan bertahap</h3>
      <p>Mulai dari tujuan, ikuti setiap langkah, lalu gunakan prompt yang tepat tanpa harus menyusun proses sendiri.</p>
      <div class="choice-feature">
        <strong>${escapeHtml(cheatcode.title)}</strong>
        <span>${escapeHtml(progressLabel)} · ${escapeHtml(cheatcode.estimatedTime)}</span>
      </div>
      <ul class="choice-benefits" aria-label="Workflow benefits">
        <li>Urutan kerja sudah disiapkan</li>
        <li>Progress tersimpan di browser</li>
        <li>Prompt tersedia pada setiap tahap</li>
      </ul>
      <button class="choice-action choice-action-primary" type="button" data-open-cheatcode="${escapeHtml(cheatcode.id)}">${done ? 'Lanjutkan Workflow' : 'Mulai Workflow'} <span aria-hidden="true">→</span></button>`;
  };

  const renderWorkflow  const renderWorkflow = () => {
    const detail = document.querySelector('#cheatcode-detail');
    if (!detail || !activeCheatcode) return;
    const completed = completedSteps(activeCheatcode.id);
    const step = activeCheatcode.steps[activeStepIndex];
    const completion = Math.round((completed.size / activeCheatcode.steps.length) * 100);
    const prompts = step.promptIds.map((id) => commandsById.get(Number(id))).filter(Boolean);

    detail.hidden = false;
    detail.innerHTML = `
      <div class="workflow-header">
        <div>
          <span class="cheatcodes-eyebrow">CHEATCODE / ${escapeHtml(activeCheatcode.id.toUpperCase())}</span>
          <h2 tabindex="-1">${escapeHtml(activeCheatcode.title)}</h2>
          <p>${escapeHtml(activeCheatcode.description)}</p>
        </div>
        <div class="workflow-progress" aria-label="Workflow progress ${completion}%">
          <div class="workflow-progress-label"><span>PROGRESS</span><span>${completed.size}/${activeCheatcode.steps.length}</span></div>
          <div class="workflow-progress-track"><div class="workflow-progress-bar" style="width:${completion}%"></div></div>
        </div>
      </div>
      <div class="workflow-layout">
        <nav class="workflow-steps" aria-label="Build Website steps">
          ${activeCheatcode.steps.map((item, index) => `
            <button class="workflow-step-tab" type="button" data-workflow-step="${index}" ${index === activeStepIndex ? 'aria-current="step"' : ''}>
              <span class="workflow-step-number">${String(item.number).padStart(2, '0')}</span>
              <span class="workflow-step-title">${escapeHtml(item.title)}</span>
              <span class="workflow-step-state" aria-label="${completed.has(item.number) ? 'Completed' : 'Not completed'}">${completed.has(item.number) ? '✓' : ''}</span>
            </button>`).join('')}
        </nav>
        <div class="workflow-content">
          <span class="cheatcodes-eyebrow">STEP ${String(step.number).padStart(2, '0')}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p class="workflow-description">${escapeHtml(step.description)}</p>
          <div class="workflow-output"><strong>OUTPUT</strong><span>${escapeHtml(step.output)}</span></div>
          <div class="workflow-prompts">
            ${prompts.map((command) => `
              <article class="workflow-prompt">
                <div class="workflow-prompt-header">
                  <code>${escapeHtml(command.name)}</code>
                  <button class="workflow-copy" type="button" data-copy-workflow-prompt="${command.id}" aria-label="Copy prompt ${escapeHtml(command.name)}">Copy Prompt</button>
                </div>
                <p>${escapeHtml(command.description)}</p>
              </article>`).join('')}
          </div>
          <div class="workflow-actions">
            <button class="workflow-reset" type="button" data-reset-workflow>Reset progress</button>
            <button class="workflow-next" type="button" data-complete-step>${activeStepIndex === activeCheatcode.steps.length - 1 ? 'Complete Workflow ✓' : 'Complete & Next →'}</button>
          </div>
        </div>
      </div>`;
  };

  const openCheatcode = (id, options = {}) => {
    const next = cheatcodes.find((item) => item.id === id);
    if (!next) return;
    activeCheatcode = next;
    const completed = completedSteps(id);
    const firstIncomplete = next.steps.findIndex((step) => !completed.has(step.number));
    activeStepIndex = options.stepIndex ?? (firstIncomplete === -1 ? 0 : firstIncomplete);
    renderWorkflow();
    if (options.updateHash !== false) history.replaceState(null, '', `#cheatcodes/${id}/step-${activeStepIndex + 1}`);
    const detail = document.querySelector('#cheatcode-detail');
    detail?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => detail?.querySelector('h2')?.focus({ preventScroll: true }));
  };

  const routeToPrompts = (category) => {
    const select = document.querySelector('#category-filter');
    if (category && select?.querySelector(`option[value="${category}"]`)) {
      select.value = category;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    history.replaceState(null, '', '#prompts');
    document.querySelector('#featured')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const completeCurrentStep = () => {
    if (!activeCheatcode) return;
    const progress = readProgress();
    const completed = completedSteps(activeCheatcode.id);
    const current = activeCheatcode.steps[activeStepIndex];
    completed.add(current.number);
    progress[activeCheatcode.id] = [...completed].sort((a, b) => a - b);
    writeProgress(progress);
    if (activeStepIndex < activeCheatcode.steps.length - 1) {
      activeStepIndex += 1;
      history.replaceState(null, '', `#cheatcodes/${activeCheatcode.id}/step-${activeStepIndex + 1}`);
      renderWorkflow();
      document.querySelector('.workflow-content')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      renderWorkflow();
      showNotice('Build Website workflow selesai');
    }
    renderFeatured();
  };

  const resetWorkflow = () => {
    if (!activeCheatcode) return;
    const progress = readProgress();
    delete progress[activeCheatcode.id];
    writeProgress(progress);
    activeStepIndex = 0;
    renderFeatured();
    renderWorkflow();
    showNotice('Progress workflow direset');
  };

  const enhanceBrand = () => {
    const header = document.querySelector('.site-header');
    const featured = document.querySelector('#featured');
    if (!header || !featured || document.querySelector('#cheatcodes')) return false;

    document.title = 'SAMSON — AI Cheatcodes for Real Work';
    const brand = header.querySelector('.logo-text strong');
    const subtitle = header.querySelector('.logo-text span');
    if (brand) brand.textContent = 'SAMSON';
    if (subtitle) subtitle.textContent = 'AI CHEATCODES & PROMPTS';

    const nav = header.querySelector('nav');
    const firstNav = nav?.querySelector('.nav-link');
    const promptNav = nav?.querySelector('#nav-recent');
    const favoriteNav = nav?.querySelector('#nav-favorites');
    if (firstNav) {
      firstNav.id = 'nav-cheatcodes';
      firstNav.textContent = 'Cheatcodes';
    }
    if (promptNav) promptNav.textContent = 'Prompt Library';
    if (nav && favoriteNav && !nav.querySelector('#nav-categories')) {
      const categories = document.createElement('button');
      categories.id = 'nav-categories';
      categories.className = 'nav-link';
      categories.type = 'button';
      categories.textContent = 'Categories';
      nav.insertBefore(categories, favoriteNav);
    }

    const heroCopy = document.querySelector('.hero-copy');
    if (heroCopy) heroCopy.innerHTML = `
      <div class="eyebrow">⚡ AI CHEATCODES FOR REAL WORK</div>
      <h1>Satu tujuan.<br><span>Dua cara memulai.</span></h1>
      <p>Pilih workflow terpandu untuk pekerjaan kompleks, atau temukan satu prompt untuk kebutuhan yang spesifik.</p>
      <div class="hero-actions">
        <button id="hero-cheatcodes" type="button">Pilih cara kerja <span>↓</span></button>
      </div>
      <div class="hero-stats"><span><b>1</b> WORKFLOW</span><span><b>200</b> PROMPTS</span><span><b>20</b> CATEGORIES</span></div>`;

    const heroCard = document.querySelector('.hero-card');
    if (heroCard) heroCard.innerHTML = `
      <span class="tag">SAMSON V1.5</span>
      <div class="hero-card-icon">↗</div>
      <h3>CHOOSE<br>YOUR PATH</h3>
      <p>WORKFLOW // PROMPT LIBRARY</p>
      <div class="hero-card-footer"><span>START WITH YOUR INTENT</span></div>`;
    featured.insertAdjacentHTML('beforebegin', `
      <section class="cheatcodes-section" id="cheatcodes" aria-labelledby="work-mode-title">
        <div class="cheatcodes-inner">
          <div class="cheatcodes-heading">
            <div>
              <span class="cheatcodes-eyebrow">START WITH YOUR INTENT</span>
              <h2 id="work-mode-title">Bagaimana Anda ingin bekerja?</h2>
            </div>
            <p>Pilih berdasarkan ukuran pekerjaan. Anda dapat berpindah jalur kapan saja tanpa kehilangan akses ke Prompt Library.</p>
          </div>
          <div class="choice-grid" aria-label="Pilihan cara kerja">
            <article class="choice-card choice-card-workflow" id="workflow-choice" aria-labelledby="workflow-choice-title" aria-live="polite">
              <p>Memuat workflow…</p>
            </article>
            <article class="choice-card choice-card-prompts" aria-labelledby="prompt-choice-title">
              <div class="choice-card-topline">
                <span class="choice-number" aria-hidden="true">02</span>
                <span class="choice-badge choice-badge-neutral">QUICK ACCESS</span>
              </div>
              <span class="choice-eyebrow">PROMPT LIBRARY</span>
              <h3 id="prompt-choice-title">Temukan satu prompt spesifik</h3>
              <p>Cocok saat Anda sudah tahu apa yang dibutuhkan dan ingin langsung mencari, memfilter, menyalin, atau menyimpan prompt.</p>
              <div class="choice-feature choice-feature-light">
                <strong>200 Ready-to-use Prompts</strong>
                <span>20 kategori · Search · Favorites</span>
              </div>
              <ul class="choice-benefits" aria-label="Prompt Library benefits">
                <li>Cari berdasarkan kebutuhan</li>
                <li>Filter berdasarkan kategori</li>
                <li>Simpan prompt favorit</li>
              </ul>
              <button class="choice-action choice-action-secondary" type="button" data-route-prompts>Buka Prompt Library <span aria-hidden="true">→</span></button>
            </article>
          </div>
          <p class="choice-help"><strong>Belum yakin?</strong> Pilih Workflow untuk pekerjaan besar. Pilih Prompt Library untuk satu tugas cepat.</p>
          <section class="cheatcode-detail" id="cheatcode-detail" hidden aria-label="Cheatcode detail"></section>
        </div>
      </section>`);
    const featuredEyebrow    const featuredEyebrow = featured.querySelector('.section-head .eyebrow');
    const featuredTitle = featured.querySelector('.section-head h2');
    if (featuredEyebrow) featuredEyebrow.textContent = '200 READY-TO-USE PROMPTS';
    if (featuredTitle) featuredTitle.textContent = 'Prompt Library';

    const creator = document.querySelector('.creator-spot');
    if (creator) creator.innerHTML = `
      <div><span class="eyebrow">TWO WAYS TO WORK</span><h2>Complete workflow.<br><span>Or one focused prompt.</span></h2><p>Cheatcodes guide complex outcomes step by step. Prompt Library gives you one reusable instruction for a specific task.</p></div>
      <div class="creator-card"><div class="avatar">S</div><div><strong>SAMSON</strong><span>AI Cheatcodes for Real Work</span></div></div>`;
    return true;
  };

  const loadData = async () => {
    try {
      const [cheatcodesResponse, commandsResponse, extraResponse] = await Promise.all([
        fetch('/data/cheatcodes.json', { cache: 'no-store' }),
        fetch('/data/commands.json', { cache: 'no-store' }),
        fetch('/data/commands-extra.json', { cache: 'no-store' })
      ]);
      if (!cheatcodesResponse.ok || !commandsResponse.ok || !extraResponse.ok) throw new Error('Cheatcode data unavailable');
      const [loadedCheatcodes, commands, extraCommands] = await Promise.all([
        cheatcodesResponse.json(),
        commandsResponse.json(),
        extraResponse.json()
      ]);
      cheatcodes = loadedCheatcodes;
      commandsById = new Map([...commands, ...extraCommands].map((command) => [Number(command.id), command]));
      renderFeatured();
      routeFromHash();
    } catch (error) {
      console.error(error);
      const card = document.querySelector('#featured-cheatcode');
      if (card) card.innerHTML = '<div class="featured-cheatcode-copy"><h3>Workflow unavailable</h3><p>Prompt Library tetap dapat digunakan sementara data Cheatcodes diperiksa.</p></div>';
    }
  };

  const routeFromHash = () => {
    const match = location.hash.match(/^#cheatcodes\/([^/]+)(?:\/step-(\d+))?/);
    if (match) {
      const stepIndex = Math.max(0, Number(match[2] || 1) - 1);
      openCheatcode(match[1], { stepIndex, updateHash: false });
    } else if (location.hash === '#prompts') {
      document.querySelector('#featured')?.scrollIntoView({ block: 'start' });
    }
  };

  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-open-cheatcode]');
      if (open) {
        openCheatcode(open.dataset.openCheatcode);
        return;
      }
      const task = event.target.closest('[data-prompt-category]');
      if (task) {
        routeToPrompts(task.dataset.promptCategory);
        return;
      }
      if (event.target.closest('[data-route-prompts], #hero-prompts, #nav-recent')) {
        routeToPrompts();
        return;
      }
      if (event.target.closest('#hero-cheatcodes, #nav-cheatcodes')) {
        history.replaceState(null, '', '#cheatcodes');
        document.querySelector('#cheatcodes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (event.target.closest('#nav-categories')) {
        routeToPrompts();
        requestAnimationFrame(() => document.querySelector('#category-filter')?.focus({ preventScroll: true }));
        return;
      }
      const step = event.target.closest('[data-workflow-step]');
      if (step && activeCheatcode) {
        activeStepIndex = Number(step.dataset.workflowStep);
        history.replaceState(null, '', `#cheatcodes/${activeCheatcode.id}/step-${activeStepIndex + 1}`);
        renderWorkflow();
        return;
      }
      const copy = event.target.closest('[data-copy-workflow-prompt]');
      if (copy) {
        copyPrompt(copy.dataset.copyWorkflowPrompt, copy);
        return;
      }
      if (event.target.closest('[data-complete-step]')) {
        completeCurrentStep();
        return;
      }
      if (event.target.closest('[data-reset-workflow]')) resetWorkflow();
    });
    window.addEventListener('hashchange', routeFromHash);
  };

  const initialize = () => {
    if (!enhanceBrand()) return;
    bindEvents();
    loadData();
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.querySelector('.site-header')) initialize();
})();
