import type { Action } from "@/engine/sdk";
import type { Piece, TetrisState } from "@/games/tetris/types";
import geometry from "@/games/tetris/board";
import logic from "@/games/tetris/logic";
import scoring from "@/games/tetris/ai/scoring";
const { dropY } = geometry;
const { update } = logic;
function poseKey(piece: Piece): number {
  return ((piece.y + 4) * 16 + piece.x + 4) * 4 + piece.rotation;
}
/** Search uses normal actions and includes gravity during the gaps between moves. */

function chooseAction(state: TetrisState): Exclude<Action, "primary"> | null {
  if (state.over) return null;
  const seed = state.rng ^ Math.imul(state.pieces + 1, 0x9e3779b9);
  const thinkingTicks = 3 + Math.floor(scoring.preference(seed, 0) * 4);
  const descendAfter = 12 + Math.floor(scoring.preference(seed, 1) * 6);
  const canActThisTick = (state.pieceAge - thinkingTicks) % 2 === 0;
  if (
    state.pieceAge < thinkingTicks ||
    (!canActThisTick && state.pieceAge < descendAfter)
  )
    return null;
  const queue: { state: TetrisState; firstAction: Action | null }[] = [
    { state, firstAction: null },
  ];
  const visited = new Set<number>([poseKey(state.piece) * 8 + state.fall]);
  const evaluatedPlacements = new Set<number>();
  const landingByPose = new Map<number, number>();
  let bestScore = -Infinity;
  let action: Action | null = "primary";
  const consider = (next: TetrisState, firstAction: Action | null) => {
    const score = scoring.landingValue(next, state.lines, seed);
    // Breadth-first order retains the shortest route to an equal final board.
    if (score > bestScore) {
      bestScore = score;
      action = firstAction;
    }
  };
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    const { piece } = node.state;
    const key = poseKey(piece);
    let landing = landingByPose.get(key);
    if (landing === undefined) {
      landing = dropY(state.board, piece);
      landingByPose.set(key, landing);
    }
    const target = (piece.x + 4) * 128 + piece.rotation * 24 + landing + 4;
    if (!evaluatedPlacements.has(target)) {
      evaluatedPlacements.add(target);
      consider(update(node.state, "primary"), node.firstAction ?? "primary");
    }
    // Equal-length routes turn early, while there is room above the stack,
    // instead of sliding to a column and only then changing orientation.
    for (const move of ["up", "left", "right", "down"] as const) {
      const moved = update(node.state, move);
      const next =
        moved.over || moved.pieces !== state.pieces
          ? moved
          : update(moved, null);
      const firstAction = node.firstAction ?? move;
      if (next.over || next.pieces !== state.pieces) {
        consider(next, firstAction);
      } else {
        const key = poseKey(next.piece) * 8 + next.fall;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ state: next, firstAction });
        }
      }
    }
  }
  // A hard drop is only a search shortcut for evaluating a landing. The AI
  // actually descends one soft-drop step per tick once it has lined up.
  if (action === "primary")
    return state.pieceAge < descendAfter ? null : "down";
  return canActThisTick ? action : null;
}
export default { choose: chooseAction };
