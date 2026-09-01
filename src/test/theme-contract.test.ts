import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import stylesheet from "@/styles/globals.css?raw";
import { describe, expect, it } from "vitest";

const colorTokens = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "disabled",
  "disabled-foreground",
] as const;

function cssBlock(pattern: RegExp, label: string) {
  const block = stylesheet.match(pattern)?.[1];
  expect(block, `${label} block`).toBeDefined();
  return block ?? "";
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : sourceFiles(path);
    }
    return [".css", ".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

describe("global theme contract", () => {
  it("defines every semantic color for light, dark, and Tailwind", () => {
    const root = cssBlock(/:root\s*{([\s\S]*?)}/, ":root");
    const dark = cssBlock(/\.dark\s*{([\s\S]*?)}/, ".dark");
    const theme = cssBlock(/@theme inline\s*{([\s\S]*?)}/, "@theme inline");

    for (const token of colorTokens) {
      expect(root).toMatch(new RegExp(`--${token}\\s*:`));
      expect(dark).toMatch(new RegExp(`--${token}\\s*:`));
      expect(theme).toContain(`--color-${token}: var(--${token});`);
    }

    expect(root).toContain("--radius: 0.875rem;");
    expect(theme).toContain("--radius-lg: var(--radius);");
    expect(theme).toContain('--font-sans: "Pretendard"');
  });

  it("keeps raw UI colors inside the global token source", () => {
    const sourceRoot = join(process.cwd(), "src");
    const colorLiteral = /#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklab|oklch|lab|lch|color)\s*\(/i;
    const paletteUtility =
      /(?:bg|text|border|ring|outline|fill|stroke)-(?:white|black|slate-\d{2,3}|gray-\d{2,3}|zinc-\d{2,3}|neutral-\d{2,3}|stone-\d{2,3}|red-\d{2,3}|orange-\d{2,3}|amber-\d{2,3}|yellow-\d{2,3}|lime-\d{2,3}|green-\d{2,3}|emerald-\d{2,3}|teal-\d{2,3}|cyan-\d{2,3}|sky-\d{2,3}|blue-\d{2,3}|indigo-\d{2,3}|violet-\d{2,3}|purple-\d{2,3}|fuchsia-\d{2,3}|pink-\d{2,3}|rose-\d{2,3}|\[[^\]]+\])/;
    const violations = sourceFiles(sourceRoot)
      .filter((path) => !path.endsWith("/styles/globals.css"))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            colorLiteral.test(line) || paletteUtility.test(line)
              ? [`${relative(process.cwd(), path)}:${index + 1}`]
              : [],
          ),
      );

    expect(violations).toEqual([]);
  });

  it("loads the local Pretendard source", () => {
    expect(stylesheet).toContain('url("/fonts/PretendardVariable.woff2")');
    expect(stylesheet).toContain('font-family: "Pretendard"');
  });
});
