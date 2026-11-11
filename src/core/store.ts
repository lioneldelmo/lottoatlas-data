import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  HistoryFileSchema,
  LatestFileSchema,
  ManifestSchema,
  SCHEMA_VERSION,
  type Draw,
  type Game,
  type GamesFile,
  type HistoryFile,
  type LatestFile,
  type Manifest,
} from '../schema/index.ts';
import { nextScheduledDraw, toInstantString } from './time.ts';

export const DATA_DIR = path.resolve(import.meta.dirname, '../../data/v1');

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Writes only when the content differs, so unchanged runs produce no git diff. */
async function writeJson(file: string, value: unknown): Promise<boolean> {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  const current = await readFile(file, 'utf8').catch(() => null);
  if (current === text) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return true;
}

const gameDir = (gameId: string) => path.join(DATA_DIR, 'games', gameId);

export async function readLatest(gameId: string): Promise<LatestFile | null> {
  const raw = await readJson(path.join(gameDir(gameId), 'latest.json'));
  return raw === null ? null : LatestFileSchema.parse(raw);
}

async function readHistory(gameId: string, year: number): Promise<HistoryFile | null> {
  const raw = await readJson(path.join(gameDir(gameId), 'history', `${year}.json`));
  return raw === null ? null : HistoryFileSchema.parse(raw);
}

async function historyYears(gameId: string): Promise<number[]> {
  const files = await readdir(path.join(gameDir(gameId), 'history')).catch(() => [] as string[]);
  return files
    .filter((f) => /^\d{4}\.json$/.test(f))
    .map((f) => Number(f.slice(0, 4)))
    .sort((a, b) => b - a);
}

/**
 * Merge validated draws into the year files and refresh latest.json.
 * Existing draws are never rewritten with different numbers — a conflict throws.
 */
export async function saveDraws(game: Game, draws: Draw[], now: Date): Promise<{ added: number }> {
  let added = 0;
  const byYear = Map.groupBy(draws, (d) => Number(d.localDate.slice(0, 4)));

  for (const [year, incoming] of byYear) {
    const existing = (await readHistory(game.id, year))?.draws ?? [];
    const merged = new Map(existing.map((d) => [d.id, d]));
    for (const draw of incoming) {
      const known = merged.get(draw.id);
      if (!known) {
        merged.set(draw.id, draw);
        added++;
      } else if (JSON.stringify([known.main, known.bonus]) !== JSON.stringify([draw.main, draw.bonus])) {
        throw new Error(`${draw.id}: source now reports different numbers than already published`);
      }
    }
    const file: HistoryFile = {
      schemaVersion: SCHEMA_VERSION,
      gameId: game.id,
      year,
      draws: [...merged.values()].sort((a, b) => b.localDate.localeCompare(a.localDate)),
    };
    await writeJson(path.join(gameDir(game.id), 'history', `${year}.json`), file);
  }

  const years = await historyYears(game.id);
  const newest = years[0] === undefined ? undefined : (await readHistory(game.id, years[0]))?.draws[0];
  if (newest) {
    const previous = await readLatest(game.id);
    const next = toInstantString(nextScheduledDraw(game, now).drawnAt);
    const unchanged = previous?.draw.id === newest.id && previous.next?.drawnAt === next;
    const latest: LatestFile = {
      schemaVersion: SCHEMA_VERSION,
      gameId: game.id,
      draw: newest,
      next: { drawnAt: next },
      updatedAt: unchanged ? previous.updatedAt : toInstantString(now),
    };
    await writeJson(path.join(gameDir(game.id), 'latest.json'), latest);
  }
  return { added };
}

export async function writeCatalogue(games: Game[]): Promise<void> {
  const file: GamesFile = { schemaVersion: SCHEMA_VERSION, games };
  await writeJson(path.join(DATA_DIR, 'games.json'), file);
}

export async function writeManifest(games: Game[], now: Date): Promise<void> {
  const entries: Manifest['games'] = {};
  for (const game of games) {
    const latest = await readLatest(game.id);
    if (!latest) continue;
    entries[game.id] = {
      latestDrawId: latest.draw.id,
      latestLocalDate: latest.draw.localDate,
      updatedAt: latest.updatedAt,
      historyYears: await historyYears(game.id),
    };
  }

  const file = path.join(DATA_DIR, 'manifest.json');
  const previous = ManifestSchema.safeParse(await readJson(file));
  const sameGames = previous.success && JSON.stringify(previous.data.games) === JSON.stringify(entries);
  const manifest: Manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: sameGames ? previous.data.generatedAt : toInstantString(now),
    games: entries,
  };
  await writeJson(file, manifest);
}
