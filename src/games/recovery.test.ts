import { describe, expect, it } from "vitest";
import type { Game, GameState } from "@/engine/types";
import { Session } from "@/engine/session";
import { createSnakeGame, type SnakeState } from "@/games/snake";
import { tetris } from "@/games/tetris";
import type { TetrisState } from "@/games/tetris/game";

function autoplay<S extends GameState>(game: Game<S>, initial: S, ticks: number): S {
  let state = initial;
  for (let tick = 0; tick < ticks && !state.over; tick++)
    state = game.update(state, game.ai(state));
  return state;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

function topOutTrap(): TetrisState {
  const state = tetris.create(42);
  // A human moved above a side tower. Dropping here loses, while moving
  // right first opens the empty part of the board for this and later pieces.
  state.piece = { kind: "O", x: 0, y: -1, rotation: 0 };
  state.pieceAge = 20;
  for (let y = 1; y < 20; y++) state.board[y]![0] = 1;
  return state;
}

describe("cartridge recovery candidates", () => {
  it.each(["explorer", "safe"] as const)(
    "lets %s save a pre-collision Snake position after a manual mistake",
    (ai) => {
      const game = createSnakeGame({ ai, columns: 12, rows: 12 });
      let candidate = game.create(42);
      while (candidate.body[0]!.x < candidate.columns - 1)
        candidate = game.update(candidate, "right");
      expect(game.update(candidate, "right").over).toBe(true);
      expect(game.recovery!.canResume!(candidate)).toBe(true);
      expect(autoplay(game, candidate, 16).over).toBe(false);
    },
  );

  it("rejects a trapped Snake state even when it is not marked over yet", () => {
    const game = createSnakeGame({ columns: 8, rows: 8 });
    const trapped: SnakeState = {
      ...game.create(42), direction: "up",
      body: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
      food: { x: 6, y: 6 },
    };
    expect(trapped.over).toBe(false);
    expect(game.recovery!.canResume!(trapped)).toBe(false);
  });

  it("excludes a real Snake victory from losses and allows a preview to win", () => {
    const game = createSnakeGame({ columns: 8, rows: 8 });
    const tour: SnakeState["body"] = [];
    for (let y = 0; y < 8; y++) {
      const row = Array.from({ length: 7 }, (_, x) => x + 1);
      for (const x of y % 2 ? row.reverse() : row) tour.push({ x, y });
    }
    for (let y = 7; y >= 0; y--) tour.push({ x: 0, y });
    const candidate: SnakeState = {
      ...game.create(42), body: tour.slice(0, -1).reverse(), direction: "up",
      food: tour.at(-1)!, score: 59,
    };
    const won = game.update(candidate, "up");
    expect(won.won).toBe(true);
    expect(game.recovery!.isLoss!(won)).toBe(false);
    expect(game.recovery!.canResume!(candidate)).toBe(true);
  });

  it("rescues a Tetris top-out through normal AI actions", () => {
    const candidate = topOutTrap();
    expect(tetris.update(candidate, "primary").over).toBe(true);
    expect(tetris.recovery!.canResume!(candidate)).toBe(true);
    const continued = autoplay(tetris, candidate, 48);
    expect(continued.over).toBe(false);
    expect(continued.pieces).toBeGreaterThan(candidate.pieces);
  });

  it("rejects an unavoidable Tetris top-out", () => {
    const candidate = topOutTrap();
    for (let y = 1; y < 20; y++) candidate.board[y]!.fill(1);
    expect(tetris.recovery!.canResume!(candidate)).toBe(false);
  });

  it("previews frozen boards without changing cells, random state or timing", () => {
    const snake = createSnakeGame();
    const snakeState = freeze(snake.create(705));
    const tetrisState = freeze(topOutTrap());
    const before = JSON.stringify([snakeState, tetrisState]);
    expect(snake.recovery!.canResume!(snakeState)).toBe(true);
    expect(tetris.recovery!.canResume!(tetrisState)).toBe(true);
    expect(JSON.stringify([snakeState, tetrisState])).toBe(before);
  });
});

describe("cartridge recovery in the shared session", () => {
  it("moves Snake back through several distinct cells before handing off", () => {
    const game = createSnakeGame({ columns: 12, rows: 12 });
    const session = new Session(game, 42);
    session.takeControl();
    while (!session.recovering) session.advance(game.tickMs);
    const positions = [session.state.body[0]!.x];
    for (let elapsed = 0; elapsed < game.recovery!.durationMs!; elapsed += 20) {
      session.advance(20);
      const x = session.state.body[0]!.x;
      if (positions.at(-1) !== x) positions.push(x);
    }
    expect(positions.length).toBeGreaterThanOrEqual(4);
    expect(positions.slice(1).every((x, i) => x === positions[i]! - 1)).toBe(true);
    expect(session.recovering).toBe(false);
    expect(session.mode).toBe("auto");
    expect(session.round).toBe(1);
  });

  it("raises historical Tetris pieces row by row while restoring the stack", () => {
    const session = new Session(tetris, 42);
    const state = tetris.create(42);
    state.piece = { kind: "O", x: 4, y: -1, rotation: 0 };
    for (let y = 7; y < 20; y++) state.board[y]![4] = 1;
    session.restore({ ...session.snapshot(), state, mode: "human" });
    for (let tick = 0; tick < 60 && !session.recovering; tick++) {
      session.input("down");
      session.advance(tetris.tickMs);
    }
    expect(session.recovering).toBe(true);
    const rows = new Map<number, number[]>();
    for (let elapsed = 0; elapsed < tetris.recovery!.durationMs!; elapsed += 24) {
      session.advance(24);
      if (session.state.over) continue;
      const ys = rows.get(session.state.pieces) ?? [];
      ys.push(session.state.piece.y);
      rows.set(session.state.pieces, ys);
    }
    expect([...rows.values()].some(ys => ys[0]! - ys.at(-1)! >= 3)).toBe(true);
    for (const ys of rows.values())
      expect(ys.slice(1).every((y, i) => y <= ys[i]!)).toBe(true);
    expect(session.state.board).toEqual(state.board);
    expect(session.recovering).toBe(false);
    expect(session.mode).toBe("auto");
    expect(session.seed).toBe(42);
    expect(session.round).toBe(1);
  });

  it.each(["explorer", "safe"] as const)(
    "rewinds a manual Snake wall crash and resumes %s on the same seed",
    (ai) => {
      const game = createSnakeGame({ ai, columns: 12, rows: 12 });
      const session = new Session(game, 42);
      session.takeControl();
      for (let tick = 0; tick < 12 && !session.recovering; tick++)
        session.advance(game.tickMs);
      expect(session.recovering).toBe(true);
      session.advance(game.recovery!.durationMs!);
      expect(session.recovering).toBe(false);
      expect(session.mode).toBe("auto");
      expect(session.seed).toBe(42);
      expect(session.round).toBe(1);
      expect(session.state.over).toBe(false);
      for (let tick = 0; tick < 16; tick++) session.advance(game.tickMs);
      expect(session.state.over).toBe(false);
      expect(session.round).toBe(1);
    },
  );

  it("rewinds a manual Tetris top-out without clearing the existing stack", () => {
    const session = new Session(tetris, 42);
    const candidate = topOutTrap();
    session.restore({ ...session.snapshot(), state: candidate, mode: "human" });
    session.input("primary");
    session.advance(tetris.tickMs);
    expect(session.recovering).toBe(true);
    session.advance(tetris.recovery!.durationMs!);
    expect(session.recovering).toBe(false);
    expect(session.mode).toBe("auto");
    expect(session.state.over).toBe(false);
    expect(session.state.board).toEqual(candidate.board);
    expect(session.round).toBe(1);
    for (let tick = 0; tick < 48; tick++) session.advance(tetris.tickMs);
    expect(session.state.over).toBe(false);
    expect(session.state.pieces).toBeGreaterThan(candidate.pieces);
  });
});
