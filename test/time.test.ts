import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextScheduledDraw, previousScheduledDraw, zonedToUtc } from '../src/core/time.ts';
import { getGame } from '../src/games/index.ts';

test('zonedToUtc follows daylight saving', () => {
  assert.equal(zonedToUtc('2026-07-01', '22:59', 'America/New_York').toISOString(), '2026-07-02T02:59:00.000Z');
  assert.equal(zonedToUtc('2026-12-01', '22:59', 'America/New_York').toISOString(), '2026-12-02T03:59:00.000Z');
});

test('previous and next scheduled draws around a draw night', () => {
  const game = getGame('us-powerball');
  // Monday 9 Nov 2026, 22:00 Eastern — an hour before the draw.
  const before = new Date('2026-11-10T03:00:00Z');
  assert.equal(previousScheduledDraw(game, before).localDate, '2026-11-07');
  assert.equal(nextScheduledDraw(game, before).localDate, '2026-11-09');
  // Ten minutes after the draw.
  const after = new Date('2026-11-10T04:09:00Z');
  assert.equal(previousScheduledDraw(game, after).localDate, '2026-11-09');
  assert.equal(nextScheduledDraw(game, after).localDate, '2026-11-11');
});
