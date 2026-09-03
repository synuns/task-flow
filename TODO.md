# 에이전트 작업 목록

## 목적

과제 완료까지 남은 작업, 의존성, 검증법, evidence를 관리하는 실행 원장이다.
상위 목표와 단계는 `docs/project-plan.md`, accepted behavior는
`docs/quality/requirements.md`, 구현 규율은 `docs/coding-standards.md`, 세부 작업
설계는 `docs/superpowers/`를 따른다.

## 에이전트 사용 규칙

1. 작업 시작 전 필수 문서와 이 파일을 읽는다.
2. `Status: NOT_STARTED`이며 모든 `Depends on`이 완료된 item 하나를 고른다.
3. 시작할 때만 `IN_PROGRESS`로 바꾸고 담당 agent/session을 Evidence에 남긴다.
4. requirement ID, risk, acceptance, 검증법을 바꾸지 않고 한 testable unit만
   구현한다.
5. HIGH item은 사람 결정 evidence 없이는 구현하지 않는다.
6. 자동·browser 검증 후 재현 명령, commit, 결과를 Evidence에 기록한다.
7. AI는 검증 완료 item을 `AI_VERIFIED`까지만 변경한다.
8. `HUMAN_APPROVED`는 사람이 명시적으로 승인한 journey checkpoint에만 사람이
   기록한다.
9. 실패는 `docs/quality/workflow.md` 분류와 root cause, correction, rerun을
   Evidence에 남긴다.
10. 새 작업은 해당 단계에 stable ID로 추가한다. 완료 item을 삭제하거나
    번호를 재사용하지 않는다.
11. Evidence에 기록된 agent/session이 task block owner다. 병렬 session은
    소유하지 않은 task block의 checkbox, Status, Evidence를 갱신하지 않는다.
12. HIGH decision item은 명시적 사람 결정 evidence와 지정 검증이 통과하면
    `AI_VERIFIED`로 닫는다. 이는 Journey의 `HUMAN_APPROVED`가 아니다.
13. branch는 merge 전 최신 main을 반영하고 TODO conflict를 item 단위로 합친다.

## 상태

- `NOT_STARTED`: 시작 전
- `IN_PROGRESS`: 한 agent가 수행 중
- `AI_VERIFIED`: acceptance와 자동/browser evidence 충족. HIGH decision은 사람
  결정 evidence가 있을 때 `AI_VERIFIED`로 닫되 Journey 수용을 뜻하지 않는다.
- `HUMAN_APPROVED`: 사람이 checkpoint 승인
- `BLOCKED`: blocker와 해제 조건 기록

`[ ]`는 미완료, `[x]`는 `AI_VERIFIED` 또는 사람이 기록한
`HUMAN_APPROVED`를 뜻한다. checkbox와 Status가 다르면 Status를 보수적으로
낮추고 evidence를 다시 확인한다.

## 현재 진행 요약

| 단계               | Exit gate                                       | 상태                           |
| ------------------ | ----------------------------------------------- | ------------------------------ |
| 0. 기획·결정 준비  | 상위 기준 연결, HIGH 결정 목록 분리             | AI_VERIFIED                    |
| 1. 개발 기반       | quick/full 및 scaffold browser smoke 통과       | AI_VERIFIED                    |
| 2. 공통 구조       | provider/router/API 기반 + 실제 UI shell/state  | AI_VERIFIED                    |
| 3. auth-entry      | 화면 구현·통합 검증·review 후 사람 checkpoint   | HUMAN_APPROVED                 |
| 4. work-overview   | 화면 구현·통합 검증·review 후 사람 checkpoint   | HUMAN_APPROVED                 |
| 5. task-discovery  | 화면 구현·통합 검증·review 후 사람 checkpoint   | HUMAN_APPROVED                 |
| 6. task-resolution | 화면 구현·통합 검증·review 후 사람 checkpoint   | HUMAN_APPROVED                 |
| 7. 통합·제출 QA    | 네 checkpoint와 full QA 후 사람 최종 acceptance | IN_PROGRESS                    |

## 0. 기획·결정 준비

### [x] PLAN-01 상위 기획과 실행 원장 연결

- Requirements: 전체
- Risk: LOW
- Depends on: 없음
- Deliverable: `docs/project-plan.md`, `TODO.md`, `AGENTS.md` Required Reading
- Acceptance: 문서 역할, source priority, 전체 단계, agent 갱신 규칙이 서로
  모순 없이 연결된다.
- Automatic verification: `./scripts/verify setup`, `git diff --check`, 문서 link와
  heading 정적 검사
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-29 `./scripts/verify setup` PASS, 79 tests; requirement ID
  coverage 27/27; TODO 34 items의 필수 field 10종과 dependency reference 검사 PASS;
  staged `git diff --check` PASS

### [x] DEC-AUTH-01 인증 정책 사람 결정

- Requirements: `AUTH-07`, `NAV-02`, `NAV-03`
- Risk: HIGH
- Depends on: `PLAN-01`
- Deliverable: access token 저장, refresh cookie 관계, expiry/401/replay,
  refresh 실패, 보호 route 정책을 확정한 별도 auth 설계 문서
- Acceptance: `docs/project-plan.md`의 인증 정책 질문이 각각 한 가지 동작으로
  답해지고 OpenAPI bearer/refresh scheme과 모순이 없으며 사람이 승인한다.
- Automatic verification: 설계 문서 self-review와 OpenAPI/auth requirement
  trace 검사
- Browser verification: 구현 전 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `docs/superpowers/specs/2026-08-30-authentication-policy-design.md`;
  access token memory 저장, MSW refresh cookie, session generation, single-flight
  refresh, 최대 한 번 replay, late 401와 이전 session 격리, 내부 route allowlist,
  app callback 주입과 router-owned navigation을 확정하고 사용자 대화 승인;
  `docs/superpowers/plans/2026-08-30-authentication-policy.md` 실행 계획 자체 검토;
  구현 후 auth/provider/request Vitest와 auth-entry Chromium, architecture 정적
  검토, `./scripts/verify quick` PASS; 사람 승인 evidence는 기록하되 규약에 따라
  AI가 `HUMAN_APPROVED`로 표시하지 않음

### [x] PLAN-02 에이전트 코딩 규약 연결

- Requirements: 전체 구현·검증 requirement
- Risk: LOW
- Depends on: `PLAN-01`
- Deliverable: `docs/coding-standards.md`, `AGENTS.md` Required Reading, TODO 연결
- Acceptance: TDD, FSD, shadcn-first, SOLID·기존 코드 보존, agent-browser QA,
  type/error/accessibility/diff 규칙과 예외 절차가 실행 가능한 수준으로 정의된다.
- Automatic verification: `./scripts/verify setup`, `git diff --check`, 필수 heading과
  명령 정적 검사
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-29 `agent-browser` 설치 경로와 pnpm 10.15.1 확인; TDD,
  FSD, shadcn-first, SOLID, 기존 code 보존, browser QA heading·명령 정적 검사
  PASS; shadcn `search`, `view`, `add` 명령은 공식 CLI 문서와 대조

### [x] SCN-01 Golden Journey 통합 시나리오 재작성

- Requirements: 전체 Golden Journey requirement
- Risk: LOW — accepted behavior를 바꾸지 않는 원본·OpenAPI trace 정교화
- Depends on: `PLAN-01`
- Deliverable: Master Journey와 독립 실행 가능한 네 Journey의 정상·핵심 예외
  경로를 통합한 `docs/quality/requirements.md`
- Acceptance: 모든 단계가 requirement와 OpenAPI operation/status/schema에
  trace되고 인증·삭제 미확정 동작은 명시적 결정 gate로 남으며 OpenAPI에 없는
  동작이나 data를 추가하지 않는다.
- Automatic verification: requirement/API trace self-review,
  `./scripts/verify setup`, `git diff --check`
- Browser verification: 문서 설계에는 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `c4c7fdef010cbb1246b2cef74f28a5d5b23e4546`,
  `65d6a1927ab5f28258d74dbe6b63a2cef1e977c4`; Master Journey와 네 독립 Journey
  정상·핵심 예외 경로 및 `DEC-AUTH-01`·`DEC-DELETE-01` gate trace; RED
  `test_setup_requires_integrated_journey_contract_markers` 5 marker 누락 FAIL,
  `test_fsd_creation_constraints_are_recorded` 6 constraint 누락 FAIL; GREEN 두
  focused unittest, `./scripts/verify setup`, `git diff --check` PASS;
  `assignment-original/` diff 없음

### [x] FLOW-REVIEW-01 계획 완료 적대적 리뷰 계약 보강

- Requirements: 전체 계획 기반 작업과 Golden Journey
- Risk: HIGH — 사람 gate와 완료 상태 의미 변경
- Depends on: `PLAN-01`
- Deliverable: 계획 구현 완료 후 독립 adversarial review, 공통 review evidence,
  HIGH 결정 완료 상태, 병렬 TODO 원장 갱신 규칙을 연결한 workflow 계약
- Acceptance: 계획의 구현·자동/browser 검증이 끝난 뒤 final task를 완료 처리하기
  전에 fresh reviewer가 누락·회귀·evidence를 검토하고, 동일 범위 Journey review와
  중복하지 않으며, HIGH 결정은 사람 결정 evidence가 있을 때 `AI_VERIFIED`로
  닫히고, 병렬 작업은 소유하지 않은 TODO block을 갱신하지 않는다.
- Automatic verification: workflow marker와 TODO 상태/dependency 정적 test,
  `./scripts/verify setup`, `git diff --check`
- Browser verification: 정책 문서에는 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`; 사용자 회고 후 계획 완료 review와 개선안
  반영 요청; `docs/superpowers/specs/2026-08-30-plan-completion-adversarial-review-design.md`
  작성 및 placeholder·모순·범위·상태 전이 자체 검토; 사용자 설계 승인;
  `docs/superpowers/plans/2026-08-30-plan-completion-adversarial-review.md` 구현 계획;
  Review target: 위 계획, `FLOW-REVIEW-01`,
  `7945f8c8d3cdf12a04c196f5cdf033cf0e6c7d51`; Reviewer: 최종 작성자
  `/root`와 분리된 read-only context `/root/plan_review`,
  `/root/plan_review_final`; Checks: spec/plan coverage, 완료 전 review 순서,
  HIGH 결정과 Journey 승인 경계, 동일 target 재사용, TODO ownership, setup
  marker/test, 최신 `main` 정합성, unrelated/`assignment-original/` diff;
  Findings: 1차 Important `REQUIREMENT` 순서 모호성, Important `INTEGRATION`
  stale base, Minor `TOOLING` plan checkbox; 2차 Important `REQUIREMENT` 수정 전
  SHA 고정, Important `TEST` marker/evidence 계약 누락, Minor `REQUIREMENT` stale
  인용문; 3차 Minor `REQUIREMENT` 최종 수정 작성자 관계 누락; 최종 findings
  none; Corrections: 완료 전 순서 명시, `a9243b2` rebase, plan 상태 정합화, 최신
  수정 SHA 재review 규칙, 필수 marker와 ordering test 보강, stale 문구와 reviewer
  관계 수정; Rerun: focused unittest PASS, `./scripts/verify quick` PASS(Python 86,
  Vitest 20), `git diff --check` PASS, `assignment-original/` diff 없음, browser는
  정책 문서 변경이라 적용 없음; Verdict: PASS

### [x] TOOL-AI-REVIEW-01 redaction audit 오탐 수정

- Requirements: `SYS-05`
- Risk: LOW — 기존 review scanner 판정 규칙의 구현 오류 수정
- Depends on: `PLAN-01`
- Deliverable: 이미 `[REDACTED]`인 값은 REVIEW로 유지하고 실제 미마스킹
  secret만 BLOCKING하는 scanner와 회귀 test
- Acceptance: secret pattern 재적용 결과가 원문과 다를 때만
  `unredacted_secret`이며 실제 secret 차단과 TTY 사람 승인 경계는 유지된다.
- Automatic verification: focused scanner test, 실제 closed candidate read-only
  재검사, `./scripts/verify quick`
- Browser verification: 적용 없음 — terminal-only tooling
- Status: AI_VERIFIED
- Evidence: 2026-08-30 RED
  `python3 -m unittest tests.test_review_scanner.ReviewScannerTests.test_redacted_secret_is_review_only -v`
  예상한 `unredacted_secret` 오탐 FAIL; GREEN scanner 5 tests PASS; 실제 선택
  candidate read-only 재검사 `blocking=0`, `review=4`; raw secret 차단 test 유지;
  `./scripts/verify quick` PASS, hook tests 80개·frontend tests 3개

### [x] TOOL-AI-REVIEW-02 검수 완료 게시 흐름 단순화

- Requirements: `SYS-05`
- Risk: HIGH — 사람 publication 승인 흐름 변경
- Depends on: `TOOL-AI-REVIEW-01`
- Deliverable: review-pending session ID 목록, 선택, exact 확인, 기존 publisher
  게시만 수행하는 CLI
- Acceptance: risk summary·pager·reviewer 입력 없이 유효한 `closed` session만
  선택하고, BLOCKING audit와 TTY/exact-y 경계를 유지한 채 artifact를 게시한다.
- Automatic verification: review CLI unit tests, hook test suite,
  `./scripts/verify quick`
- Browser verification: 적용 없음 — terminal-only tooling
- Status: AI_VERIFIED
- Evidence: 2026-08-30 사용자 승인, spec commit `752582c`; RED focused
  tests가 기존 자동 선택·risk menu·reviewer prompt를 재현; 전체 리뷰에서
  superseded closed segment 노출을 RED로 재현하고 current manifest filter로 수정;
  review CLI 9개·scanner 5개 PASS; 문서 변경 후 setup marker 실패를 TOOLING으로
  분류하고 reviewed SHA-256 audit 문구 복원 후 재검증; `./scripts/verify setup`,
  `./scripts/verify quick`, `git diff --check` PASS; 전체 리뷰에서 session 전환 시
  publisher 부분 게시 race, Unicode reviewer 계약 불일치, exact record 식별 누락을
  발견하고 2026-08-30 사람 승인 후 각각 RED→GREEN; focused 22개, hook tests
  86개·frontend tests 3개 PASS; 실제 TTY publication은 사람 checkpoint 대기

### [x] DEC-DELETE-01 삭제 일관성 정책 사람 결정

- Requirements: `TASK-DETAIL-03`~`TASK-DETAIL-05`, `DASH-01`, `TASK-LIST-01`
- Risk: HIGH — destructive-data semantics
- Depends on: `PLAN-01`
- Deliverable: 200 success, 401/404/network failure, 중복 submit, modal close,
  목록·상세·dashboard mock/cache 일관성을 확정한 삭제 설계 문서
- Acceptance: exact route ID 확인 전 요청 금지와 200 success에서만 `/task`
  redirect하는 원본 동작을 유지하고 모든 실패·cache transition이 한 가지로
  확정되며 사람이 승인한다.
- Automatic verification: 설계 self-review, OpenAPI/delete requirement trace 검사
- Browser verification: 구현 전 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30
  `docs/superpowers/specs/2026-08-30-delete-consistency-policy-design.md`;
  server-authoritative 비낙관적 삭제, attempt당 auth replay 포함 DELETE 최대 2회,
  200-only redirect, 404 non-success, outcome-unknown detail 재조회, 단일 fixture
  store와 cache 일관성을 확정하고 사용자 대화 승인;
  `docs/superpowers/plans/2026-08-30-delete-consistency-policy.md` 실행 계획 자체 검토;
  구현 후 delete outcome/guard/cache/transport Vitest와 task-resolution Chromium,
  architecture 정적 검토, `./scripts/verify quick` PASS; 사람 승인 evidence는
  기록하되 규약에 따라 AI가 `HUMAN_APPROVED`로 표시하지 않음

### [x] DEC-ARCH-01 애플리케이션 구조 상세 설계

- Requirements: 전체 기능 requirement의 구조 기반
- Risk: HIGH — architecture 결정
- Depends on: `PLAN-02`
- Deliverable: FSD layer, public API, import 방향, provider composition,
  route/API/test 경계를 확정한 별도 설계 문서
- Acceptance: 각 module의 책임·소비·제공 interface가 명확하고 scaffold 및
  `docs/tech-stack.md`와 일치하며 사람이 승인한다. FSD directory와 public API는
  실제 소비 시점에만 생성하고 generated contract는 `shared/api` 내부 소비로
  제한하며 auth provider placeholder를 포함하지 않는다.
- Automatic verification: 설계 self-review, dependency 방향과 requirement
  coverage 정적 검토
- Browser verification: 구현 전 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`; 사용자 설계 내용 최종 승인;
  `docs/superpowers/specs/2026-08-30-application-architecture-design.md` 작성 및
  placeholder·모순·범위·module 책임·dependency 방향·requirement trace 자체 검토;
  `./scripts/verify setup` PASS, 79 tests; `git diff --check` PASS; 작성된 문서
  사용자 검토 승인; 2026-08-30 `shared/api` auth callback app 주입과
  RouterProvider 내부 navigation 책임을 추가 승인; 구현 후 FSD/public API,
  generated/mocks, provider/router ownership 정적·Vitest 검토와
  `./scripts/verify quick` PASS; 사람 승인 evidence는 기록하되 규약에 따라 AI가
  `HUMAN_APPROVED`로 표시하지 않음

### [x] PLAN-JOURNEY-BACKLOG-01 Journey 구현 백로그 세분화

- Requirements: 전체 Journey의 실행 단위와 evidence contract
- Risk: LOW — accepted behavior를 바꾸지 않는 실행 원장 보강
- Depends on: `PLAN-01`, `FLOW-REVIEW-01`
- Deliverable: 공통 UI, 네 Journey 구현·검증·review와 통합 QA의 세부 TODO graph
- Acceptance: 기존 완료 이력을 보존하고 dependency-resolved `NOT_STARTED` task가
  있으며 Journey review와 사람 checkpoint가 분리되고 setup 계약이 이를 검증한다.
- Automatic verification: focused verifier contract test, `./scripts/verify setup`,
  `./scripts/verify quick`, `git diff --check`
- Browser verification: 적용 없음 — 원장 설계 변경
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; 승인된 design
  `docs/superpowers/specs/2026-09-01-journey-implementation-backlog-design.md`와 plan
  `docs/superpowers/plans/2026-09-01-journey-implementation-backlog.md`;
  Review target: 위 plan, 전체 Journey/QA gate, `922dc6c`;
  Reviewer: 최종 작성자와 분리된 fresh read-only `/root/journey_backlog_review`;
  Checks: 기존 완료 이력, 9개 task field, dependency/cycle/착수 가능 task, browser
  조건, 상태 전이, evidence/review gate, worktree 정책, final QA chain, unrelated diff;
  Findings: 초기 HIGH `TOOLING` status 고정과 evidence/review gate 우회, MEDIUM
  `TEST` final dependency 누락, `INTEGRATION` browser 조건·UI state 순서·harness 우회;
  Corrections: lifecycle 허용 상태, 완료 evidence와 7필드 review record, `IN_PROGRESS`
  dependency 검사, browser owner/조건, `QA-01`~`QA-04` dependency를 보강;
  Rerun: verifier 18 tests, `./scripts/verify setup`, `./scripts/verify quick`, Vitest
  34 files/122 tests, `git diff --check`, graph cycle/ready-task audit PASS;
  Verdict: PASS — unresolved HIGH/MEDIUM 없음, 수동 evidence 진위는 사람 checkpoint 소유

### [x] LOOP-READINESS-01 에이전트 작업 루프 준비 상태 보강

- Requirements: 전체 변경의 Journey trace와 verification contract
- Risk: LOW — accepted behavior를 바꾸지 않는 문서·검증 하네스 보강
- Depends on: `PLAN-JOURNEY-BACKLOG-01`
- Deliverable: 변경 전 Journey lookup, local/CI 공통 bootstrap과 동일 flaky 판정,
  pnpm·fixture·core test·종료 코드의 executable contract
- Acceptance: 문서는 진입점과 정책만 제공하고 특정 문구가 setup을 결정하지 않으며,
  Playwright version에 맞는 retry/flaky 설정, pnpm runner, 고정 fixture, 네 core test
  file, read-only full gate와 nonzero failure가 contract test와 실제 실행으로 강제된다.
- Automatic verification: focused Python/TypeScript contract tests,
  repeated core E2E, `./scripts/verify quick`, `./scripts/verify full`, `git diff --check`
- Browser verification: 제품 behavior 변경 없음; 기존 네 core Playwright Journey를
  격리 worktree에서 반복 실행해 fixture 독립성, request count와 flaky verdict 확인
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; Worktree/branch:
  `.worktrees/agent-loop-readiness`, `docs/agent-loop-readiness`; 사용자 승인 범위는
  GitHub Actions·새 index·범용 skill·제품 code/UX 없이 기존 control plane과 executable
  contract만 보강하는 것. 설치·선언 Playwright `1.62.1`과
  `--fail-on-flaky-tests` 지원 확인; `pnpm install --frozen-lockfile` PASS;
  baseline `./scripts/verify quick` PASS — setup hook 86, contract 18,
  Vitest 36 files/128 tests; 설계 자체 검토 후 `./scripts/verify setup` PASS —
  hook 86, contract 18; 상세 설계는
  `docs/superpowers/specs/2026-08-29-agentic-development-verification-loop-design.md`
  readiness addendum; 사용자 설계 승인 후 실행 계획은
  `docs/superpowers/plans/2026-08-29-agentic-development-verification-loop.md`
  readiness execution addendum에 추가. 구현 범위
  `52d200f3f9103394cbbdc491c1c13c31185910fc..d1a304cafe89230068f9f8101fa4f900c3195434`;
  Playwright harness 5 tests와 verifier focused 38 tests PASS; core E2E를 fresh
  server로 두 번 실행해 각각 5/5 PASS, retry/flaky 없음; `./scripts/verify quick`
  PASS — hook 86, contract 19, Vitest 36 files/130 tests; `./scripts/verify full`과
  `CI=1 ./scripts/verify full` 모두 build, core 5/5, verifier regression 19/19,
  read-only fingerprint PASS. 첫 full에서 nested subprocess가 port 4173 해제와
  경합한 `TOOLING` failure를 재현했고, E2E gate를 생략하지 않으면서 중복 subprocess
  full test만 mock mode-selection test로 교체해 수정. GitHub Actions·dependency·제품
  code/UX·사람 소유 Journey status 변경 없음.
  Review target: readiness design/plan addenda, 전체 Journey trace와
  `d1a304cafe89230068f9f8101fa4f900c3195434`;
  Reviewer: fresh read-only `/root/plan_completion_review`;
  Checks: scope, Playwright version/flaky semantics, local/CI parity, pnpm·fixture·core
  selection·exit status, nested full control flow, documentation/plan alignment;
  Findings: initial 0 Critical, 1 Important, 0 Minor — sentinel 직접 설정 시 core와
  regression을 함께 우회할 수 있었음; correction review 0 Critical, 0 Important,
  0 Minor;
  Corrections: core E2E를 sentinel과 무관하게 full에서 강제하고 nested subprocess
  full test를 mock default-mode selection test로 교체;
  Rerun: correction reviewer focused 6/6 PASS, local focused 38/38, repeated core
  5/5·5/5, quick, local full, `CI=1` full, `git diff --check` PASS;
  Verdict: PASS — prior Important 해결, merge-ready

## 1. 검증 가능한 개발 기반

### [x] SCF-01 package와 toolchain 기반

- Requirements: `SYS-01`
- Risk: LOW — 이미 채택된 stack 적용
- Depends on: `PLAN-02`
- Deliverable: React 19, TypeScript, Vite, pnpm lockfile, strict TS, Biome,
  Vitest, Playwright dependencies와 scripts
- Acceptance: 기존 `ai:review`가 유지되고 여섯 frontend script가 read-only
  책임에 맞게 존재하며 다른 package manager lockfile이 없다.
- Automatic verification: package script test, install reproducibility,
  `pnpm format:check`, `pnpm lint`, `pnpm typecheck`
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `fac27d1`; `pnpm install --frozen-lockfile` PASS;
  `pnpm format:check`, `pnpm lint`, `pnpm typecheck` PASS; 필수 frontend script와
  `ai:review` 유지 확인; `pnpm-lock.yaml` 외 package manager lockfile 없음

### [x] SCF-02 최소 React 진입점과 style 기반

- Requirements: `SYS-01`, `SYS-02`, `SYS-03`
- Risk: LOW
- Depends on: `SCF-01`
- Deliverable: Vite entry, React root, Tailwind entry, semantic color tokens,
  local Pretendard asset과 global font
- Acceptance: 업무 feature 없이 root가 render되고 UI color literal 없이 token이
  정의되며 font asset 요청과 computed family가 확인된다.
- Automatic verification: component smoke, typecheck, build, token/literal 정적 검사
- Browser verification: `/`, desktop viewport, console/page error 없음, font
  network 200, computed `Pretendard`, screenshot 또는 trace
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `fac27d1`; `pnpm vitest run src/test/scaffold.test.tsx
src/test/theme-contract.test.ts` PASS, 2 tests; `./scripts/verify full` build PASS;
  agent-browser `/` 1280x720 computed font `Pretendard`, font request
  `/fonts/PretendardVariable.woff2`, console/page error 없음; 상세 기록
  `docs/quality/evidence/frontend-scaffolding.md`

### [x] SCF-03 OpenAPI type 생성과 MSW 기반

- Requirements: `SYS-04`
- Risk: LOW — 승인된 대체 방식의 기반만 구성
- Depends on: `SCF-01`
- Deliverable: 재현 가능한 `openapi-typescript` command, generated type,
  MSW worker asset과 browser/node bootstrap 준비
- Acceptance: 입력은 `assignment-original/openapi.yaml` 하나이며 재생성 diff가
  없고 아직 feature handler나 독자 behavior를 추가하지 않는다.
- Automatic verification: OpenAPI 재생성 비교, typecheck, MSW smoke
- Browser verification: worker asset 요청 성공과 예상하지 않은 network error 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `fac27d1`; `pnpm api:types:check` PASS;
  `pnpm vitest run src/test/openapi-contract.test.ts` PASS; `pnpm test:e2e:smoke`
  PASS; agent-browser `/mockServiceWorker.js` 200 `text/javascript`, 예상하지 않은
  console/page error 없음; feature handler와 독자 behavior 없음

### [x] SCF-04 개발 기반 통합 검증

- Requirements: `SYS-01`, `SYS-02`, `SYS-03`, `SYS-04`
- Risk: MEDIUM
- Depends on: `SCF-01`, `SCF-02`, `SCF-03`
- Deliverable: scaffold smoke test와 browser evidence
- Acceptance: `./scripts/verify quick`, scaffold Playwright smoke,
  `./scripts/verify full`이 repository를 수정하지 않고 통과한다. 기반만 완료된
  `SYS-02`, `SYS-04`를 과대 완료 처리하지 않는다.
- Automatic verification: `./scripts/verify quick`, `./scripts/verify full`
- Browser verification: root render, font, console/network, trace 확인
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `fac27d1`; `./scripts/verify full` PASS — setup 79 tests,
  format, lint, typecheck, Vitest 3 tests, build, core E2E selection; repository
  mutation 없음; `pnpm test:e2e:smoke` PASS, 1 Chromium test; agent-browser root,
  Pretendard, font/worker network와 console/page error 재확인; 상세 기록
  `docs/quality/evidence/frontend-scaffolding.md`

### [x] SCF-RUNTIME-01 제출 preview mock 실행

- Requirements: `SYS-04`
- Risk: HIGH — 제출 실행 방식과 API 대체 구현 활성화 범위
- Depends on: `SCF-04`
- Deliverable: production build에서도 시작되는 MSW와 build/preview Playwright harness
- Acceptance: `pnpm build && pnpm preview`에서 worker가 준비되고 보호 API가 mock
  응답을 반환하며 Playwright가 development server를 사용하지 않는다.
- Automatic verification: harness Vitest, `pnpm build`, `./scripts/verify quick`
- Browser verification: production preview `/sign-in`과 보호 route, worker/network,
  console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; 사용자 리뷰 1번 수정 명시 승인;
  `docs/superpowers/specs/2026-09-01-review-findings-corrections-design.md`와 구현 계획;
  RED harness가 dev server command를 재현; GREEN `cb7f34d`에서 production
  build/preview command와 unconditional worker bootstrap, harness Vitest와 build PASS;
  production preview agent-browser에서 worker controller
  `/mockServiceWorker.js`, 보호 API 200, page error 없음; `./scripts/verify full` PASS

### [x] E2E-SMOKE-01 전체 smoke 현재 계약 정합화

- Requirements: 전체 route와 `SYS-03`, `SYS-04`
- Risk: LOW — stale 검증 기대값 교정
- Depends on: `SCF-RUNTIME-01`
- Deliverable: 현재 인증 경계·heading·예상 console을 검증하는 전체 smoke
- Acceptance: 모든 tracked Playwright test가 production preview에서 통과하고 stale
  anonymous protected-route 또는 이전 heading 기대값이 없다.
- Automatic verification: `pnpm exec playwright test`, `./scripts/verify quick`
- Browser verification: `/sign-in`, `/`, `/task`, `/task/task-1`, `/user`
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; 사용자 리뷰 2번 수정 명시 승인; RED 전체
  Playwright에서 anonymous protected route와 stale detail heading, expected 401 console로
  2건 FAIL; authenticated scaffold와 sign-in/protected route 분리, exact current heading으로
  교정; production preview 전체 Playwright 7/7 PASS, core 5/5 PASS

### [x] TASK-PAGE-EMPTY-01 빈 중간 page pagination 복구

- Requirements: `TASK-LIST-04`
- Risk: MEDIUM — infinite pagination 종료 판정
- Depends on: `TASK-PAGE-03`
- Deliverable: empty `data`와 true `hasNext` 조합의 next-page 진행
- Acceptance: 빈 중간 page 뒤 다음 data가 렌더되고 false terminal page에서만 멈춘다.
- Automatic verification: task-list focused Vitest, `./scripts/verify quick`
- Browser verification: 적용 가능한 mock fixture가 있으면 `/task` request sequence 확인
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; 사용자 리뷰 4번 수정 명시 승인; RED 빈 page
  `{ data: [], hasNext: true }` 뒤 page 2 미요청 FAIL; empty page를 list end로 판정하고
  terminal empty만 empty UI로 표시; task-list focused 5/5, quick와 task-discovery
  production Chromium PASS

### [x] API-CANCEL-01 query AbortSignal 전파

- Requirements: `DASH-01`, `USER-01`, `TASK-LIST-01`, `TASK-DETAIL-01`
- Risk: LOW — read request 취소 전파
- Depends on: `ARCH-03`
- Deliverable: 네 TanStack Query read 경로의 `AbortSignal` 전달
- Acceptance: query가 취소되면 dashboard, user, task list, task detail API request가
  같은 signal을 받아 중단 가능하다.
- Automatic verification: API/widget/page focused Vitest, `./scripts/verify quick`
- Browser verification: 일반 route 회귀 확인
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; 사용자 리뷰 5번 수정 명시 승인; RED dashboard,
  user, task list, task detail 네 request의 signal `undefined` FAIL; 각 query context signal을
  기존 API adapter와 client request에 전달; 관련 focused 7 files/22 tests, quick와
  production route Chromium PASS

### [x] MOCK-PAGE-VALIDATION-01 task page query 검증

- Requirements: `SYS-04`, `TASK-LIST-01`
- Risk: HIGH — OpenAPI에 명시되지 않은 invalid query mock 응답 확정
- Depends on: `SCF-03`, `TASK-PAGE-01`
- Deliverable: `page` trust-boundary validation과 400 `ErrorResponse`
- Acceptance: 누락, 0, 음수, 소수, 비숫자 page는 400 errorMessage이고 1 이상의
  정수만 기존 page 응답을 받는다.
- Automatic verification: handler focused Vitest, `./scripts/verify quick`
- Browser verification: 적용 없음 — invalid parameter contract integration test가 직접 검증
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; 사용자 리뷰 6번 및 400 `ErrorResponse` 설계 명시
  승인; RED 누락·0·음수·1.5·비숫자 모두 200 FAIL; handler trust boundary에서
  OpenAPI `required`, `integer`, `minimum: 1` 검증; handler focused 12/12, quick PASS;
  `assignment-original/` diff 없음

### [x] REVIEW-CORRECTIONS-01 리뷰 교정 계획 완료 적대적 review

- Requirements: 위 다섯 task의 requirements
- Risk: MEDIUM — 교정 누락과 회귀 검출
- Depends on: `SCF-RUNTIME-01`, `E2E-SMOKE-01`, `TASK-PAGE-EMPTY-01`,
  `API-CANCEL-01`, `MOCK-PAGE-VALIDATION-01`
- Deliverable: exact target diff의 요구사항·test·browser·범위 review record
- Acceptance: finding마다 분류·root cause·correction·rerun이 있고 unresolved
  HIGH/MEDIUM finding이 없다.
- Automatic verification: 영향 focused test, `./scripts/verify quick`,
  `./scripts/verify full`, `git diff --check`
- Browser verification: production preview route/network/console 재검증
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root`; Review target: implementation commit `cb7f34d`;
  Reviewer: 구현 완료·commit 후 새 read-only second-pass의 `/root`; Checks: 사용자
  1·2·4·5·6 coverage, 네 query sibling/caller, OpenAPI page constraint와 원본 diff,
  production worker/route/network, empty-page termination, invalid query matrix, weak test,
  unrelated diff; Findings: unresolved HIGH 0, MEDIUM 0, MINOR 0; Corrections: 없음;
  Rerun: `git diff --check`, `./scripts/verify quick` PASS(38 files/141 tests), production
  전체 Playwright 7/7, `./scripts/verify full` PASS(core 5/5, verifier regression 19),
  agent-browser mobile task와 desktop user/worker/network/page-error PASS;
  Verdict: PASS

### [x] SCF-05 KB올라케어 semantic color theme

- Requirements: `SYS-02`
- Risk: LOW — 기존 CSS Custom Properties와 Tailwind token 체계 확장
- Depends on: `SCF-02`
- Deliverable: KB올라케어 시각 근거를 반영한 light/dark shadcn semantic token,
  전체 Tailwind 연결과 color literal 계약
- Acceptance: KB Yellow와 warm neutral 중심의 모든 token이 light/dark에서
  정의되고 UI 색상은 semantic token만 소비하며 Pretendard와 기존 전역 기반은
  유지된다.
- Automatic verification: theme contract test, color literal 정적 검사,
  `./scripts/verify quick`, `pnpm build`
- Browser verification: `/`, light/dark computed background·foreground,
  console/page error 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`
  - Requirement/Journey: `SYS-02` / `SCF-05`
  - Commit: `7b08a42`
  - RED: `pnpm vitest run src/test/theme-contract.test.ts` — `.dark` block
    미정의로 1 failed, literal·Pretendard 2 passed
  - Automatic: focused Vitest 1 file/3 tests PASS; global token source 밖 color
    literal scan no matches; `./scripts/verify quick` PASS — setup 79 tests,
    format, lint, typecheck, Vitest 7 files/20 tests; `pnpm build` PASS
  - Agent-browser session: `scf-05`, 종료 확인
  - Route/Viewport: `/`, 1280×720
  - Precondition/Actions: Vite DEV에서 light 계산값 확인 후 `html.dark` 적용
  - Expected: light KB Yellow Positive와 dark KB Yellow Negative primary,
    background·foreground 전환
  - Actual: light `background oklch(0.991 0.014 92.978)`, `foreground
oklch(0.232 0.006 78.196)`, `primary oklch(0.835 0.172 82.565)`;
    dark `background oklch(0.219 0.007 78.185)`, `foreground
oklch(0.979 0.008 91.482)`, `primary oklch(0.865 0.177 90.382)`
  - Console/Network: console error와 page error 없음; color 검증에 API 요청
    적용 없음
  - Screenshot/Trace: `/tmp/kbhc-scf-05-light.png`,
    `/tmp/kbhc-scf-05-dark.png`
  - Failure class: TEST — Biome이 test regex 선언 formatting 차이를 탐지
  - Correction/Rerun: 요구 format으로 한 줄 교정 후 같은 quick gate PASS

### [x] UI-DESIGN-01 화면 구성과 Journey UX 설계

- Requirements: `NAV-01`~`NAV-03`, `DASH-01`, `AUTH-01`~`AUTH-06`,
  `TASK-LIST-01`~`TASK-LIST-05`, `TASK-DETAIL-01`~`TASK-DETAIL-05`, `USER-01`,
  `SYS-02`, `SYS-03`
- Risk: MEDIUM — 여러 route의 시각 위계와 responsive interaction pattern 확정
- Depends on: `SCF-05`, `AUTH-NAV-01`, `DASH-01`, `USER-01`, `TASK-PAGE-03`,
  `TASK-DELETE-02`
- Deliverable: 필요한 화면·상태, Focus workspace layout, 오케어 Yellow palette,
  shadcn/ui component mapping, desktop/mobile navigation과 Journey별 UX를 확정한
  화면 디자인 설계 문서
- Acceptance: 원본·OpenAPI·Golden Journey의 accepted behavior를 바꾸지 않고 다섯
  route와 공통 상태가 trace되며, desktop sidebar와 icon·label 기반 mobile bottom
  navigation, loading·empty·error·404·modal, 접근성·responsive·검증 기준이 한 가지
  동작으로 정해지고 사용자가 설계를 승인한다.
- Automatic verification: 설계 문서 placeholder·모순·범위·requirement trace 자체
  검토, `./scripts/verify setup`, `git diff --check`
- Browser verification: 구현 전 제품 QA는 적용 없음 — visual companion 시안의
  desktop/mobile layout과 상태 화면을 사용자와 검토
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; design commit `6aadef9`;
  `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`가 required 문서,
  OpenAPI, 다섯 route와 네 Golden Journey를 trace하고 Focus workspace, 오케어 Yellow
  palette, desktop sidebar, distinct icon·visible label 기반 mobile bottom navigation,
  공통 상태와 shadcn/ui mapping을 확정함; 사용자가 2026-09-01 대화에서 작성된 설계
  문서를 명시적으로 승인함; 구현 계획
  `docs/superpowers/plans/2026-09-01-frontend-screen-design.md` 작성; plan/spec
  placeholder scan no matches, requirement trace 자체 검토 PASS, `git diff --check`
  PASS, `./scripts/verify setup` PASS. 이 승인은 dependency 변경이나 Golden Journey의
  `HUMAN_APPROVED`를 뜻하지 않음

### [x] DEC-UI-01 shadcn/ui runtime dependency 결정

- Requirements: `SYS-02`, `NAV-01`~`NAV-03`, `AUTH-01`~`AUTH-06`,
  `TASK-DETAIL-03`~`TASK-DETAIL-05`
- Risk: HIGH — 공식 registry component 추가에 따른 runtime dependency 변경
- Depends on: `UI-DESIGN-01`
- Deliverable: shadcn official registry dry-run의 component/file/package diff와 package별
  필요성을 제시하고 사람이 허용한 dependency 집합을 확정
- Acceptance: `button`, `input`, `label`, `card`, `alert`, `dialog`, `alert-dialog`,
  `skeleton`, `progress`에 필요한 package만 열거되고 기존 dependency로 충분한 항목과
  새 runtime dependency가 구분되며, mutation 전에 사람이 정확한 diff를 명시적으로
  결정한다.
- Automatic verification: `pnpm dlx shadcn@latest view ...`, `shadcn add --dry-run`,
  `git diff --check`
- Browser verification: dependency 결정에는 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; 사용자가 inline execution,
  `.worktrees/ui-focus` 격리 worktree와 `radix-ui`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `tw-animate-css` runtime dependency를 명시적으로 승인함; official
  registry `view`에서 9개 component source와 `radix-ui`,
  `class-variance-authority` import를 확인함; `shadcn add --dry-run`은 정확히 9개
  `src/shared/ui` file과 자동 dependency `radix-ui`만 보고했으며, `shadcn init` 없이
  기존 theme을 보존하므로 registry-local `cn`의 `clsx`·`tailwind-merge`와 dialog
  animation의 `tw-animate-css`를 승인된 수동 추가 대상으로 확정함; 승인 목록 밖
  package 없음; baseline `./scripts/verify quick` PASS — format, lint, typecheck,
  Vitest 34 files/122 tests; 이 결정은 Golden Journey `HUMAN_APPROVED`가 아님

### [x] UI-IMPLEMENT-01 Focus workspace 반응형 화면 구현

- Requirements: `NAV-01`~`NAV-03`, `DASH-01`, `AUTH-01`~`AUTH-06`,
  `TASK-LIST-01`~`TASK-LIST-05`, `TASK-DETAIL-01`~`TASK-DETAIL-05`, `USER-01`,
  `SYS-02`, `SYS-03`
- Risk: MEDIUM — 다섯 route와 네 Golden Journey의 공통 시각·responsive pattern 구현
- Depends on: `UI-DESIGN-01`, `DEC-UI-01`
- Deliverable: approved Focus workspace, Ocare Yellow semantic palette, shadcn/ui 상태
  component, desktop sidebar와 distinct icon·visible label mobile bottom navigation
- Acceptance: `docs/superpowers/specs/2026-09-01-frontend-screen-design.md`의 화면·상태와
  `docs/superpowers/plans/2026-09-01-frontend-screen-design.md`의 단위를 구현하고 기존
  auth/API/delete/cache behavior를 보존하며 desktop 1280×800, mobile 390×844에서 네
  Journey의 접근성·responsive·상태 전환 evidence가 통과한다.
- Automatic verification: focused unit/component/integration tests,
  `./scripts/verify quick`, plan-completion adversarial review, `./scripts/verify full`
- Browser verification: agent-browser desktop/mobile evidence와 기존 네 `@core` Journey
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; branch `feat/ui-focus`, target
  `3011147e340c05efcbc2940ea2905dd0e2028125`; approved 9개 shadcn/ui primitive와
  Ocare Yellow semantic palette, single-summary dashboard, 224px desktop sidebar,
  icon·label mobile navigation, responsive virtual task list, sign-in/profile/detail/delete
  상태 구현. `./scripts/verify full` PASS — hook 86, contract 18, 35 Vitest files/126
  tests, build, Chromium core 5/5, verifier regression 19. Agent-browser 1280×800와
  390×844에서 content 960px, 48px mobile target, dark-gold active indicator,
  reduced-motion, dialog clipping/exact-ID/focus 복원을 확인하고 session 종료.
  Review target: `3011147e340c05efcbc2940ea2905dd0e2028125`; Reviewer: 구현과 분리된 read-only
  `/root/ui_plan_review`; Checks: 승인 spec/plan, dependency/API/auth/cache/delete 범위,
  다섯 route, 네 Journey, desktop/mobile와 E2E bounded virtualization; Findings: 최종
  target Critical/Important/Minor 없음; Corrections: 초기 dashboard/list/shell drift와
  loading/error/shadow LOW findings 교정; Rerun: focused tests, quick, core 5/5, full,
  `git diff --check` PASS; Verdict: PASS — unresolved HIGH/MEDIUM 없음. 상세 재현 기록은
  `docs/quality/evidence/ui-focus.md`; Golden Journey `HUMAN_APPROVED`와 최종 사람
  acceptance는 별도임

## 2. 애플리케이션 구조·공통 경계

### [x] ARCH-01 FSD directory와 public boundary

- Requirements: 전체 기능 requirement의 구조 기반
- Risk: LOW — `DEC-ARCH-01` 승인안 실행
- Depends on: `DEC-ARCH-01`, `SCF-04`
- Deliverable: 승인된 app/pages/widgets/features/entities/shared/mocks 경계 중
  실제 소비자가 있는 directory와 public API, Biome import restriction
- Acceptance: placeholder 업무 UI, auth provider placeholder, 빈 layer, 소비자 없는
  빈 `index.ts` 없이 layer import 방향이 정적 검사된다. generated contract는
  `shared/api`만 직접 import하고 public API로 노출하지 않는다.
- Automatic verification: architecture lint/type test,
  Biome `noRestrictedImports` 허용·차단 fixture, `./scripts/verify quick`
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`; `pnpm vitest run
src/test/architecture-contract.test.ts` RED — `test/openapi-contract.test.ts`의
  generated 직접 import 1건 탐지; 계약 test를 `shared/api`로 이동 후 focused
  Vitest 2 files/3 tests GREEN; Biome fixture는 public API import 허용·deep import
  차단 확인; `./scripts/verify quick` PASS — setup 79 tests, format, lint, typecheck,
  Vitest 4 files/5 tests; browser 적용 없음; 2026-08-30 mock handler 첫 소비에서
  기존 contract가 `mocks` 내부 import까지 차단하는 INTEGRATION failure를 재현,
  production→mocks 금지는 유지하고 mocks 내부 composition만 허용한 뒤 focused
  architecture 2 tests와 `./scripts/verify quick` 재통과

### [x] ARCH-02 app provider와 router composition

- Requirements: `NAV-01`, route 기반 전체 requirement
- Risk: MEDIUM
- Depends on: `ARCH-01`
- Deliverable: router, query client, 공통 error boundary, 개발 MSW bootstrap의
  composition; auth provider는 `DEC-AUTH-01` 승인 후 생성
- Acceptance: 다섯 route가 고유 page boundary로 resolve되고 provider 초기화
  실패가 숨겨지지 않으며 test에서 독립 render 가능하다.
- Automatic verification: provider/router integration tests,
  `./scripts/verify quick`
- Browser verification: 다섯 route 직접 진입, page/console error 기록
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`
  - Requirement/Journey: `NAV-01` / architecture route composition
  - Commit: `f482330`
  - Agent-browser session: `arch-02-evidence`, 종료 확인
  - Route/Viewport: `/` → `/task` link action, `/task/task-1` 직접 진입;
    1280×720
  - Precondition: Vite DEV, 인증 provider와 API handler 없음
  - Actions: 다섯 route Playwright 순회, navigation click, 상세 route 직접 진입,
    service worker registration/fetch, console/errors, screenshot 확인
  - Expected: 고유 heading과 공통 navigation, active DEV worker, 오류 없음
  - Actual: unit RED는 미구현 module, E2E RED는 heading 부재; 구현 후 Vitest
    2 files/7 tests와 Playwright 1 Chromium test PASS
  - Console/Network: console error와 page error 없음; active
    `/mockServiceWorker.js`, fetch 200 `text/javascript`
  - Screenshot/Trace: `/tmp/kbhc-arch-02-evidence.png`; Playwright 결과 attachment
  - Failure class: TEST — render cleanup 누락; IMPLEMENTATION — app 단일 layer를
    slice로 오인한 architecture contract
  - Correction: test별 cleanup, app 내부 상대 import 예외를 계약에 반영
  - Rerun verdict: `./scripts/verify quick` PASS — setup 79 tests, format, lint,
    typecheck, Vitest 6 files/12 tests

### [x] ARCH-03 typed API client와 test 경계

- Requirements: 모든 API requirement
- Risk: MEDIUM
- Depends on: `ARCH-01`, `SCF-03`
- Deliverable: generated contract를 소비하는 fetch client, error normalization,
  MSW test harness; loading/empty/error UI는 첫 실제 화면 소비 작업에서 생성
- Acceptance: JSON success와 `ErrorResponse`가 구분되고 non-JSON/network/abort가
  deterministic error로 변환되며 page가 raw fetch를 직접 호출하지 않는다.
  미사용 공통 상태 component나 public API를 미리 만들지 않는다.
- Automatic verification: client unit/integration tests, MSW handler contract tests,
  `./scripts/verify quick`
- Browser verification: 독립 UI 없음; 첫 실제 화면 소비 작업에서
  loading/error/success의 accessible output 검증
- Status: AI_VERIFIED
- Evidence: 2026-08-30 Codex `/root`; request test RED — `./request` 미구현;
  구현 후 success/http/invalid JSON/schema/network/abort 6 tests GREEN; focused
  Vitest 3 files/9 tests와 `./scripts/verify quick` PASS — setup 79 tests,
  format, lint, typecheck, Vitest 7 files/18 tests; raw fetch는 `request.ts`만,
  generated import는 `shared/api`만 확인; public barrel, endpoint adapter, handler,
  상태 UI, auth/delete behavior 없음; abort는 transport control flow만 존재;
  browser는 독립 UI가 없어 첫 화면 소비 작업으로 이관. Node 25에서 MSW
  cookie store의 `--localstorage-file` 환경 경고 1건을 추적했고 API test에만
  lifecycle을 한정함; `./scripts/verify full` PASS — setup 79 tests, format,
  lint, typecheck, Vitest 7 files/18 tests, production build, core E2E selection;
  architecture 적대적 재검토에서 reverse/deep import, generated leakage, static
  mocks, auth placeholder, route error 과대책임, aborted UI, 빈 layer/public API,
  dashboard entity 위반 0건

### [x] UI-FOUNDATION-01 공통 interactive UI와 surface

- Requirements: `SYS-02`, `SYS-03`, 공통 접근성 invariant
- Risk: LOW — 기존 token과 채택 stack 안의 UI 표현
- Depends on: `SCF-05`, `ARCH-02`
- Deliverable: button, input, card/surface, focus, disabled/error 표현의 공통 기반
- Acceptance: representative control이 semantic token만 사용하고 keyboard focus,
  disabled와 error를 color 외 text/semantics로 구분한다. 기존 저장소와 공식 shadcn
  registry를 먼저 조사하며 새 runtime dependency는 추가하지 않는다.
- Automatic verification: `pnpm vitest run src/shared/ui/ui-foundation.test.tsx
src/test/theme-contract.test.ts`, `./scripts/verify quick`
- Browser verification: `/sign-in`, 390x844/1280x720, keyboard focus와 disabled/error,
  예상 밖 console/page/network error 없음
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; branch
  `feat/ui-foundation-contract`, target
  `78e46cc73d41cb9f5e681bc46975c4daee2ac2e5`; 승인된 design
  `docs/superpowers/specs/2026-09-01-ui-foundation-contract-design.md`와 plan
  `docs/superpowers/plans/2026-09-01-ui-foundation-contract.md`에 따라 기존 Button,
  Input·Label, Card surface의 label/error/disabled/focus/semantic token 계약만
  characterization함. Baseline 2 files/4 tests, focused 2 files/5 tests,
  `./scripts/verify quick` setup hook 86·verifier 18·Vitest 36 files/128 tests PASS;
  production primitive, dependency, public API와 `assignment-original/` 변경 없음.
  Agent-browser `ui-foundation-desktop` `/sign-in` 1280×720과
  `ui-foundation-mobile` 390×844에서 active password focus ring, email
  `aria-invalid`·연결된 visible error, disabled submit, mobile width 390=390을
  확인하고 screenshots `/tmp/kbhc-ui-foundation-desktop.png`,
  `/tmp/kbhc-ui-foundation-mobile.png` 저장 후 두 session 종료; MSW의 승인된
  anonymous bootstrap `POST /api/refresh` 401과 대응 resource line 외 예상 밖
  console/page/network 오류 없음; 상세 기록 `docs/quality/evidence/ui-foundation.md`.
  Failure/Correction: 초기 `TEST` DOM cleanup 누락은 `afterEach(cleanup)`, 초기
  `TOOLING` format 차이는 test 한 파일 format으로 교정 후 같은 focused/quick
  gate PASS; review의 Minor `TEST` Card border coverage는 `78e46cc`에서 semantic
  `border` assertion으로 교정. Review target: 위 plan, `UI-FOUNDATION-01`,
  `SYS-02`, `SYS-03`, base `b5ae18d`, target `78e46cc`; Reviewer: 구현 작성자와
  분리된 fresh read-only `/root/ui_foundation_review`; Checks: spec/plan coverage,
  label/error/disabled/focus/token contract, test isolation, desktop/mobile evidence,
  console/network 분류, dependency/public API/production/Journey/shell/wrapper/
  async-state/`assignment-original` 비확장, TODO dependency와 상태; Findings: 최종
  target Critical/Important/Minor 없음, 이전 Minor `TEST` 해결; Corrections:
  `78e46cc` Card surface border 계약 추가; Rerun: reviewer focused 2 files/5 tests,
  task owner quick 36 files/128 tests, `git diff --check` PASS,
  `assignment-original/` diff 없음; Verdict: PASS. Journey `HUMAN_APPROVED`나 최종
  사람 acceptance를 뜻하지 않음

### [x] UI-SHELL-01 반응형 application shell

- Requirements: `NAV-01`, `NAV-02`, `NAV-03`, `SYS-03`
- Risk: LOW — 기존 router/auth action의 presentation
- Depends on: `UI-FOUNDATION-01`, `AUTH-NAV-01`
- Deliverable: responsive navigation과 page content shell
- Acceptance: 다섯 route에서 dashboard/task와 인증 action이 유지되고 current route,
  hover/focus가 구분되며 390x844/1280x720에서 clipping이 없다.
- Automatic verification: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx
src/app/router.test.tsx`, `./scripts/verify quick`
- Browser verification: `/`, `/sign-in`, `/task`, `/task/task-1`, `/user`, 두 viewport,
  keyboard navigation, computed Pretendard, console/page error와 예상 밖 network 없음
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; branch `feat/ui-shell-state`,
  final correction code target `970d7df`, full-verification target `29c927f`; 기존 shell
  production을 재사용하고 Tab order,
  auth action 상호 배타,
  current route와 named link별 distinct Lucide icon을 characterization함. Integrated focused
  5 files/15 tests, final shell/router 2 files/8 tests와 quick 38 files/132 tests PASS;
  agent-browser `ui-shell-desktop` 1280x720와 `ui-shell-mobile` 390x844에서 다섯 route,
  224px sidebar, 48px mobile target, no overflow, Pretendard, hover, 2px focus ring,
  current/auth action과 distinct icon 확인, errors `[]`, session 종료; 상세 기록
  `docs/quality/evidence/ui-shell-state.md`. Review target: `52d200f..e52890f`;
  Reviewer: 구현·이전 task review와 분리된 fresh read-only `/root/final_ui_review`;
  Checks: plan acceptance, navigation/auth/current-route, responsive/keyboard/icon,
  test·browser·console/network·scope·TODO consistency; Findings: final Critical/Important/Minor
  없음; Corrections: reviewer의 초기 redundant focus style, icon mapping coverage findings를
  production 확장 없이 교정; Rerun: shell/router 2 files/8 tests와 quick 38 files/132 tests
  및 final full build/core 5/5/verifier regression PASS; Verdict: PASS. Golden Journey
  `HUMAN_APPROVED`나 최종 acceptance가 아님. Final design correction RED는 Lucide
  24px를 재현했고 `size={20}` GREEN 후 shell/router 2 files/8 tests, quick 38 files/132
  tests PASS; agent-browser 390x844에서 anonymous/authenticated 네 icon 20x20, target 48px,
  width 390, errors `[]` 확인. Review target: `5cd937f..53d1a16`; Reviewer: correction을
  작성하지 않은 read-only second-pass `/root/final_adversarial_review_2`; Checks: 20px
  named icon mapping, RED/GREEN, mobile computed size/target/overflow/errors, 48px oracle와
  target provenance; Findings: Critical/Important/Minor 없음; Corrections: 추가 없음;
  Rerun: reviewer가 owner focused/quick와 browser evidence 검사; Verdict: PASS

### [x] UI-STATE-01 공통 비동기 상태 표현

- Requirements: loading, empty, recoverable error, success 공통 invariant
- Risk: LOW
- Depends on: `UI-FOUNDATION-01`
- Deliverable: 실제 반복되는 loading, empty, error/retry 상태 UI
- Acceptance: loading live status, error alert/retry, empty message가 layout을 유지한다.
  확정된 downstream 소비처 `/`, `/user`가 같은 semantic contract를 사용하며 generic
  framework는 만들지 않는다.
- Automatic verification: `pnpm vitest run src/shared/ui/async-state.test.tsx`,
  `./scripts/verify quick`
- Browser verification: 적용 없음 — shared semantic contract는 component test로
  검증하고 실제 `/`, `/user` browser 상태는 `DASHBOARD-VIEW-01`, `PROFILE-VIEW-01`이 소유
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; branch `feat/ui-shell-state`,
  target `e52890f`; missing `async-state` import RED 후 dashboard/profile 두 실제 소비자가
  공유하는 `AsyncLoading` live status와 `AsyncError` alert/retry만 구현하고, unused
  `AsyncEmpty`는 review에서 제거하며 dashboard zero-task Card를 domain-local empty
  상태로 characterization함. Integrated focused 5 files/15 tests, final quick 38 files/132
  tests PASS; 상세 기록 `docs/quality/evidence/ui-shell-state.md`. Review target:
  `52d200f..e52890f`; Reviewer: 구현·이전 task review와 분리된 fresh read-only
  `/root/final_ui_review`; Checks: plan acceptance, shared consumer/YAGNI, state semantics,
  tests·scope·dependency·API/auth/cache·evidence·TODO consistency; Findings: final
  Critical/Important/Minor 없음; Corrections: reviewer의 unused empty abstraction finding과
  보고 wording 교정; Rerun: focused shell/router 2 files/8 tests, quick 38 files/132 tests와
  final full build/core 5/5/verifier regression PASS; Verdict: PASS. Golden Journey
  `HUMAN_APPROVED`나 최종 acceptance가 아님

## 3. auth-entry Journey

### [x] AUTH-UNIT-01 sign-in schema

- Requirements: `AUTH-02`, `AUTH-03`
- Risk: LOW
- Depends on: `ARCH-01`
- Deliverable: email required/syntax와 password ASCII alphanumeric 8~24 규칙의
  reusable Zod schema
- Acceptance: 빈 값, invalid email, 7/25자, 한글·기호 password가 실패하고 8/24자
  ASCII alphanumeric가 통과한다.
- Automatic verification: schema boundary table unit tests,
  `./scripts/verify quick`
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: 2026-08-30 `pnpm vitest run
src/features/sign-in/model/sign-in-schema.test.ts` RED — schema module 없음;
  valid와 required/email/길이/기호 경계 6 tests GREEN; `./scripts/verify quick`
  PASS — Vitest 10 files/30 tests; browser 적용 없음

### [x] AUTH-UI-01 sign-in form 접근성·submit 상태

- Requirements: `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04`
- Risk: LOW
- Depends on: `AUTH-UNIT-01`, `ARCH-02`
- Deliverable: visible labels, inline errors, 조건부 enabled submit을 가진 form
- Acceptance: keyboard 입력과 submit, label association, error description,
  invalid submit 차단, valid enable이 component test로 증명된다.
- Automatic verification: Testing Library/user-event component tests,
  `./scripts/verify quick`
- Browser verification: `/sign-in` mobile/desktop, keyboard tab order와 visible 오류
- Status: AI_VERIFIED
- Evidence: 2026-08-30 sign-in form test RED — component module 없음; label,
  accessible description, disabled/enabled, pending duplicate guard 3 tests GREEN;
  Chromium 390x844에서 dashboard/task/sign-in/email/password/submit keyboard 순서,
  valid enable, horizontal overflow 없음 확인; `docs/quality/evidence/auth-entry.md`

### [x] AUTH-API-01 sign-in 요청과 오류 modal

- Requirements: `AUTH-05`, `AUTH-06`
- Risk: MEDIUM
- Depends on: `AUTH-UI-01`, `ARCH-03`
- Deliverable: typed POST request, submitting guard, 모든 non-200의 API
  `errorMessage` modal
- Acceptance: body가 exact email/password JSON이고 중복 submit이 없으며 400과
  대표 non-200 errorMessage가 accessible modal에 표시·해제된다.
- Automatic verification: MSW integration tests, modal component tests,
  `./scripts/verify quick`
- Browser verification: error fixture, focus trap/restore, console/network 기록
- Status: AI_VERIFIED
- Evidence: 2026-08-30 auth API test RED — endpoint/handler module 없음; exact
  credentials, MSW refresh cookie rotation, missing-cookie 401 3 tests와 server
  error modal/focus restore component test GREEN; native `dialog`를 사용해 새 runtime
  dependency 없이 browser modal 초기 focus와 submit focus 복귀 확인;
  `docs/quality/evidence/auth-entry.md`; `./scripts/verify quick` PASS

### [x] AUTH-STATE-01 승인된 token·refresh 상태

- Requirements: `AUTH-07`
- Risk: HIGH 실행 — 승인안 준수 검토 필요
- Depends on: `DEC-AUTH-01`, `AUTH-API-01`, `ARCH-03`
- Deliverable: auth adapter, bearer injection, expiry 판정, single-flight refresh,
  bounded replay, terminal failure 처리
- Acceptance: 보호 요청 header가 `Authorization: Bearer <accessToken>`이고 승인된
  refresh/expiry/실패 path가 concurrent request에서도 정확히 한 번 실행된다.
- Automatic verification: token helper unit tests, protected request와 refresh
  integration tests, `./scripts/verify quick`
- Browser verification: integration에서 증명 못한 cookie/network boundary만 대상
- Status: AI_VERIFIED
- Evidence: `DEC-AUTH-01` 사용자 대화 승인 범위대로 memory access token,
  mock refresh cookie, generation, single-flight, late 401 latest-token replay,
  replay terminal cleanup, stale-session no-op를 구현; focused Vitest 10 files/50 tests,
  quick gate, reload cookie 경계 E2E PASS; `docs/quality/evidence/auth-entry.md`;
  tracked decision의 `HUMAN_APPROVED` 표시는 사람 직접 확인 대기

### [x] AUTH-NAV-01 비로그인/로그인 navigation 전환

- Requirements: `NAV-02`, `NAV-03`, `AUTH-07`
- Risk: MEDIUM
- Depends on: `AUTH-STATE-01`, `ARCH-02`
- Deliverable: sign-in/profile 상호 배타 action과 승인된 보호 route 처리
- Acceptance: signed-out에는 sign-in만, signed-in에는 profile만 보이고 각각
  `/sign-in`, `/user`로 이동한다. dashboard/task action은 유지된다.
- Automatic verification: router/auth integration tests,
  `./scripts/verify quick`
- Browser verification: auth transition 전후 route/action/icon 확인
- Status: AI_VERIFIED
- Evidence: router/auth integration에서 보호 route 차단, initializing/unavailable,
  내부 return allowlist와 action 상호 배타를 검증; Chromium에서 `/task/task-1` →
  `/sign-in` → 안전 복귀 → reload → `/user` 이동 PASS;
  `docs/quality/evidence/auth-entry.md`

### [x] AUTH-VIEW-01 로그인 page와 form 화면

- Requirements: `AUTH-01`~`AUTH-05`
- Risk: LOW — 검증된 form behavior의 presentation
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `AUTH-UI-01`
- Deliverable: 읽기 가능한 hierarchy와 상태 표현을 가진 로그인 page/form
- Acceptance: label/input/inline error가 연결되고 empty, invalid email, 7·25자와
  non-ASCII password, valid, pending 상태가 text와 style로 구분되며 submit 규칙은
  유지된다.
- Automatic verification: `pnpm vitest run
src/features/sign-in/ui/sign-in-form.test.tsx`, `./scripts/verify quick`
- Browser verification: `/sign-in`, 390x844/1280x720, keyboard tab order,
  invalid/valid/pending, clipping, console/network
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; branch
  `feat/auth-view-01`; start `f5ba414`, test target `19285d6`; design
  `docs/superpowers/specs/2026-09-01-auth-entry-scenario-loop-design.md`, plan
  `docs/superpowers/plans/2026-09-01-auth-view-scenario-loop.md`. 기존 화면에서
  label/description/disabled·valid·pending 동작이 재현되어 production RED나 변경 없이
  empty, 7자, 25자, non-ASCII와 `로그인 중`, exact sign-in request 1회 component
  characterization을 추가함;
  focused Vitest 1 file/7 tests PASS, `./scripts/verify quick` setup hook 86,
  verifier 19, Vitest 38 files/145 tests PASS. Agent-browser
  `auth-view-01-mobile`, `auth-view-01-mobile-form`, `auth-view-01-desktop`에서
  `/sign-in` 390x844/1280x720을 확인함: keyboard 순서 dashboard→task→sign-in→email→
  password, disabled submit skip, invalid email·7자 password 연결 오류와 disabled,
  valid enable·submit, mobile form 308px/scrollWidth 390px, desktop form 398px·section
  448px/scrollWidth 1280px. Fresh anonymous bootstrap `POST /api/refresh` 401은 예상
  console error이고 page error 없음. Fresh `auth-view-01-network` session에서 page
  `fetch`를 sessionStorage에 계측해 `POST /api/sign-in` 한 건과 후속 dashboard GET
  두 건을 분리 확인했고, MSW console의 exact body/status와 일치함. Screenshots:
  `/tmp/kbhc-auth-view-01-mobile.png`, `/tmp/kbhc-auth-view-01-desktop.png`; trace:
  `/tmp/kbhc-auth-view-01-network-trace.zip`;
  Failure/Correction: `TOOLING` unsupported `is focused`를 activeElement eval로 교체,
  Biome 한 줄 format을 `pnpm run format` 후 quick 재실행, 성공 후 dashboard screenshot을
  fresh invalid-form capture로 교체. Initial fresh review `BLOCKED`: MEDIUM `TEST`
  request count 누락과 MEDIUM `TOOLING` network artifact 누락; request counter assertion과
  named-session fetch 계측/trace로 교정하고 focused/quick/browser rerun PASS.
  Review target: `docs/superpowers/plans/2026-09-01-auth-view-scenario-loop.md`,
  `AUTH-01`~`AUTH-05` / `AUTH-VIEW-01`, correction target `42950c3` against
  `f5ba414`; Reviewer: target을 작성·수정하지 않은 fresh `/root/auth_view_review`;
  Checks: 전체 two-file diff와 correction commit, requirement/spec/plan, request counter,
  TODO dependency/status, unrelated diff, 두 screenshot과 trace 내부 network/resource,
  focused/quick/diff; Findings: none — 이전 MEDIUM `TEST`와 `TOOLING` 모두 해결,
  unresolved HIGH/MEDIUM/LOW 없음; Corrections: `19285d6` request counter/assertion,
  fresh `auth-view-01-network` trace와 `42950c3` evidence; Rerun: focused Vitest
  1 file/7 tests, `./scripts/verify quick` hook 86·verifier 19·Vitest 38 files/145 tests,
  `git diff --check` PASS; Verdict: PASS

### [x] AUTH-ERROR-VIEW-01 로그인 오류 modal 화면

- Requirements: `AUTH-06`
- Risk: MEDIUM — modal interaction과 focus lifecycle
- Depends on: `AUTH-VIEW-01`, `AUTH-API-01`
- Deliverable: 400 `errorMessage`를 표시하는 styled accessible modal
- Acceptance: close button과 Escape가 동작하고 focus가 modal 안에 머문 뒤 submit으로
  복귀하며 390x844에서 content와 action이 잘리지 않는다.
- Automatic verification: `pnpm vitest run
src/features/sign-in/ui/sign-in-form.test.tsx`, `./scripts/verify quick`
- Browser verification: `/sign-in` credential failure, 390x844/1280x720, focus
  trap/restore, modal overflow, POST status/body, console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` umbrella loop owner; branch
  `feat/auth-entry-loop`; start commit
  `fe5e1e8c76b2a3ad13a98da5b9f550e8aa297c5d`; target `AUTH-06`; 기존 shared
  Radix Dialog와 `onCloseAutoFocus`가 acceptance를 충족해 production 변경 없이 exact
  실패 request 1회·API `errorMessage` 표시와 Escape focus 복귀 characterization만
  `0d7d815`에 추가함. Focused Vitest 1 file/9 tests, `./scripts/verify quick` hook
  86·verifier 19·Vitest 38 files/147 tests, `git diff --check` PASS.
  Agent-browser `auth-error-view-01-mobile` 390x844에서 초기 focus가 close에 있고
  Tab/Shift+Tab 후에도 modal 안에 머물며 Escape 후 submit으로 복귀함; scrollWidth
  390px로 content/action clipping 없음. `auth-error-view-01-desktop` 1280x720에서
  modal content/action과 scrollWidth 1280px를 확인하고, 안정화 대기 후 명시적 close와
  submit focus 복귀를 재확인함. MSW console은 fresh refresh 401과 exact
  `POST /api/sign-in` body 1회·400만 기록했고 page error 없음. Screenshots:
  `/tmp/kbhc-auth-error-view-01-mobile.png`,
  `/tmp/kbhc-auth-error-view-01-desktop.png`.
  Failure/Correction: `TOOLING` — close 직후 exit animation 전에 DOM을 읽은 첫 측정을
  500ms 안정화 후 재실행해 dialog 0과 submit focus를 확인함; agent-browser request
  log가 service-worker 요청을 포착하지 않아 MSW console과 component exact-count
  assertion으로 교차 검증함. Task adversarial check: 요구되지 않은 production 변경이나
  새 abstraction/dependency 없음, dependency·범위·접근성·negative path PASS

### [x] AUTH-SESSION-UX-01 인증 초기화·실패·복귀 화면

- Requirements: `AUTH-07`, `NAV-02`, `NAV-03`
- Risk: MEDIUM — auth route와 visible state 통합
- Depends on: `AUTH-ERROR-VIEW-01`, `AUTH-STATE-01`, `UI-STATE-01`
- Deliverable: bootstrap, unavailable/retry, anonymous redirect와 authenticated return UI
- Acceptance: 인증 초기화와 recoverable failure가 빈 화면으로 보이지 않고 보호 route
  직접 진입, 로그인 복귀와 refresh-cookie reload가 layout jump 없이 승인 정책대로
  전환된다.
- Automatic verification: `pnpm vitest run src/app/auth/auth-route-boundary.test.tsx
src/app/auth/auth-provider.test.tsx src/app/router.test.tsx`,
  `./scripts/verify quick`
- Browser verification: `/task/task-1` 직접 진입 → `/sign-in` → 복귀 → reload,
  390x844/1280x720, route/action, refresh network, console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` umbrella loop owner; branch
  `feat/auth-entry-loop`; dependency `AUTH-ERROR-VIEW-01` `AI_VERIFIED`; target
  `AUTH-07`, `NAV-02`, `NAV-03`; implementation `be22ce0`. Router RED 1 test는
  initializing에서 `주요 메뉴`가 없어 실패했고, boundary RED 2 tests는 Skeleton과 shared
  Alert가 없어 실패함. Auth boundary를 `AppShell` 안으로 이동하고 기존
  `AsyncLoading`·`AsyncError`·`Skeleton`만 재사용해 shell은 유지하되 보호 content를
  계속 차단함. GREEN router/boundary 2 files/14 tests, focused auth 4 files/28 tests,
  `./scripts/verify quick` hook 86·verifier 19·Vitest 38 files/148 tests,
  `git diff --check` PASS.
  Agent-browser `auth-session-ux-01-mobile` 390x844에서 styled alert와 shell navigation이
  공존하고 보호 heading은 없으며 scrollWidth 390px임을 확인; `다시 불러오기` 1회 후
  anonymous refresh 401과 `/sign-in` 전환 PASS. `auth-session-ux-01-desktop`
  1280x720에서 `/task/task-1` 직접 진입→`/sign-in`→valid sign-in→동일 detail 복귀→
  reload 후 동일 route 유지와 profile-only action을 확인; MSW console은 exact sign-in
  200, reload refresh 200 1회와 detail GET만 기록하고 page error 없음. Screenshots:
  `/tmp/kbhc-auth-session-ux-01-mobile-error.png`,
  `/tmp/kbhc-auth-session-ux-01-desktop.png`.
  Failure/Correction: `TOOLING` — agent-browser route가 MSW service worker 요청을
  intercept하지 못해 최종 diff에 남지 않는 sessionStorage 기반 임시 MSW network-error
  fixture로 unavailable을 재현하고 flag 제거 후 retry를 확인한 다음 fixture 변경을
  완전히 되돌림; Biome 한 줄 format을 `pnpm run format`으로 교정하고 quick 재실행.
  Task adversarial check: router hierarchy, 보호 content leakage, retry count, approved
  return route, auth policy와 unrelated diff를 검토했고 provider·transport·API 변경 및
  새 dependency/abstraction 없음; Verdict: PASS

### [x] AUTH-JOURNEY-VERIFY-01 auth-entry 통합 검증

- Requirements: `NAV-02`, `AUTH-01`~`AUTH-07`
- Risk: MEDIUM — Journey evidence gate
- Depends on: `AUTH-SESSION-UX-01`
- Deliverable: current commit의 auth-entry focused, quick, core/browser evidence
- Acceptance: `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`가 lowest-level automatic evidence와
  current-commit browser record에 trace되고 console/network expected와 actual이
  기록된다.
- Automatic verification: `pnpm vitest run
src/features/sign-in/ui/sign-in-form.test.tsx
src/app/auth/auth-route-boundary.test.tsx src/app/auth/auth-provider.test.tsx
src/shared/api/authenticated-request.test.ts`, `./scripts/verify quick`,
  `pnpm exec playwright test e2e/auth-entry.spec.ts`
- Browser verification: named `agent-browser` session, `/sign-in` invalid/error/success,
  protected direct entry/reload, 두 viewport와 credential/network boundary
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` umbrella loop owner; branch
  `feat/auth-entry-loop`; start `fd91069`, verification commit
  `0e38ee653c5f95d6ac205c93101f8c4c8393b2aa`, review correction target
  `cbff6b502d14faaec3255fa8cf4fb890279dbf65`; target
  `NAV-02`, `AUTH-01`~`AUTH-07`와 `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`를
  `docs/quality/evidence/auth-entry.md`에 lowest-level evidence로 매핑함. Schema
  1 file/6 tests, focused auth 4 files/29 tests, `./scripts/verify quick` hook
  86·verifier 19·Vitest 38 files/149 tests PASS. 기존 Playwright 2 cases에 새 case
  없이 credential failure exact POST/body 1회·400, focus trap·Escape를 보강했고 초기와
  fresh rerun 모두 2/2 PASS. Agent-browser
  `auth-journey-verify-01-mobile` 390x844와
  `auth-journey-verify-01-desktop` 1280x720에서 invalid/disabled→400 modal→submit
  focus 복귀→valid same-route return→reload refresh 200 1회→profile-only action과
  scrollWidth 390/1280px를 확인; expected bootstrap 401·credential 400 외 page error와
  unexpected console error 없음. Screenshots:
  `/tmp/kbhc-auth-journey-verify-01-mobile.png`,
  `/tmp/kbhc-auth-journey-verify-01-desktop.png`.
  Failure/Correction: `TOOLING` — agent-browser request log가 MSW service-worker
  요청을 포착하지 않아 Playwright request/response listener, MSW console과 component
  exact-count assertion을 current evidence로 사용함. Verify-task adversarial check:
  scenario 누락, exact request/status, bearer/refresh, duplicate E2E, artifact 경로,
  expected console 분류, unrelated diff와 dependency/status를 검토했고 unresolved
  HIGH/MEDIUM 없음; 사람 승인 주장은 없음. Initial fresh review는 authenticated
  `refresh()` 401 terminal path 직접 test와 exact-SHA 결속 누락을 MEDIUM으로 찾았고,
  provider regression test와 canonical evidence 교정으로 해소 후 재review 대상으로 전환;
  verify-task self-check Verdict: PASS

### [x] AUTH-JOURNEY-REVIEW-01 auth-entry 독립 review

- Requirements: `NAV-02`, `AUTH-01`~`AUTH-07`
- Risk: MEDIUM — Journey review gate
- Depends on: `AUTH-JOURNEY-VERIFY-01`
- Deliverable: exact target SHA의 fresh auth-entry adversarial review record
- Acceptance: 요구 누락, auth 경계, negative path, 접근성, weak test, console/network와
  unrelated diff를 검토하고 HIGH/MEDIUM finding을 모두 수정·재검증한다.
- Automatic verification: `./scripts/verify quick`
- Browser verification: finding이 browser behavior에 영향을 주면 해당 auth case 재실행
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` umbrella loop owner; branch
  `feat/auth-entry-loop`; plan
  `docs/superpowers/plans/2026-09-01-auth-entry-remaining-loop.md`; target
  `NAV-02`, `AUTH-01`~`AUTH-07` / `auth-entry`; review ownership start와 initial
  target `7d01a9345c2d7500063e42294d43c441a1fd7808`, merge-base
  `fe5e1e8c76b2a3ad13a98da5b9f550e8aa297c5d`; fresh review는 Critical 없음,
  Important 2건(`AUTH-E3` direct refresh failure test, evidence exact SHA)으로 FAIL;
  correction `cbff6b502d14faaec3255fa8cf4fb890279dbf65`과
  `a284d90dbb6e51868557eeb3d8824b0e8e64f30b` 이후 재review 완료.
  Review target: 위 plan, `NAV-02`, `NAV-03`, `AUTH-01`~`AUTH-07`, `auth-entry`,
  `AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`; corrected target
  `a284d90dbb6e51868557eeb3d8824b0e8e64f30b`, merge-base
  `fe5e1e8c76b2a3ad13a98da5b9f550e8aa297c5d`.
  Reviewer: target을 작성·수정하지 않은 fresh read-only
  `/root/auth_journey_final_review`.
  Checks: requirement/scenario 누락, auth storage·bearer·refresh·single-flight·bounded
  replay·terminal/stale session·safe return route, validation/Dialog/session negative,
  keyboard/focus/responsive 접근성, weak/duplicate test, console/network 분류,
  evidence 재현성, unrelated diff와 TODO consistency.
  Findings: initial Important 2건은 위 correction으로 해결; final
  Critical/Important/Minor 없음, unresolved HIGH/MEDIUM 없음.
  Corrections: provider authenticated refresh 401 terminal regression test와 full-SHA
  evidence/ownership/totals 교정; production/browser code 변경 없음.
  Rerun: focused auth 4 files/29 tests, quick hook 86·verifier 19·Vitest 38 files/149
  tests, mapped Playwright 2/2, `git diff --check`, clean worktree PASS; browser-tested
  production target `be22ce004a974251f4579469fc01c03df263d433` 불변으로 기존 두 viewport
  evidence 적용.
  Verdict: PASS; plan-completion adversarial review와 Journey review에 동일 record 재사용;
  사람 `HUMAN_APPROVED`나 `JOURNEY-AUTH-01` acceptance가 아님

### [x] JOURNEY-AUTH-01 auth-entry 사람 checkpoint

- Requirements: `NAV-02`, `AUTH-01`~`AUTH-07`
- Risk: MEDIUM checkpoint
- Depends on: `AUTH-JOURNEY-REVIEW-01`
- Deliverable: auth-entry 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 auth-entry evidence를 검토해
  명시적으로 승인한 경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Automatic verification: review target/evidence/status audit, `./scripts/verify setup`
- Browser verification: `AUTH-JOURNEY-VERIFY-01`의 current-commit record를 사람이 검토
- Status: HUMAN_APPROVED
- Evidence: automatic/browser evidence는 `docs/quality/evidence/auth-entry.md`에 보존;
  focused auth 4 files/29 tests, quick 38 files/149 tests, mapped auth Playwright
  2/2, mobile/desktop named browser session PASS. Independent review target
  `a284d90dbb6e51868557eeb3d8824b0e8e64f30b`은 correction 뒤 Critical/Important/
  Minor와 unresolved HIGH/MEDIUM 없이 PASS. Final QA target
  `91f5f6991d88ed7164335771266fe86a14e8ffbe`에서 `./scripts/verify full` build,
  core E2E 5/5, verifier regression 19 PASS. 2026-09-01 사람이 최종 evidence를
  확인하고 checkbox와 `HUMAN_APPROVED` 상태를 직접 기록함

## 4. work-overview Journey

### [x] WORK-LOOP-DESIGN-01 work-overview Journey 전체 루프 설계

- Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`
- Risk: LOW — 승인된 API·화면·인증 계약을 구현 가능한 Journey 순서로 연결
- Depends on: `JOURNEY-AUTH-01`
- Deliverable: 기존 구현을 baseline으로 재사용하는 gap-first Journey 설계 문서와
  TODO dependency 연결
- Acceptance: 원본 기획, OpenAPI의 dashboard/user bearer 계약, Focus workspace 화면
  설계, 현재 code/test/evidence가 trace되고 구현·검증·독립 review·사람 checkpoint의
  입력과 exit가 모순 없이 정의된다.
- Automatic verification: spec placeholder·contradiction·requirement/API/TODO trace
  자체 검토, `./scripts/verify setup`, `git diff --check`
- Browser verification: 설계 task에는 적용 없음 — 실행 plan이 두 viewport와
  named agent-browser evidence를 소유
- Status: AI_VERIFIED
- Evidence: 2026-09-01 Codex `/root` task block owner; start commit
  `edc8142215a9662fe89db3b45453050ab800f4ab`; 사용자와 gap-first 범위, task/data
  경계, acceptance/evidence 설계를 섹션별 승인;
  `docs/superpowers/specs/2026-09-01-work-overview-journey-design.md`에 원본 기획,
  OpenAPI 200/401 bearer 계약, Focus workspace, baseline module, task/data flow,
  acceptance matrix, gap-first TDD, browser evidence, review/exit를 trace함. Placeholder,
  contradiction, ambiguity와 scope 자체 검토 및 `git diff --check` PASS. 첫
  `./scripts/verify setup`은 기존 fixed dependency fixture가 새 prerequisite를 몰라
  `TEST` 실패; `tests/test_verify_contract.py` mapping을 최소 교정하고 focused 1 test,
  setup hook 86 tests·verify contract 19 tests PASS. 설계 commit `fc108dd`; 사용자가
  2026-09-01 작성된 spec을 명시적으로 승인하고 gap-first Journey 루프 시작을 요청함

### [x] NAV-PRIMARY-01 공통 dashboard/task navigation

- Requirements: `NAV-01`
- Risk: LOW
- Depends on: `ARCH-02`
- Deliverable: 항상 보이는 서로 다른 dashboard/task icon action
- Acceptance: 모든 route에서 action이 accessible하고 `/`, `/task` 이동과 현재
  위치 표시가 정확하다.
- Automatic verification: shell/router integration tests,
  `./scripts/verify quick`
- Browser verification: 다섯 route와 mobile/desktop navigation
- Status: AI_VERIFIED
- Evidence: router Vitest와 Chromium desktop/mobile에서 dashboard/task action 유지,
  distinct Lucide icon, `aria-current`, route 이동 확인;
  `docs/quality/evidence/work-overview.md`

### [x] DASH-01 dashboard metrics

- Requirements: `DASH-01`
- Risk: MEDIUM
- Depends on: `ARCH-03`, `AUTH-STATE-01`
- Deliverable: dashboard query와 세 metric의 loading/error/success UI
- Acceptance: `numOfTask`, `numOfRestTask`, `numOfDoneTask`가 fixture와 정확히
  일치하고 retry/recovery가 예측 가능하다.
- Automatic verification: MSW integration tests, component state tests,
  `./scripts/verify quick`
- Browser verification: `/` fixture 비교와 console/network 기록
- Status: AI_VERIFIED
- Evidence: endpoint guard와 loading/error/retry/success component RED→GREEN 4 tests;
  단일 task store handler 일관성 6 tests; Chromium bearer request와 fixture `3/2/1`
  확인; `docs/quality/evidence/work-overview.md`

### [x] USER-01 profile data

- Requirements: `USER-01`
- Risk: MEDIUM
- Depends on: `ARCH-03`, `AUTH-STATE-01`
- Deliverable: profile query와 name/memo의 loading/error/success UI
- Acceptance: bearer 보호 요청으로 받은 name/memo가 fixture와 정확히 일치한다.
- Automatic verification: MSW integration tests, component state tests,
  `./scripts/verify quick`
- Browser verification: `/user` fixture 비교와 console/network 기록
- Status: AI_VERIFIED
- Evidence: user endpoint/handler/query UI RED→GREEN 6 tests; Chromium bearer request와
  `김담당`/`오늘도 차근차근` 확인; `docs/quality/evidence/work-overview.md`

### [x] DASHBOARD-VIEW-01 dashboard metric 화면

- Requirements: `DASH-01`
- Risk: LOW — 검증된 dashboard data의 presentation
- Depends on: `WORK-LOOP-DESIGN-01`, `UI-SHELL-01`, `UI-STATE-01`, `DASH-01`
- Deliverable: 세 metric의 responsive state surface
- Acceptance: 전체/남은/완료 label과 value 관계가 유지되고 loading, error/retry와
  success가 390x844/1280x720에서 layout collapse 없이 구분된다.
- Automatic verification: `pnpm vitest run
src/widgets/dashboard-summary/dashboard-summary.test.tsx`, `./scripts/verify quick`
- Browser verification: `/`, 두 viewport, fixture 3/2/1, loading/error/retry/success,
  bearer request와 console/page error
- Status: AI_VERIFIED
- Evidence: session `01a05d12-7ce7-7240-b44a-f525ce4fe48c`; target
  `8342aa09fe07ab6f4c7938ef59405bd20490e54e`; focused dashboard/API Vitest 2 files/5
  tests PASS; `./scripts/verify quick` PASS (38 files/149 Vitest tests); mapped
  `e2e/work-overview.spec.ts` PASS (1 Chromium test). Agent-browser at 1280x720 and
  390x844 recorded 3/2/1, 33.333% progress, Pretendard and no horizontal overflow;
  dashboard request initialized with `Authorization: Bearer [redacted]`; temporary
  transport failure Alert → retry restored 3/2/1 with no page errors. MSW service
  worker bypassed `network route --abort` (TOOLING), so a temporary browser fetch
  rejection supplied failure UI proof; no product change. Full evidence:
  `docs/quality/evidence/work-overview.md#dashboard-view-01`

### [x] PROFILE-VIEW-01 회원정보 화면

- Requirements: `USER-01`
- Risk: LOW — 검증된 profile data의 presentation
- Depends on: `WORK-LOOP-DESIGN-01`, `UI-SHELL-01`, `UI-STATE-01`, `USER-01`
- Deliverable: name과 memo의 responsive state surface
- Acceptance: name과 memo hierarchy가 명확하고 loading, error/retry와 success가
  390x844/1280x720에서 layout collapse 없이 구분된다.
- Automatic verification: `pnpm vitest run
src/widgets/user-profile/user-profile.test.tsx`, `./scripts/verify quick`
- Browser verification: `/user`, 두 viewport, fixture name/memo, state, bearer request,
  console/page error
- Status: AI_VERIFIED
- Evidence: session `/root/work_task2_profile`; code target
  `86adb3b3daf506b9a5d54fb89448d1d2e3875f41`; focused profile/API 2 files/4 tests,
  quick 38 files/149 tests, mapped Playwright 1 Chromium test PASS. Independent
  authenticated browser fixture at 1280x720/390x844 recorded exact
  `이름/김담당`, `메모/오늘도 차근차근`, one Card, no overflow, bearer-only MSW 200,
  alert/retry recovery, empty post-recovery page errors, and successful named-session
  close. MSW route-abort bypass was TOOLING; temporary browser-only query interception
  was removed before retry, with no product/test source change. Full evidence:
  `docs/quality/evidence/work-overview.md#profile-view-01`.

### [x] WORK-NAV-RESPONSIVE-01 인증 후 route navigation 검증

- Requirements: `SYS-03`, `NAV-01`, `NAV-03`
- Risk: MEDIUM — 세 route의 shell/content 통합
- Depends on: `DASHBOARD-VIEW-01`, `PROFILE-VIEW-01`
- Deliverable: dashboard, task, profile 사이의 responsive navigation
- Acceptance: 세 action과 current route가 유지되고 content가 두 viewport에서 잘리지
  않으며 keyboard 이동과 computed Pretendard가 확인된다.
- Automatic verification: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx
src/widgets/dashboard-summary/dashboard-summary.test.tsx
src/widgets/user-profile/user-profile.test.tsx src/app/router.test.tsx`,
  `./scripts/verify quick`
- Browser verification: `/` → `/user` → `/task` → `/`, 390x844/1280x720,
  current route, keyboard, font, console/network
- Status: AI_VERIFIED
- Evidence: session `/root/work_task3_nav`; start SHA `73b5050f8aa317574e63fe2ddcc4b6dd9f4de972`; focused shell/router/theme 3 files/12 tests, quick 38 files/149 tests, mapped Chromium 1 test PASS. Authenticated `/` → `/user` → `/task` → `/` desktop snapshots verified each `aria-current`, Pretendard, and 224px header; fresh mobile document verified 48px distinct-icon actions, fixed bottom header, 390px no-overflow, and Tab `대시보드` → `할 일` → `회원정보`. Final console/page-error buffers were empty, network monitor emitted `No requests captured` under MSW, screenshot and close succeeded. Full evidence: `docs/quality/evidence/work-overview.md#work-nav-responsive-01`.

### [x] WORK-JOURNEY-VERIFY-01 work-overview 통합 검증

- Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`
- Risk: MEDIUM — Journey evidence gate
- Depends on: `WORK-NAV-RESPONSIVE-01`
- Deliverable: current commit의 work-overview focused, quick, core/browser evidence
- Acceptance: `WORK-P1-*`, `WORK-E*`가 fixture, navigation, state, font, accessibility와
  viewport evidence에 trace되고 expected console/network가 기록된다.
- Automatic verification: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx
src/widgets/dashboard-summary/dashboard-summary.test.tsx
src/widgets/user-profile/user-profile.test.tsx src/app/router.test.tsx`,
  `./scripts/verify quick`,
  `pnpm exec playwright test e2e/work-overview.spec.ts`
- Browser verification: named `agent-browser` session, dashboard/task/profile 이동,
  두 viewport, fixture 비교와 console/network
- Status: AI_VERIFIED
- Evidence: session `/root/work_task4_verify`; verified source target `9eedef4d25be84f7b39e30bb9cbc9ac38d32b738`; focused 10 files/41 tests, quick Python 86 + verifier 19 + Vitest 38 files/149 tests, mapped Chromium 1 test PASS. `WORK-P1-1`~`WORK-P1-4` and `WORK-E1` trace AppShell/router, dashboard/profile API, theme, terminal-401/provider/cache and route-boundary contracts. Authenticated desktop/mobile `/` → `/user` → `/task` → `/` snapshots saw profile (not sign-in), dashboard `3/2/1`, profile `김담당`/`오늘도 차근차근`, Pretendard and 390px no-overflow; Playwright proves bearer/zero sign-in. MSW browser monitor returned `No requests captured`; final console had MSW 200 only, page errors empty, both screenshots and session close succeeded. Full evidence: `docs/quality/evidence/work-overview.md#work-journey-verify-01`.

### [x] WORK-JOURNEY-REVIEW-01 work-overview 독립 review

- Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`
- Risk: MEDIUM — Journey review gate
- Depends on: `WORK-JOURNEY-VERIFY-01`
- Deliverable: exact target SHA의 fresh work-overview adversarial review record
- Acceptance: fixture 표시, navigation, font, responsive, accessibility, weak test와
  console/network를 검토하고 HIGH/MEDIUM finding을 모두 수정·재검증한다.
- Automatic verification: `./scripts/verify quick`
- Browser verification: finding이 browser behavior에 영향을 주면 해당 work case 재실행
- Status: AI_VERIFIED
- Evidence: Review target:
  `docs/superpowers/plans/2026-09-01-work-overview-journey.md`의 `SYS-03`, `NAV-01`,
  `NAV-03`, `DASH-01`, `USER-01` / `work-overview` / `WORK-P1-1`~`WORK-P1-4`,
  `WORK-E1`; corrected source target
  `660977268fe1b3082acbbe13ff95c4a95d8b12af`.
  Reviewer: Task 4 final author `/root/work_task4_verify` 및 correction author
  `/root/work_final_fix`와 분리되어 target을 작성·수정하지 않은 fresh reviewer
  `/root/work_final_review`.
  Checks: plan/spec와 원본 requirement/OpenAPI, 다섯 requirement·다섯 case,
  dashboard/user bearer·200/401 exact field, 독립 fixture·sign-in 0회, 화면 state와
  label/value, navigation current/icon/keyboard/font/48px/clipping, refresh·terminal
  session·protected cache, weak/duplicate/flaky test와 E2E 규모, console/network,
  두 immutable review package, 변경 test/TODO, production root 복원, unrelated
  diff·secret·generated noise·TODO dependency/status를 검토함.
  Findings: 최초 Important `TEST`는 terminal cleanup test가 task cache만 검증해
  dashboard/user root 회귀를 놓치는 것이 root cause였고, Minor documentation은
  work-overview 진행 요약이 설계 중으로 남은 것이 root cause였음. Corrected
  target에서 두 finding 모두 해결되었으며 final Critical/Important/Minor와
  unresolved HIGH/MEDIUM 없음.
  Corrections: 두 terminal path가 `dashboard`, `tasks`, `task`, `user`를 모두
  seed/assert하고 unrelated cache 보존을 확인하도록 test를 보강했으며 진행 요약을
  독립 review 보정·재검증 및 사람 checkpoint 대기로 갱신함. Production, E2E,
  dependency, generated file과 Journey behavior 변경 없음. Mutation RED는 production
  `protectedRoots`에서 `dashboard`와 `user`를 임시 제거한 뒤 provider 1 file에서
  2 failed/4 passed를 확인했고, 네 root를 정확히 복원해 production diff를 제거함.
  Rerun: `pnpm vitest run src/app/auth/auth-provider.test.tsx` 1 file/6 tests PASS;
  complete Journey focused 10 files/41 tests PASS; `./scripts/verify quick` hook 86,
  verifier 19, format/lint/typecheck, Vitest 38 files/149 tests PASS;
  `pnpm exec playwright test e2e/work-overview.spec.ts` Chromium 1/1 PASS;
  두 target range와 `HEAD^..HEAD` `git diff --check`, exact target/clean worktree PASS.
  Verdict: PASS; plan path, requirement/Journey IDs와 exact target이 동일하므로 이
  record가 plan-completion adversarial review와 `WORK-JOURNEY-REVIEW-01`을 모두
  충족함. 사람 `HUMAN_APPROVED` 또는 `JOURNEY-WORK-01` acceptance가 아님

### [x] JOURNEY-WORK-01 work-overview 사람 checkpoint

- Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`
- Risk: MEDIUM checkpoint
- Depends on: `WORK-JOURNEY-REVIEW-01`
- Deliverable: work-overview 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 evidence를 명시적으로 승인한
  경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Automatic verification: review target/evidence/status audit, `./scripts/verify setup`
- Browser verification: `WORK-JOURNEY-VERIFY-01`의 current-commit record를 사람이 검토
- Status: HUMAN_APPROVED
- Evidence: 2026-09-02 사용자가 `docs/quality/evidence/work-overview.md`의 화면 동작과
  검증 결과를 직접 확인하고 이 checkpoint를 명시적으로 승인함. 승인 대상은 corrected
  source target `660977268fe1b3082acbbe13ff95c4a95d8b12af`와 independent review record
  `823317fbf4d08e59059f63ea993b6e46c8b9c806`; post-approval fresh review에서 focused
  10 files/41 tests, quick 38 files/149 tests, mapped Chromium 1/1, full hook 86 +
  contract 19 + Vitest 38 files/149 tests + build + core Chromium 5/5 + verifier
  regression 19/19 PASS, 코드·테스트 finding 없음

## 5. task-discovery Journey

### [x] TASK-DISCOVERY-LOOP-DESIGN-01 task-discovery Journey 전체 루프 설계

- Requirements: `TASK-LIST-01`~`TASK-LIST-05`
- Risk: LOW — 승인된 API·화면·인증 계약을 구현 가능한 Journey 순서로 연결
- Depends on: `JOURNEY-WORK-01`
- Deliverable: 기존 구현을 baseline으로 재사용하는 gap-first Journey 설계 문서와
  TODO dependency 연결
- Acceptance: 원본 기획, OpenAPI의 bearer task page 계약, Focus workspace 목록 화면,
  현재 code/test/evidence가 trace되고 구현·검증·독립 review·사람 checkpoint의 입력과
  exit가 모순 없이 정의된다.
- Automatic verification: spec placeholder·contradiction·requirement/API/TODO trace
  자체 검토, `./scripts/verify setup`, `git diff --check`
- Browser verification: 설계 task에는 적용 없음 — 실행 plan이 두 viewport와 named
  agent-browser evidence를 소유
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; start commit
  `5b5d60c093099218387ac0f2b6fffb02189c9f13`; 사용자가 Journey 종료 범위,
  gap-first 접근, requirement/API/module 경계, 화면·상태·오류, 검증·review 설계를
  순서대로 승인함. RED: `python3 -m unittest
  tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog
  -v`가 `TASK-DISCOVERY-LOOP-DESIGN-01` 누락으로 예상대로 FAIL. GREEN: 같은 focused
  test 1/1 PASS; spec은 requirement·`DISC-*`, OpenAPI 200/401 bearer와 page query,
  Focus workspace, baseline module/data flow, task/state/browser/review/exit를 trace함.
  Placeholder, contradiction, ambiguity와 scope 자체 검토, `git diff --check`,
  `./scripts/verify setup` hook 86 tests·verify contract 19 tests PASS. 작성된 spec의
  사람 검토 전까지 이 task는 `IN_PROGRESS`를 유지함. 2026-09-02 사용자가 commit
  `f4e4a30`의 작성된 spec을 명시적으로 승인하고 구현 계획 작성을 요청함.

### [x] TASK-PAGE-01 초기 task page와 card

- Requirements: `TASK-LIST-01`, `TASK-LIST-02`, `TASK-LIST-05`
- Risk: MEDIUM
- Depends on: `ARCH-03`, `AUTH-STATE-01`
- Deliverable: `page=1` query, title/memo card, detail route action, 상태 UI
- Acceptance: 첫 요청 query가 exact `page=1`이고 fixture card와 route ID가 일치하며
  loading/empty/error/success가 구분된다.
- Automatic verification: MSW/router integration tests, card component tests,
  `./scripts/verify quick`
- Browser verification: `/task` initial states와 card→detail navigation
- Status: AI_VERIFIED
- Evidence: task API/card/widget RED→GREEN tests; exact `page=1`, title/memo, empty,
  retry와 `/task/task-3` Chromium 검증; `docs/quality/evidence/task-discovery.md`

### [x] TASK-PAGE-02 infinite pagination state

- Requirements: `TASK-LIST-04`
- Risk: MEDIUM
- Depends on: `TASK-PAGE-01`
- Deliverable: page 순서, single in-flight, retry, `hasNext` 종료를 관리하는 query
- Acceptance: 끝 도달마다 다음 page를 한 번 요청하고 중복 trigger를 합치며
  `hasNext: false` 뒤 추가 요청하지 않는다.
- Automatic verification: multi-page integration tests와 request count assertion,
  `./scripts/verify quick`
- Browser verification: two-page scroll network log와 terminal page 확인
- Status: AI_VERIFIED
- Evidence: StrictMode single in-flight와 terminal request count tests; Chromium
  requests `[1, 2]` exactly once; `docs/quality/evidence/task-discovery.md`

### [x] TASK-PAGE-03 virtualized growing list

- Requirements: `TASK-LIST-03`, `TASK-LIST-04`
- Risk: MEDIUM
- Depends on: `TASK-PAGE-02`
- Deliverable: TanStack Virtual list, stable key, size estimate/measurement,
  pagination trigger
- Acceptance: fetched item 수가 증가해도 mounted task row 수가 viewport 주변으로
  제한되고 scroll position과 next-page trigger가 안정적이다.
- Automatic verification: virtualizer integration test와 bounded DOM assertion,
  `./scripts/verify quick`
- Browser verification: 고정 viewport에서 scroll, DOM count, request sequence,
  terminal page trace
- Status: AI_VERIFIED
- Evidence: stable domain key, 96px row measurement, bounded DOM 1/3 records와 terminal
  scroll 확인; `docs/quality/evidence/task-discovery.md`

### [x] TASK-CARD-VIEW-01 task card 화면

- Requirements: `TASK-LIST-02`, `TASK-LIST-05`
- Risk: LOW — 검증된 task item/link의 presentation
- Depends on: `TASK-DISCOVERY-LOOP-DESIGN-01`, `UI-FOUNDATION-01`, `TASK-PAGE-01`
- Deliverable: title/memo hierarchy와 전체 action을 가진 task card
- Acceptance: title과 memo가 구분되고 card 전체가 exact encoded detail route로
  이동하며 hover와 keyboard focus가 명확하다. 원본에 없는 status UI는 추가하지 않는다.
- Automatic verification: `pnpm vitest run
src/entities/task/ui/task-card.test.tsx`, `./scripts/verify quick`
- Browser verification: `/task`, 390x844/1280x720, card content, pointer/keyboard focus,
  `/task/:id` navigation, console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; start commit
  `cc0aa22af488f527cdf8300f298886ffdbe704d1`; requirements `TASK-LIST-02`,
  `TASK-LIST-05`; plan
  `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`; focused Card 1 file/1
  test와 `./scripts/verify quick` hook 86·contract 19·Vitest 38 files/149 tests PASS.
  Agent-browser `task-card-view-01-rerun`에서 1280x720 pointer와 390x844 keyboard를
  검증해 title/memo, status UI 부재, `/task/task-1`, dark-gold 2px focus outline,
  document width 390px를 확인함. Screenshot:
  `/tmp/kbhc-task-card-view-01-desktop-rerun.png`,
  `/tmp/kbhc-task-card-view-01-mobile-rerun.png`. 첫 session은 fixture 주입 전 refresh
  401이 console에 남은 `TEST` failure였고 worker origin에서 storage를 먼저 seed하는
  fresh session으로 교정; rerun은 refresh/task/detail 200, page error와 예상하지 않은
  console error 없음. 제품 code/test 변경 없음.

### [x] TASK-LIST-VIRTUAL-UX-01 production scroll viewport

- Requirements: `TASK-LIST-03`
- Risk: MEDIUM — responsive scroll와 virtual measurement
- Depends on: `TASK-CARD-VIEW-01`, `TASK-PAGE-03`
- Deliverable: 여러 행을 탐색할 수 있는 bounded responsive virtual viewport
- Acceptance: 기존 96px 고정 viewport를 제거하고 두 viewport에서 usable height를
  제공하며 fetched item이 늘어도 mounted row가 viewport 주변으로 제한되고 scroll
  position이 안정적이다.
- Automatic verification: `pnpm vitest run src/widgets/task-list/task-list.test.tsx`,
  `./scripts/verify quick`
- Browser verification: `/task`, 390x844/1280x720, 실제 wheel/keyboard scroll,
  viewport/row size, mounted DOM count, clipping과 console/page/network 확인
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; start commit
  `dca7fd7057752d2ade56b76608d1a250e2263d1b`; requirements `TASK-LIST-03`;
  plan `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`. Focused list 1
  file/5 tests와 quick hook 86·contract 19·Vitest 38 files/149 tests PASS.
  Agent-browser `task-list-virtual-ux-01`에서 40개 schema fixture를 끝까지 scroll해
  desktop `clientHeight 500`, `scrollHeight 3840`, `scrollTop 3340`, mounted 6/40;
  mobile `clientHeight 560`, document/viewport width 390, mounted 6/40을 확인하고 실제
  scroll `2780→3280`을 재검증함. page 1..20이 성공했고 terminal 뒤 추가 요청, page
  error, 예상하지 않은 console error 없음. Screenshot:
  `/tmp/kbhc-task-list-virtual-ux-01-desktop.png`,
  `/tmp/kbhc-task-list-virtual-ux-01-mobile.png`. 제품 code/test 변경 없음.

### [x] TASK-LIST-PAGING-UX-01 무한 pagination feedback

- Requirements: `TASK-LIST-04`
- Risk: MEDIUM — scroll trigger와 request lifecycle
- Depends on: `TASK-LIST-VIRTUAL-UX-01`, `TASK-PAGE-02`
- Deliverable: list end 자동 pagination과 in-flight/error/terminal feedback
- Acceptance: end 도달 시 다음 page를 한 번 요청하고 partial-page failure는 retry할 수
  있으며 `hasNext: false` 뒤 멈춘다. 수동 fallback은 자동 pagination을 대체하지 않는다.
- Automatic verification: `pnpm vitest run src/widgets/task-list/task-list.test.tsx
src/shared/api/tasks.test.ts`, `./scripts/verify quick`
- Browser verification: `/task`, 두 viewport, page 1→2 scroll, request method/query/count,
  in-flight/terminal feedback, console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; start commit
  `7def492e87e61f401159469b34a526efdb12df07`; requirements `TASK-LIST-04`;
  plan `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`. Focused list/API
  2 files/8 tests와 quick hook 86·contract 19·Vitest 38 files/149 tests PASS.
  Production preview agent-browser에서 정상 page sequence `1→2` 각 1회, 세 카드,
  terminal text와 next button 부재를 확인함. 부분 page 2 transport error에서 page 1
  카드가 유지되고 `다시 불러오기`로 page 2만 성공 재요청해 terminal 복구. MSW
  Service Worker가 tool route abort를 선점한 첫 시도는 `TOOLING`으로 분류하고 fresh
  `task-list-paging-ux-01-rerun`에서 page-local rejected fetch로 교정; wrapper는 retry
  전에 복원했고 제품 code/test 변경 없음. Screenshots:
  `/tmp/kbhc-task-list-paging-ux-01-terminal.png`,
  `/tmp/kbhc-task-list-paging-ux-01-partial-error.png`,
  `/tmp/kbhc-task-list-paging-ux-01-retry-terminal.png`.

### [x] TASK-LIST-STATES-01 목록 초기·빈·오류 화면

- Requirements: `TASK-LIST-01`, `TASK-LIST-04`
- Risk: LOW — 검증된 query states의 presentation
- Depends on: `TASK-LIST-PAGING-UX-01`, `UI-STATE-01`
- Deliverable: initial loading, empty, initial/partial error와 terminal/success 화면
- Acceptance: 각 state가 semantic role과 visible action/message로 구분되고 상태 전환
  중 list layout이 붕괴하지 않으며 retry가 기존 page를 중복 요청하지 않는다.
- Automatic verification: `pnpm vitest run src/widgets/task-list/task-list.test.tsx`,
  `./scripts/verify quick`
- Browser verification: `/task`, 390x844/1280x720, state fixture별 layout/action,
  request count와 console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; start commit
  `1e4620cf44e901c9d14b23eb47e57c8aeeea6cbb`; requirements `TASK-LIST-01`,
  `TASK-LIST-04`; plan
  `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`. Focused list 1
  file/5 tests와 quick hook 86·contract 19·Vitest 38 files/149 tests PASS; component
  suite가 initial/next loading, empty/continuation, initial/partial retry를 검증함.
  Production preview agent-browser `task-list-states-01-error`에서 desktop initial
  transport error의 alert/retry 1개와 list 부재를 확인하고 복구 후 page `1→2`, 3개
  card와 terminal을 확인. `task-list-states-01-empty` mobile은 empty message true,
  create/next action false, document/viewport width 390, page 1 한 번만 요청함. 예상한
  rejected fetch 외 console/page error 없음; 제품 code/test 변경 없음. Screenshots:
  `/tmp/kbhc-task-list-states-01-error.png`,
  `/tmp/kbhc-task-list-states-01-empty.png`.

### [x] TASK-LIST-JOURNEY-VERIFY-01 task-discovery 통합 검증

- Requirements: `TASK-LIST-01`~`TASK-LIST-05`
- Risk: MEDIUM — Journey evidence gate
- Depends on: `TASK-LIST-STATES-01`
- Deliverable: current commit의 task-discovery focused, quick, core/browser evidence
- Acceptance: `DISC-P1-*`, `DISC-E*`가 exact page sequence, bounded DOM, real scroll,
  terminal stop와 detail navigation evidence에 trace된다.
- Automatic verification: `pnpm vitest run src/entities/task/ui/task-card.test.tsx
src/widgets/task-list/task-list.test.tsx src/shared/api/tasks.test.ts`,
  `./scripts/verify quick`,
  `pnpm exec playwright test e2e/task-discovery.spec.ts`
- Browser verification: named `agent-browser` session, `/task` → `/task/task-3`,
  두 viewport, scroll/DOM/network/console
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root` task block owner; branch
  `feat/task-discovery-loop`; verification target
  `2123ff2dc42e505359f87f40cc17931c9ab7b980`; requirements `TASK-LIST-01`~
  `TASK-LIST-05`; plan
  `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`. Complete trace lookup은
  page/widget raw fetch와 shared API 밖 generated import가 없음을 확인. Focused 7
  files/30 tests, quick hook 86·contract 19·Vitest 38/149, mapped task-discovery
  Chromium 1/1, full hook 86·contract 19·Vitest 38/149·build·core 5/5·verifier
  regression 19 모두 PASS. Production preview `task-list-journey-verify-01`은 두
  viewport에서 page `1→2` 각 1회, sign-in 0회, terminal, exact Card/detail route,
  width 1280/390을 확인하고 `/task/task-3` 200에 도달. Mapped E2E가 bearer와
  mounted `<3`을 증명하고 40-record browser record가 mounted 6/40을 보강함.
  Console/page error 없음; screenshots와 전체 case trace는
  `docs/quality/evidence/task-discovery.md` current-target section에 기록.

### [x] TASK-LIST-JOURNEY-REVIEW-01 task-discovery 독립 review

- Requirements: `TASK-LIST-01`~`TASK-LIST-05`
- Risk: MEDIUM — Journey review gate
- Depends on: `TASK-LIST-JOURNEY-VERIFY-01`
- Deliverable: exact target SHA의 fresh task-discovery adversarial review record
- Acceptance: virtualization, pagination race, keyboard/scroll UX, negative path,
  weak test와 console/network를 검토하고 HIGH/MEDIUM finding을 모두 수정·재검증한다.
- Automatic verification: `./scripts/verify quick`
- Browser verification: finding이 browser behavior에 영향을 주면 해당 discovery case 재실행
- Status: AI_VERIFIED
- Evidence: Review target: plan
  `docs/superpowers/plans/2026-09-02-task-discovery-journey.md`, requirements
  `TASK-LIST-01`~`TASK-LIST-05`, Journey `task-discovery`, initial exact target
  `e1e9e0377381f92d00aa376dd436c70a4c423492`, correction target
  `20679f818d7dc931f40f37543740349673220756`; Reviewer: target을 작성·변경하지 않은
  fresh read-only `/root/task_discovery_review`; Checks: plan/requirement/`DISC-*`/OpenAPI,
  auth/cache, pagination/virtualization, responsive/accessibility, test strength,
  console/network, diff/secrets/generated noise와 TODO dependency를 검토하고 focused,
  quick, mapped E2E, diff check 재현; Findings: initial HIGH `REQUIREMENT` 1건은 OAS가
  list response를 200/401로 한정하지만 mock/test가 invalid page 400 JSON 계약을
  발행한 충돌. Initial MEDIUM `TEST` `DISC-E3` 통합 부재, MEDIUM
  `UX_ACCESSIBILITY` Card truncate, LOW `TEST` detail 전 error assertion, LOW
  `REQUIREMENT` plan checkbox 불일치는 correction target에서 모두 해결;
  Corrections: actual task GET 401→refresh 401→anonymous `/sign-in`/task cache removal
  integration 추가, title/memo wrapping RED→GREEN, E2E error assertion을 detail 뒤로
  이동, Task 1~5 plan 37 steps reconcile. Long mobile browser는 title/memo 각 3줄,
  row 170px, width 390, overflow 없음; Rerun: 7 files/31 tests, quick hook 86·contract
  19·Vitest 38/150, mapped Chromium 1/1, correction diff check PASS; Verdict: BLOCKED —
  HIGH contract decision 없이 mock 400 behavior를 변경하거나 예외 승인할 수 없음.
  Human decision: 2026-09-02 사용자가 권장안, 즉 invalid page 400 JSON 계약을 제거하고
  HTTP status/body를 발행하지 않는 transport failure로 fail-closed 처리하는 변경을
  명시적으로 `승인`; handler test 5 cases RED(기존 400 resolve)→12/12 GREEN 후 fresh
  re-review. Final review target `b7790542226fcfb5ff5332692386343797f9b7fb`;
  Reviewer `/root/task_discovery_review`; Checks: complete target과 승인된 HIGH correction,
  prior findings, source/test/E2E, plan/TODO/evidence, scope/secrets/generated noise 및
  requested gates; Findings: 없음, prior HIGH/MEDIUM/LOW 전부 해결; Corrections: final
  target의 `HttpResponse.error()` fail-closed와 앞선 네 correction, reviewer 변경 없음;
  Rerun: focused 7 files/31, quick hook 86·contract 19·Vitest 38/150, mapped Chromium
  1/1, `334dec0..b779054` diff check와 clean status PASS; Verdict: PASS. 사람 Journey
  checkpoint는 별도.

### [x] JOURNEY-TASK-LIST-01 task-discovery 사람 checkpoint

- Requirements: `TASK-LIST-01`~`TASK-LIST-05`
- Risk: MEDIUM checkpoint
- Depends on: `TASK-LIST-JOURNEY-REVIEW-01`
- Deliverable: task-discovery 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 evidence를 명시적으로 승인한
  경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Automatic verification: review target/evidence/status audit, `./scripts/verify setup`
- Browser verification: `TASK-LIST-JOURNEY-VERIFY-01`의 current-commit record를 사람이 검토
- Status: HUMAN_APPROVED
- Evidence: reviewed source target
  `b7790542226fcfb5ff5332692386343797f9b7fb`; 독립 review record
  `f646f4663acebc58e61095b5cc66bd2bdf98f9c0`, Verdict PASS; focused 7 files/31
  tests, quick hook 86·contract 19·Vitest 38 files/150 tests, mapped Chromium 1/1
  PASS; final full은 `f646f4663acebc58e61095b5cc66bd2bdf98f9c0`에서 hook 86·contract
  19·Vitest 38 files/150 tests·build·core E2E 5/5·verifier regression 19 PASS;
  browser 근거는 `docs/quality/evidence/task-discovery.md`에 보존되며 desktop/mobile
  목록·상세 흐름과 mobile 장문 줄바꿈을 포함한다. 2026-09-02 사용자가 수동
  체크리스트 검토 완료와 승인 checkbox 기록을 명시해 `HUMAN_APPROVED`로 전환함

## 6. task-resolution Journey

### [x] TASK-DETAIL-01 상세 success와 404 복구

- Requirements: `TASK-DETAIL-01`, `TASK-DETAIL-02`
- Risk: MEDIUM
- Depends on: `ARCH-03`, `AUTH-STATE-01`
- Deliverable: route ID detail query, title/memo/registerDatetime UI, 404 전용 복구 UI
- Acceptance: 200 fixture fields가 정확하고 404 `errorMessage`가 resource-missing
  상태로 분리되며 목록 action이 `/task`로 이동한다.
- Automatic verification: MSW/router integration tests,
  `./scripts/verify quick`
- Browser verification: existing/missing ID 직접 진입과 recovery
- Status: AI_VERIFIED
- Evidence: detail API/page/router RED→GREEN 11 tests; Chromium existing 200와 삭제 후
  new-document 404/목록 복구 확인; `docs/quality/evidence/task-resolution.md`

### [x] TASK-DELETE-01 삭제 modal과 exact ID guard

- Requirements: `TASK-DETAIL-03`, `TASK-DETAIL-04`
- Risk: LOW
- Depends on: `TASK-DETAIL-01`
- Deliverable: ID input, disabled submit, accessible focus lifecycle을 가진 modal
- Acceptance: wrong/공백/case-different ID에서 disabled이고 route ID exact match에서만
  enabled이며 close/reopen 시 입력이 reset된다.
- Automatic verification: component boundary tests와 user-event keyboard test,
  `./scripts/verify quick`
- Browser verification: wrong→exact 입력, focus trap/restore, mobile overflow
- Status: AI_VERIFIED
- Evidence: attempt/dialog 5 tests로 exact byte guard, pending lock, focus reset,
  GET-only recovery 검증; Chromium wrong→exact 확인;
  `docs/quality/evidence/task-resolution.md`

### [x] TASK-DELETE-02 delete 요청·실패·redirect

- Requirements: `TASK-DETAIL-05`
- Risk: HIGH 실행 — destructive behavior 검토 필요
- Depends on: `TASK-DELETE-01`, `DEC-DELETE-01`
- Deliverable: exact route ID DELETE, in-flight guard, error 표시, success cache 처리와
  `/task` navigation
- Acceptance: guard 전 요청 0회, 사용자 submit은 1회이며 exact endpoint 전송은
  최초 요청과 auth replay를 합쳐 최대 2회, 200 success에서만 redirect하며 승인된
  목록/dashboard/detail 일관성을 유지한다.
- Automatic verification: MSW integration tests와 request count/cache assertions,
  `./scripts/verify quick`
- Browser verification: wrong/exact ID, network request, failure stay, success redirect
- Status: AI_VERIFIED
- Evidence: delete/recheck 12-case outcome table, cache/page/store/transport tests,
  feature DELETE 1회와 auth replay 포함 최대 2회, 200-only redirect, 404 stay,
  list/detail/dashboard 일관성 Chromium 검증;
  `docs/quality/evidence/task-resolution.md`

### [x] TASK-DETAIL-VIEW-01 task 상세 화면

- Requirements: `TASK-DETAIL-01`
- Risk: LOW — 검증된 detail data의 presentation
- Depends on: `UI-SHELL-01`, `UI-STATE-01`, `TASK-DETAIL-01`
- Deliverable: title, memo와 등록 일시의 responsive detail surface
- Acceptance: 세 field가 의미 있는 hierarchy로 표시되고 registerDatetime은 readable
  text와 원본 `dateTime` 값을 함께 보존하며 두 viewport에서 clipping이 없다.
- Automatic verification: `pnpm vitest run
src/pages/task-detail/task-detail.test.tsx`, `./scripts/verify quick`
- Browser verification: `/task/task-1`, 390x844/1280x720, field/dateTime, hierarchy,
  bearer request와 console/page error
- Status: AI_VERIFIED
- Evidence: session `/root/task_1_implementer`; target `7812b8bfc161ef1d5e9fd45e56edd14dbd6f8951`; focused detail 5/5, `./scripts/verify quick` PASS (38 files/150 tests), Chromium 1280x720·390x844 PASS; title/memo/readable date plus original datetime, bearer GET, overflow 없음과 keyboard focus ring 확인; `docs/quality/evidence/task-resolution.md`

### [x] TASK-DETAIL-RECOVERY-VIEW-01 상세 오류·404 복구 화면

- Requirements: `TASK-DETAIL-02`
- Risk: LOW — 검증된 error states의 presentation
- Depends on: `TASK-DETAIL-VIEW-01`
- Deliverable: 404 목록 복귀와 일반 오류 retry surface
- Acceptance: 404 `errorMessage`와 list action이 일반 error/retry와 구분되고 action을
  keyboard로 실행할 수 있으며 상태 전환 중 shell이 유지된다.
- Automatic verification: `pnpm vitest run
src/pages/task-detail/task-detail.test.tsx`, `./scripts/verify quick`
- Browser verification: `/task/missing`과 recoverable error fixture, 두 viewport,
  recovery action, GET status와 console/page error
- Status: AI_VERIFIED
- Evidence: session `/root/task_2_implementer`; start/target `62189a279ec4724dd1242be2d81834f443cd107a`; focused detail 5/5, `./scripts/verify quick` PASS (38 files/150 tests); Chromium 404 desktop/mobile, Tab→Enter list recovery and deliberate general-error retry PASS; `docs/quality/evidence/task-resolution.md`

### [x] TASK-DELETE-DIALOG-VIEW-01 삭제 확인 modal 화면

- Requirements: `TASK-DETAIL-03`, `TASK-DETAIL-04`
- Risk: MEDIUM — destructive modal과 focus lifecycle
- Depends on: `TASK-DETAIL-VIEW-01`, `TASK-DELETE-01`, `UI-FOUNDATION-01`
- Deliverable: destructive hierarchy와 exact ID form을 가진 삭제 modal
- Acceptance: route ID 안내, input, cancel/confirm이 명확하고 wrong/공백/case-different
  값은 disabled, exact 값만 enabled이며 close/Escape/trap/restore와 mobile overflow를
  검증한다.
- Automatic verification: `pnpm vitest run
src/features/delete-task/ui/delete-task-dialog.test.tsx
src/features/delete-task/model/attempt-guard.test.ts`, `./scripts/verify quick`
- Browser verification: `/task/task-1`, 두 viewport, modal open/wrong/exact/cancel/Escape,
  focus lifecycle, DELETE 0회와 console/page error
- Status: AI_VERIFIED
- Evidence: session `/root/task_3_implementer`; target `d17f7747fc6459ad9838750075518fe395428554`; focused 2 files/5 tests, `./scripts/verify quick` PASS (38 files/150 tests); Chromium 1280x720·390x844 wrong/whitespace/case/exact, DELETE 0, cancel/Escape/trap/restore, overflow 없음; `docs/quality/evidence/task-resolution.md`

### [x] TASK-DELETE-OUTCOME-VIEW-01 삭제 진행·실패·복구 화면

- Requirements: `TASK-DETAIL-05`
- Risk: HIGH 실행 — 승인된 destructive-data policy 준수
- Depends on: `TASK-DELETE-DIALOG-VIEW-01`, `TASK-DELETE-02`,
  `TASK-DETAIL-RECOVERY-VIEW-01`
- Deliverable: delete pending, 404, outcome-unknown, network failure와 success UI
- Acceptance: pending은 input/submit/cancel/Escape를 잠그고 404는 stay/recovery,
  unknown은 GET recheck, network failure는 자동 DELETE 재전송 없이 표시되며 200
  `{ success: true }`만 `/task`로 이동한다.
- Automatic verification: `pnpm vitest run
src/features/delete-task/ui/delete-task-dialog.test.tsx
src/features/delete-task/model/delete-task.test.ts
src/features/delete-task/model/delete-cache.test.ts
src/pages/task-detail/task-detail.test.tsx
src/shared/api/authenticated-request.test.ts`, `./scripts/verify quick`
- Browser verification: `/task/task-1`, exact submit, pending/failure/recheck/success,
  390x844/1280x720, DELETE/GET method·count, redirect와 list/detail/dashboard state,
  console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root/task_4_implementer` task block owner; start SHA
  `2c1234e09e518abdf06b7fbad53e87427aa41a45`; focused 5 files/29 tests와
  `./scripts/verify quick` hook 86·contract 19·Vitest 38 files/150 tests PASS. 기존
  production/model/test가 12-result matrix, direct 404 non-success, GET-only reconciliation,
  cache eviction/retention과 auth replay 최대 2회를 충족해 RED-backed code/test 변경 없음.
  Agent-browser `task-delete-outcome-view-01`의 fresh desktop 1280x720와 mobile
  390x844에서 pending input/submit/cancel/Escape lock, held DELETE failure 뒤
  `DELETE, GET` exists, unknown `DELETE, GET`, manual recheck `DELETE, GET, GET`, 새
  success attempt `DELETE, GET, GET, DELETE`를 exact counter로 확인함. 200 뒤 list의
  task-1 부재, 새 document detail 404와 dashboard `2/1/1`, 두 viewport no-overflow,
  expected bootstrap 401/deleted-detail 404 외 page error 없음; screenshots
  `/tmp/kbhc-task-delete-outcome-view-01-desktop.png`,
  `/tmp/kbhc-task-delete-outcome-view-01-mobile.png`,
  `/tmp/kbhc-task-delete-outcome-view-01-mobile-success.png`; session/server 종료.
  Task self-review target: 위 source SHA와 `.superpowers/sdd/task-4-brief.md`; Checks:
  `DEC-DELETE-01`, pending/404/unknown/exists/stale/success, method counts, cache/store,
  expected console errors, responsive screenshots, diff scope와 TODO dependency. 후속 review가
  exact wrapper 재현 절차와 pending outside-click 근거 누락을 발견함. Corrections: 첫
  role-based fill `TOOLING` 실패는 fresh fixture와 stable CSS selector로 재실행했고,
  correction session `task-delete-outcome-view-01-review`에서 wrapper 원문과 flag/counter
  전이를 보존함. Desktop alertdialog box `384,201–896,519` 밖 `(100,100)`에 실제
  mouse move/down/up click 후에도 dialog open·`aria-busy=true`, Escape lock과 disabled
  controls를 재확인함. Counter reset 뒤 unknown `DELETE, GET`, failure disable 뒤 manual
  recheck `DELETE, GET, GET`, 새 explicit success `DELETE, GET, GET, DELETE`와 `/task`
  이동·task-1 부재를 확인함. Expected bootstrap refresh 401 외 unexpected console/page
  error 없음; product/test 변경 없음. Rerun: focused 5 files/29 tests PASS, browser correction
  전체 흐름 PASS; Verdict: PASS. 상세 기록
  `docs/quality/evidence/task-resolution.md#task-delete-outcome-view-01`

### [x] TASK-DETAIL-JOURNEY-VERIFY-01 task-resolution 통합 검증

- Requirements: `TASK-DETAIL-01`~`TASK-DETAIL-05`
- Risk: MEDIUM — Journey evidence gate
- Depends on: `TASK-DELETE-OUTCOME-VIEW-01`
- Deliverable: current commit의 task-resolution focused, quick, core/browser evidence
- Acceptance: `RES-P1-*`, `RES-E*`가 detail/404/modal/guard/request count/redirect와
  list/detail/dashboard 일관성 evidence에 trace된다.
- Automatic verification: `pnpm vitest run
src/features/delete-task/ui/delete-task-dialog.test.tsx
src/features/delete-task/model/attempt-guard.test.ts
src/features/delete-task/model/delete-task.test.ts
src/features/delete-task/model/delete-cache.test.ts
src/pages/task-detail/task-detail.test.tsx
src/shared/api/authenticated-request.test.ts`, `./scripts/verify quick`,
  `pnpm exec playwright test e2e/task-resolution.spec.ts`
- Browser verification: named `agent-browser` session, existing→missing→recovery→delete,
  두 viewport, modal/network/cache/console
- Status: AI_VERIFIED
- Evidence: 2026-09-02 Codex `/root/task_5_implementer` task block owner; branch
  `docs/task-resolution-journey-design`; start SHA
  `21a0d07c653f3e0f3e5cab158d0f8f78d9538cee`; requirements
  `docs/quality/requirements.md` `TASK-DETAIL-01`~`TASK-DETAIL-05`, spec
  `docs/superpowers/specs/2026-09-02-task-resolution-journey-design.md`, plan
  `docs/superpowers/plans/2026-09-02-task-resolution-journey.md`, execution brief
  `.superpowers/sdd/task-5-brief.md`. Product target
  `21a0d07c653f3e0f3e5cab158d0f8f78d9538cee`; required-order focused 6 files/30
  tests, quick hook 86·contract 19·Vitest 38 files/150 tests, mapped Chromium 1/1,
  named browser `task-detail-journey-verify-01`, full build·core E2E 5/5·verifier
  regression 19/19 PASS. Browser recorded existing fields, missing 404 keyboard recovery,
  non-exact DELETE 0, exact bearer DELETE 1, `/task` redirect, deleted-detail 404,
  dashboard `2/1/1`, desktop/mobile no-overflow and no unexpected page error. Vite
  StrictMode detail GET 2 is disclosed as a development observation, not an invariant;
  service-worker log limits were covered by a method/path/bearer-only page fetch wrapper.
  E2E/product code unchanged; session/server closed. Detailed trace, deliberate 401/404
  separation and self-review PASS:
  `docs/quality/evidence/task-resolution.md#task-detail-journey-verify-01`

### [x] TASK-DETAIL-JOURNEY-REVIEW-01 task-resolution 독립 review

- Requirements: `TASK-DETAIL-01`~`TASK-DETAIL-05`
- Risk: MEDIUM — Journey review gate
- Depends on: `TASK-DETAIL-JOURNEY-VERIFY-01`
- Deliverable: exact target SHA의 fresh task-resolution adversarial review record
- Acceptance: destructive guard, failure recovery, stale result, cache, 접근성,
  weak test와 console/network를 검토하고 HIGH/MEDIUM finding을 모두 수정·재검증한다.
- Automatic verification: `./scripts/verify quick`
- Browser verification: finding이 browser behavior에 영향을 주면 해당 resolution case 재실행
- Status: AI_VERIFIED
- Evidence: Review target:
  `docs/superpowers/plans/2026-09-02-task-resolution-journey.md`,
  `TASK-DETAIL-01`~`TASK-DETAIL-05` / `task-resolution`, exact target
  `0e2488721eff80996a216529a13f01d72b72381b` (product target
  `21a0d07c653f3e0f3e5cab158d0f8f78d9538cee`). Reviewer: Tasks 1~5 최종
  변경 작성자와 분리된 fresh 독립 reviewer
  `/root/task_6_adversarial_reviewer`. Checks: 승인 spec/plan, 원본 requirement,
  OpenAPI GET/DELETE bearer·200/401/404 schema, auth/delete 결정, 관련
  source·test·E2E, 전체 task-resolution evidence와 TODO, screenshot 크기,
  `7812b8bfc161ef1d5e9fd45e56edd14dbd6f8951..0e2488721eff80996a216529a13f01d72b72381b`
  diff, secret/generated/unrelated noise를 검토함. Findings: unresolved HIGH/MEDIUM
  0; LOW `REQUIREMENT` 승인 spec의 `RES-P1-1` `bearer GET 한 번` 문구가
  사람이 승인한 no-exact-count plan/evidence 교정 전 문구로 남아
  있으나 상위 requirement와 제품 수용 기준은 영향 없음; LOW `TEST`
  `/tmp/kbhc-task-detail-view-01-mobile.png`이 기록과 달리 1280x720이지만
  다른 390x844 detail/modal artifact와 수치 기록이 동일 layout을 독립
  입증함. Corrections: 제품·test·이전 owner record 변경 없음;
  request-count-sensitive 기준이 생기면 spec을 재정합하고, 해당 단일
  screenshot provenance가 필수일 때 mobile artifact를 재측정한다. Rerun:
  focused 6 files/30 tests PASS; `./scripts/verify quick` hook 86·contract 19·Vitest
  38 files/150 tests PASS; mapped Chromium 1/1 PASS; setup과 base/HEAD^ diff check
  PASS; server/browser 종료. Verdict: PASS_WITH_LOW (historical) — unresolved HIGH/MEDIUM
  없음; `docs/quality/evidence/task-resolution.md#task-detail-journey-review-01`.
  Follow-up correction review exact target
  `c0d648ccffd6bc88a7b3185c49ca118d151f6483`, reviewer
  `/root/final_branch_reviewer`: full branch
  `3c31324a6cbbe7d950392dd616ebb50580b33c85..c0d648ccffd6bc88a7b3185c49ca118d151f6483`와
  correction
  `cba005e0d292253422b4c0a7957b76997bef700c..c0d648ccffd6bc88a7b3185c49ca118d151f6483`를
  원본 명세, 승인 문서, source/test/E2E와 함께 재검토함. 앞선 Important 2건(spec의
  exact GET-count 문구, TODO 진행 요약)과 screenshot provenance Minor가 모두 해결되어
  unresolved HIGH/MEDIUM/LOW 0, Verdict PASS. 교정 전 동일 product target에서 fresh final
  review focused 6 files/30, full Vitest 150/150·build·core 5/5·verifier 19, mapped 1/1
  PASS; 문서 전용 교정 뒤 quick 150/150와 diff check PASS. Product target이
  `21a0d07c653f3e0f3e5cab158d0f8f78d9538cee`로 동일해 browser/full 재실행은 불필요함.
  Follow-up record:
  `docs/quality/evidence/task-resolution.md#follow-up-correction-review`

### [x] JOURNEY-TASK-DETAIL-01 task-resolution 사람 checkpoint

- Requirements: `TASK-DETAIL-01`~`TASK-DETAIL-05`
- Risk: MEDIUM checkpoint
- Depends on: `TASK-DETAIL-JOURNEY-REVIEW-01`
- Deliverable: task-resolution 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 evidence를 명시적으로 승인한
  경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Automatic verification: review target/evidence/status audit, `./scripts/verify setup`
- Browser verification: `TASK-DETAIL-JOURNEY-VERIFY-01`의 current-commit record를 사람이 검토
- Status: HUMAN_APPROVED
- Evidence: 사람 checkpoint 검토 package. Independent correction review exact
  target `c0d648ccffd6bc88a7b3185c49ca118d151f6483` (verified product target
  `21a0d07c653f3e0f3e5cab158d0f8f78d9538cee`), verdict `PASS`, unresolved
  HIGH/MEDIUM/LOW 0; 앞선 Important 2건과 screenshot provenance Minor 해결. Historical
  `0e2488721eff80996a216529a13f01d72b72381b` `PASS_WITH_LOW`와 follow-up record는
  `docs/quality/evidence/task-resolution.md#task-detail-journey-review-01` 및
  `docs/quality/evidence/task-resolution.md#follow-up-correction-review`. Review한 exact
  source/test는 `src/pages/task-detail/index.tsx`,
  `src/pages/task-detail/task-detail.test.tsx`,
  `src/features/delete-task/model/attempt-guard.ts`와 `.test.ts`,
  `src/features/delete-task/model/delete-task.ts`와 `.test.ts`,
  `src/features/delete-task/model/delete-cache.ts`와 `.test.ts`,
  `src/features/delete-task/ui/delete-task-dialog.tsx`와 `.test.tsx`,
  `src/shared/api/authenticated-request.ts`와 `.test.ts`, `src/shared/api/tasks.ts`와
  `.test.ts`, `src/mocks/fixtures/tasks.ts`와 `.test.ts`,
  `src/mocks/handlers/tasks.ts`와 `.test.ts`, `src/entities/dashboard/model/dashboard-keys.ts`,
  `src/pages/dashboard/index.tsx`, `e2e/task-resolution.spec.ts`. Current evidence는
  focused 6 files/30 tests, quick hook 86·contract 19·Vitest 38 files/150 tests, mapped
  Chromium 1/1, named browser `task-detail-journey-verify-01`, full build·core E2E
  5/5·verifier regression 19/19 PASS를 기록함. `RES-P1-1`~`RES-P1-4`,
  `RES-E1`~`RES-E4`에 대해 1280x720·390x844의 detail/404/modal/pending/failure/recheck/
  success, non-exact DELETE 0·exact success bearer DELETE 1, transport auth replay 최대
  2, unknown 뒤 GET-only recheck와 자동 DELETE 재시도 없음, 성공 후 list/detail/
  dashboard `2/1/1`을 trace함. Screenshot은 named-browser desktop/mobile와 modal/outcome
  artifact, mapped Playwright attachment를 보존하고 failure trace/video policy는 미발동.
  Full-branch base
  `3c31324a6cbbe7d950392dd616ebb50580b33c85..c0d648ccffd6bc88a7b3185c49ca118d151f6483`와
  correction diff
  `cba005e0d292253422b4c0a7957b76997bef700c..c0d648ccffd6bc88a7b3185c49ca118d151f6483`
  review 결과 spec은 authenticated bearer GET과 rendered fields를 요구하되 exact browser
  GET count invariant를 두지 않고, Task 1의 덮어쓴 1280x720 파일은 mobile 증거에서
  제외되며 독립 390x844 artifact·측정치가 responsive behavior를 입증함. 교정 전 동일
  product target에서 focused 6 files/30, full Vitest 150/150·build·core 5/5·verifier 19,
  mapped Chromium 1/1 PASS; 문서 전용 교정 뒤 quick 150/150와 diff check PASS. Product가
  바뀌지 않아 browser/full 재실행은 불필요함. 2026-09-02 사람이 `승인 구현 진행`으로
  current correction-review package target
  `c0d648ccffd6bc88a7b3185c49ca118d151f6483`을 명시적으로 승인함; tracked follow-up
  record commit `2cfda5b655d6b53675cc375cafb3f8001f8a2bdd`. 이 `HUMAN_APPROVED`는 사람의
  명시적 승인 근거를 기록한 것이며 AI의 자체 승인이 아님

## 7. 통합·제출 QA

### [x] QA-CROSS-AUTH-01 Journey 간 인증 전환

- Requirements: `AUTH-07`, `NAV-02`, `NAV-03`, 모든 보호 API requirement
- Risk: MEDIUM — route, auth와 cache의 교차 Journey behavior
- Depends on: `JOURNEY-AUTH-01`, `JOURNEY-WORK-01`,
  `JOURNEY-TASK-LIST-01`, `JOURNEY-TASK-DETAIL-01`
- Deliverable: sign-in, reload, protected direct entry와 terminal 401의 통합 evidence
- Acceptance: current session과 stale session의 route/action/protected cache가 승인된
  auth policy대로 전환되고 Journey 사이에 이전 사용자 UI/data가 남지 않는다.
- Automatic verification: `pnpm vitest run src/app/auth/auth-provider.test.tsx
src/app/auth/auth-route-boundary.test.tsx
src/shared/api/authenticated-request.test.ts src/app/router.test.tsx`,
  `./scripts/verify quick`
- Browser verification: `/sign-in`, `/`, `/task`, `/task/:id`, `/user`에서 sign-in,
  reload, direct entry, terminal 401, 390x844/1280x720과 console/network
- Status: AI_VERIFIED
- Evidence: 2026-09-02 `/root/qa_cross_auth_implementer` task block owner; approved
  product/start target `48300e534516d702a351980e5661b3851ce02a38`, evidence claim
  `0ccdc3c8b5d5acfc281577ffd37c19104c555d6f`. Focused auth/provider/route/request/
  router + authenticated API bridge 5 files/29 tests, quick hook 86·contract 19·Vitest
  38 files/150 tests, mapped auth Chromium 2/2 PASS. Fresh named browser
  `qa-cross-auth-01` verified anonymous direct entry for `/`, `/task`, `/task/task-1`,
  `/user`, protected return/reload, and authenticated dashboard/list/detail/profile at
  1280x720 and 390x844 without prior-route content. Terminal desktop/mobile setup used
  a successful fixture `POST /api/sign-in 200` to replace the handler's accepted access
  token, then reset the app-flow audit after cookie clear; the reset audit was bearer
  `GET /api/task/qa-cross-auth-app-flow-* 401` → contract-intercepted
  `POST /api/refresh 401`, then anonymous `/sign-in`, sign-in-only GNB and no protected/
  prior-user DOM. Provider cases proved all protected-root eviction; the bridge case
  proved task-root eviction, route recovery and unrelated-cache retention.
  `agent-browser cookies clear` could not clear
  the MSW worker cookie store, classified `TOOLING`; refresh-200 diagnostics were excluded
  from PASS and the smallest deterministic page-boundary 401 was used for visible recovery.
  Reproducible commands, redacted wrapper, console/network classification, cleanup and
  screenshot paths: `docs/quality/evidence/final-qa.md#qa-cross-auth-01-journey-간-인증-전환--2026-09-02`

### [x] QA-CROSS-DATA-01 삭제 후 data 일관성

- Requirements: `DASH-01`, `TASK-LIST-01`, `TASK-DETAIL-01`~`TASK-DETAIL-05`
- Risk: MEDIUM — mutation 이후 cross-route state
- Depends on: `JOURNEY-AUTH-01`, `JOURNEY-WORK-01`,
  `JOURNEY-TASK-LIST-01`, `JOURNEY-TASK-DETAIL-01`
- Deliverable: delete 전후 list/detail/dashboard의 mock/query 일관성 evidence
- Acceptance: 성공 삭제 후 list에서 item이 사라지고 detail은 404, dashboard metric은
  감소하며 failure/unknown result는 승인 정책 밖의 mutation이나 redirect를 만들지 않는다.
- Automatic verification: `pnpm vitest run src/mocks/fixtures/tasks.test.ts
src/mocks/handlers/tasks.test.ts
src/features/delete-task/model/delete-cache.test.ts
src/pages/task-detail/task-detail.test.tsx`, `./scripts/verify quick`
- Browser verification: detail delete → list → deleted detail → dashboard, request
  method/count, visible data, 390x844/1280x720과 console/network
- Status: AI_VERIFIED
- Evidence: 2026-09-02 `/root/qa_cross_data_implementer` task block owner; four
  `HUMAN_APPROVED` Journey dependencies confirmed; reviewed start target
  `6f6aacd9f957fade390988caca1e7e8834c9dbfa`, evidence claim target
  `9602f0222c9a274d550f91bf40c4d93c1e6367fa`. Focused fixture/handler/cache/detail
  4 files/19 tests, quick hook 86·contract 19·Vitest 38 files/150 tests, mapped
  task-resolution Chromium 1/1 PASS. Fresh named `qa-cross-data-01` desktop 1280x720
  and mobile 390x844 reset cases each recorded exactly one explicit bearer DELETE 200,
  task-1 list absence with task-2/task-3 retained, direct deleted-detail 404/list
  recovery, dashboard `2/1/1`, no stale task-1 content or horizontal overflow. Expected
  StrictMode GET abort/completion pairs were separated from the one DELETE; page errors
  were empty, only the deliberate 404 console resource line remained. The unchanged
  reviewed task-resolution target supplies explicit reused failure/unknown nonmutation,
  nonredirect and no-auto-DELETE proof; no fresh browser rerun is claimed for it.
  Reproducible redacted audit, reset boundaries, screenshots, console/network
  classification and cleanup:
  `docs/quality/evidence/final-qa.md#qa-cross-data-01-삭제-후-data-일관성--2026-09-02`

### [x] QA-RESPONSIVE-A11Y-01 전체 route 접근성·반응형 sweep

- Requirements: 전체 UI requirement와 접근성 invariant
- Risk: MEDIUM — application-wide interaction review
- Depends on: `QA-CROSS-AUTH-01`, `QA-CROSS-DATA-01`
- Deliverable: 다섯 route와 modal의 responsive/accessibility evidence
- Acceptance: 390x844/1280x720과 keyboard-only에서 heading/landmark/label/focus,
  modal trap/restore, clipping, scroll trap과 상태의 비색상 구분에 unresolved finding이 없다.
- Automatic verification: `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx
src/features/sign-in/ui/sign-in-form.test.tsx
src/widgets/dashboard-summary/dashboard-summary.test.tsx
src/widgets/user-profile/user-profile.test.tsx
src/widgets/task-list/task-list.test.tsx
src/pages/task-detail/task-detail.test.tsx
src/features/delete-task/ui/delete-task-dialog.test.tsx`, `./scripts/verify quick`
- Browser verification: named `agent-browser` route sweep, 두 viewport, keyboard,
  modal, virtual scroll, screenshot, console/network
- Status: AI_VERIFIED
- Evidence: 2026-09-02 `/root/qa_responsive_a11y_implementer` initial task block owner;
  `/root/qa_a11y_fix_recovery` recovery owner;
  reviewed start target `1cba1e1258f96a96e3966d508a22f977fb13f8e5`, claim/browser/
  automatic target `8b2ba83b90379758b33105a045f4dc7085449f23`. Exact focused 7
  files/30 tests, quick hook 86·contract 19·Vitest 38 files/150 tests, mapped
  auth-entry/task-discovery/task-resolution Chromium 4/4 PASS. Fresh named browser
  `qa-responsive-a11y-01` swept `/sign-in`, `/`, `/task`, `/task/task-1`, `/user`와
  idle delete modal at 1280x720/390x844: one main/named nav, h1/labels/action names,
  `aria-current`, keyboard-visible focus, Card Enter route, exact-ID disabled guard,
  exact-enabled modal 3-control focus wrap/Escape/trigger restore, viewport-contained
  modal and no horizontal clipping PASS. Reviewer correction의 fresh 40-record mobile
  keyboard run에서 focused Card에 PageDown/End를 누르면 scrollTop은 `0→224`/
  `0→3280`, mounted rows는 6/40으로 bounded, terminal task-40은 keyboard focus 가능했으나
  virtual row unmount 직후 focus가 `BODY`로 손실됐다. Root cause는
  `src/widgets/task-list/index.tsx`의 `overscan: 0` + `virtualItems`-only render와
  scroll section에 stable focus node/이관 처리가 없는 점이다. `UX_ACCESSIBILITY`
  finding의 behavior-changing correction은 HIGH 사람 결정이 필요하다. Option 1
  (recommended)은 named scroll region을 visible-focus `tabIndex=0` keyboard target으로
  만들기, option 2는 focused row 보존/인접 row focus 이관이다. Expected anonymous
  refresh 401 외 page error 없음; MSW network-monitor omission은 `TOOLING`; screenshot
  dimensions, session/server cleanup and closed port verified. 2026-09-02 사용자가
  exact decision target `f7d6f0949d6f4414f581effe22b7b32b34a38718`의 option 1을
  `1로 진행`으로 명시 승인했다. RED 1 file/7 중 PageDown·End 2 fail 뒤 exact
  implementation target `2099c745b0076f09f1eb42f2bcafb573415d26fc`에서 GREEN
  task-list 7/7, focused 7 files/32, quick hook 86·contract 19·Vitest 38/152,
  mapped task-discovery Chromium 1/1 PASS. Fresh 40-record named browser의
  390x844/1280x720에서 region과 다음 Card의 2px keyboard focus, Card PageDown
  `0→224`/`0→284`, terminal End `3280`/`3340`, focus non-BODY, mounted 6/40,
  width 일치와 console/page error 없음이 확인되어 correction을 PASS로 닫았다. Full record:
  `docs/quality/evidence/final-qa.md#qa-responsive-a11y-01-전체-route-접근성반응형-sweep--2026-09-02`

### [x] QA-CONTRACT-01 OpenAPI·MSW·client 최종 대조

- Requirements: `SYS-04`와 모든 API requirement
- Risk: MEDIUM — 제출 mock/API contract 통합
- Depends on: `QA-CROSS-AUTH-01`, `QA-CROSS-DATA-01`
- Deliverable: 일곱 OpenAPI operation의 generated/MSW/client trace
- Acceptance: method, path/query, auth scheme, success/error status와 schema가
  `assignment-original/openapi.yaml`과 일치하고 독자 endpoint/field/status가 없다.
- Automatic verification: `pnpm api:types:check`, `pnpm vitest run
src/shared/api/openapi-contract.test.ts src/shared/api/auth.test.ts
src/shared/api/dashboard.test.ts src/shared/api/user.test.ts
src/shared/api/tasks.test.ts src/mocks/handlers/tasks.test.ts
src/mocks/handlers/user.test.ts`, `./scripts/verify quick`
- Browser verification: 네 Journey network record에서 실제 method/path/query/status와
  bearer/cookie boundary 대조
- Status: AI_VERIFIED
- Evidence: 2026-09-02 `/root/qa_contract_implementer` task block owner; reviewed
  start target `6e57f9a64c4e277de3b813b2b75413b9d93fb753`, claim
  `b5d9102d62533d03c0f42534adf7386658500d4f`. `pnpm api:types:check`, exact 7-file
  contract suite 25/25, quick hook 86·verifier 19·Vitest 38 files/152 tests가
  PASS했지만 negative additional-property boundary가 없어 OAS
  `additionalProperties: false`와 runtime 수용 behavior의 차이를 검출하지
  못했다. Runtime 영향 4건은 추가 key가 있는 token response의 auth state
  성립, 추가 key가 있는 401/error의 HTTP·refresh·terminal 경로 진입,
  추가 key가 있는 `{ success: true }`의 destructive success navigation/cache 전환,
  추가 key가 있는 sign-in request의 200/session 생성이다. 일곱 operation
  success response 경계와 10개 non-2xx `ErrorResponse` 분기의 client guard가 추가
  key를 수용하며 `TaskListResponse` 내 `TaskItem`도 같다.
  문서화된 key만 사용하는 현재 happy path의 method/path/query/auth/status/schema는
  일치하며 변함없다. 권장 option 1은 request·success·error의 exact key를
  runtime에서 거부하고 negative contract test를 추가한다. Option 2는 forward-compatible
  추가 key 수용을 OAS 예외로 명시 승인한다. 둘 다 계약 behavior
  결정이므로 HIGH 사람 결정 대기 중이며 product/test는 변경하지 않았다.
  결정 질문은 "OAS `additionalProperties: false`를 runtime에서 강제할까요?"이며
  응답은 `1`(strict 강제, 권장) 또는 `2`(forward-compatible OAS 예외)다.
  2026-09-02 사용자가 exact decision target
  `3a9bb04bbbe04aec55ba616627c93e3c63020df6`에 option `1`을 명시 승인해
  strict exact-key 경계와 negative contract test 교정을 진행했다. TDD RED는
  approval record `efdcd722e41e792767ee2ce728883b65208c4a2b`에서 focused 5 files/25
  중 정확히 9 fail·16 pass로 아홉 schema boundary의 추가 key 수용을 재현했다.
  Exact implementation target `fcffc7abd9a05e7e7c45de0ba879ffdfc3c087a9`는 새
  dependency 없이 `Object.keys`/`Object.hasOwn`으로 request·success·nested item·error의
  exact key를 강제했다. GREEN focused 5 files/25, task 지정 7 files/33,
  `pnpm api:types:check`, quick hook 86·verifier 19·Vitest 38 files/161,
  mapped auth-entry/task-resolution Chromium 3/3 PASS. Schema-conforming happy path는
  변함없으며 invalid boundary를 integration이 직접 증명해 fresh named browser는
  추가하지 않았다. 승인 리뷰 target
  `d9b563f20678c47fb62bf32953dae9048a421b40`의 verdict는 `PASS_WITH_LOW`였다.
  Minor는 task-detail extra-key case의 `registerDatetime: "now"`가 OAS-valid field까지
  없애 실패 원인을 혼합한 점이었다. Correction/test target
  `a1fa0a4a682720acb49a0a232b314d8a35fc48f5`에서 기존 RFC3339 fixture로
  교체해 추가 `id` key만 실패 원인으로 격리했고 task API 7/7,
  exact focused 5 files/25, format/diff check가 PASS했다. Product code는 변경하지
  않았다. Tracked evidence/claim target은
  `15c83206313617d87bdf7552667830c09a6bb6f0`이다.
  재현 명령·영향 4건·선택지:
  `docs/quality/evidence/final-qa.md#qa-contract-01-openapimswclient-최종-대조--2026-09-02`

### [x] QA-01 requirement evidence와 상태 정합성

- Requirements: 전체
- Risk: MEDIUM
- Depends on: `JOURNEY-AUTH-01`, `JOURNEY-WORK-01`,
  `JOURNEY-TASK-LIST-01`, `JOURNEY-TASK-DETAIL-01`,
  `QA-RESPONSIVE-A11Y-01`, `QA-CONTRACT-01`
- Deliverable: `docs/quality/requirements.md`의 자동/browser evidence와 status 갱신
- Acceptance: 모든 row가 재현 가능한 명령 또는 browser record를 가리키고 AI가
  `HUMAN_APPROVED`를 기록하지 않는다.
- Automatic verification: requirement ID/상태/evidence 정적 audit,
  `./scripts/verify setup`
- Browser verification: evidence 경로 존재와 대상 commit 확인
- Status: AI_VERIFIED
- Evidence: claim base `0bd4fc347ef4059c503d01cf200da4a20b254307`, exact audit
  target `e990930586c286092b31948312385808733a4429`. Read-only Python stdlib parser와
  `git ls-files`/`rg`/`git blame` audit 결과 ID 27/27 unique, allowed status 27/27
  (`AI_VERIFIED` 26, `IN_PROGRESS` 1), automatic evidence 27/27, browser evidence
  tracked path 26/27와 명시적 `—` 1/27, path reference 30/30(고유 9개), Markdown
  heading와 requirement ID/range coverage 26/26 PASS. 네 checkpoint는 각각
  auth-entry 8, work-overview 5, task-discovery 5, task-resolution 5개 row를
  `AI_VERIFIED`로 연결하고, corresponding Journey는 explicit person provenance와 함께
  `HUMAN_APPROVED`; requirement row에는 AI가 기록한 `HUMAN_APPROVED` 0건. Final-owned
  `SYS-01`/`SYS-02`/`SYS-04`는 `AI_VERIFIED`, 사람 검증·publication/final acceptance가
  남은 `SYS-05`는 `IN_PROGRESS`가 맞아 표 수정 없음. `QA-RESPONSIVE-A11Y-01`과
  `QA-CONTRACT-01` `AI_VERIFIED`, setup과 diff check PASS. Matrix와 재현 방법:
  `docs/quality/evidence/final-qa.md#qa-01-requirement-evidence와-상태-정합성--2026-09-02`.
  QA-02/QA-HARNESS-01/QA-03/QA-04와 최종 사람 acceptance는 별도 owner 범위이며 이
  task가 완료 또는 `HUMAN_APPROVED`로 전환하지 않음. Independent review target
  `5e07e8c8c222924636479ca79ce690b2cf25bc9b`, range
  `e990930586c286092b31948312385808733a4429..5e07e8c8c222924636479ca79ce690b2cf25bc9b`;
  reviewer `/root/final_branch_reviewer`는 final author와 분리된 fresh independent
  reviewer. 27/27 parser·path·heading·ID trace, 네 approval blame/provenance, 여섯
  dependency, `SYS-05`, setup hook 86·verifier 19, diff check와 clean status를
  재검토함. Findings 없음; Corrections N/A; 같은 read-only audit과 setup 재실행 PASS;
  Verdict: PASS. 상세 후속 기록:
  `docs/quality/evidence/final-qa.md#qa-01-independent-review-follow-up`

### [x] QA-02 journey 간 full adversarial review

- Requirements: 전체 invariant와 Golden Journey
- Risk: MEDIUM
- Depends on: `QA-01`; `JOURNEY-AUTH-01`, `JOURNEY-WORK-01`,
  `JOURNEY-TASK-LIST-01`, `JOURNEY-TASK-DETAIL-01`의 `HUMAN_APPROVED`
- Deliverable: auth transition, navigation, stale cache, API error, OAS/MSW,
  accessibility, responsive, test 중복 review findings와 correction
- Acceptance: fresh context review finding마다 class, root cause, correction, rerun이
  있고 unresolved high/medium finding이 없다.
- Automatic verification: 영향 test와 `./scripts/verify quick` 재실행
- Browser verification: 교차 journey regression, console/network, mobile/desktop
- Status: AI_VERIFIED
- Evidence: Review target: exact source target
  `6c097ad52018fc7f89e9589743cd801cee9387a7`; claim commit
  `d55e0516fc9056625a44dfe2af3df094d38ac23c`. Reviewer: fresh independent
  `/root/qa_full_adversarial_reviewer`, source·test·evidence 최종 작성과 분리됨.
  Checks: 원본 requirement/OpenAPI, 27 requirement row, 네 Journey spec/plan/evidence,
  auth·route·query/cache·API/MSW·상태·반응형/접근성·E2E·diff·비밀정보·TODO provenance를
  대조하고 focused, quick, 네 mapped Chromium Journey와 두 실제 browser probe를 수행.
  Findings: MEDIUM `INTEGRATION` — `TaskDetailResponse.registerDatetime`가 OAS
  `date-time`인지 검증되지 않아 invalid 200이 상세 render를 중단함; MEDIUM
  `UX_ACCESSIBILITY` — virtual Card의 `Home` scroll 뒤 row가 unmount되면 focus가
  `BODY`로 손실됨. Corrections: review-only owner는 product/test를 변경하지 않음;
  최소 date-time boundary test/guard와 역방향 virtual-scroll focus handoff test/fix가
  필요. Rerun: `api:types:check`, focused 3 files/19, quick hook 86·verifier 19·Vitest
  38 files/161, mapped Chromium 5/5 PASS이나 두 browser reproduction은 FAIL 유지.
  Verdict: BLOCKED — unresolved MEDIUM 2건. 상세 record:
  `docs/quality/evidence/final-qa.md#qa-02-journey-간-full-adversarial-review--2026-09-02`
  Supplemental diagnosis target
  `69f36fb8da6cc892f72a1c22dce82808dde97b02`: fresh 1280x720/40-record
  matrix에서 `Home` 1920→0/task-24 unmount/`BODY`, `End`
  0→3340/task-1 unmount/region, `PageUp` 1920→1460/task-26 unmount/`BODY`,
  `PageDown` 1920→2380/task-21 unmount/region, `ArrowUp`
  1920→1880/task-26 unmount/`BODY`, `ArrowDown`
  2000→2040/task-21 unmount/`BODY`, `Space`
  1920→2380/task-21 unmount/`BODY`, `Shift+Space`
  1920→1460/task-26 unmount/`BODY`를 확인. 안정 handoff의 최소 key family는
  `ArrowDown`, `ArrowUp`, `End`, `Home`, `PageDown`, `PageUp`, `" "`이며 기존 두
  key에 다섯 key를 추가해야 한다. Home-only는 PageUp/ArrowUp/ArrowDown/Space/
  Shift+Space sibling defect를 남긴다. 저장소 date-time pattern은 없지만 direct
  Zod 4.5.2의 `z.iso.datetime({ offset: true })`를 canonical API boundary에
  재사용할 수 있다. `Date.parse`와 UI fallback은 strict OAS guard를 대신하지 못하고,
  fallback-only는 invalid cached data를 남긴다. Zod는 leap second와 lowercase
  `t/z` 같은 rare RFC3339 form을 좁게 거부한다. HIGH 결정 질문은
  `1`(권장: Zod canonical boundary rejection + full 7-key family handoff)과
  `2`(narrow: UI fallback + Home-only; OAS-invalid cache와 sibling focus defect를
  명시적으로 남기는 exception 필요) 중 선택이다. QA-02는 `BLOCKED`, product/test와
  `HUMAN_APPROVED`는 변경 없음. 2026-09-02 사용자가 exact decision target
  `f9e65daceca3d34f39b61b840432c4f102f8ae62`에서 "zod로 검증으로 진행"을
  명시 승인했다. Finding 1은 direct Zod 4.5.2의
  `z.iso.datetime({ offset: true })` API-boundary correction `IN_PROGRESS`; rare valid
  RFC3339 form 축소 caveat는 유지한다. Finding 2의 full 7-key focus handoff는
  승인되지 않아 unresolved MEDIUM으로 유지하며 QA-02는 `[ ]`/`BLOCKED`다.
  Finding 1 correction target `491cf14381555988bc9741c539b702a44bbb0a54`에서 TDD
  RED task API 1 fail/7 pass를 재현한 뒤 direct Zod 한 조건으로 invalid date-time을
  거부했다. GREEN task API 8/8, tasks+detail page 2 files/13,
  `api:types:check`, quick hook 86·verifier 19·Vitest 38 files/162, mapped
  task-resolution Chromium 1/1, build PASS. Fresh named `qa02-datetime-fix`
  production preview 1280x400에서 schema-shaped invalid-date GET 200이 RangeError/page
  error 없이 app shell을 유지한 `invalid-response` 복구 UI와 사용 가능한
  `다시 불러오기`로 전환됐고 click 후 request audit 2건을 확인했다.
  Finding 1은 `RESOLVED`; rare valid RFC3339 축소 caveat는 유지한다. Finding 2는
  수정하지 않은 unresolved MEDIUM이므로 QA-02는 `[ ]`/`BLOCKED`를 유지한다.
  Finding 1 reviewer target `394bd7c8c35d2218b9d7ad79b2c95388eb43af67`의
  verdict는 `APPROVE_WITH_MINOR`: Zod가 `-00:00`을 거부한다는 evidence 주장만
  실제 probe와 불일치했다. 해당 주장을 제거하고 실제 거부되는 leap second와
  lowercase `t/z` caveat만 유지했다. 제품/테스트와 Finding 1 `RESOLVED`, Finding 2
  unresolved MEDIUM, QA-02 `[ ]`/`BLOCKED` 상태는 불변이다.
  Partial-decision reconciliation target
  `a192c00a19e477f379b44f3df3e5030ac9c50567`: date-time은 사용자 Zod 승인과
  독립 재검토를 거쳐 `RESOLVED`; focus finding만 unresolved다. Home-only는 8-key
  matrix상 root-cause correction이 아니므로 선택지에서 제거했다. 남은 HIGH 질문은
  `1`(권장: 기존 PageDown/End를 포함한 full 7-key family `ArrowDown`, `ArrowUp`,
  `End`, `Home`, `PageDown`, `PageUp`, `" "`에서 descendant Card→stable region
  synchronous handoff + parameterized tests + native-scroll/browser verification)과
  `2`(exception: 현재 PageDown/End only를 유지하고 Home/PageUp/ArrowUp/ArrowDown/
  Space/Shift+Space focus loss를 final acceptance exception으로 명시 승인) 중
  선택이다. 결정·correction·독립 rerun 전까지 QA-02는 `[ ]`/`BLOCKED`; product/test와
  `HUMAN_APPROVED`는 변경 없음.
  2026-09-02 사용자가 exact decision target
  `728edaa26dd457eb55eafb49f5f6e7094f3f2f55`의 option 1을 `1`로 명시 승인했다.
  Full seven-key family synchronous handoff와 parameterized test, native browser
  verification correction은 `IN_PROGRESS`; 독립 corrected-target re-review 전까지
  QA-02는 `[ ]`/`BLOCKED`이며 `HUMAN_APPROVED`는 변경 없음.
  Finding 2 implementation/test target
  `cef5e7e91e2f324063ad0abab66dc103f1ead0d1`: TDD RED task-list 1 file/12 중
  new Home·PageUp·ArrowUp·ArrowDown·Space 5 fail, 기존 두 key와 나머지 7 pass 뒤
  기존 한 branch의 key 조건만 full seven-key family로 확장했다. GREEN task-list
  12/12, focused a11y 7 files/37, quick hook 86·verifier 19·Vitest 38/167, mapped
  task-discovery Chromium 1/1, build PASS. Fresh production preview의 40-record
  1280x720/390x844 eight-physical-key matrix에서 모든 focused row가 native scroll로
  unmount된 뒤 active element는 visible 2px-ring named region을 유지했고, 한 key의
  delta는 Arrow ±40, Page/Space desktop ±460·mobile ±520와 Home/End boundary로
  double scroll 없이 일치했다. Mounted 6~7/40, width exact, console/page errors 0,
  screenshot dimensions와 cleanup/closed port를 확인했다. Finding 2는 `RESOLVED`,
  QA-02는 corrected-target 독립 re-review 준비 상태이나 완료 전까지 `[ ]`/`BLOCKED`다.
  Final corrected-target Review target:
  `49ae7c26115da15c95cbae99eb34097c54b9574a`. Reviewer/independence: original fresh
  reviewer `/root/qa_full_adversarial_reviewer`; 두 승인·product/test correction·browser
  evidence를 작성하지 않음. Checks: 원본 finding과 전체 SHA chain, Zod boundary,
  exact seven-key descendant-only handoff, RED 신빙성, 16 native browser result,
  cross-Journey regression, diff/TODO/provenance를 재검토. Findings: HIGH/MEDIUM 없음;
  LOW `TEST` — 첫 quick에서 unrelated dialog 두 test가 5초 timeout했으나 해당 두 파일
  단독 5/5와 즉시 full quick 38/167에서 재현되지 않음. Corrections: Finding 1은
  `491cf14381555988bc9741c539b702a44bbb0a54`/`a192c00a19e477f379b44f3df3e5030ac9c50567`,
  Finding 2는 `cef5e7e91e2f324063ad0abab66dc103f1ead0d1`에서 `RESOLVED`; reviewer는
  product/test를 변경하지 않음. Rerun: focused tasks+task-list 2 files/20, isolated
  timeout files 2/5, quick hook 86·verifier 19·Vitest 38/167, current-build mapped 네
  Journey Chromium 5/5, setup/diff/clean PASS. Verdict: `PASS_WITH_LOW`; 두 original
  MEDIUM은 해소되어 QA-02를 `AI_VERIFIED`로 전환하며 `HUMAN_APPROVED`나 final
  acceptance를 주장하지 않음. 상세 record:
  `docs/quality/evidence/final-qa.md#qa-02-corrected-target-independent-follow-up--2026-09-02`

### [x] QA-HARNESS-01 최종 검증 하네스 강화

- Requirements: 전체 verification contract, `SYS-05`
- Risk: LOW — accepted behavior를 바꾸지 않는 검증 도구 보강
- Depends on: `QA-02`
- Deliverable: 비어 있지 않은 네 core Journey 선택, verifier self-test stage,
  fresh Playwright server, Node 25 MSW warning 제거, 최신 full-gate evidence
- Acceptance: core E2E가 없거나 Journey tag가 빠지면 setup이 실패하고,
  verifier regression test가 재귀 없이 canonical setup에서 실행되며, local full도
  기존 4173 server를 재사용하지 않고 MSW web-storage warning 없이 통과한다.
- Automatic verification: focused `tests/test_verify.py`, focused MSW Vitest,
  `./scripts/verify quick`, `./scripts/verify full`, `git diff --check`
- Browser verification: fresh Vite server에서 네 core Journey와 console/network 결과
- Status: AI_VERIFIED
- Evidence: 2026-08-31 Codex `/root` task block owner; RED에서 보호 Journey의
  `/api/sign-in` 호출, local focused-test 허용, 완료 task의 미완료 dependency,
  canonical full의 `tests/test_verify.py` 누락을 재현. `07323d0`, `9a5ff67`,
  `e01c9c2`에서 독립 auth fixture, focused-test 차단, TODO 의미 검사와 guarded
  verifier regression stage 구현; fresh read-only reviewer
  `/root/harness_independent_review`가 target `e01c9c2`에서 MEDIUM 3건을 발견하고,
  `9cabebf`에서 MSW HttpOnly cookie-store, parser adversarial case, runtime config
  assertion correction을 확인해 findings none/PASS. Canonical `./scripts/verify full`
  PASS — hook 86, contract 12, Vitest 34 files/122 tests, build, core Chromium 5,
  verifier regression 19; `git diff --check`와 clean status 확인. `QA-02`가 실제 사람
  checkpoint 근거 부재로 BLOCKED이므로 기존 결과는 baseline으로만 보존하고
  dependency 해소 후 최신 HEAD에서 full gate를 재실행해야 상태 전환 가능;
  `docs/quality/evidence/final-qa.md`. 2026-09-02 `/root`가 QA-02 completion target
  `fd0ed596c3e1f3c5a633f0b4eddfe4ece4433f1b`에서 dependency 해소를 확인하고 최신
  HEAD full-gate 재검증을 시작함. Claim target
  `df157e6fae0f4aa1c8426589ebc81a5913ba74f6`의 첫 full은 outer Vitest 38 files/167
  tests와 core Chromium 5/5 뒤 verifier regression 내부 nested quick에서 delete dialog
  단일 test의 5초 timeout을 재현해 `TEST`로 분류했다. Product/config/timeout을 바꾸지
  않고 `468619abc2d9d3c6e370fbc6ec86da9b45d146b4`에서 byte-exact value matrix와 pending
  interaction을 두 test로 분리했다. Focused dialog 5회 연속 각 5/5, full Vitest 2회
  연속 각 38 files/168 tests, corrected canonical `./scripts/verify full` PASS — hook 86,
  verifier contract 19, outer Vitest 38/168, build, fresh core Chromium 5/5, verifier
  regression 19/19. MSW web-storage warning 없음, 기존 non-failing chunk-size warning만
  존재, diff check와 clean status PASS. Exact evidence:
  `docs/quality/evidence/final-qa.md#qa-harness-01-latest-full-gate--2026-09-02`;
  exact review target `8ff7bbd268b72b2af392b706f447c37c91ebd87a`의 fresh read-only
  `/root/qa_harness_latest_reviewer`가 verifier regression 18/19 FAIL을 재현했다.
  Nested quick의 5초 timeout 대상이 단독 1/1·430ms PASS인
  `shadcn-primitives.test.tsx`로 이동해, dialog 분리만으로 suite-level 병렬 자원 경합을
  해결하지 못했다는 MEDIUM `TEST` finding이다. QA-HARNESS는 `IN_PROGRESS`를 유지하며
  Vitest worker 상한의 최소 contract 보정과 corrected canonical full 재검증 대기.
  TDD correction `2853ff72f825d7ba987b716dc0e5b7594acb3530`에서 harness-config
  `maxWorkers === 4` assertion이 RED `undefined`로 실패한 뒤 existing Vitest config에
  한 줄 상한을 추가해 GREEN 7/7. Timeout/pool/product/dependency는 변경하지 않았다.
  Full unit 2회 연속 38 files/169 tests PASS(9.44s, 10.05s), nested quick contract 2회
  연속 PASS(22.50s, 20.20s), corrected canonical full PASS — hook 86, verifier contract
  19, outer Vitest 38/169, build, fresh core Chromium 5/5, verifier regression 19/19.
  Final Review target `fe3da84da54603b853fa7ea17f3f4d3f5223e59f`; Reviewer:
  correction/evidence를 작성하지 않은 fresh read-only `/root/qa_harness_latest_reviewer`;
  Checks: `673db8f..fe3da84` exact diff, `maxWorkers: 4` RED/GREEN, dialog assertion과
  interaction 보존, 전체 harness acceptance, 제품/config/dependency 경계; Findings:
  HIGH/MEDIUM/LOW 없음; Corrections: 이전 MEDIUM `TEST`는 중앙 Vitest worker 상한 한
  줄과 contract test로 해소; Rerun: reviewer full unit 38/169, nested quick 1/1,
  harness config 7/7, dialog 5/5, setup hook 86+contract 19, diff/status clean PASS;
  Verdict: PASS — `HUMAN_APPROVED`나 final acceptance를 주장하지 않음

### [x] QA-03 제출 산출물과 AI disclosure

- Requirements: `SYS-05`
- Risk: MEDIUM
- Depends on: `QA-02`
- Deliverable: 정확한 README/실행 정보, `AI_USAGE.md`, 사람이 검토한 공개 record,
  clean submission diff
- Acceptance: 도구/model/범위/prompt 요약/사람 검증 항목이 정확하고 비밀정보,
  pending record, debug output, unrelated artifact가 제출에 없다.
- Automatic verification: `./scripts/verify setup`, secret/generated-noise scan,
  `git diff --check`
- Browser verification: 적용 없음
- Status: AI_VERIFIED
- Evidence: `AI_USAGE.md` 필수 section과 자동 검증, branch diff의 secret/debug/
  generated/unrelated scan PASS; 기존 `legacy/pre-policy` records는 문서상 사람 검토
  대기이며 네 사람 검증 checkbox도 미체크; AI record 검토·게시는 사람 TTY 승인 필요.
  2026-09-02 Codex `/root` task block owner; `QA-02` dependency 해소 뒤 README 실행 정보,
  공개 managed record/index/disclosure 일치, pending/noise/secret 범위의 최신 감사를
  실행했다. `9f2bc9f522cf1987b8054eb1b9cb30b09deba462`에서 Node/pnpm install, dev,
  production preview, MSW, test account와 세 verify mode를 README에 정확히 기록했다.
  Managed artifact 17개는 모두 `human-reviewed` metadata가 있고 index/AI_USAGE 각 17개
  link와 exact 일치, ignored pending file 0, generated/lockfile diff와 tracked runtime
  noise 0, product debug statement 0, format/setup/diff check PASS. 그러나 현재 receipt가
  없는 legacy artifact 두 개가 제출 tree에 남아 current scanner의
  `unredacted_secret` BLOCKING review 대상이고, AI_USAGE 사람 검증 checkbox 네 개도
  미체크다. 두 기록을 사람이 직접 검수해 승인 또는 제출 제외하고 checklist를 확인할
  때까지 QA-03은 BLOCKED; AI는 TTY selection/publication·삭제·사람 체크를 대신하지 않음.
  Human decision: 2026-09-02 사용자가 권장안 1, 두 legacy record 제출 제외를 명시
  승인. `7b44edb5fc40ea2cd6516ea35272d3a040154c6e`에서 두 file과 disclosure link,
  legacy 보존 assertion만 제거했다. RED setup은 legacy 보존 2건 FAIL; GREEN focused
  ProjectWiring 6/6, quick hook 85·verifier 19·Vitest 38/169, committed setup, diff/clean
  PASS. 현재 tracked artifact는 human-reviewed managed 17개뿐이고 link/metadata exact,
  pending file 0. Human checklist decision: 2026-09-02 사용자가 네 항목을 직접 확인하고
  선택 1로 모두 승인. `9b051e558a7e696721d03eb578dc3fd8d011518f`에서 네 checkbox를
  `[x]`로 반영하고, 항상 미체크를 강제하던 wiring assertion을 미체크/체크 합계 4개
  계약으로 변경했다. RED focused 1 failure, GREEN focused 1/1, quick hook 85·verifier
  19·Vitest 38/169, diff/clean PASS. Final Review target:
  `2a94d8025edc3d67e253e48f7fb9f9d39f88ecca`; Reviewer: 변경 작성에 참여하지 않은
  read-only `/root/qa_submission_reviewer`; Checks: README/runtime 명령, 공개
  artifact/index/AI_USAGE 17/17/17 일치와 metadata, legacy 제외 범위, 네 사람 확인
  checkbox, local link, secret/debug/generated/noise, 승인 경계; Findings: HIGH/MEDIUM/LOW
  없음; Corrections: 없음; Rerun: setup hook 85·verifier 19, quick Vitest 38/169,
  `git diff --check main...2a94d80`, exact target diff/status clean PASS; Verdict: PASS.
  `HUMAN_APPROVED`나 final acceptance를 주장하지 않음.
  상세: `docs/quality/evidence/final-qa.md#qa-03-submission-and-ai-disclosure-audit--2026-09-02`

### [x] QA-04 final verification과 사람 acceptance 요청

- Requirements: 전체
- Risk: HIGH — 최종 완료는 사람 소유
- Depends on: `QA-02`, `QA-03`, `QA-HARNESS-01`, `JOURNEY-AUTH-01`, `JOURNEY-WORK-01`,
  `JOURNEY-TASK-LIST-01`, `JOURNEY-TASK-DETAIL-01`
- Deliverable: intended submission commit의 full 검증·browser evidence·최종 QA 보고
- Acceptance: `docs/quality/workflow.md` Final QA Checklist 전체가 충족되고
  `./scripts/verify full`이 read-only로 통과하며 사람이 최종 acceptance를 결정한다.
- Automatic verification: `./scripts/verify full`
- Browser verification: 네 core journey의 최종 commit evidence, console/network,
  accessibility, responsive spot check
- Status: HUMAN_APPROVED
- Evidence: `./scripts/verify full` PASS on `8a09746` — setup 79 tests, 33 Vitest
  files/118 tests, build, Chromium core 5건; 네 Journey의 tracked 사람 승인 근거가
  없어 checkpoint 미승인, `QA-02`/`QA-03`과 사람 최종 acceptance 대기.
  2026-09-03 Codex `/root` task block owner; `QA-02`, `QA-03`, `QA-HARNESS-01`과
  네 Golden Journey 의존성이 모두 해소되어 제출 예정 target `ca3d603`에서 canonical
  full 검증, browser evidence, adversarial review를 시작한다. QA-04는 사람 소유이므로
  자동 검증 중에도 `BLOCKED`를 유지하며, 최종 acceptance는 사람 checkpoint 전까지
  미승인 상태를 유지한다. 첫 claim 편집에서 status를 `IN_PROGRESS`로 두어 setup verifier
  18/19 FAIL; 사람 소유 task 허용 상태 계약 위반으로 `REQUIREMENT` 분류하고 `BLOCKED`로
  즉시 복구해 setup 19/19 PASS. Claim target
  `65196671c378073af43cf68314d906ca3b83c514`의 canonical `./scripts/verify full` PASS —
  hook 85, verifier contract 19, format/lint/typecheck, Vitest 38 files/169 tests, build,
  fresh Chromium core 5/5, verifier regression 19/19. Core는 네 Journey tag, console/page
  error assertion과 390x844 responsive case를 포함한다. Product/E2E는 QA-02 corrected
  target 뒤 불변이므로 기존 desktop/mobile accessibility·responsive matrix를 재사용한다.
  요구사항 27개 status/evidence, 네 `HUMAN_APPROVED` checkpoint, assignment/generated
  immutability와 branch diff check도 PASS. 상세:
  `docs/quality/evidence/final-qa.md#qa-04-final-gate-candidate--2026-09-03`.
  Final Review target: `383f834bdd13729dde89837c399136ec245481c1`; Reviewer:
  최종 변경 작성에 참여하지 않은 read-only `/root/qa_final_completion_reviewer`;
  Checks: 원본 requirement/OpenAPI, 전체 branch diff, 27 requirements, 네 Journey와
  cross/final QA chain, task-resolution Zod/seven-key/delete/auth/cache, core browser,
  OAS/MSW/client, README/AI records, secret/debug/generated/noise, 사람 소유 경계;
  Findings: HIGH/MEDIUM/LOW 없음; Corrections: 없음; Rerun: exact target canonical full
  exit 0 — hook 85, verifier 19, Vitest 38/169, build, fresh Chromium 5/5, verifier
  regression 19/19; requirement 27/27, Journey 4/4, artifact/index/disclosure 17/17/17,
  scanner/pending/non-managed/assignment/generated/package/diff/status audit PASS;
  Verdict: PASS. 필수 plan-completion adversarial review 완료. Human decision:
  2026-09-03 사용자가 최종 acceptance 요청에 선택 1로 명시 승인했다.

### [x] NAV-SELECTED-LINE-01 navigation selected 표시선 제거

- Requirements: `NAV-01`, `NAV-03`
- Risk: LOW — selected 표현의 국소 CSS 변경
- Depends on: `NAV-PRIMARY-01`, `AUTH-NAV-01`
- Deliverable: mobile 상단선과 desktop 좌측선 제거, selected 배경색과
  `aria-current` 유지
- Acceptance: 모든 navigation action에서 viewport별 selected 선이 사라지고 기존
  배경색, route semantics, keyboard focus와 layout이 유지된다.
- Automatic verification: focused shell/router test, `./scripts/verify quick`, mapped
  `e2e/work-overview.spec.ts`
- Browser verification: 390×844/1280×720 selected navigation의 pseudo-element,
  배경색, `aria-current`, focus, console/error 확인
- Status: AI_VERIFIED
- Evidence: 2026-09-03 Codex `/root`; branch `fix/nav-selected-line`; start SHA
  `be409b0bca978298f2a37c9ce650df9870bc8f07`; 사용자가 pseudo-element class 제거,
  별도 선 부재 test 생략, selected 배경색 유지 설계를 명시 승인. Baseline
  `./scripts/verify quick` PASS — hook 85, verifier 19, Vitest 38 files/169 tests.
  Implementation `67c7dc2`: focused shell/router 2 files/9 tests, quick hook 85·verifier
  19·Vitest 38/169, mapped work-overview Chromium 1/1 PASS. Agent-browser
  `nav-selected-line-01`의 1280×720/390×844에서 current background와
  `aria-current`, 2px focus, exact viewport width를 유지하고 `::before`가
  `content: none`, transparent, auto size임을 확인했다. 익명 bootstrap의 expected
  refresh 401 뒤 buffer를 clear한 최종 console/page-error는 비었고 session과 Vite
  server를 종료했다. Screenshot과 전체 record:
  `docs/quality/evidence/work-overview.md#nav-selected-line-01`. Plan-completion review
  target `67c7dc2`; reviewer `/root` explicit inline second-pass; 공통 active branch,
  selected background/semantics/focus, test·dependency 최소성, evidence/TODO와 diff를
  재검토해 findings 없음. `git diff --check`와 setup hook 85·verifier 19 PASS;
  Verdict: PASS. Completion gate의 제품 검증은 통과했으나 설계 문서 EOF 빈 줄로
  range diff check가 실패해 `TOOLING`으로 분류하고 `01bfa05`에서 한 줄 제거. 동일
  gate rerun은 focused 9/9, quick 38/169, mapped Chromium 1/1, range diff와 clean
  status 모두 PASS. `HUMAN_APPROVED`나 final acceptance는 새로 기록하지 않음.

### [x] REM-AUTH-ID-01 인코딩된 task ID 인증 경로 교정

- Requirements: `AUTH-07`, `NAV-03`, `TASK-LIST-05`, `TASK-DETAIL-01`
- Risk: HIGH — 보호 route와 로그인 복귀 경로의 task ID 허용 범위
- Depends on: `QA-04`
- Deliverable: encoded slash ID의 보호 경로 판정, 안전한 복귀와 회귀 test
- Acceptance: `task/A`가 `/task/task%2FA`로 상세 조회되고 anonymous 진입은 로그인
  뒤 같은 URL로 복귀하며 외부 URL과 raw 다중 segment는 계속 거부된다.
- Automatic verification: return-to/auth boundary/router Vitest, auth-entry Playwright,
  `./scripts/verify quick`
- Browser verification: anonymous encoded route, 로그인 복귀, reload와 상세 표시
- Status: AI_VERIFIED
- Evidence: 2026-09-03 Codex `/root` task block owner; 사용자가 encoded slash ID 지원과
  `docs/superpowers/specs/2026-09-03-review-remediation-design.md`를 명시 승인;
  isolated worktree `fix/review-remediation`; baseline `./scripts/verify quick` PASS;
  RED return-to/auth boundary 2 files 4 FAIL은 `/task/task%2FA`가 root fallback 또는
  비보호 route로 남는 기존 결함을 재현; raw single-segment 판정 후 GREEN 관련 3 files
  30 PASS; 저장 fixture `task/A`를 사용한 auth-entry Chromium 2/2 PASS로 anonymous
  direct entry, sign-in 후 `/task/task%2FA` 복귀와 reload 상세 표시 확인;
  `./scripts/verify quick` PASS — hook 85, verifier 19, Vitest 38 files/173 tests

### [x] REM-RESPONSIVE-01 긴 task 문자열 반응형 표시

- Requirements: `TASK-DETAIL-01`, `TASK-DETAIL-03`, `TASK-DETAIL-04`
- Risk: MEDIUM — OpenAPI상 길이 제한 없는 문자열의 모바일 표시
- Depends on: `REM-AUTH-ID-01`
- Deliverable: title, memo와 삭제 확인 ID의 container 내 줄바꿈과 회귀 test
- Acceptance: 390x844에서 500자 공백 없는 값을 표시해도 document와 dialog overflow가
  없고 원본 값과 exact delete guard가 보존된다.
- Automatic verification: task detail/delete dialog Vitest, `./scripts/verify quick`
- Browser verification: 390x844 detail와 delete dialog bounding rect
- Status: AI_VERIFIED
- Evidence: 2026-09-03 Codex `/root` task block owner; `REM-AUTH-ID-01` 완료 후 착수;
  RED detail/dialog 2 files 2 FAIL로 500자 공백 없는 title과 ID의 overflow class 누락
  재현; title, memo와 dialog ID에 `min-w-0` 및 `overflow-wrap:anywhere`만 추가한 뒤
  GREEN 2 files/12 tests; 첫 quick은 dialog test 한 줄 Biome format 차이로
  `TOOLING` FAIL, `pnpm run format`이 해당 1 file만 수정한 diff를 검토하고 재실행;
  corrected `./scripts/verify quick` PASS — hook 85, verifier 19, Vitest 38 files/175 tests;
  실제 mobile bounding rect는 `REM-FINAL-01` browser evidence에서 확인

### [x] REM-MOCK-CONTRACT-01 저장된 mock task 계약 검증

- Requirements: `SYS-04`, `TASK-LIST-01`, `TASK-DETAIL-01`
- Risk: MEDIUM — 제출 API 대체 구현의 OAS 응답 정합성
- Depends on: `REM-RESPONSIVE-01`
- Deliverable: exact key, status와 RFC 3339를 검증하는 sessionStorage 복원 경계
- Acceptance: 추가 key, 잘못된 status/date-time 또는 malformed JSON은 응답에 섞이지
  않고 기본 fixture로 복구되며 유효 저장 값과 삭제 persistence는 유지된다.
- Automatic verification: fixture/handler/task API Vitest, `./scripts/verify quick`
- Browser verification: 적용 없음 — 저장 경계 integration test가 위험을 직접 증명
- Status: AI_VERIFIED
- Evidence: 2026-09-03 Codex `/root` task block owner; `REM-RESPONSIVE-01` 완료 후 착수;
  RED fixture 1 file/5 중 extra key와 invalid date-time 2 FAIL, 기존 invalid status와
  malformed JSON fallback은 PASS; installed Zod `strictObject`와
  `z.iso.datetime({ offset: true })` 한 경계로 교정; GREEN fixture/handler/API 3 files
  25 tests; `./scripts/verify quick` PASS — hook 85, verifier 19, Vitest 38 files/179 tests

### [x] REM-BOOTSTRAP-01 mock 시작 실패 복구

- Requirements: `SYS-04`
- Risk: LOW — worker 시작 실패 시 blank root를 복구 UI로 교체
- Depends on: `REM-MOCK-CONTRACT-01`
- Deliverable: 성공 application mount와 실패/reload 경계를 가진 bootstrap
- Acceptance: worker 성공 전 application을 렌더링하지 않고 rejection은 한국어 alert와
  다시 시도 button을 표시하며 click은 reload를 한 번 요청한다.
- Automatic verification: bootstrap/architecture Vitest, `./scripts/verify quick`
- Browser verification: production preview 정상 bootstrap과 console/page error
- Status: AI_VERIFIED
- Evidence: 2026-09-03 Codex `/root` task block owner; `REM-MOCK-CONTRACT-01` 완료 후 착수;
  RED bootstrap test는 새 module 부재로 suite FAIL; worker 성공 후 app render, rejection
  후 failure render와 한국어 alert/reload button을 최소 callback 경계로 구현;
  GREEN bootstrap/architecture 2 files/5 tests; 첫 quick은 `main.tsx` 들여쓰기 한 곳의
  Biome format 차이로 `TOOLING` FAIL, formatter 1-file diff 검토 후 corrected
  `./scripts/verify quick` PASS — hook 85, verifier 19, Vitest 39 files/182 tests

### [ ] REM-VERIFY-01 read-only 구조 검사와 국소 dead code 정리

- Requirements: 전체 architecture와 verification contract
- Risk: LOW — 제품 동작을 바꾸지 않는 test fixture 위치와 미사용 표면 정리
- Depends on: `REM-BOOTSTRAP-01`
- Deliverable: repository 밖 Biome fixture, 최소 AttemptGuard API와 dialog trigger
- Acceptance: architecture test 전후 repository status가 같고 allowed/blocked import
  판정과 delete attempt의 중복·stale 방지가 그대로 통과한다.
- Automatic verification: architecture/attempt/dialog Vitest, diff/status check,
  `./scripts/verify quick`
- Browser verification: task-resolution dialog focus와 delete Journey 회귀
- Status: IN_PROGRESS
- Evidence: 2026-09-03 Codex `/root` task block owner; `REM-BOOTSTRAP-01` 완료 후 착수

### [ ] REM-FINAL-01 코드 리뷰 후속 수정 최종 검증

- Requirements: 위 후속 수정의 전체 requirement와 Golden Journey
- Risk: HIGH — 계획 완료 review와 사람 checkpoint 뒤 최종 상태 전이
- Depends on: `REM-AUTH-ID-01`, `REM-RESPONSIVE-01`, `REM-MOCK-CONTRACT-01`,
  `REM-BOOTSTRAP-01`, `REM-VERIFY-01`
- Deliverable: plan-completion adversarial review, browser evidence, canonical full QA
- Acceptance: unresolved HIGH/MEDIUM finding이 없고 quick, mapped Journey, browser probe와
  `./scripts/verify full`이 통과하며 사람 checkpoint 결과를 과대 표시하지 않는다.
- Automatic verification: focused test, `./scripts/verify quick`, `./scripts/verify full`,
  `git diff --check`
- Browser verification: encoded auth return과 390x844 long-string detail/dialog
- Status: NOT_STARTED
- Evidence: 구현 전
