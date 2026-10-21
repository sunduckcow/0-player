import { describe, expect, it } from "vitest";
import persistence from "@/games/snake/persistence";
import { createSnake } from "@/games/snake/__tests__/helpers";
import type { SnakeState } from "@/games/snake/types";

function savedState(): SnakeState {
  return createSnake(42, { columns: 8, rows: 8 });
}

describe("Snake persistence", () => {
  it("restores serialized games without replacing their state", () => {
    const saved: unknown = JSON.parse(JSON.stringify(savedState()));
    expect(persistence.decode(saved, 1)).toBe(saved);
    expect(persistence.decode(saved, 2)).toBeNull();
    expect(persistence.decode(null, 1)).toBeNull();
  });

  it.each([
    ["odd board dimension", { columns: 9 }],
    ["empty body", { body: [] }],
    ["out-of-bounds body", { body: [{ x: 8, y: 1 }] }],
    [
      "disconnected body",
      {
        body: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
        ],
      },
    ],
    ["invalid direction", { direction: "diagonal" }],
    ["negative seed", { rng: -1 }],
    ["oversized seed", { rng: 0x100000000 }],
    ["fractional score", { score: 1.5 }],
    ["non-boolean terminal flag", { over: "false" }],
    ["missing food", { food: null }],
    ["unfinished victory", { won: true, over: true, food: null }],
  ])("rejects a save with %s", (_label, patch) => {
    expect(persistence.decode({ ...savedState(), ...patch }, 1)).toBeNull();
  });

  it("rejects occupied food and duplicate body cells", () => {
    const state = savedState();
    expect(persistence.decode({ ...state, food: state.body[0] }, 1)).toBeNull();
    expect(
      persistence.decode({ ...state, body: [state.body[0], state.body[0]] }, 1),
    ).toBeNull();
  });

  it("restores a completed board only with the matching victory flags", () => {
    const body = Array.from({ length: 64 }, (_, index) => {
      const y = Math.floor(index / 8);
      const column = index % 8;
      return { x: y % 2 === 0 ? column : 7 - column, y };
    });
    const victory = {
      ...savedState(),
      body,
      food: null,
      over: true,
      won: true,
    };
    expect(persistence.decode(victory, 1)).toBe(victory);
    expect(persistence.decode({ ...victory, over: false }, 1)).toBeNull();
  });

  it("matches board dimensions when restoring into configured rules", () => {
    const state = savedState();
    const options = {
      columns: 8,
      rows: 8,
      ai: "safe",
      skin: "squares",
    } as const;
    expect(persistence.compatible(state, options)).toBe(true);
    expect(persistence.compatible(state, { ...options, rows: 12 })).toBe(false);
  });
});
