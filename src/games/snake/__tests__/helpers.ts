import definition from "@/games/snake";
import { configureGame } from "@/engine/runtime/cartridge";
import type { SnakeOptions, SnakeState } from "@/games/snake/types";
import board from "@/games/snake/board";
import logic from "@/games/snake/logic";
import autopilot from "@/games/snake/ai";
import pursuit from "@/games/snake/ai/pursuit";
import rendering from "@/games/snake/render";
import bodyRendering from "@/games/snake/body-render";
import settings from "@/games/snake/settings";
import persistence from "@/games/snake/persistence";

export function createSnakeGame(options: Partial<SnakeOptions> = {}) {
  return configureGame(definition, Object.freeze(settings.normalize(options)));
}
export const snake = createSnakeGame();
export const createSnake = (
  seed: number,
  options: Partial<SnakeOptions> = {},
) => createSnakeGame(options).create(seed);
export const updateSnake = logic.update;
export const isSnakeState = (value: unknown): value is SnakeState =>
  persistence.decode(value, 1) !== null;
export const normalizeSnakeOptions = (options: Partial<SnakeOptions> = {}) =>
  settings.normalize(options);
export const SNAKE_PRESETS = settings.sizes;
export const snakeAI = autopilot.safe;
export const explorerAI = autopilot.explorer;
export const movingFoodPath = pursuit.find;
export const renderSnake = rendering.draw;
export const snakeTileWidth = bodyRendering.tileWidth;
export const { cellId, directions, vectors, same, move, inBounds } = board;
export const SIZE = board.size;
export type {
  Cell,
  Direction,
  SnakeState,
  SnakeOptions,
  SnakeStrategy,
  SnakeSkin,
} from "@/games/snake/types";
