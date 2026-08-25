export const ROUTES = Object.freeze({
  data: Object.freeze({
    id: 'data',
    index: '01',
    label: 'AI & DATA ENGINEERING',
    short: 'RAW SIGNAL → USEFUL SYSTEM',
    loadout: ['PYTHON', 'DATA PIPELINES', 'MODELS', 'SQL'],
  }),
  game: Object.freeze({
    id: 'game',
    index: '02',
    label: 'GAME DEVELOPMENT',
    short: 'SYSTEM → PLAYER EXPERIENCE',
    loadout: ['UNITY', 'C#', 'GAMEPLAY SYSTEMS', 'TOOLS'],
  }),
  core: Object.freeze({
    id: 'core',
    index: '03',
    label: 'COMPUTER ENGINEERING',
    short: 'FOUNDATION → WORKING MACHINE',
    loadout: ['C', 'JAVA', 'ALGORITHMS', 'LINUX'],
  }),
});

const routeIds = Object.keys(ROUTES);

export function createInitialState(saved = {}) {
  const activeRoute = routeIds.includes(saved.activeRoute) ? saved.activeRoute : 'core';
  const visitedRoutes = Array.isArray(saved.visitedRoutes)
    ? [...new Set(saved.visitedRoutes.filter((route) => routeIds.includes(route)))]
    : [];
  return {
    activeRoute,
    mode: ['map', 'haul', 'terrain'].includes(saved.mode) ? saved.mode : 'map',
    visitedRoutes,
    openedHaul: saved.openedHaul === true,
    inspectedTerrain: saved.inspectedTerrain === true,
    terminalOpen: saved.terminalOpen !== false,
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case 'SELECT_ROUTE': {
      if (!routeIds.includes(action.route)) throw new Error(`Unknown route: ${action.route}`);
      const visitedRoutes = state.visitedRoutes.includes(action.route)
        ? state.visitedRoutes
        : [...state.visitedRoutes, action.route];
      return { ...state, activeRoute: action.route, mode: 'map', visitedRoutes };
    }
    case 'OPEN_HAUL':
      return { ...state, mode: 'haul', openedHaul: true };
    case 'INSPECT_TERRAIN':
      return { ...state, mode: 'terrain', inspectedTerrain: true };
    case 'SET_MODE':
      if (!['map', 'haul', 'terrain'].includes(action.mode)) throw new Error(`Unknown mode: ${action.mode}`);
      return { ...state, mode: action.mode };
    case 'TOGGLE_TERMINAL':
      return { ...state, terminalOpen: action.open ?? !state.terminalOpen };
    case 'RESET_PROGRESS':
      return { ...state, visitedRoutes: [], openedHaul: false, inspectedTerrain: false };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function completion(state) {
  return routeIds.every((route) => state.visitedRoutes.includes(route))
    && state.openedHaul
    && state.inspectedTerrain;
}

const help = [
  'COMMAND INDEX',
  'whoami · routes · select [data|game|core]',
  'haul · terrain · contact · clear · exit',
];

export function executeCommand(input, state) {
  const raw = input.trim();
  const [command = '', argument = ''] = raw.toLowerCase().split(/\s+/, 2);
  switch (command) {
    case 'help':
      return { state, lines: help };
    case 'whoami':
      return { state, lines: ['ALP DORUK SENGUN / COMPUTER ENGINEERING', 'AI & DATA · GAME DEVELOPMENT · SYSTEMS'] };
    case 'routes':
      return { state, lines: routeIds.map((id) => `${ROUTES[id].index} / ${ROUTES[id].label}`) };
    case 'select': {
      if (!routeIds.includes(argument)) {
        return { state, lines: ['SELECT REQUIRES: data, game, OR core.'] };
      }
      const next = reduce(state, { type: 'SELECT_ROUTE', route: argument });
      return { state: next, lines: [`ROUTE ${ROUTES[argument].index} LOADED.`, ROUTES[argument].label] };
    }
    case 'haul':
      return { state: reduce(state, { type: 'OPEN_HAUL' }), lines: ['HAUL / CASE FILE 001', '4-PLAYER CO-OP · EXTRACTION HORROR · COMPLETED'] };
    case 'terrain':
      return { state: reduce(state, { type: 'INSPECT_TERRAIN' }), lines: ['CONTRIBUTION TERRAIN LOADED.', 'POINTER, DRAG, WHEEL, OR ARROW KEYS.'] };
    case 'contact':
      return { state, lines: ['GITHUB / AlpoTheo', 'LINKEDIN / alpsengun', 'MAIL / alpotheo@gmail.com'] };
    case 'clear':
      return { state, lines: [], clear: true };
    case 'exit':
      return { state: reduce(state, { type: 'TOGGLE_TERMINAL', open: false }), lines: ['TERMINAL SUSPENDED. PRESS T TO RETURN.'] };
    case '':
      return { state, lines: [] };
    default:
      return { state, lines: [`UNKNOWN COMMAND: ${raw}`, 'TYPE help FOR THE COMMAND INDEX.'] };
  }
}
