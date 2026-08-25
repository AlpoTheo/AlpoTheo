import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCells,
  clampCamera,
  heightForCount,
  hitTest,
  project,
} from '../site/terrain.js';

const days = [
  { date: '2026-08-17', count: 0, weekday: 1 },
  { date: '2026-08-18', count: 7, weekday: 2 },
];

test('height levels are bounded and monotonic', () => {
  assert.deepEqual([0, 1, 3, 7, 12, 40].map(heightForCount), [0, 5, 10, 16, 23, 23]);
});

test('cell geometry preserves inspectable source data', () => {
  const cells = buildCells(days);

  assert.deepEqual(cells[1].day, days[1]);
  assert.equal(cells[1].height, 16);
});

test('camera zoom is clamped', () => {
  assert.equal(clampCamera({ x: 0, y: 0, zoom: 9 }).zoom, 2.2);
  assert.equal(clampCamera({ x: 0, y: 0, zoom: 0.1 }).zoom, 0.65);
});

test('hit test selects the visually nearest projected cell', () => {
  const cells = buildCells(days);
  const camera = { x: 0, y: 0, zoom: 1 };
  const point = project(cells[1], camera);

  assert.equal(hitTest(cells, point, camera).day.date, '2026-08-18');
});

test('hit test rejects points away from terrain', () => {
  assert.equal(hitTest(buildCells(days), { x: 9999, y: 9999 }, { x: 0, y: 0, zoom: 1 }), null);
});
