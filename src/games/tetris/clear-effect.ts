import { feedbackFlashMs, flashIntensity } from "@/engine/sdk";
import type { ClearEffect, TetrisState } from "@/games/tetris/types";
const LINE_CLEAR_MS = feedbackFlashMs;
function validRows(
  rows: TetrisState["lineClear"],
): rows is NonNullable<TetrisState["lineClear"]> {
  return (
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.length <= 4 &&
    rows.every(
      (row, i) =>
        row &&
        Number.isInteger(row.y) &&
        row.y >= 0 &&
        row.y < 20 &&
        (i === 0 || row.y > rows[i - 1]!.y) &&
        Array.isArray(row.cells) &&
        row.cells.length === 10 &&
        row.cells.every(
          (cell) => Number.isInteger(cell) && cell >= 1 && cell <= 7,
        ),
    )
  );
}
/** Presentation time is independent of simulation speed, input and AI planning. */

function clearFrame(
  effect: ClearEffect,
  state: TetrisState,
  time: number,
  reducedMotion = false,
) {
  const { pieces, lines } = effect;
  effect.pieces = state.pieces;
  effect.lines = state.lines;
  if (reducedMotion) {
    effect.flash = undefined;
    return null;
  }
  if (
    effect.flash &&
    (state.pieces !== effect.flash.pieces || time < effect.flash.started)
  )
    effect.flash = undefined;
  const rows = state.lineClear;
  if (
    pieces !== undefined &&
    state.pieces === pieces + 1 &&
    validRows(rows) &&
    state.lines - (lines ?? state.lines) === rows.length
  ) {
    // Reinsert just the removed rows to show the brief pre-collapse frame.
    const board = state.board.slice(rows.length);
    for (const row of rows) board.splice(row.y, 0, row.cells);
    effect.flash = {
      pieces: state.pieces,
      started: time,
      board,
      rows: rows.map((row) => row.y),
    };
  }
  const flash = effect.flash;
  if (!flash) return null;
  const progress = (time - flash.started) / LINE_CLEAR_MS;
  if (progress >= 1) {
    effect.flash = undefined;
    return null;
  }
  return {
    board: flash.board,
    rows: flash.rows,
    opacity: flashIntensity(progress, reducedMotion),
  };
}
export default { duration: LINE_CLEAR_MS, frame: clearFrame };
