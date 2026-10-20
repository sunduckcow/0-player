import { describe, expect, it } from "vitest";
import { palette } from "@/engine/draw";
import { createSnake } from "./game";
import { createSnakeGame } from "./index";
import { renderSnake, snakeTileWidth } from "./render";
import { normalizeSnakeOptions, type SnakeSkin } from "./settings";

describe("Snake skins", () => {
  it("defaults old preferences to squares and validates the selected skin", () => {
    expect(normalizeSnakeOptions().skin).toBe("squares");
    expect(normalizeSnakeOptions({ skin: "squares" }).skin).toBe("squares");
    expect(normalizeSnakeOptions({ skin: "tapered" }).skin).toBe("tapered");
    expect(normalizeSnakeOptions({ skin: "unknown" as SnakeSkin }).skin).toBe("squares");
  });

  it("stretches five pixel width steps across the whole body, including neck and tail", () => {
    expect(Array.from({ length: 5 }, (_, index) => snakeTileWidth(index + 1, 6, "tapered"))).toEqual([18, 16, 12, 8, 6]);
    for (const length of [40, 144, 576]) {
      const widths = Array.from({ length }, (_, index) => snakeTileWidth(index, length, "tapered"));
      expect(widths[0]).toBe(18);
      expect(widths[1]).toBe(18);
      expect(widths.at(-1)).toBe(6);
      expect([...new Set(widths)]).toEqual([18, 16, 12, 8, 6]);
      expect(widths.filter(width => width === 18).length).toBeGreaterThan(2);
      expect(widths.filter(width => width === 6).length).toBeGreaterThan(1);
      for (let i = 1; i < length; i++) {
        expect(widths[i]! - widths[i - 1]!).toBeLessThanOrEqual(0);
        expect(widths[i - 1]! - widths[i]!).toBeLessThanOrEqual(4);
      }
      expect(widths[Math.floor(length / 2)]).toBeGreaterThan(6);
    }
    for (const length of [1, 4, 12]) {
      for (let index = 0; index < length; index++)
        expect(snakeTileWidth(index, length, "tapered")).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps original squares and tapers only transverse width with short seams", () => {
    const state = {
      ...createSnake(42),
      body: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 9 }, { x: 6, y: 10 }, { x: 7, y: 10 }, { x: 8, y: 10 }],
    };
    const before = JSON.stringify(state);
    for (const skin of ["squares", "tapered"] as const) {
      const rectangles: number[][] = [];
      const paths: { points: number[][]; width: number }[] = [];
      let points: number[][] = [];
      const ctx = {
        fillStyle: "", strokeStyle: "", lineWidth: 1, globalAlpha: 1,
        fillRect(this: { fillStyle: string }, ...rect: number[]) { if (this.fillStyle === palette.body) rectangles.push(rect); },
        save() {}, restore() {}, closePath() {}, fill() {},
        beginPath() { points = []; },
        moveTo(x: number, y: number) { points.push([x, y]); },
        lineTo(x: number, y: number) { points.push([x, y]); },
        stroke(this: { strokeStyle: string; lineWidth: number }) {
          if (this.strokeStyle === palette.body) paths.push({ points, width: this.lineWidth });
        },
      } as unknown as CanvasRenderingContext2D;
      renderSnake(ctx, state, { time: 0, mode: "auto", paused: false }, skin);
      const tiles = rectangles.filter(rect => rect[2] === rect[3]);
      const joints = rectangles.filter(rect => rect[2]! > 20 || rect[3]! > 20);
      if (skin === "squares") {
        expect(paths).toHaveLength(0);
        expect(tiles).toHaveLength(state.body.length);
        expect(joints).toHaveLength(state.body.length - 1);
        expect(tiles.every(rect => rect[2] === 16)).toBe(true);
        expect(joints.every(rect => Math.min(rect[2]!, rect[3]!) === 10)).toBe(true);
        for (const [x, y, width, height] of rectangles as [number, number, number, number][]) {
          expect((x + width / 2) % 20).toBe(width > 20 ? 0 : 10);
          expect((y + height / 2) % 20).toBe(height > 20 ? 0 : 10);
        }
      } else {
        expect(paths).toHaveLength(state.body.length);
        expect(rectangles).toHaveLength(state.body.length - 1);
        expect(rectangles.every(rect => Math.min(rect[2]!, rect[3]!) === 2)).toBe(true);
        expect(new Set(paths.map(path => path.width)).size).toBe(5);
        for (const { points, width } of paths) {
          expect(width % 2).toBe(0);
          const [start, center, end] = points as [[number, number], [number, number], [number, number]];
          expect(center[0] % 20).toBe(10);
          expect(center[1] % 20).toBe(10);
          const distance = (a: number[], b: number[]) => Math.abs(a[0]! - b[0]!) + Math.abs(a[1]! - b[1]!);
          expect(distance(start, center) + distance(center, end)).toBe(18);
        }
        expect(paths.some(({ points }) => points[0]![0] !== points[2]![0] && points[0]![1] !== points[2]![1])).toBe(true);
      }
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it("preserves the same rules, AI and random sequence across skins", () => {
    const tapered = createSnakeGame({ skin: "tapered" });
    const squares = createSnakeGame({ skin: "squares" });
    let first = tapered.create(42);
    let second = squares.create(42);
    for (let step = 0; step < 200; step++) {
      const action = tapered.ai(first);
      expect(squares.ai(second)).toBe(action);
      first = tapered.update(first, action);
      second = squares.update(second, action);
    }
    expect(first).toEqual(second);
  });
});
