import { DrawSchema, type Draw, type Game } from '../schema/index.ts';
import { isoWeekday } from './time.ts';

function checkPool(label: string, numbers: number[], pool: { count: number; min: number; max: number }): string[] {
  const problems: string[] = [];
  if (numbers.length !== pool.count) problems.push(`${label}: expected ${pool.count} numbers, got ${numbers.length}`);
  if (new Set(numbers).size !== numbers.length) problems.push(`${label}: duplicate numbers`);
  for (const n of numbers) {
    if (!Number.isInteger(n) || n < pool.min || n > pool.max) problems.push(`${label}: ${n} outside ${pool.min}-${pool.max}`);
  }
  return problems;
}

/**
 * Returns a list of problems; empty means the draw is safe to publish.
 * A draw with any problem must never be written.
 */
export function validateDraw(game: Game, draw: Draw): string[] {
  const parsed = DrawSchema.safeParse(draw);
  if (!parsed.success) return parsed.error.issues.map((i) => `schema: ${i.path.join('.')} ${i.message}`);

  const problems: string[] = [];
  if (draw.gameId !== game.id) problems.push(`gameId ${draw.gameId} does not match ${game.id}`);
  problems.push(...checkPool('main', draw.main, game.main));

  if (draw.bonus.length !== game.bonus.length) {
    problems.push(`expected ${game.bonus.length} bonus pools, got ${draw.bonus.length}`);
  } else {
    game.bonus.forEach((pool, i) => {
      const entry = draw.bonus[i]!;
      if (entry.name !== pool.name) problems.push(`bonus pool ${i} is "${entry.name}", expected "${pool.name}"`);
      problems.push(...checkPool(pool.name, entry.numbers, pool));
    });
  }

  if (!game.schedule.days.includes(isoWeekday(draw.localDate))) {
    problems.push(`${draw.localDate} is not a scheduled draw day`);
  }
  return problems;
}
