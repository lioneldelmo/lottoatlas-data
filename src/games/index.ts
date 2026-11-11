import { GameSchema, type Game } from '../schema/index.ts';

/**
 * Game catalogue. Adding a game = one entry here + one adapter in src/sources
 * + one fixture test. Matrices and schedules must come from the operator's
 * published rules; re-check them when an operator announces a format change.
 */
const definitions: Game[] = [
  {
    id: 'us-powerball',
    name: 'Powerball',
    country: 'US',
    region: 'north-america',
    timeZone: 'America/New_York',
    currency: 'USD',
    main: { count: 5, min: 1, max: 69 },
    bonus: [{ name: 'Powerball', count: 1, min: 1, max: 26 }],
    schedule: { days: [1, 3, 6], time: '22:59' },
    accent: '#C81E3A',
    enabled: true,
  },
  {
    id: 'us-mega-millions',
    name: 'Mega Millions',
    country: 'US',
    region: 'north-america',
    timeZone: 'America/New_York',
    currency: 'USD',
    main: { count: 5, min: 1, max: 70 },
    bonus: [{ name: 'Mega Ball', count: 1, min: 1, max: 24 }],
    schedule: { days: [2, 5], time: '23:00' },
    accent: '#1A5FD0',
    enabled: true,
  },
];

export const games: Game[] = definitions.map((g) => GameSchema.parse(g));

export function getGame(id: string): Game {
  const game = games.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
