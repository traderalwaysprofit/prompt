import { describe, expect, it } from 'vitest';
import { GAMES, GAMES_HOME_ROUTE, isGamesRoute } from '../src/games-registry.js';

describe('Games Hub registry', () => {
  it('exposes the canonical Games Hub route', () => {
    expect(GAMES_HOME_ROUTE).toBe('#games');
    expect(isGamesRoute('#games')).toBe(true);
    expect(isGamesRoute('#games/meja-it')).toBe(true);
    expect(isGamesRoute('#tools')).toBe(false);
  });

  it('registers MEJA-IT as a ready standalone game', () => {
    const game = GAMES.find((item) => item.id === 'meja-it');

    expect(game).toBeDefined();
    expect(game?.status).toBe('ready');
    expect(game?.playUrl).toBe('/src/games/meja-it/');
    expect(game?.badges).toContain('IT SUPPORT');
  });

  it('keeps game ids and launch URLs unique', () => {
    expect(new Set(GAMES.map((game) => game.id)).size).toBe(GAMES.length);
    expect(new Set(GAMES.map((game) => game.playUrl)).size).toBe(GAMES.length);
  });
});
