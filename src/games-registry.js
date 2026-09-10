export const GAMES_HOME_ROUTE = '#games';

export const GAMES = Object.freeze([
  Object.freeze({
    id: 'meja-it',
    category: 'Simulation & Learning',
    title: 'MEJA-IT',
    description: 'Simulasi IT Support: tangani tiket, diagnosis masalah, jaga SLA, reputasi, dan karier teknisi.',
    playUrl: '/src/games/meja-it/',
    badges: Object.freeze(['SIMULASI', 'IT SUPPORT', 'OFFLINE-FIRST']),
    status: 'ready',
    statusLabel: 'Siap dimainkan',
    iconPath: 'M4 6h16v10H4zM8 20h8M12 16v4M7 10h2M15 10h2'
  })
]);

export const isGamesRoute = (route) => /^#games(?:\/|$)/.test(route);
