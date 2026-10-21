import { describe, expect, it } from "vitest";
import {
  filterGames,
  type LibraryGame,
} from "@/engine/ui/library/game-library";

const games: readonly LibraryGame[] = [
  { id: "snake", title: "Snake", description: "Follow the apple trail." },
  { id: "tetris", title: "Falling Blocks", description: "Build a clear line." },
  { id: "clear-path", title: "Maze", description: "Find your way home." },
];

describe("game library search", () => {
  it("returns a fresh complete list for an empty or whitespace-only query", () => {
    for (const query of ["", "   \t\n"]) {
      const result = filterGames(games, query);
      expect(result).toEqual(games);
      expect(result).not.toBe(games);
    }
  });

  it("matches titles without case sensitivity and trims the query", () => {
    expect(filterGames(games, "  fALLING  ")).toEqual([games[1]]);
  });

  it("matches descriptions", () => {
    expect(filterGames(games, "APPLE TRAIL")).toEqual([games[0]]);
  });

  it("matches IDs even when the title and description differ", () => {
    expect(filterGames(games, "TETRIS")).toEqual([games[1]]);
  });

  it("preserves catalog order when matches occur in different fields", () => {
    expect(filterGames(games, "clear")).toEqual([games[1], games[2]]);
  });

  it("returns an empty list when no game matches", () => {
    expect(filterGames(games, "pinball")).toEqual([]);
  });
});
