import { describe, expect, it } from "vitest";
import { Session } from "@/engine/session";
import type { Game, GameState } from "@/engine/types";
import { createPanels } from "@/panels";

const game: Game<GameState> = {
  id: "counter",
  title: "Counter",
  description: "",
  strategy: "",
  controls: [],
  width: 100,
  height: 100,
  tickMs: 100,
  create: () => ({ score: 0, over: false }),
  update: (state) => ({ ...state, score: state.score + 1 }),
  ai: () => null,
  render: () => {},
  metrics: () => [],
};

class Dialog extends EventTarget {
  open = false;

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
    queueMicrotask(() => this.dispatchEvent(new Event("close")));
  }

  getBoundingClientRect() {
    return { left: 20, right: 120, top: 30, bottom: 130 };
  }
}

function fixture() {
  const session = new Session(game, 7);
  const picker = new Dialog() as unknown as HTMLDialogElement;
  const controls = new Dialog() as unknown as HTMLDialogElement;
  const changes: Array<HTMLDialogElement | null> = [];
  let focused = false;
  const panels = createPanels(
    [picker, controls],
    () => session,
    () => changes.push(panels.current),
    () => { focused = true; },
  );
  return { session, picker, controls, panels, changes, focused: () => focused };
}

describe("workspace panels", () => {
  it("pauses a running board until close and discards fractional game time", () => {
    const { session, picker, panels, changes, focused } = fixture();
    session.advance(60);
    panels.toggle(picker);
    session.advance(1000);
    expect(session.state.score).toBe(0);
    expect(session.paused).toBe(true);

    panels.close();
    expect(session.paused).toBe(false);
    session.advance(99);
    expect(session.state.score).toBe(0);
    session.advance(1);
    expect(session.state.score).toBe(1);
    expect(panels.current).toBe(null);
    expect(changes).toEqual([picker, null]);
    expect(focused()).toBe(true);
  });

  it("preserves a board that was already paused", () => {
    const { session, picker, panels } = fixture();
    session.togglePause();
    panels.toggle(picker);
    expect(panels.current).toBe(picker);
    panels.close();
    session.advance(1000);
    expect(session.paused).toBe(true);
    expect(session.state.score).toBe(0);
    session.togglePause();
    session.advance(100);
    expect(session.state.score).toBe(1);
  });

  it("keeps the board paused when switching panels despite an old close event", async () => {
    const { session, picker, controls, panels, focused } = fixture();
    panels.toggle(picker);
    panels.toggle(controls);
    await Promise.resolve();
    session.advance(1000);
    expect(panels.current).toBe(controls);
    expect(session.paused).toBe(true);
    expect(session.state.score).toBe(0);
    expect(focused()).toBe(false);
    panels.close();
    session.advance(100);
    expect(session.state.score).toBe(1);
  });

  it("toggles the current panel closed without a delayed event affecting a reopened panel", async () => {
    const { session, picker, panels } = fixture();
    panels.toggle(picker);
    panels.toggle(picker);
    expect(panels.current).toBe(null);
    expect(session.paused).toBe(false);
    panels.toggle(picker);
    await Promise.resolve();
    expect(panels.current).toBe(picker);
    session.advance(1000);
    expect(session.state.score).toBe(0);
    panels.close();
    session.advance(100);
    expect(session.state.score).toBe(1);
  });

  it("handles Escape once and ignores the following native close event", async () => {
    const { session, picker, panels, changes } = fixture();
    panels.toggle(picker);
    const cancel = new Event("cancel", { cancelable: true });
    picker.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    await Promise.resolve();
    expect(changes).toEqual([picker, null]);
    expect(panels.current).toBe(null);
    session.advance(100);
    expect(session.state.score).toBe(1);
  });

  it("restores game advancement when the dialog closes natively", async () => {
    const { session, picker, panels } = fixture();
    panels.toggle(picker);
    expect(session.paused).toBe(true);
    picker.close();
    await Promise.resolve();
    expect(panels.current).toBe(null);
    session.advance(100);
    expect(session.state.score).toBe(1);
  });

  it("dismisses backdrop clicks while leaving dialog padding clickable", () => {
    const { session, picker, panels } = fixture();
    panels.toggle(picker);
    const click = (clientX: number, clientY: number) =>
      picker.dispatchEvent(Object.assign(new Event("click"), { clientX, clientY }));
    click(21, 31);
    expect(panels.current).toBe(picker);
    expect(session.paused).toBe(true);
    click(19, 31);
    expect(panels.current).toBe(null);
    session.advance(100);
    expect(session.state.score).toBe(1);
  });
});
