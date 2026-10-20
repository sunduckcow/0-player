export type SnakeStrategy = "explorer" | "safe";
export type SnakeSkin = "tapered" | "squares";

export interface SnakeOptions {
  ai: SnakeStrategy;
  columns: number;
  rows: number;
  skin: SnakeSkin;
}

export const SNAKE_PRESETS = { s: 12, m: 24, l: 32 } as const;

// Even dimensions keep the safe cycle closed for every custom board.
const dimension = (value = 24) =>
  Number.isFinite(value) ? Math.max(8, Math.min(40, Math.round(value / 2) * 2)) : 24;

export function normalizeSnakeOptions(
  options: Partial<SnakeOptions> = {},
): SnakeOptions {
  return {
    ai: options.ai === "safe" ? "safe" : "explorer",
    columns: dimension(options.columns),
    rows: dimension(options.rows),
    skin: options.skin === "tapered" ? "tapered" : "squares",
  };
}
