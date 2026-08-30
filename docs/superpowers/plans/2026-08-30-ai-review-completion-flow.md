# AI Review Completion Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm run ai:review`를 사전 마크다운 검수를 마친 사람이 review-pending 세션을 선택하고 exact `y`로 확인해 artifact로 게시하는 절차로 단순화한다.

**Architecture:** canonical lifecycle의 `closed` 상태를 UI에서 review-pending으로 표현하고 기존 publisher transaction은 그대로 재사용한다. CLI는 session ID 목록·선택·확인·receipt 조합만 담당하며, scanner는 선택된 immutable bytes의 BLOCKING audit와 receipt count만 제공한다.

**Tech Stack:** Python 3 standard library, `unittest`, 기존 `RecordStore`, `review_scanner`, `review_publisher`, pnpm verification scripts

## Global Constraints

- 구현 기준은 `docs/superpowers/specs/2026-08-30-ai-review-completion-flow-design.md`다.
- 새 lifecycle 상태, dependency, publication path를 추가하지 않는다.
- stdin과 stdout이 모두 TTY일 때만 publication을 허용한다.
- exact `y\n` 이외 입력은 publication 없이 취소한다.
- 미마스킹 secret, metadata/hash 불일치, symlink, 비정상 candidate는 계속 차단한다.
- REVIEW finding은 화면에 출력하지 않지만 receipt count에는 기록한다.
- reviewer는 `git config --get user.name`에서만 읽고 없으면 `reviewer_not_configured`로 종료한다.
- publisher의 no-follow, digest/state/revision 검증, lock, atomic transaction, rollback, idempotency는 변경하지 않는다.
- `assignment-original/`은 수정하지 않는다.
- AI는 실제 검수 완료 publication이나 `HUMAN_APPROVED`를 대신 실행·기록하지 않는다.

## Approved Full-Review Amendment (2026-08-30)

- 선택 뒤 exact record ID도 표시해 사전 검수 파일과 승인 대상을 연결한다.
- publisher는 session lock 안에서 current closed record와 revision을 public write
  전에 검증한다.
- receipt는 출력 가능한 Unicode reviewer를 허용하고 제어 문자를 거부한다.

## Current Worktree Precondition

현재 worktree에는 이전 testable unit `TOOL-AI-REVIEW-01`의 미커밋 변경이 있다.

- `.codex/hooks/review_scanner.py`
- `tests/test_review_scanner.py`
- `TODO.md`

이 변경은 이미 RED→GREEN과 `./scripts/verify quick` evidence를 갖고 있다. 아래
순서로 먼저 독립 커밋하고 이후 task와 섞지 않는다.

- [ ] **Precondition 1: 기존 scanner 수정 재검증**

Run:

```bash
python3 -m unittest tests.test_review_scanner -v
./scripts/verify quick
git diff --check
```

Expected: scanner 5 tests PASS, quick PASS, whitespace error 없음.

- [ ] **Precondition 2: 기존 scanner 수정만 커밋**

```bash
git add .codex/hooks/review_scanner.py tests/test_review_scanner.py TODO.md
git diff --cached --check
git commit -m "fix(review): 마스킹된 비밀정보 오탐 수정"
```

Expected: 새 completion-flow 구현 file은 commit에 포함되지 않는다.

---

### Task 1: 검수 완료 전용 CLI

**Files:**
- Modify: `scripts/review-ai-record`
- Modify: `tests/test_review_ai_record.py`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `RecordStore`, `RecordRef`, `scan_candidate(candidate: bytes, metadata: dict) -> ReviewSummary`, `ReviewReceipt`, `publish_receipt(repo_root: Path, receipt: ReviewReceipt) -> PublicationResult`
- Produces: `list_review_pending_records(repo_root: Path) -> List[RecordRef]`, `choose_record(records, input_stream, output_stream) -> Optional[RecordRef]`, `run_review(repo_root: Path, input_stream, output_stream) -> int`
- Preserves: `read_candidate_once`, `git_config_name`, `read_approval`, signal cancellation, publisher receipt fields

- [ ] **Step 1: 실행 원장에 작업 시작 기록**

`TODO.md`의 `TOOL-AI-REVIEW-01` 다음에 아래 item을 추가한다.

```markdown
### [ ] TOOL-AI-REVIEW-02 검수 완료 게시 흐름 단순화

- Requirements: `SYS-05`
- Risk: HIGH — 사람 publication 승인 흐름 변경
- Depends on: `TOOL-AI-REVIEW-01`
- Deliverable: review-pending session ID 목록, 선택, exact 확인, 기존 publisher 게시만 수행하는 CLI
- Acceptance: risk summary·pager·reviewer 입력 없이 유효한 `closed` session만 선택하고, BLOCKING audit와 TTY/exact-y 경계를 유지한 채 artifact를 게시한다.
- Automatic verification: review CLI unit tests, hook test suite, `./scripts/verify quick`
- Browser verification: 적용 없음 — terminal-only tooling
- Status: IN_PROGRESS
- Evidence: 2026-08-30 사용자 승인; `docs/superpowers/specs/2026-08-30-ai-review-completion-flow-design.md`; 구현·검증 진행 중
```

- [ ] **Step 2: session ID 목록과 선택을 재현하는 실패 test 작성**

`tests/test_review_ai_record.py`의 `ReviewCliTests`에 추가한다.

```python
def test_review_pending_list_shows_session_id_and_requires_selection(self):
    record = review_ai_record.RecordRef("session-123", 1, 1, 7, "closed")
    output = TtyStringIO()

    selected = review_ai_record.choose_record(
        [record], TtyStringIO("1\n"), output
    )

    self.assertEqual(selected, record)
    self.assertIn("검수 완료할 review-pending 세션:", output.getvalue())
    self.assertIn("1. session-123", output.getvalue())
    self.assertNotIn("session-123.s0001", output.getvalue())
    self.assertIn("Select [1-1]:", output.getvalue())
```

- [ ] **Step 3: REVIEW finding이 추가 menu 없이 게시되는 실패 test 작성**

`tests/test_review_ai_record.py`에 다음 test를 추가한다.

```python
def test_review_finding_needs_only_selection_and_confirmation(self):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        store = review_ai_record.RecordStore(
            root, clock=lambda: "2026-08-29T12:00:00Z"
        )
        base = store.initialize_session("session-123")
        body = b"# Candidate\n\n### Tool activity\n"
        store.commit_snapshot(
            base,
            body,
            {
                "last_turn_id": "turn-1",
                "snapshot_kind": "turn_complete",
                "last_hook_event": "Stop",
                "parser_version": "codex-rollout-v1",
                "transcript": None,
            },
        )
        closed = store.session_end("session-123")
        artifacts = root / "artifacts"
        artifacts.mkdir()
        (artifacts / "index.md").write_text(
            render_artifact_index.render_index([]), encoding="utf-8"
        )
        (root / "AI_USAGE.md").write_text(
            "<!-- reviewed-records:start -->\n<!-- reviewed-records:end -->\n",
            encoding="utf-8",
        )
        output = TtyStringIO()
        with mock.patch.object(
            review_ai_record, "git_config_name", return_value="Human Reviewer"
        ):
            result = review_ai_record.run_review(
                root, TtyStringIO("1\ny\n"), output
            )

        self.assertEqual(result, 0)
        self.assertIn("선택한 세션: session-123", output.getvalue())
        self.assertNotIn("REVIEW", output.getvalue())
        self.assertNotIn("[v]", output.getvalue())
        self.assertEqual(store.read_metadata(closed.record_id)["state"], "published")
```

- [ ] **Step 4: reviewer 누락과 BLOCKING 안전 출력을 재현하는 실패 test 작성**

기존 `test_missing_reviewer_is_saved_after_input`을 제거하고 다음 test로 교체한다.

```python
def test_missing_reviewer_stops_without_prompt_or_publication(self):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        store = review_ai_record.RecordStore(
            root, clock=lambda: "2026-08-29T12:00:00Z"
        )
        base = store.initialize_session("session-123")
        body = b"# Candidate\n"
        store.commit_snapshot(
            base,
            body,
            {
                "last_turn_id": "turn-1",
                "snapshot_kind": "turn_complete",
                "last_hook_event": "Stop",
                "parser_version": "codex-rollout-v1",
                "transcript": None,
            },
        )
        store.session_end("session-123")
        output = TtyStringIO()
        with mock.patch.object(
            review_ai_record, "git_config_name", return_value=None
        ):
            with mock.patch.object(review_ai_record, "publish_receipt") as publish:
                result = review_ai_record.run_review(
                    root, TtyStringIO("1\ny\n"), output
                )

        self.assertEqual(result, 1)
        self.assertIn("reviewer_not_configured", output.getvalue())
        self.assertNotIn("Reviewer name", output.getvalue())
        publish.assert_not_called()
```

기존 `test_closed_record_is_selected_and_blocking_stops_before_approval`은 input을
`"1\n"`으로 바꾸고 assertion을 다음처럼 강화한다.

```python
self.assertEqual(result, 1)
self.assertIn("review_blocked", output.getvalue())
self.assertNotIn("BLOCKING", output.getvalue())
self.assertNotIn("exposed-secret", output.getvalue())
```

- [ ] **Step 5: focused test를 실행해 RED 확인**

Run:

```bash
python3 -m unittest tests.test_review_ai_record -v
```

Expected failures:

- 한 record일 때 목록과 선택 prompt가 출력되지 않는다.
- REVIEW finding에서 `1\n`이 기존 `[v/c/q]` menu에 소비되어 게시되지 않는다.
- reviewer 누락 시 기존 name prompt가 나타난다.
- BLOCKING 출력이 기존 summary 형식이다.

- [ ] **Step 6: CLI import와 reviewer helper 최소화**

`scripts/review-ai-record`에서 사용하지 않게 되는 `pydoc`, `shlex`, `shutil`,
`tempfile`, `Optional`, `redact`, `list_pending_artifact_names`, `format_summary`
import를 제거한다. `save_git_config_name`, `load_reviewer`, `open_pager` 함수
정의 전체도 삭제한다.

`git_config_name`과 `read_approval`은 유지하되 prompt만 승인된 문구로 바꾼다.

```python
def read_approval(input_stream, output_stream):
    output_stream.write("검수 완료하고 게시할까요? 정확히 y 입력 후 Enter: ")
    output_stream.flush()
    try:
        return input_stream.readline() == "y\n"
    except (EOFError, KeyboardInterrupt):
        return False
```

- [ ] **Step 7: review-pending 목록 구현**

`list_closed_records`를 `list_review_pending_records`로 rename한다. 내부 filtering,
hash comparison, sorting은 변경하지 않는다. `choose_record`를 다음으로 교체한다.

```python
def choose_record(records, input_stream, output_stream):
    if not records:
        output_stream.write("검수 완료할 review-pending 세션이 없습니다.\n")
        return None
    output_stream.write("검수 완료할 review-pending 세션:\n")
    for number, record in enumerate(records, 1):
        output_stream.write("{}. {}\n".format(number, record.session_id))
    output_stream.write("Select [1-{}]: ".format(len(records)))
    output_stream.flush()
    try:
        number = int(input_stream.readline().strip())
    except (ValueError, EOFError, KeyboardInterrupt):
        return None
    return records[number - 1] if 1 <= number <= len(records) else None
```

한 record도 자동 선택하지 않고 반드시 목록과 번호 선택을 거친다.

- [ ] **Step 8: completion-only `run_review` 구현**

기존 `run_review`의 record 조회 이후를 다음 흐름으로 교체한다. signal check와
publisher lazy import는 유지한다.

```python
def run_review(repo_root: Path, input_stream=sys.stdin, output_stream=sys.stdout) -> int:
    require_tty(input_stream, output_stream)
    try:
        from review_publisher import clear_cancel as clear_publisher_cancel

        clear_publisher_cancel()
    except ImportError:
        pass
    check_cancel()
    store = RecordStore(repo_root)
    records = list_review_pending_records(repo_root)
    selected = choose_record(records, input_stream, output_stream)
    if selected is None:
        return 0
    output_stream.write("선택한 세션: {}\n".format(selected.session_id))
    output_stream.flush()
    check_cancel()
    raw, _stat = read_candidate_once(store.paths(selected.record_id).markdown)
    metadata = store.read_metadata(selected.record_id)
    summary = scan_candidate(raw, metadata)
    if summary.blocking:
        output_stream.write("review_blocked\n")
        return 1
    reviewer = git_config_name(repo_root)
    if not reviewer:
        output_stream.write("reviewer_not_configured\n")
        return 1
    check_cancel()
    if not read_approval(input_stream, output_stream):
        return 0
    check_cancel()
    global publish_receipt
    if publish_receipt is None:
        from review_publisher import publish_receipt as publish

        publish_receipt = publish
    from review_publisher import ReviewReceipt

    receipt = ReviewReceipt(
        selected.record_id,
        selected.session_id,
        selected.revision,
        hashlib.sha256(raw).hexdigest(),
        reviewer,
        datetime.datetime.now(datetime.timezone.utc).isoformat(),
        SCANNER_VERSION,
        len(summary.blocking),
        len(summary.review),
        True,
        "interactive-tty",
    )
    result = publish_receipt(repo_root, receipt)
    output_stream.write("{}\n".format(result.status))
    return 0 if result.status in {"published", "already_published"} else 1
```

- [ ] **Step 9: 기존 CLI test를 새 입력 계약에 맞춤**

- `test_reviewer_uses_config_without_prompt`와
  `test_missing_reviewer_is_saved_after_input`은 삭제한다.
- `test_one_clean_record_needs_only_y_enter_and_publishes` 이름을
  `test_one_clean_record_needs_selection_and_y_to_publish`로 바꾸고 input을
  `"1\ny\n"`으로 바꾼다.
- `test_non_tty_process_cannot_publish`은 그대로 유지한다.
- `test_exact_y_newline_approves_only`은 그대로 유지한다.

- [ ] **Step 10: focused GREEN과 raw-secret regression 확인**

Run:

```bash
python3 -m unittest tests.test_review_ai_record tests.test_review_scanner -v
```

Expected: 모든 CLI/scanner test PASS. 실제 secret은 계속
`unredacted_secret`, 이미 `[REDACTED]`인 값은 REVIEW only.

- [ ] **Step 11: Task 1 검증과 commit**

Run:

```bash
./scripts/verify setup
git diff --check
git diff -- scripts/review-ai-record tests/test_review_ai_record.py TODO.md
```

Expected: setup PASS, diff error 없음, publisher와 lifecycle file 변경 없음.

Commit:

```bash
git add scripts/review-ai-record tests/test_review_ai_record.py TODO.md
git commit -m "feat(review): 검수 완료 게시 절차 단순화"
```

---

### Task 2: 운영 문서와 evidence 정합성

**Files:**
- Modify: `docs/quality/workflow.md`
- Modify: `docs/quality/verification.md`
- Modify: `AI_USAGE.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Task 1의 실제 CLI 문구와 상태 전이
- Produces: 사람이 그대로 실행할 수 있는 review-pending 검수 완료 절차와 재현 가능한 `TOOL-AI-REVIEW-02` evidence

- [ ] **Step 1: workflow의 Prompt Records 절차 교체**

`docs/quality/workflow.md`의 `## Prompt Records` 본문을 다음 의미로 갱신한다.

```markdown
Lifecycle hooks create pending snapshots and metadata only. A person first
reviews the Markdown under `.codex/review-pending/`, then runs
`pnpm run ai:review`. The TTY command lists valid review-pending session IDs,
accepts one numbered selection, repeats the selected session ID, and requires
exact `y`+Enter before publication. Any other input, EOF, or signal cancels.

The scanner remains a publication safety gate for metadata/hash errors and
unredacted secrets, but REVIEW findings, context, and pager interaction are not
part of this completion command. Reviewer identity comes only from
`git config user.name`; a missing value stops with `reviewer_not_configured`.
Publication remains digest-bound, atomic, and idempotent. AI never selects,
confirms, or publishes a record for a person.
```

- [ ] **Step 2: verification policy를 새 CLI 계약으로 교체**

`docs/quality/verification.md`의 `## Prompt Candidate Verification` 첫 문단을
다음으로 교체한다.

```markdown
Setup verification confirms ignored pending storage, Stop hook wiring,
exporter tests, and reviewed-publication language. A person reviews a pending
Markdown file before running `pnpm run ai:review`. The TTY command lists only
valid closed records as review-pending session IDs, requires a numbered
selection and exact `y`+Enter, and records reviewer plus reviewed SHA-256.
Non-TTY execution, invalid selection, missing Git reviewer, BLOCKING scanner
findings, other confirmation input, EOF, or signal cannot publish.
```

기존 publisher no-follow, transaction, index, rollback 설명은 유지한다.

- [ ] **Step 3: AI_USAGE 사람 절차 교체**

`AI_USAGE.md`의 lifecycle 설명과 command 주변 문단을 다음으로 갱신한다.

````markdown
Lifecycle 훅은 pending 후보와 metadata만 생성합니다. 사람은 먼저
`.codex/review-pending/`의 세션 Markdown을 검수한 뒤 아래 명령을 실행합니다.

```bash
pnpm run ai:review
```

명령은 검수 대기 세션 ID 목록을 보여주고 번호 선택 후 선택한 ID를 다시
표시합니다. 정확히 `y`+Enter로 확인한 record만 artifact로 게시합니다.
다른 입력, EOF, signal은 취소되며 AI와 non-TTY 실행은 게시할 수 없습니다.
reviewer는 `git config user.name`에서만 읽습니다.
````

기존 자동 마스킹 비대체, atomic publication, managed 기록 설명은 유지한다.

- [ ] **Step 4: TODO evidence와 상태 갱신**

`TOOL-AI-REVIEW-02`를 다음으로 마감한다.

```markdown
### [x] TOOL-AI-REVIEW-02 검수 완료 게시 흐름 단순화
```

```markdown
- Status: AI_VERIFIED
- Evidence: 2026-08-30 사용자 승인 spec `752582c`; RED review CLI focused tests가 기존 자동 선택·risk menu·reviewer prompt를 재현; GREEN review CLI와 scanner focused suite PASS; `./scripts/verify setup`, `./scripts/verify quick`, `git diff --check` PASS; 실제 TTY publication은 사람 checkpoint 대기
```

- [ ] **Step 5: 전체 read-only 검증**

Run:

```bash
./scripts/verify quick
git diff --check
git status --short
git diff -- assignment-original
```

Expected: quick PASS, whitespace error 없음, `assignment-original/` diff 없음.

- [ ] **Step 6: 문서/evidence commit**

```bash
git add docs/quality/workflow.md docs/quality/verification.md AI_USAGE.md TODO.md
git diff --cached --check
git commit -m "docs(review): 검수 완료 게시 절차 반영"
```

---

### Task 3: 사람 TTY checkpoint 요청

**Files:**
- Modify: 없음

**Interfaces:**
- Consumes: Task 1의 `pnpm run ai:review` command
- Produces: 사람이 직접 확인한 review-pending 목록·선택·확인 UX와 선택 시에만 발생한 publication

- [ ] **Step 1: 구현자가 자동 evidence를 보고**

```bash
git log -3 --oneline
git status --short
./scripts/verify quick
```

Expected: design, CLI, documentation commit이 분리되어 있고 quick PASS. 실제
pending record publication은 아직 AI가 실행하지 않았다.

- [ ] **Step 2: 사람 checkpoint 요청**

사람에게 실제 terminal에서 다음을 실행하도록 요청한다.

```bash
pnpm run ai:review
```

사람 확인 항목:

- review-pending session ID 목록만 표시된다.
- 번호 선택 후 같은 session ID가 다시 표시된다.
- risk summary와 `[v/c/q]` menu, reviewer prompt가 없다.
- `n`이면 아무 artifact도 게시되지 않는다.
- 다시 실행해 같은 session을 선택하고 `y`를 입력한 경우에만 artifact,
  `artifacts/index.md`, `AI_USAGE.md`가 갱신된다.

AI는 이 checkpoint를 대신 실행하거나 승인 상태를 기록하지 않는다.
