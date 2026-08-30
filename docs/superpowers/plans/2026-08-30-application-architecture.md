# 애플리케이션 아키텍처 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 FSD import 경계, 다섯 route와 provider composition, generated 계약 기반 HTTP 오류 경계를 독립적으로 검증 가능한 세 작업으로 구현한다.

**Architecture:** FSD layer는 `app → pages → widgets → features → entities → shared` 방향만 허용하고 실제 소비 시점에만 directory와 public API를 만든다. `main.tsx`는 DEV에서만 MSW browser entry를 동적 import하고, application은 QueryClient와 router만 조합한다. `shared/api`는 generated type을 독점 소비하고 `ApiError` 판별 union으로 HTTP, invalid response, network, abort를 구분한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3, React Router 7.18.3, TanStack Query 5.102.8, Fetch API, MSW 2.15.0, Biome 2.5.11, Vitest 4.1.11, Testing Library, Playwright 1.62.1

## Global Constraints

- `assignment-original/openapi.yaml`을 API 세부 계약의 최우선 출처로 사용한다.
- 새 dependency를 추가하거나 기존 dependency를 교체하지 않는다.
- `DEC-AUTH-01` 승인 전 auth provider, context, adapter, token storage, 보호 route를 만들지 않는다.
- `DEC-DELETE-01` 승인 전 삭제 이후 cache나 mock fixture mutation을 만들지 않는다.
- generated module은 `shared/api`만 import하고 public API로 re-export하지 않는다.
- `mocks/browser`는 `import.meta.env.DEV` 분기에서만 동적 import한다.
- 빈 layer, 빈 directory, 빈 `index.ts`, 미사용 endpoint adapter, 미사용 공통 상태 UI를 만들지 않는다.
- 내부 상대 import와 slice public API import만 허용한다.
- query retry는 기본 비활성화하며 기능별 retry는 accepted behavior가 있을 때만 추가한다.
- route error boundary는 render와 React Router route 오류만 담당한다.
- `ApiError.kind === "aborted"`는 사용자 오류 UI나 알림을 만들지 않는 취소 제어 흐름이다.
- production 변경은 RED–GREEN–REFACTOR 순서로 수행한다.
- 각 Task 시작 전에 해당 TODO item의 dependency가 실제로 해소되었는지 확인한다. 특히 `ARCH-01`은 `DEC-ARCH-01`과 `SCF-04` evidence 없이는 실행하지 않는다.
- 자동 검증은 repository를 수정하지 않는다. format 변경은 `pnpm format`으로 분리한다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.

---

## File Map

### Task 1: `ARCH-01` import 경계

- Modify: `biome.json` — alias import의 빠른 FSD lint guard.
- Move: `src/test/openapi-contract.test.ts` → `src/shared/api/openapi-contract.test.ts` — generated type의 유일한 기존 소비를 승인 경계로 이동.
- Create: `src/test/architecture-contract.test.ts` — 상대 경로 우회까지 resolve하는 architecture contract.
- Modify: `TODO.md` — `ARCH-01` RED/GREEN과 quick evidence 기록.

`shared/api`에는 이 test만 존재하며 `index.ts`나 production client는 만들지 않는다.

### Task 2: `ARCH-02` provider와 route composition

- Modify: `src/main.tsx` — DEV mock 시작 후 React application mount.
- Create: `src/app/index.tsx` — QueryClientProvider와 RouterProvider 조합, `App` 공개.
- Create: `src/app/query-client.ts` — isolated QueryClient 생성.
- Create: `src/app/router.tsx` — 다섯 route와 root layout route.
- Create: `src/app/route-error-boundary.tsx` — render/route error output.
- Create: `src/app/router.test.tsx` — route, shell, error boundary integration.
- Create: `src/app/query-client.test.ts` — retry 기본값 contract.
- Create: `src/pages/dashboard/index.tsx` — dashboard route boundary.
- Create: `src/pages/sign-in/index.tsx` — sign-in route boundary.
- Create: `src/pages/task-list/index.tsx` — task list route boundary.
- Create: `src/pages/task-detail/index.tsx` — task detail route boundary.
- Create: `src/pages/user/index.tsx` — user route boundary.
- Create: `src/widgets/app-shell/index.tsx` — dashboard/task navigation과 outlet.
- Create: `src/mocks/browser.ts` — handler 없는 실제 MSW browser lifecycle entry.
- Create: `e2e/architecture.smoke.spec.ts` — route 직접 진입과 worker browser smoke.
- Modify: `TODO.md` — `ARCH-02` 자동/browser evidence 기록.

### Task 3: `ARCH-03` typed HTTP와 MSW test 경계

- Create: `src/shared/api/api-error.ts` — `ApiError` 판별 union.
- Create: `src/shared/api/request.ts` — generated `ErrorResponse`와 runtime guard를 사용하는 private transport.
- Create: `src/shared/api/request.test.ts` — success, HTTP, invalid response, network, abort 검증.
- Create: `src/mocks/server.ts` — Vitest용 MSW server lifecycle 대상.
- Modify: `src/test/setup.ts` — server listen/reset/close.
- Modify: `TODO.md` — `ARCH-03` RED/GREEN과 quick evidence 기록.

`shared/api/index.ts`, endpoint adapter, production handler, fixture, 공통 상태 UI는 실제 기능 소비자가 없으므로 이 Task에서 만들지 않는다.

---

### Task 1: FSD import와 generated 독점 경계

**Requirement IDs:** 전체 기능 requirement의 구조 기반, `SYS-04`

**Files:**

- Modify: `biome.json`
- Move: `src/test/openapi-contract.test.ts` → `src/shared/api/openapi-contract.test.ts`
- Create: `src/test/architecture-contract.test.ts`
- Modify: `TODO.md`

**Interfaces:**

- Consumes: `@/* → src/*`, current generated contract at `src/generated/openapi.ts`.
- Produces: Biome alias guard; relative/alias import resolver test; `shared/api`만 generated import 가능.

- [ ] **Step 1: `ARCH-01` dependency와 작업 상태 확인**

Run:

```bash
git status --short
rg -n -A14 "DEC-ARCH-01|SCF-04|ARCH-01" TODO.md
```

Expected: worktree에 다른 작업자의 관련 diff가 없고 `DEC-ARCH-01`, `SCF-04` dependency evidence가 확인된다. 해소되지 않았으면 코드 변경 없이 중단하고 blocker를 기록한다.

- [ ] **Step 2: architecture contract RED test 작성**

Create `src/test/architecture-contract.test.ts`:

```ts
/// <reference types="node" />
// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
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

function moduleSpecifiers(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const values: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      values.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      values.push(node.arguments[0].text);
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
    for (const specifier of moduleSpecifiers(file)) {
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

      if (target[0] === "mocks" && relative(sourceRoot, file) !== "main.tsx" && !isTestFile(file)) {
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

      if (sourceLayer === targetLayer && source[1] !== target[1]) {
        failures.push(`${relative(sourceRoot, file)} crosses same-layer slices via ${specifier}`);
      }

      if (specifier.startsWith("@/") && sourceLayer === targetLayer) {
        failures.push(`${relative(sourceRoot, file)} aliases inside its own layer via ${specifier}`);
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
  it("keeps FSD direction, public APIs, mocks, and generated boundaries", () => {
    expect(violations()).toEqual([]);
  });
});
```

- [ ] **Step 3: RED가 기존 generated import를 잡는지 확인**

Run:

```bash
pnpm vitest run src/test/architecture-contract.test.ts
```

Expected: FAIL containing `test/openapi-contract.test.ts imports @/generated/openapi outside shared/api`.

- [ ] **Step 4: 기존 generated 계약 test를 승인 위치로 이동**

Run:

```bash
mkdir -p src/shared/api
git mv src/test/openapi-contract.test.ts src/shared/api/openapi-contract.test.ts
```

Do not create `src/shared/api/index.ts`.

- [ ] **Step 5: Biome alias guard 추가**

In `biome.json`, add `style.noRestrictedImports` beneath the existing recommended rules:

```json
"style": {
  "noRestrictedImports": {
    "level": "error",
    "options": {
      "patterns": [
        {
          "group": [
            "@/app/*",
            "@/pages/*/*",
            "@/widgets/*/*",
            "@/features/*/*",
            "@/entities/*/*",
            "@/shared/*/*"
          ],
          "message": "Slice 외부에서는 public API만 import하세요."
        }
      ]
    }
  }
}
```

Add these top-level overrides. Each later override intentionally replaces the rule for its narrower source scope:

```json
"overrides": [
  {
    "includes": ["src/app/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/*/*", "@/widgets/*/*", "@/features/*/*", "@/entities/*/*", "@/shared/*/*", "@/mocks/**", "@/generated/**"],
                  "message": "app 내부 상대 import와 하위 layer public API만 사용하세요."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/pages/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/*/*", "@/features/*/*", "@/entities/*/*", "@/shared/*/*", "@/mocks/**", "@/generated/**"],
                  "message": "pages는 같은 layer나 상위 layer를 import할 수 없습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/widgets/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/**", "@/features/*/*", "@/entities/*/*", "@/shared/*/*", "@/mocks/**", "@/generated/**"],
                  "message": "widgets는 같은 layer나 상위 layer를 import할 수 없습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/features/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/**", "@/features/**", "@/entities/*/*", "@/shared/*/*", "@/mocks/**", "@/generated/**"],
                  "message": "features는 같은 layer나 상위 layer를 import할 수 없습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/entities/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/**", "@/features/**", "@/entities/**", "@/shared/*/*", "@/mocks/**", "@/generated/**"],
                  "message": "entities는 같은 layer나 상위 layer를 import할 수 없습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/shared/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/**", "@/features/**", "@/entities/**", "@/shared/**", "@/mocks/**", "@/generated/**"],
                  "message": "shared는 다른 layer, slice, mocks, generated를 import할 수 없습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/shared/api/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/**", "@/pages/**", "@/widgets/**", "@/features/**", "@/entities/**", "@/shared/**", "@/mocks/**"],
                  "message": "shared/api는 generated와 내부 상대 import만 추가로 사용할 수 있습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/**/*.{test,spec}.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/*", "@/pages/*/*", "@/widgets/*/*", "@/features/*/*", "@/entities/*/*", "@/shared/*/*", "@/generated/**"],
                  "message": "Test도 public API를 사용하며 generated를 직접 import하지 않습니다."
                }
              ]
            }
          }
        }
      }
    }
  },
  {
    "includes": ["src/shared/api/**/*.{test,spec}.{ts,tsx}"],
    "linter": {
      "rules": {
        "style": {
          "noRestrictedImports": {
            "level": "error",
            "options": {
              "patterns": [
                {
                  "group": ["@/app/*", "@/pages/*/*", "@/widgets/*/*", "@/features/*/*", "@/entities/*/*", "@/shared/*/*"],
                  "message": "shared/api test는 generated와 mocks만 경계 예외로 사용합니다."
                }
              ]
            }
          }
        }
      }
    }
  }
]
```

- [ ] **Step 6: GREEN과 전체 quick 검증**

Run:

```bash
pnpm vitest run src/test/architecture-contract.test.ts src/shared/api/openapi-contract.test.ts
./scripts/verify quick
```

Expected: both focused test files PASS; format, lint, typecheck, and all Vitest suites PASS without repository mutation.

- [ ] **Step 7: `ARCH-01` evidence 기록과 커밋**

Update only the `ARCH-01` row in `TODO.md`: status `AI_VERIFIED`, RED failure, GREEN commands, `./scripts/verify quick` result, and browser not applicable. AI does not change `DEC-ARCH-01` to `HUMAN_APPROVED`.

Run:

```bash
git diff --check
git diff --stat
git add biome.json src/test/architecture-contract.test.ts src/shared/api/openapi-contract.test.ts TODO.md
git commit -m "chore(architecture): FSD import 경계 적용"
```

Expected: one commit containing only `ARCH-01` files and evidence.

---

### Task 2: App provider와 다섯 route composition

**Requirement IDs:** `NAV-01`, route 기반 전체 requirement의 구조 경계

**Files:**

- Modify: `src/main.tsx`
- Create: `src/app/index.tsx`
- Create: `src/app/query-client.ts`
- Create: `src/app/router.tsx`
- Create: `src/app/route-error-boundary.tsx`
- Create: `src/app/router.test.tsx`
- Create: `src/app/query-client.test.ts`
- Create: `src/pages/dashboard/index.tsx`
- Create: `src/pages/sign-in/index.tsx`
- Create: `src/pages/task-list/index.tsx`
- Create: `src/pages/task-detail/index.tsx`
- Create: `src/pages/user/index.tsx`
- Create: `src/widgets/app-shell/index.tsx`
- Create: `src/mocks/browser.ts`
- Create: `e2e/architecture.smoke.spec.ts`
- Modify: `TODO.md`

**Interfaces:**

- Consumes: `App` from `@/app`; page components from each page public entry; `AppShell` from `@/widgets/app-shell`.
- Produces: `App`; `createAppQueryClient()` internal app function; `appRoutes` internal route table; `startWorker()` specialized mock entry.

- [ ] **Step 1: `ARCH-02` 상태를 시작하고 route RED tests 작성**

Set `ARCH-02` to `IN_PROGRESS` in `TODO.md` with the active session and requirement IDs.

Create `src/app/query-client.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAppQueryClient } from "./query-client";

describe("app query client", () => {
  it("does not retry queries without accepted behavior", () => {
    const client = createAppQueryClient();

    expect(client.getDefaultOptions().queries?.retry).toBe(false);
  });
});
```

Create `src/app/router.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./route-error-boundary";
import { appRoutes } from "./router";

afterEach(() => vi.restoreAllMocks());

describe("app router", () => {
  it.each([
    ["/", "대시보드"],
    ["/sign-in", "로그인"],
    ["/task", "할 일"],
    ["/task/task-1", "할 일 상세"],
    ["/user", "회원정보"],
  ])("resolves %s to its page boundary", async (path, heading) => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("href", "/task");
  });

  it("renders the route error boundary for render failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function BrokenPage(): never {
      throw new Error("render failure");
    }
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <BrokenPage />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("화면을 불러오지 못했습니다");
  });
});
```

Create `e2e/architecture.smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("@architecture resolves every route and starts the DEV mock worker", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [path, heading] of [
    ["/", "대시보드"],
    ["/sign-in", "로그인"],
    ["/task", "할 일"],
    ["/task/task-1", "할 일 상세"],
    ["/user", "회원정보"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "대시보드" })).toBeVisible();
    await expect(page.getByRole("link", { name: "할 일" })).toBeVisible();
  }

  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? "";
  });

  expect(workerUrl).toContain("/mockServiceWorker.js");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  await test.info().attach("architecture-routes", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
```

- [ ] **Step 2: unit과 browser RED 확인**

Run:

```bash
pnpm vitest run src/app/query-client.test.ts src/app/router.test.tsx
pnpm exec playwright test e2e/architecture.smoke.spec.ts
```

Expected: Vitest FAIL because `query-client`, `router`, and `route-error-boundary` do not exist; Playwright FAIL because the route headings do not exist.

- [ ] **Step 3: route page public entries 작성**

Create the five files with these complete bodies:

```tsx
// src/pages/dashboard/index.tsx
export function DashboardPage() {
  return <h1>대시보드</h1>;
}
```

```tsx
// src/pages/sign-in/index.tsx
export function SignInPage() {
  return <h1>로그인</h1>;
}
```

```tsx
// src/pages/task-list/index.tsx
export function TaskListPage() {
  return <h1>할 일</h1>;
}
```

```tsx
// src/pages/task-detail/index.tsx
export function TaskDetailPage() {
  return <h1>할 일 상세</h1>;
}
```

```tsx
// src/pages/user/index.tsx
export function UserPage() {
  return <h1>회원정보</h1>;
}
```

- [ ] **Step 4: AppShell과 route error boundary 작성**

Create `src/widgets/app-shell/index.tsx`:

```tsx
import { ListTodo, LayoutDashboard } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <>
      <header>
        <nav aria-label="주요 메뉴">
          <NavLink end to="/">
            <LayoutDashboard aria-hidden="true" />
            대시보드
          </NavLink>
          <NavLink to="/task">
            <ListTodo aria-hidden="true" />
            할 일
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
```

Create `src/app/route-error-boundary.tsx`:

```tsx
import { useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  useRouteError();

  return (
    <main role="alert">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>페이지를 다시 열어주세요.</p>
    </main>
  );
}
```

Do not add event-handler listeners or global unhandled-rejection handling to this component.

- [ ] **Step 5: QueryClient와 router composition 작성**

Create `src/app/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}
```

Create `src/app/router.tsx`:

```tsx
import { DashboardPage } from "@/pages/dashboard";
import { SignInPage } from "@/pages/sign-in";
import { TaskDetailPage } from "@/pages/task-detail";
import { TaskListPage } from "@/pages/task-list";
import { UserPage } from "@/pages/user";
import { AppShell } from "@/widgets/app-shell";
import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { RouteErrorBoundary } from "./route-error-boundary";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "sign-in", element: <SignInPage /> },
      { path: "task", element: <TaskListPage /> },
      { path: "task/:id", element: <TaskDetailPage /> },
      { path: "user", element: <UserPage /> },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
```

Create `src/app/index.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createAppQueryClient } from "./query-client";
import { appRouter } from "./router";

const queryClient = createAppQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={appRouter} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: DEV-only browser mock bootstrap 작성**

Create `src/mocks/browser.ts`:

```ts
import { setupWorker } from "msw/browser";

const worker = setupWorker();

export function startWorker() {
  return worker.start({ onUnhandledRequest: "bypass" });
}
```

Replace `src/main.tsx` with:

```tsx
import "@/styles/globals.css";
import { App } from "@/app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { startWorker } = await import("@/mocks/browser");
    await startWorker();
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("React root element is missing");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
```

Do not catch the bootstrap promise; MSW startup failure must remain visible.

- [ ] **Step 7: unit GREEN 확인**

Run:

```bash
pnpm vitest run src/app/query-client.test.ts src/app/router.test.tsx
```

Expected: 7 tests PASS: one query default, five route boundaries, one render error boundary.

- [ ] **Step 8: browser GREEN 확인**

Run:

```bash
pnpm exec playwright test e2e/architecture.smoke.spec.ts
```

Expected after GREEN: one Chromium test PASS with active `/mockServiceWorker.js`, no console errors, and no page errors.

- [ ] **Step 9: quick verification과 agent-browser 확인**

Run:

```bash
./scripts/verify quick
pnpm dev --host 127.0.0.1 --port 4173
```

In another terminal, run:

```bash
agent-browser --session arch-02 open http://127.0.0.1:4173/
agent-browser --session arch-02 snapshot -i
agent-browser --session arch-02 get text body
agent-browser --session arch-02 open http://127.0.0.1:4173/task/task-1
agent-browser --session arch-02 snapshot -i
agent-browser --session arch-02 network requests --filter mockServiceWorker
agent-browser --session arch-02 console
agent-browser --session arch-02 errors
agent-browser --session arch-02 screenshot /tmp/kbhc-arch-02-routes.png
agent-browser --session arch-02 close
```

Expected: dashboard/task navigation remains visible, direct task detail entry shows `할 일 상세`, worker request succeeds, console/errors are empty, and the session closes.

- [ ] **Step 10: `ARCH-02` evidence 기록과 커밋**

Record RED/GREEN, quick, Playwright, and agent-browser evidence in `TODO.md` using the browser evidence fields from `docs/coding-standards.md`.

Run:

```bash
git diff --check
git diff --stat
git add src/main.tsx src/app src/pages src/widgets/app-shell src/mocks/browser.ts e2e/architecture.smoke.spec.ts TODO.md
git commit -m "feat(architecture): 앱 provider와 route 구성"
```

Expected: one `ARCH-02` commit; no auth placeholder, API handler, feature, or entity directory.

---

### Task 3: Generated 계약 기반 HTTP 오류와 MSW test harness

**Requirement IDs:** 모든 API requirement의 공통 transport 경계, `SYS-04`

**Files:**

- Create: `src/shared/api/api-error.ts`
- Create: `src/shared/api/request.ts`
- Create: `src/shared/api/request.test.ts`
- Create: `src/mocks/server.ts`
- Modify: `src/test/setup.ts`
- Modify: `TODO.md`

**Interfaces:**

- Consumes: generated `components["schemas"]["ErrorResponse"]` inside `shared/api` only; global Fetch API; MSW test server.
- Produces: internal `requestJson<T>(input, init, isSuccess): Promise<T>`; `ApiError` union for later public endpoint adapters.

- [ ] **Step 1: `ARCH-03` 상태를 시작하고 MSW test lifecycle 작성**

Set `ARCH-03` to `IN_PROGRESS` in `TODO.md` after confirming `ARCH-01` and `SCF-03` are complete.

Create `src/mocks/server.ts`:

```ts
import { setupServer } from "msw/node";

export const server = setupServer();
```

Replace `src/test/setup.ts` with:

```ts
import "@testing-library/jest-dom/vitest";
import { server } from "@/mocks/server";
import { afterAll, afterEach, beforeAll } from "vitest";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

The server has no production handler array. Each transport test registers only its own handler with `server.use`.

- [ ] **Step 2: HTTP boundary RED tests 작성**

Create `src/shared/api/request.test.ts`:

```ts
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "./request";

type DashboardResponse = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

function isDashboardResponse(value: unknown): value is DashboardResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.numOfTask === "number" &&
    typeof data.numOfRestTask === "number" &&
    typeof data.numOfDoneTask === "number"
  );
}

afterEach(() => vi.restoreAllMocks());

describe("requestJson", () => {
  it("returns a valid success response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () =>
        HttpResponse.json({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).resolves.toEqual({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
  });

  it("preserves status and errorMessage for a valid non-2xx response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () =>
        HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "http", status: 401, message: "인증이 필요합니다." });
  });

  it("classifies non-JSON as an invalid response", async () => {
    server.use(
      http.get(
        "http://localhost/api/dashboard",
        () => new HttpResponse("not-json", { status: 200, headers: { "Content-Type": "text/plain" } }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({
      kind: "invalid-response",
      status: 200,
      message: "API 응답 형식이 올바르지 않습니다.",
    });
  });

  it("classifies a schema mismatch as an invalid response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () => HttpResponse.json({ numOfTask: "3" })),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({
      kind: "invalid-response",
      status: 200,
      message: "API 응답 형식이 올바르지 않습니다.",
    });
  });

  it("classifies fetch failure as a network error", async () => {
    server.use(http.get("http://localhost/api/dashboard", () => HttpResponse.error()));

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "network", message: "네트워크 요청에 실패했습니다." });
  });

  it("classifies AbortError without a user-facing error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "aborted", message: "요청이 취소되었습니다." });
  });
});
```

- [ ] **Step 3: RED 확인**

Run:

```bash
pnpm vitest run src/shared/api/request.test.ts
```

Expected: FAIL because `./request` does not exist.

- [ ] **Step 4: `ApiError` union과 최소 transport 구현**

Create `src/shared/api/api-error.ts`:

```ts
export type ApiError =
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid-response"; status: number; message: string }
  | { kind: "network"; message: string }
  | { kind: "aborted"; message: string };
```

Create `src/shared/api/request.ts`:

```ts
import type { components } from "@/generated/openapi";
import type { ApiError } from "./api-error";

type ErrorResponse = components["schemas"]["ErrorResponse"];
type Guard<T> = (value: unknown) => value is T;

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).errorMessage === "string"
  );
}

function invalidResponse(status: number): ApiError {
  return {
    kind: "invalid-response",
    status,
    message: "API 응답 형식이 올바르지 않습니다.",
  };
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  isSuccess: Guard<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw { kind: "aborted", message: "요청이 취소되었습니다." } satisfies ApiError;
    }
    throw { kind: "network", message: "네트워크 요청에 실패했습니다." } satisfies ApiError;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw invalidResponse(response.status);
  }

  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw {
        kind: "http",
        status: response.status,
        message: body.errorMessage,
      } satisfies ApiError;
    }
    throw invalidResponse(response.status);
  }

  if (!isSuccess(body)) {
    throw invalidResponse(response.status);
  }

  return body;
}
```

Do not export these files through `src/shared/api/index.ts`; no production endpoint consumer exists yet.

- [ ] **Step 5: GREEN, adjacent suite, quick 검증**

Run:

```bash
pnpm vitest run src/shared/api/request.test.ts src/shared/api/openapi-contract.test.ts src/test/architecture-contract.test.ts
./scripts/verify quick
```

Expected: six request tests and both contract files PASS; format, lint, typecheck, and the full Vitest suite PASS without repository mutation.

- [ ] **Step 6: abort UI semantics와 범위 확인**

Run:

```bash
rg -n "aborted|ApiError|requestJson|generated/openapi|fetch\(" src
git diff --check
git diff --stat
```

Expected: `aborted` exists only as transport/test control flow; no user error component or notification exists; generated import is under `src/shared/api`; raw fetch exists only in `request.ts`; no endpoint adapter, handler, fixture, shared UI, auth, or delete cache code appears.

- [ ] **Step 7: `ARCH-03` evidence 기록과 커밋**

Update only `ARCH-03` in `TODO.md` with RED/GREEN commands, `./scripts/verify quick`, and `Browser verification: 독립 UI 없음; 첫 실제 화면 소비 작업으로 이관`.

Run:

```bash
git add src/shared/api/api-error.ts src/shared/api/request.ts src/shared/api/request.test.ts src/mocks/server.ts src/test/setup.ts TODO.md
git commit -m "feat(api): 공통 HTTP 오류 경계 추가"
```

Expected: one `ARCH-03` commit with no public barrel, product handler, fixture, state UI, auth behavior, or delete semantics.

---

## Final Plan Verification

After all three Tasks and their individual commits:

```bash
./scripts/verify full
git status --short
git log -3 --oneline
```

Expected: setup, format check, lint, typecheck, Vitest, build, and current core E2E selection PASS; worktree clean; the last three commits correspond to `ARCH-01`, `ARCH-02`, and `ARCH-03` only.

Run one lightweight adversarial architecture review against
`docs/superpowers/specs/2026-08-30-application-architecture-design.md`: check reverse imports, deep imports, generated leakage, static mocks import, auth placeholder, route error overclaim, aborted user UI, empty layer/public API, and unrelated feature behavior. Record and fix findings before requesting the architecture human checkpoint.
