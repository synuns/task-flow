# Delete Consistency Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DEC-DELETE-01`에 승인된 server-authoritative 삭제, attempt guard, 200-only redirect, outcome-unknown reconciliation과 목록·상세·dashboard 일관성을 구현한다.

**Architecture:** 하나의 resettable MSW task store가 목록, 상세와 dashboard 수치의 source of truth가 된다. Delete feature는 사용자 submit 하나를 attempt 하나로 만들고, auth transport가 허용하는 최대 한 번 replay 외에는 DELETE를 자동 재전송하지 않는다. Network와 invalid response는 detail GET으로 조정하고 200 success만 자동 navigation한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, TanStack Query 5.102.8, MSW 2.15.0, Vitest 4.1.11, Testing Library 16.3.3, user-event 14.6.6

## Global Constraints

- `TASK-DETAIL-01`, `AUTH-STATE-01`, `ARCH-03`과 `DEC-DELETE-01` dependency가 실제로 해소된 뒤 실행한다. 이 계획의 Task 3이 `TASK-DELETE-01`, Task 4가 `TASK-DELETE-02`를 구현한다.
- Route ID와 input은 trim 또는 case conversion 없이 exact equality로 비교한다.
- 200 `{ success: true }`만 삭제 성공과 자동 `/task` 이동을 만든다.
- User submit 한 번은 delete attempt 하나이며 auth replay를 포함한 DELETE network 전송은 attempt당 최대 두 번이다.
- 404, network와 invalid-response를 success로 판정하지 않는다.
- Network와 invalid-response 뒤에는 detail GET으로 상태를 확인하고 DELETE를 자동 재전송하지 않는다.
- Pending delete와 reconciliation 중에는 modal close, cancel, Escape, outside click과 추가 submit을 막는다.
- 낙관적 cache update와 rollback을 구현하지 않는다.
- 이전 session 응답은 현재 cache, dialog, auth state와 route를 변경하지 않는다.
- 새 dependency를 추가하지 않는다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.

## File Structure

- `src/mocks/fixtures/tasks.ts`: resettable task store와 dashboard 파생 수치.
- `src/mocks/handlers/tasks.ts`: list/detail/delete/dashboard handlers.
- `src/shared/api/tasks.ts`: typed task detail/delete endpoints.
- `src/features/delete-task/model/delete-task.ts`: delete/reconciliation outcome service.
- `src/features/delete-task/model/attempt-guard.ts`: synchronous user-attempt guard.
- `src/features/delete-task/ui/delete-task-dialog.tsx`: exact ID, pending lock, recovery actions.
- `src/features/delete-task/index.ts`: `DeleteTaskDialog` public API.
- `src/entities/task/model/task-keys.ts`: list/detail query roots.
- `src/widgets/dashboard-summary/model/dashboard-keys.ts`: dashboard query root.
- `src/pages/task-detail/index.tsx`: dialog callback, 200 redirect와 cache transition.

---

### Task 1: 단일 task fixture store와 파생 dashboard

**Requirement IDs:** `TASK-LIST-01`, `TASK-DETAIL-01`, `TASK-DETAIL-02`, `TASK-DETAIL-05`, `DASH-01`

**Files:**

- Create or Modify: `src/mocks/fixtures/tasks.ts`
- Create or Modify: `src/mocks/handlers/tasks.ts`
- Modify: `src/mocks/handlers/index.ts`
- Create: `src/mocks/handlers/tasks.test.ts`

**Interfaces:**

- Consumes: OpenAPI `TaskItem`, `TaskDetailResponse`, `DashboardResponse`, `DeleteTaskResponse` shapes internally.
- Produces: `resetTaskStore()`; `listTaskPage(page)`; `findTask(id)`; `removeTask(id)`; `getDashboardMetrics()`; `taskHandlers`.

- [ ] **Step 1: Store consistency RED tests 작성**

Create `src/mocks/handlers/tasks.test.ts` and register `taskHandlers` for every case. Assert this exact sequence:

```ts
import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { resetTaskStore } from "@/mocks/fixtures/tasks";
import { taskHandlers } from "@/mocks/handlers/tasks";
import { server } from "@/mocks/server";
import { beforeEach, expect, it } from "vitest";

let accessToken = "";
beforeEach(() => {
  resetAuthFixture();
  resetTaskStore();
  accessToken = startAuthSession().accessToken;
  server.use(...taskHandlers);
});

async function apiRequest(path: string, method = "GET") {
  const response = await fetch(new URL(path, "http://localhost"), {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

it("derives list, detail, and dashboard from one delete transaction", async () => {
  const beforeList = await apiRequest("/api/task?page=1");
  const beforeDashboard = await apiRequest("/api/dashboard");
  const deleted = await apiRequest("/api/task/task-1", "DELETE");
  const afterList = await apiRequest("/api/task?page=1");
  const afterDetail = await apiRequest("/api/task/task-1");
  const afterDashboard = await apiRequest("/api/dashboard");

  expect(beforeList.status).toBe(200);
  expect(beforeDashboard.body).toEqual({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
  expect(deleted).toEqual({ status: 200, body: { success: true } });
  expect(
    (afterList.body as { data: Array<{ id: string }> }).data.map((task) => task.id),
  ).not.toContain("task-1");
  expect(afterDetail.status).toBe(404);
  expect(afterDashboard.body).toEqual({ numOfTask: 2, numOfRestTask: 1, numOfDoneTask: 1 });
});
```

Also assert a second DELETE returns 404, all exercised pages are integers `>= 1` as required by OpenAPI, unauthorized requests never mutate the store, and `resetTaskStore()` restores all three records.

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/mocks/handlers/tasks.test.ts`

Expected: FAIL because the shared store or handlers do not exist.

- [ ] **Step 3: Resettable store 구현**

Create `src/mocks/fixtures/tasks.ts`:

```ts
export type StoredTask = {
  id: string;
  title: string;
  memo: string;
  status: "TODO" | "DONE";
  registerDatetime: string;
};

const seed: StoredTask[] = [
  { id: "task-1", title: "첫 번째 할 일", memo: "삭제 검증 대상", status: "TODO", registerDatetime: "2026-08-30T09:00:00.000Z" },
  { id: "task-2", title: "두 번째 할 일", memo: "남아 있는 TODO", status: "TODO", registerDatetime: "2026-08-30T10:00:00.000Z" },
  { id: "task-3", title: "완료한 일", memo: "남아 있는 DONE", status: "DONE", registerDatetime: "2026-08-30T11:00:00.000Z" },
];

let tasks = structuredClone(seed);

export function resetTaskStore() { tasks = structuredClone(seed); }
export function listTaskPage(page: number) {
  const start = (page - 1) * 20;
  return { data: tasks.slice(start, start + 20).map(({ registerDatetime: _, ...task }) => task), hasNext: start + 20 < tasks.length };
}
export function findTask(id: string) { return tasks.find((task) => task.id === id) ?? null; }
export function removeTask(id: string) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  return tasks.splice(index, 1)[0] ?? null;
}
export function getDashboardMetrics() {
  return {
    numOfTask: tasks.length,
    numOfRestTask: tasks.filter((task) => task.status === "TODO").length,
    numOfDoneTask: tasks.filter((task) => task.status === "DONE").length,
  };
}
```

- [ ] **Step 4: Contract handlers 구현**

Create `src/mocks/handlers/tasks.ts` with bearer validation before store access:

```ts
import { acceptsBearer } from "../fixtures/auth";
import { findTask, getDashboardMetrics, listTaskPage, removeTask } from "../fixtures/tasks";
import { http, HttpResponse } from "msw";

const unauthorized = () => HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });

export const taskHandlers = [
  http.get("/api/task", ({ request }) => {
    if (!acceptsBearer(request.headers.get("Authorization"))) return unauthorized();
    const page = Number(new URL(request.url).searchParams.get("page"));
    return HttpResponse.json(listTaskPage(page));
  }),
  http.get("/api/task/:id", ({ params, request }) => {
    if (!acceptsBearer(request.headers.get("Authorization"))) return unauthorized();
    const task = findTask(String(params.id));
    return task
      ? HttpResponse.json({ title: task.title, memo: task.memo, registerDatetime: task.registerDatetime })
      : HttpResponse.json({ errorMessage: "할 일을 찾을 수 없습니다." }, { status: 404 });
  }),
  http.delete("/api/task/:id", ({ params, request }) =>
    !acceptsBearer(request.headers.get("Authorization"))
      ? unauthorized()
      : removeTask(String(params.id))
      ? HttpResponse.json({ success: true as const })
      : HttpResponse.json({ errorMessage: "할 일을 찾을 수 없습니다." }, { status: 404 }),
  ),
  http.get("/api/dashboard", ({ request }) =>
    acceptsBearer(request.headers.get("Authorization"))
      ? HttpResponse.json(getDashboardMetrics())
      : unauthorized(),
  ),
];
```

Add `...taskHandlers` to the shared handlers list. Do not duplicate token state
inside this module.

- [ ] **Step 5: GREEN, quick, commit**

Run:

```bash
pnpm vitest run src/mocks/handlers/tasks.test.ts
./scripts/verify quick
git add src/mocks/fixtures/tasks.ts src/mocks/handlers/tasks.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/index.ts
git commit -m "feat(mock): task 삭제 fixture 일관성 추가"
```

Expected: store consistency and quick verification PASS.

---

### Task 2: Typed delete endpoint와 outcome reconciliation

**Requirement IDs:** `TASK-DETAIL-05`

**Files:**

- Create or Modify: `src/shared/api/tasks.ts`
- Create: `src/features/delete-task/model/delete-task.ts`
- Create: `src/features/delete-task/model/delete-task.test.ts`

**Interfaces:**

- Consumes: `ApiClient.request`; `ApiError`; OpenAPI task schemas internally.
- Produces: `deleteTask(client, id)`; `getTaskDetail(client, id)`; `resolveDeleteAttempt(client, id): Promise<DeleteResolution>`; `recheckTaskPresence(client, id): Promise<PresenceResolution>`.

- [ ] **Step 1: Resolution RED table 작성**

Create tests for this exact table:

| DELETE result | Reconciliation GET | Resolution | Auto DELETE retry |
| --- | --- | --- | --- |
| 200 success | none | `success` | 0 |
| 404 | none | `absent` with server message | 0 |
| network | 200 | `exists` | 0 |
| invalid-response | 404 | `absent` without success claim | 0 |
| network | network | `unknown` | 0 |
| invalid-response | invalid-response | `unknown` | 0 |
| aborted | none | `stale` | 0 |

Every case asserts DELETE call count is exactly one at this feature boundary. Auth replay count is tested only in `authenticated-request.test.ts`.
Add a second table for `recheckTaskPresence`: GET 200 → `exists`, GET 404 →
`absent`, network/invalid-response → `unknown`, aborted → `stale`; every case
asserts DELETE call count is zero.

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/features/delete-task/model/delete-task.test.ts`

Expected: FAIL because the resolution service does not exist.

- [ ] **Step 3: Endpoint guards 구현**

In `src/shared/api/tasks.ts`, expose structural application types rather than generated aliases:

```ts
import type { ApiClient } from "./api-client-context";

export type TaskDetail = { title: string; memo: string; registerDatetime: string };
export type DeleteTaskResult = { success: true };

const apiUrl = (path: string) => new URL(path, globalThis.location?.origin ?? "http://localhost");

function isTaskDetail(value: unknown): value is TaskDetail {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.title === "string" && typeof data.memo === "string" &&
    typeof data.registerDatetime === "string";
}

function isDeleteTaskResult(value: unknown): value is DeleteTaskResult {
  return !!value && typeof value === "object" &&
    (value as Record<string, unknown>).success === true;
}

export function getTaskDetail(client: ApiClient, id: string): Promise<TaskDetail> {
  return client.request(apiUrl(`/api/task/${encodeURIComponent(id)}`), { method: "GET" }, isTaskDetail);
}

export function deleteTask(client: ApiClient, id: string): Promise<DeleteTaskResult> {
  return client.request(apiUrl(`/api/task/${encodeURIComponent(id)}`), { method: "DELETE" }, isDeleteTaskResult);
}
```

- [ ] **Step 4: Resolution service 구현**

Create `src/features/delete-task/model/delete-task.ts`:

```ts
import type { ApiClient } from "@/shared/api/api-client-context";
import type { ApiError } from "@/shared/api/api-error";
import { deleteTask, getTaskDetail } from "@/shared/api/tasks";

export type DeleteResolution =
  | { kind: "success" }
  | { kind: "exists"; message: string }
  | { kind: "absent"; message: string }
  | { kind: "unknown"; message: string }
  | { kind: "failure"; message: string }
  | { kind: "stale" };
export type PresenceResolution = Exclude<DeleteResolution, { kind: "success" }>;

const apiError = (value: unknown): value is ApiError =>
  !!value && typeof value === "object" && typeof (value as { kind?: unknown }).kind === "string";
const isUnknownOutcome = (error: ApiError) => error.kind === "network" || error.kind === "invalid-response";

export async function recheckTaskPresence(client: ApiClient, id: string): Promise<PresenceResolution> {
  try {
    await getTaskDetail(client, id);
    return { kind: "exists", message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다." };
  } catch (value) {
    if (!apiError(value)) throw value;
    if (value.kind === "aborted") return { kind: "stale" };
    if (value.kind === "http" && value.status === 404) {
      return { kind: "absent", message: "할 일이 현재 존재하지 않습니다. 삭제 성공으로 판정하지 않습니다." };
    }
    if (isUnknownOutcome(value)) {
      return { kind: "unknown", message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요." };
    }
    return { kind: "failure", message: value.message };
  }
}

export async function resolveDeleteAttempt(client: ApiClient, id: string): Promise<DeleteResolution> {
  try {
    await deleteTask(client, id);
    return { kind: "success" };
  } catch (value) {
    if (!apiError(value)) throw value;
    if (value.kind === "aborted") return { kind: "stale" };
    if (value.kind === "http" && value.status === 404) return { kind: "absent", message: value.message };
    if (!isUnknownOutcome(value)) return { kind: "failure", message: value.message };
  }

  return recheckTaskPresence(client, id);
}
```

- [ ] **Step 5: GREEN and commit**

Run:

```bash
pnpm vitest run src/features/delete-task/model/delete-task.test.ts
./scripts/verify quick
git add src/shared/api/tasks.ts src/features/delete-task/model
git commit -m "feat(delete): 삭제 결과 재확인 경계 추가"
```

Expected: the full outcome table PASS and no automatic second feature-level DELETE exists.

---

### Task 3: Synchronous attempt guard와 pending modal lock

**Requirement IDs:** `TASK-DETAIL-03`, `TASK-DETAIL-04`, `TASK-DETAIL-05`

**Files:**

- Create: `src/features/delete-task/model/attempt-guard.ts`
- Create: `src/features/delete-task/model/attempt-guard.test.ts`
- Create: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Create: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Create: `src/features/delete-task/index.ts`

**Interfaces:**

- Consumes: `resolveDeleteAttempt`; `useApiClient()`.
- Produces: `DeleteTaskDialog({ taskId, onSuccess, onAbsent })`.

- [ ] **Step 1: Guard and dialog RED tests 작성**

Use a deferred `resolveDeleteAttempt` mock and assert this exact matrix:

| Input/outcome | Submit | Dismiss/input | Visible result |
| --- | --- | --- | --- |
| empty, whitespace, case-different, wrong | disabled | enabled before attempt | no request |
| byte-exact | enabled | normal before attempt | one request |
| pending + double click/Enter | disabled after first event | Escape/outside/cancel/close/input blocked | status text and `aria-busy` |
| `exists` | re-enabled | close enabled | input retained; retry message |
| `unknown` | re-enabled | close enabled | input retained; GET-only recheck/list actions |
| `absent` | disabled until GET 200 | close enabled | alert and GET-only recheck/list actions |
| `stale` | unchanged | unchanged | no new error or navigation |
| closable failure then reopen | based on exact ID | close restores trigger focus | input/error reset |

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/ui/delete-task-dialog.test.tsx`

Expected: FAIL because guard and dialog do not exist.

- [ ] **Step 3: Synchronous attempt guard 구현**

Create `src/features/delete-task/model/attempt-guard.ts`:

```ts
export type AttemptGuard = {
  begin(): number | null;
  isCurrent(id: number): boolean;
  finish(id: number): void;
  pending(): boolean;
};

export function createAttemptGuard(): AttemptGuard {
  let sequence = 0;
  let current: number | null = null;
  return {
    begin() {
      if (current !== null) return null;
      current = ++sequence;
      return current;
    },
    isCurrent(id) { return current === id; },
    finish(id) { if (current === id) current = null; },
    pending() { return current !== null; },
  };
}
```

- [ ] **Step 4: Dialog state implementation**

Implement `DeleteTaskDialog` with callbacks typed as `() => Promise<void>` and a
stable `useRef(createAttemptGuard())`. The submit handler must follow this exact
order:

```ts
if (input !== taskId) return;
const attemptId = guard.begin();
if (attemptId === null) return;
setState({ kind: "pending" });
const resolution = await resolveDeleteAttempt(client, taskId);
if (!guard.isCurrent(attemptId)) return;
guard.finish(attemptId);
if (resolution.kind === "stale") return;
setState(resolution);
if (resolution.kind === "success") await onSuccess();
if (resolution.kind === "absent") await onAbsent();
```

Reuse the shadcn dialog primitive already introduced by `AUTH-API-01`; do not
hand-roll focus trapping. While `state.kind === "pending"`, prevent every
dismiss callback, keep submit/input/close disabled, set `aria-busy="true"`, and
render `<p role="status">삭제 결과를 확인하고 있습니다.</p>`. For `absent`,
render the message with `role="alert"`, keep submit disabled, and show a
`/task` action. For `exists` and `unknown`, retain input and re-enable submit as
a new explicit attempt.
The `다시 확인` action uses the same guard and pending lock but calls only
`recheckTaskPresence(client, taskId)`. GET 200 changes the state to `exists` and
re-enables submit; GET 404 remains `absent`; unknown remains recoverable. It must
never call `resolveDeleteAttempt` or issue DELETE.

Export only `DeleteTaskDialog` from `src/features/delete-task/index.ts`.

- [ ] **Step 5: GREEN, quick, commit**

Run:

```bash
pnpm vitest run src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/ui/delete-task-dialog.test.tsx
./scripts/verify quick
git add src/features/delete-task
git commit -m "feat(delete): 삭제 attempt와 modal 잠금 구현"
```

Expected: component/guard tests and quick verification PASS.

---

### Task 4: Cache eviction과 200-only navigation

**Requirement IDs:** `TASK-DETAIL-05`, `TASK-LIST-01`, `DASH-01`

**Files:**

- Create or Modify: `src/entities/task/model/task-keys.ts`
- Create or Modify: `src/widgets/dashboard-summary/model/dashboard-keys.ts`
- Create: `src/features/delete-task/model/delete-cache.ts`
- Create: `src/features/delete-task/model/delete-cache.test.ts`
- Modify: `src/pages/task-detail/index.tsx`
- Modify: `src/pages/task-detail/task-detail.test.tsx`
- Create: `e2e/task-resolution.spec.ts`

**Interfaces:**

- Consumes: `QueryClient`; `DeleteTaskDialog`; router navigation inside task detail page.
- Produces: `evictTaskSnapshots(queryClient): Promise<void>`; success and absent page callbacks.

- [ ] **Step 1: Cache/route RED integration tests 작성**

Seed query cache with list pages containing `task-1`, its detail, dashboard counts, and an unrelated key. Assert:

```ts
await evictTaskSnapshots(queryClient);
expect(queryClient.getQueriesData({ queryKey: ["tasks"] })).toEqual([]);
expect(queryClient.getQueriesData({ queryKey: ["task"] })).toEqual([]);
expect(queryClient.getQueriesData({ queryKey: ["dashboard"] })).toEqual([]);
expect(queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
```

Page integration cases must prove success awaits eviction then navigates `/task`; absent awaits eviction but does not auto-navigate; failure/exists/unknown do neither; stale does nothing.

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/features/delete-task/model/delete-cache.test.ts src/pages/task-detail/task-detail.test.tsx`

Expected: FAIL because cache transition and page callbacks do not exist.

- [ ] **Step 3: Query keys and eviction 구현**

Use these roots consistently:

```ts
export const taskKeys = { all: ["tasks"] as const, detailRoot: ["task"] as const };
export const dashboardKeys = { all: ["dashboard"] as const };
```

Create `src/features/delete-task/model/delete-cache.ts`:

```ts
import type { QueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/entities/task/model/task-keys";
import { dashboardKeys } from "@/widgets/dashboard-summary/model/dashboard-keys";

export async function evictTaskSnapshots(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: taskKeys.all }),
    queryClient.cancelQueries({ queryKey: taskKeys.detailRoot }),
    queryClient.cancelQueries({ queryKey: dashboardKeys.all }),
  ]);
  queryClient.removeQueries({ queryKey: taskKeys.all });
  queryClient.removeQueries({ queryKey: taskKeys.detailRoot });
  queryClient.removeQueries({ queryKey: dashboardKeys.all });
}
```

- [ ] **Step 4: Page callbacks 구현**

Inside the task detail route page, where router hooks are legal:

```ts
const onDeleteSuccess = async () => {
  await evictTaskSnapshots(queryClient);
  navigate("/task", { replace: true });
};
const onDeleteAbsent = async () => {
  await evictTaskSnapshots(queryClient);
};
```

Pass these callbacks to `DeleteTaskDialog`. The dialog's explicit list action performs navigation for absent/unknown; `onDeleteAbsent` itself must not navigate. Do not patch list pages or dashboard values optimistically.

Create one `@core @task-resolution` browser test in
`e2e/task-resolution.spec.ts`. Sign in, open `/task/task-1`, prove wrong,
whitespace, and case-different inputs issue zero DELETE requests, submit the
byte-exact ID once, and assert one DELETE (or two only when the test explicitly
induces the auth replay), `/task` navigation, list absence, detail 404, and
updated dashboard metrics. Record console/page errors and attach the final
screenshot. Keep network/invalid-response matrices in the deterministic
integration tests.

- [ ] **Step 5: GREEN, quick, commit**

Run:

```bash
pnpm vitest run src/features/delete-task/model/delete-cache.test.ts src/pages/task-detail/task-detail.test.tsx
./scripts/verify quick
git add src/entities/task/model/task-keys.ts src/widgets/dashboard-summary/model/dashboard-keys.ts src/features/delete-task/model/delete-cache.ts src/features/delete-task/model/delete-cache.test.ts src/pages/task-detail e2e/task-resolution.spec.ts
git commit -m "feat(delete): 삭제 cache 정리와 route 전환 연결"
```

Expected: cache and route integration tests PASS; unrelated cache remains; only 200 auto-navigates.

---

### Task 5: TASK-DELETE evidence와 task-resolution checkpoint 준비

**Requirement IDs:** `TASK-DETAIL-03`, `TASK-DETAIL-04`, `TASK-DETAIL-05`, `TASK-LIST-01`, `DASH-01`

**Files:**

- Modify: `TODO.md`
- Modify: `docs/quality/requirements.md`
- Create or Modify: `docs/quality/evidence/task-resolution.md`

**Interfaces:**

- Consumes: all previous task test and browser outputs.
- Produces: reproducible `TASK-DELETE-01/02` evidence and task-resolution review input.

- [ ] **Step 1: Focused automatic verification**

Run:

```bash
pnpm vitest run src/mocks/handlers/tasks.test.ts src/features/delete-task src/pages/task-detail/task-detail.test.tsx
./scripts/verify quick
pnpm exec playwright test --grep @task-resolution
git diff --check
```

Expected: focused tests, quick gate, and task-resolution browser tests PASS without verification mutation.

- [ ] **Step 2: Browser evidence**

Record wrong/whitespace/case-different/exact ID, pending close lock, user attempt count, auth replay request count, 404 recovery, DELETE network/invalid-response followed by GET 200/404/failure, 200-only redirect, post-delete list absence, detail 404, dashboard count, console/network and trace.

- [ ] **Step 3: Evidence and commit**

Set `TASK-DELETE-01` and `TASK-DELETE-02` to `AI_VERIFIED` only when the cited evidence passes. Keep `JOURNEY-TASK-DETAIL-01` short of `HUMAN_APPROVED`; run lightweight adversarial review and request the human checkpoint.

```bash
git add TODO.md docs/quality/requirements.md docs/quality/evidence/task-resolution.md
git commit -m "docs(delete): 삭제 일관성 검증 근거 기록"
```
