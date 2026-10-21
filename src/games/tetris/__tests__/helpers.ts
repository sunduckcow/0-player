import definition from "@/games/tetris";
import { configureGame } from "@/engine/runtime/cartridge";
import type { TetrisOptions } from "@/games/tetris/types";
import board from "@/games/tetris/board";
import logic from "@/games/tetris/logic";
import autopilot from "@/games/tetris/ai";
import rendering from "@/games/tetris/render";
import settings from "@/games/tetris/settings";
import lineClear from "@/games/tetris/clear-effect";

export function createTetrisGame(options: Partial<TetrisOptions> = {}) {
  return configureGame(definition, Object.freeze(settings.normalize(options)));
}
export const tetris = createTetrisGame();
export const create = (seed: number) => createTetrisGame().create(seed);
export const update = logic.update;
export const shuffledBag = logic.shuffle;
export const ai = autopilot.choose;
export const { cells, collides, rotate, dropY, kinds } = board;
export const render = rendering.draw;
export const viewport = rendering.viewport;
export const normalizeTetrisOptions = (options: unknown = {}) =>
  settings.normalize(options);
export const defaultTetrisOptions = settings.defaults;
export const clearFrame = lineClear.frame;
export const LINE_CLEAR_MS = lineClear.duration;
export type {
  Tetromino,
  Piece,
  TetrisState,
  TetrisOptions,
} from "@/games/tetris/types";
export type { ClearEffect } from "@/games/tetris/types";
