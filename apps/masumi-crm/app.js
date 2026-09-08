const THEME_STORAGE_KEY = 'samsonTheme';
const THEMES = new Set(['default', 'developer', 'swiss', 'pixel']);

const select = document.querySelector('#theme-select');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const statusIndicator = document.querySelector('#status-indicator');
const apiState = document.querySelector('#component-api');
const databaseState = document.querySelector('#component-database');
const accessState = document.querySelector('#component-access');
const retryButton = document.querySelector('#retry-health');

const normalizeTheme = (value) => THEMES.has(value) ? value : 'default';

const readTheme = () => {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'default';
  }
};

const applyTheme = (value) => {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = ['developer', 'pixel'].includes(theme) ? 'dark' : 'light';
  select.value = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme persistence is optional; the active page remains usable without storage.
  }
};

const setHealthState = (state, detail) => {
  statusIndicator.dataset.state = state;
  statusDetail.textContent = detail;
};

const checkHealth = async () => {
  retryButton.disabled = true;
  apiState.textContent = 'Memeriksa';
  setHealthState('checking', 'Menghubungi Worker CRM tanpa membaca data pengguna.');

  try {
    const response = await fetch('/api/crm/v1/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    const payload = await response.json();
    if (!response.ok || payload?.service !== 'masumi-crm') throw new Error('Respons Worker tidak valid.');

    statusTitle.textContent = 'Fondasi aplikasi berhasil terhubung';
    apiState.textContent = 'Siap';
    databaseState.textContent = payload.databaseConfigured ? 'Terhubung' : 'Belum dibuat';
    accessState.textContent = payload.accessConfigured ? 'Dikonfigurasi' : 'Belum dikonfigurasi';
    setHealthState('ready', 'Worker merespons dengan benar. Tidak ada data lead yang dibaca atau dikirim.');
  } catch {
    statusTitle.textContent = 'Worker belum dapat dijangkau';
    apiState.textContent = 'Tidak terhubung';
    setHealthState('error', 'Jalankan aplikasi melalui Worker CRM atau periksa kembali konfigurasi preview.');
  } finally {
    retryButton.disabled = false;
  }
};

select.addEventListener('change', () => applyTheme(select.value));
retryButton.addEventListener('click', checkHealth);

applyTheme(readTheme());
checkHealth();
