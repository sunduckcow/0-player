import { hsl, readable } from "./lib/color";
import {
  normalizeAppearance,
  resolveAccentColor,
  resolveTheme,
  type AppearancePreferences,
} from "./preferences";
import { appearanceTokens } from "./tokens";
import type { VisualTheme } from "@/engine/contracts/visuals";

export {
  accentChoices,
  defaultAppearance,
  normalizeAppearance,
  resolveAccentColor,
  type AppearancePreferences,
} from "./preferences";

const categoricalHueOffsets = [180, 220, 30, 60, 100, 280, 330];

/** Neutral surfaces, controls and board all derive from the selected hue. */
export function appearancePalette(
  preferences: AppearancePreferences,
  systemDark: boolean,
): {
  theme: "dark" | "light";
  palette: VisualTheme;
  tokens: Record<string, string>;
} {
  const settings = normalizeAppearance(preferences);
  const theme = resolveTheme(settings.theme, systemDark);
  const light = theme === "light";
  const source = hsl(resolveAccentColor(settings));
  const tokens = appearanceTokens(source, light);
  const boardColor = (hue: number, saturation: number, lightness: number) =>
    readable(hue, saturation, lightness, [tokens["board-bg"]], light, 3);
  const categorical = categoricalHueOffsets.map((offset) =>
    boardColor(
      (source.h + offset) % 360,
      Math.max(0.62, source.s * 0.8),
      light ? 0.35 : 0.7,
    ),
  );
  return {
    theme,
    tokens,
    palette: Object.freeze({
      background: tokens["board-bg"],
      grid: tokens["board-grid"],
      accent: tokens.accent,
      accentMuted: boardColor(source.h, source.s * 0.55, light ? 0.4 : 0.55),
      text: tokens.text,
      muted: tokens.muted,
      secondary: boardColor(
        (source.h + 180) % 360,
        Math.max(0.55, source.s * 0.8),
        light ? 0.35 : 0.7,
      ),
      categorical: Object.freeze(categorical),
      effects: Object.freeze({
        recovery: boardColor(0, 0.65, light ? 0.35 : 0.7),
        recoveryStrong: boardColor(0, 0.8, light ? 0.3 : 0.8),
        flash: tokens.accent,
        highlight: tokens.text,
        ghostOpacity: light ? 0.6 : 0.4,
        highlightOpacity: 0.18,
      }),
    }),
  };
}
