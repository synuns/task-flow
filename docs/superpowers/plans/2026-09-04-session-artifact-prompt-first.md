# Session Artifact Prompt-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every user prompt visible while collapsing each Turn's tool activity and assistant response, including all 23 existing published artifacts.

**Architecture:** Change only the existing standard-library Markdown renderer, then apply an insertion-only mechanical migration to the tracked artifacts. The parser, redaction, lifecycle, publisher, index, review metadata, and artifact text remain unchanged.

**Tech Stack:** Python 3 standard library, `unittest`, GitHub-flavored Markdown `<details>`, existing pnpm verification scripts.

## Global Constraints

- Work in an ignored `.worktrees/session-artifact-prompt-first` worktree created with `superpowers:using-git-worktrees` before implementation.
- Keep session metadata, review metadata, warning text, and every `### User prompt` outside `<details>`.
- Put `### Tool activity` and `### Assistant response` in one `<details>` with summary `작업 내용 보기` per Turn.
- Do not emit an empty `<details>` when a Turn has neither tools nor responses.
- Do not change parser, redaction, lifecycle, publication, index behavior, dependencies, or reviewed artifact prose.
- Existing artifact migration must be insertion-only; no tracked line may be deleted or replaced.
- AI must not select, confirm, publish, or claim human review of an artifact.
- Do not complete the implementation TODO until a person reviews the migrated diff and rendered fold behavior.

## File Structure

- Modify: `.codex/hooks/export_session.py` — render work sections inside native Markdown details.
- Modify: `tests/test_export_session.py` — prove prompt visibility, work folding, empty-work behavior, and deterministic rendering.
- Modify: `TODO.md` — create and own the implementation block, then record verification and review evidence.
- Modify: the 23 tracked paths returned by `git ls-files 'artifacts/codex-session-*.md'` — add presentation wrappers only. `artifacts/index.md` is not modified.
- Create no production module, migration script, prompt-only artifact, or dependency.

---

### Task 1: Render prompt-first session candidates

**Files:**
- Modify: `TODO.md`
- Modify: `.codex/hooks/export_session.py:238-291`
- Test: `tests/test_export_session.py:179-216`

**Interfaces:**
- Consumes: `SessionData.turns`, `TurnData.prompts`, `TurnData.tools`, and `TurnData.responses`.
- Produces: unchanged `render_markdown(session: SessionData, home: Optional[Path] = None) -> str` with prompt-first Markdown.

- [ ] **Step 1: Start the implementation task**

Add `TOOL-AI-PROMPT-FOLD-01` to `TODO.md` with requirement `SYS-05`, dependency
`TOOL-AI-PROMPT-FOLD-DESIGN-01`, status `IN_PROGRESS`, the current session as
owner, and the accepted spec and this plan as deliverables.

- [ ] **Step 2: Write the failing renderer tests**

Extend `test_render_is_ordered_and_deterministic` and add the empty-work case:

```python
def test_render_is_ordered_and_deterministic(self):
    session = export_session.parse_rollout(
        FIXTURE,
        "session-123",
        "fallback-model",
        lambda event, line: None,
    )
    first = export_session.render_markdown(session)
    second = export_session.render_markdown(session)

    self.assertEqual(first, second)
    self.assertEqual(first.count("<details>"), 2)
    self.assertEqual(first.count("<summary>작업 내용 보기</summary>"), 2)
    self.assertEqual(first.count("</details>"), 2)
    self.assertLess(first.index("Create structure"), first.index("<details>"))
    first_work = first.split("<details>", 1)[1].split("</details>", 1)[0]
    self.assertNotIn("Create structure", first_work)
    self.assertIn("### Tool activity", first_work)
    self.assertIn("### Assistant response", first_work)
    self.assertTrue(first.endswith("\n"))

def test_render_omits_empty_work_details(self):
    session = export_session.SessionData(
        "session-123",
        "model",
        "started",
        "cwd",
        [export_session.TurnData("turn-1", prompts=["Prompt only"])],
    )

    rendered = export_session.render_markdown(session)

    self.assertIn("### User prompt\n\nPrompt only", rendered)
    self.assertNotIn("<details>", rendered)
```

- [ ] **Step 3: Run the focused RED test**

Run:

```bash
python3 -m unittest \
  tests.test_export_session.RedactionAndRenderTests.test_render_is_ordered_and_deterministic \
  tests.test_export_session.RedactionAndRenderTests.test_render_omits_empty_work_details -v
```

Expected: the deterministic test fails because `<details>` count is `0`; the
empty-work test passes and protects the no-op case.

- [ ] **Step 4: Implement the minimal renderer change**

In `render_markdown`, keep prompt rendering on `lines` and collect only work
sections on `work_lines`:

```python
for index, turn in enumerate(session.turns, 1):
    lines.extend(["## Turn {}".format(index), ""])
    if turn.prompts:
        lines.extend(
            [
                "### User prompt",
                "",
                redact("\n\n".join(turn.prompts), home),
                "",
            ]
        )

    work_lines = []
    if turn.tools:
        work_lines.extend(["### Tool activity", ""])
        for tool in turn.tools:
            work_lines.extend(
                [
                    "#### `{}`".format(redact(tool.name, home)),
                    "",
                    "- Call ID: `{}`".format(redact(tool.call_id, home)),
                    "- Status: `{}`".format(redact(tool.status or "unknown", home)),
                    "",
                    "**Input**",
                    "",
                    fenced(redact(tool.input_text, home)),
                    "",
                    "**Output**",
                    "",
                    fenced(redact(tool.output_text, home)),
                    "",
                ]
            )
    if turn.responses:
        work_lines.extend(
            [
                "### Assistant response",
                "",
                redact("\n\n".join(turn.responses), home),
                "",
            ]
        )
    if work_lines:
        lines.extend(
            [
                "<details>",
                "<summary>작업 내용 보기</summary>",
                "",
                *work_lines,
                "</details>",
                "",
            ]
        )
```

Do not add a helper or configuration for the fixed summary text.

- [ ] **Step 5: Run focused and hook regression tests**

Run:

```bash
python3 -m unittest tests.test_export_session -v
python3 -m unittest \
  tests.test_review_scanner \
  tests.test_review_publisher \
  tests.test_render_artifact_index -v
```

Expected: all tests pass; scanner still finds tool headings inside raw Markdown,
publisher bytes remain deterministic, and index content is unchanged.

- [ ] **Step 6: Run quick verification and commit**

Run `pnpm verify quick` and `git diff --check`.

Expected: both pass read-only.

Commit:

```bash
git add TODO.md .codex/hooks/export_session.py tests/test_export_session.py
git commit -m "feat(ai): 세션 작업 기록을 기본 접힘으로 렌더링"
```

---

### Task 2: Apply the fold to existing published artifacts

**Files:**
- Modify: all 23 exact tracked files selected by `git ls-files 'artifacts/codex-session-*.md'`
- Do not modify: `artifacts/index.md`

**Interfaces:**
- Consumes: the existing generated `## Turn N`, `### Tool activity`, and `### Assistant response` structure.
- Produces: insertion-only `<details>` wrappers matching Task 1 output.

- [ ] **Step 1: Confirm the migration target**

Run:

```bash
git ls-files 'artifacts/codex-session-*.md' | tee /tmp/taskflow-prompt-fold-artifacts.txt
wc -l /tmp/taskflow-prompt-fold-artifacts.txt
git status --short
```

Expected: exactly `23` paths and a clean worktree.

- [ ] **Step 2: Perform one validated bulk mechanical rewrite**

Run this one-off standard-library bulk rewrite from the repository root. It
validates every file before writing any file and preserves the original line
bytes while inserting only the five wrapper lines per Turn with work:

```bash
python3 - <<'PY'
from pathlib import Path
import re
import subprocess

paths = [Path(value) for value in subprocess.check_output(
    ["git", "ls-files", "artifacts/codex-session-*.md"],
    text=True,
).splitlines()]
if len(paths) != 23:
    raise SystemExit("expected_23_artifacts")

turn_pattern = re.compile(r"## Turn ([1-9][0-9]*)")
fence_pattern = re.compile(r"(`{3,})[^`]*")
work_sequences = {
    ("### Tool activity",),
    ("### Assistant response",),
    ("### Tool activity", "### Assistant response"),
}

def visible_lines(lines):
    visible = []
    fence = None
    for index, raw in enumerate(lines):
        text = raw.removesuffix("\n")
        if fence is not None:
            if re.fullmatch(re.escape(fence) + r"\s*", text):
                fence = None
            continue
        match = fence_pattern.fullmatch(text)
        if match:
            fence = match.group(1)
            continue
        visible.append((index, text))
    if fence is not None:
        raise ValueError("unclosed_fence")
    return visible

prepared = {}
for path in paths:
    raw = path.read_bytes()
    text = raw.decode("utf-8")
    if "\r\n" in text or not text.endswith("\n"):
        raise ValueError("unsupported_newline:{}".format(path))
    lines = text.splitlines(keepends=True)
    visible = visible_lines(lines)
    if any(value in {"<details>", "</details>"} for _, value in visible):
        raise ValueError("existing_details:{}".format(path))

    turns = [
        (index, int(match.group(1)))
        for index, value in visible
        if (match := turn_pattern.fullmatch(value))
    ]
    if [number for _, number in turns] != list(range(1, len(turns) + 1)):
        raise ValueError("nonsequential_turns:{}".format(path))

    insertions = []
    for position, (start, _) in enumerate(turns):
        end = turns[position + 1][0] if position + 1 < len(turns) else len(lines)
        headings = [
            (index, value)
            for index, value in visible
            if start < index < end
            and value in {"### Tool activity", "### Assistant response"}
        ]
        sequence = tuple(value for _, value in headings)
        if not sequence:
            continue
        if sequence not in work_sequences:
            raise ValueError("ambiguous_work:{}:{}".format(path, position + 1))
        prompts = [
            index
            for index, value in visible
            if start < index < headings[0][0] and value == "### User prompt"
        ]
        if not prompts:
            raise ValueError("prompt_not_visible:{}:{}".format(path, position + 1))
        insertions.extend(
            [
                (headings[0][0], [
                    "<details>\n",
                    "<summary>작업 내용 보기</summary>\n",
                    "\n",
                ]),
                (end, ["</details>\n", "\n"]),
            ]
        )

    for index, addition in sorted(insertions, key=lambda value: value[0], reverse=True):
        lines[index:index] = addition
    prepared[path] = "".join(lines)

for path, migrated in prepared.items():
    path.write_text(migrated, encoding="utf-8", newline="")
PY
```

Expected: exit `0`; all 23 files change. This is the approved bulk mechanical
rewrite exception—do not keep the migration script in the repository.

- [ ] **Step 3: Prove the migration is insertion-only and structurally complete**

Run this exact insertion-only check:

```bash
python3 - <<'PY'
import subprocess

paths = subprocess.check_output(
    ["git", "ls-files", "artifacts/codex-session-*.md"],
    text=True,
).splitlines()
changed = subprocess.check_output(
    ["git", "diff", "--name-only", "--", *paths],
    text=True,
).splitlines()
if changed != paths:
    raise SystemExit("artifact_path_mismatch")

for row in subprocess.check_output(
    ["git", "diff", "--numstat", "--", *paths],
    text=True,
).splitlines():
    added, deleted, path = row.split("\t")
    if int(added) == 0 or deleted != "0":
        raise SystemExit("non_insertion_change:{}".format(path))

allowed = {
    "+",
    "+<details>",
    "+<summary>작업 내용 보기</summary>",
    "+</details>",
}
diff = subprocess.check_output(
    ["git", "diff", "--unified=0", "--", *paths],
    text=True,
)
for line in diff.splitlines():
    if line.startswith("---") or line.startswith("+++"):
        continue
    if line.startswith("-"):
        raise SystemExit("deleted_line")
    if line.startswith("+") and line not in allowed:
        raise SystemExit("unexpected_addition:{}".format(line))

if subprocess.run(
    ["git", "diff", "--quiet", "--", "artifacts/index.md"],
    check=False,
).returncode != 0:
    raise SystemExit("artifact_index_changed")
print("PASS 23 artifacts, insertion-only wrappers")
PY
```

Use `git diff --numstat -- artifacts/codex-session-*.md` and
`git diff --unified=1 -- artifacts/codex-session-*.md` as the reviewable evidence.
Expected: 23 changed files, zero deletions, and only wrapper additions.

- [ ] **Step 4: Re-run artifact safety gates**

Run:

```bash
python3 -m unittest \
  tests.test_export_session \
  tests.test_review_scanner \
  tests.test_review_publisher \
  tests.test_render_artifact_index -v
pnpm verify quick
git diff --check
```

Expected: all pass. Browser Journey E2E is not applicable because application
behavior is unchanged.

- [ ] **Step 5: Commit the review candidate on the isolated branch**

```bash
git add artifacts/codex-session-*.md
git commit -m "docs(ai): 기존 세션 작업 기록 접기 적용"
```

Do not merge and do not mark the TODO complete yet.

- [ ] **Step 6: Request the required human checkpoint**

Provide the commit SHA, 23-file diff stat, zero-deletion result, focused/quick
results, and links to one short and one long migrated artifact. Ask the person
to verify that prompts are visible, `작업 내용 보기` is closed initially and
opens correctly, and no reviewed text or metadata changed.

Expected: explicit approval or correction. AI does not write or alter
`human-reviewed` metadata in response.

---

### Task 3: Complete adversarial review and evidence

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: exact Task 1 and Task 2 commit SHAs plus explicit human checkpoint.
- Produces: completed `TOOL-AI-PROMPT-FOLD-01` evidence and plan-completion review record.

- [ ] **Step 1: Run the plan-completion adversarial review**

After human approval, use a fresh second-pass role in the current session. Review:

- accepted spec and every plan checkbox;
- prompt outside/work inside boundaries for tool+response, response-only, and empty-work Turns;
- all 23 artifact diffs for additions-only preservation;
- redaction, scanner, publisher, lifecycle, and index regression results;
- unchanged `artifacts/index.md`, dependencies, application code, OpenAPI, and generated API files;
- TODO ownership, dependency, status, and reproducible evidence.

Record all seven fields from `docs/quality/workflow.md`: Review target, Reviewer,
Checks, Findings, Corrections, Rerun, and Verdict. Resolve every HIGH/MEDIUM
finding before continuing.

- [ ] **Step 2: Run final verification**

Run:

```bash
pnpm verify quick
git diff --check
git status --short
```

Expected: quick and diff checks pass; only the intended TODO evidence change is
uncommitted.

- [ ] **Step 3: Update the task evidence and status**

In `TODO.md`, record the renderer and migration SHAs, focused and quick commands,
23-file/zero-deletion migration evidence, human checkpoint wording, and the
seven-field adversarial review. Set `TOOL-AI-PROMPT-FOLD-01` to checkbox `[x]`
and status `AI_VERIFIED`; never set `HUMAN_APPROVED`.

- [ ] **Step 4: Commit the completion evidence**

```bash
git add TODO.md
git commit -m "docs(qa): 세션 프롬프트 표시 검증 근거 기록"
```

- [ ] **Step 5: Verify the final branch state**

Run `git status --short --branch` and `git log -3 --oneline`.

Expected: clean isolated branch with exactly the renderer, artifact migration,
and evidence commits ready for integration after the approved human checkpoint.
