import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "codex-rollout.jsonl"
HOOKS = ROOT / ".codex" / "hooks"
if str(HOOKS) not in sys.path:
    sys.path.insert(0, str(HOOKS))
MODULE_PATH = HOOKS / "export_session.py"
SPEC = importlib.util.spec_from_file_location("export_session", MODULE_PATH)
export_session = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = export_session
SPEC.loader.exec_module(export_session)
import transcript_adapter


class ParseRolloutTests(unittest.TestCase):
    def parse(self, path=FIXTURE):
        return transcript_adapter.read_transcript(path, "session-123", "fallback-model").session

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
        self.assertEqual(tool.output_text, "/workspace/taskflow")
        self.assertEqual(tool.status, "completed")

    def test_internal_records_never_render(self):
        visible = repr(self.parse())
        for hidden in ("internal instruction", "private reasoning", "Working", "must not render"):
            self.assertNotIn(hidden, visible)

    def test_malformed_line_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            lines = FIXTURE.read_text(encoding="utf-8").splitlines()
            lines.insert(4, "{not-json")
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            with self.assertRaises(transcript_adapter.TranscriptError) as raised:
                self.parse(path)
        self.assertEqual(raised.exception.code, "malformed_json")


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

    def test_redacts_complete_quoted_assignment_values(self):
        source = "\n".join(
            [
                'api_key="alpha beta,gamma&delta"; safe=yes',
                "password='one two,three&four'; safe=yes",
                '"access_token": "json value,tail&more", "safe": true',
                'secret="alpha \\"quoted\\",beta&gamma"; safe=yes',
                "secret='one \\'quoted\\',two&three'; safe=yes",
            ]
        )

        rendered = export_session.redact(source, Path("/__no_home_match__"))

        self.assertEqual(
            rendered,
            "\n".join(
                [
                    'api_key="[REDACTED]"; safe=yes',
                    "password='[REDACTED]'; safe=yes",
                    '"access_token": "[REDACTED]", "safe": true',
                    'secret="[REDACTED]"; safe=yes',
                    "secret='[REDACTED]'; safe=yes",
                ]
            ),
        )

    def test_redacts_authoritative_refresh_tokens_and_refresh_cookie(self):
        values = (
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImNhbWVsIn0.camel-signature_suffix",
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InNuYWtlIn0.snake-signature_suffix",
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImtlYmFiIn0.kebab-signature_suffix",
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImNvb2tpZSJ9.cookie-signature_suffix",
        )
        source = "\n".join(
            [
                "refreshToken={}".format(values[0]),
                "refresh_token='{}'".format(values[1]),
                '\"refresh-token\": \"{}\", \"safe\": true'.format(values[2]),
                "Cookie: theme=dark; token={}; safe=yes".format(values[3]),
            ]
        )

        rendered = export_session.redact(source, Path("/__no_home_match__"))

        for value in values:
            self.assertNotIn(value, rendered)
            self.assertNotIn(value.rsplit(".", 1)[1], rendered)
        self.assertEqual(
            rendered,
            "\n".join(
                [
                    "refreshToken=[REDACTED]",
                    "refresh_token='[REDACTED]'",
                    '\"refresh-token\": \"[REDACTED]\", \"safe\": true',
                    "Cookie: theme=dark; token=[REDACTED]; safe=yes",
                ]
            ),
        )

    def test_redacts_every_repeated_refresh_cookie_token(self):
        values = (
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZpcnN0In0.repeated-first_suffix",
            "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InNlY29uZCJ9.repeated-second_suffix",
        )
        source = "\n".join(
            [
                "Cookie: theme=dark; token={}; token={}; safe=yes".format(
                    *values
                ),
                "Cookie: token=[REDACTED]; token={}; token={}".format(*values),
            ]
        )

        rendered = export_session.redact(source, Path("/__no_home_match__"))

        for value in values:
            self.assertNotIn(value, rendered)
            self.assertNotIn(value.rsplit(".", 1)[1], rendered)
        self.assertEqual(
            rendered,
            "\n".join(
                [
                    "Cookie: theme=dark; token=[REDACTED]; "
                    "token=[REDACTED]; safe=yes",
                    "Cookie: token=[REDACTED]; token=[REDACTED]; "
                    "token=[REDACTED]",
                ]
            ),
        )

    def test_render_is_ordered_and_deterministic(self):
        session = transcript_adapter.read_transcript(
            FIXTURE, "session-123", "fallback-model"
        ).session
        first = export_session.render_markdown(session)
        second = export_session.render_markdown(session)
        self.assertEqual(first, second)
        self.assertEqual(first.count("<details>"), 2)
        self.assertEqual(first.count("<summary>작업 내용 보기</summary>"), 2)
        self.assertEqual(first.count("</details>"), 2)
        self.assertLess(first.index("Create structure"), first.index("<details>"))
        first_work = first.split("<details>", 1)[1].split("</details>", 1)[0]
        self.assertNotIn("Create structure", first_work)
        self.assertIn("### Tool activity", first_work)
        self.assertIn("### Assistant response", first_work)
        expected = [
            "Human review required before submission",
            "## Turn 1",
            "### User prompt",
            "Create structure",
            "### Tool activity",
            "#### `exec`",
            '{"cmd":"pwd"}',
            "/workspace/taskflow",
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

    def test_render_omits_empty_work_details(self):
        session = transcript_adapter.SessionData(
            "session-123",
            "model",
            "started",
            "cwd",
            [transcript_adapter.TurnData("turn-1", prompts=["Prompt only"])],
        )

        rendered = export_session.render_markdown(session)

        self.assertIn("### User prompt\n\nPrompt only", rendered)
        self.assertNotIn("<details>", rendered)

    def test_fence_expands_for_embedded_backticks(self):
        block = export_session.fenced("before ``` after")
        self.assertTrue(block.startswith("````text\n"))
        self.assertTrue(block.endswith("\n````"))



class ProjectWiringTests(unittest.TestCase):
    def test_exporter_uses_adapter_as_the_only_parser_owner(self):
        for name in (
            "ToolActivity",
            "TurnData",
            "SessionData",
            "extract_visible_text",
            "_legacy_parse_rollout",
            "parse_rollout",
            "log_event",
            "atomic_write",
            "cwd_is_inside_repo",
            "run_hook",
            "parse_args",
            "main",
        ):
            with self.subTest(name=name):
                self.assertFalse(hasattr(export_session, name))

    def test_pending_records_are_ignored(self):
        result = subprocess.run(
            ["git", "check-ignore", "-q", ".codex/review-pending/probe.md"],
            cwd=str(ROOT),
            check=False,
        )
        self.assertEqual(result.returncode, 0)

    def test_publisher_temporary_files_are_precisely_ignored(self):
        for path in (
            ".reviewed-record-probe.tmp",
            "artifacts/.reviewed-record-probe.tmp",
        ):
            with self.subTest(path=path):
                result = subprocess.run(
                    ["git", "check-ignore", "-q", path],
                    cwd=str(ROOT),
                    check=False,
                )
                self.assertEqual(result.returncode, 0)
        unrelated = subprocess.run(
            ["git", "check-ignore", "-q", "scripts/.reviewed-record-probe.tmp"],
            cwd=str(ROOT),
            check=False,
        )
        self.assertNotEqual(unrelated.returncode, 0)

    def test_stop_hook(self):
        config = json.loads(
            (ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8")
        )
        handler = config["hooks"]["Stop"][0]["hooks"][0]
        self.assertEqual(config["description"], "Maintain review-pending Codex session records across lifecycle events.")
        self.assertEqual(handler["type"], "command")
        self.assertIn("git rev-parse --show-toplevel", handler["command"])
        self.assertIn(".codex/hooks/session_hook.py", handler["command"])
        self.assertEqual(handler["timeout"], 30)
        self.assertEqual(
            handler["statusMessage"],
            "Updating pending session snapshot",
        )

    def test_session_end_hook(self):
        config = json.loads(
            (ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8")
        )
        self.assertIn("SessionEnd", config["hooks"])
        group = config["hooks"]["SessionEnd"][0]
        handler = group["hooks"][0]
        self.assertNotIn("matcher", group)
        self.assertEqual(handler["type"], "command")
        self.assertIn("git rev-parse --show-toplevel", handler["command"])
        self.assertIn(".codex/hooks/session_hook.py", handler["command"])
        self.assertEqual(handler["timeout"], 3)

    def test_all_lifecycle_hooks_use_common_dispatcher(self):
        config = json.loads((ROOT / ".codex" / "hooks.json").read_text(encoding="utf-8"))
        expected_timeouts = {"UserPromptSubmit": 5, "Stop": 30, "SessionStart": 3, "SessionEnd": 3}
        for event, timeout in expected_timeouts.items():
            with self.subTest(event=event):
                group = config["hooks"][event][0]
                handler = group["hooks"][0]
                self.assertIn(".codex/hooks/session_hook.py", handler["command"])
                self.assertEqual(handler["timeout"], timeout)
        self.assertEqual(config["hooks"]["SessionStart"][0]["matcher"], "startup|resume|clear|compact")

    def test_ai_usage_required_sections(self):
        document = (ROOT / "AI_USAGE.md").read_text(encoding="utf-8")
        for heading in (
            "## 사용한 도구와 모델",
            "## 적용한 작업 범위",
            "## 핵심 프롬프트 요약",
            "## 사람이 최종 검증한 내용",
            "## 자동 검증 내역",
            "## 프롬프트 작업 기록",
        ):
            self.assertIn(heading, document)
        self.assertIn(
            "[작업 주제별 프롬프트 기록](./artifacts/index.md)",
            document,
        )
        self.assertNotIn("[세션 기록 디렉터리](./artifacts/)", document)
        self.assertNotIn("<!-- reviewed-records:start -->", document)
        self.assertNotIn("<!-- reviewed-records:end -->", document)
        self.assertNotRegex(document, r"\./artifacts/codex-session-[^)]+\.md")
        for skill in (
            "superpowers:brainstorming",
            "superpowers:using-git-worktrees",
            "superpowers:writing-plans",
            "superpowers:test-driven-development",
            "frontend-design:frontend-design",
            "ponytail:ponytail",
            "agent-browser",
        ):
            self.assertIn("`{}`".format(skill), document)
        self.assertEqual(document.count("- [ ]") + document.count("- [x]"), 4)


if __name__ == "__main__":
    unittest.main()
