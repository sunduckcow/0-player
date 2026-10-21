import type {
  SettingField,
  SettingsValues as GameSettingsValues,
  SettingValue,
} from "@/engine/contracts/settings";
import type { VisualTheme } from "@/engine/contracts/visuals";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/engine/ui/primitives/toggle-group";
import { SettingPreviewCanvas } from "./setting-preview";

interface ChoiceFieldProps {
  id: string;
  field: Extract<SettingField, { kind: "choice" }>;
  value: SettingValue;
  values: GameSettingsValues;
  visuals: VisualTheme;
  reducedMotion: boolean;
  change: (value: SettingValue) => void;
}

export function ChoiceField({
  id,
  field,
  value,
  values,
  visuals,
  reducedMotion,
  change,
}: ChoiceFieldProps) {
  const hasPreviews = field.options.some((option) => option.preview);
  return (
    <ToggleGroup
      aria-labelledby={id}
      className={hasPreviews ? "settings-preview-options" : undefined}
      orientation={hasPreviews ? "vertical" : "horizontal"}
      value={[String(value)]}
      variant="outline"
      onValueChange={(next) => {
        const option = field.options.find(
          (option) => String(option.value) === next[0],
        );
        if (option) change(option.value);
      }}
    >
      {field.options.map((option) => (
        <ToggleGroupItem
          key={String(option.value)}
          value={String(option.value)}
          className={option.preview ? "settings-preview-option" : undefined}
        >
          <span>{option.label}</span>
          {option.preview && (
            <SettingPreviewCanvas
              spec={option.preview}
              values={{ ...values, [field.key]: option.value }}
              visuals={visuals}
              reducedMotion={reducedMotion}
              label={`${option.label} preview`}
            />
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
