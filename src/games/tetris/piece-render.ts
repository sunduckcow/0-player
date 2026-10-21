import type { VisualTheme } from "@/engine/sdk";
import type { Piece, Tetromino } from "@/games/tetris/types";
import geometry from "@/games/tetris/board";
const { cells, kinds } = geometry;
const cellSize = 22;
const origin = { x: 28, y: 20 };

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  palette: VisualTheme,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = palette.effects.highlight;
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * palette.effects.highlightOpacity;
  ctx.fillRect(x + 2, y + 2, size - 4, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = palette.background;
  ctx.fillRect(x + 4, y + size - 5, size - 8, 1);
}
function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  palette: VisualTheme,
  ghost = false,
  color?: string,
) {
  for (const [x, y] of cells(piece)) {
    if (y < 0) continue;
    if (ghost) {
      ctx.strokeStyle = palette.categorical[kinds.indexOf(piece.kind)]!;
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * palette.effects.ghostOpacity;
      ctx.strokeRect(
        origin.x + x * cellSize + 3.5,
        origin.y + y * cellSize + 3.5,
        cellSize - 7,
        cellSize - 7,
      );
      ctx.globalAlpha = alpha;
    } else
      drawBlock(
        ctx,
        origin.x + x * cellSize,
        origin.y + y * cellSize,
        cellSize,
        color ?? palette.categorical[kinds.indexOf(piece.kind)]!,
        palette,
      );
  }
}
function drawNext(
  ctx: CanvasRenderingContext2D,
  next: Tetromino,
  palette: VisualTheme,
) {
  const preview = cells({ kind: next, x: 0, y: 0, rotation: 0 });
  const minX = Math.min(...preview.map(([x]) => x));
  const minY = Math.min(...preview.map(([, y]) => y));
  const maxX = Math.max(...preview.map(([x]) => x));
  const previewX = 304 - (maxX - minX + 1) * 8;
  for (const [x, y] of preview) {
    drawBlock(
      ctx,
      previewX + (x - minX) * 16,
      58 + (y - minY) * 16,
      16,
      palette.categorical[kinds.indexOf(next)]!,
      palette,
    );
  }
}
export default { drawBlock, drawPiece, drawNext, cellSize, origin };
