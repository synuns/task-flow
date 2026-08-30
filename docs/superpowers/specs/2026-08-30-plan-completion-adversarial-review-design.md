# 계획 완료 적대적 리뷰 계약 보강 설계

## 목적

계획 문서의 구현 항목이 모두 끝난 뒤에도 독립 적대적 리뷰를 거치게 한다.
현재 Golden Journey 완료 시점에만 명시된 review gate를 계획 기반 작업 전체로
확장하되, 같은 범위를 두 번 검토하거나 새로운 도구·상태를 만들지 않는다.

함께 해결할 문제는 다음 세 가지다.

- review 결과가 `0건` 한 줄로만 남아 독립성과 범위를 재현할 수 없다.
- 사람 승인을 받은 HIGH 결정이 `IN_PROGRESS`에 남아 의존 작업 상태와 모순된다.
- 병렬 worktree가 서로 오래된 `TODO.md` 전체 상태를 갱신해 evidence 충돌을 만든다.

## 선택한 접근

기존 workflow와 `TODO.md`를 보강하는 최소 정책 변경을 사용한다.

- 새 review 도구나 review 전용 상태를 추가하지 않는다.
- 모든 계획 기반 작업은 마지막 구현·검증 뒤 plan-completion review를 수행한다.
- plan과 Golden Journey 범위가 같으면 review 한 번을 두 gate의 evidence로 공유한다.
- `AI_VERIFIED`와 `HUMAN_APPROVED`의 기존 상태 집합을 유지한다.
- TODO 병렬 작업은 task block 소유권으로 충돌 범위를 제한한다.

별도 `PLAN_REVIEWED`, `HUMAN_DECIDED` 상태를 추가하는 방식은 상태 전이를 늘리고
기존 항목을 마이그레이션해야 하므로 사용하지 않는다. 자동 reviewer runner도
현재 필요한 것은 재현 가능한 evidence 계약이므로 추가하지 않는다.

## 계획 완료 review gate

`docs/superpowers/plans/`의 계획을 실행하는 작업은 다음 순서를 따른다.

1. 계획의 구현 항목을 완료한다.
2. 적용 가능한 자동 검증과 browser 검증을 수행한다.
3. final plan task와 대응 TODO item을 완료 처리하기 전에, 최종 변경을 작성하지
   않은 fresh context 또는 명시적 second-pass role이 review한다.
4. reviewer는 계획 acceptance, 미완료 항목, requirement 누락, negative path,
   invariant, 접근성, test 중복·취약성, console/network error, unrelated diff,
   evidence 누락과 TODO 상태·dependency 정합성을 확인한다.
5. finding마다 class, root cause, correction과 rerun을 기록하고 해결한다.
6. unresolved HIGH/MEDIUM finding이 없을 때만 TODO item을 `AI_VERIFIED`로 바꾸고
   merge, handoff 또는 적용 가능한 사람 checkpoint를 요청한다.

문서 작성만 하는 계획도 동일한 gate를 적용하되 browser 검증과 제품 runtime
항목은 `적용 없음`으로 명시한다.

Golden Journey 완료와 계획 완료가 같은 변경 집합을 가리키면 review evidence에
plan 경로와 Journey ID를 함께 기록해 한 번의 review로 두 gate를 충족한다. 범위가
다르면 누락 범위만 추가 review한다.

## 공통 review evidence

review finding이 없어도 다음 필드를 `TODO.md`의 해당 item 또는 추적되는
`docs/quality/evidence/` 문서에 남긴다.

```text
Review target: <plan path, requirement/journey IDs, commit>
Reviewer: <fresh context 또는 second-pass role 식별자; final author와의 관계>
Checks: <실제로 확인한 항목>
Findings: <없음 또는 severity/class/root cause>
Corrections: <적용 없음 또는 수정 내용>
Rerun: <재현 명령과 결과>
Verdict: PASS | PASS_WITH_LOW | BLOCKED
```

`Findings: 없음`은 reviewer와 checks가 기록된 경우에만 유효하다.
`BLOCKED`이거나 unresolved HIGH/MEDIUM finding이 있으면 완료 상태로 올리지 않는다.

## HIGH 결정 상태

`HUMAN_APPROVED`는 계속 Golden Journey checkpoint의 사람 수용 상태로만 사용한다.
HIGH 결정 item은 다음 조건을 모두 만족하면 AI가 `AI_VERIFIED`로 닫는다.

- 현재 사용자 대화나 추적된 decision record에 명시적인 사람 결정이 있다.
- 설계와 원본/OpenAPI trace 자동 검증이 통과한다.
- Evidence에 사람 결정의 날짜와 대상 문서를 기록한다.

따라서 `AI_VERIFIED`는 사람이 Journey를 승인했다는 뜻이 아니다. 승인된 결정을
문서와 검증 결과가 정확히 반영했다고 AI가 확인했다는 뜻이다. 사람 결정 evidence가
없으면 `BLOCKED`, 설계·검증이 진행 중이면 `IN_PROGRESS`를 유지한다.

## 병렬 TODO 원장 규칙

각 task block은 Evidence에 기록된 단일 agent/session이 완료까지 소유한다.

- 다른 worktree는 소유하지 않은 block의 checkbox, Status, Evidence를 갱신하지 않는다.
- 진행 요약은 merge 직전 최신 main에서 task block 상태를 다시 읽고 갱신한다.
- 같은 block을 두 session이 필요로 하면 두 번째 session은 첫 번째 변경이 merge될
  때까지 기다린다.
- branch는 merge 전에 최신 main을 반영하고 `TODO.md` conflict를 item 단위로
  합친다. 한쪽 파일 전체를 선택하지 않는다.
- final review가 status/dependency와 evidence 보존을 확인한 뒤 merge한다.

서로 다른 block의 병렬 작업은 허용한다. 전역 lock이나 별도 원장 서비스는 만들지
않는다.

## 검증

`tests/test_verify.py`와 `scripts/verify`의 setup 계약은 최소 marker를 확인한다.

- plan completion review가 final completion 전에 위치한다.
- review evidence 필드와 finding 0건 규칙이 존재한다.
- HIGH 결정의 `AI_VERIFIED` 의미와 Journey `HUMAN_APPROVED`가 구분된다.
- task block 단일 소유와 merge 전 상태 정합성 검토가 존재한다.

정적 검사는 reviewer가 실제로 독립적인지 증명하지 않는다. 독립성은 review evidence의
reviewer 식별자와 대상 commit을 사람이 확인한다.

## 반영 범위

- `AGENTS.md`: Required Loop에 plan-completion review와 TODO block 소유 규칙 추가
- `docs/quality/workflow.md`: gate 순서, evidence 형식, HIGH 결정 상태 추가
- `docs/quality/verification.md`: setup 검증 범위와 review evidence 제한 명시
- `docs/project-plan.md`: 단계별 완료 조건에 plan-completion review 연결
- `TODO.md`: 현재 상태 모순 정리와 `FLOW-REVIEW-01` evidence 기록
- `scripts/verify`, `tests/test_verify.py`: 문서 계약 회귀 검사

기존 완료 계획 문서 전체를 다시 작성하거나 새 review automation을 추가하지 않는다.
현재 진행 중이거나 이후 시작하는 계획부터 이 gate를 적용한다.
