# Golden Journey 통합 시나리오 설계

## 목적

현재 Golden Journey를 과제 원본과 OpenAPI 계약에 대조해 세부 검증하고,
전체 사용자 흐름과 분기를 설명하는 Master Journey와 독립 실행 가능한 네
Journey 시나리오로 재작성한다.

Master Journey는 하나의 거대한 E2E test가 아니다. Journey 사이의 관계와
정책 결정 gate를 설명하는 상위 지도이며, 자동·browser 검증은 각 Journey의
독립 초기 상태와 종료 조건을 기준으로 수행한다.

## 기준과 우선순위

시나리오는 다음 순서로만 동작을 정한다.

1. `assignment-original/openapi.yaml`: API route, method, parameter,
   request·response schema, status, security scheme
2. `assignment-original/requirement.md`: 화면 요소와 사용자 상호작용
3. `docs/quality/requirements.md`: requirement ID, acceptance, evidence 상태

OpenAPI에 없는 endpoint, status별 response, request·response field는 만들지
않는다. Schema를 만족하는 test fixture 값은 사용할 수 있지만 제품 동작이나
domain field로 승격하지 않는다.

원본만으로 하나의 동작을 확정할 수 없는 인증 정책과 삭제 후 상태 일관성은
각각 `DEC-AUTH-01`, `DEC-DELETE-01` 결정 gate로 남긴다. 시나리오가 gate를
대신 결정하지 않는다.

`assignment-original/` 아래 원본 문서는 모두 읽기 전용이다. 시나리오 작업은
원본을 대조 기준으로만 사용하며 해당 directory의 파일을 수정, 이동, 삭제,
재format하지 않는다. 재작성 대상은 추적·검증용 파생 문서인
`docs/quality/requirements.md`뿐이다.

## 현재 Golden Journey 검토 결과

현재 네 Journey는 requirement 묶음, 공통 precondition, action, expected를
제공하지만 다음 정보가 부족하다.

- 전체 사용자 흐름에서 Journey가 연결되는 순서와 정책 gate 위치
- 앞 Journey 실행 결과에 의존하지 않는 독립 초기 상태와 fixture 경계
- 정상 경로와 같은 Journey에서 검증할 핵심 예외 경로
- 각 단계의 사용자 행동, API 계약, 기대 UI, requirement ID 간 trace
- 자동 test와 browser evidence가 각각 증명할 경계
- OpenAPI에 정의된 오류와 제품 문서가 별도 결정해야 하는 오류 UI의 구분

기존 `auth-entry`는 승인되지 않은 refresh·보호 route 정책을 전제로 실행할 수
없다. `work-overview`, `task-discovery`, `task-resolution`은 signed-in을
precondition으로 사용하지만, 다른 Journey를 먼저 실행하지 않고 그 상태를
구성하는 방법이 명시되지 않았다. 삭제 실패 후 modal·cache 동작도 원본과
OpenAPI만으로 확정되지 않았다.

## 문서 구조 결정

`docs/quality/requirements.md`를 requirement와 시나리오의 단일 기준으로
유지한다. 별도 Gherkin file이나 중복 scenario 문서는 만들지 않는다.

Golden Journeys section은 다음 구조로 교체한다.

1. 공통 시나리오 규칙
2. Master Journey
3. 독립 Journey 실행 계약
4. `auth-entry`
5. `work-overview`
6. `task-discovery`
7. `task-resolution`
8. Journey 간 invariant와 evidence 규칙

Requirement checklist의 ID, acceptance, risk, status는 시나리오 재작성만으로
변경하지 않는다. 시나리오가 원본과 checklist의 모순을 발견하면 acceptance를
조용히 바꾸지 않고 `REQUIREMENT` finding과 결정 gate를 기록한다.

## 공통 시나리오 형식

각 독립 Journey는 다음 항목을 가진다.

- **대상:** 포함 requirement ID
- **정책 gate:** 실행 전 필요한 사람 결정과 gate 밖에서 검증 가능한 범위
- **독립 초기 상태:** 다른 Journey 실행 없이 구성할 route, auth state, API
  fixture 상태
- **계약 fixture:** 사용하는 OpenAPI operation, status, schema
- **정상 경로:** 사용자 행동 순서와 단계별 기대 결과
- **핵심 예외 경로:** 같은 초기 상태에서 재설정하거나 별도 case로 독립 실행할
  예외
- **종료 조건:** route, 화면 상태, API 요청 횟수 등 observable result
- **증거 분리:** unit/component/integration/browser 중 각 경계를 증명할 최저 수준

정상·예외 경로의 각 단계는 다음 열을 가진 table row로 작성한다.

| 단계 | Requirement | 사용자 행동 | API 계약 | 기대 결과 | 증거 |
| --- | --- | --- | --- | --- | --- |

API 호출이 없는 client validation, navigation, modal guard 단계는 API 계약을
`없음`으로 명시한다. 계약이 있는데 UI 처리 방식이 미확정이면 기대 결과를
추측하지 않고 결정 gate를 가리킨다.

## Master Journey

Master Journey는 다음 연결만 설명한다.

1. signed-out 사용자가 공통 navigation과 sign-in action을 확인한다.
2. `auth-entry`에서 입력 검증, sign-in 실패, sign-in 성공 경계를 확인한다.
3. `DEC-AUTH-01` 승인 결과에 따라 보호 요청과 authenticated navigation을
   검증한다.
4. 독립 `work-overview`에서 dashboard와 profile data를 확인한다.
5. 독립 `task-discovery`에서 첫 page, card, pagination, virtualization, detail
   이동을 확인한다.
6. 독립 `task-resolution`에서 detail success, 404 recovery, delete confirmation을
   확인한다.
7. `DEC-DELETE-01` 승인 결과에 따라 delete failure·success와 관련 상태
   일관성을 검증한다.

Master Journey에는 test case와 새로운 acceptance를 만들지 않는다. 네 Journey
결과를 연결해 사람이 전체 흐름과 gate를 검토하는 index 역할만 한다.

## 독립 실행 원칙

- 각 Journey는 test별 새 browser context, query cache, MSW fixture state를
  사용한다.
- `work-overview`, `task-discovery`, `task-resolution`은 `auth-entry`를 먼저
  실행하지 않는다. `DEC-AUTH-01`에서 승인한 authenticated state fixture로
  시작한다.
- Journey 안의 예외 case는 앞선 정상 case가 만든 state에 의존하지 않는다.
- task pagination fixture는 `GET /api/task?page=N` 요청과
  `TaskListResponse`만 사용한다.
- 삭제 대상 ID는 route parameter와 OpenAPI `TaskIdPath`의 string이다. 별도
  confirmation token이나 task field를 만들지 않는다.
- test 재실행 순서가 결과를 바꾸지 않도록 fixture state를 case마다 reset한다.

## auth-entry 설계

### 계약 대조

- `POST /api/sign-in` request는 `SignInRequest`의 `email`, `password`만 가진다.
- success는 200 `AuthTokenResponse`다.
- OpenAPI가 정의한 sign-in failure는 400 `ErrorResponse`다.
- `requirement.md`의 non-200 처리는 400 case로 실행 증명한다. OpenAPI에 schema가
  없는 임의 status response를 만들지 않는다.
- `POST /api/refresh`는 refresh cookie security와 200, 400, 401을 정의한다.
  cookie 설정 주체, token 저장, replay, terminal transition은 OpenAPI에 없으므로
  `DEC-AUTH-01` gate다.

### 정상 경로

signed-out `/sign-in`에서 visible label, invalid submit 차단, valid submit의 exact
JSON request, 200 token response까지 검증한다. 200 이후 access-token state,
protected request, refresh/expiry, authenticated navigation은 `DEC-AUTH-01` 승인
후 같은 Journey의 gate 이후 단계로 실행한다.

### 핵심 예외 경로

- 빈 값, invalid email, 7·25자 password, 한글·기호 password
- 400 `ErrorResponse.errorMessage` modal과 close/focus restore
- 승인 이후 refresh 400·401과 protected request 401 처리

마지막 항목의 session 정리와 route 결과는 결정 문서가 정한 결과만 사용한다.

## work-overview 설계

### 계약 대조

- `GET /api/dashboard`: bearer, 200 `DashboardResponse`, 401 `ErrorResponse`
- `GET /api/user`: bearer, 200 `UserResponse`, 401 `ErrorResponse`
- navigation route와 sign-in/profile 상호 배타 조건은 `requirement.md`에 있다.
- signed-out 보호 route 결과는 `DEC-AUTH-01` gate다.

### 정상 경로

승인된 authenticated fixture에서 모든 route의 dashboard/task action, profile
action, distinct icon, dashboard 세 integer, profile `name`·`memo`, Pretendard와
mobile/desktop navigation을 독립적으로 검증한다.

### 핵심 예외 경로

Dashboard와 user의 401은 OpenAPI 계약 case로 포함한다. 표시, session transition,
이동 결과는 `DEC-AUTH-01`이 승인한 동작과 대조한다. OpenAPI에 없는 임의 500
response나 error field는 추가하지 않는다.

## task-discovery 설계

### 계약 대조

- `GET /api/task`는 bearer와 필수 integer query `page >= 1`을 사용한다.
- 200은 `TaskListResponse { data, hasNext }`, 401은 `ErrorResponse`다.
- card는 `TaskItem`의 `id`, `title`, `memo`, `status` 중 원본이 요구한
  `title`·`memo`를 표시하고 `id`를 detail navigation에 사용한다.
- 화면에 `status`를 표시하는 요구는 없으므로 시나리오가 추가하지 않는다.

### 정상 경로

page 1부터 시작해 card content와 detail route를 확인한다. `hasNext: true`인
page에서 list end가 관찰될 때 다음 page를 한 번 요청하고,
`hasNext: false`에서 중단한다. fetched item이 늘어도 mounted row가 viewport
주변으로 제한되는지 확인한다.

### 핵심 예외 경로

- 200의 빈 `data`와 `hasNext: false`
- pagination 도중 401 `ErrorResponse`
- 중복 end trigger와 `hasNext: false` 이후 추가 요청 차단

401 이후 auth와 route 결과는 `DEC-AUTH-01` gate를 따른다. OpenAPI에 없는
network/500 response body를 fixture로 만들지 않는다.

## task-resolution 설계

### 계약 대조

- `GET /api/task/{id}`: bearer, 200 `TaskDetailResponse`, 401·404
  `ErrorResponse`
- `DELETE /api/task/{id}`: bearer, 200 `DeleteTaskResponse`, 401·404
  `ErrorResponse`
- detail 화면은 `title`, `memo`, `registerDatetime`만 계약 data로 사용한다.
- exact ID guard와 success 후 `/task` 이동은 `requirement.md`에 있다.
- 실패 UI, modal close, 중복 submit, cache·dashboard 일관성은
  `DEC-DELETE-01` gate다.

### 정상 경로

기존 ID detail의 세 field를 확인하고 delete modal을 연다. wrong, whitespace,
case-different 입력에서는 submit이 disabled이고 route ID exact match에서만
enabled인지 확인한다. 승인된 삭제 정책 아래 exact route ID로 DELETE를 한 번
보내고 200 `{ success: true }`에서 `/task`로 이동한다.

### 핵심 예외 경로

- GET 404 `errorMessage`, resource-missing 화면, `/task` 복구 action
- DELETE 전 wrong ID에서 request 0회
- DELETE 401·404 `ErrorResponse`
- in-flight 중복 submit과 modal close

DELETE 오류 표시·modal 상태·cache 결과는 `DEC-DELETE-01` 승인 전에는 실행
기대값을 확정하지 않는다. 삭제 200에서만 redirect한다는 invariant는 유지한다.

## evidence와 test 분리

- unit: sign-in validation boundary, exact ID equality, pagination 계산
- component: label/error association, enabled state, modal focus와 reset, card field
- integration: exact API request, OpenAPI response별 view state, request count,
  router transition, auth header와 승인된 refresh, cache transition
- browser: navigation, keyboard interaction, modal focus lifecycle, font,
  responsive, virtual scroll와 실제 network sequence

각 Journey의 browser evidence는 route, viewport, independent precondition,
actions, expected/actual, console/network, screenshot/trace, failure class,
correction, rerun을 기록한다. 낮은 수준에서 증명된 validation table이나 request
mapping을 E2E에서 반복하지 않는다.

Core E2E는 Journey마다 대표 success 하나와 critical failure 하나 이하를
유지한다. Master Journey용 E2E는 만들지 않는다.

## 변경 대상

- `docs/quality/requirements.md`: Golden Journeys section을 위 구조로 재작성
- `TODO.md`: scenario 작업의 상태·evidence와 영향받는 Journey task reference
  갱신
- `docs/project-plan.md`: 기존 Golden Journey 정의와 새 시나리오가 충돌할 때만
  최소 link 또는 용어를 갱신
- `docs/quality/workflow.md`, `docs/quality/verification.md`: 현재 evidence와
  독립 Journey 규칙이 새 시나리오를 충분히 지원하므로 원칙적으로 변경하지
  않음

## 검증

1. 네 Journey의 모든 requirement ID가 최소 한 번 trace된다.
2. 모든 API 단계가 OpenAPI operation, status, schema에 대응한다.
3. OpenAPI에 없는 endpoint, field, status response가 없다.
4. 인증·삭제 미확정 동작은 해당 결정 gate를 가리킨다.
5. 네 Journey에 정상 경로와 최소 한 개의 핵심 예외 경로가 있다.
6. 각 Journey가 다른 Journey 실행 없이 초기 상태를 구성할 수 있다.
7. Master Journey가 별도 E2E case를 요구하지 않는다.
8. Requirement checklist의 acceptance와 status를 근거 없이 바꾸지 않는다.
9. `./scripts/verify setup`과 `git diff --check`가 통과한다.

## 완료 조건

- Master Journey와 네 독립 Journey가 `docs/quality/requirements.md`에서 단일
  시나리오 기준으로 읽힌다.
- 각 Journey의 정상·핵심 예외 경로가 requirement와 OpenAPI에 trace된다.
- 정책 미확정 행동은 명시적 결정 gate로 남는다.
- 시나리오만 읽고도 독립 test의 초기 상태, 행동, observable 종료 조건,
  evidence 수준을 결정할 수 있다.
- 새 제품 동작, API data, dependency, architecture를 만들지 않는다.
