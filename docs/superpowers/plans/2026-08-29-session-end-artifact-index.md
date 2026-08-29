# SessionEnd Artifact Index Implementation Plan

> **후속 보완:** `/clear`가 `matcher: other`에 매칭되지 않는 문제가 확인되어
> 현재 구현은 matcher 없이 모든 SessionEnd reason을 받고, flush된 transcript로
> pending 후보와 `.codex/review-pending/index.md`를 최종 갱신한다. 공개
> `artifacts/index.md`의 사람 검토 게이트는 유지한다. 현재 계약은 설계 문서를
> 기준으로 한다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 Codex 세션 종료 시 transcript 본문을 읽지 않고 안전한 세션 artifact 파일만 찾아 `artifacts/index.md`를 동시성 안전하게 재생성한다.

**Architecture:** 기존 `Stop` Hook은 Git 비추적 pending 후보만 생성한다. 사람은 `scripts/publish-ai-record`로 검토 완료 기록을 게시하며 publisher는 POSIX 파일 잠금 안에서 게시 artifact, 인덱스, `AI_USAGE.md` managed 링크를 순서대로 갱신한다. 신규 `SessionEnd` command Hook은 현재 세션 artifact를 요구하지 않고 이미 게시된 허용 파일명만 조회한 뒤 인덱스를 원자적으로 교체하며 `AI_USAGE.md`는 수정하지 않는다.

**Tech Stack:** Codex project hooks, Python 3.9+ standard library, `unittest`, Markdown, POSIX `fcntl.flock`

## Global Constraints

- 모든 작업은 `/Users/identity/dev/assignment/kbhc-assgn/.worktrees/session-end-artifact-index` worktree와 `feat/session-end-artifact-index` 브랜치에서 수행한다.
- Python 런타임과 테스트는 `/usr/bin/python3` 3.9.6에서 동작해야 한다.
- 외부 패키지, 모델 호출, 네트워크 호출을 추가하지 않는다.
- `SessionEnd`는 transcript 경로나 세션 Markdown 본문을 열지 않는다.
- `SessionEnd` Hook timeout은 공식 최대값인 3초다.
- artifact 경로 형식은 `artifacts/codex-session-<session-id>.md`다.
- `session-id` 문법은 `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`다.
- 인덱스는 `artifacts/index.md` 하나이며 Hook이 전체 내용을 소유한다.
- 잠금은 `artifacts/.index.lock`, 임시 파일은 `artifacts/.index-*.tmp`를 사용한다.
- 잠금 재시도는 50ms 간격, 최대 1초다.
- 실패 시 기존 `artifacts/index.md`를 보존한다.
- `AI_USAGE.md`의 작업 범위, 프롬프트 요약, 사람 검증, 자동 검증 내용은 Hook과 publisher가 수정하지 않으며, explicit publisher만 reviewed-record managed 영역을 수정한다.
- `Stop`은 `.codex/review-pending/`에만 기록하며 publisher만 `artifacts/`에 쓴다.
- publisher와 SessionEnd는 같은 `artifacts/.index.lock` 계약을 사용한다.
- 현재 세션이 아직 pending 상태여도 SessionEnd는 기존 게시 artifact만으로 성공한다.
- 커밋 메시지는 Conventional Commits 형식과 한글 설명을 사용한다.
- 설계 기준: `docs/superpowers/specs/2026-08-29-session-end-artifact-index-design.md`.
- 공식 Hook 기준: <https://developers.openai.com/codex/hooks>.

## File Map

- Create `.codex/hooks/artifact_contract.py`: exporter와 indexer가 공유하는 session ID 정제, artifact 파일명 생성·파싱 계약.
- Modify `.codex/hooks/export_session.py`: 로컬 이름 정제 함수를 공통 계약으로 교체.
- Modify `scripts/publish-ai-record`: 사람 검토 기록, 인덱스, AI_USAGE managed 링크 갱신과 역순 rollback을 같은 잠금 안에서 수행.
- Create `.codex/hooks/render_artifact_index.py`: 파일 선택, 렌더링, 잠금, 원자적 저장, SessionEnd CLI.
- Create `tests/test_artifact_contract.py`: 파일명 계약 경계 테스트.
- Create `tests/test_render_artifact_index.py`: 렌더러, 실패 보존, CLI, 잠금 테스트.
- Modify `tests/test_export_session.py`: 공통 모듈 import 경로와 Hook wiring 검증.
- Modify `.codex/hooks.json`: 기존 `Stop` 유지, `SessionEnd` 등록.
- Modify `.gitignore`: indexer 로그, 잠금, 임시 파일 제외.
- Modify `AI_USAGE.md`: 수동 검증 절 분리와 `artifacts/index.md` 정적 링크.
- Create `artifacts/index.md`: 추적되는 자동 생성 인덱스.
- Delete `artifacts/.gitkeep`: 추적되는 인덱스가 디렉터리를 유지함.

> 통합 조정: 아래 초기 단계의 “Stop이 artifact를 직접 생성”, “SessionEnd가
> 현재 세션 artifact를 요구” 예시는 위 Architecture와 Global Constraints로
> 대체한다. publisher의 AI_USAGE 수정은 managed marker 영역에만 한정한다.
> `index.md`는 게시 ledger며
> publisher만 신규 링크를 추가한다. SessionEnd는 기존 canonical 링크를
> 재렌더링하고 누락된 artifact 링크만 정리한다. 이름이 맞아도 index에 없는
> 파일은 게시 완료로 추정하지 않는다. 초기 TDD 이력은 설계 변경 전 실행
> 기록으로 남긴다.

---

### Task 1: 세션 artifact 파일명 계약 통합

**Files:**
- Create: `.codex/hooks/artifact_contract.py`
- Create: `tests/test_artifact_contract.py`
- Modify: `.codex/hooks/export_session.py:1-74,314-350`
- Modify: `tests/test_export_session.py:1-16`

**Interfaces:**
- Produces: `safe_session_id(raw: object) -> Optional[str]`.
- Produces: `artifact_filename(session_id: str) -> str`.
- Produces: `session_id_from_artifact_filename(filename: str) -> Optional[str]`.
- Consumed by: existing Stop exporter and Task 2/3 index renderer.

- [ ] **Step 1: Write failing contract tests**

Create `tests/test_artifact_contract.py`:

```python
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))

from artifact_contract import (  # noqa: E402
    artifact_filename,
    safe_session_id,
    session_id_from_artifact_filename,
)


class ArtifactContractTests(unittest.TestCase):
    def test_safe_session_id_accepts_and_sanitizes_supported_values(self):
        self.assertEqual(safe_session_id("thr_123.A-b"), "thr_123.A-b")
        self.assertEqual(safe_session_id("thr/123"), "thr_123")
        self.assertEqual(safe_session_id("a" * 129), "a" * 128)

    def test_safe_session_id_rejects_unsafe_boundaries(self):
        for value in (None, "", "...", "-leading", "_leading"):
            with self.subTest(value=value):
                self.assertIsNone(safe_session_id(value))

    def test_artifact_filename_round_trip_and_rejection(self):
        filename = artifact_filename("thr_123.A-b")
        self.assertEqual(filename, "codex-session-thr_123.A-b.md")
        self.assertEqual(
            session_id_from_artifact_filename(filename),
            "thr_123.A-b",
        )
        for invalid in (
            "index.md",
            "codex-session-.md",
            "codex-session--bad.md",
            "nested/codex-session-good.md",
            "codex-session-good.md.tmp",
        ):
            with self.subTest(filename=invalid):
                self.assertIsNone(session_id_from_artifact_filename(invalid))
        with self.assertRaises(ValueError):
            artifact_filename("-bad")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run contract tests to verify failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_artifact_contract -v
```

Expected: import error containing `No module named 'artifact_contract'`.

- [ ] **Step 3: Implement shared artifact contract**

Create `.codex/hooks/artifact_contract.py`:

```python
import re
from typing import Optional


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
ARTIFACT_FILENAME_PATTERN = re.compile(
    r"^codex-session-([A-Za-z0-9][A-Za-z0-9._-]{0,127})\.md$"
)


def safe_session_id(raw: object) -> Optional[str]:
    if not isinstance(raw, str) or not raw:
        return None
    value = re.sub(r"[^A-Za-z0-9._-]", "_", raw)[:128].strip(".")
    if not SESSION_ID_PATTERN.fullmatch(value):
        return None
    return value


def artifact_filename(session_id: str) -> str:
    if not SESSION_ID_PATTERN.fullmatch(session_id):
        raise ValueError("invalid_session_id")
    return "codex-session-{}.md".format(session_id)


def session_id_from_artifact_filename(filename: str) -> Optional[str]:
    match = ARTIFACT_FILENAME_PATTERN.fullmatch(filename)
    return match.group(1) if match else None
```

- [ ] **Step 4: Switch exporter to shared contract**

In `.codex/hooks/export_session.py`, add this import after standard-library imports:

```python
from artifact_contract import artifact_filename, safe_session_id
```

Delete the local `safe_session_id` function at current lines 69-73. Replace destination construction at current lines 347-349 with:

```python
        destination = repo_root / "artifacts" / artifact_filename(session_id)
```

In `tests/test_export_session.py`, replace the path setup at current lines 10-16 with:

```python
ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
MODULE_PATH = HOOKS / "export_session.py"
SPEC = importlib.util.spec_from_file_location("export_session", MODULE_PATH)
export_session = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = export_session
SPEC.loader.exec_module(export_session)
```

- [ ] **Step 5: Run contract and exporter tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_artifact_contract tests.test_export_session -v
```

Expected: `Ran 16 tests` and `OK`.

- [ ] **Step 6: Commit shared contract**

```bash
git add .codex/hooks/artifact_contract.py .codex/hooks/export_session.py tests/test_artifact_contract.py tests/test_export_session.py
git diff --cached --check
git commit -m "refactor: 세션 기록 파일명 규약 통합"
```

---

### Task 2: 결정적 artifact 인덱스 렌더러 구현

**Files:**
- Create: `.codex/hooks/render_artifact_index.py`
- Create: `tests/test_render_artifact_index.py`

**Interfaces:**
- Consumes: `session_id_from_artifact_filename(filename: str) -> Optional[str]` from Task 1.
- Produces: `list_artifact_names(artifacts_dir: Path) -> List[str]`.
- Produces: `render_index(filenames: List[str]) -> str`.
- Produces: `atomic_write_index(path: Path, content: str) -> None`.

- [ ] **Step 1: Write failing selection, rendering, and atomic-write tests**

Create `tests/test_render_artifact_index.py` with this initial content:

```python
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
MODULE_PATH = HOOKS / "render_artifact_index.py"
SPEC = importlib.util.spec_from_file_location("render_artifact_index", MODULE_PATH)
render_artifact_index = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = render_artifact_index
SPEC.loader.exec_module(render_artifact_index)


class ArtifactIndexRenderTests(unittest.TestCase):
    def test_selects_only_direct_regular_contract_files(self):
        with tempfile.TemporaryDirectory() as directory:
            artifacts = Path(directory)
            for name in (
                "codex-session-b.md",
                "codex-session-a.md",
                "index.md",
                "codex-session--bad.md",
                "codex-session-good.md.tmp",
            ):
                (artifacts / name).write_text("not read\n", encoding="utf-8")
            (artifacts / "codex-session-directory.md").mkdir()
            outside = artifacts.parent / "codex-session-linked.md"
            outside.write_text("not read\n", encoding="utf-8")
            link = artifacts / "codex-session-link.md"
            try:
                link.symlink_to(outside)
            except OSError:
                pass
            selected = render_artifact_index.list_artifact_names(artifacts)
            outside.unlink()
        self.assertEqual(
            selected,
            ["codex-session-a.md", "codex-session-b.md"],
        )

    def test_render_is_sorted_deduplicated_and_deterministic(self):
        filenames = [
            "codex-session-b.md",
            "codex-session-a.md",
            "codex-session-b.md",
        ]
        first = render_artifact_index.render_index(filenames)
        second = render_artifact_index.render_index(filenames)
        self.assertEqual(first, second)
        self.assertEqual(first.count("codex-session-b.md"), 1)
        self.assertLess(first.index("codex-session-a.md"), first.index("codex-session-b.md"))
        self.assertTrue(first.endswith("\n"))

    def test_atomic_write_preserves_old_index_and_cleans_temp_on_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "index.md"
            target.write_text("old\n", encoding="utf-8")
            with mock.patch.object(
                render_artifact_index.os,
                "replace",
                side_effect=OSError("replace failed"),
            ):
                with self.assertRaises(OSError):
                    render_artifact_index.atomic_write_index(target, "new\n")
            self.assertEqual(target.read_text(encoding="utf-8"), "old\n")
            self.assertEqual(list(target.parent.glob(".index-*.tmp")), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run renderer tests to verify failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_render_artifact_index.ArtifactIndexRenderTests -v
```

Expected: import error because `.codex/hooks/render_artifact_index.py` does not exist.

- [ ] **Step 3: Implement deterministic selection, rendering, and atomic write**

Create `.codex/hooks/render_artifact_index.py` with this initial content:

```python
#!/usr/bin/env python3
import os
import tempfile
from pathlib import Path
from typing import List

from artifact_contract import session_id_from_artifact_filename


INDEX_HEADER = "# Codex 세션 기록 인덱스"
INDEX_NOTICE = "> SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요."


def list_artifact_names(artifacts_dir: Path) -> List[str]:
    names = []
    with os.scandir(str(artifacts_dir)) as entries:
        for entry in entries:
            if entry.is_symlink() or not entry.is_file(follow_symlinks=False):
                continue
            if session_id_from_artifact_filename(entry.name) is not None:
                names.append(entry.name)
    return sorted(set(names))


def render_index(filenames: List[str]) -> str:
    lines = [INDEX_HEADER, "", INDEX_NOTICE, ""]
    for filename in sorted(set(filenames)):
        session_id = session_id_from_artifact_filename(filename)
        if session_id is None:
            raise ValueError("invalid_artifact_filename")
        lines.append(
            "- [Codex 세션 `{}`](./{})".format(session_id, filename)
        )
    return "\n".join(lines).rstrip() + "\n"


def atomic_write_index(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=str(path.parent),
            prefix=".index-",
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
```

- [ ] **Step 4: Run renderer and contract tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_artifact_contract tests.test_render_artifact_index.ArtifactIndexRenderTests -v
```

Expected: `Ran 6 tests` and `OK`.

- [ ] **Step 5: Commit renderer core**

```bash
git add .codex/hooks/render_artifact_index.py tests/test_render_artifact_index.py
git diff --cached --check
git commit -m "feat: 세션 기록 인덱스 렌더러 추가"
```

---

### Task 3: SessionEnd 입력 검증과 동시 실행 잠금 구현

**Files:**
- Modify: `.codex/hooks/render_artifact_index.py`
- Modify: `tests/test_render_artifact_index.py`

**Interfaces:**
- Produces: `IndexLockTimeout` exception.
- Produces: `index_lock(path: Path, timeout: float = 1.0, interval: float = 0.05)` context manager.
- Produces: `run_hook(hook_input: object, repo_root: Path) -> int`.
- Produces: `main(argv=None) -> int` CLI consuming SessionEnd JSON from stdin.

- [ ] **Step 1: Add failing CLI and lock tests**

Add these imports to `tests/test_render_artifact_index.py`:

```python
import fcntl
import json
import subprocess
import time
```

Append this class before the final `unittest.main()` call:

```python
class SessionEndCliTests(unittest.TestCase):
    def payload(self, root, session_id="session-b"):
        return {
            "hook_event_name": "SessionEnd",
            "session_id": session_id,
            "transcript_path": str(root / "must-not-be-read.jsonl"),
            "cwd": str(root),
            "reason": "other",
        }

    def run_cli(self, root, stdin_text):
        return subprocess.run(
            [sys.executable, str(MODULE_PATH), "--repo-root", str(root)],
            input=stdin_text,
            text=True,
            capture_output=True,
            check=False,
            timeout=3,
        )

    def write_artifact(self, root, session_id):
        artifacts = root / "artifacts"
        artifacts.mkdir(parents=True, exist_ok=True)
        path = artifacts / "codex-session-{}.md".format(session_id)
        path.write_text("transcript body must not be read\n", encoding="utf-8")
        return path

    def test_success_rebuilds_sorted_index_without_transcript(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_artifact(root, "session-b")
            self.write_artifact(root, "session-a")
            payload = self.payload(root)
            first = self.run_cli(root, json.dumps(payload))
            index_path = root / "artifacts" / "index.md"
            first_content = index_path.read_text(encoding="utf-8")
            second = self.run_cli(root, json.dumps(payload))
            second_content = index_path.read_text(encoding="utf-8")
        self.assertEqual(first.returncode, 0)
        self.assertEqual(first.stdout, "")
        self.assertEqual(first.stderr, "")
        self.assertEqual(second.returncode, 0)
        self.assertEqual(first_content, second_content)
        self.assertLess(
            first_content.index("codex-session-session-a.md"),
            first_content.index("codex-session-session-b.md"),
        )

    def test_invalid_inputs_preserve_existing_index(self):
        cases = (
            ("not-json", "invalid_hook_input"),
            ({"hook_event_name": "Stop"}, "invalid_hook_event"),
            ({"hook_event_name": "SessionEnd", "session_id": "-bad"}, "invalid_session_id"),
            ("outside", "cwd_outside_repo"),
            ("missing", "missing_current_artifact"),
        )
        for value, expected_error in cases:
            with self.subTest(value=value):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    self.write_artifact(root, "session-b")
                    index_path = root / "artifacts" / "index.md"
                    index_path.write_text("existing\n", encoding="utf-8")
                    if value == "not-json":
                        stdin_text = value
                    elif value == "outside":
                        payload = self.payload(root)
                        payload["cwd"] = str(root.parent)
                        stdin_text = json.dumps(payload)
                    elif value == "missing":
                        stdin_text = json.dumps(self.payload(root, "session-missing"))
                    else:
                        stdin_text = json.dumps(value)
                    result = self.run_cli(root, stdin_text)
                    preserved = index_path.read_text(encoding="utf-8")
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stderr, expected_error + "\n")
                self.assertEqual(preserved, "existing\n")

    def test_lock_timeout_preserves_existing_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_artifact(root, "session-b")
            index_path = root / "artifacts" / "index.md"
            index_path.write_text("existing\n", encoding="utf-8")
            lock_path = root / "artifacts" / ".index.lock"
            with lock_path.open("a+") as lock_stream:
                fcntl.flock(lock_stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                started = time.monotonic()
                result = self.run_cli(root, json.dumps(self.payload(root)))
                elapsed = time.monotonic() - started
            preserved = index_path.read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr, "lock_timeout\n")
        self.assertLess(elapsed, 2.5)
        self.assertEqual(preserved, "existing\n")
```

- [ ] **Step 2: Run CLI tests to verify failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_render_artifact_index.SessionEndCliTests -v
```

Expected: failures because argument parsing, `run_hook`, locking, and `main` are absent.

- [ ] **Step 3: Implement lock, validation, diagnostics, and CLI**

Replace `.codex/hooks/render_artifact_index.py` with:

```python
#!/usr/bin/env python3
import argparse
import datetime
import fcntl
import json
import os
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List

from artifact_contract import (
    artifact_filename,
    safe_session_id,
    session_id_from_artifact_filename,
)


INDEX_HEADER = "# Codex 세션 기록 인덱스"
INDEX_NOTICE = "> SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요."
LOCK_TIMEOUT_SECONDS = 1.0
LOCK_RETRY_SECONDS = 0.05


class IndexLockTimeout(Exception):
    pass


def list_artifact_names(artifacts_dir: Path) -> List[str]:
    names = []
    with os.scandir(str(artifacts_dir)) as entries:
        for entry in entries:
            if entry.is_symlink() or not entry.is_file(follow_symlinks=False):
                continue
            if session_id_from_artifact_filename(entry.name) is not None:
                names.append(entry.name)
    return sorted(set(names))


def render_index(filenames: List[str]) -> str:
    lines = [INDEX_HEADER, "", INDEX_NOTICE, ""]
    for filename in sorted(set(filenames)):
        session_id = session_id_from_artifact_filename(filename)
        if session_id is None:
            raise ValueError("invalid_artifact_filename")
        lines.append(
            "- [Codex 세션 `{}`](./{})".format(session_id, filename)
        )
    return "\n".join(lines).rstrip() + "\n"


def atomic_write_index(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=str(path.parent),
            prefix=".index-",
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


@contextmanager
def index_lock(
    path: Path,
    timeout: float = LOCK_TIMEOUT_SECONDS,
    interval: float = LOCK_RETRY_SECONDS,
) -> Iterator[None]:
    deadline = time.monotonic() + timeout
    with path.open("a+") as stream:
        while True:
            try:
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise IndexLockTimeout()
                time.sleep(min(interval, remaining))
        try:
            yield
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def cwd_is_inside_repo(cwd: object, repo_root: Path) -> bool:
    if not isinstance(cwd, str) or not cwd:
        return False
    try:
        root = str(repo_root.resolve())
        return os.path.commonpath([str(Path(cwd).resolve()), root]) == root
    except (OSError, ValueError):
        return False


def log_event(repo_root: Path, event: str, session_id: str = "unknown") -> None:
    path = repo_root / ".codex" / "hooks" / "artifact-index.log"
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as stream:
            stream.write(
                "{} event={} session={}\n".format(
                    stamp,
                    event,
                    safe_session_id(session_id) or "unknown",
                )
            )
    except OSError:
        pass


def fail(repo_root: Path, event: str, session_id: str = "unknown") -> int:
    log_event(repo_root, event, session_id)
    sys.stderr.write(event + "\n")
    return 1


def run_hook(hook_input: object, repo_root: Path) -> int:
    if not isinstance(hook_input, dict):
        return fail(repo_root, "invalid_hook_input")
    if hook_input.get("hook_event_name") != "SessionEnd":
        return fail(repo_root, "invalid_hook_event")
    session_id = safe_session_id(hook_input.get("session_id"))
    if session_id is None:
        return fail(repo_root, "invalid_session_id")
    if not cwd_is_inside_repo(hook_input.get("cwd"), repo_root):
        return fail(repo_root, "cwd_outside_repo", session_id)

    artifacts_dir = repo_root / "artifacts"
    if not artifacts_dir.is_dir():
        return fail(repo_root, "missing_current_artifact", session_id)

    try:
        with index_lock(artifacts_dir / ".index.lock"):
            expected = artifacts_dir / artifact_filename(session_id)
            if expected.is_symlink() or not expected.is_file():
                return fail(repo_root, "missing_current_artifact", session_id)
            filenames = list_artifact_names(artifacts_dir)
            if expected.name not in filenames:
                return fail(repo_root, "missing_current_artifact", session_id)
            atomic_write_index(
                artifacts_dir / "index.md",
                render_index(filenames),
            )
    except IndexLockTimeout:
        return fail(repo_root, "lock_timeout", session_id)
    except (OSError, UnicodeError, ValueError):
        return fail(repo_root, "index_update_failed", session_id)
    return 0


def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeError, TypeError):
        hook_input = None
    return run_hook(hook_input, args.repo_root.resolve())


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run all indexer tests**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_render_artifact_index -v
```

Expected: `Ran 6 tests` and `OK`; lock timeout test completes below 2.5 seconds.

- [ ] **Step 5: Run Python 3.9 compilation and complete regression suite**

Run:

```bash
/usr/bin/python3 -m py_compile .codex/hooks/artifact_contract.py .codex/hooks/export_session.py .codex/hooks/render_artifact_index.py
/usr/bin/python3 -m unittest discover -s tests -v
```

Expected: compilation exits `0`; test suite reports `Ran 22 tests` and `OK`.

- [ ] **Step 6: Commit SessionEnd runner**

```bash
git add .codex/hooks/render_artifact_index.py tests/test_render_artifact_index.py
git diff --cached --check
git commit -m "feat: 세션 종료 기록 인덱스 갱신 추가"
```

---

### Task 4: Hook과 AI 사용 문서 연결

**Files:**
- Modify: `.codex/hooks.json`
- Modify: `.gitignore`
- Modify: `AI_USAGE.md`
- Modify: `tests/test_export_session.py`
- Modify: `tests/test_render_artifact_index.py`
- Create: `artifacts/index.md`
- Delete: `artifacts/.gitkeep`

**Interfaces:**
- Consumes: `.codex/hooks/render_artifact_index.py` CLI from Task 3.
- Produces: one project-local `SessionEnd` handler with matcher `other` and timeout `3`.
- Produces: static `AI_USAGE.md -> artifacts/index.md -> session artifact` link chain.

- [ ] **Step 1: Add failing project wiring tests**

In `tests/test_export_session.py`, add this method to `ProjectWiringTests`:

```python
    def test_session_end_hook(self):
        config = json.loads(
            (ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8")
        )
        group = config["hooks"]["SessionEnd"][0]
        handler = group["hooks"][0]
        self.assertEqual(group["matcher"], "other")
        self.assertEqual(handler["type"], "command")
        self.assertIn("git rev-parse --show-toplevel", handler["command"])
        self.assertIn(".codex/hooks/render_artifact_index.py", handler["command"])
        self.assertEqual(handler["timeout"], 3)
```

Replace `test_ai_usage_required_sections` with:

```python
    def test_ai_usage_required_sections(self):
        document = (ROOT / "AI_USAGE.md").read_text(encoding="utf-8")
        for heading in (
            "## 사용한 도구와 모델",
            "## 적용한 작업 범위",
            "## 핵심 프롬프트 요약",
            "## 사람이 최종 검증한 내용",
            "## 자동 검증 내역",
            "## 전체 프롬프트와 작업 기록",
        ):
            self.assertIn(heading, document)
        self.assertIn(
            "[전체 프롬프트와 작업 기록](./artifacts/index.md)",
            document,
        )
        self.assertNotIn("[세션 기록 디렉터리](./artifacts/)", document)
        self.assertIn("- [ ]", document)
```

In `tests/test_render_artifact_index.py`, append this class before `unittest.main()`:

```python
class ProjectArtifactIndexTests(unittest.TestCase):
    def test_tracked_index_matches_current_artifacts(self):
        artifacts = ROOT / "artifacts"
        expected = render_artifact_index.render_index(
            render_artifact_index.list_artifact_names(artifacts)
        )
        actual = (artifacts / "index.md").read_text(encoding="utf-8")
        self.assertEqual(actual, expected)
```

- [ ] **Step 2: Run wiring tests to verify failure**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_export_session.ProjectWiringTests tests.test_render_artifact_index.ProjectArtifactIndexTests -v
```

Expected: errors for missing `SessionEnd`, missing automatic verification heading, and missing `artifacts/index.md`.

- [ ] **Step 3: Register SessionEnd Hook**

Replace `.codex/hooks.json` with:

```json
{
  "description": "Export and index reviewable Codex session evidence for AI_USAGE.md.",
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/export_session.py\"",
            "timeout": 30,
            "statusMessage": "Exporting Codex session record"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "other",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/render_artifact_index.py\"",
            "timeout": 3,
            "statusMessage": "Updating Codex session index"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Separate manual and automatic verification in AI_USAGE**

Replace `AI_USAGE.md` with:

```markdown
# AI 사용 내역

## 사용한 도구와 모델

- 도구: OpenAI Codex
- 모델: `gpt-5.6-sol`

## 적용한 작업 범위

- 과제 요구사항 분석과 프로젝트 구조 결정
- Codex 사용 기록 자동화 설계 및 구현
- 이후 구현 과정의 코드 작성, 테스트, 검토 보조

## 핵심 프롬프트 요약

- 과제 원본 문서를 별도 디렉터리로 분리
- Codex Stop Hook으로 사용자 프롬프트, 도구 작업, 최종 응답 기록
- SessionEnd Hook으로 세션 기록 인덱스 자동 생성
- 시스템·개발자 지침과 내부 reasoning 제외
- 비밀정보 자동 마스킹 후 사람 검토

## 사람이 최종 검증한 내용

- [ ] 비밀정보와 민감정보 제거 확인
- [ ] 프롬프트와 작업 결과 정확성 확인
- [ ] 테스트 결과와 애플리케이션 동작 확인
- [ ] 도구, 모델, 작업 범위 정확성 확인

## 자동 검증 내역

- 자동화 결과는 사람 검증으로 간주하지 않으며 제출 전 확인된 결과만 수동 기록합니다.

## 전체 프롬프트와 작업 기록

- [전체 프롬프트와 작업 기록](./artifacts/index.md)

세션 문서는 `artifacts/codex-session-<session-id>.md` 형식으로 생성합니다.
`artifacts/index.md`는 SessionEnd Hook이 세션 종료 시 자동 갱신합니다.
자동 마스킹은 보조 수단이므로 제출 전 사람 검토가 필요합니다.
```

- [ ] **Step 5: Add generated-file ignores and initial index**

Append these lines to `.gitignore`:

```gitignore
.codex/hooks/artifact-index.log
artifacts/.index.lock
artifacts/.index-*.tmp
```

Create `artifacts/index.md` from currently tracked artifacts:

```markdown
# Codex 세션 기록 인덱스

> SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요.

- [Codex 세션 `01a04c3e-0a24-7e30-a767-64f1e2c4f3ae`](./codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md)
```

Remove the now-unnecessary tracked placeholder:

```bash
git rm artifacts/.gitkeep
```

- [ ] **Step 6: Run wiring and complete test suites**

Run:

```bash
/usr/bin/python3 -m unittest tests.test_export_session.ProjectWiringTests tests.test_render_artifact_index.ProjectArtifactIndexTests -v
/usr/bin/python3 -m unittest discover -s tests -v
```

Expected: wiring command reports `Ran 4 tests` and `OK`; complete suite reports `Ran 24 tests` and `OK`.

- [ ] **Step 7: Run SessionEnd smoke test in a temporary repository root**

Run:

```bash
index_smoke_root=$(mktemp -d)
trap 'rm -rf "$index_smoke_root"' EXIT
mkdir -p "$index_smoke_root/artifacts"
touch "$index_smoke_root/artifacts/codex-session-smoke-session.md"
printf '%s' "{\"hook_event_name\":\"SessionEnd\",\"session_id\":\"smoke-session\",\"transcript_path\":\"$index_smoke_root/missing.jsonl\",\"cwd\":\"$index_smoke_root\",\"reason\":\"other\"}" | /usr/bin/python3 .codex/hooks/render_artifact_index.py --repo-root "$index_smoke_root"
test -f "$index_smoke_root/artifacts/index.md"
grep -q 'codex-session-smoke-session.md' "$index_smoke_root/artifacts/index.md"
if find "$index_smoke_root/artifacts" -name '.index-*.tmp' -print -quit | grep -q .; then exit 1; fi
```

Expected: 모든 명령 exit `0`; Hook stdout/stderr 없음; 인덱스는 존재하지 않는 transcript 경로와 무관하게 생성됨.

- [ ] **Step 8: Inspect and trust exact Hook configuration**

Worktree 또는 병합 후 저장소에서 Codex `/hooks`를 열고 변경된
`.codex/hooks.json` hash를 검토한다. `Stop` handler 하나와 matcher `other`인
`SessionEnd` handler 하나가 활성화되어야 한다. 프로젝트 Hook은 정의가
바뀌면 새 hash를 다시 신뢰하기 전까지 실행되지 않는다.

- [ ] **Step 9: Commit project wiring**

```bash
git add .codex/hooks.json .gitignore AI_USAGE.md artifacts/index.md tests/test_export_session.py tests/test_render_artifact_index.py
git diff --cached --check
git commit -m "chore: 세션 종료 기록 인덱스 연결"
```

## Final Verification

Run from `/Users/identity/dev/assignment/kbhc-assgn/.worktrees/session-end-artifact-index`:

```bash
/usr/bin/python3 -m py_compile .codex/hooks/artifact_contract.py .codex/hooks/export_session.py .codex/hooks/render_artifact_index.py
/usr/bin/python3 -m unittest discover -s tests -v
git diff --check 4ed14e2..HEAD
git status --short --branch
```

Expected:

- Python compilation exits `0`.
- Test suite reports `Ran 24 tests` and `OK`.
- Diff check prints nothing.
- Worktree status has no staged, modified, or untracked implementation files.
- Branch remains `feat/session-end-artifact-index`.

Before submission, a person must open `artifacts/index.md` and every linked
session artifact, verify redaction and factual accuracy, then update only the
factually confirmed manual sections and checkboxes in `AI_USAGE.md`.
