import type { Game, GameState } from "@/engine/contracts/game";
export interface Counter extends GameState {
  actions: string[];
}
export const game: Game<Counter> = {
  id: "counter",
  title: "Counter",
  description: "",
  strategy: "",
  controls: [],
  width: 100,
  height: 100,
  tickMs: 100,
  create: () => ({ score: 0, over: false, actions: [] }),
  update: (state, action) => ({
    score: state.score + 1,
    over: false,
    actions: [...state.actions, action ?? "wait"],
  }),
  ai: () => "right",
  render: () => {},
  metrics: () => [],
};
