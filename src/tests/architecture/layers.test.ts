import { describe, expect, it } from "vitest";
import {
  dependencyCycles,
  dependencyViolations,
  importsOf,
  normalizePath,
} from "./dependency-rules";
const raw = import.meta.glob<string>(["../../**/*.ts", "../../**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const sources: Record<string, string> = Object.fromEntries(
  Object.entries(raw)
    .map(
      ([file, source]) =>
        [normalizePath("src/tests/architecture/" + file), source] as const,
    )
    .filter(
      ([file]) =>
        !file!.includes(".test.") &&
        !file!.includes("/__tests__/") &&
        !file!.startsWith("src/tests/"),
    ),
);
describe("filesystem dependency levels", () => {
  it("keeps module tests in owner __tests__ folders and shared tests in src/tests", () => {
    for (const file of Object.keys(raw).filter((file) =>
      /\.(test|spec)\.[cm]?[jt]sx?$/.test(file),
    )) {
      const path = normalizePath("src/tests/architecture/" + file);
      expect(
        path.startsWith("src/tests/") || path.includes("/__tests__/"),
        path,
      ).toBe(true);
    }
  });

  it("scans every production zone and keeps root composition explicit", () => {
    for (const zone of [
      "app",
      "engine/contracts",
      "engine/runtime",
      "engine/input",
      "engine/rendering",
      "engine/theme",
      "engine/platform",
      "engine/ui",
      "engine/lib",
      "games",
    ])
      expect(
        Object.keys(sources).some((file) => file.startsWith(`src/${zone}/`)),
        zone,
      ).toBe(true);
    for (const [file, source] of Object.entries(sources))
      expect(dependencyViolations(file, source), file).toEqual([]);
  });
  it("has no source import cycles", () =>
    expect(dependencyCycles(sources)).toEqual([]));
  it.each([
    [
      "src/engine/contracts/game.ts",
      'import type { Session } from "@/engine/runtime/session";',
    ],
    ["src/engine/contracts/game.ts", "export const value=1;"],
    [
      "src/engine/runtime/session.ts",
      'export { storage } from "../platform/storage";',
    ],
    [
      "src/engine/runtime/session.ts",
      'type T=import("@/engine/ui/settings/settings-dialog").SettingsValues;',
    ],
    ["src/engine/lib/random.ts", 'import("@/engine/runtime/session");'],
    [
      "src/engine/input/keyboard.ts",
      'import {Session} from "@/engine/runtime/session";',
    ],
    ["src/engine/rendering/canvas.ts", 'import {x} from "@/app/bootstrap";'],
    ["src/engine/theme/appearance.ts", 'import {useState} from "react";'],
    [
      "src/engine/ui/primitives/button.tsx",
      'import {x} from "@/engine/ui/settings/settings-dialog";',
    ],
    [
      "src/app/bootstrap.ts",
      'import {snake} from "@/games/snake/__tests__/helpers";',
    ],
    ["src/engine/sdk.ts", 'export {x} from "./platform/storage";'],
    ["src/main.ts", 'import "@/engine/runtime/session";'],
    ["src/utility.ts", "export const x=1;"],
    [
      "src/app/catalog.ts",
      'import {snakeDefinition} from "@/games/snake/definition";',
    ],
    ["src/app/catalog.ts", 'import {snake} from "@/games/snake";'],
    ["src/engine/runtime/session.ts", "window.requestAnimationFrame(tick);"],
    ["src/engine/theme/appearance.ts", 'document.querySelector("body");'],
  ])("rejects an invalid edge in %s", (file, source) =>
    expect(dependencyViolations(file, source).length).toBeGreaterThan(0),
  );
  it("accepts type-only contracts, local helpers and composition through the SDK", () => {
    expect(
      dependencyViolations(
        "src/engine/contracts/cartridge.ts",
        'import type {Game} from "./game"; export interface Definition {game:Game}',
      ),
    ).toEqual([]);
    expect(
      dependencyViolations(
        "src/engine/theme/appearance.ts",
        'import {hex} from "./lib/color";',
      ),
    ).toEqual([]);
    expect(
      dependencyViolations(
        "src/app/catalog.ts",
        'import snake from "@/games/snake";',
      ),
    ).toEqual([]);
  });
  it("inspects re-export, type and dynamic import edges and detects cycles", () => {
    expect(
      importsOf('export * from "./a"; type T=import("./b").T; import("./c");'),
    ).toEqual(["./a", "./b", "./c"]);
    expect(
      dependencyCycles({
        "src/a.ts": 'import "./b";',
        "src/b.ts": 'export * from "./a";',
      }),
    ).toEqual([["src/a.ts", "src/b.ts", "src/a.ts"]]);
  });
});
