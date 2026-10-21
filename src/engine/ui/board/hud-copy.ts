import type { HudModel } from "./types";

const controlMessages = {
  recovery: {
    pilotTitle: "Rewinding. AI takes over.",
    pilotState: "UNDO",
    screenStatus: "REWIND",
    boardCaption: "A second chance. AI takes over.",
  },
  human: {
    pilotTitle: "You are in control",
    pilotState: "YOU",
    screenStatus: "MANUAL",
    boardCaption: "Your move. Make it a good one.",
  },
  auto: {
    pilotTitle: "Autopilot is on",
    pilotState: "ON",
    screenStatus: "AUTOPILOT",
    boardCaption: "A mind of its own.",
  },
};

function describeStrategy(model: HudModel) {
  if (model.recovering)
    return "Going back to a safer moment. The AI will continue this board.";
  if (model.mode === "human")
    return "Make your move. The AI will wait here until you hand the controls back.";
  return model.strategy;
}

function describeOverlay(model: HudModel) {
  if (model.paused)
    return model.mobile
      ? "Tap pause to keep going"
      : "Press Space or P to keep going";
  return model.mode === "human"
    ? "Enter / R — play again · A — AI round"
    : "A fresh start in a moment…";
}

function controlActionLabel(model: HudModel) {
  if (model.mobile) return "Autopilot";
  return model.mode === "human" ? "Let AI play" : "Take control";
}

export function getHudCopy(model: HudModel) {
  const control = model.recovering
    ? controlMessages.recovery
    : controlMessages[model.mode];
  return {
    ...control,
    strategy: describeStrategy(model),
    controlLabel: controlActionLabel(model),
    screenStatus: model.paused ? "PAUSED" : control.screenStatus,
    overlayTitle: model.paused ? "Taking a breather." : "Round complete.",
    overlayNote: describeOverlay(model),
  };
}
