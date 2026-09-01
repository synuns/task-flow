# Work Overview Evidence

## DASHBOARD-VIEW-01

Requirement/Journey: `DASH-01`; `work-overview`
Target commit: `8342aa09fe07ab6f4c7938ef59405bd20490e54e`
Session/branch: `01a05d12-7ce7-7240-b44a-f525ce4fe48c`; `feat/work-overview-loop`
Automatic checks: `pnpm vitest run src/widgets/dashboard-summary/dashboard-summary.test.tsx src/shared/api/dashboard.test.ts` — PASS, 2 files/5 tests; `./scripts/verify quick` — PASS, setup Python 86 + verifier 19, format, lint, typecheck, Vitest 38 files/149 tests; `pnpm exec playwright test e2e/work-overview.spec.ts` — PASS, 1 test.
Browser precondition/actions: Vite `pnpm dev --host 127.0.0.1 --port 4173`; agent-browser session `dashboard-view-01`; seeded the approved refresh-cookie/session fixture at `/sign-in`, then navigated to `/` without a sign-in request; inspected the accessible tree, metric rows, computed style and request initialization.
Desktop actual (1280x720): `전체 할 일/3`, `남은 할 일/2`, `완료한 일/1`; `role=progressbar` `aria-valuenow=33.33333333333333`; `document.documentElement.scrollWidth=1280`; computed font `Pretendard, ui-sans-serif, system-ui, sans-serif`.
Mobile actual (390x844): the same accessible navigation and metrics; `scrollWidth=390`, `innerWidth=390`, no horizontal overflow.
API observation: initial fixture bootstrap succeeded through `POST /api/refresh` and `GET /api/dashboard`; no `/api/sign-in` request was made. A temporary browser wrapper observed dashboard request initialization with a non-empty `Authorization: Bearer [redacted]` header; MSW logged dashboard 200 responses. Screenshot paths: `/tmp/kbhc-dashboard-view-01-desktop.png`, `/tmp/kbhc-dashboard-view-01-mobile.png`.
Failure/retry: expected dashboard transport failure was reproduced as `네트워크 요청에 실패했습니다.` in the recoverable `alert`, with the `다시 불러오기` button. Restoring transport and clicking retry restored the 3/2/1 metric rows; page-error output was empty after recovery. The failed request is recorded as a deliberately rejected dashboard fetch before transmission.
Failure class: `TOOLING` — `agent-browser network route '**/api/dashboard' --abort` did not intercept a request already handled by the MSW service worker, so it returned the normal 3/2/1 success state.
Correction/rerun: no product change. Removed the ineffective route, used a temporary in-page `fetch` wrapper solely to reject the dashboard request, restored the original fetch before retry, and reran the browser failure/retry scenario plus the focused, quick, and mapped Playwright checks. Verdict: PASS.

Fresh review rerun (current HEAD `54ad9db4ad7d0e74d35460c8beca312afb24b25c`, agent-browser session `dashboard-view-01-rerun`): focused Vitest rerun PASS, 2 files/5 tests; mapped `pnpm exec playwright test e2e/work-overview.spec.ts` rerun PASS, 1 Chromium test. Fresh snapshots were taken after every navigation/state change: (1) `/sign-in` exposed `대시보드`, `할 일`, `로그인`, labelled email/password textboxes, and disabled `로그인`; (2) after the approved fixture and location change, desktop `/` exposed `대시보드`, `할 일`, `회원정보`, while the DOM query returned `전체 할 일/3`, `남은 할 일/2`, `완료한 일/1`, width 1280, Pretendard font and `aria-valuenow=33.33333333333333`; (3) after mobile resize the fresh snapshot retained the three links and the same rows, width 390/viewport 390; (4) after prescribed route-abort/reload, the fresh snapshot still had the three links, metric rows 3/2/1 and `alert: null`; (5) after task navigation, its fresh snapshot showed the three navigation links and three task links; (6) after return with the temporary rejected fetch, the fresh snapshot showed the three navigation links plus `다시 불러오기`, and the alert query returned `업무 현황을 불러오지 못했습니다.네트워크 요청에 실패했습니다.다시 불러오기`; (7) after original fetch restoration and retry, the fresh snapshot returned to the three navigation links, rows 3/2/1 and `alert: null`.

Fresh network/console/errors/close output: initial `agent-browser network requests --filter api` emitted `No requests captured`; after reload it emitted `POST http://127.0.0.1:4173/api/refresh (fetch)` and two `GET http://127.0.0.1:4173/api/dashboard (fetch)` entries, proving the route-abort did not reach the MSW-owned transmission. During task navigation it emitted repeated `GET /api/task?page=1` and `GET /api/task?page=2`; after retry it additionally emitted three `GET /api/dashboard (fetch)` entries. The local rejected-fetch failure intentionally added no dashboard network entry because it failed before transmission. Console output reported Vite connect, MSW enabled/worker URL/scope, an initial `POST /api/refresh` 401 that raced before the prescribed fixture eval, then fixture `POST /api/refresh` 200 and `GET /api/dashboard` 200 responses (and 200 task/dashboard responses on later navigation/retry); it contained no `/api/sign-in` request. `agent-browser errors` emitted no output after recovery. `agent-browser close` completed with `✓ Browser closed`. The route-abort result remains `TOOLING` (MSW service-worker interception); the page-local rejection is deterministic browser test interception only, restored before retry, and no product/test source changed. Rerun verdict: PASS.

Requirement/Journey: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`;
`work-overview`
Commit: `dd57ba3` (`fix/dec-prefix` worktree)
Agent-browser session: `work-overview`
Route/Viewport: `/`, `/task`, `/user`; Chromium 1280x720 and 390x844
Precondition: independent MSW authenticated fixture established through API setup;
memory access token and fresh QueryClient; task store reset to three records
Actions: run focused dashboard/user API, handler, query UI and router Vitest; run
`./scripts/verify quick`; run `pnpm exec playwright test e2e/work-overview.spec.ts`;
inspect `shared`/FSD/cache boundaries with `rg`; use agent-browser to inspect the
accessible tree, navigate dashboard → task → profile, resize to mobile, inspect console
and errors, and save a full-page screenshot
Expected: dashboard shows `3/2/1` from the shared task fixture; profile shows exact
`name` and `memo`; dashboard/task/profile actions remain visible with distinct icons and
correct current-route state; dashboard and user requests carry the current bearer;
loading, recoverable error/retry and success remain distinguishable; Pretendard is the
computed font; mobile has no horizontal clipping
Actual: focused Vitest passed 7 files/22 tests; quick gate passed setup 79 tests,
format, lint, generated API type check, TypeScript and Vitest 24 files/85 tests; core
Chromium passed; Playwright observed `/api/dashboard`, `/api/user`, then the expected
dashboard reload after route return, and all three Authorization headers began with `Bearer `; visible values were
dashboard `3/2/1` and profile `김담당`/`오늘도 차근차근`; `aria-current=page`
followed dashboard and profile routes; all three actions remained visible at 390x844,
document width stayed within 390px, and computed font contained `Pretendard`; static
review found no raw fetch in page/widget, no generated import outside shared API, and
dashboard/user roots are both in protected cache cleanup
Console/Network: the independent fixture entered through a successful refresh without
calling `/api/sign-in`; there were no console or page errors; MSW console inspection
showed dashboard/user 200 responses and Playwright proved bearer headers
Screenshot/Trace: `/tmp/kbhc-work-overview.png`; Playwright `work-overview` attachment;
trace, screenshot and video retained automatically on failure
Verdict: `NAV-PRIMARY-01`, `DASH-01`, and `USER-01` `AI_VERIFIED`;
`JOURNEY-WORK-01` remains `IN_PROGRESS`
Human checkpoint record: tracked primary evidence was not found; checkpoint remains
unapproved
Failure class: `IMPLEMENTATION` — mock generated import violated the authoritative lint
boundary; `TEST` — generic test client and router provider harness were incomplete;
`ENVIRONMENT/TEST` — browser fixture POST raced async worker startup; `TEST/TOOLING` —
manual QA reused a stale element ref after a new snapshot
Correction: keep mock fixture types structural and validate them through handlers; use a
generic guard-aware test client; provide Query/API providers in router tests; wait for
the sign-in heading before API fixture setup; reacquire element refs after navigation;
use exact accessible names for global navigation, await the returned dashboard heading,
and assert its legitimate second request instead of racing the route render
Rerun verdict: PASS — focused, quick, core browser, manual accessible-tree/mobile and
static boundary checks passed; final QA repeated the work-overview E2E three times after
the locator/request correction; no remaining requirement omission, auth/cache leak,
OAS shape mismatch, navigation/accessibility gap or unexpected duplicate request remained
in the implementation self-check. The prior review note had no reviewer or target commit
and does not count as an independent review
