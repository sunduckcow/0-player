# Settings UI

The engine owns one generic shadcn/Base UI form (`src/engine/ui/settings/settings-dialog.tsx`), with General and the active cartridge's tab. It imports no concrete game, state type or preview component. Installed component source stays in `src/engine/ui/primitives`; add components with `bun run ui:add @shadcn/<name>`.

`settings-dialog.tsx` mounts and disposes the React root. `settings-form.tsx` coordinates the tabs and Apply/Cancel. Appearance/game draft hooks and section components own their respective fields, while `fields.tsx`, `choice-field.tsx` and `setting-preview.tsx` handle schema controls and Canvas previews. Shared types live in `types.ts`, media subscriptions in `media.ts`. These stay inside `engine/ui/settings`; the form does not own Session or browser storage.

General owns dark/light/system and accent presets/custom HEX. `appearancePalette` resolves both CSS tokens and a deeply frozen SDK visual palette. Draft appearance can redraw a cartridge preview against its own backing surface without applying the live preference. System theme and reduced-motion updates are observed by the engine UI.

Cartridges supply fields (boolean/choice/number), presets, normalization, validation and a `none/presentation/rules/restart` classifier through `SettingsDefinition`. The form holds a raw draft, keeps invalid number edits visible, shows field errors and disables Apply. Choice previews are synchronous Canvas callbacks; the engine owns their element, bounds, backing color and redraw lifecycle. Games cannot provide React/JSX or arrange fields using CSS.

Snake's `preview.ts` supplies fixed segment geometry to the shared body renderer, rather than constructing a playable `SnakeState`. The zero-state template lives in `state.ts`; the current state belongs only to the engine session. Preview drawing does not initialize or advance a game.

Apply delegates to `Cartridge.apply`; the host persists its values and refreshes the shared presentation. No callback-identity comparison or per-property host branching remains. Presentation keeps the exact live Session and history; rules use its complete stable snapshot, including recovery fallback metadata; restart resets geometry. Cancel/Escape/closing discards draft settings and restores the pre-dialog pause/focus state.

On mobile, General/game tabs run horizontally and the scrollable content is separate from fixed Apply/Cancel actions. Inputs use 16px text. The accent Select is portaled into the dialog's native top layer with fixed positioning, outside form layout. It can flip on small screens to remain usable; desktop keeps downward opening. The dialog has no transform that could invalidate popup coordinates.

See [the SDK contract](engine-sdk.md) for schemas, lifecycle, codecs, actions and visual roles.
