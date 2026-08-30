# Work Overview Evidence

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
Chromium passed; Playwright observed exactly one `/api/dashboard` and one `/api/user`
request and both Authorization headers began with `Bearer `; visible values were
dashboard `3/2/1` and profile `김담당`/`오늘도 차근차근`; `aria-current=page`
followed dashboard and profile routes; all three actions remained visible at 390x844,
document width stayed within 390px, and computed font contained `Pretendard`; static
review found no raw fetch in page/widget, no generated import outside shared API, and
dashboard/user roots are both in protected cache cleanup
Console/Network: independent fixture setup produced the expected anonymous bootstrap
401 only; after the authenticated journey began there were no console or page errors;
MSW console inspection showed dashboard/user 200 responses and Playwright proved bearer
headers
Screenshot/Trace: `/tmp/kbhc-work-overview.png`; Playwright `work-overview` attachment;
trace, screenshot and video retained automatically on failure
Verdict: `NAV-PRIMARY-01`, `DASH-01`, and `USER-01` `AI_VERIFIED`;
`JOURNEY-WORK-01` awaits the human checkpoint and is not marked `HUMAN_APPROVED` by AI
Failure class: `IMPLEMENTATION` — mock generated import violated the authoritative lint
boundary; `TEST` — generic test client and router provider harness were incomplete;
`ENVIRONMENT/TEST` — browser fixture POST raced async worker startup; `TEST/TOOLING` —
manual QA reused a stale element ref after a new snapshot
Correction: keep mock fixture types structural and validate them through handlers; use a
generic guard-aware test client; provide Query/API providers in router tests; wait for
the sign-in heading before API fixture setup; reacquire element refs after navigation
Rerun verdict: PASS — focused, quick, core browser, manual accessible-tree/mobile and
static boundary checks passed; lightweight adversarial review found no remaining
requirement omission, auth/cache leak, OAS shape mismatch, navigation/accessibility gap
or duplicate request
