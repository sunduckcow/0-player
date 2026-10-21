import board from "@/games/snake/board";
import type { Cell, Direction, SnakeState } from "@/games/snake/types";
const { cellId, directions, inBounds, move, same } = board;
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
        blocked.has(id) ||
        visited.has(id)
      )
        continue;
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
        blocked.has(id) ||
        visited.has(id)
      )
        continue;
      visited.add(id);
      queue.push(cell);
    }
  }
  return queue.length;
}
// Enlarge a head-to-tail loop by inserting pairs of empty cells. Unlike simply
// following the tail, this can bring food outside a tight loop onto its route.
function detourFoodPath(state: SnakeState): Direction[] | null {
  if (!state.food) return null;
  const path = pathTo(state, state.body.at(-1)!);
  if (!path) return null;
  const cells = [state.body[0]!];
  for (const action of path) cells.push(move(cells.at(-1)!, action));
  const occupied = new Set(
    [...state.body, ...cells].map((cell) => cellId(cell, state.columns)),
  );
  for (let edge = 0; edge < cells.length - 1; edge++) {
    const edgeStart = cells[edge]!;
    const edgeEnd = cells[edge + 1]!;
    for (const sign of [1, -1]) {
      const dx = (edgeEnd.y - edgeStart.y) * sign;
      const dy = (edgeEnd.x - edgeStart.x) * sign;
      const first = { x: edgeStart.x + dx, y: edgeStart.y + dy };
      const second = { x: edgeEnd.x + dx, y: edgeEnd.y + dy };
      if (
        [first, second].some(
          (cell) =>
            !inBounds(cell, state.columns, state.rows) ||
            occupied.has(cellId(cell, state.columns)),
        )
      )
        continue;
      cells.splice(edge + 1, 0, first, second);
      occupied.add(cellId(first, state.columns));
      occupied.add(cellId(second, state.columns));
      if (same(first, state.food) || same(second, state.food)) {
        const route: Direction[] = [];
        for (let i = 1; i < cells.length; i++) {
          route.push(
            directions.find((action) =>
              same(move(cells[i - 1]!, action), cells[i]!),
            )!,
          );
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
export default { pathTo, openArea, detourFoodPath };
