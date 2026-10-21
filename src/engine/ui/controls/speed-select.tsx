import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/engine/ui/primitives/select";
import { playbackSpeeds } from "@/engine/runtime/session";

const items = playbackSpeeds.map((value) => ({
  value,
  label: value === 0.5 ? "½×" : `${value}×`,
}));

/** A small React island; the engine owns the value and the saved preference. */
export function mountSpeedSelect(
  container: HTMLElement,
  onChange: (speed: number) => void,
) {
  const root = createRoot(container);
  let previous = "";
  return {
    update(value: number, disabled: boolean, hint: string) {
      const signature = JSON.stringify([value, disabled, hint]);
      if (signature === previous) return;
      previous = signature;
      flushSync(() =>
        root.render(
          <Select
            value={value}
            items={items}
            disabled={disabled}
            modal={false}
            onValueChange={(next) => {
              if (next !== null) onChange(next);
            }}
          >
            <SelectTrigger
              id="speed-select"
              aria-label="Game speed"
              title={hint}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="speed-menu"
              side="top"
              align="end"
              sideOffset={8}
              positionMethod="fixed"
              alignItemWithTrigger={false}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <SelectGroup>
                <SelectLabel>Autopilot speed</SelectLabel>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>,
        ),
      );
    },
  };
}
