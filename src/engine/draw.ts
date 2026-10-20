export const palette = {
  background: "#141916",
  grid: "#202921",
  accent: "#c6ef83",
  body: "#8eac65",
  text: "#e5eadf",
  muted: "#6c806d",
  food: "#ecb18b",
  ghost: "#344330",
};

export type DrawPalette = typeof palette;
export let lightPalette = false;

/** Presentation state only: changing a theme never changes a game state. */
export function setPalette(next: DrawPalette, light: boolean) {
  Object.assign(palette, next);
  lightPalette = light;
}

export function clear(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
}

export function grid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  cell: number,
) {
  ctx.fillStyle = palette.grid;
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col <= cols; col++)
      ctx.fillRect(x + col * cell, y + row * cell, 1, 1);
}
