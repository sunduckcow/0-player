import type { Action, GameControl } from "@/engine/types";

function keyLabel(key: string) {
  const symbols: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "Enter",
    " ": "Space",
  };
  return symbols[key] ?? key.toUpperCase();
}

/** The legend and touch buttons use exactly the keyboard's game configuration. */
export function renderControlLayout(
  legend: HTMLElement,
  touch: HTMLElement | null,
  controls: readonly GameControl[],
  dispatch: (action: Action) => void,
) {
  const hints = document.createDocumentFragment();
  const pad = document.createElement("div");
  pad.className = "dpad";
  const touchActions = document.createDocumentFragment();
  for (const control of controls) {
    const button = document.createElement("button");
    button.className = "control-hint";
    button.setAttribute(
      "aria-label",
      `${control.label}: ${control.keys.map(keyLabel).join(" or ")}`,
    );
    button.dataset.action = control.action;
    const keys = document.createElement("span");
    keys.className = "control-keys";
    for (const key of control.keys) {
      const cap = document.createElement("kbd");
      cap.textContent = keyLabel(key);
      keys.append(cap);
    }
    const label = document.createElement("span");
    label.className = "control-description";
    label.textContent = control.label;
    button.append(keys, label);
    button.addEventListener("click", () => dispatch(control.action));
    hints.append(button);
    if (!control.touch) continue;
    const touchButton = document.createElement("button");
    const directional = ["up", "left", "down", "right"].includes(
      control.action,
    );
    touchButton.className = directional ? control.action : "touch-action";
    touchButton.textContent = control.touch;
    touchButton.dataset.action = control.action;
    touchButton.setAttribute("aria-label", control.label);
    touchButton.addEventListener("click", () => dispatch(control.action));
    (directional ? pad : touchActions).append(touchButton);
  }
  legend.replaceChildren(hints);
  touch?.replaceChildren(pad, touchActions);
}
