import type { VisualTheme } from "@/engine/contracts/visuals";
/** Drawing helpers receive explicit colors: no mutable theme singleton. */
export function clear(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  visuals: VisualTheme,
) {
  ctx.fillStyle = visuals.background;
  ctx.fillRect(0, 0, width, height);
}
export function grid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  cell: number,
  visuals: VisualTheme,
) {
  ctx.fillStyle = visuals.grid;
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col <= cols; col++)
      ctx.fillRect(x + col * cell, y + row * cell, 1, 1);
}
