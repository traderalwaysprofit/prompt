import { buildGoogleContactsCsv, ContactToolError, mapContactRows } from './contact-tools-core.js';

(() => {
  'use strict';

  const TOOL_ROUTE = '#tools/google-contacts';
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
  let initialized = false;

  const icon = (path) => `<svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;

  const toolMarkup = () => `
    <section class="tools-section" id="tools" aria-labelledby="tools-title">
      <div class="tools-inner">
        <header class="tools-page-header">
          <button class="tools-back" type="button" data-tools-back>${icon('M15 18l-6-6 6-6')}<span>Kembali</span></button>
          <div class="tools-heading">
            <span class="tools-kicker">TOOLS / CONTACT OPERATIONS</span>
            <h1 id="tools-title" tabindex="-1">Excel → Google Contacts</h1>
            <p>Rapikan nama, brand, dan nomor WhatsApp menjadi CSV yang siap diimpor ke Google Contacts.</p>
          </div>
          <div class="tools-privacy" aria-label="Privasi pemrosesan file">
            <span class="tools-privacy-dot" aria-hidden="true"></span>
            <div><strong>LOCAL ONLY</strong><span>File tidak diunggah</span></div>
          </div>
        </header>

        <div class="contact-tool-grid">
          <aside class="contact-tool-sidebar" aria-label="Unggah dan panduan file">
            <section class="tool-panel upload-panel" aria-labelledby="contact-upload-title">
              <div class="tool-step-heading">
                <span class="tool-step-number">01</span>
                <div><span>INPUT FILE</span><h2 id="contact-upload-title">Unggah spreadsheet</h2></div>
              </div>
              <label class="contact-drop-zone" id="contact-drop-zone" for="contact-file-input" tabindex="0" role="button" aria-describedby="contact-upload-help">
                <input class="sr-only" id="contact-file-input" type="file" accept=".xlsx,.xls,.csv" />
                <span class="contact-upload-icon">${icon('M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4')}</span>
                <strong>Pilih atau jatuhkan file</strong>
                <span id="contact-upload-help">.xlsx, .xls, atau .csv · maksimum 10 MB</span>
              </label>
              <div class="tool-status" id="contact-tool-status" role="status" aria-live="polite" data-tone="neutral">Siap membaca file di perangkat ini.</div>
            </section>

            <section class="tool-panel column-guide" aria-labelledby="contact-column-title">
              <div class="tool-step-heading compact">
                <span class="tool-step-number">02</span>
                <div><span>KOLOM SUMBER</span><h2 id="contact-column-title">Urutan data</h2></div>
              </div>
              <ol class="column-list">
                <li><span>A</span><div><strong>Nama Kontak</strong><small>Nama pelanggan atau relasi</small></div></li>
                <li><span>B</span><div><strong>Brand / Perusahaan</strong><small>Nama usaha atau organisasi</small></div></li>
                <li><span>C</span><div><strong>WhatsApp</strong><small>08…, 628…, atau +62…</small></div></li>
              </ol>
              <p class="column-note">Baris pertama boleh berupa header. Tool akan mendeteksinya otomatis.</p>
            </section>

            <section class="tool-panel tool-limit-note" aria-label="Batas impor Google Contacts">
              <span class="tools-kicker">IMPORT LIMIT</span>
              <strong>Maksimum 3.000 kontak</strong>
              <p>Google Contacts meminta file yang lebih besar dipecah sebelum diimpor.</p>
            </section>
          </aside>

          <section class="tool-panel contact-preview-panel" aria-labelledby="contact-preview-title">
            <header class="contact-preview-header">
              <div>
                <span class="tools-kicker">OUTPUT PREVIEW</span>
                <h2 id="contact-preview-title">Pratinjau impor</h2>
              </div>
              <div class="contact-counters" aria-label="Ringkasan hasil">
                <span><b id="contact-ready-count">0</b> DAPAT DIEKSPOR</span>
                <span><b id="contact-issue-count">0</b> PERLU DICEK</span>
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
              <p>Unggah file untuk melihat hasil normalisasi nomor dan validasi duplikat.</p>
            </div>

            <div class="contact-preview-content" id="contact-preview-content" hidden>
              <div class="contact-table-wrap" tabindex="0" aria-label="Tabel pratinjau kontak, dapat digulir horizontal">
                <table class="contact-table">
                  <thead><tr><th scope="col">Nama kontak</th><th scope="col">Brand / perusahaan</th><th scope="col">Nomor +62</th><th scope="col">Status</th></tr></thead>
                  <tbody id="contact-preview-body"></tbody>
                </table>
              </div>
              <p class="contact-preview-note" id="contact-preview-note"></p>
            </div>

            <footer class="contact-preview-actions">
              <button class="tool-button tool-button-secondary" id="contact-reset-button" type="button" disabled>${icon('M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0011.8 2M18.5 9A7 7 0 006.7 7')}<span>Reset</span></button>
              <a class="tool-button tool-button-secondary" href="https://contacts.google.com/" target="_blank" rel="noopener noreferrer">Buka Google Contacts <span aria-hidden="true">↗</span></a>
              <button class="tool-button tool-button-primary" id="contact-download-button" type="button" disabled>${icon('M12 4v12m0 0l-5-5m5 5 5-5M5 20h14')}<span id="contact-download-label">Download CSV</span></button>
            </footer>
          </section>
        </div>
      </div>
    </section>`;

  const getElements = () => ({
    section: document.querySelector('#tools'),
    input: document.querySelector('#contact-file-input'),
    dropZone: document.querySelector('#contact-drop-zone'),
    status: document.querySelector('#contact-tool-status'),
    empty: document.querySelector('#contact-empty-state'),
    content: document.querySelector('#contact-preview-content'),
    body: document.querySelector('#contact-preview-body'),
    note: document.querySelector('#contact-preview-note'),
    readyCount: document.querySelector('#contact-ready-count'),
    issueCount: document.querySelector('#contact-issue-count'),
    meta: document.querySelector('#contact-file-meta'),
    fileName: document.querySelector('#contact-file-name'),
    sheetName: document.querySelector('#contact-sheet-name'),
    headerMode: document.querySelector('#contact-header-mode'),
    reset: document.querySelector('#contact-reset-button'),
    download: document.querySelector('#contact-download-button'),
    downloadLabel: document.querySelector('#contact-download-label')
  });

  const setStatus = (message, tone = 'neutral') => {
    const { status } = getElements();
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const setBusy = (busy) => {
    const { dropZone, input } = getElements();
    dropZone?.setAttribute('aria-busy', String(busy));
    dropZone?.classList.toggle('is-busy', busy);
    if (input) input.disabled = busy;
  };

  const renderRows = () => {
    const elements = getElements();
    if (!elements.body) return;

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

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `contact-row-status is-${contact.status}`;
      badge.textContent = statusLabels[contact.status] || contact.reason;
      badge.title = contact.reason;
      statusCell.appendChild(badge);

      row.append(nameCell, brandCell, phoneCell, statusCell);
      fragment.appendChild(row);
    }

    elements.body.replaceChildren(fragment);
    const hiddenCount = state.rows.length - visibleRows.length;
    elements.note.textContent = hiddenCount > 0
      ? `Menampilkan ${visibleRows.length.toLocaleString('id-ID')} dari ${state.rows.length.toLocaleString('id-ID')} baris. Semua baris valid tetap disertakan saat ekspor.`
      : `${state.rows.length.toLocaleString('id-ID')} baris diperiksa. Nomor duplikat dan format tidak valid tidak disertakan saat ekspor.`;
  };

  const renderState = () => {
    const elements = getElements();
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
      ? `Download ${state.exportableRows.length.toLocaleString('id-ID')} Kontak`
      : 'Download CSV';

    if (hasRows) renderRows();
    else elements.body?.replaceChildren();
  };

  const clearData = ({ clearStatus = true } = {}) => {
    state.rows = [];
    state.exportableRows = [];
    state.fileName = '';
    state.sheetName = '';
    state.headerSkipped = false;
    const { input } = getElements();
    if (input) input.value = '';
    renderState();
    if (clearStatus) setStatus('Siap membaca file di perangkat ini.', 'neutral');
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

  const processFile = async (file) => {
    if (!(file instanceof File)) return;
    clearData({ clearStatus: false });

    const extension = extensionFor(file.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      setStatus('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv.', 'error');
      return;
    }
    if (file.size === 0) {
      setStatus('File kosong. Pilih file yang berisi data kontak.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus('Ukuran file melebihi 10 MB. Kecilkan atau pecah file terlebih dahulu.', 'error');
      return;
    }

    setBusy(true);
    setStatus(`Membaca ${file.name}…`, 'loading');

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
      renderState();

      const issueCount = state.rows.filter((row) => row.status !== 'ready').length;
      const tone = state.exportableRows.length ? (issueCount ? 'warning' : 'success') : 'error';
      setStatus(
        `${state.exportableRows.length.toLocaleString('id-ID')} kontak dapat diekspor${issueCount ? ` · ${issueCount.toLocaleString('id-ID')} baris perlu dicek` : ''}.`,
        tone
      );
    } catch (error) {
      if (!(error instanceof ContactToolError)) console.error('Contact tool parsing error:', error);
      clearData({ clearStatus: false });
      setStatus(error instanceof ContactToolError ? error.message : 'File gagal dibaca. Pastikan file tidak rusak dan kolom A–C berisi data yang benar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
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
    setStatus(`${state.exportableRows.length.toLocaleString('id-ID')} kontak berhasil disiapkan untuk Google Contacts.`, 'success');
  };

  const openTools = ({ updateHash = true, scroll = true } = {}) => {
    if (updateHash && location.hash !== TOOL_ROUTE) history.replaceState(null, '', TOOL_ROUTE);
    document.documentElement.dataset.entryMode = 'tools';
    if (scroll) document.querySelector('#tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => document.querySelector('#tools-title')?.focus({ preventScroll: true }));
  };

  const leaveTools = () => {
    history.replaceState(null, '', '#cheatcodes');
    document.documentElement.dataset.entryMode = 'chooser';
    document.querySelector('#cheatcodes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const routeFromHash = () => {
    if (/^#tools(?:\/|$)/.test(location.hash)) openTools({ updateHash: location.hash === '#tools', scroll: true });
  };

  const bindEvents = () => {
    const { input, dropZone, reset, download } = getElements();

    input?.addEventListener('change', () => {
      if (input.files?.[0]) processFile(input.files[0]);
    });

    dropZone?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      input?.click();
    });

    for (const eventName of ['dragenter', 'dragover']) {
      dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragging');
      });
    }

    for (const eventName of ['dragleave', 'drop']) {
      dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('is-dragging');
      });
    }

    dropZone?.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) processFile(file);
    });

    reset?.addEventListener('click', () => clearData());
    download?.addEventListener('click', downloadCsv);

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#nav-tools, [data-open-tools]')) {
        openTools();
        return;
      }
      if (target.closest('[data-tools-back]')) leaveTools();
    });

    window.addEventListener('hashchange', routeFromHash);
  };

  const initialize = () => {
    if (initialized || document.querySelector('#tools')) return;
    const featured = document.querySelector('#featured');
    if (!featured) return;

    initialized = true;
    featured.insertAdjacentHTML('beforebegin', toolMarkup());
    bindEvents();
    renderState();
    routeFromHash();
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
