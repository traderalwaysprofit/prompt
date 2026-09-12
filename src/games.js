import { GAMES, GAMES_HOME_ROUTE, isGamesRoute } from './games-registry.js';

(() => {
  'use strict';

  let initialized = false;

  const icon = (path) => `<svg class="game-hub-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;

  const shellMarkup = () => `
    <section class="games-section" id="games" aria-label="SAMSON Games Hub">
      <div class="games-inner" id="games-view"></div>
    </section>`;

  const gameCardMarkup = (game) => `
    <article class="games-catalog-card" data-game-id="${game.id}">
      <div class="games-card-topline">
        <span class="games-card-icon">${icon(game.iconPath)}</span>
        <span class="games-card-status is-${game.status}"><span aria-hidden="true"></span>${game.statusLabel}</span>
      </div>
      <span class="games-kicker">${game.category}</span>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="games-card-badges" aria-label="Karakteristik game">
        ${game.badges.map((badge) => `<span>${badge}</span>`).join('')}
      </div>
      <a class="games-play-button" href="${game.playUrl}">Mainkan ${game.title} ${icon('M5 12h14M13 6l6 6-6 6')}</a>
    </article>`;

  const hubMarkup = () => `
    <header class="games-page-header">
      <a class="games-back" href="#cheatcodes" data-games-exit>${icon('M15 18l-6-6 6-6')}<span>Kembali</span></a>
      <div class="games-product-heading">
        <span class="games-product-icon">${icon('M6 9h12l2 8-3 2-2-3H9l-2 3-3-2 2-8zM9 12v4M7 14h4M15 13h.01M17 15h.01')}</span>
        <div class="games-heading">
          <span class="games-kicker">SAMSON / PLAY & LEARN</span>
          <h1 id="games-title" tabindex="-1">Games Hub</h1>
          <p>Kumpulan game interaktif untuk simulasi, latihan, dan belajar sambil bermain.</p>
        </div>
      </div>
    </header>

    <section class="games-catalog" aria-labelledby="games-catalog-title">
      <header class="games-catalog-heading">
        <div>
          <span class="games-kicker">AVAILABLE NOW</span>
          <h2 id="games-catalog-title">Games tersedia</h2>
          <p>Pilih game, baca konteks singkatnya, lalu mulai bermain.</p>
        </div>
        <span class="games-count-pill"><b>${GAMES.length}</b> game tersedia</span>
      </header>
      <div class="games-catalog-grid">
        ${GAMES.length ? GAMES.map(gameCardMarkup).join('') : '<div class="games-empty" role="status"><strong>Belum ada game tersedia.</strong><p>Game baru akan muncul di katalog ini setelah siap dimainkan.</p></div>'}
      </div>
      <p class="games-catalog-note">Arsitektur katalog dibuat modular agar game berikutnya dapat ditambahkan tanpa memenuhi menu utama SAMSON.</p>
    </section>`;

  const getView = () => document.querySelector('#games-view');

  const focusTitle = () => {
    requestAnimationFrame(() => document.querySelector('#games-title')?.focus({ preventScroll: true }));
  };

  const renderHub = ({ focus = true, scroll = true } = {}) => {
    const view = getView();
    if (!view) return;
    view.innerHTML = hubMarkup();
    document.documentElement.dataset.entryMode = 'games';
    if (scroll) document.querySelector('#games')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus) focusTitle();
  };

  const renderRoute = ({ focus = true, scroll = true } = {}) => {
    if (!isGamesRoute(location.hash)) return;
    if (location.hash !== GAMES_HOME_ROUTE && location.hash !== `${GAMES_HOME_ROUTE}/`) {
      history.replaceState(null, '', GAMES_HOME_ROUTE);
    }
    renderHub({ focus, scroll });
  };

  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#nav-games, [data-open-games]')) return;
      event.preventDefault();
      if (location.hash === GAMES_HOME_ROUTE) renderHub();
      else location.hash = GAMES_HOME_ROUTE;
    });
    window.addEventListener('hashchange', () => renderRoute());
  };

  const initialize = () => {
    if (initialized || document.querySelector('#games')) return;
    const featured = document.querySelector('#featured');
    if (!featured) return;

    initialized = true;
    featured.insertAdjacentHTML('beforebegin', shellMarkup());
    bindEvents();

    if (isGamesRoute(location.hash)) renderRoute({ focus: false, scroll: false });
    else getView().innerHTML = hubMarkup();
  };

  document.addEventListener('samson:shell-ready', initialize, { once: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
