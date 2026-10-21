import type { VisualTheme } from "@/engine/contracts/visuals";

/** Frozen fallback for standalone cartridge rendering and headless tests. */
export const defaultVisuals: VisualTheme = Object.freeze({
  background: "#141916",
  grid: "#202921",
  accent: "#c6ef83",
  accentMuted: "#8eac65",
  secondary: "#b1a1ee",
  text: "#e5eadf",
  muted: "#a4b397",
  categorical: Object.freeze([
    "#6ee7e7",
    "#86a6ff",
    "#ffb579",
    "#f4df7a",
    "#9ce48a",
    "#d7a0f7",
    "#f38fa5",
  ]),
  effects: Object.freeze({
    recovery: "#ef8585",
    recoveryStrong: "#ffb5aa",
    flash: "#ebffd2",
    highlight: "#ffffff",
    ghostOpacity: 0.4,
    highlightOpacity: 0.18,
  }),
});
