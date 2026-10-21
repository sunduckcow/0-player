import { Monitor, Moon, Sun } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/engine/ui/primitives/field";
import { TabsContent } from "@/engine/ui/primitives/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/engine/ui/primitives/toggle-group";
import { AccentColorField } from "./accent-color-field";
import { CustomColorFields } from "./custom-color-fields";
import type { AppearanceDraft } from "./use-appearance-settings";

interface AppearanceSettingsProps {
  draft: AppearanceDraft;
  narrow: boolean;
  portalContainer: HTMLElement | null;
}

export function AppearanceSettings({
  draft,
  narrow,
  portalContainer,
}: AppearanceSettingsProps) {
  return (
    <TabsContent value="general">
      <div className="settings-section-heading">
        <h3>Appearance</h3>
        <p>Make the arcade feel at home on your screen.</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldTitle id="appearance-theme-label">Theme</FieldTitle>
          <ToggleGroup
            aria-labelledby="appearance-theme-label"
            value={[draft.preferences.theme]}
            variant="outline"
            onValueChange={(values) => draft.changeTheme(values[0])}
          >
            <ToggleGroupItem value="dark">
              <Moon data-icon="inline-start" /> Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="light">
              <Sun data-icon="inline-start" /> Light
            </ToggleGroupItem>
            <ToggleGroupItem value="system">
              <Monitor data-icon="inline-start" /> System
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            System follows your device's appearance.
          </FieldDescription>
        </Field>
        <AccentColorField
          draft={draft}
          narrow={narrow}
          portalContainer={portalContainer}
        />
        {draft.preferences.accent === "custom" && (
          <CustomColorFields draft={draft} />
        )}
      </FieldGroup>
    </TabsContent>
  );
}
