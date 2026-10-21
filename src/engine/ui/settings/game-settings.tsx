import type { Cartridge } from "@/engine/runtime/cartridge";
import type { VisualTheme } from "@/engine/contracts/visuals";
import { Field, FieldGroup, FieldTitle } from "@/engine/ui/primitives/field";
import { TabsContent } from "@/engine/ui/primitives/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/engine/ui/primitives/toggle-group";
import { GameField } from "./fields";
import type { GameSettingsDraft } from "./use-game-settings";

interface GameSettingsProps {
  game: Cartridge;
  draft: GameSettingsDraft;
  visuals: VisualTheme;
  reducedMotion: boolean;
}

export function GameSettings({
  game,
  draft,
  visuals,
  reducedMotion,
}: GameSettingsProps) {
  return (
    <TabsContent value="game">
      <div className="settings-section-heading">
        <h3>{game.title}</h3>
        <p>Settings for the game you're playing.</p>
      </div>
      <FieldGroup>
        {game.presets.length > 0 && (
          <Field>
            <FieldTitle id="settings-presets">{game.presetsLabel}</FieldTitle>
            <ToggleGroup
              aria-labelledby="settings-presets"
              value={[
                draft.presetIndex < 0 ? "custom" : String(draft.presetIndex),
              ]}
              variant="outline"
              onValueChange={draft.selectPreset}
            >
              {game.presets.map((preset, index) => (
                <ToggleGroupItem key={preset.label} value={String(index)}>
                  {preset.label}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        )}
        {draft.visibleFields.map((field) => (
          <GameField
            key={field.key}
            field={field}
            value={draft.values[field.key] ?? ""}
            values={draft.values}
            visuals={visuals}
            reducedMotion={reducedMotion}
            error={draft.errors[field.key]}
            change={(value) => draft.changeField(field.key, value)}
          />
        ))}
      </FieldGroup>
    </TabsContent>
  );
}
