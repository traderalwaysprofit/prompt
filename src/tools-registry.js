export const TOOLS_HOME_ROUTE = '#tools';

const googleContactFormats = Object.freeze(['XLSX', 'XLS', 'CSV']);
const b2bBadges = Object.freeze(['AI', 'LEADS', 'CSV', 'XLSX']);

export const TOOLS = Object.freeze([
  Object.freeze({
    id: 'google-contacts',
    route: '#tools/google-contacts',
    category: 'Data & Contacts',
    title: 'Google Contacts Ready',
    description: 'Ubah Excel menjadi CSV yang siap diimpor ke Google Contacts.',
    formats: googleContactFormats,
    badges: googleContactFormats,
    status: 'ready',
    statusLabel: 'Siap digunakan',
    iconPath: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    load: () => import('./tools/google-contacts.js')
  }),
  Object.freeze({
    id: 'b2b-prospecting',
    route: '#tools/b2b-prospecting',
    category: 'Sales & Prospecting',
    title: 'B2B Prospecting',
    description: 'Cari, verifikasi, qualify, dan kelola prospek B2B dengan bantuan AI.',
    badges: b2bBadges,
    status: 'ready',
    statusLabel: 'V1 siap',
    iconPath: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M8 9h.01M12 9h.01M16 9h.01',
    load: () => import('./tools/b2b-prospecting.js')
  })
]);

const toolsByRoute = new Map(TOOLS.map((tool) => [tool.route, tool]));

export const getToolByRoute = (route) => toolsByRoute.get(route) || null;
export const isToolsRoute = (route) => /^#tools(?:\/|$)/.test(route);
