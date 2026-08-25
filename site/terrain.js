const CELL_X = 12;
const CELL_Y = 3.2;
const DAY_X = 6;
const DAY_Y = 6;

export function heightForCount(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 5;
  if (count <= 5) return 10;
  if (count <= 9) return 16;
  return 23;
}

export function buildCells(days) {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day, index) => ({
      day,
      week: Math.floor(index / 7),
      weekday: day.weekday,
      height: heightForCount(day.count),
    }));
}

export function clampCamera(camera) {
  return {
    x: Number.isFinite(camera.x) ? camera.x : 0,
    y: Number.isFinite(camera.y) ? camera.y : 0,
    zoom: Math.min(2.2, Math.max(0.65, Number.isFinite(camera.zoom) ? camera.zoom : 1)),
  };
}

export function project(cell, camera) {
  return {
    x: camera.x + (cell.week * CELL_X - cell.weekday * DAY_X) * camera.zoom,
    y: camera.y + (cell.week * CELL_Y + cell.weekday * DAY_Y - cell.height) * camera.zoom,
  };
}

export function hitTest(cells, point, camera) {
  let nearest = null;
  let distance = 13 * camera.zoom;
  for (const cell of cells) {
    const projected = project(cell, camera);
    const candidate = Math.hypot(point.x - projected.x, point.y - projected.y);
    if (candidate <= distance) {
      nearest = cell;
      distance = candidate;
    }
  }
  return nearest;
}

function polygon(context, points, fill, stroke = null) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) context.lineTo(x, y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.stroke();
  }
}

export function createTerrain(canvas, { days, onInspect = () => {} } = {}) {
  const context = canvas.getContext('2d');
  const cells = buildCells(days ?? []);
  let width = 0;
  let height = 0;
  let selectedIndex = cells.findLastIndex((cell) => cell.day.count > 0);
  if (selectedIndex < 0) selectedIndex = 0;
  let camera = { x: 150, y: 120, zoom: 1 };
  let pointer = null;
  let dragged = false;

  function authoredCamera() {
    const terrainWidth = 53 * CELL_X;
    const fit = Math.min(1.35, Math.max(0.68, (width - 100) / terrainWidth));
    return { x: Math.max(56, width * 0.16), y: Math.max(92, height * 0.35), zoom: fit };
  }

  function drawCell(cell, active) {
    const point = project(cell, camera);
    const half = 5.5 * camera.zoom;
    const depth = 3 * camera.zoom;
    const baseY = point.y + cell.height * camera.zoom;
    const top = [[point.x, point.y], [point.x + half, point.y + depth], [point.x, point.y + depth * 2], [point.x - half, point.y + depth]];
    if (cell.height) {
      polygon(context, [[point.x - half, point.y + depth], [point.x, point.y + depth * 2], [point.x, baseY + depth * 2], [point.x - half, baseY + depth]], '#6D281E');
      polygon(context, [[point.x + half, point.y + depth], [point.x, point.y + depth * 2], [point.x, baseY + depth * 2], [point.x + half, baseY + depth]], '#A93421');
    }
    polygon(context, top, cell.day.count ? '#FF5A36' : '#2A2A28', active ? '#F1EFE8' : null);
  }

  function render() {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    cells.forEach((cell, index) => drawCell(cell, index === selectedIndex));
    const selected = cells[selectedIndex];
    if (selected) {
      context.fillStyle = '#92928C';
      context.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
      context.textAlign = 'right';
      context.fillText(`${selected.day.date} / ${selected.day.count}`, width - 16, height - 15);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    camera = authoredCamera();
    render();
  }

  function inspect(index) {
    if (!cells.length) return;
    selectedIndex = (index + cells.length) % cells.length;
    onInspect(cells[selectedIndex].day);
    render();
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event) {
    canvas.setPointerCapture?.(event.pointerId);
    pointer = localPoint(event);
    dragged = false;
  }

  function onPointerMove(event) {
    const next = localPoint(event);
    if (pointer) {
      const dx = next.x - pointer.x;
      const dy = next.y - pointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      camera = clampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy });
      pointer = next;
      render();
      return;
    }
    const hovered = hitTest(cells, next, camera);
    canvas.style.cursor = hovered ? 'crosshair' : 'grab';
  }

  function onPointerUp(event) {
    const point = localPoint(event);
    if (!dragged) {
      const selected = hitTest(cells, point, camera);
      if (selected) inspect(cells.indexOf(selected));
    }
    pointer = null;
    dragged = false;
  }

  function onWheel(event) {
    event.preventDefault();
    const point = localPoint(event);
    const previous = camera.zoom;
    const zoom = clampCamera({ ...camera, zoom: previous * (event.deltaY > 0 ? 0.9 : 1.1) }).zoom;
    camera = {
      x: point.x - ((point.x - camera.x) * zoom) / previous,
      y: point.y - ((point.y - camera.y) * zoom) / previous,
      zoom,
    };
    render();
  }

  function onKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -7 : event.key === 'ArrowRight' ? 7 : event.key === 'ArrowUp' ? -1 : 1;
    inspect(selectedIndex + delta);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKeyDown);

  return {
    render,
    resize,
    pan(dx, dy) { camera = clampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy }); render(); },
    zoomAt(factor, point = { x: width / 2, y: height / 2 }) {
      const previous = camera.zoom;
      const zoom = clampCamera({ ...camera, zoom: previous * factor }).zoom;
      camera = { x: point.x - ((point.x - camera.x) * zoom) / previous, y: point.y - ((point.y - camera.y) * zoom) / previous, zoom };
      render();
    },
    reset() { camera = authoredCamera(); render(); },
    selectNext(delta = 1) { inspect(selectedIndex + delta); },
    destroy() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKeyDown);
    },
  };
}
