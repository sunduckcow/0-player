# 0-player implementation plan

**Goal:** Ship a tiny self-playing browser arcade with Snake and Tetris.
**Architecture:** Pure game rules, separate Canvas renderers and action-only AIs, one shared fixed-step runtime and DOM shell.
**Tech stack:** Bun, TypeScript, Canvas 2D, Vite, Vitest; zero runtime dependencies.
**Spec:** [design.md](design.md)

## Constraints

- Work only in `0-player`; preserve Bun's lockfile.
- Small, focused source modules; distribute one offline HTML.
- AI and people use the same actions. Arrow / HJKL takes over; A restores AI without resetting.
- Autoplay restarts terminal games. Human games await explicit restart.
- No back end, external assets, sound, unnecessary framework or mocked catalog entries.

## Review focus

- Multiple keys between ticks must not permit Snake reversal or leak into another game.
- Hidden tabs / long frames must not cause catch-up bursts.
- Human takeover followed by AI return must work on arbitrary playable boards.
- Storage and fullscreen can be unavailable; play must continue.
- AI must clear real Tetris lines and survive meaningful Snake simulations.

## Stages

- [x] 1. Foundation — remove starter assets and React, configure alias, Vitest, single-file Vite build; add `engine/types.ts`, `random.ts`, `draw.ts`. Write design and this plan before product code.
- [x] 2. Runtime — tests first for ownership, input bounds, pause, fixed-step timing, resets and game switching; implement `engine/session.ts` and `engine/input.ts`.
- [x] 3. Snake — delegate `games/snake/` rules, AI, renderer and behavior tests against the shared contract. Run failing tests before implementation, then deterministic and long-run checks.
- [x] 4. Tetris — delegate `games/tetris/` rules, AI, renderer and behavior tests against the shared contract. Verify line clears, rotations, bags, hard drop and real AI placements.
- [x] 5. Arcade shell — implement `main.ts`, `index.css`, catalog, keyboard/touch controls, scoreboard, speed, focus/fullscreen, seed/replay and local best scores.
- [x] 6. Verification — run `bun run check` and `bun run build`; inspect actual browser desktop/mobile, both games and control handoffs; independently review source and fix material findings.
- [x] 7. Handoff — document commands, controls, architecture and extension example; leave a running local preview and point to the single HTML output.

User explicitly requested execution and subagents in this session; implement this plan continuously. No publication or repository push is part of this task.

## Follow-up: game feel and workspace UX

- [x] Manual Enter/R restart and consistent A handoff and Space/P pause, including focused toolbar controls.
- [x] Paced Tetris AI, seeded variation, fresh game seeds and seven neon tetromino colors.
- [x] Game-owned control metadata drives real keys, clickable keycaps and touch actions.
- [x] Replace scrolling presentation and tabs with a viewport-sized game workspace.
- [x] Searchable library, native controls sheet, pause restoration and keyboard focus return.
- [x] Adaptive game aspect ratios, compact mobile dock and idle-collapsing header.

- [x] Verify 69 tests, single-file production build, desktop/mobile no-scroll bounds, modal keyboard interactions and focus-mode geometry.
