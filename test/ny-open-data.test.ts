import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateDraw } from '../src/core/validate.ts';
import { getGame } from '../src/games/index.ts';
import { parseRow, type NyRow } from '../src/sources/ny-open-data.ts';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')) as NyRow[];

test('parses a Powerball row: sixth number is the Powerball', () => {
  const game = getGame('us-powerball');
  const draw = parseRow(game, fixture('ny-powerball')[0]!, 'https://example.com');
  assert.equal(draw.id, 'us-powerball-2026-11-09');
  assert.deepEqual(draw.main, [13, 34, 41, 45, 48]);
  assert.deepEqual(draw.bonus, [{ name: 'Powerball', numbers: [25] }]);
  assert.deepEqual(draw.extras, [{ name: 'Multiplier', value: '2x' }]);
  // 22:59 Eastern Standard Time is 03:59 UTC the next day.
  assert.equal(draw.drawnAt, '2026-11-10T03:59:00Z');
  assert.deepEqual(validateDraw(game, draw), []);
});

test('parses a Mega Millions row: Mega Ball is a separate column', () => {
  const game = getGame('us-mega-millions');
  const draw = parseRow(game, fixture('ny-mega-millions')[0]!, 'https://example.com');
  assert.deepEqual(draw.main, [2, 18, 25, 30, 65]);
  assert.deepEqual(draw.bonus, [{ name: 'Mega Ball', numbers: [22] }]);
  assert.deepEqual(draw.extras, []);
  assert.deepEqual(validateDraw(game, draw), []);
});

test('every fixture row validates', () => {
  for (const [id, name] of [['us-powerball', 'ny-powerball'], ['us-mega-millions', 'ny-mega-millions']] as const) {
    const game = getGame(id);
    for (const row of fixture(name)) assert.deepEqual(validateDraw(game, parseRow(game, row, 'https://example.com')), []);
  }
});
