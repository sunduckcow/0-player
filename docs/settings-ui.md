# Settings UI

The simulation and canvas remain plain TypeScript. Only the settings form mounts a small React root, using shadcn/ui Base UI components installed from the official registry:

```sh
bunx --bun shadcn@latest add @shadcn/button @shadcn/input @shadcn/toggle-group @shadcn/field --yes
```

Additional components can be installed with `bun run ui:add @shadcn/<name>`. `components.json` defines the source paths and Lucide icon library. Keep local variant changes when updating generated components.

```ts
import { renderSettings, type SnakeSettings } from '@/settings-ui';

const dispose = renderSettings(container, settings, (next: SnakeSettings) => {
  // Host applies options, persists them, and closes its native dialog.
});
// Dispose before rendering another form into this container.
dispose();
```

`SnakeSettings` contains `ai: 'explorer' | 'safe'`, `columns`, and `rows`. The form validates even dimensions from 8 to 40. Presets are S 12×12, M 24×24, and L 32×32. Applying an AI change should preserve the current board; changing dimensions should start a new round. The host owns the dialog, pause state, saving, and game lifecycle.

`src/ui.css` includes Tailwind utilities without Preflight, so existing page geometry is unaffected. Semantic colors map to the arcade's existing tokens. Lucide uses named imports in `src/icons.ts`; Vite includes only icons used by the shell.
