import { describe, expect, it } from "vitest";
import persistence from "@/games/tetris/persistence";
import { create } from "@/games/tetris/__tests__/helpers";

function savedState() {
  return create(42);
}

describe("Tetris persistence", () => {
  it("restores serialized games without replacing their state", () => {
    const saved: unknown = JSON.parse(JSON.stringify(savedState()));
    expect(persistence.decode(saved, 1)).toBe(saved);
    expect(persistence.decode(saved, 2)).toBeNull();
    expect(persistence.decode(null, 1)).toBeNull();
  });

  it.each([
    ["missing rows", { board: [] }],
    ["missing columns", { board: Array.from({ length: 20 }, () => [0]) }],
    ["empty bag", { bag: [] }],
    ["unknown piece in bag", { bag: ["X"] }],
    ["negative seed", { rng: -1 }],
    ["oversized seed", { rng: 0x100000000 }],
    ["negative piece age", { pieceAge: -1 }],
    ["fractional score", { score: 1.5 }],
    ["zero level", { level: 0 }],
    ["non-boolean terminal flag", { over: "false" }],
  ])("rejects a save with %s", (_label, patch) => {
    expect(persistence.decode({ ...savedState(), ...patch }, 1)).toBeNull();
  });

  it.each([
    ["unknown kind", { kind: "X" }],
    ["unknown rotation", { rotation: 4 }],
    ["fractional position", { x: 1.5 }],
    ["out-of-range position", { y: 21 }],
  ])("rejects an active piece with %s", (_label, patch) => {
    const state = savedState();
    expect(
      persistence.decode({ ...state, piece: { ...state.piece, ...patch } }, 1),
    ).toBeNull();
  });

  it("rejects unknown board colors", () => {
    const state = savedState();
    state.board[19]![0] = 8;
    expect(persistence.decode(state, 1)).toBeNull();
  });

  it("allows a colliding spawn only in a terminal state", () => {
    const state = savedState();
    const blocked = { ...state, piece: { kind: "O", x: 4, y: 0, rotation: 0 } };
    state.board[0]![4] = 1;
    expect(persistence.decode(blocked, 1)).toBeNull();
    const terminal = { ...blocked, over: true };
    expect(persistence.decode(terminal, 1)).toBe(terminal);
  });
});
