import { describe, expect, it } from "vitest";
import { actionPositions, engineActions, validateActions } from "../actions";
import { keyCommand } from "../keyboard";
import type { GameControl } from "@/engine/contracts/game";
const control = (
  action: string,
  role: GameControl<string>["role"],
  key = action,
): GameControl<string> => ({ action, role, keys: [key], label: action });
describe("declared game actions", () => {
  it("has an independent stable runtime command list for 0,4,5,6 game actions", () => {
    const all = [
      control("north", "move-up"),
      control("west", "move-left"),
      control("south", "move-down"),
      control("east", "move-right"),
      control("drop", "primary"),
      control("hold", "secondary"),
    ];
    for (const count of [0, 4, 5, 6]) {
      const pad = actionPositions(all.slice(0, count));
      expect(pad.size).toBe(count);
      expect(
        [...pad.keys()].every((id) => all.some((c) => c.action === id)),
      ).toBe(true);
      expect(engineActions.slice(0, 3).map((a) => a.command)).toEqual([
        "pause",
        "auto",
        "restart",
      ]);
    }
  });
  it("reserves engine keys and rejects duplicate ids, keys and crowded roles", () => {
    expect(() => validateActions([control("jump", "primary", "a")])).toThrow();
    expect(() =>
      validateActions([
        control("jump", "primary", "j"),
        control("jump", "secondary", "k"),
      ]),
    ).toThrow();
    expect(() =>
      validateActions([
        control("jump", "primary", "j"),
        control("duck", "secondary", "J"),
      ]),
    ).toThrow();
    expect(() =>
      validateActions([control("jump", "primary"), control("duck", "primary")]),
    ).toThrow();
    expect(() =>
      validateActions([control("drop", "primary", "Enter")]),
    ).not.toThrow();
  });
});

it("allocates up and rotation independently of declaration order and reserves library shortcuts", () => {
  const up = control("upward", "move-up", "u"),
    rotate = control("turn", "rotate", "t");
  for (const controls of [
    [up, rotate],
    [rotate, up],
  ]) {
    const positions = actionPositions(controls);
    expect(positions.get("upward")).toBe("top-center");
    expect(positions.get("turn")).toBe("top-left");
  }
  for (const key of ["1", "5", "9", "Escape"])
    expect(() => validateActions([control("jump", "primary", key)])).toThrow();
});

it("canonicalizes declared and runtime keyboard layouts identically", () => {
  expect(() => validateActions([control("jump", "primary", "ф")])).toThrow();
  expect(() =>
    validateActions([
      control("jump", "primary", "h"),
      control("duck", "secondary", "р"),
    ]),
  ).toThrow();
  const controls = [control("jump", "primary", "р")];
  expect(() => validateActions(controls)).not.toThrow();
  expect(keyCommand("h", controls)).toBe("jump");
  expect(keyCommand("р", controls)).toBe("jump");
  expect(() =>
    actionPositions([
      control("turn", "rotate", "t"),
      control("spin", "rotate", "s"),
    ]),
  ).toThrow();
});
