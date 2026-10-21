import { recoveryIntensity } from "@/engine/sdk";
import type { RenderFrame } from "@/engine/sdk";
import board from "@/games/snake/board";
import type { SnakeSkin, Cell, Direction } from "@/games/snake/types";
const { vectors } = board;
const cellSize = 20;
const taperedInsets = [1, 2, 4, 6, 7] as const;
/** Five pixel tiles stretch from a full neck to a multi-cell tail. */

function snakeTileWidth(
  index: number,
  length: number,
  skin: SnakeSkin,
): number {
  const tier = Math.min(
    taperedInsets.length - 1,
    Math.floor(
      (Math.max(0, index - 1) * taperedInsets.length) / Math.max(1, length - 1),
    ),
  );
  return cellSize - 2 * (skin === "squares" ? 2 : taperedInsets[tier]!);
}
/** Shared pixel geometry for the board and lightweight skin previews. */

function renderSnakeBody(
  ctx: CanvasRenderingContext2D,
  body: readonly Cell[],
  direction: Direction,
  frame: RenderFrame,
  skin: SnakeSkin,
): void {
  const palette = frame.visuals;
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery
    ? palette.effects.recovery
    : palette.accentMuted;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  for (let segmentIndex = body.length - 1; segmentIndex >= 0; segmentIndex--) {
    const segment = body[segmentIndex]!;
    const ahead = body[segmentIndex - 1];
    const x = segment.x * cellSize;
    const y = segment.y * cellSize;
    const size = snakeTileWidth(segmentIndex, body.length, skin);
    const inset = (cellSize - size) / 2;
    if (skin === "squares") ctx.fillRect(x + inset, y + inset, size, size);
    else {
      const behind = body[segmentIndex + 1];
      const forward = ahead
        ? { x: ahead.x - segment.x, y: ahead.y - segment.y }
        : vectors[direction];
      const back = behind
        ? { x: behind.x - segment.x, y: behind.y - segment.y }
        : { x: -forward.x, y: -forward.y };
      // The path is always 18px long; only its transverse width changes.
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x + 10 + back.x * 9, y + 10 + back.y * 9);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 10 + forward.x * 9, y + 10 + forward.y * 9);
      ctx.stroke();
    }
    if (ahead) {
      const dx = ahead.x - segment.x;
      const dy = ahead.y - segment.y;
      const bridge = Math.max(
        2,
        Math.min(size, snakeTileWidth(segmentIndex - 1, body.length, skin)) -
          (skin === "squares" ? 6 : 2),
      );
      if (skin === "tapered") {
        // A two-pixel seam with one-pixel notches, never a long thin link.
        ctx.fillRect(
          x + 10 + dx * 10 - (dx ? 1 : bridge / 2),
          y + 10 + dy * 10 - (dy ? 1 : bridge / 2),
          dx ? 2 : bridge,
          dy ? 2 : bridge,
        );
        continue;
      }
      const offset = (cellSize - bridge) / 2;
      ctx.fillRect(
        x + offset + Math.min(dx, 0) * cellSize,
        y + offset + Math.min(dy, 0) * cellSize,
        bridge + Math.abs(dx) * cellSize,
        bridge + Math.abs(dy) * cellSize,
      );
    }
  }
  ctx.restore();
  const head = body[0]!;
  const x = head.x * cellSize;
  const y = head.y * cellSize;
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery
    ? palette.effects.recoveryStrong
    : palette.accent;
  ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  ctx.fillStyle = palette.background;
  const forward = vectors[direction];
  for (const side of [-1, 1]) {
    ctx.fillRect(
      x + 9 + forward.x * 4 + forward.y * side * 4,
      y + 9 + forward.y * 4 + forward.x * side * 4,
      3,
      3,
    );
  }
  ctx.restore();
}
export default {
  draw: renderSnakeBody,
  tileWidth: snakeTileWidth,
  cellSize,
};
