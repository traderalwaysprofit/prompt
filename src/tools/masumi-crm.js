import {
  buildCrmCsv,
  calculateCrmKpis,
  createCrmBackup,
  createLeadId,
  CRM_SCHEMA,
  CRM_SCHEMA_VERSION,
  CRM_STORAGE_KEY,
  getActiveFollowUps,
  getPriority,
  MAX_CRM_LEADS,
  MAX_IMPORT_BYTES,
  normalizeLead,
  parseCrmBackup,
  PIPELINE_STAGES,
  PRIORITY_LABELS,
  validateLeadCollection
} from './masumi-crm-core.js';

const STYLE_ID = 'masumi-crm-style';
const STYLE_HREF = '/src/tools/masumi-crm.css?v=1';

const DECISION_MAKER_STATUSES = ['Unknown', 'Influencer', 'Recommender', 'Decision Maker'];
const BRAND_STATUSES = ['Idea', 'New Brand', 'Existing Brand', 'Rebrand'];
const COMPLIANCE_STATUSES = ['Not Checked', 'Ready', 'Needs Review', 'Blocked'];

const optionMarkup = (values) => values.map((value) => `<option value="${value}">${value}</option>`).join('');
const scoreOptionMarkup = () => [0, 1, 2, 3, 4, 5].map((value) => `<option value="${value}">${value}</option>`).join('');

const ensureStylesheet = () => {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  document.head.appendChild(link);
};

const crmMarkup = (icon) => `
  <div class="masumi-crm">
    <header class="tools-page-header crm-page-header">
      <a class="tools-back" href="#tools" data-tools-catalog-back>${icon('M15 18l-6-6 6-6')}<span>Kembali ke Tools</span></a>
      <div class="tools-product-heading">
        <span class="tools-product-icon crm-product-icon">${icon('M3 21h18M5 21V7l7-4 7 4v14M8 11h8M8 15h8')}</span>
        <div class="tools-heading">
          <span class="tools-kicker">TOOLS / SALES & CRM</span>
          <h1 id="tools-title" tabindex="-1">MASUMI Sales CRM</h1>
          <p>Lead, pipeline, prioritas, dan follow-up dalam satu perangkat.</p>
        </div>
      </div>
    </header>

    <div class="crm-local-notice" role="note">
      ${icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4')}
      <div><strong>Data tersimpan hanya di perangkat ini</strong><span>Tidak ada data CRM yang dikirim ke server. Gunakan Backup JSON secara berkala agar data dapat dipulihkan.</span></div>
    </div>

    <section class="crm-kpi-grid" aria-label="Ringkasan kinerja CRM">
      <article class="tool-panel crm-kpi-card"><span>ACTIVE LEADS</span><strong id="crm-kpi-active">0</strong><small>Semua lead selain Won dan Lost</small></article>
      <article class="tool-panel crm-kpi-card"><span>QUALIFIED RATE</span><strong id="crm-kpi-qualified">0%</strong><small>Qualified hingga Won ÷ lead non-Lost</small></article>
      <article class="tool-panel crm-kpi-card is-alert"><span>OVERDUE FOLLOW-UP</span><strong id="crm-kpi-overdue">0</strong><small>Jadwal lewat pada lead aktif</small></article>
      <article class="tool-panel crm-kpi-card"><span>WEIGHTED FORECAST</span><strong id="crm-kpi-forecast">Rp0</strong><small>Nilai × probabilitas tahap open</small></article>
    </section>

    <section class="tool-panel crm-workspace" aria-labelledby="crm-register-title">
      <header class="crm-workspace-header">
        <div>
          <span class="tools-kicker">LOCAL SALES WORKSPACE</span>
          <h2 id="crm-register-title">Lead Register</h2>
          <p id="crm-record-count">0 dari ${MAX_CRM_LEADS.toLocaleString('id-ID')} lead tersimpan</p>
        </div>
        <div class="crm-primary-actions">
          <button class="tool-button tool-button-secondary" id="crm-backup-button" type="button" disabled>${icon('M12 3v12m0 0l-4-4m4 4 4-4M5 20h14')} Backup JSON</button>
          <button class="tool-button tool-button-secondary" id="crm-import-button" type="button">${icon('M12 16V4m0 0L8 8m4-4 4 4M5 20h14')} Impor JSON</button>
          <input class="sr-only" id="crm-import-input" type="file" accept=".json,application/json">
          <button class="tool-button tool-button-secondary" id="crm-csv-button" type="button" disabled>${icon('M12 3v12m0 0l-4-4m4 4 4-4M5 20h14')} Ekspor CSV</button>
          <button class="tool-button tool-button-primary crm-add-button" id="crm-add-button" type="button">${icon('M12 5v14M5 12h14')} Tambah Lead</button>
        </div>
      </header>

      <div class="tool-status crm-status" id="crm-status" role="status" aria-live="polite" data-tone="neutral">CRM siap digunakan.</div>

      <div class="crm-tabs" role="tablist" aria-label="Tampilan CRM">
        <button id="crm-tab-leads" type="button" role="tab" aria-selected="true" aria-controls="crm-panel-leads" data-crm-tab="leads">Lead Register <span id="crm-tab-lead-count">0</span></button>
        <button id="crm-tab-followups" type="button" role="tab" aria-selected="false" aria-controls="crm-panel-followups" data-crm-tab="followups">Follow-up <span id="crm-tab-followup-count">0</span></button>
      </div>

      <div id="crm-panel-leads" role="tabpanel" aria-labelledby="crm-tab-leads">
        <div class="crm-filters" aria-label="Cari dan filter lead">
          <label class="crm-search-field">
            <span class="sr-only">Cari lead</span>
            ${icon('M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0')}
            <input id="crm-search" type="search" placeholder="Cari brand, PIC, kota, owner, atau kebutuhan…" autocomplete="off">
          </label>
          <label><span class="sr-only">Filter pipeline</span><select id="crm-pipeline-filter"><option value="">Semua pipeline</option>${optionMarkup(PIPELINE_STAGES)}</select></label>
          <label><span class="sr-only">Filter prioritas</span><select id="crm-priority-filter"><option value="">Semua prioritas</option>${optionMarkup(PRIORITY_LABELS)}</select></label>
        </div>

        <div class="crm-empty-state" id="crm-lead-empty">
          <span>${icon('M4 5h16v14H4zM8 9h8M8 13h5')}</span>
          <h3>Belum ada lead</h3>
          <p>Tambahkan lead pertama. CRM tidak menyertakan data prospek contoh.</p>
          <button class="tool-button tool-button-primary" type="button" data-crm-open-add>Tambah Lead Pertama</button>
        </div>

        <div class="crm-table-wrap" id="crm-table-wrap" tabindex="0" aria-label="Tabel lead, dapat digulir horizontal" hidden>
          <table class="crm-table">
            <thead><tr><th scope="col">Prioritas</th><th scope="col">Brand & PIC</th><th scope="col">Pipeline</th><th scope="col">Next action</th><th scope="col">Potensi nilai</th><th scope="col"><span class="sr-only">Aksi</span></th></tr></thead>
            <tbody id="crm-lead-body"></tbody>
          </table>
        </div>
      </div>

      <div id="crm-panel-followups" role="tabpanel" aria-labelledby="crm-tab-followups" hidden>
        <div class="crm-followup-list" id="crm-followup-list"></div>
        <div class="crm-empty-state" id="crm-followup-empty">
          <span>${icon('M8 2v4M16 2v4M3 10h18M5 5h14v16H5zM9 15l2 2 4-4')}</span>
          <h3>Tidak ada follow-up aktif</h3>
          <p>Next action dari lead Won dan Lost tidak ditampilkan di sini.</p>
        </div>
      </div>
    </section>

    <dialog class="crm-dialog" id="crm-lead-dialog" aria-labelledby="crm-form-title">
      <form id="crm-lead-form" method="dialog" novalidate>
        <header class="crm-dialog-header">
          <div><span class="tools-kicker">MASUMI SALES CRM</span><h2 id="crm-form-title">Tambah Lead</h2></div>
          <button class="crm-icon-button" id="crm-form-close" type="button" aria-label="Tutup form">${icon('M6 6l12 12M18 6L6 18')}</button>
        </header>
        <div class="crm-form-body">
          <input id="crm-lead-id" name="id" type="hidden">
          <fieldset>
            <legend>Identitas lead</legend>
            <div class="crm-form-grid">
              <label><span>Tanggal lead</span><input name="leadDate" type="date"></label>
              <label><span>Sumber lead</span><input name="source" type="text" maxlength="120" placeholder="Instagram, referral, website…"></label>
              <label class="crm-span-2"><span>Perusahaan / brand <b>*</b></span><input name="company" type="text" maxlength="180" required></label>
              <label><span>Nama PIC <b>*</b></span><input name="picName" type="text" maxlength="140" required></label>
              <label><span>Jabatan PIC</span><input name="picRole" type="text" maxlength="120"></label>
              <label><span>Status decision maker</span><select name="decisionMakerStatus">${optionMarkup(DECISION_MAKER_STATUSES)}</select></label>
              <label><span>WhatsApp / telepon</span><input name="contact" type="tel" maxlength="80"></label>
              <label><span>Kota</span><input name="city" type="text" maxlength="120"></label>
              <label><span>Owner</span><input name="owner" type="text" maxlength="120" placeholder="Sales penanggung jawab"></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Peluang & pipeline</legend>
            <div class="crm-form-grid">
              <label><span>Status brand</span><select name="brandStatus">${optionMarkup(BRAND_STATUSES)}</select></label>
              <label><span>Pipeline</span><select id="crm-form-pipeline" name="pipeline">${optionMarkup(PIPELINE_STAGES)}</select></label>
              <label class="crm-span-2"><span>Produk / kebutuhan</span><textarea name="needs" rows="3" maxlength="500"></textarea></label>
              <label><span>Estimasi quantity</span><input name="estimatedQuantity" type="number" min="0" max="100000000" step="1" inputmode="numeric"></label>
              <label><span>Potensi nilai (Rp)</span><input name="potentialValue" type="number" min="0" max="999999999999" step="1" inputmode="numeric"></label>
              <label class="crm-span-2"><span>Target launch</span><input name="targetLaunch" type="text" maxlength="80" placeholder="Contoh: Januari 2027"></label>
              <label class="crm-span-2 crm-lost-field" id="crm-lost-field" hidden><span>Alasan Lost <b>*</b></span><textarea id="crm-lost-reason" name="lostReason" rows="2" maxlength="500"></textarea></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Follow-up & compliance</legend>
            <div class="crm-form-grid">
              <label><span>Kontak terakhir</span><input name="lastContact" type="date"></label>
              <label><span>Jadwal next action</span><input name="nextActionDate" type="date"></label>
              <label class="crm-span-2"><span>Next action</span><textarea name="nextAction" rows="3" maxlength="500" placeholder="Tindakan spesifik berikutnya"></textarea></label>
              <label><span>Status compliance</span><select name="complianceStatus">${optionMarkup(COMPLIANCE_STATUSES)}</select></label>
              <label><span>Blocker</span><input name="blocker" type="text" maxlength="500"></label>
              <label class="crm-span-2"><span>Catatan</span><textarea name="notes" rows="4" maxlength="3000"></textarea></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Priority scoring <small>0 = rendah, 5 = sangat tinggi</small></legend>
            <div class="crm-score-grid">
              <label><span>Fit</span><select name="fit">${scoreOptionMarkup()}</select></label>
              <label><span>Readiness</span><select name="readiness">${scoreOptionMarkup()}</select></label>
              <label><span>Urgency</span><select name="urgency">${scoreOptionMarkup()}</select></label>
              <label><span>Value</span><select name="valueScore">${scoreOptionMarkup()}</select></label>
              <output id="crm-score-preview" aria-live="polite"><strong>0/20</strong><span>Low</span></output>
            </div>
          </fieldset>
          <div class="tool-status crm-form-status" id="crm-form-status" role="alert" hidden></div>
        </div>
        <footer class="crm-dialog-footer">
          <button class="tool-button tool-button-secondary" id="crm-form-cancel" type="button">Batal</button>
          <button class="tool-button tool-button-primary" type="submit">Simpan Lead</button>
        </footer>
      </form>
    </dialog>
  </div>`;

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(value || 0);

const formatDate = (value) => {
  if (!value) return 'Belum dijadwalkan';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
};

const createTextElement = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
};

const downloadText = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const getStoredLeads = () => {
  const raw = localStorage.getItem(CRM_STORAGE_KEY);
  if (!raw) return [];
  return parseCrmBackup(raw);
};

const storeLeads = (leads) => {
  const validated = validateLeadCollection(leads);
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify({
    schema: CRM_SCHEMA,
    version: CRM_SCHEMA_VERSION,
    leads: validated
  }));
  return validated;
};

const matchesFilters = (lead, query, pipeline, priority) => {
  if (pipeline && lead.pipeline !== pipeline) return false;
  if (priority && getPriority(lead.scores).label !== priority) return false;
  if (!query) return true;
  const haystack = [
    lead.company, lead.picName, lead.picRole, lead.contact, lead.city, lead.owner,
    lead.source, lead.needs, lead.pipeline, lead.nextAction, lead.notes
  ].join(' ').toLocaleLowerCase('id');
  return haystack.includes(query.toLocaleLowerCase('id'));
};

const setStatus = (root, message, tone = 'neutral') => {
  const status = root.querySelector('#crm-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
};

const closeDialog = (dialog) => {
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
};

const openDialog = (dialog) => {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
};

export const mountTool = (root, { icon }) => {
  ensureStylesheet();
  root.innerHTML = crmMarkup(icon);

  const controller = new AbortController();
  const { signal } = controller;
  const state = { leads: [], activeTab: 'leads', editingId: null };
  const dialog = root.querySelector('#crm-lead-dialog');
  const form = root.querySelector('#crm-lead-form');
  const importInput = root.querySelector('#crm-import-input');
  const pipelineInput = root.querySelector('#crm-form-pipeline');
  const lostField = root.querySelector('#crm-lost-field');
  const lostReason = root.querySelector('#crm-lost-reason');

  const writeState = (nextLeads) => {
    const stored = storeLeads(nextLeads);
    state.leads = stored;
  };

  const renderKpis = () => {
    const kpis = calculateCrmKpis(state.leads);
    root.querySelector('#crm-kpi-active').textContent = String(kpis.activeLeads);
    root.querySelector('#crm-kpi-qualified').textContent = `${Math.round(kpis.qualifiedRate)}%`;
    root.querySelector('#crm-kpi-overdue').textContent = String(kpis.overdueFollowUps);
    root.querySelector('#crm-kpi-forecast').textContent = formatCurrency(kpis.weightedForecast);
  };

  const createActionButton = (label, action, id, className = '') => {
    const button = createTextElement('button', `crm-row-action ${className}`.trim(), label);
    button.type = 'button';
    button.dataset.crmAction = action;
    button.dataset.leadId = id;
    return button;
  };

  const renderLeads = () => {
    const query = root.querySelector('#crm-search').value.trim();
    const pipeline = root.querySelector('#crm-pipeline-filter').value;
    const priorityFilter = root.querySelector('#crm-priority-filter').value;
    const filtered = state.leads
      .filter((lead) => matchesFilters(lead, query, pipeline, priorityFilter))
      .sort((a, b) => (b.leadDate || b.createdAt).localeCompare(a.leadDate || a.createdAt));
    const body = root.querySelector('#crm-lead-body');
    const tableWrap = root.querySelector('#crm-table-wrap');
    const empty = root.querySelector('#crm-lead-empty');
    const fragment = document.createDocumentFragment();

    for (const lead of filtered) {
      const priority = getPriority(lead.scores);
      const row = document.createElement('tr');
      const priorityCell = document.createElement('td');
      const priorityBadge = createTextElement('span', `crm-priority is-${priority.label.toLowerCase()}`, priority.label);
      priorityCell.append(priorityBadge, createTextElement('small', '', `${priority.total}/20`));

      const identityCell = document.createElement('td');
      identityCell.append(
        createTextElement('strong', 'crm-lead-company', lead.company),
        createTextElement('span', '', `${lead.picName}${lead.city ? ` · ${lead.city}` : ''}`),
        createTextElement('small', '', lead.owner ? `Owner: ${lead.owner}` : 'Owner belum ditentukan')
      );

      const pipelineCell = document.createElement('td');
      pipelineCell.append(createTextElement('span', `crm-pipeline is-${lead.pipeline.toLowerCase().replace(/\s+/g, '-')}`, lead.pipeline));
      if (lead.pipeline === 'Lost') pipelineCell.append(createTextElement('small', 'crm-lost-copy', lead.lostReason));

      const followUpCell = document.createElement('td');
      const followUps = getActiveFollowUps([lead]);
      const followUp = followUps[0];
      followUpCell.append(
        createTextElement('strong', followUp?.overdue ? 'is-overdue' : '', followUp?.nextAction || 'Tidak ada next action'),
        createTextElement('small', followUp?.overdue ? 'is-overdue' : '', formatDate(followUp?.nextActionDate || ''))
      );

      const valueCell = document.createElement('td');
      valueCell.append(
        createTextElement('strong', '', formatCurrency(lead.potentialValue)),
        createTextElement('small', '', lead.estimatedQuantity ? `${lead.estimatedQuantity.toLocaleString('id-ID')} pcs` : 'Quantity belum diisi')
      );

      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'crm-row-actions';
      actions.append(
        createActionButton('Edit', 'edit', lead.id),
        createActionButton('Hapus', 'delete', lead.id, 'is-danger')
      );
      actionsCell.appendChild(actions);
      priorityCell.dataset.label = 'Prioritas';
      identityCell.dataset.label = 'Lead';
      pipelineCell.dataset.label = 'Pipeline';
      followUpCell.dataset.label = 'Follow-up';
      valueCell.dataset.label = 'Potensi';
      actionsCell.dataset.label = 'Aksi';
      row.append(priorityCell, identityCell, pipelineCell, followUpCell, valueCell, actionsCell);
      fragment.appendChild(row);
    }

    body.replaceChildren(fragment);
    tableWrap.hidden = filtered.length === 0;
    empty.hidden = filtered.length > 0;
    const emptyHeading = empty.querySelector('h3');
    const emptyCopy = empty.querySelector('p');
    const emptyButton = empty.querySelector('[data-crm-open-add]');
    if (state.leads.length && !filtered.length) {
      emptyHeading.textContent = 'Lead tidak ditemukan';
      emptyCopy.textContent = 'Ubah kata pencarian atau filter untuk melihat lead lain.';
      emptyButton.hidden = true;
    } else {
      emptyHeading.textContent = 'Belum ada lead';
      emptyCopy.textContent = 'Tambahkan lead pertama. CRM tidak menyertakan data prospek contoh.';
      emptyButton.hidden = false;
    }
  };

  const renderFollowUps = () => {
    const followUps = getActiveFollowUps(state.leads);
    const list = root.querySelector('#crm-followup-list');
    const empty = root.querySelector('#crm-followup-empty');
    const fragment = document.createDocumentFragment();

    for (const lead of followUps) {
      const item = document.createElement('article');
      item.className = `crm-followup-card${lead.overdue ? ' is-overdue' : ''}`;
      const date = createTextElement('div', 'crm-followup-date', formatDate(lead.nextActionDate));
      if (lead.overdue) date.appendChild(createTextElement('span', '', 'TERLAMBAT'));
      const content = document.createElement('div');
      content.className = 'crm-followup-content';
      content.append(
        createTextElement('span', 'tools-kicker', `${lead.pipeline} · ${getPriority(lead.scores).label}`),
        createTextElement('h3', '', lead.company),
        createTextElement('p', '', lead.nextAction),
        createTextElement('small', '', `${lead.picName}${lead.owner ? ` · Owner: ${lead.owner}` : ''}`)
      );
      item.append(date, content, createActionButton('Buka lead', 'edit', lead.id));
      fragment.appendChild(item);
    }

    list.replaceChildren(fragment);
    list.hidden = followUps.length === 0;
    empty.hidden = followUps.length > 0;
    root.querySelector('#crm-tab-followup-count').textContent = String(followUps.length);
  };

  const renderToolbar = () => {
    const count = state.leads.length;
    root.querySelector('#crm-record-count').textContent = `${count.toLocaleString('id-ID')} dari ${MAX_CRM_LEADS.toLocaleString('id-ID')} lead tersimpan`;
    root.querySelector('#crm-tab-lead-count').textContent = String(count);
    root.querySelector('#crm-backup-button').disabled = count === 0;
    root.querySelector('#crm-csv-button').disabled = count === 0;
    root.querySelector('#crm-add-button').disabled = count >= MAX_CRM_LEADS;
  };

  const renderAll = () => {
    renderKpis();
    renderLeads();
    renderFollowUps();
    renderToolbar();
  };

  const updateLostField = () => {
    const isLost = pipelineInput.value === 'Lost';
    lostField.hidden = !isLost;
    lostReason.required = isLost;
    if (!isLost) lostReason.setCustomValidity('');
  };

  const updateScorePreview = () => {
    const priority = getPriority({
      fit: form.elements.fit.value,
      readiness: form.elements.readiness.value,
      urgency: form.elements.urgency.value,
      value: form.elements.valueScore.value
    });
    const output = root.querySelector('#crm-score-preview');
    output.querySelector('strong').textContent = `${priority.total}/20`;
    output.querySelector('span').textContent = priority.label;
    output.dataset.priority = priority.label.toLowerCase();
  };

  const populateForm = (lead = null) => {
    form.reset();
    state.editingId = lead?.id || null;
    root.querySelector('#crm-form-title').textContent = lead ? 'Edit Lead' : 'Tambah Lead';
    root.querySelector('#crm-form-status').hidden = true;

    const defaults = {
      id: '',
      leadDate: new Date().toISOString().slice(0, 10),
      source: '', company: '', picName: '', picRole: '', decisionMakerStatus: 'Unknown',
      contact: '', city: '', owner: '', brandStatus: 'Idea', needs: '', estimatedQuantity: '',
      potentialValue: '', targetLaunch: '', pipeline: 'New', lastContact: '', nextAction: '',
      nextActionDate: '', complianceStatus: 'Not Checked', blocker: '', lostReason: '', notes: '',
      fit: 0, readiness: 0, urgency: 0, valueScore: 0
    };
    const values = lead ? {
      ...lead,
      fit: lead.scores.fit,
      readiness: lead.scores.readiness,
      urgency: lead.scores.urgency,
      valueScore: lead.scores.value
    } : defaults;

    for (const [name, value] of Object.entries(values)) {
      const control = form.elements.namedItem(name);
      if (control && typeof value !== 'object') control.value = String(value ?? '');
    }
    updateLostField();
    updateScorePreview();
  };

  const showLeadForm = (lead = null) => {
    populateForm(lead);
    openDialog(dialog);
    setTimeout(() => form.elements.company.focus(), 0);
  };

  const showFormError = (message) => {
    const status = root.querySelector('#crm-form-status');
    status.textContent = message;
    status.dataset.tone = 'error';
    status.hidden = false;
  };

  const setActiveTab = (tab) => {
    state.activeTab = tab;
    for (const button of root.querySelectorAll('[data-crm-tab]')) {
      const active = button.dataset.crmTab === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    root.querySelector('#crm-panel-leads').hidden = tab !== 'leads';
    root.querySelector('#crm-panel-followups').hidden = tab !== 'followups';
  };

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('#crm-add-button, [data-crm-open-add]')) {
      showLeadForm();
      return;
    }

    const tab = target.closest('[data-crm-tab]');
    if (tab) {
      setActiveTab(tab.dataset.crmTab);
      return;
    }

    const actionButton = target.closest('[data-crm-action]');
    if (!actionButton) return;
    const lead = state.leads.find((item) => item.id === actionButton.dataset.leadId);
    if (!lead) return;

    if (actionButton.dataset.crmAction === 'edit') {
      showLeadForm(lead);
      return;
    }

    if (actionButton.dataset.crmAction === 'delete') {
      const confirmed = window.confirm(`Hapus lead ${lead.company}? Tindakan ini tidak dapat dibatalkan.`);
      if (!confirmed) return;
      try {
        writeState(state.leads.filter((item) => item.id !== lead.id));
        renderAll();
        setStatus(root, `Lead ${lead.company} telah dihapus.`, 'success');
      } catch {
        setStatus(root, 'Lead gagal dihapus karena penyimpanan perangkat tidak tersedia.', 'error');
      }
    }
  }, { signal });

  root.querySelector('#crm-search').addEventListener('input', renderLeads, { signal });
  root.querySelector('#crm-pipeline-filter').addEventListener('change', renderLeads, { signal });
  root.querySelector('#crm-priority-filter').addEventListener('change', renderLeads, { signal });
  pipelineInput.addEventListener('change', updateLostField, { signal });
  for (const name of ['fit', 'readiness', 'urgency', 'valueScore']) {
    form.elements[name].addEventListener('change', updateScorePreview, { signal });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!state.editingId && state.leads.length >= MAX_CRM_LEADS) {
      showFormError(`Batas ${MAX_CRM_LEADS.toLocaleString('id-ID')} lead telah tercapai.`);
      return;
    }

    const values = Object.fromEntries(new FormData(form));
    const existing = state.leads.find((lead) => lead.id === state.editingId);
    try {
      const lead = normalizeLead({
        ...values,
        id: existing?.id || createLeadId(),
        createdAt: existing?.createdAt,
        scores: {
          fit: values.fit,
          readiness: values.readiness,
          urgency: values.urgency,
          value: values.valueScore
        }
      });
      const nextLeads = existing
        ? state.leads.map((item) => item.id === existing.id ? lead : item)
        : [...state.leads, lead];
      writeState(nextLeads);
      renderAll();
      closeDialog(dialog);
      setStatus(root, existing ? `Lead ${lead.company} berhasil diperbarui.` : `Lead ${lead.company} berhasil ditambahkan.`, 'success');
    } catch (error) {
      showFormError(error?.message || 'Lead gagal disimpan. Periksa kembali data yang diisi.');
    }
  }, { signal });

  const cancelForm = () => closeDialog(dialog);
  root.querySelector('#crm-form-close').addEventListener('click', cancelForm, { signal });
  root.querySelector('#crm-form-cancel').addEventListener('click', cancelForm, { signal });

  root.querySelector('#crm-backup-button').addEventListener('click', () => {
    const date = new Date().toISOString().slice(0, 10);
    const backup = createCrmBackup(state.leads);
    downloadText(`${JSON.stringify(backup, null, 2)}\n`, 'application/json;charset=utf-8', `masumi-sales-crm-backup-${date}.json`);
    setStatus(root, 'Backup JSON berhasil dibuat.', 'success');
  }, { signal });

  root.querySelector('#crm-csv-button').addEventListener('click', () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(buildCrmCsv(state.leads), 'text/csv;charset=utf-8', `masumi-sales-crm-${date}.csv`);
    setStatus(root, 'Laporan CSV berhasil dibuat dengan perlindungan formula spreadsheet.', 'success');
  }, { signal });

  root.querySelector('#crm-import-button').addEventListener('click', () => importInput.click(), { signal });
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Impor hanya menerima file .json.');
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Ukuran file JSON melebihi batas 5 MB.');
      const leads = parseCrmBackup(await file.text());
      const confirmed = window.confirm(`Impor akan mengganti ${state.leads.length.toLocaleString('id-ID')} lead lama dengan ${leads.length.toLocaleString('id-ID')} lead. Lanjutkan?`);
      if (!confirmed) {
        setStatus(root, 'Impor dibatalkan. Data lama tidak berubah.', 'neutral');
        return;
      }
      writeState(leads);
      renderAll();
      setStatus(root, `${leads.length.toLocaleString('id-ID')} lead berhasil dipulihkan dari backup.`, 'success');
    } catch (error) {
      setStatus(root, error?.message || 'File backup gagal diimpor.', 'error');
    } finally {
      importInput.value = '';
    }
  }, { signal });

  try {
    state.leads = getStoredLeads();
  } catch (error) {
    state.leads = [];
    setStatus(root, `Data lokal tidak dapat dimuat: ${error?.message || 'format tidak valid'}. Pulihkan dari Backup JSON.`, 'error');
  }
  renderAll();

  return {
    destroy() {
      controller.abort();
      closeDialog(dialog);
    }
  };
};
