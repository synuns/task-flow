import re
from typing import Optional, Tuple


SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
ARTIFACT_FILENAME_PATTERN = re.compile(
    r"^codex-session-([A-Za-z0-9][A-Za-z0-9._-]{0,133})\.md$"
)
RECORD_ID_PATTERN = re.compile(
    r"^(?P<session>[A-Za-z0-9][A-Za-z0-9._-]{0,127})\.s(?P<segment>[0-9]{4})$"
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


def session_id_from_artifact_filename(filename: str) -> Optional[str]:
    match = ARTIFACT_FILENAME_PATTERN.fullmatch(filename)
    if match is None:
        return None
    identifier = match.group(1)
    if SESSION_ID_PATTERN.fullmatch(identifier) or split_record_id(identifier) is not None:
        return identifier
    return None


record_id_from_artifact_filename = session_id_from_artifact_filename
