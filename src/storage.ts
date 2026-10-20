import type { SessionSnapshot } from "@/engine/session";
import { isSnakeState } from "@/games/snake";
import { collides, type Piece } from "@/games/tetris/game";

type Store = Pick<Storage, "getItem" | "setItem">;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const kind = (value: unknown) => typeof value === "string" && ["I", "J", "L", "O", "S", "T", "Z"].includes(value);

/** Check cartridge invariants before untrusted browser data reaches rules/renderers. */
function validState(id: string, value: unknown): boolean {
  if (!object(value) || !integer(value.score) || typeof value.over !== "boolean" || !integer(value.rng, 0, 0xffffffff)) return false;
  if (id === "snake") return isSnakeState(value);
  if (id === "tetris") {
    const { board, piece, bag } = value;
    const valid = Array.isArray(board) && board.length === 20 && board.every(row => Array.isArray(row) && row.length === 10 && row.every(n => integer(n, 0, 7))) &&
      object(piece) && kind(piece.kind) && integer(piece.x, -4, 10) && integer(piece.y, -4, 20) && integer(piece.rotation, 0, 3) &&
      Array.isArray(bag) && bag.length >= 1 && bag.length <= 7 && bag.every(kind) &&
      ["fall", "pieceAge", "lines", "pieces"].every(key => integer(value[key])) && integer(value.level, 1);
    return valid && (value.over || !collides(board as number[][], piece as unknown as Piece));
  }
  return false;
}

export function loadSession(id: string, store?: Store): SessionSnapshot | null {
  try {
    const raw = (store ?? localStorage).getItem(`0-player:save:${id}`);
    if (!raw || raw.length > 200_000) return null;
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !validState(id, value.state) ||
      (value.mode !== "auto" && value.mode !== "human") || typeof value.paused !== "boolean" ||
      typeof value.speed !== "number" || ![0.5, 1, 2, 4].includes(value.speed) || !integer(value.round, 1) || !integer(value.seed, 0, 0xffffffff)) return null;
    if (value.autoSpeed !== undefined && (typeof value.autoSpeed !== "number" || ![0.5, 1, 2, 4].includes(value.autoSpeed))) return null;
    return value as unknown as SessionSnapshot;
  } catch {
    return null;
  }
}

export function saveSession(id: string, snapshot: SessionSnapshot, store?: Store) {
  try {
    (store ?? localStorage).setItem(`0-player:save:${id}`, JSON.stringify({ version: 1, ...snapshot }));
  } catch {
    /* Private browsing or a full store must never interrupt a game. */
  }
}

export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`0-player:${key}`);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
export function writePreference(key: string, value: unknown) {
  try { localStorage.setItem(`0-player:${key}`, JSON.stringify(value)); } catch { /* Optional storage. */ }
}
