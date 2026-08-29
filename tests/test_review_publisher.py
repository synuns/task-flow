import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import render_artifact_index
import review_publisher
from session_records import RecordStore


class PublisherTransactionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = RecordStore(self.root, clock=lambda: "2026-08-29T12:00:00Z")
        base = self.store.initialize_session("session-123")
        self.body = b"# Candidate\n"
        self.current = self.store.commit_snapshot(base, self.body, {
            "last_turn_id": "turn-1", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None,
        })
        self.closed = self.store.session_end("session-123")
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        (artifacts / "index.md").write_text(render_artifact_index.render_index([]), encoding="utf-8")
        (self.root / "AI_USAGE.md").write_text("<!-- reviewed-records:start -->\n<!-- reviewed-records:end -->\n", encoding="utf-8")

    def tearDown(self):
        self.temporary.cleanup()

    def receipt(self):
        return review_publisher.ReviewReceipt(
            self.closed.record_id, "session-123", self.closed.revision,
            hashlib.sha256(self.body).hexdigest(), "Human Reviewer",
            "2026-08-29T12:30:00Z", "session-review-v1", 0, 0, True,
            "interactive-tty",
        )

    def test_publish_is_idempotent(self):
        first = review_publisher.publish_receipt(self.root, self.receipt())
        second = review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(first.status, "published")
        self.assertEqual(second.status, "already_published")
        index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(sum(self.closed.record_id in line for line in index.splitlines()), 1)
        self.assertEqual(self.store.read_metadata(self.closed.record_id)["state"], "published")

    def test_pending_record_rejected(self):
        self.store.session_start("session-123", "resume")
        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(raised.exception.code, "record_not_closed")

    def test_destination_conflict_does_not_overwrite(self):
        destination = self.root / "artifacts" / ("codex-session-{}.md".format(self.closed.record_id))
        destination.write_bytes(b"different\n")
        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(raised.exception.code, "publication_conflict")
        self.assertEqual(destination.read_bytes(), b"different\n")

    def test_reviewer_digest_mismatch_rejected(self):
        receipt = self.receipt()
        receipt = review_publisher.ReviewReceipt(*((receipt.record_id, receipt.session_id, receipt.revision, "0" * 64) + tuple(receipt.__dict__.values())[4:]))
        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, receipt)
        self.assertEqual(raised.exception.code, "snapshot_digest_mismatch")

    def test_cancel_before_commit_leaves_no_public_artifact(self):
        review_publisher.request_cancel()
        try:
            with self.assertRaises(review_publisher.PublicationCancelled):
                review_publisher.publish_receipt(self.root, self.receipt())
        finally:
            review_publisher.clear_cancel()
        self.assertFalse((self.root / "artifacts" / ("codex-session-{}.md".format(self.closed.record_id))).exists())
        self.assertEqual(self.store.read_metadata(self.closed.record_id)["state"], "closed")


if __name__ == "__main__":
    unittest.main()
