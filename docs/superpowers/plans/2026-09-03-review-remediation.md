# Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전체 코드 리뷰에서 확인한 task ID 인증 계약, 긴 문자열 overflow, mock 저장 검증, bootstrap 실패, read-only 검증과 상태 문서 문제를 기존 구조 안에서 수정한다.

**Architecture:** URL allowlist는 raw pathname의 단일 segment 형태를 판정하고 실제 task 값은 기존 API 경계에서 인코딩한다. UI는 값이나 계약을 바꾸지 않고 표시 계층의 CSS만 보강하며, mock sessionStorage와 MSW bootstrap은 각각 명시적인 신뢰·오류 경계에서 실패를 격리한다. 검증 fixture는 저장소 밖에서 실행하고 확실한 dead code만 함께 제거한다.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, TanStack Query 5, Zod 4, MSW 2, Vitest 4, Testing Library, Playwright, Biome 2, agent-browser

## Global Constraints

- `assignment-original/openapi.yaml`이 API 상세의 최종 권위다.
- `task/A`는 `/task/task%2FA` 한 segment로 지원하고 로그인 후 같은 URL로 복귀한다.
- 외부 URL, 미등록 route와 둘 이상의 raw task ID segment는 복귀 경로로 허용하지 않는다.
- task 문자열을 잘라내거나 OpenAPI에 없는 길이 제한을 추가하지 않는다.
- 새 dependency, 공통 abstraction, bundle splitting과 AI 기록 체계 변경은 추가하지 않는다.
- 제품 코드는 반드시 해당 실패를 재현하는 RED 테스트 뒤에 수정한다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.
- 현재 실행은 상위 coordination 정책에 따라 하위 agent 없이 이 세션에서 순차 수행한다.

---

### Task 1: 후속 작업 원장과 소유권 등록

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: 완료된 `QA-04`, 승인된 `docs/superpowers/specs/2026-09-03-review-remediation-design.md`
- Produces: `REM-AUTH-ID-01`, `REM-RESPONSIVE-01`, `REM-MOCK-CONTRACT-01`, `REM-BOOTSTRAP-01`, `REM-VERIFY-01`, `REM-FINAL-01` task block

- [ ] **Step 1: Stage 7에 세부 task block을 추가한다**

다음 block을 Stage 7 끝에 추가한다.

```md
### [ ] REM-AUTH-ID-01 인코딩된 task ID 인증 경로 교정

- Requirements: `AUTH-07`, `NAV-03`, `TASK-LIST-05`, `TASK-DETAIL-01`
- Risk: HIGH — 보호 route와 로그인 복귀 경로의 task ID 허용 범위
- Depends on: `QA-04`
- Deliverable: encoded slash ID의 보호 경로 판정, 안전한 복귀와 회귀 test
- Acceptance: `task/A`가 `/task/task%2FA`로 상세 조회되고 anonymous 진입은 로그인
  뒤 같은 URL로 복귀하며 외부 URL과 raw 다중 segment는 계속 거부된다.
- Automatic verification: return-to/auth boundary/router Vitest, auth-entry Playwright,
  `./scripts/verify quick`
- Browser verification: anonymous encoded route, 로그인 복귀, reload와 상세 표시
- Status: IN_PROGRESS
- Evidence: 2026-09-03 Codex `/root` task block owner; 사용자가 encoded slash ID 지원과
  `docs/superpowers/specs/2026-09-03-review-remediation-design.md`를 명시 승인;
  isolated worktree `fix/review-remediation`; baseline `./scripts/verify quick` PASS

### [ ] REM-RESPONSIVE-01 긴 task 문자열 반응형 표시

- Requirements: `TASK-DETAIL-01`, `TASK-DETAIL-03`, `TASK-DETAIL-04`
- Risk: MEDIUM — OpenAPI상 길이 제한 없는 문자열의 모바일 표시
- Depends on: `REM-AUTH-ID-01`
- Deliverable: title, memo와 삭제 확인 ID의 container 내 줄바꿈과 회귀 test
- Acceptance: 390x844에서 500자 공백 없는 값을 표시해도 document와 dialog overflow가
  없고 원본 값과 exact delete guard가 보존된다.
- Automatic verification: task detail/delete dialog Vitest, `./scripts/verify quick`
- Browser verification: 390x844 detail와 delete dialog bounding rect
- Status: NOT_STARTED
- Evidence: 구현 전

### [ ] REM-MOCK-CONTRACT-01 저장된 mock task 계약 검증

- Requirements: `SYS-04`, `TASK-LIST-01`, `TASK-DETAIL-01`
- Risk: MEDIUM — 제출 API 대체 구현의 OAS 응답 정합성
- Depends on: `REM-RESPONSIVE-01`
- Deliverable: exact key, status와 RFC 3339를 검증하는 sessionStorage 복원 경계
- Acceptance: 추가 key, 잘못된 status/date-time 또는 malformed JSON은 응답에 섞이지
  않고 기본 fixture로 복구되며 유효 저장 값과 삭제 persistence는 유지된다.
- Automatic verification: fixture/handler/task API Vitest, `./scripts/verify quick`
- Browser verification: 적용 없음 — 저장 경계 integration test가 위험을 직접 증명
- Status: NOT_STARTED
- Evidence: 구현 전

### [ ] REM-BOOTSTRAP-01 mock 시작 실패 복구

- Requirements: `SYS-04`
- Risk: LOW — worker 시작 실패 시 blank root를 복구 UI로 교체
- Depends on: `REM-MOCK-CONTRACT-01`
- Deliverable: 성공 application mount와 실패/reload 경계를 가진 bootstrap
- Acceptance: worker 성공 전 application을 렌더링하지 않고 rejection은 한국어 alert와
  다시 시도 button을 표시하며 click은 reload를 한 번 요청한다.
- Automatic verification: bootstrap/architecture Vitest, `./scripts/verify quick`
- Browser verification: production preview 정상 bootstrap과 console/page error
- Status: NOT_STARTED
- Evidence: 구현 전

### [ ] REM-VERIFY-01 read-only 구조 검사와 국소 dead code 정리

- Requirements: 전체 architecture와 verification contract
- Risk: LOW — 제품 동작을 바꾸지 않는 test fixture 위치와 미사용 표면 정리
- Depends on: `REM-BOOTSTRAP-01`
- Deliverable: repository 밖 Biome fixture, 최소 AttemptGuard API와 dialog trigger
- Acceptance: architecture test 전후 repository status가 같고 allowed/blocked import
  판정과 delete attempt의 중복·stale 방지가 그대로 통과한다.
- Automatic verification: architecture/attempt/dialog Vitest, diff/status check,
  `./scripts/verify quick`
- Browser verification: task-resolution dialog focus와 delete Journey 회귀
- Status: NOT_STARTED
- Evidence: 구현 전

### [ ] REM-FINAL-01 코드 리뷰 후속 수정 최종 검증

- Requirements: 위 후속 수정의 전체 requirement와 Golden Journey
- Risk: HIGH — 계획 완료 review와 사람 checkpoint 뒤 최종 상태 전이
- Depends on: `REM-AUTH-ID-01`, `REM-RESPONSIVE-01`, `REM-MOCK-CONTRACT-01`,
  `REM-BOOTSTRAP-01`, `REM-VERIFY-01`
- Deliverable: plan-completion adversarial review, browser evidence, canonical full QA
- Acceptance: unresolved HIGH/MEDIUM finding이 없고 quick, mapped Journey, browser probe와
  `./scripts/verify full`이 통과하며 사람 checkpoint 결과를 과대 표시하지 않는다.
- Automatic verification: focused test, `./scripts/verify quick`, `./scripts/verify full`,
  `git diff --check`
- Browser verification: encoded auth return과 390x844 long-string detail/dialog
- Status: NOT_STARTED
- Evidence: 구현 전
```

- [ ] **Step 2: 원장 계약을 검증한다**

Run: `./scripts/verify setup`

Expected: hook 85개와 verifier contract 19개가 PASS하고 unfinished dependency 오류가 없다.

- [ ] **Step 3: 작업 시작 기록을 커밋한다**

```bash
git add TODO.md
git commit -m "docs(todo): 코드 리뷰 후속 수정 작업 등록"
```

### Task 2: Encoded task ID 보호 경로와 로그인 복귀

**Files:**
- Modify: `src/app/auth/return-to.test.ts`
- Modify: `src/app/auth/auth-route-boundary.test.tsx`
- Modify: `src/app/auth/return-to.ts`
- Modify: `e2e/auth-entry.spec.ts`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: raw `location.pathname`, same-origin return candidate
- Produces: `isProtectedPath(pathname: string): boolean`, `safeReturnTo(candidate: unknown, origin: string): string`의 encoded-slash 계약

- [ ] **Step 1: encoded slash와 raw 다중 segment를 구분하는 RED 테스트를 작성한다**

`return-to.test.ts`의 허용 목록에 `/task/task%2FA`와 query/hash 조합을 추가한다. 기존 거부 목록의 `/task/a%2Fb`를 `/task/a/b`와 `/task/%`로 바꾼다.

`auth-route-boundary.test.tsx`에는 anonymous `/task/task%2FA?tab=memo#content`가 `/sign-in`으로 이동하면서 동일한 `returnTo`를 보존하는 case와 authenticated `/sign-in`이 encoded URL로 복귀하는 case를 추가한다.

- [ ] **Step 2: focused 테스트가 예상 원인으로 실패하는지 확인한다**

Run:

```bash
pnpm vitest run src/app/auth/return-to.test.ts src/app/auth/auth-route-boundary.test.tsx
```

Expected: `/task/task%2FA`가 현재 `/`로 대체되거나 보호 경로로 인식되지 않아 FAIL한다. 외부 URL과 raw `/task/a/b` 기대는 PASS한다.

- [ ] **Step 3: raw segment 기준의 최소 구현을 작성한다**

`return-to.ts`에서 React Router의 decoded param 판정 대신 다음 형태의 작은 helper를 사용한다.

```ts
function isEncodedTaskPath(pathname: string): boolean {
  if (!pathname.startsWith("/task/")) return false;
  const segment = pathname.slice("/task/".length);
  if (!segment || segment.includes("/")) return false;
  try {
    return decodeURIComponent(segment).length > 0;
  } catch {
    return false;
  }
}
```

`isProtectedPath`는 exact route이거나 `isEncodedTaskPath(pathname)`일 때만 true를 반환한다. pathname/search/hash 문자열은 재인코딩하지 않는다.

- [ ] **Step 4: focused GREEN과 auth 회귀를 확인한다**

Run:

```bash
pnpm vitest run src/app/auth/return-to.test.ts src/app/auth/auth-route-boundary.test.tsx src/app/router.test.tsx
```

Expected: 세 파일 전체 PASS.

- [ ] **Step 5: 실제 로그인 Journey에 encoded ID를 연결한다**

`e2e/auth-entry.spec.ts`의 첫 case에서 page 진입 전에 `__kbhc_msw_task_fixture__`에 다음 task를 저장한다.

```ts
{
  id: "task/A",
  title: "인코딩된 ID 할 일",
  memo: "로그인 복귀 검증",
  status: "TODO",
  registerDatetime: "2026-08-30T09:00:00.000Z",
}
```

직접 진입, 로그인 후 복귀와 reload 기대 URL을 `/task/task%2FA`로 바꾸고 상세 heading을 확인한다.

- [ ] **Step 6: mapped Journey를 검증한다**

Run: `pnpm exec playwright test e2e/auth-entry.spec.ts`

Expected: Chromium 2/2 PASS, 첫 case가 encoded URL로 복귀하고 reload 뒤에도 상세를 표시한다.

- [ ] **Step 7: task 상태와 evidence를 갱신하고 커밋한다**

`REM-AUTH-ID-01`을 `AI_VERIFIED`, `REM-RESPONSIVE-01`을 `IN_PROGRESS`로 바꾸고 RED/GREEN/E2E 명령과 사람의 encoded-ID 결정을 기록한다.

```bash
git add src/app/auth/return-to.ts src/app/auth/return-to.test.ts src/app/auth/auth-route-boundary.test.tsx e2e/auth-entry.spec.ts TODO.md
git commit -m "fix(auth): 인코딩된 할 일 경로 인증 복귀 지원"
```

### Task 3: 긴 task 문자열의 반응형 표시

**Files:**
- Modify: `src/pages/task-detail/task-detail.test.tsx`
- Modify: `src/pages/task-detail/index.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.test.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: 제한 없는 `title`, `memo`, route `taskId`
- Produces: API 값을 바꾸지 않고 container 안에서 줄바꿈하는 상세·dialog UI

- [ ] **Step 1: overflow 방지 class의 RED 테스트를 작성한다**

상세 test에 500자 공백 없는 title/memo fixture를 렌더링하는 case를 추가하고 heading과 memo가 `min-w-0`, `[overflow-wrap:anywhere]` class를 가지는지 확인한다. Dialog render helper가 task ID를 받게 하고 긴 ID의 `<code>`에도 같은 class를 기대한다.

- [ ] **Step 2: focused RED를 확인한다**

Run:

```bash
pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx
```

Expected: 세 요소에 class가 없어 새 assertion만 FAIL한다.

- [ ] **Step 3: 표시 계층 CSS만 보강한다**

```tsx
<h1 className="mb-6 min-w-0 font-semibold text-3xl tracking-tight [overflow-wrap:anywhere]">
<p className="min-w-0 whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]">
<code className="min-w-0 rounded-md bg-muted px-3 py-2 font-mono text-sm [overflow-wrap:anywhere]">
```

텍스트 truncation이나 max length validation은 추가하지 않는다.

- [ ] **Step 4: focused GREEN을 확인한다**

Run: `pnpm vitest run src/pages/task-detail/task-detail.test.tsx src/features/delete-task/ui/delete-task-dialog.test.tsx`

Expected: 두 파일 전체 PASS.

- [ ] **Step 5: task 상태를 갱신하고 커밋한다**

`REM-RESPONSIVE-01`을 `AI_VERIFIED`, `REM-MOCK-CONTRACT-01`을 `IN_PROGRESS`로 전환하고 focused RED/GREEN을 기록한다. Browser evidence는 Task 7에서 같은 block에 추가한다.

```bash
git add src/pages/task-detail src/features/delete-task/ui TODO.md
git commit -m "fix(task): 긴 상세 문자열의 반응형 줄바꿈 보장"
```

### Task 4: Mock sessionStorage의 strict OAS 검증

**Files:**
- Modify: `src/mocks/fixtures/tasks.test.ts`
- Modify: `src/mocks/fixtures/tasks.ts`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `__kbhc_msw_task_fixture__` JSON
- Produces: exact key, status enum, RFC 3339 date-time을 만족하는 `StoredTask[]` 또는 기본 seed

- [ ] **Step 1: 손상된 저장 값을 재현하는 RED 테스트를 작성한다**

유효한 stored task에 `unexpected: true`를 더한 case와 `registerDatetime: "not-a-date"` case를 `it.each`로 저장한다. module reload 뒤 `listTaskPage(1)`이 저장 task가 아니라 기본 `task-1`부터 반환하는지 확인한다.

- [ ] **Step 2: focused RED를 확인한다**

Run: `pnpm vitest run src/mocks/fixtures/tasks.test.ts`

Expected: extra-key와 invalid-date case가 저장 값을 받아들여 각각 FAIL한다.

- [ ] **Step 3: 이미 설치된 Zod로 저장 경계를 한 번만 검증한다**

```ts
const storedTaskSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  memo: z.string(),
  status: z.enum(["TODO", "DONE"]),
  registerDatetime: z.iso.datetime({ offset: true }),
});

function isStoredTask(value: unknown): value is StoredTask {
  return storedTaskSchema.safeParse(value).success;
}
```

`loadTasks`의 전체-array fallback과 seed clone 동작은 유지한다.

- [ ] **Step 4: mock handler와 API guard까지 GREEN을 확인한다**

Run:

```bash
pnpm vitest run src/mocks/fixtures/tasks.test.ts src/mocks/handlers/tasks.test.ts src/shared/api/tasks.test.ts
```

Expected: 세 파일 전체 PASS.

- [ ] **Step 5: task 상태를 갱신하고 커밋한다**

`REM-MOCK-CONTRACT-01`을 `AI_VERIFIED`, `REM-BOOTSTRAP-01`을 `IN_PROGRESS`로 전환한다.

```bash
git add src/mocks/fixtures/tasks.ts src/mocks/fixtures/tasks.test.ts TODO.md
git commit -m "fix(mock): 저장된 할 일 fixture 계약 검증 강화"
```

### Task 5: MSW bootstrap 실패 복구 화면

**Files:**
- Create: `src/bootstrap.tsx`
- Create: `src/bootstrap.test.tsx`
- Modify: `src/main.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `startWorker(): Promise<unknown>`, application render callback, failure render callback
- Produces: `bootstrap(startWorker, renderApplication, renderFailure): Promise<void>`, `BootstrapFailure`

- [ ] **Step 1: bootstrap 제어 흐름과 오류 UI RED 테스트를 작성한다**

`bootstrap.test.tsx`에서 다음 세 동작을 각각 검증한다.

```ts
await bootstrap(vi.fn().mockResolvedValue(undefined), renderApplication, renderFailure);
expect(renderApplication).toHaveBeenCalledOnce();
expect(renderFailure).not.toHaveBeenCalled();

await bootstrap(vi.fn().mockRejectedValue(new Error("worker failed")), renderApplication, renderFailure);
expect(renderFailure).toHaveBeenCalledOnce();
expect(renderApplication).not.toHaveBeenCalled();
```

`<BootstrapFailure onRetry={reload} />`를 렌더링해 `role="alert"`, 한국어 안내와 `다시 시도` button을 확인하고 click 시 reload callback 한 번을 기대한다.

- [ ] **Step 2: 새 module 부재로 RED인지 확인한다**

Run: `pnpm vitest run src/bootstrap.test.tsx`

Expected: `src/bootstrap.tsx`를 찾지 못해 FAIL한다.

- [ ] **Step 3: 최소 bootstrap module과 main wiring을 구현한다**

```tsx
export async function bootstrap(
  startWorker: () => Promise<unknown>,
  renderApplication: () => void,
  renderFailure: () => void,
): Promise<void> {
  try {
    await startWorker();
    renderApplication();
  } catch {
    renderFailure();
  }
}

export function BootstrapFailure({ onRetry }: { onRetry(): void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="grid max-w-md gap-4 rounded-xl border bg-card p-6" role="alert">
        <h1 className="font-semibold text-xl">애플리케이션을 시작하지 못했습니다.</h1>
        <p className="text-muted-foreground">로컬 API를 준비하지 못했습니다.</p>
        <Button onClick={onRetry} type="button">
          다시 시도
        </Button>
      </section>
    </main>
  );
}
```

`BootstrapFailure`는 기존 `Button`을 import해 재사용한다. `main.tsx`는 root를 한 번 만들고 성공 callback에서 기존 `<StrictMode><App /></StrictMode>`, 실패 callback에서 `<BootstrapFailure onRetry={() => location.reload()} />`를 렌더링한다.

- [ ] **Step 4: focused GREEN과 architecture 경계를 확인한다**

Run:

```bash
pnpm vitest run src/bootstrap.test.tsx src/test/architecture-contract.test.ts
```

Expected: 두 파일 전체 PASS.

- [ ] **Step 5: task 상태를 갱신하고 커밋한다**

`REM-BOOTSTRAP-01`을 `AI_VERIFIED`, `REM-VERIFY-01`을 `IN_PROGRESS`로 전환한다.

```bash
git add src/bootstrap.tsx src/bootstrap.test.tsx src/main.tsx TODO.md
git commit -m "fix(app): mock 시작 실패 복구 화면 추가"
```

### Task 6: Read-only architecture 검사와 확실한 dead code 제거

**Files:**
- Modify: `src/test/architecture-contract.test.ts`
- Modify: `src/features/delete-task/model/attempt-guard.ts`
- Modify: `src/features/delete-task/model/attempt-guard.test.ts`
- Modify: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: project `biome.json`, allowed/blocked import source strings, existing attempt sequence guard
- Produces: repository 밖 fixture 검사, `AttemptGuard`의 실제 사용 method 세 개

- [ ] **Step 1: 기존 검사가 저장소를 변경하는지 재현한다**

Run:

```bash
before_state=$(git status --porcelain=v1 -uall)
pnpm vitest run src/test/architecture-contract.test.ts
after_state=$(git status --porcelain=v1 -uall)
test "$before_state" = "$after_state"
```

Expected: 정상 종료에서는 diff가 없지만 test source가 repository 내부 fixture 생성 경로를 사용함을 코드 검사로 확인한다. 이 task는 test harness 자체 변경이므로 제품 RED 대신 기존 executable assertion을 보존한다.

- [ ] **Step 2: fixture를 OS temp로 옮긴다**

`mkdtempSync(resolve(tmpdir(), "kbhc-biome-"))`로 directory를 만들고 `spawnSync`에
`--config-path=${resolve(projectRoot, "biome.json")}`를 전달한다. `finally`에서 temp directory만 `rmSync`한다. repository `src`에는 write하지 않는다.

- [ ] **Step 3: guard와 dialog의 미사용 표면만 제거한다**

`AttemptGuard`의 `pending()` signature, 구현과 그 method만 검사하던 assertion을 제거한다. `begin`, `isCurrent`, `finish`와 sequence behavior test는 유지한다. Dialog의 읽히지 않는 `triggerRef`와 trigger `ref` prop만 제거하고 guard용 `useRef`는 유지한다.

- [ ] **Step 4: focused 검증과 상태 fingerprint를 확인한다**

Run:

```bash
pnpm vitest run src/test/architecture-contract.test.ts src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/ui/delete-task-dialog.test.tsx
git diff --check
```

Expected: 세 파일 전체 PASS, allowed status 0, blocked status 1과 `lint/style/noRestrictedImports`, whitespace 오류 없음.

- [ ] **Step 5: task 상태를 갱신하고 커밋한다**

`REM-VERIFY-01`을 `AI_VERIFIED`로 전환하고 test 전후 status, temp path 방식과 dead-code 회귀 결과를 기록한다.

```bash
git add src/test/architecture-contract.test.ts src/features/delete-task/model/attempt-guard.ts src/features/delete-task/model/attempt-guard.test.ts src/features/delete-task/ui/delete-task-dialog.tsx TODO.md
git commit -m "refactor(test): 저장소를 변경하지 않는 구조 검사로 전환"
```

### Task 7: 통합 검증과 browser evidence

**Files:**
- Modify: `docs/quality/evidence/final-qa.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Tasks 2~6의 corrected implementation
- Produces: 재현 가능한 quick, mapped Journey, agent-browser evidence와 `REM-FINAL-01` checkpoint 상태

- [ ] **Step 1: quick gate를 실행한다**

Run: `./scripts/verify quick`

Expected: hook, verifier contract, format, lint, OpenAPI types, TypeScript와 전체 Vitest PASS.

- [ ] **Step 2: mapped Journey를 실행한다**

Run:

```bash
pnpm exec playwright test e2e/auth-entry.spec.ts e2e/task-resolution.spec.ts
```

Expected: encoded 로그인 복귀와 삭제 Journey 전체 PASS.

- [ ] **Step 3: agent-browser로 실제 경계를 확인한다**

Production preview의 fresh named session에서 다음을 확인한다.

1. anonymous `/task/task%2FA` → `/sign-in`
2. 로그인 → `/task/task%2FA`, encoded fixture 상세 표시
3. 390×844에서 500자 title/memo를 가진 task의 document width가 390 이하
4. 삭제 dialog의 500자 ID `<code>` bounding rect가 dialog content 안에 있음
5. console과 page error에 예상하지 않은 항목이 없음

Session을 닫고 preview server와 port를 정리한다.

- [ ] **Step 4: evidence와 final task 상태를 기록한다**

`final-qa.md`에 requirement, commit, viewport, action, expected, actual, console/network, screenshot/trace, automatic verification을 추가한다. `REM-FINAL-01`을 `IN_PROGRESS`로 전환하되 `HUMAN_APPROVED`는 기록하지 않는다.

- [ ] **Step 5: evidence를 커밋한다**

```bash
git add docs/quality/evidence/final-qa.md TODO.md
git commit -m "docs(qa): 코드 리뷰 후속 수정 검증 근거 기록"
```

### Task 8: 계획 완료 적대적 검토, 사람 checkpoint와 최종 QA

**Files:**
- Modify: `docs/quality/evidence/final-qa.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: exact corrected target commit, 승인 설계와 이 plan, Tasks 1~7 evidence
- Produces: severity별 finding/correction/rerun, 사람 checkpoint 요청, canonical full 결과

- [ ] **Step 1: plan-completion adversarial review를 수행한다**

현재 세션에서 별도의 read-only pass로 OpenAPI, auth policy, 설계, plan, 전체 diff와 테스트를 다시 대조한다. 하위 agent는 상위 실행 정책상 사용하지 않는다. 다음을 최소 확인한다.

- encoded slash는 허용하지만 raw 다중 segment·외부 origin·malformed encoding은 거부
- 긴 문자열 값과 exact delete guard는 변경되지 않음
- mock strict validation은 OAS key/date/status를 모두 검사
- bootstrap 실패가 app을 mock 없이 실행하지 않음
- architecture test는 repository path에 write하지 않음
- `assignment-original/`, dependency와 unrelated AI artifact diff 없음

HIGH/MEDIUM finding이 있으면 root cause test부터 RED→GREEN으로 수정하고 quick/browser를 재실행한다.

- [ ] **Step 2: 한 번의 사람 checkpoint를 요청한다**

사용자에게 exact target, 자동/browser 결과, 남은 LOW 또는 제외 범위를 제시하고 최종 검증 진행 승인을 요청한다. 응답 전에는 `REM-FINAL-01`을 완료 처리하지 않는다.

- [ ] **Step 3: 승인 후 canonical full gate를 실행한다**

Run: `./scripts/verify full`

Expected: setup, format, lint, typecheck, 전체 Vitest, production build, Chromium core 5건과 verifier regression 전체 PASS. 기존 Vite chunk-size advisory 외 새 warning이 없다.

- [ ] **Step 4: 최종 evidence와 AI 상태를 기록한다**

`REM-FINAL-01`은 자동·browser·review 조건이 모두 충족되면 `AI_VERIFIED`로만 전환한다. Stage 7의 사람 소유 상태와 기존 `QA-04`의 `HUMAN_APPROVED` 기록은 AI가 변경하지 않는다.

- [ ] **Step 5: 최종 문서 커밋과 clean check를 수행한다**

```bash
git add TODO.md docs/quality/evidence/final-qa.md
git commit -m "docs(qa): 코드 리뷰 후속 수정 최종 검증 기록"
git diff --check main...HEAD
git status --short
```

Expected: diff check PASS, 계획된 파일 외 변경 없음, worktree clean.
