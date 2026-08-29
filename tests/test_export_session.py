import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
MODULE_PATH = ROOT / ".codex" / "hooks" / "export_session.py"
SPEC = importlib.util.spec_from_file_location("export_session", MODULE_PATH)
export_session = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = export_session
SPEC.loader.exec_module(export_session)


class ParseRolloutTests(unittest.TestCase):
    def setUp(self):
        self.warnings = []

    def parse(self, path=FIXTURE):
        return export_session.parse_rollout(
            path,
            "session-123",
            "fallback-model",
            lambda event, line: self.warnings.append((event, line)),
        )

    def test_visible_records_are_grouped(self):
        session = self.parse()
        self.assertEqual(session.model, "gpt-5.6-sol")
        self.assertEqual([turn.turn_id for turn in session.turns], ["turn-1", "turn-2"])
        self.assertEqual(session.turns[0].prompts, ["Create structure"])
        self.assertEqual(session.turns[0].responses, ["Structure created"])
        self.assertEqual(session.turns[1].prompts, ["Add tests"])
        self.assertEqual(session.turns[1].responses, ["Tests added"])

    def test_tool_output_pairs_by_call_id(self):
        tool = self.parse().turns[0].tools[0]
        self.assertEqual(tool.call_id, "call-1")
        self.assertEqual(tool.name, "exec")
        self.assertEqual(tool.input_text, '{"cmd":"pwd"}')
        self.assertEqual(tool.output_text, "/workspace/kbhc-assgn")
        self.assertEqual(tool.status, "completed")

    def test_internal_records_never_render(self):
        visible = repr(self.parse())
        for hidden in ("internal instruction", "private reasoning", "Working", "must not render"):
            self.assertNotIn(hidden, visible)

    def test_malformed_line_is_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            lines = FIXTURE.read_text(encoding="utf-8").splitlines()
            lines.insert(4, "{not-json")
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            session = self.parse(path)
        self.assertEqual(len(session.turns), 2)
        self.assertEqual(self.warnings, [("malformed_json", 5)])


class RedactionAndRenderTests(unittest.TestCase):
    def test_redacts_all_supported_shapes(self):
        source = "\n".join(
            [
                "Authorization: Bearer bearer-secret",
                "api_key=plain-secret",
                '"access_token": "json-secret"',
                "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456",
                "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456",
                "https://example.test/?token=query-secret&safe=yes",
                "-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----",
                "/Users/example/private/project",
            ]
        )
        rendered = export_session.redact(source, Path("/Users/example"))
        for secret in (
            "bearer-secret",
            "plain-secret",
            "json-secret",
            "sk-abcdefghijklmnopqrstuvwxyz123456",
            "ghp_abcdefghijklmnopqrstuvwxyz123456",
            "query-secret",
            "private-material",
        ):
            self.assertNotIn(secret, rendered)
        self.assertIn("~/private/project", rendered)

    def test_render_is_ordered_and_deterministic(self):
        session = export_session.parse_rollout(
            FIXTURE,
            "session-123",
            "fallback-model",
            lambda event, line: None,
        )
        first = export_session.render_markdown(session)
        second = export_session.render_markdown(session)
        self.assertEqual(first, second)
        expected = [
            "Human review required before submission",
            "## Turn 1",
            "### User prompt",
            "Create structure",
            "### Tool activity",
            "#### `exec`",
            '{"cmd":"pwd"}',
            "/workspace/kbhc-assgn",
            "### Assistant response",
            "Structure created",
            "## Turn 2",
            "Add tests",
            "Tests added",
        ]
        position = -1
        for value in expected:
            position = first.index(value, position + 1)
        self.assertTrue(first.endswith("\n"))

    def test_fence_expands_for_embedded_backticks(self):
        block = export_session.fenced("before ``` after")
        self.assertTrue(block.startswith("````text\n"))
        self.assertTrue(block.endswith("\n````"))


class HookCliTests(unittest.TestCase):
    def run_cli(self, repo_root, stdin_text):
        return subprocess.run(
            [sys.executable, str(MODULE_PATH), "--repo-root", str(repo_root)],
            input=stdin_text,
            text=True,
            capture_output=True,
            check=False,
        )

    def payload(self, repo_root):
        return {
            "hook_event_name": "Stop",
            "session_id": "session-123",
            "transcript_path": str(FIXTURE),
            "cwd": str(repo_root),
            "model": "gpt-5.6-sol",
            "turn_id": "turn-2",
        }

    def test_success_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first_result = self.run_cli(root, json.dumps(self.payload(root)))
            candidate = (
                root
                / ".codex"
                / "review-pending"
                / "codex-session-session-123.md"
            )
            first = candidate.read_text(encoding="utf-8")
            second_result = self.run_cli(root, json.dumps(self.payload(root)))
            second = candidate.read_text(encoding="utf-8")
            artifacts_exist = (root / "artifacts").exists()
        self.assertEqual(first_result.returncode, 0)
        self.assertEqual(json.loads(first_result.stdout), {"continue": True})
        self.assertEqual(json.loads(second_result.stdout), {"continue": True})
        self.assertEqual(first, second)
        self.assertEqual(first.count("## Turn 1"), 1)
        self.assertFalse(artifacts_exist)

    def test_missing_transcript_preserves_previous_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            candidate_path = (
                root / ".codex" / "review-pending" / "codex-session-session-123.md"
            )
            candidate_path.parent.mkdir(parents=True)
            candidate_path.write_text("existing\n", encoding="utf-8")
            payload = self.payload(root)
            payload["transcript_path"] = str(root / "secret-name.jsonl")
            result = self.run_cli(root, json.dumps(payload))
            candidate = candidate_path.read_text(encoding="utf-8")
            log = (root / ".codex" / "hooks" / "export-session.log").read_text(
                encoding="utf-8"
            )
        self.assertEqual(json.loads(result.stdout), {"continue": True})
        self.assertEqual(candidate, "existing\n")
        self.assertIn("missing_transcript", log)
        self.assertNotIn("secret-name.jsonl", log)

    def test_invalid_stdin_and_unsafe_session_write_nothing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            invalid = self.run_cli(root, "not-json")
            payload = self.payload(root)
            payload["session_id"] = "..."
            unsafe = self.run_cli(root, json.dumps(payload))
            artifact_directory = root / "artifacts"
        self.assertEqual(json.loads(invalid.stdout), {"continue": True})
        self.assertEqual(json.loads(unsafe.stdout), {"continue": True})
        self.assertFalse(artifact_directory.exists())

    def test_cwd_outside_repo_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payload = self.payload(root)
            payload["cwd"] = str(root.parent)
            result = self.run_cli(root, json.dumps(payload))
            log = (root / ".codex" / "hooks" / "export-session.log").read_text(
                encoding="utf-8"
            )
        self.assertEqual(json.loads(result.stdout), {"continue": True})
        self.assertIn("cwd_outside_repo", log)


class ProjectWiringTests(unittest.TestCase):
    def test_pending_records_are_ignored(self):
        result = subprocess.run(
            ["git", "check-ignore", "-q", ".codex/review-pending/probe.md"],
            cwd=str(ROOT),
            check=False,
        )
        self.assertEqual(result.returncode, 0)

    def test_stop_hook(self):
        config = json.loads(
            (ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8")
        )
        handler = config["hooks"]["Stop"][0]["hooks"][0]
        self.assertEqual(
            config["description"],
            "Prepare redacted Codex session candidates for human review.",
        )
        self.assertEqual(handler["type"], "command")
        self.assertIn("git rev-parse --show-toplevel", handler["command"])
        self.assertIn(".codex/hooks/export_session.py", handler["command"])
        self.assertEqual(handler["timeout"], 30)
        self.assertEqual(
            handler["statusMessage"],
            "Preparing redacted Codex session candidate",
        )

    def test_ai_usage_required_sections(self):
        document = (ROOT / "AI_USAGE.md").read_text(encoding="utf-8")
        for heading in (
            "## 사용한 도구와 모델",
            "## 적용한 작업 범위",
            "## 핵심 프롬프트 요약",
            "## 사람이 최종 검증한 내용",
            "## 전체 프롬프트와 작업 기록",
        ):
            self.assertIn(heading, document)
        self.assertIn("<!-- reviewed-records:start -->", document)
        self.assertIn("<!-- reviewed-records:end -->", document)
        self.assertIn("legacy/pre-policy", document)
        self.assertIn("- [ ]", document)


if __name__ == "__main__":
    unittest.main()
