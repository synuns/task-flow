# Navigation Selected 표시선 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navigation selected 상태의 mobile 상단선과 desktop 좌측선을 제거하고 기존 배경색과 route semantics를 유지한다.

**Architecture:** 기존 `AppShell`의 공통 `itemClass` 한 곳에서 pseudo-element Tailwind utility만 삭제한다. 새 abstraction, dependency, 선 부재 전용 test는 추가하지 않는다.

**Tech Stack:** React 19, React Router `NavLink`, Tailwind CSS, Vitest, Playwright, agent-browser

## Global Constraints

- Requirement는 `NAV-01`, `NAV-03`으로 제한한다.
- Selected의 `bg-primary/35`, `text-foreground`, `aria-current="page"`는 유지한다.
- Icon, label, layout, keyboard focus와 route 동작은 변경하지 않는다.
- 사용자가 승인한 CSS 표현 변경 예외에 따라 선 부재 전용 assertion은 추가하지 않는다.
- 사용자 또는 다른 session의 diff를 수정하거나 commit하지 않는다.

---

### Task 1: 공통 selected 표시선 제거

**Files:**
- Modify: `src/widgets/app-shell/index.tsx:5-12`
- Modify: `src/app/router.test.tsx:98-103`

**Interfaces:**
- Consumes: React Router가 `NavLink.className` callback에 제공하는 `{ isActive: boolean }`
- Produces: active일 때 `bg-primary/35 text-foreground`, inactive일 때 기존 hover style을 반환하는 `itemClass`

- [ ] **Step 1: 기존 test에서 제거 대상 구현 세부 기대값 정리**

`src/app/router.test.tsx`의 current-link assertion을 아래처럼 바꾼다. 선 부재를 고정하는 새 assertion은 추가하지 않는다.

```tsx
expect(currentLink).toHaveClass("bg-primary/35");
```

- [ ] **Step 2: 유지되는 selected 계약 확인**

Run: `pnpm vitest run src/app/router.test.tsx`

Expected: PASS. `aria-current="page"`와 selected 배경색의 기존 계약이 유지된다. CSS utility 제거는 사용자가 승인한 test-first 예외이므로 별도 RED를 만들지 않는다.

- [ ] **Step 3: pseudo-element utility 최소 삭제**

`src/widgets/app-shell/index.tsx`의 active branch를 아래처럼 바꾼다.

```tsx
isActive
  ? "bg-primary/35 text-foreground"
  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
```

- [ ] **Step 4: focused 자동 검증**

Run: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx src/app/router.test.tsx`

Expected: 2 files PASS. Navigation icon, link, tab order, current route와 selected 배경색이 유지된다.

- [ ] **Step 5: quick 및 mapped Journey 검증**

Run: `./scripts/verify quick`

Expected: hook, verifier contract, format, lint, typecheck와 전체 Vitest PASS.

Run: `pnpm exec playwright test e2e/work-overview.spec.ts`

Expected: Chromium `work-overview` PASS.

- [ ] **Step 6: 구현 commit**

```bash
git add src/widgets/app-shell/index.tsx src/app/router.test.tsx
git commit -m "fix(nav): 선택 표시선 제거"
```

### Task 2: viewport evidence와 완료 검토

**Files:**
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Task 1 구현 commit의 `AppShell` selected style
- Produces: `NAV-SELECTED-LINE-01`의 재현 가능한 자동·browser·review evidence

- [ ] **Step 1: agent-browser로 desktop과 mobile 확인**

`agent-browser`의 named session `nav-selected-line-01`을 사용한다. 1280×720과 390×844에서 selected link를 확인한다.

Expected:

- current link는 `aria-current="page"`와 `bg-primary/35` computed background를 유지한다.
- `getComputedStyle(link, "::before")`는 line을 만드는 width/height/background 조합을 갖지 않는다.
- keyboard focus가 보이고 layout clipping이 없다.
- console과 page error가 없다.

- [ ] **Step 2: evidence 기록**

`docs/quality/evidence/work-overview.md`에 requirement, implementation commit, route/viewport, precondition/action, expected/actual, console/network, screenshot, failure classification과 rerun verdict를 추가한다. `TODO.md`의 `NAV-SELECTED-LINE-01` Evidence에 자동·browser 결과를 추가하되 아직 `IN_PROGRESS`를 유지한다.

- [ ] **Step 3: plan-completion second-pass review**

설계·계획·implementation commit diff를 새로 읽고 다음을 확인한다.

- pseudo-element utility가 공통 active branch에서 모두 제거됐는가
- selected 배경색, `aria-current`, focus와 route 동작이 유지되는가
- 선 부재 전용 test나 새 abstraction/dependency가 추가되지 않았는가
- 자동/browser evidence와 TODO dependency/status가 일치하는가
- 관련 없는 diff, secret, debug output 또는 생성 noise가 없는가

HIGH/MEDIUM finding은 교정하고 관련 gate를 재실행한다. Review target, reviewer role, checks, findings, corrections, rerun과 verdict를 evidence에 기록한다.

- [ ] **Step 4: TODO 완료와 최종 문서 commit**

Review PASS 뒤에만 `NAV-SELECTED-LINE-01`을 `[x]`/`AI_VERIFIED`로 전환한다.

```bash
git add TODO.md docs/quality/evidence/work-overview.md docs/superpowers/plans/2026-09-03-navigation-selected-line-removal.md
git commit -m "docs(qa): 선택 표시선 제거 근거 기록"
```

- [ ] **Step 5: 최종 상태 확인**

Run: `git diff --check HEAD^ HEAD && git status --short`

Expected: diff check PASS, tracked working tree clean. AI는 새로운 `HUMAN_APPROVED` 또는 final acceptance를 기록하지 않는다.
