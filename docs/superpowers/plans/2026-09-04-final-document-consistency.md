# 최종 문서 정합성 검토 Implementation Plan

> **For agentic workers:** 현재 runtime은 subagent 사용을 금지하므로 Codex `/root`가 이 계획을 순서대로 직접 실행한다. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 제출 문서 전체를 원본 명세, OpenAPI, 실제 코드·명령·상태·evidence와 대조해 깨진 참조와 현재형 모순을 제거한다.

**Architecture:** `README.md`, `AI_USAGE.md`, 핵심 기획·품질 문서와 `TODO.md`를 현재 기준 문서로 보고, 과거 spec/plan/evidence는 이력으로 보존한다. 일회성 표준 라이브러리 검사로 Markdown 링크·로컬 경로·명령·Requirement ID·TODO 상태를 전수 확인하고 확인된 문서만 최소 수정한다.

**Tech Stack:** Markdown, Python 3 표준 라이브러리, ripgrep, repository verifier.

## Global Constraints

- `assignment-original/`과 두 OpenAPI 계약, generated 파일, 제품 코드와 dependency를 변경하지 않는다.
- 과거 계획과 evidence의 당시 수치·실패 기록은 현재 수치로 덮어쓰지 않는다.
- AI는 `HUMAN_APPROVED`나 최종 사람 acceptance를 기록하지 않는다.
- 검증은 focused 정적 audit → `pnpm verify setup` → `pnpm verify quick` 순서로 실행한다.

---

### Task 1: 현재 문서와 참조 전수 검사

**Files:**
- Inspect: `README.md`, `AI_USAGE.md`, `TODO.md`
- Inspect: `docs/**/*.md`, `assignment-original/*`, `package.json`, `src`, `e2e`

**Interfaces:**
- Consumes: 원본 명세, OpenAPI, 현재 repository tree와 TODO status grammar
- Produces: broken link/path, stale command/version/route/account/status와 source-priority 모순 목록

- [x] **Step 1: Markdown 링크와 로컬 경로를 검사한다**

Python 표준 라이브러리로 `README.md`, `AI_USAGE.md`, `TODO.md`, `docs/**/*.md`의 상대 Markdown 링크를 해석하고 존재하지 않는 target을 출력한다. `http(s)`, anchor-only와 예시 placeholder는 제외한다.

- [x] **Step 2: 현재형 사실을 실제 구현과 대조한다**

`package.json`의 버전·script, router route, MSW 계정, OpenAPI operation, E2E Journey와 핵심 문서의 표·명령·경로를 `rg`와 직접 비교한다.

- [x] **Step 3: TODO와 requirement 상태를 검사한다**

`pnpm verify setup`과 별도 stable ID·dependency·evidence link 검사를 실행해 상태 원장과 핵심 문서가 같은 현재 상태를 가리키는지 확인한다.

### Task 2: 확인된 문서 모순 최소 교정

**Files:**
- Modify: Task 1에서 실제 모순이 확인된 Markdown 파일만

**Interfaces:**
- Consumes: Task 1의 재현 가능한 finding
- Produces: 원본·제품 동작을 바꾸지 않는 최소 문서 diff

- [x] **Step 1: 각 finding의 authoritative source를 기록한다**

원본/OpenAPI가 우선인 계약, 현재 코드가 우선인 실행 경로, TODO가 우선인 상태를 구분하고 과거 이력은 수정 대상에서 제외한다.

- [x] **Step 2: 현재형 모순만 수정한다**

깨진 link/path, 실행되지 않는 command, 잘못된 현재 버전·route·account·status만 수정한다. 새 문서 계층이나 검증 script는 만들지 않는다.

- [x] **Step 3: focused audit를 재실행한다**

Task 1의 동일 명령으로 finding이 사라지고 새 broken reference가 생기지 않았는지 확인한다.

### Task 3: 통합 검증과 문서 review evidence

**Files:**
- Modify: `TODO.md`
- Modify: `docs/quality/evidence/final-qa.md`

**Interfaces:**
- Consumes: 교정된 문서 target과 focused audit 결과
- Produces: seven-field plan-completion review, 재현 명령과 최종 사람 checkpoint 경계

- [x] **Step 1: canonical 검증을 실행한다**

Run: `pnpm verify quick`

Expected: hook/verifier, format, lint, OpenAPI type check, TypeScript와 전체 Vitest PASS.

- [x] **Step 2: frozen target을 적대적으로 재검토한다**

중복, source priority, 현재/과거 시제, 링크, 경로, 명령, 상태, 수치, AI disclosure와 무관한 product diff를 다시 확인한다.

- [x] **Step 3: review evidence와 사람 checkpoint 후보를 기록한다**

`docs/quality/evidence/final-qa.md`에 Review target, Reviewer, Checks, Findings,
Corrections, Rerun, Verdict를 기록하고 TODO는 `IN_PROGRESS`로 유지한다.

- [x] **Step 4: 사람 checkpoint를 요청한다**

교정 diff, focused audit, quick gate와 적대적 검토 결과를 제시한다. 사람 응답 전에는
`DOCS-FINAL-CONSISTENCY-01`을 완료하거나 `AI_VERIFIED`로 전환하지 않는다.

- [x] **Step 5: 승인 뒤 full review와 최종 read-only gate를 실행한다**

Run: `pnpm verify full && pnpm verify setup && git diff --check`

Expected: full과 setup PASS, whitespace error 0, 제품·OpenAPI·generated·dependency diff 0.
그 결과를 evidence에 추가한 뒤 `DOCS-FINAL-CONSISTENCY-01`을 `AI_VERIFIED`로 전환한다.
