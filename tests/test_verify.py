import contextlib
import importlib.machinery
import importlib.util
import io
import json
import os
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
        environment = os.environ.copy()
        environment["TASKFLOW_VERIFY_SELF_TESTING"] = "1"
        return subprocess.run(
            [str(VERIFY), *args],
            cwd=str(ROOT),
            env=environment,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_setup_covers_review_before_publish_contract(self):
        result = self.run_verify("setup")
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        self.assertIn("PASS setup", combined)
        self.assertIn("PASS hook-tests", combined)
        self.assertNotIn("FAIL", combined)

    def test_setup_requires_publisher(self):
        verifier = load_verify_module()
        self.assertIn("scripts/publish-ai-record", verifier.REQUIRED_FILES)

    def test_frontend_stages_use_pnpm(self):
        verifier = load_verify_module()
        package = {
            "packageManager": "pnpm@10.15.1",
            "scripts": {name: name for name in verifier.REQUIRED_PACKAGE_SCRIPTS},
            "taskflow": {"frontendScaffolded": True},
        }
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch.object(verifier, "package_document", return_value=package):
                with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                    result = verifier.verify_frontend("full")

        self.assertEqual(result, 0)
        self.assertEqual(
            run_stage.call_args_list,
            [
                mock.call(name, ["pnpm", "run", name])
                for name in (
                    "format:check",
                    "lint",
                    "typecheck",
                    "test",
                    "build",
                    "test:e2e:core",
                )
            ],
        )

    def test_frontend_stops_and_returns_nonzero_on_child_failure(self):
        verifier = load_verify_module()
        package = {
            "packageManager": "pnpm@10.15.1",
            "scripts": {name: name for name in verifier.REQUIRED_PACKAGE_SCRIPTS},
            "taskflow": {"frontendScaffolded": True},
        }
        with mock.patch.object(verifier, "package_document", return_value=package):
            with mock.patch.object(verifier, "run_stage", side_effect=[0, 1]) as run_stage:
                result = verifier.verify_frontend("quick")

        self.assertNotEqual(result, 0)
        self.assertEqual(run_stage.call_count, 2)

    def test_self_testing_full_keeps_core_e2e(self):
        verifier = load_verify_module()
        package = {
            "packageManager": "pnpm@10.15.1",
            "scripts": {name: name for name in verifier.REQUIRED_PACKAGE_SCRIPTS},
            "taskflow": {"frontendScaffolded": True},
        }
        with mock.patch.dict(os.environ, {"TASKFLOW_VERIFY_SELF_TESTING": "1"}, clear=True):
            with mock.patch.object(verifier, "package_document", return_value=package):
                with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                    result = verifier.verify_frontend("full")

        self.assertEqual(result, 0)
        self.assertEqual(
            run_stage.call_args_list,
            [
                mock.call(name, ["pnpm", "run", name])
                for name in (
                    "format:check",
                    "lint",
                    "typecheck",
                    "test",
                    "build",
                    "test:e2e:core",
                )
            ],
        )

    def test_run_stage_returns_nonzero_for_child_failure(self):
        verifier = load_verify_module()
        errors = io.StringIO()
        with contextlib.redirect_stderr(errors):
            result = verifier.run_stage(
                "probe",
                [sys.executable, "-c", "import sys; sys.exit(7)"],
            )

        self.assertNotEqual(result, 0)
        self.assertIn("command exited 7", errors.getvalue())

    def test_quick_runs_frontend_after_scaffolding(self):
        result = self.run_verify("quick")
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        self.assertNotIn("SKIP frontend not scaffolded", result.stdout)
        for stage in ("format:check", "lint", "typecheck", "test"):
            with self.subTest(stage=stage):
                self.assertIn("PASS {}".format(stage), result.stdout)

    def test_frontend_scaffold_activates_required_scripts(self):
        verifier = load_verify_module()
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(package["scripts"]["ai:review"], "./scripts/review-ai-record")
        self.assertTrue(package["taskflow"]["frontendScaffolded"])
        self.assertEqual(
            set(verifier.REQUIRED_PACKAGE_SCRIPTS) - set(package["scripts"]),
            set(),
        )
        self.assertEqual(verifier.verify_review_tooling(ROOT), [])

    def test_default_selects_full_without_nested_subprocess(self):
        verifier = load_verify_module()
        with mock.patch.dict(os.environ, {"TASKFLOW_VERIFY_SELF_TESTING": "1"}, clear=True):
            with mock.patch.object(verifier, "repository_fingerprint", return_value=b"same"):
                with mock.patch.object(verifier, "verify_setup", return_value=0):
                    with mock.patch.object(verifier, "verify_frontend", return_value=0) as frontend:
                        with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                            result = verifier.main([])

        self.assertEqual(result, 0)
        frontend.assert_called_once_with("full")
        run_stage.assert_not_called()

    def test_unknown_mode_fails(self):
        result = self.run_verify("unknown")
        self.assertEqual(result.returncode, 2)
        self.assertIn("usage: pnpm verify [setup|quick|full]", result.stderr)

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
        pre_existing_dirty = original + b"\n# pre-existing tracked modification\n"
        verifier = load_verify_module()

        def mutate_stage():
            Path(__file__).write_bytes(
                pre_existing_dirty + b"# verifier-stage mutation\n"
            )
            return 0

        try:
            Path(__file__).write_bytes(pre_existing_dirty)
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

    def test_package_document_rejects_non_pnpm_manager(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            temporary_root = Path(directory)
            (temporary_root / "package.json").write_text(
                json.dumps(
                    {
                        "packageManager": "npm@11.0.0",
                        "scripts": {},
                        "taskflow": {"frontendScaffolded": True},
                    }
                ),
                encoding="utf-8",
            )
            with mock.patch.object(verifier, "ROOT", temporary_root):
                with self.assertRaisesRegex(ValueError, "packageManager must be pnpm@10.15.1"):
                    verifier.package_document()

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

    def test_session_end_hook_shapes_are_validation_errors(self):
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
                    '{"hooks": {"SessionEnd": []}}',
                    '{"hooks": {"SessionEnd": [{"hooks": []}]}}',
                ):
                    with self.subTest(source=source):
                        hooks_path.write_text(source, encoding="utf-8")
                        with self.assertRaises(ValueError):
                            verifier.hook_command("SessionEnd")

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
