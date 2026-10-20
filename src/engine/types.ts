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
export interface GameControl {
  action: Action;
  keys: readonly string[];
  label: string;
  /** Short label for a touch button; omitted controls are keyboard-only. */
  touch?: string;
}
export interface RenderFrame {
  time: number;
  mode: Mode;
  paused: boolean;
  recovery?: { progress: number; steps: number };
}
/** HTML text placed in logical board coordinates, independent of pixel art. */
export interface BoardLabel {
  text: string;
  x: number;
  y: number;
  size?: number;
}
export interface Game<S extends GameState> {
  id: string;
  title: string;
  description: string;
  strategy: string;
  controls: readonly GameControl[];
  width: number;
  height: number;
  tickMs: number;
  labels?: readonly BoardLabel[];
  recovery?: {
    steps: number;
    durationMs?: number;
    isLoss?: (state: S) => boolean;
    canResume?: (state: S) => boolean;
  };
  create(seed: number): S;
  /** Ownership lets a game tune pacing without slowing its input clock. */
  update(state: S, action: Action | null, mode?: Mode): S;
  ai(state: S): Action | null;
  render(ctx: CanvasRenderingContext2D, state: S, frame: RenderFrame): void;
  metrics(state: S): Metric[];
}
