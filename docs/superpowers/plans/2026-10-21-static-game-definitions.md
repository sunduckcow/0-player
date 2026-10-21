# Static definitions implementation plan

> Use native execution with final independent review; user requested continued implementation without approvals. No commit/push/publication.

**Goal:** Plain default game objects and engine-owned state/settings.
**Spec:** ../specs/2026-10-21-static-game-definitions-design.md
**Constraints:** Keep game rules, seeds, persistence keys/envelopes, UI, recovery timing and offline HTML. No dependencies.

- [x] Add failing runtime tests for cloned defaults, independent registry instances, settings isolation, pure initializer lifecycle and same-id foreign sessions.
- [x] Add defaultState/initialize contract, engine createCartridge/configureGame/createRegistry, isolated settings and restore-safe Session constructor.
- [x] Migrate both literal default exports, schemas/codecs and pure init/rules. Move headless adapters into test helpers. Catalog contains only raw definitions; bootstrap creates runtime registry.
- [x] Migrate tests, guard plain author entrypoints and public SDK boundary. Verify all existing state/seed/recovery cases.
- [x] Independent architecture review, update docs/skill, run check/build and browser smoke. No publication.

Verification: full check passed, 250 tests / 27 files; production build emits one offline HTML. Two independent read-only reviewers found no regressions. Browser restored Snake score 111/pause/custom 18×12, applied Squares without resetting state, then switched to seeded Tetris; no console warnings/errors. Type-only negative registry fixture verifies incomplete defaultState rejection. No commit/push/publication.
