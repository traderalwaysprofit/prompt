import {
  LEAD_STATUSES,
  PROSPECT_HEADERS,
  buildMapsRoute,
  buildProspectsCsv,
  buildWhatsAppBrief,
  calculateLeadScore,
  findDuplicate,
  mapProspectRows,
  normalizeLead
} from './b2b-prospecting-core.js';
import { B2BApiError, checkB2BHealth, enrichProspects, searchProspects } from './b2b-prospecting-api.js';
import {
  B2BStorageError,
  addLeads,
  clearLeads,
  deleteLead,
  loadLeads,
  saveLeads,
  updateLead
} from './b2b-prospecting-storage.js';

const STYLE_ID = 'b2b-prospecting-style';
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);
const STATUS_LABELS = Object.freeze({
  new: 'New', verified: 'Verified', qualified: 'Qualified', contacted: 'Contacted',
  responded: 'Responded', meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost'
});

const CATEGORY_OPTIONS = Object.freeze([
  ['aesthetic-clinic', 'Klinik Kecantikan (Aesthetic Clinic)'],
  ['salon-spa', 'Salon & Spa Menengah-Atas'],
  ['cosmetics-distributor', 'Distributor / Agen Kosmetik'],
  ['skincare-brand', 'Brand Skincare Lokal']
]);

const REGION_OPTIONS = Object.freeze(['Surabaya', 'Sidoarjo', 'Gresik', 'Mojokerto']);

let sheetJsPromise = null;

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = '/src/tools/b2b-prospecting.css?v=1';
  document.head.appendChild(link);
};

const ensureSheetJs = () => {
  if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
  if (sheetJsPromise) return sheetJsPromise;
  sheetJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/xlsx.full.min.js?v=0.20.3';
    script.async = true;
    script.dataset.sheetjsLoader = 'true';
    script.addEventListener('load', () => globalThis.XLSX ? resolve(globalThis.XLSX) : reject(new Error('Parser spreadsheet tidak tersedia.')), { once: true });
    script.addEventListener('error', () => reject(new Error('Parser spreadsheet gagal dimuat.')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    sheetJsPromise = null;
    throw error;
  });
  return sheetJsPromise;
};

const toolMarkup = (icon) => `
  <header class="tools-page-header b2b-page-header">
    <a class="tools-back" href="#tools" data-tools-catalog-back>${icon('M15 18l-6-6 6-6')}<span>Kembali ke Tools</span></a>
    <div class="b2b-heading-row">
      <div class="tools-product-heading">
        <span class="tools-product-icon">${icon('M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M8 9h.01M12 9h.01M16 9h.01')}</span>
        <div class="tools-heading">
          <span class="tools-kicker">TOOLS / SALES & PROSPECTING</span>
          <h1 id="tools-title" tabindex="-1">B2B Prospecting</h1>
          <p>Cari, verifikasi, qualify, dan kelola prospek B2B dalam satu workflow.</p>
        </div>
      </div>
      <span class="b2b-ai-badge" id="b2b-ai-badge" data-tone="checking" role="status" aria-live="polite">AI checking…</span>
    </div>
  </header>

  <section class="b2b-stats" aria-label="Ringkasan lead">
    <div><span>Total Leads</span><strong id="b2b-stat-total">0</strong></div>
    <div><span>Qualified</span><strong id="b2b-stat-qualified">0</strong></div>
    <div><span>Hot Prospects</span><strong id="b2b-stat-hot">0</strong></div>
    <div><span>Contacted+</span><strong id="b2b-stat-contacted">0</strong></div>
  </section>

  <nav class="b2b-tabs" role="tablist" aria-label="B2B Prospecting modules">
    <button type="button" role="tab" aria-selected="true" aria-controls="b2b-panel-search" id="b2b-tab-search" data-b2b-tab="search">Cari Prospek</button>
    <button type="button" role="tab" aria-selected="false" aria-controls="b2b-panel-leads" id="b2b-tab-leads" data-b2b-tab="leads">Database Leads</button>
    <button type="button" role="tab" aria-selected="false" aria-controls="b2b-panel-enrich" id="b2b-tab-enrich" data-b2b-tab="enrich">Enrich Leads</button>
    <button type="button" role="tab" aria-selected="false" aria-controls="b2b-panel-route" id="b2b-tab-route" data-b2b-tab="route">Rute Kunjungan</button>
  </nav>

  <div class="b2b-panels">
    <section id="b2b-panel-search" class="b2b-panel" role="tabpanel" aria-labelledby="b2b-tab-search">
      <div class="b2b-grid b2b-grid-search">
        <section class="tool-panel b2b-form-panel" aria-labelledby="b2b-search-title">
          <span class="tools-kicker">DISCOVER</span>
          <h2 id="b2b-search-title">Cari prospect dengan AI</h2>
          <p>Hasil AI masuk ke tahap review terlebih dahulu. Tidak ada lead yang disimpan otomatis.</p>
          <div class="b2b-field-grid">
            <label>Kategori Bisnis<select id="b2b-category"></select></label>
            <label>Wilayah / Kota<select id="b2b-region"></select></label>
            <label>Jumlah Prospect<select id="b2b-limit"><option value="5">5</option><option value="10">10</option></select></label>
          </div>
          <button type="button" class="tool-button tool-button-primary" id="b2b-search-button">${icon('M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0')}Cari Prospek</button>
          <div class="b2b-status" id="b2b-search-status" role="status" aria-live="polite">Pilih target prospect lalu mulai pencarian.</div>
        </section>
        <section class="tool-panel b2b-candidate-panel" aria-labelledby="b2b-candidate-title">
          <header class="b2b-section-heading">
            <div><span class="tools-kicker">REVIEW BEFORE SAVE</span><h2 id="b2b-candidate-title">Candidate Prospects</h2></div>
            <button type="button" class="tool-button tool-button-primary" id="b2b-save-candidates" disabled>Save Selected</button>
          </header>
          <div id="b2b-candidate-empty" class="b2b-empty"><strong>Belum ada kandidat</strong><span>Hasil pencarian akan muncul di sini untuk diverifikasi sebelum disimpan.</span></div>
          <div id="b2b-candidate-list" class="b2b-candidate-list" hidden></div>
        </section>
      </div>
    </section>

    <section id="b2b-panel-leads" class="b2b-panel" role="tabpanel" aria-labelledby="b2b-tab-leads" hidden>
      <section class="tool-panel">
        <header class="b2b-section-heading b2b-lead-heading">
          <div><span class="tools-kicker">LOCAL WORKSPACE</span><h2>Master Data Prospek</h2><p>Data disimpan di browser ini. Ekspor berkala untuk backup.</p></div>
          <div class="b2b-action-row">
            <input type="file" id="b2b-import-file" accept=".xlsx,.xls,.csv" class="sr-only" />
            <button type="button" class="tool-button tool-button-secondary" id="b2b-import-button">Import</button>
            <button type="button" class="tool-button tool-button-secondary" id="b2b-template-button">Template XLSX</button>
            <button type="button" class="tool-button tool-button-secondary" id="b2b-export-csv">Export CSV</button>
            <button type="button" class="tool-button tool-button-secondary" id="b2b-export-xlsx">Export XLSX</button>
          </div>
        </header>
        <div class="b2b-toolbar">
          <label class="b2b-search-field">Cari lead<input type="search" id="b2b-lead-search" placeholder="Brand, perusahaan, wilayah…" /></label>
          <label>Status<select id="b2b-status-filter"><option value="all">Semua status</option></select></label>
          <button type="button" class="b2b-danger-link" id="b2b-clear-button">Kosongkan database</button>
        </div>
        <div class="b2b-status" id="b2b-lead-status" role="status" aria-live="polite"></div>
        <div id="b2b-lead-empty" class="b2b-empty"><strong>Belum ada data</strong><span>Cari prospect, enrich data, atau import file untuk memulai.</span></div>
        <div class="b2b-table-wrap" id="b2b-lead-table-wrap" hidden tabindex="0" aria-label="Database leads, dapat digulir horizontal">
          <table class="b2b-table"><thead><tr><th>Prospek</th><th>Wilayah</th><th>Kontak</th><th>Score</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="b2b-lead-body"></tbody></table>
        </div>
      </section>
      <section class="tool-panel b2b-import-review" id="b2b-import-review" hidden aria-labelledby="b2b-import-title">
        <header class="b2b-section-heading"><div><span class="tools-kicker">IMPORT REVIEW</span><h2 id="b2b-import-title">Review data sebelum import</h2></div><button type="button" class="tool-button tool-button-primary" id="b2b-confirm-import">Confirm Import</button></header>
        <div class="b2b-import-summary" id="b2b-import-summary"></div>
        <div class="b2b-table-wrap"><table class="b2b-table"><thead><tr><th>Baris</th><th>Prospek</th><th>Wilayah</th><th>Status</th></tr></thead><tbody id="b2b-import-body"></tbody></table></div>
      </section>
    </section>

    <section id="b2b-panel-enrich" class="b2b-panel" role="tabpanel" aria-labelledby="b2b-tab-enrich" hidden>
      <div class="b2b-grid b2b-grid-search">
        <section class="tool-panel b2b-form-panel">
          <span class="tools-kicker">ENRICH / BPOM PRESET</span>
          <h2>Enrich data lead</h2>
          <p>Tempel data brand dan perusahaan dari BPOM. Input diperlakukan sebagai data, bukan instruksi AI.</p>
          <label>Data BPOM<textarea id="b2b-enrich-input" rows="8" placeholder="GlowAura - PT Cantik Makmur Surabaya&#10;Derma Klin - CV Estetika Sidoarjo"></textarea></label>
          <button type="button" class="tool-button tool-button-primary" id="b2b-enrich-button">Enrich dengan AI</button>
          <div class="b2b-status" id="b2b-enrich-status" role="status" aria-live="polite">Belum ada enrichment dijalankan.</div>
        </section>
        <section class="tool-panel b2b-candidate-panel">
          <header class="b2b-section-heading"><div><span class="tools-kicker">ENRICHMENT REVIEW</span><h2>Hasil Enrichment</h2></div><button type="button" class="tool-button tool-button-primary" id="b2b-save-enriched" disabled>Save Selected</button></header>
          <div id="b2b-enrich-empty" class="b2b-empty"><strong>Belum ada hasil</strong><span>Hasil enrichment tetap direview sebelum masuk database.</span></div>
          <div id="b2b-enrich-list" class="b2b-candidate-list" hidden></div>
        </section>
      </div>
    </section>

    <section id="b2b-panel-route" class="b2b-panel" role="tabpanel" aria-labelledby="b2b-tab-route" hidden>
      <div class="b2b-grid b2b-route-grid">
        <section class="tool-panel">
          <span class="tools-kicker">PLAN VISIT</span><h2>Pilih maksimal 4 prospek</h2>
          <div class="b2b-route-controls"><label>Tim / Sales<input id="b2b-sales-label" value="Tim Sales" maxlength="100" /></label><label>Filter Wilayah<select id="b2b-route-region"><option value="all">Semua wilayah</option></select></label></div>
          <div id="b2b-route-empty" class="b2b-empty"><strong>Database kosong</strong><span>Simpan lead terlebih dahulu untuk membuat rute kunjungan.</span></div>
          <div class="b2b-route-list" id="b2b-route-list" hidden></div>
        </section>
        <aside class="tool-panel b2b-brief-panel">
          <span class="tools-kicker">SALES BRIEF</span><h2>Briefing WhatsApp</h2>
          <button type="button" class="tool-button tool-button-primary" id="b2b-generate-brief">Buat Brief & Rute</button>
          <textarea id="b2b-brief-output" rows="14" readonly placeholder="Pilih prospek lalu buat briefing."></textarea>
          <div class="b2b-action-row">
            <button type="button" class="tool-button tool-button-secondary" id="b2b-copy-brief" disabled>Salin</button>
            <a class="tool-button tool-button-secondary" id="b2b-open-maps" href="#" target="_blank" rel="noopener noreferrer" aria-disabled="true">Maps ↗</a>
            <a class="tool-button tool-button-secondary" id="b2b-open-wa" href="#" target="_blank" rel="noopener noreferrer" aria-disabled="true">WhatsApp ↗</a>
          </div>
          <div class="b2b-status" id="b2b-route-status" role="status" aria-live="polite">Belum ada rute dibuat.</div>
        </aside>
      </div>
    </section>
  </div>

  <dialog class="b2b-dialog" id="b2b-dialog" aria-labelledby="b2b-dialog-title">
    <form method="dialog"><h2 id="b2b-dialog-title">Konfirmasi</h2><p id="b2b-dialog-message"></p><div class="b2b-action-row"><button value="cancel" class="tool-button tool-button-secondary">Batal</button><button value="confirm" class="tool-button tool-button-primary" id="b2b-dialog-confirm">Lanjutkan</button></div></form>
  </dialog>`;

const populateOptions = (root) => {
  const category = root.querySelector('#b2b-category');
  CATEGORY_OPTIONS.forEach(([value, label]) => category?.add(new Option(label, value)));
  const region = root.querySelector('#b2b-region');
  REGION_OPTIONS.forEach((value) => region?.add(new Option(value, value)));
  const status = root.querySelector('#b2b-status-filter');
  LEAD_STATUSES.forEach((value) => status?.add(new Option(STATUS_LABELS[value], value)));
};

const setStatus = (root, id, message, tone = 'neutral') => {
  const element = root.querySelector(id);
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
};

const scoreBadge = (lead) => {
  const { score, band } = calculateLeadScore(lead);
  const badge = document.createElement('span');
  badge.className = `b2b-score is-${band}`;
  badge.textContent = `${score} · ${band.toUpperCase()}`;
  badge.title = calculateLeadScore(lead).reasons.map((item) => `+${item.points} ${item.label}`).join(' · ');
  return badge;
};

const safeExternalLink = (label, href) => {
  const link = document.createElement('a');
  link.textContent = label;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
};

const renderStats = (root, state) => {
  const count = (selector, value) => { const el = root.querySelector(selector); if (el) el.textContent = String(value); };
  count('#b2b-stat-total', state.leads.length);
  count('#b2b-stat-qualified', state.leads.filter((lead) => ['qualified', 'meeting', 'proposal', 'won'].includes(lead.status)).length);
  count('#b2b-stat-hot', state.leads.filter((lead) => calculateLeadScore(lead).score >= 80).length);
  count('#b2b-stat-contacted', state.leads.filter((lead) => ['contacted', 'responded', 'meeting', 'proposal', 'won', 'lost'].includes(lead.status)).length);
};

const renderCandidateCollection = (root, state, { listSelector, emptySelector, saveSelector, candidatesKey }) => {
  const list = root.querySelector(listSelector);
  const empty = root.querySelector(emptySelector);
  const save = root.querySelector(saveSelector);
  if (!list || !empty || !save) return;
  list.replaceChildren();
  const candidates = state[candidatesKey];
  empty.hidden = candidates.length > 0;
  list.hidden = candidates.length === 0;

  candidates.forEach((candidate, index) => {
    const duplicate = findDuplicate(candidate, state.leads);
    const card = document.createElement('article');
    card.className = 'b2b-candidate-card';
    card.dataset.duplicate = duplicate.type;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'b2b-candidate-check';
    check.dataset.index = String(index);
    check.checked = duplicate.type === 'none';
    check.disabled = duplicate.type === 'exact';
    check.setAttribute('aria-label', `Pilih ${candidate.brand || candidate.company || 'prospek'}`);

    const main = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = candidate.brand || candidate.company || 'Prospek tanpa nama';
    const company = document.createElement('span');
    company.textContent = candidate.company && candidate.company !== candidate.brand ? candidate.company : candidate.category || 'Business prospect';
    main.append(title, company);

    const meta = document.createElement('div');
    meta.className = 'b2b-candidate-meta';
    const region = document.createElement('span'); region.textContent = candidate.region || 'Wilayah belum diketahui';
    meta.append(region, scoreBadge(candidate));
    if (duplicate.type !== 'none') {
      const dup = document.createElement('span');
      dup.className = `b2b-duplicate is-${duplicate.type}`;
      dup.textContent = duplicate.type === 'exact' ? `Duplicate · ${duplicate.reason}` : `Possible duplicate · ${duplicate.reason}`;
      meta.appendChild(dup);
    }

    const contact = document.createElement('div');
    contact.className = 'b2b-contact-line';
    if (candidate.website) contact.append(safeExternalLink('Website ↗', candidate.website));
    if (candidate.instagram) contact.append(safeExternalLink(`@${candidate.instagram} ↗`, `https://instagram.com/${encodeURIComponent(candidate.instagram)}`));
    if (candidate.phone) contact.append(safeExternalLink(candidate.phone, `https://wa.me/${candidate.phone.replace(/\D/g, '')}`));
    if (!contact.childNodes.length) { const missing = document.createElement('span'); missing.textContent = 'Kontak belum lengkap'; contact.appendChild(missing); }

    const sources = document.createElement('div');
    sources.className = 'b2b-source-line';
    const validSources = Array.isArray(candidate.sources) ? candidate.sources.slice(0, 3) : [];
    if (validSources.length) {
      const prefix = document.createElement('span'); prefix.textContent = 'Sources:'; sources.appendChild(prefix);
      validSources.forEach((source, sourceIndex) => sources.appendChild(safeExternalLink(source.label || `Source ${sourceIndex + 1}`, source.url)));
    } else {
      sources.textContent = 'Source belum tersedia — verifikasi manual sebelum outreach.';
    }

    const detail = document.createElement('div');
    detail.className = 'b2b-candidate-detail';
    detail.append(main, meta, contact, sources);
    card.append(check, detail);
    list.appendChild(card);
  });

  const updateSave = () => {
    const checked = list.querySelectorAll('.b2b-candidate-check:checked').length;
    save.disabled = checked === 0;
    save.textContent = checked ? `Save ${checked} Selected` : 'Save Selected';
  };
  list.querySelectorAll('.b2b-candidate-check').forEach((input) => input.addEventListener('change', updateSave, { signal: state.signal }));
  updateSave();
};

const renderLeads = (root, state) => {
  const body = root.querySelector('#b2b-lead-body');
  const empty = root.querySelector('#b2b-lead-empty');
  const wrap = root.querySelector('#b2b-lead-table-wrap');
  if (!body || !empty || !wrap) return;
  const query = (root.querySelector('#b2b-lead-search')?.value || '').trim().toLowerCase();
  const statusFilter = root.querySelector('#b2b-status-filter')?.value || 'all';
  const filtered = state.leads.filter((lead) => {
    const haystack = [lead.brand, lead.company, lead.region, lead.category, lead.phone, lead.instagram].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (statusFilter === 'all' || lead.status === statusFilter);
  });

  body.replaceChildren();
  empty.hidden = state.leads.length > 0;
  wrap.hidden = state.leads.length === 0;

  filtered.forEach((lead) => {
    const row = document.createElement('tr');
    const prospect = document.createElement('td');
    const title = document.createElement('strong'); title.textContent = lead.brand || lead.company || 'Tanpa nama';
    const company = document.createElement('small'); company.textContent = lead.company || lead.category || '—';
    prospect.append(title, company);

    const region = document.createElement('td'); region.textContent = lead.region || '—';
    const contacts = document.createElement('td');
    const contactStack = document.createElement('div'); contactStack.className = 'b2b-contact-stack';
    if (lead.phone) contactStack.append(safeExternalLink(lead.phone, `https://wa.me/${lead.phone.replace(/\D/g, '')}`));
    if (lead.instagram) contactStack.append(safeExternalLink(`@${lead.instagram}`, `https://instagram.com/${encodeURIComponent(lead.instagram)}`));
    if (lead.website) contactStack.append(safeExternalLink('Website', lead.website));
    if (!contactStack.childNodes.length) contactStack.textContent = '—';
    contacts.appendChild(contactStack);

    const score = document.createElement('td'); score.appendChild(scoreBadge(lead));
    const statusCell = document.createElement('td');
    const select = document.createElement('select'); select.className = 'b2b-status-select'; select.dataset.leadId = lead.id;
    LEAD_STATUSES.forEach((value) => select.add(new Option(STATUS_LABELS[value], value, false, lead.status === value)));
    statusCell.appendChild(select);

    const actions = document.createElement('td');
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'b2b-row-action'; remove.dataset.deleteLead = lead.id; remove.textContent = 'Hapus';
    actions.appendChild(remove);
    row.append(prospect, region, contacts, score, statusCell, actions);
    body.appendChild(row);
  });

  if (state.leads.length && filtered.length === 0) {
    const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 6; cell.className = 'b2b-no-results'; cell.textContent = 'Tidak ada lead yang cocok dengan filter.'; row.appendChild(cell); body.appendChild(row);
  }
  renderStats(root, state);
};

const saveState = (root, state, message = '') => {
  try {
    state.leads = saveLeads(state.leads);
    renderLeads(root, state);
    renderRouteLeads(root, state);
    if (message) setStatus(root, '#b2b-lead-status', message, 'success');
  } catch (error) {
    setStatus(root, '#b2b-lead-status', error instanceof B2BStorageError ? error.message : 'Data gagal disimpan.', 'error');
  }
};

const selectedCandidateIndexes = (root, listSelector) => [...root.querySelectorAll(`${listSelector} .b2b-candidate-check:checked`)].map((input) => Number(input.dataset.index));

const saveCandidateSet = (root, state, { candidatesKey, listSelector, statusSelector }) => {
  const indexes = selectedCandidateIndexes(root, listSelector);
  const selected = indexes.map((index) => state[candidatesKey][index]).filter(Boolean);
  const result = addLeads(state.leads, selected, { allowPossible: true });
  state.leads = result.leads;
  saveState(root, state, `${result.added.length} lead disimpan${result.skipped.length ? ` · ${result.skipped.length} duplicate dilewati` : ''}.`);
  state[candidatesKey] = [];
  renderCandidateCollection(root, state, candidatesKey === 'candidates' ? {
    listSelector: '#b2b-candidate-list', emptySelector: '#b2b-candidate-empty', saveSelector: '#b2b-save-candidates', candidatesKey
  } : {
    listSelector: '#b2b-enrich-list', emptySelector: '#b2b-enrich-empty', saveSelector: '#b2b-save-enriched', candidatesKey
  });
  setStatus(root, statusSelector, `${result.added.length} lead berhasil ditambahkan ke database.`, 'success');
};

const switchTab = (root, tab) => {
  const tabs = [...root.querySelectorAll('[data-b2b-tab]')];
  const panels = [...root.querySelectorAll('.b2b-panel')];
  tabs.forEach((button) => {
    const active = button.dataset.b2bTab === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => { panel.hidden = panel.id !== `b2b-panel-${tab}`; });
  tabs.find((button) => button.dataset.b2bTab === tab)?.focus({ preventScroll: true });
};

const normalizeApiCandidates = (payload) => {
  if (!Array.isArray(payload?.candidates)) return [];
  const globalSources = Array.isArray(payload.groundingSources) ? payload.groundingSources : [];
  return payload.candidates.slice(0, 10).map((candidate) => normalizeLead({
    ...candidate,
    sources: Array.isArray(candidate.sources) && candidate.sources.length ? candidate.sources : globalSources,
    lastVerifiedAt: new Date().toISOString()
  }, { preserveId: false }));
};

const setAiBusy = (root, busy) => {
  for (const selector of ['#b2b-search-button', '#b2b-enrich-button']) {
    const button = root.querySelector(selector);
    if (button) button.disabled = busy || button.dataset.aiDisabled === 'true';
  }
};

const checkHealth = async (root, state) => {
  const badge = root.querySelector('#b2b-ai-badge');
  try {
    const health = await checkB2BHealth({ signal: state.signal });
    const ready = health?.status === 'ready' && health?.configured === true;
    if (badge) { badge.textContent = ready ? 'AI Ready' : 'AI Setup Required'; badge.dataset.tone = ready ? 'ready' : 'warning'; }
    for (const selector of ['#b2b-search-button', '#b2b-enrich-button']) {
      const button = root.querySelector(selector);
      if (button) { button.dataset.aiDisabled = String(!ready); button.disabled = !ready; }
    }
    if (!ready) {
      setStatus(root, '#b2b-search-status', 'AI gateway aktif tetapi GEMINI_API_KEY belum dikonfigurasi.', 'warning');
      setStatus(root, '#b2b-enrich-status', 'AI gateway belum siap. Fitur lokal tetap dapat digunakan.', 'warning');
    }
  } catch {
    if (badge) { badge.textContent = 'AI Offline'; badge.dataset.tone = 'error'; }
    for (const selector of ['#b2b-search-button', '#b2b-enrich-button']) {
      const button = root.querySelector(selector);
      if (button) { button.dataset.aiDisabled = 'true'; button.disabled = true; }
    }
  }
};

const handleSearch = async (root, state) => {
  const category = root.querySelector('#b2b-category')?.value;
  const region = root.querySelector('#b2b-region')?.value;
  const limit = Number(root.querySelector('#b2b-limit')?.value || 5);
  setAiBusy(root, true);
  setStatus(root, '#b2b-search-status', 'Mencari dan memverifikasi prospect di web…', 'loading');
  try {
    const response = await searchProspects({ category, region, limit }, { signal: state.signal });
    state.candidates = normalizeApiCandidates(response);
    renderCandidateCollection(root, state, { listSelector: '#b2b-candidate-list', emptySelector: '#b2b-candidate-empty', saveSelector: '#b2b-save-candidates', candidatesKey: 'candidates' });
    setStatus(root, '#b2b-search-status', `${state.candidates.length} kandidat ditemukan. Review sumber dan duplicate sebelum menyimpan.`, state.candidates.length ? 'success' : 'warning');
  } catch (error) {
    state.candidates = [];
    renderCandidateCollection(root, state, { listSelector: '#b2b-candidate-list', emptySelector: '#b2b-candidate-empty', saveSelector: '#b2b-save-candidates', candidatesKey: 'candidates' });
    setStatus(root, '#b2b-search-status', error instanceof B2BApiError ? error.message : 'Pencarian gagal.', 'error');
  } finally {
    setAiBusy(root, false);
  }
};

const handleEnrich = async (root, state) => {
  const input = root.querySelector('#b2b-enrich-input')?.value.trim() || '';
  if (!input) { setStatus(root, '#b2b-enrich-status', 'Masukkan data BPOM terlebih dahulu.', 'warning'); return; }
  setAiBusy(root, true);
  setStatus(root, '#b2b-enrich-status', 'Mencari kontak dan sumber pendukung…', 'loading');
  try {
    const response = await enrichProspects({ mode: 'bpom', input }, { signal: state.signal });
    state.enriched = normalizeApiCandidates(response);
    renderCandidateCollection(root, state, { listSelector: '#b2b-enrich-list', emptySelector: '#b2b-enrich-empty', saveSelector: '#b2b-save-enriched', candidatesKey: 'enriched' });
    setStatus(root, '#b2b-enrich-status', `${state.enriched.length} kandidat enrichment siap direview.`, state.enriched.length ? 'success' : 'warning');
  } catch (error) {
    state.enriched = [];
    renderCandidateCollection(root, state, { listSelector: '#b2b-enrich-list', emptySelector: '#b2b-enrich-empty', saveSelector: '#b2b-save-enriched', candidatesKey: 'enriched' });
    setStatus(root, '#b2b-enrich-status', error instanceof B2BApiError ? error.message : 'Enrichment gagal.', 'error');
  } finally {
    setAiBusy(root, false);
  }
};

const extensionFor = (name) => name.toLowerCase().split('.').pop() || '';

const renderImportReview = (root, state) => {
  const section = root.querySelector('#b2b-import-review');
  const body = root.querySelector('#b2b-import-body');
  const summary = root.querySelector('#b2b-import-summary');
  const confirm = root.querySelector('#b2b-confirm-import');
  if (!section || !body || !summary || !confirm) return;
  const rows = state.importRows;
  section.hidden = rows.length === 0;
  body.replaceChildren();
  let duplicateCount = 0;
  rows.slice(0, 100).forEach((item) => {
    const duplicate = findDuplicate(item.lead, state.leads);
    if (duplicate.type === 'exact') duplicateCount += 1;
    const row = document.createElement('tr');
    const number = document.createElement('td'); number.textContent = String(item.rowNumber);
    const prospect = document.createElement('td'); prospect.textContent = item.lead.brand || item.lead.company || '—';
    const region = document.createElement('td'); region.textContent = item.lead.region || '—';
    const status = document.createElement('td');
    const badge = document.createElement('span'); badge.className = `b2b-import-state is-${duplicate.type === 'exact' ? 'duplicate' : item.status}`; badge.textContent = duplicate.type === 'exact' ? 'Duplicate' : item.reason; status.appendChild(badge);
    row.append(number, prospect, region, status); body.appendChild(row);
  });
  const importable = rows.filter((item) => findDuplicate(item.lead, state.leads).type !== 'exact');
  summary.textContent = `${rows.length} baris · ${importable.length} dapat diimport · ${duplicateCount} duplicate exact`;
  confirm.disabled = importable.length === 0;
  confirm.textContent = importable.length ? `Import ${importable.length} Lead` : 'Tidak ada lead baru';
};

const processImportFile = async (root, state, file) => {
  if (!(file instanceof File)) return;
  const extension = extensionFor(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) { setStatus(root, '#b2b-lead-status', 'Format tidak didukung. Gunakan XLSX, XLS, atau CSV.', 'error'); return; }
  if (!file.size || file.size > MAX_IMPORT_BYTES) { setStatus(root, '#b2b-lead-status', file.size ? 'File melebihi batas 10 MB.' : 'File kosong.', 'error'); return; }
  setStatus(root, '#b2b-lead-status', `Membaca ${file.name}…`, 'loading');
  try {
    const XLSX = await ensureSheetJs();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', dense: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: false });
    const mapped = mapProspectRows(rawRows);
    if (mapped.error) throw new Error(mapped.error);
    state.importRows = mapped.rows;
    renderImportReview(root, state);
    setStatus(root, '#b2b-lead-status', `${mapped.rows.length} baris dibaca. Review sebelum import.`, 'success');
  } catch (error) {
    state.importRows = [];
    renderImportReview(root, state);
    setStatus(root, '#b2b-lead-status', error.message || 'File gagal dibaca.', 'error');
  }
};

const confirmImport = (root, state) => {
  const candidates = state.importRows.filter((item) => findDuplicate(item.lead, state.leads).type !== 'exact').map((item) => item.lead);
  const result = addLeads(state.leads, candidates, { allowPossible: true });
  state.leads = result.leads;
  state.importRows = [];
  saveState(root, state, `${result.added.length} lead berhasil diimport.`);
  renderImportReview(root, state);
};

const downloadBlob = (content, type, fileName) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.hidden = true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
};

const exportCsv = (state) => {
  if (!state.leads.length) return;
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(buildProspectsCsv(state.leads), 'text/csv;charset=utf-8', `samson-b2b-prospects-${date}.csv`);
};

const workbookRows = (leads) => leads.map((lead) => ({
  Brand: lead.brand, Perusahaan: lead.company, Kategori: lead.category, Wilayah: lead.region, Alamat: lead.address,
  Website: lead.website, Instagram: lead.instagram ? `@${lead.instagram}` : '', WhatsApp: lead.phone, Status: lead.status, Catatan: lead.notes
}));

const exportXlsx = async (state) => {
  if (!state.leads.length) return;
  const XLSX = await ensureSheetJs();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(workbookRows(state.leads), { header: PROSPECT_HEADERS });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospects');
  XLSX.writeFile(workbook, `samson-b2b-prospects-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const downloadTemplate = async () => {
  const XLSX = await ensureSheetJs();
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([PROSPECT_HEADERS]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Prospects');
  XLSX.writeFile(workbook, 'samson-template-prospek.xlsx');
};

const renderRouteLeads = (root, state) => {
  const list = root.querySelector('#b2b-route-list');
  const empty = root.querySelector('#b2b-route-empty');
  const regionSelect = root.querySelector('#b2b-route-region');
  if (!list || !empty || !regionSelect) return;
  const regions = [...new Set(state.leads.map((lead) => lead.region).filter(Boolean))].sort();
  const current = regionSelect.value || 'all';
  regionSelect.replaceChildren(new Option('Semua wilayah', 'all'));
  regions.forEach((region) => regionSelect.add(new Option(region, region)));
  regionSelect.value = regions.includes(current) ? current : 'all';
  const filtered = state.leads.filter((lead) => regionSelect.value === 'all' || lead.region === regionSelect.value);
  list.replaceChildren();
  empty.hidden = state.leads.length > 0;
  list.hidden = state.leads.length === 0;
  filtered.forEach((lead) => {
    const label = document.createElement('label'); label.className = 'b2b-route-item';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = lead.id; input.className = 'b2b-route-check'; input.checked = state.routeIds.has(lead.id);
    const text = document.createElement('span'); const strong = document.createElement('strong'); strong.textContent = lead.brand || lead.company || 'Prospek'; const small = document.createElement('small'); small.textContent = [lead.region, lead.address].filter(Boolean).join(' · ') || 'Lokasi belum lengkap'; text.append(strong, small);
    label.append(input, text); list.appendChild(label);
  });
};

const generateBrief = (root, state) => {
  const selected = state.leads.filter((lead) => state.routeIds.has(lead.id)).slice(0, 4);
  if (!selected.length) { setStatus(root, '#b2b-route-status', 'Pilih minimal satu prospek.', 'warning'); return; }
  const salesLabel = root.querySelector('#b2b-sales-label')?.value || 'Tim Sales';
  const brief = buildWhatsAppBrief(selected, { salesLabel });
  const maps = buildMapsRoute(selected);
  const output = root.querySelector('#b2b-brief-output'); if (output) output.value = brief;
  const copy = root.querySelector('#b2b-copy-brief'); if (copy) copy.disabled = false;
  const mapsLink = root.querySelector('#b2b-open-maps'); if (mapsLink) { mapsLink.href = maps; mapsLink.setAttribute('aria-disabled', 'false'); }
  const wa = root.querySelector('#b2b-open-wa'); if (wa) { wa.href = `https://wa.me/?text=${encodeURIComponent(brief)}`; wa.setAttribute('aria-disabled', 'false'); }
  setStatus(root, '#b2b-route-status', `${selected.length} lokasi disiapkan. Urutan mengikuti pilihan, belum merupakan optimasi jarak.`, 'success');
};

const confirmAction = (root, { title, message, confirmLabel = 'Lanjutkan' }, onConfirm) => {
  const dialog = root.querySelector('#b2b-dialog');
  if (!(dialog instanceof HTMLDialogElement)) { if (globalThis.confirm?.(message)) onConfirm(); return; }
  root.querySelector('#b2b-dialog-title').textContent = title;
  root.querySelector('#b2b-dialog-message').textContent = message;
  root.querySelector('#b2b-dialog-confirm').textContent = confirmLabel;
  const handler = () => { dialog.removeEventListener('close', handler); if (dialog.returnValue === 'confirm') onConfirm(); };
  dialog.addEventListener('close', handler, { once: true });
  dialog.showModal();
};

const bindEvents = (root, state) => {
  root.querySelectorAll('[data-b2b-tab]').forEach((button, index, tabs) => {
    button.addEventListener('click', () => switchTab(root, button.dataset.b2bTab), { signal: state.signal });
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      switchTab(root, tabs[next].dataset.b2bTab);
    }, { signal: state.signal });
  });
  root.querySelector('#b2b-search-button')?.addEventListener('click', () => handleSearch(root, state), { signal: state.signal });
  root.querySelector('#b2b-enrich-button')?.addEventListener('click', () => handleEnrich(root, state), { signal: state.signal });
  root.querySelector('#b2b-save-candidates')?.addEventListener('click', () => saveCandidateSet(root, state, { candidatesKey: 'candidates', listSelector: '#b2b-candidate-list', statusSelector: '#b2b-search-status' }), { signal: state.signal });
  root.querySelector('#b2b-save-enriched')?.addEventListener('click', () => saveCandidateSet(root, state, { candidatesKey: 'enriched', listSelector: '#b2b-enrich-list', statusSelector: '#b2b-enrich-status' }), { signal: state.signal });
  root.querySelector('#b2b-lead-search')?.addEventListener('input', () => renderLeads(root, state), { signal: state.signal });
  root.querySelector('#b2b-status-filter')?.addEventListener('change', () => renderLeads(root, state), { signal: state.signal });
  root.querySelector('#b2b-lead-body')?.addEventListener('change', (event) => {
    const select = event.target.closest('.b2b-status-select'); if (!select) return;
    state.leads = updateLead(state.leads, select.dataset.leadId, { status: select.value }); saveState(root, state, 'Status lead diperbarui.');
  }, { signal: state.signal });
  root.querySelector('#b2b-lead-body')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-lead]'); if (!button) return;
    const lead = state.leads.find((item) => item.id === button.dataset.deleteLead);
    confirmAction(root, { title: 'Hapus lead', message: `Hapus ${lead?.brand || lead?.company || 'lead ini'} dari database lokal?`, confirmLabel: 'Hapus' }, () => {
      state.leads = deleteLead(state.leads, button.dataset.deleteLead); saveState(root, state, 'Lead dihapus.');
    });
  }, { signal: state.signal });
  root.querySelector('#b2b-clear-button')?.addEventListener('click', () => confirmAction(root, { title: 'Kosongkan database', message: 'Seluruh lead lokal akan dihapus dari browser ini. Pastikan data penting sudah diekspor.', confirmLabel: 'Kosongkan' }, () => {
    clearLeads(); state.leads = []; state.routeIds.clear(); renderLeads(root, state); renderRouteLeads(root, state); setStatus(root, '#b2b-lead-status', 'Database lokal dikosongkan.', 'success');
  }), { signal: state.signal });
  const fileInput = root.querySelector('#b2b-import-file');
  root.querySelector('#b2b-import-button')?.addEventListener('click', () => fileInput?.click(), { signal: state.signal });
  fileInput?.addEventListener('change', () => { if (fileInput.files?.[0]) processImportFile(root, state, fileInput.files[0]); fileInput.value = ''; }, { signal: state.signal });
  root.querySelector('#b2b-confirm-import')?.addEventListener('click', () => confirmImport(root, state), { signal: state.signal });
  root.querySelector('#b2b-export-csv')?.addEventListener('click', () => exportCsv(state), { signal: state.signal });
  root.querySelector('#b2b-export-xlsx')?.addEventListener('click', () => exportXlsx(state).catch(() => setStatus(root, '#b2b-lead-status', 'Export XLSX gagal.', 'error')), { signal: state.signal });
  root.querySelector('#b2b-template-button')?.addEventListener('click', () => downloadTemplate().catch(() => setStatus(root, '#b2b-lead-status', 'Template gagal dibuat.', 'error')), { signal: state.signal });
  root.querySelector('#b2b-route-region')?.addEventListener('change', () => renderRouteLeads(root, state), { signal: state.signal });
  root.querySelector('#b2b-route-list')?.addEventListener('change', (event) => {
    const input = event.target.closest('.b2b-route-check'); if (!input) return;
    if (input.checked) {
      if (state.routeIds.size >= 4) { input.checked = false; setStatus(root, '#b2b-route-status', 'Maksimal 4 prospek per rute.', 'warning'); return; }
      state.routeIds.add(input.value);
    } else state.routeIds.delete(input.value);
  }, { signal: state.signal });
  root.querySelector('#b2b-generate-brief')?.addEventListener('click', () => generateBrief(root, state), { signal: state.signal });
  root.querySelector('#b2b-copy-brief')?.addEventListener('click', async () => {
    const value = root.querySelector('#b2b-brief-output')?.value || ''; if (!value) return;
    try { await navigator.clipboard.writeText(value); setStatus(root, '#b2b-route-status', 'Briefing disalin ke clipboard.', 'success'); } catch { setStatus(root, '#b2b-route-status', 'Clipboard tidak tersedia. Salin teks secara manual.', 'warning'); }
  }, { signal: state.signal });
};

export const mountTool = (root, { icon }) => {
  if (!(root instanceof Element)) throw new TypeError('B2B Prospecting membutuhkan elemen root.');
  ensureStyle();
  const abortController = new AbortController();
  const state = { leads: [], candidates: [], enriched: [], importRows: [], routeIds: new Set(), signal: abortController.signal };
  root.innerHTML = toolMarkup(icon);
  populateOptions(root);
  try {
    const loaded = loadLeads();
    state.leads = loaded.leads;
    setStatus(root, '#b2b-lead-status', loaded.migrated ? 'Database prototype lama berhasil dimigrasikan ke schema V1.' : 'Data disimpan lokal di browser ini.', loaded.migrated ? 'success' : 'neutral');
  } catch (error) {
    setStatus(root, '#b2b-lead-status', error instanceof B2BStorageError ? error.message : 'Database lokal gagal dibaca.', 'error');
  }
  bindEvents(root, state);
  renderStats(root, state);
  renderLeads(root, state);
  renderRouteLeads(root, state);
  renderCandidateCollection(root, state, { listSelector: '#b2b-candidate-list', emptySelector: '#b2b-candidate-empty', saveSelector: '#b2b-save-candidates', candidatesKey: 'candidates' });
  renderCandidateCollection(root, state, { listSelector: '#b2b-enrich-list', emptySelector: '#b2b-enrich-empty', saveSelector: '#b2b-save-enriched', candidatesKey: 'enriched' });
  checkHealth(root, state);
  return { destroy() { abortController.abort(); } };
};
