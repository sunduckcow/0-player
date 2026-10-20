# 0-player

A tiny browser arcade that plays itself, with instant human takeover. It must work as a television screensaver and as a playable game collection. No server, accounts, network, external assets or runtime dependencies.

## Decisions

Use TypeScript, Canvas 2D, CSS and Vite. The React starter adds no value to this small surface and will be removed. A large framework or ECS would obscure the game contract; a single handwritten source file would mix independent responsibilities. Keep small source modules and produce a single self-contained HTML for distribution.

Each game implements `Game<S>`: `create(seed)`, `update(state, action)`, `ai(state)`, `render(context, state, frame)` and `metrics(state)`. State contains `score` and `over`. Updates are deterministic, return new state, and know nothing about the DOM, real time, ownership or rendering. A seeded PRNG travels in the game state. AI can inspect state and issue exactly the same actions as a person; it never edits state. Renderers only read state.

`Game.controls` is a list of `{ action, keys, label, touch? }` entries, owned by the cartridge. The keyboard dispatcher, visible clickable key layout and touch pad all consume that one configuration. Runtime commands remain reserved globally. A new game changes its own metadata rather than adding another set of shell-specific key handlers.

The shared six-action vocabulary is `up`, `down`, `left`, `right`, `primary`, `secondary`. Arrow keys / HJKL and touch buttons take over immediately. `A` explicitly restores AI. Enter is the primary action and restarts after a manual loss. Space or `P` pauses, `R` restarts, `F` enters focus / fullscreen. Form fields and modified shortcuts are respected. Space consistently toggles pause even on focused buttons; Enter retains native button activation. Human input is bounded and queued until the next simulation tick. Switching games clears input. Returning to AI preserves a live board. A lost board needs a new round.

The runtime owns one requestAnimationFrame loop and a fixed-step accumulator. Speed affects simulation, not drawing. Hidden tabs stop advancing and discard accumulated time. Terminal AI games restart after a short visible delay; human games wait for restart. Storage failures cannot stop play. Fullscreen has a CSS fallback. Focus mode gives the game most of the screen; controls return on pointer movement or keyboard focus. No sound or flashing effects.

## First games

Snake: a square grid, food, growth, wall/body collisions and victory on a full board. A safe path-planning autopilot prioritizes survival and food. Moving into the vacating tail is legal. Reversal is ignored. Render the body and food in a restrained pixel palette.

Tetris: 10×20 board, seven tetrominoes, deterministic shuffled bags, rotation with simple wall kicks, ghost piece, soft / hard drop, line clearing, score and increasing gravity. AI evaluates reachable placements using holes, height and roughness, then moves using normal actions. A short planning pause and spaced visible moves precede AI placement; seeded preferences vary similarly good choices. Down remains soft drop. Standard rotation / drop actions are documented in the UI. A finite loss is acceptable; autonomous mode restarts.

## Interface

A dark terminal arcade with pale lime interface accents and seven distinct neon tetromino colors, a dominant canvas, two compact game selectors, live score and contextual metrics. Controls state who owns play in words. All controls use native buttons, visible focus and usable touch targets. Responsive layout puts the board before secondary information. Font stack is local and monospace; distribution does not fetch fonts. Reduced motion disables decorative motion.

## Distribution and extension

`bun run build` creates only `dist/index.html`, inlining code and CSS. It opens directly offline and can be hosted at any GitHub Pages subpath. Source modules remain inspectable. Add a game by implementing the contract and registering it in the small catalog. No plugin loader, event bus, physics framework, editor or remote AI in version 1.

Future candidates: Pong (intercept prediction), Breakout (bounce prediction), 2048 (expectimax), Asteroids (steering and threat avoidance), maze runner (pathfinding). These are roadmap ideas, not nonfunctional game selectors.

## Acceptance

Meaningful tests cover deterministic updates, collisions / line clears, AI legality and long runs, ownership and queue boundaries, pause, reset and fixed-step timing. Browser checks cover both games, takeover, AI return, restart, speed, mobile layout and focus mode. Production output must contain no external script, stylesheet or font requests.

Fresh launches and game selection use random seeds unless the URL supplies an explicit replay seed. Restart repeats that seed.
