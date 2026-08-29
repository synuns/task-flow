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
