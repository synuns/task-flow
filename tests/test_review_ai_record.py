import hashlib
import importlib.machinery
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "review-ai-record"
LOADER = importlib.machinery.SourceFileLoader("review_ai_record", str(SCRIPT))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
review_ai_record = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = review_ai_record
SPEC.loader.exec_module(review_ai_record)
import render_artifact_index


class TtyStringIO(io.StringIO):
    def isatty(self):
        return True


class ReviewCliTests(unittest.TestCase):
    def test_exact_y_newline_approves_only(self):
        for value, expected in (("y\n", True), ("Y\n", False), ("yes\n", False), (" y\n", False), ("\n", False), ("n\n", False), ("", False)):
            with self.subTest(value=repr(value)):
                self.assertEqual(review_ai_record.read_approval(io.StringIO(value), io.StringIO()), expected)

    def test_review_pending_list_shows_session_id_and_requires_selection(self):
        record = review_ai_record.RecordRef("session-123", 1, 1, 7, "closed")
        output = TtyStringIO()

        selected = review_ai_record.choose_record([record], TtyStringIO("1\n"), output)

        self.assertEqual(selected, record)
        self.assertIn("검수 완료할 review-pending 세션:", output.getvalue())
        self.assertIn("1. session-123", output.getvalue())
        self.assertNotIn("session-123.s0001", output.getvalue())
        self.assertIn("Select [1-1]:", output.getvalue())

    def test_missing_reviewer_stops_without_prompt_or_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = review_ai_record.RecordStore(root, clock=lambda: "2026-08-29T12:00:00Z")
            base = store.initialize_session("session-123")
            body = b"# Candidate\n"
            store.commit_snapshot(base, body, {"last_turn_id": "turn-1", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None})
            store.session_end("session-123")
            output = TtyStringIO()
            with mock.patch.object(review_ai_record, "git_config_name", return_value=None):
                with mock.patch.object(review_ai_record.subprocess, "run") as run:
                    with mock.patch.object(review_ai_record, "publish_receipt") as publish:
                        result = review_ai_record.run_review(root, TtyStringIO("1\ny\n"), output)

            self.assertEqual(result, 1)
            self.assertIn("reviewer_not_configured", output.getvalue())
            self.assertNotIn("Reviewer name", output.getvalue())
            run.assert_not_called()
            publish.assert_not_called()

    def test_non_tty_process_cannot_publish(self):
        with self.assertRaises(review_ai_record.ReviewCancelled):
            review_ai_record.run_review(Path(tempfile.mkdtemp()), io.StringIO("y\n"), io.StringIO())

    def test_closed_record_is_selected_and_blocking_stops_before_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = review_ai_record.RecordStore(root, clock=lambda: "2026-08-29T12:00:00Z")
            base = store.initialize_session("session-123")
            body = b"# Candidate\nAuthorization: Bearer exposed-secret\n"
            store.commit_snapshot(base, body, {"last_turn_id": "turn-1", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None})
            store.session_end("session-123")
            output = TtyStringIO()
            result = review_ai_record.run_review(root, TtyStringIO("1\n"), output)
        self.assertEqual(result, 1)
        self.assertIn("review_blocked", output.getvalue())
        self.assertNotIn("BLOCKING", output.getvalue())
        self.assertNotIn("exposed-secret", output.getvalue())

    def test_one_clean_record_needs_selection_and_y_to_publish(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = review_ai_record.RecordStore(root, clock=lambda: "2026-08-29T12:00:00Z")
            base = store.initialize_session("session-123")
            body = b"# Candidate\n"
            store.commit_snapshot(base, body, {"last_turn_id": "turn-1", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None})
            closed = store.session_end("session-123")
            artifacts = root / "artifacts"
            artifacts.mkdir()
            (artifacts / "index.md").write_text(render_artifact_index.render_index([]), encoding="utf-8")
            (root / "AI_USAGE.md").write_text("<!-- reviewed-records:start -->\n<!-- reviewed-records:end -->\n", encoding="utf-8")
            output = TtyStringIO()
            with mock.patch.object(review_ai_record, "git_config_name", return_value="Human Reviewer"):
                result = review_ai_record.run_review(root, TtyStringIO("1\ny\n"), output)
            self.assertEqual(result, 0)
            self.assertIn("선택한 세션: session-123", output.getvalue())
            self.assertIn("published", output.getvalue())
            self.assertEqual(store.read_metadata(closed.record_id)["state"], "published")

    def test_review_finding_needs_only_selection_and_confirmation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = review_ai_record.RecordStore(root, clock=lambda: "2026-08-29T12:00:00Z")
            base = store.initialize_session("session-123")
            body = b"# Candidate\n\n### Tool activity\n"
            store.commit_snapshot(base, body, {"last_turn_id": "turn-1", "snapshot_kind": "turn_complete", "last_hook_event": "Stop", "parser_version": "codex-rollout-v1", "transcript": None})
            closed = store.session_end("session-123")
            artifacts = root / "artifacts"
            artifacts.mkdir()
            (artifacts / "index.md").write_text(render_artifact_index.render_index([]), encoding="utf-8")
            (root / "AI_USAGE.md").write_text("<!-- reviewed-records:start -->\n<!-- reviewed-records:end -->\n", encoding="utf-8")
            output = TtyStringIO()
            with mock.patch.object(review_ai_record, "git_config_name", return_value="Human Reviewer"):
                result = review_ai_record.run_review(root, TtyStringIO("1\ny\n"), output)

            self.assertEqual(result, 0)
            self.assertIn("선택한 세션: session-123", output.getvalue())
            self.assertNotIn("REVIEW", output.getvalue())
            self.assertNotIn("[v]", output.getvalue())
            self.assertEqual(store.read_metadata(closed.record_id)["state"], "published")


if __name__ == "__main__":
    unittest.main()
