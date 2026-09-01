# Journey Implementation Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 로직 검증 이력을 보존하면서 실제 UI 구현, Journey 검증, 독립 review와 사람 checkpoint가 순서대로 실행되는 세부 작업을 `TODO.md`에 추가한다.

**Architecture:** 제품 code와 accepted behavior는 변경하지 않는다. `TODO.md`에 공통 UI 기반과 네 Journey의 user-visible 구현·통합 검증·독립 review task를 추가하고 기존 `JOURNEY-*` task는 사람 checkpoint 전용으로 좁힌다. `tests/test_verify_contract.py`가 새 dependency graph와 status를 canonical setup에서 검증한다.

**Tech Stack:** Markdown, Python `unittest`, repository `scripts/verify`

## Global Constraints

- `assignment-original/`은 수정하지 않는다.
- 기존 `[x]` task와 Evidence는 삭제하거나 상태를 낮추지 않는다.
- auth, delete, architecture, dependency와 accepted behavior를 변경하지 않는다.
- 새 implementation·verification·review task는 `[ ]`, `Status: NOT_STARTED`, `Evidence: 없음`으로 시작한다.
- 기존 네 `JOURNEY-*` task와 미완료 dependency를 가진 final QA task는 `[ ]`, `Status: BLOCKED`로 기록한다.
- task block은 `Requirements`, `Risk`, `Depends on`, `Deliverable`, `Acceptance`, `Automatic verification`, `Browser verification`, `Status`, `Evidence`를 모두 가진다.
- browser task는 `390x844`와 `1280x720`, console/network 확인을 acceptance에 포함한다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.
- 커밋 메시지는 Conventional Commits와 한글 설명을 사용한다.

---

## File Map

- Modify: `tests/test_verify_contract.py` — 세분화된 backlog ID, dependency와 초기 status의 setup 계약
- Modify: `TODO.md` — 공통 UI, 네 Journey와 통합 QA의 실행 가능한 backlog
- Read: `docs/superpowers/specs/2026-09-01-journey-implementation-backlog-design.md` — 승인된 상태·작업 경계
- Do not modify: application source, package dependencies, `assignment-original/`

## Interfaces

- `TODO.md` consumes: 기존 `AI_VERIFIED` 로직 task와 승인된 backlog 설계
- `TODO.md` produces: dependency-resolved `UI-FOUNDATION-01`부터 시작하는 Journey 실행 graph
- `tests/test_verify_contract.py` consumes: canonical `TODO.md`
- `./scripts/verify setup` produces: task ID, status, dependency, checkpoint gate가 유지된다는 read-only evidence

---

### Task 1: 세부 backlog 계약을 RED로 고정한다

**Files:**
- Modify: `tests/test_verify_contract.py`
- Test: `tests/test_verify_contract.py`

**Interfaces:**
- Consumes: `TODO.md` heading, `Depends on`, `Status` 형식
- Produces: `test_repository_todo_contains_granular_journey_backlog`

- [ ] **Step 1: `re` import와 repository backlog 계약 test를 추가한다**

`tests/test_verify_contract.py`의 import에 `re`를 추가하고 `VerifyContractTests`에
다음 test를 추가한다.

```python
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
        "DASHBOARD-VIEW-01": ({"UI-SHELL-01", "UI-STATE-01", "DASH-01"}, "NOT_STARTED"),
        "PROFILE-VIEW-01": ({"UI-SHELL-01", "UI-STATE-01", "USER-01"}, "NOT_STARTED"),
        "WORK-NAV-RESPONSIVE-01": (
            {"DASHBOARD-VIEW-01", "PROFILE-VIEW-01"},
            "NOT_STARTED",
        ),
        "WORK-JOURNEY-VERIFY-01": ({"WORK-NAV-RESPONSIVE-01"}, "NOT_STARTED"),
        "WORK-JOURNEY-REVIEW-01": ({"WORK-JOURNEY-VERIFY-01"}, "NOT_STARTED"),
        "JOURNEY-WORK-01": ({"WORK-JOURNEY-REVIEW-01"}, "BLOCKED"),
        "TASK-CARD-VIEW-01": ({"UI-FOUNDATION-01", "TASK-PAGE-01"}, "NOT_STARTED"),
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
        "QA-HARNESS-01": ({"QA-02"}, "BLOCKED"),
        "QA-03": ({"QA-02"}, "BLOCKED"),
        "QA-04": (
            {
                "QA-02",
                "QA-03",
                "JOURNEY-AUTH-01",
                "JOURNEY-WORK-01",
                "JOURNEY-TASK-LIST-01",
                "JOURNEY-TASK-DETAIL-01",
            },
            "BLOCKED",
        ),
    }

    for task_id, (dependencies, status) in expected.items():
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
        self.assertIn(f"- Status: {status}", block, task_id)
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
```

- [ ] **Step 2: RED를 확인한다**

Run:

```bash
python3 -m unittest tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog -v
```

Expected: FAIL at `UI-FOUNDATION-01` because the new backlog is not in `TODO.md`.

---

### Task 2: 공통 UI와 auth/work Journey backlog를 추가한다

**Files:**
- Modify: `TODO.md`
- Test: `tests/test_verify_contract.py`

**Interfaces:**
- Consumes: verified `SCF-05`, `ARCH-02`, auth/dashboard/user logic task
- Produces: dependency-resolved `UI-FOUNDATION-01` and auth/work implementation chains

- [ ] **Step 1: backlog migration task를 등록하고 소유한다**

Phase 0 마지막에 다음 block을 추가한다.

```markdown
### [ ] PLAN-JOURNEY-BACKLOG-01 Journey 구현 백로그 세분화

- Requirements: 전체 Journey의 실행 단위와 evidence contract
- Risk: LOW — accepted behavior를 바꾸지 않는 실행 원장 보강
- Depends on: `PLAN-01`, `FLOW-REVIEW-01`
- Deliverable: 공통 UI, 네 Journey 구현·검증·review와 통합 QA의 세부 TODO graph
- Acceptance: 기존 완료 이력을 보존하고 dependency-resolved `NOT_STARTED` task가
  있으며 Journey review와 사람 checkpoint가 분리되고 setup 계약이 이를 검증한다.
- Automatic verification: focused verifier contract test, `./scripts/verify setup`,
  `./scripts/verify quick`, `git diff --check`
- Browser verification: 적용 없음 — 원장 설계 변경
- Status: IN_PROGRESS
- Evidence: 2026-09-01 Codex `/root` task block owner; 승인된 design
  `docs/superpowers/specs/2026-09-01-journey-implementation-backlog-design.md`와 plan
  `docs/superpowers/plans/2026-09-01-journey-implementation-backlog.md`
```

- [ ] **Step 2: phase summary를 실제 상태로 바꾼다**

`TODO.md`의 현재 진행 요약에서 단계 2~7을 다음 의미로 갱신한다.

```markdown
| 2. 공통 구조 | provider/router/API 기반 + 실제 UI shell/state | IN_PROGRESS — 로직 기반 검증, UI backlog 시작 전 |
| 3. auth-entry | 화면 구현·통합 검증·review 후 사람 checkpoint | IN_PROGRESS — 로직 기반만 검증 |
| 4. work-overview | 화면 구현·통합 검증·review 후 사람 checkpoint | IN_PROGRESS — 로직 기반만 검증 |
| 5. task-discovery | 화면 구현·통합 검증·review 후 사람 checkpoint | IN_PROGRESS — 로직 기반만 검증 |
| 6. task-resolution | 화면 구현·통합 검증·review 후 사람 checkpoint | IN_PROGRESS — 로직 기반만 검증 |
| 7. 통합·제출 QA | 네 checkpoint와 full QA 후 사람 최종 acceptance | BLOCKED — Journey UI 구현 전 |
```

- [ ] **Step 3: 공통 UI task 세 개를 phase 2 마지막에 추가한다**

다음 block을 그대로 추가한다.

```markdown
### [ ] UI-FOUNDATION-01 공통 interactive UI와 surface
- Requirements: `SYS-02`, `SYS-03`, 공통 접근성 invariant
- Risk: LOW — 기존 token과 채택 stack 안의 UI 표현
- Depends on: `SCF-05`, `ARCH-02`
- Deliverable: button, input, card/surface, focus, disabled/error 표현의 공통 기반
- Acceptance: representative control이 semantic token만 사용하고 keyboard focus,
  disabled와 error를 color 외 text/semantics로 구분한다. 기존 저장소와 공식 shadcn
  registry를 먼저 조사하며 새 runtime dependency는 추가하지 않는다.
- Automatic verification: focused shared UI component test,
  `src/test/theme-contract.test.ts`, `./scripts/verify quick`
- Browser verification: `/sign-in`, 390x844/1280x720, keyboard focus와 disabled/error
- Status: NOT_STARTED
- Evidence: 없음

### [ ] UI-SHELL-01 반응형 application shell
- Requirements: `NAV-01`, `NAV-02`, `NAV-03`, `SYS-03`
- Risk: LOW — 기존 router/auth action의 presentation
- Depends on: `UI-FOUNDATION-01`, `AUTH-NAV-01`
- Deliverable: responsive navigation과 page content shell
- Acceptance: 다섯 route에서 dashboard/task와 인증 action이 유지되고 current route,
  hover/focus가 구분되며 390x844/1280x720에서 clipping이 없다.
- Automatic verification: app-shell/router component test, `./scripts/verify quick`
- Browser verification: `/`, `/sign-in`, `/task`, `/task/task-1`, `/user`, 두 viewport,
  keyboard navigation, computed Pretendard, console/page error
- Status: NOT_STARTED
- Evidence: 없음

### [ ] UI-STATE-01 공통 비동기 상태 표현
- Requirements: loading, empty, recoverable error, success 공통 invariant
- Risk: LOW
- Depends on: `UI-FOUNDATION-01`
- Deliverable: 실제 반복되는 loading, empty, error/retry 상태 UI
- Acceptance: loading live status, error alert/retry, empty message가 layout을 유지한다.
  두 소비처 이상이 생길 때만 shared UI로 올리고 generic framework는 만들지 않는다.
- Automatic verification: focused component test, `./scripts/verify quick`
- Browser verification: 첫 소비 Journey에서 390x844/1280x720 상태별 확인
- Status: NOT_STARTED
- Evidence: 없음
```

- [ ] **Step 4: auth implementation/verify/review task를 기존 checkpoint 앞에 추가한다**

다음 exact mapping으로 다섯 block을 추가한다. 공통 초기값은
`Status: NOT_STARTED`, `Evidence: 없음`이다.

```text
AUTH-VIEW-01
  requirements: AUTH-01~AUTH-05
  risk: LOW
  depends: UI-SHELL-01, UI-STATE-01, AUTH-UI-01
  deliverable: 로그인 page/form 화면
  acceptance: invalid 경계, label/error 연결, valid/pending, 두 viewport keyboard
AUTH-ERROR-VIEW-01
  requirements: AUTH-06
  risk: MEDIUM
  depends: AUTH-VIEW-01, AUTH-API-01
  deliverable: 로그인 오류 modal 화면
  acceptance: 400 errorMessage, close/Escape, trap/restore, modal overflow
AUTH-SESSION-UX-01
  requirements: AUTH-07, NAV-02, NAV-03
  risk: MEDIUM
  depends: AUTH-ERROR-VIEW-01, AUTH-STATE-01, UI-STATE-01
  deliverable: 인증 초기화·실패·복귀 화면
  acceptance: bootstrap, unavailable/retry, protected return, reload session
AUTH-JOURNEY-VERIFY-01
  requirements: NAV-02, AUTH-01~AUTH-07
  risk: MEDIUM
  depends: AUTH-SESSION-UX-01
  deliverable: auth-entry current-commit 통합 evidence
  acceptance: AUTH-P1/P2/E focused, quick, core/browser evidence
AUTH-JOURNEY-REVIEW-01
  requirements: NAV-02, AUTH-01~AUTH-07
  risk: MEDIUM
  depends: AUTH-JOURNEY-VERIFY-01
  deliverable: auth-entry 독립 review record
  acceptance: exact SHA fresh review, HIGH/MEDIUM finding 0
```

구현 task의 automatic verification은 관련 기존 test file과 새 focused test,
`./scripts/verify quick`을 명시한다. verify task는 auth focused Vitest와
`pnpm exec playwright test e2e/auth-entry.spec.ts`, named agent-browser를 명시한다.
review task는 plan-completion review evidence 필드 전체를 acceptance로 둔다.

- [ ] **Step 5: 기존 `JOURNEY-AUTH-01`을 checkpoint 전용으로 바꾼다**

```markdown
- Depends on: `AUTH-JOURNEY-REVIEW-01`
- Deliverable: auth-entry 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 auth-entry evidence를 검토해
  명시적으로 승인한 경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Status: BLOCKED
- Evidence: 기존 baseline evidence를 보존하고 새 review와 사람 승인 대기라고 추가
```

- [ ] **Step 6: work-overview implementation/verify/review task를 추가하고 checkpoint를 바꾼다**

다음 exact mapping으로 다섯 block을 추가한다. 공통 초기값은
`Status: NOT_STARTED`, `Evidence: 없음`이다.

```text
DASHBOARD-VIEW-01
  requirements: DASH-01
  risk: LOW
  depends: UI-SHELL-01, UI-STATE-01, DASH-01
  deliverable: responsive metric state surface
  acceptance: 3개 label/value와 loading/error/retry/success 구분
PROFILE-VIEW-01
  requirements: USER-01
  risk: LOW
  depends: UI-SHELL-01, UI-STATE-01, USER-01
  deliverable: responsive profile state surface
  acceptance: name/memo와 loading/error/retry/success 구분
WORK-NAV-RESPONSIVE-01
  requirements: SYS-03, NAV-01, NAV-03
  risk: MEDIUM
  depends: DASHBOARD-VIEW-01, PROFILE-VIEW-01
  deliverable: 인증 후 세 route responsive navigation
  acceptance: current route/content와 keyboard navigation, 두 viewport, Pretendard
WORK-JOURNEY-VERIFY-01
  requirements: SYS-03, NAV-01, NAV-03, DASH-01, USER-01
  risk: MEDIUM
  depends: WORK-NAV-RESPONSIVE-01
  deliverable: work-overview current-commit 통합 evidence
  acceptance: WORK-P1/E focused, quick, core/browser evidence
WORK-JOURNEY-REVIEW-01
  requirements: SYS-03, NAV-01, NAV-03, DASH-01, USER-01
  risk: MEDIUM
  depends: WORK-JOURNEY-VERIFY-01
  deliverable: work-overview 독립 review record
  acceptance: exact SHA fresh review, HIGH/MEDIUM finding 0
```

기존 `JOURNEY-WORK-01`은 다음 값으로 바꾼다.

```markdown
- Depends on: `WORK-JOURNEY-REVIEW-01`
- Deliverable: work-overview 사람 checkpoint 기록
- Acceptance: current target review가 PASS이고 사람이 evidence를 명시적으로 승인한
  경우에만 사람이 `HUMAN_APPROVED`를 기록한다.
- Status: BLOCKED
```

---

### Task 3: task Journey와 통합 QA backlog를 추가한다

**Files:**
- Modify: `TODO.md`
- Test: `tests/test_verify_contract.py`

**Interfaces:**
- Consumes: verified task list/detail/delete logic와 공통 UI backlog
- Produces: task-discovery, task-resolution, final QA dependency chain

- [ ] **Step 1: task-discovery implementation/verify/review task를 추가한다**

다음 task를 기존 `JOURNEY-TASK-LIST-01` 앞에 추가한다.

```text
TASK-CARD-VIEW-01
  requirements: TASK-LIST-02, TASK-LIST-05
  risk: LOW
  depends: UI-FOUNDATION-01, TASK-PAGE-01
  deliverable: interactive task card surface
  acceptance: title/memo hierarchy, whole-card exact link, visible focus/hover
TASK-LIST-VIRTUAL-UX-01
  requirements: TASK-LIST-03
  risk: MEDIUM
  depends: TASK-CARD-VIEW-01, TASK-PAGE-03
  deliverable: production scroll viewport
  acceptance: 96px 제거, responsive multi-row viewport, bounded DOM, stable scroll
TASK-LIST-PAGING-UX-01
  requirements: TASK-LIST-04
  risk: MEDIUM
  depends: TASK-LIST-VIRTUAL-UX-01, TASK-PAGE-02
  deliverable: automatic pagination feedback
  acceptance: automatic end trigger, one in-flight, partial error retry, terminal stop
TASK-LIST-STATES-01
  requirements: TASK-LIST-01, TASK-LIST-04
  risk: LOW
  depends: TASK-LIST-PAGING-UX-01, UI-STATE-01
  deliverable: initial/empty/error/terminal list states
  acceptance: initial loading/empty/error, partial error, terminal/success 분리
TASK-LIST-JOURNEY-VERIFY-01
  requirements: TASK-LIST-01~TASK-LIST-05
  risk: MEDIUM
  depends: TASK-LIST-STATES-01
  deliverable: task-discovery current-commit 통합 evidence
  acceptance: DISC-P1/E, exact pages, bounded DOM, real scroll/navigation evidence
TASK-LIST-JOURNEY-REVIEW-01
  requirements: TASK-LIST-01~TASK-LIST-05
  risk: MEDIUM
  depends: TASK-LIST-JOURNEY-VERIFY-01
  deliverable: task-discovery 독립 review record
  acceptance: exact SHA fresh review, HIGH/MEDIUM finding 0
```

모든 구현 task는 focused component/integration test와 `./scripts/verify quick`을,
browser task는 `/task`, `/task/task-3`, 두 viewport, scroll, console/network를
명시한다.

기존 `JOURNEY-TASK-LIST-01`은 `TASK-LIST-JOURNEY-REVIEW-01`에 의존하는
`BLOCKED` 사람 checkpoint로 바꾼다.

- [ ] **Step 2: task-resolution implementation/verify/review task를 추가한다**

다음 task를 기존 `JOURNEY-TASK-DETAIL-01` 앞에 추가한다.

```text
TASK-DETAIL-VIEW-01
  requirements: TASK-DETAIL-01
  risk: LOW
  depends: UI-SHELL-01, UI-STATE-01, TASK-DETAIL-01
  deliverable: task detail responsive surface
  acceptance: title/memo/readable date, original dateTime 보존, responsive hierarchy
TASK-DETAIL-RECOVERY-VIEW-01
  requirements: TASK-DETAIL-02
  risk: LOW
  depends: TASK-DETAIL-VIEW-01
  deliverable: detail 404/error recovery surface
  acceptance: 404 list recovery와 일반 error retry 분리
TASK-DELETE-DIALOG-VIEW-01
  requirements: TASK-DETAIL-03, TASK-DETAIL-04
  risk: MEDIUM
  depends: TASK-DETAIL-VIEW-01, TASK-DELETE-01, UI-FOUNDATION-01
  deliverable: destructive confirmation modal surface
  acceptance: destructive hierarchy, exact ID, cancel/confirm, focus, mobile overflow
TASK-DELETE-OUTCOME-VIEW-01
  requirements: TASK-DETAIL-05
  risk: HIGH execution — approved delete policy 준수
  depends: TASK-DELETE-DIALOG-VIEW-01, TASK-DELETE-02,
           TASK-DETAIL-RECOVERY-VIEW-01
  deliverable: delete progress/failure/recovery UI
  acceptance: pending, 404, unknown/recheck, network failure, 200 redirect 분리
TASK-DETAIL-JOURNEY-VERIFY-01
  requirements: TASK-DETAIL-01~TASK-DETAIL-05
  risk: MEDIUM
  depends: TASK-DELETE-OUTCOME-VIEW-01
  deliverable: task-resolution current-commit 통합 evidence
  acceptance: RES-P1/E, request count, redirect와 list/detail/dashboard consistency
TASK-DETAIL-JOURNEY-REVIEW-01
  requirements: TASK-DETAIL-01~TASK-DETAIL-05
  risk: MEDIUM
  depends: TASK-DETAIL-JOURNEY-VERIFY-01
  deliverable: task-resolution 독립 review record
  acceptance: exact SHA fresh review, HIGH/MEDIUM finding 0
```

각 task는 component/integration test, `./scripts/verify quick`, 적용 가능한
`/task/:id` modal/recovery browser check를 명시한다. 기존
`JOURNEY-TASK-DETAIL-01`은 review task에 의존하는 `BLOCKED` 사람 checkpoint로
바꾼다.

- [ ] **Step 3: 통합 QA focused task를 `QA-01` 앞에 추가한다**

```text
QA-CROSS-AUTH-01
  requirements: AUTH-07, NAV-02, NAV-03, 모든 보호 API
  risk: MEDIUM
  depends: 네 JOURNEY checkpoint
  deliverable: cross-Journey auth transition evidence
  acceptance: sign-in/reload/direct entry/terminal 401의 route·cache transition
QA-CROSS-DATA-01
  requirements: DASH-01, TASK-LIST-01, TASK-DETAIL-01~TASK-DETAIL-05
  risk: MEDIUM
  depends: 네 JOURNEY checkpoint
  deliverable: delete 이후 cross-Journey data evidence
  acceptance: delete 전후 list/detail/dashboard와 mock/query source 일치
QA-RESPONSIVE-A11Y-01
  requirements: 전체 UI와 접근성 invariant
  risk: MEDIUM
  depends: QA-CROSS-AUTH-01, QA-CROSS-DATA-01
  deliverable: five-route responsive/accessibility sweep
  acceptance: 다섯 route/modal, 두 viewport, keyboard, focus, clipping/scroll trap
QA-CONTRACT-01
  requirements: SYS-04와 모든 API requirement
  risk: MEDIUM
  depends: QA-CROSS-AUTH-01, QA-CROSS-DATA-01
  deliverable: OpenAPI-generated/MSW/client final trace
  acceptance: 일곱 OpenAPI operation과 generated/MSW/client exact 대조
```

각 task는 `Status: NOT_STARTED`, `Evidence: 없음`과 exact automatic/browser
verification을 가진다.

- [ ] **Step 4: final QA dependency와 status를 바로잡는다**

- `QA-01`은 네 checkpoint, `QA-RESPONSIVE-A11Y-01`, `QA-CONTRACT-01`에
  의존한다.
- `QA-02`는 `QA-01`에 의존하며 기존 full review acceptance를 유지한다.
- `QA-HARNESS-01`, `QA-03`, `QA-04`는 기존 dependency와 evidence를 보존하고
  `Status: BLOCKED`로 바꾼다.
- `QA-HARNESS-01` evidence의 마지막 문장을 dependency 해소 후 최신 HEAD rerun과
  상태 전환이 필요하다고 명확히 한다.

- [ ] **Step 5: focused contract test를 GREEN으로 확인한다**

Run:

```bash
python3 -m unittest tests.test_verify_contract.VerifyContractTests.test_repository_todo_contains_granular_journey_backlog -v
```

Expected: PASS.

---

### Task 4: 원장 정합성을 검증하고 계획 완료 review를 수행한다

**Files:**
- Modify: `TODO.md` only when a finding or final evidence requires correction
- Test: `tests/test_verify_contract.py`, repository verification gates

**Interfaces:**
- Consumes: complete backlog migration diff
- Produces: reproducible setup/quick evidence and independent review record

- [ ] **Step 1: 모든 새 task field와 시작 가능 task를 정적으로 확인한다**

Run:

```bash
rg -n '^### \[ \] (UI|AUTH|DASHBOARD|PROFILE|WORK|TASK|QA)-|^- (Requirements|Risk|Depends on|Deliverable|Acceptance|Automatic verification|Browser verification|Status|Evidence):' TODO.md
```

Expected: 새 task마다 필수 field 9종이 존재하고 `UI-FOUNDATION-01`은 completed
dependency만 가진 `NOT_STARTED` task다.

- [ ] **Step 2: canonical verification을 실행한다**

Run:

```bash
./scripts/verify setup
./scripts/verify quick
git diff --check
```

Expected: all PASS, repository fingerprint mutation failure 없음.

- [ ] **Step 3: 변경을 커밋한다**

```bash
git add TODO.md tests/test_verify_contract.py
git commit -m "docs(todo): Journey 구현 작업을 세분화"
```

- [ ] **Step 4: plan-completion adversarial review를 수행한다**

Fresh reviewer가 exact commit에 대해 다음을 확인한다.

```text
Review target: 이 plan, backlog design spec, exact commit SHA
Checks: 기존 완료 이력 보존, task field 9종, requirement coverage, dependency cycle,
        dependency-resolved NOT_STARTED 시작점, Journey review/checkpoint 분리,
        final QA status, test contract, unrelated diff
Findings: severity/class/root cause
Corrections: 적용 내용 또는 not applicable
Rerun: focused unittest, ./scripts/verify setup, ./scripts/verify quick, git diff --check
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

- [ ] **Step 5: HIGH/MEDIUM finding을 수정하고 검증을 재실행한다**

Finding이 있으면 가장 작은 correction만 적용하고 Step 2 명령을 모두 재실행한다.
새 task의 accepted behavior를 바꾸는 correction은 중단하고 사람 결정을 요청한다.

- [ ] **Step 6: backlog migration task를 완료 처리한다**

`PLAN-JOURNEY-BACKLOG-01`의 checkbox를 `[x]`, Status를 `AI_VERIFIED`로 바꾸고
Evidence에 exact implementation commit, reviewer identity/relationship, checks,
findings, corrections, rerun과 verdict를 추가한다. 새 Journey 구현 task는
`NOT_STARTED`, 기존 Journey checkpoint는 `BLOCKED`로 유지한다.

- [ ] **Step 7: 최종 evidence를 커밋한다**

```bash
git add TODO.md tests/test_verify_contract.py
git commit -m "docs(todo): Journey 백로그 검토 근거 기록"
```

Expected: clean worktree. 이 완료는 backlog 설계·원장 변경만 `AI_VERIFIED`이며
새 Journey 구현 task는 모두 `NOT_STARTED`로 남는다.
