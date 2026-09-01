# Work Overview Journey 전체 루프 설계

## 목적

`work-overview` Journey를 현재 구현을 폐기하거나 다시 만드는 작업이 아니라,
승인된 화면과 API 계약에 대한 gap을 찾고 필요한 부분만 교정한 뒤 current commit의
evidence, 독립 review와 사람 checkpoint까지 연결하는 실행 루프로 정의한다.

이 문서는 accepted behavior, 인증 정책, API schema, architecture, dependency를
바꾸지 않는다. 기존 `DashboardSummary`, `UserProfile`, `AppShell`, API client,
TanStack Query와 auth boundary를 baseline으로 재사용한다.

## 기준 문서와 우선순위

충돌 시 다음 순서를 적용한다.

1. `assignment-original/openapi.yaml`: endpoint, method, security, status와 schema
2. `assignment-original/requirement.md`: dashboard, 회원정보와 navigation 화면 동작
3. `docs/quality/requirements.md`: requirement ID와 Golden Journey acceptance
4. `docs/project-plan.md`: 범위, architecture, 인증 정책과 검증 전략
5. `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`: 승인된 Focus
   workspace 화면과 responsive 상태
6. 이 문서: `work-overview`의 gap-first 구현·검증·review 순서
7. `TODO.md`: task 상태, dependency, owner와 evidence

하위 문서는 상위 계약을 확장하거나 완화하지 않는다. 충돌이 발견되면
`REQUIREMENT` 실패로 기록하고 동작을 임의로 선택하지 않는다.

## 승인된 방향

사용자는 2026-09-01 다음 방향을 섹션별로 승인했다.

- 현재 UI와 test를 baseline으로 사용하는 gap-first 접근
- `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01` 범위
- `/`, `/user`와 navigation 확인을 위한 `/task` route
- 기존 module과 auth/query/API data flow 유지
- 상태 분기는 낮은 수준 test, routing·bearer·viewport는 browser evidence로 증명
- exact target SHA 독립 review 뒤 사람 checkpoint 요청

## 요구사항과 Journey 경계

| Requirement | 관찰 가능한 결과 | 주 evidence |
| --- | --- | --- |
| `SYS-03` | application computed font가 Pretendard다. | contract + browser |
| `NAV-01` | dashboard/task action이 항상 보이고 서로 다른 icon으로 `/`, `/task`에 이동한다. | integration + browser |
| `NAV-03` | authenticated 상태에서는 sign-in 대신 profile action 하나가 `/user`로 이동한다. | auth/router integration + browser |
| `DASH-01` | `/`가 dashboard response의 전체·남은·완료 수를 정확히 표시한다. | component/integration + browser |
| `USER-01` | `/user`가 user response의 name과 memo를 정확히 표시한다. | component/integration + browser |

독립 초기 상태는 승인된 authenticated fixture, fresh QueryClient와 reset task store다.
`work-overview`는 sign-in Journey를 선행 실행하지 않으며 `/api/sign-in` 요청을 만들지
않는다.

## OpenAPI 계약

### Dashboard

- Request: bearer가 필요한 `GET /api/dashboard`
- `200`: additional property 없는 `DashboardResponse`
  - required integer `numOfTask`
  - required integer `numOfRestTask`
  - required integer `numOfDoneTask`
- `401`: required string `errorMessage`를 가진 `ErrorResponse`

화면은 세 원본 필드를 label/value 관계로 모두 표시한다. completion 문장과 rail은
표현일 뿐 response field나 새로운 domain 상태가 아니다.

### User

- Request: bearer가 필요한 `GET /api/user`
- `200`: additional property 없는 `UserResponse`
  - required string `name`
  - required string `memo`
- `401`: required string `errorMessage`를 가진 `ErrorResponse`

avatar, email, role, 연락처, edit와 logout field 또는 action을 추가하지 않는다.
OpenAPI에 없는 500 response body나 error field도 만들지 않는다.

## 화면 기획 계약

### Application shell

- 768px 이상은 224px sidebar, 767px 이하는 bottom navigation을 사용한다.
- dashboard, task action은 항상 보인다.
- authenticated 상태에서는 profile action만 보이고 sign-in action은 보이지 않는다.
- 세 action은 서로 다른 Lucide icon과 visible label을 가진다.
- current route는 `aria-current="page"`와 color 이외의 indicator로도 전달한다.
- mobile action은 최소 48px이고 content를 가리지 않는다.

### Dashboard

- metric card 세 개가 아니라 하나의 summary Card를 유지한다.
- eyebrow, 현황 문장, 완료 text와 rail, 세 metric `dl` 순서로 표시한다.
- total이 0이면 `등록된 할 일이 없습니다`를 표시하고 세 값과 rail은 0을 유지한다.
- loading은 final geometry를 예약하는 Skeleton, recoverable error는 message와 retry를
  같은 Alert에 둔다.

### Profile

- `회원정보` heading 아래 하나의 조용한 description Card를 유지한다.
- name과 memo는 `dl`의 label/value 관계로 표시한다.
- multiline memo를 보존한다.
- loading은 같은 geometry의 Skeleton, recoverable error는 Alert와 retry를 사용한다.

## 현재 baseline

다음 구현은 교체 대상이 아니다.

- `src/widgets/dashboard-summary/index.tsx`: dashboard query와 상태별 summary rendering
- `src/widgets/user-profile/index.tsx`: user query와 상태별 description rendering
- `src/widgets/app-shell/index.tsx`: auth-aware desktop/mobile navigation
- `src/pages/dashboard/index.tsx`, `src/pages/user/index.tsx`: route composition
- `src/shared/api/dashboard.ts`, `src/shared/api/user.ts`: generated type 기반 runtime guard
- `src/app/router.tsx`, `src/app/auth/*`: 보호 route와 승인된 auth transition
- `e2e/work-overview.spec.ts`: authenticated success, bearer, navigation와 viewport 경계

기존 `docs/quality/evidence/work-overview.md`는 과거 commit의 baseline이다. 새 Journey
verify는 그 결론을 current target의 증거로 승계하지 않고 재현 가능한 명령과 browser
record를 새로 기록한다.

## Architecture와 data flow

```text
approved authenticated fixture
  → AuthRouteBoundary
  → AppShell + route Outlet
  → DashboardSummary 또는 UserProfile
  → TanStack Query
  → injected ApiClient
  → bearer GET /api/dashboard 또는 GET /api/user
  → generated contract runtime guard
  → loading | recoverable error | success rendering
```

- Page는 route composition만 담당한다.
- Widget은 query와 사용자 관찰 상태를 소유한다.
- AppShell은 navigation layout과 auth action 표시만 소유한다.
- server state를 local state로 복제하지 않는다.
- token, refresh와 protected cache 제거는 기존 auth/API adapter만 수행한다.
- 401은 승인된 single-flight refresh, 최대 한 번 replay와 terminal session 전환을
  그대로 사용한다.

## Task 경계와 dependency

### `DASHBOARD-VIEW-01`

- 입력: 기존 dashboard API/query/widget와 공통 shell/state UI
- 소유: loading, error/retry, zero-data, success metric presentation
- 출력: dashboard view acceptance와 current commit evidence
- 비소유: API, auth, task fixture 의미와 navigation layout

### `PROFILE-VIEW-01`

- 입력: 기존 user API/query/widget와 공통 shell/state UI
- 소유: loading, error/retry, name/memo success presentation
- 출력: profile view acceptance와 current commit evidence
- 비소유: API, auth와 navigation layout

두 view task는 서로 독립적이다. 작업 원장은 한 session이 한 task만 소유하게 하며
각각 완료된 뒤 `WORK-NAV-RESPONSIVE-01`로 합류한다.

### `WORK-NAV-RESPONSIVE-01`

- 입력: 완료된 dashboard/profile view
- 소유: `/` → `/user` → `/task` → `/` route 이동, current route, keyboard,
  Pretendard와 두 viewport layout
- 비소유: 각 화면의 domain rendering과 API payload

### `WORK-JOURNEY-VERIFY-01`

- 입력: 세 implementation task의 current target
- 소유: focused tests, quick, mapped Playwright와 named agent-browser evidence 통합
- 출력: `WORK-P1-*`, `WORK-E1` trace와 exact target SHA
- production 변경은 소유하지 않는다. 실패하면 root cause를 소유한 task를 다시 연다.

### `WORK-JOURNEY-REVIEW-01`

- 입력: verify target과 evidence
- 소유: final author와 분리된 fresh reviewer의 adversarial review
- 출력: HIGH/MEDIUM finding이 해결된 PASS 또는 BLOCKED record

### `JOURNEY-WORK-01`

- 입력: PASS review와 current evidence
- 소유: 사람 checkpoint 기록만 담당한다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.

## Acceptance와 test 수준

### Dashboard matrix

| State | Expected | Lowest sufficient evidence |
| --- | --- | --- |
| loading | text status와 final geometry를 예약하는 Skeleton | component |
| recoverable error | 구체적 message, retry Button, retry 후 success | component/integration |
| zero success | empty 설명, 세 값 0, rail 0 | component |
| success | fixture `3/2/1`, label/value, completion text와 rail | component + browser |
| request boundary | bearer `GET /api/dashboard`, response guard | integration + browser network |

### Profile matrix

| State | Expected | Lowest sufficient evidence |
| --- | --- | --- |
| loading | text status와 description geometry Skeleton | component |
| recoverable error | 구체적 message, retry Button, retry 후 success | component/integration |
| success | fixture name/memo, `dl` 관계와 multiline memo | component + browser |
| request boundary | bearer `GET /api/user`, response guard | integration + browser network |

### Navigation matrix

| Boundary | Expected | Evidence |
| --- | --- | --- |
| route | `/` → `/user` → `/task` → `/`와 정확한 `aria-current` | integration + browser |
| auth action | profile만 하나 존재하고 sign-in은 없음 | integration + browser |
| desktop | 1280×720 sidebar, content clipping 없음 | browser |
| mobile | 390×844 bottom navigation, 48px target, overlap·horizontal overflow 없음 | browser |
| keyboard/font | 모든 action 실행 가능, computed Pretendard | component + browser |

`WORK-E1`의 401 refresh·terminal transition은 기존 auth integration evidence를 같은
target에서 재실행한다. 실제 route 결과가 증명되지 않는 gap이 있을 때만 app boundary
integration test를 추가한다. 페이지별 401 E2E를 중복 만들지 않는다.

## Gap-first 실행 규칙

각 implementation task는 다음 순서를 따른다.

1. dependency가 완료된 `NOT_STARTED` task 하나를 선택한다.
2. `IN_PROGRESS`로 바꾸고 owner, requirement와 start commit을 기록한다.
3. requirement, route, API path와 symbol을 requirements, TODO, source, test, E2E에서
   검색한다.
4. current behavior와 acceptance matrix를 대조한다.
5. 실제 gap이 있으면 가장 낮은 test를 작성해 예상한 이유의 RED를 확인한다.
6. gap을 통과시키는 최소 production 변경만 하고 focused GREEN을 확인한다.
7. gap이 없으면 억지 RED, duplicate test와 production 변경을 만들지 않는다.
8. focused suite와 `./scripts/verify quick`을 실행한다.
9. 적용 가능한 browser behavior와 evidence를 기록한다.
10. 실패를 분류하고 root cause를 교정한 뒤 같은 gate를 재실행한다.
11. acceptance가 current commit에서 재현될 때만 `AI_VERIFIED`로 닫는다.

RED는 production behavior를 변경할 때 필수다. 이미 존재하고 현재 test로 충분히
증명되는 behavior를 다시 깨거나 assertion을 복제해 RED를 조작하지 않는다.

## Browser와 Journey evidence

Named agent-browser session은 task ID를 사용하고 다음을 기록한다.

- route와 `1280×720`, `390×844` viewport
- authenticated fixture, fresh query와 reset task state
- navigation action과 매 DOM 변화 뒤 새 snapshot
- visible fixture 값, current route, keyboard, font와 clipping
- `/api/dashboard`, `/api/user` method·횟수·bearer 적용
- console과 page error
- screenshot 또는 trace 경로
- expected/actual, failure class, correction과 rerun verdict

Loading과 recoverable error 분기는 component/integration test가 우선한다. browser에서
상태를 강제할 때 production debug route나 비계약 API를 추가하지 않는다. 기존 browser
또는 test network interception으로 결정적으로 재현할 수 없으면 제품 pass로 기록하지
않고 `TOOLING` 또는 `ENVIRONMENT` 실패로 남긴다.

Mapped `e2e/work-overview.spec.ts`는 대표 success 한 건을 유지한다. 새 E2E는 integration
경계로 증명할 수 없는 browser-only critical failure가 확인될 때만 한 건까지 추가한다.

## 실패 처리

- payload, status 또는 security 불일치: `REQUIREMENT` 또는 `INTEGRATION`
- component state, value 또는 retry 결함: `IMPLEMENTATION`
- navigation, bearer, cache 또는 route transition 결함: `INTEGRATION`
- keyboard, focus, clipping, touch target 또는 상태 전달 결함: `UX_ACCESSIBILITY`
- weak, duplicate 또는 flaky assertion: `TEST`
- browser/server/runtime 문제: `ENVIRONMENT`
- verify, formatter 또는 runner 문제: `TOOLING`

동작 변경이나 requirement 충돌은 HIGH-risk 사람 결정 전 구현하지 않는다. 그 외
failure는 한 primary class, root cause, correction과 rerun을 evidence에 남긴다.

## Review와 exit gate

Journey verify 뒤 exact target SHA를 구현하지 않은 fresh reviewer가 다음을 확인한다.

- 다섯 requirement와 `WORK-P1-1`~`WORK-P1-4`, `WORK-E1` 누락
- OpenAPI 200/401, bearer와 field 정합성
- auth action 상호 배타성과 protected cache/session transition
- loading/error/retry/zero/success 상태 구분
- semantic HTML, keyboard, current route, font와 responsive layout
- weak·duplicate test, console/network 오류, unrelated diff와 evidence 완전성
- TODO checkbox/status/dependency와 target SHA 일치

HIGH/MEDIUM finding을 수정하고 관련 gate를 재실행한다. Verdict가 PASS 또는
PASS_WITH_LOW이고 current evidence가 완전할 때만 사람에게 `JOURNEY-WORK-01`
checkpoint를 요청한다.

## 제외 범위

- dashboard/profile 재작성 또는 새로운 view abstraction
- API endpoint, response field, status와 fixture behavior 추가
- auth storage, refresh, replay, route 정책 변경
- 새 dependency, design system, analytics와 production backend
- avatar, edit, logout, search, filter와 원본에 없는 action
- browser 상태 제어를 위한 production debug surface
- E2E를 상태별 페이지 test 모음으로 확대

## 완료 조건

- `DASHBOARD-VIEW-01`, `PROFILE-VIEW-01`, `WORK-NAV-RESPONSIVE-01`이 current commit
  automatic/browser evidence와 함께 `AI_VERIFIED`다.
- `WORK-JOURNEY-VERIFY-01`이 focused, quick, mapped E2E와 named browser record를 가진다.
- `WORK-JOURNEY-REVIEW-01`이 exact target의 독립 PASS record를 가진다.
- unresolved HIGH/MEDIUM finding, 예상하지 않은 console/network 오류와 관련 없는
  diff가 없다.
- 사람이 evidence를 검토할 수 있는 checkpoint 요청 상태다.

이 완료 조건은 `JOURNEY-WORK-01`의 사람 `HUMAN_APPROVED`를 대신하지 않는다.
