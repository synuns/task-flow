import contextlib
import io
import json
import subprocess
import sys
import unittest
from unittest import mock

from tests.test_verify import ROOT, load_verify_module


class VerifyContractTests(unittest.TestCase):
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
