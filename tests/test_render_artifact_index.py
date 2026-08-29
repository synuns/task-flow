import fcntl
import importlib.util
import hashlib
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
MODULE_PATH = HOOKS / "render_artifact_index.py"
render_artifact_index = None
if MODULE_PATH.exists():
    SPEC = importlib.util.spec_from_file_location(
        "render_artifact_index",
        MODULE_PATH,
    )
    render_artifact_index = importlib.util.module_from_spec(SPEC)
    sys.modules[SPEC.name] = render_artifact_index
    SPEC.loader.exec_module(render_artifact_index)


class ArtifactIndexRenderTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            render_artifact_index,
            "render_artifact_index module must exist",
        )

    def test_selects_only_direct_regular_contract_files(self):
        with tempfile.TemporaryDirectory() as directory:
            artifacts = Path(directory)
            for name in (
                "codex-session-b.md",
                "codex-session-a.md",
                "index.md",
                "codex-session--bad.md",
                "codex-session-good.md.tmp",
            ):
                (artifacts / name).write_text("not read\n", encoding="utf-8")
            (artifacts / "codex-session-directory.md").mkdir()
            outside = artifacts.parent / "codex-session-linked.md"
            outside.write_text("not read\n", encoding="utf-8")
            link = artifacts / "codex-session-link.md"
            try:
                link.symlink_to(outside)
            except OSError:
                pass
            selected = render_artifact_index.list_artifact_names(artifacts)
            outside.unlink()
        self.assertEqual(
            selected,
            ["codex-session-a.md", "codex-session-b.md"],
        )

    def test_render_is_sorted_deduplicated_and_deterministic(self):
        filenames = [
            "codex-session-b.md",
            "codex-session-a.md",
            "codex-session-b.md",
        ]
        first = render_artifact_index.render_index(filenames)
        second = render_artifact_index.render_index(filenames)
        self.assertEqual(first, second)
        self.assertEqual(first.count("codex-session-b.md"), 1)
        self.assertLess(
            first.index("codex-session-a.md"),
            first.index("codex-session-b.md"),
        )
        self.assertTrue(first.endswith("\n"))

    def test_published_selection_ignores_unindexed_contract_file(self):
        with tempfile.TemporaryDirectory() as directory:
            artifacts = Path(directory)
            reviewed = artifacts / "codex-session-reviewed.md"
            unreviewed = artifacts / "codex-session-unreviewed.md"
            reviewed.write_text("reviewed\n", encoding="utf-8")
            unreviewed.write_text("unreviewed\n", encoding="utf-8")
            index = artifacts / "index.md"
            index.write_text(
                render_artifact_index.render_index([reviewed.name]),
                encoding="utf-8",
            )
            selected = render_artifact_index.list_published_artifact_names(
                index,
                artifacts,
            )
        self.assertEqual(selected, [reviewed.name])

    def test_atomic_write_preserves_old_index_and_cleans_temp_on_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "index.md"
            target.write_text("old\n", encoding="utf-8")
            with mock.patch.object(
                render_artifact_index.os,
                "replace",
                side_effect=OSError("replace failed"),
            ):
                with self.assertRaises(OSError):
                    render_artifact_index.atomic_write_index(target, "new\n")
            self.assertEqual(target.read_text(encoding="utf-8"), "old\n")
            self.assertEqual(list(target.parent.glob(".index-*.tmp")), [])


class SessionEndCliTests(unittest.TestCase):
    def payload(self, root, session_id="session-b"):
        return {
            "hook_event_name": "SessionEnd",
            "session_id": session_id,
            "transcript_path": str(root / "must-not-be-read.jsonl"),
            "cwd": str(root),
            "reason": "other",
        }

    def run_cli(self, root, stdin_text):
        return subprocess.run(
            [sys.executable, str(MODULE_PATH), "--repo-root", str(root)],
            input=stdin_text,
            text=True,
            capture_output=True,
            check=False,
            timeout=3,
        )

    def write_artifact(self, root, session_id):
        artifacts = root / "artifacts"
        artifacts.mkdir(parents=True, exist_ok=True)
        path = artifacts / "codex-session-{}.md".format(session_id)
        path.write_text("transcript body must not be read\n", encoding="utf-8")
        return path

    def test_success_rebuilds_sorted_index_without_transcript(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_artifact(root, "session-b")
            self.write_artifact(root, "session-a")
            (root / "artifacts" / "index.md").write_text(
                render_artifact_index.render_index(
                    [
                        "codex-session-session-b.md",
                        "codex-session-session-a.md",
                    ]
                ),
                encoding="utf-8",
            )
            payload = self.payload(root)
            first = self.run_cli(root, json.dumps(payload))
            index_path = root / "artifacts" / "index.md"
            self.assertTrue(index_path.is_file(), "SessionEnd must create index")
            first_content = index_path.read_text(encoding="utf-8")
            second = self.run_cli(root, json.dumps(payload))
            second_content = index_path.read_text(encoding="utf-8")
        self.assertEqual(first.returncode, 0)
        self.assertEqual(first.stdout, "")
        self.assertEqual(first.stderr, "")
        self.assertEqual(second.returncode, 0)
        self.assertEqual(first_content, second_content)
        self.assertLess(
            first_content.index("codex-session-session-a.md"),
            first_content.index("codex-session-session-b.md"),
        )

    def test_current_pending_session_is_not_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_artifact(root, "reviewed-session")
            (root / "artifacts" / "index.md").write_text(
                render_artifact_index.render_index(
                    ["codex-session-reviewed-session.md"]
                ),
                encoding="utf-8",
            )
            result = self.run_cli(
                root,
                json.dumps(self.payload(root, "pending-session")),
            )
            index = (root / "artifacts" / "index.md").read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("codex-session-reviewed-session.md", index)
        self.assertNotIn("codex-session-pending-session.md", index)

    def test_missing_indexed_artifact_is_removed_while_present_entry_remains(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            present = self.write_artifact(root, "present")
            missing_name = "codex-session-missing.md"
            index_path = root / "artifacts" / "index.md"
            index_path.write_text(
                render_artifact_index.render_index([present.name, missing_name]),
                encoding="utf-8",
            )

            result = self.run_cli(root, json.dumps(self.payload(root)))
            rendered = index_path.read_text(encoding="utf-8")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(present.name, rendered)
        self.assertNotIn(missing_name, rendered)

    def test_invalid_inputs_preserve_existing_index(self):
        cases = (
            ("not-json", "invalid_hook_input"),
            ({"hook_event_name": "Stop"}, "invalid_hook_event"),
            (
                {"hook_event_name": "SessionEnd", "session_id": "-bad"},
                "invalid_session_id",
            ),
            ("outside", "cwd_outside_repo"),
        )
        for value, expected_error in cases:
            with self.subTest(value=value):
                with tempfile.TemporaryDirectory() as directory:
                    root = Path(directory)
                    self.write_artifact(root, "session-b")
                    index_path = root / "artifacts" / "index.md"
                    index_path.write_text("existing\n", encoding="utf-8")
                    if value == "not-json":
                        stdin_text = value
                    elif value == "outside":
                        payload = self.payload(root)
                        payload["cwd"] = str(root.parent)
                        stdin_text = json.dumps(payload)
                    else:
                        stdin_text = json.dumps(value)
                    result = self.run_cli(root, stdin_text)
                    preserved = index_path.read_text(encoding="utf-8")
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stderr, expected_error + "\n")
                self.assertEqual(preserved, "existing\n")

    def test_lock_timeout_preserves_existing_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_artifact(root, "session-b")
            index_path = root / "artifacts" / "index.md"
            index_path.write_text("existing\n", encoding="utf-8")
            lock_path = root / "artifacts" / ".index.lock"
            with lock_path.open("a+") as lock_stream:
                fcntl.flock(
                    lock_stream.fileno(),
                    fcntl.LOCK_EX | fcntl.LOCK_NB,
                )
                started = time.monotonic()
                result = self.run_cli(root, json.dumps(self.payload(root)))
                elapsed = time.monotonic() - started
            preserved = index_path.read_text(encoding="utf-8")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr, "lock_timeout\n")
        self.assertLess(elapsed, 2.5)
        self.assertEqual(preserved, "existing\n")


class ProjectArtifactIndexTests(unittest.TestCase):
    def test_tracked_index_matches_current_artifacts(self):
        artifacts = ROOT / "artifacts"
        expected = render_artifact_index.render_index(
            render_artifact_index.list_published_artifact_names(
                artifacts / "index.md",
                artifacts,
            )
        )
        index_path = artifacts / "index.md"
        self.assertTrue(index_path.is_file(), "tracked artifact index must exist")
        actual = index_path.read_text(encoding="utf-8")
        self.assertEqual(actual, expected)


class PendingIndexTests(unittest.TestCase):
    def test_pending_index_selects_only_valid_pending_and_closed_records(self):
        with tempfile.TemporaryDirectory() as directory:
            pending = Path(directory)

            def add(record, state, body, digest=None):
                raw = body.encode("utf-8")
                (pending / ("codex-session-{}.md".format(record))).write_bytes(raw)
                metadata = {"schema_version": 1, "record_id": record, "state": state, "artifact_sha256": digest or hashlib.sha256(raw).hexdigest()}
                (pending / ("codex-session-{}.json".format(record))).write_text(json.dumps(metadata) + "\n", encoding="utf-8")

            add("session-1.s0001", "pending", "one\n")
            add("session-1.s0002", "closed", "two\n")
            add("session-1.s0003", "published", "three\n")
            add("session-1.s0004", "pending", "four\n", "0" * 64)
            self.assertEqual(
                render_artifact_index.list_pending_artifact_names(pending),
                ["codex-session-session-1.s0001.md", "codex-session-session-1.s0002.md"],
            )


if __name__ == "__main__":
    unittest.main()
