import type { ActiveGame, Cartridge } from "@/engine/runtime/cartridge";
import type { SessionSnapshot } from "@/engine/runtime/session";
import type { SettingsValues } from "@/engine/contracts/settings";
import type { createPanels } from "@/engine/ui/panels";

export interface Workspace {
  readonly catalog: readonly Cartridge[];
  readonly game: Cartridge;
  readonly active: ActiveGame;
  readonly best: number;
  readonly speed: number;
  select(id: string, seed?: number): void;
  persist(paused: boolean): SessionSnapshot;
  saveBest(): void;
  apply(draft: Readonly<SettingsValues>): void;
  setSpeed(speed: number, smooth: boolean): void;
}

export interface BrowserMedia {
  mobile: MediaQueryList;
  reducedMotion: MediaQueryList;
  systemTheme: MediaQueryList;
}

export interface WorkspaceView {
  refresh(): void;
  update(): void;
}

export type Panels = ReturnType<typeof createPanels>;
