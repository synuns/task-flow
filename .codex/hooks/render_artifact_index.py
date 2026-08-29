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
