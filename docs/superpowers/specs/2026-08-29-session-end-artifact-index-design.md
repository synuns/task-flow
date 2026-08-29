# SessionEnd Artifact Index Design

## 목적

Codex 메인 세션이 종료될 때 생성된 세션 기록의 링크를
`artifacts/index.md`에 자동 반영한다. `AI_USAGE.md`는 이 인덱스에 대한
정적 링크만 가지며, 작업 범위와 프롬프트 요약, 사람 및 자동 검증 내역은
사람이 최종 판단하여 작성한다.

## 범위

포함:

- 기존 `Stop` Hook 기반 세션 Markdown 생성 유지.
- 프로젝트 로컬 `SessionEnd` command Hook 추가.
- 세션 artifact 파일명 규약 고정.
- artifact 파일명만으로 `artifacts/index.md` 전체 재렌더링.
- 동시 실행 잠금과 원자적 파일 교체.
- `AI_USAGE.md`에서 인덱스 파일로 연결되는 정적 링크.
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
`artifacts/codex-session-<session-id>.md`로 원자적 갱신한다. 인덱스를
수정하지 않는다.

### `SessionEnd` Hook

새 `.codex/hooks/render_artifact_index.py` command를 실행한다. 이 command는
Hook JSON을 검증하고 현재 세션 artifact의 존재를 확인한 뒤 artifact
디렉터리의 허용된 파일명만 조회하여 인덱스를 전체 재생성한다.

### `artifacts/index.md`

`SessionEnd`가 전부 소유하는 자동 생성 파일이다. 직접 편집할 수 있는
영역이나 병합 marker를 두지 않는다. 파일 상단에는 자동 생성 파일이라는
경고를 표시하고, 아래에 artifact 링크를 파일명 오름차순으로 기록한다.

예상 형식:

```markdown
# Codex 세션 기록 인덱스

> SessionEnd Hook이 자동 생성합니다. 직접 수정하지 마세요.

- [Codex 세션 `<session-id>`](./codex-session-<session-id>.md)
```

### `AI_USAGE.md`

`SessionEnd`가 수정하지 않는다. `전체 프롬프트와 작업 기록` 절에는 다음
정적 링크만 둔다.

```markdown
- [전체 프롬프트와 작업 기록](./artifacts/index.md)
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
- Hook 입력의 정제된 `session_id`에 대응하는 현재 artifact가 반드시 있어야
  한다. 없으면 기존 인덱스를 변경하지 않는다.

기존 `safe_session_id`도 같은 문법을 사용하도록 맞춰 exporter와 indexer가
동일한 파일명 계약을 공유한다.

## 동시 실행과 원자성

여러 메인 세션이 같은 저장소에서 종료될 수 있으므로
`artifacts/.index.lock`에 POSIX `fcntl.flock` 배타 잠금을 건다.

- `LOCK_EX | LOCK_NB`로 시도한다.
- 50ms 간격으로 재시도하되 총 대기 시간은 1초를 넘지 않는다.
- 잠금은 artifact 조회 직전부터 `index.md` 교체가 끝날 때까지 유지한다.
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
  -> 정제된 session_id의 현재 artifact 존재 확인
  -> artifacts/.index.lock 배타 잠금 획득
  -> 허용된 artifact 파일명만 조회
  -> 파일명 오름차순으로 index Markdown 렌더링
  -> 임시 파일 쓰기, fsync, os.replace
  -> 잠금 해제
  -> exit 0
```

인덱서는 transcript 경로나 각 Markdown 본문을 열지 않는다.

## 실패 처리

- 유효하지 않은 stdin JSON: 인덱스 미변경, 안전한 오류 로그, exit `1`.
- `hook_event_name`이 `SessionEnd`가 아님: 인덱스 미변경, exit `1`.
- 안전하지 않은 `session_id`: 인덱스 미변경, exit `1`.
- Hook `cwd`가 저장소 밖임: 인덱스 미변경, exit `1`.
- 현재 세션 artifact 누락: 인덱스 미변경, exit `1`.
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
- 현재 세션 artifact 누락 시 기존 인덱스 보존.
- 잘못된 JSON, event, session ID, 저장소 밖 cwd 거부.
- 다른 프로세스가 잠금을 가진 동안 1초 안에 실패하고 기존 인덱스 보존.
- 쓰기 실패 시 기존 인덱스와 임시 파일 정리 확인.
- `.codex/hooks.json`의 기존 `Stop`과 신규 `SessionEnd` handler 확인.
- `AI_USAGE.md`가 `artifacts/index.md`를 링크하고 필수 수동 절을 유지함을 확인.
- 기존 exporter 테스트 전체 회귀 확인.

실제 Hook smoke test는 임시 저장소에서 합성 SessionEnd JSON을 stdin으로
전달하고 생성된 인덱스, 종료 코드, 잔여 임시 파일을 확인한다.

## 완료 조건

- 정상적인 메인 세션 종료 후 현재 세션을 포함한 모든 허용 artifact 링크가
  `artifacts/index.md`에 정확히 한 번씩 존재한다.
- 인덱스는 artifact 파일명만 사용하며 transcript 본문을 읽지 않는다.
- 동시 `SessionEnd` 실행이 인덱스를 손상시키거나 링크를 잃지 않는다.
- 실패 시 이전 유효 인덱스가 보존된다.
- `SessionEnd` 실행은 3초 제한 안에서 끝난다.
- `AI_USAGE.md`의 수동 내용은 Hook 실행으로 변경되지 않는다.
- 사람 검증과 자동 검증이 명확히 분리된다.
- 모든 기존 및 신규 자동화 테스트가 통과한다.
