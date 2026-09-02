# Task Resolution Journey 설계

## 목적

기존 task 상세·삭제 동작을 보존하면서 실제 화면 gap만 교정하고,
`task-resolution` Journey의 current-target 자동·browser evidence, 독립 review와
사람 checkpoint 요청까지 완성하는 gap-first 루프를 정의한다.

대상은 다음 TODO task다.

- `TASK-DETAIL-VIEW-01`
- `TASK-DETAIL-RECOVERY-VIEW-01`
- `TASK-DELETE-DIALOG-VIEW-01`
- `TASK-DELETE-OUTCOME-VIEW-01`
- `TASK-DETAIL-JOURNEY-VERIFY-01`
- `TASK-DETAIL-JOURNEY-REVIEW-01`
- `JOURNEY-TASK-DETAIL-01`

이 설계는 `TASK-DETAIL-01`~`TASK-DETAIL-05`의 accepted behavior, 인증 정책,
삭제 의미론, API 계약과 architecture를 바꾸지 않는다.

## 기준 context

우선순위는 다음 문서를 따른다.

1. `assignment-original/openapi.yaml`
2. `assignment-original/requirement.md`
3. `docs/quality/requirements.md`
4. `docs/project-plan.md`
5. `docs/superpowers/specs/2026-08-30-authentication-policy-design.md`
6. `docs/superpowers/specs/2026-08-30-delete-consistency-policy-design.md`
7. `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`
8. `docs/quality/workflow.md`, `docs/quality/verification.md`
9. `TODO.md`, `docs/quality/evidence/task-resolution.md`

기존 `task-discovery` Journey의 gap-first task 소유, current-target evidence,
독립 review와 사람 checkpoint 구조를 재사용한다. 삭제 경계에 필요한 검증만
추가하고 새 workflow나 상태 체계를 만들지 않는다.

## 요구사항과 Journey 경계

| Requirement | 관찰 가능한 결과 | 주 evidence |
| --- | --- | --- |
| `TASK-DETAIL-01` | 기존 상세가 response의 `title`, `memo`, `registerDatetime`을 표시한다. | integration + browser |
| `TASK-DETAIL-02` | 없는 상세가 API `errorMessage`와 목록 복구 action을 표시한다. | integration + browser |
| `TASK-DETAIL-03` | 삭제 action이 accessible ID 확인 modal을 연다. | component + browser |
| `TASK-DETAIL-04` | 입력이 route ID와 정확히 같을 때만 삭제 submit이 가능하다. | unit/component + browser |
| `TASK-DETAIL-05` | 확인된 DELETE의 200 success만 `/task` 이동을 만든다. | integration + browser |

각 case는 승인된 authenticated fixture, fresh QueryClient와 reset task store에서
독립 실행한다. sign-in Journey를 선행 실행하거나 `/api/sign-in`을 호출하지 않는다.

| Journey case | 경계 | Expected |
| --- | --- | --- |
| `RES-P1-1` | 기존 `/task/:id` | bearer 인증 GET과 response의 세 표시 field; browser GET 횟수는 exact invariant가 아님 |
| `RES-P1-2` | 삭제 확인 열기 | accessible AlertDialog와 visible ID input |
| `RES-P1-3` | 틀린 값부터 exact ID까지 입력 | exact equality 전 disabled, DELETE 0회 |
| `RES-P1-4` | exact ID submit | attempt당 DELETE 한 번과 auth replay 최대 한 번, 200만 `/task` 이동 |
| `RES-E1` | 없는 ID와 목록 복구 | 404 `errorMessage`, `/task` action |
| `RES-E2` | non-exact ID | submit disabled, DELETE 0회 |
| `RES-E3` | DELETE 401 | 승인된 auth와 delete 정책의 replay·session 결과 |
| `RES-E4` | DELETE 404 | non-success 상태, 자동 redirect 없음 |

## OpenAPI와 정책 context

### 상세 조회

- Request: bearer가 필요한 `GET /api/task/{id}`
- `200`: required `title`, `memo`, `registerDatetime`을 가진
  `TaskDetailResponse`
- `401`, `404`: required string `errorMessage`를 가진 `ErrorResponse`
- Path ID는 route param의 string을 URL path segment로 사용한다.

화면은 response field를 조용히 바꾸거나 status, 수정, 생성 action을 추가하지
않는다. 사람이 읽는 날짜 text와 원본 ISO `dateTime` attribute를 함께 유지한다.

### 삭제

- Request: bearer가 필요한 `DELETE /api/task/{id}`
- `200`: `DeleteTaskResponse { success: true }`
- `401`, `404`: `ErrorResponse`
- Route ID와 입력값은 trim이나 대소문자 변환 없이 정확히 비교한다.

`DEC-DELETE-01`에 따라 server-authoritative 비낙관적 삭제를 유지한다. 사용자
submit 한 번은 attempt 하나며 최초 DELETE 한 번과 인증 refresh 뒤 replay 한 번만
허용한다. 404, network와 invalid response는 성공이 아니고 DELETE를 자동
재전송하지 않는다.

## 화면 context

### 상세 success

한 열 문서 layout에서 목록 복귀 link, title, memo, 사람이 읽는 등록일과 분리된
destructive 영역을 순서대로 제공한다. mobile과 desktop 모두 heading 순서,
줄바꿈과 focus visibility를 유지하고 horizontal clipping을 만들지 않는다.

### 상세 error와 404

- Loading은 최종 content geometry를 예약하는 Skeleton과 text status를 쓴다.
- 404는 API `errorMessage`, resource-missing 설명과 `할 일 목록으로 이동` action을
  제공한다.
- 다른 query error는 오류 message와 `다시 불러오기` action을 제공한다.
- Error, 404와 success는 color만으로 구분하지 않는다.

### 삭제 modal과 결과

기존 shadcn `AlertDialog`, `Input`, `Label`, `Button`, `Alert`를 재사용한다. Task ID는
monospace로 보여주고 visible `할 일 ID` label을 input과 연결한다. Pending 중에는
submit, cancel, Escape, outside click을 잠그고 진행 상태를 text와 접근성 상태로
전달한다.

| 결과 | 화면과 route |
| --- | --- |
| success | 관련 cache를 제거하고 `/task`로 이동 |
| exists | 오류를 표시하고 사용자의 새 attempt 허용 |
| absent | 성공으로 판정하지 않고 목록 이동·상태 재확인 제공 |
| unknown | 결과 미확정을 표시하고 상태 재확인·목록 이동 제공 |

실패 뒤 modal을 닫으면 입력·오류·attempt state를 초기화하고 trigger로 focus를
복원한다. Success는 route 이동으로 종료하므로 이전 trigger focus를 복원하지 않는다.

## 현재 baseline

다음 흐름은 교체 대상이 아니다.

- `src/pages/task-detail/index.tsx`: route param, detail query와 성공·오류 composition
- `src/features/delete-task/ui/delete-task-dialog.tsx`: exact-ID form과 result UI
- `src/features/delete-task/model/delete-task.ts`: DELETE와 presence reconciliation
- `src/features/delete-task/model/attempt-guard.ts`: 동기 중복 attempt guard
- `src/features/delete-task/model/delete-cache.ts`: task·dashboard cache 제거
- `src/shared/api/tasks.ts`: generated contract guard와 detail/delete endpoint
- `src/mocks/fixtures/tasks.ts`, `src/mocks/handlers/tasks.ts`: reset 가능한 단일 task store
- `e2e/task-resolution.spec.ts`: exact confirmation, success redirect와 삭제 후 일관성

기존 `docs/quality/evidence/task-resolution.md`는 로직 중심의 과거 commit evidence다.
새 Journey verify는 current target의 화면, browser action, request count와 exact SHA를
다시 기록한다.

## Architecture와 data flow

```text
approved authenticated fixture
  → AuthRouteBoundary
  → TaskDetailPage
  → useQuery / getTaskDetail
  → bearer GET /api/task/{id}
  → success, 404 또는 recoverable error UI

exact route ID input
  → DeleteTaskDialog
  → resolveDeleteAttempt
  → bearer DELETE /api/task/{id}
  → success 또는 approved reconciliation result
  → cache transition과 route/UI result
```

- Page는 route param, detail query와 route composition을 소유한다.
- Delete feature는 modal, exact-ID guard, attempt와 result presentation을 소유한다.
- Shared API는 URL, method, auth adapter와 response validation을 소유한다.
- QueryClient와 cache helper는 protected task·dashboard snapshot transition을 소유한다.
- MSW task store는 목록, 상세와 dashboard data의 source of truth다.
- Auth adapter는 401 refresh, bounded replay와 session generation 격리를 계속 소유한다.

Server state, auth state 또는 route state를 feature local state로 복제하지 않는다.
새 generic modal, mutation wrapper, cache abstraction이나 dependency를 추가하지 않는다.

## 삭제 결과 flow

```text
DELETE 200 { success: true }
  → 관련 query cancel/remove
  → /task

DELETE 404
  → non-success 오류
  → 자동 redirect 없음

DELETE network 또는 invalid response
  → GET /api/task/{id} 한 번 재확인
     ├─ 200: exists, 새 사용자 attempt 허용
     ├─ 404: absent, 목록 이동 제공
     └─ 실패: unknown, 재확인·목록 이동 제공
```

GET 재확인은 DELETE를 자동 재전송하지 않는다. DELETE 또는 reconciliation 응답은
현재 attempt와 session generation에 속할 때만 UI, cache와 route를 변경한다.

## Task 경계와 dependency

```text
TASK-DETAIL-VIEW-01
  → TASK-DETAIL-RECOVERY-VIEW-01
  → TASK-DELETE-DIALOG-VIEW-01
  → TASK-DELETE-OUTCOME-VIEW-01
  → TASK-DETAIL-JOURNEY-VERIFY-01
  → TASK-DETAIL-JOURNEY-REVIEW-01
  → JOURNEY-TASK-DETAIL-01
```

### `TASK-DETAIL-VIEW-01`

상세 success의 title, memo, original datetime과 readable date, 목록 복귀 link와
destructive hierarchy를 소유한다. API·delete result는 소유하지 않는다.

### `TASK-DETAIL-RECOVERY-VIEW-01`

Loading, 404와 일반 error의 구분, API message, 목록 복구와 retry action을 소유한다.
Delete failure UI는 소유하지 않는다.

### `TASK-DELETE-DIALOG-VIEW-01`

Accessible modal, visible label, exact-ID disabled guard, focus lifecycle와 pending
interaction lock을 소유한다. Delete result 의미와 cache transition은 바꾸지 않는다.

### `TASK-DELETE-OUTCOME-VIEW-01`

Success, 404, exists, absent, unknown의 표시와 approved cache·route transition을
소유한다. Auth나 destructive-data semantics를 재설계하지 않는다.

### `TASK-DETAIL-JOURNEY-VERIFY-01`

네 implementation task의 current target을 focused, quick, mapped E2E, named browser와
full evidence로 통합한다. Production 변경은 소유하지 않으며 실패 시 root cause
task를 다시 연다.

### `TASK-DETAIL-JOURNEY-REVIEW-01`

Verify target의 exact SHA, spec, plan, source, tests, browser record, evidence와 TODO를
final author와 분리된 fresh context 또는 second-pass role이 검토한다.

### `JOURNEY-TASK-DETAIL-01`

Current evidence와 PASS review를 사람에게 제시하는 checkpoint 요청만 소유한다.
AI는 이 task를 완료하거나 `HUMAN_APPROVED`를 기록하지 않는다.

## Gap-first 실행 규칙

각 implementation task는 다음 순서를 따른다.

1. Dependency가 완료된 `NOT_STARTED` task 하나만 `IN_PROGRESS`로 만든다.
2. Requirement ID, route, API path와 symbol을 requirements, TODO, source, test와
   E2E에서 다시 검색한다.
3. Current behavior와 acceptance를 대조한다.
4. 실제 gap이 있으면 가장 낮은 test를 작성해 예상한 이유의 RED를 확인한다.
5. 최소 production 변경으로 GREEN을 만들고 인접 suite를 재실행한다.
6. Gap이 없으면 억지 RED, duplicate assertion과 production diff를 만들지 않는다.
7. Focused test, `./scripts/verify quick`과 적용 가능한 browser QA를 실행한다.
8. Failure를 분류하고 root cause를 교정한 뒤 같은 gate를 재실행한다.
9. Current commit evidence가 재현될 때만 해당 task를 `AI_VERIFIED`로 닫는다.

한 세션은 자신이 시작한 TODO block만 갱신한다. 각 완료 task의 evidence는 command,
result, target SHA, browser precondition/action/expected/actual과 correction 여부를
재현 가능하게 기록한다.

## 검증과 evidence

### 자동 검증

- Detail: response field, readable/original datetime, loading, retry와 404 recovery
- Dialog: label, exact equality, DELETE 0회, pending close·duplicate guard, focus restore
- Outcome: 200-only redirect, 404 non-success, reconciliation matrix와 no auto retry
- Cache/store: delete 뒤 list 제외, detail 404와 dashboard metric 일치
- Transport: bearer, attempt당 DELETE 한 번과 auth replay 포함 최대 두 번
- Journey: `pnpm exec playwright test e2e/task-resolution.spec.ts`
- Gates: 각 task의 `./scripts/verify quick`, Journey target의 `./scripts/verify full`

이미 충분한 assertion은 복제하지 않는다. Focus, actual modal close, responsive layout,
network sequence와 clipping은 browser evidence로 확인한다.

### Browser 검증

Named `agent-browser` session은 task ID를 사용하고 다음을 기록한다.

- `/task/task-1`, missing detail과 `/task`
- `390x844`, `1280x720`
- Approved authenticated fixture, fresh query와 reset task store
- Existing detail의 title, memo와 `time[datetime]`
- 404 message와 목록 recovery
- Modal name, label, initial focus, exact-ID guard와 focus restore
- Pending close·duplicate-submit lock
- Exact DELETE/GET method, path, bearer와 request count
- Success redirect, deleted detail 404, list item 제거와 dashboard metric
- 404 stay/recovery, network·invalid response의 exists/absent/unknown 재확인과 success UI
- Horizontal clipping, console, page error와 예상하지 않은 network request
- Screenshot 또는 trace, correction과 rerun verdict

Mapped E2E는 기존 대표 success 한 건을 유지한다. Integration으로 충분한 result
matrix를 상태별 E2E로 증식하지 않는다.

### Journey 통합 gate

```text
focused Vitest
  → ./scripts/verify quick
  → e2e/task-resolution.spec.ts
  → named agent-browser QA
  → ./scripts/verify full
  → exact-SHA independent review
  → human checkpoint request
```

## Failure와 review

- Contract, status, payload 또는 accepted behavior 불일치: `REQUIREMENT`
- Detail, dialog 또는 result rendering 결함: `IMPLEMENTATION`
- Auth, cache, route, request count 또는 fixture 결함: `INTEGRATION`
- Keyboard, focus, close lock, clipping 또는 상태 전달 결함: `UX_ACCESSIBILITY`
- Weak, duplicate 또는 flaky assertion: `TEST`
- Browser/server/runtime 문제: `ENVIRONMENT`
- Verify, formatter 또는 runner 문제: `TOOLING`

제품 결함은 소유 task를 다시 열고 최소 RED test 뒤 shared root cause를 수정한다.
Journey verify 뒤에는 exact target SHA에서 다음을 독립 검토한다.

- `TASK-DETAIL-01`~`TASK-DETAIL-05`, `RES-P1-*`, `RES-E*` trace
- OpenAPI method, path, status, schema와 bearer
- `DEC-AUTH-01`, `DEC-DELETE-01` 보존
- Exact-ID, pending, focus, 200-only redirect와 reconciliation
- 목록·상세·dashboard cache/store 일관성
- Loading, 404, error와 negative state
- Test strength, core E2E 크기, console/network와 unrelated diff
- Evidence, TODO dependency/status와 exact SHA 정합성

HIGH/MEDIUM finding은 수정·재검증하고 새 target을 다시 review한 뒤에만 PASS를
기록한다. Plan과 Journey target이 같을 때만 plan-completion review record를
Journey review로 재사용한다.

## 제외 범위

- Detail query, delete service, cache 또는 fixture flow 재작성
- Task 생성·수정, status UI, optimistic delete와 automatic DELETE retry
- API endpoint, response field, status 또는 error body 추가
- Auth storage, refresh, replay 또는 protected-route 정책 변경
- 새 dependency, generic form/modal/mutation abstraction과 production debug surface
- 상태별 E2E 증식과 screenshot-only pass 판정

## 완료 조건

- 네 view task가 current automatic/browser evidence와 함께 `AI_VERIFIED`다.
- Journey verify가 focused, quick, mapped E2E, named browser와 full evidence를 exact
  target에 연결한다.
- Journey review가 unresolved HIGH/MEDIUM finding 없는 PASS record를 가진다.
- 예상하지 않은 console/network 오류, 관련 없는 diff와 evidence 누락이 없다.
- 사람이 current evidence와 review를 검토할 수 있는 checkpoint 요청 상태다.

이 완료 조건은 `JOURNEY-TASK-DETAIL-01`의 사람 `HUMAN_APPROVED`를 대신하지 않는다.
