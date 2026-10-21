import type { Action } from "@/engine/sdk";
import { random } from "@/engine/sdk";
import board from "@/games/snake/board";
import type {
  Cell,
  Direction,
  SnakeState,
  SnakeOptions,
} from "@/games/snake/types";
const { cellId, directions, vectors, same, move, inBounds } = board;
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
function initializeSnake(
  state: SnakeState,
  seed: number,
  options: Readonly<SnakeOptions>,
): SnakeState {
  const { columns, rows } = options;
  const centerX = columns / 2;
  const body = [0, 1, 2, 3].map((offset) => ({
    x: centerX - offset,
    y: rows / 2,
  }));
  const [food, rng] = placeFood(body, seed, columns, rows);
  return {
    ...state,
    columns,
    rows,
    body,
    direction: "right",
    food,
    rng,
  };
}
function updateSnake(state: SnakeState, action: Action | null): SnakeState {
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
export default { initialize: initializeSnake, update: updateSnake };
