import type {
  SettingField,
  SettingsValues,
  SettingsErrors,
} from "@/engine/contracts/settings";

type NumberField = Extract<SettingField, { kind: "number" }>;

function isValidNumber(value: unknown, field: NumberField): boolean {
  if (value === "" || value === undefined || typeof value === "boolean")
    return false;
  const number = Number(value);
  if (!Number.isFinite(number) || number < field.min || number > field.max)
    return false;
  const steps = (number - field.min) / field.step;
  const offStep = Math.abs(steps - Math.round(steps)) > 1e-8;
  return !offStep;
}

/** Shared field constraints; cartridge validation adds domain/cross-field invariants. */
export function validateFields(
  fields: readonly SettingField[],
  draft: Readonly<SettingsValues>,
): SettingsErrors {
  const errors: SettingsErrors = {};
  for (const field of fields) {
    const value = draft[field.key];
    if (field.kind === "number") {
      if (!isValidNumber(value, field))
        errors[field.key] =
          `Choose ${field.min}–${field.max}, step ${field.step}.`;
    } else if (field.kind === "boolean") {
      if (typeof value !== "boolean") errors[field.key] = "Choose On or Off.";
    } else if (!field.options.some((option) => option.value === value))
      errors[field.key] = "Choose an available option.";
  }
  return errors;
}
