import { getPriority } from '/crm-core.js';
import { createCrmClient, CrmApiClientError } from '/crm-client.js';

const THEME_STORAGE_KEY = 'samsonTheme';
const THEMES = new Set(['default', 'developer', 'swiss', 'pixel']);
const PAGE_SIZE = 50;
const client = createCrmClient();

const element = (selector) => document.querySelector(selector);
const form = element('#lead-form');
const dialog = element('#lead-dialog');
const state = {
  session: null,
  users: [],
  leads: [],
  total: 0,
  offset: 0,
  editing: null,
  loading: false,
  saving: false,
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
    const result = await client.listLeads(filters());
    if (request !== state.listRequest) return;
    state.leads = result.leads;
    state.total = result.meta.total;
    renderLeads();
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
element('#add-lead').addEventListener('click', () => openForm());
element('#empty-add').addEventListener('click', () => openForm());
element('#close-form').addEventListener('click', closeForm);
element('#cancel-form').addEventListener('click', closeForm);
element('#form-pipeline').addEventListener('change', updateLostField);

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
