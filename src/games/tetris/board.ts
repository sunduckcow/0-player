import type { Tetromino, Piece } from "@/games/tetris/types";
const COLS = 10;
const ROWS = 20;
const kinds = ["I", "J", "L", "O", "S", "T", "Z"] as const;
const shapes: Record<Tetromino, string[]> = {
  I: ["....", "####", "....", "...."],
  J: ["#..", "###", "..."],
  L: ["..#", "###", "..."],
  O: ["##", "##"],
  S: [".##", "##.", "..."],
  T: [".#.", "###", "..."],
  Z: ["##.", ".##", "..."],
};
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
function cells(piece: Piece): [number, number][] {
  return offsets[piece.kind][piece.rotation]!.map(([x, y]) => [
    piece.x + x,
    piece.y + y,
  ]);
}
function collides(board: number[][], piece: Piece): boolean {
  for (const [dx, dy] of offsets[piece.kind][piece.rotation]!) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y]![x] !== 0))
      return true;
  }
  return false;
}
function rotate(board: number[][], piece: Piece): Piece {
  if (piece.kind === "O") return piece;
  const rotation = (piece.rotation + 1) % 4;
  // Small horizontal kicks keep rotations usable beside walls and stacks.
  for (const offset of [0, -1, 1, -2, 2]) {
    const candidate = { ...piece, x: piece.x + offset, rotation };
    if (!collides(board, candidate)) return candidate;
  }
  return piece;
}
function dropY(board: number[][], piece: Piece): number {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 })) y++;
  return y;
}
function spawn(kind: Tetromino): Piece {
  return { kind, rotation: 0, x: kind === "O" ? 4 : 3, y: -1 };
}
export default {
  columns: COLS,
  rows: ROWS,
  kinds,
  cells,
  collides,
  rotate,
  dropY,
  spawn,
};
