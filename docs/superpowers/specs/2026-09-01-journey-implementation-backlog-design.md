# Journey 구현 백로그 재설계

## 목적

기존 `TODO.md`가 API·상태 로직의 자동 검증을 화면 구현 완료처럼 보이게 만든
문제를 바로잡는다. 이미 검증된 로직 작업은 이력으로 보존하되, 실제 사용자가
보는 UI와 상호작용을 Journey별 독립 작업으로 추가한다.

이 문서는 accepted behavior, architecture, dependency, 인증 정책 또는 삭제 의미를
바꾸지 않는다. 원본 요구사항과 OpenAPI 계약을 실제 화면으로 완성하기 위한 실행
단위와 상태 전이만 구체화한다.

## 확인된 문제

### 실제 구현 상태

- `src/styles/globals.css`는 색상 token, Pretendard와 최소 base style만 정의한다.
- application component에는 task virtualizer 위치 계산을 제외한 layout/style 적용이
  없다.
- navigation, form, dashboard, profile, task card, detail, modal이 browser 기본
  markup 형태로 노출된다.
- task scroll viewport가 `96px` 고정이라 정상 화면에서도 사실상 한 행만 보인다.
- 현재 component/E2E test는 request, 상태 전이, semantic markup과 overflow를
  검증하지만 제품 화면의 layout, 상태 구분, focus 표시와 실제 scroll 사용성을
  완료 조건으로 삼지 않는다.

따라서 기존 코드는 폐기 대상이 아니라 API·auth·cache·router·validation의
검증된 기반이다. 그러나 네 Golden Journey의 사용자 화면 구현은 완료되지 않았다.

### 기존 TODO 구조의 문제

1. 로직 구현 task와 사용자 화면 구현 task가 분리되지 않았다.
2. Journey 마지막 task가 구현 검증, 독립 review와 사람 checkpoint를 한 항목에
   묶었다.
3. UI task에 route, viewport, visible state와 browser acceptance가 없었다.
4. 모든 open task가 `IN_PROGRESS` 또는 `BLOCKED`여서 새 session이 규약대로
   `NOT_STARTED` task를 선택할 수 없었다.
5. 이미 끝난 자동 검증 evidence가 후속 UI 구현까지 증명하는 것처럼 읽혔다.
6. final QA task가 미완료 dependency보다 먼저 `IN_PROGRESS`가 되어 실행 순서와
   status 의미가 흐려졌다.

## 상태와 이력 정책

- 기존 `[x]` 로직 task는 `AI_VERIFIED` 이력으로 보존한다.
- 기존 evidence는 해당 로직 단위의 baseline일 뿐, 새 UI task의 evidence로
  대체하거나 승계하지 않는다.
- 새 구현·검증·review task는 모두 `[ ]`, `Status: NOT_STARTED`로 추가한다.
- 기존 `JOURNEY-*` 항목은 사람 checkpoint 전용 task로 좁힌다. 새 독립 review가
  완료되기 전에는 `Status: BLOCKED`로 기록한다.
- 미완료 dependency를 가진 `QA-HARNESS-01`, `QA-03`, `QA-04`도 `BLOCKED`로
  바로잡고 이미 수행한 작업은 Evidence에 보존한다.
- AI는 새 task를 `AI_VERIFIED`까지만 변경하고 Journey checkpoint와 최종
  acceptance는 사람이 기록한다.

## 작업 단위 계약

새 TODO task 하나는 한 명의 reviewer가 이웃 task와 독립적으로 승인하거나
거부할 수 있는 사용자 관찰 가능 결과 하나만 소유한다. 모든 task에는 다음 필드를
둔다.

- `Requirements`: 원본 requirement ID
- `Risk`: LOW, MEDIUM 또는 HIGH와 이유
- `Depends on`: 실제 선행 task ID
- `Deliverable`: 사용자가 관찰할 한 결과
- `Acceptance`: route, state, viewport와 interaction의 구체적 기대값
- `Automatic verification`: 가장 낮은 test level의 exact command
- `Browser verification`: 적용 route, `390x844`/`1280x720`, action과 확인 항목
- `Status`: 시작 전 `NOT_STARTED`
- `Evidence`: 시작 전 `없음`; 시작할 때 owner session 기록

파일 생성, CSS 작성, test 추가처럼 서로 따로 완료할 수 없는 절차는 별도 task로
쪼개지 않는다. 한 task 안에서 RED test, 최소 구현, focused rerun과 evidence까지
끝낸다.

## 공통 UI 기반 백로그

### `UI-FOUNDATION-01` 공통 interactive UI와 surface

- Requirements: `SYS-02`, `SYS-03` 및 공통 접근성 invariant
- Depends on: `SCF-05`, `ARCH-02`
- 결과: button, input, card/surface, focus ring과 disabled/error 표현을 기존
  semantic token으로 일관되게 사용할 수 있다.
- 경계: 기존 저장소와 공식 shadcn registry를 먼저 조사한다. 적합한 component가
  새 runtime dependency 없이 현재 요구를 충족하면 사용하고, 그렇지 않으면 native
  element와 기존 Tailwind만으로 필요한 최소 style을 소유한다. dependency 추가는
  별도 HIGH 결정 없이는 하지 않는다.
- 검증: representative component test, color-literal contract, keyboard focus와
  disabled/error의 비색상 정보 확인

### `UI-SHELL-01` 반응형 application shell

- Requirements: `NAV-01`, `NAV-02`, `NAV-03`, `SYS-03`
- Depends on: `UI-FOUNDATION-01`, `AUTH-NAV-01`
- 결과: navigation과 page content가 desktop/mobile에서 실제 application
  layout으로 배치되고 현재 route, hover/focus와 인증 action이 구분된다.
- 검증: 다섯 route router/component test와 `/`, `/sign-in`, `/task`,
  `/task/:id`, `/user` browser sweep

### `UI-STATE-01` 공통 비동기 상태 표현

- Requirements: loading, empty, recoverable error, success 공통 invariant
- Depends on: `UI-FOUNDATION-01`
- 결과: 각 Journey가 재사용할 최소 loading, empty, error/retry 상태 표현이
  semantic role과 실제 layout을 가진다.
- 경계: 단일 구현만 예상되는 generic state framework는 만들지 않는다. 공통
  markup/style이 두 화면 이상에서 실제 반복될 때만 `shared/ui`로 올린다.
- 검증: loading live semantics, alert/retry, empty message의 focused component test

## auth-entry 백로그

### `AUTH-VIEW-01` 로그인 page와 form 화면

- Requirements: `AUTH-01`~`AUTH-05`
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `AUTH-UI-01`
- 결과: form이 읽기 가능한 폭과 hierarchy를 갖고 label, input, inline error,
  submit 상태가 시각·semantic 양쪽에서 구분된다.
- 검증: empty, invalid email, 7/25자 및 non-ASCII password, valid/pending 상태의
  component test와 mobile/desktop keyboard browser check

### `AUTH-ERROR-VIEW-01` 로그인 오류 modal 화면

- Requirements: `AUTH-06`
- Depends on: `AUTH-VIEW-01`, `AUTH-API-01`
- 결과: 400 `errorMessage`가 styled accessible modal에 표시되고 close, Escape,
  focus trap/restore와 mobile overflow가 동작한다.
- 검증: modal component test와 `/sign-in` credential failure browser check

### `AUTH-SESSION-UX-01` 인증 초기화·실패·복귀 화면

- Requirements: `AUTH-07`, `NAV-02`, `NAV-03`
- Depends on: `AUTH-ERROR-VIEW-01`, `AUTH-STATE-01`, `UI-STATE-01`
- 결과: bootstrap loading, recoverable unavailable, anonymous redirect,
  authenticated return route가 빈 화면이나 layout jump 없이 구분된다.
- 검증: auth boundary integration test와 protected direct-entry/reload browser check

### `AUTH-JOURNEY-VERIFY-01` auth-entry 통합 검증

- Depends on: `AUTH-SESSION-UX-01`
- 결과: `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*` case가 focused automatic evidence와
  current-commit browser evidence를 가진다.

### `AUTH-JOURNEY-REVIEW-01` auth-entry 독립 review

- Depends on: `AUTH-JOURNEY-VERIFY-01`
- 결과: fresh reviewer가 exact commit의 요구 누락, auth 경계, 접근성, 테스트
  강도를 검토하고 HIGH/MEDIUM finding이 모두 해결된다.

기존 `JOURNEY-AUTH-01`은 `AUTH-JOURNEY-REVIEW-01` 이후 사람 checkpoint만
기록한다.

## work-overview 백로그

### `DASHBOARD-VIEW-01` dashboard metric 화면

- Requirements: `DASH-01`
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `DASH-01`
- 결과: 세 metric이 label/value 관계를 유지하는 responsive surface로 표시되고
  loading/error/retry/success가 구분된다.

### `PROFILE-VIEW-01` 회원정보 화면

- Requirements: `USER-01`
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `USER-01`
- 결과: name과 memo가 의미 있는 hierarchy와 responsive surface에 표시되고
  loading/error/retry/success가 구분된다.

### `WORK-NAV-RESPONSIVE-01` 인증 후 route navigation 검증

- Requirements: `NAV-01`, `NAV-03`, `SYS-03`
- Depends on: `DASHBOARD-VIEW-01`, `PROFILE-VIEW-01`
- 결과: dashboard, task, profile 이동 중 shell, current route와 content layout이
  mobile/desktop에서 유지된다.

### `WORK-JOURNEY-VERIFY-01` work-overview 통합 검증

- Depends on: `WORK-NAV-RESPONSIVE-01`
- 결과: `WORK-P1-*`, `WORK-E*` case가 current commit evidence를 가진다.

### `WORK-JOURNEY-REVIEW-01` work-overview 독립 review

- Depends on: `WORK-JOURNEY-VERIFY-01`
- 결과: fresh reviewer가 fixture 표시, navigation, font, responsive와 접근성을
  검토하고 HIGH/MEDIUM finding이 모두 해결된다.

기존 `JOURNEY-WORK-01`은 `WORK-JOURNEY-REVIEW-01` 이후 사람 checkpoint만
기록한다.

## task-discovery 백로그

### `TASK-CARD-VIEW-01` task card 화면

- Requirements: `TASK-LIST-02`, `TASK-LIST-05`
- Depends on: `UI-FOUNDATION-01`, `TASK-PAGE-01`
- 결과: title과 memo가 card hierarchy로 표시되고 전체 card action이 명확한
  focus/hover 상태와 exact detail link를 가진다.

### `TASK-LIST-VIRTUAL-UX-01` production scroll viewport

- Requirements: `TASK-LIST-03`
- Depends on: `TASK-CARD-VIEW-01`, `TASK-PAGE-03`
- 결과: `96px` test-shaped viewport를 제거하고 mobile/desktop에서 여러 행을
  탐색할 수 있는 bounded responsive viewport와 안정된 virtual measurement를
  제공한다.

### `TASK-LIST-PAGING-UX-01` 무한 pagination feedback

- Requirements: `TASK-LIST-04`
- Depends on: `TASK-LIST-VIRTUAL-UX-01`, `TASK-PAGE-02`
- 결과: list end의 자동 다음 page 요청, in-flight feedback, page 오류 retry와
  terminal 상태가 scroll 흐름 안에서 구분된다. 접근 가능한 수동 retry/fallback은
  자동 pagination을 대체하지 않는다.

### `TASK-LIST-STATES-01` 목록 초기·빈·오류 화면

- Requirements: `TASK-LIST-01`, `TASK-LIST-04`
- Depends on: `TASK-LIST-PAGING-UX-01`, `UI-STATE-01`
- 결과: initial loading, empty terminal, initial error/retry, partial-page error와
  success가 layout collapse 없이 구분된다.

### `TASK-LIST-JOURNEY-VERIFY-01` task-discovery 통합 검증

- Depends on: `TASK-LIST-STATES-01`
- 결과: `DISC-P1-*`, `DISC-E*` case가 request count, bounded DOM, real scroll와
  navigation evidence를 가진다.

### `TASK-LIST-JOURNEY-REVIEW-01` task-discovery 독립 review

- Depends on: `TASK-LIST-JOURNEY-VERIFY-01`
- 결과: fresh reviewer가 virtualization, pagination race, keyboard/scroll UX와
  test realism을 검토하고 HIGH/MEDIUM finding이 모두 해결된다.

기존 `JOURNEY-TASK-LIST-01`은 `TASK-LIST-JOURNEY-REVIEW-01` 이후 사람
checkpoint만 기록한다.

## task-resolution 백로그

### `TASK-DETAIL-VIEW-01` task 상세 화면

- Requirements: `TASK-DETAIL-01`
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `TASK-DETAIL-01`
- 결과: title, memo와 registerDatetime이 의미 있는 hierarchy와 readable date
  presentation을 가지며 원본 `dateTime` 값을 보존한다.

### `TASK-DETAIL-RECOVERY-VIEW-01` 상세 오류·404 복구 화면

- Requirements: `TASK-DETAIL-02`
- Depends on: `TASK-DETAIL-VIEW-01`
- 결과: 404와 recoverable 일반 오류가 구분되고 각각 목록 복귀 또는 retry action을
  실제 화면에서 제공한다.

### `TASK-DELETE-DIALOG-VIEW-01` 삭제 확인 modal 화면

- Requirements: `TASK-DETAIL-03`, `TASK-DETAIL-04`
- Depends on: `TASK-DETAIL-VIEW-01`, `TASK-DELETE-01`, `UI-FOUNDATION-01`
- 결과: destructive hierarchy, route ID 안내, input, cancel/confirm과 focus lifecycle이
  mobile/desktop에서 명확하다.

### `TASK-DELETE-OUTCOME-VIEW-01` 삭제 진행·실패·복구 화면

- Requirements: `TASK-DETAIL-05`
- Depends on: `TASK-DELETE-DIALOG-VIEW-01`, `TASK-DELETE-02`,
  `TASK-DETAIL-RECOVERY-VIEW-01`
- 결과: pending lock, 404, outcome-unknown recheck, network failure와 200 redirect가
  승인된 삭제 정책대로 구분된다.

### `TASK-DETAIL-JOURNEY-VERIFY-01` task-resolution 통합 검증

- Depends on: `TASK-DELETE-OUTCOME-VIEW-01`
- 결과: `RES-P1-*`, `RES-E*` case가 current commit의 modal, request count, redirect,
  list/detail/dashboard 일관성 evidence를 가진다.

### `TASK-DETAIL-JOURNEY-REVIEW-01` task-resolution 독립 review

- Depends on: `TASK-DETAIL-JOURNEY-VERIFY-01`
- 결과: fresh reviewer가 destructive guard, failure recovery, stale result, cache,
  접근성과 test realism을 검토하고 HIGH/MEDIUM finding이 모두 해결된다.

기존 `JOURNEY-TASK-DETAIL-01`은 `TASK-DETAIL-JOURNEY-REVIEW-01` 이후 사람
checkpoint만 기록한다.

## 통합 QA 보강 백로그

### `QA-CROSS-AUTH-01` Journey 간 인증 전환

- Depends on: 네 Journey의 사람 checkpoint
- 결과: sign-in, reload, protected direct entry, terminal 401과 route recovery가
  Journey 사이에서 stale UI/cache를 남기지 않는다.

### `QA-CROSS-DATA-01` 삭제 후 data 일관성

- Depends on: 네 Journey의 사람 checkpoint
- 결과: 삭제 전후 task list, detail 404와 dashboard metrics가 같은 mock source와
  query lifecycle을 반영한다.

### `QA-RESPONSIVE-A11Y-01` 전체 route 접근성·반응형 sweep

- Depends on: `QA-CROSS-AUTH-01`, `QA-CROSS-DATA-01`
- 결과: 다섯 route와 modal을 `390x844`, `1280x720`, keyboard-only로 확인하고
  clipping, scroll trap, focus loss와 landmark/heading 오류가 없다.

### `QA-CONTRACT-01` OpenAPI·MSW·client 최종 대조

- Depends on: `QA-CROSS-AUTH-01`, `QA-CROSS-DATA-01`
- 결과: 일곱 operation의 method, parameter, auth, success/error schema와 제출 mock이
  current generated contract에 일치한다.

기존 `QA-01`은 네 checkpoint와 위 focused evidence를 모아 requirement 상태를
대조한다. `QA-02`는 `QA-01`, `QA-RESPONSIVE-A11Y-01`, `QA-CONTRACT-01` 이후 전체
독립 review를 수행한다. 나머지 final task는 기존 dependency 순서를 유지한다.

## Journey 실행 루프

각 Journey는 다음 순서를 건너뛰지 않는다.

1. dependency가 완료된 `NOT_STARTED` task 하나를 선택한다.
2. `IN_PROGRESS`로 바꾸고 Evidence에 session owner, target requirement와 시작
   commit을 기록한다.
3. 사용자 관찰 가능 acceptance를 실패시키는 가장 낮은 수준의 focused test를
   먼저 추가하고 RED를 기록한다.
4. 기존 API/auth/cache 로직을 재사용해 최소 UI와 style을 구현한다.
5. focused test와 `./scripts/verify quick`을 실행한다.
6. browser 적용 task는 named `agent-browser` session으로 `390x844`와
   `1280x720`을 확인한다. action 뒤 snapshot을 갱신하고 console, network,
   screenshot을 기록한다.
7. 실패는 하나의 primary class와 root cause, correction, rerun으로 남긴다.
8. task acceptance가 모두 재현될 때만 `AI_VERIFIED`로 닫는다.
9. 모든 Journey implementation task 이후 Journey verify task를 실행한다.
10. exact target commit을 구현하지 않은 fresh reviewer가 review task를 수행한다.
11. HIGH/MEDIUM finding을 해결하고 rerun한 뒤 사람 checkpoint를 요청한다.

Journey E2E는 대표 성공 한 건과 핵심 실패 한 건 이하 원칙을 유지한다. UI 상태
분기와 styling 회귀는 component/integration test로 검증하고 E2E를 페이지별 test
모음으로 늘리지 않는다.

## TODO 전환 결과

이 설계를 반영한 뒤 `TODO.md`는 다음 조건을 만족해야 한다.

- 기존 31개 완료 task와 evidence가 삭제되지 않는다.
- 새 task가 각 Journey 구현과 review 사이의 dependency graph를 완성한다.
- 개발자가 즉시 선택할 수 있는 dependency-resolved `NOT_STARTED` task가 있다.
- 기존 Journey item은 새 review 없이 checkpoint 완료로 전환할 수 없다.
- 미완료 dependency가 있는 final QA item은 `IN_PROGRESS`로 과대 표시되지 않는다.
- phase summary가 “로직 기반 완료, 화면 구현 미완료”를 명시한다.
- `./scripts/verify setup`의 checkbox/status/dependency 검사가 통과한다.

## 제외 범위

- 원본에 없는 기능, 화면 또는 domain field 추가
- 기존 auth와 delete 정책 변경
- production backend와 database
- 새 design system framework 또는 speculative abstraction
- analytics, internationalization, theme toggle, animation system
- UI 완성을 이유로 한 E2E 전면 확대

