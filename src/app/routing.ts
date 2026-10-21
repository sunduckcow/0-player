import { readPreference } from "@/engine/platform/storage";

function readSeed(value: string | null) {
  if (value === null) return undefined;
  if (/^\d+$/.test(value)) return Number(value) >>> 0;
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export function initialRoute(fallbackId: string) {
  const fragment = new URLSearchParams(location.hash.slice(1));
  const seed = fragment.get("seed");
  return {
    gameId: fragment.get("game") ?? readPreference("last-game", fallbackId),
    seed: readSeed(seed),
    focus: new URLSearchParams(location.search).get("fullscreen") === "1",
  };
}

function replaceUrl(update: (url: URL) => void) {
  const url = new URL(location.href);
  update(url);
  try {
    history.replaceState(null, "", url);
  } catch {
    /* CSS focus and gameplay also work in restricted file:// browsers. */
  }
}

export function syncGameUrl(id: string, seed: number) {
  replaceUrl((url) => {
    url.searchParams.delete("speed");
    url.hash = `game=${id}&seed=${seed}`;
  });
}

export function syncFocusUrl(enabled: boolean) {
  replaceUrl((url) => {
    if (enabled) url.searchParams.set("fullscreen", "1");
    else url.searchParams.delete("fullscreen");
  });
}
