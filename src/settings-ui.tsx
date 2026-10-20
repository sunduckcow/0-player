import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle,
} from "@/components/ui/field";
import "@/ui.css";

export interface SnakeSettings {
  ai: "explorer" | "safe";
  columns: number;
  rows: number;
}

const sizes = { s: 12, m: 24, l: 32 } as const;
type Size = keyof typeof sizes | "custom";

function SettingsForm({ initial, onApply }: {
  initial: SnakeSettings;
  onApply: (settings: SnakeSettings) => void;
}) {
  const [ai, setAi] = useState(initial.ai);
  const [size, setSize] = useState<Size>(() =>
    (Object.keys(sizes) as (keyof typeof sizes)[]).find(
      (key) => initial.columns === sizes[key] && initial.rows === sizes[key],
    ) ?? "custom",
  );
  const [columns, setColumns] = useState(String(initial.columns));
  const [rows, setRows] = useState(String(initial.rows));
  const width = size === "custom" ? Number(columns) : sizes[size];
  const height = size === "custom" ? Number(rows) : sizes[size];
  const validDimension = (value: number) =>
    Number.isInteger(value) && value >= 8 && value <= 40 && value % 2 === 0;
  const validWidth = validDimension(width);
  const validHeight = validDimension(height);
  const resized = width !== initial.columns || height !== initial.rows;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validWidth && validHeight) onApply({ ai, columns: width, rows: height });
  }

  return (
    <form
      className="settings-form"
      onSubmit={apply}
      onKeyDown={(event) => {
        // Let the form's controls own their arrows, Space and Enter.
        if (event.key !== "Escape") event.stopPropagation();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldTitle id="snake-ai-label">Autopilot strategy</FieldTitle>
          <ToggleGroup
            aria-labelledby="snake-ai-label"
            aria-describedby="snake-ai-description"
            value={[ai]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "explorer" || next === "safe") setAi(next);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="explorer">
              <Sparkles data-icon="inline-start" /> Explorer
            </ToggleGroupItem>
            <ToggleGroupItem value="safe">
              <ShieldCheck data-icon="inline-start" /> Safe loop
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription id="snake-ai-description">
            {ai === "explorer"
              ? "Chases food, checks escape routes, and improvises as the board fills."
              : "Follows a safe cycle, taking shortcuts when there is room."}
          </FieldDescription>
        </Field>
        <Field>
          <FieldTitle id="snake-size-label">Board size</FieldTitle>
          <ToggleGroup
            aria-labelledby="snake-size-label"
            value={[size]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "s" || next === "m" || next === "l" || next === "custom")
                setSize(next);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="s" aria-label="Small, 12 by 12">S · 12</ToggleGroupItem>
            <ToggleGroupItem value="m" aria-label="Medium, 24 by 24">M · 24</ToggleGroupItem>
            <ToggleGroupItem value="l" aria-label="Large, 32 by 32">L · 32</ToggleGroupItem>
            <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>Smaller boards get crowded sooner.</FieldDescription>
        </Field>
        {size === "custom" && (
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field data-invalid={!validWidth || undefined}>
              <FieldLabel htmlFor="snake-columns">Columns</FieldLabel>
              <Input
                id="snake-columns" type="number" inputMode="numeric"
                min={8} max={40} step={2} required
                value={columns} onChange={(event) => setColumns(event.target.value)}
                aria-invalid={!validWidth || undefined}
                aria-describedby="snake-custom-note"
              />
            </Field>
            <Field data-invalid={!validHeight || undefined}>
              <FieldLabel htmlFor="snake-rows">Rows</FieldLabel>
              <Input
                id="snake-rows" type="number" inputMode="numeric"
                min={8} max={40} step={2} required
                value={rows} onChange={(event) => setRows(event.target.value)}
                aria-invalid={!validHeight || undefined}
                aria-describedby="snake-custom-note"
              />
            </Field>
            <FieldDescription id="snake-custom-note" className="col-span-2">
              Even numbers from 8 to 40 in each direction.
            </FieldDescription>
            {(!validWidth || !validHeight) && (
              <FieldError className="col-span-2">Choose even dimensions between 8 and 40.</FieldError>
            )}
          </FieldGroup>
        )}
        <Field>
          <FieldDescription aria-live="polite">
            {resized
              ? "Changing the board starts a new round. Your settings are saved here."
              : "Changing strategy continues the current board. Your settings are saved here."}
          </FieldDescription>
          <Button type="submit" disabled={!validWidth || !validHeight} className="w-full">
            <Check data-icon="inline-start" />
            {resized ? "Apply & start new board" : "Apply settings"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

/** A small React island; the host owns the dialog and simulation lifecycle. */
export function renderSettings(
  container: HTMLElement,
  initial: SnakeSettings,
  onApply: (settings: SnakeSettings) => void,
) {
  const root = createRoot(container);
  flushSync(() => root.render(<SettingsForm initial={initial} onApply={onApply} />));
  return () => root.unmount();
}
