import contextlib
import importlib.machinery
import importlib.util
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / "scripts" / "verify"


def load_verify_module():
    loader = importlib.machinery.SourceFileLoader("verify_under_test", str(VERIFY))
    spec = importlib.util.spec_from_loader("verify_under_test", loader)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


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

    def test_read_only_detects_tracked_modified_file_changed_during_stage(self):
        original = Path(__file__).read_bytes()
        verifier = load_verify_module()

        def mutate_stage():
            Path(__file__).write_bytes(original + b"\n# verifier-stage mutation\n")
            return 0

        try:
            with contextlib.redirect_stderr(io.StringIO()):
                with mock.patch.object(verifier, "verify_setup", mutate_stage):
                    result = verifier.main(["setup"])
        finally:
            Path(__file__).write_bytes(original)

        self.assertNotEqual(result, 0)

    def test_read_only_detects_untracked_file_changed_during_stage(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory(dir=ROOT, prefix=".verify-read-only-") as directory:
            candidate = Path(directory) / "pre-existing-untracked.txt"
            candidate.write_text("before\n", encoding="utf-8")

            def mutate_stage():
                candidate.write_text("after\n", encoding="utf-8")
                return 0

            with contextlib.redirect_stderr(io.StringIO()):
                with mock.patch.object(verifier, "verify_setup", mutate_stage):
                    result = verifier.main(["setup"])

        self.assertNotEqual(result, 0)

    def test_setup_invalid_hook_shapes_use_standard_failure(self):
        hooks_path = ROOT / ".codex" / "hooks.json"
        original = hooks_path.read_bytes()
        try:
            for source in (
                b"{",
                b"[]",
                b'{"hooks": {}}',
                b'{"hooks": {"Stop": [{"hooks": []}]}}',
            ):
                with self.subTest(source=source):
                    hooks_path.write_bytes(source)
                    result = self.run_verify("setup")
                    self.assertEqual(result.returncode, 1)
                    self.assertIn("FAIL setup:", result.stderr)
                    self.assertIn("REPRODUCE:", result.stderr)
                    self.assertIn("CLASSIFY:", result.stderr)
                    self.assertNotIn("Traceback", result.stderr)
        finally:
            hooks_path.write_bytes(original)

    def test_package_json_root_and_scripts_shapes_are_validation_errors(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            temporary_root = Path(directory)
            package_path = temporary_root / "package.json"
            with mock.patch.object(verifier, "ROOT", temporary_root):
                for source in ("[]", "{}", '{"scripts": []}'):
                    with self.subTest(source=source):
                        package_path.write_text(source, encoding="utf-8")
                        errors = io.StringIO()
                        with contextlib.redirect_stderr(errors):
                            result = verifier.verify_frontend("quick")
                        self.assertEqual(result, 1)
                        self.assertIn("FAIL frontend-scripts:", errors.getvalue())
                        self.assertNotIn("Traceback", errors.getvalue())

                package_path.write_bytes(b"\xff")
                errors = io.StringIO()
                with contextlib.redirect_stderr(errors):
                    result = verifier.verify_frontend("quick")
                self.assertEqual(result, 1)
                self.assertIn("FAIL frontend-scripts:", errors.getvalue())
                self.assertNotIn("Traceback", errors.getvalue())

    def test_stop_hook_shapes_are_validation_errors(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            temporary_root = Path(directory)
            hooks_path = temporary_root / ".codex" / "hooks.json"
            hooks_path.parent.mkdir()
            with mock.patch.object(verifier, "ROOT", temporary_root):
                for source in (
                    "[]",
                    "{}",
                    '{"hooks": {}}',
                    '{"hooks": {"Stop": []}}',
                    '{"hooks": {"Stop": [{"hooks": []}]}}',
                ):
                    with self.subTest(source=source):
                        hooks_path.write_text(source, encoding="utf-8")
                        with self.assertRaises(ValueError):
                            verifier.stop_hook_command()

                hooks_path.write_bytes(b"\xff")
                with self.assertRaises(ValueError):
                    verifier.stop_hook_command()

    def test_unexpected_stage_exception_still_runs_read_only_comparison(self):
        original = Path(__file__).read_bytes()
        verifier = load_verify_module()
        errors = io.StringIO()

        def mutate_then_raise():
            Path(__file__).write_bytes(original + b"\n# unexpected-stage mutation\n")
            raise RuntimeError("stage exploded")

        try:
            with contextlib.redirect_stderr(errors):
                with mock.patch.object(verifier, "verify_setup", mutate_then_raise):
                    result = verifier.main(["setup"])
        finally:
            Path(__file__).write_bytes(original)

        self.assertNotEqual(result, 0)
        self.assertIn("FAIL verification:", errors.getvalue())
        self.assertIn("FAIL read-only:", errors.getvalue())


if __name__ == "__main__":
    unittest.main()
