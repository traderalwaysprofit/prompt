export const TOOLS_HOME_ROUTE = '#tools';

const googleContactFormats = Object.freeze(['XLSX', 'XLS', 'CSV']);

export const TOOLS = Object.freeze([
  Object.freeze({
    id: 'google-contacts',
    route: '#tools/google-contacts',
    category: 'Data & Contacts',
    title: 'Google Contacts Ready',
    description: 'Ubah Excel menjadi CSV yang siap diimpor ke Google Contacts.',
    formats: googleContactFormats,
    status: 'ready',
    statusLabel: 'Siap digunakan',
    iconPath: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    load: () => import('./tools/google-contacts.js')
  })
]);

const toolsByRoute = new Map(TOOLS.map((tool) => [tool.route, tool]));

export const getToolByRoute = (route) => toolsByRoute.get(route) || null;
export const isToolsRoute = (route) => /^#tools(?:\/|$)/.test(route);
