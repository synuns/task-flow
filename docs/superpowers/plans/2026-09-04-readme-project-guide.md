# README Project Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장소 검토자가 README 한 곳에서 과제 범위, 실행·로그인·검증 방법, 에이전트 workflow와 상세 근거를 찾고, 아티팩트 인덱스에서는 세션별 작업 주제를 식별하게 한다.

**Architecture:** README는 기존 원본·품질·실행 문서로 연결하는 얇은 진입점으로 유지한다. 공개 아티팩트 본문은 바꾸지 않고, 인덱스 생성기가 사람이 붙인 링크 제목을 검증해 재생성 때 보존한다.

**Tech Stack:** Markdown, Python 3 표준 라이브러리, `unittest`, pnpm 검증 스크립트

## Global Constraints

- `assignment-original/openapi.yaml`이 API 세부사항의 최우선 계약이다.
- 기존 architecture, dependency, 인증 정책과 삭제 의미를 변경하지 않는다.
- 세션 ID와 아티팩트 파일 경로는 변경하지 않는다.
- 제품 화면 동작은 변경하지 않으므로 새 browser Journey는 만들지 않는다.
- AI는 `HUMAN_APPROVED`나 최종 acceptance를 기록하지 않는다.

---

### Task 1: 작업 등록과 인덱스 제목 보존 계약

**Files:**
- Modify: `TODO.md`
- Modify: `tests/test_render_artifact_index.py`

**Interfaces:**
- Consumes: 기존 `render_index(filenames)`와 `list_published_artifact_names(index_path, artifacts_dir)`
- Produces: `render_index(filenames, titles=None)`와 `list_published_artifact_titles(index_path, artifacts_dir)`의 실패하는 계약 test

- [x] **Step 1: 작업 block 등록**

`TODO.md`의 통합·제출 QA 절에 `DOCS-README-01`을 `IN_PROGRESS`로 추가한다. Requirements는 `SYS-04`, `SYS-05`, dependency는 완료된 `QA-03`, deliverable은 README와 작업 주제형 아티팩트 인덱스다. Evidence에는 이번 세션, branch `docs/readme-guide`, 시작 SHA `c6351ffa20cc9d752c6b249123a0d2363de633e2`를 기록한다.

- [x] **Step 2: 제목 보존 test 작성**

다음 동작을 `ArtifactIndexRenderTests`에 추가한다.

```python
def test_custom_titles_survive_index_rebuild(self):
    filename = "codex-session-session-a.md"
    title = "인증 진입 Journey"
    content = render_artifact_index.render_index([filename], {filename: title})
    # 임시 artifacts/index.md와 artifact를 만든 뒤 title map을 다시 읽는다.
    # 같은 map으로 재렌더링한 결과가 content와 같아야 한다.
```

잘못된 `]`, newline 또는 빈 제목의 링크가 `ValueError("invalid_index_link")`로 거부되는 case도 같은 test에 포함한다.

- [x] **Step 3: focused test가 RED인지 확인**

Run: `python3 -m unittest tests.test_render_artifact_index.ArtifactIndexRenderTests -v`

Expected: 새 API가 없거나 `render_index`가 두 번째 인자를 받지 않아 FAIL.

### Task 2: 인덱스 생성기와 공개 제목 구현

**Files:**
- Modify: `.codex/hooks/render_artifact_index.py`
- Modify: `.codex/hooks/review_publisher.py`
- Modify: `artifacts/index.md`
- Test: `tests/test_render_artifact_index.py`
- Test: `tests/test_review_publisher.py`

**Interfaces:**
- Consumes: Task 1의 제목 보존 계약
- Produces: `Dict[str, str]` 제목 map을 읽고 기존 공개 제목을 유지하는 renderer와 publisher

- [x] **Step 1: 최소 제목 parser와 renderer 구현**

인덱스 링크 canonical 형식을 아래처럼 만든다.

```markdown
- [인증 진입 Journey — `01a05c2e-ff40-76d1-9487-2fb88087e317.s0001`](./codex-session-01a05c2e-ff40-76d1-9487-2fb88087e317.s0001.md)
```

`render_index`는 optional title map에서 파일별 제목을 읽고, 없으면 `Codex 세션`을 쓴다. `list_published_artifact_titles`는 링크 text, session ID와 filename의 일치를 검증한 뒤 현재 존재하는 artifact의 제목 map을 반환한다. 기존 `list_published_artifact_names`는 그 map의 key 목록을 반환해 caller 호환성을 유지한다.

- [x] **Step 2: 재생성 caller에서 제목 보존**

SessionEnd hook과 publication add/remove transaction은 rewrite 직전에 title map을 읽고 `render_index(filenames, titles)`로 전달한다. 새 artifact만 fallback 제목을 사용한다.

- [x] **Step 3: 공개 기록 21개의 주제 작성**

`artifacts/index.md`에 다음 작업 주제를 session ID 앞에 붙인다.

```text
프론트엔드 기반과 AI 개발·검증 루프
프로젝트 기획·TODO·코딩 규약
애플리케이션 아키텍처
Golden Journey 시나리오
AI 기록 검토·게시 절차 개선
KB 오케어 색상 토큰
계획 완료 적대적 검토
Journey 루프 하네스 검토
AI 아티팩트 게시 문제 분석
Journey 구현 백로그와 작업 규약
프론트엔드 화면 디자인
AI 아티팩트 게시와 정리
UI foundation 계약
UI shell·상태 화면 구현
인증 진입 Journey
AI 아티팩트 묶음 게시
업무 현황 Journey
할 일 탐색 Journey
할 일 해결 Journey
로그인 MSW 404 원인 분석
navigation 선택 표시선 제거
```

목록 순서는 기존 session ID 순서와 일치한다.

- [x] **Step 4: focused test GREEN 확인**

Run: `python3 -m unittest tests.test_render_artifact_index tests.test_review_publisher -v`

Expected: 모든 index·publisher test PASS.

- [x] **Step 5: 구현 commit**

```bash
git add TODO.md .codex/hooks/render_artifact_index.py .codex/hooks/review_publisher.py tests/test_render_artifact_index.py tests/test_review_publisher.py artifacts/index.md
git commit -m "feat(ai): 세션 인덱스에 작업 주제 보존"
```

### Task 3: README 진입점과 검증 근거

**Files:**
- Modify: `README.md`
- Modify: `TODO.md`
- Modify: `docs/quality/evidence/final-qa.md`
- Modify: `docs/superpowers/plans/2026-09-04-readme-project-guide.md`

**Interfaces:**
- Consumes: 실제 `package.json`, `playwright.config.ts`, 원본·품질 문서, Task 2의 주제형 index
- Produces: 실행 가능한 프로젝트 안내와 `DOCS-README-01` evidence

- [x] **Step 1: README 재작성**

프로젝트 소개, 주요 route와 기능, 요구사항 확인표, 기술 스택·구조, 설치와 개발/preview URL, MSW 계정, 검증 명령, agent workflow, 문서 지도를 순서대로 작성한다. `assignment-original/requirement.md`가 실제 파일명이며 API 세부사항은 `assignment-original/openapi.yaml`이 우선함을 명시한다.

- [x] **Step 2: README 자체 검증**

Run: README의 상대 Markdown link를 추출해 대상 파일 존재 여부를 확인하는 Python one-shot과 `pnpm verify setup`.

Expected: 깨진 local link 0, setup PASS.

- [x] **Step 3: quick 검증**

Run: `pnpm verify quick && git diff --check`

Expected: hook test, verifier test, format, lint, typecheck, Vitest와 whitespace check가 모두 PASS.

- [x] **Step 4: plan-completion 적대적 검토**

원본 계약, README 명령·계정·URL, 21개 제목과 파일 경로, SessionEnd/publication 제목 보존, 관련 없는 diff와 승인 경계를 fresh read-only 관점으로 다시 확인한다. finding은 `REQUIREMENT`, `PRODUCT`, `TEST`, `TOOLING`, `ENVIRONMENT`로 분류하고 교정 뒤 focused/quick을 재실행한다.

- [ ] **Step 5: evidence와 상태 완료**

`docs/quality/evidence/final-qa.md`와 `TODO.md`에 requirement, exact target, 명령 결과, browser 비적용 사유, review checks/findings/corrections/rerun/verdict를 기록하고 `DOCS-README-01`을 `[x]`/`AI_VERIFIED`로 전환한다.

- [ ] **Step 6: 문서 commit과 최종 확인**

```bash
git add README.md TODO.md docs/quality/evidence/final-qa.md docs/superpowers/plans/2026-09-04-readme-project-guide.md
git commit -m "docs: 프로젝트 실행과 검증 안내 정리"
git status --short
```

Expected: tracked working tree clean. 사람 checkpoint 전에는 새 `HUMAN_APPROVED`나 final acceptance를 기록하지 않는다.
