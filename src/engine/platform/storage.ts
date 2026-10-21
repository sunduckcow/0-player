import type { SessionSnapshot } from "@/engine/runtime/session";
import type { Cartridge } from "@/engine/runtime/cartridge";
import { isSessionEnvelope } from "./session-envelope";

type Store = Pick<Storage, "getItem" | "setItem">;

/** Engine envelope validation delegates all state internals to the cartridge codec. */
export function loadSession(
  cartridge: Cartridge,
  store?: Store,
): SessionSnapshot | null {
  try {
    const raw = (store ?? localStorage).getItem(
      `0-player:save:${cartridge.id}`,
    );
    if (!raw || raw.length > 200_000) return null;
    const value: unknown = JSON.parse(raw);
    if (!isSessionEnvelope(value, cartridge.id)) return null;
    const state = cartridge.decode(
      value.state,
      value.version === 1 ? 1 : Number(value.stateVersion),
    );
    if (!state) return null;
    return {
      state,
      mode: value.mode,
      paused: value.paused,
      speed: value.speed,
      autoSpeed: value.autoSpeed,
      round: value.round,
      seed: value.seed,
    };
  } catch {
    return null;
  }
}
export function saveSession(
  cartridge: Cartridge,
  snapshot: SessionSnapshot,
  store?: Store,
) {
  try {
    (store ?? localStorage).setItem(
      `0-player:save:${cartridge.id}`,
      JSON.stringify({
        ...snapshot,
        version: 2,
        gameId: cartridge.id,
        stateVersion: cartridge.stateVersion,
      }),
    );
  } catch {
    /* Optional browser persistence. */
  }
}
export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`0-player:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(`0-player:${key}`, JSON.stringify(value));
  } catch {
    /* Optional storage. */
  }
}
