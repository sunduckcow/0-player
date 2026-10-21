import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import type { Direction, SnakeState } from "@/games/snake/types";
import routes from "@/games/snake/ai/routes";
import cycle from "@/games/snake/ai/cycle";
import safety from "@/games/snake/ai/safety";
const { directions } = board;
const { pathTo } = routes;
const { followsCycle, findShortcut, findRejoinStep } = cycle;
const { canMove, findOpenSpaceStep } = safety;
const updateSnake = logic.update;

function chooseSafeStep(
  state: SnakeState,
  preferSpacing = false,
): Direction | null {
  if (state.over) return null;
  for (const cycleDirection of [1, -1])
    if (followsCycle(state, cycleDirection))
      return findShortcut(state, cycleDirection, preferSpacing);
  for (const cycleDirection of [1, -1]) {
    const direction = findRejoinStep(state, cycleDirection);
    if (direction) return direction;
  }
  // A single step can open a proven entry into the cycle.
  for (const direction of directions) {
    if (!canMove(state, direction)) continue;
    const next = updateSnake(state, direction);
    if (
      [1, -1].some(
        (cycleDirection) =>
          followsCycle(next, cycleDirection) ||
          findRejoinStep(next, cycleDirection),
      )
    )
      return direction;
  }
  const foodPath = state.food ? pathTo(state, state.food) : null;
  if (foodPath?.length) {
    let trial = state;
    for (const direction of foodPath)
      trial = canMove(trial, direction)
        ? updateSnake(trial, direction)
        : { ...trial, over: true };
    if (!trial.over && pathTo(trial, trial.body.at(-1)!)) return foodPath[0]!;
  }
  return (
    findOpenSpaceStep(state, preferSpacing) ??
    directions.find((direction) => canMove(state, direction)) ??
    null
  );
}
export default { choose: chooseSafeStep };
