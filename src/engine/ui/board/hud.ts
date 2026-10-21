import { icon } from "@/engine/ui/icons";
import { element, text } from "@/engine/ui/lib/dom";
import { getHudCopy } from "./hud-copy";
import { createMetricsRenderer } from "./hud-metrics";
import type { HudModel } from "./types";

export type { HudModel } from "./types";

/** Rendering consumes a view model; persistence and session transitions stay outside. */
export function createHudRenderer(
  updateSpeed: (speed: number, disabled: boolean, hint: string) => void,
) {
  const renderMetrics = createMetricsRenderer();
  return (model: HudModel) => {
    const copy = getHudCopy(model);
    const human = model.mode === "human";
    const recovering = model.recovering;
    document.body.classList.toggle("is-human", human);
    element("focus-controls-rail").inert = !human;
    text("score", String(model.score).padStart(3, "0"));
    text("best", String(model.best).padStart(3, "0"));
    text("compact-score", String(model.score).padStart(3, "0"));
    text("compact-best", String(model.best).padStart(3, "0"));
    text("pilot-title", copy.pilotTitle);
    text("pilot-state", copy.pilotState);
    text("focus-control-label", human ? "Autopilot" : "Take control");
    element("focus-control-key").hidden = !human;
    text("strategy", copy.strategy);
    text("control-label", copy.controlLabel);
    if (model.mobile)
      element("control-button").setAttribute("aria-pressed", String(!human));
    else element("control-button").removeAttribute("aria-pressed");
    element<HTMLButtonElement>("control-button").disabled = recovering;
    element<HTMLButtonElement>("focus-auto").disabled = recovering;
    text("control-key", human ? "A" : "↑");
    text("screen-status", copy.screenStatus);
    text("board-caption", copy.boardCaption);
    text("round-label", `ROUND ${String(model.round).padStart(3, "0")}`);
    const pause = element<HTMLButtonElement>("pause-button");
    const pauseLabel = model.paused ? "Resume" : "Pause";
    if (pause.getAttribute("aria-label") !== pauseLabel) {
      pause.setAttribute("aria-label", pauseLabel);
      pause.innerHTML = icon(model.paused ? "play" : "pause");
    }
    document
      .querySelectorAll<HTMLButtonElement>(".touch-action[data-action]")
      .forEach((button) => {
        button.disabled = recovering;
      });
    document
      .querySelectorAll<HTMLButtonElement>("[data-speed]")
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.speed) === model.speed),
        );
        button.disabled = human || recovering;
      });
    const speedLabel = document.querySelector<HTMLElement>(".speed-label")!;
    speedLabel.textContent = human ? "Manual · 1×" : "Speed";
    const speedHint = human
      ? `Manual control runs at 1×. Autopilot will resume at ${model.autoSpeed}×.`
      : "Autopilot speed";
    document.querySelector<HTMLElement>(".speed-control")!.title = speedHint;
    renderMetrics(model.metrics);
    element("board-overlay").hidden =
      (!model.over || recovering) && (!model.paused || model.panelOpen);
    updateSpeed(model.speed, human || recovering, speedHint);
    text("overlay-title", copy.overlayTitle);
    text("overlay-note", copy.overlayNote);
    element("overlay-button").hidden = model.paused || !human;
  };
}
