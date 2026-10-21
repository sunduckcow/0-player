import type { Action, Game, GameState, Mode } from "@/engine/contracts/game";
import { nextSeed } from "@/engine/lib/random";
import { RecoveryHistory } from "./session/history";
import { PlaybackClock, playbackSpeeds } from "./session/playback";
import type { SessionSnapshot } from "./session/types";

export { playbackSpeeds } from "./session/playback";
export type { SessionSnapshot } from "./session/types";

/** The clock and control ownership are shared; every game stays pure. */
export class Session<S extends GameState, A extends string = Action> {
  game: Game<S, A>;
  state: S;
  mode: Mode = "auto";
  paused = false;
  autoSpeed = 1;
  round = 1;
  seed: number;
  private queue: A[] = [];
  private elapsed = 0;
  private readonly playback = new PlaybackClock();
  private endedFor = 0;
  private readonly history: RecoveryHistory<S>;

  get recovering() {
    return this.history.phase !== undefined;
  }

  recoveryFrame(): { progress: number; steps: number } | undefined {
    return this.history.frame();
  }

  get speed() {
    return this.mode === "human" ? 1 : this.autoSpeed;
  }

  /** Presentation rate; saves and UI selections use the discrete speed target. */
  get playbackSpeed() {
    return this.mode === "human" ? 1 : this.playback.rate;
  }

  constructor(game: Game<S, A>, seed: number, state?: S) {
    this.game = game;
    this.seed = seed >>> 0;
    this.state = state ?? game.create(this.seed);
    this.history = new RecoveryHistory(game.recovery);
  }

  snapshot(): SessionSnapshot<S> {
    const { mode, paused, speed, autoSpeed, round, seed } = this;
    // A save made during the animation must resume a live position.
    const fallback = this.history.phase?.fallback;
    const state = this.history.phase?.target ?? fallback ?? this.state;
    return {
      state,
      mode,
      paused,
      speed,
      autoSpeed,
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
    this.history.clear();
    this.resetClock();
    this.finishSpeedTransition();
  }

  input(action: A) {
    if (this.recovering) return;
    this.takeControl();
    if (!this.paused && !this.state.over && this.queue.length < 4)
      this.queue.push(action);
  }

  takeControl() {
    if (this.recovering || this.mode === "human") return;
    this.mode = "human";
    this.finishSpeedTransition();
    this.history.resetAttempts();
    this.resetClock();
  }

  automate(smooth = false) {
    const wasHuman = this.mode === "human";
    if (wasHuman) this.resetClock();
    this.mode = "auto";
    this.queue = [];
    if (wasHuman && smooth && this.autoSpeed !== 1) this.playback.start(1);
    else if (wasHuman || !smooth) this.finishSpeedTransition();
  }

  togglePause() {
    this.paused = !this.paused;
    this.resetClock();
  }

  setSpeed(speed: number, smooth = false) {
    if (!playbackSpeeds.some((value) => value === speed)) return;
    if (smooth && speed === this.autoSpeed) return;
    const from = this.playbackSpeed;
    this.autoSpeed = speed;
    if (smooth && this.mode === "auto" && from !== speed)
      this.playback.start(from);
    else {
      this.finishSpeedTransition();
      if (!smooth) this.resetClock();
    }
  }

  private finishSpeedTransition() {
    this.playback.finish(this.speed);
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
    this.history.clear();
    this.resetClock();
    this.finishSpeedTransition();
  }

  private beginRecovery() {
    const options = this.game.recovery;
    if (!options) return false;
    const isLoss = options.isLoss?.(this.state) ?? this.state.over;
    if (!isLoss) return false;
    this.automate();
    this.resetClock();
    this.endedFor = 0;
    this.history.begin(options, () => this.game.create(nextSeed(this.seed)));
    return true;
  }

  private advanceRecovery(delta: number, animate: boolean) {
    const update = this.history.advance(delta, animate);
    if (!update) return;
    if (update.kind === "restart") {
      this.restart();
      return;
    }
    if (update.state) this.state = update.state;
    if (update.kind === "resumed") this.resetClock();
  }

  advance(delta: number, animateRecovery = true) {
    this.finishSpeedTransition();
    this.advanceClock(delta, animateRecovery, 8);
  }

  /** Leave input/rendering a turn after one update; discard overdue whole ticks. */
  advanceFrame(delta: number, animateRecovery = true) {
    this.advanceClock(delta, animateRecovery, 1);
  }

  private advanceClock(
    delta: number,
    animateRecovery: boolean,
    tickLimit: number,
  ) {
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
    const tickMs = this.game.tickMs;
    const browserFrame = tickLimit === 1;
    const elapsed = browserFrame
      ? this.playback.elapsed(
          delta,
          this.speed,
          animateRecovery && this.mode === "auto",
        )
      : delta * this.speed;
    this.elapsed = browserFrame
      ? this.elapsed + elapsed
      : Math.min(this.elapsed + elapsed, tickMs * 8);
    let ticks = 0;
    while (this.elapsed >= tickMs && ticks < tickLimit) {
      ticks++;
      this.elapsed -= tickMs;
      const action =
        this.mode === "auto"
          ? this.game.ai(this.state)
          : (this.queue.shift() ?? null);
      this.history.remember(this.state);
      this.state = this.game.update(this.state, action, this.mode);
      if (this.state.over) {
        this.elapsed = 0;
        this.queue = [];
        this.beginRecovery();
        break;
      }
    }
    if (this.elapsed >= tickMs) this.elapsed %= tickMs;
  }
}
