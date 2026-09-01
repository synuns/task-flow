# Task Discovery Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 task 목록 화면을 current target에서 검증하고 실제 gap만 교정해 `task-discovery` Journey의 자동·browser evidence, 독립 review와 사람 checkpoint 요청까지 완성한다.

**Architecture:** 기존 `TaskListPage → TaskList → useInfiniteQuery/getTasks → ApiClient → TanStack Virtual → TaskCard` 흐름을 유지한다. 각 TODO task는 acceptance audit 뒤 기존 test가 충분하면 제품 code를 늘리지 않고 evidence로 닫으며, 실패가 확인된 경계에만 가장 낮은 test의 RED와 최소 수정을 적용한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, TanStack Query 5.102.8, TanStack Virtual 3.14.10, MSW 2.15.0, shadcn/ui owned primitives, Tailwind CSS 4.3.3, Vitest 4.1.11, Testing Library 16.3.3, Playwright 1.62.1, agent-browser

## Global Constraints

- API authority는 `assignment-original/openapi.yaml`이며 목록은 bearer `GET /api/task`, required integer `page >= 1`, `200 TaskListResponse`와 `401 ErrorResponse`만 제품 계약으로 사용한다.
- 범위는 `TASK-LIST-01`~`TASK-LIST-05`, `/task`와 목록에서 `/task/:id`로 이동하는 경계다.
- `docs/superpowers/specs/2026-09-02-task-discovery-journey-design.md`의 gap-first 계약과 승인된 Focus workspace 화면을 유지한다.
- `TaskItem.status`는 response guard와 fixture에만 사용하고 badge, filter 또는 별도 상태 UI로 표시하지 않는다.
- auth storage, refresh/replay, protected-route 결과, API schema, fixture 의미, dependency와 architecture를 변경하지 않는다.
- 검색, 정렬, filter, 생성·수정 action, generic list abstraction, production debug route와 상태별 E2E 증식을 추가하지 않는다.
- production behavior 변경은 RED를 먼저 확인한다. acceptance가 이미 충족되면 억지 RED, duplicate assertion과 production diff를 만들지 않는다.
- 한 번에 dependency가 완료된 TODO task 하나만 `IN_PROGRESS`로 만들고 task block owner만 그 block을 갱신한다.
- 각 implementation task는 focused test 뒤 `./scripts/verify quick`과 적용 가능한 browser QA를 통과한 뒤에만 `AI_VERIFIED`로 닫는다.
- Browser QA는 task ID를 포함한 named agent-browser session, `390x844`와 `1280x720`, fresh snapshot, 실제 interaction, console/network/error, screenshot과 session close를 사용한다.
- `TASK-LIST-JOURNEY-VERIFY-01`은 focused → quick → mapped Journey E2E → full 순서로 검증한다.
- 마지막 automatic/browser verification 뒤 plan-completion adversarial review를 실행하며, 동일 target이면 `TASK-LIST-JOURNEY-REVIEW-01`과 같은 record를 사용한다.
- AI는 `JOURNEY-TASK-LIST-01`을 `HUMAN_APPROVED`로 바꾸지 않는다.

## Execution Entry

실행 위치는 이미 생성된 linked worktree다.

```bash
cd /Users/identity/dev/assignment/kbhc-assgn/.worktrees/feat-task-discovery-loop
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git status --short
```

Expected: branch는 `feat/task-discovery-loop`, worktree는 clean이며 plan commit을 포함한다. 원 checkout의 `AI_USAGE.md`, `artifacts/index.md`, `artifacts/codex-session-*.md` 변경은 가져오거나 commit하지 않는다.

## File Map

- Preserve unless a proven Card gap exists: `src/entities/task/ui/task-card.tsx`
- Verify Card acceptance: `src/entities/task/ui/task-card.test.tsx`
- Preserve unless a proven list gap exists: `src/widgets/task-list/index.tsx`
- Verify virtual/pagination/state acceptance: `src/widgets/task-list/task-list.test.tsx`
- Preserve page composition: `src/pages/task-list/index.tsx`
- Preserve API boundary: `src/shared/api/tasks.ts`, `src/shared/api/tasks.test.ts`
- Preserve auth boundaries: `src/app/auth/authenticated-api-bridge.test.tsx`, `src/app/auth/auth-route-boundary.test.tsx`
- Preserve mock store/handler: `src/mocks/fixtures/tasks.ts`, `src/mocks/handlers/tasks.ts`
- Verify mock contract: `src/mocks/fixtures/tasks.test.ts`, `src/mocks/handlers/tasks.test.ts`
- Preserve and only strengthen a proven cross-boundary assertion: `e2e/task-discovery.spec.ts`
- Replace stale baseline with sectioned current-target records: `docs/quality/evidence/task-discovery.md`
- Update only the active task block: `TODO.md`

## Interfaces

- `getTasks(client: ApiClient, page: number, signal?: AbortSignal): Promise<TaskPage>` sends `GET /api/task?page=N` and validates required TaskItem fields plus `hasNext`.
- `TaskList(): JSX.Element` owns infinite query, flattened pages, virtual range, initial/empty/page-error/loading/terminal states and next-page trigger.
- `TaskCard({ id, title, memo }: TaskCardProps): JSX.Element` renders one whole-card Link to `/task/${encodeURIComponent(id)}` without status UI.
- `taskKeys.all` is the protected list query root cleared by the existing auth boundary.
- `listTaskPage(page: number): TaskListResponse` provides deterministic two-record pages from the reset MSW store.
- `e2e/task-discovery.spec.ts` proves the representative authenticated page sequence, bounded DOM and detail navigation without `/api/sign-in`.

---

### Task 1: `TASK-CARD-VIEW-01` task card acceptance를 검증한다

**Files:**
- Inspect: `src/entities/task/ui/task-card.tsx`
- Test: `src/entities/task/ui/task-card.test.tsx`
- Modify only for a proven gap: `src/entities/task/ui/task-card.tsx`, `src/entities/task/ui/task-card.test.tsx`
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `TaskCardProps`, shared `Card`, global focus ring, React Router `Link`
- Produces: title/memo hierarchy, status absence, whole-card encoded route, pointer/keyboard evidence

- [ ] **Step 1: Claim only `TASK-CARD-VIEW-01`**

Keep checkbox `[ ]`, set `Status: IN_PROGRESS`, and replace `Evidence: 없음` with executing session `/root`, branch `feat/task-discovery-loop`, `git rev-parse HEAD`, requirements `TASK-LIST-02`, `TASK-LIST-05`, and this plan path. Do not modify another open task block.

- [ ] **Step 2: Re-run Journey lookup before a production edit**

```bash
rg -n 'TASK-CARD-VIEW-01|TASK-LIST-02|TASK-LIST-05|DISC-P1-2|DISC-P1-5|TaskCard|/task/:id|encodeURIComponent' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: `TaskList → TaskCard → encoded Link`; title/memo and no status UI already have one focused component test.

- [ ] **Step 3: Run the lowest sufficient Card test**

```bash
pnpm vitest run src/entities/task/ui/task-card.test.tsx
```

Expected baseline: 1 file and 1 test PASS. If it passes and the component still uses one whole-card Link with global `:focus-visible`, do not edit production or duplicate the test. A real acceptance failure must be recorded as RED in the active TODO block before changing only the Card owner and its existing test.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: setup, format check, lint, generated API check, typecheck and all Vitest tests PASS without repository mutation.

- [ ] **Step 5: Start the app for Card browser QA**

Run in a dedicated terminal session and keep it alive only through this task:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

Expected: Vite serves `http://127.0.0.1:4173`.

- [ ] **Step 6: Establish the independent authenticated fixture**

```bash
agent-browser --session task-card-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-card-view-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task");
EVALEOF
agent-browser --session task-card-view-01 wait --url '**/task'
agent-browser --session task-card-view-01 wait --load networkidle
```

Expected: refresh establishes the approved session; `/api/task?page=1` loads without `/api/sign-in`.

- [ ] **Step 7: Verify desktop pointer interaction and exact route**

```bash
agent-browser --session task-card-view-01 set viewport 1280 720
agent-browser --session task-card-view-01 snapshot -i
agent-browser --session task-card-view-01 find role link hover --name '첫 번째 할 일'
agent-browser --session task-card-view-01 eval '(()=>{const link=document.querySelector("a[href=\"/task/task-1\"]");return {href:link?.getAttribute("href"),text:link?.textContent,statusVisible:link?.textContent?.includes("TODO")}})()'
agent-browser --session task-card-view-01 screenshot /tmp/kbhc-task-card-view-01-desktop.png
agent-browser --session task-card-view-01 find role link click --name '첫 번째 할 일'
agent-browser --session task-card-view-01 wait --url '**/task/task-1'
agent-browser --session task-card-view-01 get url
```

Expected: href is `/task/task-1`, text contains title and memo, `TODO` is absent, pointer click reaches exact detail route.

- [ ] **Step 8: Verify mobile keyboard focus and navigation**

```bash
agent-browser --session task-card-view-01 open http://127.0.0.1:4173/task
agent-browser --session task-card-view-01 wait --load networkidle
agent-browser --session task-card-view-01 set viewport 390 844
agent-browser --session task-card-view-01 snapshot -i
agent-browser --session task-card-view-01 press Tab
agent-browser --session task-card-view-01 press Tab
agent-browser --session task-card-view-01 press Tab
agent-browser --session task-card-view-01 press Tab
agent-browser --session task-card-view-01 eval '({href:document.activeElement?.getAttribute("href"),outline:getComputedStyle(document.activeElement).outline,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-card-view-01 press Enter
agent-browser --session task-card-view-01 wait --url '**/task/task-1'
agent-browser --session task-card-view-01 screenshot /tmp/kbhc-task-card-view-01-mobile.png
agent-browser --session task-card-view-01 network requests --filter api
agent-browser --session task-card-view-01 console
agent-browser --session task-card-view-01 errors
agent-browser --session task-card-view-01 close
```

Expected: fourth Tab focuses the first Card Link, outline is visible, Enter navigates, and document width does not exceed 390px. No unexpected console/page error remains.

- [ ] **Step 9: Record evidence and close the task**

Add `## TASK-CARD-VIEW-01` to `docs/quality/evidence/task-discovery.md` with requirement, full commit SHA, focused/quick results, both viewport records, API observation, screenshot paths, expected/actual, failure class/correction/rerun. Set only this task `[x]`, `Status: AI_VERIFIED`.

- [ ] **Step 10: Commit the independently testable result**

```bash
git add TODO.md docs/quality/evidence/task-discovery.md
git diff --cached --check
git commit -m "docs(task): task 카드 화면 검증 근거 기록"
```

If a proven gap required source/test changes, stage only those exact files too and use `fix(task): task 카드 화면 결함 수정`.

---

### Task 2: `TASK-LIST-VIRTUAL-UX-01` responsive virtual viewport를 검증한다

**Files:**
- Inspect: `src/pages/task-list/index.tsx`
- Inspect: `src/widgets/task-list/index.tsx`
- Test: `src/widgets/task-list/task-list.test.tsx`
- Modify only for a proven gap: the same page/widget and existing test
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed `TaskCard`, `useVirtualizer`, stable task ID, row measurement
- Produces: remaining-height scroll region, wrapping, real scroll, bounded mounted DOM evidence

- [ ] **Step 1: Claim only `TASK-LIST-VIRTUAL-UX-01`**

Set `IN_PROGRESS` and record owner, branch, start SHA, requirement `TASK-LIST-03` and plan path after confirming `TASK-CARD-VIEW-01` is `AI_VERIFIED`.

- [ ] **Step 2: Locate the virtual flow and fixed-height history**

```bash
rg -n 'TASK-LIST-VIRTUAL-UX-01|TASK-LIST-03|DISC-P1-3|useVirtualizer|estimateSize|measureElement|getItemKey|overflow-auto|100svh|96px' docs/quality/requirements.md TODO.md src e2e docs/quality/evidence/task-discovery.md
git status --short
```

Expected: 96 is a row estimate; the production scroll region uses remaining viewport height rather than a fixed 96px viewport.

- [ ] **Step 3: Run the focused list suite**

```bash
pnpm vitest run src/widgets/task-list/task-list.test.tsx
```

Expected baseline: 1 file and 5 tests PASS. Do not add pixel/class assertions for browser geometry. A deterministic state or key/measurement failure is RED and may change only the page/widget owner plus this existing test.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 5: Seed enough schema-conforming tasks for real virtualization**

Start the Vite server on port 4173, then:

```bash
agent-browser --session task-list-virtual-ux-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-list-virtual-ux-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.setItem("__kbhc_msw_task_fixture__", JSON.stringify(Array.from({length:40},(_,index)=>({id:`virtual-${index+1}`,title:`가상화 검증 할 일 ${index+1}`,memo:`줄바꿈과 스크롤을 검증하는 메모 ${index+1}`,status:index%2===0?"TODO":"DONE",registerDatetime:"2026-09-02T00:00:00.000Z"}))));
location.assign("/task");
EVALEOF
agent-browser --session task-list-virtual-ux-01 wait --url '**/task'
agent-browser --session task-list-virtual-ux-01 wait --load networkidle
```

Expected: list has more data than one viewport can mount; no production debug surface is used.

- [ ] **Step 6: Verify desktop real scroll and DOM bound**

```bash
agent-browser --session task-list-virtual-ux-01 set viewport 1280 720
agent-browser --session task-list-virtual-ux-01 snapshot -i
agent-browser --session task-list-virtual-ux-01 eval '(()=>{const r=document.querySelector("[aria-label=\"할 일 목록\"]");return {clientHeight:r?.clientHeight,scrollHeight:r?.scrollHeight,mounted:document.querySelectorAll("[data-task-row]").length,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()'
agent-browser --session task-list-virtual-ux-01 scroll down 600 --selector '[aria-label="할 일 목록"]'
agent-browser --session task-list-virtual-ux-01 snapshot -i
agent-browser --session task-list-virtual-ux-01 eval '(()=>{const r=document.querySelector("[aria-label=\"할 일 목록\"]");return {scrollTop:r?.scrollTop,clientHeight:r?.clientHeight,scrollHeight:r?.scrollHeight,mounted:document.querySelectorAll("[data-task-row]").length}})()'
agent-browser --session task-list-virtual-ux-01 screenshot /tmp/kbhc-task-list-virtual-ux-01-desktop.png
```

Expected: `scrollHeight > clientHeight`, scrollTop increases, mounted count remains far below the seeded 40 tasks, and no horizontal overflow appears.

- [ ] **Step 7: Verify mobile wrapping, scroll stability and cleanup**

```bash
agent-browser --session task-list-virtual-ux-01 set viewport 390 844
agent-browser --session task-list-virtual-ux-01 snapshot -i
agent-browser --session task-list-virtual-ux-01 eval '(()=>{const r=document.querySelector("[aria-label=\"할 일 목록\"]");return {scrollTop:r?.scrollTop,clientHeight:r?.clientHeight,scrollHeight:r?.scrollHeight,mounted:document.querySelectorAll("[data-task-row]").length,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()'
agent-browser --session task-list-virtual-ux-01 scroll down 500 --selector '[aria-label="할 일 목록"]'
agent-browser --session task-list-virtual-ux-01 eval 'document.querySelector("[aria-label=\"할 일 목록\"]")?.scrollTop'
agent-browser --session task-list-virtual-ux-01 screenshot /tmp/kbhc-task-list-virtual-ux-01-mobile.png
agent-browser --session task-list-virtual-ux-01 network requests --filter api
agent-browser --session task-list-virtual-ux-01 console
agent-browser --session task-list-virtual-ux-01 errors
agent-browser --session task-list-virtual-ux-01 close
```

Expected: scroll remains usable after resize, Card content is not clipped horizontally, mounted DOM stays bounded and no unexpected error appears.

- [ ] **Step 8: Record evidence, close and commit**

Add `## TASK-LIST-VIRTUAL-UX-01` with seed size, viewport/scroll/mounted measurements, screenshots and command results. Set only this task `[x]`, `AI_VERIFIED`, then:

```bash
git add TODO.md docs/quality/evidence/task-discovery.md
git diff --cached --check
git commit -m "docs(task): 가상 목록 화면 검증 근거 기록"
```

Use `fix(task): 가상 목록 화면 결함 수정` only when a RED-backed source correction is staged.

---

### Task 3: `TASK-LIST-PAGING-UX-01` infinite pagination lifecycle을 검증한다

**Files:**
- Inspect: `src/widgets/task-list/index.tsx`
- Test: `src/widgets/task-list/task-list.test.tsx`
- Inspect: `src/shared/api/tasks.ts`
- Test: `src/shared/api/tasks.test.ts`
- Modify only for a proven gap: those owners and tests
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed virtual viewport, `getNextPageParam`, `fetchNextPage`, AbortSignal
- Produces: automatic end trigger, single in-flight, retry, manual fallback and terminal evidence

- [ ] **Step 1: Claim and locate `TASK-LIST-PAGING-UX-01`**

Set `IN_PROGRESS`, record owner/start SHA, then run:

```bash
rg -n 'TASK-LIST-PAGING-UX-01|TASK-LIST-04|DISC-P1-4|DISC-E1|DISC-E2|getNextPageParam|fetchNextPage|hasNextPage|isFetchingNextPage|page=' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: next page derives from loaded page count, automatic end detection is primary, retry reuses the failed page, and terminal false removes the next action.

- [ ] **Step 2: Run pagination/API focused tests**

```bash
pnpm vitest run src/widgets/task-list/task-list.test.tsx src/shared/api/tasks.test.ts
```

Expected baseline: 2 files and 8 tests PASS. A failure in request sequence, retry or terminal stop is the RED evidence; change only the widget/API owner that causes it.

- [ ] **Step 3: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 4: Verify automatic default page sequence and terminal stop**

Start the Vite server on port 4173, then establish a fresh approved fixture:

```bash
agent-browser --session task-list-paging-ux-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-list-paging-ux-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task");
EVALEOF
agent-browser --session task-list-paging-ux-01 wait --url '**/task'
```

Then verify the lifecycle:

```bash
agent-browser --session task-list-paging-ux-01 set viewport 390 844
agent-browser --session task-list-paging-ux-01 wait --load networkidle
agent-browser --session task-list-paging-ux-01 snapshot -i
agent-browser --session task-list-paging-ux-01 scroll down 600 --selector '[aria-label="할 일 목록"]'
agent-browser --session task-list-paging-ux-01 wait --text '모든 할 일을 불러왔습니다.'
agent-browser --session task-list-paging-ux-01 network requests --filter api
agent-browser --session task-list-paging-ux-01 eval '({terminal:document.body.innerText.includes("모든 할 일을 불러왔습니다."),nextButton:Array.from(document.querySelectorAll("button")).some((button)=>button.textContent?.includes("다음 페이지"))})'
agent-browser --session task-list-paging-ux-01 screenshot /tmp/kbhc-task-list-paging-ux-01-terminal.png
```

Expected: page 1 and page 2 each occur once, terminal text is true, next Button is absent after false.

- [ ] **Step 5: Verify partial-page failure and explicit retry**

```bash
agent-browser --session task-list-paging-ux-01 network route '**/api/task?page=2' --abort
agent-browser --session task-list-paging-ux-01 reload
agent-browser --session task-list-paging-ux-01 wait --text '네트워크 요청에 실패했습니다.'
agent-browser --session task-list-paging-ux-01 snapshot -i
agent-browser --session task-list-paging-ux-01 network unroute '**/api/task?page=2'
agent-browser --session task-list-paging-ux-01 find role button click --name '다시 불러오기'
agent-browser --session task-list-paging-ux-01 wait --text '모든 할 일을 불러왔습니다.'
agent-browser --session task-list-paging-ux-01 network requests --filter api
agent-browser --session task-list-paging-ux-01 console
agent-browser --session task-list-paging-ux-01 errors
agent-browser --session task-list-paging-ux-01 close
```

Expected: page 1 items remain during the page 2 error; retry sends one new page 2 attempt and reaches terminal. The expected aborted request is recorded, not hidden.

- [ ] **Step 6: Record evidence, close and commit**

Add `## TASK-LIST-PAGING-UX-01` with success and failure/retry request sequences. Set only this task `[x]`, `AI_VERIFIED`, then commit TODO and evidence with:

```bash
git commit -m "docs(task): 무한 목록 검증 근거 기록"
```

Stage exact files and run `git diff --cached --check` first. Use a `fix(task): ...` message only for RED-backed product changes.

---

### Task 4: `TASK-LIST-STATES-01` list state presentation을 검증한다

**Files:**
- Inspect: `src/widgets/task-list/index.tsx`
- Test: `src/widgets/task-list/task-list.test.tsx`
- Inspect: `src/shared/ui/alert.tsx`, `src/shared/ui/skeleton.tsx`
- Modify only for a proven gap: task-list widget and its existing test
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed paging lifecycle, shared `Alert`, `Button`, `Skeleton`, `Card`
- Produces: initial loading, empty, initial/partial error, next loading and terminal state evidence

- [ ] **Step 1: Claim and locate `TASK-LIST-STATES-01`**

```bash
rg -n 'TASK-LIST-STATES-01|TASK-LIST-01|TASK-LIST-04|DISC-E1|role="status"|등록된 할 일이 없습니다|다시 불러오기|모든 할 일을' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Record owner/start SHA and set only this task `IN_PROGRESS`.

- [ ] **Step 2: Run the focused state suite**

```bash
pnpm vitest run src/widgets/task-list/task-list.test.tsx
```

Expected baseline: 1 file and 5 tests PASS, covering initial status/Skeleton, empty terminal, empty intermediate continuation, initial retry and partial retry. Do not duplicate these assertions.

- [ ] **Step 3: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 4: Verify recoverable initial failure at desktop**

Start the Vite server on port 4173, then establish auth and intercept page 1 before entering `/task`:

```bash
agent-browser --session task-list-states-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-list-states-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
EVALEOF
agent-browser --session task-list-states-01 network route '**/api/task?page=1' --abort
agent-browser --session task-list-states-01 open http://127.0.0.1:4173/task
agent-browser --session task-list-states-01 set viewport 1280 720
agent-browser --session task-list-states-01 wait --text '할 일을 불러오지 못했습니다.'
agent-browser --session task-list-states-01 snapshot -i
agent-browser --session task-list-states-01 screenshot /tmp/kbhc-task-list-states-01-error.png
agent-browser --session task-list-states-01 network unroute '**/api/task?page=1'
agent-browser --session task-list-states-01 find role button click --name '다시 불러오기'
agent-browser --session task-list-states-01 wait --text '첫 번째 할 일'
```

Expected: Alert and retry are visible; retry restores list data without duplicate permanent rows.

- [ ] **Step 5: Verify empty terminal at mobile without a new CTA**

```bash
agent-browser --session task-list-states-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-list-states-01 eval --stdin <<'EVALEOF'
sessionStorage.setItem("__kbhc_msw_task_fixture__", "[]");
location.assign("/task");
EVALEOF
agent-browser --session task-list-states-01 set viewport 390 844
agent-browser --session task-list-states-01 wait --text '등록된 할 일이 없습니다.'
agent-browser --session task-list-states-01 snapshot -i
agent-browser --session task-list-states-01 eval '({empty:document.body.innerText.includes("등록된 할 일이 없습니다."),createAction:Array.from(document.querySelectorAll("a,button")).some((element)=>/추가|생성/.test(element.textContent??"")),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-list-states-01 screenshot /tmp/kbhc-task-list-states-01-empty.png
agent-browser --session task-list-states-01 network requests --filter api
agent-browser --session task-list-states-01 console
agent-browser --session task-list-states-01 errors
agent-browser --session task-list-states-01 close
```

Expected: empty message is visible, createAction is false, no next-page request or horizontal clipping occurs.

- [ ] **Step 6: Record evidence, close and commit**

Add `## TASK-LIST-STATES-01`, set only the state task `[x]`, `AI_VERIFIED`, stage exact TODO/evidence files, run `git diff --cached --check`, and commit:

```bash
git commit -m "docs(task): 목록 상태 화면 검증 근거 기록"
```

Use a `fix(task): ...` commit only when a RED-backed widget correction exists.

---

### Task 5: `TASK-LIST-JOURNEY-VERIFY-01` current-target Journey evidence를 통합한다

**Files:**
- Test: task Card/list/API/mock/auth focused suites
- Test: `e2e/task-discovery.spec.ts`
- Modify only for a proven cross-boundary gap: `e2e/task-discovery.spec.ts`
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: four completed implementation tasks and exact current commit
- Produces: `DISC-P1-1`~`DISC-P1-5`, `DISC-E1`~`DISC-E3`, focused/quick/E2E/full/browser evidence

- [ ] **Step 1: Claim only `TASK-LIST-JOURNEY-VERIFY-01`**

Set `IN_PROGRESS`, record owner, target SHA and plan path after confirming all four dependencies are `AI_VERIFIED`.

- [ ] **Step 2: Re-run the complete Journey trace lookup**

```bash
rg -n 'TASK-LIST-0[1-5]|DISC-P1|DISC-E[1-3]|/api/task|TaskList|TaskCard|taskKeys' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: every requirement and case maps to a focused test or browser boundary; no raw fetch exists in page/widget and no generated OpenAPI import exists outside shared API.

- [ ] **Step 3: Run the complete focused suite**

```bash
pnpm vitest run src/entities/task/ui/task-card.test.tsx src/widgets/task-list/task-list.test.tsx src/shared/api/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/fixtures/tasks.test.ts src/app/auth/authenticated-api-bridge.test.tsx src/app/auth/auth-route-boundary.test.tsx
```

Expected baseline before any Journey correction: 7 files and 30 tests PASS.

- [ ] **Step 4: Run quick, mapped E2E and full in order**

```bash
./scripts/verify quick
pnpm exec playwright test e2e/task-discovery.spec.ts
./scripts/verify full
```

Expected: quick PASS; mapped Chromium 1/1 PASS with page sequence `1,2`, bearer, bounded DOM and `/task/task-3`; full PASS with all core Journeys and verifier regression.

- [ ] **Step 5: Capture one integrated named-browser record**

Start the Vite server on port 4173 and create a fresh default three-task session:

```bash
agent-browser --session task-list-journey-verify-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-list-journey-verify-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task");
EVALEOF
agent-browser --session task-list-journey-verify-01 wait --url '**/task'
agent-browser --session task-list-journey-verify-01 wait --load networkidle
agent-browser --session task-list-journey-verify-01 set viewport 1280 720
agent-browser --session task-list-journey-verify-01 snapshot -i
agent-browser --session task-list-journey-verify-01 eval '({mounted:document.querySelectorAll("[data-task-row]").length,terminal:document.body.innerText.includes("모든 할 일을 불러왔습니다."),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-list-journey-verify-01 set viewport 390 844
agent-browser --session task-list-journey-verify-01 scroll down 500 --selector '[aria-label="할 일 목록"]'
agent-browser --session task-list-journey-verify-01 snapshot -i
agent-browser --session task-list-journey-verify-01 find role link click --name '완료한 일'
agent-browser --session task-list-journey-verify-01 wait --url '**/task/task-3'
```

Expected exact requests are page 1 then page 2 once each; `hasNext: false` stops; selection reaches `/task/task-3`; `/api/sign-in` is absent. Finish the record:

```bash
agent-browser --session task-list-journey-verify-01 network requests --filter api
agent-browser --session task-list-journey-verify-01 console
agent-browser --session task-list-journey-verify-01 errors
agent-browser --session task-list-journey-verify-01 screenshot /tmp/kbhc-task-list-journey-verify-01.png
agent-browser --session task-list-journey-verify-01 close
```

- [ ] **Step 6: Replace stale summary with current-target evidence**

Update the evidence header and add `## TASK-LIST-JOURNEY-VERIFY-01`. Record exact SHA, all commands/counts, `DISC-*` mapping, both viewports, request method/query/count/bearer, mounted DOM, routes, screenshots/trace, console/errors, failures/corrections and rerun verdict. Preserve historical failure records as baseline history.

- [ ] **Step 7: Close and commit the verification task**

Set only this task `[x]`, `AI_VERIFIED`, then:

```bash
git add TODO.md docs/quality/evidence/task-discovery.md e2e/task-discovery.spec.ts
git diff --cached --check
git commit -m "docs(task): task-discovery 통합 검증 근거 기록"
```

Do not stage the E2E file when it did not change. A proven E2E correction uses `test(task): task-discovery 경계 검증 보강`.

---

### Task 6: `TASK-LIST-JOURNEY-REVIEW-01` plan-completion adversarial review를 수행한다

**Files:**
- Review: this plan, approved spec, requirements, OpenAPI, source, tests, E2E, evidence and TODO
- Modify for findings only: exact root-cause owner
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: exact verification target from Task 5
- Produces: seven-field plan/Journey review record with unresolved HIGH/MEDIUM finding 0

- [ ] **Step 1: Record immutable review target before changing the review block**

```bash
git rev-parse HEAD
git status --short
git show --stat --oneline HEAD
```

Expected: clean worktree and Task 5 evidence commit at HEAD. Record that full SHA as the review target.

- [ ] **Step 2: Use a fresh reviewer context or explicit non-author second-pass role**

The reviewer identifies itself separately from the final change author and checks:

- plan checkbox coverage and incomplete steps
- `TASK-LIST-01`~`TASK-LIST-05`, `DISC-P1-*`, `DISC-E*` omissions
- OpenAPI method/query/security/200/401 and status-not-rendered rule
- pagination race, retry, terminal stop, empty intermediate page and AbortSignal
- stable key, measurement, real scroll, responsive bound and mounted DOM
- Card whole-link encoding, keyboard focus, clipping and accessible names
- approved 401 session recovery, protected cache root and no `/api/sign-in`
- weak/duplicate/flaky tests, console/network errors and screenshot-only claims
- unrelated diff, secrets, generated noise, evidence/TODO dependency/status consistency

- [ ] **Step 3: Reproduce the review target**

```bash
pnpm vitest run src/entities/task/ui/task-card.test.tsx src/widgets/task-list/task-list.test.tsx src/shared/api/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/fixtures/tasks.test.ts src/app/auth/authenticated-api-bridge.test.tsx src/app/auth/auth-route-boundary.test.tsx
./scripts/verify quick
pnpm exec playwright test e2e/task-discovery.spec.ts
git diff 334dec0..HEAD --check
```

Expected: focused 7 files/30 tests, quick and mapped Chromium PASS; diff contains only Journey plan/work/evidence and proven corrections.

- [ ] **Step 4: Resolve findings before closing the review**

Any HIGH/MEDIUM finding reopens the owning task. For product behavior, first add a minimal test that fails for the finding, record RED, apply the smallest root-cause fix, and rerun focused → quick → mapped E2E when applicable. Review the new target again. LOW findings may remain only with explicit impact and follow-up condition.

- [ ] **Step 5: Record the mandatory review block**

Add these exact fields to the review task evidence and `docs/quality/evidence/task-discovery.md`:

```text
Review target: plan path, TASK-LIST-01~05/task-discovery, exact target SHA
Reviewer: fresh context or second-pass role ID and relationship to final author
Checks: checks actually performed
Findings: none or severity/class/root cause
Corrections: not applicable or applied changes
Rerun: exact commands and results
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

- [ ] **Step 6: Close the review only on PASS and commit**

Set `TASK-LIST-JOURNEY-REVIEW-01` `[x]`, `AI_VERIFIED` only with PASS/PASS_WITH_LOW and no unresolved HIGH/MEDIUM finding.

```bash
git add TODO.md docs/quality/evidence/task-discovery.md
git diff --cached --check
git commit -m "docs(task): task-discovery 독립 검토 근거 기록"
./scripts/verify full
```

Expected: review record commit succeeds and final full verification passes on the branch containing the review record.

---

### Task 7: `JOURNEY-TASK-LIST-01` 사람 checkpoint를 요청한다

**Files:**
- Modify: `TODO.md`
- Read: `docs/quality/evidence/task-discovery.md`

**Interfaces:**
- Consumes: current evidence, exact source target, PASS review record and final full result
- Produces: auditable human checkpoint request; no AI approval claim

- [ ] **Step 1: Audit the checkpoint inputs**

```bash
./scripts/verify setup
git log -3 --oneline
git status --short
```

Expected: implementation tasks, verify and review are `AI_VERIFIED`; checkpoint dependency is complete; setup passes; worktree is clean.

- [ ] **Step 2: Record the pending checkpoint package**

Keep checkbox `[ ]` and `Status: BLOCKED`. Update only its Evidence with:

- exact reviewed source/evidence target SHA
- independent review record commit and verdict
- focused, quick, mapped E2E, full counts
- browser evidence path and both viewport summary
- explicit `사람 checkpoint 승인 대기; AI가 HUMAN_APPROVED를 기록하지 않음`

- [ ] **Step 3: Commit the checkpoint request and verify setup**

```bash
git add TODO.md
git diff --cached --check
git commit -m "docs(task): task-discovery 사람 검토 요청"
./scripts/verify setup
```

Expected: setup PASS; `JOURNEY-TASK-LIST-01` remains human-owned and unapproved.

- [ ] **Step 4: Present one human checkpoint**

Ask the person to review the current `docs/quality/evidence/task-discovery.md`, exact review target and PASS record. Do not start `task-resolution` implementation across this unapproved Journey boundary. Only a person may change the checkpoint to `[x]`, `HUMAN_APPROVED`.
