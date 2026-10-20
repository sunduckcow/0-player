import { clear, grid, palette, lightPalette } from "@/engine/draw";
import { recoveryIntensity } from "@/engine/feedback";
import type { RenderFrame } from "@/engine/types";
import { vectors, type SnakeState } from "./game";
import type { SnakeSkin } from "./settings";

const cell = 20;
const taperedInsets = [1, 2, 4, 6, 7] as const;

/** Five pixel tiles stretch from a full neck to a multi-cell tail. */
export function snakeTileWidth(index: number, length: number, skin: SnakeSkin): number {
  const tier = Math.min(taperedInsets.length - 1, Math.floor(Math.max(0, index - 1) * taperedInsets.length / Math.max(1, length - 1)));
  return cell - 2 * (skin === "squares" ? 2 : taperedInsets[tier]!);
}

export function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  frame: RenderFrame,
  skin: SnakeSkin = "squares",
): void {
  const width = state.columns * cell;
  const height = state.rows * cell;
  clear(ctx, width, height);
  grid(ctx, 0, 0, state.columns, state.rows, cell);
  // Quarter-board marks make distance readable without a heavy checkerboard.
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let line = 6; line < state.columns; line += 6) {
    ctx.beginPath();
    ctx.moveTo(line * cell + 0.5, 0);
    ctx.lineTo(line * cell + 0.5, height);
    ctx.stroke();
  }
  for (let line = 6; line < state.rows; line += 6) {
    ctx.beginPath();
    ctx.moveTo(0, line * cell + 0.5);
    ctx.lineTo(width, line * cell + 0.5);
    ctx.stroke();
  }
  if (state.food) {
    const x = (state.food.x + 0.5) * cell;
    const y = (state.food.y + 0.5) * cell;
    ctx.fillStyle = palette.food;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.background;
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  renderSnakeBody(ctx, state, frame, skin);
}

/** Shared pixel geometry for the board and lightweight skin previews. */
export function renderSnakeBody(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  frame: RenderFrame,
  skin: SnakeSkin,
): void {
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery ? lightPalette ? "#ac2b2b" : "#ef8585" : palette.body;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  for (let i = state.body.length - 1; i >= 0; i--) {
    const segment = state.body[i]!;
    const next = state.body[i - 1];
    const x = segment.x * cell;
    const y = segment.y * cell;
    const size = snakeTileWidth(i, state.body.length, skin);
    const inset = (cell - size) / 2;
    if (skin === "squares") ctx.fillRect(x + inset, y + inset, size, size);
    else {
      const behind = state.body[i + 1];
      const forward = next ? { x: next.x - segment.x, y: next.y - segment.y } : vectors[state.direction];
      const back = behind ? { x: behind.x - segment.x, y: behind.y - segment.y } : { x: -forward.x, y: -forward.y };
      // The path is always 18px long; only its transverse width changes.
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x + 10 + back.x * 9, y + 10 + back.y * 9);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 10 + forward.x * 9, y + 10 + forward.y * 9);
      ctx.stroke();
    }
    if (next) {
      const dx = next.x - segment.x;
      const dy = next.y - segment.y;
      const bridge = Math.max(2, Math.min(size, snakeTileWidth(i - 1, state.body.length, skin)) - (skin === "squares" ? 6 : 2));
      if (skin === "tapered") {
        // A two-pixel seam with one-pixel notches, never a long thin link.
        ctx.fillRect(x + 10 + dx * 10 - (dx ? 1 : bridge / 2), y + 10 + dy * 10 - (dy ? 1 : bridge / 2), dx ? 2 : bridge, dy ? 2 : bridge);
        continue;
      }
      const offset = (cell - bridge) / 2;
      ctx.fillRect(
        x + offset + Math.min(dx, 0) * cell,
        y + offset + Math.min(dy, 0) * cell,
        bridge + Math.abs(dx) * cell,
        bridge + Math.abs(dy) * cell,
      );
    }
  }
  ctx.restore();
  const head = state.body[0]!;
  const x = head.x * cell;
  const y = head.y * cell;
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery ? lightPalette ? "#8e201d" : "#ffb5aa" : palette.accent;
  ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
  ctx.fillStyle = palette.background;
  const forward = vectors[state.direction];
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
