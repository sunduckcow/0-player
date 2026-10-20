import { setPalette, type DrawPalette } from "@/engine/draw";

export const accentChoices = [
  { value: "lime", label: "Lime", color: "#c6ef83" },
  { value: "cyan", label: "Cyan", color: "#83dfef" },
  { value: "violet", label: "Violet", color: "#c7b1ff" },
  { value: "amber", label: "Amber", color: "#efcd83" },
  { value: "rose", label: "Rose", color: "#f2a8bd" },
] as const;

export interface AppearancePreferences {
  theme: "dark" | "light" | "system";
  accent: (typeof accentChoices)[number]["value"] | "custom";
  customColor?: string;
}

export const defaultAppearance: AppearancePreferences = { theme: "dark", accent: "lime" };
const validHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function normalizeAppearance(value: unknown): AppearancePreferences {
  const saved = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const accent = saved.accent === "custom" ? "custom" : accentChoices.find((choice) => choice.value === saved.accent)?.value ?? "lime";
  return {
    theme: saved.theme === "light" || saved.theme === "system" ? saved.theme : "dark",
    accent,
    ...(validHex(saved.customColor) ? { customColor: saved.customColor.toLowerCase() } : accent === "custom" ? { customColor: "#c6ef83" } : {}),
  };
}

export function resolveAccentColor(preferences: AppearancePreferences): string {
  const settings = normalizeAppearance(preferences);
  return settings.accent === "custom" ? settings.customColor! : accentChoices.find((choice) => choice.value === settings.accent)!.color;
}

const rgb = (hex: string) => hex.slice(1).match(/../g)!.map((part) => parseInt(part, 16) / 255);
const luminance = (hex: string) => rgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
};
function hsl(hex: string) {
  const [r, g, b] = rgb(hex) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2;
  const h = !delta ? 100 : ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
  return { h, s: delta ? delta / (1 - Math.abs(2 * l - 1)) : 0, l };
}
function hex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  return "#" + [0, 8, 4].map((offset) => {
    const k = (offset + h / 30) % 12;
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, "0");
  }).join("");
}
function readable(h: number, s: number, start: number, backgrounds: string[], light: boolean, minimum = 4.5) {
  let l = start;
  for (let step = 0; step <= 100; step++) {
    const color = hex(h, s, l);
    if (backgrounds.every((background) => contrast(color, background) >= minimum)) return color;
    l = Math.max(0, Math.min(1, l + (light ? -0.01 : 0.01)));
  }
  return light ? "#000000" : "#ffffff";
}
const mix = (first: string, second: string, amount: number) => "#" + rgb(first).map((value, index) =>
  Math.round((value * amount + rgb(second)[index]! * (1 - amount)) * 255).toString(16).padStart(2, "0")).join("");

/** Neutral surfaces, controls and board all derive from the selected hue. */
export function appearancePalette(preferences: AppearancePreferences, systemDark: boolean): {
  theme: "dark" | "light";
  palette: DrawPalette;
  tokens: Record<string, string>;
} {
  const settings = normalizeAppearance(preferences);
  const theme = settings.theme === "system" ? systemDark ? "dark" : "light" : settings.theme;
  const light = theme === "light";
  const source = hsl(resolveAccentColor(settings));
  const tone = (l: number, saturation = 0.24) => hex(source.h, source.s * saturation, l);
  const tokens: Record<string, string> = {
    bg: tone(light ? 0.95 : 0.084), surface: tone(light ? 0.977 : 0.12),
    "surface-raised": tone(light ? 0.925 : 0.145), "surface-deep": tone(light ? 0.985 : 0.085, light ? 0.45 : 0.24),
    line: tone(light ? 0.79 : 0.205), "line-strong": tone(light ? 0.65 : 0.29),
    "board-bg": tone(light ? 0.965 : 0.088), "board-grid": tone(light ? 0.85 : 0.14),
    overlay: tone(light ? 0.95 : 0.075) + (light ? "e8" : "e3"),
    backdrop: tone(light ? 0.12 : 0.05, 0.4) + (light ? "5c" : "ba"),
    shadow: tone(light ? 0.15 : 0.04, 0.4) + (light ? "26" : "88"),
  };
  const backgrounds = [tokens.bg!, tokens.surface!, tokens["surface-raised"]!, tokens["surface-deep"]!, tokens["board-bg"]!];
  // Reserve contrast for tinted active/hover surfaces as well as neutral ones.
  const accent = readable(source.h, source.s, light ? Math.min(source.l, 0.35) : Math.max(source.l, 0.7), backgrounds, light, 5.5);
  tokens.accent = accent;
  tokens["accent-ink"] = light ? "#ffffff" : tone(0.10, 0.3);
  tokens.selected = mix(accent, tokens.surface!, 0.1);
  tokens.hover = mix(accent, tokens.surface!, 0.13);
  const textBackgrounds = [...backgrounds, tokens.selected, tokens.hover];
  tokens.text = tone(light ? 0.14 : 0.90, 0.16);
  tokens.muted = readable(source.h, source.s * 0.16, light ? 0.34 : 0.64, textBackgrounds, light);
  tokens.soft = tone(light ? 0.23 : 0.79, 0.18);
  tokens.dim = readable(source.h, source.s * 0.16, light ? 0.40 : 0.58, textBackgrounds, light);
  tokens["board-muted"] = tokens.muted;
  tokens["line-accent"] = mix(accent, tokens.line!, 0.35);
  tokens["accent-key-line"] = tokens["accent-ink"] + "66";
  return {
    theme, tokens,
    palette: {
      background: tokens["board-bg"]!, grid: tokens["board-grid"]!, accent,
      body: readable(source.h, source.s * 0.55, light ? 0.40 : 0.55, [tokens["board-bg"]!], light, 3),
      text: tokens.text, muted: tokens.muted,
      food: readable((source.h + 180) % 360, Math.max(0.55, source.s * 0.8), light ? 0.35 : 0.7, [tokens["board-bg"]!], light, 3),
      ghost: tone(light ? 0.70 : 0.23, 0.4),
    },
  };
}

/** The host owns persistence and the system-theme listener. */
export function applyAppearance(preferences: AppearancePreferences, systemDark: boolean) {
  const settings = normalizeAppearance(preferences);
  const resolved = appearancePalette(settings, systemDark);
  const root = document.documentElement;
  root.dataset.theme = resolved.theme;
  root.dataset.accent = settings.accent;
  for (const [name, color] of Object.entries(resolved.tokens)) root.style.setProperty(`--${name}`, color);
  setPalette(resolved.palette, resolved.theme === "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.tokens.bg!);
}
