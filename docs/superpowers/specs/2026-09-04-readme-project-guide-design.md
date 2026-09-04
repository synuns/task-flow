# README 프로젝트 안내 설계

## 목적

처음 저장소를 여는 검토자가 `README.md` 한 곳에서 과제 범위, 구현 결과,
실행·로그인·테스트 방법, 에이전트 작업 방식과 상세 근거의 위치를 파악하게 한다.
원본 요구사항과 OpenAPI 계약의 우선순위는 바꾸지 않는다.

공개 프로젝트명은 `TaskFlow`로 정하고 README, browser title, app shell과 package
metadata에 같은 이름을 사용한다. 원본 과제의 기관명과 과거 evidence는 출처와
추적성을 위해 수정하지 않는다.

## 구성

README는 다음 순서로 작성한다.

1. 프로젝트와 구현 범위를 짧게 소개한다.
2. 설치, 개발 서버, 테스트 계정, production preview를 바로 실행할 수 있게 안내한다.
3. 주요 화면과 기술 구성을 표로 보여준다.
4. `assignment-original/requirement.md`의 원본 요구사항과 승인 후 추가한 보완 기능을
   별도 표로 나누고 API 계약, 구현·검증 문서로 연결한다.
5. 여섯 Journey의 의미, 분리 기준, 구현 단위와 evidence를 표로 연결한다.
6. requirement 선택부터 final QA까지의 workflow를 Mermaid로 먼저 시각화하고 단계별
   설명을 표로 제공한다.
7. focused test와 `pnpm verify setup|quick|full`, Journey E2E의 용도를 구분한다.
8. 핵심 디렉터리 역할과 상세 문서 링크를 표로 정리한다.

## Product Showcase

승인된 B안은 GitHub Markdown의 기본 기능과 실제 제품 화면으로 프로젝트를 소개한다.

- 상단 Hero에 한 줄 설명, React·TypeScript·Vite·Vitest 정적 배지와 주요 section
  바로가기를 둔다.
- Quick Start는 최상단에 유지하고 테스트 데이터 초기화 안내만 `IMPORTANT` alert로
  강조한다.
- 로그인 후 대시보드의 실제 1280×720 화면 한 장을 repository 안에 저장한다.
- Core 4개와 Additional 2개 Journey는 별도 Mermaid subgraph와 표로 함께 표시한다.
- workflow Mermaid는 `Plan → Build → Verify → Accept` 네 단계로 묶는다.
- production preview, Journey별 E2E 명령, Architecture처럼 보조 정보만 `<details>`로
  접는다.
- Node.js의 `||` 조건은 Markdown 표 밖에 두어 열 구분자로 오인되지 않게 한다.

커스텀 배너, 테마별 이미지와 여러 화면 갤러리는 추가하지 않는다. 제품 변경 때 관리할
이미지는 대시보드 한 장으로 제한한다.

`AI_USAGE.md`는 사용한 스킬을 단계별로 정리한다. 컬렉션 소속 스킬은
`컬렉션:스킬` 전체 식별자를 쓰고 Ponytail 사용도 포함한다. 하단 `프롬프트 작업
기록`에는 `artifacts/index.md` 링크만 둔다. 공개 기록 목록의 단일 출처는 artifact
index이며 publisher는 `AI_USAGE.md`를 다시 생성하지 않는다.

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
- app shell과 browser title에서 `TaskFlow` 노출을 확인한다.

## 작업 기록

기존 `QA-03`의 후속 문서 개선 작업으로 `TODO.md`에 별도 task block을 추가하고,
이번 세션이 해당 block의 owner로서 실행 명령과 결과를 evidence에 기록한다.
