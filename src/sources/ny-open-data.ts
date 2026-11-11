/**
 * New York State Gaming Commission datasets on data.ny.gov (Socrata API).
 * Official open data for the multi-state games New York takes part in.
 * It carries winning numbers only — no jackpot amounts.
 */
import type { Draw, Game } from '../schema/index.ts';
import { drawInstant, toInstantString } from '../core/time.ts';
import type { Source } from './types.ts';

const DATASETS: Record<string, string> = {
  'us-powerball': 'd6yy-54nr',
  'us-mega-millions': '5xaw-6ayf',
};

export interface NyRow {
  draw_date: string;
  winning_numbers: string;
  mega_ball?: string;
  multiplier?: string;
}

const toNumbers = (text: string) => text.trim().split(/\s+/).map(Number);

export function parseRow(game: Game, row: NyRow, source: string): Draw {
  const localDate = row.draw_date.slice(0, 10);
  const numbers = toNumbers(row.winning_numbers);
  const bonusName = game.bonus[0]?.name ?? 'Bonus';

  // Powerball rows carry the Powerball as the sixth number;
  // Mega Millions rows carry the Mega Ball in its own column.
  const main = row.mega_ball === undefined ? numbers.slice(0, game.main.count) : numbers;
  const bonus = row.mega_ball === undefined ? numbers.slice(game.main.count) : toNumbers(row.mega_ball);

  return {
    id: `${game.id}-${localDate}`,
    gameId: game.id,
    localDate,
    drawnAt: toInstantString(drawInstant(game, localDate)),
    main: [...main].sort((a, b) => a - b),
    bonus: [{ name: bonusName, numbers: bonus }],
    extras: row.multiplier ? [{ name: 'Multiplier', value: `${Number(row.multiplier)}x` }] : [],
    source,
  };
}

export const nyOpenData: Source = {
  async fetchDraws(game, since) {
    const dataset = DATASETS[game.id];
    if (!dataset) throw new Error(`ny-open-data has no dataset for ${game.id}`);

    const page = `https://data.ny.gov/d/${dataset}`;
    const url = new URL(`https://data.ny.gov/resource/${dataset}.json`);
    url.searchParams.set('$where', `draw_date >= '${since}T00:00:00'`);
    url.searchParams.set('$order', 'draw_date DESC');
    url.searchParams.set('$limit', '1000');

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`ny-open-data ${game.id}: HTTP ${response.status}`);
    const rows = (await response.json()) as NyRow[];
    return rows.map((row) => parseRow(game, row, page));
  },
};
