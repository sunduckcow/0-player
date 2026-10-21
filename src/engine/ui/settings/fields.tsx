import type {
  SettingField,
  SettingsValues as GameSettingsValues,
  SettingValue,
} from "@/engine/contracts/settings";
import type { VisualTheme } from "@/engine/contracts/visuals";
import {
  Field,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldError,
} from "@/engine/ui/primitives/field";
import { Input } from "@/engine/ui/primitives/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/engine/ui/primitives/toggle-group";
import { ChoiceField } from "./choice-field";

interface GameFieldProps {
  field: SettingField;
  value: SettingValue;
  values: GameSettingsValues;
  visuals: VisualTheme;
  reducedMotion: boolean;
  error?: string;
  change: (value: SettingValue) => void;
}

export function GameField({
  field,
  value,
  values,
  visuals,
  reducedMotion,
  error,
  change,
}: GameFieldProps) {
  const id = `setting-${field.key}`;
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      {field.kind === "number" ? (
        <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      ) : (
        <FieldTitle id={id}>{field.label}</FieldTitle>
      )}
      {field.kind === "number" ? (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          step={field.step}
          value={String(value)}
          required
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) =>
            change(
              Number.isFinite(event.target.valueAsNumber)
                ? event.target.valueAsNumber
                : event.target.value,
            )
          }
        />
      ) : field.kind === "boolean" ? (
        <ToggleGroup
          aria-labelledby={id}
          value={[value ? "on" : "off"]}
          variant="outline"
          onValueChange={(next) => {
            if (next.length) change(next[0] === "on");
          }}
        >
          <ToggleGroupItem value="on">On</ToggleGroupItem>
          <ToggleGroupItem value="off">Off</ToggleGroupItem>
        </ToggleGroup>
      ) : (
        <ChoiceField
          id={id}
          field={field}
          value={value}
          values={values}
          visuals={visuals}
          reducedMotion={reducedMotion}
          change={change}
        />
      )}
      {field.description && (
        <FieldDescription>{field.description}</FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
