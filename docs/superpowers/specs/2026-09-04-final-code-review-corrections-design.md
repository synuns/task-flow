# 최종 코드 리뷰 수정 설계

## 목적과 승인

2026-09-04 전체 코드 리뷰에서 확인한 인증, Task mutation, API 응답 경계,
mock·도구·문서 문제를 모듈별 correction cycle로 수정한다. 사용자는 리뷰에서
제시한 세 cycle 설계를 검토하고 2026-09-04 `승인`으로 구현 방향을 확정했다.

인증 정책과 파괴 작업 의미는 기존 승인 내용을 유지한다. 이번 correction은
React Router가 실제로 매칭하는 경로에 기존 보호 정책을 빠짐없이 적용하고,
명시적 로그아웃·탈퇴 성공이 같은 session generation의 최신 token을 종료하도록
기존 정책의 구현 빈틈을 닫는다.

## 접근안과 결정

### 선택: 모듈별 세 correction cycle

인증, Task·API, 도구 정리를 각각 독립적인 testable unit과 검토 대상으로 둔다.
각 cycle은 focused test, `pnpm verify quick`, 적용 가능한 Journey E2E를 통과한 뒤
다음 cycle로 진행한다. 이 방식은 변경 원인과 회귀 evidence를 가장 작게 유지하면서
리뷰에서 확인한 전체 범위를 처리한다.

### 기각: 모든 수정을 한 번에 통합

문서와 초기 setup은 줄지만 인증 경쟁 조건, UI mutation, Python 도구 변경의 실패
원인을 한 diff에서 분리하기 어렵다. Golden Journey 재검토 범위도 불필요하게 커져
사용하지 않는다.

### 기각: HIGH와 MEDIUM만 수정

제품 위험은 빠르게 줄지만 명확히 삭제 가능한 legacy 코드와 verifier 빈틈이
남는다. 사용자가 전체·모듈별 수정을 요청했으므로 LOW 항목도 세 번째 cycle에서
검증 가능한 범위만 처리한다.

## 공통 제약

- `assignment-original/`과 `docs/api/crud-openapi.yaml`의 API 계약을 바꾸지 않는다.
- Access token은 메모리에만 두고 refresh cookie, single-flight, 최대 1회 replay,
  stale generation 격리를 유지한다.
- 로그아웃·탈퇴는 exact 200 성공 전까지 session, cache, route를 변경하지 않는다.
- Task PATCH는 한 필드만 전송하고 성공 전 표시·cache를 변경하지 않는다.
- FSD import 방향, 기존 dependency와 생성 파일을 유지한다.
- 새 generic mutation wrapper, form abstraction, router framework를 만들지 않는다.
- 각 동작 수정은 실패하는 회귀 test를 먼저 확인한 뒤 최소 구현으로 통과시킨다.

## Cycle 1: 인증과 route 정책

### Route 정책의 단일 기준

`app/auth`에 element가 없는 route pattern 정책을 둔다. 보호 pattern은 `/`,
`/task`, `/task/:id`, `/user`이고 public auth pattern은 `/sign-in`, `/sign-up`이다.
정책은 React Router의 matcher로 pathname을 판정해 trailing slash, 기본
case-insensitive matching, percent-encoded pathname을 실제 router와 동일하게
처리한다.

Router route path, `AuthRouteBoundary`, `safeReturnTo`가 같은 path 상수와 matcher를
사용한다. Anonymous 보호 route는 원래 search/hash를 `returnTo`로 보존하고
`/sign-in`으로 이동한다. Authenticated public auth route는 검증된 `returnTo` 또는
`/`로 이동한다. 외부 origin, malformed URL, public auth route, 미등록 route는
계속 `/`로 대체한다.

### principal cache 격리

Sign-in 성공은 새 generation을 commit하기 전에 진행 중인 보호 query를 취소하고
`dashboard`, `tasks`, `task`, `user` cache를 제거한다. 정상 anonymous sign-in에도
같은 동작을 적용해 별도 분기를 만들지 않는다. 새로운 계정 token을 commit한 뒤
이전 계정 응답이 도착해도 generation 검사가 이를 폐기한다.

### refresh 중 명시적 종료

로그아웃과 회원탈퇴 route action은 API 호출을 시작한 generation을 기록한다.
Exact 200 성공 뒤 현재 generation이 시작 generation과 같을 때 현재 snapshot을
`terminate`에 전달한다. 따라서 요청 중 access token만 refresh된 경우 최신 token을
종료하고, 별도 sign-in으로 generation이 바뀐 경우 새 session은 종료하지 않는다.
Transport의 terminal 401은 기존 generation+token exact snapshot 규칙을 유지한다.

### 검증

- Route unit/integration: trailing slash, encoded path, case variant의 anonymous 보호
  redirect와 authenticated public-auth redirect
- Return-to unit: 같은 변형 경로 허용, 외부·미등록·auth 경로 거부
- Provider integration: sign-in이 기존 보호 cache와 진행 중 query를 제거
- Router integration: sign-out과 delete-user 요청 중 token refresh 후 같은 generation
  종료, generation 교체 시 새 session 보존
- `pnpm verify quick`, mapped auth-entry와 user-crud Playwright

## Cycle 2: Task mutation과 API 응답 경계

### Task 상세 interaction lock

Task detail page가 title, memo, status, delete의 현재 interaction owner를 하나만
유지한다. Feature는 pending 시작과 종료를 page에 알리고, 다른 mutation control은
disabled 상태를 받는다. 실패 뒤에는 해당 feature가 retry 가능한 상태를 유지하면서
다른 mutation을 시작할 수 있도록 lock을 해제한다.

동시에 두 PATCH를 보내거나 PATCH 중 DELETE를 보내지 않으므로 늦은 전체 응답이
detail cache를 역행시키거나 삭제 뒤 detail cache를 재생성하지 않는다. 기존
비낙관 cache 갱신과 delete outcome resolution은 변경하지 않는다.

### Infinite query 오류 복구

Task list는 다음 페이지 요청 실패와 기존 page refetch 실패를 구분한다. 다음 페이지
실패의 action은 `fetchNextPage()`, retained-data refetch 실패의 action은 `refetch()`를
호출한다. 이미 표시된 task data는 두 경우 모두 유지한다.

### OpenAPI response 검증

이미 설치된 Zod를 사용해 User와 Task 성공 응답의 문자열 제약을 검증한다. User는
email 형식·254자, name 50자, memo 500자를 적용한다. Task는 id의 계약상 문자열
조건과 title 1~100자, memo 500자, status enum, offset date-time을 적용한다.
Exact-key 검증과 generated TypeScript response type은 유지한다.

### 검증

- Task detail component: 각 mutation pending 동안 다른 control 비활성화, 실패 후 해제
- Cache integration: stale PATCH와 DELETE가 동시에 시작되지 않음
- Task list component: next-page 실패와 refetch 실패가 각자 올바른 request 재실행
- API unit: 경계 길이, 초과 길이, 빈 title, 잘못된 email과 date-time
- `pnpm verify quick`, mapped task-discovery와 task-crud Playwright

## Cycle 3: mock, 도구와 불필요한 코드

### Mock invariant

저장된 User fixture는 load 시 unique ID, canonical unique email, sequence가 기존
`user-N` 최대값 이상인지 확인한다. Task fixture도 unique ID를 확인한다. 검증에
실패하면 기존 initial fixture로 복구한다.

여러 sessionStorage key를 하나의 저장소로 합치는 migration은 추가하지 않는다.
브라우저 storage write 실패 시 현재 탭의 메모리 fixture만 유지하는 기존 동작은
제출용 mock의 명시적 한계로 유지한다. 실제 backend transaction을 모사하기 위한
별도 persistence 계층은 범위를 넘는다.

### Hook와 verifier

`export_session.py`는 redaction과 rendering public surface만 유지한다. 이미
`transcript_adapter.py`가 소유하는 dataclass·parser와 hooks 설정에서 호출되지 않는
legacy entrypoint를 삭제한다. 기존 parser/redaction/rendering tests로 동작 보존을
검증한다.

TODO verifier는 같은 stable task ID가 두 번 나오면 오류를 반환한다. Publication
journal은 metadata와 public artifact가 이미 published인데 journal만 `committing`인
recovery에서 journal을 `complete`로 수렴시킨다.

### Public surface와 접근성

참조가 없는 type/function export를 삭제하고 필요한 내부 symbol만 유지한다.
`TaskCard`는 visible link content가 제공하는 accessible name을 사용하며 중복된 전체
문자열 `aria-label`을 제거한다. Task/User inline editor와 화면별 오류 문구는 억지로
일반화하지 않는다. 정확한 `ApiError` guard만 순환 import 없이 net code가 감소할 때
shared API에 둔다.

### 문서 정합성

TODO 현재 진행 요약의 Task CRUD 상태를 승인된 checkpoint와 일치시킨다. 이전
application architecture 문서의 DEV-only MSW 설명에는 2026-09-01 correction 설계가
제출 preview 동작을 대체했다는 연결을 추가한다.

### 검증

- Mock store unit: 중복 ID/email, 뒤처진 sequence, 정상 persisted state
- Python hook tests: adapter 단일 parser 경로와 기존 redaction/rendering 계약
- Verifier regression: duplicate TODO ID 실패
- Publisher unit: final journal write 실패 뒤 recovery가 `complete`로 수렴
- TaskCard accessibility test와 import/reference 정적 검색
- `pnpm verify quick`, `pnpm verify full`

## 구현·검토 순서

각 cycle마다 다음 순서를 반복한다.

1. TODO에 현재 세션 소유 task와 requirement·risk·검증법을 기록한다.
2. 최소 회귀 test를 추가하고 예상 원인으로 실패하는지 확인한다.
3. 최소 production 또는 tooling 변경으로 focused test를 통과시킨다.
4. `pnpm verify quick`과 mapped Journey E2E를 실행한다.
5. 실패를 분류하고 수정·재실행 evidence를 TODO와 Journey evidence에 기록한다.
6. 독립된 fresh second-pass 계획 완료 적대적 검토를 수행한다.
7. Cycle별 사람 checkpoint 뒤 다음 cycle로 진행한다.

마지막 cycle 뒤 `pnpm verify full`, 전체 diff, 원본 OpenAPI·generated·lockfile 무변경,
여섯 Golden Journey 회귀를 확인하고 최종 사람 acceptance를 요청한다.

## 완료 조건

- Router가 매칭하는 모든 등록 경로에 동일한 auth 정책이 적용된다.
- 새 sign-in과 명시적 종료가 이전 principal cache를 남기지 않는다.
- Token refresh 중 sign-out/delete-user 성공이 같은 generation을 종료한다.
- Task 상세에서 서로 다른 mutation이 동시에 전송되지 않는다.
- Infinite query retry가 실패한 operation을 다시 실행한다.
- User/Task 성공 응답이 OpenAPI runtime 제약을 통과해야 UI에 전달된다.
- Mock persisted state와 TODO 원장이 중복 identifier를 허용하지 않는다.
- Session export parser와 hook lifecycle 구현이 중복되지 않는다.
- Focused, quick, mapped E2E, full verification evidence가 재현 가능하게 기록된다.

