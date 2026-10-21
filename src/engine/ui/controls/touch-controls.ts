import { actionPositions, actionSymbols } from "@/engine/input/actions";
import type { GameControl } from "@/engine/contracts/game";

export function renderTouchControls(
  touch: HTMLElement,
  controls: readonly GameControl<string>[],
  dispatch: (action: string) => void,
) {
  const slots = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ] as const;
  const positions = actionPositions(controls);
  const buttons = new Map<string, HTMLButtonElement>();
  function createTouchButton(
    symbolText: string,
    label: string,
    caption?: string,
  ) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "touch-action";
    const symbol = document.createElement("span");
    symbol.className = "touch-symbol";
    symbol.textContent = symbolText;
    symbol.setAttribute("aria-hidden", "true");
    button.append(symbol);
    if (caption) {
      const text = document.createElement("span");
      text.className = "touch-label";
      text.textContent = caption;
      button.append(text);
    }
    button.setAttribute("aria-label", label);
    return button;
  }
  for (const control of controls) {
    if (!control.role) continue;
    const button = createTouchButton(
      control.symbol ?? actionSymbols[control.role],
      control.label,
      control.shortLabel,
    );
    button.dataset.action = control.action;
    button.addEventListener("click", () => dispatch(control.action));
    buttons.set(positions.get(control.action)!, button);
  }
  touch.replaceChildren(
    ...slots.flatMap((slot) => {
      const button = buttons.get(slot);
      if (!button) return [];
      button.dataset.position = slot;
      return [button];
    }),
  );
}
