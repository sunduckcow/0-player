# 0-player

[Play in your browser](https://sunduckcow.github.io/0-player/)

A small arcade with a mind of its own. Snake and Tetris play themselves; take over whenever you like. Built for a browser tab, a television, or a quiet second screen.

The engine and games use TypeScript + Canvas 2D. The settings interface uses shadcn/ui, React and Base UI; icons come from Lucide. No external runtime assets, API keys or server are required.

## Run

```sh
bun install
bun run dev
```

Open the local address printed by Vite. `bun run check` runs Prettier verification, lint, TypeScript and Vitest; `bun run build` produces **one self-contained `dist/index.html`** (roughly 550 KB, or 171 KB gzip). Open it directly offline, send it to someone, or upload it to any static host. `bun run preview` serves the production build locally.

Use `bun run format` to apply Prettier or `bun run format:check` to check it. Generated shadcn components in `src/engine/ui/primitives`, dependencies and build outputs are excluded; `bun.lock` remains managed by Bun. The CI uses the same formatting check through `bun run check`.

For GitHub Pages, publish the contents of `dist/` as the site's root or a repository subdirectory. All code, styles and the favicon are inline, so no base-path configuration is needed. Nothing is published by the build command.

## GitHub and automatic publishing

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) checks pull requests to `main` and publishes successful pushes to `main`, including merged pull requests. It installs locked dependencies, runs `bun run check`, builds the site and deploys `dist/` using the official GitHub Pages actions. Failed checks block publication. Manual runs from the Actions tab publish only when `main` is selected. Bun is pinned in `.bun-version`; Node 22 runs the Vite and Vitest tools.

First-time setup:

1. Create an empty GitHub repository, for example `0-player`, without generated README or gitignore files. GitHub Free supports Pages for public repositories; private repositories require a supported paid plan. Choose the source visibility you want before uploading.
2. Publish this folder, replacing `OWNER` with your GitHub account or organization:

   ```sh
   git init -b main
   git add .
   git commit -m "Initial 0-player arcade"
   git remote add origin git@github.com:OWNER/0-player.git
   git push -u origin main
   ```

   The remote above uses SSH; copy the HTTPS remote from GitHub instead if that is how you authenticate. `node_modules/` and `dist/` are already ignored; commit `bun.lock`, the sources and the workflow.

3. In the GitHub repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
4. Open **Actions → CI and GitHub Pages → Run workflow**, select `main` and run it. If the first push tried to deploy before Pages was enabled, rerun that workflow after this setup.
5. The deployment shows the live URL, normally `https://OWNER.github.io/0-player/`. Every subsequent push or merge into `main` updates the site automatically. No personal access token or deployment secret is needed.

To require green checks before merging, add a repository ruleset for `main` and require the **Check and build** status check after its first run. The workflow itself prevents failed builds from deploying; merge protection is a separate repository setting. A runnable CI workflow alone does not enable that protection.

See GitHub's [custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Controls

| Input                 | Action                                |
| --------------------- | ------------------------------------- |
| Arrow keys or H/J/K/L | Take over and move                    |
| A                     | Give the current board back to AI     |
| Space or P            | Pause / resume                        |
| R                     | New round with a new seed             |
| F                     | Focus mode / fullscreen               |
| G                     | Open the game library                 |
| / or ?                | Open the control sheet                |
| 1–9                   | Select the numbered game              |
| Escape                | Leave focus mode                      |
| Enter                 | Tetris hard drop / restart after loss |
| Up or X               | Tetris clockwise rotation             |
| Down                  | Tetris soft drop                      |

Letter shortcuts follow physical key positions, so they also work with the Russian layout: for example G/П opens the library and A/Ф returns control to AI. Touch devices get a directional pad and game actions. Focus mode has touch-accessible takeover, pause and exit controls. Browser shortcuts and form controls keep their normal behavior. New games start with autopilot enabled; it restarts completed rounds automatically. Snake and Tetris recover from losses automatically. Returning to AI preserves the board and pause state.

Browser speed changes and returning to autopilot ease in and out over 350 ms, preserving tick progress. Reduced motion uses immediate transitions. Local saves keep the selected target speed. Choose an autopilot speed between ½× and 4×. Shared links keep the game, seed and focus layout, for example `?fullscreen=1#game=snake&seed=42`; one shared speed preference stays in local storage (`0-player:speed`). Each game supplies its base `tickMs`; the engine applies the same ½×/1×/2×/4× multiplier across all games. Manual takeover always runs at 1×; returning to AI restores its chosen speed. Speed controls are disabled during manual play, and all games use the same autopilot preference. Old `speed` query parameters are ignored and removed. Switching games or opening a different seed keeps this browser’s shared speed preference. Each game's board, score, AI/manual mode, pause state, speed, seed and round are saved locally about once a second, when switching games and when leaving the page. Switching games and reloading continue the saved session. Settings and best scores are also saved per game. If storage is unavailable, switching still preserves sessions in memory for the current page.

The **Restart** button, R, a manual retry and automatic new rounds all choose a new seed. Round seeds are mixed to avoid the similar first draws of neighboring LCG seeds. The URL fragment stores the selected game and current seed, for example `#game=tetris&seed=42`. An explicit seed opens its matching saved session when available; otherwise it starts that setup. The same seed, settings, actions and control-ownership sequence produce the same state. Engine callers can replay a setup with `session.restart(seed)`. This is not an input recording system.

After a loss, both games pulse with the engine's recovery colors (red tones adjusted for the current theme), then visibly replay recent states backwards: Snake walks back along its path and Tetris pieces climb back through earlier rows. The whole presentation takes 640 ms for Snake and 720 ms for Tetris. The AI then continues from a viable earlier position with its remembered speed. Snake rewinds about eight steps; Tetris about 24. Seed and round stay unchanged; score and random state rewind with the board. If there is no viable history or two rescues have already failed, a fresh AI round starts instead. A new manual takeover renews the rescue budget. R or **Restart** always cancels recovery and starts a fresh board. Games without recovery keep the usual manual retry / automatic restart behavior. Enabling AI on a live board never resets it. Space consistently toggles pause even when a toolbar button has keyboard focus. Inside native dialogs, Space and Enter activate the focused button; search fields keep normal text entry.

## Game workspace

Share `?fullscreen=1#game=snake` (or `#game=tetris`) to open directly in the
focus layout. F and the focus buttons update this query parameter, preserving
the selected game, seed and other parameters. Opening a link uses the focus
layout; native browser fullscreen still needs a user gesture.

The arcade fits the viewport without page scrolling. The header and dock keep fixed heights; waiting or taking control does not resize the board. In the normal desktop layout, game controls sit on the left (Snake groups its four directions into one compact movement block), the game fills the center, and score and details sit on the right. The header shows a controls icon only when the left rail is hidden (up to 1000px); `/` and `?` always open the full control sheet. Focus mode keeps the game with a compact score, selected metrics and playback controls on the right, freeing the full height for the board. Taking control reveals the game's key hints; returning to autopilot hides them while keeping the board in place. Smaller screens use compact stats and touch controls.

Open the searchable game library with **G** or the current-game selector. Compact cards form a grid; arrows work from the search field, Enter plays the active result, and 1–9 select the catalog's numbered games. Open the configured control sheet with **/** or **?**. Escape closes the panel and returns to the board. Panels pause gameplay and restore its previous pause state. Selecting either game continues its saved board.

**Settings** is available in both games, including focus mode. Its General section offers dark, light or system appearance and an accent selector with five presets or a custom HEX color. The accent generates the interface backgrounds, panels, buttons, borders and board palette; contrast adapts to the theme. Snake's apple uses the opposite hue on the color wheel. System appearance tracks your device theme. Preferences are saved in this browser; Apply saves the draft and Cancel discards it. Appearance changes preserve the live session. Navigation moves above the form on small screens.

Snake settings offer Explorer or Safe loop AI, Squares (default) or Tapered skins, and S (12×12), M (24×24), L (32×32), or custom even dimensions from 8 to 40 in each direction. Tapered stretches five pixel-width steps (18/16/12/8/6) along the full body, with a full-width neck and a narrow tail spanning multiple cells on longer snakes. Its segments keep their 18px path length, shrinking only across the path with symmetric insets. Short 2px seams keep pixel separators visible without long thin links; turns use angular segments. Squares preserves the original 16px cells and 10px joints. The settings form previews either skin immediately on a static snake, without advancing the live game. Changing skin preserves the exact live session, including rewind history. Switching AI continues the current board. Changing dimensions starts a new board. Tetris settings show or hide the landing guide and next-piece preview, preserving the same session and rewind history. Board labels such as **Next** are HTML text in logical coordinates, so text remains sharp while the Canvas keeps its pixel art.

Explorer hunts food while leaving room around the moving tail. For the final ten empty cells, it looks for a complete route through those cells back to the tail and chooses the shortest food prefix. Meals entering that range must preserve such a route, avoiding the isolated-cell traps that a simple tail-following check can miss. The completion search shares an 8192-state budget per decision; moving-tail food search shares 32 endpoint checks. A previously saved, already impossible board cannot always be repaired by a legal move; restart it with R.

## Architecture

The filesystem map and dependency rules are in [docs/architecture.md](docs/architecture.md). The public cartridge contract is [engine/sdk.ts](src/engine/sdk.ts); the full authoring guide is [docs/engine-sdk.md](docs/engine-sdk.md).

```text
src/main.ts                 Vite entrypoint only
src/app/                    workspace composition and game registration
src/engine/
  sdk.ts                    stable public cartridge API
  contracts/                type-only game/settings/codec/visual contracts
  runtime/                  engine instances, state cloning, session and recovery
  input/                    commands, bindings and keyboard adapter
  rendering/                Canvas helpers and feedback
  theme/                    pure appearance resolver and local color math
  platform/                 browser persistence and DOM theme adapter
  ui/                       controls, library, settings, board HUD, primitives/styles
  lib/                      pure low-level PRNG
src/games/<id>/             index default cartridge + private rules/AI/render/settings
src/**/__tests__/          tests next to the module they cover
src/tests/architecture/     dependency/import/cycle guards
src/tests/integration/      scenarios involving engine and real games
```

Each `games/<id>/index.ts` exports a plain definition object as `default`, checked with `satisfies GameDefinition<State, Settings, Action>`. Registration is only `import snake from "@/games/snake"` and `catalog = [snake, tetris]`. The engine creates isolated runtime instances from that catalog; games do not instantiate themselves. `defaultState` supplies the zero-state shape and values, with optional pure seeded `initialize`. The engine deep-clones the template for each new game and owns all live state/settings/history.

Game entries visibly compose one default object per local module: `logic`, `ai`, `render`, `settings`, `persistence`, `controls` and the zero-state template. Types live in `types.ts`; geometry and larger searches have their own modules. Small callbacks stay inline in `index.ts`, and private helpers stay with their algorithm. Snake's static skin preview uses only drawing coordinates, never a fabricated gameplay state. The [filesystem guide](docs/architecture.md) lists each responsibility.

A game declares callbacks, semantic actions, settings and its own state codec. It does not import the host, CSS, React, storage or theme internals. Adding a cartridge changes only its own modules and the registration list. The engine supplies time, ownership, immutable visuals and motion preferences; pause, autopilot, restart and speed always remain in the same global panel. The 2×3 game pad contains only game actions, leaving unused positions empty.

The same action configuration drives keyboard bindings, repeated input, key hints and touch controls. Action IDs may be a cartridge-specific string union; keys reserved by the engine and duplicate roles/bindings are rejected. Enter restarts a terminal game through an engine command, never by treating a gameplay action as restart.

Settings are declarative boolean/choice/number fields and preset patches. The engine renders and validates a draft and applies its declared effect. Presentation-only changes preserve the exact Session, RNG and rewind history; compatible rule changes preserve the complete stable snapshot and replace obsolete history. Codecs validate each game's data, while storage handles v1/v2 envelopes without importing a game.

Rules remain pure fixed-step `update(state, action, mode?)` functions; AI selects the same actions a person uses. The engine owns one browser loop, shared ½×/1×/2×/4× speed, bounded input and recovery history. Games draw geometry using `frame.visuals`: accent/accentMuted/secondary, seven stable categorical slots and engine feedback tokens. No renderer defines theme RGBs or reads browser preferences. Board labels remain sharp engine-styled text.

For new cartridges, use [`$create-zero-player-game`](.agents/skills/create-zero-player-game/SKILL.md). Architecture tests guard this boundary; a test-only third cartridge proves custom actions/settings/state can be registered without shell changes. The production collection still contains only Snake and Tetris.

Snake defaults to Explorer: it pursues food at every board density while checking escape routes. When the body blocks a direct path, it expands head-to-tail routes through empty pairs of cells or searches ahead through cells that the moving tail will release. The bounded search distinguishes different body shapes and validates the entire route and an escape after eating; it stays deterministic without a mutable AI cache. During cycle fallback, Explorer slightly favors moves that leave visible space before the tail when safe. Safer fallback paths remain available when no viable food route is found. Safe loop follows a Hamiltonian cycle with safe shortcuts. Both strategies use the same rules and support custom board dimensions. An already trapped human position may remain unsalvageable. Tetris searches reachable placements through the same timed actions a person uses and evaluates line clears, holes, stack height and roughness. Its AI pauses briefly to plan, turns early, spaces out sideways moves and accelerates the fall one step at a time. Hard drop remains a player action. Manual gravity starts at one cell per 880 ms and accelerates with level to a 320 ms floor, so a high-level AI board stays playable on takeover. AI gravity and the shared 80 ms input tick are unchanged. Completed rows briefly flash for 120 ms before disappearing, without delaying input or simulation; reduced-motion preferences disable the flash. Seeded per-piece preferences add variety among promising placements without changing the player’s rules. All seven tetrominoes map to stable engine palette slots, shared by active piece, stack, ghost and preview. It uses simple horizontal wall kicks and clockwise rotation; hold and lock delay are intentionally outside this first version.

Input is discrete, with cartridge-specific string action IDs. A future game needing simultaneous movement and firing should extend this to a small input frame, rather than add hidden game-specific controls to the runtime.

## Next cartridges

The full collection of game ideas and autopilot concepts is in [docs/game-ideas.md](docs/game-ideas.md). The next game has not been selected yet.

| Game        | AI                                                          | Why it fits                                    |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Pong        | Predict wall bounces and intercept the ball                 | Tiny rules, pleasing long rallies              |
| Breakout    | Predict paddle interception and choose the contact angle    | A compact physics / collision exercise         |
| 2048        | Shallow expectimax with free-space and monotonicity scoring | Shows search in a small grid                   |
| Asteroids   | Steer around threats and predict shots                      | Tests continuous movement and combined inputs  |
| Maze runner | Shortest paths with dynamic obstacle costs                  | Makes planning visible without a large ruleset |

Design and staged implementation notes are in [docs/design.md](docs/design.md) and [docs/plan.md](docs/plan.md). Current interaction rules are in [docs/ux.md](docs/ux.md); component setup and the settings API are in [docs/settings-ui.md](docs/settings-ui.md).
