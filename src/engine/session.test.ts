import { afterEach, describe, expect, it, vi } from "vitest";
import { Session } from "@/engine/session";
import { nextSeed } from "@/engine/random";
import { keyCommand, listenKeyboard, type Command } from "@/engine/input";
import type { Game, GameControl, GameState } from "@/engine/types";
import { snake } from "@/games/snake";
import { tetris } from "@/games/tetris";

interface Counter extends GameState {
  actions: string[];
}
const game: Game<Counter> = {
  id: "counter",
  title: "Counter",
  description: "",
  strategy: "",
  controls: [],
  width: 100,
  height: 100,
  tickMs: 100,
  create: () => ({ score: 0, over: false, actions: [] }),
  update: (state, action) => ({
    score: state.score + 1,
    over: false,
    actions: [...state.actions, action ?? "wait"],
  }),
  ai: () => "right",
  render: () => {},
  metrics: () => [],
};

describe("session control and clock", () => {
  it.each([0.5, 1, 2, 4])("applies the same %s× multiplier to games with different base tick lengths", (speed) => {
    const fast = new Session({ ...game, id: "fast-counter", tickMs: 100 }, 7);
    const slow = new Session({ ...game, id: "slow-counter", tickMs: 200 }, 7);
    for (const session of [fast, slow]) session.setSpeed(speed);
    const advance = (delta: number) => {
      fast.advanceFrame(delta);
      slow.advanceFrame(delta);
    };
    const fastTickMs = 100 / speed;

    advance(fastTickMs - 1);
    expect([fast.state.score, slow.state.score]).toEqual([0, 0]);
    advance(1);
    expect([fast.state.score, slow.state.score]).toEqual([1, 0]);

    advance(fastTickMs - 1);
    expect([fast.state.score, slow.state.score]).toEqual([1, 0]);
    advance(1);
    expect([fast.state.score, slow.state.score]).toEqual([2, 1]);
  });

  it("eases browser speed while immediately preserving the selected target in saves", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    expect(session.speed).toBe(4);
    expect(session.snapshot().autoSpeed).toBe(4);
    expect(session.playbackSpeed).toBe(1);
    session.advanceFrame(87.5);
    expect(session.playbackSpeed).toBeCloseTo(1.46875);
    session.advanceFrame(87.5);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
  });

  it("retargets a running speed transition without jumping or overshooting", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.setSpeed(0.5, true);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBeCloseTo(1.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(0.5);
  });

  it("keeps progress toward the next tick when smoothly changing speed", () => {
    const session = new Session(game, 7);
    session.advanceFrame(90);
    session.setSpeed(2, true);
    session.advanceFrame(5);
    expect(session.state.score).toBe(0);
    session.advanceFrame(5);
    expect(session.state.score).toBe(1);
  });

  it("integrates a transition independently of browser frame partitioning", () => {
    const slow = { ...game, tickMs: 1000 };
    const whole = new Session(slow, 7);
    const split = new Session(slow, 7);
    whole.setSpeed(4, true);
    split.setSpeed(4, true);
    whole.advanceFrame(350);
    for (let frame = 0; frame < 35; frame++) split.advanceFrame(10);
    // The ramp averages 2.5x: 875ms accumulated, then another32ms at4x crosses one tick.
    expect(whole.state.score).toBe(0);
    expect(split.state.score).toBe(0);
    whole.advanceFrame(31);
    split.advanceFrame(31);
    expect(whole.state.score).toBe(0);
    expect(split.state.score).toBe(0);
    whole.advanceFrame(1);
    split.advanceFrame(1);
    expect(whole.state.score).toBe(1);
    expect(split.state).toEqual(whole.state);
  });

  it("takes over at 1x immediately and can ease back into remembered autopilot speed", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.takeControl();
    expect(session.playbackSpeed).toBe(1);
    expect(session.autoSpeed).toBe(4);
    session.automate(true);
    expect(session.speed).toBe(4);
    expect(session.playbackSpeed).toBe(1);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
  });

  it("freezes a speed transition while paused and discards it on restart or restore", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(175);
    session.togglePause();
    session.advanceFrame(1000);
    expect(session.playbackSpeed).toBeCloseTo(2.5);
    session.togglePause();
    session.advanceFrame(175);
    expect(session.playbackSpeed).toBe(4);
    session.setSpeed(0.5, true);
    session.advanceFrame(175);
    session.restart();
    expect(session.playbackSpeed).toBe(0.5);
    session.setSpeed(4, true);
    const restored = new Session(game, 9);
    restored.restore(session.snapshot());
    expect(restored.playbackSpeed).toBe(4);
  });

  it("uses immediate rates for reduced motion and direct simulations", () => {
    const session = new Session(game, 7);
    session.setSpeed(4, true);
    session.advanceFrame(25, false);
    expect(session.playbackSpeed).toBe(4);
    expect(session.state.score).toBe(1);
    session.setSpeed(0.5, true);
    session.advance(200);
    expect(session.playbackSpeed).toBe(0.5);
    expect(session.state.score).toBe(2);
  });

  it("keeps recovery time real while a speed transition is active at the loss", () => {
    const session = new Session({
      ...game,
      recovery: { steps: 1, durationMs: 500, canResume: () => false },
      update: (state: Counter) => ({ ...state, over: true }),
    }, 7);
    session.setSpeed(4, true);
    session.advanceFrame(100);
    expect(session.recovering).toBe(true);
    session.advanceFrame(499);
    expect(session.recovering).toBe(true);
    session.advanceFrame(1);
    expect(session.recovering).toBe(false);
    expect(session.round).toBe(2);
  });

  it("limits a delayed browser frame to one move instead of repeated AI catch-up", () => {
    const session = new Session(game, 7);
    session.setSpeed(4);
    session.advanceFrame(2000);
    expect(session.state.actions).toEqual(["right"]);
    session.input("left");
    session.advanceFrame(1000);
    expect(session.state.actions).toEqual(["right", "left"]);
    session.togglePause();
    session.advanceFrame(2000);
    expect(session.state.score).toBe(2);
  });

  it("preserves fractional time and the selected speed on healthy browser frames", () => {
    const session = new Session(game, 7);
    session.setSpeed(4);
    for (let frame = 0; frame < 125; frame++) session.advanceFrame(16);
    expect(session.state.score).toBe(80);
    const board = session.state;
    session.advanceFrame(Infinity);
    session.advanceFrame(NaN);
    expect(session.state).toBe(board);
  });

  it("retains the fractional remainder of a long delayed browser frame", () => {
    const session = new Session(game, 7);
    session.advanceFrame(1050);
    expect(session.state.score).toBe(1);
    session.advanceFrame(49);
    expect(session.state.score).toBe(1);
    session.advanceFrame(1);
    expect(session.state.score).toBe(2);
  });

  it.each([0.5, 2, 4])("uses 1× for manual control and restores autopilot speed %s×", (speed) => {
    const session = new Session(game, 7);
    session.setSpeed(speed);
    session.advance(100 / speed);
    const board = session.state;
    session.input("left");
    expect(session.state).toBe(board);
    expect(session.speed).toBe(1);
    expect(session.autoSpeed).toBe(speed);
    session.advance(99);
    expect(session.state).toBe(board);
    session.advance(1);
    expect(session.state.actions).toEqual(["right", "left"]);
    session.automate();
    expect(session.speed).toBe(speed);
    session.advance(100 / speed);
    expect(session.state.actions).toEqual(["right", "left", "right"]);
  });

  it("preserves the remembered speed across manual saves, restart and button takeover", () => {
    const original = new Session(game, 7);
    original.setSpeed(4);
    original.togglePause();
    original.takeControl();
    expect(original.speed).toBe(1);
    const restored = new Session(game, 1);
    restored.restore(original.snapshot());
    expect(restored.paused).toBe(true);
    expect(restored.speed).toBe(1);
    restored.restart();
    expect(restored.speed).toBe(1);
    restored.automate();
    expect(restored.speed).toBe(4);
    const legacy = new Session(game, 1);
    legacy.restore({ ...original.snapshot(), autoSpeed: undefined, speed: 2 });
    expect(legacy.speed).toBe(1);
    legacy.automate();
    expect(legacy.speed).toBe(2);
  });

  it("starts in AI, takes over immediately and gives AI the same current board", () => {
    const session = new Session(game, 7);
    session.advance(100);
    expect(session.state.actions).toEqual(["right"]);
    session.input("up");
    expect(session.mode).toBe("human");
    session.advance(100);
    expect(session.state.actions).toEqual(["right", "up"]);
    session.input("left");
    session.automate();
    session.advance(100);
    expect(session.state.actions).toEqual(["right", "up", "right"]);
  });

  it("consumes at most one queued action per tick and bounds rapid input", () => {
    const session = new Session(game, 7);
    for (let i = 0; i < 30; i++) session.input("up");
    session.advance(500);
    expect(session.state.actions).toEqual(["up", "up", "up", "up", "wait"]);
  });

  it("does not advance or queue moves while paused", () => {
    const session = new Session(game, 7);
    session.togglePause();
    session.input("left");
    session.advance(1000);
    expect(session.state.score).toBe(0);
    session.togglePause();
    session.advance(100);
    expect(session.state.actions).toEqual(["wait"]);
  });

  it("caps long frames and resets fractional time on speed changes", () => {
    const session = new Session(game, 7);
    session.advance(60);
    session.setSpeed(2);
    session.advance(49);
    expect(session.state.score).toBe(0);
    session.advance(1);
    expect(session.state.score).toBe(1);
    session.advance(60_000);
    expect(session.state.score).toBe(9);
  });

  it("varies a normal restart, supports explicit replay and clears pending input", () => {
    const seeded = {
      ...game,
      create: (seed: number) => ({ score: seed, over: false, actions: [] }),
    };
    const session = new Session(seeded, 7);
    session.input("down");
    session.restart();
    session.advance(100);
    expect(session.seed).toBe(nextSeed(7));
    expect(session.seed).not.toBe(7);
    expect(session.state).toEqual({ score: nextSeed(7) + 1, over: false, actions: ["wait"] });
    expect(session.round).toBe(2);
    session.restart(7);
    expect(session.state).toEqual(seeded.create(7));
  });

  it("restarts terminal AI games after a delay, but waits in human mode", () => {
    const terminal = {
      ...game,
      update: (s: Counter) => ({ ...s, over: true }),
    };
    const auto = new Session(terminal, 7);
    auto.advance(100);
    auto.advance(1500);
    expect(auto.round).toBe(2);
    expect(auto.seed).toBe(nextSeed(7));
    const human = new Session(terminal, 7);
    human.input("up");
    human.advance(100);
    human.advance(2000);
    expect(human.round).toBe(1);
    expect(human.state.over).toBe(true);
  });

  it("restarts a lost human game with the primary action without playing that action on the new board", () => {
    const terminal = {
      ...game,
      update: (s: Counter) => ({ ...s, over: true }),
    };
    const session = new Session(terminal, 7);
    session.input("up");
    session.advance(100);
    expect(session.state.over).toBe(true);
    session.input("primary");
    expect(session.state.over).toBe(false);
    expect(session.mode).toBe("human");
    expect(session.round).toBe(2);
    expect(session.state.actions).toEqual([]);
    expect(session.seed).toBe(nextSeed(7));
  });

  it("never restarts a live board when enabling AI", () => {
    const session = new Session(game, 7);
    session.input("left");
    session.advance(100);
    const board = session.state;
    session.automate();
    expect(session.state).toBe(board);
    expect(session.round).toBe(1);
    expect(session.mode).toBe("auto");
  });
});

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
    ["Enter", "primary"],
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
    expect(keyCommand("Enter")).toBe("primary");
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
      constructor(field = false) { this.field = field; }
      closest(selector: string) {
        return selector === "input, select, textarea" && this.field ? this : null;
      }
    }
    vi.stubGlobal("window", keyboard);
    vi.stubGlobal("HTMLElement", Target);
    const commands: Command[] = [];
    const stop = listenKeyboard((command) => commands.push(command), () => snake.controls);
    const press = (extra: Record<string, unknown> = {}, field = false) => {
      const event = Object.assign(new Event("keydown", { cancelable: true }), {
        key: "п", code: "KeyG", ...extra,
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
      (command) => commands.push(command),
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
      (command) => commands.push(command),
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
