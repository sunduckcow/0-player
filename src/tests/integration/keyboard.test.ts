import { afterEach, describe, expect, it, vi } from "vitest";
import {
  keyCommand,
  listenKeyboard,
  type Command,
} from "@/engine/input/keyboard";
import type { GameControl } from "@/engine/contracts/game";
import { snake } from "@/games/snake/__tests__/helpers";
import { tetris } from "@/games/tetris/__tests__/helpers";
describe("configured keyboard vocabulary", () => {
  it("opens the library and control layout through workspace shortcuts", () => {
    expect(keyCommand("g")).toBe("games");
    expect(keyCommand("?")).toBe("help");
    expect(keyCommand("/")).toBe("help");
  });

  it("uses physical letter keys independently of the keyboard layout", () => {
    expect(keyCommand("п", [], "KeyG")).toBe("games");
    expect(keyCommand("ф", [], "KeyA")).toBe("auto");
    expect(keyCommand("з", [], "KeyP")).toBe("pause");
    expect(keyCommand("к", [], "KeyR")).toBe("restart");
    expect(keyCommand("а", [], "KeyF")).toBe("focus");
    expect(keyCommand(".", [], "Slash")).toBe("help");
    expect(keyCommand(",", [], "Slash")).toBe("help");
    expect(keyCommand("р", snake.controls, "KeyH")).toBe("left");
    expect(keyCommand("ч", tetris.controls, "KeyX")).toBe("up");
  });

  it("recognizes Russian letters when physical codes are unavailable", () => {
    expect(keyCommand("П")).toBe("games");
    expect(keyCommand("ф")).toBe("auto");
    expect(keyCommand("Л", snake.controls)).toBe("up");
    expect(keyCommand("ч", tetris.controls)).toBe("up");
  });
  const controls: readonly GameControl[] = [
    { action: "up", keys: ["ArrowUp", "k"], label: "Move up" },
    { action: "left", keys: ["ArrowLeft", "h"], label: "Move left" },
    { action: "down", keys: ["ArrowDown", "j"], label: "Move down" },
    { action: "right", keys: ["ArrowRight", "l"], label: "Move right" },
    { action: "secondary", keys: ["x"], label: "Secondary action" },
  ];

  it.each([
    ["ArrowLeft", "left"],
    ["k", "up"],
    ["K", "up"],
    [" ", "pause"],
    ["Enter", null],
    ["x", "secondary"],
    ["a", "auto"],
    ["KeyA", null],
    ["p", "pause"],
    ["r", "restart"],
    ["f", "focus"],
  ])("%s maps to %s", (key, action) => {
    expect(keyCommand(key, controls)).toBe(action);
  });

  it("uses custom bindings and normalizes configured keys", () => {
    const custom: readonly GameControl[] = [
      { action: "left", keys: ["Q"], label: "Move left" },
    ];
    expect(keyCommand("q", custom)).toBe("left");
    expect(keyCommand("Q", custom)).toBe("left");
    expect(keyCommand("ArrowLeft", custom)).toBe(null);
    expect(keyCommand("h", custom)).toBe(null);
  });

  it("leaves unconfigured game keys inactive", () => {
    expect(keyCommand("ArrowLeft")).toBe(null);
    expect(keyCommand("h")).toBe(null);
    expect(keyCommand("x")).toBe(null);
    expect(keyCommand("Enter")).toBe(null);
  });

  it.each([
    [" ", "pause"],
    ["a", "auto"],
    ["P", "pause"],
    ["r", "restart"],
    ["F", "focus"],
  ])("keeps reserved %s independent of game bindings", (key, command) => {
    expect(
      keyCommand(key, [{ action: "left", keys: [key], label: "Move left" }]),
    ).toBe(command);
  });

  it("allows configured Enter actions before the primary fallback", () => {
    expect(
      keyCommand("Enter", [
        { action: "secondary", keys: ["Enter"], label: "Secondary action" },
      ]),
    ).toBe("secondary");
  });

  it("uses each game's controls for steering, rotation and hard drop", () => {
    expect(keyCommand("h", snake.controls)).toBe("left");
    expect(keyCommand("K", snake.controls)).toBe("up");
    expect(keyCommand("x", snake.controls)).toBe(null);
    expect(keyCommand("X", tetris.controls)).toBe("up");
    expect(keyCommand("j", tetris.controls)).toBe("down");
    expect(keyCommand("Enter", tetris.controls)).toBe("primary");
  });
});
describe("keyboard listener", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("dispatches Russian physical shortcuts without capturing fields, modifiers or composition", () => {
    const keyboard = new EventTarget();
    class Target {
      isContentEditable = false;
      private field: boolean;
      constructor(field = false) {
        this.field = field;
      }
      closest(selector: string) {
        return selector === "input, select, textarea" && this.field
          ? this
          : null;
      }
    }
    vi.stubGlobal("window", keyboard);
    vi.stubGlobal("HTMLElement", Target);
    const commands: Command[] = [];
    const stop = listenKeyboard(
      (input) =>
        commands.push(input.kind === "engine" ? input.command : input.action),
      () => snake.controls,
    );
    const press = (extra: Record<string, unknown> = {}, field = false) => {
      const event = Object.assign(new Event("keydown", { cancelable: true }), {
        key: "п",
        code: "KeyG",
        ...extra,
      });
      Object.defineProperty(event, "target", { value: new Target(field) });
      keyboard.dispatchEvent(event);
      return event.defaultPrevented;
    };
    try {
      expect(press()).toBe(true);
      expect(press({}, true)).toBe(false);
      expect(press({ ctrlKey: true })).toBe(false);
      expect(press({ metaKey: true })).toBe(false);
      expect(press({ altKey: true })).toBe(false);
      expect(press({ isComposing: true })).toBe(false);
      expect(press({ key: "р", code: "KeyH" })).toBe(true);
      expect(press({ key: ".", code: "Slash" })).toBe(true);
      expect(commands).toEqual(["games", "left", "help"]);
    } finally {
      stop();
    }
  });

  it("keeps native Space on dialog buttons while Space on toolbar buttons pauses", () => {
    const keyboard = new EventTarget();
    class ButtonTarget {
      inDialog: boolean;
      constructor(inDialog: boolean) {
        this.inDialog = inDialog;
      }
      closest(selector: string) {
        if (selector.includes("dialog")) return this.inDialog ? this : null;
        return selector === "button, a, summary" ? this : null;
      }
    }
    vi.stubGlobal("window", keyboard);
    vi.stubGlobal("HTMLElement", ButtonTarget);
    const commands: Command[] = [];
    const stop = listenKeyboard(
      (input) =>
        commands.push(input.kind === "engine" ? input.command : input.action),
      () => [],
    );
    const press = (inDialog: boolean, repeat = false) => {
      const event = Object.assign(new Event("keydown", { cancelable: true }), {
        key: " ",
        repeat,
      });
      Object.defineProperty(event, "target", {
        value: new ButtonTarget(inDialog),
      });
      keyboard.dispatchEvent(event);
      return event.defaultPrevented;
    };
    try {
      expect(press(true)).toBe(false);
      expect(commands).toEqual([]);
      expect(press(false)).toBe(true);
      expect(commands).toEqual(["pause"]);
      expect(press(false, true)).toBe(true);
      expect(commands).toEqual(["pause"]);
    } finally {
      stop();
    }
  });

  it("reads the active game's controls again for every key press", () => {
    const keyboard = new EventTarget();
    vi.stubGlobal("window", keyboard);
    vi.stubGlobal("HTMLElement", class {});
    let controls: readonly GameControl[] = [
      { action: "left", keys: ["q"], label: "Move left" },
    ];
    const commands: Command[] = [];
    const stop = listenKeyboard(
      (input) =>
        commands.push(input.kind === "engine" ? input.command : input.action),
      () => controls,
    );
    const press = (key: string) => {
      const event = Object.assign(new Event("keydown", { cancelable: true }), {
        key,
      });
      keyboard.dispatchEvent(event);
      return event.defaultPrevented;
    };

    try {
      expect(press("q")).toBe(true);
      controls = [{ action: "right", keys: ["e"], label: "Move right" }];
      expect(press("q")).toBe(false);
      expect(press("E")).toBe(true);
      expect(press(" ")).toBe(true);
      expect(commands).toEqual(["left", "right", "pause"]);
    } finally {
      stop();
    }
  });
});
