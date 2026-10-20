import { describe, expect, it } from "vitest";
import { ai } from "./ai";
import {
  cells,
  collides,
  create,
  dropY,
  rotate,
  shuffledBag,
  update,
  type Piece,
  type TetrisState,
} from "./game";

function withPiece(
  kind: Piece["kind"],
  x = 3,
  y = 0,
  rotation = 0,
): TetrisState {
  return { ...create(42), piece: { kind, x, y, rotation }, fall: 0 };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const entry of Object.values(value)) freeze(entry);
  }
  return value;
}

describe("Tetris rules", () => {
  it("shuffles deterministic seven-piece bags without repeats", () => {
    const first = shuffledBag(42);
    expect(first).toEqual(shuffledBag(42));
    expect(new Set(first.bag).size).toBe(7);
    expect(first.bag).toHaveLength(7);
    expect(shuffledBag(43).bag).not.toEqual(first.bag);
    let state = create(42);
    const active = [state.piece.kind];
    for (let count = 1; count < 7; count++) {
      // Emptying the board isolates the generator from stacking and top-out.
      state = update(
        { ...state, board: state.board.map((row) => row.map(() => 0)) },
        "primary",
      );
      active.push(state.piece.kind);
    }
    expect(new Set(active).size).toBe(7);
  });

  it("rotates four times back to the original shape and kicks away from a wall", () => {
    let state = withPiece("T", 3, 4);
    const original = cells(state.piece);
    for (let count = 0; count < 4; count++)
      state = { ...state, piece: rotate(state.board, state.piece) };
    expect(cells(state.piece)).toEqual(original);
    const atWall = withPiece("I", -2, 5, 1);
    expect(collides(atWall.board, atWall.piece)).toBe(false);
    const kicked = rotate(atWall.board, atWall.piece);
    expect(kicked.rotation).toBe(2);
    expect(collides(atWall.board, kicked)).toBe(false);
    expect(cells(kicked).every(([x]) => x >= 0 && x < 10)).toBe(true);
  });

  it("rejects movement through walls and occupied cells", () => {
    let state = withPiece("O", 0, 18);
    expect(update(state, "left").piece.x).toBe(0);
    state = withPiece("O", 3, 16);
    state.board[17]![2] = 1;
    expect(update(state, "left").piece.x).toBe(3);
  });

  it("hard-drops onto the floor and locks exactly four occupied cells", () => {
    const state = withPiece("T", 3, 0);
    const landed = dropY(state.board, state.piece);
    expect(landed).toBe(18);
    const next = update(state, "primary");
    expect(next.pieces).toBe(state.pieces + 1);
    expect(next.board.flat().filter(Boolean)).toHaveLength(4);
    expect(next.score).toBe(36);
    expect(next.over).toBe(false);
  });

  it("clears four rows, scores the clear and increases the level after ten lines", () => {
    const state = { ...withPiece("I", 2, 0, 1), lines: 8 };
    for (let y = 16; y < 20; y++)
      state.board[y] = Array.from({ length: 10 }, (_, x) => (x === 4 ? 0 : 2));
    const next = update(state, "primary");
    expect(next.lines).toBe(12);
    expect(next.level).toBe(2);
    expect(next.board.flat().some(Boolean)).toBe(false);
    expect(next.score).toBeGreaterThanOrEqual(800);
  });

  it("soft-drops and advances gravity without a person pressing a key", () => {
    let state = withPiece("O", 3, 0);
    state = update(state, "down");
    expect(state.piece.y).toBe(1);
    expect(state.score).toBe(1);
    for (let count = 0; count < 5; count++) state = update(state, null);
    expect(state.piece.y).toBe(2);
    const faster = update({ ...withPiece("O", 3, 0), level: 6, fall: 0 }, null);
    expect(faster.piece.y).toBe(1);
  });

  it("tracks piece age on ordinary ticks and resets it on every spawn", () => {
    let state = create(42);
    expect(state.pieceAge).toBe(0);
    for (const action of [null, "left", "down", "up"] as const)
      state = update(state, action);
    expect(state.pieceAge).toBe(4);
    expect(update(state, "primary").pieceAge).toBe(0);
    expect(
      update({ ...withPiece("O", 3, 18), pieceAge: 9 }, "down").pieceAge,
    ).toBe(0);
    expect(
      update({ ...withPiece("O", 3, 18), pieceAge: 9, fall: 5 }, null).pieceAge,
    ).toBe(0);
  });

  it("ends when a piece locks above the board or the next spawn is blocked", () => {
    const hidden = withPiece("O", 3, -1);
    hidden.board[1]![3] = 2;
    hidden.board[1]![4] = 2;
    expect(update(hidden, "primary").over).toBe(true);
    const blocked = withPiece("O", 0, 18);
    blocked.board[0] = Array.from({ length: 10 }, (_, x) =>
      x >= 3 && x <= 6 ? 3 : 0,
    );
    expect(update(blocked, "primary").over).toBe(true);
  });

  it("never mutates an input state, including during a lock or rotation", () => {
    const state = freeze(withPiece("T", 3, 4));
    const snapshot = JSON.stringify(state);
    for (const action of [
      "up",
      "down",
      "left",
      "right",
      "primary",
      "secondary",
      null,
    ] as const) {
      expect(() => update(state, action)).not.toThrow();
      expect(JSON.stringify(state)).toBe(snapshot);
    }
    expect(update({ ...state, over: true }, "primary").pieces).toBe(
      state.pieces,
    );
  });
});

describe("Tetris autopilot", () => {
  it.each([0, 9])("rotates for the side well at column %i before travelling across the board", (well) => {
    let state = { ...withPiece("I", 3, -1), pieceAge: 0 };
    for (let y = 16; y < 20; y++)
      state.board[y] = Array.from({ length: 10 }, (_, x) => x === well ? 0 : 2);
    const moves: string[] = [];
    for (let tick = 0; tick < 64 && state.pieces === 0; tick++) {
      const action = ai(state);
      if (action) moves.push(action);
      state = update(state, action);
    }
    expect(moves[0]).toBe("up");
    expect(moves).toContain(well === 0 ? "left" : "right");
    const firstSlide = moves.findIndex(move => move === "left" || move === "right");
    expect(moves.lastIndexOf("up")).toBeLessThan(firstSlide);
    expect(moves).not.toContain("primary");
    expect(moves.at(-1)).toBe("down");
    expect(state.lines).toBe(4);
    expect(state.over).toBe(false);
  });

  it("turns and moves with short gaps, then soft-drops without teleporting", () => {
    const starts = new Set<number>();
    const descents = new Set<number>();
    for (const seed of [1, 42, 93, 705]) {
      let state: TetrisState = {
        ...create(seed),
        piece: { kind: "T", x: 3, y: -1, rotation: 0 },
      };
      let firstMove = -1;
      let previousMove = -2;
      let firstDescent = -1;
      for (let tick = 0; tick < 64 && state.pieces === 0; tick++) {
        const action = ai(state);
        expect(action).not.toBe("primary");
        if (tick < 3) expect(action).toBeNull();
        if (action === "left" || action === "right" || action === "up") {
          if (firstMove < 0) firstMove = tick;
          expect(tick - previousMove).toBeGreaterThanOrEqual(2);
          previousMove = tick;
        }
        if (action === "down" && firstDescent < 0) firstDescent = tick;
        const next = update(state, action);
        if (next.pieces === state.pieces)
          expect(next.piece.y - state.piece.y).toBeLessThanOrEqual(2);
        state = next;
      }
      expect(firstMove).toBeGreaterThanOrEqual(3);
      expect(firstMove).toBeLessThanOrEqual(6);
      expect(firstDescent).toBeGreaterThanOrEqual(12);
      expect(firstDescent).toBeLessThanOrEqual(20);
      expect(state.pieces).toBe(1);
      expect(state.over).toBe(false);
      starts.add(firstMove);
      descents.add(firstDescent);
    }
    expect(starts.size).toBeGreaterThan(1);
    expect(descents.size).toBeGreaterThan(1);
  });

  it("uses reproducible per-piece preferences to vary equally good landings", () => {
    const landings = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) {
      const start: TetrisState = {
        ...create(seed),
        piece: { kind: "O", x: 4, y: -1, rotation: 0 },
      };
      const play = () => {
        let state = structuredClone(start);
        const actions = [];
        for (let tick = 0; tick < 64 && state.pieces === 0; tick++) {
          const action = ai(freeze(state));
          actions.push(action);
          state = update(state, action);
        }
        return { state, actions };
      };
      const result = play();
      expect(play()).toEqual(result);
      expect(result.state.pieces).toBe(1);
      const occupied = result.state.board[19]!;
      const column = occupied.findIndex(Boolean);
      landings.add(column);
      expect([0, 8]).toContain(column);
      const directions = new Set(
        result.actions.filter(
          (action) => action === "left" || action === "right",
        ),
      );
      expect(directions.size).toBe(1);
      expect(result.state.board[18]!.filter(Boolean)).toHaveLength(2);
      expect(occupied.filter(Boolean)).toHaveLength(2);
    }
    expect(landings.size).toBeGreaterThan(1);
  });

  it("clears real lines during long action-only simulations", () => {
    for (const seed of [42, 705]) {
      let state = create(seed);
      for (let tick = 0; tick < 3000 && !state.over; tick++)
        {
          const action = ai(state);
          expect(action).not.toBe("primary");
          state = update(state, action);
        }
      expect(state.pieces).toBeGreaterThan(80);
      expect(state.lines).toBeGreaterThan(25);
      expect(state.score).toBeGreaterThan(1000);
    }
  }, 30_000);

  it("recovers after human moves without relying on a remembered plan", () => {
    let state = create(813);
    for (let tick = 0; tick < 50; tick++) state = update(state, ai(state));
    for (const action of [
      "right",
      "right",
      "up",
      "left",
      "down",
      "secondary",
    ] as const)
      state = update(state, action);
    const snapshot = JSON.stringify(state);
    expect(ai(state)).toEqual(ai(structuredClone(state)));
    expect(JSON.stringify(state)).toBe(snapshot);
    const pieces = state.pieces;
    for (let tick = 0; tick < 240 && !state.over; tick++)
      state = update(state, ai(state));
    expect(state.pieces).toBeGreaterThan(pieces + 5);
  }, 10_000);
});
