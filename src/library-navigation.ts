import type { LibraryGame } from "@/game-library";

/** Catalog numbers stay stable when the visible list is filtered. */
export function gameShortcut(key: string, code = ""): number | null {
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code)?.[1] ?? key;
  return /^[1-9]$/.test(digit) ? Number(digit) - 1 : null;
}

export function nextGameIndex(
  index: number,
  key: string,
  count: number,
  columns: number,
): number {
  if (count === 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (!key.startsWith("Arrow")) return index;
  if (index < 0) return key === "ArrowUp" || key === "ArrowLeft" ? count - 1 : 0;
  const width = count <= columns ? 1 : Math.max(1, columns);
  switch (key) {
    case "ArrowLeft": return (index - 1 + count) % count;
    case "ArrowRight": return (index + 1) % count;
    case "ArrowUp": return index < width ? count - 1 : index - width;
    case "ArrowDown":
      return index + width < count
        ? index + width
        : index < Math.floor((count - 1) / width) * width ? count - 1 : 0;
    default: return index;
  }
}

/** A searchable, keyboard-operated grid without moving focus out of the query. */
export function createLibraryNavigation({
  search,
  container,
  games,
  onSelect,
}: {
  search: HTMLInputElement;
  container: HTMLElement;
  games: readonly LibraryGame[];
  onSelect: (id: string) => void;
}) {
  let active = -1;
  const cards = () => Array.from(container.querySelectorAll<HTMLButtonElement>(".game-card"));
  container.id ||= "game-list";
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-autocomplete", "list");
  search.setAttribute("aria-controls", container.id);
  search.setAttribute("aria-expanded", "true");
  search.setAttribute("aria-haspopup", "listbox");

  function select(index: number, focusCard = false) {
    const options = cards();
    active = index >= 0 && index < options.length ? index : -1;
    options.forEach((card, position) => {
      const selected = position === active;
      card.classList.toggle("is-active", selected);
      card.setAttribute("aria-selected", String(selected));
    });
    const card = options[active];
    if (card) {
      search.setAttribute("aria-activedescendant", card.id);
      card.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (focusCard) card.focus({ preventScroll: true });
    } else search.removeAttribute("aria-activedescendant");
  }

  const handler = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    const shortcut = gameShortcut(event.key, event.code);
    if (shortcut !== null && games[shortcut]) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onSelect(games[shortcut]!.id);
      return;
    }
    const inSearch = event.currentTarget === search;
    const navigation = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      || (!inSearch && ["Home", "End"].includes(event.key));
    if (navigation) {
      event.preventDefault();
      event.stopPropagation();
      const options = cards();
      const firstTop = options[0]?.getBoundingClientRect().top;
      const columns = options.filter((card) => Math.abs(card.getBoundingClientRect().top - (firstTop ?? 0)) < 2).length;
      select(nextGameIndex(active, event.key, options.length, columns), !inSearch);
    } else if (inSearch && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) cards()[Math.max(0, active)]?.click();
    }
  };
  const focus = (event: FocusEvent) => {
    const options = cards();
    const index = options.findIndex((card) => card === event.target);
    if (index >= 0) select(index);
  };
  search.addEventListener("keydown", handler);
  container.addEventListener("keydown", handler);
  container.addEventListener("focusin", focus);

  return {
    refresh: () => select(-1),
    destroy() {
      search.removeEventListener("keydown", handler);
      container.removeEventListener("keydown", handler);
      container.removeEventListener("focusin", focus);
    },
  };
}
