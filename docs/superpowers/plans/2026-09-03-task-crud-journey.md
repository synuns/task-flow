# Task CRUD Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Begin from the reviewed User CRUD target because Task ownership and account cascade are its explicit prerequisite.

**Goal:** 사용자별 Task 생성·목록/상세 조회·제목/메모/상태 수정·기존 exact-ID 삭제를 승인된 API와 UI/UX로 구현하고 `task-crud` Golden Journey의 자동·browser evidence와 사람 checkpoint를 준비한다.

**Architecture:** User CRUD가 만든 owner-aware MSW store와 별도 CRUD OpenAPI를 확장한다. `entities/task`가 Task model/status/query keys를, `shared/api/tasks.ts`가 generated transport와 runtime guard를 소유한다. 목록 page는 `새 할 일` modal과 read-only status badge만 제공하고, 상세 page는 profile과 같은 field 단위 edit 및 독립 3-state control을 제공한다. 모든 mutation은 response 성공 뒤 cache를 갱신하는 server-authoritative 방식이다.

**Tech Stack:** React 19, TypeScript strict, React Router, TanStack Query, React Hook Form, Zod, MSW, existing shadcn/Radix primitives, Vitest, Testing Library, Playwright, agent-browser

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-09-03-user-task-crud-journeys-design.md`와 `TASK-CRUD-01`~`TASK-CRUD-08`이다.
- `assignment-original/`과 기존 auth/delete semantics는 수정하지 않는다. 승인된 Task CRUD만 `docs/api/crud-openapi.yaml`에 추가한다.
- status는 `TODO | IN_PROGRESS | DONE`; dashboard rest는 `TODO + IN_PROGRESS`, done은 `DONE`이다.
- 생성 request는 title/memo만 받고 server가 ID/registerDatetime/status=`TODO`를 정한다. status picker를 create modal에 넣지 않는다.
- title은 trim 1~100, memo는 0~500이며 생략 시 `""`다.
- 목록 header의 `새 할 일` button이 modal을 연다. mobile에서는 제목 아래 full-width, desktop에서는 제목 오른쪽에 배치한다.
- 목록은 read-only status badge와 전체-card detail link를 유지한다. dropdown, cyclic status button이나 inline edit를 넣지 않는다.
- 상세 title/memo는 profile과 같은 연필→체크/X, 한 field씩 수정한다. status는 별도의 세 button control이다.
- success response 전에는 상세 status, field 값, list cache와 dashboard 수치를 변경하지 않는다. pending은 현재 control만 잠근다.
- PATCH 실패 시 이전 status와 dashboard를 그대로 유지한다. field identifier 없는 400은 field error가 아니라 row/form alert다.
- POST network/invalid response는 결과 미확정이고 자동 재시도하지 않는다. 목록을 먼저 재조회한 뒤에만 사용자가 명시적으로 다시 제출할 수 있다.
- 생성 후 새 Task의 위치는 가정하지 않는다. response ID가 refetched 목록 어딘가에 존재하는지만 검증한다.
- 다른 user 소유 Task는 list에서 숨기고 detail/PATCH/DELETE에 모두 404를 반환한다.
- 기존 `features/delete-task`의 exact-ID guard, bounded auth replay, 200-only redirect를 재사용하고 generic CRUD framework나 새 dependency를 추가하지 않는다.
- 실행 중 dependency가 해소된 TODO task 하나만 `IN_PROGRESS`로 두고 task owner만 status/evidence를 갱신한다.
- 최종 검증은 focused → quick → mapped E2E → named browser → full → plan-completion adversarial review 순서다.
- AI는 마지막 Journey checkpoint를 `HUMAN_APPROVED`로 표시하지 않는다.

## Execution Entry

User CRUD 사람 checkpoint가 검토된 exact target에서 별도 worktree를 만든다.

```bash
cd /Users/identity/dev/assignment/kbhc-assgn
git status --short
task_base_target=$(git rev-parse feat/user-crud)
git worktree add .worktrees/task-crud -b feat/task-crud "$task_base_target"
cd .worktrees/task-crud
pnpm install --frozen-lockfile
pnpm verify setup
```

Expected: branch `feat/task-crud`, clean worktree, User CRUD plan의 owner-aware user/task fixture와 approved evidence가 존재하며 setup이 PASS한다. 원 checkout의 user-owned 변경은 가져오지 않는다.

## File Map

- Modify: `docs/api/crud-openapi.yaml`, `src/generated/crud-openapi.ts`, `src/shared/api/openapi-contract.test.ts`
- Modify: `docs/project-plan.md`, `docs/quality/requirements.md`, `docs/quality/verification.md`, `scripts/verify`, `tests/test_verify_contract.py`, `TODO.md`
- Add: `src/entities/task/model/task.ts`
- Modify: `src/entities/task/index.ts`, `src/entities/task/ui/task-card.tsx`, `src/entities/task/ui/task-card.test.tsx`
- Modify: `src/shared/api/tasks.ts`, `src/shared/api/tasks.test.ts`, `src/shared/api/index.ts`
- Modify: `src/mocks/fixtures/tasks.ts`, `src/mocks/fixtures/tasks.test.ts`, `src/mocks/handlers/tasks.ts`, `src/mocks/handlers/tasks.test.ts`
- Add: `src/features/create-task/**`, `src/features/update-task/**`
- Modify: `src/pages/task-list/index.tsx`, `src/widgets/task-list/index.tsx`, their tests
- Modify: `src/pages/task-detail/index.tsx`, `src/pages/task-detail/task-detail.test.tsx`
- Preserve and regression-test: `src/features/delete-task/**`
- Add: `e2e/task-crud.spec.ts`, `docs/quality/evidence/task-crud.md`
- Modify only if fixed contract lists require it: `scripts/verify` and its existing tests

## Required Interfaces

```ts
// entities/task/model/task.ts
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Task = { id: string; title: string; memo: string; status: TaskStatus; registerDatetime: string };
export type TaskListItem = Omit<Task, "registerDatetime">;
export type EditableTaskField = "title" | "memo";

// shared/api/tasks.ts
export type TaskStatusData = "TODO" | "IN_PROGRESS" | "DONE";
export type CreateTaskInput = { title: string; memo?: string };
export type UpdateTaskInput = { title: string } | { memo: string } | { status: TaskStatusData };
export type TaskDetailData = { title: string; memo: string; status: TaskStatusData; registerDatetime: string };
export type CreatedTaskData = TaskDetailData & { id: string };
export function createTask(client: ApiClient, input: CreateTaskInput): Promise<CreatedTaskData>;
export function updateTask(client: ApiClient, id: string, input: UpdateTaskInput): Promise<TaskDetailData>;

// owner-aware mock store
export function createStoredTask(ownerId: string, input: CreateTaskInput): StoredTask;
export function updateStoredTask(ownerId: string, id: string, patch: UpdateTaskInput): StoredTask | null;
export function listTaskPage(ownerId: string, page: number): TaskListResponse;
export function findTask(ownerId: string, id: string): StoredTask | null;
export function getDashboardMetrics(ownerId: string): DashboardResponse;
```

---

### Task 1: `TASK-CRUD-CONTRACT-01` Task 확장 계약과 작업 통제면을 추가한다

**Files:** `docs/api/crud-openapi.yaml`, `src/generated/crud-openapi.ts`, `src/shared/api/openapi-contract.test.ts`, `scripts/verify`, `tests/test_verify_contract.py`, `docs/project-plan.md`, `docs/quality/requirements.md`, `docs/quality/verification.md`, `TODO.md`

- [ ] **Step 1: Journey lookup을 수행한다**

```bash
rg -n 'TASK-CRUD|/api/task|TaskStatus|TaskDetailResponse|numOfRestTask|TaskCard' docs/quality/requirements.md TODO.md src e2e assignment-original docs/api
git status --short
```

- [ ] **Step 2: verifier의 Task backlog/review 기대를 RED로 만든다**

`tests/test_verify_contract.py`에 `TASK-CRUD-CONTRACT-01`부터
`JOURNEY-TASK-CRUD-01`까지 dependency/status와
`TASK-CRUD-JOURNEY-REVIEW-01`의 필수 review fields 기대를 추가한다.

```bash
python3 -m unittest tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog tests.test_verify_contract.VerifyContractTests.test_todo_accepts_completed_review_record -v
```

Expected RED: Task TODO blocks와 review owner가 없다.

- [ ] **Step 3: TODO dependency graph와 verifier review owner를 등록한다**

`TASK-CRUD-CONTRACT-01`, `TASK-CRUD-STORE-01`, `TASK-CRUD-TRANSPORT-01`, `TASK-CRUD-CREATE-01`, `TASK-CRUD-EDIT-01`, `TASK-CRUD-STATUS-01`, `TASK-CRUD-DELETE-REGRESSION-01`, `TASK-CRUD-JOURNEY-VERIFY-01`, `TASK-CRUD-JOURNEY-REVIEW-01`, `JOURNEY-TASK-CRUD-01` block을 추가한다. 첫 task만 `IN_PROGRESS`, 구현 task들은 `NOT_STARTED`, 사람 checkpoint는 `[ ]`, `BLOCKED`로 둔다. `scripts/verify`의 review task set에 새 review ID를 추가한다.

- [ ] **Step 4: generated contract RED를 추가한다**

```ts
type TaskStatus = crudComponents["schemas"]["TaskStatus"];
type CreateBody = crudPaths["/api/task"]["post"]["requestBody"]["content"]["application/json"];
type PatchBody = crudPaths["/api/task/{id}"]["patch"]["requestBody"]["content"]["application/json"];

expectTypeOf<TaskStatus>().toEqualTypeOf<"TODO" | "IN_PROGRESS" | "DONE">();
expectTypeOf<CreateBody>().toEqualTypeOf<{ title: string; memo?: string }>();
expectTypeOf<PatchBody>().toMatchTypeOf<{ title: string } | { memo: string } | { status: TaskStatus }>();
```

```bash
pnpm vitest run src/shared/api/openapi-contract.test.ts
```

Expected RED: extension에 Task paths/status가 없다.

- [ ] **Step 5: Task schemas와 paths를 CRUD OpenAPI에 추가한다**

POST `/api/task` 201, GET list/detail 200, PATCH detail 200, DELETE 기존 200을 정의한다. `CreateTaskRequest`에는 status가 없고 `UpdateTaskRequest`는 exact one-of다.

```yaml
TaskStatus:
  type: string
  enum: [TODO, IN_PROGRESS, DONE]
CreateTaskRequest:
  type: object
  additionalProperties: false
  required: [title]
  properties:
    title: { type: string, minLength: 1, maxLength: 100 }
    memo: { type: string, maxLength: 500, default: "" }
UpdateTaskRequest:
  oneOf:
    - type: object
      additionalProperties: false
      required: [title]
      properties:
        title: { type: string, minLength: 1, maxLength: 100 }
    - type: object
      additionalProperties: false
      required: [memo]
      properties:
        memo: { type: string, maxLength: 500 }
    - type: object
      additionalProperties: false
      required: [status]
      properties:
        status: { $ref: '#/components/schemas/TaskStatus' }
```

`CreatedTaskResponse`는 `id,title,memo,status,registerDatetime`,
`TaskDetailResponse`는 승인된 대로 `title,memo,status,registerDatetime` exact object로
정의한다. 생성 response ID는 생성 후 목록 존재 확인에만 사용한다.

```bash
pnpm api:types
pnpm vitest run src/shared/api/openapi-contract.test.ts
git diff --exit-code -- assignment-original src/generated/openapi.ts
```

Expected GREEN: extension test PASS, 원본과 원본 generated diff 없음.

- [ ] **Step 6: quality map을 확정하고 commit한다**

`docs/project-plan.md`의 Journey map을 `task-crud`까지 여섯 개로 전환한다. `docs/quality/requirements.md`에 `TASK-CRUD-01`~`08`과 positive/status-failure cases, `verification.md`에 `task-crud` route/API/source/E2E mapping을 추가한다. 기존 task-discovery/resolution의 accepted behavior를 삭제하지 않는다.

```bash
pnpm verify quick
git diff --check
git add docs/api/crud-openapi.yaml src/generated/crud-openapi.ts src/shared/api/openapi-contract.test.ts scripts/verify tests/test_verify_contract.py docs/project-plan.md docs/quality/requirements.md docs/quality/verification.md TODO.md
git commit -m "docs(task): 할 일 CRUD 계약과 여정 등록"
```

---

### Task 2: `TASK-CRUD-STORE-01` owner-aware create/update/status store를 구현한다

**Files:** `src/mocks/fixtures/tasks.ts`, `src/mocks/fixtures/tasks.test.ts`, `src/mocks/handlers/tasks.ts`, `src/mocks/handlers/tasks.test.ts`

- [ ] **Step 1: store matrix RED를 작성한다**

한 fixture test가 default TODO create, server ID/date, title trim, memo default, one-field update, IN_PROGRESS rest count, owner filtering, cross-user null과 cascade regression을 검증한다.

```ts
const created = createStoredTask("user-1", { title: " 새 할 일 ", memo: "메모" });
expect(created).toMatchObject({ title: "새 할 일", status: "TODO", ownerId: "user-1" });
expect(updateStoredTask("user-1", created.id, { status: "IN_PROGRESS" })?.status).toBe("IN_PROGRESS");
expect(getDashboardMetrics("user-1").numOfRestTask).toBe(
  listAll("user-1").filter((task) => task.status !== "DONE").length,
);
expect(findTask("user-2", created.id)).toBeNull();
```

handler test는 owner bearer, POST 201, PATCH 200, malformed multi-field 400, cross-user GET/PATCH/DELETE 404를 확인한다.

```bash
pnpm vitest run src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts
```

Expected RED: create/update/IN_PROGRESS APIs가 없다.

- [ ] **Step 2: 기존 배열 store에 최소 연산만 추가한다**

`StoredTask`에 이미 추가된 `ownerId`를 유지하고 status schema를 세 값으로 확장한다. ID는 fixture sequence 기반 `task-N`, registerDatetime은 생성 시 ISO string으로 server-owned 생성한다. 정렬 로직은 추가하지 않는다.

- [ ] **Step 3: 모든 Task handler를 bearer user ID로 scope한다**

GET list/detail/dashboard, POST, PATCH, DELETE가 `bearerUserId`를 사용한다. cross-user와 missing은 같은 404다. PATCH body는 exact one key만 허용하고 validated 성공 뒤 store를 persist한다.

- [ ] **Step 4: 검증하고 commit한다**

```bash
pnpm vitest run src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
pnpm verify quick
git add src/mocks/fixtures/tasks.ts src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.ts src/mocks/handlers/tasks.test.ts TODO.md
git commit -m "feat(task): 소유자별 할 일 생성과 수정 저장소 추가"
```

---

### Task 3: `TASK-CRUD-TRANSPORT-01` Task entity와 transport boundary를 확장한다

**Files:** `src/entities/task/model/task.ts`, `src/entities/task/index.ts`, `src/shared/api/tasks.ts`, `src/shared/api/tasks.test.ts`, `src/shared/api/index.ts`

- [ ] **Step 1: transport RED를 추가한다**

tests가 POST/PATCH method/path/body, default status response, detail status, IN_PROGRESS list item, exact response rejection을 검증한다. Create body에 status가 포함되지 않고 PATCH body가 한 key인지 assertion한다.

```bash
pnpm vitest run src/shared/api/tasks.test.ts
```

Expected RED: `IN_PROGRESS`, create/update functions와 detail `id/status`가 없다.

- [ ] **Step 2: 공개 entity model을 한 file에 추가한다**

`model/task.ts`에 Required Interfaces의 네 type만 둔다. 기존 query keys/UI를 public `entities/task/index.ts`에서 함께 export한다. transport generated type은 shared boundary 밖으로 export하지 않는다.

- [ ] **Step 3: 기존 request helpers로 API를 확장한다**

`createTask`/`updateTask`는 `ApiClient.request`를 사용하며 automatic retry를 추가하지 않는다. item/detail guards는 `IN_PROGRESS`, detail `id/status`와 exact keys를 검사한다. title trim은 UI와 MSW trust boundary 양쪽에서 수행하되 response를 client가 임의 수정하지 않는다.

- [ ] **Step 4: 검증하고 commit한다**

```bash
pnpm vitest run src/shared/api/tasks.test.ts src/test/architecture-contract.test.ts
pnpm verify quick
git add src/entities/task src/shared/api/tasks.ts src/shared/api/tasks.test.ts src/shared/api/index.ts TODO.md
git commit -m "feat(task): 할 일 CRUD entity와 API 경계 확장"
```

---

### Task 4: `TASK-CRUD-CREATE-01` 목록 header와 생성 modal을 구현한다

**Files:** `src/features/create-task/**`, `src/pages/task-list/index.tsx`, page test if added, `src/widgets/task-list/index.tsx`, `src/widgets/task-list/task-list.test.tsx`

- [ ] **Step 1: form/list integration RED를 작성한다**

schema test는 title trim 1~100, memo 0~500와 status field 부재를 검증한다. component test는 `새 할 일` button, dialog focus/return, cancel, client field errors, server 400 form alert, pending duplicate guard, 201 뒤 response ID를 포함하는 refetched list를 검증한다. 첫 행이나 정렬은 assertion하지 않는다.

outcome-unknown test는 POST가 network/invalid response일 때 자동 POST count가 1이고 목록 GET이 끝나기 전 재제출이 disabled인지 확인한다. refetch 뒤에는 사용자가 명시적으로 다시 누를 수 있어야 한다.

```bash
pnpm vitest run src/features/create-task src/pages/task-list src/widgets/task-list/task-list.test.tsx
```

Expected RED: create feature/button/modal이 없다.

- [ ] **Step 2: 기존 Dialog/Form primitives로 create feature를 구현한다**

modal은 title input과 memo textarea만 가진다. 성공 시 dialog를 닫고 task list를 page 1부터 reset/refetch하며 dashboard를 invalidate한다. UI가 response ID를 특정 위치에 삽입하거나 같은 내용으로 항목을 추정하지 않는다. integration/E2E는 목록을 terminal page까지 탐색해 response ID가 존재함을 확인한다.

- [ ] **Step 3: unknown result는 GET reconciliation 뒤 사용자 retry만 허용한다**

```ts
catch (error) {
  if (isOutcomeUnknown(error)) {
    setState({ kind: "checking" });
    await queryClient.refetchQueries({ queryKey: taskKeys.all, type: "active" });
    setState({ kind: "unknown-ready" });
    return;
  }
  setState({ kind: "error", message: errorMessage(error) });
}
```

동일 title/memo로 생성 여부를 추정하거나 자동 POST retry하지 않는다.

- [ ] **Step 4: responsive header를 구현한다**

page header는 mobile `grid gap`에서 title/description 아래 full-width button, `sm` 이상에서 `flex justify-between`과 내용 폭 button을 사용한다. 빈 목록에서도 생성 button은 항상 보인다.

- [ ] **Step 5: 검증하고 commit한다**

```bash
pnpm vitest run src/features/create-task src/pages/task-list src/widgets/task-list/task-list.test.tsx
pnpm verify quick
git add src/features/create-task src/pages/task-list src/widgets/task-list TODO.md
git commit -m "feat(task): 할 일 생성 모달과 목록 동작 추가"
```

---

### Task 5: `TASK-CRUD-EDIT-01` 상세 title/memo 필드 수정 UX를 구현한다

**Files:** `src/features/update-task/**`, `src/pages/task-detail/index.tsx`, `src/pages/task-detail/task-detail.test.tsx`

- [ ] **Step 1: profile-equivalent edit RED를 작성한다**

detail test는 title/memo/status/registerDatetime 표시, 각 field 오른쪽 연필 button, 한 field 편집, check submit, X cancel, pending 동안 원 표시값 유지, success response 뒤 갱신, field 없는 400 row alert를 검증한다. registerDatetime에는 edit control이 없어야 한다.

```bash
pnpm vitest run src/features/update-task src/pages/task-detail/task-detail.test.tsx
```

Expected RED: status와 field edit controls가 없다.

- [ ] **Step 2: user profile과 같은 interaction vocabulary를 구현한다**

동일 lucide `Pencil`, `Check`, `X`, 동일 button size/variant와 accessible label을 사용한다. feature-to-feature import는 하지 않고 Task domain의 draft/mutation만 `features/update-task`가 소유한다. title/memo는 한 active field state를 공유한다.

- [ ] **Step 3: success response로 detail/list cache를 갱신한다**

성공 시 detail key를 response로 바꾸고 active task list는 invalidate/refetch한다. `onMutate`와 rollback snapshot은 만들지 않는다. 실패 시 기존 render와 cache를 그대로 두고 row alert만 보인다.

- [ ] **Step 4: 검증하고 commit한다**

```bash
pnpm vitest run src/features/update-task src/pages/task-detail/task-detail.test.tsx
pnpm verify quick
git add src/features/update-task src/pages/task-detail TODO.md
git commit -m "feat(task): 할 일 상세 필드별 수정 추가"
```

---

### Task 6: `TASK-CRUD-STATUS-01` 상세 3-state control과 dashboard 일관성을 구현한다

**Files:** `src/features/update-task/**`, `src/pages/task-detail/index.tsx`, `src/pages/task-detail/task-detail.test.tsx`, `src/widgets/dashboard-summary/dashboard-summary.test.tsx`, applicable API/store tests

- [ ] **Step 1: 가장 중요한 실패 경로를 RED로 고정한다**

`TaskStatusControl` test는 현재 active `TODO`, `IN_PROGRESS` click 후 pending 동안 TODO 유지, PATCH 500/400 후 TODO와 dashboard cache 유지, success 뒤에만 IN_PROGRESS active와 dashboard refetch를 검증한다. current status button은 disabled 또는 no-op이며 mutation을 보내지 않는다.

```bash
pnpm vitest run src/features/update-task src/pages/task-detail/task-detail.test.tsx src/widgets/dashboard-summary/dashboard-summary.test.tsx
```

Expected RED: 3-state control과 invalidation이 없다.

- [ ] **Step 2: 별도 status control을 구현한다**

세 button은 `할 일`, `진행 중`, `완료`의 명확한 visible label과 `aria-pressed`를 가진다. field edit와 동시에 mutation하지 않도록 현재 control만 pending lock한다. 성공 때만 detail/list/dashboard query를 response/invalidation으로 갱신한다.

- [ ] **Step 3: list read-only badge를 추가한다**

`TaskCardProps`에 status를 추가하고 three-label badge를 카드 안에 표시한다. badge는 interactive하지 않고 카드 전체 link와 가상 목록 구조를 유지한다. 기존 list test와 virtualization bounds를 그대로 통과시킨다.

- [ ] **Step 4: 검증하고 commit한다**

```bash
pnpm vitest run src/features/update-task src/pages/task-detail/task-detail.test.tsx src/entities/task/ui/task-card.test.tsx src/widgets/task-list/task-list.test.tsx src/widgets/dashboard-summary/dashboard-summary.test.tsx
pnpm verify quick
git add src/features/update-task src/pages/task-detail src/entities/task src/widgets/task-list src/widgets/dashboard-summary TODO.md
git commit -m "feat(task): 할 일 상태 변경과 현황 연동 추가"
```

---

### Task 7: `TASK-CRUD-DELETE-REGRESSION-01` 기존 exact-ID 삭제 계약을 보존한다

**Files:** inspect `src/features/delete-task/**`, modify only proven gaps, matching tests, `TODO.md`

- [ ] **Step 1: 기존 삭제 caller와 owner scope를 재검토한다**

```bash
rg -n 'deleteTask|resolveDeleteAttempt|recheckTaskPresence|evictTaskSnapshots|DeleteTaskDialog' src e2e
pnpm vitest run src/features/delete-task src/pages/task-detail/task-detail.test.tsx src/mocks/handlers/tasks.test.ts
```

Expected: exact-ID, one attempt + at most one auth replay, 200-only redirect tests PASS. owner-aware 404도 PASS해야 한다.

- [ ] **Step 2: proven gap만 RED로 고친다**

기존 feature가 새 detail shape/status에서도 통과하면 production code를 바꾸지 않는다. cross-user DELETE나 cache root가 실패할 때만 가장 낮은 기존 test에 RED를 추가하고 shared root cause를 수정한다.

- [ ] **Step 3: quick와 commit을 수행한다**

```bash
pnpm verify quick
git add src/features/delete-task src/pages/task-detail src/mocks/handlers/tasks.test.ts TODO.md
git diff --cached --check
git commit -m "test(task): CRUD 확장 후 삭제 계약 보존"
```

제품 diff가 전혀 없으면 evidence/TODO만 commit한다.

---

### Task 8: `TASK-CRUD-JOURNEY-VERIFY-01` 핵심 E2E와 browser evidence를 완성한다

**Files:** `e2e/task-crud.spec.ts`, `docs/quality/evidence/task-crud.md`, `scripts/verify`, `tests/test_verify_contract.py`, `TODO.md`

- [ ] **Step 1: positive와 critical failure core cases를 작성한다**

positive case는 목록 header→create modal→201 TODO→refetched list에서 response ID 존재→detail→title 또는 memo 수정→IN_PROGRESS/DONE 상태 변경→dashboard 수치→기존 exact-ID 삭제를 검증한다. created item 위치는 assertion하지 않는다.

failure case는 status PATCH 실패 뒤 detail의 이전 active status와 dashboard 수치가 그대로인지 검증한다. 각 case는 독립 fixture와 user-owned task state를 사용한다.

`tests/test_verify_contract.py`의 core source/tag 및 protected Journey expectation에
`e2e/task-crud.spec.ts`, `@task-crud`를 먼저 추가해 RED를 확인한 다음
`scripts/verify`의 required core source를 확장한다. 이 Journey는
`e2e/authenticated-fixture.ts`를 import해야 한다.

정확한 test title은 `@core Task CRUD 성공 흐름과 소유 상태를 유지한다`와
`@core 상태 변경 실패는 상세와 현황 값을 보존한다`로 고정한다.

- [ ] **Step 2: 자동 검증을 순서대로 실행한다**

```bash
pnpm vitest run src/features/create-task src/features/update-task src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/pages/task-detail/task-detail.test.tsx src/widgets/task-list/task-list.test.tsx
pnpm verify quick
pnpm playwright test e2e/task-crud.spec.ts
```

- [ ] **Step 3: named browser QA를 기록한다**

agent-browser skill을 읽고 `TASK-CRUD-JOURNEY-VERIFY-01` session으로 `390x844`, `1280x720` 실제 create/edit/status/delete와 failed-status 경로를 실행한다. header 조화, mobile full-width button, modal focus/return, icon labels, status `aria-pressed`, virtual scroll/card link, network/console/page errors, screenshot과 session close를 기록한다.

- [ ] **Step 4: canonical full과 commit을 수행한다**

```bash
pnpm verify full
git diff --check
git add e2e/task-crud.spec.ts docs/quality/evidence/task-crud.md scripts/verify tests/test_verify_contract.py TODO.md
git commit -m "test(task): 할 일 CRUD 여정 근거 추가"
```

---

### Task 9: `TASK-CRUD-JOURNEY-REVIEW-01` adversarial review 후 사람 checkpoint를 요청한다

**Files:** all Task CRUD diff, `docs/quality/evidence/task-crud.md`, `TODO.md`

- [ ] **Step 1: plan-completion review를 수행한다**

fresh second-pass context로 extension/generated/runtime/MSW 일치, status 3-state, create status 미입력, owner isolation/cross-user 404, one-field PATCH, 비낙관 cache, failed status unchanged, unknown POST GET-before-retry, ordering 무가정, 기존 exact-ID 삭제, responsive/accessibility와 dependency/architecture diff를 검토한다.

- [ ] **Step 2: finding과 regression을 닫는다**

HIGH/MEDIUM finding은 owning task의 RED부터 다시 시작한다. 수정 후 focused→quick→task CRUD E2E/browser→full을 재실행하고 corrected exact target을 다시 review한다. 기존 `task-discovery`, `task-resolution`, `work-overview`, `user-crud` core regression도 full 결과에서 확인한다.

- [ ] **Step 3: review evidence를 commit한다**

```bash
git add docs/quality/evidence/task-crud.md TODO.md
git diff --cached --check
git commit -m "docs(task): 할 일 CRUD 독립 검토 근거 기록"
pnpm verify setup
git status --short
```

- [ ] **Step 4: 한 번의 사람 checkpoint를 요청한다**

`JOURNEY-TASK-CRUD-01`은 `[ ]`, `BLOCKED`로 유지하고 exact target, review verdict, focused/quick/E2E/browser/full evidence를 연결한다. 사람에게 `docs/quality/evidence/task-crud.md` 검토를 요청하며 AI는 `HUMAN_APPROVED`나 전체 프로젝트 최종 완료를 기록하지 않는다.
