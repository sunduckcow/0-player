import { playbackSpeeds } from "@/engine/runtime/session/playback";
import type { SessionSnapshot } from "@/engine/runtime/session/types";

type SavedSession = Omit<SessionSnapshot, "state"> & {
  version: 1 | 2;
  gameId?: string;
  stateVersion?: number;
  state: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIntegerInRange = (
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

const isPlaybackSpeed = (value: unknown): value is number =>
  playbackSpeeds.some((speed) => speed === value);

function hasSupportedVersion(value: Record<string, unknown>, gameId: string) {
  if (value.version === 1) return true;
  return (
    value.version === 2 &&
    value.gameId === gameId &&
    isIntegerInRange(value.stateVersion, 1)
  );
}

function hasValidPlaybackSettings(value: Record<string, unknown>) {
  return (
    (value.mode === "auto" || value.mode === "human") &&
    typeof value.paused === "boolean" &&
    isPlaybackSpeed(value.speed) &&
    (value.autoSpeed === undefined || isPlaybackSpeed(value.autoSpeed))
  );
}

/** Only the envelope belongs to the engine; the cartridge owns state decoding. */
export function isSessionEnvelope(
  value: unknown,
  gameId: string,
): value is SavedSession {
  return (
    isRecord(value) &&
    hasSupportedVersion(value, gameId) &&
    hasValidPlaybackSettings(value) &&
    isIntegerInRange(value.round, 1) &&
    isIntegerInRange(value.seed, 0, 0xffffffff)
  );
}
