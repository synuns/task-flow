# Task Discovery Journey 전체 루프 설계

## 목적

`task-discovery` Journey를 기존 목록 구현의 재작성으로 다루지 않는다. 승인된
화면·API 계약과 현재 구현을 대조하고, 확인된 gap만 가장 낮은 test 수준에서 교정한
뒤 current target의 evidence, 독립 review와 사람 checkpoint까지 연결한다.

이 문서는 accepted behavior, 인증 정책, OpenAPI schema, architecture와 dependency를
바꾸지 않는다. 기존 `TaskListPage`, `TaskList`, `TaskCard`, task API client,
TanStack Query·Virtual과 MSW fixture를 baseline으로 재사용한다.

## 기준 문서와 우선순위

충돌 시 다음 순서를 적용한다.

1. `assignment-original/openapi.yaml`: endpoint, method, security, query와 schema
2. `assignment-original/requirement.md`: task 목록, 가상화, 무한 scroll과 상세 이동
3. `docs/quality/requirements.md`: `TASK-LIST-01`~`TASK-LIST-05`와 `DISC-*`
4. `docs/project-plan.md`: 범위, architecture, 인증 정책과 검증 전략
5. `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`: 승인된 Focus
   workspace 목록 화면과 responsive 상태
6. 이 문서: `task-discovery`의 gap-first 구현·검증·review 순서
7. `TODO.md`: task 상태, dependency, owner와 evidence

하위 문서는 상위 계약을 확장하거나 완화하지 않는다. 충돌은 `REQUIREMENT` 실패로
기록하고 임의 구현하지 않는다.

## 승인된 방향

사용자는 2026-09-02 다음 방향을 순서대로 승인했다.

- `TASK-CARD-VIEW-01`부터 시작해 사람 checkpoint 요청까지 진행
- 현재 구현을 baseline으로 사용하는 Journey 단위 gap-first 접근
- `TASK-LIST-01`~`TASK-LIST-05`, `/task`, 상세 이동 `/task/:id` 범위
- OpenAPI bearer task page 계약과 기존 FSD/query/API 경계 유지
- flat task Card, responsive virtual viewport, 자동 pagination과 구분된 상태 화면
- focused, quick, 두 viewport browser, mapped E2E, full과 second-pass review

## 요구사항과 Journey 경계

| Requirement | 관찰 가능한 결과 | 주 evidence |
| --- | --- | --- |
| `TASK-LIST-01` | `/task`가 bearer `GET /api/task?page=1`을 한 번 요청하고 data를 표시한다. | integration + network |
| `TASK-LIST-02` | 각 card가 response의 `title`, `memo`를 구분해 표시한다. | component + browser |
| `TASK-LIST-03` | fetched item이 늘어도 mounted row는 viewport 주변으로 제한된다. | integration + browser |
| `TASK-LIST-04` | 끝 도달마다 다음 page를 한 번 요청하고 `hasNext: false`에서 멈춘다. | integration + browser |
| `TASK-LIST-05` | card 선택이 response `id`를 encode한 `/task/:id`로 이동한다. | component + browser |

독립 초기 상태는 승인된 authenticated fixture, fresh QueryClient, reset task store와
page request count 0이다. `task-discovery`는 sign-in Journey를 선행 실행하거나
`/api/sign-in`을 호출하지 않는다.

| Journey case | 경계 | Expected |
| --- | --- | --- |
| `DISC-P1-1` | `/task` initial request | page 1 한 번과 data rendering |
| `DISC-P1-2` | Card content | title·memo 표시, status UI 없음 |
| `DISC-P1-3` | growing list scroll | mounted rows가 viewport 주변으로 제한 |
| `DISC-P1-4` | terminal page | page별 한 번 요청, false 뒤 중단 |
| `DISC-P1-5` | Card selection | response ID를 사용한 exact detail route |
| `DISC-E1` | empty terminal response | 구분된 empty state, 추가 요청 없음 |
| `DISC-E2` | repeated end trigger | 같은 page 동시 요청 하나, terminal 뒤 0회 |
| `DISC-E3` | invalid 또는 expired auth | 승인된 session recovery와 route 결과 |

## OpenAPI 계약 context

### 목록 요청

- Request: bearer가 필요한 `GET /api/task`
- Required query: `page`, integer, minimum `1`
- `200`: additional property 없는 `TaskListResponse`
  - `data`: required `TaskItem[]`
  - `hasNext`: required boolean
- `401`: required string `errorMessage`를 가진 `ErrorResponse`

`TaskItem`은 required string `id`, `title`, `memo`와 enum `TODO | DONE`인 `status`를
가진다. 화면은 원본 요구대로 `title`, `memo`만 표시한다. `status`는 response guard와
fixture 일관성에 사용하되 badge, filter 또는 별도 상태 UI로 확장하지 않는다.

페이지 번호는 `1`부터 순차 증가한다. `hasNext`만 다음 page 존재 여부를 결정하며,
빈 중간 page라도 `hasNext: true`이면 다음 page로 진행한다. OpenAPI에 없는 error body,
search, sort, filter와 page-size parameter를 제품 계약으로 추가하지 않는다.

### 상세 이동 경계

Card는 목록 response의 string `id`를 `encodeURIComponent`로 path segment에 넣는다.
이 Journey는 `/task/:id` 진입까지만 소유하며 상세 조회·404·삭제 화면은
`task-resolution`의 책임이다.

## 화면 디자인 context

### Page와 Card

- Page title `할 일`과 짧은 설명 뒤 남은 viewport를 쓰는 scroll region을 둔다.
- 반복 item은 기존 shadcn `Card` 기반 flat row이며 shadow를 추가하지 않는다.
- 한 Link 안에 title, memo와 장식용 방향 icon을 배치해 card 전체가 action이 된다.
- title과 memo는 시각·semantic hierarchy를 유지하고 status는 표시하지 않는다.
- 공통 dark-gold focus outline과 hover surface로 pointer·keyboard 상태를 전달한다.
- Mobile에서는 text wrapping과 row measurement를 허용하고 horizontal clipping을
  만들지 않는다.

### Virtual viewport와 pagination

- Page와 widget은 `flex` column, scroll region은 `min-height: 0; flex: 1`로 남은
  viewport를 사용한다.
- `96px`은 virtualizer의 초기 row estimate이지 scroll viewport의 고정 높이가 아니다.
- stable domain `id`, measurement와 scroll position을 유지한다.
- 목록 끝 감지가 다음 page 요청의 primary trigger다.
- 수동 next Button은 자동 pagination을 대체하지 않는 low-emphasis fallback이다.
- page별 in-flight 요청은 하나며 terminal `hasNext: false` 이후 요청하지 않는다.

### 상태 문법

| State | 화면 결과 |
| --- | --- |
| initial loading | final row geometry를 예약하는 Skeleton과 text status |
| empty terminal | `등록된 할 일이 없습니다.`와 생성 action 없는 설명 |
| success | virtualized Card rows와 usable scroll region |
| next-page loading | 기존 rows를 유지하고 text status와 Skeleton row 표시 |
| partial-page error | 기존 rows를 유지하고 Alert와 `다시 불러오기` 제공 |
| terminal | `모든 할 일을 불러왔습니다.` 표시, 추가 page 요청 없음 |

401 session과 route 결과는 승인된 authentication policy를 그대로 사용한다. 인증
복구를 위해 task widget에 token, refresh, navigation 또는 cache cleanup을 복제하지
않는다.

## 현재 baseline

다음 구현은 교체 대상이 아니다.

- `src/pages/task-list/index.tsx`: page heading과 responsive remaining-height composition
- `src/widgets/task-list/index.tsx`: infinite query, virtualizer, 상태와 page trigger
- `src/entities/task/ui/task-card.tsx`: whole-card encoded Link와 title/memo rendering
- `src/shared/api/tasks.ts`: generated contract guard와 `GET /api/task?page=N`
- `src/entities/task/model/task-keys.ts`: protected task query root
- `src/mocks/fixtures/tasks.ts`: reset 가능한 two-page task store
- `src/mocks/handlers/tasks.ts`: bearer task list handler
- `e2e/task-discovery.spec.ts`: authenticated page sequence, bounded DOM와 상세 이동

기존 `docs/quality/evidence/task-discovery.md`는 과거 commit과 96px viewport baseline을
기록한다. 새 Journey verify는 이를 current target evidence로 간주하지 않고 명령,
browser action, request count와 exact SHA를 새로 기록한다.

## Architecture와 data flow

```text
approved authenticated fixture
  → AuthRouteBoundary
  → TaskListPage
  → TaskList useInfiniteQuery
  → injected ApiClient
  → bearer GET /api/task?page=N
  → generated-contract runtime guard
  → flattened TaskItem[]
  → TanStack Virtual visible range
  → TaskCard Link
  → encoded /task/:id
```

- Page는 route composition과 available height만 소유한다.
- Widget은 query, pagination, virtual range와 list state를 소유한다.
- Entity는 한 task의 표시와 detail navigation만 소유한다.
- Shared API는 URL, AbortSignal과 response validation을 소유한다.
- Auth adapter와 QueryClient가 bearer, refresh, request deduplication과 protected cache를
  계속 소유한다.
- server state를 local state로 복제하거나 raw `fetch`를 page/widget에 추가하지 않는다.

## Task 경계와 dependency

### `TASK-CARD-VIEW-01`

- 입력: verified TaskItem/link와 공통 Card/focus token
- 소유: title/memo hierarchy, whole-card encoded Link, pointer와 keyboard state
- 비소유: pagination, API와 detail page rendering

### `TASK-LIST-VIRTUAL-UX-01`

- 입력: completed Card와 existing TanStack Virtual flow
- 소유: responsive remaining-height scroll region, measurement, bounded DOM와 stable scroll
- 비소유: page lifecycle message와 API response meaning

### `TASK-LIST-PAGING-UX-01`

- 입력: usable virtual viewport와 existing infinite query
- 소유: automatic end trigger, one in-flight request, partial error retry와 terminal stop
- 비소유: auth replay와 fixture mutation

### `TASK-LIST-STATES-01`

- 입력: completed paging lifecycle와 common state UI
- 소유: initial loading, empty, partial error, next loading와 terminal presentation
- 비소유: 새 API status 또는 생성 action

### `TASK-LIST-JOURNEY-VERIFY-01`

- 입력: 네 implementation task의 current target
- 소유: focused, quick, mapped Playwright, full과 named browser evidence 통합
- production 변경은 소유하지 않는다. 실패 시 root cause task를 다시 연다.

### `TASK-LIST-JOURNEY-REVIEW-01`

- 입력: verify target, plan과 evidence
- 소유: author와 분리된 second-pass adversarial review와 finding correction 확인

### `JOURNEY-TASK-LIST-01`

- 입력: current evidence와 PASS review
- 소유: 사람 checkpoint 기록만 담당한다. AI는 `HUMAN_APPROVED`를 기록하지 않는다.

## Gap-first 실행 규칙

각 implementation task는 다음 순서를 따른다.

1. dependency가 완료된 `NOT_STARTED` task 하나만 `IN_PROGRESS`로 만든다.
2. requirement, route, API path와 symbol을 requirements, TODO, source, test, E2E에서
   다시 검색한다.
3. current behavior와 이 문서의 acceptance를 대조한다.
4. 실제 gap이 있으면 가장 낮은 test를 작성해 예상한 이유의 RED를 확인한다.
5. 최소 production 변경으로 GREEN을 만들고 인접 suite를 재실행한다.
6. gap이 없으면 억지 RED, duplicate assertion과 production diff를 만들지 않는다.
7. focused test, `./scripts/verify quick`과 적용 가능한 browser QA를 실행한다.
8. failure를 분류하고 root cause를 교정한 뒤 같은 gate를 재실행한다.
9. current commit evidence가 재현될 때만 해당 task를 `AI_VERIFIED`로 닫는다.

## 검증과 evidence

### 자동 검증

- Card: title/memo, status 부재, whole-card accessible Link와 encoded `id`
- Widget: page 1, empty intermediate page, one in-flight, retry, terminal stop
- Virtual boundary: responsive scroll element, stable key, mounted row bound와 stable scroll
- API: exact method/query, AbortSignal, generated response guard와 bearer adapter
- Journey: `pnpm exec playwright test e2e/task-discovery.spec.ts`
- Gates: 각 task의 `./scripts/verify quick`, Journey target의 `./scripts/verify full`

이미 충분한 assertion은 복제하지 않는다. Browser-only focus, real scroll, layout과
network sequence를 class 기반 component assertion으로 대신하지 않는다.

### Browser 검증

Named agent-browser session은 task ID를 사용하고 다음을 기록한다.

- `/task`, `/task/task-3`, `390x844`와 `1280x720`
- approved authenticated fixture, fresh query와 reset task store
- pointer와 keyboard Card focus·navigation
- 실제 wheel/keyboard scroll, viewport와 row size, mounted DOM count
- exact `GET /api/task?page=1`, terminal page 2, method·query·count와 bearer
- loading, terminal과 재현 가능한 error/retry 상태
- horizontal clipping, console, page error와 예상하지 않은 network request
- screenshot 또는 trace, expected/actual, correction과 rerun verdict

Mapped E2E는 대표 success 한 건을 유지한다. Integration으로 증명 가능한 상태별 E2E를
추가하지 않는다.

## Failure와 review

- payload, query, security 또는 status 불일치: `REQUIREMENT` 또는 `INTEGRATION`
- Card, state 또는 retry rendering 결함: `IMPLEMENTATION`
- pagination race, route, bearer 또는 cache 결함: `INTEGRATION`
- keyboard, focus, clipping, scroll 또는 상태 전달 결함: `UX_ACCESSIBILITY`
- weak, duplicate 또는 flaky assertion: `TEST`
- browser/server/runtime 문제: `ENVIRONMENT`
- verify, formatter 또는 runner 문제: `TOOLING`

Journey verify 뒤 exact target SHA를 final change author와 분리된 second-pass 역할이
검토한다. Requirement·`DISC-*` 누락, OpenAPI, pagination race, bounded DOM,
keyboard/scroll, 401 경계, negative states, weak tests, console/network, unrelated diff,
evidence와 TODO 정합성을 확인한다. HIGH/MEDIUM finding은 수정·재검증한 뒤에만 PASS를
기록한다. Plan과 Journey target이 같으면 같은 review record를 재사용한다.

## 제외 범위

- task 목록, virtualizer 또는 query flow 재작성
- status badge, 생성·수정·검색·정렬·filter action
- API endpoint, query, response field, status와 fixture 의미 추가
- auth storage, refresh, replay 또는 protected-route 정책 변경
- 새 dependency, generic list abstraction과 production debug surface
- 상태별 E2E 증식과 screenshot-only pass 판정

## 완료 조건

- `TASK-CARD-VIEW-01`, `TASK-LIST-VIRTUAL-UX-01`, `TASK-LIST-PAGING-UX-01`,
  `TASK-LIST-STATES-01`이 current automatic/browser evidence와 함께 `AI_VERIFIED`다.
- `TASK-LIST-JOURNEY-VERIFY-01`이 focused, quick, mapped E2E, full과 named browser
  evidence를 exact target에 연결한다.
- `TASK-LIST-JOURNEY-REVIEW-01`이 unresolved HIGH/MEDIUM finding 없는 review record를
  가진다.
- 예상하지 않은 console/network 오류, 관련 없는 diff와 evidence 누락이 없다.
- 사람이 current evidence와 review를 검토할 수 있는 checkpoint 요청 상태다.

이 완료 조건은 `JOURNEY-TASK-LIST-01`의 사람 `HUMAN_APPROVED`를 대신하지 않는다.
