import type { Game, GameState, Mode } from "@/engine/contracts/game";

export interface SessionSnapshot<S extends GameState = GameState> {
  state: S;
  mode: Mode;
  paused: boolean;
  speed: number;
  autoSpeed?: number;
  round: number;
  seed: number;
}

export type RecoveryOptions<S extends GameState> = NonNullable<
  Game<S, string>["recovery"]
>;

export interface RecoveryPhase<S> {
  target?: S;
  fallback?: S;
  steps: number;
  elapsed: number;
  duration: number;
}

export type RecoveryUpdate<S> =
  | { kind: "rewinding"; state?: S }
  | { kind: "resumed"; state: S }
  | { kind: "restart" };
