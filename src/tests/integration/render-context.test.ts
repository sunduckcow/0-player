import { describe, expect, it } from "vitest";
import { appearancePalette } from "@/engine/theme/appearance";
import { renderSnake } from "@/games/snake/__tests__/helpers";
import { createSnake } from "@/games/snake/__tests__/helpers";
import { render as renderTetris } from "@/games/tetris/__tests__/helpers";
import { create, kinds } from "@/games/tetris/__tests__/helpers";
import type { VisualTheme } from "@/engine/contracts/visuals";
interface Mark {
  kind: string;
  color: string;
  alpha: number;
  x: number;
  y: number;
}
function recorder() {
  const marks: Mark[] = [];
  const stack: {
    fillStyle: string;
    strokeStyle: string;
    globalAlpha: number;
  }[] = [];
  const context = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    fillRect(x: number, y: number) {
      marks.push({
        kind: "fill",
        color: this.fillStyle,
        alpha: this.globalAlpha,
        x,
        y,
      });
    },
    strokeRect(x: number, y: number) {
      marks.push({
        kind: "stroke",
        color: this.strokeStyle,
        alpha: this.globalAlpha,
        x,
        y,
      });
    },
    fill() {
      marks.push({
        kind: "shape",
        color: this.fillStyle,
        alpha: this.globalAlpha,
        x: 0,
        y: 0,
      });
    },
    stroke() {
      marks.push({
        kind: "path",
        color: this.strokeStyle,
        alpha: this.globalAlpha,
        x: 0,
        y: 0,
      });
    },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    save() {
      stack.push({
        fillStyle: this.fillStyle,
        strokeStyle: this.strokeStyle,
        globalAlpha: this.globalAlpha,
      });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
  };
  return { ctx: context as unknown as CanvasRenderingContext2D, marks };
}
const themes = [
  appearancePalette({ theme: "dark", accent: "lime" }, false).palette,
  appearancePalette({ theme: "light", accent: "cyan" }, false).palette,
];
const frame = (visuals: VisualTheme) => ({
  time: 0,
  mode: "auto" as const,
  paused: false,
  visuals,
  reducedMotion: false,
});
describe("injected rendering context", () => {
  it("renders the same Snake through two isolated themes using semantic tokens", () => {
    const state = createSnake(42);
    const before = structuredClone(state);
    for (const skin of ["squares", "tapered"] as const)
      for (const visuals of themes) {
        const { ctx, marks } = recorder();
        renderSnake(ctx, state, frame(visuals), skin);
        const colors = marks.map((m) => m.color);
        expect(colors).toContain(visuals.background);
        expect(colors).toContain(visuals.accent);
        expect(colors).toContain(visuals.secondary);
        expect(colors).toContain(visuals.accentMuted);
        marks.length = 0;
        renderSnake(
          ctx,
          state,
          { ...frame(visuals), recovery: { progress: 0.5, steps: 2 } },
          skin,
        );
        expect(marks.map((m) => m.color)).toContain(
          visuals.effects.recoveryStrong,
        );
      }
    expect(state).toEqual(before);
    expect(themes[0]!.accent).not.toBe(themes[1]!.accent);
  });
  it("uses each category consistently for Tetris stack, active, ghost and next piece", () => {
    for (const visuals of themes)
      for (const kind of kinds) {
        const state = create(42);
        state.board[19] = [1, 2, 3, 4, 5, 6, 7, 0, 0, 0];
        state.piece = { kind, x: 3, y: 1, rotation: 0 };
        state.bag = [kind];
        const before = structuredClone(state);
        const { ctx, marks } = recorder();
        renderTetris(ctx, state, frame(visuals));
        const color = visuals.categorical[kinds.indexOf(kind)]!;
        for (let i = 0; i < 7; i++)
          expect(
            marks.some(
              (m) =>
                m.kind === "fill" &&
                m.y >= 438 &&
                m.color === visuals.categorical[i],
            ),
          ).toBe(true);
        expect(
          marks.some(
            (m) =>
              m.kind === "fill" && m.x < 250 && m.y < 200 && m.color === color,
          ),
        ).toBe(true);
        expect(
          marks.some(
            (m) =>
              m.kind === "fill" && m.x >= 270 && m.y < 140 && m.color === color,
          ),
        ).toBe(true);
        expect(
          marks.some(
            (m) =>
              m.kind === "stroke" &&
              m.color === color &&
              m.alpha === visuals.effects.ghostOpacity,
          ),
        ).toBe(true);
        expect(state).toEqual(before);
      }
  });
});
