# MSW Test Account Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인만으로 긴 Task 목록, 빈 상태와 모든 보호 조회의 network-error 상태를 재현하는 세 MSW 테스트 계정을 제공한다.

**Architecture:** 기존 User·Task sessionStorage fixture를 유일한 상태 저장소로 유지한다. 고정 계정 ID는 작은 leaf module에서 공유하고, 오류 계정은 기존 GET handler 진입부에서 `HttpResponse.error()`를 반환해 OpenAPI에 없는 status나 body를 만들지 않는다.

**Tech Stack:** TypeScript, MSW 2.15, Zod 4.5, Vitest 4.1, Playwright 1.62, agent-browser

## Global Constraints

- `assignment-original/openapi.yaml`과 `docs/api/crud-openapi.yaml`은 수정하지 않는다.
- API path, schema, status, 인증·refresh·삭제 의미와 dependency를 변경하지 않는다.
- 모든 계정의 비밀번호는 `Password1`이다.
- `user@example.com`은 기존 `task-1`~`task-3`을 그대로 유지하고 총 30개 Task, 15 page, dashboard `30/20/10`을 제공한다.
- `empty@example.com`은 dashboard `0/0/0`과 terminal empty task page를 제공한다.
- `error@example.com`은 로그인·refresh만 정상이고 네 보호 GET handler는 response 없는 network error를 제공한다.
- URL/query/storage 오류 toggle, 별도 endpoint와 새 dependency를 추가하지 않는다.
- production behavior를 바꾸기 전 해당 acceptance의 실패 test를 먼저 실행한다.
- focused test 다음 `pnpm verify quick`, mapped E2E 다음 `pnpm verify full` 순서를 지킨다.

---

### Task 1: 작업 소유권 등록과 기본 계정의 긴 Task seed

**Files:**
- Modify: `TODO.md`
- Modify: `src/mocks/fixtures/tasks.test.ts`
- Modify: `src/mocks/fixtures/tasks.ts`
- Modify: `src/mocks/handlers/tasks.test.ts`
- Modify: `src/mocks/fixtures/users.test.ts`

**Interfaces:**
- Consumes: 기존 `resetTaskStore(): void`, `listTaskPage(ownerId: string, page: number): TaskListResponse`, `getDashboardMetrics(ownerId: string): DashboardResponse`
- Produces: `user-1` 소유의 고정 Task 30개와 다음 생성 ID `task-31`

- [ ] **Step 1: TODO에 현재 session 소유 작업을 등록한다**

`TODO.md` 끝에 다음 작업 block을 추가하고 다른 완료 block은 수정하지 않는다.

```markdown
## 12. MSW 테스트 계정 보완

### [ ] MSW-TEST-ACCOUNTS-01 기능 확인용 테스트 계정 fixture 보완

- Requirements: `SYS-04`, `DASH-01`, `USER-01`, `TASK-LIST-01`~`TASK-LIST-04`,
  `TASK-DETAIL-01`~`TASK-DETAIL-02`
- Risk: MEDIUM — 여러 보호 route가 공유하는 mock 초기 상태와 실패 profile 변경
- Depends on: `DOCS-README-01`
- Deliverable: 긴 목록·빈 상태·조회 오류를 재현하는 세 MSW 테스트 계정과 안내·검증 근거
- Acceptance: 기본 계정은 기존 핵심 Task를 보존한 30개 목록을 실제 scroll로 탐색하고,
  빈 계정은 dashboard 0/0/0과 빈 목록을, 오류 계정은 로그인 후 모든 보호 GET의
  network-error 복구 UI를 결정적으로 재현한다.
- Automatic verification: fixture/handler Vitest, `pnpm verify quick`, mapped E2E,
  `pnpm verify full`, `git diff --check`
- Browser verification: 세 계정으로 `/`, `/user`, `/task`, `/task/:id` 상태와
  scroll/retry/console/page error 확인
- Status: IN_PROGRESS
- Evidence: 2026-09-04 Codex `/root` task block owner; branch
  `feat/msw-test-accounts`; approved design
  `docs/superpowers/specs/2026-09-04-msw-test-account-fixtures-design.md`.
```

- [ ] **Step 2: 30개 seed 계약을 실패 test로 작성한다**

`src/mocks/fixtures/tasks.test.ts`에 다음 test를 추가한다.

```ts
it("seeds enough mixed-status tasks to exercise fifteen pages", async () => {
  const fixture = await import("./tasks");
  const pages = Array.from({ length: 15 }, (_, index) =>
    fixture.listTaskPage("user-1", index + 1),
  );
  const seededTasks = pages.flatMap((page) => page.data);

  expect(seededTasks).toHaveLength(30);
  expect(seededTasks[0]?.id).toBe("task-1");
  expect(seededTasks.at(-1)?.id).toBe("task-30");
  expect(pages.slice(0, -1).every((page) => page.hasNext)).toBe(true);
  expect(pages.at(-1)?.hasNext).toBe(false);
  expect(
    seededTasks.reduce<Record<string, number>>((counts, task) => {
      counts[task.status] = (counts[task.status] ?? 0) + 1;
      return counts;
    }, {}),
  ).toEqual({ TODO: 11, IN_PROGRESS: 9, DONE: 10 });
  expect(fixture.getDashboardMetrics("user-1")).toEqual({
    numOfTask: 30,
    numOfRestTask: 20,
    numOfDoneTask: 10,
  });
});
```

- [ ] **Step 3: RED를 확인한다**

Run:

```bash
pnpm vitest run src/mocks/fixtures/tasks.test.ts
```

Expected: 새 test가 현재 seed 길이 `3` 때문에 실패한다.

- [ ] **Step 4: 기존 세 Task 뒤에 deterministic seed 27개를 추가한다**

`src/mocks/fixtures/tasks.ts`에서 기존 세 Task를 `baseSeed`로 이름만 바꾸고 다음
값을 이어 붙인다. 기존 세 object 내용은 수정하지 않는다.

```ts
const generatedSeed = Array.from({ length: 27 }, (_, index): StoredTask => {
  const taskNumber = index + 4;
  const suffix = String(taskNumber).padStart(2, "0");
  const status: StoredTask["status"] =
    taskNumber % 3 === 1 ? "IN_PROGRESS" : taskNumber % 3 === 2 ? "DONE" : "TODO";
  return {
    id: `task-${taskNumber}`,
    ownerId: "user-1",
    title: `추가 할 일 ${suffix}`,
    memo: `무한 스크롤 확인 ${suffix}`,
    status,
    registerDatetime: new Date(Date.UTC(2026, 7, 31, 9, index)).toISOString(),
  };
});

const seed: StoredTask[] = [...baseSeed, ...generatedSeed];
```

- [ ] **Step 5: 새 seed로 달라진 실제 store/handler 기대값만 교정한다**

다음 값으로 갱신한다.

```text
삭제 전: 30 / 20 / 10
task-1 삭제 후: 29 / 19 / 10
생성 ID: task-31
생성 후 IN_PROGRESS: 31 / 21 / 10
seed User 삭제 시 removedTaskCount: 30
reset 뒤 ID: task-1 ... task-30
```

`src/mocks/handlers/tasks.test.ts`의 terminal-page test는 page `1`~`15`를 순서대로
호출해 모든 ID와 `hasNext`를 검사하도록 바꾼다.

```ts
const pages = await Promise.all(
  Array.from({ length: 15 }, (_, index) => apiRequest(`/api/task?page=${index + 1}`)),
);
expect(
  pages.flatMap(({ body }) => (body as { data: Array<{ id: string }> }).data.map(({ id }) => id)),
).toEqual(Array.from({ length: 30 }, (_, index) => `task-${index + 1}`));
expect(
  pages.map(({ body }) => (body as { hasNext: boolean }).hasNext),
).toEqual([...Array.from({ length: 14 }, () => true), false]);
```

- [ ] **Step 6: focused GREEN과 quick gate를 확인한다**

Run:

```bash
pnpm vitest run src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/fixtures/users.test.ts
pnpm verify quick
```

Expected: focused suite와 전체 quick gate가 모두 PASS한다.

- [ ] **Step 7: diff를 검토하고 커밋한다**

```bash
git diff --check
git diff -- TODO.md src/mocks/fixtures/tasks.ts src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/fixtures/users.test.ts
git add TODO.md src/mocks/fixtures/tasks.ts src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/mocks/fixtures/users.test.ts
git commit -m "feat(msw): 기본 테스트 계정 할 일 fixture 확장"
```

### Task 2: 빈 목록 테스트 계정

**Files:**
- Create: `src/mocks/fixtures/test-accounts.ts`
- Modify: `src/mocks/fixtures/users.test.ts`
- Modify: `src/mocks/fixtures/users.ts`
- Modify: `src/mocks/handlers/tasks.test.ts`
- Modify: `src/mocks/handlers/user.test.ts`

**Interfaces:**
- Consumes: 기존 `authenticateUser`, owner-aware Task 조회와 `startAuthSession(userId)`
- Produces: `testAccountIds: { primary: "user-1"; empty: "user-empty"; error: "user-error" }`와 세 seed User

- [ ] **Step 1: 특수 계정 identity와 빈 상태를 실패 test로 작성한다**

`src/mocks/fixtures/users.test.ts`에는 두 특수 계정의 인증 identity를, handler
test에는 빈 계정의 profile·dashboard·task page를 추가한다.

```ts
it("authenticates the fixed empty and error test accounts", () => {
  expect(authenticateUser("empty@example.com", "Password1")?.id).toBe("user-empty");
  expect(authenticateUser("error@example.com", "Password1")?.id).toBe("user-error");
});
```

```ts
it("returns zero dashboard metrics and a terminal empty page for the empty account", async () => {
  const token = startAuthSession("user-empty").accessToken;
  await expect(apiRequest("/api/dashboard", "GET", token)).resolves.toEqual({
    status: 200,
    body: { numOfTask: 0, numOfRestTask: 0, numOfDoneTask: 0 },
  });
  await expect(apiRequest("/api/task?page=1", "GET", token)).resolves.toEqual({
    status: 200,
    body: { data: [], hasNext: false },
  });
});
```

`src/mocks/handlers/user.test.ts`에서는 `user-empty` token의 GET body가
`empty@example.com`, `빈 목록 사용자`, `등록된 할 일이 없는 계정`인지 검사한다.

- [ ] **Step 2: RED를 확인한다**

```bash
pnpm vitest run src/mocks/fixtures/users.test.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
```

Expected: 두 email은 인증되지 않고 empty profile test가 401로 실패한다.

- [ ] **Step 3: 공유 ID와 User seed를 최소 구현한다**

`src/mocks/fixtures/test-accounts.ts`:

```ts
export const testAccountIds = {
  primary: "user-1",
  empty: "user-empty",
  error: "user-error",
} as const;
```

`src/mocks/fixtures/users.ts`의 seed는 기존 User를 보존하고 다음 두 User를 추가한다.

```ts
{
  id: testAccountIds.empty,
  email: "empty@example.com",
  password: "Password1",
  name: "빈 목록 사용자",
  memo: "등록된 할 일이 없는 계정",
},
{
  id: testAccountIds.error,
  email: "error@example.com",
  password: "Password1",
  name: "오류 재현 사용자",
  memo: "보호 조회 오류를 재현하는 계정",
},
```

`testAccountIds.primary`도 기존 seed User ID에 사용한다. sequence는 `1`로 유지해
새 회원가입 ID `user-2`와 named test IDs가 충돌하지 않게 한다.

- [ ] **Step 4: focused GREEN과 quick gate를 확인한다**

```bash
pnpm vitest run src/mocks/fixtures/users.test.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
pnpm verify quick
```

Expected: 특수 계정 인증, empty profile, dashboard와 목록이 PASS하고 기존 가입
sequence·소유권 test도 PASS한다.

- [ ] **Step 5: diff를 검토하고 커밋한다**

```bash
git diff --check
git diff -- src/mocks/fixtures/test-accounts.ts src/mocks/fixtures/users.ts src/mocks/fixtures/users.test.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
git add src/mocks/fixtures/test-accounts.ts src/mocks/fixtures/users.ts src/mocks/fixtures/users.test.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
git commit -m "feat(msw): 빈 상태 테스트 계정 추가"
```

### Task 3: 모든 보호 조회가 실패하는 오류 계정

**Files:**
- Modify: `src/mocks/handlers/tasks.test.ts`
- Modify: `src/mocks/handlers/tasks.ts`
- Modify: `src/mocks/handlers/user.test.ts`
- Modify: `src/mocks/handlers/user.ts`

**Interfaces:**
- Consumes: `testAccountIds.error`, `bearerUserId(header: string | null): string | null`, MSW `HttpResponse.error()`
- Produces: `user-error`의 dashboard/user/task-list/task-detail GET network failure

- [ ] **Step 1: 네 GET failure를 test-first로 고정한다**

`src/mocks/handlers/tasks.test.ts`:

```ts
it("returns network errors for every protected task read of the error account", async () => {
  const token = startAuthSession(testAccountIds.error).accessToken;

  await expect(apiRequest("/api/dashboard", "GET", token)).rejects.toThrow();
  await expect(apiRequest("/api/task?page=1", "GET", token)).rejects.toThrow();
  await expect(apiRequest("/api/task/task-1", "GET", token)).rejects.toThrow();
});
```

`src/mocks/handlers/user.test.ts`:

```ts
it("returns a network error for the error account profile read", async () => {
  const token = startAuthSession(testAccountIds.error).accessToken;

  await expect(
    apiRequest("/api/user", { headers: { Authorization: `Bearer ${token}` } }),
  ).rejects.toThrow();
});
```

- [ ] **Step 2: RED를 확인한다**

```bash
pnpm vitest run src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
```

Expected: task list/dashboard는 정상 empty 200, detail은 404, profile은 200을
반환해 네 rejection assertion이 실패한다.

- [ ] **Step 3: 기존 GET handler에 한 guard씩 추가한다**

두 handler module에서 `testAccountIds`를 import한다. 인증 실패 401 분기는 먼저
유지하고, 유효한 error 계정에만 다음 guard를 적용한다.

```ts
if (userId === testAccountIds.error) return HttpResponse.error();
```

적용 위치는 `GET /api/dashboard`, `GET /api/user`, `GET /api/task`,
`GET /api/task/:id` 네 곳뿐이다. POST/PATCH/DELETE handler는 수정하지 않는다.

- [ ] **Step 4: focused GREEN과 quick gate를 확인한다**

```bash
pnpm vitest run src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.test.ts
pnpm verify quick
```

Expected: 네 network failure와 기존 401/404/success/mutation test가 모두 PASS한다.

- [ ] **Step 5: diff를 검토하고 커밋한다**

```bash
git diff --check
git diff -- src/mocks/handlers/tasks.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.ts src/mocks/handlers/user.test.ts
git add src/mocks/handlers/tasks.ts src/mocks/handlers/tasks.test.ts src/mocks/handlers/user.ts src/mocks/handlers/user.test.ts
git commit -m "feat(msw): 조회 오류 테스트 계정 추가"
```

### Task 4: 브라우저 회귀와 테스트 계정 안내

**Files:**
- Modify: `e2e/work-overview.spec.ts`
- Modify: `e2e/task-discovery.spec.ts`
- Modify: `e2e/task-resolution.spec.ts`
- Modify: `e2e/task-crud.spec.ts`
- Create: `e2e/msw-test-accounts.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: 세 email/공통 password와 default metrics `30/20/10`, delete metrics `29/19/10`, created-DONE metrics `31/20/11`
- Produces: 긴 목록 scroll과 empty/error 계정의 실제 browser 회귀 test 및 사용자 안내

- [ ] **Step 1: 기존 core E2E의 고정 seed 기대값을 변경한다**

다음 수치만 새 seed에 맞춘다.

```text
work-overview: 30 / 20 / 10
task-resolution task-1 삭제 후: 29 / 19 / 10
task-crud 생성 Task를 DONE으로 바꾼 뒤: 31 / 20 / 11
task-crud failed status 보존: 30 / 20 / 10
```

- [ ] **Step 2: task-discovery가 실제 scroll로 15 page를 읽게 한다**

초기 render에서 `task-1`을 확인한 뒤 named region의 scroll을 반복하고, page
`1`~`15`가 각각 한 번 호출됐는지 검사한다. terminal에서는 `task-30` link를
선택한다.

```ts
const region = page.getByRole("region", { name: "할 일 목록" });
for (let pageNumber = 2; pageNumber <= 15; pageNumber += 1) {
  if (!taskRequests.some((request) => request.page === String(pageNumber))) {
    await region.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll"));
    });
  }
  await expect
    .poll(() => taskRequests.map((request) => request.page))
    .toContain(String(pageNumber));
}

await expect(page.getByText("모든 할 일을 불러왔습니다.")).toBeVisible();
expect(taskRequests.map((request) => request.page)).toEqual(
  Array.from({ length: 15 }, (_, index) => String(index + 1)),
);
await page.getByRole("link", { name: /추가 할 일 30/ }).click();
await expect(page).toHaveURL(/\/task\/task-30$/);
```

- [ ] **Step 3: 특수 계정 E2E를 test-first로 작성한다**

`e2e/msw-test-accounts.spec.ts`에 UI 로그인 helper와 두 독립 case를 작성한다.

```ts
import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByLabel("비밀번호").fill("Password1");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("empty account exposes zero dashboard and terminal empty task list", async ({ page }) => {
  await signIn(page, "empty@example.com");
  await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText(
    "0",
  );
  await page.getByRole("link", { name: "할 일", exact: true }).click();
  await expect(page.getByText("등록된 할 일이 없습니다.")).toBeVisible();
});

test("error account exposes retry UI for every protected read", async ({ page }) => {
  await signIn(page, "error@example.com");
  await expect(page.getByRole("alert")).toBeVisible();

  for (const route of ["/user", "/task", "/task/task-1"]) {
    await page.goto(route);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
  }
});
```

- [ ] **Step 4: mapped E2E RED/GREEN을 확인한다**

먼저 새 E2E를 production 변경 전 실행했을 때 특수 account sign-in이 실패하는 RED를
기록한다. Task 1~3 구현 뒤 다음 전체 mapped command를 실행한다.

```bash
pnpm exec playwright test e2e/work-overview.spec.ts e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts e2e/task-crud.spec.ts e2e/msw-test-accounts.spec.ts
```

Expected: 기존 네 Journey와 새 account suite가 retry 없이 PASS한다.

- [ ] **Step 5: README Test Account 표를 용도 중심으로 갱신한다**

```markdown
| 용도 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 전체 기능·무한 스크롤 | `user@example.com` | `Password1` |
| 빈 dashboard·할 일 목록 | `empty@example.com` | `Password1` |
| 보호 조회 오류·재시도 UI | `error@example.com` | `Password1` |
```

기존 sessionStorage 초기화 안내는 그대로 둔다.

- [ ] **Step 6: quick과 diff를 확인하고 커밋한다**

```bash
pnpm verify quick
git diff --check
git diff -- e2e README.md
git add e2e/work-overview.spec.ts e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts e2e/task-crud.spec.ts e2e/msw-test-accounts.spec.ts README.md
git commit -m "test(msw): 테스트 계정 브라우저 검증 추가"
```

### Task 5: 실제 browser evidence, full gate와 계획 완료 review

**Files:**
- Create: `docs/quality/evidence/msw-test-accounts.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Task 1~4의 exact commit과 세 테스트 계정
- Produces: 재현 가능한 automatic/browser/review evidence와 `MSW-TEST-ACCOUNTS-01` `AI_VERIFIED` 상태

- [ ] **Step 1: agent-browser 지침을 읽고 production preview를 시작한다**

`agent-browser` skill의 `SKILL.md`를 읽은 뒤 task ID가 포함된 named session을
사용한다. 별도 terminal에서 다음 server를 유지한다.

```bash
pnpm build && pnpm preview --host 127.0.0.1 --port 4173
```

- [ ] **Step 2: 기본 계정의 실제 infinite scroll을 확인한다**

`user@example.com`으로 로그인하고 `/task`를 1280x720과 390x844에서 연다.
초기 request page보다 큰 page가 실제 wheel/End scroll 뒤 요청되고 `task-30`, terminal
message, bounded mounted row, 정확한 document width가 보이는지 확인한다.

- [ ] **Step 3: 빈 계정과 오류 계정의 route 상태를 확인한다**

fresh session에서 `empty@example.com`의 `/` `0/0/0`, `/task` empty message를
확인한다. 다른 fresh session에서 `error@example.com`의 `/`, `/user`, `/task`,
`/task/task-1` alert와 retry action을 확인한다. 각 session에서 console, page errors,
API request와 screenshot을 기록하고 session/server를 종료한다.

- [ ] **Step 4: evidence 문서를 작성한다**

`docs/quality/evidence/msw-test-accounts.md`에 requirement IDs, exact commit, route와
viewport, precondition, actions, expected/actual, console/network, screenshot/trace,
failure class, correction, rerun verdict를 기록한다. credential 값은 README에 이미
공개된 고정 fixture만 기록하고 access/refresh token은 기록하지 않는다.

- [ ] **Step 5: canonical full gate와 immutability를 확인한다**

```bash
pnpm verify full
git diff --exit-code -- assignment-original docs/api/crud-openapi.yaml src/generated pnpm-lock.yaml package.json
git diff --check
git status --short
```

Expected: full gate가 read-only PASS하고 authoritative contract, generated code,
dependency와 lockfile diff가 없다.

- [ ] **Step 6: plan-completion adversarial review를 수행한다**

fresh reviewer context를 사용할 수 있으면 구현 author와 분리하고, 사용할 수 없으면
구현을 끝낸 뒤 explicit second-pass role로 전환한다. 승인 spec/plan, account identity,
30-task distribution, page termination, owner isolation, GET-only error scope,
OpenAPI/auth/delete 보존, weak tests, E2E scroll, browser diagnostics, README, secret와
unrelated diff를 검토한다. 모든 HIGH/MEDIUM finding을 수정하고 영향 gate를 다시
실행한다.

- [ ] **Step 7: TODO evidence와 상태를 갱신하고 커밋한다**

`MSW-TEST-ACCOUNTS-01` Evidence에 RED/GREEN, focused/quick/mapped/full 결과,
browser session과 review의 일곱 필드(`Review target`, `Reviewer`, `Checks`,
`Findings`, `Corrections`, `Rerun`, `Verdict`)를 실제 값으로 기록한다. 모든 acceptance가
충족된 뒤 checkbox를 `[x]`, Status를 `AI_VERIFIED`로 바꾼다.

```bash
git add TODO.md docs/quality/evidence/msw-test-accounts.md
git commit -m "docs(qa): MSW 테스트 계정 검증 근거 기록"
git status --short --branch
```

Expected: worktree가 clean이고 AI가 새 `HUMAN_APPROVED`나 최종 acceptance를
주장하지 않는다.
