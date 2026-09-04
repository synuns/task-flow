# Task mutation과 API 응답 경계 수정 계획

> 승인 기준: `docs/superpowers/specs/2026-09-04-final-code-review-corrections-design.md`

**목표:** Task 상세 mutation의 동시 실행을 막고, 목록 오류가 실패한 operation을
재실행하며, User/Task 성공 응답이 OpenAPI 문자열 제약을 만족할 때만 UI로 전달되게 한다.

**제약:** 기존 React Query와 Zod를 재사용한다. generic mutation wrapper, form
abstraction, dependency, API 계약, 낙관 갱신을 추가하지 않는다.

## Task 1: 작업 원장과 baseline

**Files:**

- Modify: `TODO.md`
- Create: `docs/superpowers/plans/2026-09-04-task-api-corrections.md`

1. Cycle 1 rebase SHA와 사용자 진행 승인을 기록한다.
2. `REVIEW-TASK-LOCK-01`, `REVIEW-TASK-RETRY-01`,
   `REVIEW-API-RESPONSE-01`, `REVIEW-TASK-API-JOURNEY-01`을 등록한다.
3. `pnpm verify quick` baseline을 기록한다.
4. 계획과 원장을 커밋한다.

```bash
git add TODO.md docs/superpowers/plans/2026-09-04-task-api-corrections.md \
  docs/quality/evidence/auth-entry.md docs/quality/evidence/user-crud.md
git commit -m "docs(review): Task와 API 수정 계획 추가"
```

## Task 2: Task 상세 mutation lock

**Files:**

- Modify: `src/pages/task-detail/index.tsx`
- Modify: `src/pages/task-detail/task-detail.test.tsx`
- Modify: `src/features/update-task/ui/update-task-field.tsx`
- Modify: `src/features/update-task/ui/task-status-control.tsx`
- Modify: `src/features/delete-task/ui/delete-task-dialog.tsx`
- Modify direct feature tests only when the page test cannot prove callback lifecycle

1. Existing page tests에 title/status/delete pending 동안 다른 mutation control이
   disabled이고 실패 뒤 다시 enabled가 되는 assertion을 추가한다.
2. Focused test를 실행해 동시 interaction 가능 상태로 RED를 확인한다.

```bash
pnpm exec vitest run src/pages/task-detail src/features/update-task src/features/delete-task
```

3. Page에 현재 pending owner 하나를 둔다. 각 feature는 기존 mutation pending
   lifecycle을 callback으로 알리고 다른 owner일 때 받은 `disabled`를 submit/trigger에
   적용한다.
4. 기존 draft 보존, 비낙관 cache, delete resolution을 유지한다.
5. Focused와 quick을 실행하고 mini second-pass 뒤 커밋한다.

```bash
pnpm exec vitest run src/pages/task-detail src/features/update-task src/features/delete-task
pnpm verify quick
git add src/pages/task-detail src/features/update-task src/features/delete-task TODO.md
git commit -m "fix(task): 상세 mutation 상호 배제"
```

## Task 3: Infinite query retry 대상 구분

**Files:**

- Modify: `src/widgets/task-list/index.tsx`
- Modify: `src/widgets/task-list/task-list.test.tsx`

1. Retained-data refetch 실패 뒤 `다시 불러오기`가 page 1 refetch를 실행하는 test를
   추가한다. 기존 next-page 실패 test는 page 2 재요청을 확인하도록 보강한다.
2. Focused RED에서 기존 action이 refetch 실패에도 `fetchNextPage()`를 호출함을 확인한다.

```bash
pnpm exec vitest run src/widgets/task-list/task-list.test.tsx
```

3. React Query의 `isFetchNextPageError`로 실패 종류를 구분해 next-page 오류만
   `fetchNextPage()`, 나머지 retained-data 오류는 `refetch()`를 호출한다.
4. Focused와 quick을 실행하고 mini second-pass 뒤 커밋한다.

```bash
pnpm exec vitest run src/widgets/task-list/task-list.test.tsx
pnpm verify quick
git add src/widgets/task-list TODO.md
git commit -m "fix(task): 목록 오류 재시도 대상 구분"
```

## Task 4: User와 Task response runtime 제약

**Files:**

- Modify: `src/shared/api/user.ts`
- Modify: `src/shared/api/user.test.ts`
- Modify: `src/shared/api/tasks.ts`
- Modify: `src/shared/api/tasks.test.ts`

1. User의 잘못된 email, 255자 email, 51자 name, 501자 memo와 Task의 빈/101자
   title, 501자 memo, 잘못된 date-time response를 거부하는 table test를 추가한다.
2. 기존 type/exact-key guard가 길이·형식을 통과시키는 RED를 확인한다.

```bash
pnpm exec vitest run src/shared/api/user.test.ts src/shared/api/tasks.test.ts
```

3. Zod strict object schema로 기존 exact-key와 generated response type을 함께
   유지한다. Task ID는 계약대로 string만 검사한다.
4. 정상 경계와 기존 request method/body test를 보존한 채 focused와 quick을 실행한다.

```bash
pnpm exec vitest run src/shared/api/user.test.ts src/shared/api/tasks.test.ts
pnpm verify quick
git add src/shared/api TODO.md
git commit -m "fix(api): User와 Task 응답 제약 검증"
```

## Task 5: Cycle 2 통합 검증과 review

**Files:**

- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `docs/quality/evidence/task-crud.md`
- Modify: `docs/quality/evidence/task-resolution.md` when delete-lock evidence applies
- Modify: `TODO.md`

1. Cycle 2 focused suite와 quick을 fresh 실행한다.

```bash
pnpm exec vitest run src/pages/task-detail src/features/update-task \
  src/features/delete-task src/widgets/task-list/task-list.test.tsx \
  src/shared/api/user.test.ts src/shared/api/tasks.test.ts
pnpm verify quick
```

2. Mapped E2E를 실행한다.

```bash
pnpm exec playwright test e2e/task-discovery.spec.ts \
  e2e/task-resolution.spec.ts e2e/task-crud.spec.ts
```

3. Production browser에서 pending lock과 failure recovery, retained-data retry를
   확인한다. UI 변경이 없는 runtime validator는 focused API evidence를 사용한다.
4. `pnpm verify full`, authoritative diff, `git diff --check`를 실행한다.
5. Fresh second-pass에서 plan 누락, mutation race, retry operation, OpenAPI 경계,
   test 중복, browser console/network, unrelated diff와 TODO를 검토한다.
6. 7-field evidence를 기록하고 사람 checkpoint를 요청한다.

```bash
git add TODO.md docs/quality/evidence/task-discovery.md \
  docs/quality/evidence/task-resolution.md docs/quality/evidence/task-crud.md
git commit -m "docs(qa): Task와 API 수정 통합 검증 근거 기록"
```

