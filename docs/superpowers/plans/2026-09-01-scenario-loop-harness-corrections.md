# Scenario Loop Harness Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four Golden Journeys independent and make the canonical full gate reject focused tests, inconsistent TODO completion, and verifier regressions while preserving honest human approval and review evidence.

**Architecture:** Test-only Playwright state establishes protected Journey authentication without sign-in. The existing verifier gains one narrow TODO semantic parser and one guarded full-only regression stage; existing configs reject focused tests locally. Human checkpoints remain unapproved without primary evidence, and a new independent review is performed only against the post-implementation commit.

**Tech Stack:** Python 3 standard library, Playwright, Vitest, TypeScript, existing MSW fixtures, Markdown evidence.

## Global Constraints

- Do not add product routes, APIs, test-control endpoints, dependencies, or CI.
- Do not change accepted behavior, architecture, authentication policy, or destructive-data semantics.
- Do not create historical checkpoint approval or independent-review evidence retroactively.
- AI never writes `HUMAN_APPROVED`.
- Use TDD for every behavior change and keep verification commands read-only.
- Modify only the existing `QA-HARNESS-01` task block and status claims needed to restore dependency truth.

## File Map

- Create `e2e/authenticated-fixture.ts`: seed the approved mock refresh state for protected Journey entry.
- Modify `e2e/work-overview.spec.ts`, `e2e/task-discovery.spec.ts`, `e2e/task-resolution.spec.ts`: consume the authenticated fixture and prove zero sign-in requests.
- Modify `playwright.config.ts`, `vitest.config.ts`, `src/test/harness-config.test.ts`: reject focused tests in every environment.
- Modify `scripts/verify`, `tests/test_verify_contract.py`, `tests/test_verify.py`: enforce TODO semantics and execute the complete verifier regression suite from canonical full without recursion.
- Modify `TODO.md` and the five files under `docs/quality/evidence/`: remove unsupported approval/review claims and record only current evidence.
- Modify `docs/quality/verification.md`: document the semantic TODO and full verifier-regression stages.

---

### Task 1: Independent Protected-Journey Authentication Fixture

**Files:**
- Create: `e2e/authenticated-fixture.ts`
- Modify: `e2e/work-overview.spec.ts`
- Modify: `e2e/task-discovery.spec.ts`
- Modify: `e2e/task-resolution.spec.ts`

**Interfaces:**
- Consumes: mock auth storage key `__kbhc_msw_auth_fixture__` and refresh cookie name `token`.
- Produces: `prepareAuthenticatedPage(context: BrowserContext, page: Page): Promise<void>`.

- [ ] **Step 1: Write the failing work-overview assertion**

Keep the current sign-in setup temporarily, track `/api/sign-in`, and assert at the end
that the protected Journey did not use it:

```ts
const signInRequests: string[] = [];
page.on("request", (request) => {
  if (new URL(request.url()).pathname === "/api/sign-in") signInRequests.push(request.method());
});

expect(signInRequests).toEqual([]);
```

- [ ] **Step 2: Run the focused E2E and verify RED**

Run:

```bash
pnpm exec playwright test e2e/work-overview.spec.ts
```

Expected: FAIL because the existing setup observed one `POST /api/sign-in` request.

- [ ] **Step 3: Implement the minimal authenticated fixture**

Create `e2e/authenticated-fixture.ts`:

```ts
import type { BrowserContext, Page } from "@playwright/test";

const refreshToken = "e2e-approved-refresh-token";

export async function prepareAuthenticatedPage(
  context: BrowserContext,
  page: Page,
): Promise<void> {
  await context.addCookies([
    {
      name: "token",
      value: refreshToken,
      domain: "127.0.0.1",
      path: "/api/refresh",
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
    },
  ]);
  await page.addInitScript(
    ({ storageKey, token }) => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          sequence: 0,
          currentAccessToken: null,
          activeRefreshTokens: [token],
        }),
      );
    },
    { storageKey: "__kbhc_msw_auth_fixture__", token: refreshToken },
  );
}
```

Then import the helper in `work-overview.spec.ts`, add `context` to the test arguments,
call `prepareAuthenticatedPage(context, page)` before `page.goto("/")`, and remove the
direct sign-in fetch, reload, expected bootstrap 401 and console reset.

- [ ] **Step 4: Convert the other protected Journeys**

In `task-discovery.spec.ts` and `task-resolution.spec.ts`, add `context`, import and call
`prepareAuthenticatedPage(context, page)`, navigate directly to `/task` and
`/task/task-1`, and assert the tracked sign-in request array remains empty. Remove their
direct sign-in fetch, reload and expected anonymous bootstrap console error.

- [ ] **Step 5: Run all protected Journey tests and verify GREEN**

Run:

```bash
pnpm exec playwright test e2e/work-overview.spec.ts e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts
```

Expected: 3 passed; each test starts on its protected route, sends no sign-in request,
and retains its existing bearer/request-count/console assertions.

- [ ] **Step 6: Commit the independent fixture**

```bash
git add e2e/authenticated-fixture.ts e2e/work-overview.spec.ts \
  e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts
git commit -m "test(e2e): 보호 Journey 인증 fixture 분리"
```

---

### Task 2: Reject Focused Tests Locally

**Files:**
- Modify: `src/test/harness-config.test.ts`
- Modify: `playwright.config.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: exported Playwright and Vitest config objects.
- Produces: unconditional `forbidOnly: true` and `allowOnly: false` gate configuration.

- [ ] **Step 1: Write the failing config contract tests**

Extend `src/test/harness-config.test.ts`:

```ts
import vitestConfig from "../../vitest.config";

it("rejects focused Playwright and Vitest tests locally", () => {
  expect(config.forbidOnly).toBe(true);
  expect(vitestConfig.test).toMatchObject({ allowOnly: false });
});
```

- [ ] **Step 2: Run the contract test and verify RED**

Run:

```bash
pnpm vitest run src/test/harness-config.test.ts
```

Expected: FAIL because Playwright resolves `forbidOnly` to false locally and Vitest has
no `allowOnly` value.

- [ ] **Step 3: Apply the minimal config changes**

Set:

```ts
// playwright.config.ts
forbidOnly: true,

// vitest.config.ts, inside test
allowOnly: false,
```

- [ ] **Step 4: Run the config contract and verify GREEN**

Run:

```bash
pnpm vitest run src/test/harness-config.test.ts
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit focused-test rejection**

```bash
git add src/test/harness-config.test.ts playwright.config.ts vitest.config.ts
git commit -m "test(harness): focused test 거짓 통과 차단"
```

---

### Task 3: Enforce TODO State and Remove Unsupported Approval Claims

**Files:**
- Modify: `tests/test_verify_contract.py`
- Modify: `scripts/verify`
- Modify: `TODO.md`
- Modify: `docs/quality/evidence/auth-entry.md`
- Modify: `docs/quality/evidence/work-overview.md`
- Modify: `docs/quality/evidence/task-discovery.md`
- Modify: `docs/quality/evidence/task-resolution.md`
- Modify: `docs/quality/evidence/final-qa.md`
- Modify: `docs/quality/verification.md`

**Interfaces:**
- Consumes: Markdown task blocks beginning with `### [ ] ID` or `### [x] ID`.
- Produces: `verify_todo_consistency(root: Path = ROOT) -> list[str]`.

- [ ] **Step 1: Write failing semantic parser tests**

Add temporary-repository tests to `tests/test_verify_contract.py`:

```python
def test_todo_rejects_completed_task_with_unfinished_dependency(self):
    verifier = load_verify_module()
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "TODO.md").write_text(
            """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS

### [x] QA-01 audit
- Depends on: `JOURNEY-AUTH-01`
- Status: AI_VERIFIED
""",
            encoding="utf-8",
        )
        self.assertEqual(
            verifier.verify_todo_consistency(root),
            ["QA-01 depends on unfinished JOURNEY-AUTH-01"],
        )

def test_todo_rejects_unapproved_checkpoint_claim(self):
    verifier = load_verify_module()
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "TODO.md").write_text(
            """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS
- Evidence: checkpoint 승인 수신
""",
            encoding="utf-8",
        )
        self.assertEqual(
            verifier.verify_todo_consistency(root),
            ["JOURNEY-AUTH-01 claims checkpoint approval without HUMAN_APPROVED"],
        )
```

Import `tempfile` and `Path` in the test file.

- [ ] **Step 2: Run the parser tests and verify RED**

Run:

```bash
python3 -m unittest \
  tests.test_verify_contract.VerifyContractTests.test_todo_rejects_completed_task_with_unfinished_dependency \
  tests.test_verify_contract.VerifyContractTests.test_todo_rejects_unapproved_checkpoint_claim -v
```

Expected: ERROR because `verify_todo_consistency` does not exist.

- [ ] **Step 3: Implement the minimum TODO parser**

Add compiled task/status/dependency patterns and `verify_todo_consistency` to
`scripts/verify`. The function must build all task states first, then return stable
errors for checkbox/status mismatch, missing dependency IDs, completed dependencies that
are unfinished, and unapproved Journey approval claims. Only `AI_VERIFIED` and
`HUMAN_APPROVED` are completed states.

Call it in `verify_setup()` after marker validation:

```python
todo_errors = verify_todo_consistency(ROOT)
if todo_errors:
    return fail(
        "setup",
        "TODO state invalid: {}".format(", ".join(todo_errors)),
        "./scripts/verify setup",
    )
```

- [ ] **Step 4: Run the focused parser tests and verify GREEN**

Run the Step 2 command.

Expected: 2 tests passed.

- [ ] **Step 5: Synchronize tracked status with primary evidence**

Apply these exact state corrections:

- Four `JOURNEY-*` tasks remain `[ ]` and `IN_PROGRESS`; replace approval-received text
  with `tracked 사람 승인 근거 없음; checkpoint 미승인 유지`.
- Change `QA-01` and `QA-02` to `[ ]`, `Status: BLOCKED`, recording that their Journey
  approval dependencies lack primary human evidence.
- Remove “approval was received” from the four Journey evidence files and replace it
  with a pending-checkpoint statement.
- In `final-qa.md`, state that the prior cross-Journey review has no reviewer/target
  record and does not count as the required independent review.
- Do not add a reviewer, target commit, `HUMAN_APPROVED`, or approval quotation.

- [ ] **Step 6: Verify current repository TODO consistency**

Add and run:

```python
def test_repository_todo_state_is_consistent(self):
    verifier = load_verify_module()
    self.assertEqual(verifier.verify_todo_consistency(ROOT), [])
```

Run:

```bash
python3 -m unittest tests/test_verify_contract.py -v
```

Expected: all contract tests pass.

- [ ] **Step 7: Document and commit semantic verification**

Update `docs/quality/verification.md` so setup explicitly validates checkbox, Status,
dependency and unsupported checkpoint claims. Then commit:

```bash
git add scripts/verify tests/test_verify_contract.py TODO.md \
  docs/quality/verification.md docs/quality/evidence/auth-entry.md \
  docs/quality/evidence/work-overview.md docs/quality/evidence/task-discovery.md \
  docs/quality/evidence/task-resolution.md docs/quality/evidence/final-qa.md
git commit -m "fix(workflow): 승인 근거와 TODO 상태 동기화"
```

---

### Task 4: Run the Complete Verifier Regression Suite from Canonical Full

**Files:**
- Modify: `tests/test_verify_contract.py`
- Modify: `tests/test_verify.py`
- Modify: `scripts/verify`
- Modify: `docs/quality/verification.md`

**Interfaces:**
- Consumes: `KBHC_VERIFY_SELF_TESTING=1` only as a recursion guard.
- Produces: `verify-regression` stage in outermost `./scripts/verify full`.

- [ ] **Step 1: Write failing outermost/nested stage tests**

Add to `tests/test_verify_contract.py` tests that patch fingerprint, setup, frontend and
`run_stage`. With the guard absent, `main(["full"])` must call:

```python
mock.call(
    "verify-regression",
    [
        "env",
        "KBHC_VERIFY_SELF_TESTING=1",
        sys.executable,
        "-m",
        "unittest",
        "tests/test_verify.py",
        "-v",
    ],
)
```

With `KBHC_VERIFY_SELF_TESTING=1`, assert the call is omitted.

- [ ] **Step 2: Run the stage tests and verify RED**

Run:

```bash
python3 -m unittest tests/test_verify_contract.py -v
```

Expected: FAIL because canonical full does not call `verify-regression`.

- [ ] **Step 3: Implement the guarded full-only stage**

After successful `verify_frontend("full")`, call `run_stage` with the exact command from
Step 1 only when `KBHC_VERIFY_SELF_TESTING` is not `1`.

In `tests/test_verify.py`, build a copy of `os.environ`, set
`KBHC_VERIFY_SELF_TESTING=1`, and pass it to every `run_verify` subprocess. This keeps
standalone execution non-recursive as well.

- [ ] **Step 4: Run contract and complete verifier regression suites**

Run:

```bash
python3 -m unittest tests/test_verify_contract.py -v
python3 -m unittest tests/test_verify.py -v
```

Expected: all contract tests and all 19 verifier regression tests pass once without
recursive re-entry.

- [ ] **Step 5: Document and commit canonical regression coverage**

Update the full-mode description in `docs/quality/verification.md`, then commit:

```bash
git add scripts/verify tests/test_verify_contract.py tests/test_verify.py \
  docs/quality/verification.md
git commit -m "test(verify): 전체 verifier 회귀를 full gate에 포함"
```

---

### Task 5: Integrate, Independently Review, and Reverify

**Files:**
- Modify: `TODO.md`
- Modify: `docs/quality/evidence/final-qa.md`

**Interfaces:**
- Consumes: Tasks 1-4 commits and the approved design/spec.
- Produces: current implementation evidence and a real independent review record bound to the reviewed commit.

- [ ] **Step 1: Run pre-review implementation verification**

Run:

```bash
./scripts/verify quick
pnpm exec playwright test --grep @core
git diff --check
git status --short
```

Expected: quick passes, five core Chromium tests pass, diff check is empty, and no
uncommitted implementation change remains.

- [ ] **Step 2: Capture and independently review the implementation commit**

Run `git rev-parse HEAD`. Give that exact commit, the approved spec, this plan and the
five original findings to a fresh read-only reviewer that did not author Tasks 1-4.
The reviewer must inspect actual code, tests, TODO state and diff and run relevant
read-only reproductions. A field template alone is not review completion.

- [ ] **Step 3: Resolve findings against a new target when required**

For every HIGH/MEDIUM finding, write a failing reproduction first, apply the minimum
correction, rerun the affected gate and commit with a Korean Conventional Commit message.
Then run `git rev-parse HEAD` again and have the independent reviewer inspect the new
commit. Repeat until the verdict is `PASS` or `PASS_WITH_LOW`.

- [ ] **Step 4: Record only the review that actually occurred**

Append to `docs/quality/evidence/final-qa.md`:

```text
Review target: exact reviewed commit SHA, QA-HARNESS-01, five harness findings
Reviewer: actual fresh reviewer ID and relationship to the implementation author
Checks: commands and files the reviewer actually inspected
Findings: actual severity/class/root cause or none
Corrections: actual corrections or not applicable
Rerun: actual commands and results
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

Use the actual values returned by the reviewer. Do not rewrite or supplement the old
Journey review claims as though they had contained these fields.

- [ ] **Step 5: Update QA-HARNESS-01 evidence without closing human gates**

Record the Task 1-4 RED/GREEN commands, commit SHAs, independent review target and latest
verification results in the owned `QA-HARNESS-01` block. Keep the four Journey checkpoints
unapproved and keep `QA-01`/`QA-02` blocked. Keep `QA-HARNESS-01` `IN_PROGRESS` because
its declared predecessor is blocked; do not mark it `HUMAN_APPROVED` or final-complete.

- [ ] **Step 6: Commit the truthful evidence record**

```bash
git add TODO.md docs/quality/evidence/final-qa.md
git commit -m "docs(quality): 하네스 검증과 독립 리뷰 근거 기록"
```

- [ ] **Step 7: Run fresh canonical full verification**

Run:

```bash
./scripts/verify full
git diff --check
git status --short
```

Expected: canonical full executes hook tests, verifier contract tests, frontend checks,
build, five core E2E tests and the complete 19-test verifier regression stage; every
stage passes, repository fingerprint remains stable, and worktree is clean.
