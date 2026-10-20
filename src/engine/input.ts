import type { Action, GameControl } from "@/engine/types";

export type Command =
  Action | "auto" | "pause" | "restart" | "focus" | "games" | "help";
const runtimeKeys = new Map<string, Command>([
  [" ", "pause"],
  ["a", "auto"],
  ["p", "pause"],
  ["r", "restart"],
  ["f", "focus"],
  ["g", "games"],
  ["/", "help"],
  ["?", "help"],
]);

const russianLetters = "йцукенгшщзфывапролдячсмить";
const physicalLetters = "qwertyuiopasdfghjklzxcvbnm";

function normalizeKey(key: string, code?: string): string {
  if (code && /^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (code === "Slash") return "/";
  const lower = key.toLowerCase();
  const russianIndex = russianLetters.indexOf(lower);
  return lower.length === 1 && russianIndex >= 0
    ? physicalLetters[russianIndex]!
    : lower;
}

export function keyCommand(
  key: string,
  controls: readonly GameControl[] = [],
  code?: string,
): Command | null {
  const normalized = normalizeKey(key, code);
  const runtime = runtimeKeys.get(normalized);
  if (runtime) return runtime;
  const control = controls.find(({ keys }) =>
    keys.some((binding) => binding.toLowerCase() === normalized),
  );
  return control?.action ?? (normalized === "enter" ? "primary" : null);
}

/** Native fields and modified browser shortcuts keep their normal behavior. */
export function listenKeyboard(
  dispatch: (command: Command) => void,
  getControls: () => readonly GameControl[],
) {
  const handler = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, select, textarea"))
    )
      return;
    if (
      event.key === "Enter" &&
      target instanceof HTMLElement &&
      target.closest("button, a, summary")
    )
      return;
    if (
      event.key === " " &&
      target instanceof HTMLElement &&
      target.closest("dialog[open] button, dialog[open] summary")
    )
      return;
    const command = keyCommand(event.key, getControls(), event.code);
    if (!command) return;
    event.preventDefault();
    if (event.repeat && !["left", "right", "down"].includes(command)) return;
    dispatch(command);
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
