import type { VisualTheme } from "./visuals";
export type Action = "up" | "down" | "left" | "right" | "primary" | "secondary";
export type Mode = "auto" | "human";
export interface GameState {
  score: number;
  over: boolean;
}
export interface Metric {
  label: string;
  value: string | number;
}
export type ActionRole =
  | "move-up"
  | "move-left"
  | "move-down"
  | "move-right"
  | "rotate"
  | "primary"
  | "secondary";
export interface GameControl<A extends string = Action> {
  action: A;
  role?: ActionRole;
  repeat?: boolean;
  keys: readonly string[];
  label: string;
  /** Shared compact legend row; keyboard and touch actions stay individual. */
  group?: string;
  /** Optional semantic symbol; the engine owns all control presentation. */
  symbol?: string;
  /** Short caption for actions whose symbol needs context. */
  shortLabel?: string;
}
export interface RenderFrame {
  readonly visuals: VisualTheme;
  readonly reducedMotion: boolean;
  time: number;
  mode: Mode;
  paused: boolean;
  recovery?: { progress: number; steps: number };
}
/** Engine-styled text in logical board coordinates, independent of pixel art. */
export interface BoardLabel {
  text: string;
  x: number;
  y: number;
  role?: "caption" | "body";
}
export interface Game<S extends GameState, A extends string = Action> {
  id: string;
  title: string;
  description: string;
  strategy: string;
  controls: readonly GameControl<A>[];
  width: number;
  height: number;
  tickMs: number;
  labels?: readonly BoardLabel[];
  boardLabel?: string;
  recovery?: {
    steps: number;
    durationMs?: number;
    isLoss?: (state: S) => boolean;
    canResume?: (state: S) => boolean;
  };
  create(seed: number): S;
  /** Ownership lets a game tune pacing without slowing its input clock. */
  update(state: S, action: A | null, mode?: Mode): S;
  ai(state: S): A | null;
  render(ctx: CanvasRenderingContext2D, state: S, frame: RenderFrame): void;
  metrics(state: S): Metric[];
}
