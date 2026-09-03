# User·Task CRUD Journey 확장 설계

## 목적

기존 과제 요구사항 구현과 네 Golden Journey를 보존하면서 최소한의 사용 가능한
계정·Task 관리 기능을 두 개의 독립 Journey로 확장한다.

- `user-crud`: 현재 사용자의 가입, 조회, 이름·메모 수정, 탈퇴
- `task-crud`: Task 생성, 목록·상세 조회, 제목·메모·상태 수정, 삭제

이 문서는 API와 UI/UX의 승인된 동작을 고정하는 설계 명세다. 구현 순서와 exact
file 변경은 후속 실행 계획에서 정의한다.

## 기준과 변경 권한

기존 계약의 우선순위는 다음과 같다.

1. `assignment-original/openapi.yaml`
2. `assignment-original/requirement.md`
3. `docs/quality/requirements.md`
4. `docs/project-plan.md`
5. 이 문서

`assignment-original/`은 수정하지 않는다. 이 문서의 CRUD endpoint, response field와
`IN_PROGRESS` 상태는 2026-09-03 사용자가 명시적으로 승인한 범위 확장이다. 구현 전
후속 계획은 승인된 확장 계약을 별도 OpenAPI 명세로 만들고 generated type, runtime
guard, MSW와 UI가 동일 계약을 소비하도록 연결해야 한다. 기존 인증과 Task 삭제
정책을 조용히 바꾸지 않는다.

## 승인된 제품 경계

### 포함

- 로그인 화면의 link로 접근하는 `/sign-up`
- 이메일·비밀번호·비밀번호 확인·이름만 받는 회원가입
- 현재 사용자 이메일·이름·메모 조회
- 이름과 메모를 한 필드씩 수정하는 UI와 API
- 현재 비밀번호 확인 후 계정과 소유 Task 영구 삭제
- Task 목록의 `새 할 일` 버튼과 생성 modal
- Task 목록의 read-only 상태 표시
- Task 상세의 제목·메모 한 필드 수정과 상태 변경
- `TODO`, `IN_PROGRESS`, `DONE` 상태
- 기존 exact-ID Task 삭제
- 사용자별 Task 격리와 dashboard 수치 일관성

### 제외

- 관리자용 사용자 목록·상세·수정·삭제
- 이메일·비밀번호 변경, 비밀번호 찾기, 이메일 인증
- 회원가입 시 메모 입력과 자동 로그인
- Task 검색, 정렬, filter, due date, 담당자와 bulk action
- 목록에서 Task 상태 변경
- optimistic mutation과 자동 POST 재시도
- production backend와 database

## 설계 대안과 선택

CRUD form 배치는 전용 route, 기존 화면 inline, modal 중심의 세 안을 비교했다.
사용자 검토 결과 한 방식으로 통일하지 않고 다음 혼합 구조를 선택했다.

- 회원가입은 익숙한 별도 화면을 사용하되 navigation 항목을 만들지 않는다.
- 회원정보는 현재 profile 안에서 한 필드씩 수정한다.
- Task 생성은 목록 header의 명시적 버튼이 modal을 연다.
- Task 내용 수정은 상세 화면에서 profile과 같은 필드 단위 UX를 사용한다.
- Task 상태 변경은 목록 dropdown·3단계 버튼·순환 버튼 대신 상세의 3단계 control을
  사용한다.
- 삭제는 기존 Task exact-ID modal을 보존하고 회원 탈퇴만 현재 비밀번호 modal을
  추가한다.

이 선택은 가상 목록의 전체-card link를 유지하고, 좁은 mobile 행에 반복 control을
넣지 않으며, 각 form이 한 가지 행동에 집중하게 한다.

## Domain model과 module 경계

### `entities/user`

현재 사용자의 공개 domain model과 Query key를 소유한다.

```ts
type User = {
  email: string;
  name: string;
  memo: string;
};
```

- 이메일은 canonical lowercase 값이며 조회만 가능하다.
- 비밀번호와 refresh/access token은 `User` model에 포함하지 않는다.
- 계정 credential은 제출용 MSW fixture의 비공개 저장 값이다.
- user Query key와 profile 표시 단위를 같은 entity slice에 둔다.

### `entities/task`

기존 Task entity를 확장해 공개 domain model, 상태와 Query key를 소유한다.

```ts
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

type Task = {
  id: string;
  title: string;
  memo: string;
  status: TaskStatus;
  registerDatetime: string;
};
```

- 목록 projection은 `registerDatetime`을 제외할 수 있지만 status enum을 공유한다.
- Task ID와 등록 일시는 server-owned이며 수정할 수 없다.
- list card는 상태를 read-only badge로 표시하고 전체-card 상세 link를 유지한다.

### Feature와 transport

- `features/sign-up`: 가입 form, client validation과 create mutation
- `features/update-user`: profile의 이름·메모 field edit
- `features/delete-user`: 현재 비밀번호 확인과 탈퇴 mutation
- `features/create-task`: 목록 action, create modal과 result-unknown UI
- `features/update-task`: 상세의 field edit와 status mutation
- `features/delete-task`: 기존 exact-ID 삭제 흐름 재사용
- `shared/api/user.ts`, `shared/api/tasks.ts`: OpenAPI DTO 검증과 HTTP method/path
- `mocks`: 사용자 store, 사용자 소유권을 가진 Task store, auth/API handler

`shared/api`는 transport DTO만 소유하고 generated type을 외부로 노출하지 않는다.
`entities`가 공개 domain 이름과 Query key를 제공하며 feature와 widget은 entity public
API를 사용한다. 새 상태 관리 도구, HTTP client나 form dependency를 추가하지 않는다.

## API 확장 계약

### 공통 원칙

- 보호 endpoint는 기존 bearer와 bounded refresh replay 정책을 사용한다.
- request/response는 `additionalProperties: false`인 exact object다.
- client와 MSW는 generated contract와 runtime validation을 함께 통과해야 한다.
- `400`이 field identifier를 제공하지 않으면 UI는 특정 field 오류로 추정하지 않는다.
- 존재하지 않거나 다른 사용자가 소유한 Task는 동일하게 `404`를 반환한다.
- 모든 mutation은 server-authoritative 비낙관 방식이다.

### User

| Method | Path | Security | Request | Success | Error |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/user` | public | `CreateUserRequest` | `201 UserResponse` | `400`, `409` |
| `GET` | `/api/user` | bearer | 없음 | `200 UserResponse` | `401` |
| `PATCH` | `/api/user` | bearer | `UpdateUserRequest` | `200 UserResponse` | `400`, `401` |
| `DELETE` | `/api/user` | bearer | `DeleteUserRequest` | `200 DeleteUserResponse` | `400`, `401` |

```text
CreateUserRequest
  email: required email, max 254; trim 후 lowercase canonicalization
  password: required, ASCII 영문·숫자만 8~24자
  name: required, trim 후 1~50자

UserResponse
  email: required canonical email
  name: required string
  memo: required string; 가입 시 ""

UpdateUserRequest
  정확히 하나: { name } 또는 { memo }
  name: trim 후 1~50자
  memo: 0~500자

DeleteUserRequest
  password: required current password

DeleteUserResponse
  success: true
```

`POST /api/user` 성공은 session을 만들지 않는다. `409`는 중복 이메일만 의미하므로
email field에 연결할 수 있다. `DELETE /api/user`의 `200`만 계정과 소유 Task 삭제,
refresh credential 만료와 client session/cache 정리를 발생시킨다. 기존 sign-in
handler도 입력 email을 같은 방식으로 trim·lowercase한 뒤 User store를 조회한다.

### Task

| Method | Path | Security | Request | Success | Error |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/task` | bearer | `CreateTaskRequest` | `201 CreatedTaskResponse` | `400`, `401` |
| `GET` | `/api/task?page=N` | bearer | page query | 기존 `200 TaskListResponse` | `401` |
| `GET` | `/api/task/{id}` | bearer | path ID | `200 TaskDetailResponse` | `401`, `404` |
| `PATCH` | `/api/task/{id}` | bearer | `UpdateTaskRequest` | `200 TaskDetailResponse` | `400`, `401`, `404` |
| `DELETE` | `/api/task/{id}` | bearer | path ID | 기존 `200 { success: true }` | `401`, `404` |

```text
CreateTaskRequest
  title: required, trim 후 1~100자
  memo: optional, 0~500자; 생략 시 ""
  status는 받지 않음

CreatedTaskResponse
  id, title, memo, status="TODO", registerDatetime

TaskItem
  기존 id, title, memo, status
  status enum에 IN_PROGRESS 추가

TaskDetailResponse
  기존 title, memo, registerDatetime
  required status 추가

UpdateTaskRequest
  정확히 하나: { title }, { memo }, { status }
  title: trim 후 1~100자
  memo: 0~500자
  status: TODO | IN_PROGRESS | DONE
```

Task 생성 순서는 계약에 포함하지 않는다. 생성 success 후 목록을 다시 조회해 새 ID의
존재만 확인한다. `numOfRestTask`는 `TODO + IN_PROGRESS`, `numOfDoneTask`는 `DONE`을
센다.

## 공통 mutation 정책

- mutation 시작 전에 화면 값, entity cache와 dashboard 수치를 바꾸지 않는다.
- pending 동안 해당 form/control만 잠그고 다른 읽기와 navigation은 유지한다.
- success response를 runtime validation한 뒤 관련 Query를 다시 불러온다.
- 실패한 PATCH는 입력 edit state를 유지하고 server value를 덮어쓰지 않는다.
- 상태 PATCH는 이전 active 상태를 유지하다 success 뒤에만 새 상태를 표시한다.
- Task status success는 detail, list와 dashboard를 갱신한다.
- Task create는 list를 page 1부터 다시 조회하고 dashboard를 갱신한다.
- Task title/memo update는 detail과 list를 갱신한다.
- account delete success는 모든 protected Query와 인증 상태를 제거한다.
- POST, destructive mutation과 결과 미확정 요청을 자동 재전송하지 않는다.

### POST 결과 미확정

Network failure나 invalid success response는 server 적용 여부를 알 수 없는
`outcome-unknown`이다.

- Task create는 POST를 자동 재전송하지 않는다. 목록을 다시 조회한 뒤 사용자가 생성
  여부를 확인해야 재시도 action을 사용할 수 있다. 같은 title/memo로 존재 여부를
  자동 추론하지 않는다.
- User create는 자동 재전송하지 않는다. 사용자는 로그인 시도로 생성 여부를
  확인하거나 명시적으로 다시 제출해 `409` 중복 이메일 결과로 확인할 수 있다.
- 결과 미확정을 success, 실패 또는 rollback이라고 부르지 않는다.

## UI/UX 계약

### 회원가입

- `/sign-in` form 아래 `계정이 없으신가요? 회원가입` link로 `/sign-up`에 진입한다.
- GNB/LNB/bottom navigation에 회원가입 action을 추가하지 않는다.
- `/sign-up`은 page title, 짧은 설명, form만으로 가입 행동에 집중한다.
- field 순서는 이메일, 비밀번호, 비밀번호 확인, 이름이다. 메모는 받지 않는다.
- 비밀번호 확인은 client validation 전용이며 API request에 포함하지 않는다.
- 각 client validation 오류는 해당 input 바로 아래 연결한다.
- 중복 이메일 `409`만 email field 아래 연결한다.
- field 정보가 없는 `400`과 network/invalid response는 form 하단 alert에 표시한다.
- 전체 값이 유효하고 pending이 아닐 때만 `계정 만들기`를 활성화한다.
- success는 `/sign-in`으로 이동하며 자동 로그인하지 않는다.
- 하단 `이미 계정이 있으신가요? 로그인` link로 돌아갈 수 있다.

### 회원정보 조회·수정

- `/user`는 수정 불가능한 이메일과 수정 가능한 이름·메모를 description list로
  표시한다.
- 이름과 메모 값 우측에 연필 icon button을 둔다.
- 연필은 해당 값 하나만 input 또는 textarea로 바꾼다.
- edit state의 체크 icon button은 저장, `X` icon button은 취소다.
- 한 번에 한 field만 편집하고 다른 연필 button은 그동안 비활성화한다.
- 접근 가능한 이름은 `이름 수정`, `이름 저장`, `이름 수정 취소`처럼 대상과 동작을
  함께 말한다.
- edit 시작 시 input에 focus하고 전체 기존 값을 선택하지 않는다.
- `X`는 request 없이 server value로 돌아가고 연필 button에 focus를 복원한다.
- 저장 실패는 edit state와 사용자의 입력을 유지하고 행 안 alert를 표시한다.
- 저장 success 뒤 조회 상태와 새 server value를 표시한다.

### 회원 탈퇴

- profile의 별도 destructive 영역에 `회원 탈퇴` button을 둔다.
- accessible modal에서 현재 비밀번호를 다시 입력한다.
- wrong-password `400`은 form alert이며 계정, Task, session을 바꾸지 않는다.
- pending 중 중복 submit과 modal close를 잠근다.
- `200` success만 `/sign-in` 이동과 client session/cache 제거를 만든다.
- network/invalid response는 자동 재시도나 success 전환 없이 결과 미확정 안내를
  제공한다.

### Task 목록·생성

- 기존 page title/설명과 가상 목록 사이의 header 우측에 `새 할 일` button을 둔다.
- mobile에서는 설명 아래 full-width button으로 내려간다.
- button은 empty, loading, success 상태에서 일관된 위치를 유지한다.
- 생성 modal은 제목과 메모만 받으며 open 시 제목에 focus한다.
- 제목 오류는 input 아래, field 정보 없는 API 오류는 form 하단 alert에 표시한다.
- pending 중 form과 close를 잠그고 `할 일 만드는 중` text를 제공한다.
- `201` success 뒤 modal을 닫고 목록과 dashboard를 다시 불러온다.
- list card는 status를 read-only label로 보여주되 상태 변경 control을 두지 않는다.
- 생성 항목의 위치를 최상단이라고 가정하지 않고 목록 존재만 확인한다.

### Task 상세·수정

- 상세는 title, memo, status와 registerDatetime을 표시한다.
- title과 memo는 profile과 같은 연필 → 체크/X field edit UX를 사용한다.
- 등록 일시는 수정할 수 없다.
- status는 `할 일`, `진행 중`, `완료` 세 button을 한 group으로 제공한다.
- 각 button은 현재 상태를 `aria-pressed`와 visual indicator로 함께 전달한다.
- status click은 기존 상태를 유지한 채 request를 보내고 group을 잠근다.
- success 뒤에만 active 상태와 dashboard 수치를 바꾼다.
- 실패하면 기존 active 상태와 dashboard가 그대로이며 detail alert를 표시한다.
- 삭제는 기존 exact route ID modal, attempt guard와 200-only redirect를 유지한다.

## User CRUD Journey

Requirements: `USER-CRUD-01`~`USER-CRUD-08`.

독립 초기 상태는 signed-out browser context, 가입 가능한 canonical email, 초기화된
User·Task store와 Query cache다.

| Case/step | Requirement | 사용자 행동 | API 계약 | 관찰 결과 | 주 evidence |
| --- | --- | --- | --- | --- | --- |
| `USER-P1-1` | `USER-CRUD-01` | `/sign-in`의 회원가입 link 선택 | 없음 | `/sign-up`, 별도 navigation action 없음 | component + browser |
| `USER-P1-2` | `USER-CRUD-02` | invalid→valid 가입 정보 입력 | 없음 | field별 오류와 valid-only submit | unit + component |
| `USER-P1-3` | `USER-CRUD-03` | 가입 제출 | `POST /api/user`, `201` | 계정 생성, memo 빈 값, `/sign-in` 이동 | integration + browser |
| `USER-P1-4` | `USER-CRUD-04` | 새 계정 로그인 후 profile 이동 | sign-in, bearer `GET /api/user` | email/name/빈 memo 표시 | integration + browser |
| `USER-P1-5` | `USER-CRUD-05` | 이름 연필→입력→체크 | one-field `PATCH /api/user` | success 뒤 이름만 변경 | component + integration |
| `USER-P1-6` | `USER-CRUD-05` | 메모 연필→입력→체크 | one-field `PATCH /api/user` | success 뒤 메모만 변경 | component + integration |
| `USER-P1-7` | `USER-CRUD-06` | 현재 비밀번호로 탈퇴 | `DELETE /api/user`, `200` | signed out, `/sign-in`, 보호 UI 접근 불가 | integration + browser |
| `USER-P1-8` | `USER-CRUD-07` | 삭제 결과의 store 확인 | 없음 | User와 모든 소유 Task가 없음 | store integration |

Core success E2E는 `USER-P1-1`~`USER-P1-7`의 browser 경계를 한 case로 검증한다.
삭제 후 로그인 실패만으로 영구 삭제를 증명하지 않는다. E2E는 session 종료와 보호
화면 접근 불가까지만 검증하고, User와 소유 Task 제거는 store integration test가
소유한다.

핵심 실패 E2E는 `USER-E1` 잘못된 현재 비밀번호 탈퇴다.

| Case | 행동 | Expected |
| --- | --- | --- |
| `USER-E1` | wrong password로 탈퇴 제출 | `400` alert, modal 유지, profile·Task·session 불변 |
| `USER-E2` | invalid 가입 정보 | field 오류, POST 0회 |
| `USER-E3` | duplicate email 가입 | `409` email 오류, 계정 추가 없음 |
| `USER-E4` | field PATCH 실패 | edit/input 유지, server value 불변 |
| `USER-E5` | create outcome unknown | 자동 POST 없음, 로그인 확인 또는 명시적 재제출 안내 |
| `USER-E6` | 보호 API terminal 401 | 기존 auth policy대로 session/cache 정리 |

## Task CRUD Journey

Requirements: `TASK-CRUD-01`~`TASK-CRUD-08`.

독립 초기 상태는 approved authenticated user, 해당 사용자의 초기화된 Task store와
fresh Query cache다. sign-in Journey를 선행 실행하지 않는다.

| Case/step | Requirement | 사용자 행동 | API 계약 | 관찰 결과 | 주 evidence |
| --- | --- | --- | --- | --- | --- |
| `TASK-P1-1` | `TASK-CRUD-01` | 목록의 `새 할 일` 선택 | 없음 | accessible modal, title focus | component + browser |
| `TASK-P1-2` | `TASK-CRUD-02` | title/memo 제출 | `POST /api/task`, `201` | server Task는 `TODO`, modal 닫힘 | integration + browser |
| `TASK-P1-3` | `TASK-CRUD-03` | 갱신 목록 확인 | `GET /api/task?page=1..N` | 새 ID가 목록에 존재, 순서 가정 없음 | integration + browser |
| `TASK-P1-4` | `TASK-CRUD-04` | 새 Task 상세 진입 | `GET /api/task/{id}` | title/memo/TODO/registerDatetime 표시 | integration + browser |
| `TASK-P1-5` | `TASK-CRUD-05` | title과 memo를 각각 수정 | one-field `PATCH /api/task/{id}` | 각 success 뒤 해당 field만 변경 | component + integration |
| `TASK-P1-6` | `TASK-CRUD-06` | detail status 변경 | one-field status PATCH | success 뒤 상태·list·dashboard 갱신 | integration + browser |
| `TASK-P1-7` | `TASK-CRUD-07` | exact ID로 삭제 | 기존 DELETE `200` | `/task` 이동 | integration + browser |
| `TASK-P1-8` | `TASK-CRUD-08` | 목록·상세·dashboard 확인 | 기존 GET API | 목록 부재, detail 404, metric 일치 | integration + browser |

Core success E2E는 `TASK-P1-1`~`TASK-P1-8`의 cross-route CRUD 경계를 한 case로
검증한다. 생성 항목이 최상단이라고 assertion하지 않는다.

핵심 실패 E2E는 `TASK-E1` 상태 변경 실패다.

| Case | 행동 | Expected |
| --- | --- | --- |
| `TASK-E1` | status PATCH가 실패하는 상태 button 선택 | 이전 active 상태·dashboard 유지, detail alert |
| `TASK-E2` | invalid create 입력 | field 오류, POST 0회 |
| `TASK-E3` | create outcome unknown | POST 자동 재전송 없음, list 재조회 전 retry 불가 |
| `TASK-E4` | title/memo PATCH 실패 | edit/input 유지, server value 불변 |
| `TASK-E5` | 다른 사용자 Task ID 접근 | GET/PATCH/DELETE 모두 404, 정보 노출 없음 |
| `TASK-E6` | delete failure/unknown | 기존 delete policy, 200 없는 redirect 없음 |
| `TASK-E7` | 보호 API terminal 401 | 기존 auth policy대로 session/cache 정리 |

## Error와 접근성 계약

- Client validation만 field error로 즉시 표시한다.
- API `409 duplicate email`처럼 field 의미가 명시된 응답만 해당 field에 연결한다.
- field identifier가 없는 `400 ErrorResponse`는 form 또는 field-edit 행 alert다.
- Network, invalid-response, abort와 outcome-unknown을 서로 구분한다.
- Modal은 accessible name, initial focus, focus trap, Escape/close와 focus restore를
  제공한다. Pending destructive modal은 승인된 정책대로 close를 잠근다.
- icon-only button은 visible 또는 accessible name과 최소 44px target을 가진다.
- edit 시작은 input에 focus하고 취소는 시작 연필 button으로 focus를 복원한다.
- pending과 success/failure는 color만이 아니라 text 또는 live semantics로 전달한다.
- mobile에서 bottom navigation, create button, modal, keyboard와 content가 겹치지 않는다.

## Cache와 store 일관성

- MSW User store는 canonical email, credential과 profile을 소유한다.
- 기존 auth handler는 고정 계정 비교 대신 User store에서 credential을 확인한다.
- bearer 검증은 authenticated user ID를 handler에 제공한다.
- Task store는 `ownerId`로 사용자 소유권을 표현한다.
- list/detail/create/update/delete/dashboard는 같은 Task store를 사용한다.
- account delete는 User와 그 `ownerId`의 모든 Task를 하나의 fixture operation으로
  제거한다.
- 다른 사용자의 Task는 list에 포함하지 않고 direct ID access도 404다.
- Task create/delete/status success 뒤 dashboard invariant를 다시 계산한다.
- `numOfTask = TODO + IN_PROGRESS + DONE`, `numOfRestTask = TODO + IN_PROGRESS`,
  `numOfDoneTask = DONE`을 유지한다.

## 검증 전략

### Unit

- email canonicalization과 email/password/name 가입 규칙
- password confirmation equality와 API payload 제외
- name/title trim과 길이, memo 길이
- one-field User/Task PATCH request
- `TaskStatus` 세 값과 dashboard 계산
- icon edit state의 시작, 취소와 pending guard

### Component

- sign-in의 sign-up link와 `/sign-up` form error association
- 연필 → input/textarea → 체크/X, focus와 한 field edit 제한
- field 없는 server 오류의 form/row alert
- Task create button 위치와 modal focus/validation/pending
- detail status group의 `aria-pressed`, pending old-state 유지와 failure 상태
- user-delete password modal의 wrong-password state

### Integration

- 모든 endpoint의 exact method, path, body, status와 response guard
- create success와 POST outcome-unknown 무자동재시도
- login이 새 User store를 사용하고 canonical email을 찾는 경계
- User/Task store 소유권, cross-user 404와 account-delete cascade
- mutation success 전 cache 불변과 success 뒤 Query 재조회
- Task status에 따른 dashboard metric
- User와 Task 삭제의 server-authoritative semantics

### E2E와 browser QA

- `e2e/user-crud.spec.ts`: 전체 CRUD success 1개, wrong-password delete failure 1개
- `e2e/task-crud.spec.ts`: 전체 CRUD success 1개, status failure old-state 유지 1개
- core selector에 각 Journey 대표 case만 포함한다.
- 기존 네 core Journey를 유지해 scope 확장 회귀를 확인한다.
- named browser session은 `/sign-in`, `/sign-up`, `/user`, `/task`, `/task/:id`를
  `390x844`, `1280x720`에서 확인한다.
- keyboard 순서, icon accessible name, edit focus/restore, modal trap/overflow,
  virtual list, console, page error와 API method/status/count를 기록한다.

## 구현·review 순서

두 Journey는 한 구현 batch로 섞지 않는다.

1. 확장 OpenAPI와 requirement ID를 project-plan, quality requirements와 TODO에 연결
2. `entities/user`와 `entities/task` domain model·Query key 경계 확정
3. User store/auth transport 기반
4. `user-crud`를 unit → component → integration → browser 순으로 구현·검증
5. `user-crud` exact target의 plan-completion/Journey adversarial review
6. `user-crud` 사람 checkpoint 요청
7. Task store/status/dashboard 기반
8. `task-crud`를 unit → component → integration → browser 순으로 구현·검증
9. `task-crud` exact target의 plan-completion/Journey adversarial review
10. `task-crud` 사람 checkpoint 요청
11. 기존 여섯 Journey 전체 회귀, full review와 `./scripts/verify full`
12. 사람 최종 acceptance 요청

각 mutation은 가장 낮은 수준의 실패 test를 먼저 만들고, focused test 뒤
`./scripts/verify quick`, mapped Journey E2E, 최종 `./scripts/verify full` 순서를
지킨다. 사람만 `HUMAN_APPROVED`를 기록한다.

## 완료 기준

- 승인된 확장 OpenAPI의 schema와 모든 client/MSW behavior가 일치한다.
- `entities/user`와 `entities/task`가 domain model과 Query key를 소유한다.
- 두 Journey의 정상·핵심 실패 경로가 독립 fixture에서 재현된다.
- User 영구 삭제와 소유 Task cascade는 store integration test로 증명된다.
- Task 생성 위치에 정렬 가정을 두지 않는다.
- success 전 UI/cache 불변, field 없는 `400` alert, POST outcome-unknown 정책이
  test와 browser evidence에 남는다.
- 기존 auth, work-overview, task-discovery, task-resolution Journey가 회귀하지 않는다.
- 두 독립 review와 사람 checkpoint 뒤 full QA를 요청한다.
