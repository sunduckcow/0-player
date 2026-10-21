import { random } from "@/engine/sdk";
import type { Action, Mode } from "@/engine/sdk";
import board from "@/games/tetris/board";
import type { Tetromino, TetrisState } from "@/games/tetris/types";
const {
  columns: COLS,
  rows: ROWS,
  kinds,
  cells,
  collides,
  rotate,
  dropY,
  spawn,
} = board;
function shuffledBag(seed: number): { bag: Tetromino[]; rng: number } {
  const bag: Tetromino[] = [...kinds];
  let rng = seed;
  for (let index = bag.length - 1; index > 0; index--) {
    const [value, next] = random(rng);
    rng = next;
    const other = Math.floor(value * (index + 1));
    [bag[index], bag[other]] = [bag[other]!, bag[index]!];
  }
  return { bag, rng };
}
function initializeTetris(state: TetrisState, seed: number): TetrisState {
  const { bag, rng } = shuffledBag(seed);
  return {
    ...state,
    board: Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0)),
    piece: spawn(bag[0]!),
    bag: bag.slice(1),
    rng,
  };
}
function lock(state: TetrisState): TetrisState {
  const occupied = cells(state.piece);
  if (occupied.some(([, y]) => y < 0)) return { ...state, over: true };
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of occupied)
    board[y]![x] = kinds.indexOf(state.piece.kind) + 1;
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  const lineClear = cleared
    ? board.flatMap((cells, y) => (cells.every(Boolean) ? [{ y, cells }] : []))
    : undefined;
  const clearedBoard = [
    ...Array.from({ length: cleared }, () => Array<number>(COLS).fill(0)),
    ...remaining,
  ];
  const lines = state.lines + cleared;
  let bag = state.bag.slice(1);
  let rng = state.rng;
  const piece = spawn(state.bag[0]!);
  if (!bag.length) ({ bag, rng } = shuffledBag(rng));
  return {
    ...state,
    board: clearedBoard,
    lineClear,
    piece,
    bag,
    rng,
    lines,
    score: state.score + [0, 100, 300, 500, 800][cleared]! * state.level,
    level: 1 + Math.floor(lines / 10),
    pieces: state.pieces + 1,
    fall: 0,
    pieceAge: 0,
    over: collides(clearedBoard, piece),
  };
}
function update(
  state: TetrisState,
  action: Action | null,
  mode: Mode = "auto",
): TetrisState {
  if (state.over) return state;
  let next = { ...state, pieceAge: state.pieceAge + 1 };
  if (action === "primary") {
    const y = dropY(state.board, state.piece);
    return lock({
      ...next,
      piece: { ...state.piece, y },
      score: state.score + (y - state.piece.y) * 2,
    });
  }
  if (action === "up" || action === "secondary")
    next.piece = rotate(state.board, state.piece);
  if (action === "left" || action === "right") {
    const candidate = {
      ...state.piece,
      x: state.piece.x + (action === "left" ? -1 : 1),
    };
    if (!collides(state.board, candidate)) next.piece = candidate;
  }
  if (action === "down") {
    const candidate = { ...next.piece, y: next.piece.y + 1 };
    if (collides(state.board, candidate)) return lock(next);
    next = { ...next, piece: candidate, score: next.score + 1 };
  }
  next.fall++;
  const gravity =
    mode === "human"
      ? Math.max(4, 12 - state.level)
      : Math.max(1, 7 - state.level);
  if (next.fall >= gravity) {
    next.fall = 0;
    const candidate = { ...next.piece, y: next.piece.y + 1 };
    if (collides(state.board, candidate)) return lock(next);
    next.piece = candidate;
  }
  return next;
}
export default { initialize: initializeTetris, update, shuffle: shuffledBag };
