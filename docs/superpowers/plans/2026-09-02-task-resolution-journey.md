# Task Resolution Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 task 상세·삭제 화면을 current target에서 검증하고 실제 gap만 교정해 `task-resolution` Journey의 자동·browser evidence, 독립 review와 사람 checkpoint 요청까지 완성한다.

**Architecture:** 기존 `TaskDetailPage → useQuery/getTaskDetail → ApiClient`와 `DeleteTaskDialog → resolveDeleteAttempt/recheckTaskPresence → cache transition` 흐름을 유지한다. 각 TODO task는 acceptance audit 뒤 기존 test가 충분하면 제품 code를 늘리지 않고 evidence로 닫으며, 확인된 gap에만 가장 낮은 test의 RED와 최소 root-cause 수정을 적용한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, TanStack Query 5.102.8, MSW 2.15.0, shadcn/ui owned primitives, Tailwind CSS 4.3.3, Vitest 4.1.11, Testing Library 16.3.3, Playwright 1.62.1, agent-browser

## Global Constraints

- API authority는 `assignment-original/openapi.yaml`이며 상세는 bearer `GET /api/task/{id}`, 삭제는 bearer `DELETE /api/task/{id}`다.
- 제품 계약은 `200 TaskDetailResponse`, `200 DeleteTaskResponse { success: true }`, `401/404 ErrorResponse`만 사용한다.
- 범위는 `TASK-DETAIL-01`~`TASK-DETAIL-05`, `/task/:id`, 404 recovery, exact-ID modal, 승인된 delete result와 `/task` 이동이다.
- `docs/superpowers/specs/2026-09-02-task-resolution-journey-design.md`, `DEC-AUTH-01`, `DEC-DELETE-01`의 accepted behavior를 유지한다.
- Route ID와 확인 입력은 trim이나 case 변환 없이 byte-exact equality를 사용한다.
- 한 user attempt의 DELETE는 최초 한 번과 auth refresh replay 한 번을 합쳐 최대 두 번이며 자동 DELETE retry를 추가하지 않는다.
- 200 `{ success: true }`만 성공과 자동 `/task` 이동을 만들고 404, network, invalid response와 outcome-unknown은 성공으로 바꾸지 않는다.
- 목록·상세·dashboard는 기존 resettable task store와 cache transition을 사용하며 optimistic update를 추가하지 않는다.
- Auth storage, refresh/replay, session generation, API schema, fixture 의미, dependency와 architecture를 변경하지 않는다.
- Task 생성·수정, status UI, generic modal/form/mutation abstraction, production debug route와 상태별 E2E 증식을 추가하지 않는다.
- Production behavior 변경은 RED를 먼저 확인한다. Acceptance가 이미 충족되면 억지 RED, duplicate assertion과 production diff를 만들지 않는다.
- 한 번에 dependency가 완료된 TODO task 하나만 `IN_PROGRESS`로 만들고 task block owner만 그 block을 갱신한다.
- 각 implementation task는 focused test 뒤 `./scripts/verify quick`과 적용 가능한 browser QA를 통과한 뒤에만 `AI_VERIFIED`로 닫는다.
- Browser QA는 task ID를 포함한 named agent-browser session, `390x844`와 `1280x720`, fresh snapshot, 실제 interaction, console/network/error, screenshot과 session close를 사용한다.
- `TASK-DETAIL-JOURNEY-VERIFY-01`은 focused → quick → mapped Journey E2E → named browser → full 순서로 검증한다.
- 마지막 automatic/browser verification 뒤 plan-completion adversarial review를 실행하며, 동일 target이면 `TASK-DETAIL-JOURNEY-REVIEW-01`과 같은 record를 사용한다.
- AI는 `JOURNEY-TASK-DETAIL-01`을 완료하거나 `HUMAN_APPROVED`로 바꾸지 않는다.

## Execution Entry

실행 위치는 이미 생성된 linked worktree다.

```bash
cd /Users/identity/dev/assignment/kbhc-assgn/.worktrees/docs-task-resolution-journey-design
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git status --short
```

Expected: branch는 `docs/task-resolution-journey-design`, worktree는 clean이며 승인된 spec과 이 plan commit을 포함한다. 원 checkout의 `AI_USAGE.md`, `artifacts/index.md`, `artifacts/codex-session-*.md` 변경은 가져오거나 commit하지 않는다.

## File Map

- Preserve unless a proven detail gap exists: `src/pages/task-detail/index.tsx`
- Verify detail, recovery, cache와 route acceptance: `src/pages/task-detail/task-detail.test.tsx`
- Preserve unless a proven dialog gap exists: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Verify modal, exact ID, pending, recovery와 focus: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Preserve attempt owner: `src/features/delete-task/model/attempt-guard.ts`
- Verify synchronous duplicate guard: `src/features/delete-task/model/attempt-guard.test.ts`
- Preserve delete outcome owner: `src/features/delete-task/model/delete-task.ts`
- Verify DELETE/recheck matrix: `src/features/delete-task/model/delete-task.test.ts`
- Preserve cache owner: `src/features/delete-task/model/delete-cache.ts`
- Verify protected snapshot eviction: `src/features/delete-task/model/delete-cache.test.ts`
- Preserve API/auth boundary: `src/shared/api/tasks.ts`, `src/shared/api/authenticated-request.ts`
- Verify auth replay bound: `src/shared/api/authenticated-request.test.ts`
- Preserve mock store/handler: `src/mocks/fixtures/tasks.ts`, `src/mocks/handlers/tasks.ts`
- Preserve and only strengthen a proven cross-boundary assertion: `e2e/task-resolution.spec.ts`
- Extend stale baseline with sectioned current-target records: `docs/quality/evidence/task-resolution.md`
- Update only the active task block: `TODO.md`

## Interfaces

- `getTaskDetail(client: ApiClient, id: string, signal?: AbortSignal): Promise<TaskDetail>` sends bearer `GET /api/task/{id}` and validates `title`, `memo`, `registerDatetime`.
- `DeleteTaskDialog({ taskId, onSuccess, onAbsent }: DeleteTaskDialogProps): JSX.Element` owns exact-ID form, attempt UI, result presentation and focus lifecycle.
- `resolveDeleteAttempt(client: ApiClient, id: string): Promise<DeleteResolution>` sends one feature-level DELETE and reconciles network/invalid results with GET.
- `recheckTaskPresence(client: ApiClient, id: string): Promise<PresenceResolution>` sends GET only and returns `exists`, `absent`, `unknown` or `stale`.
- `createAttemptGuard(): AttemptGuard` synchronously admits one current attempt until its matching ID finishes.
- `evictTaskSnapshots(queryClient: QueryClient): Promise<void>` cancels and removes task list/detail and dashboard query roots while preserving unrelated cache.
- `TaskDetailPage(): JSX.Element` owns route ID, detail query, success/error composition, success cache eviction and `/task` navigation.
- `e2e/task-resolution.spec.ts` proves the representative authenticated exact-confirmation, one bearer DELETE, redirect and server-state consistency without `/api/sign-in`.

---

### Task 1: `TASK-DETAIL-VIEW-01` task 상세 화면 acceptance를 검증한다

**Files:**
- Inspect: `src/pages/task-detail/index.tsx`
- Test: `src/pages/task-detail/task-detail.test.tsx`
- Modify only for a proven gap: the same page and existing test
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `TaskDetail`, shared `Card`, `time[datetime]`, global focus ring, React Router `Link`
- Produces: title/memo/date hierarchy, original datetime, list back action and two-viewport evidence

- [ ] **Step 1: Claim only `TASK-DETAIL-VIEW-01`**

Keep checkbox `[ ]`, set `Status: IN_PROGRESS`, and replace `Evidence: 없음` with executing session, branch `docs/task-resolution-journey-design`, `git rev-parse HEAD`, requirement `TASK-DETAIL-01` and this plan path. Do not modify another open task block.

- [ ] **Step 2: Re-run Journey lookup before a production edit**

```bash
rg -n 'TASK-DETAIL-VIEW-01|TASK-DETAIL-01|RES-P1-1|TaskDetailPage|getTaskDetail|registerDatetime|dateTime|/task/:id' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: `TaskDetailPage → getTaskDetail`; title, memo, readable Korean date, original `time[datetime]` and list back action already exist.

- [ ] **Step 3: Run the lowest sufficient detail test**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx
```

Expected baseline: 1 file and 5 tests PASS. The success case proves response fields and AbortSignal; mapped E2E already asserts the original datetime attribute. If those checks pass, do not duplicate them. A real content or request failure is RED and may change only the page owner plus this existing test.

- [ ] **Step 4: Run quick verification**

```bash
./scripts/verify quick
```

Expected: setup, format check, lint, generated API check, typecheck and all Vitest tests PASS without repository mutation.

- [ ] **Step 5: Start the app for detail browser QA**

Run in a dedicated terminal session and keep it alive only through this task:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

Expected: Vite serves `http://127.0.0.1:4173`.

- [ ] **Step 6: Establish the independent authenticated fixture**

```bash
agent-browser --session task-detail-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-detail-view-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task/task-1");
EVALEOF
agent-browser --session task-detail-view-01 wait --url '**/task/task-1'
agent-browser --session task-detail-view-01 wait --load networkidle
```

Expected: refresh establishes the approved session; detail GET loads without `/api/sign-in`.

- [ ] **Step 7: Verify desktop content, hierarchy and request**

```bash
agent-browser --session task-detail-view-01 set viewport 1280 720
agent-browser --session task-detail-view-01 snapshot -i
agent-browser --session task-detail-view-01 eval '(()=>{const t=document.querySelector("time");return {heading:document.querySelector("h1")?.textContent,memo:document.querySelector("article")?.textContent?.includes("삭제 검증 대상"),dateTime:t?.getAttribute("datetime"),dateText:t?.textContent,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()'
agent-browser --session task-detail-view-01 network requests --filter api/task/task-1
agent-browser --session task-detail-view-01 screenshot /tmp/kbhc-task-detail-view-01-desktop.png
```

Expected: title and memo equal the fixture, `datetime` is `2026-08-30T09:00:00.000Z`, readable text is visible, an authenticated bearer GET is observed and document width does not exceed 1280px. `TASK-DETAIL-01` does not set an exact browser request-count invariant; Vite development React StrictMode may observe two bearer GET calls, which is recorded as a development observation rather than a pass/fail condition.

- [ ] **Step 8: Verify mobile wrapping and keyboard back action**

```bash
agent-browser --session task-detail-view-01 set viewport 390 844
agent-browser --session task-detail-view-01 snapshot -i
agent-browser --session task-detail-view-01 eval '({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,articleWidth:document.querySelector("article")?.getBoundingClientRect().width})'
agent-browser --session task-detail-view-01 find role link focus --name '할 일 목록'
agent-browser --session task-detail-view-01 eval '({href:document.activeElement?.getAttribute("href"),outline:getComputedStyle(document.activeElement).outline})'
agent-browser --session task-detail-view-01 screenshot /tmp/kbhc-task-detail-view-01-mobile.png
agent-browser --session task-detail-view-01 console
agent-browser --session task-detail-view-01 errors
agent-browser --session task-detail-view-01 close
```

Expected: no horizontal clipping, back Link is keyboard focusable with visible outline, and no unexpected console/page error remains.

- [ ] **Step 9: Record evidence and close the task**

Add `## TASK-DETAIL-VIEW-01` to `docs/quality/evidence/task-resolution.md` with requirement, full target SHA, focused/quick results, both viewport records, GET observation, screenshot paths, expected/actual, failure class/correction/rerun. Set only this task `[x]`, `Status: AI_VERIFIED`.

- [ ] **Step 10: Commit the independently testable result**

```bash
git add TODO.md docs/quality/evidence/task-resolution.md
git diff --cached --check
git commit -m "docs(task): task 상세 화면 검증 근거 기록"
```

If a proven gap required source/test changes, stage only those exact files too and use `fix(task): task 상세 화면 결함 수정`.

---

### Task 2: `TASK-DETAIL-RECOVERY-VIEW-01` 상세 오류·404 복구 acceptance를 검증한다

**Files:**
- Inspect: `src/pages/task-detail/index.tsx`
- Test: `src/pages/task-detail/task-detail.test.tsx`
- Modify only for a proven gap: the same page and existing test
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed detail surface, `ApiError`, Query retry/refetch, shared `Alert`
- Produces: distinct 404/list recovery and recoverable error/retry evidence with shell retention

- [ ] **Step 1: Claim and locate `TASK-DETAIL-RECOVERY-VIEW-01`**

Confirm `TASK-DETAIL-VIEW-01` is `AI_VERIFIED`, set only this task `IN_PROGRESS`, record owner/start SHA, then run:

```bash
rg -n 'TASK-DETAIL-RECOVERY-VIEW-01|TASK-DETAIL-02|RES-E1|query.isError|status === 404|할 일 목록으로 이동|다시 불러오기|refetch' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: 404 renders the API message and list Link; other errors render a retry Button that calls the existing query refetch.

- [ ] **Step 2: Run the focused recovery test**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx
```

Expected baseline: 1 file and 5 tests PASS, including the missing-task distinction and `/task` recovery Link. Do not add class assertions. A missing accessible action or incorrect retry behavior is the RED evidence and may change only this page/test owner.

- [ ] **Step 3: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 4: Verify the independent 404 state in both viewports**

Start Vite on port 4173 and establish a fresh approved fixture:

```bash
agent-browser --session task-detail-recovery-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-detail-recovery-view-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
location.assign("/task/missing");
EVALEOF
agent-browser --session task-detail-recovery-view-01 wait --url '**/task/missing'
agent-browser --session task-detail-recovery-view-01 wait --load networkidle
agent-browser --session task-detail-recovery-view-01 set viewport 1280 720
agent-browser --session task-detail-recovery-view-01 snapshot -i
agent-browser --session task-detail-recovery-view-01 eval '({message:document.querySelector("[role=alert]")?.textContent,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-detail-recovery-view-01 screenshot /tmp/kbhc-task-detail-recovery-view-01-404-desktop.png
agent-browser --session task-detail-recovery-view-01 set viewport 390 844
agent-browser --session task-detail-recovery-view-01 find role link focus --name '할 일 목록으로 이동'
agent-browser --session task-detail-recovery-view-01 screenshot /tmp/kbhc-task-detail-recovery-view-01-404-mobile.png
```

Expected: 404 API message appears once, the list recovery Link stays usable in both viewports and shell/navigation remains present.

- [ ] **Step 5: Verify recoverable network error and retry without a debug surface**

```bash
agent-browser --session task-detail-recovery-view-01 network route '**/api/task/task-1' --abort
agent-browser --session task-detail-recovery-view-01 open http://127.0.0.1:4173/task/task-1
agent-browser --session task-detail-recovery-view-01 wait --load networkidle
agent-browser --session task-detail-recovery-view-01 snapshot -i
agent-browser --session task-detail-recovery-view-01 find role button focus --name '다시 불러오기'
agent-browser --session task-detail-recovery-view-01 network unroute '**/api/task/task-1'
agent-browser --session task-detail-recovery-view-01 find role button click --name '다시 불러오기'
agent-browser --session task-detail-recovery-view-01 wait --load networkidle
agent-browser --session task-detail-recovery-view-01 snapshot -i
agent-browser --session task-detail-recovery-view-01 network requests --filter api/task
agent-browser --session task-detail-recovery-view-01 console
agent-browser --session task-detail-recovery-view-01 errors
agent-browser --session task-detail-recovery-view-01 close
```

Expected: aborted GET shows the general error/retry surface, removing interception and activating retry returns to the existing detail without route or shell loss. The deliberate abort/404 may produce only their expected resource errors; record them separately from unexpected errors.

- [ ] **Step 6: Record evidence, close and commit**

Add `## TASK-DETAIL-RECOVERY-VIEW-01` with 404 and general-error request sequence, keyboard action, two viewports, screenshots and rerun result. Set only this task `[x]`, `AI_VERIFIED`, then:

```bash
git add TODO.md docs/quality/evidence/task-resolution.md
git diff --cached --check
git commit -m "docs(task): task 상세 복구 화면 검증 근거 기록"
```

Use `fix(task): task 상세 복구 화면 결함 수정` only when a RED-backed page/test correction is staged.

---

### Task 3: `TASK-DELETE-DIALOG-VIEW-01` 삭제 확인 modal acceptance를 검증한다

**Files:**
- Inspect: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Test: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Inspect: `src/features/delete-task/model/attempt-guard.ts`
- Test: `src/features/delete-task/model/attempt-guard.test.ts`
- Modify only for a proven gap: those owners and existing tests
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed detail surface, shared `AlertDialog`, `Input`, `Label`, `createAttemptGuard`
- Produces: destructive hierarchy, exact-ID guard, DELETE 0 before exact input, close/trap/restore and mobile-overflow evidence

- [ ] **Step 1: Claim and locate `TASK-DELETE-DIALOG-VIEW-01`**

Confirm its dependencies are `AI_VERIFIED`, set only this task `IN_PROGRESS`, record owner/start SHA, then run:

```bash
rg -n 'TASK-DELETE-DIALOG-VIEW-01|TASK-DETAIL-03|TASK-DETAIL-04|RES-P1-2|RES-P1-3|RES-E2|DeleteTaskDialog|createAttemptGuard|AlertDialog|할 일 ID' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: one AlertDialog owns the exact-ID form; input equality and synchronous guard prevent early or duplicate attempts.

- [ ] **Step 2: Run modal and guard focused tests**

```bash
pnpm vitest run src/features/delete-task/ui/delete-task-dialog.test.tsx src/features/delete-task/model/attempt-guard.test.ts
```

Expected baseline: 2 files and 5 tests PASS. The suite proves accessible modal/name, monospace route ID, wrong/whitespace/case-different disabled state, zero early resolution calls, pending lock, Escape block, cancel reset, trigger focus restore and synchronous duplicate guard.

- [ ] **Step 3: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 4: Open a fresh authenticated detail and modal**

Start Vite on port 4173, then:

```bash
agent-browser --session task-delete-dialog-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-delete-dialog-view-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task/task-1");
EVALEOF
agent-browser --session task-delete-dialog-view-01 wait --url '**/task/task-1'
agent-browser --session task-delete-dialog-view-01 wait --load networkidle
agent-browser --session task-delete-dialog-view-01 find role button click --name '할 일 삭제'
agent-browser --session task-delete-dialog-view-01 snapshot -i
```

Expected: modal opens with accessible name `할 일 삭제`, exact task ID instruction, labelled textbox, cancel and disabled confirm.

- [ ] **Step 5: Verify desktop wrong/exact values and cancellation**

```bash
agent-browser --session task-delete-dialog-view-01 set viewport 1280 720
agent-browser --session task-delete-dialog-view-01 find role textbox fill --name '할 일 ID' 'task-1 '
agent-browser --session task-delete-dialog-view-01 is enabled 'button[type=submit]'
agent-browser --session task-delete-dialog-view-01 find role textbox fill --name '할 일 ID' 'TASK-1'
agent-browser --session task-delete-dialog-view-01 is enabled 'button[type=submit]'
agent-browser --session task-delete-dialog-view-01 find role textbox fill --name '할 일 ID' 'wrong'
agent-browser --session task-delete-dialog-view-01 is enabled 'button[type=submit]'
agent-browser --session task-delete-dialog-view-01 network requests --filter api/task/task-1
agent-browser --session task-delete-dialog-view-01 find role textbox fill --name '할 일 ID' 'task-1'
agent-browser --session task-delete-dialog-view-01 is enabled 'button[type=submit]'
agent-browser --session task-delete-dialog-view-01 screenshot /tmp/kbhc-task-delete-dialog-view-01-desktop.png
agent-browser --session task-delete-dialog-view-01 find role button click --name '취소'
agent-browser --session task-delete-dialog-view-01 eval '({triggerText:document.activeElement?.textContent,dialog:document.querySelector("[role=alertdialog]") !== null})'
```

Expected: wrong values keep confirm disabled and DELETE count zero; exact input enables confirm; cancel closes the modal and restores trigger focus without deleting.

- [ ] **Step 6: Verify mobile Escape, focus trap and overflow**

```bash
agent-browser --session task-delete-dialog-view-01 set viewport 390 844
agent-browser --session task-delete-dialog-view-01 find role button click --name '할 일 삭제'
agent-browser --session task-delete-dialog-view-01 snapshot -i
agent-browser --session task-delete-dialog-view-01 eval '(()=>{const d=document.querySelector("[role=alertdialog]");const r=d?.getBoundingClientRect();return {active:document.activeElement?.getAttribute("aria-describedby"),left:r?.left,right:r?.right,width:r?.width,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}})()'
agent-browser --session task-delete-dialog-view-01 press Tab
agent-browser --session task-delete-dialog-view-01 press Shift+Tab
agent-browser --session task-delete-dialog-view-01 press Escape
agent-browser --session task-delete-dialog-view-01 eval '({dialog:document.querySelector("[role=alertdialog]") !== null,triggerText:document.activeElement?.textContent})'
agent-browser --session task-delete-dialog-view-01 screenshot /tmp/kbhc-task-delete-dialog-view-01-mobile.png
agent-browser --session task-delete-dialog-view-01 network requests --filter api
agent-browser --session task-delete-dialog-view-01 console
agent-browser --session task-delete-dialog-view-01 errors
agent-browser --session task-delete-dialog-view-01 close
```

Expected: dialog stays within 390px, focus remains trapped while open, Escape closes idle modal and returns focus to the trigger. No DELETE or unexpected error appears.

- [ ] **Step 7: Record evidence, close and commit**

Add `## TASK-DELETE-DIALOG-VIEW-01` with exact input matrix, enabled states, DELETE 0, focus/viewport measurements, screenshots and commands. Set only this task `[x]`, `AI_VERIFIED`, then:

```bash
git add TODO.md docs/quality/evidence/task-resolution.md
git diff --cached --check
git commit -m "docs(task): task 삭제 modal 검증 근거 기록"
```

Use `fix(task): task 삭제 modal 결함 수정` only when a RED-backed dialog/guard correction is staged.

---

### Task 4: `TASK-DELETE-OUTCOME-VIEW-01` 삭제 진행·실패·복구 acceptance를 검증한다

**Files:**
- Inspect: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Test: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Inspect: `src/features/delete-task/model/delete-task.ts`
- Test: `src/features/delete-task/model/delete-task.test.ts`
- Inspect: `src/features/delete-task/model/delete-cache.ts`
- Test: `src/features/delete-task/model/delete-cache.test.ts`
- Inspect: `src/pages/task-detail/index.tsx`
- Test: `src/pages/task-detail/task-detail.test.tsx`
- Inspect: `src/shared/api/authenticated-request.ts`
- Test: `src/shared/api/authenticated-request.test.ts`
- Modify only for a proven gap: the failing owner and its existing test
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: completed modal, `resolveDeleteAttempt`, `recheckTaskPresence`, `evictTaskSnapshots`, authenticated transport
- Produces: pending lock, direct 404 non-success, network/invalid reconciliation, no automatic DELETE retry, 200-only redirect and cache/store evidence

- [ ] **Step 1: Claim and trace `TASK-DELETE-OUTCOME-VIEW-01` end to end**

Confirm dialog and recovery dependencies are `AI_VERIFIED`, set only this task `IN_PROGRESS`, record owner/start SHA, then run:

```bash
rg -n 'TASK-DELETE-OUTCOME-VIEW-01|TASK-DETAIL-05|RES-P1-4|RES-E3|RES-E4|resolveDeleteAttempt|recheckTaskPresence|evictTaskSnapshots|DELETE|success|absent|unknown|stale' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: dialog → model → shared API/auth → cache/route flow is single-owner at each boundary; no optimistic update or automatic DELETE retry exists.

- [ ] **Step 2: Run the complete outcome focused suite**

```bash
pnpm vitest run src/features/delete-task/ui/delete-task-dialog.test.tsx src/features/delete-task/model/delete-task.test.ts src/features/delete-task/model/delete-cache.test.ts src/pages/task-detail/task-detail.test.tsx src/shared/api/authenticated-request.test.ts
```

Expected baseline: 5 files and 29 tests PASS. The result tables cover success, direct 404, network/invalid with GET 200/404/failure, aborted stale response and GET-only recheck; page/cache tests cover redirect/eviction; transport proves auth replay bounds DELETE at two transmissions.

- [ ] **Step 3: Run quick verification**

```bash
./scripts/verify quick
```

Expected: PASS without mutation.

- [ ] **Step 4: Establish a fresh outcome browser fixture**

Start Vite on port 4173, then:

```bash
agent-browser --session task-delete-outcome-view-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-delete-outcome-view-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task/task-1");
EVALEOF
agent-browser --session task-delete-outcome-view-01 wait --url '**/task/task-1'
agent-browser --session task-delete-outcome-view-01 wait --load networkidle
agent-browser --session task-delete-outcome-view-01 set viewport 1280 720
```

Expected: existing detail is ready with approved auth and reset store.

- [ ] **Step 5: Hold one DELETE to inspect the pending interaction lock**

Inject a browser-only fetch gate; this changes no repository or production code:

```bash
agent-browser --session task-delete-outcome-view-01 eval --stdin <<'EVALEOF'
window.__kbhcOriginalFetch = window.fetch;
window.fetch = (input, init = {}) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const path = new URL(raw, location.origin).pathname;
  if (path === "/api/task/task-1" && init.method === "DELETE") {
    return new Promise((_, reject) => { window.__kbhcRejectDelete = () => reject(new TypeError("browser pending fixture")); });
  }
  return window.__kbhcOriginalFetch(input, init);
};
EVALEOF
agent-browser --session task-delete-outcome-view-01 find role button click --name '할 일 삭제'
agent-browser --session task-delete-outcome-view-01 find role textbox fill --name '할 일 ID' 'task-1'
agent-browser --session task-delete-outcome-view-01 find role button click --name '삭제 확인'
agent-browser --session task-delete-outcome-view-01 snapshot -i
agent-browser --session task-delete-outcome-view-01 eval '({busy:document.querySelector("[role=alertdialog]")?.getAttribute("aria-busy"),inputDisabled:document.querySelector("input")?.disabled,cancelDisabled:[...document.querySelectorAll("button")].find((b)=>b.textContent?.includes("취소"))?.disabled,submitDisabled:document.querySelector("button[type=submit]")?.disabled})'
agent-browser --session task-delete-outcome-view-01 press Escape
agent-browser --session task-delete-outcome-view-01 eval 'document.querySelector("[role=alertdialog]") !== null'
```

Expected: `aria-busy=true`, input/cancel/submit are disabled and Escape cannot close the pending modal.

- [ ] **Step 6: Release the network failure and verify GET reconciliation to exists**

```bash
agent-browser --session task-delete-outcome-view-01 eval 'window.fetch=window.__kbhcOriginalFetch;window.__kbhcRejectDelete()'
agent-browser --session task-delete-outcome-view-01 wait --text '삭제를 다시 시도할 수 있습니다.'
agent-browser --session task-delete-outcome-view-01 snapshot -i
agent-browser --session task-delete-outcome-view-01 is enabled 'button[type=submit]'
```

Expected: failed DELETE is followed by one successful detail GET, route/cache stay intact, exists message appears and a new explicit attempt is enabled.

- [ ] **Step 7: Verify outcome-unknown, GET-only recheck and no automatic DELETE retry**

```bash
agent-browser --session task-delete-outcome-view-01 network requests --clear
agent-browser --session task-delete-outcome-view-01 network route '**/api/task/task-1' --abort
agent-browser --session task-delete-outcome-view-01 find role button click --name '삭제 확인'
agent-browser --session task-delete-outcome-view-01 wait --text '삭제 결과를 확인할 수 없습니다.'
agent-browser --session task-delete-outcome-view-01 snapshot -i
agent-browser --session task-delete-outcome-view-01 network requests --filter api/task/task-1
agent-browser --session task-delete-outcome-view-01 network unroute '**/api/task/task-1'
agent-browser --session task-delete-outcome-view-01 find role button click --name '다시 확인'
agent-browser --session task-delete-outcome-view-01 wait --text '삭제를 다시 시도할 수 있습니다.'
agent-browser --session task-delete-outcome-view-01 network requests --filter api/task/task-1
```

Expected: the failed attempt records one DELETE and one automatic GET, not a second DELETE; manual `다시 확인` adds GET only and returns to exists.

- [ ] **Step 8: Complete a new explicit success attempt and inspect server state**

```bash
agent-browser --session task-delete-outcome-view-01 find role button click --name '삭제 확인'
agent-browser --session task-delete-outcome-view-01 wait --url '**/task'
agent-browser --session task-delete-outcome-view-01 snapshot -i
agent-browser --session task-delete-outcome-view-01 open http://127.0.0.1:4173/task/task-1
agent-browser --session task-delete-outcome-view-01 wait --load networkidle
agent-browser --session task-delete-outcome-view-01 snapshot -i
agent-browser --session task-delete-outcome-view-01 find role link click --name '대시보드'
agent-browser --session task-delete-outcome-view-01 wait --url '**/'
agent-browser --session task-delete-outcome-view-01 eval '({total:[...document.querySelectorAll("dd")].map((node)=>node.textContent),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-delete-outcome-view-01 screenshot /tmp/kbhc-task-delete-outcome-view-01-desktop.png
```

Expected: only the new explicit DELETE returns 200 and navigates; task-1 is absent from list, reopened detail is 404 and dashboard is `2/1/1`.

- [ ] **Step 9: Repeat critical presentation checks at mobile width and clean up**

```bash
agent-browser --session task-delete-outcome-view-01 set viewport 390 844
agent-browser --session task-delete-outcome-view-01 screenshot /tmp/kbhc-task-delete-outcome-view-01-mobile.png
agent-browser --session task-delete-outcome-view-01 network requests --filter api
agent-browser --session task-delete-outcome-view-01 console
agent-browser --session task-delete-outcome-view-01 errors
agent-browser --session task-delete-outcome-view-01 close
```

Expected: result/recovery content does not clip at mobile width. Deliberate aborts and deleted-detail 404 are recorded as expected; no other console/page error remains.

- [ ] **Step 10: Record evidence, close and commit**

Add `## TASK-DELETE-OUTCOME-VIEW-01` with the 12-result automatic matrix, pending lock, DELETE/GET sequence, 200-only redirect, two viewport screenshots, cache/store outcome and expected network failures. Set only this task `[x]`, `AI_VERIFIED`, then:

```bash
git add TODO.md docs/quality/evidence/task-resolution.md
git diff --cached --check
git commit -m "docs(task): task 삭제 결과 검증 근거 기록"
```

Use `fix(task): task 삭제 결과 결함 수정` only when a RED-backed owner/test correction is staged.

---

### Task 5: `TASK-DETAIL-JOURNEY-VERIFY-01` current-target Journey evidence를 통합한다

**Files:**
- Verify: `src/pages/task-detail/task-detail.test.tsx`
- Verify: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Verify: `src/features/delete-task/model/attempt-guard.test.ts`
- Verify: `src/features/delete-task/model/delete-task.test.ts`
- Verify: `src/features/delete-task/model/delete-cache.test.ts`
- Verify: `src/shared/api/authenticated-request.test.ts`
- Inspect: `src/shared/api/tasks.ts`, `src/mocks/fixtures/tasks.ts`, `src/mocks/handlers/tasks.ts`
- Inspect and modify only for a proven Journey assertion gap: `e2e/task-resolution.spec.ts`
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: four completed implementation tasks and their evidence commits
- Produces: one exact verification target with `RES-P1-*`, `RES-E*`, focused/quick/E2E/browser/full evidence

- [ ] **Step 1: Claim the Journey verification target**

Confirm all four view tasks are `[x]` and `AI_VERIFIED`. Set only `TASK-DETAIL-JOURNEY-VERIFY-01` to `IN_PROGRESS`; record owner, branch, `git rev-parse HEAD`, requirements, spec and plan paths.

- [ ] **Step 2: Re-run the complete Journey trace lookup**

```bash
rg -n 'TASK-DETAIL-0[1-5]|RES-P1|RES-E[1-4]|/api/task|TaskDetailPage|DeleteTaskDialog|resolveDeleteAttempt|recheckTaskPresence|evictTaskSnapshots' docs/quality/requirements.md TODO.md src e2e
git status --short
```

Expected: every requirement/case maps to an existing automatic or browser boundary; no raw fetch/token/cache behavior is duplicated in page/feature code.

- [ ] **Step 3: Run the complete focused suite**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/model/delete-task.test.ts src/features/delete-task/model/delete-cache.test.ts src/shared/api/authenticated-request.test.ts
```

Expected baseline: 6 files and 30 tests PASS.

- [ ] **Step 4: Run quick and mapped Journey E2E**

```bash
./scripts/verify quick
pnpm exec playwright test e2e/task-resolution.spec.ts
```

Expected: quick PASS; mapped Chromium 1/1 PASS with no `/api/sign-in`, zero DELETE for non-exact values, one bearer DELETE for exact input, `/task` redirect, deleted-detail 404 and dashboard `2/1/1`.

- [ ] **Step 5: Audit mapped E2E size before any edit**

Keep the existing single representative `@core @task-resolution` scenario when Step 4 proves the cross-boundary risk. Only a demonstrated missing cross-boundary assertion may modify `e2e/task-resolution.spec.ts`; state-specific matrix coverage stays in Vitest.

- [ ] **Step 6: Run one named integrated browser record**

Start Vite on port 4173, establish a fresh approved fixture and inspect the existing detail:

```bash
agent-browser --session task-detail-journey-verify-01 open http://127.0.0.1:4173/sign-in
agent-browser --session task-detail-journey-verify-01 eval --stdin <<'EVALEOF'
localStorage.setItem("__msw-cookie-store__", JSON.stringify([{key:"token",value:"e2e-approved-refresh-token",domain:"127.0.0.1",path:"/api/refresh",httpOnly:true,hostOnly:true,sameSite:"strict"}]));
sessionStorage.setItem("__kbhc_msw_auth_fixture__", JSON.stringify({sequence:0,currentAccessToken:null,activeRefreshTokens:["e2e-approved-refresh-token"]}));
sessionStorage.removeItem("__kbhc_msw_task_fixture__");
location.assign("/task/task-1");
EVALEOF
agent-browser --session task-detail-journey-verify-01 wait --url '**/task/task-1'
agent-browser --session task-detail-journey-verify-01 wait --load networkidle
agent-browser --session task-detail-journey-verify-01 set viewport 1280 720
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 eval '({title:document.querySelector("h1")?.textContent,memo:document.querySelector("article")?.textContent?.includes("삭제 검증 대상"),dateTime:document.querySelector("time")?.getAttribute("datetime")})'
```

Open a missing detail, use keyboard recovery, then return to the existing detail:

```bash
agent-browser --session task-detail-journey-verify-01 open http://127.0.0.1:4173/task/missing
agent-browser --session task-detail-journey-verify-01 wait --load networkidle
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 find role link focus --name '할 일 목록으로 이동'
agent-browser --session task-detail-journey-verify-01 press Enter
agent-browser --session task-detail-journey-verify-01 wait --url '**/task'
agent-browser --session task-detail-journey-verify-01 open http://127.0.0.1:4173/task/task-1
agent-browser --session task-detail-journey-verify-01 wait --load networkidle
```

Verify the exact guard and complete one success deletion:

```bash
agent-browser --session task-detail-journey-verify-01 network requests --clear
agent-browser --session task-detail-journey-verify-01 find role button click --name '할 일 삭제'
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 find role textbox fill --name '할 일 ID' 'task-1 '
agent-browser --session task-detail-journey-verify-01 is enabled 'button[type=submit]'
agent-browser --session task-detail-journey-verify-01 find role textbox fill --name '할 일 ID' 'TASK-1'
agent-browser --session task-detail-journey-verify-01 is enabled 'button[type=submit]'
agent-browser --session task-detail-journey-verify-01 find role textbox fill --name '할 일 ID' 'wrong'
agent-browser --session task-detail-journey-verify-01 is enabled 'button[type=submit]'
agent-browser --session task-detail-journey-verify-01 find role textbox fill --name '할 일 ID' 'task-1'
agent-browser --session task-detail-journey-verify-01 find role button click --name '삭제 확인'
agent-browser --session task-detail-journey-verify-01 wait --url '**/task'
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 network requests --filter api/task
```

Inspect the deleted detail, dashboard consistency and mobile layout before cleanup:

```bash
agent-browser --session task-detail-journey-verify-01 open http://127.0.0.1:4173/task/task-1
agent-browser --session task-detail-journey-verify-01 wait --load networkidle
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 find role link click --name '대시보드'
agent-browser --session task-detail-journey-verify-01 wait --url '**/'
agent-browser --session task-detail-journey-verify-01 eval '({metrics:[...document.querySelectorAll("dd")].map((node)=>node.textContent),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-detail-journey-verify-01 set viewport 390 844
agent-browser --session task-detail-journey-verify-01 snapshot -i
agent-browser --session task-detail-journey-verify-01 eval '({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth})'
agent-browser --session task-detail-journey-verify-01 network requests --filter api
agent-browser --session task-detail-journey-verify-01 console
agent-browser --session task-detail-journey-verify-01 errors
agent-browser --session task-detail-journey-verify-01 screenshot /tmp/kbhc-task-detail-journey-verify-01.png
agent-browser --session task-detail-journey-verify-01 close
```

Expected: request methods/counts, route transitions, accessible states, responsive layout and cache/store results match `RES-P1-*` and `RES-E1/E2/E4`; `RES-E3` remains covered at the lower authenticated transport boundary.

- [ ] **Step 7: Run full verification on the exact product target**

```bash
git status --short
git rev-parse HEAD
./scripts/verify full
```

Expected: setup, quick, build, all four core Journeys and verifier regression PASS without mutation. Record the full SHA as the Journey verification target.

- [ ] **Step 8: Consolidate current-target evidence and close verification**

Append `## TASK-DETAIL-JOURNEY-VERIFY-01` to `docs/quality/evidence/task-resolution.md` with:

- requirement/Journey and `RES-*` trace table
- exact product target SHA
- focused `6 files/30 tests`, quick, mapped `1/1`, named browser and full results
- routes, viewports, auth/reset precondition, action sequence and request counts
- expected deliberate abort/404 console/network entries separated from unexpected errors
- screenshots/trace, failure/correction/rerun and verdict

Set only verification task `[x]`, `Status: AI_VERIFIED`.

- [ ] **Step 9: Commit the verification record**

```bash
git add TODO.md docs/quality/evidence/task-resolution.md e2e/task-resolution.spec.ts
git diff --cached --check
git commit -m "docs(task): task-resolution 통합 검증 근거 기록"
git status --short
```

Do not stage E2E when unchanged. If a proven Journey defect required source/test correction, use the matching `fix(task): ...` commit first, rerun Steps 3–7 on the new target, then commit evidence.

---

### Task 6: `TASK-DETAIL-JOURNEY-REVIEW-01` plan-completion adversarial review를 수행한다

**Files:**
- Review: this plan and approved spec
- Review: requirements, OpenAPI, auth/delete decisions, source, tests, E2E, evidence and TODO
- Modify only for a finding: the owning source/test/evidence file
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: exact verification target from Task 5
- Produces: seven-field plan/Journey review record with unresolved HIGH/MEDIUM finding 0

- [ ] **Step 1: Claim the review and freeze its target**

Set only `TASK-DETAIL-JOURNEY-REVIEW-01` to `IN_PROGRESS`, record reviewer identity/relationship and run:

```bash
git status --short
git rev-parse HEAD
./scripts/verify setup
```

Expected: clean worktree and Task 5 evidence commit at HEAD. Record that full SHA as the review target.

- [ ] **Step 2: Use a reviewer separated from the final change author**

Use a fresh context or explicit second-pass role that did not author the final implementation/evidence change. Provide the exact target SHA and review-only scope; do not accept a generic approval without inspected files and commands.

- [ ] **Step 3: Review contract, behavior and negative paths**

The reviewer checks and records:

- `TASK-DETAIL-01`~`TASK-DETAIL-05`, `RES-P1-*`, `RES-E1`~`RES-E4`
- OAS GET/DELETE path, bearer, 200/401/404 schemas and response fields
- auth replay maximum, stale session isolation and no feature-level token access
- exact ID, duplicate guard, pending close lock and focus lifecycle
- direct 404 non-success, outcome-unknown GET reconciliation and no automatic DELETE retry
- 200-only route/cache transition and list/detail/dashboard store consistency
- loading, 404, general error/retry, responsive/clipping and keyboard states
- weak/duplicate/flaky tests, core E2E size and lower-level coverage
- deliberate versus unexpected console/network failures
- unrelated diff, secrets, generated noise, evidence/TODO dependency/status consistency

- [ ] **Step 4: Reproduce the verification target**

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/model/delete-task.test.ts src/features/delete-task/model/delete-cache.test.ts src/shared/api/authenticated-request.test.ts
./scripts/verify quick
pnpm exec playwright test e2e/task-resolution.spec.ts
git diff HEAD^ --check
```

Expected: focused 6 files/30 tests, quick and mapped Chromium PASS; diff contains only Journey plan/work/evidence and proven corrections.

- [ ] **Step 5: Correct findings and re-review when required**

Any HIGH/MEDIUM finding reopens the owning task. For product behavior, first add the smallest test that fails for the finding, record RED, apply the shared root-cause fix and rerun focused → quick → mapped E2E/browser when applicable → full. Review the new exact target again. LOW findings may remain only with explicit impact and follow-up condition.

- [ ] **Step 6: Record the required review block**

Append this fully populated block under `## TASK-DETAIL-JOURNEY-REVIEW-01`:

```text
Review target: plan path, TASK-DETAIL-01~05/task-resolution, exact target SHA
Reviewer: fresh context or second-pass role ID and relationship to final author
Checks: exact documents, source/tests, commands and browser/evidence inspected
Findings: none or severity/class/root cause
Corrections: not applicable or exact applied changes
Rerun: exact commands and results
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

Only `PASS` or justified `PASS_WITH_LOW` with no unresolved HIGH/MEDIUM may close the review task as `[x]`, `AI_VERIFIED`.

- [ ] **Step 7: Commit review evidence**

```bash
git add TODO.md docs/quality/evidence/task-resolution.md
git diff --cached --check
git commit -m "docs(task): task-resolution 독립 검토 근거 기록"
git status --short
```

If corrections changed product code, commit each RED-backed fix separately before the review evidence commit and ensure the recorded target is the corrected HEAD.

---

### Task 7: `JOURNEY-TASK-DETAIL-01` 사람 checkpoint를 요청한다

**Files:**
- Inspect: `docs/quality/evidence/task-resolution.md`
- Inspect: `docs/quality/requirements.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: current automatic/browser evidence and PASS independent review
- Produces: auditable human checkpoint request; no AI approval claim

- [ ] **Step 1: Audit the checkpoint inputs**

```bash
rg -n 'TASK-DETAIL-(VIEW|RECOVERY|JOURNEY)|TASK-DELETE-(DIALOG|OUTCOME)|JOURNEY-TASK-DETAIL-01|Status:|Review target:|Verdict:' TODO.md docs/quality/evidence/task-resolution.md
./scripts/verify setup
git status --short
```

Expected: four view tasks, verify and review are `[x]`, `AI_VERIFIED`; review verdict permits checkpoint; setup passes and worktree is clean.

- [ ] **Step 2: Record the pending checkpoint package**

Keep `JOURNEY-TASK-DETAIL-01` checkbox `[ ]` and `Status: BLOCKED`. Replace its Evidence with:

- exact review target SHA and PASS/PASS_WITH_LOW record location
- `docs/quality/evidence/task-resolution.md` path
- focused, quick, mapped E2E, named browser and full command summary
- `RES-P1-*`, `RES-E*`, viewports, request counts and screenshot/trace summary
- explicit `사람 checkpoint 승인 대기; AI가 HUMAN_APPROVED를 기록하지 않음`

- [ ] **Step 3: Commit the checkpoint request and verify setup**

```bash
git add TODO.md
git diff --cached --check
git commit -m "docs(task): task-resolution 사람 검토 요청"
./scripts/verify setup
git status --short
```

Expected: setup PASS, clean worktree, checkpoint remains unchecked/BLOCKED.

- [ ] **Step 4: Present one human checkpoint**

Ask the person to review the current `docs/quality/evidence/task-resolution.md`, exact review target and PASS record. Do not start cross-Journey final QA across this unapproved boundary. Only a person may change the checkpoint to `[x]`, `HUMAN_APPROVED`.
