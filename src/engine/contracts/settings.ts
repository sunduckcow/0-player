import type { RenderFrame } from "./game";

export type SettingValue = string | number | boolean;
export type SettingsValues = Record<string, SettingValue>;
export type SettingsErrors = Record<string, string>;
export type SettingsEffect = "none" | "presentation" | "rules" | "restart";
export interface SettingPreview {
  width: number;
  height: number;
  draw(
    ctx: CanvasRenderingContext2D,
    settings: Readonly<SettingsValues>,
    bounds: { width: number; height: number },
    frame: RenderFrame,
  ): void;
}
export interface SettingOption {
  value: string | boolean;
  label: string;
  description?: string;
  preview?: SettingPreview;
}
export type SettingField<Key extends string = string> = {
  key: Key;
  label: string;
  description?: string;
} & (
  | { kind: "boolean" }
  | { kind: "choice"; options: readonly SettingOption[] }
  | { kind: "number"; min: number; max: number; step: number }
);
export interface SettingsPreset {
  label: string;
  values: SettingsValues;
}
export interface SettingsDefinition<C extends object> {
  normalize(raw: unknown): C;
  validate(draft: Readonly<SettingsValues>): SettingsErrors;
  effect(previous: Readonly<C>, next: Readonly<C>): SettingsEffect;
  fields: readonly SettingField<Extract<keyof C, string>>[];
  presets?: readonly SettingsPreset[];
  presetsLabel?: string;
}
