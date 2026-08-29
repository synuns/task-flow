# 기술 스택 문서 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 전체 기술 스택과 관리 규칙을 `docs/tech-stack.md`에 기록하고 `AGENTS.md`에서 필수 읽기 자료로 연결한다.

**Architecture:** `docs/tech-stack.md`를 기술 선택의 단일 운영 문서로 사용한다. 과제 필수 조건과 사람 승인 기술을 구분하고, 실제 버전은 `package.json`과 `pnpm-lock.yaml`이 생긴 뒤 해당 파일을 기준으로 관리한다. 인증 정책은 문서 범위에서 제외한다.

**Tech Stack:** Markdown, React 19, TypeScript, Vite, pnpm, React Router, TanStack Query, React Hook Form, Zod, TanStack Virtual, Fetch API, openapi-typescript, MSW, shadcn/ui, Tailwind CSS, CSS Custom Properties, Pretendard, Lucide React, Vitest, Testing Library, user-event, Playwright, Biome

## Global Constraints

- `assignment-original/openapi.yaml`을 API 세부 계약의 최우선 출처로 사용한다.
- React 18 또는 19, TypeScript, 명명된 색상 토큰, Pretendard, API 대체 구현 요구를 보존한다.
- 패키지 관리자는 pnpm을 사용한다.
- Biome은 lint와 format을 전담하고 TypeScript는 타입 검사를 전담한다.
- ESLint와 Prettier를 도입하지 않는다.
- UI 컴포넌트는 shadcn/ui 생성 코드를 저장소가 직접 소유하는 방식으로 관리한다.
- 스타일은 Tailwind CSS를 사용하고 색상은 CSS Custom Properties 기반 명명 토큰으로 관리한다.
- 인증 토큰 저장, 갱신, 실패 처리 정책은 이 문서에서 결정하지 않는다.
- 이 작업에서 패키지 설치, 프론트엔드 scaffold, 애플리케이션 구현을 하지 않는다.
- 실제 설치 버전은 향후 `package.json`과 `pnpm-lock.yaml`을 기준으로 기록한다.

---

### Task 1: 기술 스택 운영 문서와 진입 링크

**Requirement IDs:** `SYS-01`, `SYS-02`, `SYS-03`, `SYS-04`

**Files:**
- Create: `docs/tech-stack.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `assignment-original/requirement.md`, `assignment-original/openapi.yaml`, `docs/quality/requirements.md`, 승인된 설계 `docs/superpowers/specs/2026-08-29-tech-stack-document-design.md`
- Produces: 이후 작업자가 구현 전 읽고 새 기술 도입·변경 시 갱신하는 `docs/tech-stack.md`와 루트 진입 링크

- [ ] **Step 1: 기존 문서 검증 기준 확인**

Run:

```bash
./scripts/verify setup
```

Expected: exit code `0` and final output containing `PASS setup`.

- [ ] **Step 2: 기술 스택 운영 문서 작성**

Create `docs/tech-stack.md` with this exact content:

```markdown
# 기술 스택

## 목적

과제 구현에 사용하는 기술, 역할, 선정 근거, 채택 상태를 관리한다. 작업 중
기술을 추가·교체·제거할 때 이 문서를 함께 갱신한다.

API 동작은 `assignment-original/openapi.yaml`을 최우선으로 따르고, UI와
제출 조건은 `assignment-original/requirement.md`를 따른다.

## 상태 기준

- `필수`: 과제 원본이 직접 요구한 기술 또는 특성
- `제안`: 구현 전 검토 중인 기술
- `채택`: 사람 승인을 받아 구현 대상으로 확정된 기술
- `보류`: 후보로 유지하지만 현재 구현에는 사용하지 않는 기술
- `제거`: 사용을 중단한 기술

`채택`은 설치 완료를 뜻하지 않는다. 실제 설치 여부와 정확한 버전은
`package.json`과 `pnpm-lock.yaml`을 기준으로 확인한다.

## 요구사항 기반 조건

| 조건 | 상태 | 근거 |
| --- | --- | --- |
| React 18 또는 19 | 필수 | `assignment-original/requirement.md` 설명 |
| TypeScript | 필수 | `assignment-original/requirement.md` 설명 |
| 명명된 색상 토큰 | 필수 | `assignment-original/requirement.md` 설명 |
| Pretendard | 필수 | `assignment-original/requirement.md` 설명 |
| OAS 3.1에 맞는 API 대체 구현 | 필수 | `assignment-original/requirement.md` 전문과 `assignment-original/openapi.yaml` |

React 필수 조건에서 major version은 19를 채택한다. API 대체 구현 방식은
MSW를 채택한다.

## 채택 기술

| 영역 | 기술 | 상태 | 역할과 선정 근거 |
| --- | --- | --- | --- |
| 애플리케이션 | React 19 | 채택 | 과제 허용 범위에서 선택한 React major로 UI를 구성한다. |
| 언어 | TypeScript | 필수 | 컴포넌트, API 데이터, 상태 경계를 정적 타입으로 검증한다. |
| 개발·빌드 | Vite | 채택 | React·TypeScript 개발 서버와 production build를 단순한 구성으로 제공한다. |
| 패키지 관리 | pnpm | 채택 | 의존성과 실행 스크립트를 관리하고 `pnpm-lock.yaml`로 설치 결과를 고정한다. |
| 라우팅 | React Router (`react-router-dom`) | 채택 | `/`, `/sign-in`, `/task`, `/task/:id`, `/user` 이동을 관리한다. |
| 서버 상태 | TanStack Query (`@tanstack/react-query`) | 채택 | API 로딩·오류·캐시와 task 무한 페이지 요청을 관리한다. |
| 폼 | React Hook Form (`react-hook-form`) | 채택 | 로그인 입력, 오류, 제출 가능 상태를 관리한다. |
| 스키마 검증 | Zod (`zod`) | 채택 | 이메일과 비밀번호 규칙을 재사용 가능한 스키마로 정의한다. |
| 가상 목록 | TanStack Virtual (`@tanstack/react-virtual`) | 채택 | task 목록에서 화면에 보이거나 곧 보일 항목만 렌더링한다. |
| HTTP | Fetch API | 채택 | 브라우저 표준 API로 JSON 요청과 응답을 처리해 별도 HTTP 클라이언트를 줄인다. |
| API 타입 | `openapi-typescript` | 채택 | OAS 3.1 계약에서 TypeScript 타입을 생성해 계약 불일치를 줄인다. |
| API 대체 | MSW (`msw`) | 채택 | 같은 mock handler를 개발 브라우저와 자동 테스트 경계에서 재사용한다. |
| UI 컴포넌트 | shadcn/ui | 채택 | 접근 가능한 컴포넌트 코드를 저장소에 생성하고 요구사항에 맞게 직접 수정한다. |
| 스타일 | Tailwind CSS (`tailwindcss`) | 채택 | utility class로 UI 스타일을 구성하고 shadcn/ui와 같은 스타일 체계를 사용한다. |
| 색상 토큰 | CSS Custom Properties | 필수 | 의미 기반 변수로 색상을 정의하고 Tailwind CSS에서 해당 토큰을 참조한다. |
| 폰트 | Pretendard 자체 호스팅 | 필수 | 외부 폰트 응답에 의존하지 않고 과제 지정 글꼴을 일관되게 적용한다. |
| 아이콘 | Lucide React (`lucide-react`) | 채택 | 내비게이션 항목마다 서로 다른 아이콘을 제공하고 shadcn/ui와 조합한다. |
| 단위·통합 테스트 | Vitest (`vitest`) | 채택 | TypeScript 로직과 컴포넌트·통합 테스트를 Vite 환경에서 실행한다. |
| UI 테스트 | Testing Library (`@testing-library/react`), user-event (`@testing-library/user-event`) | 채택 | 구현 세부사항보다 사용자가 보는 요소와 상호작용을 검증한다. |
| E2E 테스트 | Playwright (`@playwright/test`) | 채택 | 실제 브라우저에서 네 가지 Golden Journey의 경계 동작을 검증한다. |
| lint·format | Biome (`@biomejs/biome`) | 채택 | lint와 format 검사 및 format 변경을 전담한다. |
| 타입 검사 | TypeScript | 필수 | `tsc` 기반 타입 검사를 전담하며 lint·format 책임을 갖지 않는다. |

## 도구 책임

### pnpm

- 의존성 추가·제거와 package script 실행은 pnpm으로 통일한다.
- `pnpm-lock.yaml`을 커밋해 재현 가능한 설치 결과를 유지한다.
- npm, Yarn 등 다른 package manager의 lockfile을 함께 두지 않는다.

### Biome과 TypeScript

- Biome은 lint와 format을 전담한다.
- 읽기 전용 검증은 Biome check 명령을 사용한다.
- format 변경은 별도 Biome write 명령으로 실행하고 diff를 검토한다.
- TypeScript는 `tsc` 기반 타입 검사를 전담한다.
- ESLint와 Prettier는 Biome과 책임이 겹치므로 도입하지 않는다.

### shadcn/ui와 Tailwind CSS

- shadcn/ui가 생성한 컴포넌트 코드는 저장소가 직접 소유한다.
- 생성된 코드는 과제 요구사항과 접근성 조건에 맞게 수정할 수 있다.
- Tailwind CSS가 UI 스타일을 담당한다.
- 색상은 기능별 literal 대신 CSS Custom Properties로 정의한 의미 기반 토큰을 참조한다.

## 변경 규칙

새 기술을 도입할 때 다음 항목을 함께 기록한다.

1. 기술이 속한 영역과 정확한 이름
2. 해결할 문제와 적용 범위
3. 기존 기술로 해결하지 못하는 이유
4. `제안`, `채택`, `보류`, `제거` 중 현재 상태
5. 교체하거나 제거하는 기술과 변경 사유

기술을 설치·제거한 변경은 이 문서와 `package.json`, `pnpm-lock.yaml`이
서로 모순되지 않는지 확인한다. 기존 항목은 조용히 삭제하지 않고 상태와
사유를 갱신한다.

## 범위 밖 결정

인증 토큰 저장 위치, access token 갱신, refresh 실패 처리, 보호 경로 정책은
이 문서에서 결정하지 않는다. 인증 정책은 별도 HIGH-risk 설계 문서와 사람
승인을 통해 관리한다.

## 변경 이력

| 날짜 | 변경 | 사유 |
| --- | --- | --- |
| 2026-08-29 | 초기 기술 스택 채택 | 과제 요구사항과 구현 예정 기술을 단일 문서로 관리하기 위해 추가 |
```

- [ ] **Step 3: AGENTS.md에 필수 읽기 링크 추가**

In `AGENTS.md`, change the `Required Reading` section from:

```markdown
## Required Reading

- `docs/quality/requirements.md`
```

to:

```markdown
## Required Reading

- [기술 스택](docs/tech-stack.md)
- `docs/quality/requirements.md`
```

Keep the other required-reading entries unchanged.

- [ ] **Step 4: 문서 내용과 링크 정적 검증**

Run:

```bash
test -f docs/tech-stack.md
rg -n '^# 기술 스택$|Biome은 lint와 format을 전담|TypeScript는 `tsc` 기반 타입 검사를 전담|인증 정책은 별도 HIGH-risk' docs/tech-stack.md
rg -n '^- \[기술 스택\]\(docs/tech-stack.md\)$' AGENTS.md
git diff --check -- docs/tech-stack.md AGENTS.md
```

Expected: every command exits `0`; `rg` prints one matching line for each required statement and the `AGENTS.md` link; `git diff --check` prints nothing.

- [ ] **Step 5: 읽기 전용 프로젝트 검증 실행**

Run:

```bash
./scripts/verify setup
```

Expected: exit code `0`, final output contains `PASS setup`, and repository fingerprint remains unchanged during verification.

Browser verification: not applicable because this unit changes documentation only.

- [ ] **Step 6: 의도한 문서만 커밋**

Run:

```bash
git status --short
git add docs/tech-stack.md AGENTS.md
git diff --cached --check
git commit -m "docs: 기술 스택과 관리 규칙 추가"
```

Expected: unrelated user-owned files remain unstaged; staged diff contains only `docs/tech-stack.md` and `AGENTS.md`; commit succeeds with Conventional Commits format.
