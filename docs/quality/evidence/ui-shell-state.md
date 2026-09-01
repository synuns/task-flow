# UI Shell and Async State Evidence

Requirement: `UI-SHELL-01` (`NAV-01`, `NAV-02`, `NAV-03`, `SYS-03`),
`UI-STATE-01` (loading, empty, recoverable error, success invariant)

## Commit and ownership

- Branch: `feat/ui-shell-state`
- Implementation commits: `285614b`, `819d0b8`
- Verification target: `819d0b8`
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
  accent background, and body font was `Pretendard, ui-sans-serif, system-ui, sans-serif`.
- Screenshot: `/tmp/kbhc-ui-shell-desktop.png`.

## Mobile browser verification

- Route/viewport: the same anonymous/authenticated route sweep; 390x844.
- Expected: bottom navigation remains visible, targets are at least 44px, current/focus is
  distinguishable, and there is no horizontal clipping.
- Actual: all three navigation targets measured 48px high; document and viewport widths were
  both 390px on all routes; anonymous sign-in main ended above the bottom navigation; current
  actions matched each route; keyboard focus retained the 2px dark-gold ring and Pretendard.
- Screenshot: `/tmp/kbhc-ui-shell-mobile.png`.

## Console, network, and failures

- Both `agent-browser --json errors` results were `errors: []`.
- Console contained only Vite/React development information and expected MSW groups:
  sign-in 200, refresh 200 after authentication, dashboard/task/detail/user 200.
- The CLI network list did not separately capture service-worker-intercepted API requests;
  the MSW console records supplied the status evidence.
- `TOOLING`: one malformed `agent-browser eval` expression failed while reading hover style;
  the expression was corrected immediately and returned the expected computed accent colors.
  This was not a product failure.

## Task reviews

- Shell reviewer: initial Important `TEST` finding for redundant focus utilities; corrected
  to a final test-only diff. Re-review: no Critical, Important, or Minor findings; Approved.
- State reviewer: initial Important architecture/YAGNI finding for unused `AsyncEmpty`;
  removed and replaced with domain-local empty characterization. Re-review: no code finding;
  one ignored-report wording Minor was corrected; Approved.
- Plan-completion and whole-branch review: pending before the final TODO completion transition.

This evidence does not mark a Golden Journey `HUMAN_APPROVED` checkpoint or final acceptance.
