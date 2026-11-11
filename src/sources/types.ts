import type { Draw, Game } from '../schema/index.ts';

export interface Source {
  /** Fetch draws on or after `since` (YYYY-MM-DD, game-local), in any order. */
  fetchDraws(game: Game, since: string): Promise<Draw[]>;
}
