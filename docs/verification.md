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
- Browser verified keyboard and button takeover, manual reload at 1× with `?speed=4`, and AI restoration to 4×. Changing speed updates the query immediately. Switching games restored separate 1×/½× preferences instead of overwriting them with the prior game query.


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
