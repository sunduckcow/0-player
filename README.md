# 0-player

[Play in your browser](https://sunduckcow.github.io/0-player/)

A small arcade with a mind of its own. Snake and Tetris play themselves; take over whenever you like. Built for a browser tab, a television, or a quiet second screen.

The engine and games use TypeScript + Canvas 2D. The settings interface uses shadcn/ui, React and Base UI; icons come from Lucide. No external runtime assets, API keys or server are required.

## Run

```sh
bun install
bun run dev
```

Open the local address printed by Vite. `bun run check` runs lint, TypeScript and Vitest; `bun run build` produces **one self-contained `dist/index.html`** (roughly 397 KB, or 124 KB gzip). Open it directly offline, send it to someone, or upload it to any static host. `bun run preview` serves the production build locally.

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

Choose an autopilot speed between ½× and 4×. Shared links use a readable query parameter, for example `?fullscreen=1&speed=4#game=snake`. Manual takeover always runs at 1×; returning to AI restores its chosen speed. The URL keeps the autopilot speed while manual control is active. Speed controls are disabled during manual play, and each game remembers its own autopilot preference. An explicit `speed` in a link overrides the saved preference on initial load. Each game's board, score, AI/manual mode, pause state, speed, seed and round are saved locally about once a second, when switching games and when leaving the page. Switching games and reloading continue the saved session. Settings and best scores are also saved per game. If storage is unavailable, switching still preserves sessions in memory for the current page.

The **Restart** button, R, a manual retry and automatic new rounds all choose a new seed. Round seeds are mixed to avoid the similar first draws of neighboring LCG seeds; **New seed** also samples browser randomness. The URL fragment stores the selected game and current seed, for example `#game=tetris&seed=42`. An explicit seed opens its matching saved session when available; otherwise it starts that setup. The same seed, settings, actions and control-ownership sequence produce the same state. Engine callers can replay a setup with `session.restart(seed)`. This is not an input recording system.

After a loss, Snake pulses red and Tetris pulses amber, then visibly replay recent states backwards: Snake walks back along its path and Tetris pieces climb back through earlier rows. The whole presentation takes 640 ms for Snake and 720 ms for Tetris. The AI then continues from a viable earlier position with its remembered speed. Snake rewinds about eight steps; Tetris about 24. Seed and round stay unchanged; score and random state rewind with the board. If there is no viable history or two rescues have already failed, a fresh AI round starts instead. A new manual takeover renews the rescue budget. R or **Restart** always cancels recovery and starts a fresh board. Games without recovery keep the usual manual retry / automatic restart behavior. Enabling AI on a live board never resets it. Space consistently toggles pause even when a toolbar button has keyboard focus. Inside native dialogs, Space and Enter activate the focused button; search fields keep normal text entry.

## Game workspace

Share `?fullscreen=1#game=snake` (or `#game=tetris`) to open directly in the
focus layout. F and the focus buttons update this query parameter, preserving
the selected game, seed and other parameters. Opening a link uses the focus
layout; native browser fullscreen still needs a user gesture.

The arcade fits the viewport without page scrolling. The header and dock keep fixed heights; waiting or taking control does not resize the board. In the normal desktop layout, game controls sit on the left, the game fills the center, and score and details sit on the right. Focus mode keeps the game with a compact score, selected metrics and playback controls on the right, freeing the full height for the board. Taking control reveals the game's key hints; returning to autopilot hides them while keeping the board in place. Smaller screens use compact stats and touch controls.

Open the searchable game library with **G** or the current-game selector. Compact cards form a grid; arrows work from the search field, Enter plays the active result, and 1–9 select the catalog's numbered games. Open the configured control sheet with **/** or **?**. Escape closes the panel and returns to the board. Panels pause gameplay and restore its previous pause state. Selecting either game continues its saved board.

Snake's **Game settings** button offers Explorer or Safe loop AI and S (12×12), M (24×24), L (32×32), or custom even dimensions from 8 to 40 in each direction. Switching AI continues the current board. Changing dimensions starts a new board.

Explorer hunts food while leaving room around the moving tail. For the final ten empty cells, it looks for a complete route through those cells back to the tail and chooses the shortest food prefix. Meals entering that range must preserve such a route, avoiding the isolated-cell traps that a simple tail-following check can miss. The completion search shares an 8192-state budget per decision; moving-tail food search shares 32 endpoint checks. A previously saved, already impossible board cannot always be repaired by a legal move; restart it with R.

## Architecture

```text
src/
  engine/
    types.ts       game contract and six shared actions
    session.ts     fixed-step clock, ownership, queue, rewind, restart
    feedback.ts    motion-aware recovery pulse
    input.ts       keyboard → actions and runtime commands
    random.ts      seeded random number generation
    draw.ts        tiny shared drawing helpers / palette
  games/
    snake/         game.ts · ai.ts · render.ts · index.ts · tests
    tetris/        game.ts · ai.ts · render.ts · index.ts · tests
  catalog.ts       typed game registration
  main.ts          browser lifecycle and game workspace
  storage.ts       validated session snapshots and preferences
  panels.ts        native dialogs and pause restoration
  game-library.ts  catalog search and game cards
  library-navigation.ts keyboard selection in the game grid
  control-layout.ts per-game keycaps and touch buttons
  settings-ui.tsx  shadcn settings form; isolated React root
  components/ui/   shadcn component source installed by CLI
  icons.ts         selected Lucide icons
  index.css        interface styling
  ui.css           settings utilities and semantic color mapping
```

Rules are pure `update(state, action, mode?)` functions. The optional ownership mode lets a game tune natural pacing while preserving input responsiveness; direct simulations default to autopilot. Random state travels with the board. Renderers read state. AI only returns an action; it cannot move pieces or grant itself abilities outside the rules. The session owns timing, speed, pause and human/AI control. One action is consumed per tick; the human queue is bounded. The browser uses `advanceFrame` to run at most one normal update per frame, preserving fractional time and dropping overdue whole ticks. Recovery and completion timers keep real elapsed time. Direct `advance` calls still support up to eight ticks for simulations. Hidden tabs suspend simulation without catch-up bursts.

The core contract is `Game<S extends GameState>` in `src/engine/types.ts`. Implement `create(seed)`, `update(state, action)`, `ai(state)`, `render(ctx, state, frame)` and `metrics(state)`, provide metadata and dimensions, then register the cartridge in `src/catalog.ts`. It appears in the searchable library automatically. The simulation is independent of React and the interface. For saved sessions, add validation of the cartridge's state to `src/storage.ts`.

For new cartridges, use the project skill [`$create-zero-player-game`](.agents/skills/create-zero-player-game/SKILL.md). It includes the full [engine API](.agents/skills/create-zero-player-game/references/engine-api.md), integration steps, persistence requirements, current limitations and a verification checklist.

Each game configures its own control layout. The same configuration drives real keybindings, visible clickable key hints and touch buttons:

```ts
controls: [
  { action: "left", keys: ["ArrowLeft", "h"], label: "Move left", touch: "←" },
  { action: "up", keys: ["ArrowUp", "x"], label: "Rotate", touch: "↑" },
  { action: "primary", keys: ["Enter"], label: "Hard drop", touch: "Drop" },
];
```

`action` is a shared game action, `keys` contains keyboard aliases, `label` describes it and optional `touch` supplies a short touch-button label. Omit `touch` for keyboard-only controls. Arcade commands (A, Space / P, R, F, G, / and ?) are reserved globally; Enter also restarts a lost manual game. Switching games replaces the current key layout rather than accumulating bindings.

Games opt into loss recovery with a small optional contract:

```ts
recovery: {
  steps: 8,
  durationMs: 640,
  isLoss: state => state.over && !state.won,
  canResume: state => canContinue(state, ai, update, 16),
},
```

`steps` sets the preferred rollback distance. Optional `isLoss` distinguishes a loss from a victory; optional `canResume` rejects doomed candidates. `games/recovery.ts` provides a pure look-ahead helper using normal AI actions. The session retains at most four rollback windows (capped at 240 immutable states), tries a bounded number of older candidates, clears queued human input, and takes AI ownership. `frame.recovery` exposes `progress` (0–1) and actual `steps` to the renderer; each game chooses its own visual response. The short presentation phase holds the loss for its first fifth, then plays actual history backwards step by step. It uses real time at every speed and pauses with the session. Reduced motion uses a steady tint and a final jump instead of reverse movement. History stays in memory; saves during recovery contain the live destination rather than the discarded losing state.

Snake defaults to Explorer: it pursues food at every board density while checking escape routes. When the body blocks a direct path, it expands head-to-tail routes through empty pairs of cells or searches ahead through cells that the moving tail will release. The bounded search distinguishes different body shapes and validates the entire route and an escape after eating; it stays deterministic without a mutable AI cache. During cycle fallback, Explorer slightly favors moves that leave visible space before the tail when safe. Safer fallback paths remain available when no viable food route is found. Safe loop follows a Hamiltonian cycle with safe shortcuts. Both strategies use the same rules and support custom board dimensions. An already trapped human position may remain unsalvageable. Tetris searches reachable placements through the same timed actions a person uses and evaluates line clears, holes, stack height and roughness. Its AI pauses briefly to plan, turns early, spaces out sideways moves and accelerates the fall one step at a time. Hard drop remains a player action. Manual gravity starts at one cell per 880 ms and accelerates with level to a 320 ms floor, so a high-level AI board stays playable on takeover. AI gravity and the shared 80 ms input tick are unchanged. Completed rows briefly flash for 120 ms before disappearing, without delaying input or simulation; reduced-motion preferences disable the flash. Seeded per-piece preferences add variety among promising placements without changing the player’s rules. All seven tetrominoes have their own neon terminal color, shared by the active piece, stack and preview. It uses simple horizontal wall kicks and clockwise rotation; hold and lock delay are intentionally outside this first version.

The six-action contract is discrete: up, down, left, right, primary, secondary. A future game needing simultaneous movement and firing should extend this to a small input frame, rather than add hidden game-specific controls to the runtime.

## Next cartridges

| Game        | AI                                                          | Why it fits                                    |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Pong        | Predict wall bounces and intercept the ball                 | Tiny rules, pleasing long rallies              |
| Breakout    | Predict paddle interception and choose the contact angle    | A compact physics / collision exercise         |
| 2048        | Shallow expectimax with free-space and monotonicity scoring | Shows search in a small grid                   |
| Asteroids   | Steer around threats and predict shots                      | Tests continuous movement and combined inputs  |
| Maze runner | Shortest paths with dynamic obstacle costs                  | Makes planning visible without a large ruleset |

Design and staged implementation notes are in [docs/design.md](docs/design.md) and [docs/plan.md](docs/plan.md). Current interaction rules are in [docs/ux.md](docs/ux.md); component setup and the settings API are in [docs/settings-ui.md](docs/settings-ui.md).
