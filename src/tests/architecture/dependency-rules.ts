import ts from "typescript";

export const normalizePath = (path: string) => {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
};
export function visitSource(source: string, visit: (node: ts.Node) => void) {
  const root = ts.createSourceFile(
    "module.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function walk(node: ts.Node) {
    visit(node);
    ts.forEachChild(node, walk);
  }
  walk(root);
}
/** Includes re-exports, import types and literal dynamic imports. */
export function importsOf(source: string): string[] {
  const imports: string[] = [];
  visitSource(source, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    )
      imports.push(node.argument.literal.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
  });
  return imports;
}
export function localImport(file: string, path: string) {
  if (path.startsWith("@/")) return "src/" + path.slice(2);
  if (path.startsWith("."))
    return normalizePath(file.slice(0, file.lastIndexOf("/")) + "/" + path);
  return null;
}
const layers: Record<string, readonly string[]> = {
  contracts: ["contracts"],
  lib: ["lib", "contracts"],
  input: ["input", "contracts"],
  runtime: ["runtime", "contracts", "input", "lib"],
  rendering: ["rendering", "contracts"],
  theme: ["theme", "contracts"],
  platform: ["platform", "contracts", "runtime", "theme"],
  ui: [
    "ui",
    "contracts",
    "runtime",
    "input",
    "rendering",
    "theme",
    "platform",
    "lib",
  ],
};
export function dependencyViolations(file: string, source: string): string[] {
  const errors: string[] = [];
  const engineLayer = file.startsWith("src/engine/")
    ? file.split("/")[2]
    : null;
  if (
    file.startsWith("src/engine/") &&
    file !== "src/engine/sdk.ts" &&
    !layers[engineLayer!]
  )
    errors.push("unknown engine layer");
  if (file.split("/").length === 2 && file !== "src/main.ts")
    errors.push("root module outside app/engine/games");
  for (const path of importsOf(source)) {
    const target = localImport(file, path);
    if (file === "src/main.ts" && target !== "src/app/bootstrap")
      errors.push("entrypoint must delegate to app/bootstrap");
    if (file.startsWith("src/engine/")) {
      if (!target) {
        if (engineLayer !== "ui")
          errors.push("external package below UI: " + path);
        continue;
      }
      if (!target.startsWith("src/engine/"))
        errors.push("engine imports app/game: " + path);
      else if (file !== "src/engine/sdk.ts") {
        const targetLayer = target.split("/")[2]!;
        if (!layers[engineLayer!]?.includes(targetLayer))
          errors.push("upward engine dependency: " + path);
      } else if (
        !["contracts", "runtime", "rendering", "lib"].includes(
          target.split("/")[2]!,
        )
      )
        errors.push("SDK exposes browser/UI: " + path);
    }
    if (
      file.startsWith("src/app/") &&
      target?.startsWith("src/games/") &&
      file !== "src/app/catalog.ts"
    )
      errors.push("concrete games belong in app/catalog");
    if (
      file.startsWith("src/engine/ui/primitives/") &&
      target?.startsWith("src/engine/") &&
      !target.startsWith("src/engine/ui/primitives/") &&
      !target.startsWith("src/engine/ui/lib/")
    )
      errors.push("primitive imports engine feature: " + path);
  }
  if (
    engineLayer &&
    ["contracts", "runtime", "rendering", "theme", "lib"].includes(engineLayer)
  ) {
    visitSource(source, (node) => {
      if (
        ts.isIdentifier(node) &&
        [
          "window",
          "document",
          "globalThis",
          "localStorage",
          "sessionStorage",
          "matchMedia",
          "requestAnimationFrame",
          "setInterval",
          "setTimeout",
          "Date",
          "performance",
        ].includes(node.text)
      )
        errors.push(
          "environment dependency in pure engine layer: " + node.text,
        );
    });
  }
  if (file === "src/app/catalog.ts") {
    visitSource(source, (node) => {
      if (
        !ts.isImportDeclaration(node) ||
        !ts.isStringLiteral(node.moduleSpecifier)
      )
        return;
      const target = localImport(file, node.moduleSpecifier.text);
      if (
        target?.startsWith("src/games/") &&
        (!/^src\/games\/[^/]+$/.test(target) ||
          !node.importClause?.name ||
          node.importClause.namedBindings)
      )
        errors.push("catalog must import a default game entrypoint");
    });
  }
  if (engineLayer === "contracts") {
    const root = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of root.statements) {
      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEmptyStatement(node)
      )
        continue;
      if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)
        continue;
      if (ts.isExportDeclaration(node) && node.isTypeOnly) continue;
      errors.push("contracts contain runtime code");
    }
  }
  return errors;
}
export function dependencyCycles(sources: Record<string, string>): string[][] {
  const cycles: string[][] = [],
    done = new Set<string>(),
    path: string[] = [];
  function walk(file: string) {
    const start = path.indexOf(file);
    if (start >= 0) {
      cycles.push([...path.slice(start), file]);
      return;
    }
    if (done.has(file)) return;
    path.push(file);
    for (const target of importsOf(sources[file]!).map((spec) =>
      localImport(file, spec),
    )) {
      if (!target) continue;
      const resolved = [
        target,
        target + ".ts",
        target + ".tsx",
        target + "/index.ts",
      ].find((candidate) => candidate in sources);
      if (resolved) walk(resolved);
    }
    path.pop();
    done.add(file);
  }
  Object.keys(sources).forEach(walk);
  return cycles;
}
