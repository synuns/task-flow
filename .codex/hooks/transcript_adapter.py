#!/usr/bin/env python3
import hashlib
import json
import os
import stat
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Set


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


def parse_supported_records(records, session_id: str, fallback_model: str):
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


def parse_rollout_bytes(raw: bytes, session_id: str, fallback_model: str):
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise TranscriptError("invalid_utf8") from error
    records = []
    timestamps = []
    for line in text.splitlines():
        if not line.strip():
            continue
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
