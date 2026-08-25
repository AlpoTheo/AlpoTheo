import { ROUTES, completion, createInitialState, executeCommand, reduce } from './core.js';
import { createTerrain } from './terrain.js';

const STORAGE_KEY = 'alpotheo.profile.exploration.v1';
const root = document.body;
const select = (query) => document.querySelector(query);
const selectAll = (query) => [...document.querySelectorAll(query)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function restoreProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    visitedRoutes: state.visitedRoutes,
    openedHaul: state.openedHaul,
    inspectedTerrain: state.inspectedTerrain,
    returning: true,
  }));
}

const [profile, contributionData] = await Promise.all([
  fetch('./data/profile.json').then((response) => {
    if (!response.ok) throw new Error('PROFILE DATA UNAVAILABLE');
    return response.json();
  }),
  fetch('./data/contributions.json').then((response) => {
    if (!response.ok) throw new Error('WORLD DATA UNAVAILABLE');
    return response.json();
  }),
]);

let state = createInitialState(restoreProgress());
let history = [];
let historyIndex = 0;
let terrain;
const live = select('[data-live]');

function announce(message) {
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

function setMode(mode) {
  state = mode === 'haul'
    ? reduce(state, { type: 'OPEN_HAUL' })
    : mode === 'terrain'
      ? reduce(state, { type: 'INSPECT_TERRAIN' })
      : reduce(state, { type: 'SET_MODE', mode: 'map' });
  render();
  if (mode === 'terrain') requestAnimationFrame(() => terrain?.resize());
}

function render() {
  const route = ROUTES[state.activeRoute];
  const routeCopy = profile.routes[state.activeRoute];
  root.dataset.route = state.activeRoute;
  root.dataset.mode = state.mode;

  selectAll('[data-route]').forEach((button) => {
    const active = button.dataset.route === state.activeRoute;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  select('[data-route-index]').textContent = `ROUTE / ${route.index}`;
  select('[data-route-title]').textContent = routeCopy.title;
  select('[data-route-brief]').textContent = routeCopy.brief;
  select('[data-loadout]').replaceChildren(...route.loadout.map((item) => Object.assign(document.createElement('li'), { textContent: item })));
  select('[data-principles]').replaceChildren(...routeCopy.principles.map((item) => Object.assign(document.createElement('li'), { textContent: item })));

  selectAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== state.mode; });
  selectAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  select('[data-terminal]').classList.toggle('is-closed', !state.terminalOpen);

  const checks = {
    data: state.visitedRoutes.includes('data'),
    game: state.visitedRoutes.includes('game'),
    core: state.visitedRoutes.includes('core'),
    haul: state.openedHaul,
    terrain: state.inspectedTerrain,
  };
  Object.entries(checks).forEach(([key, done]) => select(`[data-progress="${key}"]`).classList.toggle('is-complete', done));
  const done = Object.values(checks).filter(Boolean).length;
  select('[data-progress-line]').style.width = `${done * 20}%`;
  const mapped = completion(state);
  select('[data-system-status]').textContent = mapped ? 'SYSTEM MAPPED' : `${done} / 5 MAPPED`;
  root.classList.toggle('is-mapped', mapped);
  saveProgress(state);
}

function dispatch(action, message) {
  state = reduce(state, action);
  render();
  announce(message);
}

selectAll('[data-route]').forEach((button) => button.addEventListener('click', () => {
  const route = button.dataset.route;
  dispatch({ type: 'SELECT_ROUTE', route }, `${ROUTES[route].label} loaded`);
}));

selectAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));

selectAll('[data-haul-node]').forEach((button) => button.addEventListener('click', () => {
  const node = button.dataset.haulNode;
  selectAll('[data-haul-node]').forEach((item) => item.classList.toggle('is-active', item === button));
  select('[data-haul-title]').textContent = node.toUpperCase();
  select('[data-haul-detail]').textContent = profile.haul.nodes[node];
  if (!state.openedHaul) state = reduce(state, { type: 'OPEN_HAUL' });
  render();
  announce(`HAUL ${node} record opened`);
}));

const terminalOutput = select('[data-terminal-output]');
const terminalInput = select('[data-terminal-input]');
function outputLine(source, text) {
  const line = document.createElement('p');
  const prefix = document.createElement('span');
  prefix.textContent = source;
  line.append(prefix, document.createTextNode(` ${text}`));
  terminalOutput.append(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

select('[data-terminal-form]').addEventListener('submit', (event) => {
  event.preventDefault();
  const command = terminalInput.value.trim();
  if (!command) return;
  outputLine('YOU', command);
  history.push(command);
  historyIndex = history.length;
  const result = executeCommand(command, state);
  state = result.state;
  if (result.clear) terminalOutput.replaceChildren();
  result.lines.forEach((line) => outputLine('SYS', line));
  terminalInput.value = '';
  render();
  if (state.mode === 'terrain') requestAnimationFrame(() => terrain?.resize());
});

terminalInput.addEventListener('keydown', (event) => {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !history.length) return;
  event.preventDefault();
  historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
  terminalInput.value = history[historyIndex] ?? '';
});

select('[data-terminal-toggle]').addEventListener('click', () => {
  state = reduce(state, { type: 'TOGGLE_TERMINAL' });
  render();
  if (state.terminalOpen) terminalInput.focus();
});

select('[data-reset-progress]').addEventListener('click', () => {
  state = reduce(state, { type: 'RESET_PROGRESS' });
  render();
  announce('Exploration map reset');
});

select('[data-terrain-total]').textContent = contributionData.summary.total;
select('[data-terrain-active]').textContent = contributionData.summary.activeDays;
select('[data-terrain-peak]').textContent = contributionData.summary.peak;
terrain = createTerrain(select('[data-terrain]'), {
  days: contributionData.days,
  onInspect(day) {
    if (!state.inspectedTerrain) state = reduce(state, { type: 'INSPECT_TERRAIN' });
    select('[data-terrain-inspect]').textContent = `${day.date} / ${day.count} CONTRIBUTIONS`;
    render();
  },
});
selectAll('[data-terrain-zoom]').forEach((button) => button.addEventListener('click', () => terrain.zoomAt(button.dataset.terrainZoom === 'in' ? 1.15 : 0.87)));
select('[data-terrain-reset]').addEventListener('click', () => terrain.reset());

window.addEventListener('resize', () => { if (state.mode === 'terrain') terrain.resize(); });
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input')) return;
  if (event.key.toLowerCase() === 't') {
    state = reduce(state, { type: 'TOGGLE_TERMINAL' });
    render();
    if (state.terminalOpen) terminalInput.focus();
    return;
  }
  if (event.key === 'Escape') setMode('map');
  const keys = { ArrowUp: -1, w: -1, ArrowDown: 1, s: 1 };
  if (!(event.key in keys)) return;
  const ids = Object.keys(ROUTES);
  const index = ids.indexOf(state.activeRoute);
  const route = ids[(index + keys[event.key] + ids.length) % ids.length];
  dispatch({ type: 'SELECT_ROUTE', route }, `${ROUTES[route].label} loaded`);
});

function finishBoot() {
  select('[data-boot]').classList.add('is-finished');
  root.classList.add('is-ready');
}
select('[data-skip-boot]').addEventListener('click', finishBoot);
const returning = restoreProgress().returning === true;
setTimeout(finishBoot, reducedMotion ? 0 : returning ? 280 : 1050);

render();
