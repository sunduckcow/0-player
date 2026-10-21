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

export const defaultAppearance: AppearancePreferences = {
  theme: "dark",
  accent: "lime",
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

function savedPreferences(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  return value as Record<string, unknown>;
}

export function normalizeAppearance(value: unknown): AppearancePreferences {
  const saved = savedPreferences(value);
  let accent: AppearancePreferences["accent"] = "custom";
  if (saved.accent !== "custom")
    accent =
      accentChoices.find((choice) => choice.value === saved.accent)?.value ??
      "lime";
  const settings: AppearancePreferences = {
    theme:
      saved.theme === "light" || saved.theme === "system"
        ? saved.theme
        : "dark",
    accent,
  };
  if (isHexColor(saved.customColor))
    settings.customColor = saved.customColor.toLowerCase();
  else if (accent === "custom") settings.customColor = "#c6ef83";
  return settings;
}

export function resolveAccentColor(preferences: AppearancePreferences): string {
  const settings = normalizeAppearance(preferences);
  if (settings.accent === "custom") return settings.customColor!;
  return accentChoices.find((choice) => choice.value === settings.accent)!
    .color;
}

export function resolveTheme(
  theme: AppearancePreferences["theme"],
  systemDark: boolean,
) {
  if (theme !== "system") return theme;
  return systemDark ? "dark" : "light";
}
