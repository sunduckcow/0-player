import { clear, grid } from "@/engine/sdk";
import type { RenderFrame } from "@/engine/sdk";
import type { SnakeState, SnakeSkin } from "@/games/snake/types";
import bodyRendering from "@/games/snake/body-render";
const { cellSize } = bodyRendering;

function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  frame: RenderFrame,
  skin: SnakeSkin = "squares",
): void {
  const width = state.columns * cellSize;
  const height = state.rows * cellSize;
  const palette = frame.visuals;
  clear(ctx, width, height, palette);
  grid(ctx, 0, 0, state.columns, state.rows, cellSize, palette);
  // Quarter-board marks make distance readable without a heavy checkerboard.
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let line = 6; line < state.columns; line += 6) {
    ctx.beginPath();
    ctx.moveTo(line * cellSize + 0.5, 0);
    ctx.lineTo(line * cellSize + 0.5, height);
    ctx.stroke();
  }
  for (let line = 6; line < state.rows; line += 6) {
    ctx.beginPath();
    ctx.moveTo(0, line * cellSize + 0.5);
    ctx.lineTo(width, line * cellSize + 0.5);
    ctx.stroke();
  }
  if (state.food) {
    const x = (state.food.x + 0.5) * cellSize;
    const y = (state.food.y + 0.5) * cellSize;
    ctx.fillStyle = palette.secondary;
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
  bodyRendering.draw(ctx, state.body, state.direction, frame, skin);
}
export default {
  draw: renderSnake,
  cellSize,
};
