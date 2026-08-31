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
Console/Network: independent fixture setup produced the expected anonymous bootstrap
401 only; after authentication there were no page errors or unexpected console errors;
MSW console showed both task responses as 200 and browser resource entries confirmed
the exact page sequence
Screenshot/Trace: `/tmp/kbhc-task-discovery.png`; Playwright `task-discovery`
attachment; trace, screenshot and video retained automatically on failure
Verdict: `TASK-PAGE-01`, `TASK-PAGE-02`, and `TASK-PAGE-03` `AI_VERIFIED`;
`JOURNEY-TASK-LIST-01` awaits the human checkpoint and is not marked `HUMAN_APPROVED`
by AI
Human checkpoint record: 2026-08-31 사용자 대화에서 checkpoint 승인 수신; 프로젝트
규약에 따라 AI가 상태를 `HUMAN_APPROVED`로 변경하지 않음
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
and static boundary checks passed; lightweight adversarial review found and corrected
the clipped 32px viewport and found no remaining contract-shape, duplicate-page,
terminal-loop, navigation, auth/cache, architecture or recovery-state omission
