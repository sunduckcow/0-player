import { describe, expect, it } from "vitest";
import { nextSeed, random } from "@/engine/lib/random";
import { Session } from "@/engine/runtime/session";
import { snake } from "@/games/snake/__tests__/helpers";
import { tetris } from "@/games/tetris/__tests__/helpers";

describe("round randomness", () => {
  it("keeps explicitly seeded games reproducible", () => {
    expect(random(42)).toEqual(random(42));
    expect(snake.create(42)).toEqual(snake.create(42));
    expect(tetris.create(42)).toEqual(tetris.create(42));
  });

  it("decorrelates neighboring round seeds, including uint32 boundaries", () => {
    const apples = new Set<string>();
    const bags = new Set<string>();
    for (let seed = 0; seed < 128; seed++) {
      const next = nextSeed(seed);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThanOrEqual(0xffffffff);
      expect(next).not.toBe(seed);
      expect(nextSeed(seed)).toBe(next);
      apples.add(JSON.stringify(snake.create(next).food));
      const state = tetris.create(next);
      bags.add(JSON.stringify([state.piece.kind, ...state.bag]));
    }
    expect(apples.size).toBeGreaterThan(90);
    expect(bags.size).toBeGreaterThan(110);
    expect(nextSeed(0xffffffff)).not.toBe(0xffffffff);
  });

  it("varies apples and bags across real restart sequences", () => {
    const apples = new Set<string>();
    const bags = new Set<string>();
    const snakeSession = new Session(snake, 20261037);
    const tetrisSession = new Session(tetris, 104726929);
    for (let round = 0; round < 32; round++) {
      apples.add(JSON.stringify(snakeSession.state.food));
      bags.add(
        JSON.stringify([
          tetrisSession.state.piece.kind,
          ...tetrisSession.state.bag,
        ]),
      );
      snakeSession.restart();
      tetrisSession.restart();
    }
    expect(apples.size).toBeGreaterThan(24);
    expect(bags.size).toBeGreaterThan(28);
  });
});
