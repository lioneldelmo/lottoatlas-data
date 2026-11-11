import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateDraw } from '../src/core/validate.ts';
import { getGame } from '../src/games/index.ts';
import type { Draw } from '../src/schema/index.ts';

const game = getGame('us-powerball');
const good: Draw = {
  id: 'us-powerball-2026-11-09',
  gameId: 'us-powerball',
  localDate: '2026-11-09',
  drawnAt: '2026-11-10T03:59:00Z',
  main: [13, 34, 41, 45, 48],
  bonus: [{ name: 'Powerball', numbers: [25] }],
  extras: [],
  source: 'https://example.com',
};

test('accepts a well-formed draw', () => {
  assert.deepEqual(validateDraw(game, good), []);
});

test('rejects wrong ball count, out-of-range, duplicates and off-schedule dates', () => {
  assert.notDeepEqual(validateDraw(game, { ...good, main: [13, 34, 41, 45] }), []);
  assert.notDeepEqual(validateDraw(game, { ...good, main: [13, 34, 41, 45, 70] }), []);
  assert.notDeepEqual(validateDraw(game, { ...good, main: [13, 13, 41, 45, 48] }), []);
  assert.notDeepEqual(validateDraw(game, { ...good, bonus: [{ name: 'Powerball', numbers: [27] }] }), []);
  assert.notDeepEqual(validateDraw(game, { ...good, bonus: [] }), []);
  // 2026-11-10 is a Tuesday; Powerball draws Monday, Wednesday, Saturday.
  assert.notDeepEqual(validateDraw(game, { ...good, localDate: '2026-11-10' }), []);
});
