import type { VisualTheme } from "@/engine/contracts/visuals";
import type { Workspace } from "./types";

interface FrameLoopOptions {
  workspace: Workspace;
  context: CanvasRenderingContext2D;
  reducedMotion: MediaQueryList;
  getVisuals(): VisualTheme;
  announce(message: string): void;
  persist(): void;
  syncUrl(): void;
  updateHud(): void;
}

/** Browser scheduling stays outside Session; time is explicit at the engine boundary. */
export function startFrameLoop(options: FrameLoopOptions) {
  const {
    workspace,
    context,
    reducedMotion,
    announce,
    persist,
    syncUrl,
    updateHud,
  } = options;
  let lastTime = 0;
  let lastHud = 0;
  let lastSave = 0;

  function update(time: number) {
    const { session } = workspace.active;
    const delta = lastTime ? time - lastTime : 0;
    lastTime = time;
    const round = session.round;
    const wasRecovering = session.recovering;
    session.advanceFrame(delta, !reducedMotion.matches);
    if (!wasRecovering && session.recovering) {
      announce("Rewinding to a safer moment. AI takes over.");
      updateHud();
    } else if (wasRecovering && !session.recovering) {
      announce("Autopilot is on.");
      updateHud();
      persist();
    }
    if (round !== session.round) {
      syncUrl();
      persist();
    }
    context.imageSmoothingEnabled = false;
    workspace.active.draw(context, {
      time,
      visuals: options.getVisuals(),
      reducedMotion: reducedMotion.matches,
    });
    if (time - lastSave >= 1000) {
      persist();
      lastSave = time;
    }
    if (time - lastHud >= 100) {
      updateHud();
      lastHud = time;
    }
  }

  function frame(time: number) {
    if (!document.hidden) update(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    resetClock() {
      lastTime = 0;
      workspace.active.session.resetClock();
    },
  };
}
