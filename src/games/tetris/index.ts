import type { Game } from "@/engine/types";
import { ai } from "@/games/tetris/ai";
import { create, update, type TetrisState } from "@/games/tetris/game";
import { render, viewport } from "@/games/tetris/render";
import { canContinue } from "@/games/recovery";

export const tetris: Game<TetrisState> = {
  id: "tetris",
  title: "Tetris",
  description: "Seven shapes. Keep the stack low and the rows complete.",
  strategy:
    "Plans a landing, turns early, then moves into place and speeds up the fall.",
  controls: [
    { action: "up", keys: ["ArrowUp", "k", "x"], label: "Rotate", touch: "↑" },
    {
      action: "left",
      keys: ["ArrowLeft", "h"],
      label: "Move left",
      touch: "←",
    },
    {
      action: "down",
      keys: ["ArrowDown", "j"],
      label: "Soft drop",
      touch: "↓",
    },
    {
      action: "right",
      keys: ["ArrowRight", "l"],
      label: "Move right",
      touch: "→",
    },
    { action: "primary", keys: ["Enter"], label: "Hard drop", touch: "Drop" },
  ],
  ...viewport,
  tickMs: 80,
  create,
  update,
  ai,
  recovery: {
    steps: 24,
    durationMs: 720,
    canResume: (state) => canContinue(state, ai, update, 48),
  },
  render,
  metrics: (state) => [
    { label: "Lines", value: state.lines },
    { label: "Level", value: state.level },
    { label: "Pieces", value: state.pieces },
  ],
};

export type { TetrisState } from "@/games/tetris/game";
