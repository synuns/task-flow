# Focus Workspace Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 Focus workspace 설계를 shadcn/ui primitive, 오케어 Yellow palette, desktop sidebar와 icon·label mobile bottom navigation으로 구현하면서 기존 다섯 route와 네 Golden Journey의 동작을 보존한다.

**Architecture:** 기존 FSD와 data flow는 유지한다. 공식 shadcn registry 파일은 `src/shared/ui`에만 두고 각 page/widget/feature는 public barrel인 `@/shared/ui`만 소비한다. Layout과 상태 표현만 교체하며 TanStack Query, React Hook Form, 인증 route boundary, task virtualizer와 삭제 resolution은 그대로 둔다.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Tailwind CSS 4, shadcn/ui 4.19 official registry, Radix UI, Lucide React, Vitest, Testing Library, Playwright, agent-browser

## Global Constraints

- Source authority는 `assignment-original/openapi.yaml` → `assignment-original/requirement.md` → `docs/quality/requirements.md` 순서다.
- 구현 기준은 `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`다.
- 인증 정책, destructive-data semantics, API schema, query/cache 의미와 FSD 방향은 변경하지 않는다.
- 새 검색·정렬·filter·create/edit/logout/theme-toggle 기능이나 새 image asset을 만들지 않는다.
- Ocare Yellow `#FFD700`, Ocare Sky `#E0E8F1`, Surface `#FFFFFF`, Ink `#1F242B`, Muted `#616A75`, Destructive `#B33A32`, focus ring `#8A6D00`을 `src/styles/globals.css`에서만 정의한다.
- Mobile navigation은 서로 다른 Lucide icon과 visible label을 함께 쓰고 각 target을 48px 이상으로 유지한다.
- Native `nav`, `dl`, `time`, `form`, React Router `NavLink`는 shadcn component로 감싸지 않는다.
- 세 navigation action에 shadcn `Sidebar`를 추가하지 않는다.
- Registry component의 domain-neutral source 외에 새 shared abstraction을 만들지 않는다.
- Dependency와 registry source 추가는 HIGH-risk다. 아래의 정확한 package·file diff를 사용자에게 제시하고 명시적 승인을 받은 뒤에만 Task 1의 mutation을 진행한다.
- 실행 session은 먼저 `DEC-UI-01`을 소유하고 결정이 닫힌 뒤 `UI-IMPLEMENT-01`을 소유한다. 기존 session이 소유한 Journey task block은 수정하지 않는다.
- 각 task는 focused test → `./scripts/verify quick` → evidence → Conventional Commit 순서로 닫는다.
- AI는 Journey나 최종 수용을 `HUMAN_APPROVED`로 표시하지 않는다.

---

## File Structure

- Create: `components.json` — shadcn Vite/Tailwind v4, Lucide, `src/shared/ui` registry target
- Create: `src/shared/ui/utils.ts` — registry-local `cn` helper
- Create: `src/shared/ui/button.tsx`
- Create: `src/shared/ui/input.tsx`
- Create: `src/shared/ui/label.tsx`
- Create: `src/shared/ui/card.tsx`
- Create: `src/shared/ui/alert.tsx`
- Create: `src/shared/ui/dialog.tsx`
- Create: `src/shared/ui/alert-dialog.tsx`
- Create: `src/shared/ui/skeleton.tsx`
- Create: `src/shared/ui/progress.tsx`
- Create: `src/shared/ui/shadcn-primitives.test.tsx` — registry export와 dialog accessibility integration
- Modify: `src/shared/ui/index.ts` — primitive public exports
- Delete after both consumers migrate: `src/shared/ui/modal.tsx`
- Modify: `package.json`, `pnpm-lock.yaml` — approved registry runtime dependencies only
- Modify: `src/styles/globals.css` — Ocare palette, shadcn token, layout base, reduced motion
- Modify: `src/test/theme-contract.test.ts` — exact palette and semantic-token contract
- Modify: `src/widgets/app-shell/index.tsx` — responsive sidebar/bottom navigation
- Modify: `src/app/router.test.tsx` — navigation labels, icons, current route
- Modify: `src/pages/dashboard/index.tsx`
- Modify: `src/widgets/dashboard-summary/index.tsx`
- Modify: `src/widgets/dashboard-summary/dashboard-summary.test.tsx`
- Modify: `src/pages/sign-in/index.tsx`
- Modify: `src/features/sign-in/ui/sign-in-form.tsx`
- Modify: `src/features/sign-in/ui/sign-in-form.test.tsx`
- Modify: `src/pages/task-list/index.tsx`
- Modify: `src/widgets/task-list/index.tsx`
- Modify: `src/widgets/task-list/task-list.test.tsx`
- Modify: `src/entities/task/ui/task-card.tsx`
- Modify: `src/entities/task/ui/task-card.test.tsx`
- Modify: `src/pages/task-detail/index.tsx`
- Modify: `src/pages/task-detail/task-detail.test.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Modify: `src/pages/user/index.tsx`
- Modify: `src/widgets/user-profile/index.tsx`
- Modify: `src/widgets/user-profile/user-profile.test.tsx`
- Modify only where a cross-boundary visual assertion is needed: `e2e/auth-entry.spec.ts`, `e2e/work-overview.spec.ts`, `e2e/task-discovery.spec.ts`, `e2e/task-resolution.spec.ts`
- Modify: `TODO.md` — `DEC-UI-01`, `UI-IMPLEMENT-01` evidence and plan-completion review; never AI-authored `HUMAN_APPROVED`

### Task 1: HIGH dependency decision and official shadcn primitive integration

**Requirements:** `SYS-02`, approved shadcn/ui component mapping

**Files:**
- Create: `components.json`
- Create: `src/shared/ui/utils.ts`
- Create: nine `src/shared/ui/*.tsx` registry files listed above
- Create: `src/shared/ui/shadcn-primitives.test.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/test/theme-contract.test.ts`
- Modify: `src/styles/globals.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Tailwind v4 semantic utilities, existing `@/*` alias, Lucide React
- Produces: `Button`, `Input`, `Label`, `Card`, `Alert`, `Dialog`, `AlertDialog`, `Skeleton`, `Progress` from `@/shared/ui`

- [ ] **Step 1: exact HIGH-risk dependency decision을 받기**

Run the read-only registry inspection:

```bash
pnpm dlx shadcn@latest view @shadcn/button @shadcn/input @shadcn/label @shadcn/card @shadcn/alert @shadcn/dialog @shadcn/alert-dialog @shadcn/skeleton @shadcn/progress
```

Present this exact proposed runtime addition and stop before mutation:

```text
radix-ui                 Dialog, AlertDialog, Label, Progress, Button Slot
class-variance-authority Button와 Alert variant
clsx                     registry-local cn 조건 병합
tailwind-merge           registry-local cn Tailwind class 병합
tw-animate-css           Dialog/AlertDialog open·close utility
```

`lucide-react` is already installed. Recommendation: approve these five packages and only the nine listed registry components. Record the user's explicit decision in `TODO.md` `DEC-UI-01`. If any package differs when `--dry-run` is executed, stop and re-request approval with the new diff. Set `DEC-UI-01` to `AI_VERIFIED` only after the approved diff and read-only verification match; this is not Journey acceptance.

- [ ] **Step 2: primitive public contract의 failing test 작성**

Create `src/shared/ui/shadcn-primitives.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from ".";

describe("shadcn primitive integration", () => {
  it("exports a semantic button and an accessible controlled dialog", () => {
    render(
      <>
        <Button>계속</Button>
        <Dialog open>
          <DialogContent>
            <DialogTitle>확인</DialogTitle>
            <DialogDescription>계속 진행합니다.</DialogDescription>
            <Button>닫기</Button>
          </DialogContent>
        </Dialog>
      </>,
    );

    expect(screen.getByRole("button", { name: "계속" })).toHaveAttribute(
      "data-slot",
      "button",
    );
    expect(screen.getByRole("dialog", { name: "확인" })).toHaveAccessibleDescription(
      "계속 진행합니다.",
    );
  });
});
```

- [ ] **Step 3: focused test가 missing exports로 RED인지 확인**

```bash
pnpm vitest run src/shared/ui/shadcn-primitives.test.tsx
```

Expected: FAIL because `Button`, `Dialog`, `DialogContent`, `DialogDescription`, and `DialogTitle` are not exported.

- [ ] **Step 4: registry target config 작성 후 dry-run 확인**

Create `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/shared/ui",
    "utils": "@/shared/ui/utils",
    "ui": "@/shared/ui",
    "lib": "@/shared/ui",
    "hooks": "@/shared/ui"
  }
}
```

```bash
pnpm dlx shadcn@latest add button input label card alert dialog alert-dialog skeleton progress --dry-run
```

Expected: only the nine registry files, `src/shared/ui/utils.ts`, the five approved runtime packages, `package.json`, and `pnpm-lock.yaml`. No color token replacement, route, auth, API, or unrelated file.

- [ ] **Step 5: approved registry files 설치 및 FSD-local import 정규화**

```bash
pnpm dlx shadcn@latest add button input label card alert dialog alert-dialog skeleton progress --yes
```

In every generated `src/shared/ui/*.tsx`, replace the generated alias imports with same-slice relative imports:

```ts
import { cn } from "./utils";
import { Button } from "./button";
```

Use this exact `src/shared/ui/utils.ts` body if the CLI emits another location:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

The repository color contract rejects the two raw palette utilities emitted by the current registry. Normalize all occurrences exactly:

```text
bg-black/50 → bg-foreground/50
text-white  → text-destructive-foreground
```

Add `destructive-foreground` to `colorTokens` in `src/test/theme-contract.test.ts`, define it in both `:root` and `.dark`, and expose `--color-destructive-foreground: var(--destructive-foreground);` in `@theme inline`. This is the only semantic token required by the registry that is absent today.

Add `@import "tw-animate-css";` directly after Tailwind in `src/styles/globals.css` only if it appears in the approved dry-run.

- [ ] **Step 6: public barrel에서 component를 export**

Replace `src/shared/ui/index.ts` with exports for the exact generated symbols:

```ts
export * from "./alert";
export * from "./alert-dialog";
export * from "./button";
export * from "./card";
export * from "./dialog";
export * from "./input";
export * from "./label";
export * from "./progress";
export * from "./skeleton";
export { Modal } from "./modal";
```

Keep `Modal` temporarily until auth and delete consumers migrate.

- [ ] **Step 7: primitive, architecture, theme contract GREEN 확인**

```bash
pnpm vitest run src/shared/ui/shadcn-primitives.test.tsx src/test/architecture-contract.test.ts src/test/theme-contract.test.ts
./scripts/verify quick
```

Expected: all focused tests and quick verification PASS; no alias/deep-import violation.

- [ ] **Step 8: commit**

```bash
git add components.json package.json pnpm-lock.yaml src/shared/ui src/styles/globals.css src/test/theme-contract.test.ts
git commit -m "feat(ui): shadcn 공통 컴포넌트 추가"
```

### Task 2: Ocare semantic theme and common visual grammar

**Requirements:** `SYS-02`, `SYS-03`

**Files:**
- Modify: `src/test/theme-contract.test.ts`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: approved six-color palette and existing shadcn token names
- Produces: semantic Tailwind colors, focus, page typography, reduced-motion behavior

- [ ] **Step 1: exact palette contract를 먼저 추가**

Add to the first test in `src/test/theme-contract.test.ts`:

```ts
expect(root).toContain("--primary: #ffd700;");
expect(root).toContain("--secondary: #e0e8f1;");
expect(root).toContain("--card: #ffffff;");
expect(root).toContain("--foreground: #1f242b;");
expect(root).toContain("--muted-foreground: #616a75;");
expect(root).toContain("--destructive: #b33a32;");
expect(root).toContain("--destructive-foreground: #ffffff;");
expect(root).toContain("--ring: #8a6d00;");
```

- [ ] **Step 2: existing KB token values 때문에 RED인지 확인**

```bash
pnpm vitest run src/test/theme-contract.test.ts
```

Expected: FAIL because `--primary`, `--secondary`, foreground, muted, destructive, and ring do not use the approved exact values.

- [ ] **Step 3: root semantic tokens를 approved palette로 최소 교체**

Use these exact light roots in `src/styles/globals.css`; keep the existing complete dark-token set and change only its primary family to remain Yellow-led:

```css
:root {
  --background: color-mix(in oklab, #e0e8f1 18%, #ffffff);
  --foreground: #1f242b;
  --card: #ffffff;
  --card-foreground: #1f242b;
  --popover: #ffffff;
  --popover-foreground: #1f242b;
  --primary: #ffd700;
  --primary-foreground: #1f242b;
  --secondary: #e0e8f1;
  --secondary-foreground: #1f242b;
  --muted: color-mix(in oklab, #e0e8f1 58%, #ffffff);
  --muted-foreground: #616a75;
  --accent: color-mix(in oklab, #ffd700 26%, #ffffff);
  --accent-foreground: #1f242b;
  --destructive: #b33a32;
  --destructive-foreground: #ffffff;
  --border: color-mix(in oklab, #616a75 24%, #ffffff);
  --input: color-mix(in oklab, #616a75 30%, #ffffff);
  --ring: #8a6d00;
  --sidebar: #e0e8f1;
  --sidebar-foreground: #1f242b;
  --sidebar-primary: #ffd700;
  --sidebar-primary-foreground: #1f242b;
  --sidebar-accent: color-mix(in oklab, #ffd700 28%, #ffffff);
  --sidebar-accent-foreground: #1f242b;
  --sidebar-border: color-mix(in oklab, #616a75 24%, #ffffff);
  --sidebar-ring: #8a6d00;
}
```

Retain existing chart, disabled and radius tokens. Add only these shared base rules:

```css
@layer base {
  * {
    border-color: var(--border);
  }

  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

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

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 4: focused GREEN과 quick verification**

```bash
pnpm vitest run src/test/theme-contract.test.ts
./scripts/verify quick
```

Expected: exact palette, semantic mapping, literal-source restriction, Pretendard and full quick suite PASS.

- [ ] **Step 5: commit**

```bash
git add src/styles/globals.css src/test/theme-contract.test.ts
git commit -m "feat(theme): 오케어 옐로우 팔레트 적용"
```

### Task 3: Responsive application shell and icon navigation

**Requirements:** `NAV-01`, `NAV-02`, `NAV-03`

**Files:**
- Modify: `src/widgets/app-shell/index.tsx`
- Modify: `src/app/router.test.tsx`

**Interfaces:**
- Consumes: existing `AuthAction`, `NavLink`, four existing Lucide icons
- Produces: desktop 224px sidebar and mobile three-tab bottom navigation with identical accessible names

- [ ] **Step 1: navigation structure test를 강화**

Inside the route matrix test in `src/app/router.test.tsx`, add:

```tsx
const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
expect(navigation.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(3);
expect(screen.getByText("업무 관리")).toBeInTheDocument();
const currentLabel = path.startsWith("/task") ? "할 일" : heading;
expect(screen.getByRole("link", { name: currentLabel })).toHaveAttribute(
  "aria-current",
  "page",
);
```

Keep the existing mutually exclusive login/profile assertions.

- [ ] **Step 2: product label 누락으로 RED인지 확인**

```bash
pnpm vitest run src/app/router.test.tsx
```

Expected: FAIL because `업무 관리` is absent; current-route assertion exposes any route-specific mismatch.

- [ ] **Step 3: AppShell을 two-breakpoint layout으로 교체**

Keep `AuthAction` unchanged. Use this structure in `src/widgets/app-shell/index.tsx`:

```tsx
const itemClass = ({ isActive }: { isActive: boolean }) =>
  [
    "relative flex min-h-12 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors",
    "md:justify-start md:gap-3 md:text-sm",
    isActive
      ? "bg-primary/35 text-foreground before:absolute before:inset-x-4 before:-top-px before:h-0.5 before:bg-ring md:before:inset-y-2 md:before:left-0 md:before:right-auto md:before:h-auto md:before:w-0.5"
      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  ].join(" ");

return (
  <div className="min-h-svh md:grid md:grid-cols-[14rem_minmax(0,1fr)]">
    <header className="fixed inset-x-0 bottom-0 z-40 border-t bg-sidebar/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:sticky md:top-0 md:h-svh md:border-r md:border-t-0 md:p-5">
      <div className="hidden px-3 py-4 text-lg font-bold tracking-tight md:block">
        업무 관리
      </div>
      <nav aria-label="주요 메뉴" className="grid grid-cols-3 gap-1 md:mt-5 md:flex md:h-[calc(100%-5rem)] md:flex-col md:gap-2">
        {items.map(({ Icon, end, label, to }, index) => (
          <NavLink
            className={(state) => `${itemClass(state)} ${index === 2 ? "md:mt-auto" : ""}`}
            end={end}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
    <main className="min-w-0 px-4 py-8 pb-28 sm:px-6 md:px-10 md:py-12 md:pb-12">
      <div className="mx-auto w-full max-w-[60rem]">
        <Outlet />
      </div>
    </main>
  </div>
);
```

Define `items` immediately before the return value:

```tsx
const items = [
  { label: "대시보드", to: "/", end: true, Icon: LayoutDashboard },
  { label: "할 일", to: "/task", end: false, Icon: ListTodo },
  { label: authLabel, to: authAction.to, end: false, Icon: AuthIcon },
] as const;
```

This keeps one native `nav` and one set of links in the accessibility tree at every breakpoint.

- [ ] **Step 4: focused test and quick verification**

```bash
pnpm vitest run src/app/router.test.tsx
./scripts/verify quick
```

Expected: all five routes retain headings; each nav has three distinct hidden icons plus visible labels; auth action remains exclusive; current route is exposed with `aria-current="page"`.

- [ ] **Step 5: commit**

```bash
git add src/widgets/app-shell/index.tsx src/app/router.test.tsx
git commit -m "feat(nav): 반응형 아이콘 내비게이션 적용"
```

### Task 4: Auth-entry sign-in form and error Dialog

**Requirements:** `AUTH-01`~`AUTH-06`, `NAV-03`

**Files:**
- Modify: `src/pages/sign-in/index.tsx`
- Modify: `src/features/sign-in/ui/sign-in-form.tsx`
- Modify: `src/features/sign-in/ui/sign-in-form.test.tsx`

**Interfaces:**
- Consumes: existing `signInSchema`, `signIn`, React Hook Form state and `onAuthenticated`
- Produces: accessible shadcn form controls and controlled non-destructive error Dialog

- [ ] **Step 1: shadcn control and description assertions 추가**

Add to the existing form test:

```tsx
expect(screen.getByText("업무 목록을 확인하려면 로그인하세요.")).toBeInTheDocument();
expect(screen.getByRole("textbox", { name: "이메일" })).toHaveAttribute("data-slot", "input");
expect(screen.getByRole("button", { name: "로그인" })).toHaveAttribute("data-slot", "button");
```

Keep all existing invalid, disabled, submitting, API message, modal focus and focus-restoration assertions.

- [ ] **Step 2: missing description/data-slot으로 RED인지 확인**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx
```

Expected: FAIL because the page description and shadcn slots are absent.

- [ ] **Step 3: page hierarchy와 form primitive를 최소 교체**

Use this page wrapper:

```tsx
<section className="mx-auto max-w-[26rem]">
  <header className="mb-8 space-y-2">
    <h1 className="text-3xl font-bold tracking-tight">로그인</h1>
    <p className="text-muted-foreground">업무 목록을 확인하려면 로그인하세요.</p>
  </header>
  <SignInForm onAuthenticated={onAuthenticated} />
</section>
```

In `SignInForm`, import `Button`, `Card`, `CardContent`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Input`, and `Label` from `@/shared/ui`. Preserve `validationMessage`, `submittingRef`, submit handling and IDs. Use this controlled dialog pattern:

```tsx
<Dialog open={apiError !== null} onOpenChange={(nextOpen) => !nextOpen && setApiError(null)}>
  <DialogContent
    onCloseAutoFocus={(event) => {
      event.preventDefault();
      submitRef.current?.focus();
    }}
    showCloseButton={false}
  >
    <DialogHeader>
      <DialogTitle>로그인 실패</DialogTitle>
      <DialogDescription role="alert">{apiError}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setApiError(null)} type="button" variant="outline">
        닫기
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Wrap the existing form in `Card`/`CardContent`, replace native labels/inputs/buttons with `Label`/`Input`/`Button`, keep visible inline error IDs, add `aria-busy={isSubmitting}`, and use `w-full` on submit. Do not add account creation or password-reset links.

- [ ] **Step 4: focused test and auth core E2E**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx src/app/router.test.tsx
pnpm playwright test e2e/auth-entry.spec.ts
./scripts/verify quick
```

Expected: validation, duplicate-submit guard, API `errorMessage`, dialog naming, initial close focus, submit focus restoration, protected return-to route and mobile no-overflow all PASS.

- [ ] **Step 5: commit**

```bash
git add src/pages/sign-in/index.tsx src/features/sign-in/ui/sign-in-form.tsx src/features/sign-in/ui/sign-in-form.test.tsx
git commit -m "feat(auth): 집중형 로그인 화면 적용"
```

### Task 5: Work-overview dashboard and profile

**Requirements:** `DASH-01`, `USER-01`

**Files:**
- Modify: `src/pages/dashboard/index.tsx`
- Modify: `src/widgets/dashboard-summary/index.tsx`
- Modify: `src/widgets/dashboard-summary/dashboard-summary.test.tsx`
- Modify: `src/pages/user/index.tsx`
- Modify: `src/widgets/user-profile/index.tsx`
- Modify: `src/widgets/user-profile/user-profile.test.tsx`

**Interfaces:**
- Consumes: existing dashboard/user queries and retry functions
- Produces: sentence-led dashboard, one Progress rail, semantic `dl` metrics and profile card

- [ ] **Step 1: sentence, progress, zero-state and profile-card tests 추가**

Add assertions to the existing dashboard tests:

```tsx
expect(await screen.findByText("3개 중 2개가 남았습니다")).toBeInTheDocument();
expect(screen.getByRole("progressbar", { name: "업무 완료율" })).toHaveAttribute(
  "aria-valuenow",
  "33.33333333333333",
);
```

Add one zero-data case using `{ numOfTask: 0, numOfRestTask: 0, numOfDoneTask: 0 }`:

```tsx
expect(await screen.findByText("등록된 할 일이 없습니다")).toBeInTheDocument();
expect(screen.getByRole("progressbar", { name: "업무 완료율" })).toHaveAttribute(
  "aria-valuenow",
  "0",
);
```

In the user-profile success test add:

```tsx
expect(screen.getByText("김담당").closest("[data-slot='card']")).toBeInTheDocument();
```

- [ ] **Step 2: current metric-only rendering으로 RED인지 확인**

```bash
pnpm vitest run src/widgets/dashboard-summary/dashboard-summary.test.tsx src/widgets/user-profile/user-profile.test.tsx
```

Expected: FAIL for the summary sentence, progressbar and card slot.

- [ ] **Step 3: dashboard state grammar 구현**

Keep the query unchanged. Replace native loading text with three `Skeleton` blocks inside `role="status"`; replace recoverable error with `Alert` + `Button`. On success calculate only:

```ts
const { numOfDoneTask, numOfRestTask, numOfTask } = query.data;
const completion = numOfTask === 0 ? 0 : (numOfDoneTask / numOfTask) * 100;
const summary =
  numOfTask === 0 ? "등록된 할 일이 없습니다" : `${numOfTask}개 중 ${numOfRestTask}개가 남았습니다`;
```

Render exactly one surface:

```tsx
<Card>
  <CardHeader>
    <CardDescription>오늘의 업무 현황</CardDescription>
    <CardTitle className="text-2xl leading-tight sm:text-3xl">{summary}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{numOfDoneTask} / {numOfTask} 완료</span>
        <span className="tabular-nums">{Math.round(completion)}%</span>
      </div>
      <Progress aria-label="업무 완료율" value={completion} />
    </div>
    <dl className="grid grid-cols-3 gap-3 border-t pt-5">
      <div>
        <dt className="text-sm text-muted-foreground">전체 할 일</dt>
        <dd className="mt-1 text-xl font-bold tabular-nums">{numOfTask}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">남은 할 일</dt>
        <dd className="mt-1 text-xl font-bold tabular-nums">{numOfRestTask}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">완료한 일</dt>
        <dd className="mt-1 text-xl font-bold tabular-nums">{numOfDoneTask}</dd>
      </div>
    </dl>
  </CardContent>
</Card>
```

Update `DashboardPage` with a `대시보드` heading and one short description above the widget. Do not add metric cards.

- [ ] **Step 4: profile state grammar 구현**

Keep the user query unchanged. Use matching `Skeleton` loading geometry, `Alert` + retry `Button`, and a single `Card` containing the existing `dl` with name and memo. Update `UserPage` heading hierarchy only. Do not add avatar, edit, contact, or logout actions.

- [ ] **Step 5: focused test, work Journey E2E, quick verification**

```bash
pnpm vitest run src/widgets/dashboard-summary/dashboard-summary.test.tsx src/widgets/user-profile/user-profile.test.tsx
pnpm playwright test e2e/work-overview.spec.ts
./scripts/verify quick
```

Expected: loading/error/success/zero-data and retry contracts PASS; the existing three `dt`/`dd` values, auth header, profile route, bearer requests and mobile no-overflow remain intact.

- [ ] **Step 6: commit**

```bash
git add src/pages/dashboard src/widgets/dashboard-summary src/pages/user src/widgets/user-profile
git commit -m "feat(work): 업무 현황과 회원정보 화면 정리"
```

### Task 6: Task-discovery virtual list

**Requirements:** `TASK-LIST-01`~`TASK-LIST-05`

**Files:**
- Modify: `src/pages/task-list/index.tsx`
- Modify: `src/widgets/task-list/index.tsx`
- Modify: `src/widgets/task-list/task-list.test.tsx`
- Modify: `src/entities/task/ui/task-card.tsx`
- Modify: `src/entities/task/ui/task-card.test.tsx`

**Interfaces:**
- Consumes: existing infinite query, stable task ID key, auto-fetch effect and virtual measurement
- Produces: flat shadcn task rows, Skeleton/error/terminal grammar and full-card detail links

- [ ] **Step 1: Card slot, direction indicator and state primitive assertions 추가**

In `task-card.test.tsx` add:

```tsx
expect(link.closest("[data-slot='card']")).toBeInTheDocument();
expect(link.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
```

In `task-list.test.tsx`, retain every request/page/virtualization assertion and add to the recoverable next-page error test:

```tsx
expect(await screen.findByRole("alert")).toHaveAttribute("data-slot", "alert");
expect(screen.getByRole("button", { name: "다시 불러오기" })).toHaveAttribute(
  "data-slot",
  "button",
);
```

- [ ] **Step 2: native article/error rendering으로 RED인지 확인**

```bash
pnpm vitest run src/entities/task/ui/task-card.test.tsx src/widgets/task-list/task-list.test.tsx
```

Expected: FAIL because Card, direction icon and Alert/Button data slots are absent.

- [ ] **Step 3: TaskCard의 full-row Link 구현**

Use `Card`, `CardContent` and `ChevronRight`:

```tsx
<Card className="gap-0 py-0 shadow-none transition-colors hover:bg-accent/45">
  <Link className="flex min-h-24 items-center gap-4 px-5 py-4" to={`/task/${encodeURIComponent(id)}`}>
    <CardContent className="min-w-0 flex-1 space-y-1 p-0">
      <h2 className="font-semibold leading-snug">{title}</h2>
      <p className="line-clamp-2 text-sm text-muted-foreground">{memo}</p>
    </CardContent>
    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
  </Link>
</Card>
```

- [ ] **Step 4: virtual list의 data behavior를 보존하며 상태 표현 교체**

Keep `useInfiniteQuery`, `getNextPageParam`, `getItemKey`, auto-fetch `useEffect`, dynamic `height` and `transform` inline styles exactly where runtime values require them. Change only static layout:

```tsx
<section className="flex min-h-0 flex-col gap-4">
  <section
    aria-label="할 일 목록"
    className="h-[min(32rem,calc(100svh-18rem))] min-h-48 overflow-auto rounded-xl"
    ref={scrollRef}
  >
    <ul className="relative m-0 list-none p-0" style={{ height: virtualizer.getTotalSize() }}>
      {virtualItems.map((virtualItem) => {
        const task = tasks[virtualItem.index];
        if (!task) return null;
        return (
          <li
            className="absolute left-0 top-0 w-full pb-3"
            data-index={virtualItem.index}
            data-task-row={task.id}
            key={task.id}
            ref={virtualizer.measureElement}
            style={{ minHeight: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
          >
            <TaskCard id={task.id} memo={task.memo} title={task.title} />
          </li>
        );
      })}
    </ul>
  </section>
  {query.isError && query.data && (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage(query.error)}</AlertDescription>
    </Alert>
  )}
  {query.hasNextPage ? (
    <Button
      disabled={query.isFetchingNextPage}
      onClick={() => void query.fetchNextPage()}
      type="button"
      variant="ghost"
    >
      {query.isFetchingNextPage ? "다음 페이지 불러오는 중" : "다음 페이지 불러오기"}
    </Button>
  ) : (
    <p className="text-center text-sm text-muted-foreground">모든 할 일을 불러왔습니다.</p>
  )}
</section>
```

Use `Skeleton` rows for initial and next-page loading. Preserve existing items on next-page error and place `Alert` + `다시 불러오기` below the scroller. Keep the manual next-page `Button` as `variant="ghost"`; automatic loading remains primary. Do not render OpenAPI `status`.

Update `TaskListPage` with heading and short explanatory text only.

- [ ] **Step 5: focused test, task-discovery E2E and quick verification**

```bash
pnpm vitest run src/entities/task/ui/task-card.test.tsx src/widgets/task-list/task-list.test.tsx
pnpm playwright test e2e/task-discovery.spec.ts
./scripts/verify quick
```

Expected: page 1/2 request sequence, stable virtual rows, auto-fetch, terminal state and encoded detail route all PASS. If the larger designed viewport changes the mounted-row count without removing virtualization, update only that brittle count assertion to prove `data-task-row` is less than the fixture's total task count at the recorded viewport; do not weaken request, scrolling or route assertions.

- [ ] **Step 6: commit**

```bash
git add src/pages/task-list src/widgets/task-list src/entities/task/ui
git commit -m "feat(task): 가상 할 일 목록 화면 정리"
```

### Task 7: Task-resolution detail, 404 and destructive AlertDialog

**Requirements:** `TASK-DETAIL-01`~`TASK-DETAIL-05`

**Files:**
- Modify: `src/pages/task-detail/index.tsx`
- Modify: `src/pages/task-detail/task-detail.test.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Modify: `src/shared/ui/index.ts`
- Delete: `src/shared/ui/modal.tsx`

**Interfaces:**
- Consumes: existing task detail query, exact-ID guard, attempt guard, delete/presence resolution and cache eviction callbacks
- Produces: document-like detail, readable time, recoverable/404 Alert and pending-locked AlertDialog

- [ ] **Step 1: detail hierarchy와 AlertDialog slot assertions 추가**

Add to the detail success test:

```tsx
expect(screen.getByRole("link", { name: "할 일 목록" })).toHaveAttribute("href", "/task");
expect(screen.getByRole("time")).toHaveAttribute("datetime", "2026-08-30T09:00:00.000Z");
```

Add to the delete dialog test after opening:

```tsx
expect(screen.getByRole("alertdialog", { name: "할 일 삭제" })).toHaveAttribute(
  "data-slot",
  "alert-dialog-content",
);
expect(screen.getByText(taskId)).toHaveClass("font-mono");
```

Retain exact mismatch cases, one-request guard, pending close lock, absent/unknown recovery, success redirect and focus restoration tests.

- [ ] **Step 2: back link, readable time and AlertDialog absence로 RED인지 확인**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx
```

Expected: FAIL because success detail has no back link and deletion still uses custom `Modal`.

- [ ] **Step 3: detail page 상태와 문서 layout 구현**

Keep the query and callbacks unchanged. Use `Skeleton` for loading; `Alert` + primary list link for 404; `Alert` + retry `Button` for other errors. Success uses:

```tsx
<article className="mx-auto max-w-[44rem] space-y-8">
  <Link className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground" to="/task">
    <ArrowLeft aria-hidden="true" className="size-4" />
    할 일 목록
  </Link>
  <header className="space-y-3">
    <h1 className="text-3xl font-bold tracking-tight">{query.data.title}</h1>
    <p className="text-lg leading-8 text-muted-foreground">{query.data.memo}</p>
  </header>
  <time className="block text-sm tabular-nums text-muted-foreground" dateTime={query.data.registerDatetime}>
    {new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(
      new Date(query.data.registerDatetime),
    )}
  </time>
  <section className="border-t pt-6" aria-label="위험 작업">
    <DeleteTaskDialog
      onAbsent={() => evictTaskSnapshots(queryClient)}
      onSuccess={async () => {
        await evictTaskSnapshots(queryClient);
        navigate("/task", { replace: true });
      }}
      taskId={id}
    />
  </section>
</article>
```

- [ ] **Step 4: custom Modal을 controlled AlertDialog로 교체**

Keep all state, guard, request and resolution functions unchanged. Replace only the trigger/content markup using `AlertDialog`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `Button`, `Input`, `Label`, and `Alert` from `@/shared/ui`.

Use `open={open}` with `onOpenChange={(nextOpen) => !nextOpen && resetAndClose()}`. Add `onEscapeKeyDown={(event) => pending && event.preventDefault()}` and `onPointerDownOutside={(event) => pending && event.preventDefault()}` to content. Set `aria-busy={pending}` on the form. Render the exact ID separately:

```tsx
<AlertDialogDescription>
  삭제하려면 아래 할 일 ID를 정확히 입력해주세요.
</AlertDialogDescription>
<code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">{taskId}</code>
<Label htmlFor="delete-task-id">할 일 ID</Label>
<Input
  autoComplete="off"
  disabled={pending}
  id="delete-task-id"
  onChange={(event) => setInput(event.target.value)}
  value={input}
/>
```

Use a destructive `Button` as trigger and submit; use outline cancel. Error/recovery messages use `Alert`. Preserve `다시 확인` and `할 일 목록으로 이동` for absent/unknown. On close, restore focus to `triggerRef`; pending must not close.

- [ ] **Step 5: remove the old Modal only after both consumers are gone**

```bash
rg -n '\bModal\b' src --glob '!src/shared/ui/modal.tsx'
```

Expected: no matches. Delete `src/shared/ui/modal.tsx` and remove its export from `src/shared/ui/index.ts`.

- [ ] **Step 6: focused test, task-resolution E2E and quick verification**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx
pnpm playwright test e2e/task-resolution.spec.ts
./scripts/verify quick
```

Expected: exact-ID variants remain disabled, one authorized DELETE occurs, pending cannot close, success redirects, cache/state refreshes, 404 recovers to list, human-readable text retains original `dateTime`, and old Modal has no consumer.

- [ ] **Step 7: commit**

```bash
git add src/pages/task-detail src/features/delete-task/ui src/shared/ui
git commit -m "feat(task): 상세와 삭제 확인 화면 정리"
```

### Task 8: Responsive browser evidence, adversarial review and final QA

**Requirements:** all IDs in `UI-IMPLEMENT-01`; four Golden Journeys

**Files:**
- Modify only if required for cross-boundary proof: four `e2e/*.spec.ts` Journey files
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed Tasks 1–7 on one intended commit
- Produces: reproducible desktop/mobile evidence, plan-completion review, full verification and human checkpoint requests

- [ ] **Step 1: add only material E2E visual-contract assertions**

Extend existing Journey tests without duplicating component coverage:

```ts
await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
await expect(page.getByRole("link", { name: "할 일", exact: true }).locator("svg")).toBeVisible();
await expect(page.getByRole("link", { name: "할 일", exact: true })).toHaveCSS(
  "min-height",
  "48px",
);
```

Use mobile-only checks for bottom-navigation fixed position/content overlap and desktop-only checks for 224px sidebar. Keep accessible names and route/network expectations as the primary assertions; do not assert exact decorative pixels.

- [ ] **Step 2: targeted Journey suite와 quick gate 실행**

```bash
pnpm test
pnpm test:e2e:core
./scripts/verify quick
git diff --check
```

Expected: all unit/component/integration tests, all four `@core` Journey categories and quick gate PASS; no whitespace errors.

- [ ] **Step 3: agent-browser desktop evidence 수집**

Start a clean local server, then use a dedicated session:

```bash
pnpm dev --host 127.0.0.1 --port 4173
agent-browser --session ui-focus set viewport 1280 800
agent-browser --session ui-focus open http://127.0.0.1:4173/sign-in
agent-browser --session ui-focus wait --load networkidle
agent-browser --session ui-focus find label "이메일" fill "user@example.com"
agent-browser --session ui-focus find label "비밀번호" fill "Password1"
agent-browser --session ui-focus find role button click --name "로그인"
agent-browser --session ui-focus wait --load networkidle
agent-browser --session ui-focus screenshot /tmp/kbhc-ui-dashboard-desktop.png
agent-browser --session ui-focus open http://127.0.0.1:4173/task
agent-browser --session ui-focus screenshot /tmp/kbhc-ui-task-desktop.png
agent-browser --session ui-focus open http://127.0.0.1:4173/task/task-1
agent-browser --session ui-focus screenshot /tmp/kbhc-ui-detail-desktop.png
agent-browser --session ui-focus console
agent-browser --session ui-focus errors
agent-browser --session ui-focus close
```

Verify sidebar width/current indicator, max content width, sentence/progress hierarchy, virtual scrolling, detail/back link, dialog focus and no horizontal overflow.

- [ ] **Step 4: agent-browser mobile evidence 수집**

```bash
agent-browser --session ui-focus-mobile set viewport 390 844
agent-browser --session ui-focus-mobile open http://127.0.0.1:4173/sign-in
agent-browser --session ui-focus-mobile screenshot /tmp/kbhc-ui-sign-in-mobile.png
agent-browser --session ui-focus-mobile find label "이메일" fill "user@example.com"
agent-browser --session ui-focus-mobile find label "비밀번호" fill "Password1"
agent-browser --session ui-focus-mobile find role button click --name "로그인"
agent-browser --session ui-focus-mobile open http://127.0.0.1:4173/task
agent-browser --session ui-focus-mobile screenshot /tmp/kbhc-ui-task-mobile.png
agent-browser --session ui-focus-mobile eval 'JSON.stringify({ width: document.documentElement.scrollWidth, viewport: innerWidth, navBottom: getComputedStyle(document.querySelector("header")).bottom })'
agent-browser --session ui-focus-mobile console
agent-browser --session ui-focus-mobile errors
agent-browser --session ui-focus-mobile close
```

Expected: width `<= 390`, header bottom `0px`, three distinct icon+label tabs, each target at least 48px, safe-area padding, last content/action unobscured, inputs at least 16px, dialog within viewport, unexpected console/page errors empty. Record expected mock 401/404 network messages separately rather than classifying them as UI failures.

- [ ] **Step 5: reduced-motion and focus spot-check**

Run a fresh agent-browser session with reduced motion if supported; otherwise use Playwright emulation. Verify `Progress` transition duration resolves effectively to zero, keyboard Tab order follows Dashboard → Task → auth action → page controls, and dark-gold focus outline is visible on white, Sky and Yellow surfaces.

- [ ] **Step 6: plan-completion adversarial review**

Review the final implementation commit against every requirement row and the written design. The reviewer must specifically challenge:

```text
- dependency diff matches the explicit HIGH decision
- no accepted auth/delete/API/cache behavior changed
- mobile nav uses distinct icon + visible label, 48px target and no content overlap
- Ocare Yellow/Sky exact source tokens and no feature-local color literal
- all loading/empty/error/404/pending states keep accessible names and recovery
- virtual list remains bounded and auto-pagination remains intact
- Dialog focus restore and AlertDialog pending close lock remain intact
- no shadcn Sidebar, speculative feature, asset or abstraction was added
```

Record reviewer, target SHA, findings by severity, corrections and rerun evidence in `UI-IMPLEMENT-01`. Resolve every HIGH/MEDIUM finding before continuing. Reuse this review for a Journey only when its reviewed target and scope are identical.

- [ ] **Step 7: full verification and final evidence**

```bash
./scripts/verify full
git status --short
```

Expected: setup, quick, build, all four core E2E journeys, verifier regression PASS; worktree contains only the intended evidence/TODO update before the evidence commit.

Update `UI-IMPLEMENT-01` with exact commit SHA, commands, route, viewport, preconditions, actions, actual result, console/network review, screenshots, verdict, failure class/correction/rerun, and plan-completion review. Set only `UI-IMPLEMENT-01` to `AI_VERIFIED` when its acceptance is met. Request one human checkpoint for each affected Golden Journey; do not edit another session's Journey task block and do not write `HUMAN_APPROVED`.

- [ ] **Step 8: evidence commit and final read-only rerun**

```bash
git add TODO.md e2e
git commit -m "docs(ui): 반응형 화면 검증 근거 기록"
./scripts/verify full
git status --short
```

Expected: final full verification PASS and clean worktree. Present the four Journey checkpoint evidence and final-acceptance request to the user.
