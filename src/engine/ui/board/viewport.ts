import { element } from "@/engine/ui/lib/dom";
import { resizeBoardLabels } from "./board-labels";

export function fitBoardViewport(board: { width: number; height: number }) {
  const available = element("stage-center").getBoundingClientRect();
  const screen = element("screen");
  const style = getComputedStyle(screen);
  const horizontal =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2;
  const vertical =
    element("screen-label").parentElement!.getBoundingClientRect().height +
    element("board-caption").parentElement!.getBoundingClientRect().height +
    2;
  const ratio = board.width / board.height;
  const width = Math.max(
    0,
    Math.floor(
      Math.min(
        available.width - horizontal,
        (available.height - vertical) * ratio,
      ),
    ),
  );
  screen.style.width = `${width + horizontal}px`;
  screen.style.height = `${Math.floor(width / ratio) + vertical}px`;
  resizeBoardLabels(element("board-labels"), width / board.width);
}
