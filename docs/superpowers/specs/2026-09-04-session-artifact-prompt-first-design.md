# 세션 아티팩트 프롬프트 우선 표시 설계

## 목적

세션 아티팩트에서 각 사용자 프롬프트는 바로 읽을 수 있게 유지하고, 그 아래의
도구 실행과 assistant 응답은 필요할 때만 펼쳐 보게 한다. 기록 내용, 순서,
마스킹과 사람 검토 경계는 바꾸지 않는다.

현재 공개 아티팩트 23개는 약 43만 줄이고 가장 긴 문서는 약 7만 8천 줄이다.
프롬프트만 확인하려는 검토자가 작업 로그를 계속 건너뛰어야 하는 문제를
Markdown의 기본 `<details>` 요소로 해결한다.

## 결정

각 Turn은 `User prompt`를 기본 노출하고 `Tool activity`와
`Assistant response`를 하나의 `작업 내용 보기` 접기 안에 둔다.

```markdown
## Turn 1

### User prompt

<사용자 프롬프트>

<details>
<summary>작업 내용 보기</summary>

### Tool activity

<도구 실행 기록>

### Assistant response

<응답 기록>

</details>
```

도구 실행과 응답이 모두 없는 Turn에는 빈 `<details>`를 만들지 않는다.
세션 metadata, review metadata, 경고와 사용자 프롬프트는 접지 않는다.

검토한 대안은 다음과 같다.

- 도구 실행과 응답을 각각 접으면 선택성은 높지만 Turn마다 제어가 늘어난다.
- 프롬프트 전용 파일을 추가하면 내용과 공개 원장이 이중화된다.

한 번의 접기가 현재 요구를 충족하므로 별도 파일, JavaScript와 dependency는
추가하지 않는다.

## 생성과 기존 기록 변환

`.codex/hooks/export_session.py`의 Markdown renderer가 앞으로 생성하는 모든
candidate를 위 구조로 출력한다. parser, redaction, lifecycle과 publication
동작은 변경하지 않는다.

기존 `artifacts/codex-session-*.md`도 같은 구조로 일괄 변환한다. 변환은
Turn 내부의 첫 `### Tool activity` 또는 `### Assistant response` 앞에 여는 태그를,
다음 `## Turn` 또는 파일 끝 앞에 닫는 태그를 추가하는 presentation-only 변경이다.
원래 문장, 공백, 순서, review metadata와 마스킹 결과는 수정하지 않는다.

기존 공개 기록은 사람이 검토한 증거이므로 변환된 전체 diff를 사람이 다시
검토하기 전에는 완료 처리하지 않는다. AI는 review status를 새로 부여하거나
사람을 대신해 게시하지 않는다.

## 검증

- renderer test로 프롬프트가 `<details>` 밖에 있고 도구 실행과 응답은 안에
  있는지 확인한다.
- 도구 또는 응답 중 하나만 있는 Turn과 둘 다 없는 Turn을 확인한다.
- 변환된 기존 파일에서 추가한 wrapper만 제거하면 변환 전 bytes와 동일한지
  검사한다.
- 기존 redaction, scanner, publisher와 index focused test를 재실행한다.
- `pnpm verify quick`과 `git diff --check`를 실행한다.
- 저장소 Markdown presentation 변경이므로 애플리케이션 Journey browser QA는
  적용하지 않는다. 사람은 실제 repository renderer에서 기본 접힘과 펼치기를
  확인한다.

## 완료 조건

- 모든 Turn의 사용자 프롬프트가 기본 노출된다.
- 작업 내용은 `작업 내용 보기` 한 번으로 펼치고 접을 수 있다.
- 미래 candidate와 기존 공개 아티팩트가 같은 구조를 사용한다.
- 기존 기록의 텍스트와 검토 metadata가 손실되거나 변경되지 않는다.
- 기존 공개 아티팩트의 변환 diff를 사람이 다시 검토한다.

