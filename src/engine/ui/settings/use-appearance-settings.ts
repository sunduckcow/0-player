import { useState } from "react";
import {
  accentChoices,
  resolveAccentColor,
  type AppearancePreferences,
} from "@/engine/theme/appearance";

interface AccentColorChoice {
  value: AppearancePreferences["accent"];
  label: string;
  color: string;
}

export interface AppearanceDraft {
  preferences: AppearancePreferences;
  appliedPreferences: AppearancePreferences;
  customHex: string;
  pickerColor: string;
  validHex: boolean;
  valid: boolean;
  colorChoices: AccentColorChoice[];
  selectedColor: AccentColorChoice;
  changeTheme: (value: unknown) => void;
  changeAccent: (value: unknown) => void;
  changeCustomColor: (value: string) => void;
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isTheme(value: unknown): value is AppearancePreferences["theme"] {
  return value === "dark" || value === "light" || value === "system";
}

function isAccent(value: unknown): value is AppearancePreferences["accent"] {
  return (
    value === "custom" || accentChoices.some((choice) => choice.value === value)
  );
}

export function useAppearanceSettings(
  initial: AppearancePreferences,
): AppearanceDraft {
  const [preferences, setPreferences] = useState(initial);
  const [customHex, setCustomHex] = useState(
    initial.customColor ?? resolveAccentColor(initial),
  );
  const [pickerColor, setPickerColor] = useState(customHex);
  const validHex = isHexColor(customHex);
  const colorChoices = [
    ...accentChoices,
    { value: "custom" as const, label: "Custom", color: pickerColor },
  ];

  function changeCustomColor(value: string) {
    setCustomHex(value);
    if (isHexColor(value)) setPickerColor(value.toLowerCase());
  }

  return {
    preferences,
    appliedPreferences: {
      ...preferences,
      customColor: validHex ? customHex.toLowerCase() : preferences.customColor,
    },
    customHex,
    pickerColor,
    validHex,
    valid: preferences.accent !== "custom" || validHex,
    colorChoices,
    selectedColor: colorChoices.find(
      (choice) => choice.value === preferences.accent,
    )!,
    changeTheme: (theme) => {
      if (isTheme(theme)) setPreferences({ ...preferences, theme });
    },
    changeAccent: (accent) => {
      if (isAccent(accent)) setPreferences({ ...preferences, accent });
    },
    changeCustomColor,
  };
}
