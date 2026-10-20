import { describe, expect, it } from "vitest";
import { accentChoices, appearancePalette, defaultAppearance, normalizeAppearance, resolveAccentColor } from "@/appearance";

const luminance = (hex: string) => {
  const channels = hex.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
};
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
};

describe("appearance preferences", () => {
  it("accepts only supported options from saved data", () => {
    expect(normalizeAppearance({ theme: "system", accent: "cyan" })).toEqual({ theme: "system", accent: "cyan" });
    for (const value of [null, [], false, "light", { theme: "sepia", accent: "red" }])
      expect(normalizeAppearance(value)).toEqual(defaultAppearance);
    expect(normalizeAppearance({ theme: "light", accent: null })).toEqual({ theme: "light", accent: "lime" });
  });

  it("follows the system only when system theme is selected", () => {
    expect(appearancePalette({ theme: "system", accent: "lime" }, false).theme).toBe("light");
    expect(appearancePalette({ theme: "system", accent: "lime" }, true).theme).toBe("dark");
    expect(appearancePalette({ theme: "dark", accent: "lime" }, false).theme).toBe("dark");
    expect(appearancePalette({ theme: "light", accent: "lime" }, true).theme).toBe("light");
  });

  it("normalizes custom colors without accepting arbitrary CSS or dropping preset choices", () => {
    expect(normalizeAppearance({ theme: "light", accent: "custom", customColor: "#00AaCC" }))
      .toEqual({ theme: "light", accent: "custom", customColor: "#00aacc" });
    for (const customColor of ["red", "var(--bg)", "#abc", "#12gg44", null]) {
      const saved = normalizeAppearance({ accent: "custom", customColor });
      expect(resolveAccentColor(saved)).toBe("#c6ef83");
    }
    expect(resolveAccentColor({ theme: "dark", accent: "rose", customColor: "#000000" })).toBe("#f2a8bd");
  });

  it("keeps canvas text and accents readable in each selectable theme", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const accent of accentChoices) {
        const { palette } = appearancePalette({ theme, accent: accent.value }, false);
        expect(contrast(palette.text, palette.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.muted, palette.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.accent, palette.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("recolors the full interface and board with each selected accent", () => {
    for (const theme of ["dark", "light"] as const) {
      const roles = ["bg", "surface", "surface-raised", "surface-deep", "line", "line-strong", "text", "muted", "soft", "dim", "overlay", "backdrop", "shadow", "board-bg", "board-grid", "board-muted"];
      for (const role of roles) {
        const colors = accentChoices.map(({ value }) => appearancePalette({ theme, accent: value }, false).tokens[role]);
        expect(new Set(colors).size, `${theme} ${role}`).toBe(accentChoices.length);
      }
    }
  });

  it("preserves readable interface text and primary controls on every tone", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const { value } of accentChoices) {
        const { tokens, palette } = appearancePalette({ theme, accent: value }, false);
        for (const background of ["bg", "surface", "surface-raised", "surface-deep"]) {
          expect(contrast(tokens.text!, tokens[background]!), `${theme} ${value} text`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(tokens.muted!, tokens[background]!), `${theme} ${value} muted`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(tokens["accent-ink"]!, palette.accent), `${theme} ${value} primary`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.body, palette.background), `${theme} ${value} snake body`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("returns independent palettes without changing the default preference", () => {
    const first = appearancePalette(defaultAppearance, false);
    first.palette.accent = "#000000";
    expect(appearancePalette(defaultAppearance, false).palette.accent).toBe("#c6ef83");
    expect(defaultAppearance).toEqual({ theme: "dark", accent: "lime" });
  });

  it("keeps extreme custom colors readable and achromatic choices neutral", () => {
    for (const customColor of ["#000000", "#ffffff", "#777777", "#ff0000", "#00ff00", "#0000ff", "#123456", "#abcdef"]) {
      for (const theme of ["dark", "light"] as const) {
        const { tokens, palette } = appearancePalette({ theme, accent: "custom", customColor }, false);
        for (const background of ["bg", "surface", "surface-raised", "surface-deep", "selected", "hover"]) {
          expect(contrast(tokens.text!, tokens[background]!), `${theme} ${customColor} text`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(tokens.muted!, tokens[background]!), `${theme} ${customColor} muted`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(tokens["accent-ink"]!, palette.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.body, palette.background)).toBeGreaterThanOrEqual(3);
        expect(contrast(palette.food, palette.background)).toBeGreaterThanOrEqual(3);
        if (["#000000", "#ffffff", "#777777"].includes(customColor)) {
          for (const value of [tokens.bg!, tokens.surface!, tokens.text!, tokens.muted!, palette.background, palette.accent]) {
            const channels = value.slice(1, 7).match(/../g)!;
            expect(new Set(channels).size).toBe(1);
          }
        }
      }
    }
  });

  it("uses the opposite accent hue for Snake food", () => {
    const hue = (hex: string) => {
      const [r, g, b] = hex.slice(1).match(/../g)!.map((value) => parseInt(value, 16)) as [number, number, number];
      const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
      return ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
    };
    for (const source of [...accentChoices.map(({ color }) => color), "#ff0000", "#0000ff", "#a14b82"]) {
      for (const theme of ["dark", "light"] as const) {
        const { palette } = appearancePalette({ theme, accent: "custom", customColor: source }, false);
        const difference = (hue(palette.food) - hue(palette.accent) + 360) % 360;
        expect(Math.abs(difference - 180)).toBeLessThan(3);
      }
    }
  });
});
