import { describe, expect, it } from "vitest";
import { Session } from "@/engine/runtime/session";
import { game, type Counter } from "./fixtures/counter-game";
import { nextSeed } from "@/engine/lib/random";

describe("session ownership and lifecycle", () => {
  it.each([0.5, 2, 4])(
    "uses 1× for manual control and restores autopilot speed %s×",
    (speed) => {
      const session = new Session(game, 7);
      session.setSpeed(speed);
      session.advance(100 / speed);
      const board = session.state;
      session.input("left");
      expect(session.state).toBe(board);
      expect(session.speed).toBe(1);
      expect(session.autoSpeed).toBe(speed);
      session.advance(99);
      expect(session.state).toBe(board);
      session.advance(1);
      expect(session.state.actions).toEqual(["right", "left"]);
      session.automate();
      expect(session.speed).toBe(speed);
      session.advance(100 / speed);
      expect(session.state.actions).toEqual(["right", "left", "right"]);
    },
  );
  it("preserves the remembered speed across manual saves, restart and button takeover", () => {
    const original = new Session(game, 7);
    original.setSpeed(4);
    original.togglePause();
    original.takeControl();
    expect(original.speed).toBe(1);
    const restored = new Session(game, 1);
    restored.restore(original.snapshot());
    expect(restored.paused).toBe(true);
    expect(restored.speed).toBe(1);
    restored.restart();
    expect(restored.speed).toBe(1);
    restored.automate();
    expect(restored.speed).toBe(4);
    const legacy = new Session(game, 1);
    legacy.restore({ ...original.snapshot(), autoSpeed: undefined, speed: 2 });
    expect(legacy.speed).toBe(1);
    legacy.automate();
    expect(legacy.speed).toBe(2);
  });
  it("starts in AI, takes over immediately and gives AI the same current board", () => {
    const session = new Session(game, 7);
    session.advance(100);
    expect(session.state.actions).toEqual(["right"]);
    session.input("up");
    expect(session.mode).toBe("human");
    session.advance(100);
    expect(session.state.actions).toEqual(["right", "up"]);
    session.input("left");
    session.automate();
    session.advance(100);
    expect(session.state.actions).toEqual(["right", "up", "right"]);
  });
  it("consumes at most one queued action per tick and bounds rapid input", () => {
    const session = new Session(game, 7);
    for (let i = 0; i < 30; i++) session.input("up");
    session.advance(500);
    expect(session.state.actions).toEqual(["up", "up", "up", "up", "wait"]);
  });
  it("does not advance or queue moves while paused", () => {
    const session = new Session(game, 7);
    session.togglePause();
    session.input("left");
    session.advance(1000);
    expect(session.state.score).toBe(0);
    session.togglePause();
    session.advance(100);
    expect(session.state.actions).toEqual(["wait"]);
  });
  it("caps long frames and resets fractional time on speed changes", () => {
    const session = new Session(game, 7);
    session.advance(60);
    session.setSpeed(2);
    session.advance(49);
    expect(session.state.score).toBe(0);
    session.advance(1);
    expect(session.state.score).toBe(1);
    session.advance(60_000);
    expect(session.state.score).toBe(9);
  });
  it("varies a normal restart, supports explicit replay and clears pending input", () => {
    const seeded = {
      ...game,
      create: (seed: number) => ({ score: seed, over: false, actions: [] }),
    };
    const session = new Session(seeded, 7);
    session.input("down");
    session.restart();
    session.advance(100);
    expect(session.seed).toBe(nextSeed(7));
    expect(session.seed).not.toBe(7);
    expect(session.state).toEqual({
      score: nextSeed(7) + 1,
      over: false,
      actions: ["wait"],
    });
    expect(session.round).toBe(2);
    session.restart(7);
    expect(session.state).toEqual(seeded.create(7));
  });
  it("restarts terminal AI games after a delay, but waits in human mode", () => {
    const terminal = {
      ...game,
      update: (s: Counter) => ({ ...s, over: true }),
    };
    const auto = new Session(terminal, 7);
    auto.advance(100);
    auto.advance(1500);
    expect(auto.round).toBe(2);
    expect(auto.seed).toBe(nextSeed(7));
    const human = new Session(terminal, 7);
    human.input("up");
    human.advance(100);
    human.advance(2000);
    expect(human.round).toBe(1);
    expect(human.state.over).toBe(true);
  });
  it("does not treat a game action as restart; explicit restart alone creates the new board", () => {
    const terminal = {
      ...game,
      update: (s: Counter) => ({ ...s, over: true }),
    };
    const session = new Session(terminal, 7);
    session.input("up");
    session.advance(100);
    expect(session.state.over).toBe(true);
    session.input("primary");
    expect(session.state.over).toBe(true);
    expect(session.round).toBe(1);
    session.restart();
    expect(session.state.over).toBe(false);
    expect(session.mode).toBe("human");
    expect(session.round).toBe(2);
    expect(session.state.actions).toEqual([]);
    expect(session.seed).toBe(nextSeed(7));
  });
  it("never restarts a live board when enabling AI", () => {
    const session = new Session(game, 7);
    session.input("left");
    session.advance(100);
    const board = session.state;
    session.automate();
    expect(session.state).toBe(board);
    expect(session.round).toBe(1);
    expect(session.mode).toBe("auto");
  });
});
