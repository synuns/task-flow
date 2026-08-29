import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "scripts" / "publish-ai-record"
START = "<!-- reviewed-records:start -->"
END = "<!-- reviewed-records:end -->"


class PublishAiRecordTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        pending = self.root / ".codex" / "review-pending"
        pending.mkdir(parents=True)
        self.candidate = pending / "codex-session-session-123.md"
        self.candidate.write_text(
            "# Codex Session `session-123`\n\n- Model: `test-model`\n",
            encoding="utf-8",
        )
        self.usage = self.root / "AI_USAGE.md"
        self.usage_initial = (
            "# AI 사용 내역\n\n"
            + START
            + "\n"
            + END
            + "\n\n"
            + "- [전체 프롬프트와 작업 기록](./artifacts/index.md)\n"
        )
        self.usage.write_text(self.usage_initial, encoding="utf-8")

    def tearDown(self):
        self.root.chmod(0o700)
        artifacts = self.root / "artifacts"
        if artifacts.exists():
            artifacts.chmod(0o700)
        self.temporary.cleanup()

    def run_publish(self, *extra, reviewer="Human Reviewer"):
        return subprocess.run(
            [
                str(PUBLISH),
                "session-123",
                "--repo-root",
                str(self.root),
                "--reviewed-by",
                reviewer,
                *extra,
            ],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_both_human_confirmations_are_required(self):
        for supplied_flag in (
            "--confirm-sensitive-review",
            "--confirm-content-review",
        ):
            with self.subTest(supplied_flag=supplied_flag):
                result = self.run_publish(supplied_flag)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.root / "artifacts").exists())

    def test_unredacted_secret_blocks_publication(self):
        self.candidate.write_text(
            "# Candidate\nAuthorization: Bearer exposed-secret\n",
            encoding="utf-8",
        )
        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sensitive pattern", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())

    def test_unredacted_quoted_secret_blocks_publication(self):
        self.candidate.write_text(
            "# Candidate\n"
            'api_key="alpha beta,gamma&delta"; safe=yes\n'
            "password='one two,three&four'; safe=yes\n"
            '"access_token": "json value,tail&more", "safe": true\n',
            encoding="utf-8",
        )
        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sensitive pattern", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())

    def test_secret_bearing_reviewer_blocks_publication(self):
        result = self.run_publish(
            "--confirm-sensitive-review",
            "--confirm-content-review",
            reviewer='api_key="reviewer secret,tail&more"',
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sensitive pattern", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())
        self.assertEqual(self.usage.read_text(encoding="utf-8"), self.usage_initial)

    def test_reviewed_candidate_is_published_and_linked(self):
        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )
        artifact = self.root / "artifacts" / "codex-session-session-123.md"
        index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Review status: `human-reviewed`", artifact.read_text())
        self.assertIn("Reviewed by: `Human Reviewer`", artifact.read_text())
        self.assertIn("./codex-session-session-123.md", index)
        self.assertIn(
            "./artifacts/codex-session-session-123.md",
            self.usage.read_text(encoding="utf-8"),
        )

    def test_republication_does_not_duplicate_link(self):
        flags = ("--confirm-sensitive-review", "--confirm-content-review")
        self.assertEqual(self.run_publish(*flags).returncode, 0)
        self.assertEqual(self.run_publish(*flags).returncode, 0)
        index = (self.root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(index.count("./codex-session-session-123.md"), 1)
        self.assertEqual(
            self.usage.read_text(encoding="utf-8").count(
                "./artifacts/codex-session-session-123.md"
            ),
            1,
        )

    def test_matching_unpublished_file_is_not_added_to_index(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        unreviewed = artifacts / "codex-session-unreviewed.md"
        unreviewed.write_text("unreviewed\n", encoding="utf-8")

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        index = (artifacts / "index.md").read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(unreviewed.read_text(encoding="utf-8"), "unreviewed\n")
        self.assertIn("codex-session-session-123.md", index)
        self.assertNotIn("codex-session-unreviewed.md", index)

    @unittest.skipIf(os.geteuid() == 0, "root bypasses directory write permissions")
    def test_artifact_write_failure_preserves_existing_files(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        artifact = artifacts / "codex-session-session-123.md"
        previous = "# Previously reviewed\n"
        artifact.write_text(previous, encoding="utf-8")
        (artifacts / ".index.lock").touch()
        usage_before = self.usage.read_text(encoding="utf-8")
        artifacts.chmod(0o555)

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(artifact.read_text(encoding="utf-8"), previous)
        self.assertEqual(self.usage.read_text(encoding="utf-8"), usage_before)

    def test_index_write_failure_preserves_previous_reviewed_artifact(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        artifact = artifacts / "codex-session-session-123.md"
        previous = "# Previously reviewed\n"
        artifact.write_text(previous, encoding="utf-8")
        (artifacts / "index.md").mkdir()

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(artifact.read_text(encoding="utf-8"), previous)
        self.assertEqual(self.usage.read_text(encoding="utf-8"), self.usage_initial)

    def test_managed_markers_must_be_one_ordered_pair(self):
        invalid_documents = {
            "missing-start": END + "\n",
            "missing-end": START + "\n",
            "duplicate-start": START + "\n" + START + "\n" + END + "\n",
            "duplicate-end": START + "\n" + END + "\n" + END + "\n",
            "reversed": END + "\n" + START + "\n",
        }
        for name, document in invalid_documents.items():
            with self.subTest(name=name):
                self.usage.write_text(document, encoding="utf-8")
                result = self.run_publish(
                    "--confirm-sensitive-review", "--confirm-content-review"
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.root / "artifacts").exists())
                self.assertEqual(self.usage.read_text(encoding="utf-8"), document)

    @unittest.skipIf(os.geteuid() == 0, "root bypasses directory write permissions")
    def test_usage_write_failure_restores_previous_artifact_and_index(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        artifact = artifacts / "codex-session-session-123.md"
        artifact.write_text("# Previously reviewed\n", encoding="utf-8")
        usage_before = self.usage.read_text(encoding="utf-8")
        self.root.chmod(0o555)

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(
            artifact.read_text(encoding="utf-8"),
            "# Previously reviewed\n",
        )
        self.assertFalse((artifacts / "index.md").exists())
        self.assertEqual(self.usage.read_text(encoding="utf-8"), usage_before)

    @unittest.skipIf(os.geteuid() == 0, "root bypasses directory write permissions")
    def test_usage_write_failure_removes_new_artifact_index_and_link(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        usage_before = self.usage.read_text(encoding="utf-8")
        self.root.chmod(0o555)

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((artifacts / "codex-session-session-123.md").exists())
        self.assertFalse((artifacts / "index.md").exists())
        self.assertEqual(self.usage.read_text(encoding="utf-8"), usage_before)

    def test_existing_symlink_destination_is_rejected(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        outside = self.root / "outside.md"
        outside.write_text("outside\n", encoding="utf-8")
        destination = artifacts / "codex-session-session-123.md"
        try:
            destination.symlink_to(outside)
        except OSError:
            self.skipTest("symlinks unavailable")

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(destination.is_symlink())
        self.assertEqual(outside.read_text(encoding="utf-8"), "outside\n")


if __name__ == "__main__":
    unittest.main()
