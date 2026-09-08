import {
  cleanCrmText,
  CRM_SCHEMA,
  CRM_SCHEMA_VERSION,
  getPriority,
  MAX_IMPORT_BYTES
} from '/crm-core.js';
import { createCrmClient, CrmApiClientError } from '/crm-client.js';

const THEME_STORAGE_KEY = 'samsonTheme';
const THEMES = new Set(['default', 'developer', 'swiss', 'pixel']);
const PAGE_SIZE = 50;
const client = createCrmClient();

const element = (selector) => document.querySelector(selector);
const form = element('#lead-form');
const dialog = element('#lead-dialog');
const importDialog = element('#import-dialog');
const importForm = element('#import-form');
const state = {
  session: null,
  users: [],
  leads: [],
  total: 0,
  offset: 0,
  editing: null,
  loading: false,
  saving: false,
  dashboard: null,
  importBackup: null,
  importPreview: null,
  importBusy: false,
  listRequest: 0,
  searchTimer: 0
};

const normalizeTheme = (value) => THEMES.has(value) ? value : 'default';

const applyTheme = (value) => {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = ['developer', 'pixel'].includes(theme) ? 'dark' : 'light';
  element('#theme-select').value = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
};

const readTheme = () => {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'default';
  }
};

const textNode = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
};

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

const isOverdue = (lead) => {
  if (!lead.nextAction || !lead.nextActionDate || ['Won', 'Lost'].includes(lead.pipeline)) return false;
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  return lead.nextActionDate < today;
};

const errorMessage = (error) => {
  if (!(error instanceof CrmApiClientError)) return 'Terjadi kesalahan yang tidak dikenali.';
  if (error.status === 401) return 'Sesi login tidak ditemukan atau sudah berakhir. Muat ulang untuk masuk melalui Cloudflare Access.';
  if (error.status === 403) return 'Akun ini belum diberi akses ke MASUMI Sales CRM.';
  if (error.code === 'VERSION_CONFLICT') return 'Lead telah diperbarui oleh pengguna lain. Muat data terbaru sebelum menyimpan lagi.';
  return error.message;
};

const setAppStatus = (copy, tone = 'neutral', retry = false) => {
  element('#app-status-copy').textContent = copy;
  element('#app-status').dataset.tone = tone;
  element('#retry-app').hidden = !retry;
};

const setFormStatus = (copy = '', { conflict = false } = {}) => {
  const status = element('#form-status');
  status.hidden = !copy;
  element('#form-status-copy').textContent = copy;
  element('#reload-conflict').hidden = !conflict;
};

const setLoading = (loading) => {
  state.loading = loading;
  element('#register').setAttribute('aria-busy', String(loading));
  element('#refresh-leads').disabled = loading || !state.session;
  element('#add-lead').disabled = loading || !state.session;
  element('#empty-add').disabled = loading || !state.session;
  element('#lead-search').disabled = loading || !state.session;
  element('#pipeline-filter').disabled = loading || !state.session;
  element('#owner-filter').disabled = loading || state.session?.role !== 'admin';
  for (const button of document.querySelectorAll('[data-admin-action]')) {
    button.disabled = loading || state.session?.role !== 'admin';
  }
};

const replaceOptions = (select, users, firstLabel = '') => {
  select.replaceChildren();
  if (firstLabel) {
    const first = document.createElement('option');
    first.value = '';
    first.textContent = firstLabel;
    select.appendChild(first);
  }
  for (const user of users) {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.displayName;
    select.appendChild(option);
  }
};

const ownerName = (id) => state.users.find((user) => user.id === id)?.displayName || 'Owner tidak tersedia';

const renderSession = () => {
  const chip = element('#session-chip');
  chip.hidden = false;
  element('#session-name').textContent = state.session.displayName;
  element('#session-role').textContent = state.session.role === 'admin' ? 'Admin' : 'Sales';
  element('#session-initial').textContent = state.session.displayName.trim().charAt(0).toLocaleUpperCase('id') || 'M';

  const ownerFilterField = element('#owner-filter-field');
  ownerFilterField.hidden = state.session.role !== 'admin';
  replaceOptions(element('#owner-filter'), state.users, 'Semua owner');
  replaceOptions(form.elements.ownerUserId, state.users);
  for (const button of document.querySelectorAll('[data-admin-action]')) {
    button.hidden = state.session.role !== 'admin';
  }
};

const renderDashboard = () => {
  if (!state.dashboard) return;
  const { kpis, followUps } = state.dashboard;
  element('#kpi-active').textContent = kpis.activeLeads.toLocaleString('id-ID');
  element('#kpi-qualified').textContent = `${kpis.qualifiedRate.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
  element('#kpi-overdue').textContent = kpis.overdueFollowUps.toLocaleString('id-ID');
  element('#kpi-forecast').textContent = formatCurrency(kpis.weightedForecast);
  element('#kpi-grid').setAttribute('aria-busy', 'false');
  element('#follow-up-count').textContent = followUps.length.toLocaleString('id-ID');

  const list = element('#follow-up-list');
  list.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const lead of followUps) {
    const card = document.createElement('article');
    card.className = `follow-up-card${lead.overdue ? ' is-overdue' : ''}`;
    const heading = textNode('h3', '', lead.company);
    const date = textNode('time', '', lead.nextActionDate ? formatDate(lead.nextActionDate) : 'Belum dijadwalkan');
    if (lead.nextActionDate) date.dateTime = lead.nextActionDate;
    const action = textNode('p', 'follow-action', lead.nextAction);
    const detail = textNode('small', '', `${lead.picName} · ${lead.owner}`);
    card.append(heading, date, action, detail);
    fragment.appendChild(card);
  }
  list.appendChild(fragment);
  element('#follow-up-empty').hidden = followUps.length > 0;
  list.hidden = followUps.length === 0;
};

const actionButton = (label, action, lead) => {
  const button = textNode('button', `row-action ${action === 'delete' ? 'is-danger' : ''}`.trim(), label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.leadId = lead.id;
  return button;
};

const tableCell = (label) => {
  const cell = document.createElement('td');
  cell.dataset.label = label;
  return cell;
};

const renderLeads = () => {
  const rows = element('#lead-rows');
  rows.replaceChildren();
  const fragment = document.createDocumentFragment();

  for (const lead of state.leads) {
    const priority = getPriority(lead.scores);
    const row = document.createElement('tr');

    const priorityCell = tableCell('Prioritas');
    priorityCell.append(
      textNode('span', `priority is-${priority.label.toLocaleLowerCase('id')}`, priority.label),
      textNode('small', '', `${priority.total}/20`)
    );

    const identityCell = tableCell('Lead');
    identityCell.append(
      textNode('strong', 'lead-company', lead.company),
      textNode('span', '', `${lead.picName}${lead.city ? ` · ${lead.city}` : ''}`),
      textNode('small', '', `Owner: ${ownerName(lead.ownerUserId)}`)
    );

    const pipelineCell = tableCell('Pipeline');
    pipelineCell.append(textNode('span', 'pipeline', lead.pipeline));
    if (lead.pipeline === 'Lost') pipelineCell.append(textNode('small', 'lost-copy', lead.lostReason));

    const followUpCell = tableCell('Next action');
    const overdue = isOverdue(lead);
    followUpCell.append(
      textNode('strong', overdue ? 'overdue' : '', lead.nextAction || 'Belum ada next action'),
      textNode('small', overdue ? 'overdue' : '', formatDate(lead.nextActionDate))
    );

    const valueCell = tableCell('Potensi nilai');
    valueCell.append(
      textNode('strong', '', formatCurrency(lead.potentialValue)),
      textNode('small', '', lead.estimatedQuantity ? `${lead.estimatedQuantity.toLocaleString('id-ID')} pcs` : 'Quantity belum diisi')
    );

    const actionsCell = tableCell('Aksi');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.append(actionButton('Edit', 'edit', lead), actionButton('Hapus', 'delete', lead));
    actionsCell.appendChild(actions);

    row.append(priorityCell, identityCell, pipelineCell, followUpCell, valueCell, actionsCell);
    fragment.appendChild(row);
  }
  rows.appendChild(fragment);

  const hasLeads = state.leads.length > 0;
  const hasFilters = Boolean(
    element('#lead-search').value.trim() ||
    element('#pipeline-filter').value ||
    element('#owner-filter').value
  );
  element('#lead-table-wrap').hidden = !hasLeads;
  element('#lead-empty').hidden = hasLeads;
  element('#empty-title').textContent = hasFilters ? 'Lead tidak ditemukan' : 'Belum ada lead';
  element('#empty-copy').textContent = hasFilters
    ? 'Ubah pencarian atau filter untuk melihat hasil lain.'
    : 'Tambahkan lead pertama. Aplikasi tidak menyertakan data prospek contoh.';
  element('#empty-add').hidden = hasFilters || !state.session;

  const start = state.total ? state.offset + 1 : 0;
  const end = Math.min(state.offset + state.leads.length, state.total);
  element('#record-count').textContent = `Menampilkan ${start.toLocaleString('id-ID')}–${end.toLocaleString('id-ID')} dari ${state.total.toLocaleString('id-ID')} lead`;
  element('#pagination').hidden = state.total <= PAGE_SIZE;
  element('#page-copy').textContent = `Halaman ${Math.floor(state.offset / PAGE_SIZE) + 1} dari ${Math.max(1, Math.ceil(state.total / PAGE_SIZE))}`;
  element('#previous-page').disabled = state.loading || state.offset === 0;
  element('#next-page').disabled = state.loading || state.offset + PAGE_SIZE >= state.total;
};

const filters = () => ({
  search: element('#lead-search').value.trim(),
  pipeline: element('#pipeline-filter').value,
  ownerUserId: state.session?.role === 'admin' ? element('#owner-filter').value : '',
  limit: PAGE_SIZE,
  offset: state.offset
});

const loadLeads = async ({ successCopy = '' } = {}) => {
  const request = ++state.listRequest;
  setLoading(true);
  setAppStatus('Memuat data terbaru dari database…', 'loading');
  try {
    const [result, dashboardResult] = await Promise.all([
      client.listLeads(filters()),
      client.dashboard()
    ]);
    if (request !== state.listRequest) return;
    state.leads = result.leads;
    state.total = result.meta.total;
    state.dashboard = dashboardResult;
    renderLeads();
    renderDashboard();
    setAppStatus(successCopy || 'Data tersinkron dengan database CRM.', 'success');
  } catch (error) {
    if (request !== state.listRequest) return;
    setAppStatus(errorMessage(error), 'error', true);
  } finally {
    if (request === state.listRequest) setLoading(false);
  }
};

const updateLostField = () => {
  const isLost = form.elements.pipeline.value === 'Lost';
  element('#lost-field').hidden = !isLost;
  form.elements.lostReason.required = isLost;
  if (!isLost) form.elements.lostReason.value = '';
};

const updateScore = () => {
  const priority = getPriority({
    fit: Number(form.elements.fit.value),
    readiness: Number(form.elements.readiness.value),
    urgency: Number(form.elements.urgency.value),
    value: Number(form.elements.valueScore.value)
  });
  const output = element('#score-preview');
  output.querySelector('strong').textContent = `${priority.total}/20`;
  output.querySelector('span').textContent = priority.label;
};

const setFieldValue = (name, value) => {
  form.elements[name].value = value ?? '';
};

const populateForm = (lead) => {
  const fields = [
    'leadDate', 'source', 'company', 'picName', 'picRole', 'decisionMakerStatus',
    'contact', 'city', 'ownerUserId', 'brandStatus', 'needs', 'estimatedQuantity',
    'potentialValue', 'targetLaunch', 'pipeline', 'lastContact', 'nextAction',
    'nextActionDate', 'complianceStatus', 'blocker', 'lostReason', 'notes'
  ];
  for (const name of fields) setFieldValue(name, lead?.[name]);
  setFieldValue('fit', lead?.scores?.fit ?? 0);
  setFieldValue('readiness', lead?.scores?.readiness ?? 0);
  setFieldValue('urgency', lead?.scores?.urgency ?? 0);
  setFieldValue('valueScore', lead?.scores?.value ?? 0);
  if (!lead) {
    setFieldValue('decisionMakerStatus', 'Unknown');
    setFieldValue('brandStatus', 'Idea');
    setFieldValue('pipeline', 'New');
    setFieldValue('complianceStatus', 'Not Checked');
    setFieldValue('ownerUserId', state.session.id);
  }
  updateLostField();
  updateScore();
};

const openForm = (lead = null) => {
  state.editing = lead;
  form.reset();
  setFormStatus();
  populateForm(lead);
  element('#form-title').textContent = lead ? 'Edit lead' : 'Tambah lead';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  requestAnimationFrame(() => form.elements.company.focus());
};

const closeForm = () => {
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
  state.editing = null;
};

const numericValue = (name) => {
  const value = form.elements[name].value;
  return value === '' ? 0 : Number(value);
};

const formPayload = () => ({
  leadDate: form.elements.leadDate.value,
  source: form.elements.source.value,
  company: form.elements.company.value,
  picName: form.elements.picName.value,
  picRole: form.elements.picRole.value,
  decisionMakerStatus: form.elements.decisionMakerStatus.value,
  contact: form.elements.contact.value,
  city: form.elements.city.value,
  ownerUserId: form.elements.ownerUserId.value,
  brandStatus: form.elements.brandStatus.value,
  needs: form.elements.needs.value,
  estimatedQuantity: numericValue('estimatedQuantity'),
  potentialValue: numericValue('potentialValue'),
  targetLaunch: form.elements.targetLaunch.value,
  pipeline: form.elements.pipeline.value,
  lastContact: form.elements.lastContact.value,
  nextAction: form.elements.nextAction.value,
  nextActionDate: form.elements.nextActionDate.value,
  complianceStatus: form.elements.complianceStatus.value,
  blocker: form.elements.blocker.value,
  lostReason: form.elements.lostReason.value,
  notes: form.elements.notes.value,
  scores: {
    fit: numericValue('fit'),
    readiness: numericValue('readiness'),
    urgency: numericValue('urgency'),
    value: numericValue('valueScore')
  }
});

const saveLead = async () => {
  if (state.saving) return;
  state.saving = true;
  const submit = element('#save-lead');
  submit.disabled = true;
  submit.textContent = 'Menyimpan…';
  setFormStatus();
  try {
    const payload = formPayload();
    const company = payload.company.trim();
    if (state.editing) {
      await client.updateLead(state.editing.id, { ...payload, version: state.editing.version });
    } else {
      await client.createLead(payload);
    }
    const copy = state.editing
      ? `Lead ${company} berhasil diperbarui.`
      : `Lead ${company} berhasil ditambahkan.`;
    closeForm();
    state.offset = 0;
    await loadLeads({ successCopy: copy });
  } catch (error) {
    const conflict = error instanceof CrmApiClientError && error.code === 'VERSION_CONFLICT';
    setFormStatus(errorMessage(error), { conflict });
  } finally {
    state.saving = false;
    submit.disabled = false;
    submit.textContent = 'Simpan lead';
  }
};

const setImportStatus = (copy = '', tone = 'error') => {
  const status = element('#import-status');
  status.hidden = !copy;
  status.dataset.tone = tone;
  element('#import-status-copy').textContent = copy;
};

const clearImportPreview = () => {
  state.importPreview = null;
  element('#import-preview').hidden = true;
  element('#commit-import').disabled = true;
};

const setImportBusy = (busy) => {
  state.importBusy = busy;
  element('#import-file').disabled = busy;
  element('#import-mode').disabled = busy;
  element('#validate-import').disabled = busy || !state.importBackup;
  for (const select of element('#owner-mappings').querySelectorAll('select')) select.disabled = busy;
  if (busy) element('#commit-import').disabled = true;
};

const resetImport = () => {
  importForm.reset();
  state.importBackup = null;
  state.importPreview = null;
  element('#owner-mappings').replaceChildren();
  element('#owner-map-fieldset').hidden = true;
  element('#import-preview').hidden = true;
  element('#validate-import').disabled = true;
  element('#commit-import').disabled = true;
  setImportStatus();
};

const renderOwnerMappings = (owners) => {
  const container = element('#owner-mappings');
  container.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const owner of owners) {
    const label = document.createElement('label');
    const copy = textNode('span', '', owner || 'Tanpa owner');
    const select = document.createElement('select');
    select.dataset.sourceOwner = owner;
    select.setAttribute('aria-label', `Owner cloud untuk ${owner || 'lead tanpa owner'}`);
    replaceOptions(select, state.users);
    const match = state.users.find((user) => user.displayName === owner);
    select.value = match?.id || state.session.id;
    label.append(copy, select);
    fragment.appendChild(label);
  }
  container.appendChild(fragment);
  element('#owner-map-fieldset').hidden = false;
};

const importPayload = () => ({
  backup: state.importBackup,
  mode: element('#import-mode').value,
  ownerMappings: [...element('#owner-mappings').querySelectorAll('select')].map((select) => ({
    sourceOwner: select.dataset.sourceOwner,
    ownerUserId: select.value
  }))
});

const openImport = () => {
  resetImport();
  if (typeof importDialog.showModal === 'function') importDialog.showModal();
  else importDialog.setAttribute('open', '');
};

const closeImport = () => {
  if (state.importBusy) return;
  if (typeof importDialog.close === 'function' && importDialog.open) importDialog.close();
  else importDialog.removeAttribute('open');
  resetImport();
};

const readImportFile = async () => {
  clearImportPreview();
  setImportStatus();
  state.importBackup = null;
  element('#owner-mappings').replaceChildren();
  element('#owner-map-fieldset').hidden = true;
  const file = element('#import-file').files?.[0];
  if (!file) {
    element('#validate-import').disabled = true;
    return;
  }
  if (!file.name.toLocaleLowerCase('id').endsWith('.json')) {
    setImportStatus('Pilih file dengan ekstensi .json.');
    element('#validate-import').disabled = true;
    return;
  }
  if (file.size > MAX_IMPORT_BYTES) {
    setImportStatus('Ukuran file melebihi batas 5 MB.');
    element('#validate-import').disabled = true;
    return;
  }

  try {
    const backup = JSON.parse(await file.text());
    if (
      !backup || typeof backup !== 'object' || Array.isArray(backup) ||
      backup.schema !== CRM_SCHEMA || backup.version !== CRM_SCHEMA_VERSION ||
      !Array.isArray(backup.leads)
    ) {
      throw new Error('Schema atau versi backup tidak didukung.');
    }
    const owners = [...new Set(backup.leads.map((lead) => cleanCrmText(lead?.owner, 120)))]
      .sort((a, b) => a.localeCompare(b, 'id'));
    state.importBackup = backup;
    renderOwnerMappings(owners.length ? owners : ['']);
    element('#validate-import').disabled = false;
    setImportStatus(`${file.name} siap divalidasi. Data belum diubah.`, 'success');
  } catch (error) {
    setImportStatus(error.message || 'File JSON tidak dapat dibaca.');
    element('#validate-import').disabled = true;
  }
};

const renderImportPreview = (preview) => {
  state.importPreview = preview;
  element('#preview-total').textContent = preview.total.toLocaleString('id-ID');
  element('#preview-valid').textContent = preview.valid.toLocaleString('id-ID');
  element('#preview-invalid').textContent = preview.invalid.toLocaleString('id-ID');
  element('#preview-duplicate').textContent = (preview.duplicateFile + preview.duplicateTarget).toLocaleString('id-ID');
  element('#preview-final').textContent = preview.finalCount.toLocaleString('id-ID');
  const matchCopy = preview.targetMatches && element('#import-mode').value === 'replace'
    ? ` ${preview.targetMatches.toLocaleString('id-ID')} ID yang sudah ada akan diperbarui.`
    : '';
  element('#preview-copy').textContent = preview.canCommit
    ? `Validasi server lulus.${matchCopy} Periksa ringkasan sebelum mengimpor.`
    : 'Impor belum dapat dilanjutkan. Perbaiki data tidak valid atau ID duplikat, lalu validasi ulang.';
  element('#import-preview').hidden = false;
  element('#commit-import').disabled = !preview.canCommit;
};

const validateImport = async () => {
  if (!state.importBackup || state.importBusy) return;
  setImportBusy(true);
  clearImportPreview();
  setImportStatus('Server sedang memvalidasi schema, owner, pipeline, skor, tanggal, dan ID…', 'success');
  try {
    const preview = await client.validateImport(importPayload());
    renderImportPreview(preview);
    setImportStatus(preview.canCommit ? 'Validasi selesai. Belum ada data yang diubah.' : 'Validasi menemukan masalah pada file.', preview.canCommit ? 'success' : 'error');
  } catch (error) {
    setImportStatus(errorMessage(error));
  } finally {
    setImportBusy(false);
    if (state.importPreview?.canCommit) element('#commit-import').disabled = false;
  }
};

const commitImport = async () => {
  if (!state.importPreview?.canCommit || state.importBusy) return;
  const mode = element('#import-mode').value;
  const warning = mode === 'replace'
    ? `Ganti seluruh data aktif dengan ${state.importPreview.valid} lead dari backup? Operasi dijalankan secara atomik.`
    : `Tambahkan ${state.importPreview.valid} lead dari backup ke database CRM?`;
  if (!window.confirm(warning)) return;

  setImportBusy(true);
  setImportStatus('Mengimpor data dalam satu transaksi…', 'success');
  try {
    const result = await client.commitImport({
      ...importPayload(),
      checksum: state.importPreview.checksum,
      confirm: true
    });
    setImportBusy(false);
    closeImport();
    state.offset = 0;
    await loadLeads({
      successCopy: `${result.rowCount.toLocaleString('id-ID')} lead berhasil diimpor. Backup lokal tidak dihapus.`
    });
  } catch (error) {
    setImportStatus(errorMessage(error));
  } finally {
    setImportBusy(false);
  }
};

const downloadFile = async (loader, progressCopy, successCopy) => {
  setAppStatus(progressCopy, 'loading');
  try {
    const { blob, filename } = await loader();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setAppStatus(successCopy, 'success');
  } catch (error) {
    setAppStatus(errorMessage(error), 'error', true);
  }
};

const switchPanel = (targetId) => {
  for (const button of document.querySelectorAll('[data-panel-target]')) {
    const active = button.dataset.panelTarget === targetId;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  }
  for (const panel of document.querySelectorAll('.workspace-panel')) panel.hidden = panel.id !== targetId;
};

const bootstrap = async () => {
  setLoading(true);
  setAppStatus('Memeriksa sesi dan memuat lead…', 'loading');
  try {
    const [session, users] = await Promise.all([client.session(), client.users()]);
    state.session = session;
    state.users = users;
    renderSession();
    await loadLeads();
  } catch (error) {
    setAppStatus(errorMessage(error), 'error', true);
    element('#record-count').textContent = 'Data belum dapat dimuat';
    element('#empty-title').textContent = 'CRM belum dapat dibuka';
    element('#empty-copy').textContent = 'Pastikan akun Anda sudah terdaftar dan akses jaringan tersedia.';
  } finally {
    setLoading(false);
  }
};

element('#theme-select').addEventListener('change', (event) => applyTheme(event.target.value));
element('#retry-app').addEventListener('click', bootstrap);
element('#refresh-leads').addEventListener('click', () => loadLeads());
element('#backup-json').addEventListener('click', () => downloadFile(
  () => client.downloadBackup(),
  'Menyiapkan backup JSON dari seluruh data aktif…',
  'Backup JSON berhasil diunduh.'
));
element('#export-csv').addEventListener('click', () => downloadFile(
  () => client.downloadCsv(),
  'Menyiapkan laporan CSV yang aman untuk spreadsheet…',
  'Laporan CSV berhasil diunduh.'
));
element('#import-json').addEventListener('click', openImport);
element('#add-lead').addEventListener('click', () => openForm());
element('#empty-add').addEventListener('click', () => openForm());
element('#close-form').addEventListener('click', closeForm);
element('#cancel-form').addEventListener('click', closeForm);
element('#form-pipeline').addEventListener('change', updateLostField);
element('#close-import').addEventListener('click', closeImport);
element('#cancel-import').addEventListener('click', closeImport);
element('#import-file').addEventListener('change', readImportFile);
element('#import-mode').addEventListener('change', () => {
  clearImportPreview();
  setImportStatus(state.importBackup ? 'Mode berubah. Validasi ulang diperlukan.' : '');
});
element('#owner-mappings').addEventListener('change', () => {
  clearImportPreview();
  setImportStatus('Pemetaan owner berubah. Validasi ulang diperlukan.');
});
importForm.addEventListener('submit', (event) => {
  event.preventDefault();
  validateImport();
});
element('#commit-import').addEventListener('click', commitImport);

for (const button of document.querySelectorAll('[data-panel-target]')) {
  button.addEventListener('click', () => switchPanel(button.dataset.panelTarget));
}

for (const name of ['fit', 'readiness', 'urgency', 'valueScore']) {
  form.elements[name].addEventListener('change', updateScore);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  saveLead();
});

element('#reload-conflict').addEventListener('click', async () => {
  if (!state.editing) return;
  const button = element('#reload-conflict');
  button.disabled = true;
  try {
    const current = await client.getLead(state.editing.id);
    state.editing = current;
    populateForm(current);
    setFormStatus('Data terbaru telah dimuat. Periksa kembali perubahan sebelum menyimpan.');
  } catch (error) {
    setFormStatus(errorMessage(error));
  } finally {
    button.disabled = false;
  }
});

element('#lead-rows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const lead = state.leads.find((item) => item.id === button.dataset.leadId);
  if (!lead) return;
  if (button.dataset.action === 'edit') {
    openForm(lead);
    return;
  }

  const confirmed = window.confirm(`Hapus lead ${lead.company}? Data akan dinonaktifkan dari daftar aktif.`);
  if (!confirmed) return;
  button.disabled = true;
  try {
    await client.deleteLead(lead.id, lead.version);
    if (state.leads.length === 1 && state.offset > 0) state.offset = Math.max(0, state.offset - PAGE_SIZE);
    await loadLeads({ successCopy: `Lead ${lead.company} telah dihapus.` });
  } catch (error) {
    setAppStatus(errorMessage(error), 'error', true);
    if (error instanceof CrmApiClientError && error.code === 'VERSION_CONFLICT') {
      await loadLeads({ successCopy: 'Lead telah berubah. Daftar terbaru sudah dimuat.' });
    }
  } finally {
    button.disabled = false;
  }
});

element('#lead-search').addEventListener('input', () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    state.offset = 0;
    loadLeads();
  }, 300);
});

for (const selector of ['#pipeline-filter', '#owner-filter']) {
  element(selector).addEventListener('change', () => {
    state.offset = 0;
    loadLeads();
  });
}

element('#previous-page').addEventListener('click', () => {
  state.offset = Math.max(0, state.offset - PAGE_SIZE);
  loadLeads();
});

element('#next-page').addEventListener('click', () => {
  state.offset += PAGE_SIZE;
  loadLeads();
});

applyTheme(readTheme());
bootstrap();
