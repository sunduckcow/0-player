import { applyAppearance } from "@/engine/platform/appearance";
import { readPreference, writePreference } from "@/engine/platform/storage";
import {
  defaultAppearance,
  normalizeAppearance,
} from "@/engine/theme/appearance";
import { renderSettings } from "@/engine/ui/settings/settings-dialog";
import { element } from "@/engine/ui/lib/dom";
import type { Workspace, WorkspaceView, Panels } from "./types";

interface SettingsOptions {
  workspace: Workspace;
  panels: Panels;
  view: WorkspaceView;
  systemTheme: MediaQueryList;
  persist(): void;
  syncUrl(): void;
  announce(message: string): void;
}

export function createSettingsController({
  workspace,
  panels,
  view,
  systemTheme,
  persist,
  syncUrl,
  announce,
}: SettingsOptions) {
  const dialog = element<HTMLDialogElement>("settings-dialog");
  let appearance = normalizeAppearance(
    readPreference("appearance", defaultAppearance),
  );
  let visuals = applyAppearance(appearance, systemTheme.matches);
  let dispose: (() => void) | undefined;
  systemTheme.addEventListener("change", () => {
    visuals = applyAppearance(appearance, systemTheme.matches);
  });

  function toggle() {
    if (panels.current === dialog) {
      panels.close();
      return;
    }
    dispose?.();
    dispose = renderSettings(
      element("settings-root"),
      { game: workspace.game, general: appearance },
      (options) => {
        panels.close();
        persist();
        workspace.apply(options.game);
        appearance = normalizeAppearance(options.general);
        writePreference("appearance", appearance);
        visuals = applyAppearance(appearance, systemTheme.matches);
        view.refresh();
        syncUrl();
        view.update();
        persist();
        announce("Settings saved.");
      },
    );
    panels.toggle(dialog);
  }
  return {
    toggle,
    get visuals() {
      return visuals;
    },
  };
}
