import type { GameControl } from "@/engine/contracts/game";
import { runtimeKeys, type EngineInput } from "./actions";
import { normalizeKey } from "@/engine/input/lib/key-normalization";

export type Command = string;

export function keyCommand(
  key: string,
  controls: readonly GameControl<string>[] = [],
  code?: string,
): Command | null {
  const normalized = normalizeKey(key, code);
  const runtime = runtimeKeys.get(normalized);
  if (runtime) return runtime;
  const control = controls.find(({ keys }) =>
    keys.some((binding) => normalizeKey(binding) === normalized),
  );
  return control?.action ?? null;
}

function keepsNativeBehavior(event: KeyboardEvent): boolean {
  const browserShortcut = event.ctrlKey || event.altKey || event.metaKey;
  if (event.defaultPrevented || event.isComposing || browserShortcut)
    return true;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest("input, select, textarea"))
    return true;
  if (event.key === "Enter" && target.closest("button, a, summary"))
    return true;
  return (
    event.key === " " &&
    Boolean(target.closest("dialog[open] button, dialog[open] summary"))
  );
}

function keyboardInput(
  event: KeyboardEvent,
  controls: readonly GameControl<string>[],
  terminal: () => boolean,
): EngineInput | null {
  if (event.key === "Enter" && terminal())
    return { kind: "engine", command: "restart" };
  const normalized = normalizeKey(event.key, event.code);
  const command = runtimeKeys.get(normalized);
  if (command) return { kind: "engine", command };
  const action = keyCommand(event.key, controls, event.code);
  return action ? { kind: "game", action } : null;
}

/** Native fields and modified browser shortcuts keep their normal behavior. */
export function listenKeyboard(
  dispatch: (input: EngineInput) => void,
  getControls: () => readonly GameControl<string>[],
  terminal: () => boolean = () => false,
) {
  const handler = (event: KeyboardEvent) => {
    if (keepsNativeBehavior(event)) return;
    const controls = getControls();
    const input = keyboardInput(event, controls, terminal);
    if (!input) return;
    event.preventDefault();
    if (event.repeat) {
      if (input.kind === "engine") return;
      const control = controls.find(
        (control) => control.action === input.action,
      );
      if (!control?.repeat) return;
    }
    dispatch(input);
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
