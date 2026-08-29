#!/usr/bin/env python3
import hashlib
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from export_session import SECRET_PATTERNS, redact


SCANNER_VERSION = "session-review-v1"
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9+/=_-]{40,}")


@dataclass(frozen=True)
class Finding:
    level: str
    code: str
    record_id: str
    context: str


@dataclass(frozen=True)
class ReviewSummary:
    record_id: str
    blocking: List[Finding]
    review: List[Finding]
    info: List[Finding]


def entropy(value: str) -> float:
    counts = {character: value.count(character) for character in set(value)}
    length = float(len(value))
    return -sum((count / length) * math.log(count / length, 2) for count in counts.values())


def context_for(text: str, start: int, end: int) -> str:
    heading = text.rfind("\n#", 0, start)
    left = 0 if heading < 0 else heading + 1
    right = text.find("\n#", end)
    right = len(text) if right < 0 else right
    context = text[left:right]
    raw = context.encode("utf-8")
    if len(raw) <= 2048:
        return redact(context, Path("/"))
    return redact(raw[:2048].decode("utf-8", "ignore"), Path("/")) + "\n[context truncated]"


def scan_candidate(candidate: bytes, metadata: Dict[str, object]) -> ReviewSummary:
    text = candidate.decode("utf-8")
    record = metadata.get("record_id", "unknown")
    blocking = []
    review = []
    info = []
    if metadata.get("last_hook_status") == "error" or metadata.get("last_error") is not None:
        blocking.append(Finding("BLOCKING", "incomplete_snapshot", record, "metadata error state"))
    if hashlib.sha256(candidate).hexdigest() != metadata.get("artifact_sha256"):
        blocking.append(Finding("BLOCKING", "snapshot_hash_mismatch", record, "metadata digest mismatch"))
    for pattern, _replacement in SECRET_PATTERNS:
        match = pattern.search(text)
        if match:
            blocking.append(Finding("BLOCKING", "unredacted_secret", record, context_for(text, match.start(), match.end())))
            break
    if "### Tool activity" in text or "**Input**" in text or "**Output**" in text:
        review.append(Finding("REVIEW", "tool_activity", record, context_for(text, 0, len(text))))
    for marker in ("error", "failed", "cancelled"):
        match = re.search(r"(?im)^.*\b{}\b.*$".format(marker), text)
        if match:
            review.append(Finding("REVIEW", "error_status", record, context_for(text, match.start(), match.end())))
            break
    for match in re.finditer(r"```[^\n]*\n(.*?)\n```", text, re.S):
        if len(match.group(1).encode("utf-8")) > 32 * 1024:
            review.append(Finding("REVIEW", "large_block", record, context_for(text, match.start(), match.end())))
    redacted = text.find("[REDACTED]")
    if redacted >= 0:
        review.append(Finding("REVIEW", "redacted_context", record, context_for(text, redacted, redacted + 10)))
    for match in TOKEN_PATTERN.finditer(text):
        token = match.group(0)
        if entropy(token) >= 4.0 and not any(pattern.search(token) for pattern, _replacement in SECRET_PATTERNS):
            review.append(Finding("REVIEW", "credential_like", record, context_for(text, match.start(), match.end())))
            break
    info.extend([
        Finding("INFO", "sha256", record, str(metadata.get("artifact_sha256", ""))),
        Finding("INFO", "parser_version", record, str(metadata.get("parser_version", "unknown"))),
    ])
    return ReviewSummary(record, blocking, review, info)


def format_summary(summary: ReviewSummary) -> str:
    lines = ["Record: {}".format(summary.record_id), "", "BLOCKING  {}".format(len(summary.blocking)), "REVIEW    {}".format(len(summary.review)), "INFO      {}".format(len(summary.info))]
    for finding in summary.blocking + summary.review:
        lines.extend(["", "[{}] {}".format(finding.level, finding.code), finding.context])
    return "\n".join(lines) + "\n"
