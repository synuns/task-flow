# SessionEnd Artifact Index Design

## 목적

Codex 메인 세션이 종료될 때 생성된 세션 기록의 링크를
`artifacts/index.md`에 자동 반영한다. `AI_USAGE.md`는 이 인덱스에 대한
정적 링크와 explicit publisher가 관리하는 검토 완료 링크 영역을 가지며,
작업 범위와 프롬프트 요약, 사람 및 자동 검증 내역은 사람이 최종 판단하여
작성한다.

## 범위

포함:

- 기존 `Stop` Hook 기반 비추적 pending 세션 Markdown 생성 유지.
- 사람 검토와 명시적 게시 command 유지.
- 프로젝트 로컬 `SessionEnd` command Hook 추가.
- 세션 artifact 파일명 규약 고정.
- artifact 파일명만으로 `artifacts/index.md` 전체 재렌더링.
- 동시 실행 잠금과 원자적 파일 교체.
- `AI_USAGE.md`에서 인덱스 파일로 연결되는 정적 링크.
- explicit publisher만 갱신하는 `AI_USAGE.md` 검토 완료 managed 링크.
- Hook 구성, 파일 선택, 잠금, 멱등성, 실패 보존 테스트.

제외:

- `SessionEnd`에서 transcript 내용 읽기.
- 세션 기록에 대한 의미 추출 또는 요약.
- 모델이나 네트워크 호출.
- `AI_USAGE.md`의 작업 범위, 핵심 프롬프트 요약, 사람 검증 내역 자동 수정.
- subagent 세션 인덱싱.

## 공식 동작 제약

[OpenAI Hooks 문서](https://developers.openai.com/codex/hooks)에 따라
`SessionEnd`는 다음 제약을 가진다.

- 메인 스레드가 종료될 때만 실행되며 subagent에는 실행되지 않는다.
- 동기 실행되며 `async` 설정으로 백그라운드화할 수 없다.
- 기본 timeout은 1초이고 설정 가능한 최대 timeout은 3초다.
- Hook 실행 중 transcript를 읽을 수 있지만, 이 기능에서는 사용하지 않는다.
- 출력은 Codex 동작을 계속시키거나 세션을 열린 상태로 유지하지 못한다.

따라서 Hook은 로컬 디렉터리 조회와 작은 Markdown 렌더링만 수행하고
`timeout: 3`으로 설정한다.

## 구조와 책임

### `Stop` Hook

기존 `.codex/hooks/export_session.py`를 사용하여 현재 transcript를
`.codex/review-pending/codex-session-<session-id>.md`로 원자적 갱신한다.
pending 디렉터리는 Git에서 제외하며 인덱스를 수정하지 않는다.

### `publish-ai-record` command

사람이 pending 후보의 내용과 민감정보를 확인한 뒤 명시적 확인 flag와 함께
실행한다. 검토 metadata를 추가한 기록을
`artifacts/codex-session-<session-id>.md`로 게시하고 같은 index 잠금 안에서
`artifacts/index.md`를 갱신한다. 게시 또는 인덱스 갱신 실패 시 기존 게시
기록을 복구한다. 같은 잠금 안에서 `AI_USAGE.md`를 다시 읽어 managed 링크를
렌더링하고 artifact, index, `AI_USAGE.md` 순서로 교체한다. 후속 교체 실패 시
역순으로 기존 index와 artifact를 복구하며 불완전 복구는 수동 복구가 필요한
명시적 오류로 보고한다.

### `SessionEnd` Hook

새 `.codex/hooks/render_artifact_index.py` command를 실행한다. 이 command는
Hook JSON을 검증한 뒤 artifact 디렉터리의 허용된 게시 파일명만 조회하여
기존 index의 게시 ledger를 전체 재렌더링한다. 종료 중인 현재 세션은 아직
pending 상태일 수 있으므로 대응하는 게시 artifact 존재를 요구하지 않는다.
index에 없는 파일은 이름이 규약과 일치해도 게시 완료로 추정하지 않는다.

### `artifacts/index.md`

publisher가 게시 항목을 추가하고 `SessionEnd`가 검증·정리하는 자동 생성
파일이자 게시 ledger다. 직접 편집할 수 있는 영역이나 병합 marker를 두지
않는다. 파일 상단에는 자동 생성 파일이라는 경고를 표시하고, 아래에
artifact 링크를 파일명 오름차순으로 기록한다.

예상 형식:

```markdown
# Codex 세션 기록 인덱스

> 게시 명령과 SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요.

- [Codex 세션 `<session-id>`](./codex-session-<session-id>.md)
```

### `AI_USAGE.md`

`SessionEnd`가 수정하지 않는다. `전체 프롬프트와 작업 기록` 절에는 다음
정적 index 링크와 publisher 전용 managed marker 쌍을 둔다.

```markdown
- [전체 프롬프트와 작업 기록](./artifacts/index.md)

<!-- reviewed-records:start -->
<!-- reviewed-records:end -->
```

다음 내용은 수동 또는 제출 전 최종 검토로 관리한다.

- 적용한 작업 범위.
- 핵심 프롬프트 요약.
- 사람이 최종 검증한 내용.
- 자동 검증 내역.

사람 검증과 자동 검증은 별도 절로 유지하여 자동화 결과를 사람의 확인으로
표현하지 않는다.

## Artifact 네이밍과 선택

고정 경로 형식:

```text
artifacts/codex-session-<session-id>.md
```

`session-id` 허용 문법:

```regex
[A-Za-z0-9][A-Za-z0-9._-]{0,127}
```

완전한 파일명 선택 정규식:

```regex
^codex-session-[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.md$
```

선택 규칙:

- `artifacts/` 바로 아래 항목만 조회한다.
- 정규식 전체가 일치하는 일반 파일만 포함한다.
- 심볼릭 링크와 디렉터리는 제외한다.
- `index.md`, `.gitkeep`, 임시 파일, 유사 접두사 파일은 제외한다.
- 파일명 기준 오름차순으로 정렬한다.
- 파일명 하나당 링크 하나만 렌더링한다.
- pending 디렉터리 파일은 조회하지 않는다.
- index의 canonical 링크에 이미 등록되고 디스크에 존재하는 일반 파일만
  게시 artifact로 선택한다.
- index에 없는 matching 파일은 자동 추가하지 않는다. 신규 게시 링크는
  사람 확인을 받은 publisher만 추가한다.
- Hook 입력의 현재 `session_id`와 무관하게 기존 게시 ledger를 렌더링한다.

기존 `safe_session_id`도 같은 문법을 사용하도록 맞춰 exporter와 indexer가
동일한 파일명 계약을 공유한다.

## 동시 실행과 원자성

여러 메인 세션이 같은 저장소에서 종료될 수 있으므로
`artifacts/.index.lock`에 POSIX `fcntl.flock` 배타 잠금을 건다.

- `LOCK_EX | LOCK_NB`로 시도한다.
- 50ms 간격으로 재시도하되 총 대기 시간은 1초를 넘지 않는다.
- 잠금은 artifact 조회 직전부터 `index.md` 교체가 끝날 때까지 유지한다.
- publisher는 잠금을 얻은 뒤 `AI_USAGE.md`를 다시 읽고 managed 링크를
  렌더링하여 동시 publisher의 lost update를 막는다.
- 파일 descriptor가 닫히거나 프로세스가 끝나면 커널이 잠금을 해제하므로
  stale lock이 남아 실행을 영구 차단하지 않는다.
- 1초 안에 잠금을 얻지 못하면 기존 인덱스를 보존하고 실패를 보고한다.

인덱스 내용은 먼저 `artifacts/.index-*.tmp`에 기록하고 flush 및 `fsync` 후
`os.replace`로 교체한다. 실패하면 임시 파일을 제거하고 기존
`artifacts/index.md`를 보존한다.

`artifacts/.index.lock`과 `artifacts/.index-*.tmp`는 Git에서 제외한다.

## 데이터 흐름

```text
메인 세션 종료
  -> SessionEnd Hook JSON을 stdin으로 전달
  -> hook_event_name, session_id, cwd 검증
  -> artifacts/.index.lock 배타 잠금 획득
  -> 기존 index의 canonical 게시 링크 검증
  -> 존재하는 허용 artifact 파일명만 유지
  -> 파일명 오름차순으로 index Markdown 렌더링
  -> 임시 파일 쓰기, fsync, os.replace
  -> 잠금 해제
  -> exit 0
```

인덱서는 transcript 경로나 각 Markdown 본문을 열지 않는다.

```text
Stop Hook
  -> 구조 필터링과 마스킹
  -> .codex/review-pending/ 후보 저장
  -> 사람 검토와 명시적 publish command
  -> artifacts/.index.lock 배타 잠금 획득
  -> AI_USAGE.md managed 영역 재읽기와 링크 렌더링
  -> 검토 완료 artifact, index, AI_USAGE.md 순서로 갱신
```

## 실패 처리

- 유효하지 않은 stdin JSON: 인덱스 미변경, 안전한 오류 로그, exit `1`.
- `hook_event_name`이 `SessionEnd`가 아님: 인덱스 미변경, exit `1`.
- 안전하지 않은 `session_id`: 인덱스 미변경, exit `1`.
- Hook `cwd`가 저장소 밖임: 인덱스 미변경, exit `1`.
- 기존 index 형식이 canonical renderer 출력과 다름: 인덱스 미변경, exit `1`.
- 잠금 획득 timeout: 인덱스 미변경, exit `1`.
- 디렉터리 조회 또는 쓰기 실패: 기존 인덱스 보존, exit `1`.
- 성공: stdout과 stderr를 비우고 exit `0`.

진단은 `.codex/hooks/artifact-index.log`에 기록한다. 로그에는 timestamp,
event 이름, 정제된 session ID만 포함하며 transcript 내용이나 전체 경로는
기록하지 않는다. 실패 시 stderr에는 비밀정보가 없는 짧은 오류 코드만
출력하여 Codex가 Hook 실패를 표시할 수 있게 한다.

## 파일 변경

- 생성: `.codex/hooks/render_artifact_index.py` — 입력 검증, 잠금, artifact
  선택, 인덱스 렌더링, 원자적 저장, CLI.
- 생성: `tests/test_render_artifact_index.py` — 렌더러 단위 및 CLI 테스트.
- 수정: `scripts/publish-ai-record` — 검토 기록 게시와 같은 잠금 안의 인덱스
  갱신, 실패 복구.
- 생성: `tests/test_publish_ai_record.py` — 사람 확인, 민감정보 차단, 게시와
  인덱스 원자성 테스트.
- 생성: `artifacts/index.md` — 추적되는 자동 생성 인덱스.
- 수정: `.codex/hooks.json` — `SessionEnd` command 등록.
- 수정: `.codex/hooks/export_session.py` — artifact 이름 문법 통일.
- 수정: `tests/test_export_session.py` — 이름 문법과 두 Hook 구성 검증.
- 수정: `AI_USAGE.md` — 자동 생성 인덱스 정적 링크와 자동 검증 절 추가.
- 수정: `.gitignore` — 잠금, 임시 파일, indexer 로그 제외.
- 삭제: `artifacts/.gitkeep` — 추적되는 인덱스가 디렉터리를 유지하므로 제거.

## 테스트 전략

단위 테스트:

- 허용 파일명과 거부 파일명 경계.
- 일반 파일만 선택하고 심볼릭 링크와 하위 디렉터리 제외.
- 파일명 오름차순과 중복 없는 링크 렌더링.
- 동일 입력에서 동일 Markdown 생성.
- 같은 인덱스를 반복 생성해도 내용이 변하지 않음.

CLI 및 통합 테스트:

- 유효한 `SessionEnd` 입력으로 인덱스 최초 생성.
- 여러 artifact를 포함한 전체 인덱스 재생성.
- 현재 세션이 pending 상태여도 기존 게시 artifact만으로 인덱스 생성.
- index에 없는 matching artifact가 자동 추가되지 않음.
- 잘못된 JSON, event, session ID, 저장소 밖 cwd 거부.
- 다른 프로세스가 잠금을 가진 동안 1초 안에 실패하고 기존 인덱스 보존.
- 쓰기 실패 시 기존 인덱스와 임시 파일 정리 확인.
- 두 publisher의 동시 게시에서도 두 artifact, index 링크, managed 링크 보존.
- index 또는 AI_USAGE 쓰기 실패 시 이전 artifact/index/AI_USAGE byte 복원.
- `.codex/hooks.json`의 기존 `Stop`과 신규 `SessionEnd` handler 확인.
- `AI_USAGE.md`가 `artifacts/index.md`를 링크하고 필수 수동 절을 유지함을 확인.
- 기존 exporter 테스트 전체 회귀 확인.

실제 Hook smoke test는 임시 저장소에서 합성 SessionEnd JSON을 stdin으로
전달하고 생성된 인덱스, 종료 코드, 잔여 임시 파일을 확인한다.

## 완료 조건

- 정상적인 메인 세션 종료 후 모든 게시 완료 artifact 링크가
  `artifacts/index.md`에 정확히 한 번씩 존재한다.
- Stop Hook은 pending 후보만 만들고 사람 확인 전 추적 artifact를 만들지 않는다.
- explicit reviewed publisher는 검토 완료 artifact와 index를 교체한 뒤
  `AI_USAGE.md`의 managed 검토 완료 영역을 갱신한다. `SessionEnd`는
  `AI_USAGE.md`를 수정하지 않는다.
- 이름이 맞는 미검토·미등록 파일은 SessionEnd가 index에 추가하지 않는다.
- 인덱스는 artifact 파일명만 사용하며 transcript 본문을 읽지 않는다.
- 동시 `SessionEnd` 실행이 인덱스를 손상시키거나 링크를 잃지 않는다.
- 실패 시 이전 유효 인덱스가 보존된다.
- `SessionEnd` 실행은 3초 제한 안에서 끝난다.
- `AI_USAGE.md`의 수동 내용은 Hook 실행으로 변경되지 않는다.
- 사람 검증과 자동 검증이 명확히 분리된다.
- 모든 기존 및 신규 자동화 테스트가 통과한다.
