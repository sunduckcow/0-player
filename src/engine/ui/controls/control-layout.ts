import type { GameControl } from "@/engine/contracts/game";
import { renderTouchControls } from "./touch-controls";

function formatKeyLabel(key: string) {
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

function createControlLegend(
  controls: readonly GameControl<string>[],
  dispatch: (action: string) => void,
) {
  const hints = document.createDocumentFragment();
  const rows = new Map<string, GameControl<string>[]>();
  for (const control of controls) {
    const id = control.group
      ? `group:${control.group}`
      : `action:${control.action}`;
    const row = rows.get(id) ?? [];
    row.push(control);
    rows.set(id, row);
  }
  for (const row of rows.values()) {
    const control = row[0]!;
    const grouped = Boolean(control.group);
    const hint = document.createElement(grouped ? "div" : "button");
    hint.className = "control-hint";
    hint.setAttribute(
      "aria-label",
      row
        .map(
          (item) =>
            `${item.label}: ${item.keys.map(formatKeyLabel).join(" or ")}`,
        )
        .join("; "),
    );
    if (hint instanceof HTMLButtonElement) {
      hint.type = "button";
      hint.dataset.action = control.action;
      hint.addEventListener("click", () => dispatch(control.action));
    } else {
      hint.setAttribute("role", "group");
    }
    const keys = document.createElement("span");
    keys.className = "control-keys";
    const allKeys = [...new Set(row.flatMap((item) => [...item.keys]))];
    const labels = grouped
      ? [
          allKeys
            .filter((key) => key.startsWith("Arrow"))
            .map(formatKeyLabel)
            .join(""),
          allKeys
            .filter((key) => key.length === 1)
            .sort()
            .map(formatKeyLabel)
            .join(""),
          ...allKeys
            .filter((key) => !key.startsWith("Arrow") && key.length !== 1)
            .map(formatKeyLabel),
        ].filter(Boolean)
      : allKeys.map(formatKeyLabel);
    for (const [index, text] of labels.entries()) {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "control-key-separator";
        separator.textContent = "/";
        separator.setAttribute("aria-hidden", "true");
        keys.append(separator);
      }
      const cap = document.createElement("kbd");
      cap.textContent = text;
      keys.append(cap);
    }
    const label = document.createElement("span");
    label.className = "control-description";
    label.textContent = control.group ?? control.label;
    hint.append(keys, label);
    hints.append(hint);
  }
  return hints;
}

/** The legend and touch buttons use exactly the keyboard's game configuration. */
export function renderControlLayout(
  legend: HTMLElement,
  touch: HTMLElement | null,
  controls: readonly GameControl<string>[],
  dispatch: (action: string) => void,
) {
  legend.replaceChildren(createControlLegend(controls, dispatch));
  if (touch) renderTouchControls(touch, controls, dispatch);
}
