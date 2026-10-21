import type { GameState } from "@/engine/sdk";
export type Tetromino = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
export interface Piece {
  kind: Tetromino;
  x: number;
  y: number;
  rotation: number;
}
export interface TetrisState extends GameState {
  board: number[][];
  piece: Piece;
  bag: Tetromino[];
  rng: number;
  fall: number;
  pieceAge: number;
  lines: number;
  level: number;
  pieces: number;
  /** Last lock's cleared rows, for visual feedback without delaying the rules. */
  lineClear?: { y: number; cells: number[] }[];
}
export interface TetrisOptions {
  showGhost: boolean;
  showNext: boolean;
}
export interface LineClearFlash {
  pieces: number;
  started: number;
  board: number[][];
  rows: number[];
}
export interface ClearEffect {
  pieces?: number;
  lines?: number;
  flash?: LineClearFlash;
}
