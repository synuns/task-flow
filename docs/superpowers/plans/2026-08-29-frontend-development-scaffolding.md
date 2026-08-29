# 프런트엔드 개발 기반 Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React 19·TypeScript 과제의 기능과 레이아웃을 만들기 전에 설치·실행·검사·테스트·빌드 가능한 개발 기반을 제공한다.

**Architecture:** Vite의 단일 browser entry만 만들고 제품 route, provider, component, FSD layer는 만들지 않는다. 품질 도구, local font, OpenAPI type 생성, MSW worker, browser smoke는 기술 경계별로 격리한다. 후속 FSD 설계가 layer와 shadcn alias를 결정할 수 있도록 `@/*` alias 하나만 제공하고 `components.json`은 만들지 않는다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3, Vite 8.2.2, pnpm 10.15.1, Tailwind CSS 4.3.3, Biome 2.5.11, Vitest 4.1.11, Testing Library, Playwright 1.62.1, openapi-typescript 7.13.0, MSW 2.15.0, shadcn CLI 4.19.0, Pretendard 1.3.9

## Global Constraints

- `assignment-original/openapi.yaml`을 API 세부 계약의 최우선 출처로 사용한다.
- React 19와 TypeScript를 사용한다.
- package manager는 pnpm만 사용하고 `pnpm-lock.yaml`만 생성한다.
- Node.js 지원 범위는 `^20.19.0 || ^22.12.0 || >=24.0.0`으로 고정한다.
- Biome은 lint와 format을 전담하고 TypeScript는 typecheck를 전담한다.
- ESLint와 Prettier를 도입하지 않는다.
- 색상 literal은 `src/styles/globals.css`의 명명된 token 정의에만 둔다.
- Pretendard 1.3.9 variable WOFF2와 OFL license를 repository에서 self-host한다.
- 기존 `package.json`의 `ai:review`와 AI record lifecycle을 보존한다.
- `kbhc.frontendScaffolded`는 필수 frontend script가 모두 준비되는 변경에서만 `true`로 바꾼다.
- `components.json`, shadcn component, React Router 구성, provider, page, layout, FSD layer를 만들지 않는다.
- MSW handler, fixture, browser bootstrap, Node mock server를 만들지 않는다.
- `test:e2e:core`는 `@core`만 선택하고 Golden Journey 미구현 상태에서는 빈 선택을 허용한다.
- scaffold smoke는 `@core`가 아니며 Golden Journey evidence로 사용하지 않는다.
- 자동 검증은 repository를 수정하지 않는다. format mutation은 `pnpm format`으로 분리한다.
- AI는 `HUMAN_APPROVED`를 표시하지 않는다.

---

## File Map

### 기존 파일 수정

- `.gitignore` — Node, build, coverage, Playwright runtime output 제외.
- `package.json` — 기존 AI review script 보존, dependency·frontend script·scaffold marker 추가.
- `tests/test_verify.py` — tooling-only package 기대를 active frontend package 계약으로 전환.
- `vite.config.ts` — Task 2에서 Tailwind Vite plugin 추가.
- `playwright.config.ts` — Task 2에서 scaffold smoke artifact 설정 추가.
- `e2e/scaffold.smoke.spec.ts` — Task 3에서 MSW worker asset 검증 추가.
- `docs/quality/requirements.md` — 검증된 기반 요구사항의 evidence와 status 기록.

### 새 handwritten 파일

- `biome.json` — lint·format 설정과 generated file 제외.
- `tsconfig.json` — application과 Node config project reference.
- `tsconfig.app.json` — strict browser·test TypeScript config와 `@/*` alias.
- `tsconfig.node.json` — Vite, Vitest, Playwright config와 E2E typecheck.
- `vite.config.ts` — React plugin, `@/*` alias, Tailwind plugin 진입.
- `vitest.config.ts` — jsdom과 Testing Library setup.
- `playwright.config.ts` — Chromium, Vite web server, failure artifact.
- `index.html` — Vite root와 module entry.
- `src/vite-env.d.ts` — Vite client type.
- `src/main.tsx` — 빈 React root mount.
- `src/test/setup.ts` — jest-dom matcher 등록.
- `src/test/scaffold.test.tsx` — Vitest·jsdom·Testing Library smoke.
- `src/test/theme-contract.test.ts` — token·font stylesheet contract.
- `src/test/openapi-contract.test.ts` — generated OpenAPI type의 핵심 schema smoke.
- `src/styles/globals.css` — Tailwind import, semantic token, Pretendard, global base.
- `e2e/scaffold.smoke.spec.ts` — root, font, console/network smoke.
- `docs/quality/evidence/frontend-scaffolding.md` — reproducible command와 browser record.

### 새 generated/vendor 파일

- `pnpm-lock.yaml` — pnpm 10.15.1 install 결과.
- `public/fonts/PretendardVariable.woff2` — Pretendard 1.3.9 official variable font.
- `public/fonts/LICENSE-Pretendard.txt` — Pretendard 1.3.9 OFL license.
- `src/generated/openapi.ts` — `assignment-original/openapi.yaml` 생성 type.
- `public/mockServiceWorker.js` — MSW 2.15.0 CLI 생성 worker.

---

### Task 1: React·TypeScript와 자동 검증 toolchain

**Requirement IDs:** `SYS-01`

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `tests/test_verify.py`
- Create: `pnpm-lock.yaml`
- Create: `biome.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/main.tsx`
- Create: `src/test/setup.ts`
- Create: `src/test/scaffold.test.tsx`

**Interfaces:**
- Consumes: Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`, pnpm 10.15.1, existing `scripts/verify` package contract.
- Produces: `@/* -> src/*`, `pnpm dev`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, empty `@core` E2E selection.

- [ ] **Step 1: frontend package 전환 test를 먼저 작성**

In `tests/test_verify.py`, replace `test_quick_skips_frontend_before_scaffolding` with:

```python
    def test_quick_runs_frontend_after_scaffolding(self):
        result = self.run_verify("quick")
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        self.assertNotIn("SKIP frontend not scaffolded", result.stdout)
        for stage in ("format:check", "lint", "typecheck", "test"):
            with self.subTest(stage=stage):
                self.assertIn("PASS {}".format(stage), result.stdout)
```

Replace `test_tooling_only_package_has_review_shortcut` with:

```python
    def test_frontend_scaffold_activates_required_scripts(self):
        verifier = load_verify_module()
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(package["scripts"]["ai:review"], "./scripts/review-ai-record")
        self.assertTrue(package["kbhc"]["frontendScaffolded"])
        self.assertEqual(
            set(verifier.REQUIRED_PACKAGE_SCRIPTS) - set(package["scripts"]),
            set(),
        )
        self.assertEqual(verifier.verify_review_tooling(ROOT), [])
```

Replace `test_default_is_full` with:

```python
    def test_default_runs_full_frontend_verification(self):
        result = self.run_verify()
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        self.assertIn("PASS setup", result.stdout)
        self.assertIn("PASS build", result.stdout)
        self.assertIn("PASS test:e2e:core", result.stdout)
        self.assertNotIn("SKIP frontend not scaffolded", result.stdout)
```

- [ ] **Step 2: test가 현재 tooling-only package에서 실패하는지 확인**

Run:

```bash
python3 -m unittest \
  tests.test_verify.VerifyCliTests.test_quick_runs_frontend_after_scaffolding \
  tests.test_verify.VerifyCliTests.test_frontend_scaffold_activates_required_scripts \
  tests.test_verify.VerifyCliTests.test_default_runs_full_frontend_verification \
  -v
```

Expected: three failures because `frontendScaffolded` is still `false`, quick/full print the scaffold skip, and required frontend stages do not run.

- [ ] **Step 3: active frontend package 계약 작성**

Replace `package.json` with:

```json
{
  "name": "kbhc-assgn",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.15.1",
  "engines": {
    "node": "^20.19.0 || ^22.12.0 || >=24.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "lint": "biome lint .",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e:core": "env -u NO_COLOR playwright test --grep @core --pass-with-no-tests",
    "test:e2e:smoke": "env -u NO_COLOR playwright test e2e/scaffold.smoke.spec.ts",
    "api:types": "openapi-typescript assignment-original/openapi.yaml -o src/generated/openapi.ts",
    "ai:review": "./scripts/review-ai-record"
  },
  "dependencies": {
    "@tanstack/react-query": "5.102.8",
    "@tanstack/react-virtual": "3.14.10",
    "lucide-react": "1.37.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-hook-form": "7.86.0",
    "react-router-dom": "7.18.3",
    "zod": "4.5.2"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.11",
    "@playwright/test": "1.62.1",
    "@tailwindcss/vite": "4.3.3",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.6",
    "@types/node": "26.4.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "@vitejs/plugin-react": "6.1.1",
    "jsdom": "30.0.1",
    "msw": "2.15.0",
    "openapi-typescript": "7.13.0",
    "shadcn": "4.19.0",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "vite": "8.2.2",
    "vitest": "4.1.11"
  },
  "kbhc": {
    "frontendScaffolded": true
  }
}
```

Append to `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
```

- [ ] **Step 4: dependency 설치 결과를 lockfile로 고정**

Run:

```bash
pnpm install
```

Expected: exit code `0`; `pnpm-lock.yaml` created; `package.json` keeps exact versions; no npm or Yarn lockfile created.

- [ ] **Step 5: Biome와 TypeScript config 작성**

Create `biome.json`:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "files": {
    "includes": [
      "**",
      "!src/generated/openapi.ts",
      "!public/mockServiceWorker.js",
      "!!dist",
      "!!coverage",
      "!!playwright-report",
      "!!test-results"
    ],
    "ignoreUnknown": true
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "e2e"]
}
```

- [ ] **Step 6: Vite, Vitest, Playwright config 작성**

Create `vite.config.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

Create `vitest.config.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    css: {
      include: [/.+/],
    },
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**", "**/.worktrees/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 7: 빈 React entry와 Vitest smoke 작성**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KBHC Assignment</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("React root element is missing");
}

createRoot(rootElement).render(<StrictMode />);
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/test/scaffold.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("frontend test scaffold", () => {
  it("renders with jsdom and supports user interaction", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <button type="button" onClick={onClick}>
        scaffold
      </button>,
    );

    await user.click(screen.getByRole("button", { name: "scaffold" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 8: format mutation을 분리 실행하고 diff 검토**

Run:

```bash
pnpm format
git diff --check
git diff --stat
```

Expected: Biome formats supported handwritten files; no whitespace errors; only Task 1 files changed.

- [ ] **Step 9: focused test와 quick verification 실행**

Run:

```bash
python3 -m unittest tests/test_verify.py -v
pnpm test
pnpm build
./scripts/verify quick
```

Expected: all verifier tests pass; one Vitest test passes; Vite build succeeds; quick ends with `PASS test`; no `SKIP frontend not scaffolded`; repository fingerprint stays unchanged during verification.

- [ ] **Step 10: Task 1 commit**

```bash
git add .gitignore package.json pnpm-lock.yaml biome.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts vitest.config.ts playwright.config.ts index.html src/vite-env.d.ts src/main.tsx src/test/setup.ts src/test/scaffold.test.tsx tests/test_verify.py
git commit -m "chore(scaffold): React 개발 도구 기반 구성"
```

---

### Task 2: Tailwind token과 local Pretendard browser smoke

**Requirement IDs:** `SYS-02`, `SYS-03`

**Files:**
- Modify: `src/main.tsx`
- Modify: `vite.config.ts`
- Modify: `playwright.config.ts`
- Create: `src/styles/globals.css`
- Create: `src/test/theme-contract.test.ts`
- Create: `e2e/scaffold.smoke.spec.ts`
- Create: `public/fonts/PretendardVariable.woff2`
- Create: `public/fonts/LICENSE-Pretendard.txt`

**Interfaces:**
- Consumes: Task 1 Vite entry, Vitest, Playwright, Tailwind 4.3.3 Vite plugin.
- Produces: semantic token names, local `Pretendard` font family, `pnpm test:e2e:smoke` browser evidence.

- [ ] **Step 1: stylesheet contract test를 먼저 작성**

Create `src/test/theme-contract.test.ts`:

```ts
import stylesheet from "@/styles/globals.css?raw";
import { describe, expect, it } from "vitest";

describe("global theme contract", () => {
  it("defines semantic colors and a local Pretendard source", () => {
    expect(stylesheet).toContain("--background:");
    expect(stylesheet).toContain("--foreground:");
    expect(stylesheet).toContain("--primary:");
    expect(stylesheet).toContain("--disabled:");
    expect(stylesheet).toContain("--color-background: var(--background)");
    expect(stylesheet).toContain('url("/fonts/PretendardVariable.woff2")');
    expect(stylesheet).toContain('font-family: "Pretendard"');
  });
});
```

- [ ] **Step 2: missing stylesheet failure 확인**

Run:

```bash
pnpm test src/test/theme-contract.test.ts
```

Expected: FAIL because `@/styles/globals.css?raw` cannot be resolved.

- [ ] **Step 3: browser smoke를 먼저 작성하고 font failure 확인**

Create `e2e/scaffold.smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("@scaffold loads the React root and local Pretendard without browser errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  await expect(page.locator("#root")).toHaveCount(1);

  const fontLoaded = await page.evaluate(async () => {
    const loadedFonts = await document.fonts.load('16px "Pretendard"');
    return loadedFonts.length > 0;
  });
  const fontResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );

  expect(fontLoaded).toBe(true);
  expect(fontResources.some((url) => url.endsWith("/fonts/PretendardVariable.woff2"))).toBe(
    true,
  );
  await expect(page.locator("html")).toHaveCSS("font-family", /Pretendard/);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("scaffold-root", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
```

Run:

```bash
pnpm exec playwright install chromium
pnpm test:e2e:smoke
```

Expected: FAIL at `expect(fontLoaded).toBe(true)` because no Pretendard face is defined yet.

- [ ] **Step 4: official Pretendard asset와 license를 self-host**

Create `public/fonts/`, then download exact v1.3.9 assets:

```bash
curl -fsSL https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 -o public/fonts/PretendardVariable.woff2
curl -fsSL https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE -o public/fonts/LICENSE-Pretendard.txt
shasum -a 256 public/fonts/PretendardVariable.woff2 public/fonts/LICENSE-Pretendard.txt
```

Expected checksums:

```text
9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4  public/fonts/PretendardVariable.woff2
85fce85e25260b03777bf10373d3bd9363b9da96d9e0ca86a280dd37ed7667a0  public/fonts/LICENSE-Pretendard.txt
```

- [ ] **Step 5: Tailwind plugin과 global token stylesheet 구현**

Replace `vite.config.ts` with:

```ts
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

Create `src/styles/globals.css`:

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
  --background: oklch(1 0 0);
  --foreground: oklch(0.21 0.034 264.665);
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.984 0.003 247.858);
  --disabled: oklch(0.872 0.01 258.338);
  --disabled-foreground: oklch(0.446 0.03 256.802);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-disabled: var(--disabled);
  --color-disabled-foreground: var(--disabled-foreground);
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

Add stylesheet import at top of `src/main.tsx`:

```tsx
import "@/styles/globals.css";
```

Modify `playwright.config.ts` `use` to record video only on failure and set desktop viewport explicitly:

```ts
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
```

- [ ] **Step 6: focused automatic·browser tests 통과 확인**

Run:

```bash
pnpm format
pnpm test src/test/theme-contract.test.ts
pnpm test:e2e:smoke
./scripts/verify quick
```

Expected: theme contract passes; scaffold smoke passes in Chromium with `scaffold-root` attachment; no console/page errors; quick passes without repository mutation.

- [ ] **Step 7: Task 2 commit**

```bash
git add src/main.tsx vite.config.ts playwright.config.ts src/styles/globals.css src/test/theme-contract.test.ts e2e/scaffold.smoke.spec.ts public/fonts/PretendardVariable.woff2 public/fonts/LICENSE-Pretendard.txt
git commit -m "feat(scaffold): 색상 토큰과 Pretendard 기반 추가"
```

---

### Task 3: OpenAPI type·MSW worker·shadcn CLI 기반

**Requirement IDs:** `SYS-04`

**Files:**
- Modify: `package.json`
- Modify: `e2e/scaffold.smoke.spec.ts`
- Create: `src/test/openapi-contract.test.ts`
- Create: `src/generated/openapi.ts`
- Create: `public/mockServiceWorker.js`

**Interfaces:**
- Consumes: `assignment-original/openapi.yaml`, `openapi-typescript` CLI, MSW CLI, Task 2 browser smoke.
- Produces: generated `paths`·`components` types, read-only staleness check, served worker asset, installed shadcn CLI without alias config.

- [ ] **Step 1: generated OpenAPI type contract test를 먼저 작성**

Create `src/test/openapi-contract.test.ts`:

```ts
import type { components, paths } from "@/generated/openapi";
import { describe, expect, it } from "vitest";

describe("generated OpenAPI contract", () => {
  it("exposes authoritative paths and schema shapes", () => {
    const signInPath: keyof paths = "/api/sign-in";
    const dashboard: components["schemas"]["DashboardResponse"] = {
      numOfTask: 3,
      numOfRestTask: 2,
      numOfDoneTask: 1,
    };
    const deleted: components["schemas"]["DeleteTaskResponse"] = { success: true };

    expect(signInPath).toBe("/api/sign-in");
    expect(dashboard).toEqual({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
    expect(deleted.success).toBe(true);
  });
});
```

Run the test once to confirm its runtime assertions, then run the type contract gate:

```bash
pnpm test src/test/openapi-contract.test.ts
pnpm typecheck
```

Expected: the Vitest runtime assertions pass because the type-only import is erased, then `pnpm typecheck` fails because `src/generated/openapi.ts` does not exist.

- [ ] **Step 2: worker asset browser assertion을 먼저 추가**

In `e2e/scaffold.smoke.spec.ts`, after `await expect(page.locator("#root")).toHaveCount(1);`, add:

```ts
  const workerResponse = await page.request.get("/mockServiceWorker.js");

  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["content-type"]).toContain("javascript");
```

Run:

```bash
pnpm test:e2e:smoke
```

Expected: FAIL because Vite fallback response for missing worker is HTML, so `content-type` does not contain `javascript`.

- [ ] **Step 3: OpenAPI type 생성과 read-only staleness script 추가**

Run:

```bash
mkdir -p src/generated
pnpm api:types
```

Expected: `src/generated/openapi.ts` is generated from `assignment-original/openapi.yaml` and exports `paths`, `operations`, and `components`.

Add to `package.json` scripts:

```json
"api:types:check": "openapi-typescript assignment-original/openapi.yaml -o src/generated/openapi.ts --check"
```

Replace `typecheck` script with:

```json
"typecheck": "pnpm api:types:check && tsc -b"
```

- [ ] **Step 4: MSW worker를 official CLI로 생성**

Run:

```bash
pnpm exec msw init public --save
```

Expected: `public/mockServiceWorker.js` created and `package.json` receives:

```json
"msw": {
  "workerDirectory": [
    "public"
  ]
}
```

Do not create `src/mocks`, handler, fixture, `setupWorker`, or `setupServer`.

- [ ] **Step 5: shadcn CLI만 검증하고 architecture config 부재 확인**

Run:

```bash
pnpm exec shadcn --version
test ! -e components.json
```

Expected: output includes `4.19.0`; both commands exit `0`; `components.json` remains absent.

- [ ] **Step 6: generated contract·worker·전체 quick gate 검증**

Run:

```bash
pnpm api:types:check
pnpm test src/test/openapi-contract.test.ts
pnpm test:e2e:smoke
pnpm format
./scripts/verify quick
```

Expected: OpenAPI output is current; contract and browser smoke pass; worker returns JavaScript; quick passes. `pnpm format` does not rewrite generated OpenAPI or MSW worker because `biome.json` excludes both.

- [ ] **Step 7: Task 3 commit**

```bash
git add package.json src/generated/openapi.ts src/test/openapi-contract.test.ts public/mockServiceWorker.js e2e/scaffold.smoke.spec.ts
git commit -m "chore(scaffold): API 계약과 MSW 실행 기반 구성"
```

---

### Task 4: Scaffolding evidence와 requirement status

**Requirement IDs:** `SYS-01`, `SYS-02`, `SYS-03`, `SYS-04`

**Files:**
- Modify: `docs/quality/requirements.md`
- Create: `docs/quality/evidence/frontend-scaffolding.md`

**Interfaces:**
- Consumes: Tasks 1–3 commits and their reproducible commands.
- Produces: exact scaffold commit browser record, accurate partial/full requirement statuses, final read-only verification evidence.

- [ ] **Step 1: intended scaffold commit와 baseline status 기록**

Run:

```bash
git rev-parse HEAD
git status --short
```

Expected: first command returns Task 3 commit's 40-character SHA. Status contains no tracked change and may contain only the pre-existing untracked session artifact.

- [ ] **Step 2: full automatic verification과 browser smoke 실행**

Run:

```bash
python3 -m unittest tests/test_verify.py -v
./scripts/verify full
pnpm test:e2e:smoke
pnpm api:types:check
```

Expected: verifier tests, setup, format check, lint, typecheck, Vitest, build, and empty `@core` selection pass; scaffold smoke passes with 1280x720 `scaffold-root` attachment; OpenAPI types are current; verification does not change repository fingerprint.

- [ ] **Step 3: reproducible scaffold evidence 작성**

Create `docs/quality/evidence/frontend-scaffolding.md`. For `Commit`, paste the exact 40-character SHA returned by Step 1. All other content must be:

```markdown
# Frontend Scaffolding Evidence

Requirement/Journey: SYS-01, SYS-02, SYS-03, SYS-04; scaffolding only
Commit: exact 40-character Task 3 commit SHA captured before verification
Route/Viewport: `/`; Chromium; 1280x720
Precondition: pnpm install complete; Playwright Chromium installed; no product route, layout, handler, or FSD layer
Actions: run `./scripts/verify full`; run `pnpm test:e2e:smoke`; run `pnpm api:types:check`; open `/`; load `Pretendard`; request `/mockServiceWorker.js`
Expected: React root exists; Pretendard loads locally and is computed font; worker asset returns JavaScript; no console or page errors; generated API types are current
Actual: all automatic gates and scaffold browser assertions passed on recorded commit
Console/Network: no console or page errors; `PretendardVariable.woff2` and `mockServiceWorker.js` requests succeeded
Screenshot/Trace: Playwright `scaffold-root` attachment; trace, screenshot, and video retained on failure
Verdict: SYS-01 and SYS-03 AI_VERIFIED; SYS-02 and SYS-04 IN_PROGRESS pending product UI and OAS-conforming handlers
Failure class: none
Correction: none
Rerun verdict: PASS
```

The final file must contain the actual SHA, not the explanatory `Commit:` text shown above.

- [ ] **Step 4: requirement rows에 정확한 evidence와 status 반영**

In `docs/quality/requirements.md`, replace the four `SYS-*` rows with:

```markdown
| SYS-01 | React and TypeScript | requirement: 설명 | Application uses React 18 or 19 and TypeScript. | HIGH until stack approved | setup/build | `pnpm typecheck`; `pnpm build`; `./scripts/verify full` | — | final | AI_VERIFIED |
| SYS-02 | Color tokens | requirement: 설명 | Application UI colors resolve through named tokens rather than feature-local literals. | LOW | static/component | `src/test/theme-contract.test.ts`; `pnpm test` | — | final | IN_PROGRESS |
| SYS-03 | Pretendard | requirement: 설명 | Pretendard is loaded and used as application font. | LOW | component/browser | `src/test/theme-contract.test.ts`; `pnpm test:e2e:smoke` | `docs/quality/evidence/frontend-scaffolding.md` | work-overview | AI_VERIFIED |
| SYS-04 | API substitute | requirement: 전문 | Submitted code contains a documented mock or equivalent API implementation conforming to OAS 3.1. | HIGH until approach approved | integration/contract | `pnpm api:types:check`; `public/mockServiceWorker.js` | `pnpm test:e2e:smoke` worker asset check | final | IN_PROGRESS |
```

`SYS-02` remains `IN_PROGRESS` because no application UI consumes tokens. `SYS-04` remains `IN_PROGRESS` because no OAS-conforming handler exists. Do not mark any row `HUMAN_APPROVED`.

- [ ] **Step 5: documentation mutation 후 final gates 재실행**

Run:

```bash
git diff --check
./scripts/verify quick
pnpm test:e2e:smoke
./scripts/verify full
```

Expected: all commands pass; quick/full are read-only; browser evidence still matches current code; no Golden Journey checkpoint is requested.

- [ ] **Step 6: scope와 dependency adversarial review**

Run:

```bash
git diff --name-only HEAD~3
git status --short
git diff --check HEAD~3
test ! -e components.json
test ! -d src/app
test ! -d src/pages
test ! -d src/widgets
test ! -d src/features
test ! -d src/entities
test ! -d src/shared
```

Expected: diff contains only File Map paths; all absence checks pass; no route, provider, handler, fixture, product component, or FSD layer exists; pre-existing untracked artifact remains untouched.

- [ ] **Step 7: Task 4 commit**

```bash
git add docs/quality/requirements.md docs/quality/evidence/frontend-scaffolding.md
git commit -m "docs(scaffold): 개발 기반 검증 근거 기록"
```

- [ ] **Step 8: final handoff evidence 확인**

Run:

```bash
./scripts/verify full
git status --short
git log -4 --oneline
```

Expected: full verification passes on Task 4 commit; status shows no tracked changes; four commits appear in Task 1–4 order; user-owned untracked artifact remains unmodified. Report scaffolding ready, not assignment complete, and propose separate FSD architecture design as next work.

---

## Self-Review Result

- Spec coverage: development toolchain, strict typecheck, read-only verification, Tailwind token, Pretendard self-hosting, OpenAPI generation, MSW worker, shadcn CLI deferral, browser smoke, evidence status all map to Tasks 1–4.
- Scope: no product route, provider, layout, component, API handler, auth policy, FSD layer, or `components.json` creation step exists.
- Type consistency: `@/*` maps to `src/*` in both TypeScript and Vite/Vitest; generated exports consumed as `paths` and `components`; package script names match `scripts/verify` requirements.
- Placeholder scan: dynamic commit SHA is captured by an exact command and must be written as its returned 40-character value; no undecided implementation item remains.
- Verification: every mutation is followed by focused checks; `pnpm format` remains separate from read-only quick/full verification.
