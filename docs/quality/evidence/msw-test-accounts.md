# MSW Test Accounts Evidence

## MSW-TEST-ACCOUNTS-VERIFY-01 — current target

Requirement/Journey trace: `SYS-04`, `DASH-01`, `USER-01`, `TASK-LIST-01`~
`TASK-LIST-04`, `TASK-DETAIL-01`~`TASK-DETAIL-02`; `MSW-TEST-ACCOUNTS-01`.

Initial implementation target: `efa66bf`; corrected review target: `5bb9b83`; branch
`feat/msw-test-accounts`; Codex `/root`.

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
- Canonical `pnpm verify full` passed at the corrected target: hook 88, verifier contract
  20, format, lint, generated API check, typecheck, Vitest 47 files/254 tests, production
  build, core Chromium 9/9, and verifier regression 19/19.

Agent-browser sessions: `msw-primary`, `msw-primary-mobile`, `msw-empty`, `msw-error`;
production preview; Chromium `1280x720` and `390x844`; all sessions and the preview server
were closed after verification.

Actions/actual:

- `user@example.com`: dashboard rendered 30 total, 20 remaining, and 10 done. Repeated
  real scrolling of the named task-list region reached `추가 할 일 30`, rendered the
  terminal message, and opened `/task/task-30` with the expected title, memo, TODO status,
  and timestamp. The mobile rerun also reached task 30 with 6 mounted rows, terminal true,
  and exact document/viewport widths `390/390`.
- `empty@example.com`: dashboard rendered 0/0/0 and `등록된 할 일이 없습니다`; `/task`
  rendered the dedicated empty card; `/user` rendered the fixed email, `빈 목록 사용자`,
  and `등록된 할 일이 없는 계정`.
- `error@example.com`: sign-in succeeded. `/`, `/user`, `/task`, and `/task/task-1`
  respectively rendered dashboard, profile, list, and detail load-failure alerts with
  `네트워크 요청에 실패했습니다.` and `다시 불러오기`. Retrying the dashboard remained
  deterministic and recoverable rather than ending the authenticated session.

Console/Network: MSW logs showed primary dashboard 200, task pages 1~15 exactly once, and
task-30 detail 200. Fresh sessions emitted the existing anonymous refresh 401 before login.
The deliberate error account emitted expected failed protected requests. `agent-browser errors`
reported no page errors.

Screenshot/Trace: `/tmp/msw-primary-dashboard.png`,
`/tmp/msw-primary-task-terminal.png`, `/tmp/msw-primary-task-terminal-mobile.png`,
`/tmp/msw-empty-task.png`,
`/tmp/msw-error-dashboard.png`, `/tmp/msw-error-task-detail.png`; passing Playwright
attachments are retained by its HTML report; no passing trace was generated.

Failure class/correction: initial mapped E2E exposed `TEST` assumptions that newly created
or terminal records remain mounted in a longer virtual list. Failure screenshots showed
only the current virtual window. The discovery test performs a final list scroll after page
15. The first CRUD correction used direct URL navigation; the adversarial review rejected
that weakened assertion, so the corrected test loads pages to terminal, scrolls, and opens
the created Task through its actual list link before update and delete. A subsequent
`TOOLING` format-check failure was corrected exactly to Biome's output.

## Plan-completion adversarial review — 2026-09-04

Review target: `5bb9b83` and the complete `main...5bb9b83` change set.

Reviewer: Codex `/root` in an explicit second-pass role after implementation; no subagent
was used because the user selected inline execution.

Checks: re-read the approved design and every plan step; audited account identities,
30-task IDs/status distribution/dashboard totals, 15-page termination, owner isolation,
GET-only error guards, authentication and destructive semantics, OpenAPI/generated/
dependency immutability, changed core E2E expectations, virtual-list assertion strength,
README instructions, browser diagnostics, secrets, unrelated files, and clean status.

Findings: one MEDIUM `TEST` finding—the initial long-list adaptation bypassed the created
Task's list link with direct URL navigation. One LOW `TEST` finding—the virtual DOM bound
of fewer than 30 rows was too weak. Plan reconciliation also found missing manual mobile
evidence. No product, contract, auth, ownership, destructive-data, dependency, or secret
finding remained.

Corrections: restored created and updated Task discovery through the real list link using
response-synchronized page loading; tightened both virtual row assertions to fewer than 10;
added a `390x844` production-preview terminal scroll with 6 mounted rows and width `390/390`.

Rerun: corrected Task CRUD Chromium 2/2 PASS; tightened task-discovery Chromium 1/1 PASS;
mapped suite 7/7 PASS; canonical full PASS with hook 88, verifier contract 20, Vitest
47/254, build, core Chromium 9/9, and verifier regression 19/19; immutable contract,
generated, package, and lockfile diff exit 0; `git diff --check` and clean tracked status.

Verdict: PASS — no unresolved HIGH, MEDIUM, or LOW finding. The task may transition to
`AI_VERIFIED`; this does not claim `HUMAN_APPROVED` or final human acceptance.
