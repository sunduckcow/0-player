import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/engine/ui/primitives/field";
import { Input } from "@/engine/ui/primitives/input";
import type { AppearanceDraft } from "./use-appearance-settings";

export function CustomColorFields({ draft }: { draft: AppearanceDraft }) {
  return (
    <FieldGroup className="custom-color-fields">
      <Field>
        <FieldLabel htmlFor="appearance-color-picker">Color</FieldLabel>
        <Input
          id="appearance-color-picker"
          className="settings-color-picker"
          type="color"
          value={draft.pickerColor}
          onChange={(event) => draft.changeCustomColor(event.target.value)}
        />
      </Field>
      <Field data-invalid={!draft.validHex || undefined}>
        <FieldLabel htmlFor="appearance-custom-hex">HEX value</FieldLabel>
        <Input
          id="appearance-custom-hex"
          value={draft.customHex}
          onChange={(event) => draft.changeCustomColor(event.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          required
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          aria-invalid={!draft.validHex || undefined}
          aria-describedby="appearance-color-note"
        />
      </Field>
      <FieldDescription id="appearance-color-note" className="col-span-2">
        Six-digit HEX, for example #c6ef83.
      </FieldDescription>
      {!draft.validHex && (
        <FieldError className="col-span-2">
          Enter # followed by six hexadecimal digits.
        </FieldError>
      )}
    </FieldGroup>
  );
}
