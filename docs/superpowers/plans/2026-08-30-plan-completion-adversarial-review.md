# 계획 완료 적대적 리뷰 계약 보강 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계획 기반 작업의 마지막 완료 처리 전에 독립 적대적 리뷰를 강제하고, 재현 가능한 review evidence와 일관된 HIGH 결정·병렬 TODO 상태 규칙을 적용한다.

**Architecture:** 기존 문서 control plane과 `scripts/verify` marker 검사를 확장한다. 새 상태나 reviewer 도구는 만들지 않고, plan과 Golden Journey의 범위가 같으면 review evidence 한 건을 공유한다.

**Tech Stack:** Markdown, Python 3 standard-library `unittest`, 기존 `scripts/verify`

## Global Constraints

- `assignment-original/`과 제품 accepted behavior는 변경하지 않는다.
- `HUMAN_APPROVED`는 Golden Journey checkpoint의 사람 수용 상태로 유지한다.
- HIGH 결정은 명시적 사람 결정 evidence와 자동 검증이 있을 때 `AI_VERIFIED`로 닫는다.
- 각 TODO task block은 Evidence에 기록된 한 agent/session만 갱신한다.
- plan-completion review와 Golden Journey review의 대상이 같으면 한 번만 수행한다.
- browser 검증은 정책 문서 변경에 적용하지 않는다.

---

### Task 1: Plan-completion review 문서 계약을 실패하는 test로 고정

**Files:**
- Modify: `tests/test_verify.py:109`
- Modify: `scripts/verify:14`

**Interfaces:**
- Consumes: `scripts.verify.REQUIRED_FILES`, `scripts.verify.REQUIRED_MARKERS`
- Produces: setup 검증이 요구할 plan review, HIGH 결정, TODO ownership marker 계약

- [ ] **Step 1: 문서 계약 test를 추가한다**

`tests/test_verify.py`의 journey marker test 다음에 추가한다.

```python
    def test_setup_requires_plan_completion_review_contract(self):
        verifier = load_verify_module()
        expected = {
            "AGENTS.md": (
                "plan-completion adversarial review",
                "task block owner",
            ),
            "docs/quality/workflow.md": (
                "## Plan-Completion Adversarial Review",
                "Review target:",
                "Findings:",
                "HIGH decision item",
            ),
            "docs/quality/verification.md": (
                "plan-completion review evidence",
            ),
            "docs/project-plan.md": (
                "plan-completion adversarial review",
            ),
            "TODO.md": (
                "사람 결정 evidence가 있을 때 `AI_VERIFIED`",
                "소유하지 않은 task block",
            ),
        }
        for path, markers in expected.items():
            self.assertIn(path, verifier.REQUIRED_FILES)
            for marker in markers:
                with self.subTest(path=path, marker=marker):
                    self.assertIn(marker, verifier.REQUIRED_MARKERS[path])
```

- [ ] **Step 2: focused test가 계약 누락으로 실패하는지 확인한다**

Run:

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_plan_completion_review_contract -v
```

Expected: `FAIL`; `docs/project-plan.md` 또는 `TODO.md`가 `REQUIRED_FILES`에 없다는
assertion이 첫 실패로 출력된다.

- [ ] **Step 3: verifier에 required file과 marker를 최소 추가한다**

`scripts/verify`의 `REQUIRED_FILES`에 추가한다.

```python
    "docs/project-plan.md",
    "TODO.md",
```

`REQUIRED_MARKERS`의 해당 entry에 아래 marker를 병합한다.

```python
    "AGENTS.md": (
        "LOW work proceeds continuously",
        "AI never marks `HUMAN_APPROVED`",
        "./scripts/verify setup",
        "plan-completion adversarial review",
        "task block owner",
    ),
    "docs/quality/workflow.md": (
        "### LOW — AI proceeds continuously",
        "### MEDIUM — human owns journey checkpoint",
        "### HIGH — human decides before consequential change",
        "## Adversarial Review",
        "## Plan-Completion Adversarial Review",
        "Review target:",
        "Findings:",
        "HIGH decision item",
        "## Final QA Checklist",
        "reviewed SHA-256 digest",
    ),
    "docs/quality/verification.md": (
        "Every verification mode is read-only",
        "## Formatting Mutation Is Separate",
        "one representative success path and one critical failure path",
        "@core",
        "plan-completion review evidence",
        "reviewed SHA-256 digest",
    ),
    "docs/project-plan.md": (
        "plan-completion adversarial review",
    ),
    "TODO.md": (
        "사람 결정 evidence가 있을 때 `AI_VERIFIED`",
        "소유하지 않은 task block",
    ),
```

Expected: test는 아직 FAIL한다. 문서에 marker가 없기 때문이다.

### Task 2: Workflow와 상태·원장 규칙 구현

**Files:**
- Modify: `AGENTS.md:31`
- Modify: `docs/quality/workflow.md:3`
- Modify: `docs/quality/verification.md:16`
- Modify: `docs/project-plan.md:300`
- Modify: `TODO.md:10`
- Test: `tests/test_verify.py`

**Interfaces:**
- Consumes: Task 1의 `REQUIRED_MARKERS` 계약
- Produces: 모든 계획 기반 작업이 따르는 완료 gate와 review evidence 형식

- [ ] **Step 1: Required Loop와 task block ownership을 추가한다**

`AGENTS.md`의 Required Loop에 다음 문장을 반영한다.

```markdown
Select requirement IDs → implement one testable unit → run read-only automatic
verification → verify applicable browser behavior → classify and fix failures →
record evidence → after the final task of a written plan, run a plan-completion
adversarial review → at each golden journey, reuse or extend that review → request
one human checkpoint → run full review and final QA.

The session recorded in Evidence is the task block owner. Parallel work may update
different task blocks, but never a block owned by another session. Rebase onto the
latest main and reconcile TODO state item-by-item before merge.
```

- [ ] **Step 2: Operating Loop와 HIGH decision 상태를 명확히 한다**

`docs/quality/workflow.md`의 Operating Loop에서 evidence 기록 다음에 둔다.

```markdown
8. After the final implementation and verification task of a written plan, run
   plan-completion adversarial review before marking the plan-backed TODO item done.
9. At a completed golden journey, reuse that review when the target is identical;
   otherwise review only the missing journey scope, then ask for one checkpoint.
10. After all journeys, run full adversarial review, `./scripts/verify full`, and
    final QA.
11. Ask a person for final acceptance. AI never declares human acceptance.
```

HIGH section 끝에 추가한다.

```markdown
A HIGH decision item becomes `AI_VERIFIED` only after explicit human decision
evidence and the specified design/trace verification pass. This records that the
approved decision was reflected correctly; it is not a Golden Journey acceptance.
Without human decision evidence it remains `BLOCKED`, and AI never marks
`HUMAN_APPROVED`.
```

- [ ] **Step 3: 공통 plan-completion review evidence를 추가한다**

`docs/quality/workflow.md`의 `## Adversarial Review` 앞에 추가한다.

````markdown
## Plan-Completion Adversarial Review

After the final implementation and applicable automatic/browser verification task
of every written plan, use a fresh reviewer context or an explicit second-pass role
that did not author the final change. Review plan acceptance, incomplete steps,
requirement omissions, negative paths, invariants, accessibility, weak or duplicate
tests, console/network errors, unrelated diff, missing evidence, and TODO
status/dependency consistency. Resolve every HIGH/MEDIUM finding before completing
the plan-backed TODO item, merge, handoff, or checkpoint request.

Record this block even when no finding exists:

```text
Review target: plan path, requirement/Journey IDs, target commit SHA
Reviewer: fresh context or second-pass role ID and relationship to final author
Checks: checks actually performed
Findings: none or severity/class/root cause
Corrections: not applicable or applied changes
Rerun: reproduction command and result
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

`Findings: none` is valid only with the reviewer, target commit, and checks. When a
plan and Golden Journey have the same target, one recorded review satisfies both;
review only the missing scope when their targets differ.
````

- [ ] **Step 4: Verification과 project phase 계약을 연결한다**

`docs/quality/verification.md`의 setup 설명에 `plan-completion review evidence
markers`를 추가하고 Prompt Candidate Verification 앞에 둔다.

```markdown
## Review Contract Verification

Setup verifies that plan-completion review evidence, HIGH decision state, and TODO
task ownership rules are present. Marker checks do not prove reviewer independence
or review quality; a person verifies the recorded reviewer and target commit.
```

`docs/project-plan.md`의 단계 설명 앞에 추가한다.

```markdown
Every written implementation plan finishes with plan-completion adversarial review
before its final TODO item is completed. A Golden Journey may reuse the same review
only when plan path, requirement/Journey IDs, and target commit are identical.
```

- [ ] **Step 5: TODO 상태와 병렬 원장 규칙을 정리한다**

`TODO.md` 규칙에 반영한다.

```markdown
- Evidence에 기록된 agent/session이 task block owner다. 병렬 session은 소유하지
  않은 task block의 checkbox, Status, Evidence를 갱신하지 않는다.
- HIGH decision item은 명시적 사람 결정 evidence와 지정 검증이 통과하면
  `AI_VERIFIED`로 닫는다. 이는 Journey의 `HUMAN_APPROVED`가 아니다.
- branch는 merge 전 최신 main을 반영하고 TODO conflict를 item 단위로 합친다.
```

`DEC-ARCH-01`은 기존 사람 승인과 검증 evidence가 있으므로 checkbox를 `[x]`,
Status를 `AI_VERIFIED`로 맞춘다. `FLOW-REVIEW-01`은 final review 전까지
`IN_PROGRESS`를 유지한다.

- [ ] **Step 6: focused test와 setup을 GREEN으로 만든다**

Run:

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_plan_completion_review_contract -v
./scripts/verify setup
git diff --check
```

Expected: focused test 1개 PASS, setup 79개 이상 PASS, whitespace error 없음.

- [ ] **Step 7: 구현 계약을 커밋한다**

```bash
git add AGENTS.md TODO.md docs/project-plan.md docs/quality/workflow.md \
  docs/quality/verification.md scripts/verify tests/test_verify.py
git commit -m "docs(workflow): 계획 완료 적대적 리뷰 계약 적용"
```

### Task 3: 이 계획 자체의 완료 적대적 리뷰와 최종 evidence

**Files:**
- Modify: `TODO.md:123`
- Review: `docs/superpowers/specs/2026-08-30-plan-completion-adversarial-review-design.md`
- Review: `docs/superpowers/plans/2026-08-30-plan-completion-adversarial-review.md`

**Interfaces:**
- Consumes: Task 2의 문서 계약과 구현 commit
- Produces: `FLOW-REVIEW-01`의 독립 review evidence와 최종 `AI_VERIFIED` 상태

- [ ] **Step 1: fresh reviewer가 구현 commit을 검토한다**

Review target은 Task 2 commit으로 고정한다. reviewer는 Task 2 최종 변경을
작성하지 않은 context여야 하며 다음을 확인한다.

```text
spec/plan coverage
plan completion before status transition
zero-finding evidence validity
HIGH decision versus Journey acceptance semantics
same-target review reuse rule
TODO task ownership and merge reconciliation
verify marker coverage without false claims of independence
unrelated diff and assignment-original diff
```

Expected: finding마다 severity, workflow class, root cause, correction, rerun이
작성되거나 `Findings: none`과 reviewer/checks가 함께 기록된다.

- [ ] **Step 2: finding을 수정하고 영향 검증을 재실행한다**

Run:

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_plan_completion_review_contract -v
./scripts/verify quick
git diff --check
git diff --exit-code HEAD -- assignment-original
```

Expected: focused test PASS, quick의 setup·format·lint·typecheck·test PASS,
whitespace error 없음, 원본 diff 없음.

- [ ] **Step 3: review evidence와 완료 상태를 기록한다**

`git rev-parse HEAD`로 Task 2 target commit을 얻는다. `TODO.md`의
`FLOW-REVIEW-01`을 `[x]`, `Status: AI_VERIFIED`로 바꾸고 reviewer가 생성한 실제
값을 추가한다.

```text
Review target: docs/superpowers/plans/2026-08-30-plan-completion-adversarial-review.md, FLOW-REVIEW-01, Task 2 target commit SHA
Reviewer: reviewer identifier and relationship to Task 2 author
Checks: checks performed from Step 1
Findings: none or classified findings
Corrections: not applicable or applied corrections
Rerun: Step 2 commands and their PASS results
Verdict: PASS or PASS_WITH_LOW
```

- [ ] **Step 4: final evidence를 커밋한다**

```bash
git add TODO.md
git commit -m "docs(workflow): 계획 완료 리뷰 근거 기록"
```

- [ ] **Step 5: 최종 상태를 확인한다**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: worktree clean, 최근 commit에 구현 계약과 review evidence가 보인다.
