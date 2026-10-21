import { describe, expect, it } from "vitest";
import { Session } from "@/engine/runtime/session";
import { tetris } from "@/games/tetris/__tests__/helpers";

function sessionAtLevel(level: number) {
  const session = new Session(tetris, 42);
  session.restore({
    ...session.snapshot(),
    mode: "human",
    state: { ...session.state, level, lines: (level - 1) * 10 },
  });
  return session;
}

describe("Tetris manual pacing", () => {
  it("gives a person nearly a second before each natural fall on the first level", () => {
    const session = sessionAtLevel(1);
    const y = session.state.piece.y;
    for (let tick = 0; tick < 10; tick++) session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBe(y);
    session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBe(y + 1);
  });

  it("keeps a playable gravity floor when taking over a high-level AI board", () => {
    const session = sessionAtLevel(30);
    const y = session.state.piece.y;
    for (let tick = 0; tick < 3; tick++) session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBe(y);
    session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBe(y + 1);
    session.automate();
    const before = session.state.piece.y;
    session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBeGreaterThan(before);
  });

  it("still moves, soft-drops and hard-drops on the next input tick", () => {
    const session = sessionAtLevel(1);
    const start = session.state.piece;
    session.input("left");
    session.advance(tetris.tickMs);
    expect(session.state.piece.x).toBe(start.x - 1);
    expect(session.state.piece.y).toBe(start.y);
    session.input("down");
    session.advance(tetris.tickMs);
    expect(session.state.piece.y).toBe(start.y + 1);
    session.input("primary");
    session.advance(tetris.tickMs);
    expect(session.state.pieces).toBe(1);
    expect(session.state.over).toBe(false);
  });
});
