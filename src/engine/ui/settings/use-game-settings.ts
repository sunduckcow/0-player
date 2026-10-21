import { useState } from "react";
import type {
  SettingsPreset,
  SettingsValues as GameSettingsValues,
  SettingValue,
} from "@/engine/contracts/settings";
import type { Cartridge } from "@/engine/runtime/cartridge";

function matchesPresetValue(
  value: SettingValue | undefined,
  expected: SettingValue,
) {
  return Number.isFinite(Number(expected))
    ? Number(value) === Number(expected)
    : value === expected;
}

function findMatchingPresetIndex(
  presets: readonly SettingsPreset[],
  values: GameSettingsValues,
) {
  return presets.findIndex((preset) =>
    Object.entries(preset.values).every(([key, value]) =>
      matchesPresetValue(values[key], value),
    ),
  );
}

export function useGameSettings(game: Cartridge) {
  const [values, setValues] = useState(game.values);
  const [customPreset, setCustomPreset] = useState(
    findMatchingPresetIndex(game.presets, values) < 0,
  );
  const presetIndex = customPreset
    ? -1
    : findMatchingPresetIndex(game.presets, values);
  const presetKeys = new Set(
    game.presets.flatMap((preset) => Object.keys(preset.values)),
  );
  const errors = game.validate(values);

  function selectPreset(selection: string[]) {
    if (!selection.length) return;
    const preset = game.presets[Number(selection[0])];
    setCustomPreset(!preset);
    if (preset) setValues({ ...values, ...preset.values });
  }

  function changeField(key: string, value: SettingValue) {
    setValues({ ...values, [key]: value });
  }

  return {
    values,
    errors,
    valid: Object.keys(errors).length === 0,
    presetIndex,
    visibleFields: game.fields.filter(
      (field) => presetIndex < 0 || !presetKeys.has(field.key),
    ),
    selectPreset,
    changeField,
  };
}

export type GameSettingsDraft = ReturnType<typeof useGameSettings>;
