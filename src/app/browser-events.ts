import { listenKeyboard } from "@/engine/input/keyboard";
import type { EngineCommand, EngineInput } from "@/engine/input/actions";
import { gameShortcut } from "@/engine/ui/library/library-navigation";
import { renderRuntimeControls } from "@/engine/ui/controls/runtime-controls";
import { element } from "@/engine/ui/lib/dom";
import type { Workspace, Panels } from "./types";

interface BrowserEventsOptions {
  workspace: Workspace;
  panels: Panels;
  dispatch(input: EngineInput): void;
  command(command: EngineCommand): void;
  toggleController(): void;
  toggleLibrary(): void;
  toggleSettings(): void;
  toggleFocus(): Promise<void>;
  showHint(): void;
  selectGame(id: string): void;
  setSpeed(speed: number): void;
  persist(): void;
  resetClock(): void;
}

const onClick = (id: string, handler: () => void) =>
  element(id).addEventListener("click", handler);
function ignoresShortcut(event: KeyboardEvent, panels: Panels) {
  if (
    event.defaultPrevented ||
    panels.current ||
    event.isComposing ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
    return true;
  const target = event.target;
  return (
    target instanceof HTMLElement &&
    Boolean(target.isContentEditable || target.closest("input,select,textarea"))
  );
}

export function bindBrowserEvents(actions: BrowserEventsOptions) {
  const { workspace, panels, command, showHint } = actions;
  listenKeyboard(
    actions.dispatch,
    () => workspace.game.rules.controls,
    () => workspace.active.session.state.over,
  );
  renderRuntimeControls(element("runtime-controls"), command);
  renderRuntimeControls(element("runtime-hints"), command, true);

  for (const id of ["home-button", "library-button", "focus-library"])
    onClick(id, actions.toggleLibrary);
  for (const id of ["controls-button", "focus-controls"])
    onClick(id, () =>
      panels.toggle(element<HTMLDialogElement>("controls-dialog")),
    );
  for (const id of ["settings-button", "focus-settings"])
    onClick(id, actions.toggleSettings);
  for (const id of ["pause-button", "focus-pause"])
    onClick(id, () => command("pause"));
  for (const id of ["restart-button", "overlay-button"])
    onClick(id, () => command("restart"));
  for (const id of ["focus-button", "focus-exit"])
    onClick(id, () => command("focus"));
  for (const id of ["control-button", "focus-auto"])
    onClick(id, actions.toggleController);
  document
    .querySelectorAll<HTMLButtonElement>("[data-command]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        command(button.dataset.command as EngineCommand),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-close-panel]")
    .forEach((button) =>
      button.addEventListener("click", () => panels.close()),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-speed]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        actions.setSpeed(Number(button.dataset.speed)),
      ),
    );

  document.addEventListener("visibilitychange", () => {
    actions.resetClock();
    if (document.hidden) actions.persist();
  });
  window.addEventListener("blur", actions.resetClock);
  window.addEventListener("pagehide", actions.persist);
  document.addEventListener("pointermove", showHint, { passive: true });
  document.addEventListener("pointerdown", showHint, { passive: true });
  document.addEventListener("focusin", showHint);
  document.addEventListener("fullscreenchange", showHint);
  document.addEventListener("keydown", (event) => {
    if (ignoresShortcut(event, panels)) return;
    const index = gameShortcut(event.key, event.code);
    const target = index === null ? undefined : workspace.catalog[index];
    if (target) {
      event.preventDefault();
      if (!event.repeat) actions.selectGame(target.id);
    } else if (
      event.key === "Escape" &&
      document.body.classList.contains("focus-mode")
    )
      void actions.toggleFocus();
  });
}
