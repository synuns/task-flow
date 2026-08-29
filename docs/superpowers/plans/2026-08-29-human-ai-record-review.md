# Human-Centered AI Record Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run ai:review`로 위험 우선 후보 검토와 exact-byte publication을 수행해 사람이 path, digest, reviewer, 긴 command를 직접 입력하지 않게 한다.

**Architecture:** lifecycle plan의 Task 1–6이 제공하는 closed record, sidecar metadata, session lock, index library를 소비한다. review scanner는 immutable candidate bytes를 읽기 전용으로 분석하고, TTY CLI는 목록·위험 요약·pager·승인을 담당하며, publisher library는 review receipt를 받아 journal 기반 idempotent multi-file transaction을 실행한다.

**Tech Stack:** Python 3.9.6 standard library, `unittest`, POSIX `fcntl.flock`, `os.open(O_NOFOLLOW)`, `hashlib`, `hmac`, `signal`, `shlex`, `pydoc`, npm script

## Global Constraints

- 선행 dependency: `docs/superpowers/plans/2026-08-29-session-artifact-lifecycle.md` Task 1–6.
- 설계 기준: `docs/superpowers/specs/2026-08-29-human-ai-record-review-design.md`.
- requirement ID: `TOOLING-SESSION-RECORD-LIFECYCLE`.
- 사람 진입점은 `npm run ai:review` 하나다.
- stdin과 stdout 모두 TTY여야 하며 pipe, redirect, CI, non-interactive 실행은 새 publication을 만들지 않는다.
- 정확히 `y\n`만 승인이다. `n`, 빈 Enter, EOF, 잘못된 입력, `SIGINT`, `SIGTERM`, `SIGHUP`은 취소다.
- reviewer는 `git config --get user.name`을 우선 사용하고 값이 없을 때만 한 번 묻고 `git config --local user.name`으로 저장한다.
- 사람이 SHA-256, record path, reviewer, confirmation flag를 입력하지 않는다.
- `BLOCKING` finding이 있으면 게시 질문을 출력하지 않는다.
- candidate bytes는 `O_NOFOLLOW` descriptor로 한 번 읽어 scanner, display, digest의 공통 입력으로 사용한다.
- 승인 후 publisher는 candidate, state, revision, digest를 다시 검증한다.
- transaction key는 `<record-id>:<candidate-sha256>`이며 동일 key 재실행은 resume 또는 `already published` 성공이어야 한다.
- 목적지에 다른 bytes가 있으면 `publication_conflict`로 중단하고 덮어쓰지 않는다.
- staging과 backup은 목적지와 같은 directory에 만들고 mode `0600`, flush, file fsync, atomic rename, parent directory fsync를 적용한다.
- commit visibility 순서는 reviewed artifact → public index → `AI_USAGE.md` → metadata `published` → pending index 제거다.
- canonical rename 후 `complete` 전 catch 가능한 signal은 journal rollback으로 처리한다. `complete` 이후 publication은 취소하지 않는다.
- 자동 hook, AI, CI는 review command나 새 publication을 호출하지 않는다.
- package frontend가 아직 없으므로 `package.json.kbhc.frontendScaffolded=false`를 사용한다.
- Python 외부 dependency, TUI, GUI, 새 frontend dependency를 추가하지 않는다.
- 기존 사용자 파일 `artifacts/codex-session-01a04c77-2685-7013-ad38-d81feba1b2a4.md`를 수정·stage·commit하지 않는다.
- browser evidence는 `N/A — terminal-only TOOLING`이다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.
- 커밋 메시지는 `<type>(<scope>): <한글 설명>` 형식이다.

## File Map

- Create: `.codex/hooks/review_scanner.py` — deterministic BLOCKING/REVIEW/INFO scanner.
- Create: `scripts/review-ai-record` — TTY selection, reviewer lookup, pager, approval, receipt orchestration.
- Create: `.codex/hooks/review_publisher.py` — receipt validation, staging journal, commit, resume, rollback.
- Modify: `scripts/publish-ai-record` — low-level status/recover/rollback wrapper only.
- Create or Modify: `package.json` — tooling-only `ai:review` script and frontend scaffold marker.
- Modify: `scripts/verify` — package mode, executable, journal consistency read-only checks.
- Create: `tests/test_review_scanner.py` — risk classification and context bounds.
- Create: `tests/test_review_ai_record.py` — TTY, selection, reviewer, pager, approval semantics.
- Create: `tests/test_review_publisher.py` — receipt binding, idempotency, staging, signal rollback, crash recovery.
- Modify: `tests/test_publish_ai_record.py` — recovery-only CLI and legacy publication regression.
- Modify: `tests/test_verify.py` — package and read-only review checks.
- Modify: `docs/quality/workflow.md` — one-command human review procedure.
- Modify: `docs/quality/verification.md` — terminal evidence and receipt/transaction checks.
- Modify: `AI_USAGE.md` — `npm run ai:review` instruction; remove manual shasum workflow.
- Modify: `docs/superpowers/plans/2026-08-29-session-artifact-lifecycle.md` — dependency split marker already added; preserve it.

---

### Task 1: Deterministic Risk Scanner

**Files:**
- Create: `.codex/hooks/review_scanner.py`
- Create: `tests/test_review_scanner.py`

**Interfaces:**
- Produces: `Finding(level: str, code: str, record_id: str, context: str)`.
- Produces: `ReviewSummary(record_id: str, blocking: List[Finding], review: List[Finding], info: List[Finding])`.
- Produces: `scan_candidate(candidate: bytes, metadata: Dict[str, object]) -> ReviewSummary`.
- Produces: `format_summary(summary: ReviewSummary) -> str`.
- Consumed by: Task 2 review CLI and Task 5 verification tests.

- [ ] **Step 1: Write failing scanner tests**

Create `tests/test_review_scanner.py`:

```python
import hashlib
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import review_scanner


class ReviewScannerTests(unittest.TestCase):
    def metadata(self, body, **overrides):
        value = {
            "record_id": "session-123.s0001",
            "state": "closed",
            "revision": 7,
            "artifact_sha256": hashlib.sha256(body).hexdigest(),
            "last_hook_status": "ok",
            "last_error": None,
            "transcript": {"size": len(body), "last_record_timestamp": "2026-08-29T12:00:00Z"},
            "parser_version": "codex-rollout-v1",
        }
        value.update(overrides)
        return value

    def test_secret_is_blocking_and_context_is_bounded(self):
        body = ("# Candidate\n\n## Turn 1\n\n" + "Authorization: Bearer exposed-secret\n" + ("x" * 5000)).encode("utf-8")
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        self.assertEqual([item.code for item in summary.blocking], ["unredacted_secret"])
        self.assertLessEqual(len(summary.blocking[0].context.encode("utf-8")), 2048)

    def test_tool_and_large_block_are_review_findings(self):
        body = ("# Candidate\n\n## Turn 1\n\n### Tool activity\n\n**Output**\n\n```text\n" + ("a" * 33000) + "\n```\n").encode("utf-8")
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        codes = {item.code for item in summary.review}
        self.assertIn("tool_activity", codes)
        self.assertIn("large_block", codes)

    def test_error_metadata_is_blocking_and_info_is_safe(self):
        body = b"# Candidate\n"
        summary = review_scanner.scan_candidate(body, self.metadata(body, last_hook_status="error", last_error={"code": "malformed_json"}))
        self.assertIn("incomplete_snapshot", {item.code for item in summary.blocking})
        rendered = review_scanner.format_summary(summary)
        self.assertIn("BLOCKING", rendered)
        self.assertNotIn("malformed_json", rendered)

    def test_entropy_string_is_review_not_blocking_when_pattern_does_not_match(self):
        body = b"# Candidate\n\n## Turn 1\n\nvalue=QWxhZGRpbjpvcGVuIHNlc2FtZQ==1234567890abcdefgh\n"
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        self.assertIn("credential_like", {item.code for item in summary.review})
        self.assertEqual(summary.blocking, [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run scanner tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_scanner -v
```

Expected: import failure for `review_scanner`.

- [ ] **Step 3: Implement scanner**

Create `.codex/hooks/review_scanner.py` with:

```python
import hashlib
import math
import re
from dataclasses import dataclass
from typing import Dict, List

from export_session import SECRET_PATTERNS


SCANNER_VERSION = "session-review-v1"
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9+/=_-]{40,}")


@dataclass(frozen=True)
class Finding:
    level: str
    code: str
    record_id: str
    context: str


@dataclass(frozen=True)
class ReviewSummary:
    record_id: str
    blocking: List[Finding]
    review: List[Finding]
    info: List[Finding]


def entropy(value):
    counts = {character: value.count(character) for character in set(value)}
    length = float(len(value))
    return -sum((count / length) * math.log(count / length, 2) for count in counts.values())


def context_for(text, start, end):
    heading = text.rfind("\n#", 0, start)
    left = 0 if heading < 0 else heading + 1
    right = text.find("\n#", end)
    right = len(text) if right < 0 else right
    context = text[left:right]
    raw = context.encode("utf-8")
    if len(raw) <= 2048:
        return context
    return raw[:2048].decode("utf-8", "ignore") + "\n[context truncated]"


def scan_candidate(candidate, metadata):
    text = candidate.decode("utf-8")
    record = metadata.get("record_id", "unknown")
    blocking = []
    review = []
    info = []
    if metadata.get("last_hook_status") == "error" or metadata.get("last_error") is not None:
        blocking.append(Finding("BLOCKING", "incomplete_snapshot", record, "metadata error state"))
    digest = hashlib.sha256(candidate).hexdigest()
    if digest != metadata.get("artifact_sha256"):
        blocking.append(Finding("BLOCKING", "snapshot_hash_mismatch", record, "metadata digest mismatch"))
    for pattern, _replacement in SECRET_PATTERNS:
        match = pattern.search(text)
        if match:
            blocking.append(Finding("BLOCKING", "unredacted_secret", record, context_for(text, match.start(), match.end())))
            break
    if "### Tool activity" in text or "**Input**" in text or "**Output**" in text:
        review.append(Finding("REVIEW", "tool_activity", record, context_for(text, 0, len(text))))
    for marker in ("error", "failed", "cancelled"):
        match = re.search(r"(?im)^.*\b{}\b.*$".format(marker), text)
        if match:
            review.append(Finding("REVIEW", "error_status", record, context_for(text, match.start(), match.end())))
            break
    for match in re.finditer(r"```[^\n]*\n(.*?)\n```", text, re.S):
        if len(match.group(1).encode("utf-8")) > 32 * 1024:
            review.append(Finding("REVIEW", "large_block", record, context_for(text, match.start(), match.end())))
    redacted = text.find("[REDACTED]")
    if redacted >= 0:
        review.append(Finding("REVIEW", "redacted_context", record, context_for(text, redacted, redacted + 10)))
    for match in TOKEN_PATTERN.finditer(text):
        token = match.group(0)
        if entropy(token) >= 4.0 and not any(pattern.search(token) for pattern, _replacement in SECRET_PATTERNS):
            review.append(Finding("REVIEW", "credential_like", record, context_for(text, match.start(), match.end())))
            break
    info.extend([
        Finding("INFO", "sha256", record, metadata.get("artifact_sha256", "")),
        Finding("INFO", "parser_version", record, metadata.get("parser_version", "unknown")),
    ])
    return ReviewSummary(record, blocking, review, info)


def format_summary(summary):
    lines = ["Record: {}".format(summary.record_id), "", "BLOCKING  {}".format(len(summary.blocking)), "REVIEW    {}".format(len(summary.review)), "INFO      {}".format(len(summary.info))]
    for finding in summary.blocking + summary.review:
        lines.extend(["", "[{}] {}".format(finding.level, finding.code), finding.context])
    return "\n".join(lines) + "\n"
```

The scanner must import the project’s existing redaction patterns through a small shared constant or duplicate them byte-for-byte; it must not mutate files or log source text.

- [ ] **Step 4: Run scanner tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_scanner -v
```

Expected: all scanner tests pass.

- [ ] **Step 5: Commit scanner**

```bash
git add .codex/hooks/review_scanner.py tests/test_review_scanner.py
git commit -m "feat(review): 위험 우선 기록 검사 추가"
```

### Task 2: TTY Review CLI

**Files:**
- Create: `scripts/review-ai-record`
- Create: `tests/test_review_ai_record.py`

**Interfaces:**
- Produces: `read_candidate_once(path: Path) -> Tuple[bytes, os.stat_result]`.
- Produces: `list_closed_records(repo_root: Path) -> List[RecordRef]`.
- Produces: `load_reviewer(repo_root: Path, input_stream, output_stream) -> Optional[str]`.
- Produces: `read_approval(input_stream, output_stream) -> bool`.
- Produces: `run_review(repo_root: Path, input_stream=sys.stdin, output_stream=sys.stdout) -> int`.
- Consumes: lifecycle `RecordStore`, `list_pending_artifact_names`, `scan_candidate`, publisher `publish_receipt`.

- [ ] **Step 1: Write failing CLI tests**

Create `tests/test_review_ai_record.py`:

```python
import io
import importlib.machinery
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "review-ai-record"
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
LOADER = importlib.machinery.SourceFileLoader("review_ai_record", str(SCRIPT))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
review_ai_record = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = review_ai_record
SPEC.loader.exec_module(review_ai_record)


class ReviewCliTests(unittest.TestCase):
    def test_exact_y_newline_approves_only(self):
        for value, expected in (("y\n", True), ("Y\n", False), ("yes\n", False), (" y\n", False), ("\n", False), ("n\n", False), ("", False)):
            with self.subTest(value=repr(value)):
                self.assertEqual(review_ai_record.read_approval(io.StringIO(value), io.StringIO()), expected)

    def test_reviewer_uses_git_config_without_prompt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with mock.patch.object(review_ai_record, "git_config_name", return_value="Configured User") as git_name:
                result = review_ai_record.load_reviewer(root, io.StringIO("unexpected\n"), io.StringIO())
        self.assertEqual(result, "Configured User")
        git_name.assert_called_once_with(root)

    def test_missing_reviewer_is_saved_only_after_input(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = io.StringIO()
            with mock.patch.object(review_ai_record, "git_config_name", return_value=None):
                with mock.patch.object(review_ai_record, "save_git_config_name") as save:
                    result = review_ai_record.load_reviewer(root, io.StringIO("Human Reviewer\n"), output)
        self.assertEqual(result, "Human Reviewer")
        save.assert_called_once_with(root, "Human Reviewer")

    def test_non_tty_process_cannot_publish(self):
        result = subprocess.run([str(SCRIPT)], cwd=str(ROOT), input="y\n", text=True, capture_output=True, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("interactive TTY required", result.stderr)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run CLI tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_ai_record -v
```

Expected: import failure for `review_ai_record` or missing `scripts/review-ai-record`.

- [ ] **Step 3: Implement TTY and candidate reader**

Create `scripts/review-ai-record` as executable Python and add:

```python
import os
import stat
import tempfile


class ReviewCancelled(Exception):
    pass


def require_tty(input_stream, output_stream):
    if not input_stream.isatty() or not output_stream.isatty():
        raise ReviewCancelled("interactive TTY required")


def read_candidate_once(path):
    no_follow = getattr(os, "O_NOFOLLOW", None)
    if no_follow is None:
        raise ReviewCancelled("no-follow open unsupported")
    descriptor = os.open(str(path), os.O_RDONLY | no_follow | getattr(os, "O_CLOEXEC", 0))
    try:
        before = os.fstat(descriptor)
        if not stat.S_ISREG(before.st_mode):
            raise ReviewCancelled("candidate is not a regular file")
        raw = b""
        while True:
            chunk = os.read(descriptor, 1024 * 1024)
            if not chunk:
                break
            raw += chunk
        after = os.fstat(descriptor)
    finally:
        os.close(descriptor)
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns) or len(raw) != after.st_size:
        raise ReviewCancelled("candidate_changed")
    return raw, after
```

Add `git_config_name(root)` using `subprocess.run(["git", "-C", str(root), "config", "--get", "user.name"], ...)`, returning stripped non-empty stdout or `None`. Add `save_git_config_name(root, value)` using an argument vector and `check=True`; never invoke a shell.

- [ ] **Step 4: Implement selection, pager, reviewer, receipt, and approval**

Use these exact helper contracts:

```python
import os
import pydoc
import shlex
import shutil
import subprocess


def git_config_name(root):
    result = subprocess.run(["git", "-C", str(root), "config", "--get", "user.name"], text=True, capture_output=True, check=False)
    value = result.stdout.strip()
    return value or None


def save_git_config_name(root, value):
    subprocess.run(["git", "-C", str(root), "config", "--local", "user.name", value], check=True)


def load_reviewer(root, input_stream, output_stream):
    configured = git_config_name(root)
    if configured:
        return configured
    output_stream.write("Reviewer name: ")
    output_stream.flush()
    value = input_stream.readline().strip()
    if not value or redact(value, Path("/")) != value:
        return None
    save_git_config_name(root, value)
    return value


def read_approval(input_stream, output_stream):
    output_stream.write("게시할까요? 정확히 y 입력 후 Enter: ")
    output_stream.flush()
    try:
        return input_stream.readline() == "y\n"
    except (EOFError, KeyboardInterrupt):
        return False


def choose_record(records, input_stream, output_stream):
    if not records:
        output_stream.write("검토 가능한 closed record가 없습니다.\n")
        return None
    if len(records) == 1:
        return records[0]
    for number, record in enumerate(records, 1):
        output_stream.write("{}. {}\n".format(number, record.record_id))
    output_stream.write("Select [1-{}]: ".format(len(records)))
    output_stream.flush()
    try:
        selected = input_stream.readline()
        number = int(selected.strip())
    except (ValueError, EOFError, KeyboardInterrupt):
        return None
    return records[number - 1] if 1 <= number <= len(records) else None


def open_pager(raw, repo_root, output_stream):
    view_dir = repo_root / ".codex" / "review-pending" / "review-views"
    view_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="wb", prefix=".review-view-", suffix=".md", dir=str(view_dir), delete=False) as stream:
        os.chmod(stream.name, 0o600)
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())
        path = stream.name
    try:
        pager = shlex.split(os.environ["PAGER"]) if os.environ.get("PAGER") else ["/usr/bin/less", "-R"]
        if pager and shutil.which(pager[0]) is None:
            pydoc.pager(raw.decode("utf-8"))
            return
        subprocess.run(pager + [path], check=True)
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass
```

Add `list_closed_records(repo_root)` that reads only canonical lifecycle metadata, validates state `closed`, verifies candidate hash with `hmac.compare_digest`, and returns `RecordRef` sorted by updated time descending then record ID ascending. It must skip `pending`, `published`, invalid metadata, and hash mismatch.

`run_review` must: require TTY; auto-recover incomplete journals; call `list_closed_records`; select record; read candidate once; compute summary; refuse BLOCKING; show REVIEW contexts; accept `v/c/q`; resolve reviewer; call `read_approval`; build in-memory receipt with `record_id`, `session_id`, `revision`, candidate SHA-256, reviewer, scanner version, counts, `human_approved=True`, `approval_channel="interactive-tty"`; call `publish_receipt(repo_root, receipt)`; and print only safe status codes. Any exception becomes a known error code without source path or exception text.

Signal handlers set a module-level `cancel_requested` boolean and do no filesystem I/O. `run_review` checks it before reviewer lookup, before approval, and before publisher commit.

- [ ] **Step 5: Run CLI tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_ai_record -v
```

Expected: exact approval semantics, reviewer lookup/save, and non-TTY refusal pass.

- [ ] **Step 6: Commit CLI**

```bash
git add scripts/review-ai-record tests/test_review_ai_record.py
git commit -m "feat(review): 단일 TTY 검토 명령 추가"
```

### Task 3: Journal-based Idempotent Publisher

**Files:**
- Create: `.codex/hooks/review_publisher.py`
- Modify: `scripts/publish-ai-record`
- Create: `tests/test_review_publisher.py`
- Modify: `tests/test_publish_ai_record.py`

**Interfaces:**
- Produces: `ReviewReceipt` dataclass with exact receipt fields.
- Produces: `publish_receipt(repo_root: Path, receipt: ReviewReceipt) -> PublicationResult`.
- Produces: `resume_journal(repo_root: Path, record_id: str) -> PublicationResult`.
- Produces: `rollback_journal(repo_root: Path, record_id: str) -> PublicationResult`.
- Produces: `journal_status(repo_root: Path, record_id: str) -> Dict[str, object]`.
- Consumed by: Task 2 CLI and Task 4 verifier.

- [ ] **Step 1: Write failing transaction tests**

Create `tests/test_review_publisher.py`:

```python
import hashlib
import json
import os
import signal
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import review_publisher


class PublisherTransactionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        pending = self.root / ".codex" / "review-pending"
        pending.mkdir(parents=True)
        self.record = "session-123.s0001"
        self.body = b"# Candidate\n"
        self.candidate = pending / ("codex-session-{}.md".format(self.record))
        self.candidate.write_bytes(self.body)
        self.metadata = {
            "schema_version": 1,
            "record_id": self.record,
            "session_id": "session-123",
            "state": "closed",
            "revision": 7,
            "artifact_sha256": hashlib.sha256(self.body).hexdigest(),
        }
        (pending / ("codex-session-{}.json".format(self.record))).write_text(json.dumps(self.metadata) + "\n", encoding="utf-8")
        (pending / "sessions").mkdir()
        (pending / "sessions" / "session-123.json").write_text(json.dumps({"schema_version": 1, "session_id": "session-123", "generation": 1, "current_segment": 1, "current_record_id": self.record, "revision": 7}) + "\n", encoding="utf-8")
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        (artifacts / "index.md").write_text("# Codex 세션 기록 인덱스\n\n", encoding="utf-8")
        (self.root / "AI_USAGE.md").write_text("<!-- reviewed-records:start -->\n<!-- reviewed-records:end -->\n", encoding="utf-8")

    def tearDown(self):
        self.temporary.cleanup()

    def receipt(self):
        return review_publisher.ReviewReceipt("session-123.s0001", "session-123", 7, hashlib.sha256(self.body).hexdigest(), "Human Reviewer", "2026-08-29T12:30:00Z", "session-review-v1", 0, 0, True, "interactive-tty")

    def test_publish_is_idempotent(self):
        first = review_publisher.publish_receipt(self.root, self.receipt())
        second = review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(first.status, "published")
        self.assertEqual(second.status, "already_published")
        index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(index.count(self.record), 1)

    def test_destination_conflict_does_not_overwrite(self):
        artifacts = self.root / "artifacts"
        destination = artifacts / ("codex-session-{}.md".format(self.record))
        destination.write_bytes(b"different\n")
        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(raised.exception.code, "publication_conflict")
        self.assertEqual(destination.read_bytes(), b"different\n")

    def test_metadata_failure_leaves_journal_and_resume_completes(self):
        original = review_publisher.RecordStore.mark_published_locked
        with mock.patch.object(review_publisher.RecordStore, "mark_published_locked", side_effect=OSError("injected")):
            with self.assertRaises(OSError):
                review_publisher.publish_receipt(self.root, self.receipt())
        self.assertIn(review_publisher.journal_status(self.root, self.record)["state"], {"committing", "prepared"})
        with mock.patch.object(review_publisher.RecordStore, "mark_published_locked", original):
            result = review_publisher.resume_journal(self.root, self.record)
        self.assertEqual(result.status, "published")

    def test_signal_before_canonical_commit_rolls_back_staging(self):
        review_publisher.request_cancel()
        try:
            with self.assertRaises(review_publisher.PublicationCancelled):
                review_publisher.publish_receipt(self.root, self.receipt())
        finally:
            review_publisher.clear_cancel()
        self.assertFalse((self.root / "artifacts" / ("codex-session-{}.md".format(self.record))).exists())
```

- [ ] **Step 2: Run transaction tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_publisher -v
```

Expected: import failure for `review_publisher`.

- [ ] **Step 3: Implement receipt, journal, staging, and commit**

Create `.codex/hooks/review_publisher.py` with these public types and order:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class ReviewReceipt:
    record_id: str
    session_id: str
    revision: int
    candidate_sha256: str
    reviewer: str
    reviewed_at: str
    risk_scanner_version: str
    blocking_count: int
    review_count: int
    human_approved: bool
    approval_channel: str


@dataclass(frozen=True)
class PublicationResult:
    status: str
    record_id: str
    error: str = ""


class PublicationError(ValueError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class PublicationCancelled(PublicationError):
    pass


def publish_receipt(repo_root, receipt):
    validate_receipt(receipt)
    with session_lock(repo_root, receipt.session_id):
        with public_index_lock(repo_root):
            candidate, metadata = read_candidate_and_metadata(repo_root, receipt)
            transaction = load_or_create_journal(repo_root, receipt, candidate)
            if transaction.state == "complete":
                return PublicationResult("already_published", receipt.record_id)
            check_cancel()
            stage_artifact_and_backups(repo_root, transaction, candidate, receipt)
            journal_transition(repo_root, transaction, "prepared")
            journal_transition(repo_root, transaction, "committing")
            check_cancel()
            atomic_commit_artifact(repo_root, transaction)
            check_cancel()
            atomic_commit_public_index(repo_root, transaction)
            check_cancel()
            atomic_commit_ai_usage(repo_root, transaction)
            check_cancel()
            mark_metadata_published(repo_root, receipt)
            check_cancel()
            atomic_commit_pending_index(repo_root)
            verify_completed_targets(repo_root, transaction, receipt)
            journal_transition(repo_root, transaction, "complete")
            cleanup_transaction(repo_root, transaction)
            return PublicationResult("published", receipt.record_id)
```

`read_candidate_and_metadata` must use one no-follow descriptor, compare regular-file `fstat` before/after, verify candidate SHA-256, metadata `state=closed`, metadata revision, receipt revision, and `hmac.compare_digest` for digest. `validate_receipt` accepts only `human_approved=True`, `approval_channel="interactive-tty"`, lowercase 64-hex digest, non-empty safe reviewer, and zero blocking count.

Journal stores transaction key, record/revision/digest/reviewer/time, state, completed step names, target logical names/hashes, and safe error code. It never stores candidate body, transcript path, secret, or exception text.

- [ ] **Step 4: Implement resume, rollback, and signal safe points**

Add:

```python
cancel_requested = False


def request_cancel(signum=None, frame=None):
    global cancel_requested
    cancel_requested = True


def clear_cancel():
    global cancel_requested
    cancel_requested = False


def check_cancel():
    if cancel_requested:
        raise PublicationCancelled("review_cancelled")


def resume_journal(repo_root, record_id):
    journal = read_journal(repo_root, record_id)
    if journal["state"] == "rolling_back":
        return rollback_journal(repo_root, record_id)
    if journal["state"] in {"prepared", "committing"}:
        return replay_missing_steps(repo_root, journal)
    if journal["state"] == "complete":
        return PublicationResult("already_published", record_id)
    return PublicationResult("cancelled", record_id)


def rollback_journal(repo_root, record_id):
    journal = read_journal(repo_root, record_id)
    journal_transition(repo_root, journal, "rolling_back")
    restore_metadata(repo_root, journal)
    remove_record_from_public_index(repo_root, journal)
    regenerate_ai_usage_from_public_index(repo_root)
    restore_or_remove_artifact(repo_root, journal)
    regenerate_pending_index(repo_root)
    verify_previous_targets(repo_root, journal)
    journal_transition(repo_root, journal, "cancelled")
    cleanup_transaction(repo_root, journal)
    return PublicationResult("cancelled", record_id)
```

Install handlers for `SIGINT`, `SIGTERM`, `SIGHUP` that call `request_cancel` only. Every stage boundary calls `check_cancel`; rollback defers additional signal effects until target consistency is restored. A signal after journal state `complete` returns `already_published`.

`replay_missing_steps` recomputes global public index and `AI_USAGE.md` from current canonical ledger, never stale staged global bytes. Existing destination with different hash raises `publication_conflict`. Existing same hash counts as completed. Journal write and target writes use the lifecycle store’s atomic temp/fsync/rename helper.

- [ ] **Step 5: Restrict low-level script**

Refactor `scripts/publish-ai-record` so parser accepts only:

```text
scripts/publish-ai-record --status <record-id>
scripts/publish-ai-record --recover <record-id>
scripts/publish-ai-record --rollback <record-id>
```

Any old publication flags (`--reviewed-by`, `--reviewed-sha256`, confirmation flags) exit 2 with `use npm run ai:review`. Existing importable helper tests move to `review_publisher.py`. Recovery command never creates a receipt or starts a new transaction.

- [ ] **Step 6: Run publisher tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_review_publisher tests.test_publish_ai_record -v
```

Expected: idempotency, conflict protection, exact-byte binding, journal resume/rollback, signal handling, and recovery-only CLI tests pass.

- [ ] **Step 7: Commit publisher**

```bash
git add .codex/hooks/review_publisher.py scripts/publish-ai-record tests/test_review_publisher.py tests/test_publish_ai_record.py
git commit -m "feat(review): idempotent 게시 transaction 추가"
```

### Task 4: Package Shortcut와 Read-only Verification

**Files:**
- Create: `package.json`
- Modify: `scripts/verify`
- Modify: `tests/test_verify.py`
- Modify: `tests/test_review_ai_record.py`

**Interfaces:**
- `package.json.scripts.ai:review == "./scripts/review-ai-record"`.
- `package.json.kbhc.frontendScaffolded == false` until frontend scaffold exists.
- `verify_review_tooling(root: Path) -> List[str]` reports missing executable, wrong script, invalid package marker, journal/index mismatch without writes.
- `verify_journal_consistency(root: Path) -> List[str]` reports incomplete journal schema, target hash conflicts, and stale transaction keys without mutation.

- [ ] **Step 1: Write failing package/verifier tests**

Append to `tests/test_verify.py`:

```python
    def test_tooling_only_package_has_review_shortcut(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(package["scripts"]["ai:review"], "./scripts/review-ai-record")
        self.assertFalse(package["kbhc"]["frontendScaffolded"])

    def test_review_tooling_verification_is_read_only(self):
        before = verify_module.repository_fingerprint()
        self.assertEqual(verify_module.verify_review_tooling(ROOT), [])
        self.assertEqual(verify_module.repository_fingerprint(), before)
```

Add `json` import and load `verify_module` through existing `load_verify_module()`.

- [ ] **Step 2: Run package tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_verify.VerifyCliTests.test_tooling_only_package_has_review_shortcut tests.test_verify.VerifyCliTests.test_review_tooling_verification_is_read_only -v
```

Expected: missing `package.json`, script marker, or verifier function.

- [ ] **Step 3: Create tooling-only package**

Create `package.json` exactly:

```json
{
  "private": true,
  "scripts": {
    "ai:review": "./scripts/review-ai-record"
  },
  "kbhc": {
    "frontendScaffolded": false
  }
}
```

Do not create a lockfile or frontend dependencies.

- [ ] **Step 4: Add verifier mode split**

Add to `scripts/verify`:

```python
def verify_review_tooling(root=ROOT):
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    if package.get("scripts", {}).get("ai:review") != "./scripts/review-ai-record":
        return ["ai_review_script_mismatch"]
    if not isinstance(package.get("kbhc", {}).get("frontendScaffolded"), bool):
        return ["frontend_scaffold_marker_invalid"]
    executable = root / "scripts" / "review-ai-record"
    if not executable.is_file() or not os.access(str(executable), os.X_OK):
        return ["review_executable_missing"]
    return verify_journal_consistency(root)


def verify_journal_consistency(root):
    publications = root / ".codex" / "review-pending" / "publications"
    if not publications.exists():
        return []
    errors = []
    for path in sorted(publications.glob("*.json")):
        try:
            journal = json.loads(path.read_text(encoding="utf-8"))
            if journal.get("schema_version") != 1 or journal.get("state") not in {"prepared", "committing", "rolling_back", "cancelled", "complete"}:
                errors.append("invalid_journal:{}".format(path.name))
            if not isinstance(journal.get("transaction_key"), str) or not isinstance(journal.get("candidate_sha256"), str):
                errors.append("invalid_journal:{}".format(path.name))
        except (OSError, UnicodeError, ValueError, json.JSONDecodeError):
            errors.append("invalid_journal:{}".format(path.name))
    return sorted(set(errors))
```

Call this from `verify_setup` and fail with existing reproducible `TOOLING` output when list is non-empty. Run frontend scripts only when `frontendScaffolded` is true; keep existing required scripts for that mode. Never call `review_ai_record.run_review`, `resume_journal`, `rollback_journal`, or index rebuild from verifier.

- [ ] **Step 5: Run package and setup tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_verify -v
./scripts/verify setup
```

Expected: package shortcut passes; frontend stages report skip for false marker; setup remains read-only.

- [ ] **Step 6: Commit package/verifier**

```bash
git add package.json scripts/verify tests/test_verify.py tests/test_review_ai_record.py
git commit -m "feat(tooling): AI 기록 검토 package 단축어 추가"
```

### Task 5: Documentation, Integration QA, and Human Checkpoint

**Files:**
- Modify: `AI_USAGE.md`
- Modify: `docs/quality/workflow.md`
- Modify: `docs/quality/verification.md`
- Modify: `tests/test_review_ai_record.py`
- Modify: `tests/test_review_publisher.py`

**Interfaces:**
- Documentation exposes only `npm run ai:review` for normal people.
- Automated evidence uses focused unittest and `./scripts/verify quick`.
- Human checkpoint remains open; AI does not set `HUMAN_APPROVED`.

- [ ] **Step 1: Replace manual procedure documentation**

Replace manual shasum/publisher instructions in `AI_USAGE.md` with:

~~~markdown
### AI 기록 검토·게시

사람 검토는 다음 명령 하나로 시작합니다.

```bash
npm run ai:review
```

명령이 `closed` 후보를 찾고 위험 항목을 먼저 표시합니다. 사람이 path, SHA-256,
reviewer, confirmation flag를 입력할 필요가 없습니다. reviewer는 Git 설정에서
자동으로 읽습니다. 최종 질문에는 정확히 `y`를 입력하고 Enter를 눌러야 게시됩니다.
`n`, 빈 Enter, EOF, signal은 취소입니다.

pending 후보와 pending index는 제출 증거가 아닙니다. `artifacts/`와 공개 index는
interactive 사람 승인이 완료된 transaction에서만 생성됩니다.
~~~

Update `docs/quality/workflow.md` and `docs/quality/verification.md` with the same state flow, terminal-only evidence, package shortcut, and recovery commands. Remove claims that SessionEnd publishes or that people manually compute digest.

- [ ] **Step 2: Add end-to-end CLI integration tests**

Add tests that run a pseudo-terminal or patch `isatty` streams and verify:

```python
from review_publisher import PublicationResult


class TtyStringIO(io.StringIO):
    def isatty(self):
        return True


def test_one_closed_record_needs_only_y_enter(self):
    output = io.StringIO()
    input_stream = TtyStringIO("c\ny\n")
    with mock.patch.object(review_ai_record, "publish_receipt", return_value=PublicationResult("published", "session-123.s0001")):
        result = review_ai_record.run_review(self.root, input_stream, output)
    self.assertEqual(result, 0)
    self.assertIn("published", output.getvalue())
```

Also run direct subprocess smoke with `script` or `pty` when available; skip only the PTY environment portion with explicit `ENVIRONMENT` evidence when unavailable. Unit tests must still cover exact `y\n`, EOF, and signal semantics without PTY.

- [ ] **Step 3: Run focused lifecycle and review evidence**

Run:

```bash
/usr/bin/python3 -m unittest \
  tests.test_artifact_contract \
  tests.test_transcript_adapter \
  tests.test_export_session \
  tests.test_session_records \
  tests.test_render_artifact_index \
  tests.test_publish_ai_record \
  tests.test_review_scanner \
  tests.test_review_ai_record \
  tests.test_review_publisher \
  tests.test_verify -v
./scripts/verify quick
```

Expected: all focused suites pass; frontend skip is explicit because package marker is false; no public file is created by hook tests.

- [ ] **Step 4: Run adversarial review**

Run:

```bash
rg -n 'reviewed-sha256|confirm-sensitive|confirm-content|shasum|artifacts/|publish-ai-record|human_approved|O_NOFOLLOW|publication_conflict|rolling_back' scripts .codex/hooks tests AI_USAGE.md docs/quality
git diff --check
git status --short
```

Check:

- Human path has one command and one exact approval.
- No reviewer/digest/flag copy-paste remains in normal docs.
- No hook or verifier starts a new publication.
- BLOCKING findings cannot reach approval.
- A stale candidate, revision, metadata hash, or destination conflict cannot be overwritten.
- Journal recovery cannot replay stale global index bytes.
- Signal/cancel behavior matches approved boundary.
- User-owned artifact remains untouched and unstaged.

Classify findings using workflow classes, correct root cause, rerun failed gate, and record command/result.

- [ ] **Step 5: Commit docs and integration tests**

```bash
git add AI_USAGE.md docs/quality/workflow.md docs/quality/verification.md tests/test_review_ai_record.py tests/test_review_publisher.py
git commit -m "docs(review): 사람 중심 기록 게시 절차 반영"
```

- [ ] **Step 6: Request human checkpoint**

Report:

```text
Requirement: TOOLING-SESSION-RECORD-LIFECYCLE
Command: npm run ai:review
Human action: 후보 선택 또는 자동 선택 → 위험 항목 확인 → 정확히 y + Enter
Cancel: n, 빈 Enter, EOF, SIGINT, SIGTERM, SIGHUP
Automatic evidence: focused unittest + ./scripts/verify quick
Browser evidence: N/A — terminal-only TOOLING
Open decision: 사람이 risk-first 단일 명령 게시 흐름을 실제 terminal에서 수용하는지
```

Wait for human acceptance. AI must not write `HUMAN_APPROVED`.

- [ ] **Step 7: Full final QA after checkpoint**

Run:

```bash
./scripts/verify full
git diff --check
git status --short
git log --oneline -12
```

Expected: full verification passes or frontend skip is explicit; user-owned artifact and runtime pending/journal files are not staged; all public records show human review evidence; no automatic publication occurred.
