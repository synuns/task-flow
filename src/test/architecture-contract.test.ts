/// <reference types="node" />
// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { User } from "@/entities/user";

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
const projectRoot = resolve(sourceRoot, "..");
const layers = ["app", "pages", "widgets", "features", "entities", "shared"] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

type Dependency = { specifier: string; reExported: boolean };

function dependencies(file: string): Dependency[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const values: Dependency[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      values.push({
        specifier: node.moduleSpecifier.text,
        reExported: ts.isExportDeclaration(node),
      });
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      values.push({ specifier: node.arguments[0].text, reExported: false });
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return values;
}

function segments(path: string): string[] {
  return relative(sourceRoot, path).split(sep);
}

function isTestFile(file: string): boolean {
  const path = relative(sourceRoot, file);
  return path.startsWith(`test${sep}`) || /\.(test|spec)\.(ts|tsx)$/.test(path);
}

function violations(): string[] {
  const failures: string[] = [];

  for (const file of sourceFiles(sourceRoot)) {
    const source = segments(file);
    for (const { specifier, reExported } of dependencies(file)) {
      if (!specifier.startsWith("@/") && !specifier.startsWith(".")) {
        continue;
      }

      const targetPath = specifier.startsWith("@/")
        ? resolve(sourceRoot, specifier.slice(2))
        : resolve(dirname(file), specifier);
      const target = segments(targetPath);

      if (target[0] === "generated" && !(source[0] === "shared" && source[1] === "api")) {
        failures.push(`${relative(sourceRoot, file)} imports ${specifier} outside shared/api`);
        continue;
      }

      if (target[0] === "generated" && reExported) {
        failures.push(
          `${relative(sourceRoot, file)} re-exports generated contract via ${specifier}`,
        );
        continue;
      }

      if (
        target[0] === "mocks" &&
        source[0] !== "mocks" &&
        relative(sourceRoot, file) !== "main.tsx" &&
        !isTestFile(file)
      ) {
        failures.push(`${relative(sourceRoot, file)} imports ${specifier} outside main/test`);
        continue;
      }

      const sourceLayer = layers.indexOf(source[0] as (typeof layers)[number]);
      const targetLayer = layers.indexOf(target[0] as (typeof layers)[number]);
      if (sourceLayer < 0 || targetLayer < 0) {
        continue;
      }

      if (sourceLayer > targetLayer) {
        failures.push(`${relative(sourceRoot, file)} reverses layer direction via ${specifier}`);
      }

      if (source[0] !== "app" && sourceLayer === targetLayer && source[1] !== target[1]) {
        failures.push(`${relative(sourceRoot, file)} crosses same-layer slices via ${specifier}`);
      }

      if (specifier.startsWith("@/") && sourceLayer === targetLayer) {
        failures.push(
          `${relative(sourceRoot, file)} aliases inside its own layer via ${specifier}`,
        );
      }

      const maximumPublicSegments = target[0] === "app" ? 1 : 2;
      if (specifier.startsWith("@/") && target.length > maximumPublicSegments) {
        failures.push(`${relative(sourceRoot, file)} deep-imports ${specifier}`);
      }
    }
  }

  return failures.sort();
}

describe("architecture imports", () => {
  it("keeps credentials out of the public User entity", () => {
    expectTypeOf<User>().toEqualTypeOf<{ email: string; name: string; memo: string }>();
  });

  it("keeps FSD direction, public APIs, mocks, and generated boundaries", () => {
    expect(violations()).toEqual([]);
  });

  it("keeps the Biome alias guard executable", () => {
    const fixtureDirectory = mkdtempSync(resolve(tmpdir(), "taskflow-biome-"));
    const run = (name: string, source: string) => {
      const path = resolve(fixtureDirectory, name);
      writeFileSync(path, source);
      const result = spawnSync(
        resolve(projectRoot, "node_modules/.bin/biome"),
        [
          "lint",
          `--config-path=${resolve(projectRoot, "biome.json")}`,
          "--only=lint/style/noRestrictedImports",
          path,
        ],
        { cwd: projectRoot, encoding: "utf8" },
      );
      return { status: result.status, output: `${result.stdout}${result.stderr}` };
    };

    try {
      const allowed = run("allowed.ts", 'import type { Api } from "@/shared/api";\n');
      const blocked = run("blocked.ts", 'import type { Api } from "@/shared/api/request";\n');

      expect(allowed.status, allowed.output).toBe(0);
      expect(blocked.status, blocked.output).toBe(1);
      expect(blocked.output).toContain("lint/style/noRestrictedImports");
    } finally {
      rmSync(fixtureDirectory, { recursive: true, force: true });
    }
  });
});
