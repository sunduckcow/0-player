import type { SettingsDefinition, SettingsValues } from "@/engine/sdk";
import type { TetrisOptions } from "@/games/tetris/types";
const defaultTetrisOptions: TetrisOptions = { showGhost: true, showNext: true };
function normalizeTetrisOptions(value: unknown): TetrisOptions {
  const options =
    value && typeof value === "object" ? (value as Partial<TetrisOptions>) : {};
  return {
    showGhost:
      typeof options.showGhost === "boolean" ? options.showGhost : true,
    showNext: typeof options.showNext === "boolean" ? options.showNext : true,
  };
}
export default {
  normalize: normalizeTetrisOptions,
  validate: (draft: Readonly<SettingsValues>) => {
    const errors: Record<string, string> = {};
    for (const key of ["showGhost", "showNext"])
      if (typeof draft[key] !== "boolean") errors[key] = "Choose On or Off.";
    return errors;
  },
  effect: (current: Readonly<TetrisOptions>, next: Readonly<TetrisOptions>) =>
    current.showGhost !== next.showGhost || current.showNext !== next.showNext
      ? "presentation"
      : "none",
  fields: [
    {
      key: "showGhost",
      kind: "boolean",
      label: "Landing guide",
      description: "Show where the current piece will land.",
    },
    {
      key: "showNext",
      kind: "boolean",
      label: "Next piece",
      description: "Show a preview of the next piece.",
    },
  ],
  defaults: defaultTetrisOptions,
} satisfies SettingsDefinition<TetrisOptions> & { defaults: TetrisOptions };
