import {
  cellId,
  directions,
  inBounds,
  move,
  same,
  updateSnake,
  type Cell,
  type Direction,
  type SnakeState,
} from "./game";
import { movingFoodPath } from "./pursuit";

// A closed serpentine tour needs no stored graph or mutable AI cache.
const index = ({ x, y }: Cell, { columns, rows }: SnakeState) =>
  x === 0
    ? rows * (columns - 1) + rows - 1 - y
    : y * (columns - 1) + (y % 2 ? columns - 1 - x : x - 1);
const distance = (from: Cell, to: Cell, order: number, state: SnakeState) =>
  (order * (index(to, state) - index(from, state)) + state.columns * state.rows) %
  (state.columns * state.rows);

function cycleCell(position: number, state: SnakeState): Cell {
  const { columns, rows } = state;
  if (position >= rows * (columns - 1))
    return { x: 0, y: rows * columns - 1 - position };
  const y = Math.floor(position / (columns - 1));
  const step = position % (columns - 1);
  return { x: y % 2 ? columns - 1 - step : step + 1, y };
}

function ordered(state: SnakeState, order: number): boolean {
  let span = 0;
  for (let i = state.body.length - 1; i > 0; i--)
    span += distance(state.body[i]!, state.body[i - 1]!, order, state);
  return span < state.columns * state.rows;
}

function legal(state: SnakeState, direction: Direction): boolean {
  const head = move(state.body[0]!, direction);
  if (
    !inBounds(head, state.columns, state.rows) ||
    (state.body[1] && same(head, state.body[1]))
  )
    return false;
  const grows = state.food && same(head, state.food);
  return !state.body
    .slice(0, grows ? undefined : -1)
    .some((cell) => same(head, cell));
}

function cycleStep(state: SnakeState, order: number): Direction | null {
  const count = state.columns * state.rows;
  const target = cycleCell(
    (index(state.body[0]!, state) + order + count) % count,
    state,
  );
  return (
    directions.find(
      (direction) =>
        same(move(state.body[0]!, direction), target) &&
        legal(state, direction),
    ) ?? null
  );
}

const tailClearance = (head: Cell, tail: Cell) =>
  Math.min(2, Math.abs(head.x - tail.x) + Math.abs(head.y - tail.y));

// Once body order is established, every successor is safe. A shortcut may only
// cross empty cycle space before both the tail and food, preserving that proof.
function shortcut(state: SnakeState, order: number, spacing: boolean): Direction | null {
  const head = state.body[0]!;
  const tail = state.body.at(-1)!;
  const foodDistance = state.food
    ? distance(head, state.food, order, state)
    : state.columns * state.rows;
  const tailDistance = distance(head, tail, order, state);
  let best = cycleStep(state, order);
  let bestScore = -Infinity;
  for (const direction of directions) {
    if (!legal(state, direction)) continue;
    const target = move(head, direction);
    const jump = distance(head, target, order, state);
    const grows = state.food && same(target, state.food);
    // Keep a little visible room when safe, without postponing an available meal.
    const clearance = tailClearance(target, state.body.at(-2) ?? target);
    const bonus = grows ? state.columns * state.rows + 8 : clearance >= 2 ? 8 : 0;
    const score = jump + (spacing ? bonus : 0);
    if (
      jump <= foodDistance &&
      jump <= tailDistance - Number(grows) &&
      score > bestScore
    ) {
      best = direction;
      bestScore = score;
    }
  }
  return best;
}

// Human play may scramble cycle order. Only rejoin when simulating the entire
// existing body clearing the route proves it can reach ordered play alive.
function rejoin(state: SnakeState, order: number): Direction | null {
  const first = cycleStep(state, order);
  if (!first) return null;
  let trial = state;
  for (let step = 0; step < state.columns * state.rows; step++) {
    const direction = cycleStep(trial, order);
    if (!direction) return null;
    trial = updateSnake(trial, direction);
    if (trial.won || ordered(trial, order)) return first;
  }
  return null;
}

function pathTo(state: SnakeState, target: Cell): Direction[] | null {
  const idOf = (cell: Cell) => cellId(cell, state.columns);
  const start = idOf(state.body[0]!);
  const goal = idOf(target);
  const blocked = new Set(state.body.slice(1, -1).map(idOf));
  const parent = new Map<number, [number, Direction]>();
  const queue = [state.body[0]!];
  const visited = new Set([start]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!;
    if (idOf(cell) === goal) {
      const path: Direction[] = [];
      let id = goal;
      while (id !== start) {
        const [previous, direction] = parent.get(id)!;
        path.push(direction);
        id = previous;
      }
      return path.reverse();
    }
    for (const direction of directions) {
      const next = move(cell, direction);
      const id = idOf(next);
      if (
        !inBounds(next, state.columns, state.rows) ||
        blocked.has(id) || visited.has(id)
      ) continue;
      visited.add(id);
      parent.set(id, [idOf(cell), direction]);
      queue.push(next);
    }
  }
  return null;
}

function openArea(state: SnakeState): number {
  const idOf = (cell: Cell) => cellId(cell, state.columns);
  const blocked = new Set(state.body.slice(1, -1).map(idOf));
  const queue = [state.body[0]!];
  const visited = new Set([idOf(queue[0]!)]);
  for (let i = 0; i < queue.length; i++) {
    for (const direction of directions) {
      const cell = move(queue[i]!, direction);
      const id = idOf(cell);
      if (
        !inBounds(cell, state.columns, state.rows) ||
        blocked.has(id) || visited.has(id)
      ) continue;
      visited.add(id);
      queue.push(cell);
    }
  }
  return queue.length;
}

const finishSpaces = 10;
interface FinishWork { remaining: number; exhausted: boolean }

// The body plus a route through every empty cell back to its tail is a full
// board cycle. Near the end, preserve that proof instead of sealing off holes.
function completionPath(state: SnakeState, work: FinishWork): Direction[] | null {
  const area = state.columns * state.rows;
  if (state.over || !state.food || area - state.body.length > finishSpaces || work.exhausted) return null;
  const occupied = new Set(state.body.map((cell) => cellId(cell, state.columns)));
  const cells = [state.body[0]!];
  for (let id = 0; id < area; id++)
    if (!occupied.has(id)) cells.push({ x: id % state.columns, y: Math.floor(id / state.columns) });
  cells.push(state.body.at(-1)!);
  const last = cells.length - 1;
  const full = (1 << cells.length) - 1;
  const food = cells.findIndex((cell) => same(cell, state.food!));
  const edges = cells.map((cell) => directions.flatMap((action) => {
    const next = cells.findIndex((target) => same(target, move(cell, action)));
    return next < 0 ? [] : [{ next, action }];
  }));
  if (edges.some((neighbors, index) => neighbors.length < (index === 0 || index === last ? 1 : 2))) return null;
  const memo = new Map<number, number>();
  const choice = new Map<number, { next: number; action: Direction }>();
  function solve(index: number, seen: number): number {
    const key = seen * cells.length + index;
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (work.exhausted || work.remaining-- <= 0) { work.exhausted = true; return Infinity; }
    if (index === last) return seen === full ? 0 : Infinity;
    const ate = !!(seen & (1 << food));
    const minimum = ate ? 0 : Math.abs(cells[index]!.x - state.food!.x) + Math.abs(cells[index]!.y - state.food!.y);
    let best = Infinity;
    for (const edge of edges[index]!) {
      const nextSeen = seen | (1 << edge.next);
      if ((seen & (1 << edge.next)) || (edge.next === last && nextSeen !== full)) continue;
      const rest = solve(edge.next, nextSeen);
      const score = rest === Infinity ? Infinity : ate ? 0 : rest + 1;
      if (score < best) {
        best = score;
        choice.set(key, edge);
        if (best === minimum) break;
      }
    }
    memo.set(key, best);
    return best;
  }
  if (solve(0, 1) === Infinity || work.exhausted) return null;
  const path: Direction[] = [];
  let index = 0;
  let seen = 1;
  while (index !== last) {
    const edge = choice.get(seen * cells.length + index)!;
    path.push(edge.action);
    index = edge.next;
    seen |= 1 << index;
  }
  // Pick the shortest food prefix among complete routes. After any non-food
  // move, the same cycle supplies a route whose food prefix is one step shorter.
  return path;
}

function openSpaceStep(state: SnakeState, spacing: boolean, accepts: (trial: SnakeState) => boolean = () => true): Direction | null {
  let best: Direction | null = null;
  let bestScore = -Infinity;
  for (const direction of directions) {
    if (!legal(state, direction)) continue;
    const trial = updateSnake(state, direction);
    if (!accepts(trial)) continue;
    const tailPath = pathTo(trial, trial.body.at(-1)!);
    if (!tailPath) continue;
    const head = trial.body[0]!;
    const foodDistance = state.food
      ? Math.abs(head.x - state.food.x) + Math.abs(head.y - state.food.y)
      : 0;
    // Opening a larger region prevents repeatedly tracing the same tiny tail
    // loop. A longer tail route stretches the body instead of sealing it in.
    const score = openArea(trial) * 100 + tailPath.length * 2 - foodDistance +
      (spacing ? tailClearance(head, trial.body.at(-1)!) * 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }
  return best;
}

// Prefer short routes to food, but play the whole route on a virtual board
// first. Eating is only safe when the longer body can still reach its tail.
function safeFoodStep(state: SnakeState, foodPath: Direction[] | null, accepts: (trial: SnakeState) => boolean): Direction | null {
  if (foodPath?.length) {
    let trial = state;
    for (const direction of foodPath) {
      if (!legal(trial, direction)) break;
      trial = updateSnake(trial, direction);
    }
    if (trial.won) return foodPath[0]!;
    if (
      trial.body.length > state.body.length &&
      !trial.over &&
      accepts(trial) &&
      pathTo(trial, trial.body.at(-1)!)
    ) return foodPath[0]!;
  }
  return null;
}

// Enlarge a head-to-tail loop by inserting pairs of empty cells. Unlike simply
// following the tail, this can bring food outside a tight loop onto its route.
function detourFoodPath(state: SnakeState): Direction[] | null {
  if (!state.food) return null;
  const path = pathTo(state, state.body.at(-1)!);
  if (!path) return null;
  const cells = [state.body[0]!];
  for (const action of path) cells.push(move(cells.at(-1)!, action));
  const occupied = new Set([...state.body, ...cells].map((cell) => cellId(cell, state.columns)));
  for (let edge = 0; edge < cells.length - 1; edge++) {
    const a = cells[edge]!;
    const b = cells[edge + 1]!;
    for (const sign of [1, -1]) {
      const dx = (b.y - a.y) * sign;
      const dy = (b.x - a.x) * sign;
      const first = { x: a.x + dx, y: a.y + dy };
      const second = { x: b.x + dx, y: b.y + dy };
      if ([first, second].some((cell) => !inBounds(cell, state.columns, state.rows) || occupied.has(cellId(cell, state.columns)))) continue;
      cells.splice(edge + 1, 0, first, second);
      occupied.add(cellId(first, state.columns));
      occupied.add(cellId(second, state.columns));
      if (same(first, state.food) || same(second, state.food)) {
        const route: Direction[] = [];
        for (let i = 1; i < cells.length; i++) {
          route.push(directions.find((action) => same(move(cells[i - 1]!, action), cells[i]!))!);
          if (same(cells[i]!, state.food)) return route;
        }
      }
      // Revisit the enlarged path; each insertion consumes two free cells.
      edge = -1;
      break;
    }
  }
  return null;
}

export function explorerAI(state: SnakeState): Direction | null {
  if (state.over) return null;
  const work: FinishWork = { remaining: 8192, exhausted: false };
  const finish = completionPath(state, work);
  if (finish?.length) return finish[0]!;
  const accepts = (trial: SnakeState) => trial.won || trial.columns * trial.rows - trial.body.length > finishSpaces || !!completionPath(trial, work);
  // Hunt at every density. A static path is cheap; the bounded moving-tail
  // search also sees passages that will open before the head reaches them.
  const direct = safeFoodStep(state, state.food ? pathTo(state, state.food) : null, accepts);
  if (direct) return direct;
  const detour = safeFoodStep(state, detourFoodPath(state), accepts);
  if (detour) return detour;
  const moving = movingFoodPath(state, (trial) => accepts(trial) && (trial.won || !!pathTo(trial, trial.body.at(-1)!)));
  if (moving?.length) return moving[0]!;
  const fallback = snakeAI(state, true);
  const safeMove = (trial: SnakeState) => trial.body.length === state.body.length || accepts(trial);
  if (!fallback || safeMove(updateSnake(state, fallback))) return fallback;
  return openSpaceStep(state, true, safeMove) ?? directions.find((action) =>
    legal(state, action) && safeMove(updateSnake(state, action))) ?? fallback;
}

export function snakeAI(state: SnakeState, spacing = false): Direction | null {
  if (state.over) return null;
  for (const order of [1, -1])
    if (ordered(state, order)) return shortcut(state, order, spacing);
  for (const order of [1, -1]) {
    const direction = rejoin(state, order);
    if (direction) return direction;
  }
  // A single step can open a proven entry into the cycle.
  for (const direction of directions) {
    if (!legal(state, direction)) continue;
    const next = updateSnake(state, direction);
    if ([1, -1].some((order) => ordered(next, order) || rejoin(next, order)))
      return direction;
  }
  const foodPath = state.food ? pathTo(state, state.food) : null;
  if (foodPath?.length) {
    let trial = state;
    for (const direction of foodPath)
      trial = legal(trial, direction)
        ? updateSnake(trial, direction)
        : { ...trial, over: true };
    if (!trial.over && pathTo(trial, trial.body.at(-1)!)) return foodPath[0]!;
  }
  return openSpaceStep(state, spacing) ??
    directions.find((direction) => legal(state, direction)) ?? null;
}
