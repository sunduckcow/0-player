import type { Action, GameState } from "@/engine/types";
import { random } from "@/engine/random";
import { normalizeSnakeOptions, type SnakeOptions } from "./settings";

export const SIZE = 24;
export interface Cell {
  x: number;
  y: number;
}
export type Direction = "up" | "right" | "down" | "left";
export interface SnakeState extends GameState {
  columns: number;
  rows: number;
  body: Cell[];
  direction: Direction;
  food: Cell | null;
  rng: number;
  won: boolean;
}
export const directions: Direction[] = ["up", "right", "down", "left"];
export const vectors: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
export const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const cellId = (cell: Cell, columns = SIZE) => cell.y * columns + cell.x;
export const move = (cell: Cell, direction: Direction): Cell => ({
  x: cell.x + vectors[direction].x,
  y: cell.y + vectors[direction].y,
});
export const inBounds = (cell: Cell, columns = SIZE, rows = SIZE) =>
  cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows;

function placeFood(
  body: Cell[],
  seed: number,
  columns: number,
  rows: number,
): [Cell | null, number] {
  const count = columns * rows;
  if (body.length === count) return [null, seed];
  const [value, rng] = random(seed);
  let free = Math.floor(value * (count - body.length));
  const occupied = new Set(body.map((cell) => cellId(cell, columns)));
  for (let id = 0; id < count; id++) {
    if (!occupied.has(id) && free-- === 0)
      return [{ x: id % columns, y: Math.floor(id / columns) }, rng];
  }
  return [null, rng];
}

export function createSnake(
  seed: number,
  options: Partial<SnakeOptions> = {},
): SnakeState {
  const { columns, rows } = normalizeSnakeOptions(options);
  const centerX = columns / 2;
  const body = [0, 1, 2, 3].map((offset) => ({
    x: centerX - offset,
    y: rows / 2,
  }));
  const [food, rng] = placeFood(body, seed, columns, rows);
  return {
    columns,
    rows,
    body,
    direction: "right",
    food,
    rng,
    score: 0,
    over: false,
    won: false,
  };
}

export function updateSnake(
  state: SnakeState,
  action: Action | null,
): SnakeState {
  if (state.over) return { ...state };
  let direction = state.direction;
  if (action && directions.includes(action as Direction)) {
    const requested = action as Direction;
    const previous = vectors[direction];
    const next = vectors[requested];
    if (previous.x + next.x !== 0 || previous.y + next.y !== 0)
      direction = requested;
  }
  const head = move(state.body[0]!, direction);
  const grows = state.food !== null && same(head, state.food);
  const occupied = grows ? state.body : state.body.slice(0, -1);
  if (
    !inBounds(head, state.columns, state.rows) ||
    occupied.some((cell) => same(cell, head))
  )
    return { ...state, direction, over: true };
  const body = [head, ...state.body.slice(0, grows ? undefined : -1)];
  const [food, rng] = grows
    ? placeFood(body, state.rng, state.columns, state.rows)
    : [state.food, state.rng];
  const won = body.length === state.columns * state.rows;
  return {
    ...state,
    body,
    direction,
    food,
    rng,
    score: state.score + Number(grows),
    won,
    over: won,
  };
}

/** Validate persisted game data before it reaches pathfinding or rendering. */
export function isSnakeState(value: unknown): value is SnakeState {
  if (!value || typeof value !== "object") return false;
  const state = value as SnakeState;
  const options = normalizeSnakeOptions(state);
  if (
    state.columns !== options.columns ||
    state.rows !== options.rows ||
    !Array.isArray(state.body) ||
    state.body.length < 1 ||
    state.body.length > state.columns * state.rows ||
    !directions.includes(state.direction) ||
    !Number.isInteger(state.rng) ||
    state.rng < 0 ||
    state.rng > 0xffffffff ||
    !Number.isInteger(state.score) ||
    state.score < 0 ||
    typeof state.over !== "boolean" ||
    typeof state.won !== "boolean"
  ) return false;
  const validCell = (cell: unknown): cell is Cell => {
    if (!cell || typeof cell !== "object") return false;
    const { x, y } = cell as Cell;
    return Number.isInteger(x) &&
      Number.isInteger(y) &&
      inBounds({ x, y }, state.columns, state.rows);
  };
  const occupied = new Set<number>();
  for (let i = 0; i < state.body.length; i++) {
    const cell = state.body[i];
    if (!validCell(cell)) return false;
    const id = cellId(cell, state.columns);
    if (occupied.has(id)) return false;
    occupied.add(id);
    const previous = state.body[i - 1];
    if (
      previous &&
      Math.abs(previous.x - cell.x) + Math.abs(previous.y - cell.y) !== 1
    )
      return false;
  }
  if (state.won)
    return state.over && state.food === null &&
      state.body.length === state.columns * state.rows;
  return validCell(state.food) && !occupied.has(cellId(state.food, state.columns));
}
