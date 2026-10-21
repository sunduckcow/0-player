import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/engine/ui/primitives/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/engine/ui/primitives/select";
import type { AppearanceDraft } from "./use-appearance-settings";

function ColorOption({
  label,
  color,
  custom = false,
}: {
  label: string;
  color: string;
  custom?: boolean;
}) {
  return (
    <span className="settings-color-option">
      <span
        className="settings-color-dot"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>{label}</span>
      {custom && <small>{color}</small>}
    </span>
  );
}

interface AccentColorFieldProps {
  draft: AppearanceDraft;
  narrow: boolean;
  portalContainer: HTMLElement | null;
}

export function AccentColorField({
  draft,
  narrow,
  portalContainer,
}: AccentColorFieldProps) {
  const selectedColor = draft.selectedColor;
  return (
    <Field>
      <FieldLabel htmlFor="appearance-accent">Accent color</FieldLabel>
      <Select
        value={draft.preferences.accent}
        items={draft.colorChoices}
        modal={false}
        onValueChange={draft.changeAccent}
      >
        <SelectTrigger
          id="appearance-accent"
          className="settings-select"
          aria-describedby="appearance-accent-note"
        >
          <SelectValue>
            <ColorOption
              label={selectedColor.label}
              color={selectedColor.color}
              custom={selectedColor.value === "custom"}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          container={portalContainer}
          side="bottom"
          align="start"
          alignItemWithTrigger={false}
          positionMethod="fixed"
          collisionBoundary={[]}
          collisionPadding={8}
          collisionAvoidance={{
            side: narrow ? "flip" : "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className="settings-accent-menu"
        >
          <SelectGroup>
            {draft.colorChoices.map(({ value, label, color }) => (
              <SelectItem key={value} value={value}>
                <ColorOption
                  label={label}
                  color={color}
                  custom={value === "custom"}
                />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription id="appearance-accent-note">
        Shapes the full interface and board palette.
      </FieldDescription>
    </Field>
  );
}
