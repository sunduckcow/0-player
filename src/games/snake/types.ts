import type { GameState } from "@/engine/sdk";
export interface Cell {
  x: number;
  y: number;
}
export type Direction = "up" | "right" | "down" | "left";
export interface SnakeState extends GameState {
  columns: number;
  rows: number;
  body: Cell[];
  direction: Direction;
  food: Cell | null;
  rng: number;
  won: boolean;
}
export type SnakeStrategy = "explorer" | "safe";
export type SnakeSkin = "tapered" | "squares";
export interface SnakeOptions {
  ai: SnakeStrategy;
  columns: number;
  rows: number;
  skin: SnakeSkin;
}
/** Shared work limit for the endgame search and its candidate safety checks. */
export interface CompletionBudget {
  remaining: number;
  exhausted: boolean;
}
/** One node in the bounded moving-tail route search. */
export interface PursuitNode {
  cellIndex: number;
  elapsedSteps: number;
  parentIndex: number;
  direction?: Direction;
  bodyHash: number;
}
