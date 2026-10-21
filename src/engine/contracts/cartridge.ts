import type { Game, GameState } from "./game";
import type { SettingsDefinition } from "./settings";

export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  icon: string;
}
export interface StateCodec<S extends GameState, C extends object> {
  version: number;
  decode(raw: unknown, version: number): S | null;
  compatible?(state: S, settings: Readonly<C>): boolean;
}
export type GameRules<S extends GameState, A extends string> = Omit<
  Game<S, A>,
  "id" | "title" | "description" | "create"
>;
/** JSON state templates are data, never a live mutable game instance. */
export type ReadonlyState<T> = T extends readonly (infer Item)[]
  ? readonly ReadonlyState<Item>[]
  : T extends object
    ? { readonly [K in keyof T]: ReadonlyState<T[K]> }
    : T;
export interface GameDefinition<
  S extends GameState,
  C extends object,
  A extends string,
> {
  readonly metadata: GameMetadata;
  readonly defaultState: ReadonlyState<S>;
  /** Pure seeded setup of an engine-owned copy; omitted for games ready at zero. */
  initialize?(state: S, seed: number, settings: Readonly<C>): S;
  settings: SettingsDefinition<C>;
  persistence: StateCodec<S, C>;
  configure(settings: Readonly<C>): GameRules<S, A>;
}
