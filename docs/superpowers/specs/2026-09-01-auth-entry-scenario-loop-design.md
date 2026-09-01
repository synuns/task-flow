# auth-entry 시나리오 세분 실행 설계

## 목적

`auth-entry` Journey를 사용자 관찰 가능 결과 하나씩 구현하고 검증한다. 현재
저장소에 이미 존재하는 로그인·인증 동작과 화면을 먼저 characterization하고,
acceptance 공백이 확인된 경우에만 가장 작은 production 변경을 추가한다.

이 설계는 인증 정책, API 계약, route 결과, dependency와 architecture를 바꾸지
않는다. `DEC-AUTH-01`, `docs/quality/requirements.md`와 `TODO.md`의 task 순서를
실행 가능한 작은 단계로 구체화한다.

## 범위

대상 requirement와 시나리오는 다음과 같다.

- `NAV-02`, `NAV-03`
- `AUTH-01`~`AUTH-07`
- `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`
- `/sign-in`, 보호 route 직접 진입과 승인된 복귀 route

대상 TODO 순서는 바꾸지 않는다.

1. `AUTH-VIEW-01`
2. `AUTH-ERROR-VIEW-01`
3. `AUTH-SESSION-UX-01`
4. `AUTH-JOURNEY-VERIFY-01`
5. `AUTH-JOURNEY-REVIEW-01`
6. `JOURNEY-AUTH-01` 사람 checkpoint

## 실행 원칙

### 한 번에 하나의 task block

한 session은 dependency가 해소된 TODO task 하나만 소유한다. 시작할 때 해당
block을 `IN_PROGRESS`로 바꾸고 session, 시작 commit, requirement를 Evidence에
기록한다. 다음 task는 현재 task가 `AI_VERIFIED`가 된 뒤 선택한다.

Test 작성, production 수정, browser QA와 evidence 기록은 하나의 사용자 결과를
증명하는 절차이므로 별도 TODO block으로 만들지 않는다. 구현 계획에서는 각 절차를
독립 실행·재현 가능한 step으로 나눈다.

### Characterization 우선

현재 Focus workspace 구현이 acceptance를 이미 만족할 수 있다. 각 task의 첫
단계에서 기존 code, test와 browser behavior를 확인한다.

- Acceptance와 자동·browser evidence가 모두 현재 commit에서 재현되면 production
  code를 변경하지 않는다.
- Behavior는 존재하지만 회귀 검증이 빠졌으면 가장 낮은 수준의 test만 보강한다.
- Behavior가 없거나 잘못되었으면 그 공백을 재현하는 test를 먼저 실패시킨 뒤 최소
  production code로 통과시킨다.
- 기존 test가 처음부터 통과한 결과를 RED evidence로 기록하지 않는다.

### 검증 사다리

각 production 변경은 아래 순서를 지킨다.

1. acceptance 한 가지를 표현하는 focused test의 예상 실패를 확인한다.
2. 최소 production 변경으로 focused test를 통과시킨다.
3. 같은 file 또는 경계의 인접 test를 실행한다.
4. `./scripts/verify quick`을 실행한다.
5. 해당 task의 browser acceptance만 named `agent-browser` session으로 확인한다.
6. failure class, root cause, correction과 rerun을 Evidence에 기록한다.

`AUTH-JOURNEY-VERIFY-01`에서만 auth-entry 전체 focused suite와 mapped Playwright
Journey를 한 번에 실행한다. 각 UI task에서 core E2E를 반복하지 않는다.

## `AUTH-VIEW-01` 세분 단위

### A1. 기존 form 계약 확인

- `SignInPage`의 heading, 설명과 readable form width를 확인한다.
- Email/password visible label과 programmatic association을 확인한다.
- Password 도움말과 validation message가 input description에 연결되는지 확인한다.
- 기존 `SignInForm`과 shared `Button`, `Input`, `Label`, `Card`를 재사용한다.

자동 검증은 `src/features/sign-in/ui/sign-in-form.test.tsx`의 component boundary를
사용한다. class나 pixel 대신 accessible name, description과 disabled state를
검사한다.

### A2. invalid 입력 matrix

다음 입력을 서로 독립된 case로 검증한다.

| Field | Case | Expected |
| --- | --- | --- |
| Email | empty | required error, submit disabled |
| Email | invalid syntax | email error, submit disabled |
| Password | empty | required error, submit disabled |
| Password | 7 characters | length error, submit disabled |
| Password | 25 characters | length error, submit disabled |
| Password | Korean or symbol | ASCII alphanumeric error, submit disabled |

기존 schema와 `validationMessage` 경계를 재사용한다. 같은 규칙을 UI component에
복제하지 않는다.

### A3. valid와 pending 상태

- Valid email과 8~24자 ASCII alphanumeric password에서만 submit이 활성화된다.
- Submit 한 번은 sign-in request 한 번만 만든다.
- Pending 중 button은 disabled이고 `로그인 중` text를 표시한다.
- Pending 해제 뒤 현재 인증 callback 계약을 유지한다.

Request body와 token response의 상세 계약은 기존 `AUTH-API-01` evidence를
재사용하되, current task test는 visible submit state와 duplicate action guard만
소유한다.

### A4. task browser 확인

`auth-view-01` named session으로 `/sign-in`을 확인한다.

- `390x844`: keyboard tab order, invalid/valid/pending, horizontal clipping
- `1280x720`: hierarchy, readable form width, keyboard focus
- Console/page error와 `/api/sign-in` method·횟수
- 각 DOM 변화 뒤 새 snapshot과 최종 screenshot

Browser에서 deterministic pending 상태를 만들 수 없다면 component integration
test가 pending을 증명하고 browser는 invalid/valid와 layout만 확인한다. 임의 delay를
제품 code에 추가하지 않는다.

### A5. 종료 gate

Focused component test, `./scripts/verify quick`과 A4 evidence가 모두 통과하면
`AUTH-VIEW-01`을 `AI_VERIFIED`로 갱신한다. Evidence에는 RED 또는 기존 behavior
characterization, correction 유무, 명령 결과, browser session과 commit을 기록한다.

## `AUTH-ERROR-VIEW-01` 세분 단위

### B1. API error 표시

- Valid submit의 OpenAPI 400 `ErrorResponse.errorMessage`를 dialog에 표시한다.
- 임의 status나 response field를 추가하지 않는다.
- Dialog accessible name과 alert message를 확인한다.

### B2. focus lifecycle

- Open 뒤 초기 focus가 dialog의 `닫기`에 있다.
- Tab 이동은 dialog 안에 머문다.
- `닫기`와 Escape가 dialog를 닫는다.
- 닫힌 뒤 focus가 sign-in submit으로 복귀한다.

### B3. browser와 network

`auth-error-view-01` session에서 두 viewport의 overflow, keyboard close/Escape,
`POST /api/sign-in` 400과 request count, 예상 console/page error를 기록한다.

Focused component test, quick와 browser evidence 뒤 task를 `AI_VERIFIED`로 닫는다.

## `AUTH-SESSION-UX-01` 세분 단위

### C1. bootstrap 상태

- Auth 초기화 중 shell과 visible progress가 유지된다.
- 보호 content나 stale authenticated action을 먼저 노출하지 않는다.

### C2. 복구 가능한 초기화 실패

- Refresh를 처리할 수 없는 환경 오류는 빈 화면이 아닌 error와 retry action으로
  표시한다.
- OpenAPI 401 terminal 결과와 환경·network failure를 같은 상태로 위장하지 않는다.

### C3. 보호 route 복귀

- Fresh anonymous context가 `/task/task-1`에 직접 진입하면 `/sign-in`으로 이동한다.
- Valid sign-in 뒤 승인된 same-origin return route로 복귀한다.
- 외부, malformed, `/sign-in` return candidate는 `/`로 정규화한다.

### C4. refresh-cookie reload

- Reload는 승인된 cookie-secured `POST /api/refresh`를 사용한다.
- 성공하면 기존 route와 profile action을 유지한다.
- Terminal failure는 승인된 session 종료와 route 결과를 따른다.

자동 검증은 auth provider, route boundary와 router integration test로 나눈다.
`auth-session-ux-01` browser session은 direct entry, sign-in return과 reload만
확인하고 bearer replay·stale generation 세부사항은 기존 focused integration
boundary에서 증명한다.

## Journey 통합 검증

`AUTH-JOURNEY-VERIFY-01`은 구현을 추가하지 않고 current target의 evidence를
통합한다.

1. Sign-in component와 auth provider·route boundary·authenticated request focused
   suite를 실행한다.
2. `./scripts/verify quick`을 실행한다.
3. `pnpm exec playwright test e2e/auth-entry.spec.ts`를 실행한다.
4. Named `agent-browser` session에서 invalid, 400 modal, success, direct entry와
   reload를 두 viewport로 확인한다.
5. `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*` 각각을 가장 낮은 evidence와 연결한다.
6. Expected console/network status와 실제 결과를 구분해 기록한다.

이 단계는 이미 낮은 수준에서 증명된 password matrix, refresh race 또는 stale
generation case를 E2E에 복제하지 않는다.

## 독립 review와 checkpoint

`AUTH-JOURNEY-REVIEW-01`은 구현 target commit을 작성하지 않은 fresh reviewer가
다음을 확인한다.

- requirement와 scenario case 누락
- auth storage, refresh, replay와 return-route 정책 회귀
- validation, dialog와 session negative path
- keyboard, focus, responsive와 접근성
- weak·duplicate·implementation-detail test
- console/network 분류와 evidence 재현성
- unrelated diff, TODO dependency와 status 일관성

HIGH/MEDIUM finding을 수정하고 같은 gate를 재실행한 뒤 review record의 일곱 필드를
완성한다. 그 다음 사람에게 `JOURNEY-AUTH-01` checkpoint를 한 번 요청한다. AI는
`HUMAN_APPROVED`를 기록하지 않으며, 승인 전에는 `work-overview` Journey 구현을
시작하지 않는다.

## 제외 범위

- 인증 정책, token 저장, refresh 횟수와 route 의미 변경
- 새로운 form, modal, auth abstraction 또는 dependency
- 기존 shadcn primitive 대체
- Sign-up, logout, password recovery와 원본에 없는 상태
- auth-entry 낮은 수준 test를 반복하는 E2E 추가
- 다른 Journey의 UI, TODO block 또는 evidence 변경
