# Auth Route and Session Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Router가 허용하는 모든 등록 경로에 승인된 인증 정책을 동일하게 적용하고, sign-in과 명시적 session 종료가 이전 principal의 보호 cache를 남기지 않도록 한다.

**Architecture:** `app/auth/route-policy.ts`가 element 없는 route pattern과 pathname 분류를 소유하고 router, boundary, return-to가 이를 공유한다. AuthProvider는 sign-in에서 보호 cache를 비우고, user route action은 API 시작 generation과 응답 시점의 최신 snapshot을 비교해 refresh된 같은 session만 종료한다.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, TypeScript 5, Vitest 4, Testing Library, Playwright

## Global Constraints

- `assignment-original/openapi.yaml`과 `docs/api/crud-openapi.yaml`을 변경하지 않는다.
- Access token memory storage, refresh cookie, single-flight refresh, 최대 1회 replay를 유지한다.
- Terminal transport failure는 generation과 access token이 모두 일치하는 snapshot만 종료한다.
- Sign-out과 delete-user는 exact 200 성공 전 session, cache, route를 변경하지 않는다.
- 새로운 dependency, generic router wrapper, test-only production API를 추가하지 않는다.
- 구현은 현재 정책에 따라 이 세션에서 inline으로 수행하며 subagent를 사용하지 않는다.

---

## File Map

- Create `src/app/auth/route-policy.ts`: 등록 route path 상수와 React Router 기반 pathname 분류
- Create `src/app/auth/route-policy.test.ts`: trailing slash, encoded static segment, case variant 분류 계약
- Modify `src/app/auth/return-to.ts`: 자체 문자열 matcher를 제거하고 route policy 재사용
- Modify `src/app/auth/return-to.test.ts`: router가 허용하는 변형 경로와 auth/unknown 거부 검증
- Modify `src/app/auth/auth-route-boundary.tsx`: public auth 경로도 route policy로 판정
- Modify `src/app/auth/auth-route-boundary.test.tsx`: 익명 보호 경로와 인증 public 경로 변형 redirect
- Modify `src/app/router.tsx`: path 상수 재사용과 refresh-aware explicit termination
- Modify `src/app/router.test.tsx`: sign-out/delete-user 중 token rotation과 generation replacement
- Modify `src/app/auth/auth-provider.tsx`: sign-in 전 보호 query 취소·제거
- Modify `src/app/auth/auth-provider.test.tsx`: account switch cache isolation
- Modify `TODO.md`: Cycle 1 task ownership, 상태와 재현 가능한 evidence
- Modify `docs/quality/evidence/auth-entry.md`: route/cache correction evidence
- Modify `docs/quality/evidence/user-crud.md`: refresh-aware termination evidence

### Task 1: Cycle 1 작업 소유권과 baseline

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `REVIEW-CORRECTION-DESIGN-01`, 승인된 correction design
- Produces: `REVIEW-AUTH-ROUTE-01`, `REVIEW-AUTH-CACHE-01`, `REVIEW-AUTH-TERMINATE-01`, `REVIEW-AUTH-JOURNEY-01` task blocks

- [ ] **Step 1: 격리 worktree 생성과 setup**

```bash
git check-ignore -q .worktrees
git worktree add .worktrees/final-review-auth -b fix/final-review-auth
cd .worktrees/final-review-auth
pnpm install --frozen-lockfile
pnpm verify setup
```

Expected: worktree branch가 `fix/final-review-auth`이고 hook/verifier baseline이 PASS한다.

- [ ] **Step 2: TODO에 Cycle 1 task 네 개 등록**

```markdown
### [ ] REVIEW-AUTH-ROUTE-01 Router와 auth route 정책 일치
- Requirements: `NAV-02`, `NAV-03`, `AUTH-07`
- Risk: HIGH
- Depends on: `REVIEW-CORRECTION-DESIGN-01`
- Status: IN_PROGRESS

### [ ] REVIEW-AUTH-CACHE-01 Sign-in principal cache 격리
- Requirements: `AUTH-07`
- Risk: HIGH
- Depends on: `REVIEW-AUTH-ROUTE-01`
- Status: NOT_STARTED

### [ ] REVIEW-AUTH-TERMINATE-01 Refresh 중 명시적 session 종료
- Requirements: `USER-CRUD-06`, `USER-LOGOUT-04`, `USER-LOGOUT-05`
- Risk: HIGH
- Depends on: `REVIEW-AUTH-CACHE-01`
- Status: NOT_STARTED

### [ ] REVIEW-AUTH-JOURNEY-01 인증 correction 통합 검증과 적대적 검토
- Requirements: `NAV-02`, `NAV-03`, `AUTH-07`, `USER-CRUD-06`, `USER-LOGOUT-04`, `USER-LOGOUT-05`
- Risk: HIGH
- Depends on: `REVIEW-AUTH-TERMINATE-01`
- Status: NOT_STARTED
```

각 block에는 기존 TODO 형식의 Deliverable, Acceptance, Automatic verification,
Browser verification, 세션 소유 Evidence를 완전하게 기록한다.

- [ ] **Step 3: TODO 구조 검증과 커밋**

```bash
pnpm verify setup
git diff --check
git add TODO.md
git commit -m "docs(review): 인증 수정 작업 원장 추가"
```

Expected: setup PASS, 신규 task dependency가 모두 존재하고 현재 session만 첫 block을 소유한다.

### Task 2: Router와 auth route 정책 일치

**Files:**
- Create: `src/app/auth/route-policy.ts`
- Create: `src/app/auth/route-policy.test.ts`
- Modify: `src/app/auth/return-to.ts`
- Modify: `src/app/auth/return-to.test.ts`
- Modify: `src/app/auth/auth-route-boundary.tsx`
- Modify: `src/app/auth/auth-route-boundary.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Produces: `routePaths`, `isProtectedPath(pathname: string): boolean`, `isPublicAuthPath(pathname: string): boolean`
- Consumes: React Router `matchRoutes`; 기존 `safeReturnTo(candidate, origin)` 계약

- [ ] **Step 1: Route policy 실패 test 작성**

```ts
import { describe, expect, it } from "vitest";
import { isProtectedPath, isPublicAuthPath } from "./route-policy";

describe("auth route policy", () => {
  it.each(["/", "/task", "/task/", "/task/task-1/", "/user/", "/%74ask", "/USER"])(
    "matches a protected router pathname: %s",
    (pathname) => expect(isProtectedPath(pathname)).toBe(true),
  );

  it.each(["/sign-in", "/sign-in/", "/%73ign-in", "/SIGN-UP"])(
    "matches a public auth pathname: %s",
    (pathname) => expect(isPublicAuthPath(pathname)).toBe(true),
  );

  it.each(["/unknown", "/task/a/b", "/sign-in/task"])(
    "rejects an unregistered pathname: %s",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
      expect(isPublicAuthPath(pathname)).toBe(false);
    },
  );
});
```

`return-to.test.ts`에는 `/task/`, `/task/task-1/`, `/%74ask`, `/USER`를 allowed에,
`/sign-in/`, `/%73ign-in`, `/SIGN-UP`를 rejected에 추가한다.

`auth-route-boundary.test.tsx`에는 익명 `/user/`가 `/sign-in`으로 이동해 원래
`returnTo`를 보존하는 case와 인증 `/sign-in/`이 `/`로 이동하는 case를 추가한다.

- [ ] **Step 2: RED 확인**

```bash
pnpm exec vitest run src/app/auth/route-policy.test.ts src/app/auth/return-to.test.ts src/app/auth/auth-route-boundary.test.tsx
```

Expected: `route-policy` module 부재와 기존 exact pathname 판정 때문에 FAIL한다.

- [ ] **Step 3: 최소 route policy 구현**

```ts
import { matchRoutes, type RouteObject } from "react-router-dom";

export const routePaths = {
  dashboard: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  taskList: "/task",
  taskDetail: "/task/:id",
  user: "/user",
} as const;

const protectedRoutes: RouteObject[] = [
  { path: routePaths.dashboard },
  { path: routePaths.taskList },
  { path: routePaths.taskDetail },
  { path: routePaths.user },
];
const publicAuthRoutes: RouteObject[] = [
  { path: routePaths.signIn },
  { path: routePaths.signUp },
];

export const isProtectedPath = (pathname: string) =>
  matchRoutes(protectedRoutes, pathname) !== null;
export const isPublicAuthPath = (pathname: string) =>
  matchRoutes(publicAuthRoutes, pathname) !== null;
```

`return-to.ts`는 `isProtectedPath`를 import하고 public auth route를 별도로 비교하지
않는다. `AuthRouteBoundary`는 `isPublicAuthPath(location.pathname)`을 사용한다.
`router.tsx` route path는 `routePaths` 상수를 사용한다.

- [ ] **Step 4: GREEN과 회귀 확인**

```bash
pnpm exec vitest run src/app/auth/route-policy.test.ts src/app/auth/return-to.test.ts src/app/auth/auth-route-boundary.test.tsx src/app/router.test.tsx
```

Expected: 관련 auth/router test가 모두 PASS하고 unknown path는 허용되지 않는다.

- [ ] **Step 5: Quick 검증, evidence와 커밋**

```bash
pnpm verify quick
git diff --check
git add src/app/auth src/app/router.tsx src/app/router.test.tsx TODO.md
git commit -m "fix(auth): 라우터와 보호 경로 판정 일치"
```

Expected: quick PASS. Route pattern, malformed return-to, 기존 canonical route 회귀를
fresh second-pass로 검토하고 finding이 없을 때 `REVIEW-AUTH-ROUTE-01`을
`AI_VERIFIED`로 닫은 뒤 `REVIEW-AUTH-CACHE-01`을 `IN_PROGRESS`로 전환한다.

### Task 3: Sign-in principal cache 격리

**Files:**
- Modify: `src/app/auth/auth-provider.test.tsx`
- Modify: `src/app/auth/auth-provider.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: 기존 `removeProtectedQueries()`와 `acceptSignIn(tokens)`
- Produces: 모든 성공 sign-in 전에 보호 query root를 제거하는 동작

- [ ] **Step 1: 이전 principal cache 실패 test 작성**

```ts
it("removes protected cache before accepting a new sign-in", async () => {
  refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "missing" });
  const view = renderProvider();
  await screen.findByText("anonymous");
  seedProtectedQueries(view.queryClient);
  view.queryClient.setQueryData(["unrelated"], { keep: true });

  view.controller().acceptSignIn(tokens("user-2", 2));

  await screen.findByText("authenticated");
  expectProtectedQueriesRemoved(view.queryClient);
  expect(view.queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
});
```

- [ ] **Step 2: RED 확인**

```bash
pnpm exec vitest run src/app/auth/auth-provider.test.tsx -t "removes protected cache"
```

Expected: 보호 query data가 그대로 남아 assertion이 FAIL한다.

- [ ] **Step 3: 최소 구현**

```ts
const acceptSignIn = useCallback(
  (tokens: AuthTokenPair) => {
    removeProtectedQueries();
    commitAuthenticated(tokens, snapshotRef.current.generation + 1);
  },
  [commitAuthenticated, removeProtectedQueries],
);
```

- [ ] **Step 4: GREEN과 auth 회귀 확인**

```bash
pnpm exec vitest run src/app/auth/auth-provider.test.tsx src/app/auth/authenticated-api-bridge.test.tsx src/shared/api/authenticated-request.test.ts
```

Expected: 새 cache isolation test와 기존 refresh/stale-session test가 모두 PASS한다.

- [ ] **Step 5: Quick 검증과 커밋**

```bash
pnpm verify quick
git diff --check
git add src/app/auth/auth-provider.tsx src/app/auth/auth-provider.test.tsx TODO.md
git commit -m "fix(auth): 로그인 시 보호 캐시 격리"
```

### Task 4: Refresh 중 sign-out과 delete-user 종료

**Files:**
- Modify: `src/app/router.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `AuthController.getSnapshot()`, `AuthController.terminate(expected)`
- Produces: private `terminateStartedGeneration(auth, generation): void`

- [ ] **Step 1: Token rotation 실패 test 작성**

`router.test.tsx`의 test API client가 `/api/sign-out` 또는 `DELETE /api/user` 응답 전에
snapshot 변수를 `{ generation: 1, accessToken: "refreshed" }`로 교체하도록 한다.

```ts
expect(active.terminate).toHaveBeenCalledWith({
  generation: 1,
  accessToken: "refreshed",
});
```

같은 흐름에서 snapshot을 `{ generation: 2, accessToken: "new-session" }`으로 바꾸는
case는 `expect(active.terminate).not.toHaveBeenCalled()`을 검증한다. Sign-out과
delete-user 성공 흐름을 각각 한 case로 실행한다.

- [ ] **Step 2: RED 확인**

```bash
pnpm exec vitest run src/app/router.test.tsx -t "refresh|newer generation"
```

Expected: 현재 구현이 시작 snapshot의 `token`으로 terminate를 호출해 FAIL한다.

- [ ] **Step 3: 같은 generation의 최신 snapshot만 종료**

```ts
function terminateStartedGeneration(auth: AuthController, generation: number) {
  const current = auth.getSnapshot();
  if (current.generation === generation) auth.terminate(current);
}
```

Sign-out과 delete-user는 시작 snapshot 전체 대신 `snapshot.generation`을 보존하고
exact 200 성공 뒤 이 helper를 호출한다. API 실패 경로에는 호출하지 않는다.

- [ ] **Step 4: GREEN과 사용자 종료 회귀 확인**

```bash
pnpm exec vitest run src/app/router.test.tsx src/features/sign-out src/features/delete-user src/shared/api/sign-out.test.ts src/shared/api/user.test.ts
```

Expected: token rotation은 최신 snapshot을 종료하고, generation 교체와 API 실패는
현재 session을 보존한다.

- [ ] **Step 5: Quick 검증과 커밋**

```bash
pnpm verify quick
git diff --check
git add src/app/router.tsx src/app/router.test.tsx TODO.md
git commit -m "fix(auth): 갱신된 현재 세션 종료 보장"
```

### Task 5: Journey 검증과 Cycle 1 적대적 검토

**Files:**
- Modify: `docs/quality/evidence/auth-entry.md`
- Modify: `docs/quality/evidence/user-crud.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Tasks 2~4의 corrected target과 기존 auth-entry/user-crud fixtures
- Produces: Cycle 1 RED/GREEN/quick/E2E/full evidence와 fresh second-pass review record

- [ ] **Step 1: Focused와 mapped Journey 실행**

```bash
pnpm exec vitest run src/app/auth src/app/router.test.tsx src/shared/api/authenticated-request.test.ts src/shared/api/sign-out.test.ts src/shared/api/user.test.ts
pnpm verify quick
pnpm exec playwright test e2e/auth-entry.spec.ts e2e/user-crud.spec.ts
```

Expected: focused PASS, quick PASS, mapped Chromium 4/4 이상 PASS without retry.

- [ ] **Step 2: 적용 가능한 browser behavior 확인**

Production preview에서 anonymous `/user/`가 `/sign-in`으로 이동하고 authenticated
`/sign-in/`이 `/`로 이동하는지 확인한다. User CRUD 로그아웃 뒤 reload와 direct
`/user`가 계속 signed out인지 확인한다. Console의 deliberate MSW 400/401 외 page
error가 없어야 한다.

- [ ] **Step 3: Evidence 기록**

`auth-entry.md`에는 변형 pathname, returnTo, cache isolation의 test와 browser 결과를,
`user-crud.md`에는 refresh 중 sign-out/delete-user termination과 generation replacement
결과를 기록한다. TODO task별 Evidence에는 command, test count, commit SHA, 실패 분류와
재실행 결과를 남긴다.

- [ ] **Step 4: Plan-completion adversarial review**

Fresh second-pass로 다음을 다시 검사한다.

```text
OpenAPI/generated/lockfile 불변
router matcher와 auth classifier의 등록 경로 일치
외부·unknown returnTo 거부
sign-in cache 제거와 unrelated cache 보존
terminal 401 exact snapshot 규칙 불변
refresh 중 explicit termination과 newer generation 보존
mapped Journey 및 browser evidence 재현성
```

HIGH/MEDIUM finding이 있으면 해당 RED test부터 다시 수행한다. Finding이 없을 때만
Tasks 2~4를 `AI_VERIFIED`로 전환하고 Cycle 1 review task를 사람 checkpoint 대상으로
남긴다.

- [ ] **Step 5: Full verification**

```bash
pnpm verify full
git diff --check
git diff main...HEAD -- assignment-original src/generated pnpm-lock.yaml
git status --short
```

Expected: full PASS, authoritative/generated/lockfile diff 없음, 계획 밖 변경 없음.

- [ ] **Step 6: Evidence 커밋**

```bash
git add TODO.md docs/quality/evidence/auth-entry.md docs/quality/evidence/user-crud.md
git commit -m "docs(qa): 인증 수정 검증 근거 기록"
```

Cycle 1 결과를 사용자에게 제시하고 사람 checkpoint를 받은 뒤에만 다음 Task/API
cycle을 시작한다. AI는 `HUMAN_APPROVED`를 기록하지 않는다.
