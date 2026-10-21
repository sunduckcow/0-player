import type { GameState } from "@/engine/contracts/game";
import type { RecoveryOptions, RecoveryPhase, RecoveryUpdate } from "./types";

/** Retains immutable positions and chooses a bounded, safe branch after a loss. */
export class RecoveryHistory<S extends GameState> {
  phase: RecoveryPhase<S> | undefined;
  private readonly rewindSteps: number;
  private readonly limit: number;
  private states: S[] = [];
  private next = 0;
  private rescueAttempts = 0;

  constructor(options: RecoveryOptions<S> | undefined) {
    const steps = options?.steps ?? 1;
    this.rewindSteps = Number.isFinite(steps)
      ? Math.min(240, Math.max(1, Math.floor(steps)))
      : 1;
    this.limit = options ? Math.min(this.rewindSteps * 4, 240) : 0;
  }

  frame(): { progress: number; steps: number } | undefined {
    const phase = this.phase;
    if (!phase) return undefined;
    return { progress: phase.elapsed / phase.duration, steps: phase.steps };
  }

  clear() {
    this.phase = undefined;
    this.resetAttempts();
    this.states = [];
    this.next = 0;
  }

  resetAttempts() {
    this.rescueAttempts = 0;
  }

  remember(state: S) {
    if (!this.limit) return;
    this.states[this.next] = state;
    this.next = (this.next + 1) % this.limit;
  }

  private previous(steps: number): S {
    return this.states[(this.next - steps + this.limit) % this.limit];
  }

  begin(options: RecoveryOptions<S>, createFallback: () => S) {
    const candidate = this.findTarget(options);
    const duration = options.durationMs ?? 320;
    this.phase = {
      target: candidate?.state,
      fallback: candidate ? undefined : createFallback(),
      steps: candidate?.steps ?? 0,
      elapsed: 0,
      duration: Number.isFinite(duration) ? Math.max(1, duration) : 320,
    };
  }

  private findTarget(
    options: RecoveryOptions<S>,
  ): { state: S; steps: number } | undefined {
    let steps = Math.min(this.rewindSteps, this.states.length);
    if (!steps || this.rescueAttempts >= 2) return undefined;
    // Half-window strides bound safety probes to at most ten candidates.
    const stride = Math.max(1, Math.floor(this.rewindSteps / 2));
    while (true) {
      const state = this.previous(steps);
      if (!state.over && (options.canResume?.(state) ?? true)) {
        this.rescueAttempts++;
        return { state, steps };
      }
      if (steps === this.states.length) return undefined;
      steps = Math.min(this.states.length, steps + stride);
    }
  }

  advance(delta: number, animate: boolean): RecoveryUpdate<S> | undefined {
    const phase = this.phase;
    if (!phase) return undefined;
    phase.elapsed = Math.min(phase.duration, phase.elapsed + delta);
    if (phase.elapsed < phase.duration) {
      // Hold the loss briefly, then replay the real immutable states backwards.
      const holdDuration = phase.duration / 5;
      const rewindDuration = (phase.duration * 4) / 5;
      const steps = Math.floor(
        (Math.max(0, phase.elapsed - holdDuration) * phase.steps) /
          rewindDuration,
      );
      const state =
        animate && phase.target && steps > 0
          ? this.previous(Math.min(steps, phase.steps))
          : undefined;
      return { kind: "rewinding", state };
    }

    this.phase = undefined;
    if (!phase.target) return { kind: "restart" };
    // Drop the discarded future before recording the resumed branch.
    this.states = Array.from(
      { length: this.states.length - phase.steps },
      (_, index) => this.previous(this.states.length - index),
    );
    this.next = this.states.length % this.limit;
    return { kind: "resumed", state: phase.target };
  }
}
