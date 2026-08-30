# KB올라케어 Color Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KB올라케어와 KB 공식 색상 체계를 반영한 light/dark shadcn semantic token 전체를 전역 CSS에 적용하고 literal 유입을 자동 검증한다.

**Architecture:** `src/styles/globals.css`만 raw color 값을 소유하고 `@theme inline`이 Tailwind semantic utility로 1:1 노출한다. `src/test/theme-contract.test.ts`는 token 정의·연결과 global token source 밖의 color literal 금지를 stdlib 기반 정적 계약으로 검증한다.

**Tech Stack:** Tailwind CSS 4, CSS Custom Properties, OKLCH, Vitest, Node.js stdlib, agent-browser

## Global Constraints

- `assignment-original/requirement.md`의 “색상은 토큰으로 관리되어야 합니다”를 유지한다.
- 공식 기준색은 KB Yellow Positive `#ffbc00`, KB Yellow Negative `#ffcc00`, KB Gray `#60584c`, KB Dark Gray `#545045`다.
- UI는 feature-local color literal이나 Tailwind palette class를 사용하지 않는다.
- 기존 Pretendard, `--disabled`, `--disabled-foreground`, `--radius: 0.875rem`을 유지한다.
- `.dark` token은 제공하되 theme provider나 toggle UI는 추가하지 않는다.
- 새 dependency, component style, layout, architecture 변경을 추가하지 않는다.
- `SYS-02`는 이후 실제 feature UI 전체가 token을 소비할 때까지 `IN_PROGRESS`를 유지한다.

---

## File Structure

- Modify: `src/test/theme-contract.test.ts` — 전체 semantic token과 color literal 금지 계약
- Modify: `src/styles/globals.css` — light/dark raw token, Tailwind mapping, global base
- Modify: `TODO.md` — `SCF-05` 자동·브라우저 evidence와 `AI_VERIFIED` 상태

### Task 1: KB올라케어 semantic token 계약과 구현

**Files:**
- Modify: `src/test/theme-contract.test.ts`
- Modify: `src/styles/globals.css`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `src/main.tsx`의 `@/styles/globals.css` import와 Tailwind 4 `@theme inline`
- Produces: `bg-primary`, `text-foreground`, `border-border`, `bg-sidebar` 등 `--color-*` semantic utility와 class 기반 `.dark` token override

- [ ] **Step 1: 전체 token과 literal 금지를 표현하는 실패 test 작성**

Replace `src/test/theme-contract.test.ts` with:

```ts
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
    const colorLiteral =
      /#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklab|oklch|lab|lch|color)\s*\(/i;
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
```

- [ ] **Step 2: focused test가 기존 미구현 token 때문에 실패하는지 확인**

Run:

```bash
pnpm vitest run src/test/theme-contract.test.ts
```

Expected: FAIL in `defines every semantic color for light, dark, and Tailwind` because `--card` and `.dark` are absent. The literal and Pretendard tests remain green.

- [ ] **Step 3: light/dark raw token과 Tailwind 연결을 최소 구현**

Replace `src/styles/globals.css` with:

```css
@import "tailwindcss";

@font-face {
  font-family: "Pretendard";
  src: url("/fonts/PretendardVariable.woff2") format("woff2");
  font-display: swap;
  font-style: normal;
  font-weight: 45 920;
}

:root {
  --background: oklch(0.991 0.014 92.978);
  --foreground: oklch(0.232 0.006 78.196);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.232 0.006 78.196);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.232 0.006 78.196);
  --primary: oklch(0.835 0.172 82.565);
  --primary-foreground: oklch(0.24 0.008 84.591);
  --secondary: oklch(0.966 0.053 94.426);
  --secondary-foreground: oklch(0.396 0.016 82.348);
  --muted: oklch(0.961 0.007 88.643);
  --muted-foreground: oklch(0.523 0.017 80.654);
  --accent: oklch(0.936 0.091 92.686);
  --accent-foreground: oklch(0.352 0.017 78.045);
  --destructive: oklch(0.614 0.174 23.739);
  --border: oklch(0.886 0.015 84.585);
  --input: oklch(0.886 0.015 84.585);
  --ring: oklch(0.582 0.119 85.036);
  --chart-1: oklch(0.835 0.172 82.565);
  --chart-2: oklch(0.687 0.143 79.077);
  --chart-3: oklch(0.464 0.021 78.069);
  --chart-4: oklch(0.693 0.145 30.905);
  --chart-5: oklch(0.432 0.018 90.376);
  --radius: 0.875rem;
  --sidebar: oklch(0.977 0.037 95.439);
  --sidebar-foreground: oklch(0.232 0.006 78.196);
  --sidebar-primary: oklch(0.835 0.172 82.565);
  --sidebar-primary-foreground: oklch(0.24 0.008 84.591);
  --sidebar-accent: oklch(0.936 0.091 92.686);
  --sidebar-accent-foreground: oklch(0.352 0.017 78.045);
  --sidebar-border: oklch(0.868 0.042 90.262);
  --sidebar-ring: oklch(0.582 0.119 85.036);
  --disabled: oklch(0.907 0.013 86.833);
  --disabled-foreground: oklch(0.544 0.017 80.66);
}

.dark {
  --background: oklch(0.219 0.007 78.185);
  --foreground: oklch(0.979 0.008 91.482);
  --card: oklch(0.266 0.012 84.577);
  --card-foreground: oklch(0.979 0.008 91.482);
  --popover: oklch(0.266 0.012 84.577);
  --popover-foreground: oklch(0.979 0.008 91.482);
  --primary: oklch(0.865 0.177 90.382);
  --primary-foreground: oklch(0.24 0.008 84.591);
  --secondary: oklch(0.338 0.015 84.578);
  --secondary-foreground: oklch(0.979 0.008 91.482);
  --muted: oklch(0.315 0.012 78.134);
  --muted-foreground: oklch(0.803 0.017 82.79);
  --accent: oklch(0.374 0.048 91.531);
  --accent-foreground: oklch(0.966 0.053 94.426);
  --destructive: oklch(0.731 0.166 29.521);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 18%);
  --ring: oklch(0.75 0.153 88.272);
  --chart-1: oklch(0.865 0.177 90.382);
  --chart-2: oklch(0.75 0.153 88.272);
  --chart-3: oklch(0.745 0.031 75.594);
  --chart-4: oklch(0.761 0.143 30.543);
  --chart-5: oklch(0.571 0.024 76.38);
  --sidebar: oklch(0.25 0.009 75.203);
  --sidebar-foreground: oklch(0.979 0.008 91.482);
  --sidebar-primary: oklch(0.865 0.177 90.382);
  --sidebar-primary-foreground: oklch(0.24 0.008 84.591);
  --sidebar-accent: oklch(0.374 0.048 91.531);
  --sidebar-accent-foreground: oklch(0.966 0.053 94.426);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.75 0.153 88.272);
  --disabled: oklch(0.334 0.013 87.56);
  --disabled-foreground: oklch(0.701 0.016 80.689);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-disabled: var(--disabled);
  --color-disabled-foreground: var(--disabled-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Pretendard", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  html {
    min-width: 320px;
    min-height: 100%;
    background: var(--background);
    color: var(--foreground);
    font-family: "Pretendard", ui-sans-serif, system-ui, sans-serif;
  }

  body {
    min-height: 100vh;
    margin: 0;
  }
}
```

- [ ] **Step 4: focused test GREEN 확인**

Run:

```bash
pnpm vitest run src/test/theme-contract.test.ts
```

Expected: PASS, 1 file and 3 tests.

- [ ] **Step 5: source literal scan과 자동 gate 실행**

Run:

```bash
rg -n -i -g '!**/styles/globals.css' -g '!generated/**' '(#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\()' src
```

Expected: exit 1 with no matches.

Run:

```bash
./scripts/verify quick
```

Expected: PASS for setup, format check, lint, typecheck, and all Vitest tests without repository mutation.

Run:

```bash
pnpm build
```

Expected: exit 0 and Vite production assets emitted under ignored `dist/`.

- [ ] **Step 6: implementation commit 생성**

```bash
git add src/styles/globals.css src/test/theme-contract.test.ts
git commit -m "feat(theme): KB올라케어 색상 토큰 적용"
git rev-parse --short HEAD
```

Expected: Conventional Commit succeeds; keep the returned SHA for browser and TODO evidence.

- [ ] **Step 7: light/dark computed color를 agent-browser로 검증**

Start Vite on an available local terminal/session:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

In a second terminal:

```bash
agent-browser --session scf-05 open http://127.0.0.1:4173/
agent-browser --session scf-05 set viewport 1280 720
agent-browser --session scf-05 wait --load networkidle
agent-browser --session scf-05 eval 'JSON.stringify({ background: getComputedStyle(document.documentElement).backgroundColor, foreground: getComputedStyle(document.documentElement).color, primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() })'
agent-browser --session scf-05 screenshot /tmp/kbhc-scf-05-light.png
agent-browser --session scf-05 eval 'document.documentElement.classList.add("dark")'
agent-browser --session scf-05 eval 'JSON.stringify({ background: getComputedStyle(document.documentElement).backgroundColor, foreground: getComputedStyle(document.documentElement).color, primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() })'
agent-browser --session scf-05 screenshot /tmp/kbhc-scf-05-dark.png
agent-browser --session scf-05 console
agent-browser --session scf-05 errors
agent-browser --session scf-05 close
```

Expected: light and dark background/foreground values differ; light primary resolves from KB Yellow Positive and dark primary from KB Yellow Negative; console/page errors are empty; both screenshots exist; session closes.

- [ ] **Step 8: TODO evidence와 상태 갱신**

In `TODO.md`, change `SCF-05` to `[x]`, set `Status: AI_VERIFIED`, and replace its evidence with the exact implementation SHA and these results:

```text
Evidence: 2026-08-30 <implementation SHA>; theme contract RED — `--card`와
`.dark` 미정의로 FAIL; GREEN `pnpm vitest run src/test/theme-contract.test.ts`
1 file/3 tests PASS; color literal scan no matches; `./scripts/verify quick` PASS;
`pnpm build` PASS; agent-browser `scf-05` `/` 1280x720에서 light/dark computed
background·foreground·primary 전환, console/page error 없음; screenshots
`/tmp/kbhc-scf-05-light.png`, `/tmp/kbhc-scf-05-dark.png`; session 종료 확인
```

Keep `docs/quality/requirements.md` `SYS-02` as `IN_PROGRESS` because feature UI is not implemented yet.

- [ ] **Step 9: evidence commit과 최종 read-only 재검증**

```bash
git add TODO.md
git commit -m "docs(theme): 색상 테마 검증 근거 기록"
./scripts/verify quick
git status --short
```

Expected: final quick gate PASS and clean worktree.

