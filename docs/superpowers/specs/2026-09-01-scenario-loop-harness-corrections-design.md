# 시나리오 루프 하네스 보강 설계

## 목적

2026-08-31 하네스 리뷰에서 확인한 다섯 결함을 제품 동작, dependency, 인증·삭제
정책을 바꾸지 않고 수정한다. 새 기능과 CI는 추가하지 않는다.

대상은 `QA-HARNESS-01`이며 다음 결과를 만든다.

- 보호 Golden Journey가 sign-in API를 준비 단계로 실행하지 않는다.
- local verification에서 focused test가 전체 suite를 대체할 수 없다.
- TODO의 완료 상태와 dependency가 실제 사람 checkpoint 상태와 일치한다.
- verifier 전체 회귀 suite가 canonical `full`에서 실행된다.
- 구현 이후 실제 독립 review가 수행되고 검토한 commit이 기록된다.

## 승인과 review 기록 원칙

현재 tracked 문서와 공개 artifact에는 네 Golden Journey checkpoint를 승인한 사람의
원문 또는 사람이 직접 기록한 `HUMAN_APPROVED` 상태가 없다. 기존 evidence의
“checkpoint 승인 수신” 문구는 AI가 작성한 2차 주장일 뿐 승인 근거로 사용하지
않는다.

따라서 네 Journey는 `IN_PROGRESS`로 유지하고 근거 없는 승인 수신 문구를 제거한다.
이들의 `HUMAN_APPROVED`에 의존하면서 완료된 `QA-01`과 `QA-02`는 `BLOCKED`로
정정한다. 이후 사람은 실제 승인 시 해당 Journey의 checkbox와 Status를 직접
`HUMAN_APPROVED`로 변경한다. AI는 이 상태를 대신 기록하지 않는다.

과거 review evidence에는 reviewer와 대상 commit이 없으므로 필드만 소급 추가하지
않는다. 이번 구현이 commit된 뒤 최종 변경을 작성하지 않은 독립 reviewer가 실제
diff, 요구사항, 테스트와 evidence를 검토한다. review record는 reviewer 식별자,
작성자와의 관계, 대상 commit SHA, 실제 checks, findings, corrections, rerun과 verdict를
기록한다. finding 수정으로 구현 commit이 바뀌면 수정된 commit을 다시 검토한다.

## 보호 Journey 독립 fixture

`work-overview`, `task-discovery`, `task-resolution`은 `/api/sign-in`을 호출해 인증
상태를 만들지 않는다. Playwright 공통 helper가 각 test의 새 BrowserContext에 다음
인증 fixture를 준비한다.

1. mock auth fixture가 읽는 `sessionStorage` key에 사용할 수 있는 refresh token을
   등록한다.
2. 같은 token을 `/api/refresh` 범위의 HttpOnly cookie로 추가한다.
3. 첫 navigation에서 승인된 refresh bootstrap이 memory access token을 만든다.

이 helper는 test code에만 존재하며 OpenAPI 밖 endpoint나 production API를 추가하지
않는다. 각 Journey는 새 context와 새 storage에서 시작하므로 task/query 상태도 서로
공유하지 않는다. E2E는 sign-in request가 0회였음을 명시적으로 검증한다.

## focused test 차단

로컬 canonical gate도 제출 gate이므로 환경변수에 관계없이 focused test를 거부한다.

- Playwright: `forbidOnly: true`
- Vitest: `allowOnly: false`

현재 test 수나 tag를 하드코딩하지 않는다. 기존 `@core` 네 Journey listing과 실제
실행 검증을 유지한다.

## TODO semantic 검사

기존 marker 검사는 정책 문구 존재 여부만 담당한다. 별도 최소 parser가 `TODO.md`의
task heading, checkbox, Status와 `Depends on` ID를 읽어 다음만 검사한다.

- `[x]`는 `AI_VERIFIED` 또는 `HUMAN_APPROVED`여야 한다.
- `[ ]`는 완료 Status를 가질 수 없다.
- 완료 task가 참조하는 모든 dependency는 완료 상태여야 한다.
- dependency ID는 실제 task block을 가리켜야 한다.
- 미승인 Journey evidence가 checkpoint 승인 수신을 주장할 수 없다.

`IN_PROGRESS`나 `BLOCKED` 작업의 dependency 미완료는 허용한다. 이는 현재
corrective work를 막지 않으면서 완료 상태의 거짓 전이만 차단하는 가장 작은
검사다.

## verifier 회귀 suite

`tests/test_verify_contract.py`의 빠른 계약 검사를 `setup`에 유지한다.
`tests/test_verify.py` 전체 19개 회귀 test는 canonical `full`의 별도 마지막 stage로
추가한다. 이 suite 안의 CLI test가 다시 `full`을 호출할 때는 전용 환경변수로 해당
마지막 stage만 건너뛰어 재귀를 막는다. quick과 setup에는 전체 회귀 suite를 중복
추가하지 않는다.

## 검증 순서

각 변경은 실패 test를 먼저 실행한다.

1. authenticated fixture가 없는 보호 Journey RED
2. local `.only` 차단 config RED
3. TODO 상태/dependency semantic 검사 RED
4. canonical full의 verifier 회귀 stage 계약 RED
5. 최소 구현 후 focused GREEN과 `./scripts/verify quick`
6. 구현 commit 생성
7. 독립 reviewer가 구현 commit을 실제 검토
8. finding이 있으면 수정·검증·새 commit 후 다시 review
9. review evidence 기록 후 최신 HEAD에서 `./scripts/verify full`

Browser evidence는 fresh Vite server에서 네 core Journey의 route, request method와
횟수, console/page error 결과를 기록한다. 과거 screenshot이나 review 결과를 새
근거로 재사용하지 않는다.

## 제외

- GitHub Actions 등 CI 구축
- 새로운 product route, API 또는 test-control endpoint
- 인증·삭제 정책 변경
- 새로운 dependency
- 과거 checkpoint 승인 또는 독립 review의 소급 생성
- 범용 workflow engine이나 별도 approval service
