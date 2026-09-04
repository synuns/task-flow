# User CRUD Evidence

## USER-CRUD-JOURNEY-VERIFY-01

Requirement/Journey/case trace: `USER-CRUD-01`~`USER-CRUD-08`; `user-crud`;
`USER-P1-1`~`USER-P1-7`, `USER-E1`, `USER-E2`, `USER-E3`, `USER-E5`, `USER-E6`.
The core browser cases are exactly `@core user CRUD 성공 뒤 보호 경계를 닫는다` and
`@core 잘못된 탈퇴 비밀번호는 상태를 보존한다` under the `@user-crud` describe tag.

Target: branch `feat/user-crud`, implementation base `d7dbc2c`; the Journey verification
source and this evidence are the current task diff. Session owner: Codex `/root`.

Automatic verification:

- Focused Vitest: `pnpm exec vitest run src/features/sign-up src/features/update-user
  src/features/delete-user src/mocks/fixtures/users.test.ts src/mocks/handlers/user.test.ts`
  — PASS, 5 files/25 tests.
- Quick: `pnpm verify quick` — PASS, hook 85, verifier 20, Vitest 43 files/219 tests,
  plus format, lint, generated API check and typecheck.
- Mapped E2E: `pnpm exec playwright test e2e/user-crud.spec.ts` — PASS, Chromium 2/2.
  POST body was exactly `email/password/name`, PATCH was exactly one `name`, and DELETE
  contained only `password`. The success case ended at `/sign-in` and direct `/user`
  access redirected to `/sign-in`; the failure case observed DELETE 400, then the same
  profile, the seeded Task list and authenticated navigation.
- Full: `pnpm verify full` — PASS after correction: hook 85, verifier 20, Vitest 43
  files/219 tests, production build, core Chromium 7/7 without retry, verifier regression
  19/19 and read-only fingerprint check.

Store/destructive proof: `src/mocks/fixtures/users.test.ts` proves the successful account
removal also removes only that user's Tasks. Browser/E2E evidence intentionally claims only
post-delete protected-route inaccessibility; a login failure alone is not treated as proof of
permanent data deletion.

Named browser verification: agent-browser session `user-crud-journey-verify-01`; Vite
`http://127.0.0.1:5173`; Chromium `390x844` then `1280x720`.

- Mobile success: entered sign-up only through the login-page `회원가입` link. Invalid email
  produced `aria-invalid=true`, `aria-describedby=sign-up-email-error` and the linked text
  `올바른 이메일을 입력해주세요.`. The valid form created `finaljourney@example.com` without
  memo, returned to sign-in, authenticated, and rendered canonical email/name plus empty memo.
  Name pencil focused its input, disabled memo editing, and check updated only the name to
  `최종수정`. The deletion dialog focused current password; correct confirmation returned to
  `/sign-in`.
- Desktop critical failure: authenticated the seed user, opened deletion, entered
  `Wrong123`, and observed the row/form alert `현재 비밀번호가 올바르지 않습니다.` while the
  dialog, password draft, `김담당` profile and session remained. After cancel the Task route
  still rendered all three seeded Tasks. A browser-only delayed DELETE kept password/cancel/
  submit disabled, set `aria-busy=true`, ignored Escape, then returned the same 400; after
  cancel, focus returned to `회원 탈퇴`.
- Responsive/diagnostics: both viewports had no horizontal overflow. `agent-browser errors`
  was empty. Console contained the expected initial anonymous refresh 401 and deliberate
  wrong-password 400 plus MSW 200/201 records. Its request monitor returned no API entries
  for service-worker-owned traffic, so exact request bodies/statuses are taken from MSW console
  records and independently asserted by Playwright.
- Screenshots: `/tmp/user-crud-journey-mobile-validation.png`,
  `/tmp/user-crud-journey-mobile-profile.png`,
  `/tmp/user-crud-journey-desktop-wrong-password.png`,
  `/tmp/user-crud-journey-desktop-profile.png`. Session close returned `Browser closed`.

Failure classification/correction/rerun: the first mapped E2E used the planned but incorrect
copy `올바른 이메일 형식을 입력해주세요.` while the accepted shared validation contract is
`올바른 이메일을 입력해주세요.`. Class: `TEST`; only the assertion was corrected. The rerun
passed 2/2 with no retry. The agent-browser network monitor's empty service-worker request list
is `TOOLING`; no product correction was made because Playwright and MSW records cover the
transport assertions.

The first full gate also exposed two stale authenticated E2E fixtures after User ownership was
introduced: the approved refresh token was not a JWT carrying `user-1`, and auth-entry's custom
Task omitted `ownerId`. Class: `INTEGRATION/TEST`. The common refresh fixture now carries the
seed user identity and the custom Task carries `ownerId: user-1`. Focused auth-entry rerun passed
1/1, then core passed 7/7, and the complete full gate passed 7/7 again without retries.

## USER-CRUD-JOURNEY-REVIEW-01

- Review target: implementation base `9ea74883b989c3e08d661b09b9548ba80a4852f3` through
  `27d07dc136adae16bd77200f4cf7a61a6e01fbfe`, checked against
  `docs/superpowers/plans/2026-09-03-user-crud-journey.md` and `USER-CRUD-01`~`08`.
- Reviewer: Codex `/root`, fresh second-pass plan-completion review after the implementation and
  Journey verification tasks were closed.
- Checks: original `assignment-original/openapi.yaml` and `src/generated/openapi.ts` unchanged;
  CRUD extension/generated/runtime/MSW shapes; no credential in public responses; exact
  one-field PATCH; cache unchanged before mutation success; outcome-unknown POST without automatic
  retry; fieldless 400 as form/row alert; wrong-password state preservation; User/owned-Task store
  cascade; post-delete protected access; responsive/accessibility browser evidence; dependency and
  FSD architecture diff.
- Findings: unresolved HIGH, MEDIUM, LOW findings 없음.
- Corrections: this review task required no product, test, or documentation correction.
- Rerun: generated contract check plus focused Vitest 10 files/52 tests PASS; `pnpm verify quick`
  PASS with hook 85, verifier 20, Vitest 43 files/219 tests; mapped User CRUD Chromium 2/2 PASS;
  `pnpm verify full` PASS with build, core Chromium 7/7 without retry, verifier regression 19/19,
  and read-only fingerprint check. Existing named browser session and both viewport evidence were
  re-reviewed; no UI correction triggered a browser rerun. `git diff --check` PASS.
- Verdict: PASS for AI plan-completion review. Golden Journey acceptance remains the following
  human checkpoint; no human decision is claimed here.

## USER-LOGOUT-JOURNEY-VERIFY-01

Requirement/Journey: `USER-LOGOUT-01`~`USER-LOGOUT-05`; `user-crud`; `USER-P1-7A`,
`USER-E7`. Target is branch `feat/user-crud`, logout implementation commits `20b4a9a`,
`2390474`, `62ae681`, plus this Journey verification diff. Session owner: Codex `/root`.

Automatic verification:

- Focused component/router/auth GREEN: 3 files/17 tests PASS; server/client boundary GREEN:
  4 files/20 tests PASS.
- Quick: `pnpm verify quick` — PASS, hook 85, verifier 20, Vitest 45 files/226 tests.
- Mapped E2E: `pnpm exec playwright test e2e/user-crud.spec.ts` — Chromium 2/2 PASS
  without retry. Existing core case count stayed at two. The success case observed exactly one
  `POST /api/sign-out`, a valid bearer header, and `body: null`; cancel sent no request. After
  success both reload and direct `/user` entry stayed at `/sign-in`; reauthentication followed
  the preserved safe `returnTo=/user`, then the prior account-deletion flow completed.
- Full: `pnpm verify full` — PASS, hook 85, verifier 20, Vitest 45 files/226 tests,
  production build, core Chromium 7/7 without retry, verifier regression 19/19 and read-only
  fingerprint check.

Named browser evidence:

- Agent-browser session: `user-logout-journey-verify-01`; route
  `http://127.0.0.1:5173/user`; viewports `390x844` and `1280x720`.
- Precondition/actions: seed user sign-in; profile open; confirm-modal cancel and reopen; a
  one-shot controlled 500 response held the request pending, then released it; Task navigation
  proved the same authenticated state remained; a later unmodified request completed logout;
  reload and direct `/user` were checked.
- Expected/actual: the responsive outline action was in the heading area. Cancel had initial
  focus and trigger regained focus. Pending exposed `aria-busy=true`, disabled cancel/confirm,
  showed `로그아웃 중`, and ignored Escape. The controlled failure kept the modal at `/user`
  with its alert and preserved all three seeded Tasks. Success returned `/sign-in`; reload and
  direct protected entry remained signed out. Both viewports reported no horizontal overflow.
- Console/network: page errors were empty. Console showed expected anonymous refresh 401s and
  MSW `POST /api/sign-out` 200 with an empty body. The one-shot controlled 500 intentionally
  bypassed MSW. Agent-browser's request monitor again captured no service-worker-owned API
  traffic; exact method/body/bearer assertions are independently covered by mapped E2E, API,
  and handler tests.
- Screenshots: `/tmp/user-logout-journey-mobile-profile.png`,
  `/tmp/user-logout-journey-mobile-dialog.png`,
  `/tmp/user-logout-journey-mobile-failure.png`,
  `/tmp/user-logout-journey-mobile-signed-out.png`,
  `/tmp/user-logout-journey-desktop-profile.png`,
  `/tmp/user-logout-journey-desktop-dialog.png`. Visual review found no clipping, overlap, or
  modal overflow. Browser and Vite server were closed.

Failure classification/correction/rerun: the first mapped E2E expected `/` after re-sign-in,
but the preceding protected direct-entry check correctly preserved `returnTo=/user`. Class:
`TEST`; the assertion and redundant profile navigation were corrected. Fresh mapped E2E passed
2/2 without retry. UI quick failures were `IMPLEMENTATION` (formatter layout) and `INTEGRATION`
(an AlertDialog prop omitted by the installed Radix contract); formatting was corrected and the
native AlertDialog outside-dismiss prevention was reused. Final quick and full gates passed.

## USER-LOGOUT-JOURNEY-REVIEW-01

- Review target: merge-base `9ea74883b989c3e08d661b09b9548ba80a4852f3`; logout range
  `46e32d02ea68f06a1ff405d230062a17b66ffce1..d4966571b8b3b2fdb31ba05dcedb2fcfb1f63c0b`;
  `docs/superpowers/plans/2026-09-03-user-logout.md`; `USER-LOGOUT-01`~`05`.
- Reviewer: Codex `/root`, the same implementation author acting as a fresh second-pass
  adversarial reviewer after implementation and Journey verification. A separate reviewer was
  not dispatched because the active runtime policy prohibited subagent spawning.
- Checks: unchanged original OpenAPI/generated/lockfile; extension OpenAPI and exact runtime
  guard; bodyless bearer request; refresh-cookie path and expiry; exact current-session revoke;
  no auth/cache mutation before 200; existing bounded terminal-401 policy; non-terminal failure
  preservation and no automatic retry; modal focus/pending/outside-close semantics; responsive
  screenshots and overflow; unchanged core case count; account-deletion regression; dependency,
  FSD, generated and diff hygiene.
- Findings: no unresolved HIGH, MEDIUM, or LOW findings.
- Corrections: no product, test, or documentation correction was required by this review task.
- Rerun: focused Vitest 5 files/27 tests PASS; `pnpm verify quick` PASS with hook 85,
  verifier 20 and Vitest 45 files/226 tests; mapped User CRUD Chromium 2/2 PASS without retry;
  `pnpm verify full` PASS with production build, core Chromium 7/7 without retry, verifier
  regression 19/19 and read-only fingerprint check. `git diff --check` and original/lockfile
  comparisons passed. The named browser evidence for `390x844` and `1280x720` was re-reviewed;
  no UI correction required a browser rerun.
- Verdict: PASS for AI plan-completion review. Golden Journey acceptance remains human-owned;
  no `HUMAN_APPROVED` status is claimed.

## FINAL-REVIEW-AUTH-TERMINATION-01 — 2026-09-04

Requirement/Journey/case trace: `USER-CRUD-06`, `USER-LOGOUT-04`,
`USER-LOGOUT-05`; corrected `user-crud` sign-out/delete session boundary.

Target: `c924331ee6449ee413bafdb30f10e49ec15aca41` on
`fix/final-review-auth`, rebased onto `main`
`c7d515189ca41641f5d4a217902a568906356b01`.

Automatic verification: focused auth/router/API Vitest 9 files/92 tests PASS;
`pnpm verify quick` PASS with hook 88, verifier 20 and 48 files/281 tests;
mapped auth-entry/user-crud Chromium 4/4 PASS; isolated-port `pnpm verify full`
PASS with build, core Chromium 9/9 and verifier regression 19/19.

Browser verification: production preview at `127.0.0.1:4187`; signed in from
anonymous `/user/`, opened `/user`, confirmed sign-out, reached `/sign-in`, then
directly re-entered `/user/` and returned to `/sign-in`. `agent-browser errors`
was empty. The console showed sign-out 200 followed by the expected refresh 401.
Screenshots shared with the auth correction record:
`/tmp/final-review-auth-anonymous-user.png` and
`/tmp/final-review-auth-authenticated-sign-in.png`.

Failure classification/correction/rerun: `ENVIRONMENT`; another worktree used
the canonical 4173 port. The mapped and full suites ran on isolated port 4187;
temporary port-only config/test literals were restored afterward. Final diff
contains neither temporary change.

Review target: `docs/superpowers/plans/2026-09-04-auth-route-session-corrections.md`;
`USER-CRUD-06`, `USER-LOGOUT-04`, `USER-LOGOUT-05`; target
`c924331ee6449ee413bafdb30f10e49ec15aca41`

Reviewer: Codex `/root`, the implementation author in an explicit fresh
second-pass role after implementation; runtime policy prohibited subagent review

Checks: no auth/cache mutation before exact 200; same-generation token rotation
terminates the response-time snapshot; a newer generation is preserved; terminal
401 still terminates only its exact snapshot; delete/sign-out failure behavior,
navigation, modal and account-deletion regressions; OpenAPI/generated/lockfile,
test duplication, browser console/network and TODO consistency

Findings: no unresolved HIGH, MEDIUM, or LOW finding

Corrections: not applicable

Rerun: focused 9/92, quick 48/281, mapped Chromium 4/4, production browser,
full core Chromium 9/9, `git diff --check` and authoritative comparisons PASS

Verdict: PASS for AI plan-completion and corrected user-crud review. Human
checkpoint acceptance remains separate; no `HUMAN_APPROVED` status is claimed.
