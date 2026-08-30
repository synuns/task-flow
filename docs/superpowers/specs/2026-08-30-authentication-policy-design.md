# 인증 정책 설계

## 목적

`DEC-AUTH-01`의 access token 저장, refresh cookie 관계, expiry와 401 처리,
동시 요청, terminal session transition, 보호 route와 복귀 위치를 한 가지
동작으로 확정한다. 대상 requirement는 `AUTH-07`, `NAV-02`, `NAV-03`이며,
dashboard, task, user의 모든 bearer 요청이 이 정책을 공유한다.

## 계약과 제약

- `assignment-original/openapi.yaml`의 bearer와 refresh cookie scheme을 API
  계약의 최우선 근거로 사용한다.
- Sign-in과 refresh의 200 응답은 `accessToken`과 `refreshToken`을 모두 포함한다.
- Refresh는 `token` cookie를 credential로 보내며 400과 401 `ErrorResponse`를
  가질 수 있다.
- Access token과 refresh token의 JWT payload에는 `id`와 `exp`가 있다.
- 별도 production backend를 추가하지 않고 제출 가능한 MSW API 대체 구현에서
  같은 동작을 재현한다.

## 접근안과 결정

### 메모리 access token과 refresh cookie

Access token은 JavaScript 메모리에만 둔다. `localStorage`와 `sessionStorage`에
token을 저장하지 않는다. Sign-in과 refresh의 MSW handler는 응답 body와 같은
refresh token을 `token` cookie로 설정하고, application code는 response의
refresh token을 별도 저장하거나 읽지 않는다.

이 방식은 page reload 때 refresh가 필요하지만 장기 JavaScript storage에
access token을 남기지 않고 OpenAPI cookie scheme을 그대로 exercise한다.

### sessionStorage access token

Reload 직후 access token을 재사용할 수 있지만 JavaScript storage 노출과 stale
token 관리 범위가 커져 사용하지 않는다.

### 실제 backend의 HttpOnly cookie

운영 환경에는 가장 적합하지만 별도 server와 deployment를 추가해 과제 범위를
넘으므로 구현하지 않는다. 실제 서비스에서는 server가 refresh cookie를
`HttpOnly`, `Secure`, 적절한 `SameSite`와 수명으로 설정해야 한다. MSW cookie는
이 server 계약을 검증하기 위한 모사이며 production 보안 경계가 아니다.

## 인증 상태와 session generation

Auth provider는 다음 상태를 구분한다.

- `initializing`: app 시작 후 refresh 결과를 기다리는 상태
- `authenticated`: 현재 `generation`, access token, decoded `id`와 `exp`가 있는 상태
- `anonymous`: refresh cookie가 없거나 terminal auth failure가 확정된 상태
- `unavailable`: 초기 refresh의 network 또는 invalid-response로 인증 여부를
  확정하지 못한 복구 가능 상태

Session generation은 성공한 sign-in으로 새 세션이 시작될 때와 현재 세션이
terminal 상태로 끝날 때 증가한다. 모든 보호 요청과 refresh는 시작 시점의
generation을 기록한다. 완료 시 generation이 달라졌다면 이전 세션 응답이므로
현재 token, 인증 상태, 보호 cache를 변경하지 않는다.

## 시작과 token 수명

App은 보호 route를 렌더링하기 전에 `/api/refresh`를 한 번 호출한다. Cookie가
없어서 받은 400 또는 401은 새 방문의 정상 anonymous 결과로 처리한다. 성공하면
새 access token을 메모리에 저장하고 authenticated 상태가 된다. Network 또는
invalid-response면 signed-out으로 단정하지 않고 retry action이 있는 unavailable
상태를 표시한다.

Access token의 `exp`는 server 서명 검증을 대신하지 않고 refresh 시점을 정하는
hint로만 사용한다. 현재 시간이 `exp` 이상이거나 payload를 해석할 수 없으면 그
token으로 새 보호 요청을 보내지 않고 refresh한다. 그 전에도 server의 401이
최종 권위이며 동일한 401 알고리즘을 적용한다.

## 보호 요청과 refresh 알고리즘

`/api/sign-in`과 `/api/refresh` 자체는 bearer 주입과 401 replay 대상이 아니다.
그 외 보호 요청은 시작할 때 다음 context를 고정한다.

- 시작 당시 session generation
- 실제 전송에 사용한 access token
- 이 원본 요청의 replay 여부

401 처리는 다음 순서를 지킨다.

1. 요청 generation이 현재 generation과 다르면 이전 세션 응답이다. 현재 인증
   상태와 cache를 변경하지 않고 해당 요청만 stale-session 결과로 종료한다.
2. Generation은 같지만 요청 token과 현재 token이 다르면 refresh 완료 후 늦게
   도착한 이전 token의 401이다. 추가 refresh 없이 최신 token으로 한 번만
   재실행한다.
3. 현재 token으로 보낸 최초 요청의 401이면 같은 generation과 token에 대한
   진행 중 refresh에 합류하거나 하나의 refresh를 시작한다.
4. Refresh 성공은 시작 generation이 현재와 같을 때만 token을 교체한다. 원본
   요청은 새 token으로 한 번만 재실행한다.
5. 최신 token으로 재실행한 요청도 401이고 요청 generation과 token이 여전히
   현재 인증 상태와 같으면 terminal auth failure다. 인증 상태와 보호 query
   cache를 정리한다.
6. Replay 결과가 도착하기 전에 generation이나 token이 바뀌었다면 이전 세션
   응답으로 취급하고 현재 상태를 변경하지 않는다.

각 원본 요청은 최대 한 번만 replay된다. Refresh 요청도 replay하지 않으므로
무한 retry 경로가 없다.

## Refresh 실패

- 400 또는 401은 시작 generation이 현재와 같을 때만 terminal auth failure다.
  Access token, refresh cookie와 보호 query cache를 정리한다.
- 단, authenticated session이 아직 없는 초기 bootstrap의 400 또는 401은
  terminal failure가 아니라 정상 anonymous 초기화다.
- Network와 invalid-response는 session 종료가 확정된 응답이 아니다. 자동
  로그아웃하지 않고 원래 요청에 복구 가능한 오류를 반환한다.
- Refresh가 진행되는 동안 새 sign-in으로 generation이 바뀌면 이전 refresh의
  성공과 실패를 모두 폐기한다.
- Terminal transition은 auth state만 갱신한다. Provider와 transport는 직접
  navigation하지 않는다.

## Route와 복귀 위치

`/`, `/task`, `/task/:id`, `/user`를 보호 route로 둔다. `/sign-in`은 anonymous
route다. RouterProvider 내부의 auth route boundary가 다음 동작을 담당한다.

- Initializing 중에는 보호 page를 먼저 렌더링하지 않는다.
- Anonymous 상태로 보호 route에 접근하면 `/sign-in`으로 이동한다.
- 복귀 위치는 Router location state로 전달하고 사용 직전에 다시 검증한다.
- Candidate를 현재 origin 기준 URL로 parse하고 origin이 정확히 같은지 확인한
  뒤 pathname을 router route table과 대조한다. 등록된 `/`, `/task`, 단일 ID
  segment의 `/task/:id`, `/user`만 허용하며 검증 뒤 search와 hash를 보존한다.
- 외부 URL, malformed URL, `/sign-in`, 미등록 route는 `/`로 대체한다.
- Sign-in 성공 후 유효한 복귀 위치로 이동하고, 없으면 `/`로 이동한다.
- Authenticated 상태로 `/sign-in`에 접근해도 같은 검증을 거쳐 복귀 위치 또는
  `/`로 이동한다.
- 현재 세션의 terminal auth failure 뒤에는 현재 위치를 유효한 복귀 후보로
  보존하고 `/sign-in`으로 이동한다.

Auth provider는 RouterProvider 밖에 있으므로 `useNavigate`를 사용하지 않는다.
상태에 따른 모든 이동은 router 내부 boundary가 수행한다.

## Architecture 주입 경계

`shared/api`는 `app`, auth provider, auth context와 router를 import하지 않는다.
API client factory가 다음 callback을 인자로 받고 app composition bridge가 이를
주입한다.

- 현재 generation과 access token snapshot 조회
- 지정 generation과 token에 대한 single-flight refresh
- 현재 generation의 terminal auth failure 반영

Refresh endpoint는 이 callback을 통과하지 않는 독립 endpoint다. Shared
transport는 navigation callback을 받지 않으며 auth state 변경 결과만 반환한다.
App의 `AuthenticatedApiBridge`는 factory로 만든 안정적인 client instance를
`shared/api`의 generic `ApiClientProvider`에 전달한다. Provider와 consumer hook은
client만 알고 app auth state 구조를 알지 않는다. Auth action이 필요한 route
page에는 app route element가 public prop으로 callback을 주입한다.

## MSW 인증 fixture

- Sign-in 성공 handler는 schema에 맞는 두 JWT를 반환하고 같은 refresh token의
  `token` cookie를 설정한다.
- Refresh handler는 `credentials`가 포함된 요청의 `token` cookie를 검사한다.
- Refresh 성공은 access token과 refresh token을 함께 회전시키고 cookie도 새
  refresh token으로 교체한다.
- Refresh terminal failure는 같은 path의 cookie를 만료시킨다.
- JWT clock과 token 식별자는 test가 제어해 expiry, 동시 401, late 401을
  결정적으로 재현한다.
- MSW browser와 Vitest server가 같은 auth fixture와 handler semantics를 쓴다.

## 검증

Unit test는 JWT expiry 판정, return location allowlist와 session generation
비교를 검증한다. Integration test는 bearer header, app 주입 경계, single-flight
refresh, 최대 한 번 replay, late 401, replay 401 terminal transition, 이전 세션
응답 격리, refresh 400/401과 network 차이를 검증한다.

Browser evidence는 보호 route direct entry, reload bootstrap, sign-in 후 안전한
복귀와 terminal failure의 route 결과 중 integration으로 증명할 수 없는 경계만
대상으로 한다. `AUTH-07` checkpoint는 visible profile action만으로 통과하지 않고
bearer와 refresh integration evidence를 함께 검토한다.

## 완료 조건

- Access token은 메모리에만 있고 refresh는 OpenAPI의 `token` cookie를 쓴다.
- 동시 refresh는 하나이며 원본 요청은 최대 한 번만 replay된다.
- 늦게 도착한 이전 token과 이전 session 응답이 현재 상태를 훼손하지 않는다.
- 현재 인증 상태의 replay 401과 refresh 400/401만 terminal transition을 만든다.
- Return location은 같은 origin의 등록된 내부 route로 제한된다.
- Shared API와 app auth provider 사이에 역방향 import가 없다.
- Provider는 navigation하지 않고 router 내부 boundary가 이동을 소유한다.
