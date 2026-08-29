import importlib.machinery
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "publish-ai-record"
LOADER = importlib.machinery.SourceFileLoader("publish_ai_record", str(SCRIPT))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
publish_ai_record = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = publish_ai_record
SPEC.loader.exec_module(publish_ai_record)


class RecoveryCliTests(unittest.TestCase):
    def test_legacy_publication_flags_are_rejected(self):
        result = subprocess.run([str(SCRIPT), "session-123", "--reviewed-by", "Human"], text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 2)
        self.assertIn("usage:", result.stderr)

    def test_status_requires_existing_journal(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([str(SCRIPT), "--status", "session-123.s0001", "--repo-root", directory], text=True, capture_output=True, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("recovery_failed", result.stderr)


if __name__ == "__main__":
    unittest.main()
