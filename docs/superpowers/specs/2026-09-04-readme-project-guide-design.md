# README 프로젝트 안내 설계

## 목적

처음 저장소를 여는 검토자가 `README.md` 한 곳에서 과제 범위, 구현 결과,
실행·로그인·테스트 방법, 에이전트 작업 방식과 상세 근거의 위치를 파악하게 한다.
원본 요구사항과 OpenAPI 계약의 우선순위는 바꾸지 않는다.

## 구성

README는 다음 순서로 작성한다.

1. 프로젝트와 구현 범위를 짧게 소개한다.
2. 주요 화면과 기능을 route 중심 표로 보여준다.
3. `assignment-original/requirement.md`의 항목을 원본, API 계약, 구현·검증 문서로
   연결해 한 번에 확인할 수 있게 한다.
4. 기술 스택과 핵심 디렉터리 역할을 요약한다.
5. 설치, 개발 서버, production preview 순서와 접속 URL을 제공한다.
6. MSW 전용 테스트 계정과 데이터 초기화 조건을 명시한다.
7. focused test와 `pnpm verify setup|quick|full`, Journey E2E의 용도를 구분한다.
8. requirement 선택부터 격리 worktree, 구현, 자동·브라우저 검증, evidence 기록,
   적대적 검토, 사람 checkpoint, final QA로 이어지는 에이전트 workflow를 설명한다.
9. 원본 명세, 품질 문서, 설계·계획, AI 사용 기록과 세션 아티팩트 링크를 모은다.

## 아티팩트 인덱스

`artifacts/index.md`의 각 링크는 `작업 주제 — 세션 ID` 형식으로 표시한다. 세션
ID와 파일 경로는 그대로 유지해 추적 가능성을 보존한다. 작업 주제는 사람이 공개
기록의 실제 내용을 읽고 붙인다.

인덱스는 게시 명령과 SessionEnd Hook이 다시 생성하므로, 생성기는 현재 인덱스에
검증된 파일 경로와 함께 저장된 제목을 읽어 같은 제목을 보존한다. 새 공개 기록은
제목이 아직 없을 때 기존 `Codex 세션 — 세션 ID` 표시를 사용한다. 프롬프트를
추측해 자동 요약하거나 공개 아티팩트 본문을 변경하지 않는다.

## 검증

- README의 로컬 링크와 명령이 실제 파일·`package.json`·Playwright 설정과 맞는지
  확인한다.
- 인덱스 parser가 허용된 제목을 검증하고 재생성 뒤에도 제목을 보존하는 focused
  unit test를 둔다.
- `pnpm verify quick`과 `git diff --check`로 문서, hook contract, 전체 정적·단위
  검증을 실행한다.
- 제품 화면 동작은 바뀌지 않으므로 새 browser Journey 실행은 적용하지 않는다.

## 작업 기록

기존 `QA-03`의 후속 문서 개선 작업으로 `TODO.md`에 별도 task block을 추가하고,
이번 세션이 해당 block의 owner로서 실행 명령과 결과를 evidence에 기록한다.
