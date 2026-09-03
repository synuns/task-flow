# User 로그아웃 추가 설계

## 배경과 결정

User CRUD 사람 checkpoint 중 회원정보 페이지의 로그아웃 기능 누락이 발견됐다.
사용자는 2026-09-03 다음 HIGH-risk 인증 확장을 승인했다.

- 방식 A: 서버가 인증 session을 폐기하는 `POST /api/sign-out` 추가
- `/user`의 로그아웃 action 전에 확인 modal 표시

원본 `assignment-original/openapi.yaml`은 변경하지 않는다. 새 endpoint는 기존 CRUD와
같이 `docs/api/crud-openapi.yaml`이 관리하는 승인된 확장 계약이다. 기존 access token
memory 저장, refresh cookie, session generation, 보호 Query 정리 정책은 유지한다.

## 범위

### 포함

- `/user` 상단의 로그아웃 action과 반응형 배치
- 확인 modal, focus, pending, 오류와 취소 UX
- `POST /api/sign-out` 확장 계약, generated type, runtime guard와 MSW handler
- 서버 session·refresh cookie 폐기와 client access token·보호 Query 정리
- User CRUD Journey 자동·browser·review 근거 갱신

### 제외

- 전체 기기 로그아웃, session 목록과 선택 폐기
- navigation의 로그아웃 action
- 로그아웃 성공 toast 또는 별도 완료 화면
- User/Task 데이터 변경
- 새 dependency, 인증 저장 방식 또는 refresh/replay 알고리즘 변경

## 요구사항

| ID | Acceptance |
| --- | --- |
| `USER-LOGOUT-01` | 인증된 `/user` 제목 영역에 outline 스타일의 `LogOut` 아이콘과 `로그아웃` 버튼이 있고 navigation에는 추가하지 않는다. |
| `USER-LOGOUT-02` | trigger는 `로그아웃하시겠어요?` alert dialog를 열며, `취소`에 최초 focus를 두고 취소 뒤 trigger로 focus를 돌린다. |
| `USER-LOGOUT-03` | 확인은 body 없는 bearer `POST /api/sign-out`을 정확히 한 번 보내고 pending 동안 확인·취소·Escape·외부 닫기를 잠근다. |
| `USER-LOGOUT-04` | runtime 검증을 통과한 200 `{ success: true }` 뒤에만 현재 client session과 보호 Query를 정리하고 `/sign-in`으로 replace 이동한다. 폐기된 refresh cookie로 reload해도 인증이 복원되지 않는다. |
| `USER-LOGOUT-05` | network, invalid-response와 non-terminal HTTP 실패는 자동 재시도하지 않고 modal alert로 표시하며 page, session과 cache를 유지한다. terminal 401은 기존 auth 정책을 따른다. |

## UI/UX

로그아웃은 계정 삭제와 의미가 다르므로 destructive 영역에 넣지 않는다. `/user`의 제목과
설명 우측에 outline 버튼을 둔다. 작은 viewport에서는 설명 아래 한 행 전체 너비로 내려
기존 profile card와 계정 삭제 영역의 읽기 순서를 유지한다.

버튼을 누르면 `alertdialog`가 열린다.

- 제목: `로그아웃하시겠어요?`
- 설명: `현재 기기의 로그인 세션이 종료됩니다.`
- actions: `취소`, `로그아웃`
- 최초 focus: `취소`
- 취소: request 없이 닫고 trigger focus 복원
- 확인 pending: `로그아웃 중`, 두 action과 Escape/외부 닫기 잠금
- 실패: dialog를 유지하고 actions를 다시 활성화하며 내부 alert에 server 또는 공통 오류 표시

확인 modal은 비밀번호를 요구하지 않는다. 데이터 파괴가 아니며 한 번의 명시적 확인으로
충분하다.

## API 계약

```text
POST /api/sign-out
Authorization: Bearer <accessToken>
Request body: 없음

200 { "success": true }
401 { "errorMessage": string }
```

성공 response는 refresh cookie를 `Path=/api/refresh`, `HttpOnly`, `SameSite=Strict`,
`Max-Age=0`으로 만료한다. MSW session store도 해당 사용자의 현재 access/refresh
session을 폐기한다. 응답은 exact key와 literal `true`를 runtime에서 확인한다.

refresh cookie의 `Path=/api/refresh` 때문에 브라우저는 이 cookie를 `/api/sign-out`
요청에 보내지 않는다. 서버는 bearer가 가리키는 session과 연결된 refresh token을
폐기한다. Client는 만료 `Set-Cookie` 반영을 명시하기 위해 `credentials: "include"`를
사용하고 body와 `Content-Type`은 보내지 않는다. 원본 OpenAPI와 기존 sign-in/refresh
contract는 수정하지 않는다.

## 데이터 흐름과 상태

1. dialog 확인 시 현재 auth snapshot을 캡처한다.
2. protected client가 bearer로 sign-out request를 보낸다.
3. success response를 runtime 검증한다.
4. 같은 generation인 session만 종료하고 보호 Query root를 제거한다.
5. `/sign-in`으로 replace 이동한다.

요청 전에는 auth status나 Query cache를 바꾸지 않는다. non-terminal 실패는 dialog 안에
머물며 retry는 사용자의 다음 `로그아웃` 선택으로만 발생한다. 요청 중 session이 바뀌면
기존 generation 격리 정책이 stale completion을 폐기한다. terminal 401은 이미 유효하지
않은 인증 상태이므로 기존 bounded refresh/replay 및 종료 정책을 그대로 적용한다.

## 검증

- Contract/API: 별도 extension generation, exact method/path/no-body/cookie, literal success,
  invalid response와 HTTP error
- Handler/store: bearer 검증, session 폐기, expired cookie, 후속 refresh 401
- Component: modal initial/return focus, cancel zero-request, pending lock, failure alert와 상태 보존
- Router/auth integration: 200 뒤 protected cache 제거와 `/sign-in` replace, stale generation 격리
- Core E2E: 기존 User CRUD success case에 logout→reload/direct protected access 차단→재로그인
  흐름을 넣고 이후 account deletion을 계속 검증한다. core case 수는 늘리지 않는다.
- Browser: `390x844`, `1280x720`에서 배치, keyboard focus, cancel, pending, failure와 success,
  console/page/network, overflow를 확인한다.

구현과 browser 검증 뒤 새 exact target으로 User CRUD plan-completion review를 수행한다.
기존 `USER-CRUD-JOURNEY-REVIEW-01`은 당시 target에 대한 기록으로 보존하고 새 review task가
로그아웃 diff를 포함한다. `JOURNEY-USER-CRUD-01`은 그때까지 사람 결정 대기 상태다.
