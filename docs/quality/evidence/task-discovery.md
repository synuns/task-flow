# Task Discovery Evidence

## JOURNEY-TASK-LIST-01 — HUMAN_APPROVED

Human checkpoint: 2026-09-02 사용자가 current evidence와 수동 체크리스트 검토를
완료하고 승인 checkbox 기록을 명시했다.
Approved source/review: `b7790542226fcfb5ff5332692386343797f9b7fb` /
`f646f4663acebc58e61095b5cc66bd2bdf98f9c0`, independent review PASS
Approved scope: desktop/mobile 목록, Card 내용·keyboard navigation, virtual scroll,
terminal pagination, 상세 이동, console/error 확인과 자동 negative-state evidence
Status: `HUMAN_APPROVED`; 이 기록은 사용자의 명시적 checkpoint 승인을 반영한다.

## TASK-PAGE-DOCUMENT-SCROLL-01 — checkpoint candidate

Requirement/Journey: `TASK-LIST-03`, `TASK-LIST-04`; `task-discovery`, `task-crud`
Implementation target: `7d995995b71b464a7249266849a8e6de8c1c116c`
Session/branch: Codex `/root`; `fix/task-page-document-scroll`
Automatic checks: focused Task list/page Vitest PASS, 2 files/10 tests; `pnpm verify quick`
PASS, hook 84, verifier 21, Vitest 49 files/308 tests; mapped Chromium
`e2e/task-discovery.spec.ts e2e/task-crud.spec.ts` PASS, 3/3
Agent-browser session: `task-page-document-scroll`; production preview
Route/Viewport: `/task`; Chromium `1280x400`, `390x844`
Actions/actual: document bottom까지 window scroll해 `/api/task?page=1..15`를 순서대로
각 1회 불러왔다. 목록 region의 `overflow-y`는 desktop/mobile 모두 `visible`이고
`scrollHeight === clientHeight`였다. terminal 문구는 같은 region 내부 최하단에 있으며
수동 `다음 페이지 불러오기` 버튼은 없었다. Desktop은 문서 3100/viewport 400px,
scrollY 2700, mounted 4/30이고 mobile은 문서 3200/viewport 844px, scrollY 2356,
mounted 8/30, 폭 390/390이었다. Mobile terminal bottom 732px은 고정 하단 navigation
top 779px 위에 있어 가리지 않았다
Contract/navigation: mapped E2E가 bearer authorization, exact page 1~15, terminal stop,
bounded mounted rows, 마지막 `task-30` 상세 이동을 검증했다. Task CRUD Journey도 제거된
버튼 대신 document scroll로 목표 task를 찾고 기존 수정·상태 변경·삭제 흐름을 유지했다
Console/Network: Resource Timing에서 exact page `1`~`15`를 확인했다. console은 MSW
200 informational logs만 있었고 page error는 없었다. agent-browser request monitor의
MSW Service Worker 미수집은 기존 `TOOLING` 제약이며 Resource Timing과 Playwright로
보완했다
Screenshot/Trace: `/tmp/kbhc-task-page-document-scroll-desktop.png`,
`/tmp/kbhc-task-page-document-scroll-mobile.png`; mapped Playwright failure trace 없음
Failure class/correction: initial focused RED는 내부 `overflow-auto`를 확인했다.
구현 뒤 stale virtualizer mock과 제거된 class/button 기대는 `TEST`, formatter 실패와
JSDOM `scrollTo` 미구현은 `TOOLING`으로 분류해 최소 test harness 수정 후 재검증했다.
기존 E2E의 element scroll/button 의존과 viewport 밖 terminal에 대한 `isVisible()` 조건은
`TEST`로 분류하고 window scroll 및 목표 link 존재 조건으로 교정했다
Rerun verdict: PASS — document-only scroll, 순수 자동 pagination, 목록 내부 terminal,
desktop/mobile responsive clearance와 기존 Task CRUD 회귀가 모두 통과했다. 사람
checkpoint와 `HUMAN_APPROVED` 전환은 별도다

## TASK-LIST-JOURNEY-REVIEW-01 — PASS

Review target: plan `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`;
`TASK-LIST-01`~`TASK-LIST-05`, `task-discovery`; initial exact target
`e1e9e0377381f92d00aa376dd436c70a4c423492`; correction target
`20679f818d7dc931f40f37543740349673220756`
Reviewer: fresh read-only `/root/task_discovery_review`; did not author, edit or commit
either target
Checks: read workflow, verification policy, approved design, plan, requirements, TODO,
OpenAPI, source, focused tests, E2E and evidence; audited every `DISC-*` case, method/query/
security/status, session/cache, pagination race/retry/terminal/empty/AbortSignal,
virtual key/measurement/scroll/DOM, Card route/focus/wrapping, test strength, console/network,
diff scope, secrets, generated noise and TODO dependencies; reproduced focused, quick,
mapped E2E and diff checks
Findings: one unresolved HIGH `REQUIREMENT` — `/api/task` defines only 200 and 401, while
the mock and its test publish an invalid-page 400 JSON contract. Initial MEDIUM `TEST`
missing `DISC-E3` task-list integration, MEDIUM `UX_ACCESSIBILITY` Card truncation, LOW
`TEST` pre-detail error assertion and LOW `REQUIREMENT` open plan steps are resolved at
the correction target
Corrections: added actual task GET 401 → refresh 401 → anonymous `/sign-in` return-state
and task-cache-removal integration; changed title/memo from truncation to wrapping with RED
then GREEN component coverage; moved console/page-error assertions after detail navigation;
checked all 37 executed Task 1~5 plan steps. Production-preview mobile
`task-card-wrap-review-fix` proved title 72px/3 lines, memo 60px/3 lines, measured row
170px, `white-space: normal`, `overflow-wrap: break-word`, width 390/390 and no error.
Screenshot: `/tmp/kbhc-task-card-wrap-review-fix-mobile.png`
Rerun: correction target focused PASS 7 files/31 tests; quick PASS hook 86, contract 19,
Vitest 38 files/150 tests plus format/lint/typecheck; mapped task-discovery Chromium 1/1
PASS after final detail assertion; correction diff and whitespace check PASS
Verdict: BLOCKED — all MEDIUM/LOW findings are resolved, but changing or accepting the
extra invalid-page 400 behavior requires the project-defined HIGH-risk human decision
Human HIGH decision: on 2026-09-02 the user explicitly approved the recommended immutable-
OpenAPI option: remove the invalid-page 400 JSON contract and fail closed with a transport
failure that publishes no new HTTP status/body. TDD evidence: all five replacement cases
failed because the old handler resolved `{status:400,...}`; after the minimal
`HttpResponse.error()` correction, the handler suite passed 12/12.
Final review target: `b7790542226fcfb5ff5332692386343797f9b7fb`
Reviewer: fresh read-only `/root/task_discovery_review`; did not author, edit or commit the
target
Checks: complete target and approved HIGH correction, all prior findings, source/tests/E2E,
plan/TODO/evidence consistency, diff scope, secrets and generated noise; reproduced all
requested gates
Findings: none. The invalid-page mock now fails closed without a 400 response; `DISC-E3`,
Card wrapping, post-detail error assertions and all executed plan steps remain resolved
Corrections: human-approved fail-closed correction plus the prior four corrections; final
reviewer made no change
Rerun: focused PASS 7 files/31 tests; quick PASS hook 86, contract 19, Vitest 38 files/150
tests and clean format/lint/typecheck; mapped Chromium PASS 1/1; `334dec0..b779054` diff
check and clean target status PASS
Verdict: PASS — no unresolved HIGH/MEDIUM/LOW finding. This review record was subsequently
accepted by the `JOURNEY-TASK-LIST-01` human checkpoint above

## TASK-LIST-JOURNEY-VERIFY-01 — current target

Requirement/Journey/case trace: `TASK-LIST-01`~`TASK-LIST-05`; `task-discovery`;
`DISC-P1-1`~`DISC-P1-5`, `DISC-E1`~`DISC-E3`
Verification target: `2123ff2dc42e505359f87f40cc17931c9ab7b980`
Session/branch: Codex `/root`; `feat/task-discovery-loop`
Automatic checks: focused Card/list/API/mock/auth Vitest PASS, 7 files/30 tests;
`./scripts/verify quick` PASS, hook 86, contract 19, Vitest 38 files/149 tests;
`pnpm exec playwright test e2e/task-discovery.spec.ts` PASS, Chromium 1/1;
`./scripts/verify full` PASS, hook 86, contract 19, Vitest 38/149, build, core 5/5,
verifier regression 19. Static lookup found no page/widget raw fetch or generated OpenAPI
import outside shared API
Agent-browser session: `task-list-journey-verify-01`; production preview; approved auth and
default three-task fixture seeded before bootstrap
Route/Viewport: `/task` → `/task/task-3`; Chromium `1280x720`, `390x844`
Actions/actual: desktop and mobile snapshots rendered three exact title/memo Card Links and
terminal text; resource timing was exactly page 1 then page 2, `/api/sign-in` count 0; widths
were 1280/1280 and 390/390. Selecting `완료한 일` reached `/task/task-3`, rendered heading
`완료한 일`, memo `남아 있는 DONE`, and one detail resource. The 720/844px integrated
viewports mounted all three fitting rows; mapped E2E at 1280x400 independently asserted the
mounted count stayed below three before and after terminal scroll. The 40-record manual
record below bounded mounted rows at 6/40
Contract/auth/negative paths: mapped E2E proved bearer on exact page 1→2, no sign-in request,
terminal stop and `/task/task-3`. Focused tests proved schema rejection, AbortSignal, empty
terminal/intermediate continuation, initial/partial retry, one in-flight page, terminal stop,
and approved terminal-401 cache/route behavior for `DISC-E1`~`DISC-E3`
Console/Network: agent-browser request monitor returned `No requests captured`, the known
MSW Service Worker limitation; resource timing, MSW 200 logs and mapped Playwright are the
request authorities. Console contained only MSW informational success logs; page errors and
unexpected console errors were empty
Screenshot/Trace: `/tmp/kbhc-task-list-journey-verify-01-desktop.png`,
`/tmp/kbhc-task-list-journey-verify-01-mobile.png`,
`/tmp/kbhc-task-list-journey-verify-01-detail.png`; passing Playwright attachment
`task-discovery`; failure trace was not generated
Failure class/correction: no product, test, API, auth, dependency or architecture gap; the
MSW monitor limitation remains `TOOLING` and is covered by resource timing/MSW/Playwright
Rerun verdict: PASS — all `DISC-*` cases trace to current focused, quick, mapped E2E, full
and named-browser evidence. Human acceptance is recorded by the checkpoint above

## Historical baseline (`d256114`~`0057492`)

Requirement/Journey: `TASK-LIST-01`~`TASK-LIST-05`; `task-discovery`
Commit: `d256114`~`0057492` (`fix/dec-prefix` worktree)
Agent-browser session: `task-discovery`, `task-discovery-viewport`
Route/Viewport: `/task`, `/task/task-3`; Chromium 1280x720
Precondition: independent MSW authenticated fixture; memory access token and fresh
QueryClient; task store reset to two records on page 1 and one record on terminal page 2
Actions: run task API, handler, card and virtual-list Vitest; run
`./scripts/verify quick`; run `pnpm exec playwright test
e2e/task-discovery.spec.ts`; inspect FSD/generated/cache boundaries with `rg`; use
agent-browser with fresh snapshots to open the task route, inspect initial DOM and
resource entries, scroll to both list ends, inspect the terminal DOM, save a full-page
screenshot, and select the terminal task
Expected: authenticated `GET /api/task?page=1` occurs exactly once and renders title and
memo without a separate status field; visible rows stay bounded as fetched data grows;
reaching the end requests page 2 once, `hasNext: false` stops paging, and selecting
`task-3` navigates to `/task/task-3`; loading, empty, recoverable error/retry and terminal
states remain distinct
Actual: focused Vitest passed 4 files/13 tests; quick gate passed setup 79 tests,
format, lint, generated API type check, TypeScript and Vitest 27 files/92 tests; core
Chromium passed; Playwright and agent-browser both observed exactly
`/api/task?page=1`, `/api/task?page=2`, each once, and Playwright proved both requests
carried `Bearer ` authorization; agent-browser observed one mounted task row before and
after pagination while the fixture held three records, a 96px viewport with 96px
minimum rows, the terminal message, and exact `/task/task-3` navigation; component tests
proved title/memo rendering, absence of added status UI, empty terminal handling,
single in-flight behavior and explicit retry; static review found no raw fetch in
page/widget, no generated import outside shared API, and both task query roots in
protected cache cleanup
Console/Network: the independent fixture entered through a successful refresh without
calling `/api/sign-in`; there were no page errors or unexpected console errors; MSW
console showed both task responses as 200 and browser resource entries confirmed the
exact page sequence
Screenshot/Trace: `/tmp/kbhc-task-discovery.png`; Playwright `task-discovery`
attachment; trace, screenshot and video retained automatically on failure
Verdict: `TASK-PAGE-01`, `TASK-PAGE-02`, and `TASK-PAGE-03` `AI_VERIFIED`;
`JOURNEY-TASK-LIST-01` remains `IN_PROGRESS`
Human checkpoint record: tracked primary evidence was not found; checkpoint remains
unapproved
Failure class: `TEST` — the reset assertion initially assumed all three fixtures were
on page 1; `UX_ACCESSIBILITY` — the first virtual markup used generic ARIA list roles;
`INTEGRATION` — StrictMode cancelled the first signal-bound request and retransmitted
page 1; `INTEGRATION` — measured compact rows mounted all records; `TEST` — terminal
data increased scroll height after the first scroll
Correction: combine both pages in reset assertions; use semantic section/ul/li markup;
let the shared in-flight query survive StrictMode remount instead of consuming its abort
signal; give the viewport and rows a stable 96px size; scroll the grown list to its new
end before selecting the terminal record
Rerun verdict: PASS — focused, quick, core browser, manual accessible-tree/DOM/network
and static boundary checks passed; the implementation self-check found and corrected
the clipped 32px viewport. The prior review note had no reviewer or target commit and
does not count as an independent review

## TASK-CARD-VIEW-01

Requirement/Journey: `TASK-LIST-02`, `TASK-LIST-05`; `DISC-P1-2`, `DISC-P1-5`
Commit: `cc0aa22af488f527cdf8300f298886ffdbe704d1`
Agent-browser session: `task-card-view-01-rerun`
Route/Viewport: `/task` → `/task/task-1`; Chromium `1280x720`, `390x844`
Precondition: approved refresh fixture seeded on same-origin worker resource before app
bootstrap; default reset three-task store; fresh browser session
Actions: run the Card component test and read-only quick gate; inspect a fresh accessible
snapshot; hover and click the first whole-card Link at desktop; reopen `/task`, press Tab
four times and Enter at mobile; inspect active href, computed outline, document width,
console and page errors; close the named session
Expected: the first Card Link contains response title and memo without a separate status
field, has exact `/task/task-1`, works by pointer and keyboard, exposes a visible focus
outline, and does not overflow the mobile viewport
Actual: focused Vitest passed 1 file/1 test; quick passed hook 86 tests, verifier contract
19 tests and Vitest 38 files/149 tests; desktop Link text was `첫 번째 할 일삭제 검증 대상`,
href `/task/task-1`, status check false; fourth mobile Tab focused the same href with
`rgb(138, 109, 0) solid 2px`, Enter navigated, and document/viewport widths were both
390px. MSW console showed successful refresh, task pages and detail responses; no page
error or unexpected console error remained in the rerun
Console/Network: initial discarded session logged a refresh 401 because the app booted
before fixture injection. The rerun seeded storage from `/mockServiceWorker.js` before
opening the app and logged only successful contract requests. Header/count authority is
covered again by the mapped Playwright Journey
Screenshot/Trace: `/tmp/kbhc-task-card-view-01-desktop-rerun.png`,
`/tmp/kbhc-task-card-view-01-mobile-rerun.png`
Failure class: `TEST` — browser precondition was installed after auth bootstrap
Correction: seed auth/task storage on a same-origin non-app resource, then navigate to
`/task` in a new named session
Rerun verdict: PASS — component, quick, desktop pointer, mobile keyboard/focus, route,
responsive width and console/page-error checks passed; no product code/test change

## TASK-LIST-VIRTUAL-UX-01

Requirement/Journey: `TASK-LIST-03`; `DISC-P1-3`
Commit: `dca7fd7057752d2ade56b76608d1a250e2263d1b`
Agent-browser session: `task-list-virtual-ux-01`
Route/Viewport: `/task`; Chromium `1280x720`, `390x844`
Precondition: same-origin auth fixture and 40 schema-conforming task records seeded before
app bootstrap; fresh browser session
Actions: run the focused list suite and quick gate; inspect desktop dimensions and mounted
rows; wheel-scroll each two-record page through the terminal page; resize to mobile, inspect
width and mounted rows, then scroll up 500px and down 500px; inspect resource timing, console
and page errors; close the named session
Expected: the remaining-height region is taller than the old 96px viewport, real scrolling
reaches all 40 records, mounted DOM remains near the viewport rather than growing to 40,
mobile content does not overflow horizontally, and resizing preserves usable scrolling
Actual: focused Vitest passed 1 file/5 tests; quick passed hook 86, contract 19 and Vitest 38
files/149 tests. Desktop reached task 40 with clientHeight 500px, scrollHeight 3840px,
scrollTop 3340px and 6/40 mounted rows. Mobile measured clientHeight 560px, scrollHeight
3840px, document/viewport width 390px and 6/40 mounted rows; an up/down gesture moved
scrollTop 3280→2780→3280 without clipping or jump
Console/Network: resource timing and MSW logs showed successful `/api/task?page=1..20` and
`hasNext:false` on page 20; no later task request, page error or unexpected console error
Screenshot/Trace: `/tmp/kbhc-task-list-virtual-ux-01-desktop.png`,
`/tmp/kbhc-task-list-virtual-ux-01-mobile.png`
Failure class: none
Correction: none; the existing remaining-height region, 96px row estimate, stable ID key
and measured virtual rows already satisfy the requirement
Rerun verdict: PASS — focused, quick, 40-record bounded DOM, terminal scroll, resize,
responsive width and console/page-error checks passed; no product code/test change

## TASK-LIST-PAGING-UX-01

Requirement/Journey: `TASK-LIST-04`; `DISC-P1-4`, `DISC-E2`
Commit: `7def492e87e61f401159469b34a526efdb12df07`
Agent-browser sessions: `task-list-paging-ux-01`, `task-list-paging-ux-01-rerun`
Route/Viewport: `/` → `/task`; production preview Chromium `390x844`
Precondition: approved auth fixture seeded before bootstrap; default three-task store with
two-record pages; fresh browser sessions
Actions: run focused list/API suites and quick; observe the normal request sequence and
terminal state; attempt page 2 route abort; in a fresh session load the dashboard, install a
temporary page-local fetch rejection for only `/api/task?page=2`, navigate by SPA Link,
inspect preserved page 1/error/retry action, restore fetch, click retry, inspect resource
timing, console and page errors, then close
Expected: page 1 and page 2 occur once on success, `hasNext:false` removes the next action;
a page 2 transport failure preserves page 1 and exposes retry; retry requests page 2 rather
than duplicating page 1 and reaches terminal
Actual: focused Vitest passed 2 files/8 tests; quick passed hook 86, contract 19 and Vitest
38 files/149 tests. Normal preview timing was exactly page 1 then page 2 and rendered all
three task links, terminal text true and next button false. The deliberate rejection rendered
`네트워크 요청에 실패했습니다.다시 불러오기`, kept both page 1 cards and no terminal;
after restoring fetch, retry added only successful page 2, rendered task 3 and terminal, and
removed the next button
Console/Network: normal and corrected resource timing contained exactly
`/api/task?page=1`, `/api/task?page=2`; rejected page 2 intentionally failed before
transmission. MSW logged refresh/dashboard/page 1/page 2 200 after recovery; no page error
or unexpected console error
Screenshot/Trace: `/tmp/kbhc-task-list-paging-ux-01-terminal.png`,
`/tmp/kbhc-task-list-paging-ux-01-partial-error.png`,
`/tmp/kbhc-task-list-paging-ux-01-retry-terminal.png`
Failure class: `TOOLING` — agent-browser route abort cannot intercept a request already
handled by the MSW Service Worker
Correction: use a temporary page-local fetch wrapper after authenticated bootstrap and
before SPA task navigation; reject only page 2, restore the original fetch before retry
Rerun verdict: PASS — focused, quick, exact success sequence, terminal stop, preserved
partial data, retry sequence and console/page-error checks passed; no product code/test change

## TASK-LIST-STATES-01

Requirement/Journey: `TASK-LIST-01`, `TASK-LIST-04`; `DISC-E1`, `DISC-E2`
Commit: `1e4620cf44e901c9d14b23eb47e57c8aeeea6cbb`
Agent-browser sessions: `task-list-states-01-error`, `task-list-states-01-empty`
Route/Viewport: `/` → `/task` at `1280x720`; `/task` at `390x844`; production preview
Precondition: approved auth fixture; default three-task store for recoverable initial error,
fresh empty task store for terminal empty state
Actions: run focused state suite and quick; install a temporary page-local rejection for
page 1 after dashboard bootstrap, navigate to task, inspect alert/action/layout, restore fetch
and retry; in a fresh mobile session seed `[]` before bootstrap, inspect empty semantics,
actions, width, request timing, console and page errors; close both sessions
Expected: loading states have semantic status; initial error has one visible retry; retry
restores data without duplicate page requests; empty terminal is distinct, makes no next-page
request, invents no unsupported create CTA and has no horizontal clipping
Actual: focused Vitest passed 1 file/5 tests, including initial/next loading, terminal and
intermediate empty, initial and partial retry; quick passed hook 86, contract 19 and Vitest
38 files/149 tests. Desktop error exposed one alert with title/message/retry, no list region
and width 1280; restored retry produced pages 1→2, three rows and terminal. Mobile empty was
true with createAction false, nextAction false and document/viewport width 390
Console/Network: corrected desktop success timing contained page 1 then page 2 exactly once;
empty timing contained only page 1 with MSW `{data:[],hasNext:false}`. The deliberate initial
rejection failed before transmission; no page error or unexpected console error
Screenshot/Trace: `/tmp/kbhc-task-list-states-01-error.png`,
`/tmp/kbhc-task-list-states-01-empty.png`
Failure class: none beyond the already-classified MSW route interception tooling constraint
Correction: use the established page-local rejected-fetch technique and restore fetch before
retry; no product correction
Rerun verdict: PASS — focused, quick, recoverable initial error, successful retry, terminal
empty, unsupported-CTA absence, responsive width and console/page-error checks passed

## REVIEW-TASK-RETRY-01 retained-data 재시도 교정

Requirement/Journey: `TASK-LIST-01`, `TASK-LIST-04`; `task-discovery`
Product target: `3a1a71a6601c225ac5d29161e9a2ece92e03898d`; integrated product target:
`8582cb88d975255fbd6d7a352444c2d821db28ff`.

RED/GREEN: 기존 next-page 실패 test를 page 2 재요청까지 확장하고 retained-data
refetch 실패 test를 추가했다. RED는 1 file/13 tests 중 refetch retry 1건만 실패했고,
`isFetchNextPageError`인 경우에만 `fetchNextPage()`, 나머지는 `refetch()`하도록 분기한
뒤 13/13이 통과했다. Cycle 2 focused는 8 files/70 tests, quick은 hook 89,
verifier 20, generated check/format/lint/typecheck와 Vitest 48 files/297 tests를 통과했다.
Mapped production Chromium은 `task-discovery`, `task-resolution`, `task-crud` 4/4를
통과했고 canonical full은 core Chromium 9/9와 verifier regression 19/19를 통과했다.

Browser: named agent-browser `review-cycle2`, production preview
`http://127.0.0.1:4273/task`, Chromium 1280x720. 정상 page 1을 보존한 상태에서
SPA 재진입의 GET 한 번만 page-local fetch wrapper로 실패시켰다. 기존 task card와
`네트워크 요청에 실패했습니다.` 및 `다시 불러오기`가 함께 남았고, wrapper의 다음
호출을 통과시킨 retry 뒤 alert가 사라지고 다음 page action이 복구됐다. 예상된 로그인
전 refresh 401 외 unexpected console error는 없고 `agent-browser errors`는 비어 있었다.
Session과 preview를 종료했고 4173/4273 listener가 없음을 확인했다.

Verdict: PASS — next-page와 retained-data refetch가 각자 실패한 operation을 다시
실행하며 기존 data를 보존한다.
