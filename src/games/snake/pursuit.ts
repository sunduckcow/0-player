import {
  cellId, directions, inBounds, move, same, updateSnake,
  type Direction, type SnakeState,
} from "./game";

interface Node {
  cell: number;
  time: number;
  parent: number;
  action?: Direction;
  hash: number;
}

/** A bounded, deterministic route through cells that the moving tail releases. */
export function movingFoodPath(
  state: SnakeState,
  accepts: (trial: SnakeState) => boolean = () => true,
): Direction[] | null {
  const budget = { checks: 32 };
  return searchFood(state, accepts, false, budget) ?? searchFood(state, accepts, true, budget);
}

function searchFood(
  state: SnakeState, accepts: (trial: SnakeState) => boolean,
  bodies: boolean, work: { checks: number },
): Direction[] | null {
  if (state.over || !state.food || !work.checks) return null;
  const area = state.columns * state.rows;
  const length = state.body.length;
  const budget = Math.min(area * 8, 4096);
  const horizon = bodies ? budget - 1 : Math.min(area + length, budget - 1);
  const release = new Uint16Array(area);
  state.body.forEach((cell, index) => { release[cellId(cell, state.columns)] = length - index; });
  let hash = 0;
  let power = 1;
  for (let index = length - 1; index >= 0; index--) {
    hash = (Math.imul(hash, 31) + cellId(state.body[index]!, state.columns) + 1) | 0;
    power = Math.imul(power, 31);
  }
  const goal = cellId(state.food, state.columns);
  const queue: Node[] = [{ cell: cellId(state.body[0]!, state.columns), time: 0, parent: -1, hash }];
  // Try cheap cell/time merging first; a second bounded pass distinguishes
  // moving bodies with a rolling tail-to-head hash when the first finds no escape.
  const visited = new Set<string>([`${queue[0]!.cell}:${bodies ? hash : 0}`]);

  function route(index: number): Direction[] {
    const path: Direction[] = [];
    while (queue[index]!.parent >= 0) {
      path.push(queue[index]!.action!);
      index = queue[index]!.parent;
    }
    return path.reverse();
  }

  function grownState(index: number): SnakeState {
    const node = queue[index]!;
    const body = [];
    for (let ancestor = node.parent; ancestor >= 0 && body.length < length; ancestor = queue[ancestor]!.parent) {
      const cell = queue[ancestor]!.cell;
      body.push({ x: cell % state.columns, y: Math.floor(cell / state.columns) });
    }
    body.push(...state.body.slice(1, length - body.length + 1));
    // Bounds, tail release and trail collisions were already checked by search.
    // Only the final meal changes length, score, food or RNG, so run that rule once.
    return updateSnake({ ...state, body, direction: queue[node.parent]!.action ?? state.direction }, node.action!);
  }

  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    if (node.cell === goal) {
      if (!work.checks) return null;
      work.checks--;
      const trial = grownState(index);
      if (trial.body.length > length && (!trial.over || trial.won) && accepts(trial)) return route(index);
      continue;
    }
    if (node.time >= horizon || queue.length >= budget) continue;
    const position = { x: node.cell % state.columns, y: Math.floor(node.cell / state.columns) };
    for (const action of directions) {
      if (queue.length >= budget) break;
      const next = move(position, action);
      if (!inBounds(next, state.columns, state.rows)) continue;
      if (same(move(next, node.action ?? state.direction), position)) continue;
      const cell = cellId(next, state.columns);
      const time = node.time + 1;
      if (time < release[cell]!) continue;
      let ancestor = index;
      while (ancestor >= 0 && time - queue[ancestor]!.time < length) {
        if (queue[ancestor]!.cell === cell) break;
        ancestor = queue[ancestor]!.parent;
      }
      if (ancestor >= 0 && time - queue[ancestor]!.time < length) continue;
      const tail = time <= length
        ? cellId(state.body[length - time]!, state.columns)
        : queue[ancestor]!.cell;
      // Pop the old tail and append the new head, modulo 2^32.
      const hash = (Math.imul(node.hash, 31) - Math.imul(tail + 1, power) + cell + 1) | 0;
      const key = `${cell}:${bodies ? hash : time}`;
      // Different approaches to food can leave different escape routes.
      if (cell !== goal && visited.has(key)) continue;
      if (cell !== goal) visited.add(key);
      queue.push({ cell, time, parent: index, action, hash });
    }
  }
  return null;
}
