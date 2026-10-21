import { describe, expect, it } from "vitest";
import { createCartridge } from "../cartridge";
import type { GameState } from "@/engine/contracts/game";

interface Counter extends GameState {
  count: number;
}
const fixture = (resumable = false) =>
  createCartridge<Counter, { step: number; decoration: boolean }, "jump">({
    defaultState: { count: 0, score: 0, over: false },
    metadata: {
      id: "fixture",
      title: "Fixture",
      description: "",
      icon: "gamepad",
    },
    settings: {
      normalize: (raw) => {
        const v = raw as Record<string, unknown> | null;
        return {
          step: Number(v?.step) || 1,
          decoration: v?.decoration === true,
        };
      },
      validate: (raw) => {
        const errors: Record<string, string> = {};
        if (!(Number(raw.step) > 0)) errors.step = "Positive step required";
        return errors;
      },
      fields: [
        {
          key: "step",
          kind: "number",
          label: "Step",
          min: 1,
          max: 10,
          step: 1,
        },
      ],
      effect: (a, b) =>
        a.step !== b.step
          ? "rules"
          : a.decoration !== b.decoration
            ? "presentation"
            : "none",
    },
    persistence: {
      version: 1,
      decode: (raw) => {
        const s = raw as Counter | null;
        return s &&
          typeof s.count === "number" &&
          s.score === s.count &&
          s.over === false
          ? s
          : null;
      },
    },
    configure: (options) => ({
      strategy: "Jump",
      width: 100,
      height: 100,
      tickMs: 100,
      controls: [
        {
          action: "jump",
          keys: ["j"],
          label: "Jump",
          role: "primary",
          repeat: true,
        },
      ],
      update: (s) => ({
        count: s.count + options.step,
        score: s.count + options.step,
        over: false,
      }),
      recovery: { steps: 2, canResume: () => resumable },
      ai: () => "jump",
      render: () => {},
      metrics: () => [],
    }),
  });

describe("cartridge SDK", () => {
  it("runs custom action ids and a state without a mandatory rng field", () => {
    const module = fixture();
    const active = module.start(42);
    active.session.advance(100);
    expect(active.session.state.score).toBe(1);
    expect(active.session.mode).toBe("auto");
    expect(module.decode(active.session.state, 1)).not.toBeNull();
  });
  it("preserves Session identity and history for presentation and no-op settings", () => {
    const module = fixture();
    const active = module.start(42);
    active.session.advance(100);
    active.session.setSpeed(4);
    active.session.togglePause();
    const saved = active.session.snapshot();
    expect(module.apply(active, { step: 1, decoration: true }).session).toBe(
      active.session,
    );
    expect(active.session.snapshot()).toEqual(saved);
    expect(module.apply(active, { step: 1, decoration: true })).toBe(active);
  });
  it("applies rules through the full stable snapshot and rejects invalid drafts atomically", () => {
    const module = fixture();
    const active = module.start(42);
    active.session.advance(100);
    active.session.takeControl();
    active.session.togglePause();
    active.session.setSpeed(4);
    const saved = active.session.snapshot();
    expect(() => module.apply(active, { step: 0 })).toThrow();
    expect(() =>
      module.apply(active, { step: 11, decoration: false }),
    ).toThrow();
    expect(active.session.snapshot()).toEqual(saved);
    const next = module.apply(active, { step: 2, decoration: false });
    expect(next.session.snapshot()).toEqual(saved);
    next.session.togglePause();
    next.session.input("jump");
    next.session.advance(100);
    expect(next.session.state.score).toBe(3);
  });
  it("rejects incompatible state payloads and codec versions", () => {
    const module = fixture();
    expect(module.rules.controls[0]!.role).toBe("primary");
    // Full conflict combinations are covered by input layout tests.
    expect(module.decode({ score: 1, over: false, count: 0 }, 1)).toBeNull();
    expect(module.decode({ score: 0, over: false, count: 0 }, 99)).toBeNull();
  });
});

it.each([true, false])(
  "takes the complete stable recovery snapshot on rules changes (target=%s)",
  (resumable) => {
    const module = fixture(resumable);
    const active = module.start(42);
    active.session.advance(100);
    active.session.state = { ...active.session.state, over: true };
    active.session.advance(100);
    expect(active.session.recovering).toBe(true);
    const stable = active.session.snapshot();
    const next = module.apply(active, { step: 2, decoration: false });
    expect(next.session.snapshot()).toEqual(stable);
    expect(next.session.recovering).toBe(false);
    expect(next.session.seed === 42).toBe(resumable);
    expect(next.session.round).toBe(resumable ? 1 : 2);
  },
);
it("keeps the same pending recovery phase for a presentation change", () => {
  const module = fixture();
  const active = module.start(42);
  active.session.advance(100);
  active.session.state = { ...active.session.state, over: true };
  active.session.advance(100);
  const phase = active.session.recoveryFrame();
  const saved = active.session.snapshot();
  const next = module.apply(active, { step: 1, decoration: true });
  expect(next.session).toBe(active.session);
  expect(next.session.recoveryFrame()).toEqual(phase);
  expect(next.session.snapshot()).toEqual(saved);
});
