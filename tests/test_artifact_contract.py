import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / ".codex" / "hooks"
MODULE_PATH = HOOKS / "artifact_contract.py"
artifact_contract = None
if MODULE_PATH.exists():
    SPEC = importlib.util.spec_from_file_location("artifact_contract", MODULE_PATH)
    artifact_contract = importlib.util.module_from_spec(SPEC)
    sys.modules[SPEC.name] = artifact_contract
    SPEC.loader.exec_module(artifact_contract)


class ArtifactContractTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            artifact_contract,
            "artifact_contract module must exist",
        )

    def test_safe_session_id_accepts_and_sanitizes_supported_values(self):
        self.assertEqual(
            artifact_contract.safe_session_id("thr_123.A-b"),
            "thr_123.A-b",
        )
        self.assertEqual(
            artifact_contract.safe_session_id("thr/123"),
            "thr_123",
        )
        self.assertEqual(
            artifact_contract.safe_session_id("a" * 129),
            "a" * 128,
        )

    def test_safe_session_id_rejects_unsafe_boundaries(self):
        for value in (None, "", "...", "-leading", "_leading"):
            with self.subTest(value=value):
                self.assertIsNone(artifact_contract.safe_session_id(value))

    def test_artifact_filename_round_trip_and_rejection(self):
        filename = artifact_contract.artifact_filename("thr_123.A-b")
        self.assertEqual(filename, "codex-session-thr_123.A-b.md")
        self.assertEqual(
            artifact_contract.session_id_from_artifact_filename(filename),
            "thr_123.A-b",
        )
        for invalid in (
            "index.md",
            "codex-session-.md",
            "codex-session--bad.md",
            "nested/codex-session-good.md",
            "codex-session-good.md.tmp",
        ):
            with self.subTest(filename=invalid):
                self.assertIsNone(
                    artifact_contract.session_id_from_artifact_filename(invalid)
                )
        with self.assertRaises(ValueError):
            artifact_contract.artifact_filename("-bad")


if __name__ == "__main__":
    unittest.main()
