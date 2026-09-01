import { buildGoogleContactsCsv, ContactToolError, mapContactRows } from './google-contacts-core.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 250;
const ALLOWED_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

const state = {
  rows: [],
  exportableRows: [],
  fileName: '',
  sheetName: '',
  headerSkipped: false
};

let sheetJsPromise = null;

const contactToolMarkup = (icon) => `
  <header class="tools-page-header">
    <a class="tools-back" href="#tools" data-tools-catalog-back>${icon('M15 18l-6-6 6-6')}<span>Kembali ke Tools</span></a>
    <div class="tools-product-heading">
      <span class="tools-product-icon">${icon('M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75')}</span>
      <div class="tools-heading">
        <span class="tools-kicker">TOOLS / CONTACT OPERATIONS</span>
        <h1 id="tools-title" tabindex="-1">Google Contacts Ready</h1>
        <p>Auto-Mapping dari Excel <span>(Nama, Brand, WA)</span></p>
      </div>
    </div>
  </header>

  <div class="contact-tool-grid">
    <aside class="contact-tool-sidebar" aria-label="Unggah dan panduan file">
      <section class="tool-panel upload-panel" aria-labelledby="contact-upload-title">
        <div class="tool-step-heading">
          <span class="tool-step-number">1</span>
          <div><span>INPUT FILE</span><h2 id="contact-upload-title">Unggah Excel</h2></div>
        </div>
        <label class="contact-drop-zone" id="contact-drop-zone" for="contact-file-input" tabindex="0" role="button" aria-describedby="contact-upload-help">
          <input class="sr-only" id="contact-file-input" type="file" accept=".xlsx,.xls,.csv" />
          <span class="contact-upload-icon">${icon('M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4')}</span>
          <strong>Pilih file .xlsx / .xls</strong>
          <span id="contact-upload-help">Tarik file ke sini · CSV juga didukung · maksimum 10 MB</span>
        </label>
        <div class="tool-status" id="contact-tool-status" role="status" aria-live="polite" data-tone="neutral">Siap membaca file di perangkat ini.</div>
      </section>

      <section class="tool-panel column-guide" aria-labelledby="contact-column-title">
        <div class="tool-step-heading compact">
          <span class="tool-step-number">2</span>
          <div><span>KOLOM SUMBER</span><h2 id="contact-column-title">Template & urutan data</h2></div>
        </div>
        <a class="tool-template-download" id="contact-template-download" href="/assets/templates/samson-template-kontak.xlsx" download="samson-template-kontak.xlsx">
          ${icon('M12 3v12m0 0l-4-4m4 4 4-4M5 20h14')}
          <span><strong>Download template Excel</strong><small>Kolom A–C sudah disiapkan</small></span>
        </a>
        <ol class="column-list">
          <li><span>A</span><div><strong>Nama Kontak</strong><small>Nama pelanggan atau relasi</small></div></li>
          <li><span>B</span><div><strong>Brand / Perusahaan</strong><small>Nama usaha atau organisasi</small></div></li>
          <li><span>C</span><div><strong>WhatsApp</strong><small>Otomatis dibersihkan menjadi +62</small></div></li>
        </ol>
        <p class="column-note">Isi data mulai baris 2. Jangan mengubah nama atau urutan header pada template.</p>
      </section>

      <section class="tool-panel tool-output-note" aria-label="Pemetaan Google Contacts">
        <span class="tools-kicker">GOOGLE CSV MAPPING</span>
        <strong>Output langsung siap impor</strong>
        <dl>
          <div><dt>Nama Kontak</dt><dd>First Name</dd></div>
          <div><dt>Brand</dt><dd>Organization Name</dd></div>
          <div><dt>WhatsApp</dt><dd>Phone 1 · Mobile</dd></div>
        </dl>
        <p>Maksimum 3.000 kontak per file sesuai batas impor Google Contacts.</p>
      </section>
    </aside>

    <section class="tool-panel contact-preview-panel" aria-labelledby="contact-preview-title">
      <header class="contact-preview-header">
        <div class="contact-preview-heading">
          <span class="tools-kicker">OUTPUT PREVIEW</span>
          <div class="contact-preview-title-line">
            <h2 id="contact-preview-title">Pratinjau Impor</h2>
            <span class="contact-ready-pill"><b id="contact-ready-count">0</b> Kontak</span>
          </div>
        </div>
        <div class="contact-preview-toolbar" aria-label="Ringkasan dan unduh hasil">
          <span class="contact-issue-pill"><b id="contact-issue-count">0</b> perlu dicek</span>
          <button class="tool-button tool-button-primary contact-download-button" id="contact-download-button" type="button" disabled>${icon('M12 4v12m0 0l-5-5m5 5 5-5M5 20h14')}<span id="contact-download-label">Download CSV Google</span></button>
        </div>
      </header>

      <div class="contact-file-meta" id="contact-file-meta" hidden>
        <div><span>FILE</span><strong id="contact-file-name">—</strong></div>
        <div><span>SHEET</span><strong id="contact-sheet-name">—</strong></div>
        <div><span>HEADER</span><strong id="contact-header-mode">—</strong></div>
      </div>

      <div class="contact-empty-state" id="contact-empty-state">
        <span class="contact-empty-icon">${icon('M6 3h9l3 3v15H6zM9 11h6M9 15h6M15 3v4h4')}</span>
        <h3>Belum ada data</h3>
        <p>Silakan unggah file Excel untuk melihat normalisasi nomor dan validasi duplikat.</p>
      </div>

      <div class="contact-preview-content" id="contact-preview-content" hidden>
        <div class="contact-table-wrap" tabindex="0" aria-label="Tabel pratinjau kontak, dapat digulir horizontal">
          <table class="contact-table">
            <thead><tr><th scope="col">Nama kontak (preview)</th><th scope="col">Brand / perusahaan</th><th scope="col">Nomor (format +62)</th></tr></thead>
            <tbody id="contact-preview-body"></tbody>
          </table>
        </div>
        <p class="contact-preview-note" id="contact-preview-note"></p>
      </div>

      <footer class="contact-preview-actions">
        <button class="tool-button tool-button-secondary" id="contact-reset-button" type="button" disabled>${icon('M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0011.8 2M18.5 9A7 7 0 006.7 7')}<span>Reset</span></button>
        <a class="tool-button tool-button-secondary" href="https://contacts.google.com/" target="_blank" rel="noopener noreferrer">Buka Google Contacts <span aria-hidden="true">↗</span></a>
        <span class="contact-format-note">UTF-8 CSV · Header resmi Google · Nomor +62</span>
      </footer>
    </section>
  </div>`;

const getElements = (root) => ({
  input: root.querySelector('#contact-file-input'),
  dropZone: root.querySelector('#contact-drop-zone'),
  status: root.querySelector('#contact-tool-status'),
  empty: root.querySelector('#contact-empty-state'),
  content: root.querySelector('#contact-preview-content'),
  body: root.querySelector('#contact-preview-body'),
  note: root.querySelector('#contact-preview-note'),
  readyCount: root.querySelector('#contact-ready-count'),
  issueCount: root.querySelector('#contact-issue-count'),
  meta: root.querySelector('#contact-file-meta'),
  fileName: root.querySelector('#contact-file-name'),
  sheetName: root.querySelector('#contact-sheet-name'),
  headerMode: root.querySelector('#contact-header-mode'),
  reset: root.querySelector('#contact-reset-button'),
  download: root.querySelector('#contact-download-button'),
  downloadLabel: root.querySelector('#contact-download-label')
});

const setStatus = (root, message, tone = 'neutral') => {
  const { status } = getElements(root);
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
};

const setBusy = (root, busy) => {
  const { dropZone, input } = getElements(root);
  dropZone?.setAttribute('aria-busy', String(busy));
  dropZone?.classList.toggle('is-busy', busy);
  if (input) input.disabled = busy;
};

const renderRows = (root) => {
  const elements = getElements(root);
  if (!elements.body || !elements.note) return;

  const fragment = document.createDocumentFragment();
  const visibleRows = state.rows.slice(0, MAX_PREVIEW_ROWS);
  const statusLabels = {
    ready: 'Siap',
    warning: 'Nama kosong',
    duplicate: 'Duplikat',
    invalid: 'Cek nomor'
  };

  for (const contact of visibleRows) {
    const row = document.createElement('tr');
    row.dataset.status = contact.status;

    const nameCell = document.createElement('td');
    const name = document.createElement('strong');
    name.textContent = contact.previewName || '—';
    const sourceRow = document.createElement('small');
    sourceRow.textContent = `Baris ${contact.rowNumber}`;
    nameCell.append(name, sourceRow);

    const brandCell = document.createElement('td');
    brandCell.textContent = contact.brand || '—';

    const phoneCell = document.createElement('td');
    const phone = document.createElement('code');
    phone.textContent = contact.phone || '—';
    phoneCell.appendChild(phone);

    const badge = document.createElement('span');
    badge.className = `contact-row-status is-${contact.status}`;
    badge.textContent = statusLabels[contact.status] || contact.reason;
    badge.title = contact.reason;
    phoneCell.appendChild(badge);

    row.append(nameCell, brandCell, phoneCell);
    fragment.appendChild(row);
  }

  elements.body.replaceChildren(fragment);
  const hiddenCount = state.rows.length - visibleRows.length;
  elements.note.textContent = hiddenCount > 0
    ? `Menampilkan ${visibleRows.length.toLocaleString('id-ID')} dari ${state.rows.length.toLocaleString('id-ID')} baris. Semua baris valid tetap disertakan saat ekspor.`
    : `${state.rows.length.toLocaleString('id-ID')} baris diperiksa. Nomor duplikat dan format tidak valid tidak disertakan saat ekspor.`;
};

const renderState = (root) => {
  const elements = getElements(root);
  if (!elements.readyCount || !elements.issueCount || !elements.fileName || !elements.sheetName || !elements.headerMode || !elements.meta || !elements.empty || !elements.content || !elements.reset || !elements.download || !elements.downloadLabel) return;

  const issueCount = state.rows.filter((row) => row.status !== 'ready').length;
  const hasRows = state.rows.length > 0;

  elements.readyCount.textContent = String(state.exportableRows.length);
  elements.issueCount.textContent = String(issueCount);
  elements.fileName.textContent = state.fileName || '—';
  elements.sheetName.textContent = state.sheetName || '—';
  elements.headerMode.textContent = state.headerSkipped ? 'Terdeteksi' : 'Tanpa header';
  elements.meta.hidden = !hasRows;
  elements.empty.hidden = hasRows;
  elements.content.hidden = !hasRows;
  elements.reset.disabled = !hasRows;
  elements.download.disabled = state.exportableRows.length === 0;
  elements.downloadLabel.textContent = state.exportableRows.length
    ? `Download CSV Google · ${state.exportableRows.length.toLocaleString('id-ID')}`
    : 'Download CSV Google';

  if (hasRows) renderRows(root);
  else elements.body?.replaceChildren();
};

const clearData = (root, { clearStatus = true } = {}) => {
  state.rows = [];
  state.exportableRows = [];
  state.fileName = '';
  state.sheetName = '';
  state.headerSkipped = false;
  const { input } = getElements(root);
  if (input) input.value = '';
  renderState(root);
  if (clearStatus) setStatus(root, 'Siap membaca file di perangkat ini.', 'neutral');
};

const ensureSheetJs = () => {
  if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
  if (sheetJsPromise) return sheetJsPromise;

  sheetJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/xlsx.full.min.js?v=0.20.3';
    script.async = true;
    script.dataset.sheetjsLoader = 'true';
    script.addEventListener('load', () => {
      if (globalThis.XLSX) resolve(globalThis.XLSX);
      else reject(new ContactToolError('Parser spreadsheet tidak tersedia. Muat ulang halaman lalu coba lagi.'));
    }, { once: true });
    script.addEventListener('error', () => reject(new ContactToolError('Parser spreadsheet gagal dimuat. Periksa koneksi lalu coba lagi.')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    sheetJsPromise = null;
    throw error;
  });

  return sheetJsPromise;
};

const extensionFor = (fileName) => fileName.toLowerCase().split('.').pop() || '';

const processFile = async (root, file) => {
  if (!(file instanceof File)) return;
  clearData(root, { clearStatus: false });

  const extension = extensionFor(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    setStatus(root, 'Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv.', 'error');
    return;
  }
  if (file.size === 0) {
    setStatus(root, 'File kosong. Pilih file yang berisi data kontak.', 'error');
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    setStatus(root, 'Ukuran file melebihi 10 MB. Kecilkan atau pecah file terlebih dahulu.', 'error');
    return;
  }

  setBusy(root, true);
  setStatus(root, `Membaca ${file.name}…`, 'loading');

  try {
    const XLSX = await ensureSheetJs();
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: false, dense: true });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) throw new ContactToolError('Workbook tidak memiliki sheet yang dapat dibaca.');

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '', blankrows: false });
    const mapped = mapContactRows(rawRows);
    if (!mapped.rows.length) throw new ContactToolError('Tidak ada data pada kolom A–C. Periksa urutan Nama, Brand, dan WhatsApp.');

    state.rows = mapped.rows;
    state.exportableRows = mapped.exportableRows;
    state.fileName = file.name;
    state.sheetName = sheetName;
    state.headerSkipped = mapped.headerSkipped;
    renderState(root);

    const issueCount = state.rows.filter((row) => row.status !== 'ready').length;
    const tone = state.exportableRows.length ? (issueCount ? 'warning' : 'success') : 'error';
    setStatus(
      root,
      `${state.exportableRows.length.toLocaleString('id-ID')} kontak dapat diekspor${issueCount ? ` · ${issueCount.toLocaleString('id-ID')} baris perlu dicek` : ''}.`,
      tone
    );
  } catch (error) {
    if (!(error instanceof ContactToolError)) console.error('Contact tool parsing error:', error);
    clearData(root, { clearStatus: false });
    setStatus(root, error instanceof ContactToolError ? error.message : 'File gagal dibaca. Pastikan file tidak rusak dan kolom A–C berisi data yang benar.', 'error');
  } finally {
    setBusy(root, false);
  }
};

const downloadCsv = (root) => {
  if (!state.exportableRows.length) return;
  const content = buildGoogleContactsCsv(state.exportableRows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `google-contacts-samson-${date}.csv`;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus(root, `${state.exportableRows.length.toLocaleString('id-ID')} kontak berhasil disiapkan untuk Google Contacts.`, 'success');
};

const bindEvents = (root, signal) => {
  const { input, dropZone, reset, download } = getElements(root);

  input?.addEventListener('change', () => {
    if (input.files?.[0]) processFile(root, input.files[0]);
  }, { signal });

  dropZone?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    input?.click();
  }, { signal });

  for (const eventName of ['dragenter', 'dragover']) {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('is-dragging');
    }, { signal });
  }

  for (const eventName of ['dragleave', 'drop']) {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('is-dragging');
    }, { signal });
  }

  dropZone?.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(root, file);
  }, { signal });

  reset?.addEventListener('click', () => clearData(root), { signal });
  download?.addEventListener('click', () => downloadCsv(root), { signal });
};

export const mountGoogleContactsTool = (root, { icon }) => {
  if (!(root instanceof Element)) throw new TypeError('Google Contacts membutuhkan elemen root.');
  const abortController = new AbortController();

  root.innerHTML = contactToolMarkup(icon);
  bindEvents(root, abortController.signal);
  renderState(root);

  return {
    destroy() {
      abortController.abort();
    }
  };
};
