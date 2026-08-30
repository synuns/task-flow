# 애플리케이션 아키텍처 상세 설계

## 목적

React 애플리케이션의 FSD layer, public API, import 방향, provider composition,
route, API, mock, test 경계를 확정한다. 이후 `ARCH-01`부터 `ARCH-03`까지는 이
설계를 그대로 구현하며 기능별 정책을 다시 결정하지 않는다.

이 설계는 `DEC-ARCH-01`만 다룬다. 인증 token 저장·refresh·보호 route 정책은
`DEC-AUTH-01`, 삭제 이후 cache와 mock data 일관성은 `DEC-DELETE-01`에서
결정한다. 두 결정을 위한 placeholder provider, adapter, state는 만들지 않는다.

## 근거와 대상 요구사항

- API path, method, schema, security scheme은
  `assignment-original/openapi.yaml`을 최우선으로 따른다.
- 화면과 상호작용은 `assignment-original/requirement.md`를 따른다.
- React 19, TypeScript, React Router, TanStack Query, Fetch API,
  `openapi-typescript`, MSW 등은 `docs/tech-stack.md`의 채택 상태를 유지한다.
- FSD 책임과 public API 규칙은 `docs/coding-standards.md`를 구체화한다.
- 전체 기능 requirement의 구조 기반과 `ARCH-01`, `ARCH-02`, `ARCH-03`의
  실행 경계를 대상으로 한다.

## 접근안과 결정

### 필요 시 생성하는 FSD

FSD dependency 방향은 처음부터 고정하되 실제 소비자가 생길 때만 directory와
public API를 만든다. 현재 scaffold 이후 기능 구현 단계이므로 필요한 layer
생성은 허용한다. 이번 설계는 이 방식을 사용한다.

### 전체 FSD 골격 선생성

모든 layer, slice, `index.ts`를 먼저 만들면 구조는 보이지만 placeholder와
미사용 export가 생긴다. 실제 변경 이유와 소비자가 없는 module을 만들지 않기
위해 사용하지 않는다.

### route-first 최소 구조

`app`, `pages`, `shared`만 두는 방식은 초기 파일 수가 가장 작지만 승인된 FSD
방향과 import 검증을 후속 작업마다 다시 결정해야 한다. 사용하지 않는다.

## 생성 원칙

- 빈 layer와 빈 `index.ts`를 만들지 않는다.
- directory와 public API는 첫 실제 소비 시점에 함께 만든다.
- public API는 현재 소비자가 필요한 항목만 export한다.
- 두 번째 사용처가 없는 service interface, factory, hook wrapper를 미리 만들지
  않는다.
- 같은 책임의 module이 이미 있으면 새 module보다 기존 module을 확장한다.

구현 단계별 최초 생성 범위는 다음과 같다.

| 작업 | 실제 생성 대상 | 만들지 않는 대상 |
| --- | --- | --- |
| `ARCH-01` | Biome import 규칙과 architecture contract test | 빈 FSD directory |
| `ARCH-02` | 실제 route를 구성하는 `app`, `pages`, `widgets/app-shell` | 인증 provider, 기능 UI |
| `ARCH-03` | 실제 client와 test가 사용하는 `shared/api`, `mocks`, test support | 미사용 endpoint adapter |
| 기능 작업 | 해당 page가 실제 소비하는 widget, feature, entity | 다른 journey의 slice |

## 목표 구조와 의존 방향

```text
src/
├── app/          # App, provider composition, router, route error boundary
├── pages/        # dashboard, sign-in, task-list, task-detail, user route composition
├── widgets/      # app-shell, dashboard-summary 등 큰 화면 block
├── features/     # sign-in, delete-task 등 사용자 행위
├── entities/     # task, user 등 독립 domain model과 표시
├── shared/       # API transport, 공통 UI, 범용 utility
├── mocks/        # MSW handler, fixture, browser/node entry
├── generated/    # OpenAPI 생성물; shared/api만 import 가능
└── test/         # 공통 test setup과 실제 재사용 시 생성하는 helper
```

기본 production dependency는 다음 한 방향으로만 흐른다.

```text
app → pages → widgets → features → entities → shared
```

- 같은 layer의 서로 다른 slice는 직접 import하지 않는다. 둘을 함께 쓰는 상위
  layer에서 조합한다.
- slice 내부에서는 상대 경로 import를 사용한다.
- slice 외부에서는 `@/<layer>/<slice>` public API만 사용한다. internal file의
  deep import는 금지한다.
- `mocks`는 production dependency graph의 layer가 아니다.
- `generated`는 public layer가 아니며 `shared/api` 내부만 import한다.

## module 책임과 public API

| module | 책임 | 소비자 | 공개 interface |
| --- | --- | --- | --- |
| `app` | provider와 router 조합 | `main.tsx` | `App` |
| 각 `pages/*` | route param 확인과 하위 단위 조합 | app router | 해당 `*Page` |
| `widgets/app-shell` | 공통 layout과 navigation 영역 | app router | `AppShell` |
| `widgets/dashboard-summary` | dashboard 조회와 세 metric 표시 | dashboard page | `DashboardSummary` |
| `entities/user` | user 조회와 profile 표시 | profile page 또는 widget | 실제 소비되는 query hook과 profile UI |
| `entities/task` | task 조회 model과 card/detail 표시 | task widget과 page | 실제 소비되는 query hook과 task UI |
| `features/sign-in` | form 검증, sign-in mutation, 오류 modal | sign-in page | `SignInForm` |
| `features/delete-task` | exact ID 확인과 delete mutation | task detail page | `DeleteTaskDialog` |
| `shared/api` | contract endpoint, private transport, error normalization | feature, entity, widget | endpoint 함수와 `ApiError` |
| `mocks` | 개발·test API 대체 | DEV bootstrap과 test setup | `startWorker`, `server` entry |

Dashboard는 현재 독립 domain 객체가 아니다. 조회와 표시를
`widgets/dashboard-summary`에 함께 두고 page는 widget을 배치하기만 한다.
dashboard model이 여러 기능에서 재사용되는 독립 domain으로 발전할 때만
entity 분리를 재검토한다.

Page는 raw `fetch`, token, fixture를 직접 다루지 않는다. route 전용 값 확인과
composition만 담당한다. Endpoint 호출은 `shared/api`를 통하고 server state는
가장 가까운 실제 소비자인 widget, entity, feature가 TanStack Query로 소유한다.

## bootstrap과 provider composition

```text
main.tsx
  → import.meta.env.DEV일 때만 import("@/mocks/browser")
  → MSW start 완료
  → App
      → QueryClientProvider
      → RouterProvider
          → AppShell
          → route page
```

- `mocks/browser`는 `import.meta.env.DEV` 분기 안에서만 동적 import한다.
- production build는 `mocks` module을 정적으로 import하지 않는다.
- MSW import 또는 시작 실패는 삼키지 않고 bootstrap을 실패시킨다.
- QueryClient는 browser application당 하나, test render마다 새 인스턴스를
  사용한다.
- 승인되지 않은 재요청과 불필요한 중복 호출을 피하기 위해 기본 query retry는
  비활성화한다. 기능별 retry는 accepted behavior가 생길 때 별도로 검토한다.
- 현재 인증 provider, context, interface, placeholder는 만들지 않는다.
- `DEC-AUTH-01` 승인 후 정해진 인증 provider가 필요하면 QueryClientProvider와
  RouterProvider 사이에서 조합한다.

## route 경계

`app/router`가 route definition과 공통 route error element를 소유한다.

| URL | page slice | layout |
| --- | --- | --- |
| `/` | `pages/dashboard` | `widgets/app-shell` |
| `/sign-in` | `pages/sign-in` | `widgets/app-shell` |
| `/task` | `pages/task-list` | `widgets/app-shell` |
| `/task/:id` | `pages/task-detail` | `widgets/app-shell` |
| `/user` | `pages/user` | `widgets/app-shell` |

- 다섯 route는 각각 고유 page boundary로 resolve된다.
- dashboard와 task navigation을 포함하는 공통 shell은 root layout route에서
  page outlet을 감싼다.
- `/task/:id`의 runtime param 검증은 task detail page 경계에서 수행한다.
- 비로그인 보호 route와 redirect 여부는 `DEC-AUTH-01`까지 결정하지 않는다.
- route error boundary는 render 오류와 React Router가 전달한 route 오류만
  담당한다. event handler 또는 TanStack Query 비동기 오류를 잡는 것으로
  간주하지 않는다.

## API 경계와 data flow

```text
feature / entity / widget
  → shared/api endpoint 함수
  → private fetch transport
  → DEV MSW 또는 실제 fetch
  → generated contract 기반 response 처리
  → TanStack Query
  → page / widget / entity UI
```

- `src/generated/openapi.ts`는 `shared/api` 내부에서만 import한다.
- generated module과 generated type alias는 public API에서 re-export하지 않는다.
- endpoint 함수의 입력과 반환은 `shared/api` 내부 generated contract와 대조하며
  소비자는 endpoint 함수와 그 결과만 사용한다.
- raw `fetch`, URL과 query 조립, JSON 판별, 오류 정규화는 private transport에
  둔다.
- endpoint adapter는 첫 실제 기능 소비 시 추가한다. 예상 공개 함수는
  `signIn`, `getDashboard`, `getTasks`, `getTaskDetail`, `deleteTask`, `getUser`이며
  미사용 함수를 한꺼번에 만들지 않는다.
- bearer header, refresh, bounded replay는 같은 transport 경계 안에서 처리할
  수 있어야 하지만 exact interface와 구현은 `DEC-AUTH-01` 승인 후 정한다.
- sign-in과 delete mutation은 feature가 소유한다. Task와 user 읽기 query는
  entity가, dashboard 읽기 query는 `widgets/dashboard-summary`가 소유한다.

## ApiError 판별 union

`shared/api`가 공개하는 오류는 class 계층 대신 다음 판별 union을 사용한다.

```ts
type ApiError =
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid-response"; status: number; message: string }
  | { kind: "network"; message: string }
  | { kind: "aborted"; message: string };
```

분류 순서는 다음과 같다.

1. fetch가 `AbortError`로 중단되면 `aborted`다.
2. 그 외 fetch 예외는 `network`다.
3. 응답 JSON parsing 또는 기대 응답 형태 검증이 실패하면
   `invalid-response`이며 response status를 보존한다.
4. 유효한 `ErrorResponse`를 포함한 non-2xx 응답은 `http`이며 status와 서버
   `errorMessage`를 보존한다.
5. 유효한 success response만 정상 값으로 반환한다.

`http`, `invalid-response`, `network`는 적용 가능한 widget 또는 feature의
명시적 오류 UI에서 처리한다. `aborted`는 사용자 오류 UI나 알림을 만들지 않는
취소 제어 흐름이다. 취소 시 기존 data가 있으면 유지하고, 없으면 취소 전
idle/loading 전이를 따른다. 인증·삭제 고유 오류 전이는 각 HIGH 결정 뒤에
추가한다.

## mock 경계

- Browser worker는 `mocks/browser`, Vitest server는 `mocks/server`가 소유한다.
- browser와 server는 같은 handler와 fixture를 사용한다.
- handler와 fixture는 해당 endpoint의 첫 실제 소비 시 함께 추가한다.
- mock handler는 OpenAPI method, path, query, request body, status, response
  schema를 유지한다.
- mock state가 삭제 이후 목록·상세·dashboard 값을 어떻게 바꾸는지는
  `DEC-DELETE-01` 전까지 구현하지 않는다.

## import 경계 검증

새 dependency를 추가하지 않고 Biome `noRestrictedImports` override를 layer별로
적용한다.

- 하위 layer에서 상위 layer로 향하는 alias import를 금지한다.
- 같은 layer의 다른 slice로 향하는 alias import를 금지하고 내부 상대 경로만
  허용한다.
- `@/<layer>/<slice>/<internal>` 형태의 public API deep import를 금지한다.
- application source에서 `mocks` import를 금지하되 `main.tsx`의 DEV 동적 import와
  test source만 명시적으로 허용한다.
- `generated` import는 `shared/api` source에만 허용한다.

Biome rule은 빠른 lint feedback을 담당한다. 상대 경로로 layer 또는 slice
경계를 우회하는 경우와 `shared/api` 외부의 generated import는 작은 architecture
contract test가 import를 resolve해 함께 검증한다. 이 test는 설치된 TypeScript와
Node 표준 library만 사용한다.

## test 경계와 검증

### 자동 test

- Architecture contract: 역방향 dependency, 같은 layer slice dependency,
  public API deep import, relative path 우회, generated 독점 경계를 검사한다.
- Router integration: 다섯 URL이 고유 page boundary와 공통 shell로 resolve되는지
  검사한다. 기능 동작은 중복 검증하지 않는다.
- API unit: JSON success, valid `ErrorResponse`, non-JSON 또는 shape mismatch,
  network failure, abort 분류를 각각 검사한다.
- MSW integration: 추가된 endpoint의 method, path, query, body, response가
  OpenAPI와 일치하는지 검사한다.
- Test용 QueryClient는 test마다 새로 만들고 cache와 request를 공유하지 않는다.
- 공통 render helper는 두 번째 실제 소비자가 생길 때만 추출한다.

### browser evidence

`DEC-ARCH-01`은 문서 결정이므로 browser verification을 적용하지 않는다.
후속 `ARCH-02`에서는 다섯 route 직접 진입, 공통 shell, page와 console 오류를
확인한다. `ARCH-03`에서는 대표 loading, recoverable error, success 상태와 DEV
MSW worker 요청을 확인한다. 구체적인 기록 형식은
`docs/coding-standards.md`를 따른다.

### 검증 순서

1. 설계에서 placeholder, 모순, 미결정 architecture, 범위 이탈을 검사한다.
2. module 책임·소비자·공개 interface와 전체 requirement 구조 기반을 대조한다.
3. `./scripts/verify setup`을 실행한다.
4. `git diff --check`와 변경 범위를 확인한다.
5. 작성된 설계 문서를 사람이 검토한 뒤에만 `ARCH-01` 구현 계획으로 전환한다.

## 범위 밖

- 인증 token 저장, cookie, expiry, refresh, replay, 실패 처리, 보호 route 정책
- 삭제 중복 submit, modal close, 실패 UI, cache와 mock fixture 일관성
- 기능별 UI 세부 구조와 심미적 layout
- feature 미구현 상태의 endpoint adapter, handler, fixture
- 새 dependency와 별도 architecture 도구
- 빈 directory, 빈 public API, 미래 확장을 위한 interface와 factory

## 완료 조건

- FSD layer 책임과 단방향 dependency가 명시된다.
- 각 예정 module의 책임, 소비자, 공개 interface가 구분된다.
- provider, route, API, generated, mock, test 경계가 scaffold 및 채택 stack과
  일치한다.
- dashboard를 근거 없이 entity로 취급하지 않는다.
- generated는 `shared/api`만 import하며 외부에 노출하지 않는다.
- 인증 placeholder와 승인되지 않은 인증·삭제 behavior가 없다.
- `ApiError` 네 종류와 취소의 비표시 semantics가 한 가지로 정해진다.
- Biome import restriction과 architecture contract test의 책임이 구분된다.
- 실제 소비 시점에만 directory와 public API를 만든다.
- 후속 구현은 `ARCH-01`, `ARCH-02`, `ARCH-03` 순서로 독립 검증 가능하다.

이 완료는 아키텍처 설계 확정만 의미한다. 기능 구현, Golden Journey 승인,
최종 QA 또는 사람 acceptance 완료를 의미하지 않는다.
