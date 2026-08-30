#!/usr/bin/env python3
import contextlib
import datetime
import hashlib
import hmac
import json
import os
import re
import stat
from dataclasses import dataclass
from pathlib import Path

from artifact_contract import artifact_filename, split_record_id
from render_artifact_index import (
    atomic_write_index,
    index_lock,
    list_published_artifact_names,
    rebuild_pending_index,
    render_index,
)
from session_records import RecordError, RecordStore, canonical_json


START = "<!-- reviewed-records:start -->"
END = "<!-- reviewed-records:end -->"


class PublicationError(ValueError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class PublicationCancelled(PublicationError):
    pass


cancel_requested = False


def request_cancel(signum=None, frame=None):
    del signum, frame
    global cancel_requested
    cancel_requested = True


def clear_cancel():
    global cancel_requested
    cancel_requested = False


def check_cancel():
    if cancel_requested:
        raise PublicationCancelled("review_cancelled")


@dataclass(frozen=True)
class ReviewReceipt:
    record_id: str
    session_id: str
    revision: int
    candidate_sha256: str
    reviewer: str
    reviewed_at: str
    risk_scanner_version: str
    blocking_count: int
    review_count: int
    human_approved: bool
    approval_channel: str


@dataclass(frozen=True)
class PublicationResult:
    status: str
    record_id: str
    error: str = ""


def reviewed_content(candidate: bytes, receipt: ReviewReceipt) -> bytes:
    text = candidate.decode("utf-8")
    metadata = [
        "",
        "- Review status: `human-reviewed`",
        "- Reviewed by: `{}`".format(" ".join(receipt.reviewer.replace("`", "'").split())),
        "- Reviewed at: `{}`".format(receipt.reviewed_at),
        "- Reviewed candidate SHA-256: `{}`".format(receipt.candidate_sha256),
    ]
    lines = text.splitlines()
    return ("\n".join(lines[:1] + metadata + lines[1:]).rstrip() + "\n").encode("utf-8")


def update_usage(document: str, filenames, indexer) -> str:
    if document.count(START) != 1 or document.count(END) != 1:
        raise PublicationError("usage_markers_invalid")
    start_position = document.index(START)
    end_position = document.index(END)
    if start_position >= end_position:
        raise PublicationError("usage_markers_invalid")
    links = []
    for filename in sorted(set(filenames)):
        identifier = indexer.session_id_from_artifact_filename(filename)
        if identifier is None:
            raise PublicationError("invalid_public_filename")
        links.append("- [검토 완료 세션 `{}`](./artifacts/{})".format(identifier, filename))
    managed = START + "\n" + ("\n".join(links) + "\n" if links else "") + END
    return document[:start_position] + managed + document[end_position + len(END):]


def read_candidate_once(path: Path):
    no_follow = getattr(os, "O_NOFOLLOW", None)
    if no_follow is None:
        raise PublicationError("no_follow_unsupported")
    try:
        descriptor = os.open(str(path), os.O_RDONLY | no_follow | getattr(os, "O_CLOEXEC", 0))
    except OSError as error:
        raise PublicationError("candidate_not_regular") from error
    try:
        before = os.fstat(descriptor)
        if not stat.S_ISREG(before.st_mode):
            raise PublicationError("candidate_not_regular")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1024 * 1024)
            if not chunk:
                break
            chunks.append(chunk)
        after = os.fstat(descriptor)
    finally:
        os.close(descriptor)
    raw = b"".join(chunks)
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns) or len(raw) != after.st_size:
        raise PublicationError("candidate_changed")
    return raw


def journal_path(repo_root, record_id):
    return repo_root / ".codex" / "review-pending" / "publications" / (record_id + ".json")


def write_journal(repo_root, receipt, state, completed_steps, last_error=None):
    payload = {
        "schema_version": 1,
        "transaction_key": "{}:{}".format(receipt.record_id, receipt.candidate_sha256),
        "record_id": receipt.record_id,
        "session_id": receipt.session_id,
        "candidate_revision": receipt.revision,
        "candidate_sha256": receipt.candidate_sha256,
        "reviewer": receipt.reviewer,
        "reviewed_at": receipt.reviewed_at,
        "risk_scanner_version": receipt.risk_scanner_version,
        "blocking_count": receipt.blocking_count,
        "review_count": receipt.review_count,
        "human_approved": receipt.human_approved,
        "approval_channel": receipt.approval_channel,
        "state": state,
        "completed_steps": sorted(set(completed_steps)),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "last_error": last_error,
    }
    path = journal_path(repo_root, receipt.record_id)
    RecordStore(repo_root).atomic_write_bytes(path, canonical_json(payload))
    return payload


def read_journal(repo_root, record_id):
    path = journal_path(repo_root, record_id)
    if path.is_symlink() or not path.is_file():
        raise PublicationError("journal_missing")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise PublicationError("journal_invalid") from error
    if not isinstance(value, dict) or value.get("schema_version") != 1:
        raise PublicationError("journal_invalid")
    return value


def journal_status(repo_root, record_id):
    return read_journal(repo_root, record_id)


def validate_receipt(receipt):
    if not receipt.human_approved or receipt.approval_channel != "interactive-tty":
        raise PublicationError("human_approval_required")
    if receipt.blocking_count != 0:
        raise PublicationError("blocking_findings")
    if split_record_id(receipt.record_id) is None or receipt.session_id != split_record_id(receipt.record_id)[0]:
        raise PublicationError("invalid_record_id")
    if not re.fullmatch(r"[0-9a-f]{64}", receipt.candidate_sha256):
        raise PublicationError("invalid_candidate_digest")
    if not isinstance(receipt.reviewer, str) or not receipt.reviewer.strip() or len(receipt.reviewer) > 128 or not receipt.reviewer.isprintable():
        raise PublicationError("invalid_reviewer")


def _public_review_matches(path, digest):
    if path.is_symlink() or not path.is_file():
        return False
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError):
        return False
    return "- Reviewed candidate SHA-256: `{}`".format(digest) in lines


def _mark_step(completed, step):
    completed = list(completed)
    if step not in completed:
        completed.append(step)
    return completed


def publish_receipt(repo_root: Path, receipt: ReviewReceipt) -> PublicationResult:
    validate_receipt(receipt)
    store = RecordStore(repo_root)
    parsed = split_record_id(receipt.record_id)
    session_id = parsed[0]
    artifacts = repo_root / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    with store.session_lock(session_id):
        with index_lock(artifacts / ".index.lock"):
            paths = store.paths(receipt.record_id)
            candidate = read_candidate_once(paths.markdown)
            metadata = store.read_metadata(receipt.record_id)
            if not hmac.compare_digest(metadata.get("artifact_sha256", ""), receipt.candidate_sha256):
                raise PublicationError("snapshot_digest_mismatch")
            if not hmac.compare_digest(hashlib.sha256(candidate).hexdigest(), receipt.candidate_sha256):
                raise PublicationError("candidate_changed")
            destination = artifacts / artifact_filename(receipt.record_id)
            reviewed = reviewed_content(candidate, receipt)
            if metadata.get("state") == "published" and _public_review_matches(destination, receipt.candidate_sha256):
                return PublicationResult("already_published", receipt.record_id)
            if metadata.get("state") != "closed":
                raise PublicationError("record_not_closed")
            if metadata.get("revision") != receipt.revision:
                raise PublicationError("candidate_changed")
            current = store.current_ref(session_id, migrate=False)
            if current is None or current.record_id != receipt.record_id or current.state != "closed":
                raise PublicationError("record_not_closed")
            if current.revision != receipt.revision:
                raise PublicationError("candidate_changed")
            journal = None
            try:
                journal = read_journal(repo_root, receipt.record_id)
            except PublicationError as error:
                if error.code != "journal_missing":
                    raise
                journal = write_journal(repo_root, receipt, "prepared", [])
            if journal.get("state") == "complete":
                return PublicationResult("already_published", receipt.record_id)
            completed = journal.get("completed_steps", [])
            try:
                check_cancel()
                if destination.exists():
                    if not _public_review_matches(destination, receipt.candidate_sha256):
                        raise PublicationError("publication_conflict")
                else:
                    store.atomic_write_bytes(destination, reviewed)
                completed = _mark_step(completed, "artifact")
                journal = write_journal(repo_root, receipt, "committing", completed)
                check_cancel()
                filenames = list_published_artifact_names(artifacts / "index.md", artifacts)
                if destination.name not in filenames:
                    filenames.append(destination.name)
                atomic_write_index(artifacts / "index.md", render_index(filenames))
                completed = _mark_step(completed, "public_index")
                check_cancel()
                usage_path = repo_root / "AI_USAGE.md"
                usage = usage_path.read_text(encoding="utf-8")
                import render_artifact_index
                atomic_usage = update_usage(usage, filenames, render_artifact_index)
                store.atomic_write_bytes(usage_path, atomic_usage.encode("utf-8"))
                completed = _mark_step(completed, "ai_usage")
                check_cancel()
                if metadata.get("state") != "published":
                    store.mark_published_locked(current, receipt.record_id, receipt.candidate_sha256)
                completed = _mark_step(completed, "metadata")
                check_cancel()
                rebuild_pending_index(store.pending)
                completed = _mark_step(completed, "pending_index")
                write_journal(repo_root, receipt, "complete", completed)
                return PublicationResult("published", receipt.record_id)
            except PublicationCancelled:
                rollback_journal(repo_root, receipt.record_id, assume_locked=True)
                raise


def receipt_from_journal(journal):
    return ReviewReceipt(journal["record_id"], journal["session_id"], journal["candidate_revision"], journal["candidate_sha256"], journal["reviewer"], journal["reviewed_at"], journal.get("risk_scanner_version", "session-review-v1"), journal.get("blocking_count", 0), journal.get("review_count", 0), True, "interactive-tty")


def resume_journal(repo_root, record_id):
    return publish_receipt(repo_root, receipt_from_journal(read_journal(repo_root, record_id)))


def rollback_journal(repo_root, record_id, assume_locked=False):
    journal = read_journal(repo_root, record_id)
    store = RecordStore(repo_root)
    artifacts = repo_root / "artifacts"
    session_context = contextlib.nullcontext() if assume_locked else store.session_lock(journal["session_id"])
    index_context = contextlib.nullcontext() if assume_locked else index_lock(artifacts / ".index.lock")
    with session_context:
        with index_context:
            destination = artifacts / artifact_filename(record_id)
            if destination.is_file() and _public_review_matches(destination, journal["candidate_sha256"]):
                destination.unlink()
            filenames = []
            if artifacts.exists():
                filenames = list_published_artifact_names(artifacts / "index.md", artifacts)
                atomic_write_index(artifacts / "index.md", render_index([name for name in filenames if name != destination.name]))
                filenames = [name for name in filenames if name != destination.name]
                usage_path = repo_root / "AI_USAGE.md"
                if usage_path.is_file():
                    import render_artifact_index
                    store.atomic_write_bytes(usage_path, update_usage(usage_path.read_text(encoding="utf-8"), filenames, render_artifact_index).encode("utf-8"))
            current = store.current_ref(journal["session_id"], migrate=False)
            if current is not None and current.state == "published":
                store._rewrite_state(current, "closed", "PublishRollback")
            rebuild_pending_index(store.pending)
            write_journal(repo_root, receipt_from_journal(journal), "cancelled", journal.get("completed_steps", []), "review_cancelled")
    return PublicationResult("cancelled", record_id)
