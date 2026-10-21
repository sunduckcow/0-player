import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import type { Direction, PursuitNode, SnakeState } from "@/games/snake/types";
const { cellId, directions, inBounds, move, same } = board;
const updateSnake = logic.update;
/** A bounded, deterministic route through cells that the moving tail releases. */

function findMovingFoodPath(
  state: SnakeState,
  accepts: (trial: SnakeState) => boolean = () => true,
): Direction[] | null {
  const validationBudget = { remainingChecks: 32 };
  return (
    searchFoodRoute(state, accepts, false, validationBudget) ??
    searchFoodRoute(state, accepts, true, validationBudget)
  );
}
function searchFoodRoute(
  state: SnakeState,
  accepts: (trial: SnakeState) => boolean,
  distinguishBodies: boolean,
  validationBudget: { remainingChecks: number },
): Direction[] | null {
  if (state.over || !state.food || !validationBudget.remainingChecks)
    return null;
  const area = state.columns * state.rows;
  const bodyLength = state.body.length;
  const nodeLimit = Math.min(area * 8, 4096);
  const timeLimit = distinguishBodies
    ? nodeLimit - 1
    : Math.min(area + bodyLength, nodeLimit - 1);
  const releaseAt = new Uint16Array(area);
  state.body.forEach((cell, bodyIndex) => {
    releaseAt[cellId(cell, state.columns)] = bodyLength - bodyIndex;
  });
  let bodyHash = 0;
  let bodyHashPower = 1;
  for (let index = bodyLength - 1; index >= 0; index--) {
    bodyHash =
      (Math.imul(bodyHash, 31) +
        cellId(state.body[index]!, state.columns) +
        1) |
      0;
    bodyHashPower = Math.imul(bodyHashPower, 31);
  }
  const foodCellId = cellId(state.food, state.columns);
  const queue: PursuitNode[] = [
    {
      cellIndex: cellId(state.body[0]!, state.columns),
      elapsedSteps: 0,
      parentIndex: -1,
      bodyHash,
    },
  ];
  // Try cheap cell/time merging first; a second bounded pass distinguishes
  // moving bodies with a rolling tail-to-head hash when the first finds no escape.
  const visited = new Set<string>([
    `${queue[0]!.cellIndex}:${distinguishBodies ? bodyHash : 0}`,
  ]);

  function reconstructRoute(index: number): Direction[] {
    const path: Direction[] = [];
    while (queue[index]!.parentIndex >= 0) {
      path.push(queue[index]!.direction!);
      index = queue[index]!.parentIndex;
    }
    return path.reverse();
  }

  function simulateMeal(index: number): SnakeState {
    const node = queue[index]!;
    const body = [];
    for (
      let ancestor = node.parentIndex;
      ancestor >= 0 && body.length < bodyLength;
      ancestor = queue[ancestor]!.parentIndex
    ) {
      const cellIndex = queue[ancestor]!.cellIndex;
      body.push({
        x: cellIndex % state.columns,
        y: Math.floor(cellIndex / state.columns),
      });
    }
    body.push(...state.body.slice(1, bodyLength - body.length + 1));
    // Bounds, tail release and trail collisions were already checked by search.
    // Only the final meal changes length, score, food or RNG, so run that rule once.
    return updateSnake(
      {
        ...state,
        body,
        direction: queue[node.parentIndex]!.direction ?? state.direction,
      },
      node.direction!,
    );
  }

  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    if (node.cellIndex === foodCellId) {
      if (!validationBudget.remainingChecks) return null;
      validationBudget.remainingChecks--;
      const trial = simulateMeal(index);
      if (
        trial.body.length > bodyLength &&
        (!trial.over || trial.won) &&
        accepts(trial)
      )
        return reconstructRoute(index);
      continue;
    }
    if (node.elapsedSteps >= timeLimit || queue.length >= nodeLimit) continue;
    const position = {
      x: node.cellIndex % state.columns,
      y: Math.floor(node.cellIndex / state.columns),
    };
    for (const direction of directions) {
      if (queue.length >= nodeLimit) break;
      const next = move(position, direction);
      if (!inBounds(next, state.columns, state.rows)) continue;
      if (same(move(next, node.direction ?? state.direction), position))
        continue;
      const cellIndex = cellId(next, state.columns);
      const elapsedSteps = node.elapsedSteps + 1;
      if (elapsedSteps < releaseAt[cellIndex]!) continue;
      let ancestor = index;
      while (
        ancestor >= 0 &&
        elapsedSteps - queue[ancestor]!.elapsedSteps < bodyLength
      ) {
        if (queue[ancestor]!.cellIndex === cellIndex) break;
        ancestor = queue[ancestor]!.parentIndex;
      }
      if (
        ancestor >= 0 &&
        elapsedSteps - queue[ancestor]!.elapsedSteps < bodyLength
      )
        continue;
      const tail =
        elapsedSteps <= bodyLength
          ? cellId(state.body[bodyLength - elapsedSteps]!, state.columns)
          : queue[ancestor]!.cellIndex;
      // Pop the old tail and append the new head, modulo 2^32.
      const bodyHash =
        (Math.imul(node.bodyHash, 31) -
          Math.imul(tail + 1, bodyHashPower) +
          cellIndex +
          1) |
        0;
      const key = `${cellIndex}:${distinguishBodies ? bodyHash : elapsedSteps}`;
      // Different approaches to food can leave different escape routes.
      if (cellIndex !== foodCellId && visited.has(key)) continue;
      if (cellIndex !== foodCellId) visited.add(key);
      queue.push({
        cellIndex,
        elapsedSteps,
        parentIndex: index,
        direction,
        bodyHash,
      });
    }
  }
  return null;
}
export default { find: findMovingFoodPath };
