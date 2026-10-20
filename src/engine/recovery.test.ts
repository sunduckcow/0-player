import { describe, expect, it } from "vitest";
import { nextSeed, random } from "@/engine/random";
import { Session } from "@/engine/session";
import type { Action, Game, GameState } from "@/engine/types";

interface Board extends GameState {
  rng: number;
  cells: number[];
  actions: Array<Action | null>;
  won: boolean;
}

function game(overrides: Partial<Game<Board>> = {}): Game<Board> {
  return {
    id: "recovery-board",
    title: "Recovery board",
    description: "",
    strategy: "",
    controls: [],
    width: 100,
    height: 100,
    tickMs: 100,
    recovery: { steps: 2 },
    create: (seed) => ({ score: 0, over: false, rng: seed, cells: [], actions: [], won: false }),
    update: (state, action) => {
      const [cell, rng] = random(state.rng);
      return {
        score: state.score + 1,
        over: action === "left",
        rng,
        cells: [...state.cells, cell],
        actions: [...state.actions, action],
        won: false,
      };
    },
    ai: () => "right",
    render: () => {},
    metrics: () => [],
    ...overrides,
  };
}

function lose(session: Session<Board>) {
  session.input("left");
  session.advance(100);
}

describe("session loss recovery", () => {
  it("keeps real-time recovery duration when browser frames limit normal ticks", () => {
    const session = new Session(game({ recovery: { steps: 2, durationMs: 500 } }), 7);
    session.input("left");
    session.advanceFrame(100);
    expect(session.recovering).toBe(true);
    session.advanceFrame(499);
    expect(session.recovering).toBe(true);
    session.advanceFrame(1);
    expect(session.recovering).toBe(false);
    expect(session.state.score).toBe(0);
    expect(session.round).toBe(1);
    expect(session.mode).toBe("auto");
  });

  it("can keep the loss still until the final rollback for reduced motion", () => {
    const session = new Session(game({ recovery: { steps: 4, durationMs: 500 } }), 7);
    session.advance(500);
    lose(session);
    const lost = session.state;
    session.advance(400, false);
    expect(session.state).toBe(lost);
    session.advance(100, false);
    expect(session.recovering).toBe(false);
    expect(session.state).toBe(session.snapshot().state);
    expect(session.state.score).toBe(2);
  });

  it("plays live history backwards step by step before AI resumes", () => {
    const session = new Session(game({ recovery: { steps: 4, durationMs: 500 } }), 7);
    const history = [session.state];
    for (let tick = 0; tick < 5; tick++) {
      session.advance(100);
      history.push(session.state);
    }
    lose(session);
    const lost = session.state;
    const target = history[2]!;
    session.advance(100);
    expect(session.state).toBe(lost);
    for (let step = 1; step <= 4; step++) {
      session.advance(100);
      expect(session.state).toBe(history[6 - step]);
      expect(session.snapshot().state).toBe(target);
      expect(session.recovering).toBe(step < 4);
    }
    expect(session.mode).toBe("auto");
    expect(session.round).toBe(1);
    expect(session.seed).toBe(7);
    session.advance(100);
    expect(session.state.actions).toEqual([...target.actions, "right"]);
  });

  it("rewinds the same board and RNG without changing seed, round or remembered speed", () => {
    const definition = game();
    const session = new Session(definition, 7);
    session.setSpeed(4);
    session.advance(50);
    const target = session.state;
    session.advance(25);
    session.input("left");
    session.input("down");
    session.advance(100);
    expect(session.recovering).toBe(true);
    expect(session.mode).toBe("auto");
    expect(session.speed).toBe(4);
    expect(session.recoveryFrame()).toEqual({ progress: 0, steps: 2 });
    expect(session.state.over).toBe(true);

    session.advance(319);
    expect(session.recovering).toBe(true);
    session.advance(1);
    expect(session.recovering).toBe(false);
    expect(session.recoveryFrame()).toBe(undefined);
    expect(session.state).toBe(target);
    expect(session.seed).toBe(7);
    expect(session.round).toBe(1);
    expect(session.autoSpeed).toBe(4);
    session.advance(24);
    expect(session.state).toBe(target);
    session.advance(1);
    expect(session.state).toEqual(definition.update(target, "right"));
  });

  it.each([0.5, 2, 4])("uses unscaled recovery time at %s× autopilot speed", (speed) => {
    const session = new Session(game(), 7);
    session.setSpeed(speed);
    lose(session);
    expect(session.recovering).toBe(true);
    session.advance(80);
    expect(session.recoveryFrame()).toEqual({ progress: 0.25, steps: 1 });
    session.advance(239);
    expect(session.recovering).toBe(true);
    session.advance(1);
    expect(session.recovering).toBe(false);
    expect(session.speed).toBe(speed);
    expect(session.state.over).toBe(false);
  });

  it("uses an older safe position when the requested rollback still loses", () => {
    const session = new Session(game({ recovery: { steps: 2, durationMs: 40, canResume: (state) => state.score <= 1 } }), 7);
    session.advance(100);
    const safe = session.state;
    session.advance(400);
    lose(session);
    expect(session.recovering).toBe(true);
    expect(session.recoveryFrame()).toEqual({ progress: 0, steps: 5 });
    session.advance(40);
    expect(session.state).toBe(safe);
    session.advance(100);
    expect(session.state.score).toBe(2);
  });

  it("freezes the recovery phase while paused without losing progress on clock resets", () => {
    const session = new Session(game(), 7);
    lose(session);
    expect(session.recovering).toBe(true);
    session.advance(80);
    session.togglePause();
    session.advance(1000);
    session.resetClock();
    expect(session.recoveryFrame()).toEqual({ progress: 0.25, steps: 1 });
    session.togglePause();
    session.advance(239);
    expect(session.recovering).toBe(true);
    session.advance(1);
    expect(session.recovering).toBe(false);
    expect(session.state.score).toBe(0);
  });

  it("ignores takeover and movement during recovery while automate leaves the phase intact", () => {
    const session = new Session(game(), 7);
    session.input("left");
    session.input("down");
    session.advance(100);
    expect(session.recovering).toBe(true);
    const lost = session.state;
    session.input("primary");
    session.input("up");
    session.takeControl();
    session.automate();
    session.resetClock();
    expect(session.state).toBe(lost);
    expect(session.mode).toBe("auto");
    expect(session.recovering).toBe(true);
    session.advance(320);
    session.takeControl();
    session.advance(100);
    expect(session.state.actions).toEqual([null]);
  });

  it("lets restart cancel a pending rollback and keeps the fresh board's RNG", () => {
    const session = new Session(game(), 7);
    session.advance(300);
    lose(session);
    expect(session.recovering).toBe(true);
    session.restart(99);
    expect(session.recovering).toBe(false);
    expect(session.state).toEqual({ score: 0, over: false, rng: 99, cells: [], actions: [], won: false });
    expect(session.seed).toBe(99);
    expect(session.round).toBe(2);
    session.advance(400);
    expect(session.state.score).toBe(4);
    expect(session.seed).toBe(99);
  });

  it("excludes victories from recovery and preserves their normal terminal behavior", () => {
    const definition = game();
    const session = new Session(game({
      recovery: { steps: 2, isLoss: (state) => state.over && !state.won },
      update: (state, action) => ({ ...definition.update(state, action), over: true, won: true }),
    }), 7);
    session.takeControl();
    session.advance(100);
    expect(session.recovering).toBe(false);
    expect(session.mode).toBe("human");
    session.advance(2000);
    expect(session.round).toBe(1);
    expect(session.state.won).toBe(true);
    session.automate();
    session.advance(1500);
    expect(session.round).toBe(2);
  });

  it("leaves terminal behavior unchanged for games without recovery", () => {
    const session = new Session(game({ recovery: undefined }), 7);
    lose(session);
    expect(session.recovering).toBe(false);
    session.advance(2000);
    expect(session.round).toBe(1);
    expect(session.mode).toBe("human");
    session.automate();
    session.advance(1499);
    expect(session.round).toBe(1);
    session.advance(1);
    expect(session.round).toBe(2);
  });

  it("falls back to a fresh AI round when a loaded loss has no live history", () => {
    const session = new Session(game(), 7);
    session.restore({ ...session.snapshot(), mode: "human", state: { ...session.state, over: true } });
    session.advance(1);
    expect(session.recovering).toBe(true);
    expect(session.mode).toBe("auto");
    expect(session.recoveryFrame()).toEqual({ progress: 0, steps: 0 });
    session.advance(319);
    expect(session.round).toBe(1);
    session.advance(1);
    expect(session.recovering).toBe(false);
    expect(session.state.over).toBe(false);
    expect(session.seed).toBe(nextSeed(7));
    expect(session.round).toBe(2);
  });

  it("saves a stable fresh AI round when recovery has no usable target", () => {
    const definition = game();
    const session = new Session(definition, 0xffffffff);
    session.restore({ ...session.snapshot(), mode: "human", state: { ...session.state, over: true } });
    session.advance(1);
    const saved = session.snapshot();
    expect(saved.state.over).toBe(false);
    expect(saved).toEqual({ state: definition.create(nextSeed(0xffffffff)), mode: "auto", paused: false, speed: 1, autoSpeed: 1, round: 2, seed: nextSeed(0xffffffff) });
    expect(session.snapshot().state).toBe(saved.state);
    expect(session.recovering).toBe(true);
    expect(session.seed).toBe(0xffffffff);
    expect(session.round).toBe(1);
    const restored = new Session(definition, 7);
    restored.restore(saved);
    restored.advance(100);
    expect(restored.recovering).toBe(false);
    expect(restored.state.score).toBe(1);
    session.advance(320);
    expect(session.snapshot()).toEqual(saved);
  });

  it.each([{ steps: 2, ticks: 20 }, { steps: 1000, ticks: 260 }])(
    "does not retain safe positions beyond the bounded history ($steps rollback steps)",
    ({ steps, ticks }) => {
      const session = new Session(game({ recovery: { steps, canResume: (state) => state.score === 0 } }), 7);
      for (let tick = 0; tick < ticks; tick++) session.advance(100);
      lose(session);
      expect(session.recovering).toBe(true);
      session.advance(320);
      expect(session.round).toBe(2);
      expect(session.seed).toBe(nextSeed(7));
      expect(session.mode).toBe("auto");
    },
  );

  it("stops an inevitable loss loop after two rescues", () => {
    const definition = game();
    const session = new Session(game({
      update: (state, action) => ({ ...definition.update(state, action), over: state.score >= 5 }),
    }), 7);
    session.setSpeed(2);
    session.advance(300);
    expect(session.recovering).toBe(true);
    for (let attempt = 0; attempt < 2; attempt++) {
      session.advance(320);
      expect(session.state.score).toBe(4);
      expect(session.round).toBe(1);
      session.advance(100);
      expect(session.recovering).toBe(true);
    }
    session.advance(320);
    expect(session.round).toBe(2);
    expect(session.seed).toBe(nextSeed(7));
    expect(session.speed).toBe(2);
    expect(session.state.score).toBe(0);
  });

  it("gives a new manual takeover a fresh rescue budget", () => {
    const session = new Session(game(), 7);
    for (let attempt = 0; attempt < 3; attempt++) {
      session.advance(400);
      lose(session);
      expect(session.recovering).toBe(true);
      session.advance(320);
      expect(session.round).toBe(1);
      expect(session.state.over).toBe(false);
    }
  });

  it("saves the live rollback target in auto mode and restores without a pending phase", () => {
    const session = new Session(game(), 7);
    session.setSpeed(4);
    session.advance(50);
    const safe = session.state;
    session.advance(25);
    lose(session);
    expect(session.recovering).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot).toEqual({ state: safe, mode: "auto", paused: false, speed: 4, autoSpeed: 4, round: 1, seed: 7 });
    session.restore(snapshot);
    expect(session.recovering).toBe(false);
    session.advance(24);
    expect(session.state).toBe(safe);
    session.advance(1);
    expect(session.state.actions).toEqual(["right", "right", "right"]);
  });

  it("clears previous history when restoring another live board", () => {
    const session = new Session(game({ recovery: { steps: 2, canResume: (state) => state.score === 0 } }), 7);
    session.advance(300);
    session.restore({ ...session.snapshot(), state: { ...session.state, score: 20 } });
    lose(session);
    expect(session.recovering).toBe(true);
    session.advance(320);
    expect(session.round).toBe(2);
    expect(session.seed).toBe(nextSeed(7));
    expect(session.state.score).toBe(0);
  });
});
