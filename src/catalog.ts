import { Session, type SessionSnapshot } from "@/engine/session";
import type { Game, GameState } from "@/engine/types";
import { snake, createSnakeGame, type SnakeOptions } from "@/games/snake";
import { tetris } from "@/games/tetris";

function cartridge<S extends GameState>(game: Game<S>) {
  return {
    ...game,
    start(seed: number) {
      const session = new Session(game, seed);
      return {
        session,
        restore(snapshot: SessionSnapshot) {
          session.restore(snapshot as SessionSnapshot<S>);
        },
        draw(ctx: CanvasRenderingContext2D, time: number) {
          game.render(ctx, session.state, {
            time,
            mode: session.mode,
            paused: session.paused,
            recovery: session.recoveryFrame(),
          });
        },
        metrics: () => game.metrics(session.state),
      };
    },
  };
}

export const catalog = [cartridge(snake), cartridge(tetris)];

export function configureSnake(options: SnakeOptions) {
  catalog[0] = cartridge(createSnakeGame(options));
}
