# Agentic Development and Verification Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tool-neutral, risk-based AI development and verification operating model without scaffolding or implementing the frontend assignment.

**Architecture:** A short root `AGENTS.md` controls execution and delegates detail to three documents under `docs/quality/`. One standard-library Python command provides read-only `setup`, `quick`, and `full` verification modes. Existing Codex session collection becomes a redacted pending-candidate adapter; a separate explicit command publishes only human-reviewed records.

**Tech Stack:** Markdown, POSIX executable entry points backed by Python 3.9 standard library, `unittest`, Codex project hooks

## Global Constraints

- Do not scaffold React or TypeScript, install packages, or implement assignment features.
- Keep exactly three quality documents: `requirements.md`, `workflow.md`, and `verification.md`.
- AI performs low-risk work continuously; people own core-journey acceptance, high-risk decisions, exceptions, and final acceptance.
- All `scripts/verify` modes are read-only and must detect tracked or untracked file mutations during their run.
- Formatting checks never invoke formatting mutation; `npm run format` remains separate.
- E2E tests are organized by user journey, limited to one representative success and one critical failure per journey in the core suite, and added only when a lower test level cannot prove the same risk.
- Prompt content is structurally filtered and redacted before any project-file write.
- Pending prompt candidates are ignored by Git and require explicit human review before tracked publication.
- Existing tracked prompt records remain labeled `legacy/pre-policy` until separately reviewed.
- Never mark `HUMAN_APPROVED` or final acceptance automatically.

## File Map

- `AGENTS.md`: short mandatory control plane and links.
- `docs/quality/requirements.md`: requirement IDs, acceptance matrix, golden journeys, invariants, and checkpoint status.
- `docs/quality/workflow.md`: work loop, risk/delegation rules, failure handling, adversarial reviews, and final QA.
- `docs/quality/verification.md`: command contract, test-level selection, core E2E limits, and browser evidence format.
- `scripts/verify`: stable read-only setup/quick/full command.
- `tests/test_verify.py`: setup verifier and mutation-guard CLI tests.
- `.codex/hooks/export_session.py`: write redacted candidates to ignored pending storage.
- `.codex/hooks.json`: describe candidate preparation accurately.
- `scripts/publish-ai-record`: explicit reviewed-record publisher.
- `tests/test_publish_ai_record.py`: review gate, secret scan, atomic publication, and `AI_USAGE.md` linking tests.
- `tests/test_export_session.py`: pending-destination and wiring assertions.
- `.gitignore`: pending record storage.
- `AI_USAGE.md`: reviewed-record policy, legacy label, and managed reviewed-record list.

---

### Task 1: Requirement Traceability and Golden Journeys

**Files:**
- Create: `docs/quality/requirements.md`

**Interfaces:**
- Consumes: `assignment-original/requirement.md`, `assignment-original/openapi.yaml`
- Produces: stable requirement IDs and four journey checkpoint IDs consumed by `workflow.md`, `verification.md`, and future tests

- [ ] **Step 1: Write the complete requirement contract**

Create `docs/quality/requirements.md` with this content:

```markdown
# Requirements and Golden Journeys

## Source Priority

Use `assignment-original/openapi.yaml` as the API authority and
`assignment-original/requirement.md` for UI and delivery requirements. Record a
`REQUIREMENT` failure and request a human decision when the sources conflict in
a way that changes accepted behavior.

## Status and Evidence Rules

Allowed statuses: `NOT_STARTED`, `IN_PROGRESS`, `AI_VERIFIED`,
`HUMAN_APPROVED`, `BLOCKED`.

AI may set every status except `HUMAN_APPROVED`. Evidence must name a command,
browser record, or review finding. Text claiming a result without reproducible
evidence does not satisfy a checklist row.

## Requirement Checklist

| ID | Requirement | Source | Acceptance condition | Risk | Preferred test level | Automated evidence | Browser evidence | Checkpoint | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SYS-01 | React and TypeScript | requirement: 설명 | Application uses React 18 or 19 and TypeScript. | HIGH until stack approved | setup/build | — | — | final | NOT_STARTED |
| SYS-02 | Color tokens | requirement: 설명 | Application UI colors resolve through named tokens rather than feature-local literals. | LOW | static/component | — | — | final | NOT_STARTED |
| SYS-03 | Pretendard | requirement: 설명 | Pretendard is loaded and used as application font. | LOW | component/browser | — | — | work-overview | NOT_STARTED |
| SYS-04 | API substitute | requirement: 전문 | Submitted code contains a documented mock or equivalent API implementation conforming to OAS 3.1. | HIGH until approach approved | integration/contract | — | — | final | NOT_STARTED |
| SYS-05 | AI disclosure | requirement: 설명 | `AI_USAGE.md` identifies tool/model, scope, prompt summary, and human verification without secrets. | MEDIUM | setup/manual | — | — | final | IN_PROGRESS |
| NAV-01 | Primary routes | requirement: GNB/LNB | Dashboard and task actions are always visible, use distinct icons, and navigate to `/` and `/task`. | LOW | integration/browser | — | — | work-overview | NOT_STARTED |
| NAV-02 | Anonymous action | requirement: GNB/LNB | Signed-out state shows sign-in action with distinct icon and navigates to `/sign-in`. | LOW | component/integration | — | — | auth-entry | NOT_STARTED |
| NAV-03 | Authenticated action | requirement: GNB/LNB | Signed-in state shows profile action with distinct icon and navigates to `/user`. | MEDIUM | integration/browser | — | — | work-overview | NOT_STARTED |
| DASH-01 | Dashboard metrics | requirement: 대시보드; OAS `DashboardResponse` | `/` shows `numOfTask`, `numOfRestTask`, and `numOfDoneTask` from `GET /api/dashboard`. | MEDIUM | integration/browser | — | — | work-overview | NOT_STARTED |
| AUTH-01 | Accessible fields | requirement: 로그인 | Email and password inputs have visible, programmatically associated labels. | LOW | component | — | — | auth-entry | NOT_STARTED |
| AUTH-02 | Email validation | requirement: 로그인; OAS `SignInRequest` | Email is required and follows email syntax; invalid value shows a visible inline error associated with the input. | LOW | unit/component | — | — | auth-entry | NOT_STARTED |
| AUTH-03 | Password validation | requirement: 로그인; OAS `SignInRequest` | Password is required, ASCII alphanumeric only, and 8–24 characters; invalid value shows a visible inline error associated with the input. | LOW | unit/component | — | — | auth-entry | NOT_STARTED |
| AUTH-04 | Submit state | requirement: 로그인 | Submit is enabled only when email and password both satisfy validation. | LOW | component | — | — | auth-entry | NOT_STARTED |
| AUTH-05 | Sign-in request | requirement: 로그인; OAS `/api/sign-in` | Valid submit sends email/password JSON to `POST /api/sign-in`. | MEDIUM | integration | — | — | auth-entry | NOT_STARTED |
| AUTH-06 | Sign-in failure | requirement: 로그인; OAS `ErrorResponse` | Any non-200 sign-in response displays returned `errorMessage` in a modal. | MEDIUM | integration/browser | — | — | auth-entry | NOT_STARTED |
| AUTH-07 | Authentication state | OAS auth schemas | Successful sign-in establishes approved access-token state and protected requests use it; refresh behavior follows approved design. | HIGH | integration/browser | — | — | auth-entry | NOT_STARTED |
| TASK-LIST-01 | Page request | requirement: 목록; OAS `/api/task` | `/task` requests `GET /api/task?page=1` and renders returned data. | MEDIUM | integration | — | — | task-discovery | NOT_STARTED |
| TASK-LIST-02 | Card content | requirement: 목록 | Each rendered task card shows title and memo. | LOW | component | — | — | task-discovery | NOT_STARTED |
| TASK-LIST-03 | Virtual rendering | requirement: 목록 | Growing list renders only visible or near-visible items rather than every fetched item. | MEDIUM | integration/browser | — | — | task-discovery | NOT_STARTED |
| TASK-LIST-04 | Infinite pagination | requirement: 목록; OAS `TaskListResponse` | Reaching list end requests each next page once while `hasNext` is true and stops when false. | MEDIUM | integration/browser | — | — | task-discovery | NOT_STARTED |
| TASK-LIST-05 | Detail navigation | requirement: 목록 | Selecting a task navigates to `/task/:id` for that task. | LOW | integration/browser | — | — | task-discovery | NOT_STARTED |
| TASK-DETAIL-01 | Detail success | requirement: 상세; OAS `TaskDetailResponse` | Detail view shows title, memo, and `registerDatetime` returned by `GET /api/task/:id`. | MEDIUM | integration | — | — | task-resolution | NOT_STARTED |
| TASK-DETAIL-02 | Detail missing | requirement: 상세; OAS 404 | A 404 shows a resource-missing state with a usable return-to-list action. | MEDIUM | integration/browser | — | — | task-resolution | NOT_STARTED |
| TASK-DETAIL-03 | Delete confirmation | requirement: 상세 | Delete opens a modal containing an ID confirmation input. | LOW | component | — | — | task-resolution | NOT_STARTED |
| TASK-DETAIL-04 | Delete guard | requirement: 상세 | Delete submit stays disabled until input exactly equals route ID. | LOW | unit/component | — | — | task-resolution | NOT_STARTED |
| TASK-DETAIL-05 | Delete success | requirement: 상세; OAS `DELETE /api/task/{id}` | Confirmed submit calls delete API and successful response redirects to `/task`. | MEDIUM | integration/browser | — | — | task-resolution | NOT_STARTED |
| USER-01 | Profile data | requirement: 회원정보; OAS `UserResponse` | Authenticated profile view shows name and memo from `GET /api/user`. | MEDIUM | integration/browser | — | — | work-overview | NOT_STARTED |

## Golden Journeys

### auth-entry

Requirements: `NAV-02`, `AUTH-01` through `AUTH-07`.

- Preconditions: signed out; sign-in API can return deterministic success and
  error responses.
- Actions: open `/sign-in`; submit invalid fields; submit valid fields against
  error response; dismiss error; submit valid fields against success response;
  inspect authenticated navigation.
- Expected: labels remain usable, invalid values cannot submit, server
  `errorMessage` appears in modal, success establishes authenticated state, and
  navigation switches from sign-in to profile.

### work-overview

Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`.

- Preconditions: signed in; dashboard and profile APIs return known fixtures.
- Actions: navigate between dashboard, task route, and profile; compare fixture
  data with visible values.
- Expected: route actions and distinct icons remain available, metrics match
  API values, and profile name/memo match API values.

### task-discovery

Requirements: `TASK-LIST-01` through `TASK-LIST-05`.

- Preconditions: signed in; at least two task pages with `hasNext` transition
  from true to false.
- Actions: open `/task`; inspect cards; scroll through viewport; trigger next
  page; continue to terminal page; select a task.
- Expected: correct cards render, DOM stays bounded by virtualization, each
  page is requested once, loading stops at `hasNext: false`, and selection
  navigates to matching detail.

### task-resolution

Requirements: `TASK-DETAIL-01` through `TASK-DETAIL-05`.

- Preconditions: signed in; one existing ID and one missing ID; delete API
  succeeds for existing ID.
- Actions: open existing detail; open missing detail and return; reopen existing
  detail; open delete modal; enter wrong then exact ID; submit.
- Expected: detail fields match API, 404 recovery returns to list, delete submit
  is guarded by exact ID, delete request targets route ID, and success returns
  to `/task`.

## Invariants

- Dashboard and task navigation remain present across routes.
- Authentication state exposes exactly one of sign-in and profile actions.
- UI colors flow through named tokens; Pretendard remains application font.
- Input labels remain associated with controls.
- Invalid sign-in input cannot submit; API errors surface `errorMessage`.
- Protected requests use approved authentication state.
- Virtualized task DOM remains bounded as fetched data grows.
- One task page has at most one in-flight request; `hasNext: false` stops paging.
- Detail 404 always provides list recovery.
- Delete cannot submit without exact ID and success always returns to task list.
- Loading, empty, error, and success states are distinguishable.
- AI evidence never marks `HUMAN_APPROVED`.
- Verification commands never modify repository files.
```

- [ ] **Step 2: Check source coverage and formatting**

Run:

```bash
rg -n '^\| (SYS|NAV|DASH|AUTH|TASK-LIST|TASK-DETAIL|USER)-' docs/quality/requirements.md
rg -n '^### (auth-entry|work-overview|task-discovery|task-resolution)$' docs/quality/requirements.md
git diff --check -- docs/quality/requirements.md
```

Expected: 27 checklist rows, four journey headings, and no whitespace errors.

- [ ] **Step 3: Commit the requirement contract**

```bash
git add docs/quality/requirements.md
git commit -m "docs: 과제 요구사항과 사용자 여정 매핑"
```

---

### Task 2: Risk-Based Workflow Control Plane

**Files:**
- Create: `docs/quality/workflow.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: requirement IDs and checkpoints from Task 1
- Produces: mandatory agent sequence, `LOW`/`MEDIUM`/`HIGH` authority rules, failure categories, and human gates used by every future task

- [ ] **Step 1: Write the workflow document**

Create `docs/quality/workflow.md` with this content:

~~~~markdown
# AI Development Workflow

## Operating Loop

1. Select requirement IDs and acceptance conditions from `requirements.md`.
2. Classify risk and choose one independently testable unit.
3. Implement the smallest change and its appropriate automated test.
4. Run `./scripts/verify quick`.
5. Run applicable browser checks and record evidence.
6. Classify failures, correct root cause, and rerun the failed gate.
7. Record evidence and continue low-risk work.
8. At a completed golden journey, run lightweight adversarial review and ask
   for one human checkpoint acceptance.
9. After all journeys, run full adversarial review, `./scripts/verify full`,
   and final QA.
10. Ask a person for final acceptance. AI never declares human acceptance.

One work unit covers one requirement ID or one independently testable condition
inside an ID. Do not split work by file when files form one testable behavior.

## Risk and Authority

### LOW — AI proceeds continuously

Examples: approved-pattern implementation, focused tests, local unambiguous
fixes, active-task documentation, and necessary non-semantic cleanup.

AI may implement, test, diagnose, fix, review, commit, and continue. Record
requirement IDs, commands, browser evidence when applicable, and decisions.

### MEDIUM — human owns journey checkpoint

Examples: completing a golden journey, introducing a new interaction pattern,
or spanning routes, API state, and views within approved architecture.

AI completes and verifies a coherent batch, runs lightweight adversarial
review, then requests one checkpoint acceptance. Do not request approval for
each requirement inside the batch.

### HIGH — human decides before consequential change

Examples: conflicting requirements, authentication or security policy,
destructive-data semantics, dependency or architecture changes, scope
expansion, acceptance changes, and bypassing a failed gate.

Stop before the consequential implementation. Present evidence, options,
trade-offs, and recommendation. While waiting, continue only evidence work,
diagnosis, or unrelated LOW work that cannot cross the affected boundary.

AI proposes risk and owns execution evidence. People own journey acceptance,
HIGH decisions, exceptions, and final acceptance.

## Failure Classification

Assign one primary class and record evidence, rationale, corrective change, and
rerun result:

- `REQUIREMENT`: ambiguous, conflicting, missing, or misunderstood condition.
- `IMPLEMENTATION`: logic, state, or rendering defect.
- `INTEGRATION`: API, auth, routing, browser, or cross-module defect.
- `UX_ACCESSIBILITY`: usability, interaction, visual, or accessibility defect.
- `TEST`: incorrect, duplicate, flaky, or overly broad test.
- `ENVIRONMENT`: runtime, OS, browser, port, or local service problem.
- `TOOLING`: build, lint, typecheck, verify, hook, or runner problem.

`REQUIREMENT` and behavior-changing corrections are HIGH. Never turn a failure
green by weakening an assertion, adding an undocumented skip, or editing only
checklist status.

## Browser Failure Record

```text
Requirement/Journey:
Commit:
Route/Viewport:
Precondition:
Actions:
Expected:
Actual:
Console/Network:
Screenshot/Trace:
Failure class:
Correction:
Rerun verdict:
```

Browser-tool failure is not product success. Classify it as `ENVIRONMENT` or
`TOOLING`, restore trustworthy evidence, then rerun.

## Adversarial Review

After each of `auth-entry`, `work-overview`, `task-discovery`, and
`task-resolution`, use a fresh reviewer context or explicit second-pass role
that did not author the final change. Check requirement omissions, negative
paths, invariants, accessibility, weak or duplicate tests, console/network
errors, and missing evidence. Resolve findings before requesting checkpoint
acceptance.

After all checkpoints, perform a full review across journeys: auth transitions,
navigation, stale state, API errors, regression risk, OAS/mock consistency,
test duplication, and assignment-wide constraints.

## Human Checkpoints

Request human action only for:

- A completed golden journey after evidence and lightweight review.
- A HIGH-risk decision before consequential implementation.
- An exception to a required gate.
- Final QA readiness and final completion.

While a checkpoint is pending, evidence preparation and unrelated LOW analysis
may continue. Do not implement beyond the unapproved journey boundary.

## Prompt Records

Tool stop hooks may create redacted candidates only. Candidates are not
submission evidence. A person reviews content and sensitive information, then
runs the explicit publication command. AI must not invoke that command or mark
review complete on a person's behalf. See `verification.md` and `AI_USAGE.md`.

## Final QA Checklist

- [ ] Every requirement row has reproducible evidence and correct status.
- [ ] All four journey checkpoints are human-approved.
- [ ] Full adversarial review findings are resolved.
- [ ] `./scripts/verify full` passes on the intended submission commit.
- [ ] Core browser evidence exists for all four journeys.
- [ ] Auth, navigation, stale state, errors, and regressions were cross-checked.
- [ ] Console and network errors were reviewed.
- [ ] Accessibility and responsive layouts were spot-checked at recorded viewports.
- [ ] API mock behavior matches `openapi.yaml`.
- [ ] AI records were human-reviewed before publication.
- [ ] Git diff contains no secrets, debug output, generated noise, or unrelated work.
- [ ] A person, not AI, marks final acceptance.
~~~~

- [ ] **Step 2: Write the root control plane**

Preserve the existing commit-message section in `AGENTS.md`, then append the
control-plane sections so the complete file has this content:

~~~~markdown
# 프로젝트 작업 규약

## 커밋 메시지

- 모든 커밋 메시지는 Conventional Commits 형식을 따른다.
- 형식은 `<type>(<scope>): <한글 설명>`이며, `scope`는 필요할 때만 사용한다.
- `type`과 `scope`는 영문 소문자로 작성하고, 제목·본문·꼬리말의 설명은 한글로 작성한다. 코드 식별자와 고유명사는 예외로 한다.
- 주요 `type`은 `feat`, `fix`, `docs`, `refactor`, `test`, `chore`를 사용한다.
- 호환성을 깨는 변경은 `!` 또는 `BREAKING CHANGE:` 꼬리말로 표시한다.

예시: `docs: 과제 원본 명세 추가`

## Scope

Follow the assignment sources in `assignment-original/`. The OpenAPI contract
is authoritative for API details. Do not change accepted behavior, architecture,
dependencies, authentication policy, or destructive-data semantics without a
HIGH-risk human decision.

## Required Reading

- `docs/quality/requirements.md`
- `docs/quality/workflow.md`
- `docs/quality/verification.md`
- `AI_USAGE.md`

## Required Loop

Select requirement IDs → implement one testable unit → run read-only automatic
verification → verify applicable browser behavior → classify and fix failures →
record evidence → run lightweight adversarial review at each golden journey →
request one human checkpoint → run full review and final QA.

LOW work proceeds continuously. People own golden-journey acceptance, HIGH-risk
decisions, exceptions, and final completion. AI never marks `HUMAN_APPROVED`.

## Commands

```bash
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
```

Verification is read-only. `npm run format` is a separate mutation command;
review its diff and rerun `./scripts/verify quick` afterward.

## Evidence and AI Records

Use journey-based browser evidence defined in `workflow.md`. Keep core E2E
small and prefer unit, component, or integration tests when they prove the risk
better. Stop hooks create ignored redacted candidates only. A person must review
and explicitly publish any tracked AI record.
~~~~

- [ ] **Step 3: Verify control-plane consistency**

Run:

```bash
rg -n 'LOW|MEDIUM|HIGH|HUMAN_APPROVED|Adversarial Review|Final QA' AGENTS.md docs/quality/workflow.md
rg -n 'requirements.md|workflow.md|verification.md|AI_USAGE.md' AGENTS.md
git diff --check -- AGENTS.md docs/quality/workflow.md
```

Expected: all risk labels, human boundary, review/QA sections, and required links are present; no whitespace errors.

- [ ] **Step 4: Commit the workflow control plane**

```bash
git add AGENTS.md docs/quality/workflow.md
git commit -m "docs: 위험 기반 AI 작업 흐름 정의"
```

---

### Task 3: Read-Only Unified Verification Command

**Files:**
- Create: `docs/quality/verification.md`
- Create: `scripts/verify`
- Create: `tests/test_verify.py`
- Modify: `.gitignore:1-5`

**Interfaces:**
- Consumes: quality documents from Tasks 1–2 and current `tests/test_export_session.py`
- Produces: `./scripts/verify [setup|quick|full]`; default mode is `full`

- [ ] **Step 1: Write failing CLI tests**

Create `tests/test_verify.py`:

```python
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / "scripts" / "verify"


class VerifyCliTests(unittest.TestCase):
    def run_verify(self, *args):
        return subprocess.run(
            [str(VERIFY), *args],
            cwd=str(ROOT),
            text=True,
            capture_output=True,
            check=False,
        )

    def test_setup_validates_workflow_and_hook(self):
        result = self.run_verify("setup")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS setup", result.stdout)
        self.assertIn("PASS hook-tests", result.stdout)

    def test_quick_skips_frontend_before_scaffolding(self):
        result = self.run_verify("quick")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("SKIP frontend not scaffolded", result.stdout)

    def test_default_is_full(self):
        result = self.run_verify()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS setup", result.stdout)
        self.assertIn("SKIP frontend not scaffolded", result.stdout)

    def test_unknown_mode_fails(self):
        result = self.run_verify("unknown")
        self.assertEqual(result.returncode, 2)
        self.assertIn("usage:", result.stderr)

    def test_verify_is_read_only(self):
        before = subprocess.check_output(
            ["git", "status", "--porcelain=v1", "-z"], cwd=str(ROOT)
        )
        result = self.run_verify("setup")
        after = subprocess.check_output(
            ["git", "status", "--porcelain=v1", "-z"], cwd=str(ROOT)
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Confirm red state**

Run:

```bash
python3 -m unittest tests/test_verify.py -v
```

Expected: error because `scripts/verify` does not exist.

- [ ] **Step 3: Implement the verifier**

Append the pending-candidate directory to `.gitignore` before implementing the
setup check:

```gitignore
.codex/review-pending/
```

Create executable `scripts/verify` with this content:

```python
#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODES = {"setup", "quick", "full"}
REQUIRED_FILES = (
    "AGENTS.md",
    "docs/quality/requirements.md",
    "docs/quality/workflow.md",
    "docs/quality/verification.md",
    ".codex/hooks.json",
    ".codex/hooks/export_session.py",
    "AI_USAGE.md",
)
REQUIRED_MARKERS = {
    "AGENTS.md": (
        "LOW work proceeds continuously",
        "AI never marks `HUMAN_APPROVED`",
        "./scripts/verify setup",
    ),
    "docs/quality/requirements.md": (
        "### auth-entry",
        "### work-overview",
        "### task-discovery",
        "### task-resolution",
        "AI may set every status except `HUMAN_APPROVED`",
    ),
    "docs/quality/workflow.md": (
        "### LOW — AI proceeds continuously",
        "### MEDIUM — human owns journey checkpoint",
        "### HIGH — human decides before consequential change",
        "## Adversarial Review",
        "## Final QA Checklist",
    ),
    "docs/quality/verification.md": (
        "Every verification mode is read-only",
        "## Formatting Mutation Is Separate",
        "one representative success path and one critical failure path",
        "@core",
    ),
    "AI_USAGE.md": (
        "## 사용한 도구와 모델",
        "## 적용한 작업 범위",
        "## 핵심 프롬프트 요약",
        "## 사람이 최종 검증한 내용",
        "## 전체 프롬프트와 작업 기록",
    ),
}
REQUIRED_PACKAGE_SCRIPTS = (
    "format:check",
    "lint",
    "typecheck",
    "test",
    "build",
    "test:e2e:core",
)


def status_snapshot():
    return subprocess.check_output(
        ["git", "status", "--porcelain=v1", "-z"], cwd=str(ROOT)
    )


def fail(stage, detail, reproduce):
    print("FAIL {}: {}".format(stage, detail), file=sys.stderr)
    print("REPRODUCE: {}".format(reproduce), file=sys.stderr)
    print(
        "CLASSIFY: REQUIREMENT | IMPLEMENTATION | INTEGRATION | "
        "UX_ACCESSIBILITY | TEST | ENVIRONMENT | TOOLING",
        file=sys.stderr,
    )
    return 1


def run_stage(name, command):
    print("RUN {}: {}".format(name, " ".join(command)))
    try:
        result = subprocess.run(command, cwd=str(ROOT), check=False)
    except OSError:
        return fail(name, "command could not start", " ".join(command))
    if result.returncode:
        return fail(name, "command exited {}".format(result.returncode), " ".join(command))
    print("PASS {}".format(name))
    return 0


def verify_setup():
    for relative in REQUIRED_FILES:
        path = ROOT / relative
        if not path.is_file():
            return fail("setup", "missing {}".format(relative), "./scripts/verify setup")
    for relative, markers in REQUIRED_MARKERS.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        for marker in markers:
            if marker not in text:
                return fail(
                    "setup",
                    "{} missing marker {!r}".format(relative, marker),
                    "./scripts/verify setup",
                )
    ignored = subprocess.run(
        ["git", "check-ignore", "-q", ".codex/review-pending/probe.md"],
        cwd=str(ROOT),
        check=False,
    )
    if ignored.returncode:
        return fail(
            "setup",
            ".codex/review-pending/ is not ignored",
            "git check-ignore .codex/review-pending/probe.md",
        )
    hooks = json.loads((ROOT / ".codex/hooks.json").read_text(encoding="utf-8"))
    command = hooks["hooks"]["Stop"][0]["hooks"][0]["command"]
    if ".codex/hooks/export_session.py" not in command:
        return fail("setup", "Stop hook exporter missing", "./scripts/verify setup")
    print("PASS setup")
    return run_stage(
        "hook-tests",
        [sys.executable, "-m", "unittest", "tests/test_export_session.py", "-v"],
    )


def package_scripts():
    package_path = ROOT / "package.json"
    if not package_path.is_file():
        return None
    package = json.loads(package_path.read_text(encoding="utf-8"))
    scripts = package.get("scripts")
    return scripts if isinstance(scripts, dict) else {}


def require_frontend_scripts(scripts):
    missing = [name for name in REQUIRED_PACKAGE_SCRIPTS if name not in scripts]
    if missing:
        return fail(
            "frontend-scripts",
            "missing package scripts: {}".format(", ".join(missing)),
            "./scripts/verify full",
        )
    return 0


def verify_frontend(mode):
    try:
        scripts = package_scripts()
    except (OSError, json.JSONDecodeError):
        return fail(
            "frontend-scripts",
            "package.json is unreadable or invalid",
            "python3 -m json.tool package.json",
        )
    if scripts is None:
        print("SKIP frontend not scaffolded")
        return 0
    required = require_frontend_scripts(scripts)
    if required:
        return required
    quick = ("format:check", "lint", "typecheck", "test")
    for name in quick:
        result = run_stage(name, ["npm", "run", name])
        if result:
            return result
    if mode == "full":
        for name in ("build", "test:e2e:core"):
            result = run_stage(name, ["npm", "run", name])
            if result:
                return result
    return 0


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) > 1 or (args and args[0] not in MODES):
        print("usage: ./scripts/verify [setup|quick|full]", file=sys.stderr)
        return 2
    mode = args[0] if args else "full"
    before = status_snapshot()
    result = verify_setup()
    if not result and mode != "setup":
        result = verify_frontend(mode)
    after = status_snapshot()
    if after != before:
        return fail(
            "read-only",
            "repository changed during verification",
            "git status --short",
        )
    return result


if __name__ == "__main__":
    sys.exit(main())
```

Then make it executable:

```bash
chmod +x scripts/verify
```

- [ ] **Step 4: Write the verification policy**

Create `docs/quality/verification.md` with this content:

~~~~markdown
# Verification Policy

## Canonical Commands

```bash
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
./scripts/verify
```

No argument means `full`. Every verification mode is read-only and compares
Git status before and after execution. A mutation makes verification fail.

## Modes

- `setup`: required files, document markers and links, risk/approval rules,
  journey categories, review/final-QA sections, pending-record ignore rule,
  Stop hook wiring, AI disclosure headings, and exporter unit tests.
- `quick`: `setup`, then `format:check`, `lint`, `typecheck`, and `test` after
  frontend scaffolding.
- `full`: `setup`, `quick`, `build`, and `test:e2e:core` after frontend
  scaffolding.

Before `package.json` exists, frontend stages print
`SKIP frontend not scaffolded`. This certifies workflow setup only. After
`package.json` exists, all six required scripts must exist; absence is failure.

Verification stops on first failure, exits nonzero, prints a reproduction
command, and lists failure classes from `workflow.md`.

## Formatting Mutation Is Separate

`format:check` reports differences and never edits files. Formatting mutation
is separate:

```bash
npm run format
```

Review the resulting diff and run `./scripts/verify quick`. No verify command
may call `npm run format` or another write-mode formatter.

## Test-Level Selection

- Unit: pure validation, transforms, and isolated state.
- Component: labels, disabled states, modal interaction, conditional UI, and
  focused accessibility.
- Integration: API response to view state, router transitions, and feature
  state with controlled external boundaries.
- E2E: real browser behavior crossing authentication, routing, network,
  scrolling, virtualization, or deletion/navigation boundaries.

Choose the lowest level that proves risk reliably. Do not duplicate lower-level
coverage in E2E.

## Core E2E Journeys

Organize by `auth-entry`, `work-overview`, `task-discovery`, and
`task-resolution`, not by page. Keep at most one representative success path
and one critical failure path per journey. Every E2E names its unique
cross-boundary risk. `test:e2e:core` runs only `@core`; extended, diagnostic,
or browser-compatibility suites use separate explicit commands.

Review slow, flaky, redundant cases for removal or demotion to integration or
component tests.

## Browser Evidence

Record scenario and requirement IDs, commit, route, viewport, preconditions,
actions, expected and actual results, console/network errors, screenshot or
trace, verdict, failure class, correction, and rerun result.

Browser automation failure is `ENVIRONMENT` or `TOOLING`, never product pass.

## Prompt Candidate Verification

Setup verification confirms ignored pending storage, Stop hook wiring, exporter
tests, and reviewed-publication language. The hook creates only structurally
filtered and redacted pending candidates. A person reviews content and sensitive
information before running `scripts/publish-ai-record`. Published records alone
may be linked from `AI_USAGE.md`.
~~~~

- [ ] **Step 5: Run verifier tests and commands**

Run:

```bash
python3 -m unittest tests/test_verify.py -v
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
git diff --check
```

Expected: five verifier tests pass; setup and hook tests pass; quick/full print `SKIP frontend not scaffolded`; no files change during verification.

- [ ] **Step 6: Commit unified verification**

```bash
git add .gitignore docs/quality/verification.md scripts/verify tests/test_verify.py
git commit -m "test: 읽기 전용 통합 검증 명령 추가"
```

---

### Task 4: Review-Before-Publish Prompt Records

**Files:**
- Modify: `.codex/hooks/export_session.py:314-350`
- Modify: `.codex/hooks.json:2-11`
- Modify: `tests/test_export_session.py:108-225`
- Create: `scripts/publish-ai-record`
- Create: `tests/test_publish_ai_record.py`
- Modify: `AI_USAGE.md:14-34`

**Interfaces:**
- Produces from hook: `.codex/review-pending/codex-session-<safe-id>.md`
- Consumes for publication: `scripts/publish-ai-record SESSION_ID --reviewed-by NAME --confirm-sensitive-review --confirm-content-review`
- Produces after human command: `artifacts/codex-session-<safe-id>.md` plus a managed `AI_USAGE.md` link

- [ ] **Step 1: Write failing exporter destination tests**

Replace `HookCliTests.test_success_is_idempotent` with:

```python
def test_success_is_idempotent(self):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        first_result = self.run_cli(root, json.dumps(self.payload(root)))
        candidate = (
            root
            / ".codex"
            / "review-pending"
            / "codex-session-session-123.md"
        )
        first = candidate.read_text(encoding="utf-8")
        second_result = self.run_cli(root, json.dumps(self.payload(root)))
        second = candidate.read_text(encoding="utf-8")
        artifacts_exist = (root / "artifacts").exists()
    self.assertEqual(first_result.returncode, 0)
    self.assertEqual(json.loads(first_result.stdout), {"continue": True})
    self.assertEqual(json.loads(second_result.stdout), {"continue": True})
    self.assertEqual(first, second)
    self.assertEqual(first.count("## Turn 1"), 1)
    self.assertFalse(artifacts_exist)
```

Replace `test_missing_transcript_preserves_previous_artifact` with:

```python
def test_missing_transcript_preserves_previous_candidate(self):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        candidate_path = (
            root / ".codex" / "review-pending" / "codex-session-session-123.md"
        )
        candidate_path.parent.mkdir(parents=True)
        candidate_path.write_text("existing\n", encoding="utf-8")
        payload = self.payload(root)
        payload["transcript_path"] = str(root / "secret-name.jsonl")
        result = self.run_cli(root, json.dumps(payload))
        candidate = candidate_path.read_text(encoding="utf-8")
        log = (root / ".codex" / "hooks" / "export-session.log").read_text(
            encoding="utf-8"
        )
    self.assertEqual(json.loads(result.stdout), {"continue": True})
    self.assertEqual(candidate, "existing\n")
    self.assertIn("missing_transcript", log)
    self.assertNotIn("secret-name.jsonl", log)
```

Add this project wiring assertion:

```python
def test_pending_records_are_ignored(self):
    result = subprocess.run(
        ["git", "check-ignore", "-q", ".codex/review-pending/probe.md"],
        cwd=str(ROOT),
        check=False,
    )
    self.assertEqual(result.returncode, 0)
```

In `ProjectWiringTests.test_stop_hook`, add:

```python
self.assertEqual(
    config["description"],
    "Prepare redacted Codex session candidates for human review.",
)
self.assertEqual(
    handler["statusMessage"],
    "Preparing redacted Codex session candidate",
)
```

In `ProjectWiringTests.test_ai_usage_required_sections`, replace the artifact
directory-link assertion with:

```python
self.assertIn("<!-- reviewed-records:start -->", document)
self.assertIn("<!-- reviewed-records:end -->", document)
self.assertIn("legacy/pre-policy", document)
```

- [ ] **Step 2: Confirm exporter red state**

Run:

```bash
python3 -m unittest tests/test_export_session.py -v
```

Expected: destination tests fail because hook still writes to `artifacts/`; the
ignore-rule test already passes from Task 3.

- [ ] **Step 3: Move hook output to ignored pending storage**

In `.codex/hooks/export_session.py`, replace destination construction and write
with:

```python
        rendered = render_markdown(session)
        if redact(rendered, Path("/__no_home_match__")) != rendered:
            log_event(repo_root, "sensitive_candidate", session_id)
            return
        destination = (
            repo_root
            / ".codex"
            / "review-pending"
            / "codex-session-{}.md".format(session_id)
        )
        atomic_write(destination, rendered)
```

Update `.codex/hooks.json` fields to:

```json
{
  "description": "Prepare redacted Codex session candidates for human review.",
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/export_session.py\"",
            "timeout": 30,
            "statusMessage": "Preparing redacted Codex session candidate"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Write failing publication tests**

Create `tests/test_publish_ai_record.py`:

```python
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "scripts" / "publish-ai-record"


class PublishAiRecordTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        pending = self.root / ".codex" / "review-pending"
        pending.mkdir(parents=True)
        self.candidate = pending / "codex-session-session-123.md"
        self.candidate.write_text(
            "# Codex Session `session-123`\n\n- Model: `test-model`\n",
            encoding="utf-8",
        )
        (self.root / "AI_USAGE.md").write_text(
            "# AI 사용 내역\n\n"
            "## 전체 프롬프트와 작업 기록\n\n"
            "<!-- reviewed-records:start -->\n"
            "<!-- reviewed-records:end -->\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.temporary.cleanup()

    def run_publish(self, *extra):
        return subprocess.run(
            [
                str(PUBLISH),
                "session-123",
                "--repo-root",
                str(self.root),
                "--reviewed-by",
                "Human Reviewer",
                *extra,
            ],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_both_human_confirmations_are_required(self):
        result = self.run_publish("--confirm-sensitive-review")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "artifacts").exists())

    def test_unredacted_secret_blocks_publication(self):
        self.candidate.write_text(
            "# Candidate\nAuthorization: Bearer exposed-secret\n",
            encoding="utf-8",
        )
        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sensitive pattern", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())

    def test_reviewed_candidate_is_published_and_linked(self):
        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )
        artifact = self.root / "artifacts" / "codex-session-session-123.md"
        usage = (self.root / "AI_USAGE.md").read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Review status: `human-reviewed`", artifact.read_text())
        self.assertIn("Reviewed by: `Human Reviewer`", artifact.read_text())
        self.assertIn("./artifacts/codex-session-session-123.md", usage)

    def test_republication_does_not_duplicate_link(self):
        flags = ("--confirm-sensitive-review", "--confirm-content-review")
        self.assertEqual(self.run_publish(*flags).returncode, 0)
        self.assertEqual(self.run_publish(*flags).returncode, 0)
        usage = (self.root / "AI_USAGE.md").read_text(encoding="utf-8")
        self.assertEqual(usage.count("./artifacts/codex-session-session-123.md"), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 5: Confirm publisher red state**

Run:

```bash
python3 -m unittest tests/test_publish_ai_record.py -v
```

Expected: error because `scripts/publish-ai-record` does not exist.

- [ ] **Step 6: Implement explicit publisher**

Create executable `scripts/publish-ai-record`:

```python
#!/usr/bin/env python3
import argparse
import datetime
import importlib.util
import os
import sys
import tempfile
from pathlib import Path


DEFAULT_ROOT = Path(__file__).resolve().parents[1]


def load_exporter(source_root):
    path = source_root / ".codex" / "hooks" / "export_session.py"
    spec = importlib.util.spec_from_file_location("record_exporter", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=str(path.parent),
            prefix=".reviewed-record-",
            suffix=".tmp",
            delete=False,
        ) as stream:
            temporary_name = stream.name
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name:
            try:
                Path(temporary_name).unlink()
            except OSError:
                pass


def reviewed_content(candidate, reviewer):
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    safe_reviewer = " ".join(reviewer.replace("`", "'").split())
    lines = candidate.splitlines()
    metadata = [
        "",
        "- Review status: `human-reviewed`",
        "- Reviewed by: `{}`".format(safe_reviewer),
        "- Reviewed at: `{}`".format(stamp),
    ]
    return "\n".join(lines[:1] + metadata + lines[1:]).rstrip() + "\n"


def update_usage(document, session_id):
    start = "<!-- reviewed-records:start -->"
    end = "<!-- reviewed-records:end -->"
    if start not in document or end not in document:
        raise ValueError("AI_USAGE.md reviewed-record markers missing")
    link = (
        "- [검토 완료 세션 `{0}`]"
        "(./artifacts/codex-session-{0}.md)".format(session_id)
    )
    if link in document:
        return document
    position = document.index(end)
    return document[:position] + link + "\n" + document[position:]


def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("session_id")
    parser.add_argument("--repo-root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--reviewed-by", required=True)
    parser.add_argument("--confirm-sensitive-review", action="store_true")
    parser.add_argument("--confirm-content-review", action="store_true")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    if not args.confirm_sensitive_review or not args.confirm_content_review:
        print("both human review confirmations are required", file=sys.stderr)
        return 2
    if not args.reviewed_by.strip():
        print("reviewer name is required", file=sys.stderr)
        return 2
    root = args.repo_root.resolve()
    exporter = load_exporter(DEFAULT_ROOT)
    session_id = exporter.safe_session_id(args.session_id)
    if session_id != args.session_id:
        print("unsafe session id", file=sys.stderr)
        return 2
    candidate_path = (
        root / ".codex" / "review-pending" / "codex-session-{}.md".format(session_id)
    )
    if not candidate_path.is_file():
        print("pending candidate not found", file=sys.stderr)
        return 1
    candidate = candidate_path.read_text(encoding="utf-8")
    if exporter.redact(candidate, Path("/__no_home_match__")) != candidate:
        print("candidate still contains a sensitive pattern", file=sys.stderr)
        return 1
    usage_path = root / "AI_USAGE.md"
    usage = usage_path.read_text(encoding="utf-8")
    updated_usage = update_usage(usage, session_id)
    destination = root / "artifacts" / "codex-session-{}.md".format(session_id)
    previous_artifact = (
        destination.read_text(encoding="utf-8") if destination.is_file() else None
    )
    try:
        atomic_write(destination, reviewed_content(candidate, args.reviewed_by))
        atomic_write(usage_path, updated_usage)
    except OSError:
        if previous_artifact is None:
            try:
                destination.unlink()
            except OSError:
                pass
        else:
            atomic_write(destination, previous_artifact)
        raise
    print("published reviewed record: {}".format(destination.relative_to(root)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Then make it executable:

```bash
chmod +x scripts/publish-ai-record
```

- [ ] **Step 7: Update AI usage policy and legacy label**

Replace the last section of `AI_USAGE.md` with:

~~~~markdown
## 전체 프롬프트와 작업 기록

Stop 훅은 구조적으로 내부 지침과 reasoning을 제외하고, 메모리에서
민감정보를 마스킹한 뒤 Git 비추적 pending 후보만 생성합니다. 사람이
후보의 내용과 민감정보를 모두 검토한 후 다음 명령으로 게시합니다.

```bash
./scripts/publish-ai-record <session-id> \
  --reviewed-by "<reviewer>" \
  --confirm-sensitive-review \
  --confirm-content-review
```

자동 마스킹은 사람 검토를 대체하지 않습니다. `artifacts/`에는 검토 후
게시된 기록만 추가합니다.

### 검토 완료 기록

<!-- reviewed-records:start -->
<!-- reviewed-records:end -->

### 기존 정책 기록

- [기록 자동화 설계·구현 세션](./artifacts/codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md) — `legacy/pre-policy`, 사람 검토 대기
~~~~

Also change the core prompt summary bullet to:

```markdown
- 비밀정보 자동 마스킹, 비추적 후보 생성, 사람 검토 후 명시적 게시
```

- [ ] **Step 8: Run prompt pipeline tests**

Run:

```bash
python3 -m unittest tests/test_export_session.py tests/test_publish_ai_record.py -v
git check-ignore .codex/review-pending/probe.md
```

Expected: all exporter and publisher tests pass; `git check-ignore` prints `.codex/review-pending/probe.md`.

- [ ] **Step 9: Commit reviewed publication pipeline**

```bash
git add .codex/hooks/export_session.py .codex/hooks.json \
  scripts/publish-ai-record tests/test_export_session.py \
  tests/test_publish_ai_record.py AI_USAGE.md
git commit -m "feat: AI 기록 게시에 사람 검토 게이트 추가"
```

---

### Task 5: Integrated Setup Verification and Handoff

**Files:**
- Modify: `tests/test_verify.py`
- Modify: `scripts/verify`

**Interfaces:**
- Consumes: all setup artifacts from Tasks 1–4
- Produces: one verified setup baseline ready for frontend implementation in a later session

- [ ] **Step 1: Extend setup verification coverage test**

Add to `VerifyCliTests`:

```python
def test_setup_covers_review_before_publish_contract(self):
    result = self.run_verify("setup")
    combined = result.stdout + result.stderr
    self.assertEqual(result.returncode, 0, combined)
    self.assertIn("PASS setup", combined)
    self.assertIn("PASS hook-tests", combined)
    self.assertNotIn("FAIL", combined)
```

Update `scripts/verify` so `REQUIRED_FILES` also contains
`"scripts/publish-ai-record"`:

```python
REQUIRED_FILES = (
    "AGENTS.md",
    "docs/quality/requirements.md",
    "docs/quality/workflow.md",
    "docs/quality/verification.md",
    ".codex/hooks.json",
    ".codex/hooks/export_session.py",
    "scripts/publish-ai-record",
    "AI_USAGE.md",
)
```

Replace `REQUIRED_MARKERS["AI_USAGE.md"]` with:

```python
"AI_USAGE.md": (
    "## 사용한 도구와 모델",
    "## 적용한 작업 범위",
    "## 핵심 프롬프트 요약",
    "## 사람이 최종 검증한 내용",
    "## 전체 프롬프트와 작업 기록",
    "<!-- reviewed-records:start -->",
    "<!-- reviewed-records:end -->",
    "legacy/pre-policy",
),
```

Also update `verify_setup()` so the hook-test stage includes both pipeline
suites:

```python
return run_stage(
    "hook-tests",
    [
        sys.executable,
        "-m",
        "unittest",
        "tests/test_export_session.py",
        "tests/test_publish_ai_record.py",
        "-v",
    ],
)
```

- [ ] **Step 2: Run complete automated verification**

Run:

```bash
python3 -m unittest discover -s tests -v
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
git diff --check
```

Expected:

- All Python tests pass.
- `setup` reports `PASS setup` and `PASS hook-tests`.
- `quick` and `full` report `SKIP frontend not scaffolded` and exit 0.
- No verification command changes Git status.
- `git diff --check` reports nothing.

- [ ] **Step 3: Run setup-level adversarial review**

Review the diff against the approved design and record findings in the commit or
handoff notes. Check exact points:

```text
- AGENTS.md is short and links exactly three quality documents.
- LOW work does not require per-request approval.
- MEDIUM journey checkpoints and HIGH pre-change decisions remain human-owned.
- Failure classes match across spec, workflow, and verifier output.
- setup/quick/full are read-only; formatting mutation is separate.
- frontend absence cannot be mistaken for assignment completion.
- E2E is journey-based, @core-bounded, and lower-level-first.
- Stop hook writes only redacted ignored candidates.
- Publisher requires both human confirmations and blocks detected secrets.
- Legacy artifact is not represented as reviewed.
- No frontend scaffold, dependencies, or assignment features were added.
```

Expected: no unresolved requirement, privacy, or gate-semantics finding. Fix any
finding in its owning file and rerun Step 2.

- [ ] **Step 4: Commit final integration adjustment**

```bash
git add scripts/verify tests/test_verify.py
git commit -m "test: AI 작업 흐름 통합 검증"
```

- [ ] **Step 5: Prepare human handoff**

Provide:

```text
- Commits created and files changed.
- `./scripts/verify setup`, `quick`, and `full` results.
- Explicit note that frontend stages were skipped because no app exists.
- Untracked pending candidate paths, without publishing them.
- Any untracked pre-policy record under `artifacts/`, without moving, deleting,
  linking, or publishing it.
- Legacy record review still required.
- Human decision requested: accept workflow setup or request changes.
```

Do not invoke `scripts/publish-ai-record` on the user's behalf. Do not start
frontend implementation in this session.

## 2026-09-01 Agent Loop Readiness Execution Addendum

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development or superpowers:executing-plans and
> execute each checkbox in order.

**Goal:** Make Journey lookup and the existing local/CI verification contract
deterministic without changing product code, UX, dependencies, or CI provider
configuration.

**Architecture:** Keep policy and lookup guidance in `AGENTS.md` and
`docs/quality/verification.md`. Enforce package manager, Playwright verdict,
fixture/test selection, command execution, and exit status through the existing
Playwright config, verifier, and contract tests.

**Tech Stack:** Markdown, Python 3 standard library and `unittest`, pnpm
10.15.1, Playwright 1.62.1, Vitest

### Global Constraints

- Installed and declared `@playwright/test` version is `1.62.1`; do not update dependencies.
- Because `1.62.1 >= 1.61.0`, use `retries: 1` and `failOnFlakyTests: true` in every environment.
- If Playwright is later pinned below `1.61.0`, set `retries: 0` and omit unsupported flaky gating instead of upgrading it implicitly.
- Local and CI use `./scripts/verify full` as the same final verdict.
- Documents provide entry points and policy; no verifier or contract test may depend on their exact prose.
- Do not add GitHub Actions, a document index, a generic project-loop skill, product code, UX, or a dependency.
- Preserve `reuseExistingServer: false` and existing retained failure artifacts.

### Readiness File Map

- `playwright.config.ts`: one retry and flaky verdict for local and CI.
- `src/test/harness-config.test.ts`: installed-version and environment-independent Playwright contract.
- `scripts/verify`: required executable files, pnpm stages, read-only and nonzero failure propagation.
- `tests/test_verify_contract.py`: package manager, fixture, core file/selection, and repository contract.
- `tests/test_verify.py`: verifier command and exit-status behavior.
- `AGENTS.md`: shortest pre-change Journey lookup and post-change verification entry point.
- `docs/quality/verification.md`: Journey-to-code/test map and shared local/CI bootstrap.
- `TODO.md`: owner, reproducible evidence, and final readiness status.

---

### Task 1: Playwright Retry and Flaky Verdict Contract

**Files:**
- Modify: `src/test/harness-config.test.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: exact `@playwright/test` version from `package.json` and `node_modules/@playwright/test/package.json`
- Produces: `playwrightConfig.retries === 1` and `playwrightConfig.failOnFlakyTests === true` with or without `CI`

- [ ] **Step 1: Add failing installed-version and local/CI verdict tests**

Add `vi` to the Vitest import, load the declared and installed package records,
and add these tests to `src/test/harness-config.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const packageDocument = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { devDependencies: Record<string, string> };
const installedPlaywright = JSON.parse(
  readFileSync(
    new URL("../../node_modules/@playwright/test/package.json", import.meta.url),
    "utf8",
  ),
) as { version: string };

it("uses the exact installed Playwright version declared by the project", () => {
  expect(installedPlaywright.version).toBe(packageDocument.devDependencies["@playwright/test"]);
  const [major, minor] = installedPlaywright.version.split(".").map(Number);
  expect(major > 1 || (major === 1 && minor >= 61)).toBe(true);
});

it("fails flaky tests after one diagnostic retry locally and in CI", async () => {
  const originalCi = process.env.CI;
  try {
    delete process.env.CI;
    vi.resetModules();
    const local = (await import("../../playwright.config")).default;
    process.env.CI = "1";
    vi.resetModules();
    const ci = (await import("../../playwright.config")).default;

    const verdict = (config: typeof local) => ({
      retries: config.retries,
      failOnFlakyTests: config.failOnFlakyTests,
    });
    expect(verdict(local)).toEqual({ retries: 1, failOnFlakyTests: true });
    expect(verdict(ci)).toEqual(verdict(local));
  } finally {
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
    vi.resetModules();
  }
});
```

- [ ] **Step 2: Run the focused test and confirm the old config fails**

Run:

```bash
pnpm exec vitest run src/test/harness-config.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the existing local config has `retries: 0`, the CI
config has `retries: 2`, and `failOnFlakyTests` is absent.

- [ ] **Step 3: Apply the minimum supported Playwright config**

Replace the environment-dependent retry line in `playwright.config.ts` and add
the supported flaky gate:

```ts
  retries: 1,
  failOnFlakyTests: true,
```

Keep `reuseExistingServer: false`, `trace: "retain-on-failure"`,
`screenshot: "only-on-failure"`, and `video: "retain-on-failure"` unchanged.

- [ ] **Step 4: Run focused tests and commit**

Run:

```bash
pnpm exec vitest run src/test/harness-config.test.ts --pool=forks --maxWorkers=1
git diff --check
```

Expected: the harness file passes all tests and `git diff --check` prints nothing.

Commit:

```bash
git add playwright.config.ts src/test/harness-config.test.ts
git commit -m "test(e2e): flaky 판정 계약 고정"
```

---

### Task 2: Executable Verifier Contract

**Files:**
- Modify: `tests/test_verify_contract.py`
- Modify: `tests/test_verify.py`
- Modify: `scripts/verify`

**Interfaces:**
- Consumes: `packageManager: pnpm@10.15.1`, four core spec paths, `e2e/authenticated-fixture.ts`, and package scripts
- Produces: setup checks based on files and executable behavior; every frontend stage uses `pnpm run`; any child failure makes verification nonzero

- [ ] **Step 1: Replace prose-marker assertions with failing executable assertions**

Delete `tests/test_verify.py` methods that inspect `REQUIRED_MARKERS` or exact
documentation wording:

```text
test_setup_rejects_missing_reviewed_and_legacy_markers
test_setup_requires_digest_and_auth_evidence_contracts
test_setup_requires_integrated_journey_contract_markers
test_setup_requires_plan_completion_review_contract
test_fsd_creation_constraints_are_recorded
```

Delete `test_repository_worktree_default_is_recorded` from
`tests/test_verify_contract.py`. Existing TODO parsing, hook transaction tests,
architecture contract tests, and review tooling tests retain the executable
behavior previously described by those documents.

Add these repository contract tests to `tests/test_verify_contract.py`:

```python
    def test_repository_uses_pinned_pnpm_and_required_core_files(self):
        verifier = load_verify_module()
        package = verifier.package_document()

        self.assertEqual(package["packageManager"], "pnpm@10.15.1")
        for relative in (
            "pnpm-lock.yaml",
            "e2e/authenticated-fixture.ts",
            "e2e/auth-entry.spec.ts",
            "e2e/work-overview.spec.ts",
            "e2e/task-discovery.spec.ts",
            "e2e/task-resolution.spec.ts",
            "src/mocks/fixtures/auth.ts",
            "src/mocks/fixtures/tasks.ts",
        ):
            with self.subTest(relative=relative):
                self.assertIn(relative, verifier.REQUIRED_FILES)
                self.assertTrue((ROOT / relative).is_file())

    def test_protected_core_journeys_use_authenticated_fixture(self):
        for relative in (
            "e2e/work-overview.spec.ts",
            "e2e/task-discovery.spec.ts",
            "e2e/task-resolution.spec.ts",
        ):
            source = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(relative=relative):
                self.assertIn('from "./authenticated-fixture"', source)
                self.assertIn("prepareAuthenticatedPage(page)", source)
```

Extend `test_playwright_lists_all_core_journeys` so the `--list` result also
must contain every real core spec path:

```python
        for relative in (
            "auth-entry.spec.ts",
            "work-overview.spec.ts",
            "task-discovery.spec.ts",
            "task-resolution.spec.ts",
        ):
            with self.subTest(relative=relative):
                self.assertIn(relative, combined)
```

Add command and failure tests to `tests/test_verify.py`:

```python
    def test_frontend_stages_use_pnpm(self):
        verifier = load_verify_module()
        package = {
            "packageManager": "pnpm@10.15.1",
            "scripts": {name: name for name in verifier.REQUIRED_PACKAGE_SCRIPTS},
            "kbhc": {"frontendScaffolded": True},
        }
        with mock.patch.object(verifier, "package_document", return_value=package):
            with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                result = verifier.verify_frontend("full")

        self.assertEqual(result, 0)
        self.assertEqual(
            run_stage.call_args_list,
            [
                mock.call(name, ["pnpm", "run", name])
                for name in ("format:check", "lint", "typecheck", "test", "build", "test:e2e:core")
            ],
        )

    def test_frontend_stops_and_returns_nonzero_on_child_failure(self):
        verifier = load_verify_module()
        package = {
            "packageManager": "pnpm@10.15.1",
            "scripts": {name: name for name in verifier.REQUIRED_PACKAGE_SCRIPTS},
            "kbhc": {"frontendScaffolded": True},
        }
        with mock.patch.object(verifier, "package_document", return_value=package):
            with mock.patch.object(verifier, "run_stage", side_effect=[0, 1]) as run_stage:
                result = verifier.verify_frontend("quick")

        self.assertNotEqual(result, 0)
        self.assertEqual(run_stage.call_count, 2)
```

- [ ] **Step 2: Run the focused contracts and confirm they fail**

Run:

```bash
python3 -m unittest tests.test_verify_contract tests.test_verify -v
```

Expected: FAIL because `REQUIRED_FILES` lacks core files,
`package_document()` does not enforce pnpm, and frontend stages still invoke
`npm run`.

- [ ] **Step 3: Make verifier setup structural and executable**

Remove the complete `REQUIRED_MARKERS` mapping and its nested marker loop from
`verify_setup()`. Keep canonical document paths in `REQUIRED_FILES`, and add:

```python
    "pnpm-lock.yaml",
    "e2e/authenticated-fixture.ts",
    "e2e/auth-entry.spec.ts",
    "e2e/work-overview.spec.ts",
    "e2e/task-discovery.spec.ts",
    "e2e/task-resolution.spec.ts",
    "src/mocks/fixtures/auth.ts",
    "src/mocks/fixtures/tasks.ts",
```

After validating the `package.json` object shape in `package_document()`, add:

```python
    if package.get("packageManager") != "pnpm@10.15.1":
        raise ValueError("package.json packageManager must be pnpm@10.15.1")
```

Change both frontend command sites in `verify_frontend()` to:

```python
        result = run_stage(name, ["pnpm", "run", name])
```

Do not change `run_stage()`; it already converts an `OSError` or nonzero child
status into a standard nonzero verifier result with reproduction details.

Keep core E2E mandatory even when `KBHC_VERIFY_SELF_TESTING=1`. Avoid port 4173
races by testing default-mode selection with mocks instead of starting a nested
subprocess full gate from `tests/test_verify.py`.

- [ ] **Step 4: Run focused contracts and commit**

Run:

```bash
python3 -m unittest tests.test_verify_contract tests.test_verify -v
./scripts/verify setup
git diff --check
```

Expected: all verifier tests pass, setup reports `PASS`, and the diff check is empty.

Commit:

```bash
git add scripts/verify tests/test_verify.py tests/test_verify_contract.py
git commit -m "test(verify): 실행 가능한 검증 계약 강화"
```

---

### Task 3: Journey Entry Points and Shared Final Gate

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/quality/verification.md`

**Interfaces:**
- Consumes: canonical Journey definitions in `docs/quality/requirements.md`, current routes/code areas, and four core spec paths
- Produces: one pre-change lookup path and one local/CI bootstrap ending in `./scripts/verify full`

- [ ] **Step 1: Add the shortest pre/post-change loop to `AGENTS.md`**

Add this paragraph after the opening Required Loop paragraph:

```markdown
Before changing code, locate the applicable Journey by searching requirement ID,
route, API path, or symbol across `docs/quality/requirements.md`, `TODO.md`, `src`,
and `e2e`. After the lowest sufficient focused test, run `./scripts/verify quick`
and the mapped Journey E2E before `./scripts/verify full`.
```

Change the separate formatting mutation command from `npm run format` to
`pnpm run format`.

- [ ] **Step 2: Update verifier policy and add the compact Journey map**

In `docs/quality/verification.md`, describe `setup` as required-file and
executable-contract validation instead of document-marker validation. Change
the formatting command to `pnpm run format`.

Add this section before `## Core E2E Journeys`:

```markdown
## Journey Lookup Before a Change

Search a requirement ID, route, API path, or symbol in
`docs/quality/requirements.md`, `TODO.md`, `src`, and `e2e`, then use this map.

| Journey | Requirements and routes | Primary implementation areas | Focused E2E |
| --- | --- | --- | --- |
| `auth-entry` | `NAV-02`, `AUTH-01..07`; `/sign-in`, protected routes | `src/app/auth`, `src/features/sign-in`, `src/shared/api/auth*` | `e2e/auth-entry.spec.ts` |
| `work-overview` | `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`; `/`, `/user` | `src/widgets/app-shell`, `src/pages/dashboard`, `src/pages/user`, `src/widgets/dashboard-summary`, `src/widgets/user-profile` | `e2e/work-overview.spec.ts` |
| `task-discovery` | `TASK-LIST-01..05`; `/task`, `GET /api/task` | `src/pages/task-list`, `src/widgets/task-list`, `src/entities/task`, `src/shared/api/tasks.ts` | `e2e/task-discovery.spec.ts` |
| `task-resolution` | `TASK-DETAIL-01..05`; `/task/:id`, `GET/DELETE /api/task/:id` | `src/pages/task-detail`, `src/features/delete-task`, `src/shared/api/tasks.ts` | `e2e/task-resolution.spec.ts` |

The table is a lookup aid, not a replacement for requirement IDs or focused
unit, component, and integration tests.
```

Add the shared bootstrap and final verdict:

````markdown
## Local and CI Bootstrap

Use a Node version allowed by `package.json#engines` and pnpm `10.15.1` in both
environments, then run:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
./scripts/verify full
```

`./scripts/verify full` is the final verdict in both environments. Playwright
keeps one retry only for diagnostics and `failOnFlakyTests: true` makes a flaky
result fail the gate.
````

- [ ] **Step 3: Check entry points, run quick verification, and commit**

Run:

```bash
for candidate in docs/quality/requirements.md TODO.md src e2e e2e/auth-entry.spec.ts e2e/work-overview.spec.ts e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts; do test -e "$candidate"; done
./scripts/verify quick
git diff --check
```

Expected: every mapped path exists, quick passes, and the diff check is empty.

Commit:

```bash
git add AGENTS.md docs/quality/verification.md
git commit -m "docs(workflow): Journey 검증 진입점 보강"
```

---

### Task 4: Determinism Evidence and Completion Review

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Tasks 1-3 commits and existing fresh-server/resettable-fixture behavior
- Produces: reproducible LOOP-READINESS-01 evidence without setting a human-owned Journey status

- [ ] **Step 1: Repeat the core suite in the isolated worktree**

Run:

```bash
pnpm run test:e2e:core
pnpm run test:e2e:core
```

Expected on both runs: all selected core tests pass, no retry is classified as
flaky, protected Journey request-count assertions pass, and Playwright exits 0.

- [ ] **Step 2: Prove the same final command locally and with CI set**

Run:

```bash
./scripts/verify full
CI=1 ./scripts/verify full
git diff --check
```

Expected: both full runs pass the same stages and exit 0; neither changes the
repository fingerprint; the diff check is empty.

- [ ] **Step 3: Run the mandatory plan-completion adversarial review**

After Tasks 1-3 and all verification above, ask a fresh reviewer to inspect the
approved readiness addendum, this execution addendum, and the exact current
HEAD. Record these seven fields in `LOOP-READINESS-01` evidence:

```text
Review target: readiness design addendum, execution addendum, requirement/Journey IDs, exact commit
Reviewer: fresh reviewer identity
Checks: scope, version gate, local/CI parity, executable contracts, fixture/core selection, exit status, evidence
Findings: concrete findings or none
Corrections: applied corrections or not applicable
Rerun: exact commands and results
Verdict: PASS or FAIL
```

Expected: no unresolved HIGH or MEDIUM finding. Fix any LOW implementation
finding in its owning file and rerun the focused check plus both full commands.

- [ ] **Step 4: Update only the owned TODO block and verify it**

Set `LOOP-READINESS-01` to checked and `AI_VERIFIED`. Record exact commit IDs,
test counts, both core runs, local and CI-set full results, read-only result,
review fields, and the explicit facts that GitHub Actions, product code, UX,
dependencies, and human-owned Journey statuses were not changed.

Run:

```bash
./scripts/verify setup
git diff --check
```

Expected: setup passes with the completed TODO state and the diff check is empty.

Commit:

```bash
git add TODO.md
git commit -m "docs(todo): 작업 루프 검증 근거 기록"
```
