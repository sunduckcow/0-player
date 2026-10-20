import type { BoardLabel } from "@/engine/types";

/** Pixel art stays on Canvas; text is laid out by the browser at display size. */
export function renderBoardLabels(
  container: HTMLElement,
  labels: readonly BoardLabel[],
  board: { width: number; height: number },
) {
  const elements = labels.map((label) => {
    const span = document.createElement("span");
    span.textContent = label.text;
    span.style.left = `${label.x / board.width * 100}%`;
    span.style.top = `${label.y / board.height * 100}%`;
    span.dataset.size = String(label.size ?? 12);
    return span;
  });
  container.replaceChildren(...elements);
}

export function resizeBoardLabels(container: HTMLElement, scale: number) {
  for (const element of container.children) {
    if (element instanceof HTMLElement)
      element.style.fontSize = `${Math.max(10, Number(element.dataset.size) * scale)}px`;
  }
}
