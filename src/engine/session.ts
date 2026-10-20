import type { Action, Game, GameState, Mode } from "@/engine/types";
import { nextSeed } from "@/engine/random";

export interface SessionSnapshot<S extends GameState = GameState> {
  state: S;
  mode: Mode;
  paused: boolean;
  speed: number;
  autoSpeed?: number;
  round: number;
  seed: number;
}

/** The clock and control ownership are shared; every game stays pure. */
export class Session<S extends GameState> {
  readonly game: Game<S>;
  state: S;
  mode: Mode = "auto";
  paused = false;
  autoSpeed = 1;
  round = 1;
  seed: number;
  private queue: Action[] = [];
  private elapsed = 0;
  private endedFor = 0;
  private readonly rewindSteps: number;
  private readonly historyLimit: number;
  private history: S[] = [];
  private historyNext = 0;
  private rescueAttempts = 0;
  private recovery: {
    target?: S;
    fallback?: S;
    steps: number;
    elapsed: number;
    duration: number;
  } | undefined;

  get recovering() {
    return this.recovery !== undefined;
  }

  recoveryFrame(): { progress: number; steps: number } | undefined {
    const phase = this.recovery;
    return phase ? { progress: phase.elapsed / phase.duration, steps: phase.steps } : undefined;
  }

  get speed() {
    return this.mode === "human" ? 1 : this.autoSpeed;
  }

  constructor(game: Game<S>, seed: number) {
    this.game = game;
    this.seed = seed >>> 0;
    this.state = game.create(this.seed);
    const steps = game.recovery?.steps ?? 1;
    this.rewindSteps = Number.isFinite(steps) ? Math.min(240, Math.max(1, Math.floor(steps))) : 1;
    this.historyLimit = game.recovery ? Math.min(this.rewindSteps * 4, 240) : 0;
  }

  snapshot(): SessionSnapshot<S> {
    const { mode, paused, speed, autoSpeed, round, seed } = this;
    // A save made during the animation must resume a live position.
    const fallback = this.recovery?.fallback;
    const state = this.recovery?.target ?? fallback ?? this.state;
    return {
      state, mode, paused, speed, autoSpeed,
      round: fallback ? round + 1 : round,
      seed: fallback ? nextSeed(seed) : seed,
    };
  }

  /** Restore validated data, without carrying a stale clock or queued keys. */
  restore(snapshot: SessionSnapshot<S>) {
    this.state = snapshot.state;
    this.mode = snapshot.mode;
    this.paused = snapshot.paused;
    this.autoSpeed = snapshot.autoSpeed ?? snapshot.speed;
    this.round = snapshot.round;
    this.seed = snapshot.seed;
    this.endedFor = 0;
    this.clearRecovery();
    this.resetClock();
  }

  input(action: Action) {
    if (this.recovering) return;
    this.takeControl();
    if (this.state.over && action === "primary") {
      this.restart();
      return;
    }
    if (!this.paused && !this.state.over && this.queue.length < 4)
      this.queue.push(action);
  }

  takeControl() {
    if (this.recovering || this.mode === "human") return;
    this.mode = "human";
    this.rescueAttempts = 0;
    this.resetClock();
  }

  automate() {
    if (this.mode === "human") this.resetClock();
    this.mode = "auto";
    this.queue = [];
  }

  togglePause() {
    this.paused = !this.paused;
    this.resetClock();
  }

  setSpeed(speed: number) {
    if (![0.5, 1, 2, 4].includes(speed)) return;
    this.autoSpeed = speed;
    this.resetClock();
  }

  resetClock() {
    this.elapsed = 0;
    this.queue = [];
  }

  restart(seed = nextSeed(this.seed)) {
    this.seed = seed >>> 0;
    this.state = this.game.create(this.seed);
    this.round++;
    this.endedFor = 0;
    this.paused = false;
    this.clearRecovery();
    this.resetClock();
  }

  private clearRecovery() {
    this.recovery = undefined;
    this.rescueAttempts = 0;
    this.history = [];
    this.historyNext = 0;
  }

  private previousState(steps: number): S {
    return this.history[(this.historyNext - steps + this.historyLimit) % this.historyLimit];
  }

  private beginRecovery() {
    const options = this.game.recovery;
    if (!options || !(options.isLoss?.(this.state) ?? this.state.over)) return false;
    this.automate();
    this.resetClock();
    this.endedFor = 0;
    let target: S | undefined;
    let steps = Math.min(this.rewindSteps, this.history.length);
    // Half-window strides bound safety probes to at most ten candidates.
    if (steps && this.rescueAttempts < 2) {
      const stride = Math.max(1, Math.floor(this.rewindSteps / 2));
      while (true) {
        const candidate = this.previousState(steps);
        if (!candidate.over && (options.canResume?.(candidate) ?? true)) {
          target = candidate;
          this.rescueAttempts++;
          break;
        }
        if (steps === this.history.length) break;
        steps = Math.min(this.history.length, steps + stride);
      }
    }
    const duration = options.durationMs ?? 320;
    this.recovery = {
      target,
      fallback: target ? undefined : this.game.create(nextSeed(this.seed)),
      steps: target ? steps : 0,
      elapsed: 0,
      duration: Number.isFinite(duration) ? Math.max(1, duration) : 320,
    };
    return true;
  }

  private advanceRecovery(delta: number, animate: boolean) {
    const phase = this.recovery;
    if (!phase) return;
    phase.elapsed = Math.min(phase.duration, phase.elapsed + delta);
    if (phase.elapsed < phase.duration) {
      // Hold the loss briefly, then replay the real immutable states backwards.
      const steps = Math.floor(Math.max(0, phase.elapsed - phase.duration / 5) * phase.steps / (phase.duration * 4 / 5));
      if (animate && phase.target && steps > 0)
        this.state = this.previousState(Math.min(steps, phase.steps));
      return;
    }
    this.recovery = undefined;
    if (!phase.target) {
      this.restart();
      return;
    }
    // Drop the discarded future before recording the resumed branch.
    this.history = Array.from(
      { length: this.history.length - phase.steps },
      (_, index) => this.previousState(this.history.length - index),
    );
    this.historyNext = this.history.length % this.historyLimit;
    this.state = phase.target;
    this.resetClock();
  }

  advance(delta: number, animateRecovery = true) {
    this.advanceClock(delta, animateRecovery, 8);
  }

  /** Leave input/rendering a turn after one update; discard overdue whole ticks. */
  advanceFrame(delta: number, animateRecovery = true) {
    this.advanceClock(delta, animateRecovery, 1);
  }

  private advanceClock(delta: number, animateRecovery: boolean, tickLimit: number) {
    if (this.paused || !Number.isFinite(delta) || delta <= 0) return;
    if (this.recovering) {
      this.advanceRecovery(delta, animateRecovery);
      return;
    }
    if (this.state.over) {
      if (this.beginRecovery()) return;
      if (this.mode === "auto") {
        this.endedFor += Math.min(delta, 2000);
        if (this.endedFor >= 1500) this.restart();
      }
      return;
    }
    const step = this.game.tickMs / this.speed;
    this.elapsed = tickLimit === 1
      ? this.elapsed + delta
      : Math.min(this.elapsed + delta, step * 8);
    let ticks = 0;
    while (this.elapsed >= step && ticks < tickLimit) {
      ticks++;
      this.elapsed -= step;
      const action =
        this.mode === "auto"
          ? this.game.ai(this.state)
          : (this.queue.shift() ?? null);
      if (this.historyLimit) {
        this.history[this.historyNext] = this.state;
        this.historyNext = (this.historyNext + 1) % this.historyLimit;
      }
      this.state = this.game.update(this.state, action, this.mode);
      if (this.state.over) {
        this.elapsed = 0;
        this.queue = [];
        this.beginRecovery();
        break;
      }
    }
    if (this.elapsed >= step) this.elapsed %= step;
  }
}
