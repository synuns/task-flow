# Codex Session Artifact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Export each completed Codex turn into a cumulative, redacted Markdown artifact linked from AI_USAGE.md.

**Architecture:** Project-local Stop hook runs one Python 3.9-compatible standard-library exporter. Exporter reads hook JSON from stdin, parses visible rollout response items, redacts secrets, renders full session Markdown, and atomically replaces one session file.

**Tech Stack:** Codex hooks.json, Python 3.9 standard library, unittest, Markdown

## Global Constraints

- Resolve project-local hook script from Git root.
- Include user prompts, custom tool calls/results, and assistant final_answer messages.
- Exclude system/developer messages, commentary, reasoning, telemetry, and token records.
- Tolerate unknown records, missing fields, and malformed individual JSONL lines.
- Mask credentials before rendering transcript-derived text.
- Preserve prior artifact on all failures.
- Log event identifiers only; never log transcript text or exception messages.
- Return {"continue": true}; never request another Codex continuation.
- Never mark human verification complete automatically.

## File Map

- .codex/hooks/export_session.py: parser, redactor, renderer, writer, CLI.
- .codex/hooks.json: Stop hook.
- tests/fixtures/codex-rollout.jsonl: synthetic two-turn transcript.
- tests/test_export_session.py: unit and integration tests.
- AI_USAGE.md: assignment disclosure and artifact link.
- .gitignore: hook log, temp files, Python caches.

---

### Task 1: Tolerant visible-record parser

**Files:**
- Create: .codex/hooks/export_session.py
- Create: tests/fixtures/codex-rollout.jsonl
- Create: tests/test_export_session.py

**Interfaces:**
- safe_session_id(raw: object) -> Optional[str]
- extract_visible_text(content: object, allowed_types: Set[str]) -> str
- parse_rollout(path: Path, session_id: str, fallback_model: str, on_warning: Callable) -> SessionData
- Data classes: ToolActivity, TurnData, SessionData

- [ ] **Step 1: Create exact synthetic fixture**

Write 13 JSONL records: session_meta; turn_context turn-1; developer message; user “Create structure”; reasoning; custom_tool_call exec/call-1/input {"cmd":"pwd"}; matching custom_tool_call_output; commentary “Working”; final_answer “Structure created”; turn_context turn-2; user “Add tests”; final_answer “Tests added”; future_record containing “must not render”.

Each response_item includes internal_chat_message_metadata_passthrough.turn_id. Fixture values must match current rollout keys inspected during design.

~~~jsonl
{"timestamp":"2026-08-29T01:00:00Z","type":"session_meta","payload":{"id":"session-123","timestamp":"2026-08-29T01:00:00Z","cwd":"/workspace/kbhc-assgn"}}
{"type":"turn_context","payload":{"turn_id":"turn-1","model":"gpt-5.6-sol"}}
{"type":"response_item","payload":{"type":"message","role":"developer","content":[{"type":"input_text","text":"internal instruction"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Create structure"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"reasoning","summary":[{"type":"summary_text","text":"private reasoning"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"custom_tool_call","name":"exec","call_id":"call-1","status":"completed","input":"{\"cmd\":\"pwd\"}","internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"custom_tool_call_output","call_id":"call-1","output":[{"type":"input_text","text":"/workspace/kbhc-assgn"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"message","role":"assistant","phase":"commentary","content":[{"type":"output_text","text":"Working"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"response_item","payload":{"type":"message","role":"assistant","phase":"final_answer","content":[{"type":"output_text","text":"Structure created"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-1"}}}
{"type":"turn_context","payload":{"turn_id":"turn-2","model":"gpt-5.6-sol"}}
{"type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Add tests"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-2"}}}
{"type":"response_item","payload":{"type":"message","role":"assistant","phase":"final_answer","content":[{"type":"output_text","text":"Tests added"}],"internal_chat_message_metadata_passthrough":{"turn_id":"turn-2"}}}
{"type":"future_record","payload":{"secret_internal_field":"must not render"}}
~~~

- [ ] **Step 2: Write failing parser tests**

~~~python
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/codex-rollout.jsonl"
MODULE_PATH = ROOT / ".codex/hooks/export_session.py"
SPEC = importlib.util.spec_from_file_location("export_session", MODULE_PATH)
export_session = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = export_session
SPEC.loader.exec_module(export_session)


class ParseRolloutTests(unittest.TestCase):
    def setUp(self):
        self.warnings = []

    def parse(self, path=FIXTURE):
        return export_session.parse_rollout(
            path,
            "session-123",
            "fallback-model",
            lambda event, line: self.warnings.append((event, line)),
        )

    def test_visible_records_are_grouped(self):
        session = self.parse()
        self.assertEqual(session.model, "gpt-5.6-sol")
        self.assertEqual([t.turn_id for t in session.turns], ["turn-1", "turn-2"])
        self.assertEqual(session.turns[0].prompts, ["Create structure"])
        self.assertEqual(session.turns[0].responses, ["Structure created"])
        self.assertEqual(session.turns[1].prompts, ["Add tests"])
        self.assertEqual(session.turns[1].responses, ["Tests added"])

    def test_tool_output_pairs_by_call_id(self):
        tool = self.parse().turns[0].tools[0]
        self.assertEqual(tool.call_id, "call-1")
        self.assertEqual(tool.name, "exec")
        self.assertEqual(tool.input_text, '{"cmd":"pwd"}')
        self.assertEqual(tool.output_text, "/workspace/kbhc-assgn")
        self.assertEqual(tool.status, "completed")

    def test_internal_records_never_render(self):
        visible = repr(self.parse())
        for hidden in ("internal instruction", "private reasoning", "Working", "must not render"):
            self.assertNotIn(hidden, visible)

    def test_malformed_line_is_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            lines = FIXTURE.read_text(encoding="utf-8").splitlines()
            lines.insert(4, "{not-json")
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            session = self.parse(path)
        self.assertEqual(len(session.turns), 2)
        self.assertEqual(self.warnings, [("malformed_json", 5)])
~~~

Hidden .codex directory needs no package files because import uses importlib.util.

- [ ] **Step 3: Confirm red state**

Run:

~~~bash
python3 -m unittest tests.test_export_session.ParseRolloutTests -v
~~~

Expected: import failure because exporter does not exist.

- [ ] **Step 4: Implement data classes and parser**

~~~python
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
~~~

Parser rules, implemented directly rather than generic serialization:

1. json.loads each line; catch JSONDecodeError and call on_warning("malformed_json", line_number).
2. session_meta supplies timestamp and cwd.
3. turn_context creates ordered turn and updates model.
4. response_item derives turn ID only from internal_chat_message_metadata_passthrough.turn_id.
5. role user accepts input_text only.
6. role assistant accepts output_text only when phase equals final_answer.
7. custom_tool_call creates ToolActivity keyed by call_id.
8. custom_tool_call_output attaches visible text to existing call_id.
9. All other roles/types are ignored without fallback stringification.
10. Missing turn ID groups under literal “ungrouped”.

safe_session_id replaces characters outside A-Z, a-z, 0-9, dot, underscore, hyphen with underscore, limits to 128 characters, strips edge dots, and returns None for empty result.

Implement those rules with:

~~~python
def safe_session_id(raw):
    if not isinstance(raw, str) or not raw:
        return None
    value = re.sub(r"[^A-Za-z0-9._-]", "_", raw)[:128].strip(".")
    return value or None


def extract_visible_text(content, allowed_types):
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


def parse_rollout(path, session_id, fallback_model, on_warning):
    session = SessionData(session_id, fallback_model, "unknown", "unknown")
    turns_by_id = {}
    tools_by_call_id = {}

    def get_turn(raw_turn_id):
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
~~~

- [ ] **Step 5: Verify green and commit**

~~~bash
python3 -m unittest tests.test_export_session.ParseRolloutTests -v
git add .codex/hooks/export_session.py tests/fixtures/codex-rollout.jsonl tests/test_export_session.py
git commit -m "feat: parse Codex session rollout"
~~~

Expected: Ran 4 tests, OK.

---

### Task 2: Secret redaction and deterministic Markdown

**Files:**
- Modify: .codex/hooks/export_session.py
- Modify: tests/test_export_session.py

**Interfaces:**
- redact(text: str, home: Optional[Path] = None) -> str
- fenced(text: str) -> str
- render_markdown(session: SessionData, home: Optional[Path] = None) -> str

- [ ] **Step 1: Add failing tests**

~~~python
class RedactionAndRenderTests(unittest.TestCase):
    def test_redacts_all_supported_shapes(self):
        source = "\n".join([
            "Authorization: Bearer bearer-secret",
            "api_key=plain-secret",
            '"access_token": "json-secret"',
            "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456",
            "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456",
            "https://example.test/?token=query-secret&safe=yes",
            "-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----",
        ])
        rendered = export_session.redact(source)
        for secret in (
            "bearer-secret", "plain-secret", "json-secret",
            "sk-abcdefghijklmnopqrstuvwxyz123456",
            "ghp_abcdefghijklmnopqrstuvwxyz123456",
            "query-secret", "private-material",
        ):
            self.assertNotIn(secret, rendered)

    def test_render_is_ordered_and_deterministic(self):
        session = export_session.parse_rollout(
            FIXTURE,
            "session-123",
            "fallback-model",
            lambda event, line: None,
        )
        first = export_session.render_markdown(session)
        second = export_session.render_markdown(session)
        self.assertEqual(first, second)
        expected = [
            "Human review required before submission",
            "## Turn 1", "### User prompt", "Create structure",
            "### Tool activity", "exec", '{"cmd":"pwd"}',
            "/workspace/kbhc-assgn", "### Assistant response",
            "Structure created", "## Turn 2", "Add tests", "Tests added",
        ]
        positions = [first.index(value) for value in expected]
        self.assertEqual(positions, sorted(positions))
        self.assertTrue(first.endswith("\n"))
~~~

- [ ] **Step 2: Confirm red state**

~~~bash
python3 -m unittest tests.test_export_session.RedactionAndRenderTests -v
~~~

Expected: missing redact and render_markdown errors.

- [ ] **Step 3: Implement exact redaction rules**

Compile and apply these patterns in order:

~~~python
SECRET_PATTERNS = [
    (re.compile(r"(?i)(Authorization\s*:\s*(?:Bearer|Basic)\s+)[^\s\"']+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)((?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*[\"']?)[^\s\"'&,]+"), r"\1[REDACTED]"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "[REDACTED]"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), "[REDACTED]"),
    (re.compile(r"(?s)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----.*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"), "[REDACTED]"),
    (re.compile(r"(?i)([?&](?:api_key|access_token|token|key)=)[^&\s]+"), r"\1[REDACTED]"),
]
~~~

Each match becomes [REDACTED], retaining safe field prefix where useful. Replace current user home prefix with ~. Redaction runs on session metadata, prompts, tool name/input/output/status/call ID, and assistant response.

Implement fenced() using chr(96) * 3, lengthening fence while contained in payload. This prevents tool output from closing its own Markdown fence.

- [ ] **Step 4: Implement exact document hierarchy**

~~~markdown
# Codex Session <safe-session-id>

> Human review required before submission. Automatic redaction is best-effort.

- Model: <model>
- Started: <timestamp>
- Working directory: <path>

## Turn N

### User prompt

<redacted original text>

### Tool activity

#### <tool name>

- Call ID: <id>
- Status: <status>

**Input**

<fenced redacted input>

**Output**

<fenced redacted output>

### Assistant response

<redacted final answer>
~~~

Omit empty user/tool/assistant sections. End file with one newline.

Implement redaction and rendering with:

~~~python
def redact(text, home=None):
    result = text
    for pattern, replacement in SECRET_PATTERNS:
        result = pattern.sub(replacement, result)
    home_text = str(home or Path.home())
    if home_text and home_text != "/":
        result = result.replace(home_text, "~")
    return result


def fenced(text):
    fence = chr(96) * 3
    while fence in text:
        fence += chr(96)
    return "{0}text\n{1}\n{0}".format(fence, text, fence)


def render_markdown(session, home=None):
    lines = [
        "# Codex Session {}".format(redact(session.session_id, home)),
        "",
        "> Human review required before submission. "
        "Automatic redaction is best-effort.",
        "",
        "- Model: {}".format(redact(session.model, home)),
        "- Started: {}".format(redact(session.started_at, home)),
        "- Working directory: {}".format(redact(session.cwd, home)),
        "",
    ]
    for index, turn in enumerate(session.turns, 1):
        lines.extend(["## Turn {}".format(index), ""])
        if turn.prompts:
            lines.extend([
                "### User prompt", "",
                redact("\n\n".join(turn.prompts), home), "",
            ])
        if turn.tools:
            lines.extend(["### Tool activity", ""])
            for tool in turn.tools:
                lines.extend([
                    "#### {}".format(redact(tool.name, home)), "",
                    "- Call ID: {}".format(redact(tool.call_id, home)),
                    "- Status: {}".format(redact(tool.status or "unknown", home)),
                    "", "**Input**", "",
                    fenced(redact(tool.input_text, home)), "",
                    "**Output**", "",
                    fenced(redact(tool.output_text, home)), "",
                ])
        if turn.responses:
            lines.extend([
                "### Assistant response", "",
                redact("\n\n".join(turn.responses), home), "",
            ])
    return "\n".join(lines).rstrip() + "\n"
~~~

- [ ] **Step 5: Verify and commit**

~~~bash
python3 -m unittest tests.test_export_session -v
git add .codex/hooks/export_session.py tests/test_export_session.py
git commit -m "feat: redact and render Codex session artifacts"
~~~

Expected: Ran 6 tests, OK.

---

### Task 3: Hook CLI, safe logging, atomic replacement

**Files:**
- Modify: .codex/hooks/export_session.py
- Modify: tests/test_export_session.py

**Interfaces:**
- log_event(repo_root, event, session_id="unknown", line=0) -> None
- atomic_write(path, content) -> None
- cwd_is_inside_repo(cwd, repo_root) -> bool
- run_hook(hook_input, repo_root) -> None
- main(argv=None) -> int

- [ ] **Step 1: Add failing integration tests**

~~~python
class HookCliTests(unittest.TestCase):
    def setUp(self):
        self.fixture = FIXTURE

    def run_cli(self, repo_root, stdin_text):
        return subprocess.run(
            [sys.executable, str(MODULE_PATH), "--repo-root", str(repo_root)],
            input=stdin_text,
            text=True,
            capture_output=True,
            check=False,
        )

    def payload(self, repo_root):
        return {
            "hook_event_name": "Stop",
            "session_id": "session-123",
            "transcript_path": str(self.fixture),
            "cwd": str(repo_root),
            "model": "gpt-5.6-sol",
            "turn_id": "turn-2",
        }

    def test_success_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first_result = self.run_cli(root, json.dumps(self.payload(root)))
            artifact = root / "artifacts/codex-session-session-123.md"
            first = artifact.read_text(encoding="utf-8")
            second_result = self.run_cli(root, json.dumps(self.payload(root)))
            second = artifact.read_text(encoding="utf-8")
        self.assertEqual(json.loads(first_result.stdout), {"continue": True})
        self.assertEqual(json.loads(second_result.stdout), {"continue": True})
        self.assertEqual(first, second)
        self.assertEqual(first.count("## Turn 1"), 1)

    def test_missing_transcript_preserves_previous_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifact_path = root / "artifacts/codex-session-session-123.md"
            artifact_path.parent.mkdir()
            artifact_path.write_text("existing\n", encoding="utf-8")
            payload = self.payload(root)
            payload["transcript_path"] = str(root / "secret-name.jsonl")
            result = self.run_cli(root, json.dumps(payload))
            artifact = artifact_path.read_text(encoding="utf-8")
            log = (root / ".codex/hooks/export-session.log").read_text(encoding="utf-8")
        self.assertEqual(json.loads(result.stdout), {"continue": True})
        self.assertEqual(artifact, "existing\n")
        self.assertIn("missing_transcript", log)
        self.assertNotIn("secret-name.jsonl", log)

    def test_invalid_stdin_and_unsafe_session_write_nothing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            invalid = self.run_cli(root, "not-json")
            payload = self.payload(root)
            payload["session_id"] = "..."
            unsafe = self.run_cli(root, json.dumps(payload))
            artifact_directory = root / "artifacts"
        self.assertEqual(json.loads(invalid.stdout), {"continue": True})
        self.assertEqual(json.loads(unsafe.stdout), {"continue": True})
        self.assertFalse(artifact_directory.exists())

    def test_cwd_outside_repo_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = self.payload(root)
            payload["cwd"] = str(root.parent)
            result = self.run_cli(root, json.dumps(payload))
            log = (root / ".codex/hooks/export-session.log").read_text(encoding="utf-8")
        self.assertEqual(json.loads(result.stdout), {"continue": True})
        self.assertIn("cwd_outside_repo", log)
~~~

- [ ] **Step 2: Confirm red state**

~~~bash
python3 -m unittest tests.test_export_session.HookCliTests -v
~~~

Expected: failures because CLI and writer are absent.

- [ ] **Step 3: Implement orchestration**

Exact behavior:

1. argparse accepts optional --repo-root, default Path(__file__).resolve().parents[2].
2. main catches invalid stdin JSON, calls run_hook(None), prints one JSON line {"continue": true}, returns 0.
3. run_hook ignores non-Stop events.
4. Invalid session ID, external cwd, or missing transcript logs event and returns.
5. parse/render exceptions caught: OSError, UnicodeError, ValueError, TypeError.
6. Log format: ISO-8601 UTC timestamp, event, sanitized session, line number. No path or exception text.
7. atomic_write uses NamedTemporaryFile beside destination, flush, os.fsync, os.replace, and best-effort temp cleanup.
8. Destination: repo_root / artifacts / codex-session-<safe-id>.md.
9. Existing destination remains untouched until os.replace succeeds.

Add argparse, datetime, os, sys, and tempfile imports, then implement:

~~~python
def log_event(repo_root, event, session_id="unknown", line=0):
    path = repo_root / ".codex/hooks/export-session.log"
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with path.open("a", encoding="utf-8") as stream:
        stream.write("{} event={} session={} line={}\n".format(
            stamp, event, safe_session_id(session_id) or "unknown", line
        ))


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=str(path.parent),
            prefix=".codex-session-", suffix=".tmp", delete=False,
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


def cwd_is_inside_repo(cwd, repo_root):
    if not isinstance(cwd, str) or not cwd:
        return False
    try:
        root = str(repo_root.resolve())
        return os.path.commonpath([str(Path(cwd).resolve()), root]) == root
    except (OSError, ValueError):
        return False


def run_hook(hook_input, repo_root):
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
    if not isinstance(raw_path, str) or not Path(raw_path).is_file():
        log_event(repo_root, "missing_transcript", session_id)
        return
    model = hook_input.get("model")
    try:
        session = parse_rollout(
            Path(raw_path),
            session_id,
            model if isinstance(model, str) and model else "unknown",
            lambda event, line: log_event(repo_root, event, session_id, line),
        )
        destination = repo_root / "artifacts" / (
            "codex-session-{}.md".format(session_id)
        )
        atomic_write(destination, render_markdown(session))
    except (OSError, UnicodeError, ValueError, TypeError):
        log_event(repo_root, "export_failed", session_id)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
    )
    args = parser.parse_args(argv)
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
~~~

- [ ] **Step 4: Verify on both Python interpreters**

~~~bash
python3 -m unittest tests.test_export_session -v
/usr/bin/python3 -m py_compile .codex/hooks/export_session.py
/usr/bin/python3 -m unittest tests.test_export_session -v
~~~

Expected: both suites report Ran 10 tests, OK; compile exits 0.

- [ ] **Step 5: Commit**

~~~bash
git add .codex/hooks/export_session.py tests/test_export_session.py
git commit -m "feat: export Codex session artifacts atomically"
~~~

---

### Task 4: Project wiring and AI disclosure

**Files:**
- Create: .codex/hooks.json
- Create: AI_USAGE.md
- Create: .gitignore
- Modify: tests/test_export_session.py

**Interfaces:**
- Stop handler invokes /usr/bin/python3 with exporter resolved through git rev-parse --show-toplevel.
- AI_USAGE.md links ./artifacts/ and retains unchecked human-review items.

- [ ] **Step 1: Add failing wiring tests**

~~~python
class ProjectWiringTests(unittest.TestCase):
    def test_stop_hook(self):
        config = json.loads((ROOT / ".codex/hooks.json").read_text())
        handler = config["hooks"]["Stop"][0]["hooks"][0]
        self.assertEqual(handler["type"], "command")
        self.assertIn("git rev-parse --show-toplevel", handler["command"])
        self.assertIn(".codex/hooks/export_session.py", handler["command"])
        self.assertEqual(handler["timeout"], 30)

    def test_ai_usage_required_sections(self):
        document = (ROOT / "AI_USAGE.md").read_text()
        for heading in (
            "## 사용한 도구와 모델", "## 적용한 작업 범위",
            "## 핵심 프롬프트 요약", "## 사람이 최종 검증한 내용",
            "## 전체 프롬프트와 작업 기록",
        ):
            self.assertIn(heading, document)
        self.assertIn("[세션 기록 디렉터리](./artifacts/)", document)
        self.assertIn("- [ ]", document)
~~~

- [ ] **Step 2: Confirm red state**

~~~bash
python3 -m unittest tests.test_export_session.ProjectWiringTests -v
~~~

Expected: missing hooks.json and AI_USAGE.md errors.

- [ ] **Step 3: Create hook config**

~~~json
{
  "description": "Export reviewable Codex session evidence for AI_USAGE.md.",
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/export_session.py\"",
        "timeout": 30,
        "statusMessage": "Exporting Codex session record"
      }]
    }]
  }
}
~~~

- [ ] **Step 4: Create AI_USAGE.md**

Required content:

- Tool: OpenAI Codex.
- Model: gpt-5.6-sol.
- Scope: requirements analysis, structure decisions, usage-record automation, later code/test/review assistance.
- Prompt summary: original-file separation; Stop Hook recording; internal-message exclusion; redaction plus human review.
- Four unchecked verification items: secret scan, transcript accuracy, tests/app behavior, disclosure accuracy.
- Link: `./artifacts/` 세션 기록 디렉터리.
- Warning: generated files need manual review before submission.

~~~markdown
# AI 사용 내역

## 사용한 도구와 모델

- 도구: OpenAI Codex
- 모델: gpt-5.6-sol

## 적용한 작업 범위

- 과제 요구사항 분석과 프로젝트 구조 결정
- Codex 사용 기록 자동화 설계 및 구현
- 이후 구현 과정의 코드 작성, 테스트, 검토 보조

## 핵심 프롬프트 요약

- 과제 원본 문서를 별도 디렉터리로 분리
- Stop Hook으로 사용자 프롬프트, 도구 작업, 최종 응답 기록
- 시스템·개발자 지침과 내부 reasoning 제외
- 비밀정보 자동 마스킹 후 사람 검토

## 사람이 최종 검증한 내용

- [ ] 비밀정보와 민감정보 제거 확인
- [ ] 프롬프트와 작업 결과 정확성 확인
- [ ] 테스트 결과와 애플리케이션 동작 확인
- [ ] 도구, 모델, 작업 범위 정확성 확인

## 전체 프롬프트와 작업 기록

- [세션 기록 디렉터리](./artifacts/)

자동 마스킹은 보조 수단이므로 제출 전 사람 검토가 필요합니다.
~~~

- [ ] **Step 5: Create .gitignore**

~~~gitignore
.codex/hooks/export-session.log
artifacts/.codex-session-*.tmp
__pycache__/
*.pyc
~~~

- [ ] **Step 6: Verify full system**

~~~bash
/usr/bin/python3 -m py_compile .codex/hooks/export_session.py
/usr/bin/python3 -m unittest discover -s tests -v
git diff --check
~~~

Expected: compile exits 0; Ran 12 tests, OK; no diff-check output.

- [ ] **Step 7: Isolated smoke test**

Create temporary root with mktemp -d. Pipe Stop JSON referencing absolute synthetic fixture path and temporary cwd into exporter with --repo-root. Assert generated file exists; contains “Create structure” and “Structure created”; excludes “internal instruction”, “private reasoning”, and “Working”. Expected stdout: {"continue": true}.

- [ ] **Step 8: Trust hook**

Start/resume Codex in repository. Run /hooks. Review .codex/hooks.json exact hash. Trust one Stop handler named “Exporting Codex session record.” Changed hook hashes must be reviewed again.

- [ ] **Step 9: Commit wiring**

~~~bash
git add .codex/hooks.json AI_USAGE.md .gitignore tests/test_export_session.py
git commit -m "chore: wire Codex usage recording"
~~~

## Final Verification

~~~bash
/usr/bin/python3 -m py_compile .codex/hooks/export_session.py
/usr/bin/python3 -m unittest discover -s tests -v
git diff --check HEAD~3..HEAD
git status --short
~~~

Expected:

- Compile exits 0.
- Suite reports Ran 12 tests, OK.
- Diff check emits no output.
- Status shows only pre-existing assignment-original/ unless reviewed generated artifacts were added.

Before submission, human opens every artifacts/codex-session-*.md, verifies redaction and accuracy, then checks only completed AI_USAGE.md verification items.
