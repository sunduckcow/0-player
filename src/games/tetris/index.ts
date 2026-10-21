import { canContinue } from "@/engine/sdk";
import type { GameDefinition, Action } from "@/engine/sdk";
import type { TetrisState, TetrisOptions } from "@/games/tetris/types";
import defaultState from "@/games/tetris/state";
import logic from "@/games/tetris/logic";
import autopilot from "@/games/tetris/ai";
import rendering from "@/games/tetris/render";
import settings from "@/games/tetris/settings";
import persistence from "@/games/tetris/persistence";
import controls from "@/games/tetris/controls";

export default {
  metadata: {
    id: "tetris",
    title: "Tetris",
    description: "Seven shapes. Keep the stack low and the rows complete.",
    icon: "blocks",
  },
  defaultState,
  settings,
  persistence,
  initialize: logic.initialize,
  configure(options) {
    return {
      strategy:
        "Plans a landing, turns early, then moves into place and speeds up the fall.",
      controls,
      ...rendering.viewport,
      tickMs: 80,
      boardLabel: "TETRIS / 10 × 20",
      labels: options.showNext
        ? [{ text: "Next", x: 276, y: 29, role: "body" }]
        : [],
      update: logic.update,
      ai: autopilot.choose,
      recovery: {
        steps: 24,
        durationMs: 720,
        canResume: (state) =>
          canContinue(state, autopilot.choose, logic.update, 48),
      },
      render: (ctx, state, frame) => rendering.draw(ctx, state, frame, options),
      metrics: (state) => [
        { label: "Lines", value: state.lines },
        { label: "Level", value: state.level },
        { label: "Pieces", value: state.pieces },
      ],
    };
  },
} satisfies GameDefinition<TetrisState, TetrisOptions, Action>;
