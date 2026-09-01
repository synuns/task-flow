# UI Foundation Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 공통 UI primitive의 접근성·semantic token 계약을 전용 test와 browser evidence로 고정하고 실제 계약 위반만 최소 교정한다.

**Architecture:** `src/shared/ui`의 기존 shadcn/ui primitive와 public API를 그대로 사용한다. 대표 fixture test가 `Button`, `Input`, `Label`, `Card`의 계약을 검증하며, 새 wrapper나 runtime behavior를 추가하지 않는다. 자동 검증 뒤 `/sign-in`에서 실제 keyboard focus와 disabled/error 표현을 확인하고 완료 전 독립 review를 거친다.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 4, shadcn/ui, Testing Library, Vitest, agent-browser

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-09-01-ui-foundation-contract-design.md`다.
- 대상은 `SYS-02`, `SYS-03`과 공통 접근성 invariant다.
- 기존 `Button`, `Input`, `Label`, `Card`, `src/styles/globals.css` token을 먼저 재사용한다.
- 새 기능, route, showcase, component catalog, wrapper, generic abstraction을 만들지 않는다.
- application shell, 비동기 상태 UI, Journey behavior, API, auth, cache와 삭제 의미를 변경하지 않는다.
- dependency와 `src/shared/ui/index.ts` public API를 변경하지 않는다.
- characterization test가 기존 계약을 통과하면 production code를 수정하지 않는다.
- 실제 assertion failure가 있을 때만 root cause를 해당 shared primitive에서 최소 교정한다.
- `assignment-original/`은 수정하지 않는다.
- AI는 `UI-FOUNDATION-01`을 `AI_VERIFIED`까지만 갱신한다.
- 실행은 현재 checkout이 격리 worktree가 아니므로 `using-git-worktrees` 지침에 따라 ignored `.worktrees/ui-foundation-contract`에서 수행한다.

---

## File Structure

- Create: `src/shared/ui/ui-foundation.test.tsx` — 대표 foundation 조합의 접근성·style 계약
- Create: `docs/quality/evidence/ui-foundation.md` — desktop/mobile browser와 자동 검증 근거
- Modify only after a reproduced assertion failure: `src/shared/ui/button.tsx`, `src/shared/ui/input.tsx`, or `src/shared/ui/card.tsx` — 실패한 기존 계약의 최소 교정
- Modify: `TODO.md` — `UI-FOUNDATION-01` evidence, review record와 `AI_VERIFIED` 상태

### Task 1: Foundation 계약 특성화 test

**Files:**
- Create: `src/shared/ui/ui-foundation.test.tsx`
- Read: `src/shared/ui/button.tsx`
- Read: `src/shared/ui/input.tsx`
- Read: `src/shared/ui/label.tsx`
- Read: `src/shared/ui/card.tsx`
- Read: `src/test/theme-contract.test.ts`

**Interfaces:**
- Consumes: `Button`, `Card`, `CardContent`, `Input`, `Label` from the existing `src/shared/ui/index.ts`
- Produces: two Vitest cases that lock the representative accessibility and semantic-token contract

- [ ] **Step 1: 격리 worktree와 baseline 확인**

Create `.worktrees/ui-foundation-contract` from the plan commit using the required worktree skill, then run:

```bash
git status --short --branch
pnpm vitest run src/shared/ui/shadcn-primitives.test.tsx src/test/theme-contract.test.ts
```

Expected: clean worktree; 2 files and 4 tests PASS. Do not continue from a dirty or stale branch.

- [ ] **Step 2: 대표 foundation 계약 test 작성**

Create `src/shared/ui/ui-foundation.test.tsx` with exactly this content:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, Card, CardContent, Input, Label } from ".";

function renderFoundation() {
  render(
    <Card data-testid="foundation-surface">
      <CardContent>
        <Label htmlFor="foundation-email">이메일</Label>
        <Input
          aria-describedby="foundation-email-error"
          aria-invalid="true"
          id="foundation-email"
          type="email"
        />
        <p id="foundation-email-error">이메일 형식을 확인해주세요.</p>
        <Button disabled type="button">
          저장
        </Button>
      </CardContent>
    </Card>,
  );
}

describe("UI foundation contract", () => {
  it("preserves label, error description, and disabled semantics", () => {
    renderFoundation();

    const input = screen.getByRole("textbox", { name: "이메일" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("이메일 형식을 확인해주세요.");
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("uses semantic tokens for surface, focus, disabled, and error styles", () => {
    renderFoundation();

    expect(screen.getByTestId("foundation-surface")).toHaveClass(
      "bg-card",
      "text-card-foreground",
    );
    expect(screen.getByRole("textbox", { name: "이메일" })).toHaveClass(
      "border-input",
      "focus-visible:ring-ring/50",
      "aria-invalid:border-destructive",
    );
    expect(screen.getByRole("button", { name: "저장" })).toHaveClass(
      "focus-visible:ring-ring/50",
      "disabled:opacity-50",
    );
  });
});
```

This is a characterization test for existing behavior, so no artificial product failure is expected or required.

- [ ] **Step 3: foundation과 theme 계약 실행**

```bash
pnpm vitest run src/shared/ui/ui-foundation.test.tsx src/test/theme-contract.test.ts
```

Expected: 2 files and 5 tests PASS. If an assertion fails, record the actual output and inspect every consumer with:

```bash
rg -n 'Button|Input|Card|aria-invalid|disabled=' src --glob '!src/shared/ui/ui-foundation.test.tsx'
```

Correct only the failing shared primitive. Do not change the test expectation, add a wrapper, or change consumers merely to make the test green. Rerun the same focused command after correction.

- [ ] **Step 4: quick gate와 diff 범위 확인**

```bash
./scripts/verify quick
git diff --check
git diff --stat
git diff --name-only -- assignment-original
```

Expected: quick PASS, whitespace check PASS, only the new test and a reproduced minimal primitive correction if one was necessary, and no `assignment-original/` output.

- [ ] **Step 5: 계약 test commit**

```bash
git add src/shared/ui/ui-foundation.test.tsx
git add -u src/shared/ui/button.tsx src/shared/ui/input.tsx src/shared/ui/card.tsx
git diff --cached --check
git commit -m "test(ui): UI foundation 계약 고정"
```

Expected: Conventional Commit succeeds with the test and only reproduced correction files; unchanged primitives are not staged.

### Task 2: Browser와 자동 검증 evidence

**Files:**
- Create: `docs/quality/evidence/ui-foundation.md`
- Test: `src/shared/ui/ui-foundation.test.tsx`
- Test: `src/test/theme-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 foundation contract and existing `/sign-in` composition
- Produces: reproducible 390×844 and 1280×720 browser evidence plus final quick-gate result

- [ ] **Step 1: fresh development server 시작**

Start Vite in a persistent terminal session:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

Expected: Vite serves `http://127.0.0.1:4173`; keep the process until both browser sessions close.

- [ ] **Step 2: desktop keyboard·disabled·error 계약 확인**

```bash
agent-browser --session ui-foundation-desktop set viewport 1280 720
agent-browser --session ui-foundation-desktop open http://127.0.0.1:4173/sign-in
agent-browser --session ui-foundation-desktop wait --load networkidle
agent-browser --session ui-foundation-desktop snapshot -i
agent-browser --session ui-foundation-desktop find label "이메일" fill "invalid"
agent-browser --session ui-foundation-desktop find label "이메일" click
agent-browser --session ui-foundation-desktop press Tab
agent-browser --session ui-foundation-desktop eval 'JSON.stringify({activeId: document.activeElement?.id, focusVisible: getComputedStyle(document.activeElement).boxShadow !== "none" || getComputedStyle(document.activeElement).outlineStyle !== "none", emailInvalid: document.querySelector("#sign-in-email")?.getAttribute("aria-invalid"), emailDescription: document.querySelector("#sign-in-email")?.getAttribute("aria-describedby"), errorText: document.querySelector("#sign-in-email-error")?.textContent, submitDisabled: document.querySelector("button[type=submit]")?.disabled})'
agent-browser --session ui-foundation-desktop network requests --filter api
agent-browser --session ui-foundation-desktop console
agent-browser --session ui-foundation-desktop errors
agent-browser --session ui-foundation-desktop screenshot /tmp/kbhc-ui-foundation-desktop.png
agent-browser --session ui-foundation-desktop close
```

Expected: active element is `sign-in-password`; focus is visibly styled; email has `aria-invalid="true"` and describes `sign-in-email-error`; visible error text is present; submit is disabled. The anonymous bootstrap may make the approved `POST /api/refresh` 401 request; no other unexpected failed request, console error, or page error appears.

- [ ] **Step 3: mobile keyboard·disabled·error 계약 확인**

Repeat the same observable checks at the required mobile viewport:

```bash
agent-browser --session ui-foundation-mobile set viewport 390 844
agent-browser --session ui-foundation-mobile open http://127.0.0.1:4173/sign-in
agent-browser --session ui-foundation-mobile wait --load networkidle
agent-browser --session ui-foundation-mobile snapshot -i
agent-browser --session ui-foundation-mobile find label "이메일" fill "invalid"
agent-browser --session ui-foundation-mobile find label "이메일" click
agent-browser --session ui-foundation-mobile press Tab
agent-browser --session ui-foundation-mobile eval 'JSON.stringify({activeId: document.activeElement?.id, focusVisible: getComputedStyle(document.activeElement).boxShadow !== "none" || getComputedStyle(document.activeElement).outlineStyle !== "none", emailInvalid: document.querySelector("#sign-in-email")?.getAttribute("aria-invalid"), emailDescription: document.querySelector("#sign-in-email")?.getAttribute("aria-describedby"), errorText: document.querySelector("#sign-in-email-error")?.textContent, submitDisabled: document.querySelector("button[type=submit]")?.disabled, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth})'
agent-browser --session ui-foundation-mobile network requests --filter api
agent-browser --session ui-foundation-mobile console
agent-browser --session ui-foundation-mobile errors
agent-browser --session ui-foundation-mobile screenshot /tmp/kbhc-ui-foundation-mobile.png
agent-browser --session ui-foundation-mobile close
```

Expected: the same accessibility results as desktop, `documentWidth <= viewportWidth`, and no unexpected console/page/network error.

- [ ] **Step 4: evidence 문서 작성**

Create `docs/quality/evidence/ui-foundation.md` with these headings and record the exact outputs observed in Steps 2–3:

```markdown
# UI Foundation Evidence

Requirement: `SYS-02`, `SYS-03`, 공통 접근성 invariant

Commit and session

Automatic verification

Desktop browser verification

Mobile browser verification

Console and network

Failure, correction, and rerun
```

Include the full Task 1 commit SHA from `git rev-parse HEAD`, both routes and viewports, precondition, actions, expected/actual values, screenshot paths, expected refresh 401 classification, any correction and rerun verdict. Do not record a screenshot path without the observed values.

- [ ] **Step 5: final automatic verification과 evidence commit**

```bash
pnpm vitest run src/shared/ui/ui-foundation.test.tsx src/test/theme-contract.test.ts
./scripts/verify quick
git diff --check
git add docs/quality/evidence/ui-foundation.md
git commit -m "docs(ui): UI foundation 검증 근거 기록"
```

Expected: focused 2 files/5 tests PASS, quick PASS, and a documentation-only evidence commit.

### Task 3: Plan-completion adversarial review와 상태 전이

**Files:**
- Modify: `TODO.md:581-600`
- Read: `docs/superpowers/specs/2026-09-01-ui-foundation-contract-design.md`
- Read: `docs/superpowers/plans/2026-09-01-ui-foundation-contract.md`
- Read: `docs/quality/evidence/ui-foundation.md`

**Interfaces:**
- Consumes: Task 1 implementation commit and Task 2 evidence commit
- Produces: seven-field plan-completion review record and `UI-FOUNDATION-01` `AI_VERIFIED` state

- [ ] **Step 1: 독립 plan-completion review 실행**

Use a fresh reviewer context that did not author Tasks 1–2. Give it this exact review brief:

```text
Review UI-FOUNDATION-01 against:
- docs/superpowers/specs/2026-09-01-ui-foundation-contract-design.md
- docs/superpowers/plans/2026-09-01-ui-foundation-contract.md
- current branch diff from the plan commit through HEAD

Check spec coverage; label/error/disabled semantics; focus and semantic-token contract;
characterization-test quality; desktop/mobile evidence; console/network classification;
no feature, wrapper, shell, async-state, public API, dependency, Journey behavior, or
assignment-original expansion; TODO dependency/status consistency. Report severity,
failure class, root cause, exact correction, and verdict. Do not modify files.
```

Expected: reviewer returns `PASS`, `PASS_WITH_LOW`, or actionable findings. Resolve every HIGH/MEDIUM finding with a focused reproduction and rerun before continuing. Record LOW findings explicitly rather than silently expanding scope.

- [ ] **Step 2: UI-FOUNDATION-01 evidence와 상태 갱신**

In `TODO.md`, change the task checkbox to `[x]`, set `Status: AI_VERIFIED`, and replace the in-progress evidence with exact results from Tasks 1–3. The evidence must include:

- `/root` task ownership, design and plan paths
- full target commit SHA
- focused test and quick command counts/results
- both agent-browser sessions, viewports, observed semantics, screenshots and closure
- expected refresh 401 and absence of unexpected console/page/network errors
- failure classification, correction and rerun, or explicit no-correction result
- `Review target`, `Reviewer`, `Checks`, `Findings`, `Corrections`, `Rerun`, `Verdict`
- a statement that this is not Journey `HUMAN_APPROVED` or final acceptance

Do not alter `UI-SHELL-01`, `UI-STATE-01`, Journey blocks, or requirement statuses.

- [ ] **Step 3: final read-only gate와 completion commit**

```bash
pnpm vitest run src/shared/ui/ui-foundation.test.tsx src/test/theme-contract.test.ts
./scripts/verify quick
git diff --check
git diff --name-only -- assignment-original
git status --short
```

Expected: focused 2 files/5 tests PASS, quick PASS, no whitespace failure, no `assignment-original/` diff, and only `TODO.md` pending.

```bash
git add TODO.md
git commit -m "docs(ui): UI foundation 검증 완료"
./scripts/verify setup
git status --short --branch
```

Expected: setup PASS and a clean `feat/ui-foundation-contract` worktree. Stop before `UI-SHELL-01`, `UI-STATE-01`, or any Journey implementation.
