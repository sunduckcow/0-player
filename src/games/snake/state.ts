import board from "@/games/snake/board";
import type { SnakeState } from "@/games/snake/types";
const defaultSnakeState: SnakeState = {
  columns: board.size,
  rows: board.size,
  body: [],
  direction: "right",
  food: null,
  rng: 0,
  score: 0,
  over: false,
  won: false,
};
export default defaultSnakeState;
