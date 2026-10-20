import { Session, type SessionSnapshot } from "@/engine/session";
import type { Game, GameState } from "@/engine/types";
import { snake, createSnakeGame, type SnakeOptions } from "@/games/snake";
import { tetris, createTetrisGame } from "@/games/tetris";
import type { TetrisOptions } from "@/games/tetris/settings";
import { normalizeSnakeOptions } from "@/games/snake/settings";

function cartridge<S extends GameState>(game: Game<S>) {
  function present(session: Session<S>) {
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
  }
  return {
    ...game,
    start: (seed: number) => present(new Session(game, seed)),
    rebindPresentation(previous: { session: unknown }) {
      const session = previous.session;
      if (!(session instanceof Session) || session.game.id !== game.id ||
        session.game.create !== game.create || session.game.update !== game.update ||
        session.game.ai !== game.ai || session.game.tickMs !== game.tickMs)
        throw new Error("Presentation changes must preserve the game's rules.");
      return present(session as Session<S>);
    },
  };
}

export const catalog = [cartridge(snake), cartridge(tetris)];
let snakeGame = snake;
let snakeSettings = normalizeSnakeOptions();

export function configureSnake(options: SnakeOptions) {
  const next = normalizeSnakeOptions(options);
  const game = createSnakeGame(next);
  const sameRules = next.ai === snakeSettings.ai && next.columns === snakeSettings.columns && next.rows === snakeSettings.rows;
  snakeGame = sameRules ? { ...snakeGame, render: game.render } : game;
  snakeSettings = next;
  catalog[0] = cartridge(snakeGame);
}

export function configureTetris(options: TetrisOptions) {
  catalog[1] = cartridge(createTetrisGame(options));
}
