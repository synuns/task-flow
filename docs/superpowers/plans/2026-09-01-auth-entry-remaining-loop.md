# Auth Entry Remaining Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 남은 `AUTH-*` task를 한 격리 worktree에서 순차 검증하고 `JOURNEY-AUTH-01`의 필수 사람 checkpoint 요청까지 준비한다.

**Architecture:** 기존 `SignInForm`, Radix 기반 shared `Dialog`, auth provider와 async-state primitive를 재사용한다. Error modal은 현재 동작을 characterization하고 누락된 회귀·browser evidence만 보강한다. Session UX는 application shell 바깥에 있는 auth boundary를 shell 안쪽으로 한 단계 옮겨 page content만 보류하고, 기존 `AsyncLoading`과 `AsyncError`로 visible state를 표현한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, React Hook Form 7.86.0, Radix UI 1.6.7, TanStack Query 5.102.8, MSW 2.15.0, Vitest 4.1.11, Testing Library 16.3.3, Playwright 1.62.1, agent-browser

## Global Constraints

- OpenAPI method, path, request/response schema와 status를 변경하지 않는다.
- `DEC-AUTH-01`의 memory access token, refresh cookie, generation, bounded replay, terminal transition과 return-route 의미를 변경하지 않는다.
- Work occurs in ignored project-local `.worktrees/auth-entry-loop` on branch `feat/auth-entry-loop`.
- 하나의 umbrella session이 작업을 이어가지만 동시에 소유하는 TODO block은 하나뿐이다.
- 순서는 `AUTH-ERROR-VIEW-01` → `AUTH-SESSION-UX-01` → `AUTH-JOURNEY-VERIFY-01` → `AUTH-JOURNEY-REVIEW-01` → `JOURNEY-AUTH-01` checkpoint 요청이다.
- 현재 task는 focused, quick, applicable browser 검증과 task adversarial check 뒤 `AI_VERIFIED`로 닫고 나서 다음 task를 소유한다.
- Passing characterization은 RED로 기록하지 않는다. Production 변경은 acceptance를 예상한 이유로 실패시키는 focused test를 먼저 실행한다.
- 기존 `SignInForm`, `Dialog`, `AsyncLoading`, `AsyncError`, `Skeleton`을 재사용하고 새 dependency, modal, auth abstraction과 E2E case를 추가하지 않는다.
- Browser QA는 task ID를 포함한 named `agent-browser` session, `390x844`와 `1280x720`, fresh snapshot, console/network/error, screenshot과 session close를 사용한다.
- Verification은 read-only다. `pnpm run format`이 필요하면 diff를 검토하고 `./scripts/verify quick`을 다시 실행한다.
- 하나의 fresh review가 plan-completion adversarial review와 `AUTH-JOURNEY-REVIEW-01`을 같은 plan path, requirement/Journey ID와 target SHA로 검토한다.
- AI는 `JOURNEY-AUTH-01`을 `HUMAN_APPROVED`로 기록하지 않는다. 사람에게 exact evidence를 제시하고 최종 확인을 명시적으로 요청한 뒤 응답을 기다린다.

---

## File Map

- Modify `TODO.md`: 네 남은 `AUTH-*` block을 한 번에 하나씩 소유하고 검증 evidence와 status를 기록한다. `JOURNEY-AUTH-01`은 사람이 확인하기 전 `BLOCKED`로 유지한다.
- Modify `src/features/sign-in/ui/sign-in-form.test.tsx`: error response body/count와 Escape/focus restore characterization을 추가한다.
- Read only unless a characterization fails `src/features/sign-in/ui/sign-in-form.tsx`: existing 400 dialog, Radix focus lifecycle와 submit guard.
- Modify `src/app/router.tsx`: `AuthShellRoute` 바깥의 auth boundary를 shell의 child route로 옮긴다.
- Modify `src/app/router.test.tsx`: bootstrap 중 shell 유지와 protected content 차단을 회귀 검증한다.
- Modify `src/app/auth/auth-route-boundary.tsx`: raw bootstrap/error markup을 existing async-state primitives로 교체한다.
- Modify `src/app/auth/auth-route-boundary.test.tsx`: Skeleton loading, styled recoverable alert와 retry를 검증한다.
- Modify `e2e/auth-entry.spec.ts`: existing credential-failure case에 focus trap, Escape, exact sign-in request/status assertion을 추가한다. 새 test case는 만들지 않는다.
- Modify `docs/quality/evidence/auth-entry.md`: current target의 focused, quick, Playwright, agent-browser와 review evidence로 갱신한다.
- Read only `src/app/auth/auth-provider.tsx`, `src/shared/api/authenticated-request.ts`: 승인된 auth state와 transport policy; finding이 없으면 변경하지 않는다.
- Read only `docs/superpowers/specs/2026-09-01-auth-entry-scenario-loop-design.md`: approved umbrella loop source.

---

### Task 1: 격리 작업 공간과 `AUTH-ERROR-VIEW-01` 소유권

**Requirement IDs:** `AUTH-06`

**Files:**
- Modify: `TODO.md:988`
- Read: `docs/quality/requirements.md`
- Read: `docs/superpowers/specs/2026-09-01-auth-entry-scenario-loop-design.md`

**Interfaces:**
- Consumes: completed `AUTH-VIEW-01`, `AUTH-API-01`; current main plan commit.
- Produces: clean `feat/auth-entry-loop` worktree and exactly one `IN_PROGRESS` block.

- [ ] **Step 1: Create the isolated worktree**

Run from the primary checkout using `superpowers:using-git-worktrees`:

```bash
git check-ignore -q .worktrees
git worktree add .worktrees/auth-entry-loop -b feat/auth-entry-loop
```

Expected: ignore check exits `0`; Git creates `.worktrees/auth-entry-loop` from the plan commit.

- [ ] **Step 2: Install the locked dependencies and inspect isolation**

Run inside `.worktrees/auth-entry-loop`:

```bash
pnpm install --frozen-lockfile
git status --short --branch
git rev-parse --git-dir
git rev-parse --git-common-dir
git rev-parse HEAD
```

Expected: install succeeds; branch is `feat/auth-entry-loop`; status is clean; git dir differs from common dir. Copy the returned 40-character HEAD into the task Evidence as the start commit.

- [ ] **Step 3: Run the auth focused baseline**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx src/app/auth/auth-route-boundary.test.tsx src/app/auth/auth-provider.test.tsx src/shared/api/authenticated-request.test.ts
```

Expected: current baseline passes 4 files and 26 tests. This is characterization, not RED.

- [ ] **Step 4: Claim only `AUTH-ERROR-VIEW-01`**

Change that TODO block to:

```markdown
- Status: IN_PROGRESS
- Evidence: 2026-09-01 Codex `/root` umbrella loop owner; branch
  `feat/auth-entry-loop`; start commit은 Step 2의 `git rev-parse HEAD` 40자 출력;
  target `AUTH-06`; error modal characterization 진행 중
```

Do not edit `AUTH-SESSION-UX-01` or later blocks.

- [ ] **Step 5: Verify ownership and commit the claim**

```bash
./scripts/verify setup
git add TODO.md
git commit -m "chore(auth): 로그인 오류 화면 작업 소유권 기록"
```

Expected: setup passes; commit contains only the `AUTH-ERROR-VIEW-01` block.

---

### Task 2: Error modal characterization, evidence와 종료

**Requirement IDs:** `AUTH-06`; scenario `AUTH-E2`

**Files:**
- Modify: `src/features/sign-in/ui/sign-in-form.test.tsx:76`
- Read only unless characterization fails: `src/features/sign-in/ui/sign-in-form.tsx:1`
- Modify: `TODO.md:988`

**Interfaces:**
- Consumes: `SignInForm({ onAuthenticated })`, existing shared `Dialog`, MSW server.
- Produces: exact failure body/count and Escape/focus restore regression evidence; `AUTH-ERROR-VIEW-01` `AI_VERIFIED`.

- [ ] **Step 1: Add exact failure request characterization**

Add after the existing server error dialog test:

```tsx
it("submits failed credentials once and displays the returned errorMessage", async () => {
  const user = userEvent.setup();
  const requests: unknown[] = [];
  server.use(
    http.post("/api/sign-in", async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json({ errorMessage: "로그인이 거부되었습니다." }, { status: 400 });
    }),
  );
  render(<SignInForm onAuthenticated={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "이메일" }), "user@example.com");
  await user.type(screen.getByLabelText("비밀번호"), "Password2");
  await user.click(screen.getByRole("button", { name: "로그인" }));

  expect(await screen.findByRole("dialog", { name: "로그인 실패" })).toHaveTextContent(
    "로그인이 거부되었습니다.",
  );
  expect(requests).toEqual([{ email: "user@example.com", password: "Password2" }]);
});
```

- [ ] **Step 2: Run the failure request characterization**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx -t "submits failed credentials once"
```

Expected: PASS against the existing typed sign-in request. Record it as characterization.

- [ ] **Step 3: Add Escape and focus restore characterization**

Add after the request characterization:

```tsx
it("closes the server error dialog with Escape and restores submit focus", async () => {
  const user = userEvent.setup();
  render(<SignInForm onAuthenticated={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "이메일" }), "wrong@example.com");
  await user.type(screen.getByLabelText("비밀번호"), "Password1");
  const submit = screen.getByRole("button", { name: "로그인" });
  await user.click(submit);

  expect(await screen.findByRole("dialog", { name: "로그인 실패" })).toBeInTheDocument();
  await user.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(submit).toHaveFocus();
});
```

- [ ] **Step 4: Run the Escape characterization and focused file**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx -t "closes the server error dialog with Escape"
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx
```

Expected: both pass. If a characterization unexpectedly fails, keep the assertion, classify the failure, and change only `sign-in-form.tsx` with the smallest Radix-supported correction before rerunning these commands.

- [ ] **Step 5: Run quick verification**

```bash
./scripts/verify quick
git diff --check
```

Expected: quick and whitespace checks pass with no unrelated diff.

- [ ] **Step 6: Verify mobile Dialog behavior with agent-browser**

Start the app in a separate terminal:

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

Then run:

```bash
agent-browser --session auth-error-view-01-mobile open http://127.0.0.1:4173/sign-in
agent-browser --session auth-error-view-01-mobile set viewport 390 844
agent-browser --session auth-error-view-01-mobile wait --load networkidle
agent-browser --session auth-error-view-01-mobile snapshot -i
agent-browser --session auth-error-view-01-mobile find label "이메일" fill "user@example.com"
agent-browser --session auth-error-view-01-mobile find label "비밀번호" fill "Password2"
agent-browser --session auth-error-view-01-mobile find role button click --name "로그인"
agent-browser --session auth-error-view-01-mobile snapshot -i
agent-browser --session auth-error-view-01-mobile eval 'document.activeElement?.textContent?.trim()'
agent-browser --session auth-error-view-01-mobile press Tab
agent-browser --session auth-error-view-01-mobile eval 'document.activeElement?.textContent?.trim()'
agent-browser --session auth-error-view-01-mobile press Shift+Tab
agent-browser --session auth-error-view-01-mobile press Escape
agent-browser --session auth-error-view-01-mobile snapshot -i
agent-browser --session auth-error-view-01-mobile eval 'document.activeElement?.textContent?.trim()'
agent-browser --session auth-error-view-01-mobile eval 'document.documentElement.scrollWidth'
agent-browser --session auth-error-view-01-mobile network requests --filter api
agent-browser --session auth-error-view-01-mobile console
agent-browser --session auth-error-view-01-mobile errors
agent-browser --session auth-error-view-01-mobile screenshot /tmp/kbhc-auth-error-view-01-mobile.png
agent-browser --session auth-error-view-01-mobile close
```

Expected: dialog announces `로그인 실패` and the returned message; `닫기` owns initial focus; Tab and Shift+Tab stay in the dialog; Escape closes it; submit regains focus; scroll width is at most 390; one sign-in POST returns 400; only the expected fresh refresh 401 and credential 400 appear.

- [ ] **Step 7: Verify desktop layout and explicit close**

```bash
agent-browser --session auth-error-view-01-desktop open http://127.0.0.1:4173/sign-in
agent-browser --session auth-error-view-01-desktop set viewport 1280 720
agent-browser --session auth-error-view-01-desktop wait --load networkidle
agent-browser --session auth-error-view-01-desktop find label "이메일" fill "user@example.com"
agent-browser --session auth-error-view-01-desktop find label "비밀번호" fill "Password2"
agent-browser --session auth-error-view-01-desktop find role button click --name "로그인"
agent-browser --session auth-error-view-01-desktop snapshot -i
agent-browser --session auth-error-view-01-desktop find role button click --name "닫기"
agent-browser --session auth-error-view-01-desktop snapshot -i
agent-browser --session auth-error-view-01-desktop network requests --filter api
agent-browser --session auth-error-view-01-desktop console
agent-browser --session auth-error-view-01-desktop errors
agent-browser --session auth-error-view-01-desktop screenshot /tmp/kbhc-auth-error-view-01-desktop.png
agent-browser --session auth-error-view-01-desktop close
```

Expected: dialog content/action are not clipped, explicit close restores submit focus, and network/console match the expected 401 bootstrap plus 400 credential failure.

- [ ] **Step 8: Run the task adversarial check and commit test evidence**

Review `AUTH-06`, `AUTH-E2`, the complete diff, request count/body, focus lifecycle, both screenshots, console/network and unrelated files. Correct any HIGH/MEDIUM finding and rerun affected commands.

```bash
git diff -- src/features/sign-in/ui/sign-in-form.test.tsx
git diff --check
git add src/features/sign-in/ui/sign-in-form.test.tsx
git commit -m "test(auth): 로그인 오류 modal 경계 보강"
```

Expected: commit contains only the two characterization tests.

- [ ] **Step 9: Close `AUTH-ERROR-VIEW-01` with reproducible evidence**

Set checkbox `[x]`, `Status: AI_VERIFIED`, and record the exact test counts, quick result, two named sessions, viewport/focus/network actuals, screenshots, failure/correction/rerun, test commit and task adversarial verdict. Then run:

```bash
./scripts/verify setup
git add TODO.md
git commit -m "docs(auth): 로그인 오류 화면 검증 근거 기록"
```

Expected: setup passes; only `AUTH-ERROR-VIEW-01` changes; `AUTH-SESSION-UX-01` is now dependency-resolved and remains `NOT_STARTED`.

---

### Task 3: `AUTH-SESSION-UX-01` shell/state RED–GREEN과 evidence

**Requirement IDs:** `AUTH-07`, `NAV-02`, `NAV-03`

**Files:**
- Modify: `TODO.md:1003`
- Modify: `src/app/router.test.tsx:59`
- Modify: `src/app/router.tsx:30`
- Modify: `src/app/auth/auth-route-boundary.test.tsx:69`
- Modify: `src/app/auth/auth-route-boundary.tsx:1`

**Interfaces:**
- Consumes: `AuthStatus`, `AuthShellRoute`, `AuthRouteBoundary`, `AsyncLoading`, `AsyncError`, `Skeleton`.
- Produces: shell-preserving auth state composition and `AUTH-SESSION-UX-01` `AI_VERIFIED`.

- [ ] **Step 1: Claim only `AUTH-SESSION-UX-01`**

Change that block to `Status: IN_PROGRESS` and record the current `git rev-parse HEAD`, branch, umbrella owner, requirements and that router/session characterization is in progress. Then run:

```bash
./scripts/verify setup
git add TODO.md
git commit -m "chore(auth): 인증 세션 화면 작업 소유권 기록"
```

Expected: setup passes; only the session UX block changes.

- [ ] **Step 2: Write the shell-preservation RED test**

Add to `src/app/router.test.tsx` before the render-failure test:

```tsx
it("keeps the application shell while bootstrap blocks protected content", () => {
  auth.controller = controller({ kind: "initializing" });
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/task"] });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientProvider client={apiClient}>
        <RouterProvider router={router} />
      </ApiClientProvider>
    </QueryClientProvider>,
  );

  expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("인증 상태를 확인하고 있습니다.");
  expect(screen.queryByRole("heading", { name: "할 일" })).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run the router test to verify RED**

```bash
pnpm vitest run src/app/router.test.tsx -t "keeps the application shell"
```

Expected: FAIL because `AuthRouteBoundary` currently replaces `AuthShellRoute`, so `주요 메뉴` is absent.

- [ ] **Step 4: Move the auth boundary inside the shell**

Replace only the `appRoutes` declaration in `src/app/router.tsx` with:

```tsx
export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AuthShellRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthRouteBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "sign-in", element: <SignInRoute /> },
          { path: "task", element: <TaskListPage /> },
          { path: "task/:id", element: <TaskDetailPage /> },
          { path: "user", element: <UserPage /> },
        ],
      },
    ],
  },
];
```

- [ ] **Step 5: Run the router GREEN and adjacent router tests**

```bash
pnpm vitest run src/app/router.test.tsx -t "keeps the application shell"
pnpm vitest run src/app/router.test.tsx src/app/auth/auth-route-boundary.test.tsx
```

Expected: the focused test and all adjacent router tests pass; protected page content remains absent while initializing.

- [ ] **Step 6: Write async-state presentation RED assertions**

In the existing initializing test in `src/app/auth/auth-route-boundary.test.tsx`, add:

```tsx
expect(
  screen.getByRole("status").querySelector('[data-slot="skeleton"]'),
).toBeInTheDocument();
```

In the unavailable test, replace its alert/click assertions with:

```tsx
const alert = screen.getByRole("alert");
expect(alert).toHaveAttribute("data-slot", "alert");
expect(alert).toHaveTextContent("인증 상태를 확인하지 못했습니다.");
expect(alert).toHaveTextContent("offline");
await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
expect(retryBootstrap).toHaveBeenCalledTimes(1);
expect(screen.queryByRole("heading", { name: "로그인" })).not.toBeInTheDocument();
```

- [ ] **Step 7: Run the boundary tests to verify RED**

```bash
pnpm vitest run src/app/auth/auth-route-boundary.test.tsx
```

Expected: FAIL because current initializing markup has no Skeleton and unavailable markup is not the shared Alert and uses `다시 확인`.

- [ ] **Step 8: Reuse the existing async-state primitives**

Add this import to `src/app/auth/auth-route-boundary.tsx`:

```tsx
import { AsyncError, AsyncLoading, Skeleton } from "@/shared/ui";
```

Replace only the initializing/unavailable branches with:

```tsx
if (auth.status.kind === "initializing") {
  return (
    <AsyncLoading
      className="mx-auto grid max-w-md gap-4"
      message="인증 상태를 확인하고 있습니다."
    >
      <Skeleton className="h-28 w-full" />
    </AsyncLoading>
  );
}
if (auth.status.kind === "unavailable") {
  return (
    <AsyncError
      className="mx-auto max-w-md"
      message={auth.status.message}
      onRetry={() => void auth.retryBootstrap()}
      title="인증 상태를 확인하지 못했습니다."
    />
  );
}
```

- [ ] **Step 9: Run GREEN, focused auth suite and quick**

```bash
pnpm vitest run src/app/auth/auth-route-boundary.test.tsx src/app/router.test.tsx
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx src/app/auth/auth-route-boundary.test.tsx src/app/auth/auth-provider.test.tsx src/shared/api/authenticated-request.test.ts
./scripts/verify quick
git diff --check
```

Expected: boundary/router, full focused auth and quick gates pass without warnings or unrelated changes.

- [ ] **Step 10: Verify recoverable bootstrap failure in mobile browser**

With the same dev server running:

```bash
agent-browser --session auth-session-ux-01-mobile open about:blank
agent-browser --session auth-session-ux-01-mobile set viewport 390 844
agent-browser --session auth-session-ux-01-mobile network route "**/api/refresh" --abort
agent-browser --session auth-session-ux-01-mobile open http://127.0.0.1:4173/task/task-1
agent-browser --session auth-session-ux-01-mobile snapshot -i
agent-browser --session auth-session-ux-01-mobile network requests --filter api
agent-browser --session auth-session-ux-01-mobile console
agent-browser --session auth-session-ux-01-mobile errors
agent-browser --session auth-session-ux-01-mobile screenshot /tmp/kbhc-auth-session-ux-01-mobile-error.png
agent-browser --session auth-session-ux-01-mobile network unroute "**/api/refresh"
agent-browser --session auth-session-ux-01-mobile find role button click --name "다시 불러오기"
agent-browser --session auth-session-ux-01-mobile wait --url "**/sign-in"
agent-browser --session auth-session-ux-01-mobile snapshot -i
agent-browser --session auth-session-ux-01-mobile close
```

Expected: shell navigation and styled recoverable alert coexist without protected detail; retry calls refresh once, receives the normal anonymous 401 after unroute, and redirects to `/sign-in`; no horizontal clipping or page error.

- [ ] **Step 11: Verify direct entry, return and refresh-cookie reload on desktop**

```bash
agent-browser --session auth-session-ux-01-desktop open http://127.0.0.1:4173/task/task-1
agent-browser --session auth-session-ux-01-desktop set viewport 1280 720
agent-browser --session auth-session-ux-01-desktop wait --url "**/sign-in"
agent-browser --session auth-session-ux-01-desktop snapshot -i
agent-browser --session auth-session-ux-01-desktop find label "이메일" fill "user@example.com"
agent-browser --session auth-session-ux-01-desktop find label "비밀번호" fill "Password1"
agent-browser --session auth-session-ux-01-desktop find role button click --name "로그인"
agent-browser --session auth-session-ux-01-desktop wait --url "**/task/task-1"
agent-browser --session auth-session-ux-01-desktop snapshot -i
agent-browser --session auth-session-ux-01-desktop reload
agent-browser --session auth-session-ux-01-desktop wait --url "**/task/task-1"
agent-browser --session auth-session-ux-01-desktop snapshot -i
agent-browser --session auth-session-ux-01-desktop network requests --filter api
agent-browser --session auth-session-ux-01-desktop console
agent-browser --session auth-session-ux-01-desktop errors
agent-browser --session auth-session-ux-01-desktop screenshot /tmp/kbhc-auth-session-ux-01-desktop.png
agent-browser --session auth-session-ux-01-desktop close
```

Expected: anonymous direct entry reaches sign-in, valid sign-in returns to the exact detail route, reload preserves the route through one cookie refresh, profile replaces sign-in in the stable auth navigation slot, and no unexpected page error occurs.

- [ ] **Step 12: Task adversarial check and implementation commit**

Review the router hierarchy, boundary state semantics, protected content leakage, retry count, approved return route, both viewport results, auth policy diff and unrelated files. Correct findings and rerun affected gates.

```bash
git diff -- src/app/router.tsx src/app/router.test.tsx src/app/auth/auth-route-boundary.tsx src/app/auth/auth-route-boundary.test.tsx
git diff --check
git add src/app/router.tsx src/app/router.test.tsx src/app/auth/auth-route-boundary.tsx src/app/auth/auth-route-boundary.test.tsx
git commit -m "feat(auth): 인증 상태에서도 application shell 유지"
```

Expected: one testable implementation commit; no provider, transport or API files change.

- [ ] **Step 13: Close `AUTH-SESSION-UX-01`**

Set checkbox `[x]`, `Status: AI_VERIFIED`, and record RED/GREEN, focused/quick counts, both named sessions, route/action/refresh actuals, screenshot paths, failure/correction/rerun, implementation SHA and task adversarial verdict.

```bash
./scripts/verify setup
git add TODO.md
git commit -m "docs(auth): 인증 세션 화면 검증 근거 기록"
```

Expected: setup passes; only session UX evidence changes; `AUTH-JOURNEY-VERIFY-01` becomes dependency-resolved.

---

### Task 4: `AUTH-JOURNEY-VERIFY-01` current-target 통합 검증

**Requirement IDs:** `NAV-02`, `AUTH-01`~`AUTH-07`; scenarios `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`

**Files:**
- Modify: `TODO.md:1020`
- Modify: `e2e/auth-entry.spec.ts:50`
- Modify: `docs/quality/evidence/auth-entry.md:1`

**Interfaces:**
- Consumes: completed error/session tasks; existing two `@core @auth` cases; focused auth suites.
- Produces: current-target Journey evidence and `AUTH-JOURNEY-VERIFY-01` `AI_VERIFIED`.

- [ ] **Step 1: Claim only `AUTH-JOURNEY-VERIFY-01`**

Set `Status: IN_PROGRESS` and record branch, current start SHA, umbrella owner, requirements and evidence consolidation in progress.

```bash
./scripts/verify setup
git add TODO.md
git commit -m "chore(auth): 인증 여정 통합 검증 소유권 기록"
```

Expected: setup passes; only the verify block changes.

- [ ] **Step 2: Extend the existing credential-failure E2E observation**

At the beginning of the existing credential-failure test, add:

```ts
const signInRequests: Array<{ method: string; body: unknown }> = [];
const signInStatuses: number[] = [];
page.on("request", (request) => {
  if (new URL(request.url()).pathname === "/api/sign-in") {
    signInRequests.push({ method: request.method(), body: request.postDataJSON() });
  }
});
page.on("response", (response) => {
  if (new URL(response.url()).pathname === "/api/sign-in") {
    signInStatuses.push(response.status());
  }
});
```

Replace the explicit close lines with:

```ts
const close = dialog.getByRole("button", { name: "닫기" });
await expect(close).toBeFocused();
await page.keyboard.press("Tab");
await expect(close).toBeFocused();
await page.keyboard.press("Shift+Tab");
await expect(close).toBeFocused();
await page.keyboard.press("Escape");
await expect(dialog).toHaveCount(0);
await expect(submit).toBeFocused();
expect(signInRequests).toEqual([
  {
    method: "POST",
    body: { email: "user@example.com", password: "Password2" },
  },
]);
expect(signInStatuses).toEqual([400]);
```

- [ ] **Step 3: Run the mapped E2E characterization**

```bash
pnpm exec playwright test e2e/auth-entry.spec.ts
```

Expected: both existing auth-entry cases pass; no new case is listed; credential failure proves focus trap, Escape, one exact POST and 400.

- [ ] **Step 4: Run the complete focused and quick gates**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx src/app/auth/auth-route-boundary.test.tsx src/app/auth/auth-provider.test.tsx src/shared/api/authenticated-request.test.ts
./scripts/verify quick
pnpm exec playwright test e2e/auth-entry.spec.ts
git diff --check
```

Expected: all focused tests, quick and both mapped Playwright cases pass fresh on the same target.

- [ ] **Step 5: Run current-target agent-browser Journey sweep**

Run the mobile journey from a fresh direct entry:

```bash
agent-browser --session auth-journey-verify-01-mobile open http://127.0.0.1:4173/task/task-1
agent-browser --session auth-journey-verify-01-mobile set viewport 390 844
agent-browser --session auth-journey-verify-01-mobile wait --url "**/sign-in"
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile find label "이메일" fill "invalid"
agent-browser --session auth-journey-verify-01-mobile find label "비밀번호" fill "Pass123"
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile find label "이메일" fill "user@example.com"
agent-browser --session auth-journey-verify-01-mobile find label "비밀번호" fill "Password2"
agent-browser --session auth-journey-verify-01-mobile find role button click --name "로그인"
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile press Tab
agent-browser --session auth-journey-verify-01-mobile press Shift+Tab
agent-browser --session auth-journey-verify-01-mobile press Escape
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile find label "비밀번호" fill "Password1"
agent-browser --session auth-journey-verify-01-mobile find role button click --name "로그인"
agent-browser --session auth-journey-verify-01-mobile wait --url "**/task/task-1"
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile reload
agent-browser --session auth-journey-verify-01-mobile wait --url "**/task/task-1"
agent-browser --session auth-journey-verify-01-mobile snapshot -i
agent-browser --session auth-journey-verify-01-mobile eval 'document.documentElement.scrollWidth'
agent-browser --session auth-journey-verify-01-mobile network requests --filter api
agent-browser --session auth-journey-verify-01-mobile console
agent-browser --session auth-journey-verify-01-mobile errors
agent-browser --session auth-journey-verify-01-mobile screenshot /tmp/kbhc-auth-journey-verify-01-mobile.png
agent-browser --session auth-journey-verify-01-mobile close
```

Expected: invalid email and 7-character password keep submit disabled with associated errors; 400 opens the accessible modal and Escape restores submit focus; valid retry returns to `/task/task-1`; reload uses refresh and keeps the detail route; mobile scroll width is at most 390.

Run the same contract independently at desktop size:

```bash
agent-browser --session auth-journey-verify-01-desktop open http://127.0.0.1:4173/task/task-1
agent-browser --session auth-journey-verify-01-desktop set viewport 1280 720
agent-browser --session auth-journey-verify-01-desktop wait --url "**/sign-in"
agent-browser --session auth-journey-verify-01-desktop snapshot -i
agent-browser --session auth-journey-verify-01-desktop find label "이메일" fill "user@example.com"
agent-browser --session auth-journey-verify-01-desktop find label "비밀번호" fill "Password2"
agent-browser --session auth-journey-verify-01-desktop find role button click --name "로그인"
agent-browser --session auth-journey-verify-01-desktop snapshot -i
agent-browser --session auth-journey-verify-01-desktop press Escape
agent-browser --session auth-journey-verify-01-desktop snapshot -i
agent-browser --session auth-journey-verify-01-desktop find label "비밀번호" fill "Password1"
agent-browser --session auth-journey-verify-01-desktop find role button click --name "로그인"
agent-browser --session auth-journey-verify-01-desktop wait --url "**/task/task-1"
agent-browser --session auth-journey-verify-01-desktop snapshot -i
agent-browser --session auth-journey-verify-01-desktop reload
agent-browser --session auth-journey-verify-01-desktop wait --url "**/task/task-1"
agent-browser --session auth-journey-verify-01-desktop snapshot -i
agent-browser --session auth-journey-verify-01-desktop network requests --filter api
agent-browser --session auth-journey-verify-01-desktop console
agent-browser --session auth-journey-verify-01-desktop errors
agent-browser --session auth-journey-verify-01-desktop screenshot /tmp/kbhc-auth-journey-verify-01-desktop.png
agent-browser --session auth-journey-verify-01-desktop close
```

Expected: desktop form/dialog hierarchy is unclipped; error close restores focus; exact return and refresh-cookie reload keep the route and replace sign-in with profile. Across both sessions `AUTH-P1-*`, `AUTH-P2-*` and `AUTH-E*` browser boundaries match the approved spec; expected refresh 401 and credential 400 are distinguished from unexpected errors.

- [ ] **Step 6: Update canonical auth-entry evidence**

Rewrite `docs/quality/evidence/auth-entry.md` with the current exact values for all required fields:

```text
Requirement/Journey
Commit
Route/Viewport
Precondition
Actions
Expected
Actual
Console/Network
Screenshot/Trace
Verdict
Human checkpoint record
Failure class
Correction
Rerun verdict
```

The record must trace each `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*` case to the lowest sufficient focused or current browser evidence and state that the human checkpoint is still unapproved.

- [ ] **Step 7: Run the verify-task adversarial check**

Review scenario coverage, exact request/status, bearer/refresh evidence, duplicate E2E, current screenshot/network paths, expected console errors, unrelated diff and TODO dependency/status. Correct findings and rerun affected gates.

```bash
git diff -- e2e/auth-entry.spec.ts docs/quality/evidence/auth-entry.md TODO.md
git diff --check
```

Expected: no unresolved HIGH/MEDIUM finding; evidence names current target artifacts and does not claim human approval.

- [ ] **Step 8: Commit E2E/evidence and close verify task**

First commit the E2E and canonical evidence:

```bash
git add e2e/auth-entry.spec.ts docs/quality/evidence/auth-entry.md
git commit -m "test(auth): 인증 여정 경계 검증 보강"
```

Then set `AUTH-JOURNEY-VERIFY-01` checkbox `[x]`, `Status: AI_VERIFIED`, and record exact focused/quick/Playwright/browser counts, artifacts, failure/correction/rerun and adversarial verdict:

```bash
./scripts/verify setup
git add TODO.md
git commit -m "docs(auth): 인증 여정 통합 검증 근거 기록"
```

Expected: setup passes; `AUTH-JOURNEY-REVIEW-01` becomes dependency-resolved.

---

### Task 5: Fresh review와 필수 사람 checkpoint 요청

**Requirement IDs:** `NAV-02`, `AUTH-01`~`AUTH-07`; Journey `auth-entry`

**Files:**
- Modify: `TODO.md:1039`
- Modify if findings affect evidence: `docs/quality/evidence/auth-entry.md:1`
- Modify only for proven findings: files changed in Tasks 2–4

**Interfaces:**
- Consumes: approved plan path, exact implementation/evidence target SHA and complete auth-entry gates.
- Produces: seven-field fresh review, `AUTH-JOURNEY-REVIEW-01` `AI_VERIFIED`, and a mandatory final human confirmation request while `JOURNEY-AUTH-01` remains unapproved.

- [ ] **Step 1: Claim `AUTH-JOURNEY-REVIEW-01`**

Set only that block to `IN_PROGRESS`; record branch, `git rev-parse HEAD`, umbrella owner, plan path, requirement/Journey IDs and review start.

```bash
./scripts/verify setup
git add TODO.md
git commit -m "chore(auth): 인증 여정 독립 review 소유권 기록"
```

Expected: setup passes and only the review block changes.

- [ ] **Step 2: Capture the exact review target**

```bash
git rev-parse HEAD
git merge-base main HEAD
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: target SHA is a 40-character commit; diff contains only the approved auth loop files and TODO/evidence records.

- [ ] **Step 3: Run one fresh adversarial review for both required review gates**

Use `superpowers:requesting-code-review`. The reviewer must not have authored the target and must inspect:

```text
Plan: docs/superpowers/plans/2026-09-01-auth-entry-remaining-loop.md
Spec: docs/superpowers/specs/2026-09-01-auth-entry-scenario-loop-design.md
Requirements: NAV-02, AUTH-01~AUTH-07
Journey cases: AUTH-P1-*, AUTH-P2-*, AUTH-E*
Target: Step 2 exact SHA against main merge-base
Checks: requirement/scenario omissions; auth storage/refresh/replay/return-route regression;
validation/Dialog/session negative paths; keyboard/focus/responsive accessibility;
weak or duplicate tests; console/network classification; evidence reproducibility;
unrelated diff; TODO ownership/dependency/status consistency
```

Expected: the same exact plan, IDs and target let this review satisfy plan-completion adversarial review and `AUTH-JOURNEY-REVIEW-01`.

- [ ] **Step 4: Correct findings and rerun proportionally**

For every HIGH/MEDIUM finding, return to the owning task, retain or add a focused failing test when behavior changes, apply the minimum correction, and rerun focused → quick → affected browser/Playwright case. Commit each correction with a Korean Conventional Commit message, update canonical evidence, capture a new target SHA, and repeat Step 3. LOW findings are either corrected or explicitly justified in the review record.

Expected: final review has no unresolved HIGH/MEDIUM finding.

- [ ] **Step 5: Run fresh final gates on the reviewed target**

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx src/app/auth/auth-route-boundary.test.tsx src/app/auth/auth-provider.test.tsx src/shared/api/authenticated-request.test.ts
./scripts/verify quick
pnpm exec playwright test e2e/auth-entry.spec.ts
git diff --check main...HEAD
git status --short --branch
```

Expected: all commands pass on the reviewed SHA and status contains no uncommitted product/test changes.

- [ ] **Step 6: Record the seven-field review and close only the review task**

Set `AUTH-JOURNEY-REVIEW-01` checkbox `[x]`, `Status: AI_VERIFIED`, and record:

```text
Review target: exact plan path, NAV-02/AUTH-01~AUTH-07/auth-entry, final target SHA and merge-base
Reviewer: fresh reviewer identity and independence
Checks: exact reviewed boundaries and evidence
Findings: severity and disposition; explicitly state no unresolved HIGH/MEDIUM
Corrections: commit(s) or none
Rerun: focused, quick, mapped E2E and applicable browser evidence
Verdict: PASS or the actual non-pass verdict
```

Do not change `JOURNEY-AUTH-01` from `BLOCKED`.

```bash
./scripts/verify setup
git add TODO.md docs/quality/evidence/auth-entry.md
git commit -m "docs(auth): 인증 여정 독립 review 근거 기록"
./scripts/verify setup
git status --short --branch
```

Expected: review task is `AI_VERIFIED`; checkpoint remains blocked pending a person; setup passes and worktree is clean.

- [ ] **Step 7: Present the mandatory final human checkpoint request**

Present the person with:

```text
Checkpoint: JOURNEY-AUTH-01
Exact target SHA: final reviewed commit
Requirements: NAV-02, AUTH-01~AUTH-07
Plan/spec: exact paths above
Automatic evidence: focused counts, quick result, mapped Playwright result
Browser evidence: both viewport sessions, screenshots, console/network actuals
Review: reviewer, target, findings/corrections/rerun, PASS verdict
Human state: not approved; AI did not set HUMAN_APPROVED
Request: 위 target과 evidence를 검토한 뒤 auth-entry Journey 승인 여부를 명시적으로 최종 확인해 주세요.
```

Expected: the loop waits for the person's explicit response. Do not start `work-overview`, do not mark `JOURNEY-AUTH-01`, and do not claim the Journey complete before that response.

---

## Self-Review Result

- Spec coverage: all remaining `AUTH-*` blocks, `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`, fresh review and mandatory final checkpoint request are mapped to Tasks 1–5.
- File scope: only existing auth form tests, router/boundary, existing auth E2E, TODO and canonical evidence change; no new abstraction, dependency or E2E case.
- Type consistency: `AuthStatus`, `AuthController.retryBootstrap()`, `AsyncLoading`, `AsyncError`, `Skeleton`, `SignInForm` and existing test APIs match current source signatures.
- TDD: the real shell-hiding and raw-state gaps have explicit RED expectations before production edits; existing Dialog behavior remains characterization-first.
- Review ordering: each TODO transition has a task adversarial check; the final fresh review uses one identical plan/ID/target record for plan completion and Journey review.
- Human boundary: `JOURNEY-AUTH-01` remains `BLOCKED`; the final confirmation request is explicit and mandatory; AI never records `HUMAN_APPROVED`.
