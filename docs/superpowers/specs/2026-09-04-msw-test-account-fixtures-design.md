# MSW 테스트 계정 fixture 보완 설계

## 목적과 범위

개발자가 별도 데이터 조작 없이 로그인만으로 TaskFlow의 긴 목록, 빈 상태와
복구 가능한 조회 오류를 확인할 수 있게 MSW의 고정 테스트 계정을 보완한다.

대상 requirement는 `SYS-04`, `DASH-01`, `USER-01`, `TASK-LIST-01`~
`TASK-LIST-04`, `TASK-DETAIL-01`~`TASK-DETAIL-02`다. OpenAPI, 제품 route,
인증·삭제 정책, API schema와 dependency는 변경하지 않는다.

## 계정별 초기 상태

모든 계정의 비밀번호는 `Password1`이다.

| 이메일 | User ID | 초기 상태 |
| --- | --- | --- |
| `user@example.com` | `user-1` | 기존 `task-1`~`task-3`을 보존하고 총 30개 Task를 제공한다. |
| `empty@example.com` | `user-empty` | Task가 없으며 dashboard는 `0/0/0`, 목록은 빈 상태를 반환한다. |
| `error@example.com` | `user-error` | 로그인은 성공하고 모든 보호 조회 API는 network error를 반환한다. |

기본 계정의 Task 상태는 `TODO` 11개, `IN_PROGRESS` 9개, `DONE` 10개로
구성한다. 기존 2개 단위 page 계약을 유지하므로 총 15 page가 생기며, 초기
viewport를 채운 뒤 실제 scroll을 해야 다음 page를 계속 가져올 수 있다. 기존
삭제·상세 Journey가 사용하는 `task-1`~`task-3`의 ID, 내용, 상태와 등록 시각은
그대로 유지한다.

## 오류 동작

`user-error`의 유효한 bearer 요청에 한해 다음 GET handler가
`HttpResponse.error()`를 반환한다.

- `GET /api/dashboard`
- `GET /api/user`
- `GET /api/task?page=N`
- `GET /api/task/{id}`

로그인과 refresh는 정상 동작한다. POST, PATCH, DELETE에는 별도 오류 fixture를
추가하지 않는다. HTTP status나 response body를 새로 발행하지 않으므로 기존
OpenAPI 응답 계약을 확장하지 않으며, 각 화면은 기존 network-error와 retry UI를
그대로 사용한다.

## 구현 경계

- 기존 `src/mocks/fixtures/users.ts`의 seed가 세 계정의 identity를 소유한다.
- 기존 `src/mocks/fixtures/tasks.ts`의 seed가 기본 계정의 30개 Task와 다른 계정의
  빈 소유 상태를 소유한다.
- 오류 계정 ID는 fixture에서 한 번 정의하고 `user`·`task` GET handler가
  재사용한다.
- 현재 `sessionStorage` persistence와 reset 함수, Task page size, auth token의
  User ID 연결을 그대로 사용한다.
- 별도 endpoint, URL parameter, query flag, storage toggle과 새 abstraction은
  만들지 않는다.
- README의 Test Account 표에 각 계정의 용도를 기록한다.

## 검증

TDD 순서는 다음 세 독립 조건을 차례로 검증한다.

1. 기본 계정 reset 뒤 Task 30개, 15 page, 세 상태 분포와 dashboard `30/20/10`을
   실패 test로 먼저 고정한다.
2. 빈 계정의 인증, task page `{ data: [], hasNext: false }`와 dashboard `0/0/0`을
   handler integration test로 고정한다.
3. 오류 계정의 네 보호 GET이 response 없이 network error가 되는 것을 handler
   integration test로 고정한다.

기존 seed 수치와 terminal page를 전제로 한 fixture/handler/component/E2E 기대값은
새 고정 데이터에 맞게 교정한다. `pnpm verify quick` 뒤 mapped
`work-overview`, `task-discovery`, `task-resolution`, `task-crud` E2E를 실행하고,
agent-browser에서 다음을 확인한다.

- 기본 계정: `/task`에서 초기 page 이후 실제 scroll로 추가 Task가 나타난다.
- 빈 계정: `/`의 `0/0/0`과 `/task`의 빈 상태가 함께 보인다.
- 오류 계정: `/`, `/user`, `/task`, `/task/task-1`에서 기존 오류·재시도 UI가
  나타나고 예상 밖 console/page error가 없다.

마지막으로 `pnpm verify full`, diff 검사와 plan-completion adversarial review를
수행하고 TODO에 재현 가능한 evidence를 기록한다.
