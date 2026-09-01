# Task Discovery Evidence

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
