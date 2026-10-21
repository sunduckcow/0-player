/** Public cartridge surface. No host, DOM lifecycle, storage or theme singletons. */
export type {
  GameDefinition,
  ReadonlyState,
  GameRules,
  StateCodec,
} from "@/engine/contracts/cartridge";
export type {
  SettingsDefinition,
  SettingField,
  SettingsValues,
  SettingPreview,
  SettingsEffect,
  SettingsErrors,
} from "@/engine/contracts/settings";
export type {
  Action,
  ActionRole,
  Game,
  GameControl,
  GameState,
  RenderFrame,
  BoardLabel,
  Metric,
  Mode,
} from "@/engine/contracts/game";
export type { VisualTheme } from "@/engine/contracts/visuals";
export { clear, grid } from "@/engine/rendering/canvas";
export {
  recoveryIntensity,
  flashIntensity,
  feedbackFlashMs,
} from "@/engine/rendering/feedback";
export { canContinue } from "@/engine/runtime/recovery";
export { random, nextSeed } from "@/engine/lib/random";
