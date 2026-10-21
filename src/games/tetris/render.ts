import { clear, grid, recoveryIntensity } from "@/engine/sdk";
import type { RenderFrame } from "@/engine/sdk";
import type {
  ClearEffect,
  TetrisState,
  TetrisOptions,
} from "@/games/tetris/types";
import lineClear from "@/games/tetris/clear-effect";
import settings from "@/games/tetris/settings";
import geometry from "@/games/tetris/board";
import pieceRendering from "@/games/tetris/piece-render";
const { dropY } = geometry;
const { cellSize, origin } = pieceRendering;
const viewport = { width: 360, height: 480 };
const effects = new WeakMap<CanvasRenderingContext2D, ClearEffect>();

function render(
  ctx: CanvasRenderingContext2D,
  state: TetrisState,
  frame: RenderFrame,
  options: TetrisOptions = settings.defaults,
) {
  const palette = frame.visuals;
  let effect = effects.get(ctx);
  if (!effect) {
    effect = {};
    effects.set(ctx, effect);
  }
  if (frame.recovery) {
    effect.pieces = state.pieces;
    effect.lines = state.lines;
    effect.flash = undefined;
  }
  const flash = frame.recovery
    ? null
    : lineClear.frame(effect, state, frame.time, frame.reducedMotion);
  const board = flash?.board ?? state.board;
  const recoveryColor = palette.effects.recovery;
  clear(ctx, viewport.width, viewport.height, palette);
  ctx.fillStyle = palette.grid;
  ctx.fillRect(
    origin.x - 1,
    origin.y - 1,
    cellSize * 10 + 2,
    cellSize * 20 + 2,
  );
  ctx.fillStyle = palette.background;
  ctx.fillRect(origin.x, origin.y, cellSize * 10, cellSize * 20);
  grid(ctx, origin.x, origin.y, 10, 20, cellSize, palette);
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 10; x++) {
      const value = board[y]![x]!;
      if (value)
        pieceRendering.drawBlock(
          ctx,
          origin.x + x * cellSize,
          origin.y + y * cellSize,
          cellSize,
          frame.recovery ? recoveryColor : palette.categorical[value - 1]!,
          palette,
        );
    }
  }
  ctx.restore();
  if (flash) {
    ctx.save();
    ctx.fillStyle = palette.effects.flash;
    ctx.globalAlpha = flash.opacity;
    for (const y of flash.rows)
      ctx.fillRect(
        origin.x,
        origin.y + y * cellSize + 1,
        cellSize * 10,
        cellSize - 2,
      );
    ctx.restore();
  }
  if (!state.over) {
    if (!frame.recovery && options.showGhost)
      pieceRendering.drawPiece(
        ctx,
        { ...state.piece, y: dropY(state.board, state.piece) },
        palette,
        true,
      );
    ctx.save();
    ctx.globalAlpha = recoveryIntensity(frame);
    pieceRendering.drawPiece(
      ctx,
      state.piece,
      palette,
      false,
      frame.recovery ? recoveryColor : undefined,
    );
    ctx.restore();
  }
  if (options.showNext) pieceRendering.drawNext(ctx, state.bag[0]!, palette);
}
export default { draw: render, viewport };
