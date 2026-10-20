import { describe, expect, it } from "vitest";
import { gameShortcut, nextGameIndex } from "@/library-navigation";

describe("library keyboard selection", () => {
  it("starts at the first or last result when navigation begins in search", () => {
    expect(nextGameIndex(-1, "ArrowDown", 7, 3)).toBe(0);
    expect(nextGameIndex(-1, "ArrowRight", 7, 3)).toBe(0);
    expect(nextGameIndex(-1, "ArrowUp", 7, 3)).toBe(6);
    expect(nextGameIndex(-1, "ArrowLeft", 7, 3)).toBe(6);
  });

  it("moves vertically by the real grid width and horizontally by one card", () => {
    expect(nextGameIndex(1, "ArrowDown", 7, 3)).toBe(4);
    expect(nextGameIndex(4, "ArrowUp", 7, 3)).toBe(1);
    expect(nextGameIndex(3, "ArrowRight", 7, 3)).toBe(4);
    expect(nextGameIndex(3, "ArrowLeft", 7, 3)).toBe(2);
  });

  it("lets up and down select both games when the grid has a single row", () => {
    expect(nextGameIndex(0, "ArrowDown", 2, 2)).toBe(1);
    expect(nextGameIndex(1, "ArrowDown", 2, 2)).toBe(0);
    expect(nextGameIndex(1, "ArrowUp", 2, 2)).toBe(0);
    expect(nextGameIndex(0, "ArrowUp", 2, 2)).toBe(1);
  });

  it("clamps to an incomplete row and wraps at list edges", () => {
    expect(nextGameIndex(4, "ArrowDown", 7, 3)).toBe(6);
    expect(nextGameIndex(6, "ArrowDown", 7, 3)).toBe(0);
    expect(nextGameIndex(0, "ArrowUp", 7, 3)).toBe(6);
    expect(nextGameIndex(6, "ArrowRight", 7, 3)).toBe(0);
    expect(nextGameIndex(0, "ArrowLeft", 7, 3)).toBe(6);
    expect(nextGameIndex(3, "Home", 7, 3)).toBe(0);
    expect(nextGameIndex(3, "End", 7, 3)).toBe(6);
  });

  it("does nothing for empty results or unrelated text editing keys", () => {
    expect(nextGameIndex(-1, "ArrowDown", 0, 3)).toBe(-1);
    expect(nextGameIndex(1, "Backspace", 7, 3)).toBe(1);
  });

  it("maps only the displayed catalog numbers, including physical/numpad digits", () => {
    expect(gameShortcut("1")).toBe(0);
    expect(gameShortcut("9")).toBe(8);
    expect(gameShortcut("2", "Digit2")).toBe(1);
    expect(gameShortcut("3", "Numpad3")).toBe(2);
    expect(gameShortcut("0")).toBe(null);
    expect(gameShortcut("x")).toBe(null);
    expect(gameShortcut("!", "Digit1")).toBe(0);
  });
});
