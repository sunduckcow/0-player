import { afterEach, describe, expect, it, vi } from "vitest";
import { initialRoute, syncGameUrl, syncFocusUrl } from "../routing";

afterEach(() => vi.unstubAllGlobals());

function at(url: string) {
  const location = new URL(url);
  const replaceState = vi.fn((_state: unknown, _title: string, next: URL) => {
    Object.assign(location, { href: next.href });
  });
  vi.stubGlobal("location", location);
  vi.stubGlobal("history", { replaceState });
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify("remembered"),
  });
  return { location, replaceState };
}

describe("shared URL state", () => {
  it("honors the shared game and zero seed, then falls back to the remembered game", () => {
    at("http://localhost/#game=tetris&seed=0");
    expect(initialRoute("snake")).toMatchObject({ gameId: "tetris", seed: 0 });
    at("http://localhost/");
    expect(initialRoute("snake")).toMatchObject({
      gameId: "remembered",
      seed: undefined,
    });
  });

  it("keeps focus and unrelated query parameters while removing legacy speed", () => {
    const { location } = at(
      "http://localhost/?fullscreen=1&speed=4&v=workspace#game=snake&seed=1",
    );
    syncGameUrl("tetris", 42);
    expect(location.hash).toBe("#game=tetris&seed=42");
    expect(location.searchParams.get("fullscreen")).toBe("1");
    expect(location.searchParams.get("v")).toBe("workspace");
    expect(location.searchParams.has("speed")).toBe(false);
    syncFocusUrl(false);
    expect(location.searchParams.has("fullscreen")).toBe(false);
    syncFocusUrl(true);
    expect(location.searchParams.get("fullscreen")).toBe("1");
  });

  it("still works when browser history is restricted", () => {
    const { replaceState } = at("file:///arcade/index.html#game=snake&seed=1");
    replaceState.mockImplementation(() => {
      throw new Error("restricted");
    });
    expect(() => syncGameUrl("tetris", 42)).not.toThrow();
    expect(() => syncFocusUrl(true)).not.toThrow();
  });
});
