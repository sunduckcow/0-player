import type { GameMetadata } from "@/engine/contracts/cartridge";
import type { Game, GameState, RenderFrame } from "@/engine/contracts/game";
import type {
  SettingField,
  SettingsErrors,
  SettingsPreset,
  SettingsValues,
} from "@/engine/contracts/settings";
import type { Session } from "../session";
import type { SessionSnapshot } from "../session/types";

export interface ActiveGame {
  session: Session<GameState, string>;
  restore(snapshot: SessionSnapshot): boolean;
  draw(
    ctx: CanvasRenderingContext2D,
    frame: Pick<RenderFrame, "time" | "visuals" | "reducedMotion">,
  ): void;
  metrics(): ReturnType<Game<GameState, string>["metrics"]>;
}

export interface Cartridge extends GameMetadata {
  readonly rules: Game<GameState, string>;
  readonly values: SettingsValues;
  readonly fields: readonly SettingField[];
  readonly presets: readonly SettingsPreset[];
  readonly presetsLabel: string;
  readonly stateVersion: number;
  normalize(raw: unknown): SettingsValues;
  validate(draft: Readonly<SettingsValues>): SettingsErrors;
  initialize(raw: unknown): void;
  decode(raw: unknown, version: number): GameState | null;
  compatible(state: GameState): boolean;
  start(seed: number): ActiveGame;
  apply(active: ActiveGame, draft: Readonly<SettingsValues>): ActiveGame;
}
