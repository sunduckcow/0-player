# Game workspace

Preserve the existing terminal palette, neon game colors, local typography and small-engine architecture. Change interaction and composition.

| Problem | Priority | Change |
| --- | --- | --- |
| Description pushes the board and controls below the viewport | High | A viewport-sized game workspace; no document scroll |
| Horizontal game tabs grow with the entire catalog | High | Searchable game library in a keyboard-accessible native dialog |
| Control hints require leaving the board | High | Visible game-configured hints beside the board, plus an on-demand sheet |
| Idle chrome changes shift the whole layout | High | Fixed header and dock heights; no timed geometry changes |
| Permanent chrome competes with screensaver playback | Medium | Explicit focus mode with game, score and selected metrics |
| Opening a menu can lose a manual game behind it | High | Panels pause the session and restore its earlier pause state |
| Switching games discards progress | High | Per-game session snapshots, restored on selection and reload |

The normal desktop workspace shows controls on the left, an adaptive center stage, score and details on the right, and a fixed action dock. Header height stays constant during idle playback. The board fits the remaining viewport and uses its cartridge's aspect ratio. Space for manual hints is reserved, so AI/manual handoff does not change board geometry. Native dialogs can scroll internally when needed; the game page does not scroll.

Focus mode hides the main header and dock, leaving the game, compact score and selected metrics. Manual takeover reveals configured game hints beside the score; returning to autopilot hides them without moving or resizing the game. Transient focus actions may fade, but their visibility never changes layout. Small screens use compact stats and touch-accessible actions. The viewport remains contained at desktop, 390×844 and 320×568 sizes.

`G` opens the searchable library. Cards form a compact grid with stable catalog numbers. Arrows select results directly from search, Enter opens the active result, and 1–9 select the numbered game. Tab and native button activation also work. Opening or searching never silently changes games. Focus and selection indicators stay inside card boundaries. The canvas itself has no decorative keyboard-focus frame.

`/` or `?` opens the controls sheet. Letter commands follow physical key positions and work with Russian layouts, including G/П and A/Ф. Escape closes the active panel and returns focus to the board. Panels pause the game and restore the earlier pause state when closed. Form controls retain their own text, arrows and activation keys.

Game-specific control metadata drives keyboard bindings, visible clickable keycaps and touch actions. A returns the current board to AI; Space or P pauses and resumes. In live Tetris, Enter performs a hard drop, while Down only soft-drops. R and the Restart button begin a new round with the current seed. New seed chooses another seed. Returning to AI never resets a live board.

Snake and Tetris opt into loss recovery: a short color pulse followed by visible reverse playback to a viable recent state, then AI control with its remembered speed. Snake walks backwards through cells over 640ms total; Tetris restores earlier stack/piece states and raises the pieces over 720ms total. Reduced motion skips intermediate movement. Loss feedback replaces the terminal overlay during recovery; queued actions and takeover are ignored until it finishes. Pause freezes the effect and Restart cancels it. Snake victories stay victories. If history cannot save the game or the AI exhausts two rescues, a fresh AI round starts. Saves contain the live destination, without serializing rollback history.

Snake settings use shadcn/ui controls and Lucide icons, preserving the existing terminal palette. Explorer is the default AI; Safe loop is the more conservative alternative. S/M/L presets are 12×12, 24×24 and 32×32. Custom boards accept even dimensions from 8 through 40. Changing strategy preserves the board; changing dimensions starts a new one. Settings remain local to the browser.

Each game saves its state, mode, pause, speed, seed and round to local storage roughly once a second, before a switch and on page hide. Selecting another game restores its own snapshot. Reloading also resumes a valid saved session. If browser storage is blocked, an in-memory cache still preserves games while switching within the current page. Restart remains an explicit action. Corrupt or incompatible saves are ignored.

The engine, game rules, renderer and AI remain plain TypeScript/Canvas. React, shadcn/ui and Base UI are confined to the settings form. Production still ships as one offline HTML with all runtime code, styles and icons embedded; it is roughly 385 KB uncompressed, or 120 KB gzip.

Focus controls sit in the information column rather than a bottom dock, leaving the board the full available height. Narrow portrait screens use a compact header row. Tetris AI turns early and soft-drops into place; instant hard drop remains a player action.
