#!/usr/bin/env python3
import argparse
import datetime
import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set


REDACTED = "[REDACTED]"
SECRET_PATTERNS = [
    (
        re.compile(r"(?i)(Authorization\s*:\s*(?:Bearer|Basic)\s+)[^\s\"']+"),
        r"\1" + REDACTED,
    ),
    (
        re.compile(
            r"(?i)([\"']?(?:api[_-]?key|access[_-]?token|secret|password)"
            r"[\"']?\s*[:=]\s*[\"']?)[^\s\"'&,]+"
        ),
        r"\1" + REDACTED,
    ),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), REDACTED),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), REDACTED),
    (
        re.compile(
            r"(?s)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----.*?"
            r"-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
        ),
        REDACTED,
    ),
    (
        re.compile(r"(?i)([?&](?:api_key|access_token|token|key)=)[^&\s]+"),
        r"\1" + REDACTED,
    ),
]


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


def safe_session_id(raw: object) -> Optional[str]:
    if not isinstance(raw, str) or not raw:
        return None
    value = re.sub(r"[^A-Za-z0-9._-]", "_", raw)[:128].strip(".")
    return value or None


def extract_visible_text(content: object, allowed_types: Set[str]) -> str:
    if not isinstance(content, list):
        return ""
    parts = []
    for item in content:
        if not isinstance(item, dict) or item.get("type") not in allowed_types:
            continue
        text = item.get("text")
        if isinstance(text, str) and text:
            parts.append(text)
    return "\n".join(parts)


def parse_rollout(
    path: Path,
    session_id: str,
    fallback_model: str,
    on_warning: Callable[[str, int], None],
) -> SessionData:
    session = SessionData(session_id, fallback_model, "unknown", "unknown")
    turns_by_id: Dict[str, TurnData] = {}
    tools_by_call_id: Dict[str, ToolActivity] = {}

    def get_turn(raw_turn_id: object) -> TurnData:
        turn_id = (
            raw_turn_id
            if isinstance(raw_turn_id, str) and raw_turn_id
            else "ungrouped"
        )
        if turn_id not in turns_by_id:
            turns_by_id[turn_id] = TurnData(turn_id)
            session.turns.append(turns_by_id[turn_id])
        return turns_by_id[turn_id]

    with path.open("r", encoding="utf-8") as stream:
        for line_number, raw_line in enumerate(stream, 1):
            try:
                record = json.loads(raw_line)
            except (json.JSONDecodeError, TypeError):
                on_warning("malformed_json", line_number)
                continue
            if not isinstance(record, dict):
                continue
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
                elif (
                    payload.get("role") == "assistant"
                    and payload.get("phase") == "final_answer"
                ):
                    text = extract_visible_text(payload.get("content"), {"output_text"})
                    if text:
                        turn.responses.append(text)
            elif (
                payload.get("type") == "custom_tool_call"
                and isinstance(payload.get("call_id"), str)
            ):
                tool = ToolActivity(
                    payload["call_id"],
                    payload.get("name")
                    if isinstance(payload.get("name"), str)
                    else "unknown",
                    payload.get("input")
                    if isinstance(payload.get("input"), str)
                    else "",
                    status=payload.get("status")
                    if isinstance(payload.get("status"), str)
                    else "",
                )
                turn.tools.append(tool)
                tools_by_call_id[tool.call_id] = tool
            elif (
                payload.get("type") == "custom_tool_call_output"
                and isinstance(payload.get("call_id"), str)
            ):
                tool = tools_by_call_id.get(payload["call_id"])
                if tool:
                    tool.output_text = extract_visible_text(
                        payload.get("output"), {"input_text", "output_text"}
                    )
    return session


def redact(text: str, home: Optional[Path] = None) -> str:
    result = text
    for pattern, replacement in SECRET_PATTERNS:
        result = pattern.sub(replacement, result)
    home_text = str(home or Path.home())
    if home_text and home_text != "/":
        result = result.replace(home_text, "~")
    return result


def fenced(text: str) -> str:
    fence = chr(96) * 3
    while fence in text:
        fence += chr(96)
    return "{0}text\n{1}\n{0}".format(fence, text, fence)


def render_markdown(session: SessionData, home: Optional[Path] = None) -> str:
    lines = [
        "# Codex Session `{}`".format(redact(session.session_id, home)),
        "",
        "> Human review required before submission. Automatic redaction is best-effort.",
        "",
        "- Model: `{}`".format(redact(session.model, home)),
        "- Started: `{}`".format(redact(session.started_at, home)),
        "- Working directory: `{}`".format(redact(session.cwd, home)),
        "",
    ]
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
        if turn.tools:
            lines.extend(["### Tool activity", ""])
            for tool in turn.tools:
                lines.extend(
                    [
                        "#### `{}`".format(redact(tool.name, home)),
                        "",
                        "- Call ID: `{}`".format(redact(tool.call_id, home)),
                        "- Status: `{}`".format(
                            redact(tool.status or "unknown", home)
                        ),
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
            lines.extend(
                [
                    "### Assistant response",
                    "",
                    redact("\n\n".join(turn.responses), home),
                    "",
                ]
            )
    return "\n".join(lines).rstrip() + "\n"


def log_event(
    repo_root: Path,
    event: str,
    session_id: str = "unknown",
    line: int = 0,
) -> None:
    path = repo_root / ".codex" / "hooks" / "export-session.log"
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as stream:
            stream.write(
                "{} event={} session={} line={}\n".format(
                    stamp,
                    event,
                    safe_session_id(session_id) or "unknown",
                    line,
                )
            )
    except OSError:
        pass


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=str(path.parent),
            prefix=".codex-session-",
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


def cwd_is_inside_repo(cwd: object, repo_root: Path) -> bool:
    if not isinstance(cwd, str) or not cwd:
        return False
    try:
        root = str(repo_root.resolve())
        return os.path.commonpath([str(Path(cwd).resolve()), root]) == root
    except (OSError, ValueError):
        return False


def run_hook(hook_input: object, repo_root: Path) -> None:
    if not isinstance(hook_input, dict):
        log_event(repo_root, "invalid_hook_input")
        return
    if hook_input.get("hook_event_name") != "Stop":
        return
    session_id = safe_session_id(hook_input.get("session_id"))
    if session_id is None:
        log_event(repo_root, "invalid_session_id")
        return
    if not cwd_is_inside_repo(hook_input.get("cwd"), repo_root):
        log_event(repo_root, "cwd_outside_repo", session_id)
        return
    raw_path = hook_input.get("transcript_path")
    if not isinstance(raw_path, str) or not raw_path:
        log_event(repo_root, "missing_transcript", session_id)
        return
    transcript = Path(raw_path).expanduser()
    try:
        transcript_exists = transcript.is_file()
    except OSError:
        transcript_exists = False
    if not transcript_exists:
        log_event(repo_root, "missing_transcript", session_id)
        return
    model = hook_input.get("model")
    try:
        session = parse_rollout(
            transcript,
            session_id,
            model if isinstance(model, str) and model else "unknown",
            lambda event, line: log_event(repo_root, event, session_id, line),
        )
        rendered = render_markdown(session)
        if redact(rendered, Path("/__no_home_match__")) != rendered:
            log_event(repo_root, "sensitive_candidate", session_id)
            return
        destination = (
            repo_root
            / ".codex"
            / "review-pending"
            / "codex-session-{}.md".format(session_id)
        )
        atomic_write(destination, rendered)
    except (OSError, UnicodeError, ValueError, TypeError):
        log_event(repo_root, "export_failed", session_id)


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
    run_hook(hook_input, args.repo_root.resolve())
    json.dump({"continue": True}, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
