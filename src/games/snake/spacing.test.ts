import { describe, expect, it } from "vitest";
import { snakeAI } from "./ai";
import { isSnakeState, move, updateSnake, type Direction, type SnakeState } from "./game";
import { createSnakeGame } from "./index";

function loopBoard(): SnakeState {
  const body = [{ x: 4, y: 5 }];
  const directions: Record<string, Direction> = { U: "up", R: "right", D: "down", L: "left" };
  for (const step of "ULLUUURRRULLLLLDDDDDDDRRRRR")
    body.push(move(body.at(-1)!, directions[step]!));
  return {
    columns: 8, rows: 8, body, direction: "down", food: { x: 7, y: 6 },
    rng: 4050676697, score: 24, over: false, won: false,
  };
}

describe("Snake tail spacing", () => {
  it("lets Explorer's cycle fallback leave room without changing Safe loop", () => {
    const state = loopBoard();
    expect(isSnakeState(state)).toBe(true);
    const saved = JSON.stringify(state);
    const action = snakeAI(state, true);
    const next = updateSnake(state, action);
    const head = next.body[0]!;
    const tail = next.body.at(-1)!;
    expect(Math.abs(head.x - tail.x) + Math.abs(head.y - tail.y)).toBeGreaterThanOrEqual(2);
    expect(next.over).toBe(false);
    expect(next.body).toHaveLength(state.body.length);
    expect(next.score).toBe(state.score);
    expect(snakeAI(JSON.parse(saved), true)).toBe(action);
    expect(JSON.stringify(state)).toBe(saved);
    expect(snakeAI(state)).toBe("down");
  });

  it("keeps an immediate safe meal ahead of the spacing preference", () => {
    const state = { ...loopBoard(), food: { x: 4, y: 6 } };
    for (const ai of [(state: SnakeState) => snakeAI(state, true), createSnakeGame().ai]) {
      const next = updateSnake(state, ai(state));
      expect(next.score).toBe(state.score + 1);
      expect(next.over).toBe(false);
    }
  });

  it("still moves through a tight tail gap when the board leaves no room", () => {
    const body = [{ x: 0, y: 0 }];
    const directions: Record<string, Direction> = { U: "up", R: "right", D: "down", L: "left" };
    for (const step of "DDRDLDRDLDRDRUUUURULURRDDDLDRRUUUURDDDDDLLLDRRRRUUUUUUULLLLLL")
      body.push(move(body.at(-1)!, directions[step]!));
    const state: SnakeState = {
      columns: 8, rows: 8, body, direction: "up", food: { x: 0, y: 7 },
      rng: 3742209427, score: 58, over: false, won: false,
    };
    expect(isSnakeState(state)).toBe(true);
    const action = snakeAI(state, true);
    expect(action).toBe("right");
    const next = updateSnake(state, action);
    expect(next.over).toBe(false);
    expect(next.body[0]).toEqual({ x: 1, y: 0 });
    expect(next.body.at(-1)).toEqual({ x: 2, y: 0 });
    expect(next.body).toHaveLength(62);
  });
});
