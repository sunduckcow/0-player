import { useState, useSyncExternalStore, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Check, Gamepad2, Monitor, Moon, ShieldCheck, SlidersHorizontal, Sparkles, Sun } from "lucide-react";
import { accentChoices, resolveAccentColor, type AppearancePreferences } from "@/appearance";
import type { SnakeSkin } from "@/games/snake/settings";
import type { TetrisOptions } from "@/games/tetris/settings";
import { SnakePreview } from "@/snake-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import "@/ui.css";

export interface SnakeSettings {
  ai: "explorer" | "safe";
  skin: SnakeSkin;
  columns: number;
  rows: number;
}
export interface SettingsValues {
  general: AppearancePreferences;
  snake: SnakeSettings;
  tetris: TetrisOptions;
}
export interface SettingsInitial extends SettingsValues {
  gameId: "snake" | "tetris";
}

const sizes = { s: 12, m: 24, l: 32 } as const;
type Size = keyof typeof sizes | "custom";
const compact = typeof matchMedia === "function" ? matchMedia("(max-width: 560px)") : null;
const subscribeCompact = (changed: () => void) => {
  compact?.addEventListener("change", changed);
  return () => compact?.removeEventListener("change", changed);
};
const isCompact = () => compact?.matches ?? false;
const validDimension = (value: number) => Number.isInteger(value) && value >= 8 && value <= 40 && value % 2 === 0;

function VisibilityField({ id, title, description, value, onChange }: {
  id: string; title: string; description: string; value: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <Field>
      <FieldTitle id={id}>{title}</FieldTitle>
      <ToggleGroup aria-labelledby={id} value={[value ? "on" : "off"]} variant="outline"
        onValueChange={(values) => { if (values.length) onChange(values[0] === "on"); }}>
        <ToggleGroupItem value="on">On</ToggleGroupItem>
        <ToggleGroupItem value="off">Off</ToggleGroupItem>
      </ToggleGroup>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

function ColorOption({ label, color, custom = false }: { label: string; color: string; custom?: boolean }) {
  return <span className="settings-color-option"><span className="settings-color-dot" style={{ backgroundColor: color }} aria-hidden="true" /><span>{label}</span>{custom && <small>{color}</small>}</span>;
}

function SettingsForm({ initial, onApply, onCancel, portalContainer }: {
  initial: SettingsInitial;
  onApply: (settings: SettingsValues) => void;
  onCancel: () => void;
  portalContainer: HTMLElement | null;
}) {
  const narrow = useSyncExternalStore(subscribeCompact, isCompact, () => false);
  const [general, setGeneral] = useState(initial.general);
  const [customHex, setCustomHex] = useState(initial.general.customColor ?? resolveAccentColor(initial.general));
  const [pickerColor, setPickerColor] = useState(customHex);
  const [tetris, setTetris] = useState(initial.tetris);
  const [ai, setAi] = useState(initial.snake.ai);
  const [skin, setSkin] = useState(initial.snake.skin);
  const [size, setSize] = useState<Size>(() =>
    (Object.keys(sizes) as (keyof typeof sizes)[]).find(
      (key) => initial.snake.columns === sizes[key] && initial.snake.rows === sizes[key],
    ) ?? "custom",
  );
  const [columns, setColumns] = useState(String(initial.snake.columns));
  const [rows, setRows] = useState(String(initial.snake.rows));
  const colorOptions = [...accentChoices, { value: "custom" as const, label: "Custom", color: pickerColor }];
  const selectedColor = colorOptions.find((option) => option.value === general.accent)!;
  const width = size === "custom" ? Number(columns) : sizes[size];
  const height = size === "custom" ? Number(rows) : sizes[size];
  const validWidth = validDimension(width);
  const validHeight = validDimension(height);
  const validColor = /^#[0-9a-fA-F]{6}$/.test(customHex);
  const validCustom = general.accent !== "custom" || validColor;
  const valid = validCustom && (initial.gameId !== "snake" || (validWidth && validHeight));
  const resized = initial.gameId === "snake" && (width !== initial.snake.columns || height !== initial.snake.rows);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid) onApply({ general: { ...general, customColor: validColor ? customHex.toLowerCase() : general.customColor }, tetris, snake: { ai, skin, columns: width, rows: height } });
  }

  function changeCustomColor(value: string) {
    setCustomHex(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) setPickerColor(value.toLowerCase());
  }

  return (
    <form className="settings-form" onSubmit={apply} onKeyDown={(event) => {
      if (event.key !== "Escape") event.stopPropagation();
    }}>
      <Tabs className="settings-tabs" defaultValue="general" orientation={narrow ? "horizontal" : "vertical"}>
        <TabsList className="settings-nav" aria-label="Settings sections">
          <TabsTrigger value="general"><SlidersHorizontal aria-hidden="true" /> General</TabsTrigger>
          <TabsTrigger value="game"><Gamepad2 aria-hidden="true" /> {initial.gameId === "snake" ? "Snake" : "Tetris"}</TabsTrigger>
        </TabsList>
        <div className="settings-content">
          <TabsContent value="general">
            <div className="settings-section-heading"><h3>Appearance</h3><p>Make the arcade feel at home on your screen.</p></div>
            <FieldGroup>
              <Field>
                <FieldTitle id="appearance-theme-label">Theme</FieldTitle>
                <ToggleGroup aria-labelledby="appearance-theme-label" value={[general.theme]} variant="outline"
                  onValueChange={(values) => {
                    const theme = values[0];
                    if (theme === "dark" || theme === "light" || theme === "system") setGeneral({ ...general, theme });
                  }}>
                  <ToggleGroupItem value="dark"><Moon data-icon="inline-start" /> Dark</ToggleGroupItem>
                  <ToggleGroupItem value="light"><Sun data-icon="inline-start" /> Light</ToggleGroupItem>
                  <ToggleGroupItem value="system"><Monitor data-icon="inline-start" /> System</ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>System follows your device's appearance.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="appearance-accent">Accent color</FieldLabel>
                <Select value={general.accent} items={colorOptions} modal={false}
                  onValueChange={(accent) => {
                    if (accent === "custom" || accentChoices.some((option) => option.value === accent))
                      setGeneral({ ...general, accent: accent as AppearancePreferences["accent"] });
                  }}>
                  <SelectTrigger id="appearance-accent" className="settings-select" aria-describedby="appearance-accent-note">
                    <SelectValue><ColorOption label={selectedColor.label} color={selectedColor.color} custom={selectedColor.value === "custom"} /></SelectValue>
                  </SelectTrigger>
                  <SelectContent container={portalContainer} side="bottom" align="start" alignItemWithTrigger={false}
                    positionMethod="fixed" collisionBoundary={[]} collisionPadding={8}
                    collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }} className="settings-accent-menu">
                    <SelectGroup>
                      {colorOptions.map(({ value, label, color }) => (
                        <SelectItem key={value} value={value}><ColorOption label={label} color={color} custom={value === "custom"} /></SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription id="appearance-accent-note">Shapes the full interface and board palette.</FieldDescription>
              </Field>
              {general.accent === "custom" && (
                <FieldGroup className="custom-color-fields">
                  <Field>
                    <FieldLabel htmlFor="appearance-color-picker">Color</FieldLabel>
                    <Input id="appearance-color-picker" className="settings-color-picker" type="color" value={pickerColor}
                      onChange={(event) => changeCustomColor(event.target.value)} />
                  </Field>
                  <Field data-invalid={!validColor || undefined}>
                    <FieldLabel htmlFor="appearance-custom-hex">HEX value</FieldLabel>
                    <Input id="appearance-custom-hex" value={customHex} onChange={(event) => changeCustomColor(event.target.value)}
                      pattern="#[0-9a-fA-F]{6}" required spellCheck={false} autoCapitalize="none" autoComplete="off"
                      aria-invalid={!validColor || undefined} aria-describedby="appearance-color-note" />
                  </Field>
                  <FieldDescription id="appearance-color-note" className="col-span-2">Six-digit HEX, for example #c6ef83.</FieldDescription>
                  {!validColor && <FieldError className="col-span-2">Enter # followed by six hexadecimal digits.</FieldError>}
                </FieldGroup>
              )}
            </FieldGroup>
          </TabsContent>
          <TabsContent value="game">
            <div className="settings-section-heading">
              <h3>{initial.gameId === "snake" ? "Snake" : "Tetris"}</h3>
              <p>Settings for the game you're playing.</p>
            </div>
            {initial.gameId === "snake" ? (
              <FieldGroup>
                <Field>
                  <FieldTitle id="snake-skin-label">Snake appearance</FieldTitle>
                  <ToggleGroup className="snake-skin-options" orientation="vertical" aria-labelledby="snake-skin-label" aria-describedby="snake-skin-description" value={[skin]} variant="outline"
                    onValueChange={(values) => { const next = values[0]; if (next === "tapered" || next === "squares") setSkin(next); }}>
                    <ToggleGroupItem value="tapered" className="snake-skin-option" aria-label="Tapered snake">
                      <span>Tapered</span><SnakePreview skin="tapered" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="squares" className="snake-skin-option" aria-label="Square snake">
                      <span>Squares</span><SnakePreview skin="squares" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription id="snake-skin-description">
                    {skin === "tapered" ? "A tapered body with pixel separators." : "Original square tiles with narrow pixel joints."}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldTitle id="snake-ai-label">Autopilot strategy</FieldTitle>
                  <ToggleGroup aria-labelledby="snake-ai-label" aria-describedby="snake-ai-description" value={[ai]} variant="outline"
                    onValueChange={(values) => { const next = values[0]; if (next === "explorer" || next === "safe") setAi(next); }}>
                    <ToggleGroupItem value="explorer"><Sparkles data-icon="inline-start" /> Explorer</ToggleGroupItem>
                    <ToggleGroupItem value="safe"><ShieldCheck data-icon="inline-start" /> Safe loop</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription id="snake-ai-description">
                    {ai === "explorer" ? "Chases food, checks escape routes, and improvises as the board fills." : "Follows a safe cycle, taking shortcuts when there is room."}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldTitle id="snake-size-label">Board size</FieldTitle>
                  <ToggleGroup aria-labelledby="snake-size-label" value={[size]} variant="outline"
                    onValueChange={(values) => { const next = values[0]; if (next === "s" || next === "m" || next === "l" || next === "custom") setSize(next); }}>
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
                      <Input id="snake-columns" type="number" inputMode="numeric" min={8} max={40} step={2} required
                        value={columns} onChange={(event) => setColumns(event.target.value)} aria-invalid={!validWidth || undefined} aria-describedby="snake-custom-note" />
                    </Field>
                    <Field data-invalid={!validHeight || undefined}>
                      <FieldLabel htmlFor="snake-rows">Rows</FieldLabel>
                      <Input id="snake-rows" type="number" inputMode="numeric" min={8} max={40} step={2} required
                        value={rows} onChange={(event) => setRows(event.target.value)} aria-invalid={!validHeight || undefined} aria-describedby="snake-custom-note" />
                    </Field>
                    <FieldDescription id="snake-custom-note" className="col-span-2">Even numbers from 8 to 40 in each direction.</FieldDescription>
                    {(!validWidth || !validHeight) && <FieldError className="col-span-2">Choose even dimensions between 8 and 40.</FieldError>}
                  </FieldGroup>
                )}
              </FieldGroup>
            ) : (
              <FieldGroup>
                <VisibilityField id="tetris-ghost-label" title="Landing guide" description="Show where the current piece will land."
                  value={tetris.showGhost} onChange={(showGhost) => setTetris({ ...tetris, showGhost })} />
                <VisibilityField id="tetris-next-label" title="Next piece" description="Show a preview of the next piece."
                  value={tetris.showNext} onChange={(showNext) => setTetris({ ...tetris, showNext })} />
              </FieldGroup>
            )}
          </TabsContent>
        </div>
      </Tabs>
      <div className="settings-footer">
        <p aria-live="polite" className="settings-save-note">
          {!validCustom ? "Enter a six-digit HEX color before applying." : !valid ? "Choose even board dimensions between 8 and 40 before applying." : resized ? "Changing the board starts a new round." : "Saved on this browser. Your current game continues."}
        </p>
        <div className="settings-actions">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={!valid}><Check data-icon="inline-start" />{resized ? "Apply & restart" : "Apply settings"}</Button>
        </div>
      </div>
    </form>
  );
}

/** A small React island; the host owns the native dialog and game lifecycle. */
export function renderSettings(container: HTMLElement, initial: SettingsInitial, onApply: (settings: SettingsValues) => void) {
  const root = createRoot(container);
  flushSync(() => root.render(<SettingsForm initial={initial} onApply={onApply} onCancel={() => container.closest("dialog")?.close()} portalContainer={container.closest("dialog")} />));
  return () => root.unmount();
}
