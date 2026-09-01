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
