import type { Action, GameState } from "@/engine/types";

/** Test a rewind candidate through the cartridge's real, immutable AI/rules. */
export function canContinue<S extends GameState>(
  initial: S,
  ai: (state: S) => Action | null,
  update: (state: S, action: Action | null) => S,
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
