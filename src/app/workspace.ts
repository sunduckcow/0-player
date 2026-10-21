import type { ActiveGame, Cartridge } from "@/engine/runtime/cartridge";
import { playbackSpeeds, type SessionSnapshot } from "@/engine/runtime/session";
import {
  loadSession,
  saveSession,
  readPreference,
  writePreference,
} from "@/engine/platform/storage";
import type { Workspace } from "./types";

const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!;
const bestKey = (id: string) => `0-player:best:${id}`;

function readBest(id: string) {
  try {
    const stored = Number(localStorage.getItem(bestKey(id)));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

/** Owns game selection and persistence; each live state remains inside its Session. */
export function createWorkspace(
  catalog: readonly Cartridge[],
  initialId: string,
  seed?: number,
): Workspace {
  if (!catalog.length) throw new Error("The game catalog is empty");
  let game: Cartridge;
  let active: ActiveGame;
  let best = 0;
  let savedBest = 0;
  const savedSessions = new Map<string, SessionSnapshot>();
  const storedSpeed = readPreference<unknown>("speed", 1);
  let playbackSpeed =
    playbackSpeeds.find((value) => value === storedSpeed) ?? 1;

  function saveBest() {
    best = Math.max(best, active.session.state.score);
    if (best <= savedBest) return;
    try {
      localStorage.setItem(bestKey(game.id), String(best));
      savedBest = best;
    } catch {
      /* Retry on a later save if browser storage becomes available. */
    }
  }

  function persist(paused: boolean) {
    saveBest();
    const snapshot = { ...active.session.snapshot(), paused };
    savedSessions.set(game.id, snapshot);
    saveSession(game, snapshot);
    writePreference("last-game", game.id);
    return snapshot;
  }

  function select(id: string, selectedSeed?: number) {
    if (active) persist(active.session.paused);
    game = catalog.find((item) => item.id === id) ?? catalog[0]!;
    active = game.start(selectedSeed ?? freshSeed());
    const saved = savedSessions.get(game.id) ?? loadSession(game);
    if (saved && (selectedSeed === undefined || saved.seed === selectedSeed))
      active.restore(saved);
    active.session.setSpeed(playbackSpeed);
    best = savedBest = readBest(game.id);
  }

  select(initialId, seed);
  return {
    catalog,
    get game() {
      return game;
    },
    get active() {
      return active;
    },
    get best() {
      return Math.max(best, active.session.state.score);
    },
    get speed() {
      return playbackSpeed;
    },
    select,
    persist,
    saveBest,
    apply(draft) {
      active = game.apply(active, draft);
      writePreference(`settings:${game.id}`, game.values);
    },
    setSpeed(speed, smooth) {
      const selectedSpeed = playbackSpeeds.find((value) => value === speed);
      if (selectedSpeed === undefined) return;
      playbackSpeed = selectedSpeed;
      writePreference("speed", speed);
      active.session.setSpeed(speed, smooth);
    },
  };
}
