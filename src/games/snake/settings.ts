import type { SettingsDefinition, SettingsValues } from "@/engine/sdk";
import type { SnakeOptions } from "@/games/snake/types";
import preview from "@/games/snake/preview";
const SNAKE_PRESETS = { s: 12, m: 24, l: 32 } as const;
// Even dimensions keep the safe cycle closed for every custom board.
const normalizeDimension = (value = 24) =>
  Number.isFinite(value)
    ? Math.max(8, Math.min(40, Math.round(value / 2) * 2))
    : 24;
function normalizeSnakeOptions(
  options: Partial<SnakeOptions> = {},
): SnakeOptions {
  return {
    ai: options.ai === "safe" ? "safe" : "explorer",
    columns: normalizeDimension(options.columns),
    rows: normalizeDimension(options.rows),
    skin: options.skin === "tapered" ? "tapered" : "squares",
  };
}
export default {
  normalize: (raw: unknown) => {
    const values =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return normalizeSnakeOptions({
      ...values,
      columns: Number(values.columns ?? 24),
      rows: Number(values.rows ?? 24),
    } as Partial<SnakeOptions>);
  },
  validate: (raw: Readonly<SettingsValues>) => {
    const errors: Record<string, string> = {};
    for (const key of ["columns", "rows"]) {
      const dimension = Number(raw[key]);
      if (
        raw[key] === "" ||
        !Number.isInteger(dimension) ||
        dimension < 8 ||
        dimension > 40 ||
        dimension % 2 !== 0
      )
        errors[key] = "Choose an even dimension from 8 to 40.";
    }
    if (!["explorer", "safe"].includes(String(raw.ai)))
      errors.ai = "Choose a strategy.";
    if (!["squares", "tapered"].includes(String(raw.skin)))
      errors.skin = "Choose a skin.";
    return errors;
  },
  effect: (current: Readonly<SnakeOptions>, next: Readonly<SnakeOptions>) => {
    if (current.columns !== next.columns || current.rows !== next.rows)
      return "restart";
    if (current.ai !== next.ai) return "rules";
    if (current.skin !== next.skin) return "presentation";
    return "none";
  },
  fields: [
    {
      key: "skin",
      kind: "choice",
      label: "Snake appearance",
      options: [
        {
          value: "tapered",
          label: "Tapered",
          preview: preview.tapered,
        },
        {
          value: "squares",
          label: "Squares",
          preview: preview.squares,
        },
      ],
    },
    {
      key: "ai",
      kind: "choice",
      label: "Autopilot strategy",
      description:
        "Explorer chases food and checks escape routes; Safe loop follows a conservative cycle.",
      options: [
        { value: "explorer", label: "Explorer" },
        { value: "safe", label: "Safe loop" },
      ],
    },
    {
      key: "columns",
      kind: "number",
      label: "Columns",
      min: 8,
      max: 40,
      step: 2,
    },
    {
      key: "rows",
      kind: "number",
      label: "Rows",
      min: 8,
      max: 40,
      step: 2,
    },
  ],
  presetsLabel: "Board size",
  presets: [
    { label: "S · 12", values: { columns: 12, rows: 12 } },
    { label: "M · 24", values: { columns: 24, rows: 24 } },
    { label: "L · 32", values: { columns: 32, rows: 32 } },
  ],
  sizes: SNAKE_PRESETS,
} satisfies SettingsDefinition<SnakeOptions> & { sizes: typeof SNAKE_PRESETS };
