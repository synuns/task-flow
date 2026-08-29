import importlib.util
import sys
import tempfile
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


if __name__ == "__main__":
    unittest.main()
