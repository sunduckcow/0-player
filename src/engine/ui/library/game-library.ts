import { iconElement } from "@/engine/ui/icons";

export interface LibraryGame {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export function filterGames(
  games: readonly LibraryGame[],
  query: string,
): LibraryGame[] {
  const search = query.trim().toLowerCase();
  return games.filter((game) =>
    [game.title, game.description, game.id].some((value) =>
      value.toLowerCase().includes(search),
    ),
  );
}

function gameArt(game: LibraryGame) {
  const art = (iconElement(game.icon ?? "gamepad") ?? iconElement("gamepad"))!;
  art.classList.add("game-card-art");
  return art;
}

export function renderGameLibrary(
  container: HTMLElement,
  games: readonly LibraryGame[],
  currentId: string,
  query: string,
  onSelect: (id: string) => void,
): void {
  const matches = filterGames(games, query);
  container.setAttribute("role", "listbox");
  container.setAttribute("aria-label", "Games");
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "library-empty";
    empty.setAttribute("role", "status");
    empty.textContent = "No games found. Try another name or keyword.";
    container.replaceChildren(empty);
    return;
  }

  const cards = matches.map((game) => {
    const index = games.findIndex(({ id }) => id === game.id);
    const current = game.id === currentId;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "game-card";
    card.id = `library-game-${encodeURIComponent(game.id)}`;
    card.dataset.game = game.id;
    card.dataset.number = String(index + 1);
    card.setAttribute("role", "option");
    card.setAttribute("aria-label", `Play ${game.title}`);
    card.setAttribute("aria-selected", "false");
    if (current) card.setAttribute("aria-current", "true");

    const number = document.createElement("span");
    number.className = "game-card-index";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("div");
    copy.className = "game-card-copy";
    const title = document.createElement("h3");
    title.textContent = game.title;
    const description = document.createElement("p");
    description.textContent = game.description;
    copy.append(title, description);

    const action = document.createElement("small");
    action.className = "game-card-action";
    action.textContent = current ? "Playing" : "Play";
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    action.append(arrow);

    card.append(number, gameArt(game), copy, action);
    card.addEventListener("click", () => onSelect(game.id));
    return card;
  });
  container.replaceChildren(...cards);
}
