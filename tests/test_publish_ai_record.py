import hashlib
import os
import importlib.machinery
import importlib.util
import subprocess
import sys
import tempfile
import threading
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "scripts" / "publish-ai-record"
START = "<!-- reviewed-records:start -->"
END = "<!-- reviewed-records:end -->"
LOADER = importlib.machinery.SourceFileLoader("publish_ai_record", str(PUBLISH))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
publish_ai_record = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = publish_ai_record
SPEC.loader.exec_module(publish_ai_record)
exporter = publish_ai_record.load_hook_module(
    ROOT,
    "export_session.py",
    "publisher_test_exporter",
)
indexer = publish_ai_record.load_hook_module(
    ROOT,
    "render_artifact_index.py",
    "publisher_test_indexer",
)


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

    def candidate_digest(self, session_id="session-123"):
        candidate = (
            self.root
            / ".codex"
            / "review-pending"
            / "codex-session-{}.md".format(session_id)
        )
        return hashlib.sha256(candidate.read_bytes()).hexdigest()

    def run_publish(
        self,
        *extra,
        reviewer="Human Reviewer",
        include_digest=True,
        reviewed_digest=None,
    ):
        command = [
            str(PUBLISH),
            "session-123",
            "--repo-root",
            str(self.root),
            "--reviewed-by",
            reviewer,
        ]
        if include_digest:
            command.extend(
                [
                    "--reviewed-sha256",
                    reviewed_digest or self.candidate_digest(),
                ]
            )
        command.extend(extra)
        return subprocess.run(
            command,
            text=True,
            capture_output=True,
            check=False,
        )

    def main_args(self, session_id, reviewer="Human Reviewer", reviewed_digest=None):
        return [
            session_id,
            "--repo-root",
            str(self.root),
            "--reviewed-by",
            reviewer,
            "--reviewed-sha256",
            reviewed_digest or self.candidate_digest(session_id),
            "--confirm-sensitive-review",
            "--confirm-content-review",
        ]

    def load_module(self, source_root, filename, module_name):
        del source_root, module_name
        return exporter if filename == "export_session.py" else indexer

    def test_both_human_confirmations_are_required(self):
        for supplied_flag in (
            "--confirm-sensitive-review",
            "--confirm-content-review",
        ):
            with self.subTest(supplied_flag=supplied_flag):
                result = self.run_publish(supplied_flag)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.root / "artifacts").exists())

    def test_reviewed_digest_is_required(self):
        result = self.run_publish(
            "--confirm-sensitive-review",
            "--confirm-content-review",
            include_digest=False,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("reviewed SHA-256 digest is required", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())

    def test_digest_mismatch_rejects_replaced_candidate(self):
        reviewed_digest = self.candidate_digest()
        self.candidate.write_text(
            "# Replaced after review\n\n- Model: `other-model`\n",
            encoding="utf-8",
        )

        result = self.run_publish(
            "--confirm-sensitive-review",
            "--confirm-content-review",
            reviewed_digest=reviewed_digest,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("reviewed digest mismatch", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())

    def test_open_descriptor_binds_publication_to_reviewed_bytes(self):
        original = self.candidate.read_bytes()
        reviewed_digest = hashlib.sha256(original).hexdigest()
        real_open = os.open
        real_replace = os.replace
        candidate_opened = False

        def replace_path_after_open(path, flags, *args, **kwargs):
            nonlocal candidate_opened
            descriptor = real_open(path, flags, *args, **kwargs)
            if Path(path) == self.candidate and not candidate_opened:
                candidate_opened = True
                replacement = self.candidate.with_name("replacement.md")
                replacement.write_text(
                    "# Unreviewed replacement\n",
                    encoding="utf-8",
                )
                real_replace(replacement, self.candidate)
            return descriptor

        with mock.patch.object(
            publish_ai_record.os,
            "open",
            side_effect=replace_path_after_open,
        ):
            result = publish_ai_record.main(
                self.main_args("session-123", reviewed_digest=reviewed_digest)
            )

        artifact = self.root / "artifacts" / "codex-session-session-123.md"
        self.assertEqual(result, 0)
        self.assertIn("# Codex Session `session-123`", artifact.read_text())
        self.assertNotIn("Unreviewed replacement", artifact.read_text())

    def test_pending_candidate_symlink_is_rejected(self):
        outside = self.root / "outside-candidate.md"
        outside.write_text("# Outside candidate\n", encoding="utf-8")
        reviewed_digest = hashlib.sha256(outside.read_bytes()).hexdigest()
        self.candidate.unlink()
        try:
            self.candidate.symlink_to(outside)
        except OSError:
            self.skipTest("symlinks unavailable")

        result = self.run_publish(
            "--confirm-sensitive-review",
            "--confirm-content-review",
            reviewed_digest=reviewed_digest,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("pending candidate must be a regular file", result.stderr)
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

    def test_unredacted_refresh_tokens_and_cookie_block_publication(self):
        cases = (
            "refreshToken=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImNhbWVsIn0.publisher-camel_suffix",
            "refresh_token='eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InNuYWtlIn0.publisher-snake_suffix'",
            '\"refresh-token\": \"eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImtlYmFiIn0.publisher-kebab_suffix\"',
            "Cookie: token=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImNvb2tpZSJ9.publisher-cookie_suffix; theme=dark",
        )
        for exposed in cases:
            with self.subTest(exposed=exposed.split("=", 1)[0]):
                self.candidate.write_text(
                    "# Candidate\n{}\n".format(exposed),
                    encoding="utf-8",
                )
                result = self.run_publish(
                    "--confirm-sensitive-review", "--confirm-content-review"
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("sensitive pattern", result.stderr)
                self.assertFalse((self.root / "artifacts").exists())

    def test_repeated_unredacted_refresh_cookies_block_publication(self):
        values = (
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZpcnN0In0.publisher-first_suffix",
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InNlY29uZCJ9.publisher-second_suffix",
        )
        self.candidate.write_text(
            "# Candidate\n"
            "Cookie: token=[REDACTED]; token={}; token={}\n".format(*values),
            encoding="utf-8",
        )

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("sensitive pattern", result.stderr)
        self.assertFalse((self.root / "artifacts").exists())
        self.assertEqual(self.usage.read_text(encoding="utf-8"), self.usage_initial)

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

    def write_indexed_artifact(self, session_id):
        artifacts = self.root / "artifacts"
        artifacts.mkdir(exist_ok=True)
        artifact = artifacts / "codex-session-{}.md".format(session_id)
        artifact.write_text("# Reviewed {}\n".format(session_id), encoding="utf-8")
        return artifact

    def set_managed_region(self, *lines):
        managed = "\n".join(lines)
        document = self.usage_initial.replace(
            START + "\n" + END,
            START + "\n" + (managed + "\n" if managed else "") + END,
        )
        self.usage.write_text(document, encoding="utf-8")

    def managed_region(self):
        document = self.usage.read_text(encoding="utf-8")
        return document.split(START, 1)[1].split(END, 1)[0]

    def test_managed_region_adds_link_missing_for_indexed_artifact(self):
        other = self.write_indexed_artifact("other")
        index_path = other.parent / "index.md"
        index_path.write_text(indexer.render_index([other.name]), encoding="utf-8")

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        managed = self.managed_region()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("codex-session-other.md", managed)
        self.assertIn("codex-session-session-123.md", managed)

    def test_managed_region_removes_stale_missing_artifact_link(self):
        self.set_managed_region(
            "- [검토 완료 세션 `missing`](./artifacts/codex-session-missing.md)"
        )

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        managed = self.managed_region()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("codex-session-missing.md", managed)
        self.assertIn("codex-session-session-123.md", managed)

    def test_managed_region_removes_malformed_entry(self):
        self.set_managed_region("- malformed reviewed record link")

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        managed = self.managed_region()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("malformed", managed)
        self.assertIn("codex-session-session-123.md", managed)

    def test_managed_region_removes_unindexed_artifact_link(self):
        unindexed = self.write_indexed_artifact("unindexed")
        self.set_managed_region(
            "- [검토 완료 세션 `unindexed`]"
            "(./artifacts/codex-session-unindexed.md)"
        )

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        managed = self.managed_region()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(unindexed.is_file())
        self.assertNotIn("codex-session-unindexed.md", managed)
        self.assertIn("codex-session-session-123.md", managed)

    def test_concurrent_session_publications_preserve_both_managed_entries(self):
        for session_id in ("session-a", "session-b"):
            candidate = (
                self.root
                / ".codex"
                / "review-pending"
                / "codex-session-{}.md".format(session_id)
            )
            candidate.write_text(
                "# Codex Session `{}`\n".format(session_id),
                encoding="utf-8",
            )

        barrier = threading.Barrier(2)
        serial = threading.Lock()

        class SynchronizedIndexer:
            def __getattr__(self, name):
                return getattr(indexer, name)

            @contextmanager
            def index_lock(self, path):
                del path
                barrier.wait(timeout=5)
                with serial:
                    yield

        synchronized_indexer = SynchronizedIndexer()

        def load_synchronized(source_root, filename, module_name):
            del source_root, module_name
            if filename == "export_session.py":
                return exporter
            return synchronized_indexer

        results = {}

        def publish(session_id):
            results[session_id] = publish_ai_record.main(
                self.main_args(session_id)
            )

        with mock.patch.object(
            publish_ai_record,
            "load_hook_module",
            side_effect=load_synchronized,
        ):
            threads = [
                threading.Thread(target=publish, args=(session_id,))
                for session_id in ("session-a", "session-b")
            ]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=6)

        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertEqual(results, {"session-a": 0, "session-b": 0})
        usage = self.usage.read_text(encoding="utf-8")
        artifact_index = (self.root / "artifacts" / "index.md").read_text(
            encoding="utf-8"
        )
        for session_id in ("session-a", "session-b"):
            self.assertIn("codex-session-{}.md".format(session_id), usage)
            self.assertIn("codex-session-{}.md".format(session_id), artifact_index)
            self.assertTrue(
                (
                    self.root
                    / "artifacts"
                    / "codex-session-{}.md".format(session_id)
                ).is_file()
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

    def test_injected_index_write_failure_restores_exact_previous_files(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        artifact = artifacts / "codex-session-session-123.md"
        artifact.write_text("# Previously reviewed\n", encoding="utf-8")
        index_path = artifacts / "index.md"
        index_path.write_text(
            indexer.render_index([artifact.name]),
            encoding="utf-8",
        )
        expected_artifact = artifact.read_bytes()
        expected_index = index_path.read_bytes()
        expected_usage = self.usage.read_bytes()

        with mock.patch.object(
            publish_ai_record,
            "load_hook_module",
            side_effect=self.load_module,
        ), mock.patch.object(
            indexer,
            "atomic_write_index",
            side_effect=OSError("injected index replacement failure"),
        ):
            result = publish_ai_record.main(self.main_args("session-123"))

        self.assertEqual(result, 1)
        self.assertEqual(artifact.read_bytes(), expected_artifact)
        self.assertEqual(index_path.read_bytes(), expected_index)
        self.assertEqual(self.usage.read_bytes(), expected_usage)

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
                self.assertFalse(
                    (
                        self.root
                        / "artifacts"
                        / "codex-session-session-123.md"
                    ).exists()
                )
                self.assertFalse((self.root / "artifacts" / "index.md").exists())
                self.assertEqual(self.usage.read_text(encoding="utf-8"), document)

    @unittest.skipIf(os.geteuid() == 0, "root bypasses directory write permissions")
    def test_usage_write_failure_restores_previous_artifact_and_index(self):
        artifacts = self.root / "artifacts"
        artifacts.mkdir()
        artifact = artifacts / "codex-session-session-123.md"
        artifact.write_text("# Previously reviewed\n", encoding="utf-8")
        other = artifacts / "codex-session-other.md"
        other.write_text("# Other reviewed\n", encoding="utf-8")
        index_path = artifacts / "index.md"
        index_path.write_text(
            indexer.render_index([artifact.name, other.name]),
            encoding="utf-8",
        )
        expected_artifact = artifact.read_bytes()
        expected_index = index_path.read_bytes()
        usage_before = self.usage.read_text(encoding="utf-8")
        self.root.chmod(0o555)

        result = self.run_publish(
            "--confirm-sensitive-review", "--confirm-content-review"
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(artifact.read_bytes(), expected_artifact)
        self.assertEqual(index_path.read_bytes(), expected_index)
        self.assertEqual(self.usage.read_text(encoding="utf-8"), usage_before)

    def test_rollback_attempts_artifact_restore_after_index_restore_failure(self):
        with mock.patch.object(
            publish_ai_record,
            "restore_index",
            side_effect=OSError("index rollback failed"),
        ) as restore_index, mock.patch.object(
            publish_ai_record,
            "restore_artifact",
        ) as restore_artifact:
            with self.assertRaisesRegex(ValueError, "manual recovery required"):
                publish_ai_record.rollback_publication(
                    Path("index.md"),
                    "old index\n",
                    Path("artifact.md"),
                    "old artifact\n",
                    indexer,
                )

        restore_index.assert_called_once()
        restore_artifact.assert_called_once()

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
