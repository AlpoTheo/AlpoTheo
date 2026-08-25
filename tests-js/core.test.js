import test from 'node:test';
import assert from 'node:assert/strict';

import {
  completion,
  createInitialState,
  executeCommand,
  reduce,
} from '../site/core.js';

test('route selection updates shared state and exploration', () => {
  const state = reduce(createInitialState(), { type: 'SELECT_ROUTE', route: 'game' });

  assert.equal(state.activeRoute, 'game');
  assert.deepEqual(state.visitedRoutes, ['game']);
});

test('route selection rejects unknown route ids', () => {
  assert.throws(
    () => reduce(createInitialState(), { type: 'SELECT_ROUTE', route: 'fake' }),
    /unknown route/i,
  );
});

test('terminal select command uses the same route transition', () => {
  const result = executeCommand('select data', createInitialState());

  assert.equal(result.state.activeRoute, 'data');
  assert.match(result.lines.join(' '), /AI & DATA ENGINEERING/);
});

test('system mapped requires all routes, haul, and terrain', () => {
  let state = createInitialState();
  for (const route of ['data', 'game', 'core']) {
    state = reduce(state, { type: 'SELECT_ROUTE', route });
  }
  state = reduce(state, { type: 'OPEN_HAUL' });
  state = reduce(state, { type: 'INSPECT_TERRAIN' });

  assert.equal(completion(state), true);
});

test('unknown commands return useful restrained feedback', () => {
  const result = executeCommand('xyz', createInitialState());

  assert.deepEqual(result.lines, [
    'UNKNOWN COMMAND: xyz',
    'TYPE help FOR THE COMMAND INDEX.',
  ]);
});

test('reset progress preserves the active interface but clears exploration', () => {
  let state = reduce(createInitialState(), { type: 'SELECT_ROUTE', route: 'core' });
  state = reduce(state, { type: 'OPEN_HAUL' });

  state = reduce(state, { type: 'RESET_PROGRESS' });

  assert.deepEqual(state.visitedRoutes, []);
  assert.equal(state.openedHaul, false);
  assert.equal(state.inspectedTerrain, false);
  assert.equal(state.activeRoute, 'core');
});
