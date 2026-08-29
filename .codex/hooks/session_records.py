#!/usr/bin/env python3
import contextlib
import datetime
import fcntl
import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Iterator, Optional

from artifact_contract import artifact_filename, metadata_filename, record_id, split_record_id


SCHEMA_VERSION = 1
LOCK_TIMEOUT_SECONDS = 1.0


class RecordError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class RecordRef:
    session_id: str
    generation: int
    segment: int
    revision: int
    state: str

    @property
    def record_id(self):
        return record_id(self.session_id, self.segment)


@dataclass(frozen=True)
class RecordPaths:
    markdown: Path
    metadata: Path
    previous: Path


def utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Dict[str, object]) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def safe_log_token(value, nullable=False):
    if value is None and nullable:
        return None
    if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9._-]{1,128}", value):
        return value
    return None if nullable else "unknown"


def write_event(repo_root, event, session_id, turn_id, status, error, timestamp=None, nonce=None):
    safe_status = status if status in {"ok", "error", "stale"} else "error"
    safe_error = error if error is None or (isinstance(error, str) and re.fullmatch(r"[a-z0-9_]{1,64}", error)) else "invalid_error_code"
    payload = {
        "event": safe_log_token(event),
        "session_id": safe_log_token(session_id),
        "turn_id": safe_log_token(turn_id, nullable=True),
        "status": safe_status,
        "error": safe_error,
        "timestamp": timestamp or utc_now(),
    }
    directory = repo_root / ".codex" / "hooks" / "session-record-events"
    name = "{}-{}-{}.jsonl".format(payload["timestamp"].replace(":", ""), os.getpid(), nonce or secrets.token_hex(8))
    path = directory / name
    RecordStore(repo_root).atomic_write_bytes(path, canonical_json(payload))
    return path


class RecordStore:
    def __init__(self, repo_root: Path, clock: Callable[[], str] = utc_now):
        self.repo_root = repo_root
        self.pending = repo_root / ".codex" / "review-pending"
        self.clock = clock

    def paths(self, record: str) -> RecordPaths:
        return RecordPaths(
            self.pending / artifact_filename(record),
            self.pending / metadata_filename(record),
            self.pending / ("." + artifact_filename(record)[:-3] + ".previous.md"),
        )

    def manifest_path(self, session_id: str) -> Path:
        return self.pending / "sessions" / (session_id + ".json")

    def atomic_write_bytes(self, path: Path, content: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary = tempfile.mkstemp(prefix="." + path.name + ".", suffix=".tmp", dir=str(path.parent))
        try:
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                descriptor = -1
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, str(path))
            temporary = ""
            directory_fd = os.open(str(path.parent), os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        finally:
            if descriptor >= 0:
                os.close(descriptor)
            if temporary:
                try:
                    os.unlink(temporary)
                except FileNotFoundError:
                    pass

    @contextlib.contextmanager
    def session_lock(self, session_id: str) -> Iterator[None]:
        lock_path = self.pending / "sessions" / (session_id + ".lock")
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        with lock_path.open("a+") as stream:
            os.chmod(lock_path, 0o600)
            deadline = time.monotonic() + LOCK_TIMEOUT_SECONDS
            while True:
                try:
                    fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise RecordError("lock_timeout")
                    time.sleep(0.05)
            try:
                yield
            finally:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)

    def read_json(self, path: Path):
        if path.is_symlink() or not path.is_file():
            raise RecordError("invalid_state_file")
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            raise RecordError("invalid_state_file") from error
        if not isinstance(value, dict) or value.get("schema_version") != SCHEMA_VERSION:
            raise RecordError("invalid_state_file")
        return value

    def read_manifest(self, session_id: str):
        return self.read_json(self.manifest_path(session_id))

    def read_metadata(self, record: str):
        return self.read_json(self.paths(record).metadata)

    def write_manifest_ref(self, ref: RecordRef):
        value = {
            "schema_version": SCHEMA_VERSION,
            "session_id": ref.session_id,
            "generation": ref.generation,
            "current_segment": ref.segment,
            "current_record_id": ref.record_id,
            "revision": ref.revision,
            "updated_at": self.clock(),
        }
        self.atomic_write_bytes(self.manifest_path(ref.session_id), canonical_json(value))

    def initialize_session(self, session_id: str):
        with self.session_lock(session_id):
            path = self.manifest_path(session_id)
            if path.exists():
                return self.current_ref(session_id, migrate=False)
            ref = RecordRef(session_id, 1, 1, 0, "pending")
            self.write_manifest_ref(ref)
            return ref

    def current_ref(self, session_id: str, migrate=False):
        if migrate:
            self.migrate_legacy(session_id)
        path = self.manifest_path(session_id)
        if not path.exists():
            return None
        manifest = self.read_manifest(session_id)
        record = manifest.get("current_record_id")
        parsed = split_record_id(record)
        if parsed is None or parsed[0] != session_id:
            raise RecordError("invalid_manifest")
        metadata_path = self.paths(record).metadata
        state = self.read_json(metadata_path).get("state", "pending") if metadata_path.exists() else "pending"
        return RecordRef(session_id, manifest["generation"], manifest["current_segment"], manifest["revision"], state)

    @staticmethod
    def _same_base(current: RecordRef, base: RecordRef):
        return (current.session_id, current.generation, current.segment, current.revision, current.state) == (base.session_id, base.generation, base.segment, base.revision, base.state)

    def commit_snapshot(self, base: RecordRef, markdown: bytes, metadata_fields: Dict[str, object]):
        with self.session_lock(base.session_id):
            current = self.current_ref(base.session_id, migrate=False)
            if current is None or not self._same_base(current, base) or current.state != "pending":
                raise RecordError("stale_revision")
            paths = self.paths(base.record_id)
            old_markdown = paths.markdown.read_bytes() if paths.markdown.is_file() else None
            old_metadata = paths.metadata.read_bytes() if paths.metadata.is_file() else None
            old_manifest = self.manifest_path(base.session_id).read_bytes()
            if old_metadata is not None:
                previous_metadata = json.loads(old_metadata.decode("utf-8"))
                event_key = metadata_fields.get("last_event_key")
                if event_key and previous_metadata.get("last_event_key") == event_key:
                    return current
            revision = base.revision + 1
            transcript = metadata_fields.get("transcript") or {
                "size": None,
                "mtime_ns": None,
                "observed_at": None,
                "last_record_timestamp": None,
                "sha256": None,
            }
            metadata = {
                "schema_version": SCHEMA_VERSION,
                "parser_version": metadata_fields["parser_version"],
                "state": "pending",
                "session_id": base.session_id,
                "record_id": base.record_id,
                "segment": base.segment,
                "generation": base.generation,
                "revision": revision,
                "last_turn_id": metadata_fields.get("last_turn_id"),
                "snapshot_kind": metadata_fields["snapshot_kind"],
                "last_hook_event": metadata_fields["last_hook_event"],
                "last_event_key": metadata_fields.get("last_event_key"),
                "transcript": transcript,
                "artifact_sha256": hashlib.sha256(markdown).hexdigest(),
                "updated_at": self.clock(),
                "last_hook_status": "ok",
                "last_error": None,
            }
            try:
                if old_markdown is not None:
                    os.replace(str(paths.markdown), str(paths.previous))
                self.atomic_write_bytes(paths.markdown, markdown)
                self.atomic_write_bytes(paths.metadata, canonical_json(metadata))
                committed = RecordRef(base.session_id, base.generation, base.segment, revision, "pending")
                self.write_manifest_ref(committed)
            except (OSError, RecordError):
                if old_markdown is None:
                    try:
                        paths.markdown.unlink()
                    except FileNotFoundError:
                        pass
                elif paths.previous.is_file():
                    os.replace(str(paths.previous), str(paths.markdown))
                else:
                    self.atomic_write_bytes(paths.markdown, old_markdown)
                if old_metadata is None:
                    try:
                        paths.metadata.unlink()
                    except FileNotFoundError:
                        pass
                else:
                    self.atomic_write_bytes(paths.metadata, old_metadata)
                self.atomic_write_bytes(self.manifest_path(base.session_id), old_manifest)
                raise
            try:
                paths.previous.unlink()
            except FileNotFoundError:
                pass
            return committed

    def recover_record(self, record: str):
        paths = self.paths(record)
        metadata = self.read_metadata(record)
        expected = metadata.get("artifact_sha256", "")
        if paths.markdown.is_file() and hmac.compare_digest(hashlib.sha256(paths.markdown.read_bytes()).hexdigest(), expected):
            try:
                paths.previous.unlink()
            except FileNotFoundError:
                pass
            return "canonical"
        if paths.previous.is_file() and hmac.compare_digest(hashlib.sha256(paths.previous.read_bytes()).hexdigest(), expected):
            self.atomic_write_bytes(paths.markdown, paths.previous.read_bytes())
            paths.previous.unlink()
            return "previous"
        raise RecordError("snapshot_hash_mismatch")

    def migrate_legacy(self, session_id: str):
        legacy = self.pending / artifact_filename(session_id)
        first_record = record_id(session_id, 1)
        target = self.paths(first_record)
        with self.session_lock(session_id):
            if not legacy.exists():
                return self.current_ref(session_id, migrate=False) if self.manifest_path(session_id).exists() else None
            if target.markdown.exists() or target.metadata.exists():
                raise RecordError("legacy_conflict")
            raw = legacy.read_bytes()
            os.replace(str(legacy), str(target.markdown))
            ref = RecordRef(session_id, 1, 1, 0, "pending")
            metadata = self._metadata_for(ref, raw, {
                "last_turn_id": None,
                "snapshot_kind": "turn_complete",
                "last_hook_event": "Migration",
                "last_event_key": None,
                "parser_version": "legacy-flat-v1",
                "transcript": None,
            })
            try:
                self.atomic_write_bytes(target.metadata, canonical_json(metadata))
                self.write_manifest_ref(ref)
            except (OSError, RecordError):
                os.replace(str(target.markdown), str(legacy))
                raise
            return ref

    def _metadata_for(self, base, markdown, fields):
        transcript = fields.get("transcript") or {
            "size": None, "mtime_ns": None, "observed_at": None,
            "last_record_timestamp": None, "sha256": None,
        }
        return {
            "schema_version": SCHEMA_VERSION,
            "parser_version": fields["parser_version"],
            "state": "pending",
            "session_id": base.session_id,
            "record_id": base.record_id,
            "segment": base.segment,
            "generation": base.generation,
            "revision": base.revision + 1,
            "last_turn_id": fields.get("last_turn_id"),
            "snapshot_kind": fields["snapshot_kind"],
            "last_hook_event": fields["last_hook_event"],
            "last_event_key": fields.get("last_event_key"),
            "transcript": transcript,
            "artifact_sha256": hashlib.sha256(markdown).hexdigest(),
            "updated_at": self.clock(),
            "last_hook_status": "ok",
            "last_error": None,
        }

    def begin_prompt(self, session_id, turn_id):
        self.migrate_legacy(session_id)
        if not self.manifest_path(session_id).exists():
            self.initialize_session(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or current.state != "pending":
                raise RecordError("no_pending_record")
            event_key = "UserPromptSubmit:{}:{}:{}".format(session_id, turn_id or "unknown", current.segment)
            metadata_path = self.paths(current.record_id).metadata
            if metadata_path.exists():
                metadata = self.read_json(metadata_path)
                if metadata.get("last_event_key") == event_key:
                    return current, event_key, "duplicate", self.paths(current.record_id).markdown.read_bytes()
                snapshot_kind = "prompt_provisional"
                previous = self.paths(current.record_id).markdown.read_bytes()
            else:
                snapshot_kind = "prompt_minimum"
                previous = None
            return current, event_key, snapshot_kind, previous

    def commit_prompt(self, base, event_key, snapshot_kind, markdown, turn_id, parser_version):
        if snapshot_kind == "duplicate":
            return base
        return self.commit_snapshot(base, markdown, {
            "last_turn_id": turn_id,
            "snapshot_kind": snapshot_kind,
            "last_hook_event": "UserPromptSubmit",
            "last_event_key": event_key,
            "parser_version": parser_version,
            "transcript": None,
        })

    def record_prompt(self, session_id, turn_id, markdown, parser_version):
        base, key, kind, _ = self.begin_prompt(session_id, turn_id)
        return self.commit_prompt(base, key, kind, markdown, turn_id, parser_version)

    def begin_stop(self, session_id):
        self.migrate_legacy(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or current.state != "pending":
                raise RecordError("no_pending_record")
            return current

    def commit_stop(self, base, turn_id, markdown, transcript_fields, parser_version):
        return self.commit_snapshot(base, markdown, {
            "last_turn_id": turn_id,
            "snapshot_kind": "turn_complete",
            "last_hook_event": "Stop",
            "last_event_key": "Stop:{}:{}".format(base.session_id, turn_id or "unknown"),
            "parser_version": parser_version,
            "transcript": transcript_fields,
        })

    def record_stop_error(self, base, turn_id, code):
        with self.session_lock(base.session_id):
            current = self.current_ref(base.session_id, migrate=False)
            if current != base:
                return "stale"
            metadata_path = self.paths(base.record_id).metadata
            manifest_path = self.manifest_path(base.session_id)
            metadata = self.read_json(metadata_path)
            old_metadata = metadata_path.read_bytes()
            old_manifest = manifest_path.read_bytes()
            metadata.update({
                "revision": base.revision + 1,
                "last_turn_id": turn_id or metadata.get("last_turn_id"),
                "last_hook_event": "Stop",
                "last_event_key": "Stop:{}:{}".format(base.session_id, turn_id or "unknown"),
                "last_hook_status": "error",
                "last_error": {"code": code, "message": code},
                "updated_at": self.clock(),
            })
            try:
                self.atomic_write_bytes(metadata_path, canonical_json(metadata))
                self.write_manifest_ref(RecordRef(base.session_id, base.generation, base.segment, base.revision + 1, base.state))
            except OSError:
                self.atomic_write_bytes(metadata_path, old_metadata)
                self.atomic_write_bytes(manifest_path, old_manifest)
                raise
            return "error"

    def _rewrite_state(self, current, state, event):
        metadata_path = self.paths(current.record_id).metadata
        manifest_path = self.manifest_path(current.session_id)
        metadata = self.read_json(metadata_path)
        old_metadata = metadata_path.read_bytes()
        old_manifest = manifest_path.read_bytes()
        revision = current.revision + 1
        metadata.update({"state": state, "revision": revision, "last_hook_event": event, "last_hook_status": "ok", "last_error": None, "updated_at": self.clock()})
        updated = RecordRef(current.session_id, current.generation, current.segment, revision, state)
        try:
            self.atomic_write_bytes(metadata_path, canonical_json(metadata))
            self.write_manifest_ref(updated)
        except OSError:
            self.atomic_write_bytes(metadata_path, old_metadata)
            self.atomic_write_bytes(manifest_path, old_manifest)
            raise
        return updated

    def _reserve_next(self, current):
        if current.segment >= 9999:
            raise RecordError("segment_exhausted")
        reserved = RecordRef(current.session_id, current.generation + 1, current.segment + 1, 0, "pending")
        self.write_manifest_ref(reserved)
        return reserved

    def session_end(self, session_id):
        self.migrate_legacy(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or not self.paths(current.record_id).metadata.exists():
                return None
            if current.state in {"closed", "published"}:
                return current
            return self._rewrite_state(current, "closed", "SessionEnd")

    def reconcile_session(self, session_id):
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or not self.paths(current.record_id).metadata.exists():
                return current
            self.recover_record(current.record_id)
            metadata = self.read_metadata(current.record_id)
            repaired = RecordRef(session_id, metadata["generation"], metadata["segment"], metadata["revision"], metadata["state"])
            manifest = self.read_manifest(session_id)
            if (manifest["generation"], manifest["current_segment"], manifest["revision"]) != (repaired.generation, repaired.segment, repaired.revision):
                self.write_manifest_ref(repaired)
            return repaired

    def session_start(self, session_id, source):
        if source not in {"startup", "resume", "clear", "compact"}:
            raise RecordError("invalid_session_source")
        self.migrate_legacy(session_id)
        if not self.manifest_path(session_id).exists():
            return self.initialize_session(session_id)
        if source == "startup":
            return self.reconcile_session(session_id)
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None:
                return self.initialize_session(session_id)
            if source == "compact":
                return current
            has_metadata = self.paths(current.record_id).metadata.exists()
            if source == "clear":
                if not has_metadata:
                    return current
                if current.state == "pending":
                    current = self._rewrite_state(current, "closed", "SessionStart")
                return self._reserve_next(current)
            if not has_metadata:
                return current
            if current.state == "closed":
                return self._rewrite_state(current, "pending", "SessionStart")
            if current.state == "published":
                return self._reserve_next(current)
            return current

    def mark_published(self, record, expected_sha256):
        parsed = split_record_id(record)
        if parsed is None:
            raise RecordError("invalid_record_id")
        session_id, _ = parsed
        with self.session_lock(session_id):
            current = self.current_ref(session_id, migrate=False)
            if current is None or current.record_id != record or current.state != "closed":
                raise RecordError("record_not_closed")
            metadata = self.read_metadata(record)
            if not hmac.compare_digest(metadata.get("artifact_sha256", ""), expected_sha256):
                raise RecordError("snapshot_digest_mismatch")
            return self._rewrite_state(current, "published", "Publish")
