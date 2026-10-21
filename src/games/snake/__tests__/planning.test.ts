import { describe, expect, it } from "vitest";
import {
  createSnakeGame,
  isSnakeState,
  move,
  updateSnake,
  movingFoodPath,
  explorerAI,
} from "@/games/snake/__tests__/helpers";

import type {
  Cell,
  Direction,
  SnakeState,
} from "@/games/snake/__tests__/helpers";

function bodyFrom(head: Cell, path: string): Cell[] {
  const body = [head];
  const actions: Record<string, Direction> = {
    U: "up",
    R: "right",
    D: "down",
    L: "left",
  };
  for (const step of path) body.push(move(body.at(-1)!, actions[step]!));
  return body;
}

describe("bounded Snake planning", () => {
  it("does not take a meal that isolates the last two empty cells", () => {
    const state: SnakeState = {
      columns: 12,
      rows: 12,
      body: bodyFrom(
        { x: 1, y: 7 },
        "RUULUUUURDDDRDDDDLLLDRDLDRRUURDDRRULUURULURULURRDDDDDDDRUUUUUUUULLLLUURDRURDRURDDDDDDDDDDRUUURDDDRUUUULLUUUUUURDDDDDRUUUUUULLLLLLLLLLLDDDDDD",
      ),
      direction: "up",
      food: { x: 1, y: 6 },
      rng: 4281027695,
      score: 137,
      over: false,
      won: false,
    };
    expect(isSnakeState(state)).toBe(true);
    const action = explorerAI(state);
    expect(action).not.toBeNull();
    expect(action).not.toBe("up");
    const next = updateSnake(state, action);
    expect(next.over).toBe(false);
    expect(next.score).toBe(state.score);
  });

  it("limits rejected food-position safety checks across both search passes", () => {
    const state: SnakeState = {
      columns: 40,
      rows: 40,
      body: bodyFrom(
        { x: 0, y: 30 },
        "DDDDDDDDDRRRRRRRRRRUULLLURRRRRRRRRRRRRRRRRRRRUUUUUUUUUUUURUUUUUUUUURRRRRRRRRRUUUUURDDDDDDDDDDDDDDDDDDDDDDDLLLDRRRDLLLDRDDRUURDDDLLLLUUUUUUUUUUU",
      ),
      direction: "up",
      food: { x: 4, y: 27 },
      rng: 3013855620,
      score: 140,
      over: false,
      won: false,
    };
    expect(isSnakeState(state)).toBe(true);
    let checks = 0;
    expect(
      movingFoodPath(state, () => {
        checks++;
        return false;
      }),
    ).toBeNull();
    expect(checks).toBeGreaterThan(0);
    expect(checks).toBeLessThanOrEqual(32);
  });

  it("checks the exact grown body, score, and random state after a long moving-tail route", () => {
    const state: SnakeState = {
      columns: 8,
      rows: 8,
      body: bodyFrom(
        { x: 0, y: 0 },
        "DDRDLDRDLDRDRUUUURULURRDDDLDRRUUUURDDDDDLLLDRRRRUUUUUUULLLLLL",
      ),
      direction: "up",
      food: { x: 0, y: 7 },
      rng: 3742209427,
      score: 58,
      over: false,
      won: false,
    };
    let accepted: SnakeState | undefined;
    const saved = JSON.stringify(state);
    const path = movingFoodPath(state, (trial) => {
      const head = trial.body[0]!;
      const tail = trial.body.at(-1)!;
      const adjacent = (a: Cell, b: Cell) =>
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
      // At 63/64 cells, the remaining food is the only possible intermediate cell.
      if (
        !adjacent(head, tail) &&
        !(
          trial.food &&
          adjacent(head, trial.food) &&
          adjacent(trial.food, tail)
        )
      )
        return false;
      accepted = trial;
      return true;
    });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(state.body.length);
    let replay = state;
    for (const action of path!) replay = updateSnake(replay, action);
    expect(accepted).toEqual(replay);
    expect(replay.score).toBe(state.score + 1);
    expect(replay.over).toBe(false);
    expect(JSON.stringify(state)).toBe(saved);
  });

  it("finishes seed 20261037 instead of repeating its almost full board", () => {
    const game = createSnakeGame({ columns: 12, rows: 12 });
    let state = game.create(20261037);
    let score = state.score;
    const seen = new Set<string>();
    for (let tick = 0; tick < 6000 && !state.over; tick++) {
      if (state.score !== score) {
        score = state.score;
        seen.clear();
      }
      const key = JSON.stringify([state.body, state.direction]);
      if (seen.has(key)) break;
      seen.add(key);
      state = game.update(state, game.ai(state));
    }
    expect(state.won).toBe(true);
    expect(state.score).toBe(140);
  });
});
