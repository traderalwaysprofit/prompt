(() => {
  'use strict';

  const STORAGE_KEY = 'samsonRadarState';
  const sectionId = 'ai-radar';
  const state = {
    items: [],
    personal: readPersonalState(),
    filter: 'priority',
    topic: 'all',
    expandedAction: null
  };

  const actionLabels = {
    test: 'Test this feature',
    reference: 'Save as reference',
    prompt: 'Add Prompt Idea',
    workflow: 'Create Workflow Idea',
    backlog: 'Add Development Backlog',
    ignore: 'Ignore signal'
  };

  function readPersonalState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  const writePersonalState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.personal));
  const escapeHtml = (value = '') => String(value).replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[character]);

  const safeSourceUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '#';
    } catch {
      return '#';
    }
  };

  const personalFor = (id) => ({
    status: 'new',
    saved: false,
    actionType: null,
    ...(state.personal[id] || {})
  });

  const updatePersonal = (id, patch) => {
    state.personal[id] = { ...personalFor(id), ...patch };
    writePersonalState();
    render();
  };

  const sourceDate = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  };

  const priorityLabel = (score) => score >= 90 ? 'PRIORITY' : score >= 80 ? 'WATCH' : 'LOW';
  const statusLabel = (itemState) => {
    if (itemState.status === 'applied') return 'APPLIED';
    if (itemState.status === 'testing') return 'TESTING';
    if (itemState.status === 'read') return itemState.actionType ? 'ACTION QUEUED' : 'READ';
    if (itemState.status === 'ignored') return 'IGNORED';
    return 'NEW';
  };

  const clusterItems = (items) => {
    const groups = new Map();
    for (const item of items) {
      const existing = groups.get(item.clusterId);
      if (!existing || item.scores.radar > existing.scores.radar) groups.set(item.clusterId, item);
    }
    return [...groups.values()].sort((a, b) => {
      const date = String(b.source.publishedAt).localeCompare(String(a.source.publishedAt));
      return date || b.scores.radar - a.scores.radar;
    });
  };

  const visibleItems = () => clusterItems(state.items).filter((item) => {
    const itemState = personalFor(item.id);
    if (state.topic !== 'all' && !item.topics.includes(state.topic)) return false;
    if (state.filter === 'priority') return item.scores.radar >= 80 && itemState.status !== 'ignored';
    if (state.filter === 'saved') return itemState.saved && itemState.status !== 'ignored';
    if (state.filter === 'testing') return itemState.status === 'testing';
    if (state.filter === 'applied') return itemState.status === 'applied';
    return itemState.status !== 'ignored';
  });

  const summary = () => {
    const clustered = clusterItems(state.items);
    return {
      scanned: state.items.length,
      relevant: clustered.filter((item) => item.scores.radar >= 65).length,
      saved: clustered.filter((item) => personalFor(item.id).saved).length,
      testing: clustered.filter((item) => personalFor(item.id).status === 'testing').length,
      applied: clustered.filter((item) => personalFor(item.id).status === 'applied').length
    };
  };

  const relatedMarkup = (item) => {
    const prompts = (item.samson.relatedPrompts || []).map((prompt) => `<span>Prompt ${escapeHtml(prompt.name)}</span>`).join('');
    const workflows = (item.samson.relatedWorkflows || []).map((workflow) => `<span>Workflow: ${escapeHtml(workflow.name)}</span>`).join('');
    if (!prompts && !workflows) return '';
    return `<div class="radar-related" aria-label="Related SAMSON assets">${prompts}${workflows}</div>`;
  };

  const actionPanelMarkup = (item, itemState) => {
    if (state.expandedAction !== item.id) return '';
    return `<div class="radar-action-panel" data-radar-action-panel="${escapeHtml(item.id)}">
      <strong>TURN THIS SIGNAL INTO ACTION</strong>
      <div class="radar-action-grid">
        ${Object.entries(actionLabels).map(([type, label]) => `<button type="button" class="radar-action-choice" data-radar-action-choice="${type}" data-radar-id="${escapeHtml(item.id)}" data-selected="${itemState.actionType === type}">${escapeHtml(label)}</button>`).join('')}
      </div>
    </div>`;
  };

  const itemMarkup = (item) => {
    const itemState = personalFor(item.id);
    const score = item.scores.radar;
    return `<article class="radar-item" data-radar-item="${escapeHtml(item.id)}">
      <div class="radar-score-column" aria-label="Radar score ${score}">
        <span class="radar-score">${score}</span>
        <span class="radar-priority">${priorityLabel(score)}</span>
      </div>
      <div class="radar-item-body">
        <div class="radar-item-top">
          <div>
            <div class="radar-source-line">
              <strong>${escapeHtml(item.source.publisher)}</strong>
              <span class="radar-source-type">${escapeHtml(item.source.type.toUpperCase())}</span>
              <span>${escapeHtml(sourceDate(item.source.publishedAt))}</span>
              <span>• SAMSON ${escapeHtml(item.samson.impact.toUpperCase())}</span>
            </div>
            <h2>${escapeHtml(item.title)}</h2>
          </div>
          <span class="radar-state" data-status="${escapeHtml(itemState.status)}">${statusLabel(itemState)}</span>
        </div>
        <div class="radar-copy-grid">
          <div class="radar-copy"><strong>WHAT CHANGED</strong><p>${escapeHtml(item.whatChanged)}</p></div>
          <div class="radar-copy"><strong>WHY IT MATTERS</strong><p>${escapeHtml(item.whyItMatters)}</p></div>
        </div>
        <div class="radar-tags">${item.topics.map((topic) => `<span class="radar-tag">${escapeHtml(topic)}</span>`).join('')}</div>
        ${relatedMarkup(item)}
        <div class="radar-score-detail" aria-label="Radar score detail">
          <div><span>RELEVANCE</span><strong>${item.scores.relevance}</strong></div>
          <div><span>IMPACT</span><strong>${item.scores.impact}</strong></div>
          <div><span>ACTIONABLE</span><strong>${item.scores.actionability}</strong></div>
          <div><span>CONFIDENCE</span><strong>${item.scores.confidence}</strong></div>
          <div><span>NOVELTY</span><strong>${item.scores.novelty}</strong></div>
        </div>
        <div class="radar-item-actions">
          <button type="button" class="radar-status-action" data-radar-read="${escapeHtml(item.id)}">${itemState.status === 'new' ? 'Mark Read' : 'Read ✓'}</button>
          <button type="button" class="radar-status-action" data-radar-save="${escapeHtml(item.id)}">${itemState.saved ? 'Saved ✓' : 'Save'}</button>
          <button type="button" class="radar-action radar-action-primary" data-radar-create-action="${escapeHtml(item.id)}">Create Action</button>
          <button type="button" class="radar-status-action" data-radar-applied="${escapeHtml(item.id)}">Mark Applied</button>
          <a class="radar-source-link" href="${escapeHtml(safeSourceUrl(item.source.url))}" target="_blank" rel="noopener noreferrer" data-radar-source="${escapeHtml(item.id)}">Open Source ↗</a>
        </div>
        ${itemState.actionType && itemState.actionType !== 'ignore' ? `<div class="radar-tags"><span class="radar-tag">ACTION: ${escapeHtml(actionLabels[itemState.actionType] || itemState.actionType)}</span></div>` : ''}
        ${actionPanelMarkup(item, itemState)}
      </div>
    </article>`;
  };

  const render = () => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const stats = summary();
    const topics = [...new Set(state.items.flatMap((item) => item.topics))].sort();
    const items = visibleItems();
    section.innerHTML = `<div class="radar-shell">
      <header class="radar-header">
        <div>
          <span class="radar-eyebrow">PERSONAL AI INTELLIGENCE</span>
          <h1>AI Radar</h1>
          <p>Know → Decide → Apply. Signal AI yang relevan dipadatkan menjadi perubahan, dampak, skor, dan tindakan yang dapat diterapkan ke SAMSON.</p>
        </div>
        <div class="radar-loop"><strong>SAMSON INTELLIGENCE LOOP</strong><span>OBSERVE → UNDERSTAND → DECIDE → ACT → VERIFY → LEARN</span></div>
      </header>
      <div class="radar-summary" aria-label="Radar summary">
        <div class="radar-stat"><span class="radar-meta-label">SCANNED</span><strong>${stats.scanned}</strong></div>
        <div class="radar-stat"><span class="radar-meta-label">RELEVANT</span><strong>${stats.relevant}</strong></div>
        <div class="radar-stat"><span class="radar-meta-label">SAVED</span><strong>${stats.saved}</strong></div>
        <div class="radar-stat"><span class="radar-meta-label">TESTING</span><strong>${stats.testing}</strong></div>
        <div class="radar-stat"><span class="radar-meta-label">APPLIED</span><strong>${stats.applied}</strong></div>
      </div>
      <div class="radar-controls">
        <div class="radar-tabs" role="group" aria-label="Radar filters">
          ${[['priority','Priority'],['all','All'],['saved','Saved'],['testing','Testing'],['applied','Applied']].map(([id, label]) => `<button type="button" class="radar-tab" data-radar-filter="${id}" aria-pressed="${state.filter === id}">${label}</button>`).join('')}
        </div>
        <label class="radar-topic-wrap"><span class="radar-filter-label">TOPIC</span><select class="radar-topic-select" data-radar-topic><option value="all">All topics</option>${topics.map((topic) => `<option value="${escapeHtml(topic)}" ${state.topic === topic ? 'selected' : ''}>${escapeHtml(topic)}</option>`).join('')}</select></label>
      </div>
      <div class="radar-feed" data-radar-feed>${items.length ? items.map(itemMarkup).join('') : '<div class="radar-empty"><strong>No signals in this view.</strong><p>Change the filter or topic to continue.</p></div>'}</div>
      <div class="radar-footnote">Personal Beta · data signal bersifat static dan terkurasi. Read, Save, Testing, Applied, dan action queue disimpan hanya pada browser ini melalui localStorage. Belum ada AI API, account, atau backend.</div>
    </div>`;
  };

  const ensureSection = () => {
    if (document.getElementById(sectionId)) return document.getElementById(sectionId);
    const main = document.querySelector('main');
    if (!main) return null;
    const section = document.createElement('section');
    section.id = sectionId;
    section.className = 'radar-section';
    section.hidden = true;
    section.setAttribute('aria-label', 'SAMSON Personal AI Radar');
    const creator = main.querySelector('.creator-spot');
    if (creator) main.insertBefore(section, creator);
    else main.appendChild(section);
    return section;
  };

  const syncRoute = () => {
    const section = ensureSection();
    if (!section) return;
    const active = location.hash === '#radar';
    section.hidden = !active;
    if (active) {
      render();
      requestAnimationFrame(() => section.querySelector('h1')?.setAttribute('tabindex', '-1'));
      requestAnimationFrame(() => section.querySelector('h1')?.focus({ preventScroll: true }));
    }
  };

  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('#nav-radar, [data-mobile-nav="radar"]')) {
        if (location.hash !== '#radar') location.hash = 'radar';
        else syncRoute();
        return;
      }

      const filter = target.closest('[data-radar-filter]');
      if (filter) {
        state.filter = filter.dataset.radarFilter;
        render();
        return;
      }

      const read = target.closest('[data-radar-read]');
      if (read) {
        const id = read.dataset.radarRead;
        const current = personalFor(id);
        if (current.status === 'new') updatePersonal(id, { status: 'read' });
        return;
      }

      const save = target.closest('[data-radar-save]');
      if (save) {
        const id = save.dataset.radarSave;
        const current = personalFor(id);
        updatePersonal(id, { saved: !current.saved });
        return;
      }

      const createAction = target.closest('[data-radar-create-action]');
      if (createAction) {
        state.expandedAction = state.expandedAction === createAction.dataset.radarCreateAction ? null : createAction.dataset.radarCreateAction;
        render();
        return;
      }

      const choice = target.closest('[data-radar-action-choice]');
      if (choice) {
        const id = choice.dataset.radarId;
        const type = choice.dataset.radarActionChoice;
        state.expandedAction = null;
        if (type === 'ignore') updatePersonal(id, { status: 'ignored', actionType: 'ignore' });
        else if (type === 'test') updatePersonal(id, { status: 'testing', actionType: type });
        else updatePersonal(id, { status: 'read', actionType: type });
        return;
      }

      const applied = target.closest('[data-radar-applied]');
      if (applied) {
        updatePersonal(applied.dataset.radarApplied, { status: 'applied' });
        return;
      }

      const source = target.closest('[data-radar-source]');
      if (source) {
        const id = source.dataset.radarSource;
        if (personalFor(id).status === 'new') {
          state.personal[id] = { ...personalFor(id), status: 'read' };
          writePersonalState();
        }
      }
    });

    document.addEventListener('change', (event) => {
      const select = event.target.closest?.('[data-radar-topic]');
      if (!select) return;
      state.topic = select.value;
      render();
    });
    window.addEventListener('hashchange', syncRoute);
  };

  const loadData = async () => {
    try {
      const response = await fetch('/data/radar-items.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar data unavailable: ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error('Radar data contract invalid');
      state.items = items;
      render();
    } catch (error) {
      console.error(error);
      const section = ensureSection();
      if (section) section.innerHTML = '<div class="radar-shell"><div class="radar-empty"><strong>AI Radar unavailable.</strong><p>Data signal belum dapat dimuat. Workflow dan Prompt Library tetap dapat digunakan.</p></div></div>';
    }
  };

  const initialize = () => {
    if (!ensureSection() || document.documentElement.dataset.radarReady === 'true') return;
    document.documentElement.dataset.radarReady = 'true';
    bindEvents();
    loadData().finally(syncRoute);
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.querySelector('.site-header')) initialize();
})();
