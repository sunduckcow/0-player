import { describe, expect, it, vi } from "vitest";
import type { GameDefinition } from "@/engine/contracts/cartridge";
import type { GameState } from "@/engine/contracts/game";
import { nextSeed } from "@/engine/lib/random";
import { createRegistry } from "../registry";
import { createCartridge } from "../cartridge";

interface State extends GameState {
  nested: { values: number[] };
  seed: number;
}
type Options = { step: number; decoration: boolean };
const fixture = () => {
  const initialize = vi.fn((state: State, seed: number) => ({
    ...state,
    seed,
  }));
  const definition = {
    metadata: {
      id: "fixture",
      title: "Fixture",
      description: "",
      icon: "gamepad",
    },
    defaultState: { score: 0, over: false, nested: { values: [] }, seed: 0 },
    initialize,
    settings: {
      normalize: (raw: unknown): Options => {
        const value = raw as Partial<Options> | null;
        return {
          step: Number(value?.step) || 1,
          decoration: value?.decoration === true,
        };
      },
      validate: () => ({}),
      fields: [],
      effect: (a: Readonly<Options>, b: Readonly<Options>) =>
        a.step !== b.step
          ? ("rules" as const)
          : a.decoration !== b.decoration
            ? ("presentation" as const)
            : ("none" as const),
    },
    persistence: {
      version: 1,
      decode: (raw: unknown, version: number) =>
        version === 1 && raw && typeof raw === "object" && "nested" in raw
          ? (raw as State)
          : null,
    },
    configure: (options: Readonly<Options>) => ({
      strategy: "Jump",
      width: 100,
      height: 100,
      tickMs: 100,
      controls: [{ action: "jump" as const, keys: ["j"], label: "Jump" }],
      update: (state: State) => ({
        ...state,
        score: state.score + options.step,
        nested: { values: [...state.nested.values, options.step] },
      }),
      ai: () => "jump" as const,
      render: () => {},
      metrics: () => [],
      recovery: { steps: 2, canResume: () => false },
    }),
  } satisfies GameDefinition<State, Options, "jump">;
  return { definition, initialize };
};

describe("engine-owned game instances", () => {
  it("deeply clones a frozen default for every new session and leaves the definition untouched", () => {
    const { definition } = fixture();
    Object.freeze(definition.defaultState.nested.values);
    Object.freeze(definition.defaultState.nested);
    Object.freeze(definition.defaultState);
    Object.freeze(definition);
    const before = JSON.stringify(definition);
    const game = createCartridge(definition);
    const first = game.start(42),
      second = game.start(42);
    expect(first.session.state).toEqual(second.session.state);
    expect(first.session.state).not.toBe(second.session.state);
    const a = first.session.state as State,
      b = second.session.state as State;
    expect(a.nested).not.toBe(b.nested);
    expect(a.nested.values).not.toBe(definition.defaultState.nested.values);
    a.nested.values.push(7);
    expect(b.nested.values).toEqual([]);
    expect(JSON.stringify(definition)).toBe(before);
  });
  it("supports games without an initializer and uses the declared default values", () => {
    const { definition } = fixture();
    const game = createCartridge({
      ...definition,
      initialize: undefined,
      defaultState: { ...definition.defaultState, score: 17 },
    });
    expect(game.start(1).session.state.score).toBe(17);
    expect(game.start(2).session.state.score).toBe(17);
  });
  it("isolates settings, state and ownership across engines sharing the same catalog", () => {
    const { definition } = fixture();
    const first = createRegistry([definition]),
      second = createRegistry([definition]);
    first[0]!.initialize({ step: 4 });
    expect(second[0]!.values.step).toBe(1);
    const a = first[0]!.start(42),
      b = second[0]!.start(42);
    a.session.advance(100);
    b.session.advance(100);
    expect(a.session.state.score).toBe(4);
    expect(b.session.state.score).toBe(1);
    expect(() => first[0]!.apply(b, { step: 2, decoration: false })).toThrow();
    expect(definition.defaultState.score).toBe(0);
  });
  it("does not initialize again for restore, presentation or a rules snapshot", () => {
    const { definition, initialize } = fixture();
    const game = createCartridge(definition);
    const active = game.start(42);
    active.session.advance(100);
    const saved = active.session.snapshot();
    expect(active.restore(saved)).toBe(true);
    const presented = game.apply(active, { step: 1, decoration: true });
    const rebound = game.apply(presented, { step: 2, decoration: true });
    expect(rebound.session.snapshot()).toEqual(saved);
    expect(initialize).toHaveBeenCalledTimes(1);
  });
  it("uses the same initializer with fresh clones for restart and recovery fallback", () => {
    const { definition, initialize } = fixture();
    const game = createCartridge(definition),
      active = game.start(42);
    active.session.restart();
    expect(initialize).toHaveBeenLastCalledWith(
      expect.anything(),
      active.session.seed,
      expect.anything(),
    );
    const seed = active.session.seed;
    active.session.state = { ...active.session.state, over: true };
    active.session.advance(100);
    const fallback = active.session.snapshot();
    expect(fallback.seed).toBe(nextSeed(seed));
    expect(initialize).toHaveBeenLastCalledWith(
      expect.anything(),
      fallback.seed,
      expect.anything(),
    );
    expect(initialize).toHaveBeenCalledTimes(3);
    expect(new Set(initialize.mock.calls.map(([state]) => state)).size).toBe(3);
  });
  it("rejects duplicate registrations and accepts heterogeneous state/settings/actions", () => {
    const { definition } = fixture();
    expect(() => createRegistry([definition, definition])).toThrow();
    const other = {
      metadata: {
        id: "other",
        title: "Other",
        description: "",
        icon: "gamepad",
      },
      defaultState: { score: 5, over: false, extra: "value" },
      settings: {
        normalize: () => ({ enabled: true }),
        fields: [],
        validate: () => ({}),
        effect: () => "none" as const,
      },
      persistence: {
        version: 1,
        decode: (raw: unknown) =>
          raw as { score: number; over: boolean; extra: string },
      },
      configure: () => ({
        strategy: "",
        width: 10,
        height: 10,
        tickMs: 100,
        controls: [],
        update: (state: { score: number; over: boolean; extra: string }) =>
          state,
        ai: () => null,
        render: () => {},
        metrics: () => [],
      }),
    } satisfies GameDefinition<
      { score: number; over: boolean; extra: string },
      { enabled: boolean },
      "hold"
    >;
    const games = createRegistry([definition, other]);
    expect(games.map((game) => game.start(42).session.state.score)).toEqual([
      0, 5,
    ]);
  });
});

// Compile-time contract: malformed defaults cannot pass registry validation.
function checkRegistrationTypes() {
  const { definition } = fixture();
  const wrong = { ...definition, defaultState: { score: 0, over: false } };
  // @ts-expect-error Default state lacks the shape required by initializer/update/codec.
  createRegistry([wrong]);
}
void checkRegistrationTypes;
