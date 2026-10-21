import type { EngineCommand, EngineInput } from "@/engine/input/actions";
import { element } from "@/engine/ui/lib/dom";
import type { Workspace, WorkspaceView, BrowserMedia, Panels } from "./types";

interface InputOptions {
  workspace: Workspace;
  view: WorkspaceView;
  panels: Panels;
  media: BrowserMedia;
  canvas: HTMLCanvasElement;
  announce(message: string): void;
  persist(): void;
  syncUrl(): void;
  showHint(): void;
  toggleLibrary(): void;
  toggleFocus(): Promise<void>;
}

export function createInputController(options: InputOptions) {
  const {
    workspace,
    view,
    panels,
    media,
    canvas,
    announce,
    persist,
    syncUrl,
    showHint,
  } = options;
  const library = element<HTMLDialogElement>("library-dialog");
  const help = element<HTMLDialogElement>("controls-dialog");
  const settings = element<HTMLDialogElement>("settings-dialog");

  function play(action: string) {
    panels.close();
    if (workspace.active.session.paused) workspace.active.session.togglePause();
    dispatch({ kind: "game", action });
    canvas.focus({ preventScroll: true });
  }

  function gameInput(action: string) {
    const { session } = workspace.active;
    if (session.recovering) return false;
    if (
      !workspace.game.rules.controls.some(
        (control) => control.action === action,
      )
    )
      return false;
    if (session.mode === "auto") {
      const message = media.mobile.matches
        ? "You are in control."
        : "You are in control. Press A for autopilot.";
      announce(message);
    }
    session.input(action);
    return true;
  }

  function runCommand(command: EngineCommand) {
    const { session } = workspace.active;
    switch (command) {
      case "games":
        options.toggleLibrary();
        break;
      case "help":
        if (!media.mobile.matches) panels.toggle(help);
        break;
      case "auto":
        if (!session.recovering) {
          session.automate(!media.reducedMotion.matches);
          announce("Autopilot is on.");
        }
        break;
      case "pause":
        session.togglePause();
        announce(session.paused ? "Paused." : "Resumed.");
        break;
      case "restart":
        workspace.saveBest();
        session.restart();
        syncUrl();
        break;
      case "focus":
        void options.toggleFocus();
        break;
    }
  }

  function dispatch(input: EngineInput) {
    if (panels.current === settings) return;
    const command = input.kind === "engine" ? input.command : null;
    const opensPanel = command === "games" || command === "help";
    if (panels.current && !opensPanel) {
      if (panels.current === library) return;
      panels.close();
      if (input.kind === "game" && workspace.active.session.paused)
        workspace.active.session.togglePause();
    }
    if (input.kind === "game") {
      if (!gameInput(input.action)) return;
    } else runCommand(input.command);
    showHint();
    view.update();
    persist();
  }

  function command(command: EngineCommand) {
    dispatch({ kind: "engine", command });
  }

  function toggleController() {
    const { session } = workspace.active;
    if (session.recovering) return;
    if (media.mobile.matches || session.mode === "human") command("auto");
    else {
      session.takeControl();
      announce("You are in control.");
      view.update();
    }
    canvas.focus({ preventScroll: true });
    showHint();
    persist();
  }
  return { dispatch, command, play, toggleController };
}
