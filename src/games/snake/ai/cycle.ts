import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import type { Cell, Direction, SnakeState } from "@/games/snake/types";

import safety from "@/games/snake/ai/safety";
const { directions, move, same } = board;
const { canMove, tailClearance } = safety;
const updateSnake = logic.update;

// A closed serpentine tour needs no stored graph or mutable AI cache.
const cycleIndex = ({ x, y }: Cell, { columns, rows }: SnakeState) =>
  x === 0
    ? rows * (columns - 1) + rows - 1 - y
    : y * (columns - 1) + (y % 2 ? columns - 1 - x : x - 1);
const cycleDistance = (
  from: Cell,
  to: Cell,
  cycleDirection: number,
  state: SnakeState,
) =>
  (cycleDirection * (cycleIndex(to, state) - cycleIndex(from, state)) +
    state.columns * state.rows) %
  (state.columns * state.rows);
function cycleCell(position: number, state: SnakeState): Cell {
  const { columns, rows } = state;
  if (position >= rows * (columns - 1))
    return { x: 0, y: rows * columns - 1 - position };
  const y = Math.floor(position / (columns - 1));
  const step = position % (columns - 1);
  return { x: y % 2 ? columns - 1 - step : step + 1, y };
}
function followsCycle(state: SnakeState, cycleDirection: number): boolean {
  let span = 0;
  for (let i = state.body.length - 1; i > 0; i--)
    span += cycleDistance(
      state.body[i]!,
      state.body[i - 1]!,
      cycleDirection,
      state,
    );
  return span < state.columns * state.rows;
}
function nextCycleStep(
  state: SnakeState,
  cycleDirection: number,
): Direction | null {
  const count = state.columns * state.rows;
  const target = cycleCell(
    (cycleIndex(state.body[0]!, state) + cycleDirection + count) % count,
    state,
  );
  return (
    directions.find(
      (direction) =>
        same(move(state.body[0]!, direction), target) &&
        canMove(state, direction),
    ) ?? null
  );
}
// Once body order is established, every successor is safe. A shortcut may only
// cross empty cycle space before both the tail and food, preserving that proof.
function findShortcut(
  state: SnakeState,
  cycleDirection: number,
  preferSpacing: boolean,
): Direction | null {
  const head = state.body[0]!;
  const tail = state.body.at(-1)!;
  const foodDistance = state.food
    ? cycleDistance(head, state.food, cycleDirection, state)
    : state.columns * state.rows;
  const tailDistance = cycleDistance(head, tail, cycleDirection, state);
  let best = nextCycleStep(state, cycleDirection);
  let bestScore = -Infinity;
  for (const direction of directions) {
    if (!canMove(state, direction)) continue;
    const target = move(head, direction);
    const jump = cycleDistance(head, target, cycleDirection, state);
    const grows = state.food && same(target, state.food);
    // Keep a little visible room when safe, without postponing an available meal.
    const clearance = tailClearance(target, state.body.at(-2) ?? target);
    const bonus = grows
      ? state.columns * state.rows + 8
      : clearance >= 2
        ? 8
        : 0;
    const score = jump + (preferSpacing ? bonus : 0);
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
function findRejoinStep(
  state: SnakeState,
  cycleDirection: number,
): Direction | null {
  const first = nextCycleStep(state, cycleDirection);
  if (!first) return null;
  let trial = state;
  for (let step = 0; step < state.columns * state.rows; step++) {
    const direction = nextCycleStep(trial, cycleDirection);
    if (!direction) return null;
    trial = updateSnake(trial, direction);
    if (trial.won || followsCycle(trial, cycleDirection)) return first;
  }
  return null;
}
export default { followsCycle, findShortcut, findRejoinStep };
