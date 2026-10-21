import type { LibraryGame } from "@/engine/ui/library/game-library";
import {
  gameShortcut,
  isLibraryNavigationKey,
  nextGameIndex,
  shouldIgnoreLibraryKey,
} from "./library-keys";

export { gameShortcut, nextGameIndex } from "./library-keys";

interface LibraryNavigationOptions {
  search: HTMLInputElement;
  container: HTMLElement;
  games: readonly LibraryGame[];
  onSelect: (id: string) => void;
}

function countGridColumns(cards: HTMLButtonElement[]) {
  const firstTop = cards[0]?.getBoundingClientRect().top ?? 0;
  return cards.filter(
    (card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2,
  ).length;
}

/** A searchable, keyboard-operated grid without moving focus out of the query. */
export function createLibraryNavigation({
  search,
  container,
  games,
  onSelect,
}: LibraryNavigationOptions) {
  let active = -1;
  const getCards = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>(".game-card"));
  container.id ||= "game-list";
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-autocomplete", "list");
  search.setAttribute("aria-controls", container.id);
  search.setAttribute("aria-expanded", "true");
  search.setAttribute("aria-haspopup", "listbox");

  function selectCard(index: number, focusCard = false) {
    const cards = getCards();
    active = index >= 0 && index < cards.length ? index : -1;
    cards.forEach((card, position) => {
      const selected = position === active;
      card.classList.toggle("is-active", selected);
      card.setAttribute("aria-selected", String(selected));
    });
    const card = cards[active];
    if (card) {
      search.setAttribute("aria-activedescendant", card.id);
      card.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (focusCard) card.focus({ preventScroll: true });
    } else search.removeAttribute("aria-activedescendant");
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (shouldIgnoreLibraryKey(event)) return;
    const shortcut = gameShortcut(event.key, event.code);
    if (shortcut !== null && games[shortcut]) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onSelect(games[shortcut]!.id);
      return;
    }
    const inSearch = event.currentTarget === search;
    if (isLibraryNavigationKey(event.key, inSearch)) {
      event.preventDefault();
      event.stopPropagation();
      const cards = getCards();
      selectCard(
        nextGameIndex(active, event.key, cards.length, countGridColumns(cards)),
        !inSearch,
      );
    } else if (inSearch && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) getCards()[Math.max(0, active)]?.click();
    }
  }

  function handleFocusIn(event: FocusEvent) {
    const index = getCards().findIndex((card) => card === event.target);
    if (index >= 0) selectCard(index);
  }

  search.addEventListener("keydown", handleKeyDown);
  container.addEventListener("keydown", handleKeyDown);
  container.addEventListener("focusin", handleFocusIn);

  return {
    refresh: () => selectCard(-1),
    destroy() {
      search.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("focusin", handleFocusIn);
    },
  };
}
