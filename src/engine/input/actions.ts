import { normalizeKey } from "@/engine/input/lib/key-normalization";
import type { ActionRole, GameControl } from "@/engine/contracts/game";

export const engineActions = [
  { command: "pause", label: "Pause", keys: [" ", "p"], icon: "pause" },
  { command: "auto", label: "Autopilot", keys: ["a"], icon: "spark" },
  { command: "restart", label: "Restart", keys: ["r"], icon: "restart" },
  { command: "focus", label: "Focus", keys: ["f"], icon: "expand" },
  { command: "games", label: "Games", keys: ["g"], icon: "grid" },
  {
    command: "help",
    label: "All controls",
    keys: ["/", "?"],
    icon: "keyboard",
  },
] as const;
export type EngineCommand = (typeof engineActions)[number]["command"];
export type EngineInput =
  { kind: "engine"; command: EngineCommand } | { kind: "game"; action: string };
export const runtimeKeys = new Map<string, EngineCommand>(
  engineActions.flatMap((action) =>
    action.keys.map((key) => [key, action.command] as const),
  ),
);
export type PadPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
const positions: Record<ActionRole, PadPosition> = {
  "move-up": "top-center",
  rotate: "top-center",
  primary: "top-right",
  secondary: "top-left",
  "move-left": "bottom-left",
  "move-down": "bottom-center",
  "move-right": "bottom-right",
};

const isReservedKey = (key: string) =>
  runtimeKeys.has(key) || /^[1-9]$/.test(key) || key === "escape";

/** Layout derives only from semantic game roles, never from system commands. */
export function actionPositions(
  controls: readonly GameControl<string>[],
): Map<string, PadPosition> {
  const result = new Map<string, PadPosition>();
  const occupied = new Set<PadPosition>();
  const roles = new Set<ActionRole>();
  // Rotation may use a spare top slot after the fixed roles claim their slots.
  const fixedControls = controls.filter((control) => control.role !== "rotate");
  const rotationControls = controls.filter(
    (control) => control.role === "rotate",
  );
  for (const control of [...fixedControls, ...rotationControls]) {
    if (!control.role) continue;
    if (roles.has(control.role))
      throw new Error(`Duplicate pad role: ${control.role}`);
    roles.add(control.role);
    let position = positions[control.role];
    if (occupied.has(position) && control.role === "rotate") {
      const spare = (["top-left", "top-right"] as const).find(
        (slot) => !occupied.has(slot),
      );
      if (spare) position = spare;
    }
    if (occupied.has(position))
      throw new Error(`Conflicting pad roles: ${control.role}`);
    occupied.add(position);
    result.set(control.action, position);
  }
  return result;
}
export function validateActions(controls: readonly GameControl<string>[]) {
  const keys = new Set<string>();
  const ids = new Set<string>();
  for (const control of controls) {
    if (ids.has(control.action))
      throw new Error(`Duplicate action: ${control.action}`);
    ids.add(control.action);
    for (const key of control.keys) {
      const normalized = normalizeKey(key);
      if (keys.has(normalized) || isReservedKey(normalized))
        throw new Error(`Conflicting key: ${key}`);
      keys.add(normalized);
    }
  }
  actionPositions(controls);
}

export const actionSymbols: Record<ActionRole, string> = {
  "move-up": "↑",
  "move-left": "←",
  "move-down": "↓",
  "move-right": "→",
  rotate: "↻",
  primary: "⇓",
  secondary: "◇",
};
