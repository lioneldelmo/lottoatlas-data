/**
 * Collector entry point.
 *
 *   node src/run.ts              fetch only games whose latest scheduled draw is missing
 *   node src/run.ts --force      fetch every game regardless of schedule
 *   node src/run.ts --backfill   fetch every game from 1 January of the current year
 *
 * Exits non-zero if any game failed, so the workflow can raise an alert.
 * A failing game never blocks the others and never overwrites published data.
 */
import { games } from './games/index.ts';
import { sources } from './sources/index.ts';
import { readLatest, saveDraws, writeCatalogue, writeManifest } from './core/store.ts';
import { addDays, localDateIn, previousScheduledDraw } from './core/time.ts';
import { validateDraw } from './core/validate.ts';

const args = new Set(process.argv.slice(2));
const backfill = args.has('--backfill');
const force = args.has('--force') || backfill;
const now = new Date();

let failures = 0;

for (const game of games.filter((g) => g.enabled)) {
  try {
    const latest = await readLatest(game.id);
    const expected = previousScheduledDraw(game, now);
    const due = !latest || latest.draw.localDate < expected.localDate;

    if (!due && !force) {
      console.log(`${game.id}: up to date (${latest.draw.localDate})`);
      continue;
    }

    const source = sources[game.id];
    if (!source) throw new Error('no source adapter registered');

    const today = localDateIn(now, game.timeZone);
    const since = backfill || !latest ? `${today.slice(0, 4)}-01-01` : addDays(latest.draw.localDate, -7);
    const fetched = await source.fetchDraws(game, since);

    const valid = [];
    for (const draw of fetched) {
      const problems = validateDraw(game, draw);
      if (problems.length > 0) {
        failures++;
        console.error(`${game.id}: rejected ${draw.id}: ${problems.join('; ')}`);
      } else {
        valid.push(draw);
      }
    }

    const { added } = await saveDraws(game, valid, now);
    const stillMissing = due && !valid.some((d) => d.localDate >= expected.localDate);
    console.log(
      `${game.id}: fetched ${fetched.length}, added ${added}` +
        (stillMissing ? ` — ${expected.localDate} draw not published by the source yet` : ''),
    );
  } catch (error) {
    failures++;
    console.error(`${game.id}: FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await writeCatalogue(games);
await writeManifest(games, now);

if (failures > 0) {
  console.error(`${failures} problem(s) — see log above`);
  process.exitCode = 1;
}
