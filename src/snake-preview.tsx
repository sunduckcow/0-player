import { useEffect, useRef } from "react";
import type { SnakeState } from "@/games/snake/game";
import { renderSnakeBody } from "@/games/snake/render";
import type { SnakeSkin } from "@/games/snake/settings";

const preview: SnakeState = {
  columns: 8,
  rows: 1,
  body: Array.from({ length: 6 }, (_, i) => ({ x: 6 - i, y: 0 })),
  direction: "right",
  food: null,
  score: 0,
  rng: 1,
  over: false,
  won: false,
};

/** A still illustration of the selected renderer; never advances the game. */
export function SnakePreview({ skin }: { skin: SnakeSkin }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) {
      context.clearRect(0, 0, 160, 20);
      renderSnakeBody(context, preview, { time: 0, mode: "auto", paused: true }, skin);
    }
  }, [skin]);
  const label = skin === "tapered" ? "Tapered snake preview, narrowing from head to tail." : "Square snake preview, with uniform tiles.";
  return <canvas ref={canvas} className="settings-snake-preview" width={160} height={20} role="img" aria-label={label}>{label}</canvas>;
}
