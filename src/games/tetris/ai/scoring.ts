import type { TetrisState } from "@/games/tetris/types";
import geometry from "@/games/tetris/board";

function boardValue(state: TetrisState, cleared: number): number {
  if (state.over) return -1e9;
  const heights = Array<number>(geometry.columns).fill(0);
  let holes = 0;
  for (let x = 0; x < geometry.columns; x++) {
    for (let y = 0; y < geometry.rows; y++) {
      if (state.board[y]![x]) {
        if (!heights[x]) heights[x] = geometry.rows - y;
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
// A fixed per-piece hash gives near-equal landings and timing stable preferences.
function preference(seed: number, salt: number): number {
  let mixed = Math.imul(seed ^ salt, 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}
function landingValue(
  state: TetrisState,
  previousLines: number,
  seed: number,
): number {
  // Equal final boards keep one preference even when gravity changes the route.
  let boardHash = 0;
  for (const row of state.board)
    for (const cell of row) boardHash = Math.imul(boardHash ^ cell, 16777619);
  return (
    boardValue(state, state.lines - previousLines) +
    preference(seed, boardHash) * 0.12
  );
}
export default { preference, landingValue };
