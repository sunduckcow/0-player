# Settings UI

The simulation and canvas remain plain TypeScript. Only the settings form mounts a small React root, using shadcn/ui Base UI components installed from the official registry:

```sh
bunx --bun shadcn@latest add @shadcn/button @shadcn/input @shadcn/toggle-group @shadcn/field --yes
```

Additional components can be installed with `bun run ui:add @shadcn/<name>`. `components.json` defines the source paths and Lucide icon library. Keep local variant changes when updating generated components.

```ts
import { renderSettings, type SettingsValues } from '@/settings-ui';

const dispose = renderSettings(container, {
  gameId: 'tetris',
  general: { theme: 'dark', accent: 'lime' },
  snake: { ai: 'explorer', skin: 'tapered', columns: 24, rows: 24 },
  tetris: { showGhost: true, showNext: true },
}, (next: SettingsValues) => {
  // Host applies options, persists them, and closes its native dialog.
});
// Dispose before rendering another form into this container.
dispose();
```

The dialog opens to General. A vertical tab list switches between General and the current game; below 560px it becomes horizontal with matching keyboard orientation. Drafts survive tab changes. Apply saves the draft; Cancel, Escape and closing discard it. The footer stays visible while long content scrolls. The host owns pause restoration and focus.

General supports dark/light/system and an accent selector with lime/cyan/violet/amber/rose presets plus a custom HEX color. `AppearancePreferences` stores the preset name (or `custom`) and optional `customColor`. `appearance.ts` validates preferences and derives all shared interface/Canvas colors from the selected accent, adjusting contrast for the resolved theme. Snake's food takes the complementary hue, 180° from the accent. Tetris retains distinct colors for its seven pieces. The host persists `0-player:appearance` and observes system theme changes. Appearance changes preserve the existing session.

`SnakeSettings` contains `ai: 'explorer' | 'safe'`, `skin: 'tapered' | 'squares'`, `columns`, and `rows`. Old preferences default to squares. Dimensions must be even, 8…40; presets are S 12×12, M 24×24 and L 32×32. An AI change preserves the board; a resize starts a fresh board. Skin-only changes rebind presentation around the same Session, preserving rewind history. `configureSnake` retains rule function identities when only presentation changes. Tetris supports landing-guide and next-piece visibility with the same preservation behavior. `rebindPresentation` rejects different rule functions.

Two compact vertical selection rows show Tapered and Squares simultaneously, each with its own horizontal `SnakePreview`. Each preview shows the head plus one segment per width step, using the shared `renderSnakeBody` geometry without a board or food. The complete row selects a draft skin; Up/Down navigation follows the vertical ToggleGroup orientation. Previews have no simulation, timers or live-session references. Both skins keep pixel separators; tapered changes only transverse width in five symmetric steps while preserving segment path length, including turns.

Tabs was also installed with `bun run ui:add @shadcn/tabs`. Its wrapper forwards Base UI's `orientation` and uses `data-orientation` selectors.

The accent dropdown uses the official shadcn `select`, installed with `bun run ui:add @shadcn/select`. Each option and the selected value show a color swatch. Its portal stays within the host dialog's top layer, with a fixed Positioner anchored below the trigger. Viewport collision sizing and disabled side flipping keep it outside dialog layout; insufficient height scrolls the popup rather than moving it above the trigger. The wrapper forwards positioning props to Positioner, not Popup. The settings dialog fades without a transform so it cannot become a fixed-position containing block during entry. Custom mode offers a color picker and a validated six-digit HEX input; invalid drafts cannot be applied.

`src/ui.css` imports Tailwind theme/utilities without Preflight and adds a small layered form-control reset. Keep reset declarations below utilities in cascade priority; unlayered `button {color:inherit}` would override primary-button contrast. Semantic colors use `index.css` tokens. Lucide uses named imports, and Vite includes only icons used by the app.

`Game.labels` describes static HTML labels in logical board coordinates. `board-labels.ts` positions and sizes them with the Canvas; renderers draw the pixel artwork. Tetris uses this for the sharp **Next** label and hides it with the preview.
