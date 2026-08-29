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
    safe_session_id,
    session_id_from_artifact_filename,
)


INDEX_HEADER = "# Codex 세션 기록 인덱스"
INDEX_NOTICE = (
    "> 게시 명령과 SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요."
)
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

    try:
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        with index_lock(artifacts_dir / ".index.lock"):
            filenames = list_artifact_names(artifacts_dir)
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
