import { element } from "@/engine/ui/lib/dom";
import { syncFocusUrl } from "./routing";

export function createFocusController(
  mobile: MediaQueryList,
  panelOpen: () => boolean,
  canvas: HTMLCanvasElement,
) {
  let hintTimer = 0;

  function showHint() {
    document.body.classList.add("controls-visible");
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      const toolbarFocused = element("topbar").contains(document.activeElement);
      const transportFocused = document.activeElement?.closest(".transport");
      if (panelOpen() || toolbarFocused || transportFocused) return;
      document.body.classList.remove("controls-visible");
    }, 2500);
  }

  async function toggle() {
    if (mobile.matches) return;
    const enabled = !document.body.classList.contains("focus-mode");
    document.body.classList.toggle("focus-mode", enabled);
    syncFocusUrl(enabled);
    showHint();
    try {
      if (enabled) await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* CSS focus mode remains usable when native fullscreen is denied. */
    }
    canvas.focus({ preventScroll: true });
  }

  function syncLayout() {
    const sharedFocus =
      new URLSearchParams(location.search).get("fullscreen") === "1";
    document.body.classList.toggle("mobile-ui", mobile.matches);
    document.body.classList.toggle(
      "focus-mode",
      sharedFocus && !mobile.matches,
    );
  }

  syncLayout();
  return { toggle, showHint, syncLayout };
}
