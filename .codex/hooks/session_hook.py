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
        root = str(repo_root.resolve())
        return os.path.commonpath([str(Path(cwd).resolve()), root]) == root
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
                    body = append_provisional_prompt(previous.decode("utf-8"), turn_id or "unknown", prompt)
                store.commit_prompt(base, event_key, snapshot_kind, body.encode("utf-8"), turn_id, PARSER_VERSION)
        elif event == "Stop":
            base = store.begin_stop(session_id)
            raw_path = hook_input.get("transcript_path")
            if not isinstance(raw_path, str) or not raw_path:
                raise TranscriptError("missing_transcript")
            try:
                snapshot = read_transcript(Path(raw_path).expanduser(), session_id, hook_input.get("model") or "unknown")
                rendered = render_markdown(snapshot.session)
                if redact(rendered, Path("/")) != rendered:
                    raise TranscriptError("sensitive_candidate")
                fields = {
                    "size": snapshot.size,
                    "mtime_ns": snapshot.mtime_ns,
                    "observed_at": store.clock(),
                    "last_record_timestamp": snapshot.last_record_timestamp,
                    "sha256": snapshot.sha256,
                }
                store.commit_stop(base, turn_id, rendered.encode("utf-8"), fields, PARSER_VERSION)
            except (OSError, UnicodeError, TranscriptError, TypeError) as error:
                code = error.code if isinstance(error, TranscriptError) else "missing_transcript"
                status = store.record_stop_error(base, turn_id, code)
                return HookOutcome(status, code if status == "error" else None, turn_id)
        elif event == "SessionStart":
            store.session_start(session_id, hook_input.get("source"))
        else:
            store.session_end(session_id)
        return HookOutcome("ok", None, turn_id)
    except RecordError as error:
        status = "stale" if error.code.startswith("stale") else "error"
        return HookOutcome(status, error.code, turn_id)


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
