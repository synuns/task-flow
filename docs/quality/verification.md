# Verification Policy

## Canonical Commands

```bash
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
./scripts/verify
```

No argument means `full`. Every verification mode is read-only and compares a
repository content fingerprint before and after execution. A mutation makes
verification fail.

## Modes

- `setup`: required entry-point and executable contract files,
  TODO checkbox/Status/dependency consistency and unsupported checkpoint-approval
  claims, pending-record ignore rule,
  Stop/SessionEnd hook wiring, AI disclosure headings, and the four focused
  artifact-contract, exporter, index, and publisher unit-test suites. It also
  runs a read-only verifier contract suite without invoking quick or full recursively.
- `quick`: `setup`, then `format:check`, `lint`, `typecheck`, and `test` after
  frontend scaffolding.
- `full`: `setup`, `quick`, `build`, and `test:e2e:core` after frontend
  scaffolding, then the complete `tests/test_verify.py` verifier regression suite.
  `KBHC_VERIFY_SELF_TESTING=1` guards nested verifier subprocesses from recursive
  re-entry and skips the nested core E2E already run by the parent full gate.

Before `package.json` exists, frontend stages print
`SKIP frontend not scaffolded`. This certifies workflow setup only. After
`package.json` exists, all six required scripts must exist; absence is failure.

Verification stops on first failure, exits nonzero, prints a reproduction
command, and lists failure classes from `workflow.md`.

## Formatting Mutation Is Separate

`format:check` reports differences and never edits files. Formatting mutation
is separate:

```bash
pnpm run format
```

Review the resulting diff and run `./scripts/verify quick`. No verify command
may call `pnpm run format` or another write-mode formatter.

## Test-Level Selection

- Unit: pure validation, transforms, and isolated state.
- Component: labels, disabled states, modal interaction, conditional UI, and
  focused accessibility.
- Integration: API response to view state, router transitions, and feature
  state with controlled external boundaries.
- E2E: real browser behavior crossing authentication, routing, network,
  scrolling, virtualization, or deletion/navigation boundaries.

Choose the lowest level that proves risk reliably. Do not duplicate lower-level
coverage in E2E.

## Journey Lookup Before a Change

Search a requirement ID, route, API path, or symbol in
`docs/quality/requirements.md`, `TODO.md`, `src`, and `e2e`, then use this map.

| Journey | Requirements and routes | Primary implementation areas | Focused E2E |
| --- | --- | --- | --- |
| `auth-entry` | `NAV-02`, `AUTH-01..07`; `/sign-in`, protected routes | `src/app/auth`, `src/features/sign-in`, `src/shared/api/auth*` | `e2e/auth-entry.spec.ts` |
| `work-overview` | `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`; `/`, `/user` | `src/widgets/app-shell`, `src/pages/dashboard`, `src/pages/user`, `src/widgets/dashboard-summary`, `src/widgets/user-profile` | `e2e/work-overview.spec.ts` |
| `task-discovery` | `TASK-LIST-01..05`; `/task`, `GET /api/task` | `src/pages/task-list`, `src/widgets/task-list`, `src/entities/task`, `src/shared/api/tasks.ts` | `e2e/task-discovery.spec.ts` |
| `task-resolution` | `TASK-DETAIL-01..05`; `/task/:id`, `GET/DELETE /api/task/:id` | `src/pages/task-detail`, `src/features/delete-task`, `src/shared/api/tasks.ts` | `e2e/task-resolution.spec.ts` |

The table is a lookup aid, not a replacement for requirement IDs or focused
unit, component, and integration tests.

## Local and CI Bootstrap

Use a Node version allowed by `package.json#engines` and pnpm `10.15.1` in both
environments, then run:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
./scripts/verify full
```

`./scripts/verify full` is the final verdict in both environments. Playwright
keeps one retry only for diagnostics and `failOnFlakyTests: true` makes a flaky
result fail the gate.

## Core E2E Journeys

Organize by `auth-entry`, `work-overview`, `task-discovery`, and
`task-resolution`, not by page.
Keep at most one representative success path and one critical failure path per journey.
Every E2E names its unique cross-boundary risk. `test:e2e:core` runs only
`@core`; extended, diagnostic,
or browser-compatibility suites use separate explicit commands.

Setup rejects an empty-tolerant core command or missing `@core` selector and
checks Playwright's listed tests for all four journey tags. The frontend suite
imports the Playwright configuration to require a fresh local server. Full
verification therefore starts a fresh server and fails when core selection is
empty.

Review slow, flaky, redundant cases for removal or demotion to integration or
component tests.

## Browser Evidence

Record scenario and requirement IDs, commit, route, viewport, preconditions,
actions, expected and actual results, console/network errors, screenshot or
trace, verdict, failure class, correction, and rerun result.

Browser automation failure is `ENVIRONMENT` or `TOOLING`, never product pass.

For `AUTH-07`, focused integration evidence proves that a protected request
sends `Authorization: Bearer <accessToken>` and exercises the human-approved
refresh/expiry behavior. Core E2E covers only a credential or browser-network
boundary that integration evidence cannot prove. The human `auth-entry`
checkpoint reviews both artifacts; authenticated navigation alone is
insufficient.

## Review Contract Verification

Setup rejects `IN_PROGRESS` or completed tasks with unfinished dependencies,
completed tasks with empty evidence, and completed Journey/full-review tasks without
the seven-field review record. It also verifies that plan-completion review evidence,
HIGH decision state, and TODO task ownership rules are present. These shape checks do
not prove reviewer independence, target SHA validity, browser evidence authenticity,
or review quality; a person verifies the recorded reviewer, target commit, and evidence.

## Prompt Candidate Verification

Setup verification confirms ignored pending storage, Stop hook wiring,
exporter tests, and reviewed-publication language. A person reviews a pending
Markdown file before running `pnpm run ai:review`. The TTY command lists only
valid closed records as review-pending session IDs, requires a numbered
selection, repeats the exact record ID, requires exact `y`+Enter, and records
reviewer plus reviewed SHA-256 digest. Printable Unicode reviewer names are
accepted while control characters are rejected. Non-TTY execution, invalid
selection, missing Git reviewer, BLOCKING scanner findings, other confirmation
input, EOF, or signal cannot publish. The publisher opens the candidate with
no-follow semantics, requires a regular file, reads it once, rejects a digest
mismatch, and revalidates the current closed record under lock before any public
write.
Published records alone are indexed in `artifacts/index.md`. The explicit
publisher holds the shared index lock and writes the reviewed artifact,
canonical index, and fully regenerated managed `AI_USAGE.md` region in that
order, rolling earlier files back if a later write fails. The region is derived
only from post-publication canonical index filenames, so stale, malformed,
missing, and unindexed links are removed. `SessionEnd` validates and prunes the
index only; it never rewrites `AI_USAGE.md`.
