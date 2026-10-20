import { describe, expect, it } from "vitest";
import { createTetrisGame } from "./index";
import { normalizeTetrisOptions } from "./settings";

describe("Tetris presentation settings", () => {
  it("accepts only boolean saved values and restores defaults for invalid data", () => {
    expect(normalizeTetrisOptions(null)).toEqual({ showGhost: true, showNext: true });
    expect(normalizeTetrisOptions({ showGhost: false, showNext: "no" })).toEqual({ showGhost: false, showNext: true });
  });

  it("keeps the same board, AI and random sequence when presentation options change", () => {
    const visible = createTetrisGame();
    const hidden = createTetrisGame({ showGhost: false, showNext: false });
    let first = visible.create(42);
    let second = hidden.create(42);
    for (let step = 0; step < 200; step++) {
      const action = visible.ai(first);
      expect(hidden.ai(second)).toBe(action);
      first = visible.update(first, action);
      second = hidden.update(second, action);
    }
    expect(first).toEqual(second);
    expect(visible.labels?.map(label => label.text)).toEqual(["Next"]);
    expect(hidden.labels).toEqual([]);
  });
});
