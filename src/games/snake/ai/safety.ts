import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import type { Cell, Direction, SnakeState } from "@/games/snake/types";

import routes from "@/games/snake/ai/routes";
const { directions, inBounds, move, same } = board;
const { pathTo, openArea } = routes;
const updateSnake = logic.update;

function canMove(state: SnakeState, direction: Direction): boolean {
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
const tailClearance = (head: Cell, tail: Cell) =>
  Math.min(2, Math.abs(head.x - tail.x) + Math.abs(head.y - tail.y));
function findOpenSpaceStep(
  state: SnakeState,
  preferSpacing: boolean,
  accepts: (trial: SnakeState) => boolean = () => true,
): Direction | null {
  let best: Direction | null = null;
  let bestScore = -Infinity;
  for (const direction of directions) {
    if (!canMove(state, direction)) continue;
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
    const score =
      openArea(trial) * 100 +
      tailPath.length * 2 -
      foodDistance +
      (preferSpacing ? tailClearance(head, trial.body.at(-1)!) * 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }
  return best;
}
// Prefer short routes to food, but play the whole route on a virtual board
// first. Eating is only safe when the longer body can still reach its tail.
function findSafeFoodStep(
  state: SnakeState,
  foodPath: Direction[] | null,
  accepts: (trial: SnakeState) => boolean,
): Direction | null {
  if (foodPath?.length) {
    let trial = state;
    for (const direction of foodPath) {
      if (!canMove(trial, direction)) break;
      trial = updateSnake(trial, direction);
    }
    if (trial.won) return foodPath[0]!;
    if (
      trial.body.length > state.body.length &&
      !trial.over &&
      accepts(trial) &&
      pathTo(trial, trial.body.at(-1)!)
    )
      return foodPath[0]!;
  }
  return null;
}
export default { canMove, tailClearance, findOpenSpaceStep, findSafeFoodStep };
