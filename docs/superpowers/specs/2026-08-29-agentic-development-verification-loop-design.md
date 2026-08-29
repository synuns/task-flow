# Agentic Development and Verification Loop Design

## Purpose

Set up a tool-neutral operating model for AI-assisted implementation of the
frontend assignment. The model lets AI complete low-risk work continuously
while people retain responsibility for core user journeys, high-risk
decisions, exceptions, and final acceptance.

This setup defines project rules, commands, checklists, evidence, and prompt
record handling. It does not scaffold the React application, install
dependencies, or implement assignment features.

## Repository Context

The repository currently contains:

- The assignment requirements and OAS 3.1 contract under
  `assignment-original/`.
- A Codex `Stop` hook, a standard-library Python session exporter, and 13
  passing `unittest` tests.
- `AI_USAGE.md` and one tracked Codex session artifact.
- No frontend package, application source, package manager lockfile, browser
  test runner, or CI configuration.

The assignment requires React 18 or 19 with TypeScript, Pretendard, color
tokens, authenticated and unauthenticated navigation, dashboard metrics,
validated sign-in, virtualized infinite task browsing, task detail and
deletion flows, a not-found state, and user profile display. The OpenAPI file
is authoritative when prose and API details differ.

## Scope

Included:

- Root `AGENTS.md` with mandatory operating rules.
- Three focused quality documents under `docs/quality/`.
- Requirement traceability, golden user journeys, and invariant checklists.
- Risk-based AI delegation and human approval boundaries.
- A single, read-only verification entry point with setup, quick, and full
  modes.
- User-journey-based core E2E selection rules and test-level guidance.
- Failure classification and correction rules.
- Lightweight adversarial review at each core-journey checkpoint and a full
  review before final QA.
- A review-before-publish prompt-record pipeline and Codex adapter migration.

Excluded:

- React or TypeScript scaffolding.
- Assignment feature implementation.
- Package or browser dependency installation.
- Executable component, integration, or E2E tests for an application that does
  not exist yet.
- CI provider configuration.
- Automatic human approval or final-completion claims.

## File Structure

```text
AGENTS.md
docs/quality/
  requirements.md
  workflow.md
  verification.md
scripts/verify
.codex/hooks.json
.codex/hooks/export_session.py
AI_USAGE.md
```

Responsibilities:

- `AGENTS.md` is the short control plane. It states mandatory sequence,
  non-negotiable boundaries, canonical commands, and links to detailed rules.
- `docs/quality/requirements.md` owns requirement IDs, acceptance checklists,
  golden journeys, invariants, evidence links, and human checkpoint status.
- `docs/quality/workflow.md` owns work sizing, risk classification, delegation,
  approval gates, failure handling, adversarial review, and final QA.
- `docs/quality/verification.md` owns command behavior, read-only guarantees,
  test-level selection, browser evidence, and core E2E scope.
- `scripts/verify` is the stable command interface. It validates the current
  repository phase and expands when frontend tooling exists.
- `.codex/` is one tool-specific adapter behind the tool-neutral prompt-record
  contract.
- `AI_USAGE.md` contains submission disclosure and links only to reviewed,
  published records.

These three quality documents remain combined until navigation or ownership
becomes difficult. New one-topic files are not created merely to shorten a
document.

## Requirement Traceability

Each assignment requirement receives a stable ID grouped by domain:

- `NAV-*`: GNB/LNB and authentication-dependent navigation.
- `DASH-*`: dashboard metrics.
- `AUTH-*`: sign-in fields, validation, submission, and API errors.
- `TASK-LIST-*`: task loading, cards, virtualization, infinite pagination, and
  detail navigation.
- `TASK-DETAIL-*`: detail data, not-found behavior, delete confirmation, and
  redirect behavior.
- `USER-*`: user profile.
- `SYS-*`: React/TypeScript version, color tokens, Pretendard, API mocking, and
  AI usage disclosure.

Every checklist row includes:

```text
ID | requirement | source | acceptance condition | risk | preferred test level
| automated evidence | browser evidence | checkpoint | status
```

Valid statuses are `NOT_STARTED`, `IN_PROGRESS`, `AI_VERIFIED`,
`HUMAN_APPROVED`, and `BLOCKED`. AI may set all except `HUMAN_APPROVED`.
Evidence must identify a command result, browser record, or review finding;
an unsupported assertion is not evidence.

## Operating Loop

```text
select requirement IDs and acceptance conditions
  -> classify risk and choose smallest independently testable unit
  -> implement one unit
  -> run read-only automatic verification
  -> run applicable browser journey check
  -> classify and correct failures
  -> record evidence
  -> continue low-risk work
  -> complete a core user journey
  -> run lightweight adversarial review
  -> request human checkpoint acceptance
  -> repeat
  -> run full adversarial review
  -> run full verification and final QA
  -> request human final acceptance
```

A work unit covers one requirement ID or one independently testable condition
within an ID. Setup, test, implementation, and evidence needed for the same
deliverable remain together; arbitrary file-by-file tasks do not qualify as
useful units.

## Delegation and Approval Boundaries

Risk controls approval frequency:

### Low Risk

Examples include local implementation following an approved pattern, focused
tests, non-semantic refactoring needed by the active unit, documentation
updates, and fixes whose intended result is already unambiguous.

AI may implement, verify, correct, review, and continue without requesting
approval for each unit. It records decisions and evidence.

### Medium Risk

Examples include completion of a core user journey, a new interaction pattern,
or a change spanning routing, API state, and multiple views without changing
approved architecture.

AI completes and verifies the coherent journey, performs a lightweight
adversarial review, then requests one human checkpoint acceptance for the
batch. Individual requirements inside the batch do not each require approval.

### High Risk

Examples include conflicting requirement interpretations, authentication or
security policy, destructive-data behavior, architecture or dependency
changes, assignment-scope expansion, acceptance-criterion changes, and any
request to bypass a failed gate.

AI stops before the consequential change and requests a human decision. AI may
continue evidence collection, diagnosis, or unrelated low-risk analysis while
waiting, but may not implement beyond the affected boundary.

AI owns work decomposition, proposed risk, implementation, evidence, failure
classification, and corrective attempts. People own core-journey acceptance,
high-risk decisions, exception approval, and final completion.

## Core User Journeys and Review Checkpoints

E2E organization follows user intent, not page or component structure:

1. `auth-entry`: invalid sign-in, server rejection, successful sign-in, and
   authenticated navigation state.
2. `work-overview`: global/local navigation, dashboard metrics, and profile
   access.
3. `task-discovery`: initial task page, virtualized rendering, next-page load,
   and detail navigation.
4. `task-resolution`: successful detail, missing detail recovery, guarded
   deletion, and return to the task list.

Each completed journey receives a lightweight adversarial review before its
human checkpoint. The review looks for missed acceptance conditions, negative
paths, invariant violations, accessibility problems, test weakness, and
evidence gaps. It must come from a fresh reviewer context or an explicit
second-pass role that did not author the final change.

After all checkpoints, a full adversarial review examines interactions between
journeys, authentication transitions, stale state, API error behavior,
regressions, test duplication, and assignment-wide constraints. Findings are
resolved before final QA.

## Golden Scenarios and Invariants

`requirements.md` defines concise golden scenarios using preconditions,
actions, expected results, and mapped requirement IDs. At minimum it covers
the four core journeys above.

Project-wide invariants include:

- Navigation always exposes dashboard and task routes and displays the correct
  sign-in or profile action for authentication state.
- Color values used by application UI flow through named tokens.
- Pretendard is the application font.
- Sign-in labels remain programmatically associated with inputs.
- Invalid sign-in input cannot submit; server failures expose
  `errorMessage` in a modal.
- Protected API calls use the approved authentication mechanism.
- Task pages do not render the complete growing dataset at once.
- Infinite pagination stops when `hasNext` is false and does not duplicate an
  in-flight page request.
- Task detail 404 provides a usable return to the list.
- Delete submission remains disabled until entered ID exactly matches route
  ID, and successful deletion returns to the list.
- Loading, empty, error, and success states are distinguishable where
  applicable.
- AI-generated evidence never marks a human checkpoint complete.
- Verification commands never modify tracked files.

## Verification Command Contract

Canonical commands:

```bash
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
./scripts/verify
```

`./scripts/verify` is an alias for `full`.

### Setup Mode

`setup` validates items available before application scaffolding:

- Required files and cross-document links.
- Required workflow sections, risk labels, approval boundaries, requirement
  groups, journey categories, and final-QA checklist.
- Read-only verification rules and separate formatting mutation rules.
- Codex hook configuration, prompt exporter tests, pending-record ignore rule,
  and reviewed-publication contract.
- `AI_USAGE.md` required headings and review language.

### Quick Mode

Once frontend tooling exists, `quick` runs format checking, linting, TypeScript
checking, and unit/component/integration tests. Before scaffolding, frontend
steps report `SKIP: frontend not scaffolded`; this means workflow setup passed,
not that assignment functionality passed.

### Full Mode

Once frontend tooling exists, `full` runs `setup`, `quick`, production build,
and selected core E2E journeys. After `package.json` exists, missing required
commands are failures rather than skips.

Every verification mode is read-only. Format checking only reports differences
and fails. Formatting mutation is a separate application command:

```bash
npm run format
```

After formatting, the operator reviews the diff and reruns
`./scripts/verify quick`. No verification command invokes the mutation command.

Verification stops at the first failing stage and prints the stage, command to
reproduce it, and candidate failure categories. It returns nonzero on failures
and unsupported modes.

## Test-Level and E2E Selection

Tests use the lowest level that can prove the behavior reliably:

- Unit tests cover pure validation, data transforms, and isolated state rules.
- Component tests cover labels, disabled states, modal interaction, conditional
  rendering, and focused accessibility behavior.
- Integration tests cover API-response-to-view behavior, router transitions,
  and feature-level state with controlled external boundaries.
- E2E tests cover risks that require real browser interaction across multiple
  boundaries, such as authentication, routing, network behavior, scrolling,
  virtualization, and deletion navigation.

E2E selection rules:

- Organize by the four named user journeys.
- Keep at most one representative success path and one critical failure path
  per journey in the core suite.
- Do not add E2E coverage when a component or integration test proves the same
  risk more directly and reliably.
- Every E2E must name the unique cross-boundary risk it protects.
- `full` runs only core scenarios tagged `@core`.
- Extended, diagnostic, or browser-compatibility scenarios run through a
  separate explicit command and do not silently expand the core suite.
- Review redundant, slow, or flaky scenarios for removal or demotion to a
  lower test level.

Browser evidence records:

```text
scenario ID and commit
route and viewport
precondition
actions
expected and actual results
console and network errors
screenshot or trace reference
verdict
```

## Failure Classification and Correction

Every failed check uses one primary category:

- `REQUIREMENT`: ambiguous, conflicting, missing, or misunderstood acceptance
  condition.
- `IMPLEMENTATION`: application logic, state, or rendering defect.
- `INTEGRATION`: API, authentication, routing, browser, or cross-module defect.
- `UX_ACCESSIBILITY`: usability, interaction clarity, visual consistency, or
  accessibility defect.
- `TEST`: incorrect, redundant, flaky, or overly broad test.
- `ENVIRONMENT`: runtime, operating system, browser installation, port, or
  local service problem.
- `TOOLING`: build, lint, typecheck, verification command, hook, or test-runner
  problem.

The record includes observed evidence, chosen category, rationale, corrective
change, and rerun result. Requirement failures and any correction that changes
accepted behavior are high risk. Repeated failure is not hidden through a skip
or weakened assertion; unresolved failures become explicit blockers or human
decisions.

## Prompt Record Review and Publication

The common record format remains tool-neutral. A record identifies tool and
model, prompt or prompt summary, task scope, visible tool activity, visible
response, verification evidence, and human-review status. Tool adapters may
collect this information differently but must satisfy the same privacy and
publication contract.

Publication order:

```text
tool stop event
  -> process source transcript in memory
  -> structurally exclude internal instructions and reasoning
  -> redact and scan sensitive values
  -> write only a redacted candidate to ignored pending storage
  -> human reviews candidate
  -> explicit publish command confirms review
  -> atomically write tracked artifacts record
  -> link reviewed record from AI_USAGE.md
```

Rules:

- Never copy or persist a raw transcript as part of the project workflow.
- Never write pre-redaction content to pending or tracked project files.
- Pending candidates are ignored by Git and are not submission evidence.
- Automated redaction is necessary but cannot grant publication approval.
- The publish command fails without explicit human-review confirmation.
- `artifacts/` contains reviewed records only.
- Existing tracked records created under the earlier policy are labeled
  `legacy/pre-policy` until separately reviewed; automation never marks them
  reviewed.
- `AI_USAGE.md` links only reviewed records and retains factual, unchecked
  human-verification items until a person completes them.

The existing Codex `Stop` hook becomes the first adapter. Other AI tools are
allowed when their adapter or manual process produces the same reviewed record
contract. Tool neutrality does not mean pretending unsupported tools have an
automatic hook.

## Final QA

Final QA starts only after core-journey checkpoints and full adversarial review
findings are resolved. It includes:

- Full requirement checklist coverage.
- `./scripts/verify full` success on the intended submission commit.
- Core browser evidence for all four journeys.
- Cross-journey authentication, navigation, stale-state, error, and regression
  checks.
- Browser console and network error review.
- Accessibility and responsive-layout spot checks at documented viewports.
- OAS contract and mock implementation consistency.
- AI usage disclosure, reviewed artifact links, and sensitive-information
  review.
- Git diff review for generated files, accidental secrets, debug output, and
  unrelated changes.

AI prepares the final QA evidence and reports open risks. Only a person marks
final acceptance complete.

## Failure Safety

- Setup verification failures stop publication claims but do not modify files.
- A missing frontend is a documented pre-scaffold skip; missing frontend
  commands after scaffolding are failures.
- Browser-tool failure is classified separately from product behavior and does
  not become a false product pass.
- Prompt export failure preserves the last reviewed artifact and never
  publishes a partial candidate.
- Sensitive-data scan failure produces no tracked artifact.
- Human rejection reopens the affected journey without erasing prior evidence.
- No agent may bypass a failed check by editing the checklist status alone.

## Acceptance Criteria for This Setup

- Root rules express the approved risk-based autonomy and human responsibility
  model without requiring approval for each low-risk request.
- Three quality documents contain all required guidance without premature
  fragmentation.
- Requirements map to stable IDs, acceptance conditions, test level, evidence,
  and approval status.
- Golden scenarios and invariants cover all assignment domains.
- One read-only command supports `setup`, `quick`, and `full`; formatting
  mutation remains separate.
- Setup verification checks documents, workflow, hooks, and record handling.
- E2E scope is journey-based, core-tagged, and bounded against test inflation.
- Failure categories distinguish requirement, implementation, integration,
  UX/accessibility, test, environment, and tooling problems.
- Lightweight adversarial review precedes each core-journey checkpoint; full
  adversarial review precedes final QA.
- Prompt records are redacted before any project-file write and reviewed before
  tracked publication.
- Existing Codex hook behavior has a documented migration path without falsely
  presenting legacy artifacts as reviewed.
- No React application, dependency, or assignment feature is added by this
  setup work.
