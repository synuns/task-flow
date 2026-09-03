# User Logout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원정보 페이지에서 확인 modal을 거쳐 server와 client session을 함께 종료하는 로그아웃을 User CRUD Journey에 추가한다.

**Architecture:** 승인된 CRUD extension OpenAPI에 body 없는 bearer `POST /api/sign-out`을 추가한다. 기존 authenticated request와 auth generation/cache cleanup을 재사용하고, `/user`는 작은 `SignOutDialog` feature만 조합한다. 성공 응답 전에는 session과 cache를 바꾸지 않는다.

**Tech Stack:** React 19, TypeScript strict, React Router, TanStack Query, Radix AlertDialog, MSW, Vitest, Testing Library, Playwright, Biome, `openapi-typescript`.

## Global Constraints

- 원본 `assignment-original/openapi.yaml`, `src/generated/openapi.ts`, dependency와 lockfile은 변경하지 않는다.
- `POST /api/sign-out`은 bearer로 session을 식별하고 body와 `Content-Type`을 보내지 않는다.
- refresh cookie는 요청에 포함되지 않으며 server session 폐기 뒤 응답에서 `Path=/api/refresh`로 만료한다.
- 200 `{ success: true }` runtime 검증 뒤에만 현재 client session과 보호 Query를 정리한다.
- non-terminal 실패는 modal, page, session과 cache를 보존하고 자동 재시도하지 않는다.
- 새 core E2E를 만들지 않고 기존 `@user-crud` success case에 로그아웃을 삽입한다.
- 한 task씩 TODO owner/status/evidence를 갱신하고 Conventional Commit 한 개로 닫는다.
- 사람 checkpoint와 `HUMAN_APPROVED`는 AI가 기록하지 않는다.

---

## File Map

- `docs/api/crud-openapi.yaml`, `src/generated/crud-openapi.ts`: sign-out 확장 계약과 생성 타입
- `src/shared/api/auth.ts`: protected sign-out transport와 exact success guard
- `src/mocks/fixtures/auth.ts`, `src/mocks/handlers/auth.ts`: bearer session 폐기와 cookie 만료
- `src/features/sign-out/`: 확인 modal의 독립 UI 상태
- `src/pages/user/index.tsx`, `src/app/router.tsx`: profile 배치와 성공 후 auth/navigation 조합
- `e2e/user-crud.spec.ts`, `docs/quality/evidence/user-crud.md`: 기존 Journey의 cross-boundary 증거
- `docs/quality/requirements.md`, `docs/quality/verification.md`, `TODO.md`, `tests/test_verify_contract.py`: 요구사항과 실행 통제면

### Task 1: `USER-LOGOUT-CONTRACT-01` 확장 계약과 추적성을 등록한다

**Files:**
- Modify: `tests/test_verify_contract.py`
- Modify: `docs/api/crud-openapi.yaml`
- Regenerate: `src/generated/crud-openapi.ts`
- Modify: `src/shared/api/openapi-contract.test.ts`
- Modify: `docs/quality/requirements.md`
- Modify: `docs/quality/verification.md`
- Modify: `docs/superpowers/specs/2026-09-03-user-crud-loop-engineering-design.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: approved `USER-LOGOUT-01`~`USER-LOGOUT-05` design.
- Produces: `operations["signOut"]`, `components["schemas"]["SignOutResponse"]`, registered TODO dependency chain.

- [ ] **Step 1: requirement와 backlog contract RED를 작성한다**

`tests/test_verify_contract.py`의 repository wiring test에 다음 assertion을 추가한다.

```python
crud_contract = (ROOT / "docs/api/crud-openapi.yaml").read_text(encoding="utf-8")
requirements = (ROOT / "docs/quality/requirements.md").read_text(encoding="utf-8")
self.assertIn("/api/sign-out:", crud_contract)
self.assertIn("operationId: signOut", crud_contract)
for requirement_id in ("USER-LOGOUT-01", "USER-LOGOUT-02", "USER-LOGOUT-03", "USER-LOGOUT-04", "USER-LOGOUT-05"):
    self.assertIn(requirement_id, requirements)
```

같은 파일의 granular backlog `expected`에 다음 task를 추가하고 기존
`JOURNEY-USER-CRUD-01` dependency를 교체한다. `TODO.md`의 checkpoint dependency도
동일하게 `USER-LOGOUT-JOURNEY-REVIEW-01`로 교체한다.

```python
"USER-LOGOUT-CONTRACT-01": ({"USER-LOGOUT-PLAN-01"}, "IN_PROGRESS"),
"USER-LOGOUT-SESSION-01": ({"USER-LOGOUT-CONTRACT-01"}, "NOT_STARTED"),
"USER-LOGOUT-UI-01": ({"USER-LOGOUT-SESSION-01"}, "NOT_STARTED"),
"USER-LOGOUT-JOURNEY-VERIFY-01": ({"USER-LOGOUT-UI-01"}, "NOT_STARTED"),
"USER-LOGOUT-JOURNEY-REVIEW-01": ({"USER-LOGOUT-JOURNEY-VERIFY-01"}, "NOT_STARTED"),
"JOURNEY-USER-CRUD-01": ({"USER-LOGOUT-JOURNEY-REVIEW-01"}, "BLOCKED"),  # replace existing entry
```

completed-review verifier가 검사하는 tuple에도 `USER-LOGOUT-JOURNEY-REVIEW-01`을
추가한다.

- [ ] **Step 2: verifier RED를 확인한다**

Run: `python3 -m unittest tests.test_verify_contract.VerifyContractTests.test_repository_wires_approved_crud_contract tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog -v`

Expected: `/api/sign-out`와 `USER-LOGOUT-01` requirement가 없어 FAIL.

- [ ] **Step 3: OpenAPI와 generated type을 추가한다**

`docs/api/crud-openapi.yaml`에 다음 path와 schema를 추가한다.

```yaml
  /api/sign-out:
    post:
      summary: Sign out current session
      operationId: signOut
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Sign-out success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SignOutResponse'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

```yaml
    SignOutResponse:
      type: object
      additionalProperties: false
      required:
        - success
      properties:
        success:
          type: boolean
          enum:
            - true
```

Run: `pnpm api:types`

Expected: `src/generated/crud-openapi.ts`에 `signOut` operation과 literal `success: true` 생성.

- [ ] **Step 4: generated contract test와 quality map을 완성한다**

`src/shared/api/openapi-contract.test.ts`의 CRUD test에 다음 type assertion을 추가한다.

```ts
type SignOut200 =
  crudPaths["/api/sign-out"]["post"]["responses"][200]["content"]["application/json"];
expectTypeOf<SignOut200>().toEqualTypeOf<{ success: true }>();
```

`docs/quality/requirements.md`에 `USER-LOGOUT-01`~`05` acceptance, success case `USER-P1-7A`, failure case `USER-E7`을 추가한다. `docs/quality/verification.md`의 `user-crud` row에는 `/api/sign-out`과 `src/features/sign-out`을 추가한다. loop design의 종료 chain에는 로그아웃 contract/session/UI/verify/review task를 추가한다.

- [ ] **Step 5: contract GREEN과 quick을 확인한다**

Run: `python3 -m unittest tests.test_verify_contract.VerifyContractTests.test_repository_wires_approved_crud_contract tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog -v && pnpm api:types:check && pnpm exec vitest run src/shared/api/openapi-contract.test.ts && pnpm verify quick`

Expected: verifier 2/2, OpenAPI test와 quick PASS.

- [ ] **Step 6: evidence를 갱신하고 commit한다**

`TODO.md`에서 `USER-LOGOUT-CONTRACT-01`을 `AI_VERIFIED`로 닫고 실행 결과를 기록한다.

```bash
git add tests/test_verify_contract.py docs/api/crud-openapi.yaml src/generated/crud-openapi.ts src/shared/api/openapi-contract.test.ts docs/quality/requirements.md docs/quality/verification.md docs/superpowers/specs/2026-09-03-user-crud-loop-engineering-design.md TODO.md
git diff --cached --check
git commit -m "feat(auth): 로그아웃 확장 계약 추가"
```

### Task 2: `USER-LOGOUT-SESSION-01` server와 client sign-out 경계를 구현한다

**Files:**
- Modify: `src/shared/api/auth.test.ts`
- Modify: `src/shared/api/auth.ts`
- Modify: `src/shared/api/index.ts`
- Modify: `src/mocks/fixtures/auth.ts`
- Create: `src/mocks/handlers/auth.test.ts`
- Modify: `src/mocks/handlers/auth.ts`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: generated `SignOutResponse`, `ApiClient`, `bearerUserId`, existing auth fixture state.
- Produces: `signOut(client: ApiClient): Promise<SignOutResult>` and a handler that revokes the bearer user's current session.

- [ ] **Step 1: API와 handler RED를 작성한다**

`src/shared/api/auth.test.ts`에 exact request와 invalid response case를 추가한다.

```ts
it("posts sign-out without a body and accepts only literal success", async () => {
  const capture: { init?: RequestInit } = {};
  const client: ApiClient = {
    request: async (_input, init, guard) => {
      capture.init = init;
      const body: unknown = { success: true };
      if (!guard(body)) throw new Error("invalid fixture");
      return body;
    },
  };

  await expect(signOut(client)).resolves.toEqual({ success: true });
  expect(capture.init).toEqual({ method: "POST", credentials: "include" });
});
```

`src/mocks/handlers/auth.test.ts`를 기존 server lifecycle 방식으로 만들고
sign-in→sign-out→refresh sequence를 추가한다.

```ts
import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { authHandlers } from "./auth";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetAuthFixture();
  server.resetHandlers(...authHandlers);
});
afterAll(() => server.close());

it("revokes the bearer session and expires its refresh cookie", async () => {
  const pair = startAuthSession("user-1");
  const signedOut = await fetch(new URL("/api/sign-out", location.origin), {
    method: "POST",
    headers: { Authorization: `Bearer ${pair.accessToken}` },
  });
  const refreshed = await fetch(new URL("/api/refresh", location.origin), {
    method: "POST",
    headers: { Cookie: `token=${pair.refreshToken}` },
  });

  await expect(signedOut.json()).resolves.toEqual({ success: true });
  expect(signedOut.headers.get("set-cookie")).toContain("Path=/api/refresh");
  expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(refreshed.status).toBe(401);
});
```

- [ ] **Step 2: focused RED를 확인한다**

Run: `pnpm exec vitest run src/shared/api/auth.test.ts src/mocks/handlers/auth.test.ts`

Expected: `signOut` export와 `/api/sign-out` handler가 없어 FAIL.

- [ ] **Step 3: 최소 transport와 session revoke를 구현한다**

`src/shared/api/auth.ts`에 generated type 기반 함수를 추가하고 `src/shared/api/index.ts`에서 export한다.

```ts
import type { components as crudComponents } from "@/generated/crud-openapi";
import type { ApiClient } from "./api-client-context";

export type SignOutResult = crudComponents["schemas"]["SignOutResponse"];

function isSignOutResult(value: unknown): value is SignOutResult {
  return hasExactKeys(value, ["success"]) && value.success === true;
}

export function signOut(client: ApiClient): Promise<SignOutResult> {
  return client.request(
    apiUrl("/api/sign-out"),
    { method: "POST", credentials: "include" },
    isSignOutResult,
  );
}
```

`src/mocks/fixtures/auth.ts`의 기존 함수를 boolean 결과로 좁힌다.

```ts
export function revokeAuthSession(userId: string): boolean {
  if (state.currentAccessToken === null || tokenUserId(state.currentAccessToken) !== userId) {
    return false;
  }
  state.currentAccessToken = null;
  state.activeRefreshTokens = [];
  persistState();
  return true;
}
```

`src/mocks/handlers/auth.ts`에서 기존 helper를 재사용한다.

```ts
http.post("/api/sign-out", ({ request }) => {
  const userId = bearerUserId(request.headers.get("Authorization"));
  if (!userId || !revokeAuthSession(userId)) {
    return HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
  }
  return HttpResponse.json(
    { success: true as const },
    { headers: { "Set-Cookie": expiredRefreshCookie } },
  );
}),
```

- [ ] **Step 4: focused GREEN과 quick을 확인한다**

Run: `pnpm exec vitest run src/shared/api/auth.test.ts src/mocks/handlers/auth.test.ts src/mocks/handlers/user.test.ts src/app/auth/auth-provider.test.tsx && pnpm verify quick`

Expected: focused와 quick PASS; account deletion의 기존 revoke도 회귀 없음.

- [ ] **Step 5: evidence를 갱신하고 commit한다**

`TODO.md`에서 `USER-LOGOUT-SESSION-01`을 `AI_VERIFIED`로 닫는다.

```bash
git add src/shared/api/auth.ts src/shared/api/auth.test.ts src/shared/api/index.ts src/mocks/fixtures/auth.ts src/mocks/handlers/auth.ts src/mocks/handlers/auth.test.ts TODO.md
git diff --cached --check
git commit -m "feat(auth): 서버 로그아웃 경계 구현"
```

### Task 3: `USER-LOGOUT-UI-01` 확인 modal과 route 조합을 구현한다

**Files:**
- Create: `src/features/sign-out/index.ts`
- Create: `src/features/sign-out/ui/sign-out-dialog.tsx`
- Create: `src/features/sign-out/ui/sign-out-dialog.test.tsx`
- Modify: `src/pages/user/index.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/app/router.test.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `signOut(client)`, `auth.getSnapshot()`, `auth.terminate(snapshot)`.
- Produces: `SignOutDialog({ onSignOut }: { onSignOut(): Promise<void> })` and `/user` header action.

- [ ] **Step 1: modal behavior RED를 작성한다**

`src/features/sign-out/ui/sign-out-dialog.test.tsx`에 취소와 실패/pending case를 작성한다.

```tsx
it("focuses cancel and returns focus without a request", async () => {
  const user = userEvent.setup();
  const onSignOut = vi.fn();
  render(<SignOutDialog onSignOut={onSignOut} />);
  const trigger = screen.getByRole("button", { name: "로그아웃" });

  await user.click(trigger);
  expect(screen.getByRole("alertdialog", { name: "로그아웃하시겠어요?" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "취소" }));

  expect(onSignOut).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});

it("locks duplicate actions and preserves the dialog after failure", async () => {
  const user = userEvent.setup();
  let reject!: (reason: unknown) => void;
  const onSignOut = vi.fn(() => new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  }));
  render(<SignOutDialog onSignOut={onSignOut} />);

  await user.click(screen.getByRole("button", { name: "로그아웃" }));
  await user.click(screen.getByRole("button", { name: "로그아웃", exact: true }));
  expect(screen.getByRole("button", { name: "로그아웃 중" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  reject({ message: "로그아웃 요청을 처리하지 못했습니다." });

  expect(await screen.findByRole("alert")).toHaveTextContent("로그아웃 요청을 처리하지 못했습니다.");
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  expect(onSignOut).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: component RED를 확인한다**

Run: `pnpm exec vitest run src/features/sign-out/ui/sign-out-dialog.test.tsx`

Expected: module이 없어 FAIL.

- [ ] **Step 3: 최소 dialog를 구현한다**

`src/features/sign-out/ui/sign-out-dialog.tsx`는 기존 delete dialog 패턴과 shared AlertDialog를 재사용한다.

```tsx
export function SignOutDialog({ onSignOut }: { onSignOut(): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onSignOut();
    } catch (caught) {
      setError(caught && typeof caught === "object" && "message" in caught
        ? String(caught.message)
        : "로그아웃 요청을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button className="w-full sm:w-auto" type="button" variant="outline">
          <LogOut aria-hidden="true" />로그아웃
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        aria-busy={pending || undefined}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>로그아웃하시겠어요?</AlertDialogTitle>
          <AlertDialogDescription>현재 기기의 로그인 세션이 종료됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus disabled={pending}>취소</AlertDialogCancel>
          <Button disabled={pending} onClick={() => void confirm()}>
            {pending ? "로그아웃 중" : "로그아웃"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`src/features/sign-out/index.ts`는 `SignOutDialog`만 export한다.

- [ ] **Step 4: `/user` 배치와 성공 data flow를 조합한다**

`src/pages/user/index.tsx`의 props에 `onSignOut(): Promise<void>`를 추가하고 제목 block을 다음 구조로 바꾼다.

```tsx
<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h1 className="font-semibold text-3xl tracking-tight">회원정보</h1>
    <p className="mt-2 text-muted-foreground">내 계정 정보를 확인하세요.</p>
  </div>
  <SignOutDialog onSignOut={onSignOut} />
</div>
```

`src/app/router.tsx`의 `UserRoute`에 다음 callback을 추가한다.

```ts
async function signOutCurrentSession() {
  const snapshot = auth.getSnapshot();
  await signOut(client);
  auth.terminate(snapshot);
  navigate("/sign-in", { replace: true });
}
```

`UserPage`에는 `onSignOut={signOutCurrentSession}`를 전달한다.

- [ ] **Step 5: router integration test를 추가한다**

`src/app/router.test.tsx`의 API fixture가 `/api/sign-out`에서 `{ success: true }`를 반환하게 하고 다음 case를 추가한다.

```tsx
it("terminates the captured session only after sign-out succeeds", async () => {
  const user = userEvent.setup();
  const active = controller({ kind: "authenticated", generation: 1, accessToken: "token", userId: "user-1" });
  active.getSnapshot = vi.fn(() => ({ generation: 1, accessToken: "token" }));
  auth.controller = active;
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/user"] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiClientProvider>
    </QueryClientProvider>,
  );

  await user.click(await screen.findByRole("button", { name: "로그아웃" }));
  await user.click(screen.getByRole("button", { name: "로그아웃", exact: true }));

  expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
  expect(active.terminate).toHaveBeenCalledWith({ generation: 1, accessToken: "token" });
});
```

test import에 `userEvent`를 추가하고 현재 파일의 provider 조합을 그대로 사용한다.

- [ ] **Step 6: focused GREEN과 quick을 확인한다**

Run: `pnpm exec vitest run src/features/sign-out src/app/router.test.tsx src/app/auth/auth-provider.test.tsx && pnpm verify quick`

Expected: component/router/auth cache tests와 quick PASS.

- [ ] **Step 7: evidence를 갱신하고 commit한다**

`TODO.md`에서 `USER-LOGOUT-UI-01`을 `AI_VERIFIED`로 닫는다.

```bash
git add src/features/sign-out src/pages/user/index.tsx src/app/router.tsx src/app/router.test.tsx TODO.md
git diff --cached --check
git commit -m "feat(user): 로그아웃 확인 모달 추가"
```

### Task 4: `USER-LOGOUT-JOURNEY-VERIFY-01` User CRUD Journey를 다시 검증한다

**Files:**
- Modify: `e2e/user-crud.spec.ts`
- Modify: `docs/quality/evidence/user-crud.md`
- Modify: `docs/quality/requirements.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: complete sign-out contract, transport, modal and route composition.
- Produces: logout-inclusive `@user-crud` success evidence without increasing core case count.

- [ ] **Step 1: 기존 success E2E에 logout boundary를 추가한다**

이름 수정 성공 뒤 다음 흐름을 삽입한다.

```ts
await page.getByRole("button", { name: "로그아웃" }).click();
const signOutDialog = page.getByRole("alertdialog", { name: "로그아웃하시겠어요?" });
await expect(signOutDialog.getByRole("button", { name: "취소" })).toBeFocused();
await signOutDialog.getByRole("button", { name: "취소" }).click();
await expect(page.getByRole("button", { name: "로그아웃" })).toBeFocused();
await page.getByRole("button", { name: "로그아웃" }).click();
await signOutDialog.getByRole("button", { name: "로그아웃", exact: true }).click();
await expect(page).toHaveURL(/\/sign-in$/);
expect(signOutRequests).toEqual([{ method: "POST", body: null }]);
await page.reload();
await expect(page).toHaveURL(/\/sign-in$/);
await page.goto("/user");
await expect(page).toHaveURL(/\/sign-in$/);
```

그 뒤 동일 계정으로 다시 로그인해 기존 탈퇴 성공 단계를 계속 실행한다.

- [ ] **Step 2: mapped E2E를 실행한다**

Run: `pnpm exec playwright test e2e/user-crud.spec.ts`

Expected: Chromium 2/2 PASS without retry. 로그아웃 POST는 body가 없고 reload/direct access 모두 `/sign-in`이다.

- [ ] **Step 3: named browser QA를 실행한다**

Run server: `pnpm dev --host 127.0.0.1 --port 5173`

agent-browser session 이름은 `user-logout-journey-verify-01`로 한다. `390x844`와 `1280x720`에서 로그인→`/user`→modal cancel focus return→재오픈→pending lock→controlled failure alert/session preservation→success→reload/direct `/user` 차단을 확인한다. fresh snapshot, console, page error, MSW method/status, horizontal overflow와 screenshot을 기록하고 browser/server를 닫는다.

- [ ] **Step 4: 전체 gate를 실행한다**

Run: `pnpm verify full && git diff --check`

Expected: focused regression, build, core Chromium 7/7, verifier regression과 read-only check PASS.

- [ ] **Step 5: requirement/evidence를 닫고 commit한다**

`USER-LOGOUT-01`~`05`를 `AI_VERIFIED`로 바꾸고 `docs/quality/evidence/user-crud.md`에 exact request, cancel/pending/failure/success, reload, viewport, screenshot, console/network와 failure correction을 기록한다. `TODO.md`의 verify task를 닫는다.

```bash
git add e2e/user-crud.spec.ts docs/quality/evidence/user-crud.md docs/quality/requirements.md TODO.md
git diff --cached --check
git commit -m "test(user): 로그아웃 여정 근거 추가"
```

### Task 5: `USER-LOGOUT-JOURNEY-REVIEW-01` 새 target을 검토하고 사람 checkpoint를 요청한다

**Files:**
- Review: all diff from `24967ba` through implementation HEAD
- Modify: `docs/quality/evidence/user-crud.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: logout-inclusive automatic/browser evidence.
- Produces: seven-field exact-target review and one blocked human checkpoint.

- [ ] **Step 1: fresh second-pass review를 수행한다**

다음을 확인한다: 원본 OpenAPI/lockfile 무변경, bearer-only sign-out과 refresh cookie path 정합성, exact no-body request, session revoke, 200 전 cache/session 무변경, terminal 401 기존 정책, non-terminal failure 보존, modal focus/pending/close lock, responsive layout, E2E 무중복, 기존 탈퇴 흐름 회귀와 TODO dependency.

- [ ] **Step 2: finding을 처리하고 fresh gate를 실행한다**

HIGH/MEDIUM finding은 owning task를 reopen해 RED부터 수정한다. correction 뒤 다음을 실행한다.

```bash
pnpm exec vitest run src/shared/api/auth.test.ts src/mocks/handlers/auth.test.ts src/features/sign-out src/app/router.test.tsx src/app/auth/auth-provider.test.tsx
pnpm verify quick
pnpm exec playwright test e2e/user-crud.spec.ts
pnpm verify full
git diff --check
```

- [ ] **Step 3: seven-field review record를 남긴다**

`docs/quality/evidence/user-crud.md`와 `TODO.md`에 다음 필드를 실제 SHA/결과로 채운다.

```text
Review target: `docs/superpowers/plans/2026-09-03-user-logout.md`, `USER-LOGOUT-01`~`05`, 실행 시 계산한 merge-base와 target full SHA
Reviewer: 구현 author와의 관계를 명시한 fresh second-pass role ID
Checks: 실제 수행한 contract/auth/UI/E2E/browser/diff 검사
Findings: 발견한 항목의 severity/class/root cause 또는 검사상 발견 없음
Corrections: 적용한 exact 변경 또는 적용 없음
Rerun: 실제 실행한 명령, test count와 PASS 결과
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

- [ ] **Step 4: review evidence를 commit하고 setup을 확인한다**

```bash
git add docs/quality/evidence/user-crud.md TODO.md
git diff --cached --check
git commit -m "docs(user): 로그아웃 독립 검토 근거 기록"
pnpm verify setup
git status --short
```

- [ ] **Step 5: 사람 checkpoint를 한 번 요청한다**

`JOURNEY-USER-CRUD-01`은 `[ ]`, `BLOCKED`로 유지하고 새 exact target, PASS/PASS_WITH_LOW, focused/quick/E2E/browser/full evidence를 연결한다. 사람에게 갱신된 `docs/quality/evidence/user-crud.md` 검토를 요청하며 AI는 `HUMAN_APPROVED`를 기록하지 않는다.
