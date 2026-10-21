import type { StateCodec } from "@/engine/sdk";
import type { Cell, SnakeState, SnakeOptions } from "@/games/snake/types";
import board from "@/games/snake/board";
import settings from "@/games/snake/settings";

function hasValidDimensions(state: SnakeState): boolean {
  const normalized = settings.normalize(state);
  return state.columns === normalized.columns && state.rows === normalized.rows;
}

function hasValidCountersAndFlags(state: SnakeState): boolean {
  return (
    board.directions.includes(state.direction) &&
    Number.isInteger(state.rng) &&
    state.rng >= 0 &&
    state.rng <= 0xffffffff &&
    Number.isInteger(state.score) &&
    state.score >= 0 &&
    typeof state.over === "boolean" &&
    typeof state.won === "boolean"
  );
}

function isBoardCell(value: unknown, state: SnakeState): value is Cell {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as Cell;
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    board.inBounds({ x, y }, state.columns, state.rows)
  );
}

/** A valid body is a continuous chain of distinct cells inside the board. */
function validatedBodyCells(state: SnakeState): Set<number> | null {
  const area = state.columns * state.rows;
  if (
    !Array.isArray(state.body) ||
    state.body.length < 1 ||
    state.body.length > area
  )
    return null;
  const occupied = new Set<number>();
  for (const [index, cell] of state.body.entries()) {
    if (!isBoardCell(cell, state)) return null;
    const id = board.cellId(cell, state.columns);
    if (occupied.has(id)) return null;
    occupied.add(id);
    const previous = state.body[index - 1];
    if (
      previous &&
      Math.abs(previous.x - cell.x) + Math.abs(previous.y - cell.y) !== 1
    )
      return null;
  }
  return occupied;
}

function hasValidFoodOrVictory(
  state: SnakeState,
  occupied: Set<number>,
): boolean {
  if (state.won) {
    return (
      state.over &&
      state.food === null &&
      state.body.length === state.columns * state.rows
    );
  }
  return (
    isBoardCell(state.food, state) &&
    !occupied.has(board.cellId(state.food, state.columns))
  );
}

/** Validate persisted game data before it reaches pathfinding or rendering. */
function isSnakeState(value: unknown): value is SnakeState {
  if (!value || typeof value !== "object") return false;
  const state = value as SnakeState;
  if (!hasValidDimensions(state) || !hasValidCountersAndFlags(state))
    return false;
  const occupied = validatedBodyCells(state);
  return occupied !== null && hasValidFoodOrVictory(state, occupied);
}

export default {
  version: 1,
  decode: (raw: unknown, version: number) =>
    version === 1 && isSnakeState(raw) ? raw : null,
  compatible: (state: SnakeState, options: Readonly<SnakeOptions>) =>
    state.columns === options.columns && state.rows === options.rows,
} satisfies StateCodec<SnakeState, SnakeOptions>;
