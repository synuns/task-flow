import hashlib
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
import review_scanner


class ReviewScannerTests(unittest.TestCase):
    def metadata(self, body, **overrides):
        value = {
            "record_id": "session-123.s0001",
            "state": "closed",
            "revision": 7,
            "artifact_sha256": hashlib.sha256(body).hexdigest(),
            "last_hook_status": "ok",
            "last_error": None,
            "transcript": {"size": len(body), "last_record_timestamp": "2026-08-29T12:00:00Z"},
            "parser_version": "codex-rollout-v1",
        }
        value.update(overrides)
        return value

    def test_secret_is_blocking_and_context_is_bounded(self):
        body = ("# Candidate\n\n## Turn 1\n\nAuthorization: Bearer exposed-secret\n" + ("x" * 5000)).encode("utf-8")
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        self.assertEqual([item.code for item in summary.blocking], ["unredacted_secret"])
        self.assertLessEqual(len(summary.blocking[0].context.encode("utf-8")), 2080)
        self.assertNotIn("exposed-secret", summary.blocking[0].context)

    def test_redacted_secret_is_review_only(self):
        body = b"# Candidate\n\n## Turn 1\n\nAuthorization: Bearer [REDACTED]\npassword=[REDACTED]\n"
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        self.assertEqual(summary.blocking, [])
        self.assertIn("redacted_context", {item.code for item in summary.review})

    def test_tool_and_large_block_are_review_findings(self):
        body = ("# Candidate\n\n## Turn 1\n\n### Tool activity\n\n**Output**\n\n```text\n" + ("a" * 33000) + "\n```\n").encode("utf-8")
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        codes = {item.code for item in summary.review}
        self.assertIn("tool_activity", codes)
        self.assertIn("large_block", codes)

    def test_error_metadata_is_blocking_and_error_code_is_not_exposed(self):
        body = b"# Candidate\n"
        summary = review_scanner.scan_candidate(body, self.metadata(body, last_hook_status="error", last_error={"code": "malformed_json"}))
        self.assertIn("incomplete_snapshot", {item.code for item in summary.blocking})
        rendered = review_scanner.format_summary(summary)
        self.assertIn("BLOCKING", rendered)
        self.assertNotIn("malformed_json", rendered)

    def test_entropy_string_is_review_not_blocking_when_pattern_does_not_match(self):
        body = b"# Candidate\n\n## Turn 1\n\nvalue=QWxhZGRpbjpvcGVuIHNlc2FtZQ==1234567890abcdefgh\n"
        summary = review_scanner.scan_candidate(body, self.metadata(body))
        self.assertIn("credential_like", {item.code for item in summary.review})
        self.assertEqual(summary.blocking, [])


if __name__ == "__main__":
    unittest.main()
