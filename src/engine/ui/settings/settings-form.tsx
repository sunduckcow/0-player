import type { FormEvent } from "react";
import { Check, Gamepad2, SlidersHorizontal } from "lucide-react";
import { appearancePalette } from "@/engine/theme/appearance";
import { Button } from "@/engine/ui/primitives/button";
import { Tabs, TabsList, TabsTrigger } from "@/engine/ui/primitives/tabs";
import { AppearanceSettings } from "./appearance-settings";
import { GameSettings } from "./game-settings";
import { useSettingsMedia } from "./media";
import type { SettingsFormProps } from "./types";
import { useAppearanceSettings } from "./use-appearance-settings";
import { useGameSettings } from "./use-game-settings";

export function SettingsForm({
  initial,
  onApply,
  onCancel,
  portalContainer,
}: SettingsFormProps) {
  const { narrow, reducedMotion, systemDark } = useSettingsMedia();
  const appearance = useAppearanceSettings(initial.general);
  const game = useGameSettings(initial.game);
  const valid = appearance.valid && game.valid;
  const visuals = appearancePalette(
    appearance.appliedPreferences,
    systemDark,
  ).palette;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid)
      onApply({ general: appearance.appliedPreferences, game: game.values });
  }

  return (
    <form
      className="settings-form"
      onSubmit={apply}
      onKeyDown={(event) => {
        if (event.key !== "Escape") event.stopPropagation();
      }}
    >
      <Tabs
        className="settings-tabs"
        defaultValue="general"
        orientation={narrow ? "horizontal" : "vertical"}
      >
        <TabsList className="settings-nav" aria-label="Settings sections">
          <TabsTrigger value="general">
            <SlidersHorizontal aria-hidden="true" /> General
          </TabsTrigger>
          <TabsTrigger value="game">
            <Gamepad2 aria-hidden="true" /> {initial.game.title}
          </TabsTrigger>
        </TabsList>
        <div className="settings-content">
          <AppearanceSettings
            draft={appearance}
            narrow={narrow}
            portalContainer={portalContainer}
          />
          <GameSettings
            game={initial.game}
            draft={game}
            visuals={visuals}
            reducedMotion={reducedMotion}
          />
        </div>
      </Tabs>
      <div className="settings-footer">
        <p className="settings-save-note" aria-live="polite">
          {valid
            ? "Saved on this browser. Board changes may start a new round."
            : "Check the highlighted settings before applying."}
        </p>
        <div className="settings-actions">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            <Check data-icon="inline-start" />
            Apply settings
          </Button>
        </div>
      </div>
    </form>
  );
}
