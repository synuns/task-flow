# AI 기록 검수 완료 게시 흐름 설계

## 목적

`pnpm run ai:review`를 이미 마크다운 검수를 마친 사람이 검수 완료를 기록하고
artifact로 게시하는 절차에만 사용한다. 사람에게 노출되는 정상 흐름은
review-pending 세션 목록, 선택, 최종 확인, 게시 결과로 제한한다.

## 결정된 흐름

1. 사람은 `.codex/review-pending/`의 세션 기록 마크다운을 먼저 검수한다.
2. `pnpm run ai:review`를 실제 terminal TTY에서 실행한다.
3. 명령은 게시 가능한 review-pending 세션 ID 목록을 보여준다.
4. 사람은 번호로 세션 하나를 선택한다.
5. 명령은 선택한 세션 ID와 exact record ID를 다시 보여주고 정확히
   `y`+Enter로 확인받는다.
6. 확인된 record를 기존 publisher로 게시한다.
7. 성공 시 artifact, public index, `AI_USAGE.md`, lifecycle metadata가 기존
   transaction 규칙에 따라 함께 갱신된다.

`n`, 빈 입력, 잘못된 입력, EOF, signal은 게시 없이 취소한다.

## 상태와 표시

새 lifecycle 상태를 추가하지 않는다. canonical metadata의 `closed`는 검수
대기 중인 게시 가능 record이며 CLI에서 `review-pending`으로 표현한다.
`pending`은 아직 기록 중인 세션, `published`는 이미 게시된 세션이므로 목록에서
제외한다.

목록에는 record ID 대신 session ID를 표시한다. lifecycle상 한 session에는
현재 게시 가능한 `closed` record가 최대 하나이며, 선택 뒤에는 사람이 사전
검수한 파일과 승인 대상을 연결할 수 있도록 exact record ID도 표시한다.
artifact filename과 metadata에는 기존 segment가 포함된 record ID를 그대로
사용한다.

예상 UI는 다음과 같다.

```text
검수 완료할 review-pending 세션:
1. 01a04ddf-4d15-74f3-8568-99bf5272814e
2. 01a04ddf-5be6-7322-838c-12e18fc2d714
Select [1-2]: 1
선택한 세션: 01a04ddf-4d15-74f3-8568-99bf5272814e
검수 대상 기록: 01a04ddf-4d15-74f3-8568-99bf5272814e.s0001
검수 완료하고 게시할까요? 정확히 y 입력 후 Enter: y
published
```

## 제거할 상호작용

CLI에서 다음 사람 상호작용을 제거한다.

- BLOCKING/REVIEW/INFO summary와 finding context 출력
- `[v] 전체 본문`, `[c] 계속`, `[q] 취소` menu
- pager와 임시 review view
- reviewer 이름 입력과 Git config 저장

reviewer는 기존 `git config --get user.name`에서만 읽는다. 값이 없으면
`reviewer_not_configured`로 게시 전 종료하며, 정상 검수 완료 흐름 안에서 별도
질문이나 설정 변경을 하지 않는다. 출력 가능한 Unicode 이름은 허용하고 제어
문자는 receipt 경계에서 거부한다.

## 유지할 안전 경계

절차 단순화는 게시 안전성을 낮추지 않는다.

- stdin과 stdout 모두 TTY여야 한다.
- 목록은 state, record ID, regular-file, symlink, metadata hash 검증을 통과한
  `closed` record만 포함한다.
- 선택 후 읽은 immutable candidate bytes에 scanner를 적용한다.
- `incomplete_snapshot`, `snapshot_hash_mismatch`, `unredacted_secret` 등
  BLOCKING finding이 있으면 safe code만 출력하고 게시하지 않는다.
- REVIEW finding은 자동 검수 결과로 취급하지 않고 화면에도 출력하지 않는다.
  사람의 사전 마크다운 검수와 최종 `y` 확인이 승인 근거다.
- reviewer, candidate SHA-256, scanner version, finding count는 receipt에 기존대로
  기록한다.
- publisher는 session lock 안에서 current closed record와 revision을 public write
  전에 재검증한다. 기존 no-follow open, exact-byte digest, staging, atomic rename,
  rollback, idempotency는 유지한다.
- hook, CI, pipe, AI는 검수 완료나 publication을 실행할 수 없다.

## 오류 처리

| 상황 | 결과 |
| --- | --- |
| review-pending record 없음 | 안내 후 성공 종료, publication 없음 |
| 잘못된 목록 선택 | 취소, publication 없음 |
| reviewer Git config 없음 | `reviewer_not_configured`, publication 없음 |
| candidate 또는 metadata 검증 실패 | safe BLOCKING code, publication 없음 |
| 정확한 `y\n` 이외 입력 | 취소, publication 없음 |
| publisher 오류 | 기존 safe status code, rollback/resume 규칙 유지 |

secret 원문, exception 원문, filesystem 절대 경로는 terminal과 journal에
출력하지 않는다.

## 구현 경계

- `scripts/review-ai-record`: session ID 목록, 선택, 확인, receipt 조합만 담당한다.
- `.codex/hooks/review_scanner.py`: 선택된 immutable bytes의 BLOCKING audit와
  receipt count를 제공한다.
- `.codex/hooks/review_publisher.py`: public write 전 current record guard와 Unicode
  reviewer validation을 수행하고 기존 publication transaction을 유지한다.
- lifecycle store와 artifact index contract는 변경하지 않는다.

새 dependency, 새 state, 새 publication path를 추가하지 않는다.

## 검증

TDD로 다음을 증명한다.

- 목록에는 유효한 `closed` record의 session ID만 보인다.
- `pending`, `published`, invalid metadata, hash mismatch, symlink는 목록에서
  제외된다.
- 선택 후 같은 session ID와 exact record ID가 확인 prompt에 표시된다.
- exact `y\n`만 publish receipt를 전달한다.
- non-TTY, 잘못된 선택, 취소, reviewer 누락, BLOCKING finding은 publish를
  호출하지 않는다.
- REVIEW finding은 pager나 추가 menu 없이 최종 확인으로 진행한다.
- 게시 성공과 idempotent 재실행은 기존 publisher contract를 유지한다.
- 승인 대기 중 session이 전환되면 public file과 journal을 쓰지 않는다.
- 출력 가능한 Unicode reviewer는 허용하고 제어 문자는 거부한다.
- `./scripts/verify quick`이 read-only로 통과한다.

browser verification은 적용하지 않는다. 이 변경은 terminal-only tooling이다.

## 문서 변경

구현과 함께 `docs/quality/workflow.md`, `docs/quality/verification.md`,
`AI_USAGE.md`, `TODO.md`를 실제 CLI 흐름과 일치시킨다. 기존 risk-first 상세
설계는 역사적 기록으로 보존하고 이 문서가 검수 완료 CLI의 후속 결정을
정의한다.
