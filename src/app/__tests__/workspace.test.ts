import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRegistry } from "@/engine/runtime/registry";
import { catalog } from "../catalog";
import { createWorkspace } from "../workspace";

let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());
const create = (seed = 42) =>
  createWorkspace(createRegistry(catalog), "snake", seed);

describe("workspace selection and persistence", () => {
  it("restores each board and ownership while sharing the latest engine speed", () => {
    const workspace = create();
    workspace.setSpeed(4, false);
    workspace.active.session.input("up");
    workspace.active.session.advance(85);
    workspace.active.session.togglePause();
    const before = workspace.active.session.snapshot();
    workspace.select("tetris", 7);
    expect(workspace.active.session.autoSpeed).toBe(4);
    workspace.setSpeed(2, false);
    workspace.select("snake");
    expect(workspace.active.session.state).toEqual(before.state);
    expect(workspace.active.session.paused).toBe(true);
    expect(workspace.active.session.mode).toBe("human");
    expect(workspace.active.session.speed).toBe(1);
    expect(workspace.active.session.autoSpeed).toBe(2);
  });

  it("saves the playback pause value rather than a dialog's temporary pause", () => {
    const workspace = create();
    workspace.active.session.togglePause();
    const snapshot = workspace.persist(false);
    expect(snapshot.paused).toBe(false);
    expect(workspace.active.session.paused).toBe(true);
    expect(JSON.parse(stored.get("0-player:save:snake")!).paused).toBe(false);
  });

  it("restores compatible disk saves but starts fresh for a different shared seed", () => {
    const original = create();
    original.active.session.advance(85);
    const snapshot = original.persist(false);
    const restored = create();
    expect(restored.active.session.state).toEqual(snapshot.state);
    const replay = create(43);
    expect(replay.active.session.state).not.toEqual(snapshot.state);
    expect(replay.active.session.seed).toBe(43);
  });

  it("persists presentation settings while keeping the same live Session", () => {
    const workspace = create();
    const session = workspace.active.session;
    workspace.apply({ ...workspace.game.values, skin: "tapered" });
    expect(workspace.active.session).toBe(session);
    expect(JSON.parse(stored.get("0-player:settings:snake")!).skin).toBe(
      "tapered",
    );
  });

  it("keeps the last valid speed and retries best-score storage after a failure", () => {
    const workspace = create();
    workspace.setSpeed(2, false);
    workspace.setSpeed(3, false);
    expect(workspace.speed).toBe(2);
    workspace.active.session.state = {
      ...workspace.active.session.state,
      score: 5,
    };
    vi.stubGlobal("localStorage", {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("unavailable");
      },
    });
    expect(() => workspace.saveBest()).not.toThrow();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    workspace.saveBest();
    expect(stored.get("0-player:best:snake")).toBe("5");
  });
});
