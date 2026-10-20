import { afterEach, describe, expect, it } from "vitest";
import { catalog, configureTetris } from "@/catalog";

afterEach(() => configureTetris({ showGhost: true, showNext: true }));

describe("cartridge presentation changes", () => {
  it("keeps the live session, pause, RNG and history when Tetris display settings change", () => {
    const active = catalog[1]!.start(42);
    active.session.advance(800);
    active.session.takeControl();
    active.session.setSpeed(4);
    active.session.togglePause();
    const saved = active.session.snapshot();
    configureTetris({ showGhost: false, showNext: false });
    const updated = catalog[1]!.rebindPresentation(active);
    expect(updated.session).toBe(active.session);
    expect(updated.session.snapshot()).toEqual(saved);
    expect(catalog[1]!.labels).toEqual([]);
  });

  it("rejects attaching a different game's presentation to a session", () => {
    expect(() => catalog[0]!.rebindPresentation(catalog[1]!.start(42))).toThrow();
  });
});
