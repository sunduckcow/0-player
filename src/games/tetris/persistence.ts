import type { StateCodec } from "@/engine/sdk";
import type {
  Piece,
  Tetromino,
  TetrisState,
  TetrisOptions,
} from "@/games/tetris/types";
import geometry from "@/games/tetris/board";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIntegerInRange = (
  value: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= minimum &&
  value <= maximum;

const isTetromino = (value: unknown): value is Tetromino =>
  typeof value === "string" && geometry.kinds.includes(value as Tetromino);

function isBoard(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length === geometry.rows &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === geometry.columns &&
        row.every((cell) => isIntegerInRange(cell, 0, 7)),
    )
  );
}

function isPiece(value: unknown): value is Piece {
  return (
    isRecord(value) &&
    isTetromino(value.kind) &&
    isIntegerInRange(value.x, -4, 10) &&
    isIntegerInRange(value.y, -4, 20) &&
    isIntegerInRange(value.rotation, 0, 3)
  );
}

function isBag(value: unknown): value is Tetromino[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 7 &&
    value.every(isTetromino)
  );
}

function hasValidCounters(state: Record<string, unknown>): boolean {
  return (
    ["score", "fall", "pieceAge", "lines", "pieces"].every((key) =>
      isIntegerInRange(state[key]),
    ) &&
    isIntegerInRange(state.rng, 0, 0xffffffff) &&
    isIntegerInRange(state.level, 1)
  );
}

function decodeTetris(raw: unknown, version: number): TetrisState | null {
  if (
    version !== 1 ||
    !isRecord(raw) ||
    !hasValidCounters(raw) ||
    typeof raw.over !== "boolean"
  )
    return null;
  const { board, piece, bag } = raw;
  if (!isBoard(board) || !isPiece(piece) || !isBag(bag)) return null;
  if (!raw.over && geometry.collides(board, piece)) return null;
  return raw as unknown as TetrisState;
}

export default { version: 1, decode: decodeTetris } satisfies StateCodec<
  TetrisState,
  TetrisOptions
>;
