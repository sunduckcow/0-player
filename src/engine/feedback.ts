import type { RenderFrame } from "./types";

const motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

/** One gentle loss pulse; games choose their own color and affected geometry. */
export function recoveryIntensity(frame: RenderFrame): number {
  if (!frame.recovery) return 1;
  if (motion?.matches) return 0.7;
  return 0.4 + 0.6 * Math.sin(Math.PI * Math.max(0, Math.min(1, frame.recovery.progress)));
}
