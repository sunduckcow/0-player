import type { Action, GameState } from "@/engine/contracts/game";

/** Test a rewind candidate through the cartridge's real, immutable AI/rules. */
export function canContinue<S extends GameState, A extends string = Action>(
  initial: S,
  ai: (state: S) => A | null,
  update: (state: S, action: A | null) => S,
  ticks: number,
  won: (state: S) => boolean = () => false,
): boolean {
  let state = initial;
  for (let tick = 0; tick < ticks; tick++) {
    if (state.over) return won(state);
    state = update(state, ai(state));
  }
  return !state.over || won(state);
}
