# Auth View Scenario Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and close `AUTH-VIEW-01` with boundary-level component coverage and current-commit mobile/desktop browser evidence without rewriting the already implemented sign-in screen.

**Architecture:** Keep `SignInPage`, `SignInForm`, the existing Zod schema, and shared shadcn primitives unchanged unless a new acceptance check exposes a real behavior gap. Add only missing component regression coverage, then run the focused, quick, and browser gates before a fresh plan-completion review and TODO status transition.

**Tech Stack:** React 19, TypeScript, React Hook Form, Zod, Testing Library, Vitest, agent-browser, Playwright-compatible Vite runtime

## Global Constraints

- OpenAPI operations, schemas, statuses, authentication policy, dependencies, and architecture do not change.
- Work occurs in an ignored project-local `.worktrees/auth-view-01` linked worktree.
- Only `AUTH-VIEW-01` is owned; `AUTH-ERROR-VIEW-01` and later Journey blocks remain unchanged.
- Existing `SignInForm`, `Button`, `Input`, `Label`, and `Card` are reused.
- A passing characterization check is not recorded as RED; production code changes require a focused failing test first.
- Browser QA uses named `agent-browser` sessions at `390x844` and `1280x720`, refreshes snapshots after DOM changes, checks console/network, and closes every session.
- Verification is read-only; formatting mutation is separate and followed by `./scripts/verify quick`.
- AI may set `AUTH-VIEW-01` only to `AI_VERIFIED`, never `HUMAN_APPROVED`.

---

## File Map

- Modify `TODO.md`: claim only `AUTH-VIEW-01`, then record reproducible evidence and final `AI_VERIFIED` status after review.
- Modify `src/features/sign-in/ui/sign-in-form.test.tsx`: add boundary-state and pending-label component regression coverage.
- Read only `src/features/sign-in/ui/sign-in-form.tsx`: current presentation and form state implementation; change only after a new focused RED proves a gap.
- Read only `src/features/sign-in/model/sign-in-schema.ts`: source of validation messages; do not duplicate rules in UI code.
- Read only `src/pages/sign-in/index.tsx`: current heading, explanatory copy, width, and hierarchy.
- Read only `docs/quality/evidence/auth-entry.md`: prior Journey baseline; task-specific current evidence remains in the owned TODO block until `AUTH-JOURNEY-VERIFY-01` consolidates it.

### Task 1: Claim and characterize `AUTH-VIEW-01`

**Files:**
- Modify: `TODO.md`
- Read: `docs/quality/requirements.md`
- Read: `src/pages/sign-in/index.tsx`
- Read: `src/features/sign-in/ui/sign-in-form.tsx`
- Test: `src/features/sign-in/ui/sign-in-form.test.tsx`

**Interfaces:**
- Consumes: `SignInForm({ onAuthenticated }: SignInFormProps)`, `signInSchema`, and the existing `AUTH-VIEW-01` acceptance text.
- Produces: one owned `IN_PROGRESS` TODO block and a clean focused baseline for the next task.

- [ ] **Step 1: Create the isolated execution worktree**

Use the `superpowers:using-git-worktrees` skill. Confirm `.worktrees` is ignored, then create branch `feat/auth-view-01` at the plan commit in `.worktrees/auth-view-01`.

Run:

```bash
git check-ignore -q .worktrees
git worktree add .worktrees/auth-view-01 -b feat/auth-view-01
```

Expected: the ignore check exits `0`; Git reports a new linked worktree on `feat/auth-view-01`.

- [ ] **Step 2: Confirm the worktree and baseline are isolated**

Run in `.worktrees/auth-view-01`:

```bash
git status --short --branch
git rev-parse --git-dir
git rev-parse --git-common-dir
```

Expected: clean `feat/auth-view-01`; git dir differs from git common dir.

- [ ] **Step 3: Claim the exact TODO block**

In `TODO.md`, change only the `AUTH-VIEW-01` block:

```markdown
- Status: IN_PROGRESS
- Evidence: 2026-09-01 Codex `/root` task block owner; branch `feat/auth-view-01`;
  start commit recorded by `git rev-parse HEAD`; target `AUTH-01`~`AUTH-05`;
  characterization and current-commit verification in progress
```

Do not edit another task status or evidence block.

- [ ] **Step 4: Verify TODO ownership consistency**

Run:

```bash
./scripts/verify setup
```

Expected: `PASS setup`; no unfinished dependency or ownership error.

- [ ] **Step 5: Run the focused baseline**

Run:

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx
```

Expected: current three component tests pass. Record this as characterization, not RED.

- [ ] **Step 6: Commit the task claim**

Run:

```bash
git add TODO.md
git commit -m "chore(auth): 로그인 화면 작업 소유권 기록"
```

Expected: one commit containing only the `AUTH-VIEW-01` TODO block.

### Task 2: Add missing component boundary coverage

**Files:**
- Modify: `src/features/sign-in/ui/sign-in-form.test.tsx`
- Read only unless RED: `src/features/sign-in/ui/sign-in-form.tsx`
- Read: `src/features/sign-in/model/sign-in-schema.ts`

**Interfaces:**
- Consumes: accessible labels `이메일`, `비밀번호`; schema error messages; submit labels `로그인`, `로그인 중`.
- Produces: component regressions for empty, 7-character, 25-character, non-ASCII, valid, and pending visible states.

- [ ] **Step 1: Add an empty-input UI regression**

Add this test after the existing disabled/error test:

```tsx
it("shows required messages after entered values are cleared", async () => {
  const user = userEvent.setup();
  render(<SignInForm onAuthenticated={vi.fn()} />);

  const email = screen.getByRole("textbox", { name: "이메일" });
  const password = screen.getByLabelText("비밀번호");
  await user.type(email, "x");
  await user.clear(email);
  await user.type(password, "x");
  await user.clear(password);

  expect(email).toHaveAccessibleDescription("이메일을 입력해주세요.");
  expect(password).toHaveAccessibleDescription(
    "8~24자의 영문과 숫자를 입력하세요. 비밀번호는 8자 이상이어야 합니다.",
  );
  expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
});
```

- [ ] **Step 2: Run the empty-input regression**

Run:

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx -t "shows required messages"
```

Expected: PASS because this characterizes current behavior. If it fails, classify the actual mismatch before changing production code; do not weaken the assertion.

- [ ] **Step 3: Add password boundary UI regressions**

Add this table-driven test after the empty-input test:

```tsx
it.each([
  ["7-character", "Pass123", "비밀번호는 8자 이상이어야 합니다."],
  ["25-character", "A".repeat(25), "비밀번호는 24자 이하여야 합니다."],
  ["non-ASCII", "Password한", "비밀번호는 영문과 숫자로만 입력해주세요."],
])("shows the %s password error and keeps submit disabled", async (_case, value, message) => {
  const user = userEvent.setup();
  render(<SignInForm onAuthenticated={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "이메일" }), "user@example.com");
  const password = screen.getByLabelText("비밀번호");
  await user.type(password, value);

  expect(password).toHaveAccessibleDescription(
    `8~24자의 영문과 숫자를 입력하세요. ${message}`,
  );
  expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
});
```

- [ ] **Step 4: Run the password boundary regressions**

Run:

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx -t "password error"
```

Expected: three tests pass against the existing schema/form integration.

- [ ] **Step 5: Strengthen the existing pending regression**

In `submits once and returns the token pair`, replace the post-click disabled assertion with:

```tsx
await user.click(submit);
const pendingSubmit = screen.getByRole("button", { name: "로그인 중" });
expect(pendingSubmit).toBeDisabled();
await user.click(pendingSubmit);
release();
```

This preserves the existing request-count and token assertions below it.

- [ ] **Step 6: Run the full focused component file**

Run:

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx
```

Expected: all original and new tests pass. If a test exposes a production gap, first retain the failing assertion as RED, then change only `sign-in-form.tsx` and rerun this command.

- [ ] **Step 7: Run formatting and type checks without mutation**

Run:

```bash
pnpm format:check
pnpm typecheck
git diff --check
```

Expected: all commands pass. If format check fails, run `pnpm run format`, inspect only the intended test diff, and rerun the three commands.

- [ ] **Step 8: Commit the regression coverage**

Run:

```bash
git add src/features/sign-in/ui/sign-in-form.test.tsx
git commit -m "test(auth): 로그인 화면 상태 검증 보강"
```

Expected: one commit containing only focused component-test coverage unless a retained RED required the minimal adjacent production fix.

### Task 3: Verify mobile and desktop browser behavior

**Files:**
- No tracked file changes expected.
- Inspect: `/sign-in` in the running application.

**Interfaces:**
- Consumes: current `SignInPage`, `SignInForm`, app shell, MSW sign-in handler.
- Produces: reproducible `AUTH-VIEW-01` browser evidence for two viewports.

- [ ] **Step 1: Start the application server**

Run in the worktree:

```bash
pnpm dev --host 127.0.0.1
```

Expected: Vite reports a local URL. Keep the session ID for shutdown.

- [ ] **Step 2: Verify the mobile initial and invalid states**

Use the `agent-browser` skill and session `auth-view-01-mobile`:

```bash
agent-browser --session auth-view-01-mobile open http://127.0.0.1:5173/sign-in
agent-browser --session auth-view-01-mobile set viewport 390 844
agent-browser --session auth-view-01-mobile wait --load networkidle
agent-browser --session auth-view-01-mobile snapshot -i
```

Tab through dashboard, task, sign-in, email, password, and submit. Exercise invalid email and 7-character password, take a fresh snapshot, and verify submit remains disabled and `document.documentElement.scrollWidth <= 390`.

- [ ] **Step 3: Verify the mobile valid state and request count**

Fill `user@example.com` and `Password1`, verify submit becomes enabled, submit once, then inspect:

```bash
agent-browser --session auth-view-01-mobile network requests --filter api/sign-in
agent-browser --session auth-view-01-mobile console
agent-browser --session auth-view-01-mobile errors
agent-browser --session auth-view-01-mobile screenshot /tmp/kbhc-auth-view-01-mobile.png
```

Expected: one `POST /api/sign-in`; no page error; only explicitly explained HTTP resource messages, if any.

- [ ] **Step 4: Verify desktop hierarchy and readable width**

Use session `auth-view-01-desktop`, viewport `1280x720`, and a fresh signed-out context. Verify one `로그인` heading, explanatory copy, visible labels, keyboard focus, and a centered form whose width does not exceed `448px`.

Save `/tmp/kbhc-auth-view-01-desktop.png`, inspect console/errors, and close both sessions:

```bash
agent-browser --session auth-view-01-mobile close
agent-browser --session auth-view-01-desktop close
```

Expected: both sessions close successfully.

- [ ] **Step 5: Stop the application server**

Send Ctrl-C to the stored Vite session and confirm the process exits.

### Task 4: Run canonical gates and record evidence

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: focused component results, browser records, and current commit SHA.
- Produces: a complete but still `IN_PROGRESS` plan target ready for adversarial review.

- [ ] **Step 1: Run the focused gate again**

Run:

```bash
pnpm vitest run src/features/sign-in/ui/sign-in-form.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the canonical quick gate**

Run:

```bash
./scripts/verify quick
```

Expected: setup, format, lint, typecheck, and Vitest pass without modifying the repository.

- [ ] **Step 3: Record task evidence without closing the task**

Replace the temporary `AUTH-VIEW-01` Evidence with a reproducible record containing:

- owner, branch, start commit, and current target commit
- `AUTH-01`~`AUTH-05` and `AUTH-P1-1`~`AUTH-P1-3`, `AUTH-E1`
- characterization baseline and whether any production RED occurred
- focused test and quick command counts/results
- both agent-browser session names, routes, viewports, actions, expected/actual
- sign-in request method/count, console/page errors, screenshots
- failure class, correction, and rerun verdict

Keep `Status: IN_PROGRESS` until Task 5 passes.

- [ ] **Step 4: Commit the verification evidence**

Run:

```bash
git add TODO.md
git commit -m "docs(auth): 로그인 화면 검증 근거 기록"
```

Expected: one commit containing only the owned TODO block.

### Task 5: Perform plan-completion review and close the task

**Files:**
- Modify: `TODO.md`
- Read: `docs/superpowers/specs/2026-09-01-auth-entry-scenario-loop-design.md`
- Read: `docs/superpowers/plans/2026-09-01-auth-view-scenario-loop.md`

**Interfaces:**
- Consumes: exact implementation target commit and all Task 1-4 evidence.
- Produces: seven-field adversarial review evidence and `AUTH-VIEW-01` at `AI_VERIFIED` only if no HIGH/MEDIUM finding remains.

- [ ] **Step 1: Freeze the review target**

Run:

```bash
git rev-parse HEAD
git status --short
git diff HEAD~3..HEAD --stat
```

Expected: clean worktree and a target SHA covering claim, tests, and evidence.

- [ ] **Step 2: Run a fresh read-only plan-completion review**

The reviewer did not author the target. Review spec/plan coverage, invalid and pending states, test strength, accessibility, browser action/console/network evidence, unrelated diff, and TODO dependency/status consistency.

Record exactly:

```text
Review target: plan path, AUTH-01~AUTH-05 / AUTH-VIEW-01, exact target SHA
Reviewer: fresh reviewer identity and relationship to author
Checks: checks actually performed
Findings: none or severity/class/root cause
Corrections: not applicable or applied changes
Rerun: exact commands and results
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

- [ ] **Step 3: Correct review findings**

For each HIGH/MEDIUM finding, reproduce it at the lowest sufficient level, retain a focused RED for behavior changes, apply the smallest correction, and rerun the focused test, browser case when applicable, and `./scripts/verify quick`.

Expected: no unresolved HIGH/MEDIUM finding.

- [ ] **Step 4: Add the review record and close only `AUTH-VIEW-01`**

Append the final seven-field review record to the owned Evidence, change its checkbox to `[x]`, and set:

```markdown
- Status: AI_VERIFIED
```

Do not change `AUTH-ERROR-VIEW-01` or `JOURNEY-AUTH-01`.

- [ ] **Step 5: Verify the final task state**

Run:

```bash
./scripts/verify setup
./scripts/verify quick
git diff --check
git status --short
```

Expected: all gates pass and only the final TODO review/status update is uncommitted.

- [ ] **Step 6: Commit the reviewed task completion**

Run:

```bash
git add TODO.md
git commit -m "docs(auth): 로그인 화면 작업 검증 완료"
```

Expected: a clean worktree with `AUTH-VIEW-01` at `AI_VERIFIED`; `AUTH-ERROR-VIEW-01` is now the next dependency-resolved task.
