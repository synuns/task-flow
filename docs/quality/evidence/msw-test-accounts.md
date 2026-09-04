# MSW Test Accounts Evidence

## MSW-TEST-ACCOUNTS-VERIFY-01 — current target

Requirement/Journey trace: `SYS-04`, `DASH-01`, `USER-01`, `TASK-LIST-01`~
`TASK-LIST-04`, `TASK-DETAIL-01`~`TASK-DETAIL-02`; `MSW-TEST-ACCOUNTS-01`.

Implementation target: `efa66bf`; branch `feat/msw-test-accounts`; Codex `/root`.

Automatic checks:

- Fixture/handler RED confirmed the missing 30-task seed, fixed empty/error identities,
  and protected-read transport failures; corresponding GREEN suites passed 27/27,
  24/24, and 23/23.
- `pnpm verify quick` passed: hook 88, verifier contract 20, format, lint, generated API
  check, typecheck, and Vitest 47 files/254 tests.
- Mapped Chromium passed 7/7:
  `work-overview`, `task-discovery`, `task-resolution`, both `task-crud` cases, and both
  `msw-test-accounts` cases. The discovery case observed exactly pages 1 through 15,
  terminal pagination, bounded virtual rows, and `/task/task-30` navigation.
- `git diff --check` passed. OpenAPI, generated API, dependency, lockfile, and destructive
  data semantics were not changed.

Agent-browser sessions: `msw-primary`, `msw-empty`, `msw-error`; production preview;
Chromium `1280x720`; all sessions and the preview server were closed after verification.

Actions/actual:

- `user@example.com`: dashboard rendered 30 total, 20 remaining, and 10 done. Repeated
  real scrolling of the named task-list region reached `추가 할 일 30`, rendered the
  terminal message, and opened `/task/task-30` with the expected title, memo, TODO status,
  and timestamp.
- `empty@example.com`: dashboard rendered 0/0/0 and `등록된 할 일이 없습니다`; `/task`
  rendered the dedicated empty card; `/user` rendered the fixed email, `빈 목록 사용자`,
  and `등록된 할 일이 없는 계정`.
- `error@example.com`: sign-in succeeded. `/`, `/user`, `/task`, and `/task/task-1`
  respectively rendered dashboard, profile, list, and detail load-failure alerts with
  `네트워크 요청에 실패했습니다.` and `다시 불러오기`. Retrying the dashboard remained
  deterministic and recoverable rather than ending the authenticated session.

Console/Network: MSW logs showed primary dashboard 200, task pages 1~15 exactly once, and
task-30 detail 200. Fresh sessions emitted the existing anonymous refresh 401 before login.
The deliberate error account emitted expected failed protected requests. `agent-browser
errors` reported no page errors.

Screenshot/Trace: `/tmp/msw-primary-dashboard.png`,
`/tmp/msw-primary-task-terminal.png`, `/tmp/msw-empty-task.png`,
`/tmp/msw-error-dashboard.png`, `/tmp/msw-error-task-detail.png`; passing Playwright
attachments are retained by its HTML report; no passing trace was generated.

Failure class/correction: initial mapped E2E exposed `TEST` assumptions that newly created
or terminal records remain mounted in a longer virtual list. Failure screenshots showed
only the current virtual window. The tests now navigate to the server-returned created ID
and perform the final list scroll after page 15; focused rerun passed 3/3 and the complete
mapped rerun passed 7/7. A subsequent `TOOLING` format-check failure was corrected exactly
to Biome's output before the successful quick rerun.

Rerun verdict: implementation and mapped browser checks PASS. Final full gate and
plan-completion adversarial review are pending before the TODO transition.
