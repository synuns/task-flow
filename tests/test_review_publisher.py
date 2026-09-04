import hashlib
import json
import sys
import tempfile
import unittest
from dataclasses import replace
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
        (self.root / "AI_USAGE.md").write_text(
            "## 프롬프트 작업 기록\n\n"
            "- [작업 주제별 프롬프트 기록](./artifacts/index.md)\n",
            encoding="utf-8",
        )

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
        usage_before = (self.root / "AI_USAGE.md").read_text(encoding="utf-8")
        first = review_publisher.publish_receipt(self.root, self.receipt())
        second = review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(first.status, "published")
        self.assertEqual(second.status, "already_published")
        index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(sum(self.closed.record_id in line for line in index.splitlines()), 1)
        self.assertEqual(self.store.read_metadata(self.closed.record_id)["state"], "published")
        self.assertEqual(
            (self.root / "AI_USAGE.md").read_text(encoding="utf-8"),
            usage_before,
        )

    def test_recovery_completes_journal_after_final_journal_write_failure(self):
        write_journal = review_publisher.write_journal
        failed = False

        def fail_final_write(repo_root, receipt, state, completed_steps, last_error=None):
            nonlocal failed
            if state == "complete" and not failed:
                failed = True
                raise OSError("final journal write failed")
            return write_journal(repo_root, receipt, state, completed_steps, last_error)

        with mock.patch.object(review_publisher, "write_journal", side_effect=fail_final_write):
            with self.assertRaises(OSError):
                review_publisher.publish_receipt(self.root, self.receipt())

        self.assertEqual(self.store.read_metadata(self.closed.record_id)["state"], "published")
        self.assertEqual(
            review_publisher.journal_status(self.root, self.closed.record_id)["state"],
            "committing",
        )

        result = review_publisher.resume_journal(self.root, self.closed.record_id)

        self.assertEqual(result.status, "already_published")
        self.assertEqual(
            review_publisher.journal_status(self.root, self.closed.record_id)["state"],
            "complete",
        )

    def test_publish_preserves_existing_artifact_title(self):
        artifacts = self.root / "artifacts"
        existing = "codex-session-existing.md"
        (artifacts / existing).write_text("reviewed\n", encoding="utf-8")
        (artifacts / "index.md").write_text(
            render_artifact_index.render_index(
                [existing],
                {existing: "인증 진입 Journey"},
            ),
            encoding="utf-8",
        )

        review_publisher.publish_receipt(self.root, self.receipt())

        titles = render_artifact_index.list_published_artifact_titles(
            artifacts / "index.md",
            artifacts,
        )
        self.assertEqual(titles[existing], "인증 진입 Journey")

    def test_pending_record_rejected(self):
        self.store.session_start("session-123", "resume")
        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, self.receipt())
        self.assertEqual(raised.exception.code, "record_not_closed")

    def test_superseded_record_is_rejected_before_publication(self):
        self.store.session_start("session-123", "clear")
        destination = self.root / "artifacts" / ("codex-session-{}.md".format(self.closed.record_id))

        with self.assertRaises(ValueError) as raised:
            review_publisher.publish_receipt(self.root, self.receipt())

        self.assertEqual(str(raised.exception), "record_not_closed")
        self.assertFalse(destination.exists())
        self.assertEqual(
            (self.root / "artifacts" / "index.md").read_text(encoding="utf-8"),
            render_artifact_index.render_index([]),
        )
        self.assertNotIn(
            self.closed.record_id,
            (self.root / "AI_USAGE.md").read_text(encoding="utf-8"),
        )
        self.assertFalse(review_publisher.journal_path(self.root, self.closed.record_id).exists())

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

    def test_unicode_reviewer_is_accepted(self):
        receipt = replace(self.receipt(), reviewer="홍길동")

        try:
            result = review_publisher.publish_receipt(self.root, receipt)
        except review_publisher.PublicationError as error:
            self.fail("Unicode reviewer rejected: {}".format(error.code))

        self.assertEqual(result.status, "published")

    def test_control_character_reviewer_is_rejected(self):
        receipt = replace(self.receipt(), reviewer="Reviewer\nInjected")

        with self.assertRaises(review_publisher.PublicationError) as raised:
            review_publisher.publish_receipt(self.root, receipt)

        self.assertEqual(raised.exception.code, "invalid_reviewer")

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
