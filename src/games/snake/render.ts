import { clear, grid, palette } from "@/engine/draw";
import { recoveryIntensity } from "@/engine/feedback";
import type { RenderFrame } from "@/engine/types";
import { vectors, type SnakeState } from "./game";

const cell = 20;

export function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  frame: RenderFrame,
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
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery ? "#ef8585" : palette.body;
  for (let i = state.body.length - 1; i >= 0; i--) {
    const segment = state.body[i]!;
    const next = state.body[i - 1];
    const x = segment.x * cell;
    const y = segment.y * cell;
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    if (next) {
      const dx = next.x - segment.x;
      const dy = next.y - segment.y;
      ctx.fillRect(
        x + 5 + Math.min(dx, 0) * cell,
        y + 5 + Math.min(dy, 0) * cell,
        10 + Math.abs(dx) * cell,
        10 + Math.abs(dy) * cell,
      );
    }
  }
  ctx.restore();
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
  const head = state.body[0]!;
  const x = head.x * cell;
  const y = head.y * cell;
  ctx.save();
  ctx.globalAlpha = recoveryIntensity(frame);
  ctx.fillStyle = frame.recovery ? "#ffb5aa" : palette.accent;
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
