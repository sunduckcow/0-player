import "@/index.css";
import { catalog, configureSnake, configureTetris } from "@/catalog";
import { listenKeyboard, type Command } from "@/engine/input";
import { hydrateIcons, icon } from "@/icons";
import { renderControlLayout } from "@/control-layout";
import { filterGames, renderGameLibrary } from "@/game-library";
import { createPanels } from "@/panels";
import { createLibraryNavigation, gameShortcut } from "@/library-navigation";
import { normalizeSnakeOptions, type SnakeOptions } from "@/games/snake";
import { loadSession, saveSession, readPreference, writePreference } from "@/storage";
import { renderSettings } from "@/settings-ui";
import { playbackSpeeds, type SessionSnapshot } from "@/engine/session";
import { normalizeTetrisOptions } from "@/games/tetris/settings";
import { applyAppearance, defaultAppearance, normalizeAppearance } from "@/appearance";
import { renderBoardLabels, resizeBoardLabels } from "@/board-labels";

const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const text = (id: string, value: string | number) => {
  const el = element(id);
  const next = String(value);
  if (el.textContent !== next) el.textContent = next;
};
const canvas = element<HTMLCanvasElement>("game-canvas");
const context = canvas.getContext("2d", { alpha: false });
if (!context) throw new Error("This browser needs Canvas 2D to run 0-player.");
const ctx = context;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let appearance = normalizeAppearance(readPreference("appearance", defaultAppearance));
applyAppearance(appearance, systemTheme.matches);
systemTheme.addEventListener("change", () => applyAppearance(appearance, systemTheme.matches));

const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const storedOptions = readPreference<Partial<SnakeOptions> | null>("settings:snake", {});
let snakeOptions = normalizeSnakeOptions(storedOptions ?? {});
configureSnake(snakeOptions);
let tetrisOptions = normalizeTetrisOptions(readPreference("settings:tetris", null));
configureTetris(tetrisOptions);
const storedSpeed = readPreference<unknown>("speed", 1);
let playbackSpeed: number = playbackSpeeds.find((speed) => speed === storedSpeed) ?? 1;

const params = new URLSearchParams(location.hash.slice(1));
const query = new URLSearchParams(location.search);
// Shared links enter the focus layout without requiring browser fullscreen permission.
document.body.classList.toggle(
  "focus-mode",
  query.get("fullscreen") === "1",
);
const initialGame =
  catalog.find((game) => game.id === (params.get("game") ?? readPreference("last-game", "snake"))) ?? catalog[0];
const seedParam = params.get("seed");
const initialSeed =
  seedParam !== null && /^\d+$/.test(seedParam)
    ? Number(seedParam) >>> 0
    : freshSeed();
let game = initialGame;
let active = game.start(initialSeed);
let lastTime = 0;
let lastHud = 0;
let metricsKey = "";
let focusTimer = 0;
let best = 0;
let savedBest = 0;
let initialized = false;
let lastSave = 0;
let disposeSettings: (() => void) | undefined;
const savedSessions = new Map<string, SessionSnapshot>();
const libraryDialog = element<HTMLDialogElement>("library-dialog");
const controlsDialog = element<HTMLDialogElement>("controls-dialog");
const settingsDialog = element<HTMLDialogElement>("settings-dialog");
const search = element<HTMLInputElement>("game-search");
const panels = createPanels(
  [libraryDialog, controlsDialog, settingsDialog],
  () => active.session,
  () => {
    updateHud();
    showFocusHint();
  },
  () => canvas.focus({ preventScroll: true }),
);
const libraryNavigation = createLibraryNavigation({
  search,
  container: element("game-list"),
  games: catalog,
  onSelect: selectLibraryGame,
});

function selectLibraryGame(id: string) {
  panels.close();
  if (id !== game.id) setGame(id);
  canvas.focus({ preventScroll: true });
  announce(`${game.title}. ${active.session.mode === "auto" ? "Autopilot is on." : "You are in control."}`);
}

function renderLibrary() {
  const matches = filterGames(catalog, search.value);
  text(
    "library-count",
    `${matches.length} ${matches.length === 1 ? "game" : "games"}`,
  );
  renderGameLibrary(
    element("game-list"),
    catalog,
    game.id,
    search.value,
    selectLibraryGame,
  );
  libraryNavigation.refresh();
}

function toggleLibrary() {
  if (panels.current !== libraryDialog) {
    search.value = "";
    renderLibrary();
  }
  panels.toggle(libraryDialog);
  if (libraryDialog.open) search.focus();
}

function readBest() {
  try {
    const stored = Number(localStorage.getItem(`0-player:best:${game.id}`));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  best = Math.max(best, active.session.state.score);
  if (best <= savedBest) return;
  try {
    localStorage.setItem(`0-player:best:${game.id}`, String(best));
    savedBest = best;
  } catch {
    /* Play also works with storage blocked. */
  }
}

function announce(message: string) {
  text("announcement", message);
}

function persistGame() {
  if (!initialized) return;
  saveBest();
  const snapshot = { ...active.session.snapshot(), paused: panels.playbackPaused };
  savedSessions.set(game.id, snapshot);
  saveSession(game.id, snapshot);
  writePreference("last-game", game.id);
  // A failed rescue saves the next live round; its URL must restore that seed.
  if (snapshot.seed !== active.session.seed) syncUrl(snapshot.seed);
}

function setGame(id: string, seed?: number) {
  persistGame();
  game = catalog.find((item) => item.id === id) ?? catalog[0];
  active = game.start(seed ?? freshSeed());
  const saved = savedSessions.get(game.id) ?? loadSession(game.id);
  const sizeMatches = game.id !== "snake" || (saved && "columns" in saved.state && "rows" in saved.state && saved.state.columns === snakeOptions.columns && saved.state.rows === snakeOptions.rows);
  if (saved && sizeMatches && (seed === undefined || saved.seed === seed)) active.restore(saved);
  // Playback is a shared engine preference, independent of the saved game's board.
  active.session.setSpeed(playbackSpeed);
  initialized = true;
  best = savedBest = readBest();
  lastTime = 0;
  metricsKey = "";
  canvas.width = game.width;
  canvas.height = game.height;
  renderBoardLabels(element("board-labels"), game.labels ?? [], game);
  fitScreen();
  canvas.setAttribute(
    "aria-label",
    `${game.title} game board. Arrow keys take control, A for autopilot, Space or P to pause.`,
  );
  text("game-picker-title", game.title);
  element("game-picker-icon").innerHTML = icon(
    game.id === "snake" ? "snake" : game.id === "tetris" ? "blocks" : "gamepad",
  );
  text("game-number", `GAME 0${catalog.indexOf(game) + 1}`);
  text("controls-heading", `${game.title} controls`);
  for (const id of ["game-controls", "inline-controls", "focus-game-controls"]) {
    renderControlLayout(element(id), id === "game-controls" ? element("touch-controls") : null, game.controls, (action) => {
      panels.close();
      if (active.session.paused) active.session.togglePause();
      dispatch(action);
      canvas.focus({ preventScroll: true });
    });
  }
  text(
    "screen-label",
    `${game.id.toUpperCase()} / ${game.id === "snake" ? `${snakeOptions.columns} × ${snakeOptions.rows}` : "10 × 20"}`,
  );
  syncUrl();
  updateHud();
}

function syncUrl(seed = active.session.seed) {
  // URL fragments work for file:// distribution and subpath hosting alike.
  const url = new URL(location.href);
  url.searchParams.delete("speed");
  url.hash = `game=${game.id}&seed=${seed}`;
  try {
    history.replaceState(null, "", url);
  } catch {
    /* Restricted local browser. */
  }
}

function showFocusHint() {
  document.body.classList.add("controls-visible");
  window.clearTimeout(focusTimer);
  focusTimer = window.setTimeout(() => {
    if (
      panels.current ||
      element("topbar").contains(document.activeElement) ||
      document.activeElement?.closest(".transport")
    )
      return;
    document.body.classList.remove("controls-visible");
  }, 2500);
}

function openSettings() {
  if (panels.current === settingsDialog) { panels.close(); return; }
  disposeSettings?.();
  disposeSettings = renderSettings(element("settings-root"), {
    gameId: game.id === "snake" ? "snake" : "tetris",
    general: appearance, snake: snakeOptions, tetris: tetrisOptions,
  }, (options) => {
    const nextSnake = normalizeSnakeOptions(options.snake);
    const nextTetris = normalizeTetrisOptions(options.tetris);
    const resized = nextSnake.columns !== snakeOptions.columns || nextSnake.rows !== snakeOptions.rows;
    const snakeRulesChanged = resized || nextSnake.ai !== snakeOptions.ai;
    const snakeChanged = snakeRulesChanged || nextSnake.skin !== snakeOptions.skin;
    const tetrisChanged = nextTetris.showGhost !== tetrisOptions.showGhost || nextTetris.showNext !== tetrisOptions.showNext;
    panels.close();
    persistGame();
    const snapshot = active.session.snapshot();
    appearance = normalizeAppearance(options.general);
    writePreference("appearance", appearance);
    applyAppearance(appearance, systemTheme.matches);
    snakeOptions = nextSnake;
    tetrisOptions = nextTetris;
    writePreference("settings:snake", snakeOptions);
    writePreference("settings:tetris", tetrisOptions);
    if (snakeChanged) configureSnake(snakeOptions);
    if (tetrisChanged) configureTetris(tetrisOptions);
    if (game.id === "snake" && snakeRulesChanged) {
      // A different board starts a round; changing the AI keeps every cell.
      game = catalog[0];
      active = game.start(snapshot.seed);
      if (!resized) active.restore(snapshot);
      else { active.session.mode = snapshot.mode; active.session.setSpeed(snapshot.autoSpeed ?? snapshot.speed); }
      initialized = false;
      savedSessions.set(game.id, active.session.snapshot());
      saveSession(game.id, active.session.snapshot());
      setGame(game.id, active.session.seed);
    } else if ((game.id === "snake" && snakeChanged) || (game.id === "tetris" && tetrisChanged)) {
      game = catalog[game.id === "snake" ? 0 : 1];
      active = game.rebindPresentation(active);
      renderBoardLabels(element("board-labels"), game.labels ?? [], game);
    }
    fitScreen();
    updateHud();
    persistGame();
    announce(game.id === "snake" && resized ? "New board ready." : "Settings saved. Your board continues.");
  });
  panels.toggle(settingsDialog);
}

async function toggleFocus() {
  const on = !document.body.classList.contains("focus-mode");
  document.body.classList.toggle("focus-mode", on);
  const url = new URL(location.href);
  if (on) url.searchParams.set("fullscreen", "1");
  else url.searchParams.delete("fullscreen");
  try {
    history.replaceState(null, "", url);
  } catch {
    /* The focus view also works when browser history is unavailable. */
  }
  showFocusHint();
  try {
    if (on) await document.documentElement.requestFullscreen?.();
    else if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* CSS focus mode remains usable when fullscreen is denied. */
  }
  canvas.focus({ preventScroll: true });
}

function dispatch(command: Command) {
  if (panels.current === settingsDialog) return;
  if (panels.current && command !== "games" && command !== "help") {
    if (panels.current === libraryDialog) return;
    panels.close();
    if (
      ["up", "down", "left", "right", "primary", "secondary"].includes(
        command,
      ) &&
      active.session.paused
    )
      active.session.togglePause();
  }
  const session = active.session;
  switch (command) {
    case "games":
      toggleLibrary();
      break;
    case "help":
      panels.toggle(controlsDialog);
      break;
    case "auto":
      session.automate(!reducedMotion.matches);
      announce(
        session.state.over
          ? "Autopilot will start a new round."
          : "Autopilot is on.",
      );
      break;
    case "pause":
      session.togglePause();
      announce(session.paused ? "Paused." : "Resumed.");
      break;
    case "restart":
      saveBest();
      session.restart();
      syncUrl();
      break;
    case "focus":
      void toggleFocus();
      break;
    default:
      if (session.recovering) break;
      if (session.state.over && command === "primary") saveBest();
      if (session.mode === "auto")
        announce("You are in control. Press A for autopilot.");
      session.input(command);
      if (command === "primary") syncUrl();
  }
  showFocusHint();
  updateHud();
  persistGame();
}

function updateHud() {
  const session = active.session;
  const human = session.mode === "human";
  const recovering = session.recovering;
  document.body.classList.toggle("is-human", human);
  element("focus-controls-rail").inert = !human;
  best = Math.max(best, session.state.score);
  text("score", String(session.state.score).padStart(3, "0"));
  text("best", String(best).padStart(3, "0"));
  text("compact-score", String(session.state.score).padStart(3, "0"));
  text("compact-best", String(best).padStart(3, "0"));
  text("pilot-title", recovering ? "Rewinding. AI takes over." : human ? "You are in control" : "Autopilot is on");
  text("pilot-state", recovering ? "UNDO" : human ? "YOU" : "ON");
  text("focus-control-label", human ? "Autopilot" : "Take control");
  element("focus-control-key").hidden = !human;
  text(
    "strategy",
    recovering
      ? "Going back to a safer moment. The AI will continue this board."
      : human
      ? "Make your move. The AI will wait here until you hand the controls back."
      : game.strategy,
  );
  text("control-label", human ? "Let AI play" : "Take control");
  element<HTMLButtonElement>("control-button").disabled = recovering;
  element<HTMLButtonElement>("focus-auto").disabled = recovering;
  text("control-key", human ? "A" : "↑");
  text(
    "screen-status",
    session.paused ? "PAUSED" : recovering ? "REWIND" : human ? "MANUAL" : "AUTOPILOT",
  );
  text(
    "board-caption",
    recovering ? "A second chance. AI takes over." : human ? "Your move. Make it a good one." : "A mind of its own.",
  );
  text("round-label", `ROUND ${String(session.round).padStart(3, "0")}`);
  const pause = element<HTMLButtonElement>("pause-button");
  const pauseLabel = session.paused ? "Resume" : "Pause";
  if (pause.getAttribute("aria-label") !== pauseLabel) {
    pause.setAttribute("aria-label", pauseLabel);
    pause.innerHTML = icon(session.paused ? "play" : "pause");
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-speed]")
    .forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.speed) === session.speed),
      );
      button.disabled = human || recovering;
    });
  const speedLabel = document.querySelector<HTMLElement>(".speed-label")!;
  speedLabel.textContent = human ? "Manual · 1×" : "Speed";
  const speedHint = human ? `Manual control runs at 1×. Autopilot will resume at ${session.autoSpeed}×.` : "Autopilot speed";
  document.querySelector<HTMLElement>(".speed-control")!.title = speedHint;
  const metrics = active.metrics().slice(0, 2);
  text(
    "compact-metrics",
    metrics.map((metric) => `${metric.label} ${metric.value}`).join(" · "),
  );
  const nextMetrics = JSON.stringify(metrics);
  if (nextMetrics !== metricsKey) {
    metricsKey = nextMetrics;
    element("metrics").replaceChildren(
      ...metrics.map((metric) => {
        const block = document.createElement("div");
        block.className = "metric";
        const label = document.createElement("span");
        label.textContent = metric.label;
        const value = document.createElement("strong");
        value.textContent = String(metric.value);
        block.append(label, value);
        return block;
      }),
    );
  }
  element("board-overlay").hidden =
    (!session.state.over || recovering) && (!session.paused || panels.current !== null);
  const speedSelect = element<HTMLSelectElement>("speed-select");
  speedSelect.disabled = human || recovering;
  speedSelect.title = speedHint;
  if (speedSelect.value !== String(session.speed))
    speedSelect.value = String(session.speed);
  text(
    "overlay-title",
    session.paused ? "Taking a breather." : "Round complete.",
  );
  text(
    "overlay-note",
    session.paused
      ? "Press Space or P to keep going"
      : human
        ? "Enter / R — play again · A — AI round"
        : "A fresh start in a moment…",
  );
  element("overlay-button").hidden = session.paused || !human;
  if (session.state.over) saveBest();
}

hydrateIcons();
listenKeyboard(dispatch, () => game.controls);
element("home-button").addEventListener("click", toggleLibrary);
element("library-button").addEventListener("click", toggleLibrary);
element("focus-library").addEventListener("click", toggleLibrary);
element("controls-button").addEventListener("click", () =>
  panels.toggle(controlsDialog),
);
element("settings-button").addEventListener("click", openSettings);
element("focus-settings").addEventListener("click", openSettings);
document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach(button => button.addEventListener("click", () => dispatch(button.dataset.command as Command)));
element("focus-controls").addEventListener("click", () =>
  panels.toggle(controlsDialog),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-close-panel]")
  .forEach((button) => button.addEventListener("click", () => panels.close()));
search.addEventListener("input", renderLibrary);
search.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    panels.close();
  }
});
element<HTMLSelectElement>("speed-select").addEventListener(
  "change",
  (event) => {
    setPlaybackSpeed(Number((event.target as HTMLSelectElement).value));
  },
);
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((button) =>
  button.addEventListener("click", () => setPlaybackSpeed(Number(button.dataset.speed))),
);
function setPlaybackSpeed(speed: number) {
  if (!playbackSpeeds.some((value) => value === speed)) return;
  playbackSpeed = speed;
  writePreference("speed", speed);
  active.session.setSpeed(speed, !reducedMotion.matches);
  persistGame();
  updateHud();
}
element("pause-button").addEventListener("click", () => dispatch("pause"));
element("restart-button").addEventListener("click", () => dispatch("restart"));
element("overlay-button").addEventListener("click", () => dispatch("restart"));
element("focus-button").addEventListener("click", () => dispatch("focus"));
element("focus-exit").addEventListener("click", () => dispatch("focus"));
element("focus-auto").addEventListener("click", toggleController);
element("focus-pause").addEventListener("click", () => dispatch("pause"));
function toggleController() {
  if (active.session.recovering) return;
  if (active.session.mode === "human") dispatch("auto");
  else {
    active.session.takeControl();
    announce("You are in control.");
    updateHud();
  }
  canvas.focus({ preventScroll: true });
  showFocusHint();
  persistGame();
}
element("control-button").addEventListener("click", toggleController);
document.addEventListener("visibilitychange", () => {
  lastTime = 0;
  active.session.resetClock();
  if (document.hidden) persistGame();
});
window.addEventListener("blur", () => {
  lastTime = 0;
  active.session.resetClock();
});
window.addEventListener("pagehide", persistGame);
document.addEventListener("pointermove", showFocusHint, { passive: true });
document.addEventListener("pointerdown", showFocusHint, { passive: true });
document.addEventListener("focusin", showFocusHint);
document.addEventListener("fullscreenchange", () => {
  // Embedded browsers may immediately leave native fullscreen. Keep the CSS
  // focus view usable; F, Escape and the visible exit control still leave it.
  showFocusHint();
});
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || panels.current || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input,select,textarea"))) return;
  const index = gameShortcut(event.key, event.code);
  if (index !== null && catalog[index]) {
    event.preventDefault();
    if (!event.repeat) selectLibraryGame(catalog[index].id);
    return;
  }
  if (event.key === "Escape" && document.body.classList.contains("focus-mode"))
    void toggleFocus();
});

function fitScreen() {
  const available = element("stage-center").getBoundingClientRect();
  const screen = element("screen");
  const style = getComputedStyle(screen);
  const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2;
  const vertical = element("screen-label").parentElement!.getBoundingClientRect().height + element("board-caption").parentElement!.getBoundingClientRect().height + 2;
  const ratio = game.width / game.height;
  const width = Math.max(0, Math.floor(Math.min(available.width - horizontal, (available.height - vertical) * ratio)));
  screen.style.width = `${width + horizontal}px`;
  screen.style.height = `${Math.floor(width / ratio) + vertical}px`;
  resizeBoardLabels(element("board-labels"), width / game.width);
}
const resize = new ResizeObserver(fitScreen);
resize.observe(element("stage-center"));

setGame(initialGame.id, seedParam !== null ? initialSeed : undefined);
showFocusHint();
function frame(time: number) {
  if (!document.hidden) {
    const delta = lastTime ? time - lastTime : 0;
    lastTime = time;
    const round = active.session.round;
    const wasRecovering = active.session.recovering;
    active.session.advanceFrame(delta, !reducedMotion.matches);
    if (!wasRecovering && active.session.recovering) {
      announce("Rewinding to a safer moment. AI takes over.");
      updateHud();
    } else if (wasRecovering && !active.session.recovering) {
      announce("Autopilot is on.");
      updateHud();
      persistGame();
    }
    if (round !== active.session.round) { syncUrl(); persistGame(); }
    ctx.imageSmoothingEnabled = false;
    active.draw(ctx, time);
    if (time - lastSave >= 1000) {
      persistGame();
      lastSave = time;
    }
    if (time - lastHud >= 100) {
      updateHud();
      lastHud = time;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
