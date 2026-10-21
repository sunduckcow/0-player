import { describe, expect, it } from "vitest";
import {
  createSnakeGame,
  isSnakeState,
  move,
} from "@/games/snake/__tests__/helpers";

import type { Direction, SnakeState } from "@/games/snake/__tests__/helpers";

// A dense live board with food beside the head and a viable escape. Safe loop
// deliberately takes its tour here; Explorer should still take the meal.
function denseBoard(): SnakeState {
  const body = [{ x: 2, y: 5 }];
  const directions: Record<string, Direction> = {
    U: "up",
    R: "right",
    D: "down",
    L: "left",
  };
  for (const step of "DRRRRRRDLLLLLDDDRRRRRDLLLLLLLLUUUUUUUUUUURRRRRRRRRRRDLLLLLLLLLLD")
    body.push(move(body.at(-1)!, directions[step]!));
  return {
    columns: 12,
    rows: 12,
    body,
    direction: "up",
    food: { x: 1, y: 5 },
    rng: 1350026104,
    score: 61,
    over: false,
    won: false,
  };
}

describe("Explorer on dense boards", () => {
  it.each([42, 73, 20261029])(
    "keeps eating through a full small-board game with seed %i",
    (seed) => {
      const game = createSnakeGame({ columns: 12, rows: 12 });
      let state = game.create(seed);
      for (let tick = 0; tick < 6000 && !state.over; tick++)
        state = game.update(state, game.ai(state));
      expect(state.won).toBe(true);
      expect(state.score).toBe(140);
    },
  );

  it("opens a moving-tail loop with two free cells instead of repeating the same body forever", () => {
    const game = createSnakeGame({ columns: 8, rows: 8 });
    const body = [{ x: 0, y: 0 }];
    const directions: Record<string, Direction> = {
      U: "up",
      R: "right",
      D: "down",
      L: "left",
    };
    for (const step of "DDRDLDRDLDRDRUUUURULURRDDDLDRRUUUURDDDDDLLLDRRRRUUUUUUULLLLLL")
      body.push(move(body.at(-1)!, directions[step]!));
    let state: SnakeState = {
      columns: 8,
      rows: 8,
      body,
      direction: "up",
      food: { x: 0, y: 7 },
      rng: 3742209427,
      score: 58,
      over: false,
      won: false,
    };
    expect(isSnakeState(state)).toBe(true);
    const saved = JSON.stringify(state);
    expect(game.ai(state)).toBe(game.ai(JSON.parse(saved)));
    expect(JSON.stringify(state)).toBe(saved);
    for (let tick = 0; tick < 512 && !state.over; tick++)
      state = game.update(state, game.ai(state));
    expect(state.won).toBe(true);
    expect(state.body).toHaveLength(64);
  });

  it("keeps pursuing safe food above 40% occupancy instead of switching to Safe loop", () => {
    const game = createSnakeGame({ columns: 12, rows: 12 });
    const state = denseBoard();
    expect(isSnakeState(state)).toBe(true);
    expect(game.ai(state)).toBe("left");
    let next = game.update(state, game.ai(state));
    expect(next.score).toBe(state.score + 1);
    for (let tick = 0; tick < 1000 && !next.over; tick++)
      next = game.update(next, game.ai(next));
    expect(next.over && !next.won).toBe(false);
    expect(next.score).toBeGreaterThan(state.score + 10);
  });
});
