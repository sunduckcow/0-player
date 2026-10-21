import board from "@/games/snake/board";
import type {
  CompletionBudget,
  Direction,
  SnakeState,
} from "@/games/snake/types";
const { cellId, directions, move, same } = board;
const emptyCellLimit = 10;
// The body plus a route through every empty cell back to its tail is a full
// board cycle. Near the end, preserve that proof instead of sealing off holes.
function completionPath(
  state: SnakeState,
  budget: CompletionBudget,
): Direction[] | null {
  const area = state.columns * state.rows;
  if (
    state.over ||
    !state.food ||
    area - state.body.length > emptyCellLimit ||
    budget.exhausted
  )
    return null;
  const occupied = new Set(
    state.body.map((cell) => cellId(cell, state.columns)),
  );
  const cells = [state.body[0]!];
  for (let id = 0; id < area; id++)
    if (!occupied.has(id))
      cells.push({ x: id % state.columns, y: Math.floor(id / state.columns) });
  cells.push(state.body.at(-1)!);
  const tailIndex = cells.length - 1;
  const allCellsMask = (1 << cells.length) - 1;
  const foodIndex = cells.findIndex((cell) => same(cell, state.food!));
  const edges = cells.map((cell) =>
    directions.flatMap((action) => {
      const next = cells.findIndex((target) =>
        same(target, move(cell, action)),
      );
      return next < 0 ? [] : [{ next, action }];
    }),
  );
  if (
    edges.some(
      (neighbors, index) =>
        neighbors.length < (index === 0 || index === tailIndex ? 1 : 2),
    )
  )
    return null;
  const memo = new Map<number, number>();
  const chosenEdges = new Map<number, { next: number; action: Direction }>();
  function solve(index: number, visitedMask: number): number {
    const key = visitedMask * cells.length + index;
    const cachedScore = memo.get(key);
    if (cachedScore !== undefined) return cachedScore;
    if (budget.exhausted || budget.remaining-- <= 0) {
      budget.exhausted = true;
      return Infinity;
    }
    if (index === tailIndex) return visitedMask === allCellsMask ? 0 : Infinity;
    const hasEaten = !!(visitedMask & (1 << foodIndex));
    const minimumFoodDistance = hasEaten
      ? 0
      : Math.abs(cells[index]!.x - state.food!.x) +
        Math.abs(cells[index]!.y - state.food!.y);
    let best = Infinity;
    for (const edge of edges[index]!) {
      const nextVisitedMask = visitedMask | (1 << edge.next);
      if (
        visitedMask & (1 << edge.next) ||
        (edge.next === tailIndex && nextVisitedMask !== allCellsMask)
      )
        continue;
      const remainingScore = solve(edge.next, nextVisitedMask);
      let score = Infinity;
      if (remainingScore !== Infinity)
        score = hasEaten ? 0 : remainingScore + 1;
      if (score < best) {
        best = score;
        chosenEdges.set(key, edge);
        if (best === minimumFoodDistance) break;
      }
    }
    memo.set(key, best);
    return best;
  }
  if (solve(0, 1) === Infinity || budget.exhausted) return null;
  const path: Direction[] = [];
  let index = 0;
  let visitedMask = 1;
  while (index !== tailIndex) {
    const edge = chosenEdges.get(visitedMask * cells.length + index)!;
    path.push(edge.action);
    index = edge.next;
    visitedMask |= 1 << index;
  }
  // Pick the shortest food prefix among complete routes. After any non-food
  // move, the same cycle supplies a route whose food prefix is one step shorter.
  return path;
}
export default { emptyCellLimit, findPath: completionPath };
