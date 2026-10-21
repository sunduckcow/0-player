import { describe, expect, it } from "vitest";
import ts from "typescript";
import { localImport } from "./dependency-rules";
const games = import.meta.glob<string>("../../games/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});
const shell = import.meta.glob<string>(
  ["../../engine/**/*.ts", "../../engine/**/*.tsx", "../../app/bootstrap.ts"],
  { query: "?raw", import: "default", eager: true },
);
function nodes(source: string, visit: (node: ts.Node) => void) {
  const root = ts.createSourceFile(
    "module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  function walk(node: ts.Node) {
    visit(node);
    ts.forEachChild(node, walk);
  }
  walk(root);
}
function cartridgeViolations(file: string, source: string) {
  const errors: string[] = [];
  file = "src/" + file.replace(/^(?:\.\.\/)+/, "");
  const gameRoot = file.match(/^(.*\/games\/[^/]+)\//)?.[1];
  const allowed = (path: string) => {
    if (path === "@/engine/sdk") return true;
    const target = localImport(file, path);
    return Boolean(
      gameRoot &&
      target &&
      (target === gameRoot || target.startsWith(gameRoot + "/")),
    );
  };
  nodes(source, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !allowed(node.moduleSpecifier.text)
    )
      errors.push("import:" + node.moduleSpecifier.text);
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal) &&
      !allowed(node.argument.literal.text)
    )
      errors.push("import:" + node.argument.literal.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      errors.push("dynamic import");
    if (
      ts.isIdentifier(node) &&
      [
        "window",
        "document",
        "globalThis",
        "matchMedia",
        "localStorage",
        "sessionStorage",
        "getComputedStyle",
        "requestAnimationFrame",
        "setInterval",
        "setTimeout",
        "Date",
        "performance",
      ].includes(node.text)
    )
      errors.push("browser/time:" + node.text);
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText() === "Math" &&
      node.name.text === "random"
    )
      errors.push("ambient randomness");
    if (ts.isStringLiteralLike(node)) {
      if (
        /^(#[\da-f]{3,8}|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\()/i.test(
          node.text,
        )
      )
        errors.push("color:" + node.text);
      const parent = node.parent;
      if (
        ts.isBinaryExpression(parent) &&
        ts.isPropertyAccessExpression(parent.left) &&
        ["fillStyle", "strokeStyle", "shadowColor"].includes(
          parent.left.name.text,
        )
      )
        errors.push("authored style color");
      if (
        ts.isCallExpression(parent) &&
        ts.isPropertyAccessExpression(parent.expression) &&
        parent.expression.name.text === "addColorStop"
      )
        errors.push("authored gradient color");
    }
  });
  return errors;
}
function entryViolations(source: string) {
  const root = ts.createSourceFile(
    "index.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const exports = root.statements.filter(ts.isExportAssignment);
  if (exports.length !== 1) return ["one default object is required"];
  let value = exports[0]!.expression;
  while (
    ts.isSatisfiesExpression(value) ||
    ts.isAsExpression(value) ||
    ts.isParenthesizedExpression(value)
  )
    value = value.expression;
  return ts.isObjectLiteralExpression(value)
    ? []
    : ["entry must export a literal definition, not a runtime factory"];
}
function atomicModuleViolations(source: string) {
  const root = ts.createSourceFile(
    "module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const errors: string[] = [];
  for (const node of root.statements) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      (node.moduleSpecifier.text.startsWith(".") ||
        node.moduleSpecifier.text.startsWith("@/games/")) &&
      !node.importClause?.isTypeOnly
    ) {
      const bindings = node.importClause?.namedBindings;
      if (
        bindings &&
        (!ts.isNamedImports(bindings) ||
          bindings.elements.some((item) => !item.isTypeOnly))
      )
        errors.push("import one runtime object per local module");
    }
    if (
      (ts.isVariableStatement(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      ts
        .getModifiers(node)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      errors.push("export one runtime object, not scattered values");
  }
  return errors;
}
describe("SDK architecture boundary", () => {
  it("keeps game imports and ids out of engine and shell", () => {
    expect(Object.keys(shell).length).toBeGreaterThan(0);
    for (const [file, source] of Object.entries(shell)) {
      if (file.includes(".test.") || file.includes("/__tests__/")) continue;
      nodes(source, (node) => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          expect(node.moduleSpecifier.text, file).not.toContain("/games/");
        if (ts.isStringLiteral(node))
          expect(["snake", "tetris"].includes(node.text), file).toBe(false);
      });
    }
  });
  it("keeps local game module APIs atomic", () => {
    for (const [file, source] of Object.entries(games))
      if (!file.includes("/__tests__/"))
        expect(atomicModuleViolations(source), file).toEqual([]);
  });
  it.each([
    "export function update() {}",
    "export const a=1,b=2;",
    'import { update, initialize } from "./logic";',
    'import { update } from "@/games/snake/logic";',
  ])("rejects scattered module APIs: %s", (source) =>
    expect(atomicModuleViolations(source).length).toBeGreaterThan(0),
  );
  it("allows a runtime object plus type-only imports", () =>
    expect(
      atomicModuleViolations(
        'import logic from "./logic"; import type { State } from "./model"; export default { update:logic.update };',
      ),
    ).toEqual([]));
  it("keeps each public game entry a literal default definition", () => {
    const entries = Object.entries(games).filter(([file]) =>
      /games\/[^/]+\/index\.ts$/.test(file),
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const [file, source] of entries)
      expect(entryViolations(source), file).toEqual([]);
  });
  it.each([
    "export default createGame();",
    "const game=createGame(); export default game;",
    "export default new Game();",
  ])("rejects instantiated public game entries: %s", (source) =>
    expect(entryViolations(source).length).toBeGreaterThan(0),
  );
  it("accepts a type-checked plain definition", () =>
    expect(
      entryViolations(
        "export default {defaultState,update} satisfies GameDefinition<State,Options,Action>;",
      ),
    ).toEqual([]));
  it("lets cartridges consume only the SDK and their own files", () => {
    expect(Object.keys(games).length).toBeGreaterThan(0);
    for (const [file, source] of Object.entries(games))
      if (!file.endsWith(".test.ts") && !file.includes("/__tests__/"))
        expect(cartridgeViolations(file, source), file).toEqual([]);
  });
  it.each([
    'import { x } from "@/engine/ui/settings/settings-dialog";',
    'import { x } from "@/engine/ui/board/board-labels";',
    'import { x } from "@/engine/rendering/canvas";',
    "const color = `oklch(0.5 0.2 100)`;",
    'ctx.fillStyle="rebeccapurple";',
    "ctx.strokeStyle=`papayawhip`;",
    'gradient.addColorStop(0,"cyan");',
    'window.matchMedia("x");',
    "const x = Math.random();",
    'import("@/engine/platform/storage");',
  ])("rejects invalid cartridge boundary: %s", (source) =>
    expect(
      cartridgeViolations("../games/fixture/render.ts", source).length,
    ).toBeGreaterThan(0),
  );
  it("accepts token-driven drawing and local pure modules", () =>
    expect(
      cartridgeViolations(
        "../games/fixture/render.ts",
        'import type { RenderFrame } from "@/engine/sdk"; import { x } from "./game"; ctx.fillStyle=frame.visuals.accent;',
      ),
    ).toEqual([]));
});
