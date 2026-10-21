# Engine layout implementation plan

> **For agentic workers:** Use superpowers:executing-plans for native execution; independent final review. User authorized continuation without further approvals. No commit/push/publication.

**Goal:** Make filesystem responsibilities and dependency levels discoverable without changing game behavior or the public SDK.
**Architecture:** app composes engine + games. Engine separates pure contracts/runtime/rendering/theme from browser adapters and UI. Helpers are local to their domain; tests enforce the direction.
**Tech Stack:** Existing Bun, TypeScript, Vite, Vitest, Canvas, React/shadcn.
**Spec:** ../specs/2026-10-21-engine-layout-design.md

## Global constraints

- Preserve earlier uncommitted work, SDK exports, game behavior, save keys, themes, layout and one offline HTML.
- No dependencies or full FSD scaffolding. No commit, push or publication.

## Review focus

- Relative imports, dynamic/type imports and CSS/Tailwind source paths after moves.
- Contracts must not depend back on Session, browser or UI.
- Architecture scan must recurse and detect real violations instead of becoming empty after moves.
- Public SDK and tests using concrete games must retain actual behavior.
- CLI shadcn additions must continue targeting the installed UI directory.

### 1. Pin dependency boundaries

- [x] Add recursive architecture analysis + valid/invalid fixtures for layers, cycles and root module boundaries; observe failure against old layout.
- [x] Keep cartridge environment/color restrictions and integration checks.

### 2. Move and separate responsibilities

- [x] Move composition/catalog into app; SDK stays stable.
- [x] Extract type-only contracts from cartridge/settings/visuals; runtime implementation and validation stay separate.
- [x] Move input/rendering/platform/theme/UI and colocated tests. Separate pure appearance resolver/color math from DOM application.
- [x] Move cross-cartridge tests into tests/integration. Remove unused games/recovery compatibility export.
- [x] Update all imports, components.json and Tailwind source paths. Extract settings fields/media without changing markup or state flow.
- [x] Run check, fix genuine migration failures.

### 3. Document and verify

- [x] Write docs/architecture.md with tree, dependencies and where-to-edit map. Update SDK/README/skill references.
- [x] Independent architecture review; fix findings.
- [x] Run check/build/diff validation; smoke desktop/mobile, settings/library/game switch, no console errors.

## Execution record

Implementation is a filesystem refactor; existing behavior tests are the regression gate. New tests target only dependency contracts, not moved implementation details.

Ruling: extract HUD rendering, viewport fitting and DOM helpers from app/bootstrap into engine/ui/board and engine/ui/lib. Reason: moving the old main unchanged would retain mixed abstraction levels; transitions/persistence remain in composition, markup rendering consumes a HudModel. Cost: extra browser smoke verification, no public API or UI behavior change.

Completion: all tasks verified locally. `bun run check`: 233 tests / 24 files; production build: one offline HTML. Two independent read-only reviews found no remaining issues. Browser verified desktop + 397×752, settings Apply/Cancel, library, both games, manual/AI handoff and shadcn speed popup; no console errors/warnings. CLI info resolves the relocated primitives and CSS. No commit/push/publication.
