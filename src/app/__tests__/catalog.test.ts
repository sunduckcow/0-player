import { createCartridge } from "@/engine/runtime/cartridge";
import snake from "@/games/snake";
import tetris from "@/games/tetris";
import { catalog } from "../catalog";
import { describe, expect, it } from "vitest";
import snakeDefinition from "@/games/snake";
import tetrisDefinition from "@/games/tetris";

describe("configured cartridges", () => {
  it("keeps live Session and rules on a skin change, but swaps AI through the stable snapshot", () => {
    const game = createCartridge(snakeDefinition);
    const active = game.start(42);
    active.session.advance(500);
    active.session.takeControl();
    active.session.setSpeed(4);
    active.session.togglePause();
    const saved = active.session.snapshot();
    const updated = game.apply(active, { ...game.values, skin: "tapered" });
    expect(updated.session).toBe(active.session);
    expect(updated.session.snapshot()).toEqual(saved);
    const different = game.apply(updated, { ...game.values, ai: "safe" });
    expect(different.session).not.toBe(updated.session);
    expect(different.session.snapshot()).toEqual(saved);
  });
  it("keeps pause, RNG and session for Tetris display settings", () => {
    const game = createCartridge(tetrisDefinition);
    const active = game.start(42);
    active.session.advance(800);
    active.session.togglePause();
    const saved = active.session.snapshot();
    const next = game.apply(active, { showGhost: false, showNext: false });
    expect(next.session).toBe(active.session);
    expect(next.session.snapshot()).toEqual(saved);
    expect(game.rules.labels).toEqual([]);
  });
  it("rejects a session from a different cartridge", () => {
    const game = createCartridge(snakeDefinition);
    expect(() =>
      game.apply(createCartridge(tetrisDefinition).start(42), {
        ...game.values,
        skin: "tapered",
      }),
    ).toThrow();
  });
  it("restarts dimensions without restoring an incompatible board", () => {
    const game = createCartridge(snakeDefinition);
    const active = game.start(42);
    active.session.takeControl();
    active.session.setSpeed(4);
    const next = game.apply(active, { ...game.values, columns: 12, rows: 12 });
    expect(next.session.seed).toBe(42);
    expect(next.session.mode).toBe("human");
    expect(next.session.autoSpeed).toBe(4);
    expect(game.compatible(active.session.state)).toBe(false);
    expect(game.compatible(next.session.state)).toBe(true);
  });
});

it("applies numeric drafts from custom inputs instead of silently restoring default dimensions", () => {
  const game = createCartridge(snakeDefinition);
  const active = game.start(42);
  const draft = { ...game.values, columns: "18", rows: "12" };
  expect(game.validate(draft)).toEqual({});
  const next = game.apply(active, draft);
  expect(game.values.columns).toBe(18);
  expect(game.values.rows).toBe(12);
  expect(game.rules.width).toBe(360);
  expect(game.rules.height).toBe(240);
  expect(game.compatible(next.session.state)).toBe(true);
});

it("registers the default game objects directly", () => {
  expect(catalog).toEqual([snake, tetris]);
  expect(catalog[0]).toBe(snake);
  expect(catalog[1]).toBe(tetris);
  expect(new Set(catalog.map((game) => game.metadata.id)).size).toBe(
    catalog.length,
  );
});
