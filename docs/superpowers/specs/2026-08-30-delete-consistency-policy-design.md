# 삭제 일관성 정책 설계

## 목적

`DEC-DELETE-01`의 delete success, 401·404·network·invalid-response 결과,
중복 제출, 요청 중 modal close, 목록·상세·dashboard cache와 MSW fixture
일관성을 확정한다. 대상 requirement는 `TASK-DETAIL-03`부터
`TASK-DETAIL-05`, `TASK-LIST-01`, `DASH-01`이다.

## 불변 조건

- Route ID와 입력값이 공백 제거와 대소문자 변환 없이 정확히 같기 전에는
  DELETE를 호출하지 않는다.
- 200 `{ success: true }`에서만 삭제 성공으로 판정하고 자동으로 `/task`로
  이동한다.
- 401은 `DEC-AUTH-01`의 generation, refresh와 replay 정책을 그대로 사용한다.
- 404, network, invalid-response를 삭제 성공으로 바꾸지 않는다.
- 현재 구현은 낙관적 update와 rollback을 사용하지 않는다. 이를 도입하려면
  파괴적 data semantics 변경으로 이 결정을 다시 검토한다.

## 접근안과 결정

### Server-authoritative 비낙관적 삭제

Modal을 요청 결과가 확정될 때까지 유지하고 MSW fixture store를 source of
truth로 사용한다. UI와 query cache는 200 success 전에 삭제된 모습을 만들지
않는다. 이 방식을 채택한다.

### 낙관적 update와 rollback

즉시 반응하지만 무한 목록 page, 상세, dashboard를 모두 snapshot하고 실패 때
복원해야 한다. 파괴적 작업의 미확정 결과를 성공처럼 보일 수 있어 현재
범위에서 제외한다.

### 요청 중 modal close와 abort

Abort 시 server mutation 완료 여부를 알 수 없어 더 큰 outcome-unknown 상태를
만든다. 요청 중에는 close를 잠가 이 경로를 만들지 않는다.

## 확인 modal과 attempt

- Modal은 accessible name, ID input, submit, cancel/close와 오류 영역을 가진다.
- Exact ID가 아니면 submit이 disabled이고 event handler도 요청 생성을 거부한다.
- 사용자 submit 한 번은 고유한 delete attempt 하나를 만든다.
- Pending 중 click, Enter와 programmatic 중복 호출은 같은 attempt를 추가로
  만들지 않는다.
- 같은 attempt의 DELETE 전송은 최초 한 번이며, 401 refresh 성공에 따른 auth
  replay가 있을 때만 한 번 더 전송한다. 사용자 submit 한 번당 DELETE network
  전송은 최대 두 번이다.
- 실패가 확정되거나 outcome-unknown reconciliation이 끝난 뒤 사용자가 다시
  submit하면 새 attempt가 시작된다.
- Pending 중 submit, Escape, outside click, close와 cancel을 잠그고 진행 상태를
  text와 접근성 상태로 알린다.

## MSW fixture transaction

목록, 상세와 dashboard는 하나의 reset 가능한 task fixture store를 공유한다.
각 task는 목록 표시 field와 dashboard 계산에 필요한 `status`를 함께 가진다.

DELETE handler는 auth를 먼저 확인한 뒤 현재 store에서 ID를 찾는다. 없으면
404 `ErrorResponse`를 반환한다. 있으면 해당 task 하나를 원자적으로 제거하고
200 `{ success: true }`를 반환한다. 같은 ID의 이후 상세 GET과 DELETE는 404다.
목록은 남은 task만 page로 만들고 dashboard의 전체·TODO·DONE 수치는 store에서
파생한다. 별도 mutable counter를 두지 않는다.

## 200 success와 cache

200 success를 받은 현재 session의 attempt만 다음 transition을 수행한다.

1. Task 목록·상세·dashboard의 진행 중 query를 취소한다.
2. 삭제 전 snapshot이 다시 보이지 않도록 관련 query cache를 제거한다.
3. Modal state를 종료하고 `/task`로 이동한다.
4. Task 목록 route는 변경된 fixture store에서 첫 page를 다시 조회한다.

Success response가 도착하기 전에 session generation이 바뀌었다면 이전 세션
결과이므로 현재 cache와 route를 변경하지 않는다.

## 401과 auth replay

DELETE 401은 같은 attempt 안에서 `DEC-AUTH-01`을 적용한다. Refresh가 성공하면
최신 access token으로 DELETE를 한 번 replay할 수 있다. Replay 200만 success
transition을 만든다.

현재 generation과 token의 replay도 401이면 auth 정책의 terminal transition이
cache 정리와 로그인 이동을 담당한다. 이전 token의 late 401과 이전 session
응답은 현재 delete attempt, cache, auth state와 route를 변경하지 않는다.

## 404

DELETE 404는 삭제 성공이 아니다. Server `errorMessage`를 accessible 오류
영역에 표시하고 자동 redirect하지 않는다. Resource가 현재 없다는 상태에 맞춰
task 목록·상세·dashboard cache를 제거하고 명시적인 `/task` 이동 action을
제공한다. GET 200으로 resource 존재가 다시 확인되기 전에는 현재 modal에서
추가 DELETE attempt를 만들지 않는다.

Outcome-unknown 뒤 새 attempt로 재시도한 DELETE가 404여도 같은 규칙을 쓴다.
이전 DELETE가 성공했다고 소급 판정하거나 success evidence로 기록하지 않는다.

## Network와 invalid-response reconciliation

DELETE의 network 또는 invalid-response는 server mutation이 적용됐지만 응답만
유실된 경우를 배제할 수 없다. 이를 `outcome-unknown`으로 분류하고 성공·실패
어느 쪽으로도 판정하지 않으며 자동 redirect와 자동 DELETE retry를 금지한다.

현재 session generation에서 `GET /api/task/{id}`로 상태를 재확인한다.

- GET 200: 현재 시점에 resource가 존재함을 표시하고 새 delete attempt를
  허용한다.
- GET 404: 삭제 성공으로 기록하지 않고 resource가 현재 존재하지 않는다고
  표시한다. 관련 cache를 제거하고 명시적인 목록 이동 action을 제공하며 추가
  DELETE submit은 비활성화한다.
- GET network 또는 invalid-response: outcome-unknown을 유지한다. DELETE를
  자동 재전송하지 않고 상태 재확인과 목록 이동 action을 제공한다.
- GET 401: auth 정책을 적용한다. 이전 session 응답은 현재 삭제 상태와 auth
  state를 변경하지 않는다.

Reconciliation 자체의 늦은 응답도 attempt와 generation이 현재와 일치할 때만
UI와 cache를 변경한다.

## 실패 UI와 modal 종료

404와 확정된 HTTP failure는 server `errorMessage`를 표시한다. Network,
invalid-response와 reconciliation 실패는 결과가 미확정임을 명확히 표시한다.
Resource가 존재하는 확정 failure와 outcome-unknown에서는 submit을 다시
활성화해 사용자가 새 attempt를 명시적으로 시작할 수 있다. Resource 부재가
확인된 404에서는 submit을 비활성화하고 상태 재확인, 목록 이동 또는 modal
close만 제공한다.

실패 뒤 modal을 닫으면 ID input, error와 attempt state를 초기화하고 delete
trigger로 focus를 복원한다. 200 success는 route 이동으로 modal을 종료하므로
이전 route trigger로 focus를 복원하지 않는다.

## 검증

Unit과 component test는 exact ID, attempt guard, pending close lock, 오류 상태와
focus restore를 검증한다. Integration test는 다음 경계를 검증한다.

- 사용자 submit 한 번과 auth replay를 포함한 DELETE 최대 두 번
- 200에서만 cache 제거와 `/task` 이동
- MSW store 삭제 뒤 목록, 상세 404와 dashboard 파생 수치
- 404의 non-success 처리와 목록 복귀 action
- Network와 invalid-response 후 GET 200, GET 404, 재확인 실패
- Outcome-unknown에서 자동 DELETE retry가 없는지
- Session generation이 바뀐 뒤 늦은 응답의 격리

Browser evidence는 exact ID modal, pending interaction lock, 200 redirect와
대표 outcome-unknown recovery처럼 실제 modal·route 경계가 필요한 경우에만
수집한다.

## 완료 조건

- Exact ID 전에는 DELETE가 없고 user submit 한 번은 attempt 하나만 만든다.
- Auth replay를 포함해 한 attempt의 DELETE 전송은 최대 두 번이다.
- 200 success만 자동 redirect를 만들고 cache는 fixture와 다시 일치한다.
- 404와 outcome-unknown은 success로 판정되지 않는다.
- Outcome-unknown은 detail 재조회로 조정하며 자동 DELETE retry가 없다.
- Task store 하나가 목록, 상세와 dashboard 수치의 source of truth다.
- 낙관적 update와 요청 중 modal close가 없다.
