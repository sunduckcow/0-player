import { hex, mix, readable, type HslColor } from "./lib/color";

/** Derive surfaces first, then reserve readable foregrounds for every surface. */
export function appearanceTokens(source: HslColor, light: boolean) {
  const tone = (lightness: number, saturation = 0.24) =>
    hex(source.h, source.s * saturation, lightness);
  const surfaces = {
    bg: tone(light ? 0.95 : 0.084),
    surface: tone(light ? 0.977 : 0.12),
    "surface-raised": tone(light ? 0.925 : 0.145),
    "surface-deep": tone(light ? 0.985 : 0.085, light ? 0.45 : 0.24),
    line: tone(light ? 0.79 : 0.205),
    "line-strong": tone(light ? 0.65 : 0.29),
    "board-bg": tone(light ? 0.965 : 0.088),
    "board-grid": tone(light ? 0.85 : 0.14),
    overlay: tone(light ? 0.95 : 0.075) + (light ? "e8" : "e3"),
    backdrop: tone(light ? 0.12 : 0.05, 0.4) + (light ? "5c" : "ba"),
    shadow: tone(light ? 0.15 : 0.04, 0.4) + (light ? "26" : "88"),
  };
  const backgrounds = [
    surfaces.bg,
    surfaces.surface,
    surfaces["surface-raised"],
    surfaces["surface-deep"],
    surfaces["board-bg"],
  ];
  // Reserve contrast for tinted active/hover surfaces as well as neutral ones.
  const accent = readable(
    source.h,
    source.s,
    light ? Math.min(source.l, 0.35) : Math.max(source.l, 0.7),
    backgrounds,
    light,
    5.5,
  );
  const accentInk = light ? "#ffffff" : tone(0.1, 0.3);
  const selected = mix(accent, surfaces.surface, 0.1);
  const hover = mix(accent, surfaces.surface, 0.13);
  const textBackgrounds = [...backgrounds, selected, hover];
  const muted = readable(
    source.h,
    source.s * 0.16,
    light ? 0.34 : 0.64,
    textBackgrounds,
    light,
  );
  return {
    ...surfaces,
    accent,
    "accent-ink": accentInk,
    selected,
    hover,
    text: tone(light ? 0.14 : 0.9, 0.16),
    muted,
    soft: tone(light ? 0.23 : 0.79, 0.18),
    dim: readable(
      source.h,
      source.s * 0.16,
      light ? 0.4 : 0.58,
      textBackgrounds,
      light,
    ),
    "board-muted": muted,
    "line-accent": mix(accent, surfaces.line, 0.35),
    "accent-key-line": accentInk + "66",
  };
}
