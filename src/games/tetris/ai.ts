import type { Action } from "@/engine/types";
import {
  dropY,
  update,
  type Piece,
  type TetrisState,
} from "@/games/tetris/game";

function value(state: TetrisState, cleared: number): number {
  if (state.over) return -1e9;
  const heights = Array<number>(10).fill(0);
  let holes = 0;
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 20; y++) {
      if (state.board[y]![x]) {
        if (!heights[x]) heights[x] = 20 - y;
      } else if (heights[x]) holes++;
    }
  }
  const total = heights.reduce((sum, height) => sum + height, 0);
  const roughness = heights
    .slice(1)
    .reduce(
      (sum, height, index) => sum + Math.abs(height - heights[index]!),
      0,
    );
  return (
    cleared * 0.760666 -
    total * 0.510066 -
    holes * 0.35663 -
    roughness * 0.184483
  );
}

function pose(piece: Piece): number {
  return ((piece.y + 4) * 16 + piece.x + 4) * 4 + piece.rotation;
}

// A fixed per-piece hash gives near-equal landings and timing stable preferences.
function preference(seed: number, salt: number): number {
  let mixed = Math.imul(seed ^ salt, 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

/** Search uses normal actions and includes gravity during the gaps between moves. */
export function ai(state: TetrisState): Exclude<Action, "primary"> | null {
  if (state.over) return null;
  const seed = state.rng ^ Math.imul(state.pieces + 1, 0x9e3779b9);
  const think = 3 + Math.floor(preference(seed, 0) * 4);
  const descendAfter = 12 + Math.floor(preference(seed, 1) * 6);
  const moveReady = (state.pieceAge - think) % 2 === 0;
  if (state.pieceAge < think || (!moveReady && state.pieceAge < descendAfter)) return null;
  const queue: { state: TetrisState; first: Action | null }[] = [
    { state, first: null },
  ];
  const visited = new Set<number>([pose(state.piece) * 8 + state.fall]);
  const placements = new Set<number>();
  const landings = new Map<number, number>();
  let best = -Infinity;
  let action: Action | null = "primary";
  const consider = (next: TetrisState, first: Action | null) => {
    // Equal final boards keep one preference even when gravity changes the route.
    let landing = 0;
    for (const row of next.board)
      for (const cell of row) landing = Math.imul(landing ^ cell, 16777619);
    const score =
      value(next, next.lines - state.lines) + preference(seed, landing) * 0.12;
    // Breadth-first order retains the shortest route to an equal final board.
    if (score > best) {
      best = score;
      action = first;
    }
  };
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    const { piece } = node.state;
    const key = pose(piece);
    let landing = landings.get(key);
    if (landing === undefined) {
      landing = dropY(state.board, piece);
      landings.set(key, landing);
    }
    const target = (piece.x + 4) * 128 + piece.rotation * 24 + landing + 4;
    if (!placements.has(target)) {
      placements.add(target);
      consider(update(node.state, "primary"), node.first ?? "primary");
    }
    // Equal-length routes turn early, while there is room above the stack,
    // instead of sliding to a column and only then changing orientation.
    for (const move of ["up", "left", "right", "down"] as const) {
      const moved = update(node.state, move);
      const next =
        moved.over || moved.pieces !== state.pieces
          ? moved
          : update(moved, null);
      const first = node.first ?? move;
      if (next.over || next.pieces !== state.pieces) {
        consider(next, first);
      } else {
        const key = pose(next.piece) * 8 + next.fall;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ state: next, first });
        }
      }
    }
  }
  // A hard drop is only a search shortcut for evaluating a landing. The AI
  // actually descends one soft-drop step per tick once it has lined up.
  if (action === "primary") return state.pieceAge < descendAfter ? null : "down";
  return moveReady ? action : null;
}
