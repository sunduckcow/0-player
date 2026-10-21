import { engineActions, type EngineCommand } from "@/engine/input/actions";
const keyText = (keys: readonly string[]) =>
  keys.map((key) => (key === " " ? "Space" : key.toUpperCase())).join(" / ");
/** Runtime controls have one engine-owned definition, independent of every cartridge. */
export function renderRuntimeControls(
  container: HTMLElement,
  dispatch: (command: EngineCommand) => void,
  hints = false,
) {
  container.replaceChildren(
    ...engineActions.map((action) => {
      const row = document.createElement(hints ? "span" : "button");
      const key = document.createElement("kbd");
      key.textContent = keyText(action.keys);
      const label = document.createElement("span");
      label.textContent = action.label;
      row.append(key, label);
      if (row instanceof HTMLButtonElement) {
        row.type = "button";
        row.addEventListener("click", () => dispatch(action.command));
      }
      return row;
    }),
  );
}
