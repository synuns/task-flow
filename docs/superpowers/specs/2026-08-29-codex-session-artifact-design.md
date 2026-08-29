# Codex Session Artifact Design

## Purpose

Generate reviewable evidence of Codex usage for the assignment. Each completed
Codex turn updates a session Markdown artifact containing user prompts, tool
activity, and final assistant responses. `AI_USAGE.md` links to these artifacts.

Assignment requirements come from
`assignment-original/requirement.md`. Prompt artifacts are optional submission
evidence, but any secrets or sensitive information must be removed.

## Scope

Included:

- Project-local Codex `Stop` hook configuration.
- Standard-library Python exporter.
- One cumulative Markdown artifact per Codex session.
- User prompt text, tool inputs and outputs, and final assistant responses.
- Automatic masking for common secret formats.
- Parser and redaction tests using synthetic fixtures.
- `AI_USAGE.md` structure linking generated session artifacts.

Excluded:

- System and developer instructions.
- Internal reasoning records.
- Subagent transcripts.
- HTML output.
- External logging services or dependencies.
- Automatic claims that a human performed final verification.

## Decision

Use one project-local `Stop` command hook. On every completed turn, the hook
reads its JSON input from stdin, parses the referenced rollout JSONL, builds the
complete session document in memory, and atomically replaces the existing
artifact.

Alternatives rejected:

- Multiple `UserPromptSubmit`, `PostToolUse`, and `Stop` hooks require ordering,
  concurrency, and deduplication logic.
- `notify` exposes turn inputs and the last assistant message but does not
  provide complete tool activity.

## Files

```text
.codex/hooks.json
.codex/hooks/export_session.py
.codex/hooks/export-session.log        # runtime-only, ignored by Git
artifacts/codex-session-<session-id>.md # generated submission evidence
AI_USAGE.md
tests/test_export_session.py
```

The hook command resolves the repository root with Git before invoking the
exporter. This remains correct when Codex starts from a repository
subdirectory. Project hooks execute only after the user trusts the repository.

## Hook Input and Output

Codex sends one JSON object to the hook on stdin. Used fields:

- `session_id`: artifact identity.
- `transcript_path`: rollout JSONL source.
- `cwd`: diagnostic context and repository boundary check.
- `model`: model metadata.
- `turn_id`: diagnostic metadata.
- `hook_event_name`: must equal `Stop`.

The exporter writes `{"continue": true}` as valid JSON to stdout. Export
failures never request another Codex continuation. Diagnostics go only to the
log file.

Official Codex documentation states that `transcript_path` is convenient but
its transcript format is not a stable hook interface. Parser logic therefore
uses tolerant field access and skips unknown records:

- <https://learn.chatgpt.com/docs/hooks>
- <https://learn.chatgpt.com/docs/config-file/config-reference>

## Data Flow

```text
Codex finishes turn
  -> Stop hook receives JSON on stdin
  -> validate event, session id, and transcript path
  -> stream rollout JSONL records
  -> select session metadata and visible response items
  -> redact secrets from every rendered text field
  -> render cumulative Markdown
  -> write temporary file beside destination
  -> atomically replace artifacts/codex-session-<id>.md
  -> return {"continue": true}
```

Every `Stop` run rebuilds the same session artifact. Repeated runs are
idempotent and cannot append duplicate turns.

## Rollout Parsing

Primary records are `session_meta`, `turn_context`, and `response_item`.
Unknown record types and unknown fields are ignored.

Included `response_item` payloads:

- `message` with role `user`: original user prompt.
- `message` with role `assistant`: visible assistant response.
- Tool-call items, including `custom_tool_call`: tool name and input.
- Tool-result items, including `custom_tool_call_output`: output associated by
  call ID when available.

Excluded payloads:

- Messages with role `system` or `developer`.
- `reasoning` items and encrypted reasoning content.
- Event telemetry, token counts, rate limits, and internal thread settings.

Turns are grouped by `turn_id` when present. When a visible legacy item lacks a
turn ID, source order is preserved under an `Ungrouped records` section rather
than dropping evidence. Content arrays are flattened only for visible text
types such as `input_text` and `output_text`; unsupported content shapes are
ignored.

## Markdown Format

```markdown
# Codex Session `<session-id>`

- Model: `<model>`
- Started: `<timestamp>`
- Working directory: `<repository-relative or redacted path>`

## Turn 1

### User prompt

<verbatim user text after redaction>

### Tool activity

#### `<tool name>`

**Input**

```text
<tool input after redaction>
```

**Output**

```text
<tool output after redaction>
```

### Assistant response

<visible assistant text after redaction>
```

Generated artifacts contain a warning that automatic redaction is best-effort
and human review remains required before submission.

## Secret and Privacy Handling

Redaction runs before Markdown rendering and covers user text, tool inputs,
tool outputs, assistant text, and metadata. Initial patterns include:

- Authorization bearer/basic credentials.
- Common API-key assignments and JSON fields.
- OpenAI-style and GitHub-style token prefixes.
- PEM private-key blocks.
- Sensitive URL query parameters.

Matches become `[REDACTED]`. Absolute paths under the current user's home
directory render with `~` where useful. System/developer prompts and reasoning
are excluded structurally, not regex-redacted.

Automatic redaction cannot prove all sensitive content is absent.
`AI_USAGE.md` must include an unchecked human-review item until a person
reviews generated artifacts. The exporter never marks human verification as
complete.

## Failure Handling

- Invalid hook stdin: log error, preserve existing artifact, return continuation
  JSON, exit successfully.
- Non-`Stop` event: no-op and return continuation JSON.
- Missing or unreadable transcript: log error and preserve existing artifact.
- Malformed JSONL line: log line number, skip line, continue parsing.
- Missing required session identity: do not create an artifact.
- Unsafe session ID characters: replace with `_` and enforce a length limit.
- Write or replace failure: remove temporary file when possible and preserve the
  prior artifact.
- Unknown rollout schema: ignore unknown records; never render internal records
  by fallback stringification.

Logs must not include transcript content or secrets. They contain timestamps,
event/session identifiers, line numbers, and exception classes only.

## `AI_USAGE.md` Structure

The root document contains assignment-required sections:

1. Tools and models used.
2. Work scope.
3. Core prompt summary.
4. Human verification.
5. Full prompt and work records.

Section 5 links each tracked file under `artifacts/`. Generated artifacts are
committed as submission evidence. Runtime log and temporary files are ignored.
Human-verification wording remains factual and must be updated by the submitter.

## Verification

Unit tests use synthetic JSONL only and cover:

- One normal turn.
- Multiple turns and stable ordering.
- User, tool-call, tool-result, and assistant extraction.
- System/developer/reasoning exclusion.
- Malformed JSONL recovery.
- Unknown record and content types.
- Secret redaction across every rendered field.
- Safe session filename generation.
- Idempotent rerun without duplicate output.
- Missing transcript without destroying an existing artifact.
- Atomic replacement behavior.

An integration test pipes representative hook JSON into the exporter from a
repository subdirectory and verifies stdout JSON plus generated Markdown.

## Acceptance Criteria

- A Codex `Stop` event produces or updates exactly one Markdown file named
  `artifacts/codex-session-<safe-session-id>.md`.
- Artifact includes original user prompts, tool activity, and visible final
  assistant responses in source order.
- Artifact excludes system/developer instructions and reasoning records.
- Reprocessing an unchanged transcript produces identical output.
- One malformed rollout line does not prevent remaining valid records from
  rendering.
- Common credential samples never appear unmasked in generated output.
- Hook errors preserve any prior valid artifact and never request a Codex
  continuation prompt.
- `AI_USAGE.md` links generated artifacts and does not falsely claim completed
  human verification.
