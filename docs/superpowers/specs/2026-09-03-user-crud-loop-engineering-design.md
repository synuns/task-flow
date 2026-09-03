# User CRUD Journey 루프 엔지니어링 설계

## 목적

승인된 User CRUD 제품 설계를 한 번에 검증 가능한 작업 단위로 실행하고, 각 단위의
실패를 분류·교정한 뒤 자동 검증, browser evidence, 적대적 review와 사람
checkpoint까지 끊김 없이 연결한다.

제품 동작은 이 문서가 새로 정하지 않는다. 다음 두 문서가 제품 및 구현 계약이다.

- `docs/superpowers/specs/2026-09-03-user-task-crud-journeys-design.md`
- `docs/superpowers/plans/2026-09-03-user-crud-journey.md`

## 루프 상태

```text
task claim
  → Journey lookup
  → 가장 낮은 수준의 RED
  → 최소 GREEN
  → focused verification
  → pnpm verify quick
  → 적용 가능한 browser probe
  → evidence와 commit
  → 다음 dependency 해제
```

마지막 구현 task 이후에는 다음 종료 루프를 한 번만 실행한다.

```text
focused regression
  → quick
  → user-crud core E2E
  → named browser QA
  → full
  → plan-completion adversarial review
  → 사람 checkpoint 요청
```

## 작업 dependency

| 순서 | TODO task | 산출물과 해제 조건 |
| --- | --- | --- |
| 0 | `USER-CRUD-LOOP-DESIGN-01` | 이 루프, granular backlog와 verifier owner가 검증됨 |
| 1 | `USER-CRUD-CONTRACT-01` | extension OpenAPI, generated type, requirement/verification map |
| 2 | `USER-CRUD-STORE-01` | resettable User store, auth user ID, Task owner/cascade |
| 3 | `USER-CRUD-TRANSPORT-01` | `entities/user`, User API runtime boundary와 MSW handlers |
| 4 | `USER-CRUD-SIGNUP-01` | `/sign-up`, 로그인 link, validation과 outcome-unknown |
| 5 | `USER-CRUD-PROFILE-01` | email 조회, name/memo 한 필드 수정 UX |
| 6 | `USER-CRUD-DELETE-01` | password 확인 탈퇴와 session/cache 종료 |
| 7 | `USER-CRUD-JOURNEY-VERIFY-01` | core E2E, 두 viewport browser evidence, full PASS |
| 8 | `USER-CRUD-JOURNEY-REVIEW-01` | exact target review와 unresolved HIGH/MEDIUM 없음 |
| gate | `JOURNEY-USER-CRUD-01` | 사람 검토 대기; AI가 승인 상태를 기록하지 않음 |

한 시점에는 dependency가 해소된 task 하나만 `IN_PROGRESS`다. Evidence에 기록된
session이 해당 block owner이며 다른 session은 그 block을 수정하지 않는다.

## RED/GREEN 규칙

- production code보다 실제 behavior test를 먼저 작성하고 예상 원인으로 실패하는지
  확인한다.
- generated file은 직접 편집하지 않고 OpenAPI source에서 생성한다.
- config/document control-plane 변경도 가능한 경우 verifier contract를 먼저 RED로
  만든다.
- 기존 test가 acceptance를 이미 증명하면 중복 test나 production diff를 만들지
  않는다.
- GREEN은 현재 RED를 통과시키는 최소 변경만 포함한다. 다음 task의 UI나 API를
  미리 만들지 않는다.
- 새 dependency, generic CRUD/form abstraction, email/password update, production
  backend는 범위 밖이다.

## 서버 권위 mutation 불변식

- mutation 시작 전에 표시값, entity cache와 dashboard를 바꾸지 않는다.
- success response가 runtime validation을 통과한 뒤에만 cache를 갱신한다.
- PATCH 실패는 edit state와 draft를 유지하고 기존 server value를 보존한다.
- field identifier가 없는 400은 특정 field로 추정하지 않고 form/row alert로 보낸다.
- `POST /api/user` network/invalid response는 결과 미확정이며 자동 재시도하지 않는다.
- `DELETE /api/user` 200만 auth/cache 정리와 `/sign-in` 이동을 만든다.

## 검증 배치

각 task는 계획에 적힌 focused test와 `pnpm verify quick`을 통과한 뒤
`AI_VERIFIED`로 닫는다. 문서/control-plane task에는 browser 검증을 적용하지 않는다.
UI task는 component test 후 실제 browser에서 다음 항목을 확인한다.

- `390x844`, `1280x720`
- keyboard 순서, field label/error 연결
- 연필 → 체크/X, focus 진입과 취소 복원
- dialog initial focus, close lock과 focus return
- pending, 400, network/invalid-response와 success
- console, page error와 API method/status/count

## 실패 분류와 복구

| 분류 | 판단 | 루프 동작 |
| --- | --- | --- |
| `PRODUCT` | 승인된 동작과 source/test 결과 불일치 | 가장 낮은 RED로 재현 후 root-cause 수정 |
| `CONTRACT` | OpenAPI/generated/runtime/MSW 불일치 | source contract부터 교정하고 생성·focused 재실행 |
| `REQUIREMENT` | 승인 문서끼리 의미 충돌 | 구현 중단, HIGH-risk 사람 결정 요청 |
| `TEST` | assertion/fixture가 실제 계약을 잘못 표현 | test를 교정하고 올바른 RED를 다시 확인 |
| `TOOLING` | install, runner, browser automation 문제 | 제품 pass로 간주하지 않고 환경을 복구 |
| `ENVIRONMENT` | port, browser, 외부 실행 조건 문제 | 재현 정보 기록 후 clean environment에서 재실행 |

동일 blocker가 반복되어도 다른 안전한 검증이나 구현이 가능하면 계속 진행한다.
승인·외부 권한처럼 작업자가 해결할 수 없는 경계에서만 사용자 입력을 요청한다.

## Journey evidence 경계

Core success E2E는 가입 link부터 profile 수정과 탈퇴 뒤 보호 route 접근 불가까지
한 case로 증명한다. Core failure E2E는 잘못된 탈퇴 비밀번호 뒤 profile, Task와
session이 그대로임을 증명한다.

로그인 실패만으로 영구 삭제를 증명하지 않는다. User와 소유 Task 제거는
`src/mocks/fixtures/users.test.ts`의 store integration이 소유한다. client validation,
one-field PATCH, 중복 이메일, mutation pending과 outcome-unknown은 unit/component/
integration에서 증명하고 E2E에 중복하지 않는다.

## 종료 gate

마지막 구현과 검증 후 exact target을 다음 축으로 다시 검토한다.

- 원본 OpenAPI와 dependency/architecture 무변경
- extension/generated/runtime/MSW 일치
- credential 비공개와 사용자별 소유권
- 비낙관 mutation과 POST 무자동재시도
- wrong-password 무변경과 account cascade store evidence
- responsive/accessibility와 기존 네 Journey 회귀

HIGH/MEDIUM finding은 owning task를 다시 열어 RED부터 반복한다. PASS 또는 정당한
`PASS_WITH_LOW`만 사람 checkpoint로 이동한다. AI는 `HUMAN_APPROVED`를 기록하지
않는다.
