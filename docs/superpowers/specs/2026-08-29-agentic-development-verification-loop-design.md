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
  artifact-contract/index/publisher tests, and reviewed-publication contract.
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
  -> human reviews exact candidate bytes and records their SHA-256 digest
  -> explicit publish command supplies the digest and both review confirmations
  -> publisher opens a no-follow regular-file descriptor and reads once
  -> reject unless the opened bytes match the reviewed digest
  -> atomically write tracked artifacts record
  -> under one lock, update artifacts/index.md
  -> regenerate the full managed reviewed-record region in AI_USAGE.md from the
     post-publication canonical index filenames
```

Rules:

- Never copy or persist a raw transcript as part of the project workflow.
- Never write pre-redaction content to pending or tracked project files.
- Pending candidates are ignored by Git and are not submission evidence.
- Automated redaction is necessary but cannot grant publication approval.
- The publish command fails without the reviewed SHA-256 digest and both
  explicit human-review confirmations.
- `artifacts/` contains reviewed records only.
- Existing tracked records created under the earlier policy are labeled
  `legacy/pre-policy` until separately reviewed; automation never marks them
  reviewed.
- `AI_USAGE.md` links the reviewed-record index and retains factual, unchecked
  human-verification items until a person completes them. Only the explicit
  publisher rewrites the reviewed-record managed region, replacing it from the
  canonical reviewed index so stale, malformed, missing, or unindexed links do
  not retain trust; SessionEnd and Stop never rewrite `AI_USAGE.md`.

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

## 2026-09-01 Agent Loop Readiness Addendum

### Purpose and scope

현재 구현된 Journey와 검증 하네스를 기준으로 에이전트가 변경 전 관련 Journey를
찾고, 로컬과 CI에서 같은 판정으로 검증하고, 재현 가능한 evidence를 남길 수
있는지 보강한다. 새 문서 인덱스, 범용 project-loop skill, GitHub Actions, 제품
code와 UX는 추가하지 않는다.

Source priority와 네 Golden Journey, failure/recovery scenario, resettable MSW
fixture는 이미 canonical 문서와 test에 연결되어 있으므로 복제하지 않는다.
`AGENTS.md`는 짧은 진입점, `docs/quality/verification.md`는 lookup과 실행 정책,
기존 script와 contract test는 실행 가능한 불변 조건을 소유한다.

### Confirmed baseline

- `package.json`, lockfile과 설치 결과의 `@playwright/test`는 `1.62.1`이다.
- Playwright `1.62.1`은 `failOnFlakyTests`와 retry 진단을 지원한다.
- core E2E는 `auth-entry`, `work-overview`, `task-discovery`,
  `task-resolution` test file과 고정 fixture를 이미 가진다.
- Playwright는 기존처럼 `reuseExistingServer: false`로 fresh local server를
  시작한다.
- 이전 main-checkout full 실행의 read-only failure는 실행 중 다른 session이 같은
  checkout에 commit한 것이 원인이었다. 격리 worktree baseline quick은 통과했다.

### Document entry points

`AGENTS.md`는 작업 시작 시 requirement ID, route/API/symbol로
`docs/quality/requirements.md`, `TODO.md`, `src`, `e2e`를 검색하고 변경 영역에
연결된 Journey를 선택하도록 안내한다. 변경 뒤에는 lowest sufficient focused
test, `./scripts/verify quick`, 해당 Journey E2E 순으로 검증한다.

`docs/quality/verification.md`는 다음만 추가한다.

- code 영역에서 네 Journey와 focused Playwright file을 찾는 compact lookup
- local과 CI가 공유하는 Node/pnpm/Chromium 준비 명령
- `./scripts/verify full`이 두 환경의 동일한 최종 gate라는 정책

문서 문구 자체는 setup 성공 조건이 아니다. 표현 변경이 실행 계약을 깨뜨리지
않는 한 verifier는 문서의 특정 sentence를 검사하지 않는다.

### Executable invariants

기존 contract test를 다음 실행 가능한 조건으로 보강한다.

1. `package.json`은 `pnpm@10.15.1`과 exact `@playwright/test` version을 제공하고,
   설치된 Playwright version이 선언과 일치한다.
2. Playwright version이 `>=1.61.0`이면 config는 환경과 무관하게 `retries: 1`,
   `failOnFlakyTests: true`다. 지원하지 않는 version이면 dependency를 변경하지 않고
   `retries: 0`을 사용한다.
3. CI environment 유무가 retry와 flaky 최종 판정을 바꾸지 않는다.
4. verifier의 frontend stage는 다른 package manager가 아니라 `pnpm run`만 호출하고
   child command의 nonzero exit를 그대로 실패로 반환한다.
5. `test:e2e:core`는 empty selection을 허용하지 않고 Playwright `--list` 결과에
   네 Journey tag와 실제 test file이 모두 존재한다.
6. 보호 Journey test는 기존 authenticated fixture를 사용하며 `/api/sign-in`에
   의존하지 않는다. 실제 core 실행은 새 browser context, 고정 task seed, exact
   request count와 terminal state를 검증한다.
7. `./scripts/verify full`은 build, core E2E와 verifier regression 중 하나라도
   실패하거나 flaky로 분류되면 local과 CI 모두 nonzero다.

이 조건은 `tests/test_verify_contract.py`, `tests/test_verify.py`,
`src/test/harness-config.test.ts`와 실제 `./scripts/verify full`로 검증한다.
`AGENTS.md`와 quality 문서의 특정 문구를 실행 계약으로 취급하는
prose marker 검사는 제거하고, 파일 존재·package manager·fixture·test
selection·command·exit status를 실제로 확인하는 executable check로 대체한다.

### Deterministic E2E and test data

진단 trace, screenshot과 video는 기존 `retain-on-failure` 정책을 유지한다.
한 번 실패 후 retry에서 통과한 test도 `failOnFlakyTests: true` 때문에 gate를
실패한다. 따라서 retry는 성공 은폐가 아니라 재시도 진단 자료 수집에만 쓰인다.

격리 worktree에서 core suite 반복 실행과 local full을 수행한다. CI provider는
추가하지 않고 문서화된 frozen install, Chromium install, full command만 제공한다.
격리 상태에서도 duplicate request, fixture leak 또는 flaky verdict가 재현될 때만
root cause를 수정하며, 추측에 기반한 server/config 변경은 하지 않는다.

### Files and completion

- Modify `AGENTS.md`: Journey lookup과 pre/post-change 진입점
- Modify `docs/quality/verification.md`: lookup, local/CI bootstrap, 동일 gate 정책
- Modify `playwright.config.ts`: version-gated retry/flaky contract의 현재 적용
- Modify `scripts/verify`: pnpm invocation과 failure propagation 유지
- Modify `src/test/harness-config.test.ts`: installed version과 local/CI config invariant
- Modify `tests/test_verify_contract.py`: package manager, fixture, test-file/core selection
- Modify `tests/test_verify.py`: verification-stage nonzero exit contract
- Modify `TODO.md`: 이 readiness task의 owner와 evidence만 갱신

완료 전 focused contract tests, repeated core E2E, `./scripts/verify quick`,
`./scripts/verify full`, read-only fingerprint, diff scope와 plan-completion adversarial
review를 확인한다. 다른 session이 소유한 task block과 `assignment-original/`은
수정하지 않는다.
