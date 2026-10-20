import { clear, grid, palette, lightPalette } from "@/engine/draw";
import { recoveryIntensity } from "@/engine/feedback";
import type { RenderFrame } from "@/engine/types";
import { clearFrame, type ClearEffect } from "./clear-effect";
import { defaultTetrisOptions, type TetrisOptions } from "./settings";
import {
  cells,
  dropY,
  kinds,
  type Piece,
  type TetrisState,
} from "@/games/tetris/game";

const CELL = 22;
export const viewport = { width: 360, height: 480 };
const X = 28;
const Y = 20;
const effects = new WeakMap<CanvasRenderingContext2D, ClearEffect>();
const reducedMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
const colors = [
  "#6ee7e7", // I — cyan
  "#86a6ff", // J — blue
  "#ffb579", // L — orange
  "#f4df7a", // O — yellow
  "#9ce48a", // S — green
  "#d7a0f7", // T — violet
  "#f38fa5", // Z — pink
];
const lightColors = ["#087f89", "#4365c3", "#ae5b18", "#92720d", "#337e30", "#8e45b8", "#b33c60"];
const pieceColor = (index: number) => (lightPalette ? lightColors : colors)[index]!;

function block(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = "#ffffff30";
  ctx.fillRect(x + 2, y + 2, size - 4, 1);
  ctx.fillStyle = palette.background;
  ctx.fillRect(x + 4, y + size - 5, size - 8, 1);
}

function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, ghost = false, color?: string) {
  for (const [x, y] of cells(piece)) {
    if (y < 0) continue;
    if (ghost) {
      ctx.strokeStyle = pieceColor(kinds.indexOf(piece.kind)) + (lightPalette ? "99" : "66");
      ctx.strokeRect(
        X + x * CELL + 3.5,
        Y + y * CELL + 3.5,
        CELL - 7,
        CELL - 7,
      );
    } else
      block(
        ctx,
        X + x * CELL,
        Y + y * CELL,
        CELL,
        color ?? pieceColor(kinds.indexOf(piece.kind)),
      );
  }
}

export function render(ctx: CanvasRenderingContext2D, state: TetrisState, frame: RenderFrame, options: TetrisOptions = defaultTetrisOptions) {
  let effect = effects.get(ctx);
  if (!effect) { effect = {}; effects.set(ctx, effect); }
  if (frame.recovery) {
    effect.pieces = state.pieces;
    effect.lines = state.lines;
    effect.flash = undefined;
  }
  const flash = frame.recovery ? null : clearFrame(effect, state, frame.time, reducedMotion?.matches);
  const board = flash?.board ?? state.board;
  const recoveryColor = lightPalette ? "#9b6517" : "#efc584";
  clear(ctx, viewport.width, viewport.height);
  ctx.fillStyle = palette.grid;
  ctx.fillRect(X - 1, Y - 1, CELL * 10 + 2, CELL * 20 + 2);
  ctx.fillStyle = palette.background;
  ctx.fillRect(X, Y, CELL * 10, CELL * 20);
  grid(ctx, X, Y, 10, 20, CELL);
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 10; x++) {
      const value = board[y]![x]!;
      if (value)
        block(ctx, X + x * CELL, Y + y * CELL, CELL, frame.recovery ? recoveryColor : pieceColor(value - 1));
    }
  }
  ctx.restore();
  if (flash) {
    ctx.save();
    ctx.fillStyle = lightPalette ? palette.accent : "#ebffd2";
    ctx.globalAlpha = flash.opacity;
    for (const y of flash.rows) ctx.fillRect(X, Y + y * CELL + 1, CELL * 10, CELL - 2);
    ctx.restore();
  }
  if (!state.over) {
    if (!frame.recovery && options.showGhost) drawPiece(
      ctx,
      { ...state.piece, y: dropY(state.board, state.piece) },
      true,
    );
    ctx.save();
    ctx.globalAlpha = recoveryIntensity(frame);
    drawPiece(ctx, state.piece, false, frame.recovery ? recoveryColor : undefined);
    ctx.restore();
  }
  if (!options.showNext) return;
  const next = state.bag[0]!;
  const preview = cells({ kind: next, x: 0, y: 0, rotation: 0 });
  const minX = Math.min(...preview.map(([x]) => x));
  const minY = Math.min(...preview.map(([, y]) => y));
  const maxX = Math.max(...preview.map(([x]) => x));
  const previewX = 304 - (maxX - minX + 1) * 8;
  for (const [x, y] of preview) {
    block(
      ctx,
      previewX + (x - minX) * 16,
      58 + (y - minY) * 16,
      16,
      pieceColor(kinds.indexOf(next)),
    );
  }
}
