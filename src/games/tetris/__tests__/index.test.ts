import { describe, expect, it } from "vitest";
import * as entry from "@/games/tetris";
import { createRegistry } from "@/engine/runtime/registry";

describe("Tetris static entrypoint", () => {
  it("exports only a plain definition and lets the engine own the runtime", () => {
    expect(Object.keys(entry)).toEqual(["default"]);
    const definition = entry.default;
    expect(definition.metadata.id).toBe("tetris");
    expect(Object.getPrototypeOf(definition)).toBe(Object.prototype);
    expect(definition).not.toHaveProperty("start");
    expect(definition).not.toHaveProperty("values");
    const before = JSON.stringify(definition.defaultState);
    const game = createRegistry([definition])[0]!;
    const active = game.start(42);
    expect(game.decode(active.session.state, game.stateVersion)).toEqual(
      active.session.state,
    );
    expect(game.compatible(active.session.state)).toBe(true);
    expect(JSON.stringify(definition.defaultState)).toBe(before);
  });
});
