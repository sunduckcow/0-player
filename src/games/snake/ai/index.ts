import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import type {
  CompletionBudget,
  Direction,
  SnakeState,
} from "@/games/snake/types";
import routes from "@/games/snake/ai/routes";
import completion from "@/games/snake/ai/completion";
import pursuit from "@/games/snake/ai/pursuit";
import safety from "@/games/snake/ai/safety";
import safe from "@/games/snake/ai/safe";
const { directions } = board;
const { pathTo, detourFoodPath } = routes;
const { emptyCellLimit, findPath: findCompletionPath } = completion;
const { canMove, findOpenSpaceStep, findSafeFoodStep } = safety;
const movingFoodPath = pursuit.find;
const updateSnake = logic.update;
const chooseSafeStep = safe.choose;

function chooseExplorerStep(state: SnakeState): Direction | null {
  if (state.over) return null;
  const completionBudget: CompletionBudget = {
    remaining: 8192,
    exhausted: false,
  };
  const finish = findCompletionPath(state, completionBudget);
  if (finish?.length) return finish[0]!;
  const accepts = (trial: SnakeState) =>
    trial.won ||
    trial.columns * trial.rows - trial.body.length > emptyCellLimit ||
    !!findCompletionPath(trial, completionBudget);
  // Hunt at every density. A static path is cheap; the bounded moving-tail
  // search also sees passages that will open before the head reaches them.
  const direct = findSafeFoodStep(
    state,
    state.food ? pathTo(state, state.food) : null,
    accepts,
  );
  if (direct) return direct;
  const detour = findSafeFoodStep(state, detourFoodPath(state), accepts);
  if (detour) return detour;
  const moving = movingFoodPath(
    state,
    (trial) =>
      accepts(trial) && (trial.won || !!pathTo(trial, trial.body.at(-1)!)),
  );
  if (moving?.length) return moving[0]!;
  const fallback = chooseSafeStep(state, true);
  const safeMove = (trial: SnakeState) =>
    trial.body.length === state.body.length || accepts(trial);
  if (!fallback || safeMove(updateSnake(state, fallback))) return fallback;
  return (
    findOpenSpaceStep(state, true, safeMove) ??
    directions.find(
      (action) =>
        canMove(state, action) && safeMove(updateSnake(state, action)),
    ) ??
    fallback
  );
}
export default { explorer: chooseExplorerStep, safe: chooseSafeStep };
