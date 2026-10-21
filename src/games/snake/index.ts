import { canContinue } from "@/engine/sdk";
import type { GameDefinition, Action } from "@/engine/sdk";
import type { SnakeState, SnakeOptions } from "@/games/snake/types";
import defaultState from "@/games/snake/state";
import logic from "@/games/snake/logic";
import autopilot from "@/games/snake/ai";
import rendering from "@/games/snake/render";
import settings from "@/games/snake/settings";
import persistence from "@/games/snake/persistence";
import controls from "@/games/snake/controls";

const strategies = {
  explorer: {
    choose: autopilot.explorer,
    description:
      "Chases food along short routes, checks each escape, and opens safe paths when space gets tight.",
  },
  safe: {
    choose: autopilot.safe,
    description:
      "Follows a safe board-wide cycle, taking shortcuts to food. Replans after human play.",
  },
};

export default {
  metadata: {
    id: "snake",
    title: "Snake",
    description: "Eat, grow, and leave room for the next turn.",
    icon: "snake",
  },
  defaultState,
  settings,
  persistence,
  initialize: logic.initialize,
  configure(options) {
    const { choose: ai, description: strategy } = strategies[options.ai];
    return {
      strategy,
      controls,
      width: options.columns * rendering.cellSize,
      height: options.rows * rendering.cellSize,
      tickMs: 85,
      boardLabel: `SNAKE / ${options.columns} × ${options.rows}`,
      update: logic.update,
      ai,
      recovery: {
        steps: 8,
        durationMs: 640,
        isLoss: (state) => state.over && !state.won,
        canResume: (state) =>
          canContinue(state, ai, logic.update, 16, (next) => next.won),
      },
      render: (ctx, state, frame) =>
        rendering.draw(ctx, state, frame, options.skin),
      metrics: (state) => [
        { label: "Length", value: state.body.length },
        {
          label: "Board",
          value: `${Math.round((state.body.length / (state.columns * state.rows)) * 100)}%`,
        },
      ],
    };
  },
} satisfies GameDefinition<SnakeState, SnakeOptions, Action>;
