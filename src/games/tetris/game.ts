import type { Action, GameState, Mode } from "@/engine/types";
import { random } from "@/engine/random";

export const COLS = 10;
export const ROWS = 20;
export const kinds = ["I", "J", "L", "O", "S", "T", "Z"] as const;
export type Tetromino = (typeof kinds)[number];
export interface Piece {
  kind: Tetromino;
  x: number;
  y: number;
  rotation: number;
}
export interface TetrisState extends GameState {
  board: number[][];
  piece: Piece;
  bag: Tetromino[];
  rng: number;
  fall: number;
  pieceAge: number;
  lines: number;
  level: number;
  pieces: number;
  /** Last lock's cleared rows, for visual feedback without delaying the rules. */
  lineClear?: { y: number; cells: number[] }[];
}

const shapes: Record<Tetromino, string[]> = {
  I: ["....", "####", "....", "...."],
  J: ["#..", "###", "..."],
  L: ["..#", "###", "..."],
  O: ["##", "##"],
  S: [".##", "##.", "..."],
  T: [".#.", "###", "..."],
  Z: ["##.", ".##", "..."],
};

export function shuffledBag(seed: number): { bag: Tetromino[]; rng: number } {
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

const offsets = Object.fromEntries(
  kinds.map((kind) => {
    const shape = shapes[kind];
    const turns: [number, number][][] = [];
    for (let rotation = 0; rotation < 4; rotation++) {
      const points: [number, number][] = [];
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape.length; col++) {
          if (shape[row]![col] !== "#") continue;
          let x = col;
          let y = row;
          for (let turn = 0; turn < rotation; turn++)
            [x, y] = [shape.length - 1 - y, x];
          points.push([x, y]);
        }
      }
      turns.push(points);
    }
    return [kind, turns];
  }),
) as Record<Tetromino, [number, number][][]>;

export function cells(piece: Piece): [number, number][] {
  return offsets[piece.kind][piece.rotation]!.map(([x, y]) => [
    piece.x + x,
    piece.y + y,
  ]);
}

export function collides(board: number[][], piece: Piece): boolean {
  for (const [dx, dy] of offsets[piece.kind][piece.rotation]!) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y]![x] !== 0))
      return true;
  }
  return false;
}

export function rotate(board: number[][], piece: Piece): Piece {
  if (piece.kind === "O") return piece;
  const rotation = (piece.rotation + 1) % 4;
  // Small horizontal kicks keep rotations usable beside walls and stacks.
  for (const offset of [0, -1, 1, -2, 2]) {
    const candidate = { ...piece, x: piece.x + offset, rotation };
    if (!collides(board, candidate)) return candidate;
  }
  return piece;
}

export function dropY(board: number[][], piece: Piece): number {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 })) y++;
  return y;
}

function spawn(kind: Tetromino): Piece {
  return { kind, rotation: 0, x: kind === "O" ? 4 : 3, y: -1 };
}

export function create(seed: number): TetrisState {
  const { bag, rng } = shuffledBag(seed);
  return {
    board: Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0)),
    piece: spawn(bag[0]!),
    bag: bag.slice(1),
    rng,
    fall: 0,
    pieceAge: 0,
    lines: 0,
    level: 1,
    pieces: 0,
    score: 0,
    over: false,
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
  const lineClear = cleared ? board.flatMap((cells, y) => cells.every(Boolean) ? [{ y, cells }] : []) : undefined;
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

export function update(state: TetrisState, action: Action | null, mode: Mode = "auto"): TetrisState {
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
  const gravity = mode === "human"
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
