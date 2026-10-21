import "@/engine/ui/styles/arcade.css";
import { catalog } from "./catalog";
import { createRegistry } from "@/engine/runtime/registry";
import { readPreference } from "@/engine/platform/storage";
import { createPanels } from "@/engine/ui/panels";
import { hydrateIcons } from "@/engine/ui/icons";
import { element, text } from "@/engine/ui/lib/dom";
import { createWorkspace } from "./workspace";
import { initialRoute, syncGameUrl } from "./routing";
import { createFocusController } from "./focus-controller";
import { createLibraryController } from "./library-controller";
import { createSettingsController } from "./settings-controller";
import { createInputController } from "./input-controller";
import { createPresentation } from "./presentation";
import { bindBrowserEvents } from "./browser-events";
import { startFrameLoop } from "./frame-loop";
import type { BrowserMedia } from "./types";

const canvas = element<HTMLCanvasElement>("game-canvas");
const context = canvas.getContext("2d", { alpha: false });
if (!context) throw new Error("This browser needs Canvas 2D to run 0-player.");
const media: BrowserMedia = {
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
  mobile: matchMedia(
    "(max-width:760px), (pointer:coarse), (max-width:1000px) and (max-height:560px)",
  ),
  systemTheme: matchMedia("(prefers-color-scheme: dark)"),
};
const registry = createRegistry(catalog);
for (const game of registry)
  game.initialize(readPreference(`settings:${game.id}`, null));
const route = initialRoute(registry[0]!.id);
const workspace = createWorkspace(registry, route.gameId, route.seed);
const announce = (message: string) => text("announcement", message);
const syncUrl = (seed = workspace.active.session.seed) =>
  syncGameUrl(workspace.game.id, seed);
const panels = createPanels(
  ["library-dialog", "controls-dialog", "settings-dialog"].map((id) =>
    element<HTMLDialogElement>(id),
  ),
  () => workspace.active.session,
  () => {
    view.update();
    focus.showHint();
  },
  () => canvas.focus({ preventScroll: true }),
);
const focus = createFocusController(
  media.mobile,
  () => panels.current !== null,
  canvas,
);
const view = createPresentation({
  workspace,
  canvas,
  panels,
  mobile: media.mobile,
  play: (action) => input.play(action),
  setSpeed,
});
const library = createLibraryController({
  workspace,
  panels,
  mobile: media.mobile,
  selectGame,
});
const settings = createSettingsController({
  workspace,
  panels,
  view,
  systemTheme: media.systemTheme,
  persist,
  syncUrl,
  announce,
});
const input = createInputController({
  workspace,
  canvas,
  panels,
  view,
  media,
  announce,
  persist,
  syncUrl,
  showHint: focus.showHint,
  toggleLibrary: library.toggle,
  toggleFocus: focus.toggle,
});

function persist() {
  const snapshot = workspace.persist(panels.playbackPaused);
  if (snapshot.seed !== workspace.active.session.seed) syncUrl(snapshot.seed);
}

function selectGame(id: string) {
  panels.close();
  if (id !== workspace.game.id) {
    workspace.select(id);
    loop.resetClock();
    view.refresh();
    syncUrl();
    view.update();
  }
  canvas.focus({ preventScroll: true });
  const status =
    workspace.active.session.mode === "auto"
      ? "Autopilot is on."
      : "You are in control.";
  announce(`${workspace.game.title}. ${status}`);
}

function setSpeed(speed: number) {
  workspace.setSpeed(speed, !media.reducedMotion.matches);
  persist();
  view.update();
}

const loop = startFrameLoop({
  workspace,
  context,
  reducedMotion: media.reducedMotion,
  getVisuals: () => settings.visuals,
  announce,
  persist,
  syncUrl,
  updateHud: view.update,
});
hydrateIcons();
bindBrowserEvents({
  workspace,
  panels,
  ...input,
  persist,
  setSpeed,
  selectGame,
  toggleLibrary: library.toggle,
  toggleSettings: settings.toggle,
  toggleFocus: focus.toggle,
  showHint: focus.showHint,
  resetClock: loop.resetClock,
});
media.mobile.addEventListener("change", () => {
  focus.syncLayout();
  if (media.mobile.matches && panels.current === element("controls-dialog"))
    panels.close();
  view.update();
});
view.refresh();
syncUrl();
view.update();
focus.showHint();
