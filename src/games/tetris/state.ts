import type { TetrisState } from "@/games/tetris/types";
const defaultTetrisState: TetrisState = {
  board: [],
  piece: { kind: "I", rotation: 0, x: 3, y: -1 },
  bag: [],
  rng: 0,
  fall: 0,
  pieceAge: 0,
  lines: 0,
  level: 1,
  pieces: 0,
  score: 0,
  over: false,
};
export default defaultTetrisState;
