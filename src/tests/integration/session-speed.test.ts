import { describe, expect, it } from "vitest";
import { Session } from "@/engine/runtime/session";
import { game, type Counter } from "./fixtures/counter-game";

describe("session clock and playback speed", () => {
  it.each([0.5, 1, 2, 4])(
    "applies the same %s× multiplier to games with different base tick lengths",
    (speed) => {
      const fast = new Session({ ...game, id: "fast-counter", tickMs: 100 }, 7);
      const slow = new Session({ ...game, id: "slow-counter", tickMs: 200 }, 7);
      for (const session of [fast, slow]) session.setSpeed(speed);
      const advance = (delta: number) => {
        fast.advanceFrame(delta);
        slow.advanceFrame(delta);
      };
      const fastTickMs = 100 / speed;

      advance(fastTickMs - 1);
      expect([fast.state.score, slow.state.score]).toEqual([0, 0]);
      advance(1);
      expect([fast.state.score, slow.state.score]).toEqual([1, 0]);

      advance(fastTickMs - 1);
      expect([fast.state.score, slow.state.score]).toEqual([1, 0]);
      advance(1);
      expect([fast.state.score, slow.state.score]).toEqual([2, 1]);
    },
  );
  it("eases browser speed while immediately preserving the selected target in saves", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    expect(session.speed).toBe(4);
    expect(session.snapshot().autoSpeed).toBe(4);
    expect(session.playbackSpeed).toBe(1);
    session.advanceFrame(87.5);
    expect(session.playbackSpeed).toBeCloseTo(1.46875);
    session.advanceFrame(87.5);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
  });
  it("retargets a running speed transition without jumping or overshooting", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.setSpeed(0.5, true);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBeCloseTo(1.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(0.5);
  });
  it("keeps progress toward the next tick when smoothly changing speed", () => {
    const session = new Session(game, 7);
    session.advanceFrame(90);
    session.setSpeed(2, true);
    session.advanceFrame(5);
    expect(session.state.score).toBe(0);
    session.advanceFrame(5);
    expect(session.state.score).toBe(1);
  });
  it("integrates a transition independently of browser frame partitioning", () => {
    const slow = { ...game, tickMs: 1000 };
    const whole = new Session(slow, 7);
    const split = new Session(slow, 7);
    whole.setSpeed(4, true);
    split.setSpeed(4, true);
    whole.advanceFrame(350);
    for (let frame = 0; frame < 35; frame++) split.advanceFrame(10);
    // The ramp averages 2.5x: 875ms accumulated, then another32ms at4x crosses one tick.
    expect(whole.state.score).toBe(0);
    expect(split.state.score).toBe(0);
    whole.advanceFrame(31);
    split.advanceFrame(31);
    expect(whole.state.score).toBe(0);
    expect(split.state.score).toBe(0);
    whole.advanceFrame(1);
    split.advanceFrame(1);
    expect(whole.state.score).toBe(1);
    expect(split.state).toEqual(whole.state);
  });
  it("takes over at 1x immediately and can ease back into remembered autopilot speed", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.takeControl();
    expect(session.playbackSpeed).toBe(1);
    expect(session.autoSpeed).toBe(4);
    session.automate(true);
    expect(session.speed).toBe(4);
    expect(session.playbackSpeed).toBe(1);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
  });
  it("freezes a speed transition while paused and discards it on restart or restore", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.togglePause();
    session.advanceFrame(1000);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.togglePause();
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
    session.setSpeed(0.5, true);
    session.advanceFrame(175);
    session.restart();
    expect(session.playbackSpeed).toBe(0.5);
    session.setSpeed(4, true);
    const restored = new Session(game, 9);
    restored.restore(session.snapshot());
    expect(restored.playbackSpeed).toBe(4);
  });
  it("uses immediate rates for reduced motion and direct simulations", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(25, false);
    expect(session.playbackSpeed).toBe(4);
    expect(session.state.score).toBe(1);
    session.setSpeed(0.5, true);
    session.advance(200);
    expect(session.playbackSpeed).toBe(0.5);
    expect(session.state.score).toBe(2);
  });
  it("keeps recovery time real while a speed transition is active at the loss", () => {
    const session = new Session(
      {
        ...game,
        recovery: { steps: 1, durationMs: 500, canResume: () => false },
        update: (state: Counter) => ({ ...state, over: true }),
      },
      7,
    );
    session.setSpeed(4, true);
    session.advanceFrame(100);
    expect(session.recovering).toBe(true);
    session.advanceFrame(499);
    expect(session.recovering).toBe(true);
    session.advanceFrame(1);
    expect(session.recovering).toBe(false);
    expect(session.round).toBe(2);
  });
  it("limits a delayed browser frame to one move instead of repeated AI catch-up", () => {
    const session = new Session(game, 7);
    session.setSpeed(4);
    session.advanceFrame(2000);
    expect(session.state.actions).toEqual(["right"]);
    session.input("left");
    session.advanceFrame(1000);
    expect(session.state.actions).toEqual(["right", "left"]);
    session.togglePause();
    session.advanceFrame(2000);
    expect(session.state.score).toBe(2);
  });
  it("preserves fractional time and the selected speed on healthy browser frames", () => {
    const session = new Session(game, 7);
    session.setSpeed(4);
    for (let frame = 0; frame < 125; frame++) session.advanceFrame(16);
    expect(session.state.score).toBe(80);
    const board = session.state;
    session.advanceFrame(Infinity);
    session.advanceFrame(NaN);
    expect(session.state).toBe(board);
  });
  it("retains the fractional remainder of a long delayed browser frame", () => {
    const session = new Session(game, 7);
    session.advanceFrame(1050);
    expect(session.state.score).toBe(1);
    session.advanceFrame(49);
    expect(session.state.score).toBe(1);
    session.advanceFrame(1);
    expect(session.state.score).toBe(2);
  });
});
