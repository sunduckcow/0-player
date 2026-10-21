import type { RenderFrame } from "@/engine/contracts/game";
/** Shared effect timing and reduced-motion policy; cartridges choose affected geometry. */
export function recoveryIntensity(frame: RenderFrame): number {
  if (!frame.recovery) return 1;
  if (frame.reducedMotion) return 0.7;
  return (
    0.4 +
    0.6 * Math.sin(Math.PI * Math.max(0, Math.min(1, frame.recovery.progress)))
  );
}

export const feedbackFlashMs = 120;
export function flashIntensity(progress: number, reducedMotion = false) {
  return reducedMotion ? 0 : 0.75 * (1 - Math.max(0, Math.min(1, progress)));
}
