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
