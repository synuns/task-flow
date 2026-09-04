# Mock·도구·surface correction 구현 계획

**Goal:** 승인된 최종 코드 리뷰 Cycle 3의 mock 불변식, 검토 도구 복구, 불필요한 공개
surface와 TaskCard 접근성·문서 정합성을 작은 testable unit으로 교정한다.

**Source:** `docs/superpowers/specs/2026-09-04-final-code-review-corrections-design.md`

**Constraints:** 원본·CRUD OpenAPI, generated 파일, dependency, 인증·삭제 의미와 storage
write 실패 동작을 바꾸지 않는다. 기존 Zod, transcript adapter와 RecordStore를 재사용한다.

## Task 1: Mock persisted-state invariant

**Files:**

- Modify: `src/mocks/fixtures/users.ts`
- Modify: `src/mocks/fixtures/users.test.ts`
- Modify: `src/mocks/fixtures/tasks.ts`
- Modify: `src/mocks/fixtures/tasks.test.ts`

1. User persisted fixture의 중복 ID, 비정규·중복 canonical email, 최대 `user-N`보다 작은
   sequence와 Task 중복 ID가 각각 seed 복구를 일으키는 RED test를 작성한다.
2. 정상 persisted User/Task state는 그대로 load되고 다음 User ID가 충돌하지 않는 test를
   함께 둔다.
3. schema 통과 뒤 `Set`과 기존 `canonicalEmail`로 identity 불변식만 검사한다.
4. Focused 명령을 GREEN으로 만들고 quick을 실행한다.

```bash
pnpm exec vitest run src/mocks/fixtures/users.test.ts src/mocks/fixtures/tasks.test.ts
pnpm verify quick
```

## Task 2: Hook parser ownership

**Files:**

- Modify: `.codex/hooks/export_session.py`
- Modify: `tests/test_export_session.py`
- Modify: `tests/test_transcript_adapter.py`

1. exporter가 parser symbol을 소유하지 않고 adapter 경로로 SessionData를 받는 계약을
   test로 고정한다.
2. exporter의 중복 dataclass, visible-text parser, legacy parser와 wrapper entrypoint를
   삭제하고 `read_transcript(...).session`을 hook에서 직접 호출한다.
3. rendering test는 adapter의 dataclass를 사용하고 기존 redaction/rendering 결과를
   보존한다.

```bash
python3 -m unittest tests/test_export_session.py tests/test_transcript_adapter.py -v
```

## Task 3: Verifier와 publisher recovery

**Files:**

- Modify: `scripts/verify`
- Modify: `tests/test_verify_contract.py`
- Modify: `.codex/hooks/review_publisher.py`
- Modify: `tests/test_review_publisher.py`

1. 같은 TODO stable task ID가 두 번 등장하는 fixture와 최종 journal write만 실패하는
   publication test를 RED로 확인한다.
2. TODO parser가 두 번째 ID를 덮어쓰기 전에 `duplicate task ID` 오류를 추가한다.
3. published metadata와 일치하는 public artifact의 committing journal을 재실행 시 complete로
   기록해 idempotent recovery를 끝낸다.
4. Focused Python suite와 quick을 실행한다.

```bash
python3 -m unittest tests/test_verify_contract.py tests/test_review_publisher.py -v
pnpm verify quick
```

## Task 4: Public surface, accessibility, docs

**Files:**

- Modify: `src/shared/api/api-error.ts`
- Modify: `src/shared/api/index.ts`
- Modify: exact guard callers under `src/app`, `src/features`, `src/pages`
- Modify: `src/entities/task/ui/task-card.tsx`
- Modify: `src/entities/task/ui/task-card.test.tsx`
- Modify: files containing confirmed unused exports only
- Modify: `docs/superpowers/plans/2026-08-30-application-architecture.md`

1. TaskCard link가 visible title, status, memo로 이름을 얻고 `aria-label` 속성을 갖지 않는
   RED test를 작성한다.
2. 네 군데 중복된 `ApiError` guard를 exact union guard 하나로 줄이고 caller가 재사용하게
   한다.
3. 전체 reference 검색으로 확인된 `acceptsBearer`, `CreateTaskValues`, `TaskStatusData`와
   불필요한 barrel type export만 제거한다. generated export는 건드리지 않는다.
4. 과거 DEV-only MSW 단계에 2026-09-01 correction 설계 링크를 추가한다.
5. Focused test, typecheck, reference scan과 quick을 실행한다.

```bash
pnpm exec vitest run src/entities/task/ui/task-card.test.tsx src/shared/api
pnpm typecheck
rg -n 'acceptsBearer|CreateTaskValues|TaskStatusData|aria-label' src
pnpm verify quick
```

## Task 5: Integrated verification and review

1. TODO/evidence에 각 focused RED/GREEN, quick 결과와 target commit을 기록한다.
2. Cycle 3 전체 focused suite와 canonical full을 실행한다. 제품 route 동작은 바뀌지
   않으므로 full의 six Journey core E2E를 browser 회귀 근거로 사용한다.
3. 최신 target의 계획·요구사항·전체 diff를 frozen 상태로 다시 읽고 중복, 비효율,
   설계 빈틈, SOLID/FSD, 약한 test, 문서·원본 계약을 적대적으로 검토한다.
4. finding을 교정한 뒤 필요한 최소 gate를 재실행하고 seven-field evidence를 기록한다.
5. 사람 checkpoint를 요청하며 AI가 `HUMAN_APPROVED`나 최종 acceptance를 표시하지 않는다.

```bash
pnpm exec vitest run src/mocks/fixtures/users.test.ts src/mocks/fixtures/tasks.test.ts \
  src/entities/task/ui/task-card.test.tsx src/shared/api
python3 -m unittest tests/test_export_session.py tests/test_transcript_adapter.py \
  tests/test_verify_contract.py tests/test_review_publisher.py -v
pnpm verify quick
pnpm verify full
git diff --check
git diff --exit-code main...HEAD -- assignment-original docs/api/crud-openapi.yaml \
  src/generated pnpm-lock.yaml package.json
```
