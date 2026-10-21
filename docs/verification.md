# Verification — 2026-10-21

- `bun run check`: lint, TypeScript and **144 Vitest tests across thirteen files** passed.
- `bun run build`: one self-contained output, `dist/index.html`, about **395 KB / 123 KB gzip**.
- Parsed the HTML and inspected `dist`: no external scripts, styles, fonts or images.
- No warnings or errors in the production browser test session.

## Behavior

- Snake has independent Explorer and Safe loop strategies. Explorer pursues food,
  simulates its escape, and falls back to safe movement when space tightens.
  Tests include deterministic play, recovery, full-board wins and rectangular fields.
- Browser verified S (12×12) and custom 18×12. Invalid odd dimensions disable Apply.
  Switching from Explorer to Safe loop kept score 11, length 15, board and pause;
  refreshing retained all of those and the selected strategy.
- Switching between games restored Snake score 11 and Tetris score 132. A paused
  game stayed paused. A regression test restores Tetris and compares another 100
  ticks, including its random sequence, with the original session.
- Local data is versioned and validated. Corrupt JSON, empty Tetris bags and
  colliding live pieces are rejected. Storage failures do not throw; an in-memory
  cache preserves game switches within the current page.
- Restart deliberately replaces the board. A returns AI to the current
  board; Enter remains hard drop or a new manual attempt after a loss; Down is
  soft drop. Existing ownership/restart/pacing tests remain passing. AI output never includes hard drop: aligned pieces accelerate with soft-drop steps. Regression cases for both side wells verify rotation before sideways travel; human hard drop is unchanged.

## Workspace and keyboard

- `?fullscreen=1` opens directly in the focus layout without requesting native
  fullscreen. Browser verified exit removes the flag, F restores it, refresh
  preserves the layout, and switching games preserves other query parameters.

- Browser checked at 1280×720, 390×844, 320×568, 844×390 and native fullscreen
  1512×949. Document bounds matched the viewport; the dock remained in view.
- Header stayed 64px after idle on desktop. There is no timed geometry change.
- Fullscreen keeps the board, score and two metrics. Manual hints appear on
  takeover and disappear on AI handoff; the screen rectangle stayed exactly
  516×687 at the same coordinates in AI and manual states at 1280×720. The stage now has 688px of usable height, with focus actions in the right sidebar instead of a bottom dock. The mobile touch slot
  also kept the board rectangle unchanged on takeover.
- Search keeps focus while arrows select cards; Enter launches the selected
  game. Numbers 1/2 work from search and from the board. Card numbering remains
  stable after filtering. Focus rings are inset and the canvas has no outline.
- `/` opened the control sheet in-browser. Unit tests cover `/`, `?`, Russian
  characters and physical keyboard codes, modifiers, IME and native field entry.
- Settings use official CLI-installed shadcn/ui components; interface icons use
  Lucide. Game rules and the simulation do not depend on React.

Browser automation only permits HTTP(S), so direct `file://` execution was not
retested. The offline artifact is structurally checked and served in production
mode. Native fullscreen can be denied by embedded browsers; CSS focus mode still
works in that case.

## Line-clear feedback

- Completed rows remain visible with a fading highlight for 120ms of presentation time. Rules, scoring, AI and input continue immediately.
- Tests verify expiration, a responsive next move, no replay on restored state/restart, interruption by another lock, invalid saved effect data and reduced motion.
- Browser inspected real-renderer frames at 0/60/120ms; rows brighten, fade and collapse correctly, with no console errors.

## Manual speed handoff

- Tests cover ½×/2×/4× to manual 1× and back, with the original board and timing preserved. Pause, restart, snapshots and legacy snapshots preserve the remembered autopilot preference.
- Speed is now one shared engine preference in `0-player:speed`. Each game supplies `tickMs`; engine tests verify ½×/1×/2×/4× against different base ticks. Old speed query parameters are ignored and removed. Manual takeover stays at 1×; AI resumes the shared multiplier. Game switches and fresh seeds keep the preference.

## Loss recovery

- The shared optional API stores bounded immutable history, chooses a viable earlier state and transfers ownership to AI after reverse playback (640ms for Snake, 720ms for Tetris). Snake opts into eight steps and a red pulse; Tetris uses 24 steps and amber. Short sessions use available history.
- 20 engine cases cover rewind state/RNG/seed/round, discarded inputs, real-time pacing at different speeds, pause/resume, explicit restart, wins, opt-out games, bounded history, two-rescue fallback, fresh manual budgets and live snapshots during both rollback and fallback.
- Twelve cartridge cases exercise both Snake strategies, trapped positions, real full-board wins, pure look-ahead on frozen states and Tetris top-out recovery while preserving the stack.
- Browser verified real-renderer before/midpoint/after frames for both games. Manual Snake loss in the production application returned to autopilot at 4× with round 001 and the same URL seed. No console errors or warnings. Recovery suppresses the loss overlay; reduced motion uses a steady tint.
- History stays out of localStorage. Pending recovery saves the live destination. Fresh-round fallback snapshots include the new seed/round, and persistence updates the URL so reload can match that destination.

## Explorer loop escape

- Explorer no longer delegates every board above 40% occupancy to Safe loop. It keeps evaluating food routes on dense boards, expands tail routes through empty cell pairs and searches ahead using each body cell’s release time.
- A bounded second search distinguishes full moving-body trails, avoiding the false equivalence of routes that reach the same cell at the same time. Both searches together retain at most 8192 nodes. Found routes are simulated with the real rules and rejected if eating leaves no tail escape.
- Regression: a restored 8×8 board of length 62 with two separated free cells previously repeated a 62-step contour forever. Explorer now reaches food and wins within 512 ticks. The test also checks pure decisions and identical decisions after JSON restore.
- Three 12×12 full-game replays (seeds 42, 73, 20261029) win within 6000 ticks. Another dense-board fixture verifies that Explorer takes adjacent safe food above 40% occupancy rather than defaulting to the tour. Existing Safe loop, rectangular-board and recovery tests remain unchanged.

## Tetris manual gravity

- Session passes optional control ownership into pure game updates. Tetris uses slower natural gravity for a person: 880ms/cell at level 1, down to a 320ms/cell floor. Autopilot gravity and input ticks remain unchanged.
- Three session-level regressions verify the first manual fall, high-level takeover and immediate return to AI gravity, plus next-tick movement, soft drop and hard drop.

## Pause shortcut

- Space and P toggle pause/resume; A (Ф in Russian layout) returns control to autopilot. All workspace, focus, control-sheet and screen-reader hints use the same mapping.
- Keyboard tests cover the reserved Space mapping, focused toolbar buttons, native dialog button behavior and ignored repeated Space keydowns. Text fields keep normal entry.

## Visible reverse playback

- The loss holds briefly, then Session walks the saved history backwards instead of jumping directly to the target. History and discarded-branch trimming stay unchanged; snapshots always contain the final viable destination, including mid-animation saves.
- Engine regressions verify every intermediate immutable state and the final AI action, plus an opt-out from spatial playback for reduced motion. Existing pause, restart, bounded-history and real-time speed cases remain passing.
- Game regressions verify several distinct backward Snake cells and multiple upward Tetris rows, with restored stack, seed and round. Tetris ghost and row-clear effects stay hidden during reverse playback; historical pieces use the amber recovery color.
- Browser inspected four real-renderer frames per game: loss, two intermediate rewind positions and AI handoff. No console warnings or errors.

## New-game authoring skill

- Installed `.agents/skills/create-zero-player-game` with its entrypoint, full engine API, integration guide and Codex UI metadata. The bundled skill validator, YAML metadata checks and reference-link checks pass.
- Independent planning exercises used Pong before authoring and 2048 with the skill. Forward review checked actual APIs and exposed turn-based idle-history limits, auto-restart after victory, reset history on strategy changes and settings omitted from shared URLs; all are now explicit in the reference.

## Explorer tail clearance

- Explorer's cycle fallback mildly favors legal moves with visible head/tail clearance. Immediate meals and validated food routes keep priority; Safe loop retains its original scoring.
- A reproduced loop now leaves Manhattan distance 3 instead of 1 between the new head and tail. Regressions verify deterministic, immutable decisions, food priority and a 62/64-filled board where the only legal tight move remains allowed.

## Mobile workspace

- Replaced overlapping focus/header controls with one mobile layout. Mobile suppresses focus mode even on a shared `fullscreen=1` link; desktop retains it.
- The engine places only declared game actions in a two-row, three-column touch pad. Snake uses up/left/down/right; Tetris uses rotate/drop/left/down/right. Unused slots stay empty. Pause, restart, Autopilot and speed always occupy the same separate dock in both games.
- Touch actions are always present, take control and resume play in one tap, with no separate controls sheet. A Tetris takeover at 397×752 preserved the exact board rectangle and switched from AI 4× to manual 1×; Autopilot restored 4×.
- Speed uses the installed shadcn/Base UI Select, with an upward popup and keyboard events isolated from game input. The engine still owns all speed values and persistence.
- Library and settings use compact bottom sheets. Settings keep Apply/Cancel outside the scrolling body; Custom/preset accent changes keep dialog geometry fixed. Search does not receive focus automatically on mobile.
- Browser viewport checks cover 320×568, 397×752, 440×800 and 956×340, both games, takeover, the game picker and settings. Geometry checks inspect actual visible controls for mutual overlap and viewport clipping. This is viewport QA, not a physical iPhone/Safari run; notch and home-indicator insets use CSS environment variables.

## Engine SDK migration (2026-10-21)

- Both games register through `defineGame`: metadata, pure rules/AI, semantic actions, settings fields/presets/effects and versioned state codecs. The shell, shared settings form and storage no longer import either game.
- A test-only third cartridge uses its own action id and state without RNG. Tests exercise presentation identity/history, rule rebinding, complete recovery target metadata, invalid settings and compatible/versioned saves.
- Runtime keyboard bindings share one normalization with declaration validation, including Russian layout aliases. Reserved engine/library keys and duplicate pad roles are rejected. Up/rotate placement is independent of declaration order.
- RenderFrame carries frozen semantic visuals and reduced-motion preference. Real Snake and Tetris renderers are checked against dark Lime and light Cyan contexts, including categorical pieces, ghost and next preview. Canvas previews use their draft background and motion context.
- Three independent reviewers checked runtime/storage, actions/settings and visuals. Findings were fixed: numeric custom-size values, key aliases/conflicts, role order, preview background/motion and engine-owned effect opacity.
- Browser viewport QA: 320×640, 397×752 and 956×340, both games. No visible-control overlap, clipping or sub-44px targets in measured gameplay layouts. Both games have identical global dock geometry. Touch input resumes manual play at 1×; AI returns to 2×.
- Tetris Next toggled off while paused without resetting score/round; reload restored the paused session and setting. Snake custom 18×12 applied through the generic form. Draft light-theme previews were visually inspected. This is viewport QA, not a physical iPhone/Safari run.
- The authoring skill now documents the actual SDK and registration-only integration. YAML frontmatter/UI metadata and local reference links were checked using standard-library tooling; the packaged Python quick validator is unavailable because PyYAML is absent.
- Final local verification: `bun run check` (214 tests in 23 files), `bun run build` (one offline HTML), and `git diff --check`. No commit, push or publication.

## Engine filesystem layout (2026-10-21)

- Production code is organized as app composition, engine services and game cartridges. The public SDK path/exports and persistence format are unchanged. Current tree and dependency matrix: [architecture.md](architecture.md).
- Type-only contracts, runtime implementations, pure theme/color math and browser DOM/storage adapters are separated. UI has its own controls/library/settings/board/primitives/styles zones. HUD/viewport rendering no longer sits in bootstrap; it consumes a view model.
- Unit tests remain next to their module. Real-game scenarios live in tests/integration; recursive architecture tests in tests/architecture check imports/re-exports/import types/dynamic imports, type-only contracts, pure-layer environment access and source cycles. Negative fixtures verify that violations fail the guard. The new layout test first failed against the former flat filesystem, then passed after migration.
- `bun run check`: 233 tests / 24 files, lint/typecheck pass. `bun run build`: one offline HTML. `git diff --check` passes. shadcn CLI info recognizes all nine installed components and the relocated CSS/aliases; package dependencies and lockfile unchanged.
- Two independent read-only reviews checked engine boundaries/SDK and UI extraction/configuration. No remaining findings.
- Browser smoke covered desktop and 397×752: Snake setting Apply, previews, Cancel, library switch to Tetris, touch takeover at 1× and AI return to 2×, dynamic HUD/viewport and the shadcn speed popup. Visible gameplay targets had no overlap, clipping or size below 44px. Console warnings/errors: none. Browser viewport reset and temporary tab closed.
- SDK guide, file map and game-authoring skill reference the new paths. No commit, push or publication.

## Static definitions and engine state ownership (2026-10-21)

- Each game entry default-exports a literal GameDefinition object with metadata/defaultState/settings/persistence/initialize/configure. No runtime factory is called in the game; schemas/codecs and pure callbacks remain internal. The author SDK no longer exports defineGame or a mutable Cartridge constructor/type.
- The raw catalog stays a simple readonly array. Engine createRegistry checks each heterogeneous definition before its internal erasure, rejects duplicate ids and creates isolated engine-owned runtime entries.
- Default templates are deeply copied on every new session/restart/fallback. Optional initialize is pure and seeded; games without it use the declared default values. Settings are owned/frozen by the engine. Session ownership is checked by runtime instance, including different instances with the same game id.
- A rules change transfers the entire stable snapshot without invoking initialize again; presentation keeps Session/history/recovery. Legacy headless adapters moved into test helpers. Save keys/codecs/envelopes and seeded game rules are unchanged.
- Six new runtime cases cover frozen defaults/nested independence, no initializer, cross-registry isolation/ownership, initializer lifecycle, restart/fallback and heterogeneous registration. Compile-time negative fixture rejects an incompatible defaultState. Architectural cases require literal game entrypoints and reject factory/new-instance exports. New tests were observed failing before implementation.
- `bun run check`: 250 tests / 27 files plus lint/typecheck passed. Production build: one offline HTML. `git diff --check` and documentation/skill links passed. Two independent reviews found no remaining issues.
- Browser restored Snake score 111, paused custom 18×12 board; changing skin preserved the score/round/pause. Registry library switched to seeded Tetris with its own settings/state; no console warnings/errors. Temporary tab closed. No commit/push/publication.

## Atomic game modules and preview geometry (2026-10-21)

- Snake and Tetris index files visibly compose literal default definitions. Small configuration/metric callbacks stay inline; model, zero-state template, geometry, logic, AI, renderer, controls, settings and persistence have separate responsibilities. Local runtime modules export one default object and type-only exports remain separate. Snake's larger searches are split into route expansion, moving-tail pursuit and completion search.
- The skin preview no longer constructs a SnakeState. It supplies only fixed segments and direction to the shared body renderer; score, RNG, food and terminal flags stay out of preview geometry. New preview checks cover both skins without a session, constant geometry across board settings, bounds and injected accent colors.
- Architecture fixtures reject scattered runtime exports/named local runtime imports. The guard failed on the former modules before the refactor. Existing seeded simulations, codecs, recovery, immutable state and render tests remain passing. A read-only review compared the rules/AI with the original source snapshot and found no behavior regression or dependency cycle.
- Final `bun run check`: 257 tests / 28 files, lint and TypeScript passed. `bun run build`: one offline `dist/index.html` (556.24 kB). Documentation/skill local links, YAML frontmatter and `git diff --check` passed. Authoring instructions reflect the atomic module convention and separate preview geometry.
- Browser QA inspected both Snake skin previews, canceled the draft, then switched the catalog to Tetris. Restored score/round/pause remained intact in Snake. Screenshot: `node_modules/.cache/atomic-game-preview.png`; temporary tab closed. No commit, push or publication.

## Human-readable modules and repository formatting (2026-10-22)

- Three parallel reviewers checked and refactored games, runtime/platform/theme/input, and UI. Named validation groups replace long save-data predicates; Snake strategy text and AI come from one configuration lookup. Large searches, body/piece drawing, playback interpolation, rewind history, theme resolution and settings drafts now have cohesive owners. Game shared types consistently use `types.ts`.
- The 570-line app bootstrap became a 151-line composition root. Workspace persistence, URL routing, input, library/settings/focus controllers, view binding, browser events and frame scheduling are separate responsibilities. New app tests cover per-game state/ownership restoration, shared speed, explicit seeds, dialog pause persistence, presentation settings and best-score retry after blocked storage. A separate read-only review found no app lifecycle regression.
- Session remains 223 lines to keep its control lifecycle together; no handwritten production TS/TSX module exceeds it. Small entrypoints/templates and longer cohesive algorithms are intentional. The old 569-line integration suite is split into clock, ownership and keyboard cases using one shared counter fixture.
- Installed Prettier through Bun, updated `bun.lock`, added `format`/`format:check`, and included formatting in `check` (therefore CI). Formatted source/config/docs. Generated shadcn primitives are ignored and verified byte-identical; dependencies, build outputs, Bun's lockfile and protected skill files are also excluded.
- Formatted arcade CSS expanded to 1490 lines, so it was split into 12 UI responsibility stylesheets behind one entrypoint. All 241 parsed rules and their original cascade order match before/after splitting. Generated primitives and the shadcn configuration/aliases remain intact.
- Full verification: `bun run check` passed, including Prettier, lint, TypeScript and 297 tests in 34 files. `bun run build` produced one offline HTML (563.06 kB). UI markup equivalence checks covered six settings configurations; theme calculations matched 414 configurations. Temporary comparison files were removed.
- Browser QA restored paused Snake score 111, inspected draft previews and Custom → Cyan, canceled, switched to Tetris and exercised touch takeover at 1× / AI return at 2×. At 397×752 and 956×340, measured controls had no overlap, clipping or targets below 44px. Console warnings/errors: none. Viewport reset and temporary tab closed. Screenshots: `node_modules/.cache/readability-review.png`, `node_modules/.cache/readability-mobile.png`. This is browser viewport QA, not a physical iPhone/Safari run. No commit, push or publication.
