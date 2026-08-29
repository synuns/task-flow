#!/usr/bin/env python3
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set


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
