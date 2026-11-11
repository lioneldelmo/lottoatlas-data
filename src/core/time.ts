import type { Game } from '../schema/index.ts';

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Convert a wall-clock date + time in `timeZone` to a UTC instant. */
export function zonedToUtc(localDate: string, time: string, timeZone: string): Date {
  const guess = new Date(`${localDate}T${time}:00Z`);
  // Two passes handle instants that fall near a daylight-saving change.
  let utc = new Date(guess.getTime() - zoneOffsetMs(guess, timeZone));
  utc = new Date(guess.getTime() - zoneOffsetMs(utc, timeZone));
  return utc;
}

/** Calendar date (YYYY-MM-DD) of `instant` as seen in `timeZone`. */
export function localDateIn(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a calendar date. */
export function isoWeekday(localDate: string): number {
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function drawInstant(game: Game, localDate: string): Date {
  return zonedToUtc(localDate, game.schedule.time, game.timeZone);
}

export function toInstantString(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** The most recent scheduled draw at or before `now`. */
export function previousScheduledDraw(game: Game, now: Date): { localDate: string; drawnAt: Date } {
  let date = localDateIn(now, game.timeZone);
  for (let i = 0; i < 8; i++) {
    if (game.schedule.days.includes(isoWeekday(date))) {
      const drawnAt = drawInstant(game, date);
      if (drawnAt.getTime() <= now.getTime()) return { localDate: date, drawnAt };
    }
    date = addDays(date, -1);
  }
  throw new Error(`No scheduled draw found for ${game.id}`);
}

/** The first scheduled draw strictly after `now`. */
export function nextScheduledDraw(game: Game, now: Date): { localDate: string; drawnAt: Date } {
  let date = localDateIn(now, game.timeZone);
  for (let i = 0; i < 8; i++) {
    if (game.schedule.days.includes(isoWeekday(date))) {
      const drawnAt = drawInstant(game, date);
      if (drawnAt.getTime() > now.getTime()) return { localDate: date, drawnAt };
    }
    date = addDays(date, 1);
  }
  throw new Error(`No scheduled draw found for ${game.id}`);
}
