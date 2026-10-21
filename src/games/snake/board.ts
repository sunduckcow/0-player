import type { Cell, Direction } from "@/games/snake/types";
const SIZE = 24;
const directions: Direction[] = ["up", "right", "down", "left"];
const vectors: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const same = (first: Cell, second: Cell) =>
  first.x === second.x && first.y === second.y;
const cellId = (cell: Cell, columns = SIZE) => cell.y * columns + cell.x;
const move = (cell: Cell, direction: Direction): Cell => ({
  x: cell.x + vectors[direction].x,
  y: cell.y + vectors[direction].y,
});
const inBounds = (cell: Cell, columns = SIZE, rows = SIZE) =>
  cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows;
export default {
  size: SIZE,
  directions,
  vectors,
  same,
  cellId,
  move,
  inBounds,
};
