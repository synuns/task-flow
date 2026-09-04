#!/usr/bin/env python3
import argparse
import datetime
import fcntl
import hashlib
import hmac
import json
import os
import re
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Dict, Iterator, List, Optional

from artifact_contract import (
    artifact_filename,
    safe_session_id,
    split_record_id,
    session_id_from_artifact_filename,
)


INDEX_HEADER = "# Codex 세션 기록 인덱스"
INDEX_NOTICE = (
    "> 게시 명령과 SessionEnd Hook이 파일 목록을 관리합니다. 작업 주제는 공개 기록을 검토한 사람이 작성합니다."
)
LOCK_TIMEOUT_SECONDS = 1.0
LOCK_RETRY_SECONDS = 0.05
INDEX_LINK_PATTERN = re.compile(
    r"^- \[([^\[\]`\r\n]+) — `([^`]+)`\]\(\./([^)]+)\)$"
)


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


def render_index(
    filenames: List[str],
    titles: Optional[Dict[str, str]] = None,
) -> str:
    lines = [INDEX_HEADER, "", INDEX_NOTICE, ""]
    titles = titles or {}
    for filename in sorted(set(filenames)):
        session_id = session_id_from_artifact_filename(filename)
        if session_id is None:
            raise ValueError("invalid_artifact_filename")
        title = titles.get(filename, "Codex 세션")
        if INDEX_LINK_PATTERN.fullmatch(
            "- [{} — `{}`](./{})".format(title, session_id, filename)
        ) is None:
            raise ValueError("invalid_index_title")
        lines.append(
            "- [{} — `{}`](./{})".format(title, session_id, filename)
        )
    return "\n".join(lines).rstrip() + "\n"


PENDING_INDEX_HEADER = "# Codex 검토 대기 세션 기록 인덱스"
PENDING_INDEX_NOTICE = "> UserPromptSubmit/Stop Hook이 자동 생성합니다. 게시 전 사람 검토가 필요합니다."


def render_pending_index(filenames: List[str]) -> str:
    lines = [PENDING_INDEX_HEADER, "", PENDING_INDEX_NOTICE, ""]
    for filename in sorted(set(filenames)):
        record = session_id_from_artifact_filename(filename)
        if record is None:
            raise ValueError("invalid_artifact_filename")
        lines.append("- [Codex 세션 `{}`](./{})".format(record, filename))
    return "\n".join(lines).rstrip() + "\n"


def list_pending_artifact_names(pending_dir: Path) -> List[str]:
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


def rebuild_pending_index(pending_dir: Path) -> None:
    pending_dir.mkdir(parents=True, exist_ok=True)
    with index_lock(pending_dir / ".index.lock"):
        atomic_write_index(
            pending_dir / "index.md",
            render_pending_index(list_pending_artifact_names(pending_dir)),
        )


def list_published_artifact_titles(
    index_path: Path,
    artifacts_dir: Path,
) -> Dict[str, str]:
    if not index_path.exists():
        return {}
    if index_path.is_symlink() or not index_path.is_file():
        raise ValueError("invalid_index_path")
    content = index_path.read_text(encoding="utf-8")
    titles = {}
    for line in content.splitlines():
        if not line.startswith("- "):
            continue
        match = INDEX_LINK_PATTERN.fullmatch(line)
        if match is None:
            raise ValueError("invalid_index_link")
        title, session_id, filename = match.groups()
        if session_id_from_artifact_filename(filename) != session_id:
            raise ValueError("invalid_index_link")
        titles[filename] = title
    if render_index(list(titles), titles) != content:
        raise ValueError("invalid_index_content")

    available = set(list_artifact_names(artifacts_dir))
    return {
        filename: title
        for filename, title in titles.items()
        if filename in available
    }


def list_published_artifact_names(
    index_path: Path,
    artifacts_dir: Path,
) -> List[str]:
    return list(list_published_artifact_titles(index_path, artifacts_dir))


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
        directory_fd = os.open(str(path.parent), os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
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

    try:
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        with index_lock(artifacts_dir / ".index.lock"):
            titles = list_published_artifact_titles(
                artifacts_dir / "index.md",
                artifacts_dir,
            )
            atomic_write_index(
                artifacts_dir / "index.md",
                render_index(list(titles), titles),
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
