import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / "scripts" / "verify"


class VerifyCliTests(unittest.TestCase):
    def run_verify(self, *args):
        return subprocess.run(
            [str(VERIFY), *args],
            cwd=str(ROOT),
            text=True,
            capture_output=True,
            check=False,
        )

    def test_setup_validates_workflow_and_hook(self):
        result = self.run_verify("setup")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS setup", result.stdout)
        self.assertIn("PASS hook-tests", result.stdout)

    def test_quick_skips_frontend_before_scaffolding(self):
        result = self.run_verify("quick")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("SKIP frontend not scaffolded", result.stdout)

    def test_default_is_full(self):
        result = self.run_verify()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS setup", result.stdout)
        self.assertIn("SKIP frontend not scaffolded", result.stdout)

    def test_unknown_mode_fails(self):
        result = self.run_verify("unknown")
        self.assertEqual(result.returncode, 2)
        self.assertIn("usage:", result.stderr)

    def test_verify_is_read_only(self):
        before = subprocess.check_output(
            ["git", "status", "--porcelain=v1", "-z"], cwd=str(ROOT)
        )
        result = self.run_verify("setup")
        after = subprocess.check_output(
            ["git", "status", "--porcelain=v1", "-z"], cwd=str(ROOT)
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
