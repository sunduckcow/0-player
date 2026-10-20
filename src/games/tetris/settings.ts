export interface TetrisOptions {
  showGhost: boolean;
  showNext: boolean;
}

export const defaultTetrisOptions: TetrisOptions = { showGhost: true, showNext: true };

export function normalizeTetrisOptions(value: unknown): TetrisOptions {
  const options = value && typeof value === "object" ? value as Partial<TetrisOptions> : {};
  return {
    showGhost: typeof options.showGhost === "boolean" ? options.showGhost : true,
    showNext: typeof options.showNext === "boolean" ? options.showNext : true,
  };
}
