import { describe, expect, it } from "vitest";
import type { RenderFrame, SettingsValues } from "@/engine/sdk";
import { defaultVisuals } from "@/engine/rendering/default-visuals";
import preview from "@/games/snake/preview";

function draw(skin: keyof typeof preview, settings: SettingsValues) {
  const fills: { color: string; rect: number[] }[] = [];
  const strokes: { color: string; width: number }[] = [];
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    fillRect(this: { fillStyle: string }, ...rect: number[]) {
      fills.push({ color: this.fillStyle, rect });
    },
    stroke(this: { strokeStyle: string; lineWidth: number }) {
      strokes.push({ color: this.strokeStyle, width: this.lineWidth });
    },
  } as unknown as CanvasRenderingContext2D;
  const frame: RenderFrame = Object.freeze({
    time: 0,
    mode: "auto",
    paused: true,
    reducedMotion: true,
    visuals: defaultVisuals,
  });
  const image = preview[skin];
  image.draw(ctx, Object.freeze(settings), image, frame);
  return { fills, strokes };
}

describe("Snake settings preview", () => {
  it.each(["squares", "tapered"] as const)(
    "renders %s without a session or playable state and ignores board settings",
    (skin) => {
      const small = draw(skin, { columns: 8, rows: 8, ai: "safe" });
      const large = draw(skin, { columns: 40, rows: 32, ai: "explorer" });
      expect(large).toEqual(small);
      const image = preview[skin];
      expect(image.width).toBeGreaterThan(image.height * 6);
      for (const {
        rect: [x, y, width, height],
      } of small.fills) {
        expect(x! >= 0 && y! >= 0).toBe(true);
        expect(x! + width!).toBeLessThanOrEqual(image.width);
        expect(y! + height!).toBeLessThanOrEqual(image.height);
      }
      // Both styles share the accent head and eyes, with no food or board.
      expect(
        small.fills.filter(({ color }) => color === defaultVisuals.accent),
      ).toHaveLength(1);
      expect(
        small.fills.filter(({ color }) => color === defaultVisuals.background),
      ).toHaveLength(2);
      expect(
        small.fills.some(({ color }) => color === defaultVisuals.secondary),
      ).toBe(false);
      if (skin === "squares") {
        expect(small.strokes).toHaveLength(0);
        expect(
          small.fills.filter(
            ({ color, rect }) =>
              color === defaultVisuals.accentMuted && rect[2] === rect[3],
          ),
        ).toHaveLength(6);
      } else {
        expect(small.strokes).toHaveLength(6);
        expect(new Set(small.strokes.map(({ width }) => width)).size).toBe(5);
      }
    },
  );
});
