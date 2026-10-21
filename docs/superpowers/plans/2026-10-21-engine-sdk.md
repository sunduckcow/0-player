# Engine SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. User approved implementation without further approvals; independent agents review the result.

**Goal:** Register games declaratively without game-specific shell, storage, settings or theme branches.
**Architecture:** Retain Session and pure simulations. Add a boxed, typed cartridge adapter, game codecs/settings schemas, generic engine-owned UI and injected readonly visuals.
**Tech Stack:** Bun, TypeScript, existing React/shadcn, Canvas, Vitest.
**Spec:** ../specs/2026-10-21-engine-sdk-design.md

## Global Constraints

- No commit, push, publication or new dependencies.
- Preserve existing uncommitted work and both games' rules/AI.
- One offline HTML; manual 1×, engine multipliers ½/1/2/4.
- Global commands never enter cartridge control layouts.

## Review Focus

- Complete safe snapshot metadata on rules changes during fallback recovery.
- No callback-identity dependency when changing only presentation.
- Invalid drafts and legacy saves cannot corrupt live state.
- Action key/role conflicts cannot silently hide controls.
- Theme/preview rendering must not share mutable color state.

### 1. SDK, settings definitions, codecs and generic runtime

Files: engine/types.ts, sdk.ts, cartridge.ts, settings.ts, input.ts, session.ts; games/*/definition.ts, codec.ts; storage.ts, catalog.ts.

- [x] Add cartridge tests: custom action-id without rng, presentation Session identity, rules snapshot metadata, restart compatibility, invalid drafts and legacy state versions.
- [x] Observe missing SDK failure, implement defineGame adapter and state codec envelope, migrate cartridge registration.
- [x] Make Session generic in actions; remove primary-as-restart; centralize runtime bindings and contextual terminal Enter.
- [x] Verify focused tests and existing simulation/recovery suite.

### 2. Explicit visual context

Files: engine/draw.ts, feedback.ts, types.ts, appearance.ts, games/*/render.ts and preview callbacks.

- [x] Add isolated injected-palette and categorical/effect contrast assertions.
- [x] Pass frozen visuals/reducedMotion into drawing; remove game color literals/media queries and mutable palette globals.
- [x] Keep existing geometry, clear animation and recovery timeline; replace label numeric size with semantic role.
- [x] Verify both renderers and appearance tests.

### 3. Generic settings and engine-owned controls

Files: settings-ui.tsx, control-layout.ts, main.ts, game-library.ts, index.html/index.css/ui.css.

- [x] Generic boolean/choice/number fields, declarative presets, Canvas previews and full draft validation.
- [x] Apply through cartridge lifecycle; remove all concrete game imports/conditions from shell/settings/storage.
- [x] Restore fixed pause/restart/autopilot/speed panel on mobile; game-only 2×3 pad with unused slots empty.
- [x] Browser-check both games, settings cancellation/application, takeover and responsive layouts.

### 4. Architecture verification and documentation

Files: engine/architecture.test.ts, docs, README, game-authoring skill references.

- [x] Prove plugin-independent registration using a test-only third cartridge; check imports/colors/browser APIs at source boundary.
- [x] Run bun run check/build and independent architecture review, fix concrete findings.
- [x] Update authoring SDK docs/skill and verification report to actual contract; no publication.

## Completion record

Implemented locally on 2026-10-21. All three independent review areas completed; concrete findings fixed. Canonical contract: [engine-sdk.md](../../engine-sdk.md). Validation evidence: [verification.md](../../verification.md#engine-sdk-migration-2026-10-21). No commit, push or publication.
