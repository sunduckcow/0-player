import snake from "@/games/snake";
import tetris from "@/games/tetris";

/** Registration is only a list of static game definitions. */
export const catalog = [snake, tetris] as const;
