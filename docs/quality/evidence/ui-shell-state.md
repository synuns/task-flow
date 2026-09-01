# UI Shell and Async State Evidence

Requirement: `UI-SHELL-01` (`NAV-01`, `NAV-02`, `NAV-03`, `SYS-03`),
`UI-STATE-01` (loading, empty, recoverable error, success invariant)

## Commit and ownership

- Branch: `feat/ui-shell-state`
- Implementation commits: `285614b`, `819d0b8`
- Implementation/browser/plan-review target: `e52890f`
- First completed-state full-verification target: `5cd937f`
- Final design-correction code target: `970d7df`
- Final design-correction full-verification target: `29c927f`
- Task owner: Codex `/root`, 2026-09-01
- Parallel implementers: `/root/ui_shell`, `/root/ui_state`; isolated worktrees and
  disjoint file ownership
- Browser sessions: `ui-shell-desktop`, `ui-shell-mobile`; both closed after verification

## Automatic verification

- Baseline: `./scripts/verify quick` — 36 Vitest files, 128 tests PASS.
- Shell characterization: the first proposed focus-background assertion failed, but review
  classified it as `TEST` because the approved global 2px `:focus-visible` ring already met
  the requirement. The redundant production style was removed. Final
  `src/widgets/app-shell/app-shell.test.tsx` verifies real Tab order, current route, and
  anonymous/authenticated action exclusivity without a production shell change.
- Async-state RED: `pnpm vitest run src/shared/ui/async-state.test.tsx` failed because
  `./async-state` did not exist. GREEN added only shared loading and recoverable error/retry
  semantics used by both dashboard and profile.
- State review removed unused `AsyncEmpty`; dashboard's existing zero-task Card remains the
  domain-local visible empty state and its test now verifies that layout.
- Integrated focused:
  `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx src/app/router.test.tsx
  src/shared/ui/async-state.test.tsx src/widgets/dashboard-summary/dashboard-summary.test.tsx
  src/widgets/user-profile/user-profile.test.tsx` — 5 files, 15 tests PASS.
- Integrated quick: `./scripts/verify quick` — setup hook 86 tests, verifier contract 18,
  format, lint, OpenAPI type check, TypeScript, 38 Vitest files/132 tests PASS.
- Final full after TODO completion transition: `./scripts/verify full` — the same setup/quick
  gates, production build, four Golden Journey Chromium core cases 5/5, verifier regression
  19 tests PASS. Build emitted only the pre-existing Vite chunk-size advisory.
- `git diff --check` PASS; no dependency, API, auth, cache, route, architecture, or
  `assignment-original/` change.

## Desktop browser verification

- Route/viewport: anonymous `/sign-in`, then authenticated `/`, `/task`, `/task/task-1`,
  `/user`; 1280x720. Authenticated `/sign-in` redirected to `/` by the approved policy.
- Actions: sign in with the MSW success fixture, sweep every route, Tab through primary
  navigation, hover task navigation, inspect computed styles and layout.
- Expected: dashboard/task and exactly one auth action; correct current action; distinct
  hover and keyboard focus; Pretendard; no clipping.
- Actual: anonymous action was login and authenticated action was profile. Every route had
  the expected heading/current action. Desktop sidebar was 224px, main width was 1056px,
  document width equaled the 1280px viewport. Keyboard order was dashboard, task, auth;
  computed focus was `rgb(138, 109, 0) solid 2px` with 2px offset, hover had a distinct
  accent background, body font was `Pretendard, ui-sans-serif, system-ui, sans-serif`, and
  the screenshot showed distinct dashboard-grid, task-list, and profile-circle icons.
- Screenshot: `/tmp/kbhc-ui-shell-desktop.png`.

## Mobile browser verification

- Route/viewport: the same anonymous/authenticated route sweep; 390x844.
- Expected: bottom navigation remains visible, targets are at least 48px, current/focus is
  distinguishable, and there is no horizontal clipping.
- Actual: all three navigation targets measured 48px high; document and viewport widths were
  both 390px on all routes; anonymous sign-in main ended above the bottom navigation; current
  actions matched each route; keyboard focus retained the 2px dark-gold ring and Pretendard;
  the three distinct icons and visible labels remained legible.
- Screenshot: `/tmp/kbhc-ui-shell-mobile.png`.

## Final design correction

- Source: fresh final adversarial review of `52d200f..5cd937f`.
- Finding: mobile navigation icons used Lucide's 24px default while the approved design
  specifies a 20px baseline.
- RED: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx` — both anonymous and
  authenticated cases failed with expected `height="20"`, received `height="24"`.
- GREEN: set the existing Lucide `size` prop to 20 for dashboard, task, and dynamic auth
  icons. `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx src/app/router.test.tsx`
  — 2 files, 8 tests PASS; `./scripts/verify quick` — 38 files, 132 tests PASS.
- Browser: `ui-shell-icon-correction`, 390x844. Anonymous dashboard/task/login and
  authenticated profile SVGs computed 20x20; every target remained 48px; document width and
  viewport were both 390px; page errors were `[]`; screenshot
  `/tmp/kbhc-ui-shell-icon-20px-mobile.png`; session closed.
- `TOOLING`: the first authenticated profile-size `agent-browser eval` expression was
  malformed. A simpler expression immediately reproduced the intended 20x20 result; this was
  not a product failure.
- `./scripts/verify full` at `29c927f`: setup 86 tests, verifier contract 18 tests,
  Vitest 38 files/132 tests, build, core E2E 5/5, verifier regression 19 tests PASS.
- Review target: `5cd937f..53d1a16`.
- Reviewer: `/root/final_adversarial_review_2`; correction을 작성하지 않은 read-only
  second-pass reviewer.
- Checks: 네 named link의 20px icon, RED 24→20, focused GREEN, 390x844 browser의
  20x20/48px/390px/`errors: []`, 48px evidence oracle, 세 target provenance,
  correction-only scope와 TODO 상태.
- Findings: Critical, Important, Minor 없음; 이전 Minor 3건 모두 해결.
- Corrections: 추가 교정 없음.
- Rerun: reviewer는 재실행하지 않고 owner의 focused 2 files/8 tests, quick 38 files/132
  tests와 browser screenshot/evidence를 검사.
- Verdict: PASS; completion transition 준비 완료.

## Console, network, and failures

- Both `agent-browser --json errors` results were `errors: []`.
- Console contained only Vite/React development information and expected MSW groups:
  sign-in 200, refresh 200 after authentication, dashboard/task/detail/user 200.
- The CLI network list did not separately capture service-worker-intercepted API requests;
  the MSW console records supplied the status evidence.
- `TOOLING`: one malformed `agent-browser eval` expression failed while reading hover style;
  the expression was corrected immediately and returned the expected computed accent colors.
  This was not a product failure.

## Task and plan-completion reviews

- Shell reviewer: initial Important `TEST` finding for redundant focus utilities; corrected
  to a final test-only diff. Re-review: no Critical, Important, or Minor findings; Approved.
- State reviewer: initial Important architecture/YAGNI finding for unused `AsyncEmpty`;
  removed and replaced with domain-local empty characterization. Re-review: no code finding;
  one ignored-report wording Minor was corrected; Approved.
- Review target: `52d200f..e52890f`; `UI-SHELL-01`, `UI-STATE-01`, applicable backlog
  plan and UI design specifications.
- Reviewer: `/root/final_ui_review`; implementation과 이전 task review에 참여하지 않은
  fresh read-only reviewer.
- Checks: plan acceptance, negative paths, navigation/auth/current-route invariants,
  responsive/keyboard accessibility, icon mapping, shared-state/YAGNI boundary, tests,
  browser evidence, console/network, unrelated scope, dependencies, API/auth/cache invariants,
  evidence와 TODO consistency.
- Findings: final target에서 Critical, Important, Minor 없음. 이전 Minor `TEST` icon
  mapping coverage는 최종 교정으로 해결.
- Corrections: anonymous dashboard/task/login icon을 각 named link에 연결해 assert하고,
  authenticated profile의 `lucide-circle-user-round`를 assert함.
- Rerun: shell/router 2 files/8 tests, fresh quick 38 files/132 tests, final full build/core
  E2E/verifier regression PASS.
- Verdict: PASS; Ready to merge: Yes.

This evidence does not mark a Golden Journey `HUMAN_APPROVED` checkpoint or final acceptance.
