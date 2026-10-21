import type { SettingPreview } from "@/engine/sdk";
import type { Cell, SnakeSkin } from "@/games/snake/types";
import bodyRendering from "@/games/snake/body-render";

// Display geometry only: no score, food, RNG, board dimensions or playable state.
const segments: readonly Cell[] = Array.from(
  { length: 6 },
  (_, segmentIndex) => ({
    x: 6 - segmentIndex,
    y: 0,
  }),
);
function createSkinPreview(skin: SnakeSkin): SettingPreview {
  return {
    width: bodyRendering.cellSize * 8,
    height: bodyRendering.cellSize,
    draw(ctx, _values, _bounds, frame) {
      bodyRendering.draw(ctx, segments, "right", frame, skin);
    },
  };
}
export default {
  tapered: createSkinPreview("tapered"),
  squares: createSkinPreview("squares"),
};
