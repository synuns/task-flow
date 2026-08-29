import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import transcript_adapter


class TranscriptAdapterTests(unittest.TestCase):
    def test_fixture_returns_watermark_and_digest(self):
        path = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
        snapshot = transcript_adapter.read_transcript(path, "session-123", "fallback")
        raw = path.read_bytes()
        self.assertEqual(snapshot.sha256, hashlib.sha256(raw).hexdigest())
        self.assertEqual(snapshot.size, len(raw))
        self.assertEqual(snapshot.session.turns[0].turn_id, "turn-1")
        self.assertEqual(snapshot.last_record_timestamp, "2026-08-29T01:00:00Z")

    def test_malformed_json_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_bytes(b'{"type":"session_meta","payload":{}}\n{bad\n')
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "malformed_json")

    def test_unknown_optional_record_is_ignored(self):
        source = (ROOT / "tests" / "fixtures" / "codex-rollout.jsonl").read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_bytes(source + b'{"type":"future_optional","payload":{"value":1}}\n')
            snapshot = transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual([turn.turn_id for turn in snapshot.session.turns], ["turn-1", "turn-2"])

    def test_missing_session_boundary_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            path.write_text('{"type":"future_optional","payload":{}}\n', encoding="utf-8")
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "missing_session_meta")

    def test_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target.jsonl"
            target.write_text("{}\n", encoding="utf-8")
            link = root / "link.jsonl"
            link.symlink_to(target)
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(link, "session-123", "model")
        self.assertEqual(raised.exception.code, "invalid_transcript_file")

    def test_changed_file_is_rejected(self):
        path = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
        before = path.stat()
        changed = mock.Mock(
            st_mode=before.st_mode,
            st_ino=before.st_ino,
            st_size=before.st_size + 1,
            st_mtime_ns=before.st_mtime_ns + 1,
        )
        with mock.patch.object(transcript_adapter.os, "fstat", side_effect=[before, changed]):
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                transcript_adapter.read_transcript(path, "session-123", "model")
        self.assertEqual(raised.exception.code, "transcript_changed")


if __name__ == "__main__":
    unittest.main()
