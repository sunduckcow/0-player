import type { Game } from "@/engine/types";
import { createSnake, updateSnake, type SnakeState } from "./game";
import { explorerAI, snakeAI } from "./ai";
import { renderSnake } from "./render";
import { normalizeSnakeOptions, type SnakeOptions } from "./settings";
import { canContinue } from "@/games/recovery";

export function createSnakeGame(
  options: Partial<SnakeOptions> = {},
): Game<SnakeState> {
  const settings = normalizeSnakeOptions(options);
  const ai = settings.ai === "explorer" ? explorerAI : snakeAI;
  return {
    id: "snake",
    title: "Snake",
    description: "Eat, grow, and leave room for the next turn.",
    strategy:
      settings.ai === "explorer"
        ? "Chases food along short routes, checks each escape, and opens safe paths when space gets tight."
        : "Follows a safe board-wide cycle, taking shortcuts to food. Replans after human play.",
    controls: [
      { action: "up", keys: ["ArrowUp", "k"], label: "Move up", touch: "↑" },
      { action: "left", keys: ["ArrowLeft", "h"], label: "Move left", touch: "←" },
      { action: "down", keys: ["ArrowDown", "j"], label: "Move down", touch: "↓" },
      { action: "right", keys: ["ArrowRight", "l"], label: "Move right", touch: "→" },
    ],
    width: settings.columns * 20,
    height: settings.rows * 20,
    tickMs: 85,
    create: (seed) => createSnake(seed, settings),
    update: updateSnake,
    ai,
    recovery: {
      steps: 8,
      durationMs: 640,
      isLoss: (state) => state.over && !state.won,
      canResume: (state) => canContinue(state, ai, updateSnake, 16, (next) => next.won),
    },
    render: renderSnake,
    metrics: (state) => [
      { label: "Length", value: state.body.length },
      {
        label: "Board",
        value: `${Math.round((state.body.length / (state.columns * state.rows)) * 100)}%`,
      },
    ],
  };
}

export const snake = createSnakeGame();

export { createSnake, updateSnake, isSnakeState } from "./game";
export type { SnakeState };
export { normalizeSnakeOptions, SNAKE_PRESETS } from "./settings";
export type { SnakeOptions, SnakeStrategy } from "./settings";
