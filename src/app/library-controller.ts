import { element, text } from "@/engine/ui/lib/dom";
import {
  filterGames,
  renderGameLibrary,
} from "@/engine/ui/library/game-library";
import { createLibraryNavigation } from "@/engine/ui/library/library-navigation";
import type { Workspace, Panels } from "./types";

interface LibraryOptions {
  workspace: Workspace;
  panels: Panels;
  mobile: MediaQueryList;
  selectGame(id: string): void;
}

export function createLibraryController({
  workspace,
  panels,
  mobile,
  selectGame,
}: LibraryOptions) {
  const dialog = element<HTMLDialogElement>("library-dialog");
  const search = element<HTMLInputElement>("game-search");
  const navigation = createLibraryNavigation({
    search,
    container: element("game-list"),
    games: workspace.catalog,
    onSelect: selectGame,
  });

  function render() {
    const matches = filterGames(workspace.catalog, search.value);
    text(
      "library-count",
      `${matches.length} ${matches.length === 1 ? "game" : "games"}`,
    );
    renderGameLibrary(
      element("game-list"),
      workspace.catalog,
      workspace.game.id,
      search.value,
      selectGame,
    );
    navigation.refresh();
  }

  function toggle() {
    text("library-title", mobile.matches ? "Games" : "Your arcade.");
    if (panels.current !== dialog) {
      search.value = "";
      render();
    }
    panels.toggle(dialog);
    if (dialog.open && !mobile.matches) search.focus();
  }

  search.addEventListener("input", render);
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    panels.close();
  });
  return { toggle };
}
