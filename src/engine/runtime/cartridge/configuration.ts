import type { GameDefinition } from "@/engine/contracts/cartridge";
import type { Game, GameState } from "@/engine/contracts/game";
import { validateActions } from "@/engine/input/actions";

/** Configuration stays pure; every create owns a deep copy of the template. */
export function configureGame<
  S extends GameState,
  C extends object,
  A extends string,
>(definition: GameDefinition<S, C, A>, options: Readonly<C>): Game<S, A> {
  return {
    ...definition.configure(options),
    ...definition.metadata,
    create(seed) {
      const state = structuredClone(definition.defaultState) as S;
      return definition.initialize?.(state, seed, options) ?? state;
    },
  };
}

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

/** Validate geometry, timing and bindings before publishing new settings. */
export function validateConfiguration<S extends GameState, A extends string>(
  game: Game<S, A>,
  expectedId: string,
) {
  if (
    game.id !== expectedId ||
    !isPositiveFinite(game.tickMs) ||
    !isPositiveFinite(game.width) ||
    !isPositiveFinite(game.height)
  ) {
    throw new Error("Invalid cartridge configuration");
  }
  validateActions(game.controls);
}
