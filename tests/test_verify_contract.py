import contextlib
import io
import json
import os
import re
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
- Evidence: focused verification PASS
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["QA-01 depends on unfinished JOURNEY-AUTH-01"],
            )

    def test_todo_rejects_in_progress_task_with_unfinished_dependency(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [ ] UI-FOUNDATION-01 foundation
- Depends on: 없음
- Status: NOT_STARTED
- Evidence: 없음

### [ ] UI-SHELL-01 shell
- Depends on: `UI-FOUNDATION-01`
- Status: IN_PROGRESS
- Evidence: owner session
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["UI-SHELL-01 depends on unfinished UI-FOUNDATION-01"],
            )

    def test_todo_rejects_completed_task_without_evidence(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [x] UI-FOUNDATION-01 foundation
- Depends on: 없음
- Status: AI_VERIFIED
- Evidence: 없음
""",
                encoding="utf-8",
            )
            self.assertEqual(
                verifier.verify_todo_consistency(root),
                ["UI-FOUNDATION-01 missing completion evidence"],
            )

    def test_todo_rejects_completed_review_without_review_record(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [x] AUTH-JOURNEY-REVIEW-01 review
- Depends on: 없음
- Status: AI_VERIFIED
- Evidence: quick PASS
""",
                encoding="utf-8",
            )
            errors = verifier.verify_todo_consistency(root)

            self.assertEqual(len(errors), 1)
            self.assertIn("AUTH-JOURNEY-REVIEW-01 missing review evidence", errors[0])
            for field in (
                "Review target:",
                "Reviewer:",
                "Checks:",
                "Findings:",
                "Corrections:",
                "Rerun:",
                "Verdict:",
            ):
                self.assertIn(field, errors[0])

    def test_todo_accepts_completed_review_record(self):
        verifier = load_verify_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TODO.md").write_text(
                """### [x] AUTH-JOURNEY-REVIEW-01 review
- Depends on: 없음
- Status: AI_VERIFIED
- Evidence: Review target: plan, AUTH, abc123
  Reviewer: independent reviewer
  Checks: requirements and diff
  Findings: none
  Corrections: not applicable
  Rerun: quick PASS
  Verdict: PASS
""",
                encoding="utf-8",
            )
            self.assertEqual(verifier.verify_todo_consistency(root), [])

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

    def test_repository_todo_contains_granular_journey_backlog(self):
        todo = (ROOT / "TODO.md").read_text(encoding="utf-8")
        expected = {
            "UI-FOUNDATION-01": ({"SCF-05", "ARCH-02"}, "NOT_STARTED"),
            "UI-SHELL-01": ({"UI-FOUNDATION-01", "AUTH-NAV-01"}, "NOT_STARTED"),
            "UI-STATE-01": ({"UI-FOUNDATION-01"}, "NOT_STARTED"),
            "AUTH-VIEW-01": ({"UI-SHELL-01", "UI-STATE-01", "AUTH-UI-01"}, "NOT_STARTED"),
            "AUTH-ERROR-VIEW-01": ({"AUTH-VIEW-01", "AUTH-API-01"}, "NOT_STARTED"),
            "AUTH-SESSION-UX-01": (
                {"AUTH-ERROR-VIEW-01", "AUTH-STATE-01", "UI-STATE-01"},
                "NOT_STARTED",
            ),
            "AUTH-JOURNEY-VERIFY-01": ({"AUTH-SESSION-UX-01"}, "NOT_STARTED"),
            "AUTH-JOURNEY-REVIEW-01": ({"AUTH-JOURNEY-VERIFY-01"}, "NOT_STARTED"),
            "JOURNEY-AUTH-01": ({"AUTH-JOURNEY-REVIEW-01"}, "BLOCKED"),
            "WORK-LOOP-DESIGN-01": ({"JOURNEY-AUTH-01"}, "NOT_STARTED"),
            "DASHBOARD-VIEW-01": (
                {"WORK-LOOP-DESIGN-01", "UI-SHELL-01", "UI-STATE-01", "DASH-01"},
                "NOT_STARTED",
            ),
            "PROFILE-VIEW-01": (
                {"WORK-LOOP-DESIGN-01", "UI-SHELL-01", "UI-STATE-01", "USER-01"},
                "NOT_STARTED",
            ),
            "WORK-NAV-RESPONSIVE-01": (
                {"DASHBOARD-VIEW-01", "PROFILE-VIEW-01"},
                "NOT_STARTED",
            ),
            "WORK-JOURNEY-VERIFY-01": ({"WORK-NAV-RESPONSIVE-01"}, "NOT_STARTED"),
            "WORK-JOURNEY-REVIEW-01": ({"WORK-JOURNEY-VERIFY-01"}, "NOT_STARTED"),
            "JOURNEY-WORK-01": ({"WORK-JOURNEY-REVIEW-01"}, "BLOCKED"),
            "TASK-DISCOVERY-LOOP-DESIGN-01": ({"JOURNEY-WORK-01"}, "NOT_STARTED"),
            "TASK-CARD-VIEW-01": (
                {"TASK-DISCOVERY-LOOP-DESIGN-01", "UI-FOUNDATION-01", "TASK-PAGE-01"},
                "NOT_STARTED",
            ),
            "TASK-LIST-VIRTUAL-UX-01": (
                {"TASK-CARD-VIEW-01", "TASK-PAGE-03"},
                "NOT_STARTED",
            ),
            "TASK-LIST-PAGING-UX-01": (
                {"TASK-LIST-VIRTUAL-UX-01", "TASK-PAGE-02"},
                "NOT_STARTED",
            ),
            "TASK-LIST-STATES-01": (
                {"TASK-LIST-PAGING-UX-01", "UI-STATE-01"},
                "NOT_STARTED",
            ),
            "TASK-LIST-JOURNEY-VERIFY-01": ({"TASK-LIST-STATES-01"}, "NOT_STARTED"),
            "TASK-LIST-JOURNEY-REVIEW-01": (
                {"TASK-LIST-JOURNEY-VERIFY-01"},
                "NOT_STARTED",
            ),
            "JOURNEY-TASK-LIST-01": ({"TASK-LIST-JOURNEY-REVIEW-01"}, "BLOCKED"),
            "TASK-DETAIL-VIEW-01": (
                {"UI-SHELL-01", "UI-STATE-01", "TASK-DETAIL-01"},
                "NOT_STARTED",
            ),
            "TASK-DETAIL-RECOVERY-VIEW-01": ({"TASK-DETAIL-VIEW-01"}, "NOT_STARTED"),
            "TASK-DELETE-DIALOG-VIEW-01": (
                {"TASK-DETAIL-VIEW-01", "TASK-DELETE-01", "UI-FOUNDATION-01"},
                "NOT_STARTED",
            ),
            "TASK-DELETE-OUTCOME-VIEW-01": (
                {
                    "TASK-DELETE-DIALOG-VIEW-01",
                    "TASK-DELETE-02",
                    "TASK-DETAIL-RECOVERY-VIEW-01",
                },
                "NOT_STARTED",
            ),
            "TASK-DETAIL-JOURNEY-VERIFY-01": (
                {"TASK-DELETE-OUTCOME-VIEW-01"},
                "NOT_STARTED",
            ),
            "TASK-DETAIL-JOURNEY-REVIEW-01": (
                {"TASK-DETAIL-JOURNEY-VERIFY-01"},
                "NOT_STARTED",
            ),
            "JOURNEY-TASK-DETAIL-01": ({"TASK-DETAIL-JOURNEY-REVIEW-01"}, "BLOCKED"),
            "QA-CROSS-AUTH-01": (
                {
                    "JOURNEY-AUTH-01",
                    "JOURNEY-WORK-01",
                    "JOURNEY-TASK-LIST-01",
                    "JOURNEY-TASK-DETAIL-01",
                },
                "NOT_STARTED",
            ),
            "QA-CROSS-DATA-01": (
                {
                    "JOURNEY-AUTH-01",
                    "JOURNEY-WORK-01",
                    "JOURNEY-TASK-LIST-01",
                    "JOURNEY-TASK-DETAIL-01",
                },
                "NOT_STARTED",
            ),
            "QA-RESPONSIVE-A11Y-01": (
                {"QA-CROSS-AUTH-01", "QA-CROSS-DATA-01"},
                "NOT_STARTED",
            ),
            "QA-CONTRACT-01": (
                {"QA-CROSS-AUTH-01", "QA-CROSS-DATA-01"},
                "NOT_STARTED",
            ),
            "QA-01": (
                {
                    "JOURNEY-AUTH-01",
                    "JOURNEY-WORK-01",
                    "JOURNEY-TASK-LIST-01",
                    "JOURNEY-TASK-DETAIL-01",
                    "QA-RESPONSIVE-A11Y-01",
                    "QA-CONTRACT-01",
                },
                "BLOCKED",
            ),
            "QA-02": (
                {
                    "QA-01",
                    "JOURNEY-AUTH-01",
                    "JOURNEY-WORK-01",
                    "JOURNEY-TASK-LIST-01",
                    "JOURNEY-TASK-DETAIL-01",
                },
                "BLOCKED",
            ),
            "QA-HARNESS-01": ({"QA-02"}, "BLOCKED"),
            "QA-03": ({"QA-02"}, "BLOCKED"),
            "QA-04": (
                {
                    "QA-02",
                    "QA-03",
                    "QA-HARNESS-01",
                    "JOURNEY-AUTH-01",
                    "JOURNEY-WORK-01",
                    "JOURNEY-TASK-LIST-01",
                    "JOURNEY-TASK-DETAIL-01",
                },
                "BLOCKED",
            ),
        }

        human_owned = {
            "JOURNEY-AUTH-01",
            "JOURNEY-WORK-01",
            "JOURNEY-TASK-LIST-01",
            "JOURNEY-TASK-DETAIL-01",
            "QA-04",
        }
        ai_statuses = {"NOT_STARTED", "IN_PROGRESS", "BLOCKED", "AI_VERIFIED"}
        human_statuses = {"BLOCKED", "HUMAN_APPROVED"}

        for task_id, (dependencies, _initial_status) in expected.items():
            match = re.search(
                rf"^### \[[ x]\] {re.escape(task_id)}\b(?P<block>.*?)(?=^### \[[ x]\]|\Z)",
                todo,
                re.MULTILINE | re.DOTALL,
            )
            self.assertIsNotNone(match, task_id)
            block = match.group("block") if match else ""
            for field in (
                "Requirements",
                "Risk",
                "Depends on",
                "Deliverable",
                "Acceptance",
                "Automatic verification",
                "Browser verification",
                "Status",
                "Evidence",
            ):
                self.assertIn(f"- {field}:", block, f"{task_id} missing {field}")
            status_match = re.search(r"^- Status: ([A-Z_]+)\s*$", block, re.MULTILINE)
            self.assertIsNotNone(status_match, task_id)
            self.assertIn(
                status_match.group(1) if status_match else None,
                human_statuses if task_id in human_owned else ai_statuses,
                task_id,
            )
            dependency_match = re.search(
                r"^- Depends on:(.*?)(?=\n- [A-Z]|\Z)",
                block,
                re.MULTILINE | re.DOTALL,
            )
            self.assertIsNotNone(dependency_match, task_id)
            actual_dependencies = set(
                re.findall(
                    r"`([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`",
                    dependency_match.group(1) if dependency_match else "",
                )
            )
            self.assertEqual(actual_dependencies, dependencies, task_id)

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

    def test_repository_uses_pinned_pnpm_and_required_core_files(self):
        verifier = load_verify_module()
        package = verifier.package_document()

        self.assertEqual(package["packageManager"], "pnpm@10.15.1")
        for relative in (
            "pnpm-lock.yaml",
            "e2e/authenticated-fixture.ts",
            "e2e/auth-entry.spec.ts",
            "e2e/work-overview.spec.ts",
            "e2e/task-discovery.spec.ts",
            "e2e/task-resolution.spec.ts",
            "src/mocks/fixtures/auth.ts",
            "src/mocks/fixtures/tasks.ts",
        ):
            with self.subTest(relative=relative):
                self.assertIn(relative, verifier.REQUIRED_FILES)
                self.assertTrue((ROOT / relative).is_file())

    def test_protected_core_journeys_use_authenticated_fixture(self):
        for relative in (
            "e2e/work-overview.spec.ts",
            "e2e/task-discovery.spec.ts",
            "e2e/task-resolution.spec.ts",
        ):
            source = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(relative=relative):
                self.assertIn('from "./authenticated-fixture"', source)
                self.assertIn("prepareAuthenticatedPage(page)", source)

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
        for relative in (
            "auth-entry.spec.ts",
            "work-overview.spec.ts",
            "task-discovery.spec.ts",
            "task-resolution.spec.ts",
        ):
            with self.subTest(relative=relative):
                self.assertIn(relative, combined)

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
