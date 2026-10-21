import {
  appearancePalette,
  normalizeAppearance,
  type AppearancePreferences,
} from "@/engine/theme/appearance";

/** The host owns persistence and the system-theme listener. */
export function applyAppearance(
  preferences: AppearancePreferences,
  systemDark: boolean,
) {
  const settings = normalizeAppearance(preferences);
  const resolved = appearancePalette(settings, systemDark);
  const root = document.documentElement;
  root.dataset.theme = resolved.theme;
  root.dataset.accent = settings.accent;
  for (const [name, color] of Object.entries(resolved.tokens))
    root.style.setProperty(`--${name}`, color);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved.tokens.bg!);
  return resolved.palette;
}
