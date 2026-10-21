import { createHudRenderer } from "@/engine/ui/board/hud";
import { fitBoardViewport } from "@/engine/ui/board/viewport";
import { renderBoardLabels } from "@/engine/ui/board/board-labels";
import { renderControlLayout } from "@/engine/ui/controls/control-layout";
import { mountSpeedSelect } from "@/engine/ui/controls/speed-select";
import { icon } from "@/engine/ui/icons";
import { element, text } from "@/engine/ui/lib/dom";
import type { Workspace, WorkspaceView, Panels } from "./types";

interface PresentationOptions {
  workspace: Workspace;
  canvas: HTMLCanvasElement;
  panels: Panels;
  mobile: MediaQueryList;
  play(action: string): void;
  setSpeed(speed: number): void;
}

export function createPresentation({
  workspace,
  canvas,
  panels,
  mobile,
  play,
  setSpeed,
}: PresentationOptions): WorkspaceView {
  const speedSelect = mountSpeedSelect(element("speed-select-root"), setSpeed);
  const renderHud = createHudRenderer((...args) => speedSelect.update(...args));
  const fitScreen = () => fitBoardViewport(workspace.game.rules);
  const resize = new ResizeObserver(fitScreen);
  resize.observe(element("stage-center"));

  function refresh() {
    const { game, catalog } = workspace;
    const rules = game.rules;
    canvas.width = rules.width;
    canvas.height = rules.height;
    renderBoardLabels(element("board-labels"), rules.labels ?? [], rules);
    text("game-picker-title", game.title);
    element("game-picker-icon").innerHTML = icon(game.icon) || icon("gamepad");
    text(
      "game-number",
      `GAME ${String(catalog.indexOf(game) + 1).padStart(2, "0")}`,
    );
    text("controls-heading", `${game.title} controls`);
    canvas.setAttribute(
      "aria-label",
      `${game.title} game board. Use game controls to play, A for autopilot, Space or P to pause.`,
    );
    for (const id of [
      "game-controls",
      "inline-controls",
      "focus-game-controls",
    ]) {
      renderControlLayout(
        element(id),
        id === "game-controls" ? element("touch-controls") : null,
        rules.controls,
        play,
      );
    }
    text("screen-label", rules.boardLabel ?? game.title);
    fitScreen();
  }

  function update() {
    const { session } = workspace.active;
    renderHud({
      score: session.state.score,
      over: session.state.over,
      best: workspace.best,
      mode: session.mode,
      paused: session.paused,
      recovering: session.recovering,
      round: session.round,
      speed: session.speed,
      autoSpeed: session.autoSpeed,
      mobile: mobile.matches,
      panelOpen: panels.current !== null,
      strategy: workspace.game.rules.strategy,
      metrics: workspace.active.metrics(),
    });
    if (session.state.over) workspace.saveBest();
  }
  return { refresh, update };
}
