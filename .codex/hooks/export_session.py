#!/usr/bin/env python3
import re
from pathlib import Path
from typing import Optional


REDACTED = "[REDACTED]"


def redact_assignment(match):
    value = match.group("value")
    if value[:1] in ('"', "'") and value[-1:] == value[:1]:
        replacement = value[:1] + REDACTED + value[:1]
    else:
        replacement = REDACTED
    return match.group("prefix") + replacement


COOKIE_TOKEN_PATTERN = re.compile(
    r"(?i)(?P<prefix>(?:^|;)\s*token\s*=\s*)"
    r"(?P<value>\"(?:\\.|[^\"\\])*\"|"
    r"'(?:\\.|[^'\\])*'|[^;,\s\"'\r\n]+)"
)
COOKIE_HEADER_PATTERN = re.compile(
    r"(?im)(?P<prefix>\bCookie\s*:\s*)(?P<value>[^\r\n]*)"
)


def redact_cookie_header(match):
    cookies = COOKIE_TOKEN_PATTERN.sub(redact_assignment, match.group("value"))
    return match.group("prefix") + cookies


SECRET_PATTERNS = [
    (
        re.compile(r"(?i)(Authorization\s*:\s*(?:Bearer|Basic)\s+)[^\s\"']+"),
        r"\1" + REDACTED,
    ),
    (
        re.compile(
            r"(?i)(?P<prefix>[\"']?"
            r"(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)"
            r"[\"']?\s*[:=]\s*)"
            r"(?P<value>\"(?:\\.|[^\"\\])*\"|"
            r"'(?:\\.|[^'\\])*'|[^\s&,;]+)"
        ),
        redact_assignment,
    ),
    (
        COOKIE_HEADER_PATTERN,
        redact_cookie_header,
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


def render_markdown(session, home: Optional[Path] = None) -> str:
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

        work_lines = []
        if turn.tools:
            work_lines.extend(["### Tool activity", ""])
            for tool in turn.tools:
                work_lines.extend(
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
            work_lines.extend(
                [
                    "### Assistant response",
                    "",
                    redact("\n\n".join(turn.responses), home),
                    "",
                ]
            )
        if work_lines:
            lines.extend(
                [
                    "<details>",
                    "<summary>작업 내용 보기</summary>",
                    "",
                    *work_lines,
                    "</details>",
                    "",
                ]
            )
    return "\n".join(lines).rstrip() + "\n"


def render_prompt_snapshot(record: str, prompt: str, home: Optional[Path] = None) -> str:
    return "\n".join(
        [
            "# Codex Session `{}`".format(redact(record, home)),
            "",
            "> Human review required before submission. Automatic redaction is best-effort.",
            "",
            "## Provisional turn",
            "",
            "### User prompt",
            "",
            redact(prompt, home),
            "",
        ]
    )


def append_provisional_prompt(markdown: str, turn_id: str, prompt: str, home: Optional[Path] = None) -> str:
    return markdown.rstrip() + "\n" + "\n".join(
        [
            "",
            "## Provisional turn `{}`".format(redact(turn_id, home)),
            "",
            "### User prompt",
            "",
            redact(prompt, home),
            "",
        ]
    )
