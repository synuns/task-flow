# Session Artifact Lifecycle Design

## 목적

Codex 세션 기록 후보가 언제 생성되고 어떤 상태인지 명확히 판별할 수 있게
한다. 첫 사용자 프롬프트부터 검토 전 후보를 보존하고, turn 완료·세션 종료·
재개·clear·사람 게시를 명시적 상태 전이로 관리한다. 오래된 hook과 실패한
parser가 최신 snapshot을 손상시키지 않아야 한다.

이 설계는 제품 요구사항이 아닌 개발 기록 자동화의 `TOOLING` 계약이다.
사람 검토 전 기록을 제출용 `artifacts/`에 게시하지 않는 기존 신뢰 경계는
유지한다.

## Codex lifecycle 기준

[OpenAI Hooks 문서](https://learn.chatgpt.com/docs/hooks)를 현재 release 동작의
기준으로 사용한다.

- `UserPromptSubmit`은 assistant 실행 전 발생하며 `prompt`와 `turn_id`를
  제공한다.
- `Stop`은 turn 종료 시 발생한다.
- `SessionStart.source`는 `startup`, `resume`, `clear`, `compact`다.
- `SessionEnd`는 main thread 종료 시 동기 실행되며 timeout은 최대 3초다.
- 여러 hook 실행은 완료 순서가 달라질 수 있다.
- `transcript_path`는 편의 입력일 뿐 transcript 형식은 안정적인 공개
  인터페이스가 아니다.

따라서 snapshot 생성은 `SessionEnd`에 의존하지 않는다. `UserPromptSubmit`과
`Stop`이 내용 생성 책임을 갖고, `SessionEnd`는 metadata 상태 전이만 담당한다.

## 용어

- **physical session**: Codex가 제공한 `session_id` 단위.
- **segment**: 하나의 대화 주제 단위. 같은 physical session 안에서 `clear`가
  발생하면 새 segment를 만든다.
- **record ID**: `<session-id>.s<4자리 segment 번호>` 형식의 검토·게시 단위.
- **snapshot**: 특정 revision에서 보존된 redacted Markdown 후보.
- **lifecycle state**: `pending`, `closed`, `published` 중 하나.
- **hook result**: `ok`, `error`, `stale` 중 하나. lifecycle state와 분리한다.
- **revision**: segment 안에서 수락된 상태 변경마다 증가하는 정수.
- **parser version**: 비안정 transcript 형식에 대응하는 adapter 버전.

`error`는 lifecycle state가 아니다. parser 실패가 발생해도 기존 `pending` 또는
`closed` 상태와 마지막 유효 snapshot을 보존하면서 `last_hook_status=error`를
기록한다.

## 상태 전이

| Event | 선행 상태 | 결과 | 내용 변환 |
| --- | --- | --- | --- |
| `UserPromptSubmit` | record 없음 | segment 1 `pending` | redacted prompt 기반 최소 snapshot 생성 |
| `UserPromptSubmit` | `pending` | revision 증가 | 기존 본문 보존 후 redacted prompt를 provisional turn으로 추가 |
| `Stop` | `pending` | revision 증가, `pending` 유지 | transcript 전체 snapshot 생성 |
| `SessionEnd` | `pending` | `closed` | 없음; metadata와 log만 갱신 |
| `SessionEnd` | `closed` | 변화 없음 | idempotent 성공 기록 |
| `SessionStart(resume)` | `closed` | 같은 segment `pending` | 없음; revision 증가 |
| `SessionStart(resume)` | `pending` | 변화 없음 | idempotent 성공 기록 |
| `SessionStart(clear)` | 현재 segment 존재 | 현재 segment `closed`, 다음 segment 예약 | 없음; segment generation 증가 |
| `SessionStart(clear)` | record 없음 | segment 1 예약 | 없음 |
| `SessionStart(compact)` | 모든 상태 | lifecycle 변화 없음 | 없음 |
| `SessionStart(startup)` | record 없음 | manifest 초기화 | 없음 |
| 사람 게시 성공 | `closed` | `published` | reviewed artifact와 공개 index 생성 |

`clear`는 같은 physical session 안의 새 대화 주제로 취급한다. 기존 segment는
다시 쓰지 않고 다음 segment를 사용한다. 예약된 새 segment의 첫 Markdown은
다음 `UserPromptSubmit`에서 생성한다.

`published` record는 다시 `pending`으로 바꾸지 않는다. 이미 게시한 segment를
재개해야 한다면 같은 physical session의 다음 segment를 만든다.

## 저장 구조

Git에서 제외되는 검토 대기 영역:

```text
.codex/review-pending/
  codex-session-<session-id>.s0001.md
  codex-session-<session-id>.s0001.json
  sessions/
    <session-id>.json
  index.md
```

운영 로그:

```text
.codex/hooks/session-record-events/
  <UTC timestamp>-<process ID>-<nonce>.jsonl
```

각 파일 책임:

- Markdown: 사람이 검토할 redacted snapshot 본문.
- record metadata JSON: 해당 segment의 상태, revision, snapshot hash, parser
  결과를 보유하는 commit marker.
- session manifest JSON: 현재 segment 번호와 physical session generation을
  보유한다.
- pending index: 상태가 `pending` 또는 `closed`이고 metadata와 hash가 일치하는
  Markdown 링크만 포함한다.
- event log: 내용이나 전체 경로 없이 hook 실행 결과만 기록한다.

공개 영역은 기존과 같다.

```text
artifacts/codex-session-<record-id>.md
artifacts/index.md
AI_USAGE.md reviewed-records managed region
```

## Metadata 계약

record metadata는 다음 필드를 가진 canonical JSON object다.

```json
{
  "schema_version": 1,
  "parser_version": "codex-rollout-v1",
  "state": "pending",
  "session_id": "thr_123",
  "record_id": "thr_123.s0001",
  "segment": 1,
  "generation": 1,
  "revision": 3,
  "last_turn_id": "turn_123",
  "snapshot_kind": "turn_complete",
  "last_hook_event": "Stop",
  "transcript": {
    "size": 12345,
    "mtime_ns": 123456789,
    "observed_at": "2026-08-29T11:00:00Z",
    "last_record_timestamp": "2026-08-29T10:59:59Z",
    "sha256": "<64 lowercase hex>"
  },
  "artifact_sha256": "<64 lowercase hex>",
  "updated_at": "2026-08-29T11:00:01Z",
  "last_hook_status": "ok",
  "last_error": null
}
```

규칙:

- timestamp는 UTC RFC 3339 형식이다.
- `artifact_sha256`은 Markdown 파일 전체 bytes의 digest다.
- `snapshot_kind`는 `prompt_minimum`, `prompt_provisional`, `turn_complete` 중
  하나다.
- transcript path는 metadata와 log에 저장하지 않는다.
- 최소 snapshot에서는 transcript 정보가 없을 수 있으며 각 transcript 필드를
  `null`로 기록한다.
- parser 실패 시 `artifact_sha256`, lifecycle state, 마지막 유효 transcript
  watermark를 보존한다.
- `last_error`는 정해진 오류 코드와 비민감 설명만 포함한다.

session manifest는 다음 필드를 가진다.

```json
{
  "schema_version": 1,
  "session_id": "thr_123",
  "generation": 1,
  "current_segment": 1,
  "current_record_id": "thr_123.s0001",
  "revision": 4,
  "updated_at": "2026-08-29T11:00:01Z"
}
```

## Transcript adapter

transcript parser는 `.codex/hooks/export_session.py` 바깥의 명시적 adapter
경계로 분리한다. hook orchestration과 metadata 코드는 rollout JSONL 내부
구조를 직접 참조하지 않는다.

읽기 절차:

1. 입력 경로를 symlink follow 없이 열고 일반 파일인지 확인한다.
2. 하나의 descriptor로 파일을 한 번 읽는다.
3. 읽기 전후 `fstat`의 inode, size, `mtime_ns`를 비교한다.
4. 읽는 동안 바뀌었으면 `transcript_changed`로 실패한다.
5. exact bytes의 SHA-256을 계산한다.
6. 선택된 parser version으로 구조 필터링, redaction, Markdown 렌더링을 한다.

지원하지 않는 record는 무시할 수 있지만 JSON 손상, 필수 session 경계 손실,
알 수 없는 필수 구조는 오류로 분류한다. parser version 변경은 fixture와 이전
version 호환 테스트를 동반한다.

## Revision과 동시성

session별 lock 파일을 사용한다. 무거운 transcript parse 동안 lock을 계속
잡지 않는다.

`Stop` 처리:

1. lock 획득.
2. 현재 `(generation, segment, revision, state)`를 base revision으로 캡처.
3. lock 해제.
4. transcript read, parse, redaction, 임시 snapshot 생성.
5. lock 재획득.
6. base revision과 현재 manifest를 compare-and-swap 비교.
7. generation, segment, revision이 달라졌거나 state가 `pending`이 아니면
   임시 결과를 폐기하고 `stale`로 기록.
8. 일치하면 새 snapshot과 metadata를 commit하고 revision 증가.

`UserPromptSubmit`, `SessionStart`, `SessionEnd`는 짧은 작업이므로 lock 안에서
상태 전이를 완료한다. `clear`, `resume`, `SessionEnd`는 revision을 증가시켜
이전에 시작한 무거운 `Stop` 결과를 무효화한다.

parser·redaction 실패도 lock을 다시 얻어 base revision이 여전히 일치할 때만
오류 metadata와 revision을 갱신한다. base revision이 달라졌으면 최신 metadata를
건드리지 않고 `stale`만 기록한다.

동일 revision의 반복 event는 idempotency key
`<event>:<session-id>:<turn-id-or-source>:<base-revision>`으로 중복을 제거한다.

## 원자적 쓰기와 복구

모든 상태 파일은 대상과 같은 디렉터리에 임시 파일을 만들고 다음 순서로
쓴다.

1. mode `0600` 임시 파일 생성.
2. 전체 bytes 쓰기.
3. file `flush`와 `fsync`.
4. `os.replace`로 atomic rename.
5. parent directory `fsync`.

snapshot과 metadata는 서로 다른 파일이므로 record metadata를 commit marker로
사용한다. 기존 snapshot을 잃지 않도록 bounded previous slot을 둔다.

```text
<record-id>.md
.<record-id>.previous.md
.<record-id>.next.tmp
```

commit 절차:

1. next snapshot 완성·검증.
2. 현재 snapshot이 있으면 previous slot으로 rename.
3. next를 canonical Markdown으로 rename.
4. 새 artifact hash를 가진 metadata를 atomic replace.
5. metadata와 canonical Markdown hash 일치 확인.
6. previous slot 제거.
7. manifest와 pending index를 각각 atomic replace.

재시작 시 metadata hash를 기준으로 복구한다.

- canonical hash가 metadata와 일치하면 canonical을 유지하고 previous를 정리.
- previous hash가 metadata와 일치하면 previous를 canonical로 복원.
- 둘 다 일치하지 않으면 어떤 snapshot도 게시·index하지 않고
  `snapshot_hash_mismatch`를 기록한다.

pending index는 파생물이다. index 교체 실패가 snapshot commit을 무효화하지
않는다. 다음 성공 hook이 metadata에서 전체 index를 재생성한다.

## Event별 처리

### UserPromptSubmit

- transcript에 의존하지 않는다.
- hook input의 `prompt`, `session_id`, `turn_id`만 사용한다.
- 새 record라면 구조 필터링과 redaction 후 최소 Markdown을 생성하고
  `snapshot_kind=prompt_minimum`으로 기록한다.
- 기존 pending record라면 마지막 유효 본문을 보존하고 redacted prompt를
  provisional turn으로 추가하며 `snapshot_kind=prompt_provisional`로 기록한다.
  따라서 다음 prompt hook이 이전 Stop의 완전한 snapshot을 축소하지 않는다.
- record가 없으면 예약된 segment 또는 segment 1을 사용한다.
- snapshot, metadata, manifest, pending index를 갱신한다.
- 성공 시 Codex가 요구하는 continuation JSON만 stdout에 쓴다.

### Stop

- 현재 pending segment의 전체 snapshot 생성 담당이다.
- transcript adapter 실패 시 기존 snapshot을 보존한다.
- 성공 시 `snapshot_kind=turn_complete`인 snapshot, metadata, manifest, pending
  index를 갱신한다.
- stale 결과는 파일을 덮지 않는다.

### SessionEnd

- 최대 3초 제한 안에서 동기 실행한다.
- transcript를 열거나 parser를 호출하지 않는다.
- session lock 아래 현재 pending metadata를 `closed`로 바꾼다.
- manifest revision과 event log만 갱신한다.
- pending index는 링크 목록만 가지므로 재생성하지 않는다.
- 실패 시 비민감 오류 코드와 nonzero exit로 Codex에 알린다.

### SessionStart

- `resume`: 마지막 `closed` segment를 같은 record ID의 `pending`으로 전환한다.
- `clear`: 현재 segment를 `closed`로 만들고 다음 segment 번호를 예약한다.
- `compact`: 현재 상태를 유지한다.
- `startup`: manifest가 없을 때 빈 manifest만 준비한다.

### Publisher

- `closed` record만 게시 입력으로 허용한다.
- 사람이 exact candidate bytes와 민감정보를 검토하고 digest와 두 확인 flag를
  제공하는 기존 계약을 유지한다.
- 성공한 경우에만 reviewed artifact, 공개 index, `AI_USAGE.md` managed region을
  갱신하고 pending metadata를 `published`로 전환한 뒤 pending index에서
  제거한다.
- unindexed 또는 pending 파일을 자동 게시하지 않는다.
- pending metadata 갱신 실패 후 공개 게시가 성공한 경우 다음 publisher 또는
  setup reconciliation이 공개 index를 기준으로 `published` 상태를 복구한다.

## Hook 결과 로그

각 실행은 다음 canonical JSON object 한 줄을 남긴다.

```json
{
  "event": "Stop",
  "session_id": "thr_123",
  "turn_id": "turn_123",
  "status": "ok",
  "error": null,
  "timestamp": "2026-08-29T11:00:01Z"
}
```

`turn_id`가 없는 event는 `null`이다. `SessionStart`의 source와
`SessionEnd`의 reason은 비민감 `error`가 아니라 선택적 `detail` object에
기록한다. prompt, transcript 내용, tool input/output, 전체 경로는 기록하지
않는다.

각 hook 실행은 새 단일-line JSONL 파일을 같은 디렉터리의 임시 파일에 쓰고
atomic rename한다. 파일명 충돌을 막기 위해 UTC timestamp, process ID,
cryptographic random nonce를 사용한다. 기존 로그를 읽거나 다시 쓰지 않으므로
`SessionEnd` 작업량도 로그 크기와 무관하게 일정하다. setup reconciliation이
보존기간이 지난 로그를 별도 정리할 수 있으며 hook은 정리를 수행하지 않는다.
log 실패는 snapshot 성공을 되돌리지 않지만 hook stderr에
`event_log_failed`를 보고한다.

## 오류 처리

| 오류 | snapshot | metadata | hook 결과 |
| --- | --- | --- | --- |
| transcript 없음/변경 | 보존 | `last_hook_status=error` | `error` log |
| parser 실패 | 보존 | parser 오류 코드 기록 | `error` log |
| redaction audit 실패 | 보존 | `sensitive_candidate` | `error` log |
| revision 불일치 | 보존 | 변경 없음 | `stale` log |
| metadata 쓰기 실패 | previous slot으로 복구 | 기존 metadata 보존 | nonzero/error |
| pending index 실패 | 새 snapshot 유지 | `ok` commit 유지 | `index_update_failed` log |
| SessionEnd timeout | 기존 state 유지 가능 | 다음 start에서 reconciliation | Codex hook failure |

로그와 metadata에는 exception 원문, prompt, transcript path를 쓰지 않는다.

## 기존 후보 이관

기존 `.codex/review-pending/codex-session-<session-id>.md`는 첫 lifecycle hook
실행 시 session lock 아래 segment 1로 이관한다.

- bytes를 변경하지 않고 `<session-id>.s0001.md`로 atomic rename한다.
- digest와 최소 metadata를 생성한다.
- lifecycle state는 `pending`으로 시작한다.
- 기존 공개 index에 없는 `artifacts/` 파일은 검토 완료로 추정하거나 자동
  이관하지 않는다.
- 이관 실패 시 기존 파일을 보존하고 새 snapshot 생성을 중단한다.

## 테스트 전략

단위 테스트:

- record ID와 segment 파일명 경계.
- metadata schema, canonical JSON, timestamp, digest 검증.
- lifecycle transition table 전부.
- clear가 기존 segment를 닫고 새 segment를 예약함.
- resume이 closed segment만 pending으로 전환함.
- parser adapter가 unknown optional record를 무시하고 필수 구조 손실을 거부함.
- event log가 요구 필드만 포함하고 민감정보를 배제함.

통합 테스트:

- 첫 `UserPromptSubmit` 전에 후보가 없고 event 후 최소 후보가 생성됨.
- 각 `Stop` 후 후보와 pending index가 즉시 갱신됨.
- `SessionEnd`가 transcript를 열지 않고 metadata만 closed로 바꿈.
- 이전 Stop이 clear, resume, SessionEnd 이후 snapshot을 덮지 못함.
- parse 실패가 기존 Markdown bytes를 정확히 보존함.
- artifact, metadata, manifest, index 각 교체 지점의 주입 실패와 복구.
- canonical/previous hash 조합별 startup reconciliation.
- 기존 flat 후보의 byte-preserving segment 1 이관.
- closed가 아닌 record 게시 거부.
- 사람 검토 digest와 확인 flag 없이는 공개 파일 미생성.
- 동시 session과 같은 session의 동시 hook 경쟁.

Project wiring 테스트:

- `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd` command hook 존재.
- `SessionStart` matcher가 `resume|clear|compact|startup`을 수용함.
- `SessionEnd` timeout이 3초 이하임.
- pending 경로와 임시/previous/log 파일이 Git에서 제외됨.
- setup verification이 metadata/hash/index 불일치를 읽기 전용으로 탐지함.

검증 명령:

```bash
/usr/bin/python3 -m unittest \
  tests.test_artifact_contract \
  tests.test_export_session \
  tests.test_render_artifact_index \
  tests.test_publish_ai_record -v
./scripts/verify quick
```

Hook lifecycle은 브라우저 동작이 아니므로 browser evidence는 적용하지 않는다.

## 완료 조건

- 첫 prompt부터 최소 pending snapshot이 존재한다.
- 모든 완료 turn은 성공한 Stop 이후 후보와 pending index에 반영된다.
- metadata만 보고 pending, closed, published와 마지막 hook 결과를 구분한다.
- clear마다 별도 segment가 생성된다.
- resume은 동일 closed segment를 안전하게 reopen한다.
- 오래된 hook은 새 revision이나 segment를 덮지 못한다.
- parser 실패와 부분 쓰기 실패가 마지막 유효 snapshot을 손상시키지 않는다.
- SessionEnd는 transcript 변환 없이 3초 안에 metadata 전이만 수행한다.
- 사람의 exact-byte 검토 전에는 `artifacts/`, 공개 index,
  `AI_USAGE.md` reviewed 영역에 새 기록이 생기지 않는다.
- transcript 형식 변경은 versioned adapter와 fixture 실패로 드러난다.
