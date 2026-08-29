import hashlib
import json
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import session_records
import session_hook


class RecordStorageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = session_records.RecordStore(self.root, clock=lambda: "2026-08-29T12:00:00Z")

    def tearDown(self):
        self.temporary.cleanup()

    def test_atomic_bytes_are_private_and_complete(self):
        path = self.root / ".codex" / "review-pending" / "value.json"
        self.store.atomic_write_bytes(path, b'{"ok":true}\n')
        self.assertEqual(path.read_bytes(), b'{"ok":true}\n')
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(list(path.parent.glob("*.tmp")), [])

    def test_metadata_is_commit_marker_for_snapshot(self):
        base = self.store.initialize_session("session-123")
        committed = self.store.commit_snapshot(base, b"# candidate\n", {
            "last_turn_id": "turn-1",
            "snapshot_kind": "prompt_minimum",
            "last_hook_event": "UserPromptSubmit",
            "last_event_key": "UserPromptSubmit:session-123:turn-1:1",
            "parser_version": "codex-rollout-v1",
            "transcript": None,
        })
        metadata = self.store.read_metadata(committed.record_id)
        self.assertEqual(metadata["revision"], 1)
        self.assertEqual(metadata["state"], "pending")
        self.assertEqual(metadata["artifact_sha256"], hashlib.sha256(b"# candidate\n").hexdigest())

    def test_previous_slot_recovers_interrupted_commit(self):
        base = self.store.initialize_session("session-123")
        committed = self.store.commit_snapshot(base, b"first\n", {
            "last_turn_id": "turn-1", "snapshot_kind": "prompt_minimum", "last_hook_event": "UserPromptSubmit", "parser_version": "codex-rollout-v1", "transcript": None,
        })
        paths = self.store.paths(committed.record_id)
        paths.previous.write_bytes(paths.markdown.read_bytes())
        paths.markdown.write_bytes(b"corrupt\n")
        self.assertEqual(self.store.recover_record(committed.record_id), "previous")
        self.assertEqual(paths.markdown.read_bytes(), b"first\n")

    def test_event_log_has_contract_fields_and_redacts_path_error(self):
        path = session_records.write_event(self.root, "Stop", "session-123", "turn-1", "error", "/private/transcript.jsonl", timestamp="2026-08-29T12:00:00Z", nonce="abc123")
        event = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(event["event"], "Stop")
        self.assertEqual(event["error"], "invalid_error_code")
        self.assertNotIn("/private", path.read_text(encoding="utf-8"))

    def test_metadata_failure_restores_snapshot_and_metadata(self):
        base = self.store.initialize_session("session-123")
        first = self.store.commit_snapshot(base, b"first\n", {
            "last_turn_id": "turn-1", "snapshot_kind": "prompt_minimum", "last_hook_event": "UserPromptSubmit", "parser_version": "codex-rollout-v1", "transcript": None,
        })
        original_replace = session_records.os.replace

        def fail_metadata(source, destination):
            if str(destination).endswith(".json") and "sessions" not in str(destination):
                raise OSError("injected")
            return original_replace(source, destination)

        with mock.patch.object(session_records.os, "replace", side_effect=fail_metadata):
            with self.assertRaises(OSError):
                self.store.commit_snapshot(first, b"second\n", {
                    "last_turn_id": "turn-2", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None,
                })
        self.assertEqual(self.store.paths(first.record_id).markdown.read_bytes(), b"first\n")
        self.assertEqual(self.store.read_metadata(first.record_id)["revision"], 1)


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = session_records.RecordStore(self.root, clock=lambda: "2026-08-29T12:00:00Z")

    def tearDown(self):
        self.temporary.cleanup()

    def test_prompt_stop_end_resume_clear_flow(self):
        prompt = self.store.record_prompt("session-123", "turn-1", b"prompt\n", "codex-rollout-v1")
        self.assertEqual((prompt.segment, prompt.revision, prompt.state), (1, 1, "pending"))
        base = self.store.begin_stop("session-123")
        stopped = self.store.commit_stop(base, "turn-1", b"complete\n", {"size": 9, "mtime_ns": 10, "observed_at": "2026-08-29T12:00:00Z", "last_record_timestamp": "2026-08-29T11:59:59Z", "sha256": "a" * 64}, "codex-rollout-v1")
        self.assertEqual((stopped.revision, stopped.state), (2, "pending"))
        closed = self.store.session_end("session-123")
        self.assertEqual((closed.revision, closed.state), (3, "closed"))
        resumed = self.store.session_start("session-123", "resume")
        self.assertEqual((resumed.revision, resumed.state), (4, "pending"))
        reserved = self.store.session_start("session-123", "clear")
        next_prompt = self.store.record_prompt("session-123", "turn-2", b"new topic\n", "codex-rollout-v1")
        self.assertEqual((reserved.segment, next_prompt.segment, next_prompt.generation), (2, 2, 2))
        self.assertEqual(self.store.read_metadata("session-123.s0001")["state"], "closed")

    def test_old_stop_cannot_overwrite_new_prompt(self):
        self.store.record_prompt("session-123", "turn-1", b"first\n", "codex-rollout-v1")
        old_base = self.store.begin_stop("session-123")
        newest = self.store.record_prompt("session-123", "turn-2", b"second\n", "codex-rollout-v1")
        with self.assertRaises(session_records.RecordError) as raised:
            self.store.commit_stop(old_base, "turn-1", b"stale\n", None, "codex-rollout-v1")
        self.assertEqual(raised.exception.code, "stale_revision")
        self.assertEqual(self.store.paths(newest.record_id).markdown.read_bytes(), b"second\n")

    def test_parser_error_preserves_snapshot(self):
        current = self.store.record_prompt("session-123", "turn-1", b"valid\n", "codex-rollout-v1")
        base = self.store.begin_stop("session-123")
        status = self.store.record_stop_error(base, "turn-1", "malformed_json")
        metadata = self.store.read_metadata(current.record_id)
        self.assertEqual(status, "error")
        self.assertEqual(metadata["last_error"]["code"], "malformed_json")
        self.assertEqual(self.store.paths(current.record_id).markdown.read_bytes(), b"valid\n")

    def test_published_record_is_not_reopened(self):
        current = self.store.record_prompt("session-123", "turn-1", b"valid\n", "codex-rollout-v1")
        closed = self.store.session_end("session-123")
        digest = self.store.read_metadata(closed.record_id)["artifact_sha256"]
        self.store.mark_published(closed.record_id, digest)
        reopened = self.store.session_start("session-123", "resume")
        self.assertEqual(reopened.segment, 2)
        self.assertEqual(self.store.read_metadata(current.record_id)["state"], "published")

    def test_legacy_candidate_migrates_byte_for_byte(self):
        pending = self.root / ".codex" / "review-pending"
        pending.mkdir(parents=True)
        legacy = pending / "codex-session-session-123.md"
        legacy.write_bytes(b"legacy bytes\n")
        migrated = self.store.migrate_legacy("session-123")
        self.assertEqual(migrated.record_id, "session-123.s0001")
        self.assertFalse(legacy.exists())
        self.assertEqual(self.store.paths(migrated.record_id).markdown.read_bytes(), b"legacy bytes\n")


class HookDispatcherTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.transcript = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"

    def tearDown(self):
        self.temporary.cleanup()

    def payload(self, event, **extra):
        value = {"hook_event_name": event, "session_id": "session-123", "cwd": str(self.root), "turn_id": "turn-1"}
        value.update(extra)
        return value

    def test_user_prompt_creates_minimum_snapshot(self):
        outcome = session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="api_key=secret"), self.root)
        store = session_records.RecordStore(self.root)
        metadata = store.read_metadata("session-123.s0001")
        candidate = store.paths("session-123.s0001").markdown.read_text(encoding="utf-8")
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(metadata["snapshot_kind"], "prompt_minimum")
        self.assertIn("api_key=[REDACTED]", candidate)
        self.assertNotIn("secret", candidate)

    def test_stop_replaces_provisional_snapshot(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="Create structure"), self.root)
        outcome = session_hook.handle_hook(self.payload("Stop", transcript_path=str(self.transcript), model="gpt-5.6-sol"), self.root)
        store = session_records.RecordStore(self.root)
        metadata = store.read_metadata("session-123.s0001")
        candidate = store.paths("session-123.s0001").markdown.read_text(encoding="utf-8")
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(metadata["snapshot_kind"], "turn_complete")
        self.assertIn("Structure created", candidate)
        self.assertEqual(len(metadata["transcript"]["sha256"]), 64)

    def test_parse_failure_preserves_previous_candidate(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="safe"), self.root)
        store = session_records.RecordStore(self.root)
        before = store.paths("session-123.s0001").markdown.read_bytes()
        broken = self.root / "broken.jsonl"
        broken.write_text("{bad\n", encoding="utf-8")
        outcome = session_hook.handle_hook(self.payload("Stop", transcript_path=str(broken)), self.root)
        self.assertEqual(outcome.status, "error")
        self.assertEqual(outcome.error, "malformed_json")
        self.assertEqual(store.paths("session-123.s0001").markdown.read_bytes(), before)

    def test_session_end_does_not_call_parser(self):
        session_hook.handle_hook(self.payload("UserPromptSubmit", prompt="safe"), self.root)
        with mock.patch.object(session_hook, "read_transcript", side_effect=AssertionError("parser called")):
            outcome = session_hook.handle_hook(self.payload("SessionEnd", transcript_path=str(self.transcript)), self.root)
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(session_records.RecordStore(self.root).read_metadata("session-123.s0001")["state"], "closed")


if __name__ == "__main__":
    unittest.main()
