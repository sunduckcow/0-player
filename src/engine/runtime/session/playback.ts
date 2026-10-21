export const playbackSpeeds = [0.5, 1, 2, 4] as const;

const transitionMs = 350;
const easing = (time: number) => time * time * (3 - 2 * time);
const easingIntegral = (time: number) => time ** 3 - time ** 4 / 2;

/** Integrates the presentation rate without depending on browser frame sizes. */
export class PlaybackClock {
  rate = 1;
  private transition: { from: number; elapsed: number } | undefined;

  start(from: number) {
    this.transition = { from, elapsed: 0 };
  }

  finish(target: number) {
    this.transition = undefined;
    this.rate = target;
  }

  elapsed(delta: number, target: number, animate: boolean): number {
    if (!animate) this.finish(target);
    const transition = this.transition;
    if (!transition) return delta * this.rate;

    const start = transition.elapsed / transitionMs;
    const duration = Math.min(delta, transitionMs - transition.elapsed);
    transition.elapsed += duration;
    const end = transition.elapsed / transitionMs;
    const difference = target - transition.from;
    const elapsed =
      duration * transition.from +
      difference * transitionMs * (easingIntegral(end) - easingIntegral(start));
    this.rate = transition.from + difference * easing(end);
    if (end === 1) this.finish(target);
    return elapsed + (delta - duration) * target;
  }
}
