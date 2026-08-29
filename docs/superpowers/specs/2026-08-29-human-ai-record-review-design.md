# Human-Centered AI Record Review Design

## 목적

사람 검토라는 신뢰 경계는 유지하면서 AI session record 게시 절차를 사람 중심으로
단순화한다. 사람이 후보 경로를 찾고 SHA-256을 계산·복사하고 reviewer와 여러
confirmation flag를 입력하고 긴 명령을 조립하는 절차를 제거한다.

사람의 정상 절차는 다음 명령 하나와 최종 승인 한 번이다.

```bash
npm run ai:review
```

이 설계는
`docs/superpowers/specs/2026-08-29-session-artifact-lifecycle-design.md`의
`closed → published` 전이를 보완한다. 자동 hook은 계속 pending session 기록만
관리하며 공개 게시 권한을 얻지 않는다.

## 목표와 비목표

목표:

- 위험도가 높은 내용부터 보여 사람이 효율적으로 판단하게 한다.
- SHA-256, reviewer, record path, confirmation flag를 사람이 직접 입력하지 않게
  한다.
- 정확히 검토한 candidate bytes만 게시한다.
- 게시를 idempotent하고 crash-recoverable한 transaction으로 만든다.
- `package.json`이 없는 현재 저장소에도 `npm run ai:review`를 미리 제공한다.
- 사람 승인과 취소 입력을 모호하지 않게 정의한다.

비목표:

- TUI 또는 GUI를 만들지 않는다.
- 자동 위험 검사를 사람 검토로 간주하지 않는다.
- AI, hook, CI, pipe 입력이 새 publication을 만들게 하지 않는다.
- transcript parser나 session lifecycle state machine을 다시 설계하지 않는다.
- 공개 artifact를 자동 생성하지 않는다.

## 신뢰 경계

새 publication은 사람 terminal에서 실행된 `scripts/review-ai-record`만 시작할 수
있다.

- stdin과 stdout 모두 TTY여야 한다.
- review command는 `closed` metadata와 hash가 일치하는 candidate만 선택한다.
- candidate는 `O_NOFOLLOW`로 열고 같은 descriptor에서 읽은 exact bytes로 위험
  분석, 본문 표시, SHA-256 계산을 수행한다.
- 최종 승인 후 publisher가 candidate를 다시 `O_NOFOLLOW`로 열고 session lock
  아래 state, revision, SHA-256을 재검증한다.
- 검토와 게시 사이 bytes, revision, state가 바뀌면 게시를 시작하지 않는다.
- 자동 hook은 review command나 publisher를 호출할 수 없다.
- 비TTY, pipe, redirect, CI 실행은 새 publication을 만들지 못한다.

기존 `scripts/publish-ai-record`의 긴 direct-publication interface는 사람용 공개
절차에서 제거한다. 공통 publisher 동작은 import 가능한 library로 분리한다.
저수준 script는 이미 journal이 존재하는 transaction의 진단·복구만 허용하며 새
review receipt나 publication을 만들지 않는다.

허용되는 저수준 command는 다음뿐이다.

```text
scripts/publish-ai-record --status <record-id>
scripts/publish-ai-record --recover <record-id>
scripts/publish-ai-record --rollback <record-id>
```

이 제한은 저장소 소유자가 코드를 고치는 공격을 막는 보안 경계가 아니다. 정상
운영 경로가 사람 검토를 우회하지 못하게 하는 workflow 경계다.

## 사람용 진입점

### 후보 선택

review command는 metadata가 유효하고 state가 `closed`이며 Markdown hash가
metadata `artifact_sha256`과 일치하는 record를 찾는다.

- 후보 0개: `검토 가능한 closed record가 없습니다.`를 출력하고 exit 0.
- 후보 1개: 선택 질문 없이 자동 선택.
- 후보 2개 이상: record ID, updated time, risk summary를 번호 목록으로 표시하고
  번호 하나를 입력받는다.
- 범위 밖 번호, 문자열, 빈 입력, EOF는 게시 없이 종료한다.

목록 정렬은 `updated_at` 내림차순, record ID 오름차순이다. `pending`과
`published` record는 신규 게시 후보에 포함하지 않는다.

### Reviewer 결정

reviewer는 다음 순서로 결정한다.

1. `git config --get user.name` 결과를 사용한다. local, global, system Git 설정의
   정상 precedence를 따른다.
2. 값이 없으면 사람에게 reviewer 이름을 한 번 입력받는다.
3. 공백 정규화와 기존 secret-pattern audit을 통과한 값을
   `git config --local user.name <value>`로 저장한다.
4. 빈 값, EOF, signal, secret-pattern 실패는 취소한다.

reviewer 이름은 매 publication마다 다시 입력하지 않는다. reviewer 설정 저장은
Git local config만 바꾸며 tracked file을 수정하지 않는다.

### Risk-first 화면

첫 화면은 전체 transcript가 아니라 다음 summary다.

```text
Record: session-123.s0001
State: closed
Turns: 12
Updated: 2026-08-29 21:30 KST
Reviewer: 홍길동

BLOCKING  0
REVIEW    2
INFO      3
```

분류:

- `BLOCKING`: metadata/schema/hash 불일치, parser 오류, redaction audit 실패,
  지원 secret pattern, symlink, 비정상 파일, publication conflict.
- `REVIEW`: tool input/output, credential 유사 문자열, 비정상적으로 큰 block,
  error status가 있는 turn, redaction marker가 있는 turn.
- `INFO`: turn 수, model, transcript 기준 시점, parser version, redaction marker 수,
  artifact SHA-256.

`session-review-v1` 판정 규칙은 deterministic하다.

- candidate에 기존 `SECRET_PATTERNS`를 다시 적용한 결과가 원문과 다르면
  `unredacted_secret` BLOCKING.
- lifecycle metadata의 `last_hook_status=error` 또는 `last_error != null`이면
  `incomplete_snapshot` BLOCKING.
- Markdown의 `### Tool activity`, `**Input**`, `**Output**` block은 REVIEW.
- status line에 `error`, `failed`, `cancelled`가 있으면 해당 heading block은
  REVIEW.
- 단일 fenced block이 UTF-8 bytes 기준 32 KiB를 넘으면 `large_block` REVIEW.
- `[REDACTED]` marker가 있는 heading block은 `redacted_context` REVIEW.
- `[A-Za-z0-9+/=_-]{40,}`에 맞고 Shannon entropy가 문자당 4.0 bits 이상인
  문자열은 `credential_like` REVIEW. 기존 secret pattern과 겹치면 BLOCKING이
  우선한다.

flagged context는 finding이 속한 가장 가까운 Markdown heading block이며 최대
2 KiB만 표시한다. 초과분은 byte count만 표시하고 `v` 전체 보기로 유도한다.

`BLOCKING`이 하나라도 있으면 flagged context와 해결 code만 표시하고 게시 질문을
보여주지 않는다. exception 원문, transcript path, secret 원문은 화면·log·journal에
넣지 않는다.

`REVIEW` 항목은 해당 heading과 앞뒤 제한된 문맥을 먼저 표시한다. 화면에는 다음
명령만 제공한다.

```text
[v] 전체 본문  [c] 계속  [q] 취소
```

- `v`: 같은 candidate bytes를 mode `0600` 임시 파일로 만들고 pager로 전체
  본문을 연다. pager 종료 후 risk 화면으로 돌아온다.
- `c`: 최종 승인 질문으로 이동한다.
- `q`, 빈 입력, 알 수 없는 입력, EOF, signal: 취소한다.

pager는 `$PAGER`를 `shlex.split`으로 argument vector화하고 shell interpolation
없이 실행한다. 값이 없으면 executable `/usr/bin/less -R`, 그것도 없으면 Python
`pydoc.pager`를 사용한다. 임시 파일은 종료, 취소, 오류 시 삭제한다. pager
오류는 게시를 차단한다.

## 승인과 취소 계약

최종 질문:

```text
게시할까요? 정확히 y 입력 후 Enter:
```

승인:

- 입력 bytes가 정확히 `y\n`일 때만 승인한다.

취소:

- `n\n`, 빈 Enter, EOF는 취소다.
- 대문자 `Y`, `yes`, 앞뒤 공백 등 다른 모든 입력은 승인하지 않고 취소한다.
- `SIGINT`, `SIGTERM`, `SIGHUP`은 publication complete linearization 전까지
  취소 의사로 처리한다.
- 승인 전 취소는 public artifact, public index, `AI_USAGE.md`, lifecycle
  metadata, pending index를 변경하지 않는다.

승인 입력 한 번이 content review와 sensitive-information review를 함께
의미한다. review receipt에는 이 사실을 별도 boolean 두 개가 아니라 하나의
`human_approved=true`로 기록한다.

## Review receipt

승인 후 memory에 생성되는 receipt:

```json
{
  "schema_version": 1,
  "record_id": "session-123.s0001",
  "session_id": "session-123",
  "revision": 7,
  "candidate_sha256": "<64 lowercase hex>",
  "reviewer": "홍길동",
  "reviewed_at": "2026-08-29T12:30:00Z",
  "risk_scanner_version": "session-review-v1",
  "blocking_count": 0,
  "review_count": 2,
  "human_approved": true,
  "approval_channel": "interactive-tty"
}
```

receipt는 candidate 본문, transcript path, secret 원문을 포함하지 않는다. 새
transaction을 만들 때 journal에 필요한 필드만 복사한다. 외부 receipt 파일을
사람이 작성하거나 command argument로 주입하는 interface는 제공하지 않는다.

## Idempotency

publication transaction key:

```text
<record-id>:<candidate-sha256>
```

동일 key 재실행 결과:

- artifact, public index, `AI_USAGE.md`, metadata, pending index가 모두 원하는
  상태면 `already published`로 성공한다.
- journal과 일부 canonical target만 존재하면 완료되지 않은 단계부터 자동
  재개한다.
- 목적지 artifact가 동일 reviewed bytes면 기존 파일을 재사용한다.
- 목적지 artifact가 다른 bytes면 `publication_conflict`로 차단하며 덮지 않는다.
- index와 managed links는 sorted set으로 재생성해 중복을 만들지 않는다.
- metadata가 이미 `published`지만 파생 index가 오래됐으면 파생 index만
  재생성한다.

`published` record를 후보 목록에 다시 보여주지 않는다. command 시작 시 발견한
incomplete journal은 새 후보 선택 전에 자동 resume 또는 rollback한다.

## Staging과 atomic commit

다중 파일을 하나의 filesystem rename으로 commit할 수 없으므로 per-record
publication journal과 각 destination directory의 staging/backup 파일을 사용한다.

모든 staging/backup 파일은 mode `0600`으로 생성하고 write, flush, file fsync를
완료한다. canonical rename 후 parent directory도 fsync한다. staging 파일은
canonical target과 같은 directory에 있어야 한다.

lock 순서:

1. session lock
2. public index lock

항상 이 순서를 사용하고 역순으로 해제한다.

승인 후 준비 순서:

1. candidate를 다시 열어 state, revision, digest를 receipt와 비교한다.
2. reviewed artifact bytes를 생성한다.
3. canonical target들의 기존 bytes와 hash를 기록한다.
4. 새 artifact와 복구용 backup을 각 target directory에 staging한다.
5. transaction journal을 `prepared`로 atomic 저장한다.

canonical commit 순서:

1. journal을 `committing`으로 갱신.
2. reviewed artifact를 `artifacts/`에 atomic rename.
3. 현재 canonical ledger에서 public index를 다시 계산해 staging 후 atomic
   rename.
4. 현재 public index에서 `AI_USAGE.md` managed 영역을 다시 계산해 staging 후
   atomic rename.
5. pending sidecar metadata를 `published`로 atomic 갱신.
6. pending metadata 전체에서 pending index를 다시 계산해 atomic rename.
7. 모든 target hash와 state를 검증.
8. journal을 `complete`로 atomic 갱신. 이 시점이 publication linearization이다.
9. staging과 backup을 정리.

항상 다음 가시성 순서를 지킨다.

```text
reviewed artifact 존재
→ public index가 artifact 참조
→ AI_USAGE.md가 public index 참조
→ metadata published
→ pending index에서 제거
```

public index와 `AI_USAGE.md` 전체 bytes를 crash 전 staging에서 재사용하지 않는다.
복구 시 현재 canonical ledger 기준으로 다시 계산해 다른 record의 나중 publication을
잃지 않는다.

## Journal

journal 위치:

```text
.codex/review-pending/publications/<record-id>.json
```

필드:

```json
{
  "schema_version": 1,
  "transaction_key": "session-123.s0001:<sha256>",
  "record_id": "session-123.s0001",
  "session_id": "session-123",
  "candidate_revision": 7,
  "candidate_sha256": "<sha256>",
  "reviewer": "홍길동",
  "reviewed_at": "2026-08-29T12:30:00Z",
  "state": "prepared",
  "completed_steps": [],
  "updated_at": "2026-08-29T12:30:01Z",
  "last_error": null
}
```

journal state는 `prepared`, `committing`, `rolling_back`, `cancelled`, `complete`다.
본문, 전체 path, exception 원문은 저장하지 않는다. target은 정해진 logical name과
hash만 기록한다.

## Signal과 crash 복구

- `prepared` 이전 signal: 임시 파일을 제거하고 public state를 바꾸지 않는다.
- `prepared` 이후 첫 canonical rename 이전 signal: journal을 `cancelled`로
  바꾸고 staging을 제거한다.
- canonical rename 이후 `complete` 이전 signal: journal을 `rolling_back`으로
  바꾸고 backup을 역순 atomic 복원한다.
- rollback 중 signal은 rollback consistency가 회복될 때까지 defer한다.
- rollback 중 crash: 다음 invocation이 rollback을 먼저 완료한다.
- signal이 아닌 crash에서 `prepared|committing`: 다음 invocation이 같은
  transaction을 자동 재개한다.
- `complete` 이후 signal: publication은 이미 완료됐으므로 취소로 되돌리지
  않는다.
- `SIGKILL`과 전원 종료는 catch할 수 없으며 다음 invocation이 journal로
  복구한다.

Python signal handler는 filesystem I/O를 하지 않고 `cancel_requested` flag만
설정한다. staging, rename, fsync 사이 safe point가 flag를 확인해 journal 전이와
rollback을 일반 control flow에서 수행한다. rollback consistency를 복구하는 동안
추가 catch 가능한 signal은 flag만 유지하고 rollback을 중단하지 않는다.

rollback 순서:

1. pending metadata를 이전 state로 복원.
2. public index에서 미완료 record 링크를 제거하되 다른 record 링크는 유지.
3. `AI_USAGE.md` managed 영역을 갱신된 public index 기준으로 재생성.
4. transaction이 새로 만든 reviewed artifact만 제거하거나 기존 동일 artifact
   backup을 복원.
5. pending index를 canonical metadata 기준으로 재생성.
6. target hash를 확인하고 journal을 `cancelled`로 갱신.

## Package shortcut

현재 `package.json`이 없으므로 다음 tooling-only 파일을 미리 생성한다.

```json
{
  "private": true,
  "scripts": {
    "ai:review": "./scripts/review-ai-record"
  },
  "kbhc": {
    "frontendScaffolded": false
  }
}
```

`npm run ai:review`은 terminal TTY를 그대로 전달한다. frontend가 실제로
scaffold되면 기존 package fields와 script를 보존하고
`kbhc.frontendScaffolded=true`로 바꾼다.

## Verification 계약

`scripts/verify`는 package 상태를 명시적으로 구분한다.

- `frontendScaffolded=false`: `ai:review` script와 review executable만 확인하고
  frontend format/lint/typecheck/test/build/E2E를 skip한다.
- `frontendScaffolded=true`: 기존 필수 frontend scripts 전체를 요구한다.
- `kbhc.frontendScaffolded` 누락 또는 boolean 이외 값은 setup failure다.
- `ai:review`가 정확히 `./scripts/review-ai-record`를 실행하는지 확인한다.
- verifier는 candidate를 열람·게시하거나 journal recovery를 실행하지 않는다.
- journal, staging, backup 정합성 검사는 read-only다.

browser evidence는 `N/A — terminal-only TOOLING`이다.

## 구성요소 경계

- `scripts/review-ai-record`: TTY 검증, 후보 선택, reviewer 조회, 위험 화면,
  pager, 최종 승인, receipt 생성.
- review scanner module: immutable candidate bytes를 받아 risk findings와 summary를
  반환. filesystem write와 publication 권한 없음.
- publisher module: receipt, candidate descriptor, store를 받아 transaction 수행.
  prompt나 terminal UI를 소유하지 않음.
- lifecycle store: pending metadata, state transition, lock, atomic write 제공.
- artifact index module: canonical metadata/ledger로 index render. 승인 판단 없음.
- recovery-only CLI: 기존 journal 진단·resume·rollback. 새 receipt 생성 불가.

각 경계는 typed result와 정해진 error code만 교환한다. UI가 publisher 내부
구현이나 transcript 형식을 직접 참조하지 않는다.

## 오류 처리

| 상황 | 사람 출력 | publication |
| --- | --- | --- |
| closed 후보 없음 | 안내 | 없음 |
| Git reviewer 없음 + 입력 취소 | `review_cancelled` | 없음 |
| metadata/hash/parser 문제 | BLOCKING code | 없음 |
| pager 실패 | `pager_failed` | 없음 |
| candidate 교체/revision 변경 | `candidate_changed` | 없음 |
| 정확한 `y\n` 이외 입력 | `review_cancelled` | 없음 |
| destination 다른 bytes | `publication_conflict` | 없음 |
| staging 실패 | `publication_prepare_failed` | 없음 |
| commit crash | 다음 invocation resume | journal 기준 |
| catch 가능한 signal | rollback 또는 취소 | `complete` 전 취소 |
| rollback crash | 다음 invocation rollback | 이전 canonical state 복구 |
| 이미 완료 | `already published` | 추가 write 없음 또는 파생 index repair |

사람 출력과 journal에는 exception 원문, secret, prompt 본문, transcript path를
기록하지 않는다. 상세 진단은 정해진 code와 단계 이름만 사용한다.

## 테스트 전략

후보와 identity:

- closed 후보 0개, 1개, 여러 개 선택.
- pending/published/hash mismatch/symlink 후보 제외.
- `git config --get user.name` precedence.
- reviewer 최초 입력과 local config 저장.
- 빈 reviewer, secret-pattern reviewer, EOF, signal 취소.

위험 화면:

- BLOCKING, REVIEW, INFO 분류 fixture.
- BLOCKING에서 승인 질문이 호출되지 않음.
- flagged turn 문맥 경계와 secret 원문 비노출.
- `v`, `c`, `q`, 잘못된 입력, pager failure.
- full view 임시 파일 mode `0600`과 종료 후 삭제.

승인 입력:

- exact `y\n`만 receipt 생성.
- `Y`, `yes`, leading/trailing space, 빈 Enter, `n`, EOF는 receipt 미생성.
- SIGINT, SIGTERM, SIGHUP 취소.
- stdin/stdout 비TTY, CI 환경, pipe 입력 게시 거부.

exact-byte binding:

- review read와 publish read 사이 path 교체.
- candidate body, revision, state 변경.
- symlink swap과 비정상 파일.
- receipt digest/revision 불일치.

transaction:

- 동일 transaction 반복 시 링크·review metadata 중복 없음.
- artifact/index/AI_USAGE/metadata/pending-index 각 rename 전후 crash 주입.
- `prepared`, `committing` 자동 resume.
- signal 전 staging cleanup.
- canonical rename 후 signal rollback.
- rollback 단계별 crash와 다음 invocation 복구.
- destination 다른 bytes conflict.
- 다른 record publication 후 stale global staging을 replay하지 않음.
- 다른 record public/index/AI_USAGE 링크 보존.
- complete journal과 이미 published metadata reconciliation.

package와 verification:

- tooling-only `package.json` schema와 `ai:review` command.
- `frontendScaffolded=false`에서 frontend 검증 skip.
- true에서 필수 frontend scripts 누락 failure.
- verifier 실행 전후 repository fingerprint 동일.
- `npm run ai:review` TTY forwarding smoke test.

## 완료 조건

- 정상 사람 절차가 `npm run ai:review`와 exact `y`+Enter 한 번으로 끝난다.
- 사람은 path, digest, reviewer, confirmation flag, 긴 publish 명령을 입력하지
  않는다.
- 위험 항목이 전체 본문보다 먼저 보인다.
- BLOCKING finding은 publication을 만들지 않는다.
- review와 publication은 같은 candidate bytes, revision, state에 묶인다.
- publication은 동일 transaction 재실행과 단계별 crash에서 idempotent하다.
- canonical visibility 순서와 atomic rename/fsync 계약을 지킨다.
- `n`, 빈 Enter, EOF, catch 가능한 signal은 `complete` 전 publication을 취소한다.
- package shortcut이 frontend 미구현 상태와 verifier를 깨지 않는다.
- AI, hook, CI, 비TTY 실행은 새 publication을 만들지 않는다.
- public artifact와 index는 사람의 interactive approval 전 생성되지 않는다.
