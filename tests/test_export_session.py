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


if __name__ == "__main__":
    unittest.main()
