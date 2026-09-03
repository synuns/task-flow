# 전체 코드 리뷰 후속 수정 설계

## 목적

전체 코드 리뷰에서 확인한 계약, 반응형 UI, mock 저장 경계, 실행 안정성,
검증 도구와 문서 정합성 문제를 기존 아키텍처와 승인된 정책을 유지한 채
수정한다. 각 변경은 독립적으로 실패를 재현하는 자동 테스트를 먼저 추가하고,
해당 Journey와 전체 검증으로 회귀가 없음을 확인한다.

## 확정 결정

- OpenAPI에서 task ID는 제한 없는 문자열이다.
- `task/A` 같은 ID는 URL에서 `task%2FA`로 인코딩해 단일 raw path segment로
  전달한다.
- `/task/task%2FA`는 보호 경로이며, anonymous 사용자는 `/sign-in`으로 이동한 뒤
  인증 성공 시 원래 상세 경로로 복귀한다.
- 외부 origin, `/sign-in`, 등록되지 않은 경로, 둘 이상의 raw task ID segment는
  기존처럼 안전한 복귀 위치로 인정하지 않는다.
- 새 의존성이나 새 공통 추상화는 추가하지 않는다.

## 작업 단위

### 1. Task 상세 경로와 인증 복귀 계약

`src/app/auth/return-to.ts`가 URL pathname의 route shape를 기준으로 보호 경로를
판정하게 한다. task ID segment는 비어 있지 않아야 하지만 디코딩한 값에 `/`가
들어 있다는 이유로 거부하지 않는다. 경로 생성과 API 요청은 기존
`encodeURIComponent` 사용을 유지한다.

단위 테스트는 `/task/task%2FA`를 보호 경로와 안전한 복귀 위치로 인정하고,
`/task/a/b`, 외부 URL과 malformed URL을 계속 거부하는지 확인한다. Router 통합
테스트는 anonymous 직접 진입이 sign-in으로 이동하고 인증 후 원래 encoded URL로
복귀하는 전체 흐름을 검증한다.

적용 requirement는 `AUTH-07`, `NAV-03`, `TASK-LIST-05`, `TASK-DETAIL-01`이다.

### 2. 긴 계약 문자열의 반응형 표시

상세 title, memo와 삭제 확인 dialog의 task ID에 현재 typography를 유지하면서
긴 공백 없는 문자열을 컨테이너 안에서 줄바꿈하는 CSS만 추가한다. 문자열을
잘라내거나 OpenAPI에 없는 최대 길이를 도입하지 않는다.

컴포넌트 테스트는 긴 문자열용 class 계약을 확인하고, browser Journey는
390×844 viewport에서 `document.scrollWidth === document.documentElement.clientWidth`
이며 삭제 dialog의 ID가 dialog 경계를 넘지 않는지 확인한다.

적용 requirement는 `TASK-DETAIL-01`, `TASK-DETAIL-03`, `TASK-DETAIL-04`이다.

### 3. Mock 저장 데이터의 OpenAPI 정합성

`src/mocks/fixtures/tasks.ts`의 sessionStorage 복원 경계를 강화한다. 저장된 각
task는 정확한 허용 key만 가져야 하고, field 타입과 `status` enum 및
`registerDatetime`의 RFC 3339 유효성을 만족해야 한다. 하나라도 실패하면 부분
데이터를 응답에 섞지 않고 기본 fixture 전체를 사용한다.

추가 key와 잘못된 date-time을 가진 저장 값을 넣는 테스트가 먼저 실패해야 한다.
구현은 이미 설치된 언어·플랫폼 기능만 사용하며 별도 schema 의존성을 추가하지
않는다.

적용 requirement는 `SYS-04`, `TASK-LIST-01`, `TASK-DETAIL-01`이다.

### 4. Bootstrap 실패 복구

MSW worker가 정상 시작한 뒤 React application을 렌더링하는 기존 순서는 유지한다.
동적 import 또는 `worker.start()`가 실패하면 root에 한국어 오류 안내와 재시도
button을 렌더링한다. 재시도는 page reload로 동일한 bootstrap을 다시 수행한다.
보호 API가 준비되지 않은 상태로 본 application을 실행하지 않는다.

테스트 가능한 최소 bootstrap 함수 경계를 두고 성공 시 application mount,
실패 시 오류 UI, 재시도 click 시 reload 요청을 검증한다. 테스트 편의를 위한
production 전용 API는 추가하지 않는다.

적용 requirement는 `SYS-04`이다.

### 5. Read-only 검증과 상태 문서 정합성

architecture contract test의 fixture는 repository `src`가 아니라 OS 임시
directory에서 생성하고 항상 정리한다. 검사 대상 경로를 명시적으로 넘겨 현재
허용·차단 import 판정은 유지한다. 검증 전후 tracked/untracked fingerprint가
동일해야 한다.

`TODO.md`에는 이 후속 작업의 소유 task block을 추가하고 Stage 7 상태를 실제
작업 상태와 맞춘다. 구현과 검증 evidence는 같은 block에 누적하고 사람만
`HUMAN_APPROVED`를 기록한다.

### 6. 범위 안의 확실한 단순화

삭제 dialog에서 읽히지 않는 `triggerRef`를 제거한다. attempt guard의 공개되지
않고 사용되지 않는 `pending()`만 제거하며, stale async completion을 막는 sequence
guard 자체는 유지한다. 이번 수정과 무관한 AI 기록 파이프라인, 생성기 설정,
bundle 분할과 공통 UI primitive는 변경하지 않는다.

## 오류 처리와 데이터 흐름

- URL은 raw pathname의 등록 route 여부를 확인한 뒤 origin, search와 hash를
  보존한다. 인코딩된 ID를 임의로 재인코딩하지 않는다.
- sessionStorage는 신뢰 경계로 취급한다. parsing 또는 validation 실패는 기본
  fixture로 원자적으로 대체한다.
- mock bootstrap 실패는 authentication 상태로 오인하지 않고 application mount
  이전의 별도 복구 화면으로 처리한다.
- 긴 문자열은 표시 계층에서만 줄바꿈하며 API 값은 변경하지 않는다.

## 검증 전략

각 작업 단위는 RED 테스트, 최소 구현, focused GREEN 테스트 순서로 진행한다.
최저 충분 검증 뒤 `./scripts/verify quick`을 실행하고, 관련 Journey의 browser
동작을 확인한다. 모든 구현이 끝나면 plan-completion adversarial review와 한 번의
사람 checkpoint를 거친 뒤 `./scripts/verify full` 및 최종 QA를 수행한다.

핵심 회귀 시나리오는 다음과 같다.

1. anonymous `/task/task%2FA` 직접 진입과 로그인 후 동일 URL 복귀
2. authenticated encoded ID 상세 조회와 삭제 확인
3. 390×844 viewport의 500자 title, memo, ID 표시
4. 추가 key 또는 잘못된 RFC 3339 값을 가진 저장 fixture 복구
5. MSW bootstrap rejection과 재시도
6. architecture contract 검사 전후 repository fingerprint 동일성

## 제외 범위

- OpenAPI 문서 또는 승인된 인증·삭제 정책 변경
- task 문자열 최대 길이 신설 또는 UI 값 생략
- AI session 기록·게시 체계 제거
- 새 validation, state-management, routing 또는 UI dependency 추가
- 측정 근거 없는 bundle splitting과 architecture 재편
