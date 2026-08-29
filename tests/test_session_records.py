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


if __name__ == "__main__":
    unittest.main()
