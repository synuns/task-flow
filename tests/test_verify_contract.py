import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tests.test_verify import ROOT, load_verify_module


class VerifyContractTests(unittest.TestCase):
    def test_outer_full_runs_complete_verifier_regression_suite(self):
        verifier = load_verify_module()
        with mock.patch.object(verifier, "repository_fingerprint", return_value=b"same"):
            with mock.patch.object(verifier, "verify_setup", return_value=0):
                with mock.patch.object(verifier, "verify_frontend", return_value=0):
                    with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                        with mock.patch.dict(os.environ, {}, clear=True):
                            result = verifier.main(["full"])

        self.assertEqual(result, 0)
        run_stage.assert_called_once_with(
            "verify-regression",
            [
                "env",
                "KBHC_VERIFY_SELF_TESTING=1",
                sys.executable,
                "-m",
                "unittest",
                "tests/test_verify.py",
                "-v",
            ],
        )

    def test_nested_full_skips_verifier_regression_suite(self):
        verifier = load_verify_module()
        with mock.patch.object(verifier, "repository_fingerprint", return_value=b"same"):
            with mock.patch.object(verifier, "verify_setup", return_value=0):
                with mock.patch.object(verifier, "verify_frontend", return_value=0):
                    with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                        with mock.patch.dict(
                            os.environ, {"KBHC_VERIFY_SELF_TESTING": "1"}, clear=True
                        ):
                            result = verifier.main(["full"])

        self.assertEqual(result, 0)
        run_stage.assert_not_called()

    def test_todo_rejects_completed_task_with_unfinished_dependency(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS

### [x] QA-01 audit
- Depends on: `JOURNEY-AUTH-01`
- Status: AI_VERIFIED
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["QA-01 depends on unfinished JOURNEY-AUTH-01"],
            )

    def test_todo_rejects_unapproved_checkpoint_claim(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS
- Evidence: checkpoint 승인 수신
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["JOURNEY-AUTH-01 claims checkpoint approval without HUMAN_APPROVED"],
            )

    def test_todo_accepts_explicit_missing_approval_evidence(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS
- Evidence: checkpoint 승인 근거 없음
""",
                encoding="utf-8",
            )
            self.assertEqual(verifier.verify_todo_consistency(root), [])

    def test_todo_rejects_english_unapproved_checkpoint_claim(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
- Status: IN_PROGRESS
- Evidence: checkpoint approval was received
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["JOURNEY-AUTH-01 claims checkpoint approval without HUMAN_APPROVED"],
            )

    def test_todo_rejects_missing_status(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] JOURNEY-AUTH-01 checkpoint
- Depends on: 없음
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["JOURNEY-AUTH-01 missing Status"],
            )

    def test_repository_todo_state_is_consistent(self):
        verifier = load_verify_module()
        self.assertEqual(verifier.verify_todo_consistency(ROOT), [])

    def test_setup_runs_read_only_verifier_contract_tests(self):
        verifier = load_verify_module()
        with contextlib.redirect_stdout(io.StringIO()):
            with mock.patch.object(verifier, "run_stage", return_value=0) as run_stage:
                result = verifier.verify_setup()

        self.assertEqual(result, 0)
        self.assertEqual(run_stage.call_count, 2)
        self.assertEqual(
            run_stage.call_args_list[1],
            mock.call(
                "verify-tests",
                [
                    sys.executable,
                    "-m",
                    "unittest",
                    "tests/test_verify_contract.py",
                    "-v",
                ],
            ),
        )

    def test_core_e2e_command_requires_nonempty_core_selection(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        command = package["scripts"]["test:e2e:core"]

        self.assertIn("playwright test", command)
        self.assertIn("--grep @core", command)
        self.assertNotIn("--pass-with-no-tests", command)

    def test_playwright_lists_all_core_journeys(self):
        result = subprocess.run(
            ["pnpm", "exec", "playwright", "test", "--grep", "@core", "--list"],
            cwd=str(ROOT),
            text=True,
            capture_output=True,
            check=False,
        )
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        for tag in ("@auth", "@work", "@task-discovery", "@task-resolution"):
            with self.subTest(tag=tag):
                self.assertIn(tag, combined)

    def test_runtime_harness_has_fresh_server_and_no_webstorage_warning(self):
        result = subprocess.run(
            [
                "pnpm",
                "exec",
                "vitest",
                "run",
                "src/test/harness-config.test.ts",
                "src/shared/api/request.test.ts",
                "--pool=forks",
                "--maxWorkers=1",
            ],
            cwd=str(ROOT),
            text=True,
            capture_output=True,
            check=False,
        )
        combined = result.stdout + result.stderr
        self.assertEqual(result.returncode, 0, combined)
        self.assertNotIn("--localstorage-file", combined)


if __name__ == "__main__":
    unittest.main()
