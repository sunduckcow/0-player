import { describe, expect, it } from "vitest";
import {
  create,
  update,
  clearFrame,
  LINE_CLEAR_MS,
} from "@/games/tetris/__tests__/helpers";

import type { ClearEffect } from "@/games/tetris/__tests__/helpers";

function clearFour() {
  const state = create(42);
  state.piece = { kind: "I", x: 2, y: 0, rotation: 1 };
  for (let y = 16; y < 20; y++)
    state.board[y] = Array.from({ length: 10 }, (_, x) => (x === 4 ? 0 : 2));
  return { before: state, after: update(state, "primary") };
}

describe("short line-clear feedback", () => {
  it("keeps the rows visible briefly without delaying rules, score or the next input", () => {
    const { before, after } = clearFour();
    const effect: ClearEffect = {};
    expect(clearFrame(effect, before, 100)).toBeNull();
    const flash = clearFrame(effect, after, 110)!;
    expect(after.lines).toBe(4);
    expect(after.board.flat().some(Boolean)).toBe(false);
    expect(flash.rows).toEqual([16, 17, 18, 19]);
    expect(flash.board.slice(16).every((row) => row.every(Boolean))).toBe(true);
    expect(flash.opacity).toBeGreaterThan(0);
    const moving = update(after, "left");
    expect(moving.piece.x).toBe(after.piece.x - 1);
    expect(
      clearFrame(effect, moving, 110 + LINE_CLEAR_MS / 2)!.opacity,
    ).toBeLessThan(flash.opacity);
    expect(clearFrame(effect, moving, 110 + LINE_CLEAR_MS)).toBeNull();
    expect(clearFrame(effect, moving, 1000)).toBeNull();
  });

  it("does not replay a saved clear on first render, a restart or another locked piece", () => {
    const { before, after } = clearFour();
    const effect: ClearEffect = {};
    expect(clearFrame(effect, structuredClone(after), 100)).toBeNull();
    clearFrame(effect, before, 200);
    expect(clearFrame(effect, after, 210)).not.toBeNull();
    expect(clearFrame(effect, create(42), 220)).toBeNull();
    clearFrame(effect, before, 300);
    clearFrame(effect, after, 310);
    expect(clearFrame(effect, update(after, "primary"), 320)).toBeNull();
  });

  it("removes the flash for reduced motion and ignores invalid saved effect data", () => {
    const { before, after } = clearFour();
    const effect: ClearEffect = {};
    clearFrame(effect, before, 100);
    expect(clearFrame(effect, after, 110, true)).toBeNull();
    expect(clearFrame(effect, after, 150)).toBeNull();
    clearFrame(effect, before, 200);
    const corrupt = { ...after, lineClear: [{ y: 100, cells: [] }] };
    expect(clearFrame(effect, corrupt, 210)).toBeNull();
  });
});
