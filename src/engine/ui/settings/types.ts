import type { SettingsValues as GameSettingsValues } from "@/engine/contracts/settings";
import type { Cartridge } from "@/engine/runtime/cartridge";
import type { AppearancePreferences } from "@/engine/theme/appearance";

export interface SettingsValues {
  general: AppearancePreferences;
  game: GameSettingsValues;
}

export interface SettingsInitial {
  game: Cartridge;
  general: AppearancePreferences;
}

export interface SettingsFormProps {
  initial: SettingsInitial;
  onApply: (values: SettingsValues) => void;
  onCancel: () => void;
  portalContainer: HTMLElement | null;
}
