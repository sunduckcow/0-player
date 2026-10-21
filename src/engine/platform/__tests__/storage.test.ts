import { createCartridge } from "@/engine/runtime/cartridge";
import snakeDefinition from "@/games/snake";
import tetrisDefinition from "@/games/tetris";
const modules = {
  snake: createCartridge(snakeDefinition),
  tetris: createCartridge(tetrisDefinition),
};
import { describe, expect, it } from "vitest";
import { create as createTetris } from "@/games/tetris/__tests__/helpers";
import { loadSession, saveSession } from "@/engine/platform/storage";
import { Session } from "@/engine/runtime/session";
import { nextSeed } from "@/engine/lib/random";
import { tetris } from "@/games/tetris/__tests__/helpers";
import { createSnakeGame } from "@/games/snake/__tests__/helpers";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("saved games", () => {
  it("continues the exact board, random sequence, control mode and speed after restoring", () => {
    const store = memory();
    const original = new Session(tetris, 705);
    original.input("left");
    original.advance(160);
    original.setSpeed(2);
    saveSession(modules.tetris, original.snapshot(), store);
    const saved = loadSession(modules.tetris, store)!;
    const restored = new Session(tetris, 1);
    restored.restore(saved as ReturnType<typeof original.snapshot>);
    expect(restored.snapshot()).toEqual(original.snapshot());
    original.automate();
    restored.automate();
    for (let tick = 0; tick < 100; tick++) {
      original.advance(80);
      restored.advance(80);
    }
    expect(restored.state).toEqual(original.state);
    restored.restart();
    expect(restored.seed).toBe(nextSeed(705));
    expect(restored.state).toEqual(createTetris(nextSeed(705)));
    expect(loadSession(modules.tetris, store)!.state).not.toEqual(
      restored.state,
    );
  });

  it("keeps games separate and rejects corrupt or incompatible saved boards", () => {
    const store = memory();
    const session = new Session(tetris, 42);
    saveSession(modules.tetris, session.snapshot(), store);
    expect(loadSession(modules.snake, store)).toBeNull();
    store.setItem("0-player:save:tetris", "{");
    expect(loadSession(modules.tetris, store)).toBeNull();
    store.setItem(
      "0-player:save:tetris",
      JSON.stringify({
        version: 1,
        ...session.snapshot(),
        state: { ...session.state, piece: { kind: "oops" } },
      }),
    );
    expect(loadSession(modules.tetris, store)).toBeNull();
    store.setItem(
      "0-player:save:tetris",
      JSON.stringify({
        version: 1,
        ...session.snapshot(),
        state: { ...session.state, board: [] },
      }),
    );
    expect(loadSession(modules.tetris, store)).toBeNull();
    store.setItem(
      "0-player:save:tetris",
      JSON.stringify({
        version: 1,
        ...session.snapshot(),
        state: { ...session.state, bag: [] },
      }),
    );
    expect(loadSession(modules.tetris, store)).toBeNull();
    store.setItem(
      "0-player:save:tetris",
      JSON.stringify({
        version: 1,
        ...session.snapshot(),
        state: { ...session.state, piece: { ...session.state.piece, y: 20 } },
      }),
    );
    expect(loadSession(modules.tetris, store)).toBeNull();
    store.setItem(
      "0-player:save:tetris",
      JSON.stringify({ version: 1, ...session.snapshot(), autoSpeed: "4" }),
    );
    expect(loadSession(modules.tetris, store)).toBeNull();
  });

  it("restores a rectangular Snake board under a different AI without replacing its body", () => {
    const store = memory();
    const original = new Session(
      createSnakeGame({ columns: 18, rows: 12, ai: "explorer" }),
      42,
    );
    original.advance(680);
    original.togglePause();
    saveSession(modules.snake, original.snapshot(), store);
    const restored = new Session(
      createSnakeGame({ columns: 18, rows: 12, ai: "safe" }),
      1,
    );
    restored.restore(
      loadSession(modules.snake, store)! as ReturnType<
        typeof original.snapshot
      >,
    );
    expect(restored.snapshot()).toEqual(original.snapshot());
    expect(restored.state.columns).toBe(18);
    expect(restored.state.rows).toBe(12);
    restored.togglePause();
    restored.advance(85);
    expect(restored.state.over).toBe(false);
  });

  it("works when browser storage is unavailable", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(loadSession(modules.tetris, blocked)).toBeNull();
    expect(() =>
      saveSession(modules.tetris, new Session(tetris, 1).snapshot(), blocked),
    ).not.toThrow();
  });
});
