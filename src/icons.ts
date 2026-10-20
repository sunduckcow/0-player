import {
  ArrowRight, Blocks, ChevronDown, Expand, Gamepad2, Grid2x2,
  Keyboard, Pause, Play, RotateCcw, Search, Settings2, Shuffle,
  Sparkles, X, createElement, type IconNode,
} from "lucide";

const snakeMark: IconNode = [["path", {
  d: "M4 19h10a3 3 0 0 0 0-6H8a4 4 0 0 1 0-8h11v4H9",
}]];

const icons = {
  expand: Expand, pause: Pause, play: Play, restart: RotateCcw,
  shuffle: Shuffle, snake: snakeMark, blocks: Blocks, spark: Sparkles,
  gamepad: Gamepad2, chevron: ChevronDown, keyboard: Keyboard,
  search: Search, close: X, grid: Grid2x2, arrow: ArrowRight,
  settings: Settings2,
};

/** Named imports let Vite include only the icons used by this tiny shell. */
export function iconElement(name: string) {
  const node = icons[name as keyof typeof icons];
  if (!node) return null;
  return createElement(node, {
    "aria-hidden": "true", width: 24, height: 24, "stroke-width": 1.5,
  });
}

export function icon(name: string) {
  return iconElement(name)?.outerHTML ?? "";
}

export function hydrateIcons() {
  document.querySelectorAll<HTMLElement>("[data-icon]:not(svg)").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon!);
  });
}
