import { describe, expect, it } from "vitest";
import type { Action } from "@/engine/types";
import { createSnake, isSnakeState, updateSnake, type Cell, type SnakeState } from "./game";
import { snakeAI } from "./ai";
import { createSnakeGame } from "./index";
import { normalizeSnakeOptions, SNAKE_PRESETS } from "./settings";

function board(
  body: Cell[],
  direction: SnakeState["direction"] = "right",
  food: Cell | null = { x: 20, y: 20 },
): SnakeState {
  return {
    columns: 24,
    rows: 24,
    body,
    direction,
    food,
    rng: 42,
    score: body.length - 4,
    over: false,
    won: false,
  };
}

// A hand-built tour leaves a continuous final free cell for the victory case.
function tour(): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < 24; y++) {
    const row = Array.from({ length: 23 }, (_, x) => x + 1);
    for (const x of y % 2 ? row.reverse() : row) cells.push({ x, y });
  }
  for (let y = 23; y >= 0; y--) cells.push({ x: 0, y });
  return cells;
}

describe("Snake rules", () => {
  it("replays actions and food deterministically without mutating prior states", () => {
    const initial = createSnake(123);
    const before = JSON.stringify(initial);
    const actions: Array<Action | null> = [
      "up",
      null,
      "left",
      null,
      "down",
      "right",
      "primary",
    ];
    const first = actions.reduce(updateSnake, initial);
    const replay = actions.reduce(updateSnake, createSnake(123));
    expect(first).toEqual(replay);
    expect(JSON.stringify(initial)).toBe(before);
    expect(first).not.toBe(initial);
  });

  it("grows, scores, and places food outside the body", () => {
    const state = board(
      [
        { x: 2, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 2 },
      ],
      "right",
      { x: 3, y: 2 },
    );
    const next = updateSnake(state, null);
    expect(next.body).toEqual([{ x: 3, y: 2 }, ...state.body]);
    expect(next.score).toBe(state.score + 1);
    expect(next.food).not.toBeNull();
    expect(next.body).not.toContainEqual(next.food);
    expect(next.rng).not.toBe(state.rng);
  });

  it("ignores an immediate reversal and unrelated actions", () => {
    const state = board([
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ]);
    expect(updateSnake(state, "left").body[0]).toEqual({ x: 3, y: 2 });
    expect(updateSnake(state, "secondary").body[0]).toEqual({ x: 3, y: 2 });
  });

  it("ends on a wall or occupied body cell", () => {
    expect(
      updateSnake(
        board(
          [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          "left",
        ),
        null,
      ).over,
    ).toBe(true);
    const folded = board(
      [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
      "up",
    );
    expect(updateSnake(folded, null).over).toBe(true);
  });

  it("permits moving into the tail when it vacates", () => {
    const square = board(
      [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ],
      "up",
    );
    const next = updateSnake(square, "right");
    expect(next.over).toBe(false);
    expect(next.body).toEqual([
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it("wins on the last free cell without trying to generate more food", () => {
    const cells = tour();
    const state = board(cells.slice(0, -1).reverse(), "left", { x: 0, y: 0 });
    const next = updateSnake(state, "up");
    expect(next.body).toHaveLength(576);
    expect(next).toMatchObject({ over: true, won: true, food: null });
    expect(updateSnake(next, "left")).toEqual(next);
  });
});

describe("Snake cartridges", () => {
  it("normalizes board dimensions and exposes compact presets", () => {
    expect(SNAKE_PRESETS).toEqual({ s: 12, m: 24, l: 32 });
    expect(normalizeSnakeOptions({ columns: 9, rows: 100 })).toMatchObject({
      columns: 10,
      rows: 40,
      ai: "explorer",
    });
    expect(normalizeSnakeOptions({ columns: NaN, rows: -5 })).toMatchObject({
      columns: 24,
      rows: 8,
    });
  });

  it.each(["explorer", "safe"] as const)(
    "%s plays a rectangular board without crossing its boundaries",
    (ai) => {
      const game = createSnakeGame({ ai, columns: 16, rows: 10 });
      let state = game.create(701);
      expect(state).toMatchObject({ columns: 16, rows: 10 });
      expect(game.width / game.height).toBe(1.6);
      for (let tick = 0; tick < 1500 && !state.over; tick++) {
        state = game.update(state, game.ai(state));
        expect(state.body.every(({ x, y }) => x >= 0 && y >= 0 && x < 16 && y < 10)).toBe(true);
      }
      expect(state.over && !state.won).toBe(false);
      expect(state.score).toBeGreaterThan(15);
    },
  );

  it("explores a direct route to food instead of waiting for the board-wide tour", () => {
    const state = board([
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
      { x: 9, y: 12 },
    ], "right", { x: 12, y: 10 });
    const game = createSnakeGame();
    const before = JSON.stringify(state);
    expect(game.ai(state)).toBe("up");
    expect(JSON.stringify(state)).toBe(before);
    let next = game.update(state, game.ai(state));
    next = game.update(next, game.ai(next));
    expect(next.score).toBe(state.score + 1);
    expect(next.over).toBe(false);
  });

  it.each([1, 7, 9001])("explores and keeps eating with seed %i", (seed) => {
    const game = createSnakeGame();
    let state = game.create(seed);
    for (let tick = 0; tick < 2500 && !state.over; tick++)
      state = game.update(state, game.ai(state));
    expect(state.over && !state.won).toBe(false);
    expect(state.score).toBeGreaterThan(35);
  });

  it("keeps independent board settings and deterministic replays", () => {
    const small = createSnakeGame({ columns: 12, rows: 12 });
    const large = createSnakeGame({ columns: 32, rows: 24 });
    const play = () => {
      let state = small.create(73);
      for (let tick = 0; tick < 300; tick++)
        state = small.update(state, small.ai(state));
      return state;
    };
    expect(play()).toEqual(play());
    expect(large.create(73)).toMatchObject({ columns: 32, rows: 24 });
    expect(small.create(73)).toMatchObject({ columns: 12, rows: 12 });
  });

  it("opens tight tail loops instead of endlessly circling a small board", () => {
    const game = createSnakeGame({ columns: 8, rows: 8 });
    let state = game.create(42);
    for (let tick = 0; tick < 2000 && !state.over; tick++)
      state = game.update(state, game.ai(state));
    expect(state.won).toBe(true);
    expect(state.body).toHaveLength(64);
  });

  it("accepts saved states and rejects malformed boards before restoring them", () => {
    const state = createSnakeGame({ columns: 16, rows: 12 }).create(42);
    expect(isSnakeState(JSON.parse(JSON.stringify(state)))).toBe(true);
    expect(isSnakeState({ ...state, columns: 15 })).toBe(false);
    expect(isSnakeState({ ...state, body: [state.body[0], state.body[0]] })).toBe(false);
    expect(isSnakeState({ ...state, food: state.body[0] })).toBe(false);
    expect(isSnakeState({ ...state, body: [{ x: 500, y: 1 }] })).toBe(false);
    expect(isSnakeState(null)).toBe(false);
  });
});

describe("Snake autopilot", () => {
  it.each([1, 7, 9001])(
    "survives and eats substantial food with seed %i",
    (seed) => {
      let state = createSnake(seed);
      for (let tick = 0; tick < 20_000 && !state.over; tick++)
        state = updateSnake(state, snakeAI(state));
      expect(state.over && !state.won).toBe(false);
      expect(state.body.length).toBeGreaterThan(100);
    },
  );

  it("eventually fills the whole board during autonomous play", () => {
    let state = createSnake(1);
    for (let tick = 0; tick < 100_000 && !state.over; tick++)
      state = updateSnake(state, snakeAI(state));
    expect(state.won).toBe(true);
    expect(state.body).toHaveLength(576);
    expect(state.score).toBe(572);
  });

  it("resumes eating after a grown snake is steered by a person", () => {
    let state = createSnake(1);
    for (let tick = 0; tick < 3000; tick++)
      state = updateSnake(state, snakeAI(state));
    const length = state.body.length;
    const actions: Action[] = [
      "up",
      "right",
      "right",
      "left",
      "up",
      "right",
      "left",
      "down",
    ];
    for (const action of actions) state = updateSnake(state, action);
    expect(state.over).toBe(false);
    for (let tick = 0; tick < 10_000 && !state.over; tick++)
      state = updateSnake(state, snakeAI(state));
    expect(state.over && !state.won).toBe(false);
    expect(state.body.length).toBeGreaterThan(length + 30);
  });

  it("recovers from a human path that leaves its ordered cycle", () => {
    let state = board(
      [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 8, y: 11 },
        { x: 9, y: 11 },
        { x: 10, y: 11 },
        { x: 11, y: 11 },
      ],
      "right",
      { x: 12, y: 8 },
    );
    for (let tick = 0; tick < 15_000 && !state.over; tick++)
      state = updateSnake(state, snakeAI(state));
    expect(state.over && !state.won).toBe(false);
    expect(state.body.length).toBeGreaterThan(80);
  });
});
