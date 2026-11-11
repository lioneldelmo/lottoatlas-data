/**
 * Data contract between the pipeline and the app.
 *
 * This file is the single source of truth. The app repo holds a copy
 * (src/data/schema/index.ts) made by `npm run sync:schema` — never edit that copy.
 * Keep this file dependency-free apart from zod so it can be copied verbatim.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const isoInstant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, 'expected a UTC instant');

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  /** ISO 4217 */
  currency: z.string().length(3),
});

/** A pool of balls: how many are drawn and from what range. */
export const PoolSchema = z.object({
  count: z.number().int().positive(),
  min: z.number().int().nonnegative(),
  max: z.number().int().positive(),
});

export const BonusPoolSchema = PoolSchema.extend({ name: z.string().min(1) });

export const GameSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** ISO 3166-1 alpha-2, or "EU" for multi-country games. */
  country: z.string().length(2),
  region: z.enum(['north-america', 'south-america', 'europe', 'asia', 'africa', 'oceania']),
  /** IANA time zone the draw schedule is expressed in. */
  timeZone: z.string().min(1),
  currency: z.string().length(3),
  main: PoolSchema,
  bonus: z.array(BonusPoolSchema),
  schedule: z.object({
    /** ISO weekdays, 1 = Monday … 7 = Sunday. */
    days: z.array(z.number().int().min(1).max(7)).min(1),
    /** Local draw time, HH:mm. */
    time: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  /**
   * Accent colour for this game's bonus balls and highlights. Our own choice, not operator
   * branding. Must keep at least 4.5:1 contrast against white text.
   */
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** Kill switch: disabled games stay in the catalogue but are hidden by the app. */
  enabled: z.boolean(),
});

export const DrawSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  /** Calendar date of the draw in the game's own time zone. */
  localDate: isoDate,
  /** Scheduled draw instant in UTC. */
  drawnAt: isoInstant,
  main: z.array(z.number().int()),
  bonus: z.array(z.object({ name: z.string().min(1), numbers: z.array(z.number().int()) })),
  /** Non-ball extras such as a multiplier. */
  extras: z.array(z.object({ name: z.string().min(1), value: z.string().min(1) })),
  jackpot: MoneySchema.optional(),
  source: z.url(),
});

export const LatestFileSchema = z.object({
  schemaVersion: z.number().int(),
  gameId: z.string().min(1),
  draw: DrawSchema,
  next: z.object({ drawnAt: isoInstant, estimatedJackpot: MoneySchema.optional() }).nullable(),
  updatedAt: isoInstant,
});

export const HistoryFileSchema = z.object({
  schemaVersion: z.number().int(),
  gameId: z.string().min(1),
  year: z.number().int(),
  /** Newest first. */
  draws: z.array(DrawSchema),
});

export const GamesFileSchema = z.object({
  schemaVersion: z.number().int(),
  games: z.array(GameSchema),
});

export const ManifestSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: isoInstant,
  games: z.record(
    z.string(),
    z.object({
      latestDrawId: z.string().min(1),
      latestLocalDate: isoDate,
      updatedAt: isoInstant,
      historyYears: z.array(z.number().int()),
    }),
  ),
});

export type Money = z.infer<typeof MoneySchema>;
export type Game = z.infer<typeof GameSchema>;
export type Draw = z.infer<typeof DrawSchema>;
export type LatestFile = z.infer<typeof LatestFileSchema>;
export type HistoryFile = z.infer<typeof HistoryFileSchema>;
export type GamesFile = z.infer<typeof GamesFileSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
