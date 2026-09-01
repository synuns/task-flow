# Work Overview Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 구현을 baseline으로 재사용해 `work-overview`의 dashboard, profile, authenticated navigation을 current commit에서 검증하고 독립 review 뒤 사람 checkpoint를 요청한다.

**Architecture:** `AuthRouteBoundary → AppShell → DashboardSummary/UserProfile → TanStack Query → injected ApiClient` 흐름을 유지한다. 각 view task는 gap audit 뒤 실제 누락이 있을 때만 가장 낮은 test의 RED와 최소 production 수정으로 교정하며, gap이 없으면 code를 늘리지 않고 focused·browser evidence로 닫는다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, TanStack Query 5.102.8, MSW 2.15.0, shadcn/ui owned primitives, Tailwind CSS 4.3.3, Vitest 4.1.11, Testing Library 16.3.3, Playwright 1.62.1, agent-browser

## Global Constraints

- API authority는 `assignment-original/openapi.yaml`이며 dashboard/user는 bearer `GET`, `200` response와 `401 ErrorResponse`만 사용한다.
- 범위는 `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`; route는 `/`, `/user`, navigation 확인용 `/task`다.
- `docs/superpowers/specs/2026-09-01-work-overview-journey-design.md`의 gap-first 계약과 승인된 Focus workspace 화면을 유지한다.
- auth storage, refresh/replay, protected-route 결과, API schema, dependency와 architecture를 변경하지 않는다.
- avatar, edit, logout, 새 field, production debug route와 페이지별 E2E 증식을 추가하지 않는다.
- production behavior 변경은 RED를 먼저 확인한다. acceptance가 이미 충족되면 억지 RED, duplicate assertion과 production diff를 만들지 않는다.
- 한 번에 dependency가 완료된 TODO task 하나만 `IN_PROGRESS`로 만들고 task block owner만 그 block을 갱신한다.
- 각 task는 focused test 뒤 `./scripts/verify quick`과 적용 가능한 browser QA를 통과한 뒤에만 `AI_VERIFIED`로 닫는다.
- Browser QA는 task ID를 포함한 named agent-browser session, `390x844`와 `1280x720`, fresh snapshot, console/network/error, screenshot과 session close를 사용한다.
- 구현 plan의 마지막 automatic/browser verification 뒤 plan-completion adversarial review를 실행하며, 동일 target이면 `WORK-JOURNEY-REVIEW-01`과 한 review record를 공유한다.
- AI는 `JOURNEY-WORK-01`을 `HUMAN_APPROVED`로 바꾸지 않는다.

## Execution Entry

Plan 실행 전에 `superpowers:using-git-worktrees`를 사용한다. 현재 checkout이 linked worktree가 아니므로 ignored project-local `.worktrees/work-overview-loop`와 branch `feat/work-overview-loop`를 만들고, 다음 read-only safety check를 통과해야 한다.

```bash
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git check-ignore -q .worktrees
git status --short
```

Worktree 기준 commit은 이 plan commit이어야 한다. 원 checkout의 `AI_USAGE.md`, `artifacts/index.md`, `artifacts/codex-session-*.md` 변경은 가져오거나 commit하지 않는다.

## File Map

- Preserve unless a proven gap requires the exact local correction: `src/widgets/dashboard-summary/index.tsx`
- Preserve unless a proven gap requires the exact local correction: `src/widgets/user-profile/index.tsx`
- Preserve unless a proven gap requires the exact local correction: `src/widgets/app-shell/index.tsx`
- Preserve route composition: `src/pages/dashboard/index.tsx`, `src/pages/user/index.tsx`, `src/app/router.tsx`
- Preserve API/auth boundaries: `src/shared/api/dashboard.ts`, `src/shared/api/user.ts`, `src/shared/api/authenticated-request.ts`, `src/app/auth/*`
- Verify dashboard states: `src/widgets/dashboard-summary/dashboard-summary.test.tsx`
- Verify profile states: `src/widgets/user-profile/user-profile.test.tsx`
- Verify navigation: `src/widgets/app-shell/app-shell.test.tsx`, `src/app/router.test.tsx`, `src/test/theme-contract.test.ts`
- Verify API/auth: `src/shared/api/dashboard.test.ts`, `src/shared/api/user.test.ts`, `src/shared/api/authenticated-request.test.ts`, `src/app/auth/auth-provider.test.tsx`
- Preserve and only strengthen a proven cross-boundary assertion: `e2e/work-overview.spec.ts`
- Replace stale baseline with sectioned current-target records: `docs/quality/evidence/work-overview.md`
- Update only the active task block: `TODO.md`

## Interfaces

- `getDashboard(client: ApiClient, signal?: AbortSignal): Promise<DashboardMetrics>` returns `numOfTask`, `numOfRestTask`, `numOfDoneTask` after the generated-contract guard.
- `getUser(client: ApiClient, signal?: AbortSignal): Promise<UserProfileData>` returns `name`, `memo` after the generated-contract guard.
- `DashboardSummary(): JSX.Element` owns loading, recoverable error/retry, zero and success presentation.
- `UserProfile(): JSX.Element` owns loading, recoverable error/retry and success presentation.
- `AppShell({ authAction }: { authAction: AuthAction }): JSX.Element` owns the three visible navigation actions and responsive shell.
- `createAuthenticatedRequest(auth: AuthCallbacks): AuthenticatedRequest` owns bearer injection, refresh and bounded replay.
- `e2e/work-overview.spec.ts` proves the representative authenticated success path without calling `/api/sign-in`.

---

### Task 1: `DASHBOARD-VIEW-01` current-target acceptance를 검증한다

**Files:**
- Inspect: `src/widgets/dashboard-summary/index.tsx`
- Test: `src/widgets/dashboard-summary/dashboard-summary.test.tsx`
- Inspect: `src/shared/api/dashboard.ts`
- Test: `src/shared/api/dashboard.test.ts`
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `getDashboard`, `dashboardKeys.all`, `AsyncLoading`, `AsyncError`, `Card`, `Progress`
- Produces: loading/error/retry/zero/success와 bearer dashboard request의 current-target evidence

- [ ] **Step 1: Claim only `DASHBOARD-VIEW-01`**

Change its checkbox remains `[ ]`, `Status: IN_PROGRESS`, and replace `Evidence: 없음` with the executing session ID, branch `feat/work-overview-loop`, `git rev-parse HEAD`, requirement `DASH-01`, and the plan path. Do not modify another open task block.

- [ ] **Step 2: Re-run the required lookup before any production edit**

```bash
rg -n 'DASHBOARD-VIEW-01|DASH-01|WORK-P1-2|/api/dashboard|DashboardSummary|numOfTask|numOfRestTask|numOfDoneTask' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: the flow resolves through `DashboardPage → DashboardSummary → getDashboard`; the existing component suite covers loading, recoverable retry, zero and `3/2/1` success.

- [ ] **Step 3: Run the lowest sufficient focused tests**

```bash
pnpm vitest run src/widgets/dashboard-summary/dashboard-summary.test.tsx src/shared/api/dashboard.test.ts
```

Expected baseline: 2 files and 5 tests PASS. If this exact baseline passes, do not edit production or duplicate the assertions. If an acceptance assertion fails, record its expected and actual failure in the active TODO evidence before editing, then change only `src/widgets/dashboard-summary/index.tsx` or its existing test to correct that observed gap.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: setup, format check, lint, typecheck and all Vitest tests PASS without repository mutation.

- [ ] **Step 5: Start the existing app for browser QA**

Run this in a dedicated terminal session from the worktree and keep the session alive only through the browser steps:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

Expected: Vite serves `http://127.0.0.1:4173`.

- [ ] **Step 6: Establish the approved authenticated fixture without sign-in**

```bash
agent-browser --session dashboard-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session dashboard-view-01 eval 'localStorage.setItem("__msw-cookie-store__",JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));sessionStorage.setItem("__kbhc_msw_auth_fixture__",JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));location.assign("/")'
agent-browser --session dashboard-view-01 wait --url '**/'
agent-browser --session dashboard-view-01 wait --load networkidle
```

Expected: the app bootstraps through `/api/refresh`, then `/api/dashboard` succeeds without a `/api/sign-in` request.

- [ ] **Step 7: Verify dashboard success and responsive layout**

```bash
agent-browser --session dashboard-view-01 set viewport 1280 720
agent-browser --session dashboard-view-01 snapshot -i
agent-browser --session dashboard-view-01 eval 'Array.from(document.querySelectorAll("dl > div")).map((row)=>[row.querySelector("dt")?.textContent?.trim(),row.querySelector("dd")?.textContent?.trim()])'
agent-browser --session dashboard-view-01 eval '({width:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontFamily,progress:document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")})'
agent-browser --session dashboard-view-01 screenshot /tmp/kbhc-dashboard-view-01-desktop.png
agent-browser --session dashboard-view-01 set viewport 390 844
agent-browser --session dashboard-view-01 snapshot -i
agent-browser --session dashboard-view-01 eval '({width:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session dashboard-view-01 screenshot /tmp/kbhc-dashboard-view-01-mobile.png
```

Expected: the pairs are `전체 할 일/3`, `남은 할 일/2`, `완료한 일/1`; progress is about one third; computed font contains `Pretendard`; document width does not exceed the viewport.

- [ ] **Step 8: Verify recoverable dashboard failure and retry without adding a debug API**

```bash
agent-browser --session dashboard-view-01 network route '**/api/dashboard' --abort
agent-browser --session dashboard-view-01 reload
agent-browser --session dashboard-view-01 snapshot -i
agent-browser --session dashboard-view-01 network unroute '**/api/dashboard'
agent-browser --session dashboard-view-01 find role button click --name '다시 불러오기'
agent-browser --session dashboard-view-01 wait --load networkidle
agent-browser --session dashboard-view-01 snapshot -i
agent-browser --session dashboard-view-01 network requests --filter api
agent-browser --session dashboard-view-01 console
agent-browser --session dashboard-view-01 errors
agent-browser --session dashboard-view-01 close
```

Expected: aborted request produces the recoverable Alert and retry restores `3/2/1`; no unexpected console or page error remains after recovery. The expected failed request is recorded, not hidden.

- [ ] **Step 9: Record current-target evidence and close the task**

Add a `## DASHBOARD-VIEW-01` section to `docs/quality/evidence/work-overview.md` with requirement, full commit SHA, commands/results, both viewport records, API request/header observation, screenshot paths, expected/actual, failure class/correction/rerun. Then set the task checkbox to `[x]`, `Status: AI_VERIFIED`, and summarize the same reproducible evidence in its owned TODO block.

- [ ] **Step 10: Commit the independently testable dashboard result**

```bash
git add TODO.md docs/quality/evidence/work-overview.md
git diff --cached --check
git commit -m "docs(work): 대시보드 화면 검증 근거 기록"
```

If a proven gap required source or test changes, add only those exact files and use `fix(work): 대시보드 화면 결함 수정` instead.

---

### Task 2: `PROFILE-VIEW-01` current-target acceptance를 검증한다

**Files:**
- Inspect: `src/widgets/user-profile/index.tsx`
- Test: `src/widgets/user-profile/user-profile.test.tsx`
- Inspect: `src/shared/api/user.ts`
- Test: `src/shared/api/user.test.ts`
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `getUser`, `userKeys.all`, `AsyncLoading`, `AsyncError`, `Card`
- Produces: loading/error/retry와 name/memo success의 current-target evidence

- [ ] **Step 1: Claim only `PROFILE-VIEW-01`**

Change its checkbox remains `[ ]`, set `Status: IN_PROGRESS`, and record the executing session, branch, start SHA, requirement `USER-01`, and plan path. `DASHBOARD-VIEW-01` must already be `AI_VERIFIED` even though it is not a direct dependency; this preserves the repository's one-task execution order.

- [ ] **Step 2: Locate the profile Journey flow**

```bash
rg -n 'PROFILE-VIEW-01|USER-01|WORK-P1-3|/api/user|UserProfile|name|memo' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: `UserPage → UserProfile → getUser`, with loading, retry and name/memo rendering already present.

- [ ] **Step 3: Run the lowest sufficient focused tests**

```bash
pnpm vitest run src/widgets/user-profile/user-profile.test.tsx src/shared/api/user.test.ts
```

Expected baseline: 2 files and 4 tests PASS. A passing baseline means no production/test edit. A real failure is recorded as RED and corrected only in the owning profile widget or existing focused test.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 5: Establish the independent authenticated profile fixture**

Start `pnpm dev --host 127.0.0.1 --port 4173` in a dedicated terminal if Task 1's server is no longer running, then execute:

```bash
agent-browser --session profile-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session profile-view-01 eval 'localStorage.setItem("__msw-cookie-store__",JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));sessionStorage.setItem("__kbhc_msw_auth_fixture__",JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));location.assign("/user")'
agent-browser --session profile-view-01 wait --url '**/user'
agent-browser --session profile-view-01 wait --load networkidle
```

Expected: refresh then bearer `/api/user`, no `/api/sign-in`.

- [ ] **Step 6: Verify profile success at both viewports**

```bash
agent-browser --session profile-view-01 set viewport 1280 720
agent-browser --session profile-view-01 snapshot -i
agent-browser --session profile-view-01 eval 'Array.from(document.querySelectorAll("dl > div")).map((row)=>[row.querySelector("dt")?.textContent?.trim(),row.querySelector("dd")?.textContent])'
agent-browser --session profile-view-01 screenshot /tmp/kbhc-profile-view-01-desktop.png
agent-browser --session profile-view-01 set viewport 390 844
agent-browser --session profile-view-01 snapshot -i
agent-browser --session profile-view-01 eval '({width:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session profile-view-01 screenshot /tmp/kbhc-profile-view-01-mobile.png
```

Expected: `이름/김담당`, `메모/오늘도 차근차근`, no horizontal overflow, one description Card.

- [ ] **Step 7: Verify recoverable profile failure and retry**

```bash
agent-browser --session profile-view-01 network route '**/api/user' --abort
agent-browser --session profile-view-01 reload
agent-browser --session profile-view-01 snapshot -i
agent-browser --session profile-view-01 network unroute '**/api/user'
agent-browser --session profile-view-01 find role button click --name '다시 불러오기'
agent-browser --session profile-view-01 wait --load networkidle
agent-browser --session profile-view-01 snapshot -i
agent-browser --session profile-view-01 network requests --filter api
agent-browser --session profile-view-01 console
agent-browser --session profile-view-01 errors
agent-browser --session profile-view-01 close
```

Expected: Alert then successful name/memo recovery with the expected aborted request documented.

- [ ] **Step 8: Record evidence and close the task**

Add `## PROFILE-VIEW-01` to the evidence file, including exact SHA, focused/quick results, both viewport records, API bearer observation, screenshots and failure/retry record. Set only the profile task `[x]` and `AI_VERIFIED`.

- [ ] **Step 9: Commit the profile result**

```bash
git add TODO.md docs/quality/evidence/work-overview.md
git diff --cached --check
git commit -m "docs(work): 회원정보 화면 검증 근거 기록"
```

If a gap required source/test changes, stage only those owners and use `fix(work): 회원정보 화면 결함 수정`.

---

### Task 3: `WORK-NAV-RESPONSIVE-01` authenticated route navigation을 검증한다

**Files:**
- Inspect: `src/widgets/app-shell/index.tsx`
- Test: `src/widgets/app-shell/app-shell.test.tsx`
- Test: `src/app/router.test.tsx`
- Test: `src/test/theme-contract.test.ts`
- Modify only for a proven cross-boundary gap: `e2e/work-overview.spec.ts`
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed dashboard/profile views, authenticated `AuthAction`, router route table
- Produces: `/ → /user → /task → /`, distinct icons, current route, keyboard, Pretendard and responsive layout evidence

- [ ] **Step 1: Claim only `WORK-NAV-RESPONSIVE-01`**

Set `IN_PROGRESS` and record owner/start SHA after confirming both view dependencies are `AI_VERIFIED`.

- [ ] **Step 2: Locate the route and shell acceptance**

```bash
rg -n 'WORK-NAV-RESPONSIVE-01|SYS-03|NAV-01|NAV-03|AppShell|aria-current|Pretendard|/user|/task' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: existing AppShell tests prove icon identity and keyboard order; router tests prove auth action and current route; theme contract proves local Pretendard source.

- [ ] **Step 3: Run focused shell/router/theme tests**

```bash
pnpm vitest run src/widgets/app-shell/app-shell.test.tsx src/app/router.test.tsx src/test/theme-contract.test.ts
```

Expected baseline: 3 files and 12 tests PASS. Do not add class/pixel assertions already proven by these tests and browser evidence.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 5: Run the responsive navigation browser sequence**

Start `pnpm dev --host 127.0.0.1 --port 4173` in a dedicated terminal, then establish the authenticated fixture and run the route sequence:

```bash
agent-browser --session work-nav-responsive-01 open http://127.0.0.1:4173/sign-in
agent-browser --session work-nav-responsive-01 eval 'localStorage.setItem("__msw-cookie-store__",JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));sessionStorage.setItem("__kbhc_msw_auth_fixture__",JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));location.assign("/")'
agent-browser --session work-nav-responsive-01 wait --url '**/'
agent-browser --session work-nav-responsive-01 set viewport 1280 720
agent-browser --session work-nav-responsive-01 wait --load networkidle
agent-browser --session work-nav-responsive-01 snapshot -i
agent-browser --session work-nav-responsive-01 find role link click --name '회원정보'
agent-browser --session work-nav-responsive-01 wait --url '**/user'
agent-browser --session work-nav-responsive-01 snapshot -i
agent-browser --session work-nav-responsive-01 find role link click --name '할 일'
agent-browser --session work-nav-responsive-01 wait --url '**/task'
agent-browser --session work-nav-responsive-01 snapshot -i
agent-browser --session work-nav-responsive-01 find role link click --name '대시보드'
agent-browser --session work-nav-responsive-01 wait --url '**/'
agent-browser --session work-nav-responsive-01 snapshot -i
agent-browser --session work-nav-responsive-01 eval '({font:getComputedStyle(document.documentElement).fontFamily,header:getComputedStyle(document.querySelector("header")).width,current:document.querySelector("a[aria-current=page]")?.textContent?.trim()})'
```

Expected desktop: route order is exact, current label follows each route, font contains Pretendard, sidebar width is `224px`.

- [ ] **Step 6: Verify mobile action size, keyboard order and overlap**

```bash
agent-browser --session work-nav-responsive-01 set viewport 390 844
agent-browser --session work-nav-responsive-01 snapshot -i
agent-browser --session work-nav-responsive-01 press Tab
agent-browser --session work-nav-responsive-01 eval 'document.activeElement?.textContent?.trim()'
agent-browser --session work-nav-responsive-01 press Tab
agent-browser --session work-nav-responsive-01 eval 'document.activeElement?.textContent?.trim()'
agent-browser --session work-nav-responsive-01 press Tab
agent-browser --session work-nav-responsive-01 eval 'document.activeElement?.textContent?.trim()'
agent-browser --session work-nav-responsive-01 eval '({width:document.documentElement.scrollWidth,viewport:innerWidth,targets:Array.from(document.querySelectorAll("nav a")).map((link)=>({label:link.textContent?.trim(),height:link.getBoundingClientRect().height,icon:link.querySelector("svg")?.getAttribute("class")})),headerPosition:getComputedStyle(document.querySelector("header")).position,headerBottom:getComputedStyle(document.querySelector("header")).bottom})'
agent-browser --session work-nav-responsive-01 network requests --filter api
agent-browser --session work-nav-responsive-01 console
agent-browser --session work-nav-responsive-01 errors
agent-browser --session work-nav-responsive-01 screenshot /tmp/kbhc-work-nav-responsive-01-mobile.png
agent-browser --session work-nav-responsive-01 close
```

Expected: focus order dashboard/task/profile, three distinct Lucide classes, each target at least 48px, fixed bottom header, no horizontal overflow, no unexpected console/page error.

- [ ] **Step 7: Record evidence and close the task**

Add `## WORK-NAV-RESPONSIVE-01` with exact routes, both viewport results, keyboard order, icons, font, console/network and screenshot. Set only this task `[x]` and `AI_VERIFIED`.

- [ ] **Step 8: Commit the navigation result**

```bash
git add TODO.md docs/quality/evidence/work-overview.md
git diff --cached --check
git commit -m "docs(work): 반응형 탐색 검증 근거 기록"
```

Use `fix(work): 반응형 탐색 결함 수정` only if a recorded RED required source/test changes.

---

### Task 4: `WORK-JOURNEY-VERIFY-01` current commit 통합 evidence를 만든다

**Files:**
- Test: `src/widgets/dashboard-summary/dashboard-summary.test.tsx`
- Test: `src/widgets/user-profile/user-profile.test.tsx`
- Test: `src/widgets/app-shell/app-shell.test.tsx`
- Test: `src/app/router.test.tsx`
- Test: `src/test/theme-contract.test.ts`
- Test: `src/shared/api/dashboard.test.ts`
- Test: `src/shared/api/user.test.ts`
- Test: `src/shared/api/authenticated-request.test.ts`
- Test: `src/app/auth/auth-provider.test.tsx`
- Test: `e2e/work-overview.spec.ts`
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: all three completed implementation task records
- Produces: exact target SHA의 `WORK-P1-1`~`WORK-P1-4`, `WORK-E1` 통합 record

- [ ] **Step 1: Claim `WORK-JOURNEY-VERIFY-01`**

Set `IN_PROGRESS`, owner, start SHA and plan path only after `WORK-NAV-RESPONSIVE-01` is `AI_VERIFIED`.

- [ ] **Step 2: Trace every Journey case to evidence**

```bash
rg -n 'WORK-P1-1|WORK-P1-2|WORK-P1-3|WORK-P1-4|WORK-E1|SYS-03|NAV-01|NAV-03|DASH-01|USER-01' docs/quality/requirements.md docs/quality/evidence/work-overview.md TODO.md src e2e
```

Expected mapping:

- `WORK-P1-1`: AppShell/router tests plus navigation browser record
- `WORK-P1-2`: dashboard component/API tests plus `/` browser record
- `WORK-P1-3`: profile component/API tests plus `/user` browser record
- `WORK-P1-4`: AppShell/theme tests plus desktop/mobile browser record
- `WORK-E1`: authenticated request terminal 401, auth provider termination/cache tests and route-boundary anonymous redirect contract

- [ ] **Step 3: Run the complete focused Journey suite**

```bash
pnpm vitest run src/widgets/app-shell/app-shell.test.tsx src/widgets/dashboard-summary/dashboard-summary.test.tsx src/widgets/user-profile/user-profile.test.tsx src/app/router.test.tsx src/test/theme-contract.test.ts src/shared/api/dashboard.test.ts src/shared/api/user.test.ts src/shared/api/authenticated-request.test.ts src/app/auth/auth-provider.test.tsx src/app/auth/auth-route-boundary.test.tsx
```

Expected: all listed files PASS. Record the exact file/test totals printed by Vitest.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 5: Run the mapped Journey E2E**

```bash
pnpm exec playwright test e2e/work-overview.spec.ts
```

Expected: Chromium representative success PASS; dashboard `3/2/1`, profile fixture, route sequence, bearer headers, zero `/api/sign-in`, Pretendard and 390px layout are observed.

- [ ] **Step 6: Run one current-target named browser sweep**

Start `pnpm dev --host 127.0.0.1 --port 4173` in a dedicated terminal, then execute the current-target sweep:

```bash
agent-browser --session work-journey-verify-01 open http://127.0.0.1:4173/sign-in
agent-browser --session work-journey-verify-01 eval 'localStorage.setItem("__msw-cookie-store__",JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));sessionStorage.setItem("__kbhc_msw_auth_fixture__",JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));location.assign("/")'
agent-browser --session work-journey-verify-01 wait --url '**/'
agent-browser --session work-journey-verify-01 set viewport 1280 720
agent-browser --session work-journey-verify-01 wait --load networkidle
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '회원정보'
agent-browser --session work-journey-verify-01 wait --url '**/user'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '할 일'
agent-browser --session work-journey-verify-01 wait --url '**/task'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '대시보드'
agent-browser --session work-journey-verify-01 wait --url '**/'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 screenshot /tmp/kbhc-work-journey-verify-01-desktop.png
agent-browser --session work-journey-verify-01 set viewport 390 844
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '회원정보'
agent-browser --session work-journey-verify-01 wait --url '**/user'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '할 일'
agent-browser --session work-journey-verify-01 wait --url '**/task'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 find role link click --name '대시보드'
agent-browser --session work-journey-verify-01 wait --url '**/'
agent-browser --session work-journey-verify-01 snapshot -i
agent-browser --session work-journey-verify-01 eval '({width:document.documentElement.scrollWidth,viewport:innerWidth,font:getComputedStyle(document.documentElement).fontFamily,current:document.querySelector("a[aria-current=page]")?.textContent?.trim()})'
agent-browser --session work-journey-verify-01 network requests --filter api
agent-browser --session work-journey-verify-01 console
agent-browser --session work-journey-verify-01 errors
agent-browser --session work-journey-verify-01 screenshot /tmp/kbhc-work-journey-verify-01-mobile.png
agent-browser --session work-journey-verify-01 close
```

Expected: all `WORK-P1-*` observable boundaries pass; no unexpected console/page error or sign-in request.

- [ ] **Step 7: Update the consolidated evidence record**

At the top of `docs/quality/evidence/work-overview.md`, replace the stale commit-level summary with the full output of `git rev-parse HEAD`, exact commands/totals and the current browser record. Keep earlier failure history only when it still explains a current correction; label older `dd57ba3` evidence as historical baseline rather than current acceptance.

Set `WORK-JOURNEY-VERIFY-01` `[x]`, `Status: AI_VERIFIED`, with the same requirement/case trace. Do not change `WORK-JOURNEY-REVIEW-01` or `JOURNEY-WORK-01`.

- [ ] **Step 8: Commit the Journey verification target**

```bash
git add TODO.md docs/quality/evidence/work-overview.md
git diff --cached --check
git commit -m "docs(work): 여정 통합 검증 근거 기록"
git rev-parse HEAD
```

The printed full SHA is the mandatory target for Task 5.

---

### Task 5: Plan-completion과 `WORK-JOURNEY-REVIEW-01` 독립 review를 결합한다

**Files:**
- Inspect: `docs/superpowers/specs/2026-09-01-work-overview-journey-design.md`
- Inspect: `docs/superpowers/plans/2026-09-01-work-overview-journey.md`
- Inspect: `assignment-original/requirement.md`, `assignment-original/openapi.yaml`
- Inspect: `docs/quality/requirements.md`, `docs/quality/evidence/work-overview.md`
- Inspect: all source/test/E2E files named in Task 4
- Modify: `TODO.md`
- Modify if review correction changes evidence: `docs/quality/evidence/work-overview.md`

**Interfaces:**
- Consumes: exact Task 4 target SHA and complete Journey evidence
- Produces: seven-field plan-completion/Journey review record with no unresolved HIGH/MEDIUM finding

- [ ] **Step 1: Claim `WORK-JOURNEY-REVIEW-01` in a fresh reviewer context**

The reviewer must not have authored Task 4's final changes. Record reviewer context ID, relationship to final author and exact target SHA when setting the task `IN_PROGRESS`.

- [ ] **Step 2: Review the immutable target**

Review:

- spec and plan acceptance coverage
- `WORK-P1-1`~`WORK-P1-4`, `WORK-E1` and all five requirement IDs
- OpenAPI dashboard/user bearer, 200/401 and exact fields
- authenticated fixture independence and zero sign-in requests
- loading/error/retry/zero/success, label/value semantics
- current route, icon identity, keyboard, font, 48px target and clipping
- refresh/terminal session and protected cache cleanup evidence
- weak/duplicate/flaky tests, E2E bloat, console/network errors
- unrelated diff, secrets, generated noise and TODO dependency/status consistency

Use read-only commands:

```bash
git show --stat --oneline HEAD
git diff HEAD^ HEAD --check
./scripts/verify quick
pnpm exec playwright test e2e/work-overview.spec.ts
```

- [ ] **Step 3: Correct every HIGH/MEDIUM finding before verdict**

For a finding, record severity, class and root cause before correction. Return code changes to the task owner responsible for the affected boundary, add a RED reproduction where production behavior changes, rerun focused/quick/browser gates, and create a new exact target SHA. The reviewer then reviews the new target; never retain a PASS against the superseded SHA.

- [ ] **Step 4: Record the combined review**

The `WORK-JOURNEY-REVIEW-01` Evidence must contain all seven fields with actual values:

```text
Review target: plan path, requirement/Journey IDs, exact target commit SHA
Reviewer: fresh context ID and relationship to final author
Checks: source, tests, browser/network, evidence and TODO checks actually performed
Findings: none or severity/class/root cause
Corrections: not applicable or applied changes
Rerun: exact reproduction commands and results
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

If the plan path, IDs and target are identical, state that this record satisfies both plan-completion adversarial review and `work-overview` Journey review.

- [ ] **Step 5: Close only the review task when eligible**

With PASS or PASS_WITH_LOW and no unresolved HIGH/MEDIUM finding, set `WORK-JOURNEY-REVIEW-01` `[x]`, `Status: AI_VERIFIED`. Leave `JOURNEY-WORK-01` `[ ]`, `Status: BLOCKED`.

- [ ] **Step 6: Commit the review record**

```bash
git add TODO.md docs/quality/evidence/work-overview.md
git diff --cached --check
git commit -m "docs(work): 여정 독립 검토 근거 기록"
```

Do not commit the evidence file if the review did not change it.

---

### Task 6: `JOURNEY-WORK-01` 사람 checkpoint를 요청한다

**Files:**
- Read: `TODO.md`
- Read: `docs/quality/evidence/work-overview.md`

**Interfaces:**
- Consumes: current target evidence and completed independent review
- Produces: 사람의 명시적 승인 요청; code 또는 status mutation 없음

- [ ] **Step 1: Run checkpoint readiness verification**

```bash
./scripts/verify setup
git status --short
git log -1 --format='%H %s'
```

Expected: setup PASS; worktree has no owned uncommitted change; latest commit is the independent review record.

- [ ] **Step 2: Present one checkpoint request**

Report the exact target SHA, requirement IDs, focused/quick/E2E totals, both browser viewport evidence, console/network verdict, review target/reviewer/findings/corrections/verdict, and links to the evidence/spec/plan.

- [ ] **Step 3: Stop at the human boundary**

Do not start `task-discovery`, do not change `JOURNEY-WORK-01`, and do not claim `work-overview` complete. Only a person may change the checkbox and `Status: HUMAN_APPROVED` after reviewing the current evidence.
