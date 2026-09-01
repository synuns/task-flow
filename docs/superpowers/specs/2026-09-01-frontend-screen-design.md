# 화면 구성과 Journey UX 설계

## 목적

기능과 API 동작이 구현된 현재 애플리케이션에 일관된 화면 위계와 responsive
layout을 적용한다. 디자인은 사용자가 현재 상태를 빠르게 읽고 다음 행동 하나에
집중하도록 하며, 과제 원본·OpenAPI·Golden Journey의 accepted behavior는 바꾸지
않는다.

구체적인 subject는 **개인 업무를 확인하고 정리하는 중립적인 task workspace**다.
대상은 로그인 후 자신의 업무 현황과 할 일을 확인하는 단일 사용자이며, 제품의
한 가지 핵심 job은 **현재 남은 업무를 파악하고 확인·해결할 task로 이동하는 것**이다.

## 기준과 범위

충돌 시 다음 순서를 따른다.

1. `assignment-original/openapi.yaml`: API route, schema, status, security
2. `assignment-original/requirement.md`: 화면과 interaction
3. `docs/quality/requirements.md`: requirement ID와 Journey acceptance
4. `docs/project-plan.md`: 전체 구조와 승인된 정책
5. 이 문서: 시각 위계, responsive layout, component와 상태 표현

대상 requirement는 `NAV-01`~`NAV-03`, `DASH-01`, `AUTH-01`~`AUTH-06`,
`TASK-LIST-01`~`TASK-LIST-05`, `TASK-DETAIL-01`~`TASK-DETAIL-05`, `USER-01`,
`SYS-02`, `SYS-03`이다. `AUTH-07`의 token·refresh·route 결과와 삭제 의미는 각각
승인된 인증·삭제 정책을 그대로 사용한다.

### 포함

- 다섯 route와 공통 application shell
- desktop sidebar와 mobile bottom navigation
- dashboard, sign-in, task 목록, task 상세·삭제, profile의 시각 위계
- loading, empty, recoverable error, 404, success, submitting/pending 상태
- 오케어 Yellow 기반 semantic color와 Pretendard type scale
- shadcn/ui 기반 interactive primitive와 접근성·responsive 검증 기준

### 제외

- 검색, 정렬, filter, task 생성·수정, logout, theme toggle
- API field, status, endpoint 또는 fixture behavior 추가
- 건강관리 문구나 오케어 앱 기능을 과제 domain에 이식하는 변경
- 새 logo, illustration, image asset, 대규모 animation
- 인증·삭제 정책, FSD 경계, query/cache 의미 변경

## 조사 결과와 선택

현재 구현은 semantic HTML과 Journey 동작을 제공하지만 layout과 component style은
거의 적용되지 않았다. 다섯 route와 desktop/mobile browser 화면을 확인한 결과,
navigation·heading·form·목록이 browser 기본 flow로 왼쪽 위에 밀집되어 있었다.

다음 세 layout을 비교했다.

- **Focus workspace:** sidebar와 문장형 현황을 사용해 다음 업무에 집중한다.
- **Calm console:** 상단 navigation과 세 metric card를 사용하는 익숙한 dashboard다.
- **Operator rail:** icon rail과 상시 queue를 사용하는 고밀도 운영 화면이다.

사용자는 Focus workspace를 선택했다. Calm console은 과제형 dashboard 인상이
강하고, Operator rail은 현재 세 navigation action과 작은 data 규모에 비해 무겁다.

초기 Focus workspace의 task 개수별 분할 막대는 task가 많을 때 확장되지 않으므로
제거했다. KPI card도 사용하지 않는다. 이 제품의 signature는 dashboard의
**현황 문장 + 하나의 연속 completion rail**에만 둔다.

## 필요한 화면과 상태

| 화면 | Route | 핵심 job | 필수 상태 | Journey |
| --- | --- | --- | --- | --- |
| 공통 shell | 모든 route | 현재 위치와 primary route 이동 | signed-out, signed-in, mobile, desktop | 전체 |
| Dashboard | `/` | 전체·남은·완료 업무 파악 | loading, error, zero-data success, success | work-overview |
| Sign-in | `/sign-in` | 유효한 credential 제출 | pristine, invalid, valid, submitting, API error, success | auth-entry |
| Task 목록 | `/task` | 가상 목록 탐색과 상세 이동 | initial loading, empty, success, page loading, page error, terminal | task-discovery |
| Task 상세 | `/task/:id` | 내용 확인과 삭제 진입 | loading, error, 404, success | task-resolution |
| 삭제 확인 | 상세 modal | exact ID 확인 후 삭제 | idle, invalid, valid, pending, failure, absent, unknown | task-resolution |
| Profile | `/user` | name과 memo 확인 | loading, error, success | work-overview |

별도 route가 아닌 modal과 상태도 화면 설계 대상으로 취급한다. 다만 같은 의미를
가진 상태는 공통 문법과 shadcn/ui primitive를 재사용한다.

### Requirement trace

| Requirement | 설계 위치 |
| --- | --- |
| `SYS-02`, `SYS-03` | 기준 palette, semantic token, Pretendard typography |
| `NAV-01`, `NAV-02`, `NAV-03` | desktop sidebar, mobile icon+label bottom navigation, 상호 배타 auth action |
| `DASH-01` | 현황 문장, completion rail, 세 값 description list |
| `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04` | visible Label, Input, inline error, valid-only Button |
| `AUTH-05`, `AUTH-06` | submitting state와 API `errorMessage` Dialog |
| `TASK-LIST-01`, `TASK-LIST-02` | page 1 data를 title·memo flat Card로 표시 |
| `TASK-LIST-03`, `TASK-LIST-04` | 남은 viewport scroll region, 가상화, next-page·terminal state |
| `TASK-LIST-05` | Card 전체의 detail Link |
| `TASK-DETAIL-01`, `TASK-DETAIL-02` | success document layout과 404 목록 복구 state |
| `TASK-DETAIL-03`, `TASK-DETAIL-04` | exact-ID Input을 가진 AlertDialog와 disabled guard |
| `TASK-DETAIL-05` | pending·failure·success 표현과 승인된 `/task` redirect |
| `USER-01` | name·memo description layout |

## 시각 언어

### Color 근거

[KB오케어 App Store](https://apps.apple.com/kr/app/kb%EC%98%A4%EC%BC%80%EC%96%B4/id1597675315)의
현재 screenshot을 조사했다. 주요 CTA와 핵심 card에는 선명한 yellow가 반복되고,
넓은 promo background에는 pale blue, 실제 content surface에는 white, text에는
charcoal이 사용된다. screenshot pixel 기준 대표값은 Ocare Yellow `#FFD700`,
Ocare Sky `#E0E8F1`이다.

[Adobe Color 색상환](https://color.adobe.com/kr/create/color-wheel)의 base color와
harmony 원칙을 참고한다. Yellow를 dominant hue로 유지하고 반대편 blue는 채도를
크게 낮춘 Sky surface로만 사용한다. Screenshot의 pink, green, vivid blue는 특정
content illustration에 한정되므로 전역 token으로 확대하지 않는다.

### 기준 palette

| 이름 | Hex | 역할 |
| --- | --- | --- |
| Ocare Yellow | `#FFD700` | primary action, progress, 선택 강조 surface |
| Ocare Sky | `#E0E8F1` | sidebar, secondary와 skeleton surface |
| Surface | `#FFFFFF` | card, input, dialog, main content |
| Ink | `#1F242B` | foreground, Yellow 위 text, active icon |
| Muted | `#616A75` | 보조 text와 metadata |
| Destructive | `#B33A32` | delete와 critical error |

Border와 soft accent는 기준색을 새 literal로 복제하지 않고 `color-mix()`로 만든다.
Focus ring은 white에서 4.92:1인 dark gold `#8A6D00`을 사용한다. 대표 text contrast는
Ink/Yellow 11.13:1, Ink/Sky 12.62:1, Ink/Surface 15.61:1,
Muted/Surface 5.49:1, Surface/Destructive 5.89:1이다.

구현은 shadcn semantic token 이름을 유지한다.

- `primary`: Ocare Yellow, `primary-foreground`: Ink
- `background`: Ocare Sky와 Surface 사이의 매우 옅은 canvas
- `card`, `popover`: Surface
- `foreground`: Ink
- `secondary`, `muted`, `sidebar`: Ocare Sky의 명도 변형
- `muted-foreground`: Muted
- `destructive`: Destructive
- `ring`: dark gold

`.dark` token은 기존 계약 호환을 유지하되 새 toggle을 만들지 않는다. Dark에서는
charcoal surface 위 Ocare Yellow를 primary로 유지하고 text contrast를 보정한다.
이번 화면 acceptance의 기준 appearance는 light다.

### Typography

- Display: local Pretendard Variable, weight 700~720, tight tracking. Page title과
  dashboard 현황 문장에만 사용한다.
- Body/control: Pretendard Variable, weight 400~600. Label, paragraph, navigation,
  button에 사용한다.
- Utility: system monospace. 삭제 확인의 route ID처럼 exact character 비교가
  필요한 값에만 사용한다. 일반 datetime과 수치에는 Pretendard tabular numeral을
  사용한다.

표준 본문은 16px를 유지한다. 보조 text도 12px 아래로 내려가지 않으며 mobile input은
zoom을 막기 위해 16px 이상을 유지한다.

### Spacing과 shape

- 4px base grid를 사용하고 page spacing은 주로 8, 12, 16, 24, 32, 48px을 쓴다.
- Main content는 desktop에서 최대 960px이며 넓은 화면 중앙에 둔다.
- Sidebar는 224px, desktop navigation target은 최소 44px다.
- Card와 dialog radius는 12px, input과 button은 8px를 기본으로 한다.
- Shadow는 modal과 떠 있는 mobile navigation 경계에만 약하게 사용한다.
- 반복 task card에는 shadow를 사용하지 않고 border와 spacing으로 구분한다.

## Responsive application shell

### Desktop과 tablet: 768px 이상

- 왼쪽 224px sidebar와 main content의 두 열 구조를 사용한다.
- Sidebar 위에는 중립적인 product label `업무 관리`만 표시한다. 새 logo는 만들지
  않는다.
- Dashboard, task action은 항상 보인다. 인증 action은 sign-in과 profile 중 정확히
  하나만 보인다.
- Profile 또는 sign-in action은 sidebar 아래에 두어 primary 업무 이동과 분리한다.
- 현재 route는 soft Yellow surface, dark-gold left indicator, `aria-current="page"`로
  표시한다.

### Mobile: 767px 이하

- Sidebar를 숨기고 같은 세 action을 viewport 아래 bottom navigation으로 옮긴다.
- Action마다 기존 Lucide의 서로 다른 icon과 visible text label을 함께 사용한다.
  - Dashboard: `LayoutDashboard`
  - Task: `ListTodo`
  - Signed-out: `LogIn`
  - Signed-in: `CircleUserRound`
- Icon은 20px를 기준으로 하고 text보다 먼저 인지되도록 하되 icon-only control로
  만들지 않는다.
- 각 tab은 최소 48px touch target을 가지며 bottom safe-area inset을 포함한다.
- 현재 tab은 soft Yellow surface와 dark-gold top indicator, icon/text의 Ink 색으로
  전달한다. 상태를 Yellow 하나에만 의존하지 않는다.
- Main content는 bottom navigation 높이만큼 padding을 확보해 마지막 task와 action이
  가려지지 않게 한다.

Breakpoint는 두 단계만 둔다. 별도 tablet rail은 현재 navigation 수에 필요하지 않다.

## Journey별 UX

### Auth entry

`/sign-in`에서도 공통 navigation을 유지한다. Main content 안에는 너비 420px 이하의
단일 form을 두고 다음 순서로 읽히게 한다.

1. `로그인` page title
2. `업무 목록을 확인하려면 로그인하세요.` 설명
3. Email visible label과 input, 연결된 inline error
4. Password visible label, 규칙 도움말, input, 연결된 inline error
5. `로그인` primary Button

Button은 두 입력이 유효할 때만 Yellow로 활성화한다. Submitting 중 label은
`로그인 중`으로 바뀌고 중복 submit을 막는다. Non-200 `errorMessage`는 shadcn
`Dialog`에 표시하며 `닫기` 후 submit button으로 focus를 복구한다. 별도 hero,
illustration, 회원가입 link는 만들지 않는다.

### Work overview

Dashboard는 metric card 세 개를 만들지 않는다.

1. `오늘의 업무 현황` eyebrow
2. `{numOfTask}개 중 {numOfRestTask}개가 남았습니다` 현황 문장
3. `numOfDoneTask / numOfTask 완료` text와 completion rail
4. 전체·남은·완료 값을 모두 담은 horizontal description list

Total이 0이면 문장은 `등록된 할 일이 없습니다`로 바꾸되 세 metric `0`은 그대로
보인다. Completion rail은 0으로 표시한다. 성공 data가 변할 때 rail만 180ms로
연결하며 `prefers-reduced-motion: reduce`에서는 즉시 반영한다.

Profile은 avatar나 추가 field를 만들지 않는다. `회원정보` title 아래 name과 memo를
한 개의 조용한 description card에 표시한다.

### Task discovery

Page title과 짧은 설명 뒤 가상화 scroll region을 둔다. 각 item은 shadcn `Card`를
기반으로 한 flat row이며 title, memo, detail 방향 indicator를 한 개의 link 안에
배치한다. OpenAPI의 `status`는 화면에 표시하지 않는다.

Page는 flex column, scroll region은 `min-height: 0; flex: 1`을 사용해 남은 viewport를
차지한다. Virtualizer의 stable domain key와 measurement behavior는 유지한다.
Mobile에서는 card height와 text wrapping을 허용하고 horizontal clipping을 만들지
않는다.

- Initial loading: 최종 row와 같은 geometry의 `Skeleton`
- Empty: `등록된 할 일이 없습니다.`만 표시. 생성 CTA는 추가하지 않는다.
- Page loading: 목록 아래 text status와 Skeleton row
- Page error: 기존 item을 유지하고 `Alert`와 `다시 불러오기` Button 제공
- Has next: 자동 infinite trigger를 primary로 유지하고 현재 manual next Button은
  low-emphasis fallback으로 보존
- Terminal: `모든 할 일을 불러왔습니다.`라는 짧은 종료 문구

### Task resolution

Success detail은 문서처럼 읽히는 한 열 layout이다.

1. `할 일 목록` back link
2. Task title
3. Memo
4. 사람이 읽기 쉬운 `registerDatetime`과 원본 `dateTime` attribute
5. 분리된 destructive 영역의 `할 일 삭제` Button

404는 API `errorMessage`, resource-missing 설명, `할 일 목록으로 이동` Button 하나만
보인다. 다른 query error는 `다시 불러오기`를 제공한다.

삭제는 shadcn `AlertDialog`를 사용한다. Task ID는 monospace로 보여주고 visible
`할 일 ID` Label과 Input을 제공한다. Exact route ID가 아니면 `삭제 확인`은
disabled다. Pending 중 dialog close와 중복 submit을 막고 진행 text를 표시한다.
Failure, absent, unknown과 success route 결과는 승인된 삭제 정책을 그대로 따른다.

### Profile

`회원정보` page title 아래 name과 memo를 `dl` 기반 description layout으로
표시한다. Loading은 같은 geometry의 Skeleton, error는 Alert와 retry Button을 쓴다.
Edit action, avatar, 연락처, logout은 만들지 않는다.

## 공통 상태 문법

- Loading: 최종 content와 같은 공간을 예약하는 Skeleton을 사용한다.
- Empty: 현재 사용자가 할 수 있는 scope 안의 행동만 제안한다. 행동이 없으면
  설명만 표시한다.
- Recoverable error: 구체적인 message와 retry action을 한 Alert에 둔다.
- 404: resource가 없음을 설명하고 목록 복구 action을 가장 높은 강조로 둔다.
- Success: route의 핵심 정보와 다음 행동 하나를 먼저 보인다.
- Pending: 중복 요청을 막고 진행 상태를 text와 `aria-busy`로 전달한다.
- Modal: login error는 Dialog, destructive confirmation은 AlertDialog로 구분한다.

Error, disabled, active, progress 상태는 color만으로 전달하지 않는다.

## shadcn/ui component 결정

Interactive primitive는 저장소의 기존 component를 먼저 찾고, 없으면 공식 shadcn
registry의 다음 component만 검토한다.

- `Button`: primary, secondary, ghost, destructive action
- `Input`, `Label`: sign-in과 delete exact-ID form
- `Card`: dashboard description surface, task row, profile description
- `Alert`: recoverable query error와 inline delete outcome
- `Dialog`: sign-in API error
- `AlertDialog`: destructive delete confirmation
- `Skeleton`: loading geometry
- `Progress`: dashboard completion rail

Native `nav`, `dl`, `time`, `form`, React Router `NavLink`와 Lucide icon은 그대로 쓴다.
세 action뿐인 shell에 shadcn `Sidebar` 전체를 추가하지 않는다. Layout을 위해
interactive abstraction을 늘릴 이유가 없기 때문이다.

현재 repository의 `shared/ui`에는 shadcn primitive가 없고 custom `Modal`만 있다.
구현 계획은 official registry source와 생성 diff를 확인하고 custom Modal 사용처를
Dialog/AlertDialog로 교체한다. Registry 추가가 새 runtime dependency를 요구하면
정확한 package와 이유를 계획에 적고, 프로젝트 규약의 HIGH-risk dependency 결정
승인을 받은 뒤 설치한다.

## Data와 module 경계

UI 변경은 기존 data flow를 바꾸지 않는다.

```text
Route page
  → existing widget/feature
  → existing TanStack Query 또는 React Hook Form state
  → shadcn primitive에 좁은 props 전달
  → semantic token으로 rendering
```

- Page는 route composition만 담당한다.
- App shell은 navigation layout과 auth action 표시만 소유한다.
- Dashboard/user/task widget은 기존 query와 state 분기를 유지한다.
- Sign-in과 delete feature는 기존 validation, pending guard, API transition을 유지한다.
- `shared/ui`는 domain behavior를 갖지 않는 shadcn primitive만 제공한다.
- API client, generated OpenAPI type, MSW fixture와 cache policy는 변경하지 않는다.

## Accessibility

- 모든 navigation item은 distinct icon과 visible label, accessible name을 가진다.
- 현재 route는 `aria-current="page"`로 표시한다.
- Keyboard focus ring은 2px dark gold와 충분한 offset을 사용한다.
- Label association과 inline error description을 유지한다.
- Heading과 landmark 순서를 route마다 일관되게 유지한다.
- Dialog/AlertDialog의 accessible name, initial focus, focus trap, Escape/close,
  focus restore를 검증한다. Pending delete는 승인된 close lock을 따른다.
- Virtual list scroll region에는 visible 또는 accessible label을 제공한다.
- Mobile bottom navigation은 zoom, safe area, touch target, content overlap을
  browser에서 확인한다.

## 검증 설계

### 자동 검증

- 기존 Journey component/integration test는 class나 pixel이 아니라 accessible
  name, visible content, enabled state와 route 결과를 계속 검증한다.
- App shell test는 desktop/mobile에 상관없이 dashboard/task와 상호 배타 auth
  action, distinct icon, `aria-current`를 확인한다.
- Theme contract는 여섯 기준색의 semantic token 연결과 component-local color
  literal 금지를 확인한다.
- Dashboard completion 계산을 순수 함수로 분리할 필요가 생기면 total 0과 정상
  비율을 증명하는 최소 unit test 하나만 추가한다.
- Dialog/AlertDialog 전환은 error message, exact ID guard, pending lock, focus
  restore 기존 acceptance를 유지한다.
- Targeted test 뒤 `./scripts/verify quick`, 최종 implementation 뒤
  `./scripts/verify full`을 실행한다.

### Browser 검증

- Desktop: 1280×800에서 다섯 route의 sidebar, current route, content width,
  virtual scroll와 modal을 확인한다.
- Mobile: 390×844에서 icon+label bottom navigation, 48px target, safe-area와
  content overlap, form zoom/clipping, modal overflow를 확인한다.
- Auth 전후 sign-in/profile action의 icon과 label이 정확히 하나만 존재하는지
  확인한다.
- Loading, empty, error, 404, success와 pending 상태를 applicable route에서
  확인한다.
- Ocare Yellow/Sky token, Pretendard computed font, focus visibility,
  reduced-motion을 확인한다.
- Console/page error와 예상하지 않은 network request가 없어야 한다.

Browser evidence는 기존 네 Golden Journey record를 재사용하거나 같은 format으로
확장한다. 이 설계 승인 자체는 Golden Journey의 `HUMAN_APPROVED`를 뜻하지 않는다.

## 구현 제약과 완료 조건

- 기존 기능 behavior, authentication, destructive-data semantics를 보존한다.
- 새 dependency는 exact registry diff와 사람 승인 전 추가하지 않는다.
- CSS color는 semantic token만 소비하고 feature-local literal을 만들지 않는다.
- Shadcn primitive에 domain behavior를 넣지 않는다.
- Desktop과 mobile 모두 현재 route, 핵심 정보, 다음 action, 복구 action 순서로
  읽힌다.
- 모든 requirement와 Journey test가 유지되고 browser evidence가 새 layout을
  증명한다.

## 승인 기록

2026-09-01 사용자 대화에서 다음을 순서대로 승인했다.

1. Neutral task workspace 방향
2. Focus workspace layout
3. 네 Journey의 목표 행동과 상태 구조
4. KB오케어 App Store screenshot 기반 Yellow palette
5. Desktop sidebar와 mobile bottom navigation
6. Mobile navigation에서 distinct icon을 적극적으로 활용하는 조건

이 승인은 화면 설계에 대한 것이며 dependency 변경, Golden Journey checkpoint,
최종 acceptance를 대신하지 않는다.
