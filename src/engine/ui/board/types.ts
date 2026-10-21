import type { Metric, Mode } from "@/engine/contracts/game";

export interface HudModel {
  score: number;
  over: boolean;
  best: number;
  mode: Mode;
  recovering: boolean;
  paused: boolean;
  round: number;
  speed: number;
  autoSpeed: number;
  mobile: boolean;
  panelOpen: boolean;
  strategy: string;
  metrics: Metric[];
}
