import type { Action, GameControl } from "@/engine/sdk";
export default [
  {
    action: "up",
    role: "move-up",
    keys: ["ArrowUp", "k"],
    label: "Move up",
    group: "Move",
    symbol: "↑",
  },
  {
    action: "left",
    role: "move-left",
    repeat: true,
    keys: ["ArrowLeft", "h"],
    label: "Move left",
    group: "Move",
    symbol: "←",
  },
  {
    action: "down",
    role: "move-down",
    repeat: true,
    keys: ["ArrowDown", "j"],
    label: "Move down",
    group: "Move",
    symbol: "↓",
  },
  {
    action: "right",
    role: "move-right",
    repeat: true,
    keys: ["ArrowRight", "l"],
    label: "Move right",
    group: "Move",
    symbol: "→",
  },
] satisfies readonly GameControl<Action>[];
