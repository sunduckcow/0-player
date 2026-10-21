import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SettingsForm } from "./settings-form";
import type { SettingsInitial, SettingsValues } from "./types";
import "@/engine/ui/styles/components.css";

export type { SettingsValues } from "./types";

export function renderSettings(
  container: HTMLElement,
  initial: SettingsInitial,
  onApply: (values: SettingsValues) => void,
) {
  const root = createRoot(container);
  flushSync(() =>
    root.render(
      <SettingsForm
        initial={initial}
        onApply={onApply}
        onCancel={() => container.closest("dialog")?.close()}
        portalContainer={container.closest("dialog")}
      />,
    ),
  );
  return () => root.unmount();
}
