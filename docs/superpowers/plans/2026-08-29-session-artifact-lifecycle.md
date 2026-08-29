# Session Artifact Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution split:** 이 문서에서는 Task 1–6만 실행한다. 아래 historical Task
> 7–9는 직접 digest·flags 기반 절차라 폐기됐다. Task 1–6 완료 후
> `docs/superpowers/plans/2026-08-29-human-ai-record-review.md`를 실행한다.

**Goal:** 첫 사용자 prompt부터 검토 대기 snapshot을 만들고 lifecycle을 revision-safe하게 관리하며, 사람은 `npm run ai:review`와 승인 한 번으로 record를 idempotent하게 게시한다.

**Architecture:** Git 비추적 pending 영역에 segment별 Markdown, sidecar metadata, session manifest를 저장한다. transcript 형식은 versioned adapter 한 곳에서만 해석하고, lifecycle 저장소는 session lock, compare-and-swap revision, atomic rename, hash 기반 복구를 담당한다. TTY 전용 review CLI가 risk-first 화면과 단일 승인을 제공하고, journal 기반 publisher가 공개 artifact·index를 crash-safe transaction으로 갱신한다.

**Tech Stack:** Codex project hooks, Python 3.9.6 standard library, POSIX `fcntl.flock`, `unittest`, canonical JSON, SHA-256, Markdown

> **Plan split:** 사람용 interactive review와 idempotent publication UX는 승인된
> `docs/superpowers/specs/2026-08-29-human-ai-record-review-design.md`에 따라
> `docs/superpowers/plans/2026-08-29-human-ai-record-review.md`에서 별도
> bounded plan으로 실행한다. 이 계획의 Task 7–9 publisher/wiring/docs 단계는
> 새 review plan이 supersede한다. 이 계획의 Task 1–6 lifecycle/storage 단계는
> review plan의 선행 dependency다.

## Global Constraints

- Requirement ID는 `TOOLING-SESSION-RECORD-LIFECYCLE`이다. 과제 제품 요구사항과 OpenAPI 동작은 변경하지 않는다.
- 설계 기준은 `docs/superpowers/specs/2026-08-29-session-artifact-lifecycle-design.md`다.
- 사람 검토·게시 보완 기준은 `docs/superpowers/specs/2026-08-29-human-ai-record-review-design.md`다.
- Python 코드는 `/usr/bin/python3` 3.9.6에서 외부 dependency 없이 동작해야 한다.
- physical session 안에서 `SessionStart(source=clear)`마다 새 logical segment를 만든다.
- record ID는 `<session-id>.s<4자리 segment 번호>`, segment 범위는 `1..9999`다.
- lifecycle state는 `pending`, `closed`, `published`; hook status는 `ok`, `error`, `stale`다.
- `UserPromptSubmit`은 transcript 없이 snapshot을 만들며 이전 완전 snapshot을 축소하지 않는다.
- `Stop`만 transcript를 읽고 전체 turn snapshot을 만든다.
- `SessionEnd` timeout은 3초며 transcript를 열거나 parser를 호출하지 않는다.
- transcript 형식은 안정적인 공개 interface로 간주하지 않는다.
- 모든 상태 파일은 mode `0600` 임시 파일, `fsync`, `os.replace`, parent directory `fsync` 순서로 쓴다.
- 오래된 hook은 `(generation, segment, revision, state)` compare-and-swap 실패 시 `stale`로 끝난다.
- parser 실패는 마지막 유효 Markdown, lifecycle state, transcript watermark를 보존한다.
- 자동 hook은 `.codex/review-pending/`만 갱신한다. `artifacts/`, `artifacts/index.md`, `AI_USAGE.md` reviewed 영역은 publisher만 갱신한다.
- 사람은 `npm run ai:review`에서 risk-first 내용을 확인하고 exact `y`+Enter 한 번만 입력한다. path, digest, reviewer, confirmation flag를 직접 입력하지 않는다.
- stdin/stdout 비TTY, CI, pipe, redirect, 자동 hook은 새 publication을 만들지 못한다.
- publication은 per-record journal, same-directory staging, atomic rename, fsync, rollback으로 idempotent해야 한다.
- catch 가능한 signal, `n`, 빈 Enter, EOF는 publication `complete` 전 취소다.
- tooling-only `package.json`은 `kbhc.frontendScaffolded=false`로 시작한다.
- 기존 사용자 파일 `artifacts/codex-session-01a04c77-2685-7013-ad38-d81feba1b2a4.md`는 수정·stage·commit하지 않는다.
- 현재 worktree의 기존 관련 변경은 보존하고 새 설계에 맞춰 단계별로 흡수한다. 각 commit은 명시된 path만 stage한다.
- 커밋 메시지는 `<type>(<scope>): <한글 설명>` Conventional Commits 형식을 따른다.
- hook/review lifecycle은 terminal 기능이므로 browser evidence는 `N/A — terminal-only TOOLING`으로 기록한다.
- AI는 `HUMAN_APPROVED` 또는 최종 완료를 표시하지 않는다.

## File Map

- Modify `.codex/hooks/artifact_contract.py`: session ID, record ID, segment별 Markdown·metadata 파일명 계약.
- Create `.codex/hooks/transcript_adapter.py`: symlink를 따르지 않는 단일 descriptor read, watermark, SHA-256, versioned rollout parser.
- Modify `.codex/hooks/export_session.py`: 최종적으로 redaction과 Markdown rendering만 소유한다. 기존 Stop entry point는 Task 8 wiring 전환까지 호환 유지한다.
- Create `.codex/hooks/session_records.py`: lock, canonical JSON, atomic write, previous-slot 복구, manifest, metadata, lifecycle CAS, event log.
- Create `.codex/hooks/session_hook.py`: hook input validation과 event별 orchestration, pending index 갱신, continuation output.
- Modify `.codex/hooks/render_artifact_index.py`: metadata/hash/state 기반 pending index와 기존 public index library. SessionEnd entry point 제거.
- Modify `.codex/hooks.json`: `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd`를 공통 dispatcher에 연결.
- Create `.codex/hooks/review_scanner.py`: immutable candidate bytes의 BLOCKING/REVIEW/INFO finding 생성.
- Create `.codex/hooks/review_publish.py`: review receipt, publication journal, staging, resume, rollback transaction.
- Create `scripts/review-ai-record`: TTY 후보 선택, reviewer 조회, risk-first 화면, pager, exact 승인.
- Modify `scripts/publish-ai-record`: 신규 게시 interface를 제거하고 기존 journal status/recover/rollback만 제공.
- Create `package.json`: `npm run ai:review`와 `kbhc.frontendScaffolded=false` tooling marker.
- Modify `scripts/verify`: 신규 파일, 네 hook wiring, timeout, matcher, metadata/hash/index 정합성을 read-only 검증.
- Modify `.gitignore`: atomic event 파일과 hook 임시 파일 제외.
- Modify `tests/test_artifact_contract.py`: record ID와 legacy 이름 경계.
- Create `tests/test_transcript_adapter.py`: adapter version, secure read, format failure, watermark 테스트.
- Create `tests/test_session_records.py`: atomicity, recovery, migration, lifecycle, CAS, event log 테스트.
- Modify `tests/test_export_session.py`: renderer/redaction 회귀만 유지하고 lifecycle CLI 테스트는 이동.
- Modify `tests/test_render_artifact_index.py`: pending metadata/hash/state 필터와 public ledger 회귀.
- Modify `tests/test_publish_ai_record.py`: closed-only 게시, segment filename, published 전이, reconciliation.
- Create `tests/test_review_scanner.py`: deterministic risk finding과 context boundary.
- Create `tests/test_review_publish.py`: transaction idempotency, crash resume, signal rollback.
- Create `tests/test_review_ai_record.py`: TTY flow, candidate selection, reviewer, pager, exact 승인.
- Modify `tests/test_verify.py`: 네 hook과 read-only consistency 검증 회귀.
- Modify `docs/quality/workflow.md`: 자동 후보와 사람 게시의 상태 전이 운영 절차.
- Modify `docs/quality/verification.md`: lifecycle 집중 검증과 브라우저 N/A 근거.
- Modify `AI_USAGE.md`: `npm run ai:review` 단일 사람 절차.
- Modify `docs/superpowers/specs/2026-08-29-session-end-artifact-index-design.md`: 새 lifecycle 설계로 대체됐음을 표시.
- Modify `docs/superpowers/plans/2026-08-29-session-end-artifact-index.md`: 새 구현 계획으로 대체됐음을 표시.

---

### Task 1: Segment Record ID 계약

**Files:**
- Modify: `.codex/hooks/artifact_contract.py:1-28`
- Modify: `tests/test_artifact_contract.py:1-67`

**Interfaces:**
- Produces: `record_id(session_id: str, segment: int) -> str`.
- Produces: `split_record_id(value: object) -> Optional[Tuple[str, int]]`.
- Produces: `artifact_filename(identifier: str) -> str` for legacy public IDs and segmented record IDs.
- Produces: `metadata_filename(record: str) -> str`.
- Produces: `record_id_from_artifact_filename(filename: str) -> Optional[str]`.
- Consumed by: Tasks 3–8.

- [ ] **Step 1: Write failing record contract tests**

Append these tests to `ArtifactContractTests` in `tests/test_artifact_contract.py` and update imports for the named functions:

```python
    def test_record_id_round_trip(self):
        value = artifact_contract.record_id("thr_123.A-b", 7)
        self.assertEqual(value, "thr_123.A-b.s0007")
        self.assertEqual(
            artifact_contract.split_record_id(value),
            ("thr_123.A-b", 7),
        )
        self.assertEqual(
            artifact_contract.artifact_filename(value),
            "codex-session-thr_123.A-b.s0007.md",
        )
        self.assertEqual(
            artifact_contract.metadata_filename(value),
            "codex-session-thr_123.A-b.s0007.json",
        )

    def test_record_id_rejects_segment_boundaries(self):
        for segment in (0, -1, 10000, True):
            with self.subTest(segment=segment):
                with self.assertRaises(ValueError):
                    artifact_contract.record_id("thr_123", segment)
        for value in ("thr_123", "thr_123.s0000", "thr_123.s10000"):
            with self.subTest(value=value):
                self.assertIsNone(artifact_contract.split_record_id(value))

    def test_maximum_session_id_still_has_valid_segment_filename(self):
        session_id = "a" * 128
        record = artifact_contract.record_id(session_id, 9999)
        filename = artifact_contract.artifact_filename(record)
        self.assertEqual(artifact_contract.record_id_from_artifact_filename(filename), record)

    def test_legacy_public_filename_remains_readable(self):
        filename = "codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md"
        self.assertEqual(
            artifact_contract.record_id_from_artifact_filename(filename),
            "01a04c3e-0a24-7e30-a767-64f1e2c4f3ae",
        )
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_artifact_contract -v
```

Expected: `ERROR` or `FAIL` naming missing `record_id`, `split_record_id`, or `metadata_filename`.

- [ ] **Step 3: Implement record contract**

Replace `.codex/hooks/artifact_contract.py` with:

```python
import re
from typing import Optional, Tuple


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
ARTIFACT_FILENAME_PATTERN = re.compile(
    r"^codex-session-([A-Za-z0-9][A-Za-z0-9._-]{0,133})\.md$"
)
RECORD_ID_PATTERN = re.compile(
    r"^(?P<session>[A-Za-z0-9][A-Za-z0-9._-]{0,127})"
    r"\.s(?P<segment>[0-9]{4})$"
)


def safe_session_id(raw: object) -> Optional[str]:
    if not isinstance(raw, str) or not raw:
        return None
    value = re.sub(r"[^A-Za-z0-9._-]", "_", raw)[:128].strip(".")
    if not SESSION_ID_PATTERN.fullmatch(value):
        return None
    return value


def record_id(session_id: str, segment: int) -> str:
    if not SESSION_ID_PATTERN.fullmatch(session_id):
        raise ValueError("invalid_session_id")
    if isinstance(segment, bool) or not isinstance(segment, int) or not 1 <= segment <= 9999:
        raise ValueError("invalid_segment")
    return "{}.s{:04d}".format(session_id, segment)


def split_record_id(value: object) -> Optional[Tuple[str, int]]:
    if not isinstance(value, str):
        return None
    match = RECORD_ID_PATTERN.fullmatch(value)
    if match is None:
        return None
    segment = int(match.group("segment"))
    if not 1 <= segment <= 9999:
        return None
    return match.group("session"), segment


def artifact_filename(identifier: str) -> str:
    if not SESSION_ID_PATTERN.fullmatch(identifier) and split_record_id(identifier) is None:
        raise ValueError("invalid_record_id")
    return "codex-session-{}.md".format(identifier)


def metadata_filename(record: str) -> str:
    if split_record_id(record) is None:
        raise ValueError("invalid_record_id")
    return "codex-session-{}.json".format(record)


def record_id_from_artifact_filename(filename: str) -> Optional[str]:
    match = ARTIFACT_FILENAME_PATTERN.fullmatch(filename)
    if match is None:
        return None
    identifier = match.group(1)
    if SESSION_ID_PATTERN.fullmatch(identifier) or split_record_id(identifier) is not None:
        return identifier
    return None


session_id_from_artifact_filename = record_id_from_artifact_filename
```

- [ ] **Step 4: Run contract tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_artifact_contract -v
```

Expected: all `ArtifactContractTests` pass.

- [ ] **Step 5: Commit contract**

```bash
git add .codex/hooks/artifact_contract.py tests/test_artifact_contract.py
git commit -m "feat(hooks): 세션 record ID 계약 추가"
```

### Task 2: Versioned Transcript Adapter

**Files:**
- Create: `.codex/hooks/transcript_adapter.py`
- Create: `tests/test_transcript_adapter.py`
- Modify: `.codex/hooks/export_session.py:78-207`
- Modify: `tests/test_export_session.py:1-215`

**Interfaces:**
- Produces: `PARSER_VERSION = "codex-rollout-v1"`.
- Produces: `TranscriptError(code: str)` with public `code`.
- Produces: `TranscriptSnapshot(session: SessionData, size: int, mtime_ns: int, sha256: str, last_record_timestamp: Optional[str])`.
- Produces: `read_transcript(path: Path, session_id: str, fallback_model: str) -> TranscriptSnapshot`.
- `export_session.py` consumes `SessionData`, `ToolActivity`, `TurnData` and keeps `redact`, `fenced`, `render_markdown`. Existing Stop CLI stays callable through Task 7.

- [ ] **Step 1: Write failing adapter tests**

Create `tests/test_transcript_adapter.py`:

```python
import hashlib
import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import transcript_adapter


class TranscriptAdapterTests(unittest.TestCase):
    def test_fixture_returns_versioned_watermark_and_digest(self):
        path = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
        snapshot = transcript_adapter.read_transcript(
            path, "session-123", "fallback-model"
        )
        raw = path.read_bytes()
        self.assertEqual(snapshot.sha256, hashlib.sha256(raw).hexdigest())
        self.assertEqual(snapshot.size, len(raw))
        self.assertEqual(snapshot.session.turns[0].turn_id, "turn-1")
        self.assertEqual(transcript_adapter.PARSER_VERSION, "codex-rollout-v1")
        self.assertIsNotNone(snapshot.last_record_timestamp)

    def test_malformed_json_fails_without_partial_session(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_bytes(b'{"type":"session_meta","payload":{}}\n{bad\n')
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "malformed_json")

    def test_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target.jsonl"
            target.write_text("{}\n", encoding="utf-8")
            link = root / "link.jsonl"
            link.symlink_to(target)
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(link, "session-123", "model")
        self.assertEqual(raised.exception.code, "invalid_transcript_file")

    def test_changed_file_is_rejected(self):
        path = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
        before = path.stat()
        changed = mock.Mock(
            st_mode=before.st_mode,
            st_ino=before.st_ino,
            st_size=before.st_size + 1,
            st_mtime_ns=before.st_mtime_ns + 1,
        )
        with mock.patch.object(
            transcript_adapter.os,
            "fstat",
            side_effect=[before, changed],
        ):
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "transcript_changed")

    def test_unknown_optional_record_is_ignored(self):
        source = (ROOT / "tests" / "fixtures" / "codex-rollout.jsonl").read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_bytes(source + b'{"type":"future_optional","payload":{"value":1}}\n')
            snapshot = transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual([turn.turn_id for turn in snapshot.session.turns], ["turn-1", "turn-2"])

    def test_missing_session_boundary_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_text('{"type":"future_optional","payload":{}}\n', encoding="utf-8")
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "missing_session_meta")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run adapter tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_transcript_adapter -v
```

Expected: import failure for `transcript_adapter`.

- [ ] **Step 3: Create secure adapter**

Create `.codex/hooks/transcript_adapter.py` with the existing visible-record parser moved from `export_session.py` and this read boundary:

```python
import hashlib
import json
import os
import stat
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set


PARSER_VERSION = "codex-rollout-v1"


class TranscriptError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass
class ToolActivity:
    call_id: str
    name: str
    input_text: str
    output_text: str = ""
    status: str = ""


@dataclass
class TurnData:
    turn_id: str
    prompts: List[str] = field(default_factory=list)
    tools: List[ToolActivity] = field(default_factory=list)
    responses: List[str] = field(default_factory=list)


@dataclass
class SessionData:
    session_id: str
    model: str
    started_at: str
    cwd: str
    turns: List[TurnData] = field(default_factory=list)


@dataclass(frozen=True)
class TranscriptSnapshot:
    session: SessionData
    size: int
    mtime_ns: int
    sha256: str
    last_record_timestamp: Optional[str]


def extract_visible_text(content: object, allowed_types: Set[str]) -> str:
    parts = []
    if not isinstance(content, list):
        return ""
    for item in content:
        if isinstance(item, dict) and item.get("type") in allowed_types:
            text = item.get("text")
            if isinstance(text, str) and text:
                parts.append(text)
    return "\n".join(parts)


def parse_rollout_bytes(raw: bytes, session_id: str, fallback_model: str):
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise TranscriptError("invalid_utf8") from error
    records = []
    timestamps = []
    for line_number, line in enumerate(text.splitlines(), 1):
        try:
            record = json.loads(line)
        except (json.JSONDecodeError, TypeError) as error:
            raise TranscriptError("malformed_json") from error
        if isinstance(record, dict):
            records.append(record)
            if isinstance(record.get("timestamp"), str):
                timestamps.append(record["timestamp"])
    if not any(record.get("type") == "session_meta" for record in records):
        raise TranscriptError("missing_session_meta")
    session = parse_supported_records(records, session_id, fallback_model)
    return session, max(timestamps) if timestamps else None


def read_transcript(path: Path, session_id: str, fallback_model: str) -> TranscriptSnapshot:
    no_follow = getattr(os, "O_NOFOLLOW", None)
    if no_follow is None:
        raise TranscriptError("no_follow_unsupported")
    flags = os.O_RDONLY | no_follow | getattr(os, "O_CLOEXEC", 0)
    try:
        descriptor = os.open(str(path), flags)
    except OSError as error:
        raise TranscriptError("invalid_transcript_file") from error
    try:
        before = os.fstat(descriptor)
        if not stat.S_ISREG(before.st_mode):
            raise TranscriptError("invalid_transcript_file")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1024 * 1024)
            if not chunk:
                break
            chunks.append(chunk)
        after = os.fstat(descriptor)
    finally:
        os.close(descriptor)
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (
        after.st_ino,
        after.st_size,
        after.st_mtime_ns,
    ):
        raise TranscriptError("transcript_changed")
    raw = b"".join(chunks)
    if len(raw) != after.st_size:
        raise TranscriptError("transcript_changed")
    session, last_timestamp = parse_rollout_bytes(raw, session_id, fallback_model)
    return TranscriptSnapshot(
        session=session,
        size=after.st_size,
        mtime_ns=after.st_mtime_ns,
        sha256=hashlib.sha256(raw).hexdigest(),
        last_record_timestamp=last_timestamp,
    )
```

Add this path-independent parser below `extract_visible_text`:

```python
def parse_supported_records(records, session_id, fallback_model):
    session = SessionData(session_id, fallback_model, "unknown", "unknown")
    turns_by_id = {}
    tools_by_call_id = {}

    def get_turn(raw_turn_id):
        turn_id = raw_turn_id if isinstance(raw_turn_id, str) and raw_turn_id else "ungrouped"
        if turn_id not in turns_by_id:
            turns_by_id[turn_id] = TurnData(turn_id)
            session.turns.append(turns_by_id[turn_id])
        return turns_by_id[turn_id]

    for record in records:
        payload = record.get("payload")
        if not isinstance(payload, dict):
            continue
        if record.get("type") == "session_meta":
            started = payload.get("timestamp") or record.get("timestamp")
            if isinstance(started, str):
                session.started_at = started
            if isinstance(payload.get("cwd"), str):
                session.cwd = payload["cwd"]
            continue
        if record.get("type") == "turn_context":
            get_turn(payload.get("turn_id"))
            if isinstance(payload.get("model"), str) and payload["model"]:
                session.model = payload["model"]
            continue
        if record.get("type") != "response_item":
            continue
        metadata = payload.get("internal_chat_message_metadata_passthrough")
        metadata = metadata if isinstance(metadata, dict) else {}
        turn = get_turn(metadata.get("turn_id"))
        if payload.get("type") == "message":
            if payload.get("role") == "user":
                text = extract_visible_text(payload.get("content"), {"input_text"})
                if text:
                    turn.prompts.append(text)
            elif payload.get("role") == "assistant" and payload.get("phase") == "final_answer":
                text = extract_visible_text(payload.get("content"), {"output_text"})
                if text:
                    turn.responses.append(text)
        elif payload.get("type") == "custom_tool_call" and isinstance(payload.get("call_id"), str):
            tool = ToolActivity(
                payload["call_id"],
                payload.get("name") if isinstance(payload.get("name"), str) else "unknown",
                payload.get("input") if isinstance(payload.get("input"), str) else "",
                status=payload.get("status") if isinstance(payload.get("status"), str) else "",
            )
            turn.tools.append(tool)
            tools_by_call_id[tool.call_id] = tool
        elif payload.get("type") == "custom_tool_call_output" and isinstance(payload.get("call_id"), str):
            tool = tools_by_call_id.get(payload["call_id"])
            if tool:
                tool.output_text = extract_visible_text(payload.get("output"), {"input_text", "output_text"})
    return session
```

- [ ] **Step 4: Reduce exporter to rendering responsibility**

In `.codex/hooks/export_session.py`, import adapter types and replace `parse_rollout` with a compatibility wrapper used by existing tests:

```python
from transcript_adapter import (
    SessionData,
    ToolActivity,
    TurnData,
    read_transcript,
)


def parse_rollout(path, session_id, fallback_model, on_warning=None):
    return read_transcript(path, session_id, fallback_model).session
```

Keep secret patterns, `redact`, `fenced`, `render_markdown`, `run_hook`, CLI argument parsing, and `main`. In the compatibility `run_hook`, replace the old `parse_rollout(...)` call with:

```python
        snapshot = read_transcript(
            transcript,
            session_id,
            model if isinstance(model, str) and model else "unknown",
        )
        rendered = render_markdown(snapshot.session)
```

This keeps current Stop wiring operational until Task 8 atomically switches all events to `session_hook.py`. Task 8 then removes old persistence and CLI code from exporter.

Update `test_malformed_line_is_skipped` in `tests/test_export_session.py` to assert `TranscriptError("malformed_json")`, matching the preserve-on-failure contract.

- [ ] **Step 5: Run adapter and renderer tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_transcript_adapter tests.test_export_session.RedactionAndRenderTests tests.test_export_session.ParseRolloutTests -v
```

Expected: all named suites pass; malformed JSON produces no partial session.

- [ ] **Step 6: Commit adapter boundary**

```bash
git add .codex/hooks/transcript_adapter.py .codex/hooks/export_session.py tests/test_transcript_adapter.py tests/test_export_session.py
git commit -m "refactor(hooks): transcript adapter 경계 분리"
```

### Task 3: Atomic Record Storage와 Recovery

**Files:**
- Create: `.codex/hooks/session_records.py`
- Create: `tests/test_session_records.py`

**Interfaces:**
- Produces: `RecordRef(session_id, generation, segment, revision, state)` with `record_id` property.
- Produces: `RecordStore(repo_root: Path, clock=utc_now)`.
- Produces: `RecordStore.atomic_write_bytes(path: Path, content: bytes) -> None`.
- Produces: `RecordStore.commit_snapshot(base: RecordRef, markdown: bytes, metadata_fields: dict) -> RecordRef`.
- Produces: `RecordStore.recover_record(record: str) -> str` returning `canonical`, `previous`, or raising `RecordError`.
- Produces: `write_event(...) -> Path`, one atomic one-line JSONL file.
- Consumed by: Tasks 4, 5, 7.

- [ ] **Step 1: Write failing storage tests**

Create `tests/test_session_records.py` with module setup and these initial tests:

```python
import hashlib
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import session_records


class RecordStorageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = session_records.RecordStore(
            self.root,
            clock=lambda: "2026-08-29T12:00:00Z",
        )

    def tearDown(self):
        self.temporary.cleanup()

    def test_atomic_bytes_are_private_and_complete(self):
        path = self.root / ".codex" / "review-pending" / "value.json"
        self.store.atomic_write_bytes(path, b'{"ok":true}\n')
        self.assertEqual(path.read_bytes(), b'{"ok":true}\n')
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(list(path.parent.glob("*.tmp")), [])

    def test_metadata_is_commit_marker_for_snapshot(self):
        base = self.store.initialize_session("session-123")
        committed = self.store.commit_snapshot(
            base,
            b"# candidate\n",
            {
                "last_turn_id": "turn-1",
                "snapshot_kind": "prompt_minimum",
                "last_hook_event": "UserPromptSubmit",
                "parser_version": "codex-rollout-v1",
                "transcript": None,
            },
        )
        metadata = self.store.read_metadata(committed.record_id)
        self.assertEqual(metadata["revision"], 1)
        self.assertEqual(metadata["state"], "pending")
        self.assertEqual(
            metadata["artifact_sha256"],
            hashlib.sha256(b"# candidate\n").hexdigest(),
        )
        self.assertEqual(
            set(metadata),
            {"schema_version", "parser_version", "state", "session_id", "record_id", "segment", "generation", "revision", "last_turn_id", "snapshot_kind", "last_hook_event", "last_event_key", "transcript", "artifact_sha256", "updated_at", "last_hook_status", "last_error"},
        )

    def test_previous_slot_recovers_interrupted_commit(self):
        base = self.store.initialize_session("session-123")
        committed = self.store.commit_snapshot(
            base,
            b"first\n",
            {"last_turn_id": "turn-1", "snapshot_kind": "prompt_minimum", "last_hook_event": "UserPromptSubmit", "parser_version": "codex-rollout-v1", "transcript": None},
        )
        paths = self.store.paths(committed.record_id)
        paths.previous.write_bytes(paths.markdown.read_bytes())
        paths.markdown.write_bytes(b"corrupt\n")
        self.assertEqual(self.store.recover_record(committed.record_id), "previous")
        self.assertEqual(paths.markdown.read_bytes(), b"first\n")

    def test_event_log_has_only_contract_fields(self):
        path = session_records.write_event(
            self.root,
            event="Stop",
            session_id="session-123",
            turn_id="turn-1",
            status="error",
            error="malformed_json",
            timestamp="2026-08-29T12:00:00Z",
            nonce="abc123",
        )
        event = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(
            event,
            {"event": "Stop", "session_id": "session-123", "turn_id": "turn-1", "status": "error", "error": "malformed_json", "timestamp": "2026-08-29T12:00:00Z"},
        )

    def test_event_log_rejects_path_bearing_error_text(self):
        path = session_records.write_event(
            self.root,
            event="Stop",
            session_id="session-123",
            turn_id="turn-1",
            status="error",
            error="failed at /Users/private/transcript.jsonl",
            timestamp="2026-08-29T12:00:00Z",
            nonce="safe456",
        )
        content = path.read_text(encoding="utf-8")
        self.assertIn('"error":"invalid_error_code"', content)
        self.assertNotIn("/Users/private", content)
```

- [ ] **Step 2: Run storage tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records.RecordStorageTests -v
```

Expected: import failure for `session_records`.

- [ ] **Step 3: Implement storage primitives**

Create `.codex/hooks/session_records.py` with these public models and primitives:

```python
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
import re
import secrets
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Iterator, Optional

from artifact_contract import artifact_filename, metadata_filename, record_id


SCHEMA_VERSION = 1
LOCK_TIMEOUT_SECONDS = 1.0


class RecordError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class RecordRef:
    session_id: str
    generation: int
    segment: int
    revision: int
    state: str

    @property
    def record_id(self) -> str:
        return record_id(self.session_id, self.segment)


@dataclass(frozen=True)
class RecordPaths:
    markdown: Path
    metadata: Path
    previous: Path


def utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Dict[str, object]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def safe_log_token(value, nullable=False):
    if value is None and nullable:
        return None
    if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9._-]{1,128}", value):
        return value
    return None if nullable else "unknown"


def write_event(repo_root, event, session_id, turn_id, status, error, timestamp=None, nonce=None):
    safe_status = status if status in {"ok", "error", "stale"} else "error"
    safe_error = error if error is None or (isinstance(error, str) and re.fullmatch(r"[a-z0-9_]{1,64}", error)) else "invalid_error_code"
    payload = {"event": safe_log_token(event), "session_id": safe_log_token(session_id), "turn_id": safe_log_token(turn_id, nullable=True), "status": safe_status, "error": safe_error, "timestamp": timestamp or utc_now()}
    directory = repo_root / ".codex" / "hooks" / "session-record-events"
    name = "{}-{}-{}.jsonl".format(payload["timestamp"].replace(":", ""), os.getpid(), nonce or secrets.token_hex(8))
    store = RecordStore(repo_root)
    path = directory / name
    store.atomic_write_bytes(path, canonical_json(payload))
    return path


class RecordStore:
    def __init__(self, repo_root: Path, clock: Callable[[], str] = utc_now):
        self.repo_root = repo_root
        self.pending = repo_root / ".codex" / "review-pending"
        self.clock = clock

    def paths(self, record: str) -> RecordPaths:
        return RecordPaths(
            self.pending / artifact_filename(record),
            self.pending / metadata_filename(record),
            self.pending / ("." + artifact_filename(record)[:-3] + ".previous.md"),
        )

    def manifest_path(self, session_id: str) -> Path:
        return self.pending / "sessions" / (session_id + ".json")

    def atomic_write_bytes(self, path: Path, content: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary = tempfile.mkstemp(prefix="." + path.name + ".", suffix=".tmp", dir=str(path.parent))
        try:
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                descriptor = -1
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
            temporary = ""
            directory_fd = os.open(str(path.parent), os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        finally:
            if descriptor >= 0:
                os.close(descriptor)
            if temporary:
                try:
                    os.unlink(temporary)
                except FileNotFoundError:
                    pass

    @contextlib.contextmanager
    def session_lock(self, session_id: str) -> Iterator[None]:
        lock_path = self.pending / "sessions" / (session_id + ".lock")
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        with lock_path.open("a+") as stream:
            deadline = time.monotonic() + LOCK_TIMEOUT_SECONDS
            while True:
                try:
                    fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise RecordError("lock_timeout")
                    time.sleep(0.05)
            try:
                yield
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
```

Add these exact methods to `RecordStore`:

```python
    def read_json(self, path):
        if path.is_symlink() or not path.is_file():
            raise RecordError("invalid_state_file")
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            raise RecordError("invalid_state_file") from error
        if not isinstance(value, dict) or value.get("schema_version") != SCHEMA_VERSION:
            raise RecordError("invalid_state_file")
        return value

    def read_manifest(self, session_id):
        return self.read_json(self.manifest_path(session_id))

    def read_metadata(self, record):
        return self.read_json(self.paths(record).metadata)

    def write_manifest_ref(self, ref):
        value = {
            "schema_version": SCHEMA_VERSION,
            "session_id": ref.session_id,
            "generation": ref.generation,
            "current_segment": ref.segment,
            "current_record_id": ref.record_id,
            "revision": ref.revision,
            "updated_at": self.clock(),
        }
        self.atomic_write_bytes(self.manifest_path(ref.session_id), canonical_json(value))

    def initialize_session(self, session_id):
        with self.session_lock(session_id):
            path = self.manifest_path(session_id)
            if path.exists():
                manifest = self.read_manifest(session_id)
                state = "pending"
                metadata_path = self.paths(manifest["current_record_id"]).metadata
                if metadata_path.exists():
                    state = self.read_json(metadata_path)["state"]
                return RecordRef(session_id, manifest["generation"], manifest["current_segment"], manifest["revision"], state)
            ref = RecordRef(session_id, 1, 1, 0, "pending")
            self.write_manifest_ref(ref)
            return ref

    def current_ref(self, session_id, migrate=False):
        if migrate:
            self.migrate_legacy(session_id)
        path = self.manifest_path(session_id)
        if not path.exists():
            return None
        manifest = self.read_manifest(session_id)
        metadata_path = self.paths(manifest["current_record_id"]).metadata
        state = self.read_json(metadata_path)["state"] if metadata_path.exists() else "pending"
        return RecordRef(session_id, manifest["generation"], manifest["current_segment"], manifest["revision"], state)

    def _same_base(self, current, base):
        return (
            current.session_id,
            current.generation,
            current.segment,
            current.revision,
            current.state,
        ) == (
            base.session_id,
            base.generation,
            base.segment,
            base.revision,
            base.state,
        )

    def commit_snapshot(self, base, markdown, metadata_fields):
        with self.session_lock(base.session_id):
            current = self.current_ref(base.session_id, migrate=False)
            if current is None or not self._same_base(current, base) or current.state != "pending":
                raise RecordError("stale_revision")
            paths = self.paths(base.record_id)
            old_markdown = paths.markdown.read_bytes() if paths.markdown.is_file() else None
            old_metadata = paths.metadata.read_bytes() if paths.metadata.is_file() else None
            if old_metadata is not None:
                previous_metadata = json.loads(old_metadata.decode("utf-8"))
                event_key = metadata_fields.get("last_event_key")
                if event_key and previous_metadata.get("last_event_key") == event_key:
                    return current
            revision = base.revision + 1
            transcript = metadata_fields.get("transcript") or {
                "size": None,
                "mtime_ns": None,
                "observed_at": None,
                "last_record_timestamp": None,
                "sha256": None,
            }
            metadata = {
                "schema_version": SCHEMA_VERSION,
                "parser_version": metadata_fields["parser_version"],
                "state": "pending",
                "session_id": base.session_id,
                "record_id": base.record_id,
                "segment": base.segment,
                "generation": base.generation,
                "revision": revision,
                "last_turn_id": metadata_fields.get("last_turn_id"),
                "snapshot_kind": metadata_fields["snapshot_kind"],
                "last_hook_event": metadata_fields["last_hook_event"],
                "last_event_key": metadata_fields.get("last_event_key"),
                "transcript": transcript,
                "artifact_sha256": hashlib.sha256(markdown).hexdigest(),
                "updated_at": self.clock(),
                "last_hook_status": "ok",
                "last_error": None,
            }
            try:
                if old_markdown is not None:
                    self.atomic_write_bytes(paths.previous, old_markdown)
                self.atomic_write_bytes(paths.markdown, markdown)
                self.atomic_write_bytes(paths.metadata, canonical_json(metadata))
                committed = RecordRef(base.session_id, base.generation, base.segment, revision, "pending")
                self.write_manifest_ref(committed)
            except (OSError, RecordError):
                if old_markdown is None:
                    try:
                        paths.markdown.unlink()
                    except FileNotFoundError:
                        pass
                else:
                    self.atomic_write_bytes(paths.markdown, old_markdown)
                if old_metadata is None:
                    try:
                        paths.metadata.unlink()
                    except FileNotFoundError:
                        pass
                else:
                    self.atomic_write_bytes(paths.metadata, old_metadata)
                raise
            try:
                paths.previous.unlink()
            except FileNotFoundError:
                pass
            return committed

    def recover_record(self, record):
        paths = self.paths(record)
        metadata = self.read_metadata(record)
        expected = metadata["artifact_sha256"]
        if paths.markdown.is_file() and hashlib.sha256(paths.markdown.read_bytes()).hexdigest() == expected:
            try:
                paths.previous.unlink()
            except FileNotFoundError:
                pass
            return "canonical"
        if paths.previous.is_file() and hashlib.sha256(paths.previous.read_bytes()).hexdigest() == expected:
            self.atomic_write_bytes(paths.markdown, paths.previous.read_bytes())
            paths.previous.unlink()
            return "previous"
        raise RecordError("snapshot_hash_mismatch")
```

- [ ] **Step 4: Add injected failure coverage**

Append this test to `RecordStorageTests`:

```python
    def test_metadata_replace_failure_restores_previous_snapshot(self):
        base = self.store.initialize_session("session-123")
        first = self.store.commit_snapshot(
            base,
            b"first\n",
            {"last_turn_id": "turn-1", "snapshot_kind": "prompt_minimum", "last_hook_event": "UserPromptSubmit", "parser_version": "codex-rollout-v1", "transcript": None},
        )
        original_replace = session_records.os.replace

        def fail_metadata(source, destination):
            if str(destination).endswith(".json") and "sessions" not in str(destination):
                raise OSError("injected metadata failure")
            return original_replace(source, destination)

        with mock.patch.object(session_records.os, "replace", side_effect=fail_metadata):
            with self.assertRaises(OSError):
                self.store.commit_snapshot(
                    first,
                    b"second\n",
                    {"last_turn_id": "turn-2", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None},
                )
        self.assertEqual(self.store.paths(first.record_id).markdown.read_bytes(), b"first\n")
        self.assertEqual(self.store.read_metadata(first.record_id)["revision"], 1)
```

- [ ] **Step 5: Run storage tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records.RecordStorageTests -v
```

Expected: private atomic files, commit marker, recovery, failure restoration, event schema tests pass.

- [ ] **Step 6: Commit storage layer**

```bash
git add .codex/hooks/session_records.py tests/test_session_records.py
git commit -m "feat(hooks): 세션 기록 원자 저장소 추가"
```

### Task 4: Lifecycle State Machine과 Revision CAS

**Files:**
- Modify: `.codex/hooks/session_records.py`
- Modify: `tests/test_session_records.py`

**Interfaces:**
- Produces: `record_prompt(session_id, turn_id, prompt_markdown, parser_version) -> RecordRef`.
- Produces: `begin_prompt(session_id, turn_id) -> Tuple[RecordRef, str, str, Optional[bytes]]`.
- Produces: `commit_prompt(base, event_key, snapshot_kind, markdown, turn_id, parser_version) -> RecordRef`.
- Produces: `begin_stop(session_id) -> RecordRef`.
- Produces: `commit_stop(base, turn_id, markdown, transcript_fields, parser_version) -> RecordRef`.
- Produces: `record_stop_error(base, turn_id, code) -> str` returning `error` or `stale`.
- Produces: `session_start(session_id, source) -> Optional[RecordRef]`.
- Produces: `session_end(session_id) -> Optional[RecordRef]`.
- Produces: `mark_published(record, expected_sha256) -> RecordRef`.
- Produces: `migrate_legacy(session_id) -> Optional[RecordRef]`.

- [ ] **Step 1: Write lifecycle transition tests**

Append `LifecycleTests` to `tests/test_session_records.py`:

```python
class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = session_records.RecordStore(self.root, clock=lambda: "2026-08-29T12:00:00Z")

    def tearDown(self):
        self.temporary.cleanup()

    def test_prompt_stop_end_resume_clear_flow(self):
        prompt = self.store.record_prompt("session-123", "turn-1", b"prompt\n", "codex-rollout-v1")
        self.assertEqual((prompt.segment, prompt.revision, prompt.state), (1, 1, "pending"))
        base = self.store.begin_stop("session-123")
        stopped = self.store.commit_stop(base, "turn-1", b"complete\n", {"size": 9, "mtime_ns": 10, "observed_at": "2026-08-29T12:00:00Z", "last_record_timestamp": "2026-08-29T11:59:59Z", "sha256": "a" * 64}, "codex-rollout-v1")
        self.assertEqual((stopped.revision, stopped.state), (2, "pending"))
        closed = self.store.session_end("session-123")
        self.assertEqual((closed.revision, closed.state), (3, "closed"))
        resumed = self.store.session_start("session-123", "resume")
        self.assertEqual((resumed.revision, resumed.state), (4, "pending"))
        self.store.session_start("session-123", "clear")
        next_prompt = self.store.record_prompt("session-123", "turn-2", b"new topic\n", "codex-rollout-v1")
        self.assertEqual((next_prompt.segment, next_prompt.generation), (2, 2))
        first = self.store.read_metadata("session-123.s0001")
        self.assertEqual(first["state"], "closed")

    def test_old_stop_cannot_overwrite_new_prompt(self):
        self.store.record_prompt("session-123", "turn-1", b"first\n", "codex-rollout-v1")
        old_base = self.store.begin_stop("session-123")
        newest = self.store.record_prompt("session-123", "turn-2", b"second\n", "codex-rollout-v1")
        with self.assertRaises(session_records.RecordError) as raised:
            self.store.commit_stop(old_base, "turn-1", b"stale\n", None, "codex-rollout-v1")
        self.assertEqual(raised.exception.code, "stale_revision")
        self.assertEqual(self.store.paths(newest.record_id).markdown.read_bytes(), b"second\n")

    def test_parser_error_preserves_snapshot_and_advances_error_revision(self):
        current = self.store.record_prompt("session-123", "turn-1", b"valid\n", "codex-rollout-v1")
        base = self.store.begin_stop("session-123")
        status = self.store.record_stop_error(base, "turn-1", "malformed_json")
        metadata = self.store.read_metadata(current.record_id)
        self.assertEqual(status, "error")
        self.assertEqual(metadata["revision"], 2)
        self.assertEqual(metadata["last_hook_status"], "error")
        self.assertEqual(metadata["last_error"]["code"], "malformed_json")
        self.assertEqual(self.store.paths(current.record_id).markdown.read_bytes(), b"valid\n")

    def test_published_record_is_never_reopened(self):
        current = self.store.record_prompt("session-123", "turn-1", b"valid\n", "codex-rollout-v1")
        closed = self.store.session_end("session-123")
        digest = self.store.read_metadata(closed.record_id)["artifact_sha256"]
        self.store.mark_published(closed.record_id, digest)
        reopened = self.store.session_start("session-123", "resume")
        self.assertEqual(reopened.segment, 2)
        self.assertEqual(self.store.read_metadata(current.record_id)["state"], "published")

    def test_startup_recovers_previous_slot_and_manifest_revision(self):
        current = self.store.record_prompt("session-123", "turn-1", b"valid\n", "codex-rollout-v1")
        paths = self.store.paths(current.record_id)
        paths.previous.write_bytes(paths.markdown.read_bytes())
        paths.markdown.write_bytes(b"interrupted\n")
        manifest = self.store.read_manifest("session-123")
        manifest["revision"] = 0
        self.store.atomic_write_bytes(self.store.manifest_path("session-123"), session_records.canonical_json(manifest))
        repaired = self.store.session_start("session-123", "startup")
        self.assertEqual(paths.markdown.read_bytes(), b"valid\n")
        self.assertEqual(repaired.revision, 1)

    def test_repeated_stop_and_clear_events_are_idempotent(self):
        self.store.record_prompt("session-123", "turn-1", b"prompt\n", "codex-rollout-v1")
        base = self.store.begin_stop("session-123")
        first = self.store.commit_stop(base, "turn-1", b"complete\n", None, "codex-rollout-v1")
        repeated_base = self.store.begin_stop("session-123")
        repeated = self.store.commit_stop(repeated_base, "turn-1", b"complete\n", None, "codex-rollout-v1")
        self.assertEqual(repeated.revision, first.revision)
        first_clear = self.store.session_start("session-123", "clear")
        repeated_clear = self.store.session_start("session-123", "clear")
        self.assertEqual((first_clear.segment, first_clear.generation), (2, 2))
        self.assertEqual(repeated_clear, first_clear)

    def test_physical_sessions_use_independent_manifests(self):
        first = self.store.record_prompt("session-a", "turn-1", b"a\n", "codex-rollout-v1")
        second = self.store.record_prompt("session-b", "turn-1", b"b\n", "codex-rollout-v1")
        self.assertNotEqual(self.store.manifest_path(first.session_id), self.store.manifest_path(second.session_id))
        self.assertEqual(self.store.paths(first.record_id).markdown.read_bytes(), b"a\n")
        self.assertEqual(self.store.paths(second.record_id).markdown.read_bytes(), b"b\n")
```

- [ ] **Step 2: Run lifecycle tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records.LifecycleTests -v
```

Expected: missing lifecycle methods.

- [ ] **Step 3: Implement transition methods under session lock**

Add these transition rules to `RecordStore`:

```python
    def begin_stop(self, session_id):
        self.migrate_legacy(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or current.state != "pending":
                raise RecordError("no_pending_record")
            return current

    def commit_stop(self, base, turn_id, markdown, transcript_fields, parser_version):
        fields = {
            "last_turn_id": turn_id,
            "snapshot_kind": "turn_complete",
            "last_hook_event": "Stop",
            "last_event_key": "Stop:{}:{}".format(base.session_id, turn_id or "unknown"),
            "parser_version": parser_version,
            "transcript": transcript_fields,
        }
        return self.commit_snapshot(base, markdown, fields)

    def record_stop_error(self, base, turn_id, code):
        with self.session_lock(base.session_id):
            current = self.current_ref(base.session_id, migrate=False)
            if current != base:
                return "stale"
            metadata = self.read_metadata(base.record_id)
            metadata_path = self.paths(base.record_id).metadata
            manifest_path = self.manifest_path(base.session_id)
            old_metadata = metadata_path.read_bytes()
            old_manifest = manifest_path.read_bytes()
            metadata.update({
                "revision": base.revision + 1,
                "last_turn_id": turn_id or metadata.get("last_turn_id"),
                "last_hook_event": "Stop",
                "last_event_key": "Stop:{}:{}".format(base.session_id, turn_id or "unknown"),
                "last_hook_status": "error",
                "last_error": {"code": code, "message": code},
                "updated_at": self.clock(),
            })
            try:
                self.atomic_write_bytes(metadata_path, canonical_json(metadata))
                self.write_manifest_ref(RecordRef(base.session_id, base.generation, base.segment, base.revision + 1, base.state))
            except OSError:
                self.atomic_write_bytes(metadata_path, old_metadata)
                self.atomic_write_bytes(manifest_path, old_manifest)
                raise
            return "error"
```

Add these methods. Also import `hmac`.

```python
    def _rewrite_state(self, current, state, event, status="ok", error=None):
        metadata = self.read_metadata(current.record_id)
        metadata_path = self.paths(current.record_id).metadata
        manifest_path = self.manifest_path(current.session_id)
        old_metadata = metadata_path.read_bytes()
        old_manifest = manifest_path.read_bytes()
        revision = current.revision + 1
        metadata.update({
            "state": state,
            "revision": revision,
            "last_hook_event": event,
            "last_hook_status": status,
            "last_error": error,
            "updated_at": self.clock(),
        })
        updated = RecordRef(current.session_id, current.generation, current.segment, revision, state)
        try:
            self.atomic_write_bytes(metadata_path, canonical_json(metadata))
            self.write_manifest_ref(updated)
        except OSError:
            self.atomic_write_bytes(metadata_path, old_metadata)
            self.atomic_write_bytes(manifest_path, old_manifest)
            raise
        return updated

    def begin_prompt(self, session_id, turn_id):
        self.migrate_legacy(session_id)
        if not self.manifest_path(session_id).exists():
            self.initialize_session(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or current.state != "pending":
                raise RecordError("no_pending_record")
            event_key = "UserPromptSubmit:{}:{}:{}".format(session_id, turn_id or "unknown", current.segment)
            metadata_path = self.paths(current.record_id).metadata
            if metadata_path.exists():
                metadata = self.read_json(metadata_path)
                if metadata.get("last_event_key") == event_key:
                    return current, event_key, "duplicate", self.paths(current.record_id).markdown.read_bytes()
                snapshot_kind = "prompt_provisional"
                previous = self.paths(current.record_id).markdown.read_bytes()
            else:
                snapshot_kind = "prompt_minimum"
                previous = None
            return current, event_key, snapshot_kind, previous

    def commit_prompt(self, base, event_key, snapshot_kind, prompt_markdown, turn_id, parser_version):
        if snapshot_kind == "duplicate":
            return base
        return self.commit_snapshot(
            base,
            prompt_markdown,
            {
                "last_turn_id": turn_id,
                "snapshot_kind": snapshot_kind,
                "last_hook_event": "UserPromptSubmit",
                "last_event_key": event_key,
                "parser_version": parser_version,
                "transcript": None,
            },
        )

    def record_prompt(self, session_id, turn_id, prompt_markdown, parser_version):
        base, event_key, snapshot_kind, _ = self.begin_prompt(session_id, turn_id)
        return self.commit_prompt(base, event_key, snapshot_kind, prompt_markdown, turn_id, parser_version)

    def session_end(self, session_id):
        self.migrate_legacy(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None:
                return None
            if not self.paths(current.record_id).metadata.exists():
                return None
            if current.state == "closed":
                return current
            if current.state == "published":
                return current
            return self._rewrite_state(current, "closed", "SessionEnd")

    def _reserve_next(self, current):
        next_segment = current.segment + 1
        if next_segment > 9999:
            raise RecordError("segment_exhausted")
        reserved = RecordRef(current.session_id, current.generation + 1, next_segment, 0, "pending")
        self.write_manifest_ref(reserved)
        return reserved

    def session_start(self, session_id, source):
        if source not in {"startup", "resume", "clear", "compact"}:
            raise RecordError("invalid_session_source")
        self.migrate_legacy(session_id)
        if not self.manifest_path(session_id).exists():
            return self.initialize_session(session_id)
        self.reconcile_session(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if source in {"startup", "compact"}:
                return current
            metadata_exists = current is not None and self.paths(current.record_id).metadata.exists()
            if source == "clear":
                if not metadata_exists:
                    return current
                if current.state == "pending":
                    current = self._rewrite_state(current, "closed", "SessionStart")
                return self._reserve_next(current)
            if not metadata_exists:
                return current
            if current.state == "closed":
                return self._rewrite_state(current, "pending", "SessionStart")
            if current.state == "published":
                return self._reserve_next(current)
            return current

    def reconcile_session(self, session_id):
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or not self.paths(current.record_id).metadata.exists():
                return current
            self.recover_record(current.record_id)
            metadata = self.read_metadata(current.record_id)
            repaired = RecordRef(
                session_id,
                metadata["generation"],
                metadata["segment"],
                metadata["revision"],
                metadata["state"],
            )
            manifest = self.read_manifest(session_id)
            if (
                manifest["generation"],
                manifest["current_segment"],
                manifest["revision"],
            ) != (repaired.generation, repaired.segment, repaired.revision):
                self.write_manifest_ref(repaired)
            return repaired

    def mark_published(self, record, expected_sha256):
        parsed = split_record_id(record)
        if parsed is None:
            raise RecordError("invalid_record_id")
        session_id, _ = parsed
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            return self.mark_published_locked(current, record, expected_sha256)

    def mark_published_locked(self, current, record, expected_sha256):
        if current is None or current.record_id != record or current.state != "closed":
            raise RecordError("record_not_closed")
        metadata = self.read_metadata(record)
        if not hmac.compare_digest(metadata.get("artifact_sha256", ""), expected_sha256):
            raise RecordError("snapshot_digest_mismatch")
        return self._rewrite_state(current, "published", "Publish")
```

Add `split_record_id` to the artifact contract import. `record_prompt` deliberately releases the lock before `commit_snapshot`; the latter rechecks the captured revision, so a concurrent state change becomes `stale_revision`.

- [ ] **Step 4: Add byte-preserving migration test and implementation**

Append:

```python
    def test_legacy_candidate_migrates_to_segment_one_without_byte_change(self):
        pending = self.root / ".codex" / "review-pending"
        pending.mkdir(parents=True)
        legacy = pending / "codex-session-session-123.md"
        legacy.write_bytes(b"legacy bytes\n")
        migrated = self.store.migrate_legacy("session-123")
        self.assertEqual(migrated.record_id, "session-123.s0001")
        self.assertFalse(legacy.exists())
        self.assertEqual(self.store.paths(migrated.record_id).markdown.read_bytes(), b"legacy bytes\n")
        self.assertEqual(self.store.read_metadata(migrated.record_id)["state"], "pending")
```

Add:

```python
    def migrate_legacy(self, session_id):
        legacy = self.pending / artifact_filename(session_id)
        first_record = record_id(session_id, 1)
        target = self.paths(first_record)
        with self.session_lock(session_id):
            if not legacy.exists():
                if self.manifest_path(session_id).exists():
                    return self.current_ref(session_id, migrate=False)
                return None
            if target.markdown.exists() or target.metadata.exists():
                raise RecordError("legacy_conflict")
            raw = legacy.read_bytes()
            target.markdown.parent.mkdir(parents=True, exist_ok=True)
            os.replace(str(legacy), str(target.markdown))
            ref = RecordRef(session_id, 1, 1, 0, "pending")
            metadata = {
                "schema_version": SCHEMA_VERSION,
                "parser_version": "legacy-flat-v1",
                "state": "pending",
                "session_id": session_id,
                "record_id": first_record,
                "segment": 1,
                "generation": 1,
                "revision": 0,
                "last_turn_id": None,
                "snapshot_kind": "turn_complete",
                "last_hook_event": "Migration",
                "last_event_key": None,
                "transcript": {"size": None, "mtime_ns": None, "observed_at": None, "last_record_timestamp": None, "sha256": None},
                "artifact_sha256": hashlib.sha256(raw).hexdigest(),
                "updated_at": self.clock(),
                "last_hook_status": "ok",
                "last_error": None,
            }
            try:
                self.atomic_write_bytes(target.metadata, canonical_json(metadata))
                self.write_manifest_ref(ref)
            except (OSError, RecordError):
                os.replace(str(target.markdown), str(legacy))
                raise
            return ref
```

This migration reads only the existing candidate to calculate metadata SHA-256; it never opens or parses a transcript.

- [ ] **Step 5: Run storage and lifecycle suites**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records -v
```

Expected: lifecycle table, stale CAS, error preservation, published guard, migration all pass.

- [ ] **Step 6: Commit lifecycle state machine**

```bash
git add .codex/hooks/session_records.py tests/test_session_records.py
git commit -m "feat(hooks): 세션 기록 상태 전이 추가"
```

### Task 5: Hook Dispatcher와 Prompt/Stop Snapshot

**Files:**
- Create: `.codex/hooks/session_hook.py`
- Modify: `.codex/hooks/export_session.py`
- Modify: `tests/test_export_session.py`
- Modify: `tests/test_session_records.py`

**Interfaces:**
- Produces: `render_prompt_snapshot(record: str, prompt: str, home: Optional[Path] = None) -> str`.
- Produces: `append_provisional_prompt(markdown: str, turn_id: str, prompt: str, home: Optional[Path] = None) -> str`.
- Produces: `handle_hook(hook_input: object, repo_root: Path) -> HookOutcome`.
- CLI prints `{"continue": true}` for `UserPromptSubmit` and `Stop`; lifecycle start/end use exit status and no record content.

- [ ] **Step 1: Write failing dispatcher integration tests**

Append `HookDispatcherTests` to `tests/test_session_records.py` after importing `session_hook`:

```python
class HookDispatcherTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.transcript = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"

    def tearDown(self):
        self.temporary.cleanup()

    def payload(self, event, **extra):
        value = {"hook_event_name": event, "session_id": "session-123", "cwd": str(self.root), "turn_id": "turn-1"}
        value.update(extra)
        return value

    def test_user_prompt_creates_minimum_snapshot_without_transcript(self):
        outcome = session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="api_key=secret"), self.root)
        store = session_records.RecordStore(self.root)
        metadata = store.read_metadata("session-123.s0001")
        candidate = store.paths("session-123.s0001").markdown.read_text(encoding="utf-8")
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(metadata["snapshot_kind"], "prompt_minimum")
        self.assertIn("api_key=[REDACTED]", candidate)
        self.assertNotIn("secret", candidate)

    def test_stop_replaces_provisional_snapshot_with_complete_transcript(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="Create structure"), self.root)
        outcome = session_hook.handle_hook(self.payload("Stop", transcript_path=str(self.transcript), model="gpt-5.6-sol"), self.root)
        store = session_records.RecordStore(self.root)
        metadata = store.read_metadata("session-123.s0001")
        candidate = store.paths("session-123.s0001").markdown.read_text(encoding="utf-8")
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(metadata["snapshot_kind"], "turn_complete")
        self.assertIn("Structure created", candidate)
        self.assertEqual(len(metadata["transcript"]["sha256"]), 64)

    def test_parse_failure_preserves_previous_candidate_and_logs_error(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="safe"), self.root)
        before = session_records.RecordStore(self.root).paths("session-123.s0001").markdown.read_bytes()
        broken = self.root / "broken.jsonl"
        broken.write_text("{bad\n", encoding="utf-8")
        outcome = session_hook.handle_hook(self.payload("Stop", transcript_path=str(broken)), self.root)
        after = session_records.RecordStore(self.root).paths("session-123.s0001").markdown.read_bytes()
        self.assertEqual(outcome.status, "error")
        self.assertEqual(outcome.error, "malformed_json")
        self.assertEqual(after, before)

    def test_session_end_never_calls_transcript_adapter(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="safe"), self.root)
        with mock.patch.object(session_hook, "read_transcript", side_effect=AssertionError("parser called")):
            outcome = session_hook.handle_hook(self.payload("SessionEnd", transcript_path=str(self.transcript)), self.root)
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(session_records.RecordStore(self.root).read_metadata("session-123.s0001")["state"], "closed")
```

- [ ] **Step 2: Run dispatcher tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records.HookDispatcherTests -v
```

Expected: import failure for `session_hook` or missing renderer functions.

- [ ] **Step 3: Add prompt renderers**

Add to `.codex/hooks/export_session.py`:

```python
def render_prompt_snapshot(record, prompt, home=None):
    return "\n".join([
        "# Codex Session `{}`".format(redact(record, home)),
        "",
        "> Human review required before submission. Automatic redaction is best-effort.",
        "",
        "## Provisional turn",
        "",
        "### User prompt",
        "",
        redact(prompt, home),
        "",
    ])


def append_provisional_prompt(markdown, turn_id, prompt, home=None):
    block = "\n".join([
        "",
        "## Provisional turn `{}`".format(redact(turn_id, home)),
        "",
        "### User prompt",
        "",
        redact(prompt, home),
        "",
    ])
    return markdown.rstrip() + "\n" + block
```

- [ ] **Step 4: Implement common dispatcher**

Create `.codex/hooks/session_hook.py`:

```python
#!/usr/bin/env python3
import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from artifact_contract import safe_session_id
from export_session import append_provisional_prompt, redact, render_markdown, render_prompt_snapshot
from session_records import RecordError, RecordStore, write_event
from transcript_adapter import PARSER_VERSION, TranscriptError, read_transcript


@dataclass(frozen=True)
class HookOutcome:
    status: str
    error: Optional[str]
    turn_id: Optional[str]


def cwd_is_inside_repo(cwd, repo_root):
    if not isinstance(cwd, str) or not cwd:
        return False
    try:
        return os.path.commonpath([str(Path(cwd).resolve()), str(repo_root.resolve())]) == str(repo_root.resolve())
    except (OSError, ValueError):
        return False


def handle_hook(hook_input, repo_root):
    if not isinstance(hook_input, dict):
        return HookOutcome("error", "invalid_hook_input", None)
    event = hook_input.get("hook_event_name")
    session_id = safe_session_id(hook_input.get("session_id"))
    turn_id = hook_input.get("turn_id") if isinstance(hook_input.get("turn_id"), str) else None
    if event not in {"UserPromptSubmit", "Stop", "SessionStart", "SessionEnd"}:
        return HookOutcome("error", "invalid_hook_event", turn_id)
    if session_id is None:
        return HookOutcome("error", "invalid_session_id", turn_id)
    if not cwd_is_inside_repo(hook_input.get("cwd"), repo_root):
        return HookOutcome("error", "cwd_outside_repo", turn_id)
    store = RecordStore(repo_root)
    try:
        if event == "UserPromptSubmit":
            prompt = hook_input.get("prompt")
            if not isinstance(prompt, str):
                raise RecordError("invalid_prompt")
            base, event_key, snapshot_kind, previous = store.begin_prompt(session_id, turn_id)
            if snapshot_kind != "duplicate":
                if previous is None:
                    body = render_prompt_snapshot(base.record_id, prompt)
                else:
                    old = previous.decode("utf-8")
                    body = append_provisional_prompt(old, turn_id or "unknown", prompt)
                store.commit_prompt(base, event_key, snapshot_kind, body.encode("utf-8"), turn_id, PARSER_VERSION)
        elif event == "Stop":
            base = store.begin_stop(session_id)
            try:
                snapshot = read_transcript(Path(hook_input["transcript_path"]), session_id, hook_input.get("model") or "unknown")
                body = render_markdown(snapshot.session).encode("utf-8")
                if redact(body.decode("utf-8"), Path("/")) != body.decode("utf-8"):
                    raise TranscriptError("sensitive_candidate")
                transcript = {"size": snapshot.size, "mtime_ns": snapshot.mtime_ns, "observed_at": store.clock(), "last_record_timestamp": snapshot.last_record_timestamp, "sha256": snapshot.sha256}
                store.commit_stop(base, turn_id, body, transcript, PARSER_VERSION)
            except (KeyError, OSError, UnicodeError, TranscriptError) as error:
                code = error.code if isinstance(error, TranscriptError) else "missing_transcript"
                status = store.record_stop_error(base, turn_id, code)
                return HookOutcome(status, code if status == "error" else None, turn_id)
        elif event == "SessionStart":
            store.session_start(session_id, hook_input.get("source"))
        else:
            store.session_end(session_id)
        return HookOutcome("ok", None, turn_id)
    except RecordError as error:
        return HookOutcome("stale" if error.code.startswith("stale") else "error", error.code, turn_id)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args(argv)
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeError, TypeError):
        hook_input = None
    outcome = handle_hook(hook_input, args.repo_root.resolve())
    event = hook_input.get("hook_event_name") if isinstance(hook_input, dict) else "unknown"
    session_id = safe_session_id(hook_input.get("session_id")) if isinstance(hook_input, dict) else "unknown"
    try:
        write_event(args.repo_root.resolve(), event, session_id or "unknown", outcome.turn_id, outcome.status, outcome.error)
    except OSError:
        print("event_log_failed", file=sys.stderr)
    if event in {"UserPromptSubmit", "Stop"}:
        json.dump({"continue": True}, sys.stdout)
        sys.stdout.write("\n")
    return 0 if outcome.status in {"ok", "stale"} else 1


if __name__ == "__main__":
    sys.exit(main())
```

Do not import index code in this commit. Task 6 adds the following exact post-commit block to both content-producing event branches:

```python
            try:
                rebuild_pending_index(store.pending)
            except (OSError, UnicodeError, ValueError):
                return HookOutcome("error", "index_update_failed", turn_id)
```

- [ ] **Step 5: Run dispatcher and renderer suites**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_session_records.HookDispatcherTests tests.test_export_session -v
```

Expected: prompt snapshot, complete Stop snapshot, failure preservation, SessionEnd no-parser tests pass.

- [ ] **Step 6: Commit dispatcher**

```bash
git add .codex/hooks/session_hook.py .codex/hooks/export_session.py tests/test_session_records.py tests/test_export_session.py
git commit -m "feat(hooks): 세션 생명주기 dispatcher 추가"
```

### Task 6: Metadata 기반 Pending Index

**Files:**
- Modify: `.codex/hooks/render_artifact_index.py:1-245`
- Modify: `.codex/hooks/session_hook.py`
- Modify: `tests/test_render_artifact_index.py`
- Modify: `tests/test_session_records.py`

**Interfaces:**
- Produces: `list_pending_artifact_names(pending_dir: Path) -> List[str]`.
- Produces: `rebuild_pending_index(pending_dir: Path) -> None`.
- Keeps: public `render_index`, `list_published_artifact_names`, `index_lock`, `atomic_write_index`.
- Pending selection accepts only state `pending|closed`, schema 1, valid record ID, matching Markdown SHA-256.

- [ ] **Step 1: Write failing pending index tests**

Append to `tests/test_render_artifact_index.py`:

```python
class PendingMetadataIndexTests(unittest.TestCase):
    def test_only_pending_and_closed_hash_matched_records_are_listed(self):
        with tempfile.TemporaryDirectory() as directory:
            pending = Path(directory)
            def add(record, state, body, digest=None):
                markdown = pending / ("codex-session-{}.md".format(record))
                metadata = pending / ("codex-session-{}.json".format(record))
                markdown.write_bytes(body)
                metadata.write_text(json.dumps({"schema_version": 1, "record_id": record, "state": state, "artifact_sha256": digest or hashlib.sha256(body).hexdigest()}) + "\n", encoding="utf-8")
            add("session-1.s0001", "pending", b"one\n")
            add("session-1.s0002", "closed", b"two\n")
            add("session-1.s0003", "published", b"three\n")
            add("session-1.s0004", "pending", b"four\n", "0" * 64)
            self.assertEqual(
                render_artifact_index.list_pending_artifact_names(pending),
                ["codex-session-session-1.s0001.md", "codex-session-session-1.s0002.md"],
            )

    def test_rebuild_failure_preserves_previous_index(self):
        with tempfile.TemporaryDirectory() as directory:
            pending = Path(directory)
            index = pending / "index.md"
            index.write_text("old\n", encoding="utf-8")
            with mock.patch.object(render_artifact_index.os, "replace", side_effect=OSError("injected")):
                with self.assertRaises(OSError):
                    render_artifact_index.rebuild_pending_index(pending)
            self.assertEqual(index.read_text(encoding="utf-8"), "old\n")
```

Add `hashlib` and `json` imports.

- [ ] **Step 2: Run focused index tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_render_artifact_index.PendingMetadataIndexTests -v
```

Expected: missing `list_pending_artifact_names` or `rebuild_pending_index`.

- [ ] **Step 3: Implement state/hash selection and index rebuild**

Add to `.codex/hooks/render_artifact_index.py`:

```python
import hashlib
import json

from artifact_contract import split_record_id


def list_pending_artifact_names(pending_dir):
    names = []
    for metadata_path in sorted(pending_dir.glob("codex-session-*.json")):
        if metadata_path.is_symlink() or not metadata_path.is_file():
            continue
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            record = metadata.get("record_id")
            if metadata.get("schema_version") != 1 or split_record_id(record) is None:
                continue
            if metadata.get("state") not in {"pending", "closed"}:
                continue
            markdown = pending_dir / artifact_filename(record)
            if markdown.is_symlink() or not markdown.is_file():
                continue
            digest = hashlib.sha256(markdown.read_bytes()).hexdigest()
            if not hmac.compare_digest(digest, metadata.get("artifact_sha256", "")):
                continue
            names.append(markdown.name)
        except (OSError, UnicodeError, ValueError, json.JSONDecodeError):
            continue
    return sorted(set(names))


def rebuild_pending_index(pending_dir):
    pending_dir.mkdir(parents=True, exist_ok=True)
    with index_lock(pending_dir / ".index.lock"):
        atomic_write_index(
            pending_dir / "index.md",
            render_pending_index(list_pending_artifact_names(pending_dir)),
        )
```

Import `hmac` and `artifact_filename`. Keep the existing SessionEnd CLI entry point through Task 7 so checked-in hook config remains callable. Update notices so pending index says `UserPromptSubmit/Stop Hook`, while public index says publisher owns publication. Task 8 removes `export_session_candidate`, `run_hook`, and CLI parsing in the same commit that switches `.codex/hooks.json`.

In `atomic_write_index`, immediately after `os.replace` and before clearing `temporary_name`, fsync the parent directory:

```python
        os.replace(temporary_name, path)
        directory_fd = os.open(str(path.parent), os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        temporary_name = None
```

- [ ] **Step 4: Wire immediate prompt/Stop rebuild**

In `.codex/hooks/session_hook.py`, import `rebuild_pending_index`. Immediately after successful prompt or Stop commit, call:

```python
            try:
                rebuild_pending_index(store.pending)
            except (OSError, UnicodeError, ValueError):
                return HookOutcome("error", "index_update_failed", turn_id)
```

Do not call it from `SessionEnd`; closing does not change link membership.

- [ ] **Step 5: Run index and dispatcher tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_render_artifact_index tests.test_session_records.HookDispatcherTests -v
```

Expected: state/hash filtering, failure preservation, immediate prompt/Stop index update pass; public ledger regressions remain green.

- [ ] **Step 6: Commit pending index**

```bash
git add .codex/hooks/render_artifact_index.py .codex/hooks/session_hook.py tests/test_render_artifact_index.py tests/test_session_records.py
git commit -m "feat(hooks): pending index 상태 기반 갱신"
```

### Historical Task 7: Closed-only Human Publisher — 실행 금지

**Files:**
- Modify: `scripts/publish-ai-record:1-299`
- Modify: `tests/test_publish_ai_record.py:1-659`
- Modify: `.codex/hooks/session_records.py`
- Modify: `.codex/hooks/render_artifact_index.py`

**Interfaces:**
- CLI positional value becomes `record_id`, not physical session ID.
- Consumes: `RecordStore.current_ref`, `read_metadata`, `session_lock`, `mark_published_locked`.
- Publisher requires metadata `state=closed`, metadata hash equal reviewed digest, and exact candidate bytes equal digest.
- Produces: reviewed artifact `artifacts/codex-session-<record-id>.md`, public index entry, `AI_USAGE.md` managed link, pending metadata `published`, pending index without record.

- [ ] **Step 1: Write failing publisher lifecycle tests**

Add `json` import, load `session_records.py` beside exporter/indexer, and replace `setUp`, `candidate_digest`, `run_publish`, `main_args`, and `load_module` with:

```python
record_store_module = publish_ai_record.load_hook_module(
    ROOT,
    "session_records.py",
    "publisher_test_record_store",
)
contract_module = publish_ai_record.load_hook_module(
    ROOT,
    "artifact_contract.py",
    "publisher_test_record_contract",
)
```

Inside `PublishAiRecordTests`, use:

```python
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / ".codex" / "review-pending").mkdir(parents=True)
        self.usage = self.root / "AI_USAGE.md"
        self.usage_initial = (
            "# AI 사용 내역\n\n" + START + "\n" + END + "\n\n"
            "- [전체 프롬프트와 작업 기록](./artifacts/index.md)\n"
        )
        self.usage.write_text(self.usage_initial, encoding="utf-8")
        self.record = self.create_lifecycle_candidate("closed", "# Codex Session `session-123.s0001`\n")
        self.candidate = self.root / ".codex" / "review-pending" / ("codex-session-{}.md".format(self.record))

    def create_lifecycle_candidate(self, state, body, metadata_digest=None, record="session-123.s0001"):
        pending = self.root / ".codex" / "review-pending"
        raw = body.encode("utf-8")
        candidate = pending / ("codex-session-{}.md".format(record))
        candidate.write_bytes(raw)
        session_id, segment_text = record.rsplit(".s", 1)
        metadata = {
            "schema_version": 1,
            "parser_version": "codex-rollout-v1",
            "state": state,
            "session_id": session_id,
            "record_id": record,
            "segment": int(segment_text),
            "generation": int(segment_text),
            "revision": 1,
            "last_turn_id": "turn-1",
            "snapshot_kind": "turn_complete",
            "last_hook_event": "SessionEnd" if state == "closed" else "Stop",
            "last_event_key": None,
            "transcript": {"size": None, "mtime_ns": None, "observed_at": None, "last_record_timestamp": None, "sha256": None},
            "artifact_sha256": metadata_digest or hashlib.sha256(raw).hexdigest(),
            "updated_at": "2026-08-29T12:00:00Z",
            "last_hook_status": "ok",
            "last_error": None,
        }
        (pending / ("codex-session-{}.json".format(record))).write_text(json.dumps(metadata) + "\n", encoding="utf-8")
        manifest = {"schema_version": 1, "session_id": session_id, "generation": int(segment_text), "current_segment": int(segment_text), "current_record_id": record, "revision": 1, "updated_at": "2026-08-29T12:00:00Z"}
        sessions = pending / "sessions"
        sessions.mkdir(exist_ok=True)
        (sessions / (session_id + ".json")).write_text(json.dumps(manifest) + "\n", encoding="utf-8")
        return record

    def candidate_digest(self, record_id=None):
        record = record_id or self.record
        candidate = self.root / ".codex" / "review-pending" / ("codex-session-{}.md".format(record))
        return hashlib.sha256(candidate.read_bytes()).hexdigest()

    def run_publish(self, *extra, reviewer="Human Reviewer", include_digest=True, reviewed_digest=None):
        command = [str(PUBLISH), self.record, "--repo-root", str(self.root), "--reviewed-by", reviewer]
        if include_digest:
            command.extend(["--reviewed-sha256", reviewed_digest or self.candidate_digest()])
        command.extend(extra)
        return subprocess.run(command, text=True, capture_output=True, check=False)

    def main_args(self, record_id=None, reviewer="Human Reviewer", reviewed_digest=None):
        record = record_id or self.record
        return [record, "--repo-root", str(self.root), "--reviewed-by", reviewer, "--reviewed-sha256", reviewed_digest or self.candidate_digest(record), "--confirm-sensitive-review", "--confirm-content-review"]

    def load_module(self, source_root, filename, module_name):
        del source_root, module_name
        if filename == "export_session.py":
            return exporter
        if filename == "render_artifact_index.py":
            return indexer
        if filename == "session_records.py":
            return record_store_module
        return contract_module
```

Then append:

```python
    def test_pending_record_cannot_publish(self):
        record = self.create_lifecycle_candidate(state="pending", body="candidate\n")
        result = publish_ai_record.main(self.main_args(record))
        self.assertEqual(result, 1)
        self.assertFalse((self.root / "artifacts" / ("codex-session-{}.md".format(record))).exists())

    def test_closed_record_publishes_and_leaves_pending_index(self):
        record = self.create_lifecycle_candidate(state="closed", body="candidate\n")
        result = publish_ai_record.main(self.main_args(record))
        metadata = json.loads((self.root / ".codex" / "review-pending" / ("codex-session-{}.json".format(record))).read_text(encoding="utf-8"))
        pending_index = (self.root / ".codex" / "review-pending" / "index.md").read_text(encoding="utf-8")
        public_index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(result, 0)
        self.assertEqual(metadata["state"], "published")
        self.assertNotIn(record, pending_index)
        self.assertIn(record, public_index)

    def test_metadata_hash_must_match_reviewed_digest(self):
        record = self.create_lifecycle_candidate(state="closed", body="candidate\n", metadata_digest="0" * 64)
        result = publish_ai_record.main(self.main_args(record))
        self.assertEqual(result, 1)
        self.assertFalse((self.root / "artifacts" / ("codex-session-{}.md".format(record))).exists())

    def test_public_ledger_recovers_metadata_after_post_publish_failure(self):
        record = self.record
        with mock.patch.object(publish_ai_record, "load_hook_module", side_effect=self.load_module):
            with mock.patch.object(record_store_module.RecordStore, "mark_published_locked", side_effect=OSError("injected metadata failure")):
                first = publish_ai_record.main(self.main_args(record))
        self.assertEqual(first, 1)
        self.assertIn(record, (self.root / "artifacts" / "index.md").read_text(encoding="utf-8"))
        second = publish_ai_record.main(self.main_args(record))
        metadata = json.loads((self.root / ".codex" / "review-pending" / ("codex-session-{}.json".format(record))).read_text(encoding="utf-8"))
        self.assertEqual(second, 0)
        self.assertEqual(metadata["state"], "published")
```

- [ ] **Step 2: Run publisher lifecycle tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_publish_ai_record -v
```

Expected: current session-ID path bypasses sidecar state or fails segmented path expectations.

- [ ] **Step 3: Gate publisher on closed metadata**

In `scripts/publish-ai-record`, load `artifact_contract.py` and `session_records.py` beside exporter/indexer, then replace session candidate resolution with:

```python
    contract = load_hook_module(DEFAULT_ROOT, "artifact_contract.py", "record_contract")
    record_store_module = load_hook_module(DEFAULT_ROOT, "session_records.py", "record_store")
    parsed = contract.split_record_id(args.record_id)
    if parsed is None:
        print("unsafe record id", file=sys.stderr)
        return 2
    session_id, _ = parsed
    store = record_store_module.RecordStore(root)
    candidate_path = store.paths(args.record_id).markdown
    try:
        metadata = store.read_metadata(args.record_id)
    except (OSError, UnicodeError, ValueError) as error:
        print("publication failed: {}".format(error), file=sys.stderr)
        return 1
    if metadata.get("state") != "closed":
        print("publication failed: record must be closed", file=sys.stderr)
        return 1
    if not hmac.compare_digest(metadata.get("artifact_sha256", ""), args.reviewed_sha256.lower()):
        print("publication failed: metadata digest mismatch", file=sys.stderr)
        return 1
```

Rename parser positional argument to `record_id`. Hold `store.session_lock(session_id)` before acquiring public index lock. Re-read metadata inside both locks to prevent a concurrent resume. Use `contract.artifact_filename(args.record_id)` for destination.

Update publisher `atomic_write` with the same parent-directory durability rule:

```python
        os.replace(temporary_name, path)
        directory_fd = os.open(str(path.parent), os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        temporary_name = None
```

After artifact, public index, and `AI_USAGE.md` writes succeed while the session lock is still held, call:

```python
                current = store.current_ref(session_id, migrate=False)
                store.mark_published_locked(current, args.record_id, reviewed_sha256)
                indexer.rebuild_pending_index(store.pending)
```

Add this reconciliation function before `main`:

```python
def public_ledger_contains_review(root, record, reviewed_sha256, indexer):
    artifacts = root / "artifacts"
    filename = indexer.artifact_filename(record)
    indexed = indexer.list_published_artifact_names(artifacts / "index.md", artifacts)
    if filename not in indexed:
        return False
    artifact = artifacts / filename
    if artifact.is_symlink() or not artifact.is_file():
        return False
    content = artifact.read_text(encoding="utf-8")
    marker = "- Reviewed candidate SHA-256: `{}`".format(reviewed_sha256)
    return marker in content.splitlines()
```

After re-reading closed metadata under session lock and before writing a destination, reconcile an already-complete public ledger:

```python
            current = store.current_ref(session_id, migrate=False)
            if public_ledger_contains_review(root, args.record_id, reviewed_sha256, indexer):
                store.mark_published_locked(current, args.record_id, reviewed_sha256)
                indexer.rebuild_pending_index(store.pending)
                print("reconciled reviewed record: {}".format(args.record_id))
                return 0
```

If public writes succeed but metadata update fails, return failure without deleting reviewed public evidence. Next invocation follows this canonical public-ledger branch; it never infers publication from an unindexed file.

- [ ] **Step 4: Preserve explicit human review controls**

Retain these exact checks in `main`; existing confirmation tests continue exercising them:

```python
    if not args.confirm_sensitive_review or not args.confirm_content_review:
        print("both human review confirmations are required", file=sys.stderr)
        return 2
    if args.reviewed_sha256 is None:
        print("reviewed SHA-256 digest is required", file=sys.stderr)
        return 2
```

No automatic hook may call `scripts/publish-ai-record` or write a public file.

- [ ] **Step 5: Run publisher and index suites**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_publish_ai_record tests.test_render_artifact_index -v
```

Expected: pending rejection, closed success, hash mismatch rejection, rollback, lock timeout, symlink defense, public ledger tests pass.

- [ ] **Step 6: Commit publisher lifecycle**

```bash
git add scripts/publish-ai-record .codex/hooks/session_records.py .codex/hooks/render_artifact_index.py tests/test_publish_ai_record.py
git commit -m "feat(artifacts): 검토 완료 session record 게시 지원"
```

### Historical Task 8: Project Hook Wiring과 Read-only Verification — 실행 금지

**Files:**
- Modify: `.codex/hooks.json:1-29`
- Modify: `.codex/hooks/export_session.py:283-413`
- Modify: `.codex/hooks/render_artifact_index.py:150-245`
- Modify: `.gitignore:1-12`
- Modify: `scripts/verify:1-231`
- Modify: `tests/test_export_session.py`
- Modify: `tests/test_verify.py`

**Interfaces:**
- All four lifecycle events execute `.codex/hooks/session_hook.py`.
- `SessionStart.matcher` is `startup|resume|clear|compact`.
- Timeouts: `UserPromptSubmit=5`, `Stop=30`, `SessionStart=3`, `SessionEnd=3` seconds.
- `verify_pending_records() -> List[str]` reports schema/hash/index mismatch without mutation.

- [ ] **Step 1: Write failing wiring and verifier tests**

Replace old Stop/SessionEnd wiring assertions with:

```python
    def test_all_lifecycle_hooks_use_common_dispatcher(self):
        config = json.loads((ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8"))
        expected_timeouts = {"UserPromptSubmit": 5, "Stop": 30, "SessionStart": 3, "SessionEnd": 3}
        for event, timeout in expected_timeouts.items():
            with self.subTest(event=event):
                group = config["hooks"][event][0]
                handler = group["hooks"][0]
                self.assertIn(".codex/hooks/session_hook.py", handler["command"])
                self.assertEqual(handler["timeout"], timeout)
        self.assertEqual(config["hooks"]["SessionStart"][0]["matcher"], "startup|resume|clear|compact")
        self.assertNotIn("matcher", config["hooks"]["SessionEnd"][0])
```

Add `hashlib` and `json` with the top-level imports. After the existing `ROOT` assignment, put `.codex/hooks` on `sys.path` and import `render_artifact_index`:

```python
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import render_artifact_index
```

Then append:

```python
    def test_setup_requires_all_lifecycle_hooks(self):
        verify_module = load_verify_module()
        for event in ("UserPromptSubmit", "Stop", "SessionStart", "SessionEnd"):
            self.assertIn("session_hook.py", verify_module.hook_command(event))

    def test_pending_consistency_check_is_read_only(self):
        verify_module = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pending = root / ".codex" / "review-pending"
            pending.mkdir(parents=True)
            body = b"candidate\n"
            record = "session-123.s0001"
            (pending / ("codex-session-{}.md".format(record))).write_bytes(body)
            metadata = {"schema_version": 1, "record_id": record, "state": "pending", "artifact_sha256": hashlib.sha256(body).hexdigest()}
            (pending / ("codex-session-{}.json".format(record))).write_text(json.dumps(metadata) + "\n", encoding="utf-8")
            names = render_artifact_index.list_pending_artifact_names(pending)
            (pending / "index.md").write_text(render_artifact_index.render_pending_index(names), encoding="utf-8")
            before = {path.relative_to(root): (path.read_bytes(), path.stat().st_mtime_ns) for path in pending.rglob("*") if path.is_file()}
            self.assertEqual(verify_module.verify_pending_records(root), [])
            after = {path.relative_to(root): (path.read_bytes(), path.stat().st_mtime_ns) for path in pending.rglob("*") if path.is_file()}
            self.assertEqual(after, before)
```

- [ ] **Step 2: Run wiring tests and confirm failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_export_session.ProjectWiringTests tests.test_verify -v
```

Expected: missing lifecycle hook groups, wrong command paths, or missing `verify_pending_records`.

- [ ] **Step 3: Replace hook config**

Replace `.codex/hooks.json` with:

```json
{
  "description": "Maintain review-pending Codex session records across lifecycle events.",
  "hooks": {
    "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/session_hook.py\"", "timeout": 5, "statusMessage": "Creating pending session snapshot"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/session_hook.py\"", "timeout": 30, "statusMessage": "Updating pending session snapshot"}]}],
    "SessionStart": [{"matcher": "startup|resume|clear|compact", "hooks": [{"type": "command", "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/session_hook.py\"", "timeout": 3, "statusMessage": "Updating session record state"}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/session_hook.py\"", "timeout": 3, "statusMessage": "Closing pending session record"}]}]
  }
}
```

In the same change, delete compatibility `log_event`, `atomic_write`, `run_hook`, CLI parsing, and `main` from `.codex/hooks/export_session.py`. Delete `export_session_candidate`, SessionEnd `run_hook`, CLI parsing, and `main` from `.codex/hooks/render_artifact_index.py`. Keep their rendering, redaction, index, lock, and atomic-write library interfaces imported by `session_hook.py` and publisher.

- [ ] **Step 4: Extend read-only setup verification**

Add `.codex/hooks/transcript_adapter.py`, `.codex/hooks/session_records.py`, `.codex/hooks/session_hook.py`, `tests/test_transcript_adapter.py`, and `tests/test_session_records.py` to required files/test commands in `scripts/verify`.

Add:

```python
def verify_pending_records(root=ROOT):
    hooks = ROOT / ".codex" / "hooks"
    if str(hooks) not in sys.path:
        sys.path.insert(0, str(hooks))
    import render_artifact_index
    pending = root / ".codex" / "review-pending"
    if not pending.exists():
        return []
    names = render_artifact_index.list_pending_artifact_names(pending)
    expected = render_artifact_index.render_pending_index(names)
    index = pending / "index.md"
    if names and not index.is_file():
        return ["pending_index_missing"]
    if index.is_file() and index.read_text(encoding="utf-8") != expected:
        return ["pending_index_mismatch"]
    errors = []
    for metadata in pending.glob("codex-session-*.json"):
        try:
            value = json.loads(metadata.read_text(encoding="utf-8"))
            record = value["record_id"]
            markdown = pending / render_artifact_index.artifact_filename(record)
            digest = hashlib.sha256(markdown.read_bytes()).hexdigest()
            if digest != value["artifact_sha256"]:
                errors.append("snapshot_hash_mismatch:{}".format(record))
        except (KeyError, OSError, UnicodeError, ValueError, json.JSONDecodeError):
            errors.append("invalid_metadata:{}".format(metadata.name))
    return sorted(errors)
```

`verify_setup` must fail with reproducible detail when returned list is non-empty. It must not run recovery or rebuild functions.

- [ ] **Step 5: Ignore runtime event files precisely**

Replace obsolete log ignores in `.gitignore` with:

```gitignore
.codex/hooks/session-record-events/
.codex/hooks/.*.tmp
```

Keep `.codex/review-pending/` ignored. Add tests that event paths and pending previous/temp paths are ignored while `.codex/hooks/session_hook.py` remains tracked.

- [ ] **Step 6: Run setup verification and prove read-only behavior**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_export_session.ProjectWiringTests tests.test_verify -v
./scripts/verify setup
```

Expected: all lifecycle wiring tests pass; setup prints `PASS setup`; repository fingerprint test proves no mutation.

- [ ] **Step 7: Commit wiring and verifier**

```bash
git add .codex/hooks.json .codex/hooks/export_session.py .codex/hooks/render_artifact_index.py .gitignore scripts/verify tests/test_export_session.py tests/test_verify.py
git commit -m "test(hooks): 세션 생명주기 wiring 검증 추가"
```

### Historical Task 9: 운영 문서, 회귀 검증, Human Checkpoint — 실행 금지

**Files:**
- Modify: `docs/quality/workflow.md:121-139`
- Modify: `docs/quality/verification.md:86-104`
- Modify: `AI_USAGE.md:24-50`
- Modify: `docs/superpowers/specs/2026-08-29-session-end-artifact-index-design.md:1-12`
- Modify: `docs/superpowers/plans/2026-08-29-session-end-artifact-index.md:1-12`
- Verify only: all hook source and tests

**Interfaces:**
- Documents exact states, segment naming, digest review, and publisher command.
- Records automated evidence as commands and observed result; browser evidence stays `N/A — non-browser TOOLING`.
- Leaves human checkpoint open; AI never writes `HUMAN_APPROVED`.

- [ ] **Step 1: Update lifecycle operations documentation**

Add this contract to `docs/quality/workflow.md`:

```markdown
### Session record lifecycle

- `UserPromptSubmit`: create or extend ignored `pending` record before assistant response.
- `Stop`: replace current segment with complete redacted transcript snapshot and rebuild pending index.
- `SessionEnd`: change current record to `closed` without transcript parsing.
- `SessionStart(source=resume)`: reopen `closed` as `pending`.
- `SessionStart(source=clear)`: close current segment and reserve next segment.
- `published`: only `scripts/publish-ai-record` may set this after exact-byte human review.

Record IDs use `<session-id>.s<4-digit-segment>`. Pending and closed candidates are
not submission evidence. Public artifacts and reviewed-record links are never created
by hooks.
```

Add this verification block to `docs/quality/verification.md`:

```markdown
### Session lifecycle tooling

Run `/usr/bin/python3 -m unittest tests.test_artifact_contract tests.test_transcript_adapter tests.test_export_session tests.test_session_records tests.test_render_artifact_index tests.test_publish_ai_record -v` for focused lifecycle evidence. Run `./scripts/verify setup` to check hook wiring and pending metadata/hash/index consistency without modifying files. Browser evidence is `N/A — non-browser TOOLING` because hooks operate only on local session files and metadata.
```

Update `AI_USAGE.md` command example to:

```bash
shasum -a 256 .codex/review-pending/codex-session-<session-id>.s0001.md
./scripts/publish-ai-record <session-id>.s0001 \
  --reviewed-by "<name>" \
  --reviewed-sha256 "<sha256>" \
  --confirm-sensitive-review \
  --confirm-content-review
```

- [ ] **Step 2: Mark old narrow design and plan as superseded**

Insert after each title in old SessionEnd design and plan:

```markdown
> **Superseded:** 세션 전체 생명주기, logical segment, metadata sidecar,
> revision CAS는 `2026-08-29-session-artifact-lifecycle-design.md`와
> `2026-08-29-session-artifact-lifecycle.md`를 따른다.
```

- [ ] **Step 3: Run focused automatic verification**

Run:

```bash
/usr/bin/python3 -m unittest \
  tests.test_artifact_contract \
  tests.test_transcript_adapter \
  tests.test_export_session \
  tests.test_session_records \
  tests.test_render_artifact_index \
  tests.test_publish_ai_record -v
./scripts/verify quick
```

Expected: all hook tests pass; quick verification prints `PASS setup`, `PASS hook-tests`, and frontend result or documented scaffold skip.

- [ ] **Step 4: Run lightweight adversarial review**

Inspect with exact commands:

```bash
rg -n "artifacts/|AI_USAGE.md|read_transcript|state.*published|os.replace|revision|last_error" .codex/hooks scripts/publish-ai-record
git diff --check
git status --short
```

Review questions:

- Can any automatic hook write `artifacts/`, public index, or reviewed managed region?
- Can SessionEnd reach `read_transcript` or Markdown rendering?
- Can stale Stop write after prompt, clear, resume, or end revision changes?
- Does every parser failure keep prior candidate bytes and record a safe error code?
- Can publisher accept pending, missing metadata, symlink, or digest mismatch?
- Can runtime path, prompt, transcript content, or exception text enter event log?
- Does dirty user artifact remain untouched and unstaged?

Classify every finding as `REQUIREMENT`, `IMPLEMENTATION`, `INTEGRATION`, `TEST`, `ENVIRONMENT`, or `TOOLING`; fix it, rerun focused tests, and record command/result in handoff.

- [ ] **Step 5: Commit documentation**

```bash
git add AI_USAGE.md docs/quality/workflow.md docs/quality/verification.md docs/superpowers/specs/2026-08-29-session-end-artifact-index-design.md docs/superpowers/plans/2026-08-29-session-end-artifact-index.md
git commit -m "docs: 세션 기록 생명주기 운영 절차 반영"
```

- [ ] **Step 6: Request one human checkpoint**

Report:

```text
Requirement: TOOLING-SESSION-RECORD-LIFECYCLE
Automatic evidence: focused unittest command + ./scripts/verify quick
Browser evidence: N/A — non-browser TOOLING
Adversarial review: findings and fixes listed
Open human decision: pending/closed/published lifecycle and clear segment separation acceptance
```

Wait for explicit acceptance. Do not label it `HUMAN_APPROVED` yourself.

- [ ] **Step 7: Run full review and final QA after checkpoint**

Run:

```bash
./scripts/verify full
git diff --check
git status --short
git log --oneline -10
```

Expected: full verification passes or frontend scaffold skip is explicit; no runtime pending file, event log, temp file, or user-owned artifact is staged; active commit sequence matches lifecycle Tasks 1–6 and the human-review plan.

Final handoff must list commit hashes, commands and observed results, open human-owned acceptance, and any unrelated dirty paths. It must not auto-publish current session candidate.
