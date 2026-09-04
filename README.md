# KBHC 업무 관리 대시보드

React 19와 TypeScript로 구현한 업무 관리 SPA입니다. 대시보드, 인증, 회원정보,
가상화된 할 일 목록과 User·Task CRUD를 제공하며, 제출본에는 OpenAPI 계약을 따르는
MSW mock API가 포함됩니다.

## 프로젝트 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| 상태·폼 | TanStack Query, React Hook Form, Zod |
| UI | Tailwind CSS, shadcn/ui, Lucide React, Pretendard |
| API | Fetch API, OpenAPI generated types, MSW |
| Test | Vitest, Testing Library, Playwright |
| Architecture | FSD 기반 `app → pages → widgets → features → entities → shared` |

### 주요 화면

| Route | 주요 기능 |
| --- | --- |
| `/` | 전체·남은·완료 할 일 수 확인 |
| `/sign-in` | 이메일·비밀번호 검증, 로그인, API 오류 modal |
| `/sign-up` | 회원가입과 입력 검증 |
| `/task` | 할 일 생성, 가상 목록, 무한 스크롤, 상세 이동 |
| `/task/:id` | 상세 조회, 필드·상태 수정, ID 확인 후 삭제, 404 복구 |
| `/user` | 회원정보 조회·수정, 로그아웃, 비밀번호 확인 후 탈퇴 |

## 요구사항 확인

화면과 제출 조건은
[`assignment-original/requirement.md`](./assignment-original/requirement.md), API의
method·path·schema·status·인증 방식은
[`assignment-original/openapi.yaml`](./assignment-original/openapi.yaml)이 기준입니다.
사람이 승인한 User·Task CRUD 확장은
[`docs/api/crud-openapi.yaml`](./docs/api/crud-openapi.yaml)에 있습니다. API 세부사항이
다른 문서와 충돌하면 OpenAPI 계약을 우선합니다.

아래 표에서 원본 항목, 실행 가능한 acceptance와 검증 evidence를 함께 확인할 수
있습니다. 전체 상태는
[`docs/quality/requirements.md`](./docs/quality/requirements.md)가 관리합니다.

| 요구사항 영역 | Requirement ID | 구현·검증 근거 |
| --- | --- | --- |
| 시스템, 폰트, 색상, API 대체 구현, AI 공개 | `SYS-01`~`SYS-05` | [최종 QA](./docs/quality/evidence/final-qa.md) |
| 공통 navigation | `NAV-01`~`NAV-03` | [인증 진입](./docs/quality/evidence/auth-entry.md), [업무 현황](./docs/quality/evidence/work-overview.md) |
| 대시보드와 회원정보 | `DASH-01`, `USER-01` | [업무 현황](./docs/quality/evidence/work-overview.md) |
| 로그인 | `AUTH-01`~`AUTH-07` | [인증 진입](./docs/quality/evidence/auth-entry.md) |
| 할 일 목록 | `TASK-LIST-01`~`TASK-LIST-05` | [할 일 탐색](./docs/quality/evidence/task-discovery.md) |
| 할 일 상세·삭제 | `TASK-DETAIL-01`~`TASK-DETAIL-05` | [할 일 해결](./docs/quality/evidence/task-resolution.md) |
| 회원가입·회원정보 수정·로그아웃·탈퇴 | `USER-CRUD-01`~`USER-CRUD-08`, `USER-LOGOUT-01`~`USER-LOGOUT-05` | [User CRUD](./docs/quality/evidence/user-crud.md) |
| 할 일 생성·수정·상태 변경 | `TASK-CRUD-01`~`TASK-CRUD-08` | [Task CRUD](./docs/quality/evidence/task-crud.md) |

## 설치와 실행

필요한 버전은 다음과 같습니다.

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`
- pnpm `10.15.1`

```bash
corepack enable
pnpm install --frozen-lockfile
```

### 개발 환경 열기

```bash
pnpm dev --host 127.0.0.1 --port 5173
```

브라우저에서 <http://127.0.0.1:5173>을 엽니다.

### production preview 열기

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4173
```

브라우저에서 <http://127.0.0.1:4173>을 엽니다. 개발 서버와 preview 모두 별도
backend 없이 브라우저의 MSW가 같은 mock API를 제공합니다.

## 테스트 계정

| 항목 | 값 |
| --- | --- |
| 이메일 | `user@example.com` |
| 비밀번호 | `Password1` |

로컬 MSW 전용 계정이며 실제 서비스 계정이 아닙니다. User와 Task 변경 내용은 현재
탭의 `sessionStorage`에 저장됩니다. 초기 fixture로 되돌리려면 새 browser session을
열거나 해당 site의 session storage를 지운 뒤 reload합니다.

## 테스트와 검증

가장 작은 관련 테스트부터 실행한 뒤 quick, 적용되는 Journey E2E, full 순서로
검증합니다.

```bash
# 변경한 모듈의 focused test 예시
pnpm vitest run src/features/sign-in/model/sign-in-schema.test.ts

# 개발 환경·hook·TODO·검증 계약
pnpm verify setup

# setup + format + lint + typecheck + 전체 Vitest
pnpm verify quick

# quick + production build + 여섯 core Journey E2E + verifier 회귀 테스트
pnpm verify full
```

Chromium이 설치되지 않았다면 full 검증 전에 실행합니다.

```bash
pnpm exec playwright install chromium
```

Journey 하나만 확인할 때는 대응하는 Playwright 파일을 실행합니다.

```bash
pnpm exec playwright test e2e/auth-entry.spec.ts
pnpm exec playwright test e2e/work-overview.spec.ts
pnpm exec playwright test e2e/task-discovery.spec.ts
pnpm exec playwright test e2e/task-resolution.spec.ts
pnpm exec playwright test e2e/user-crud.spec.ts
pnpm exec playwright test e2e/task-crud.spec.ts
```

검증 명령은 저장소를 수정하지 않습니다. formatting이 필요할 때만 `pnpm run format`을
별도로 실행하고 diff를 검토한 뒤 `pnpm verify quick`을 다시 실행합니다.

## 에이전트 작업 workflow

1. [`TODO.md`](./TODO.md)에서 dependency가 해소된 작업 하나와 requirement ID를
   선택합니다.
2. requirement ID, route, API path 또는 symbol을
   [`docs/quality/requirements.md`](./docs/quality/requirements.md), `TODO.md`, `src`,
   `e2e`에서 검색해 연결된 Journey를 확인합니다.
3. ignored `.worktrees/<branch>`에 격리 worktree를 만들고, 하나의 검증 가능한 단위와
   가장 낮은 수준의 focused test를 구현합니다.
4. `pnpm verify quick`과 해당 Journey E2E를 실행합니다. 상호작용이 바뀌면 실제
   browser에서 viewport, keyboard, console과 network도 확인합니다.
5. 실패를 요구사항, 구현, 통합, UX·접근성, 테스트, 환경 또는 도구 문제로 분류하고
   root cause를 수정한 뒤 실패한 gate를 다시 실행합니다.
6. `TODO.md`와 `docs/quality/evidence/`에 명령, 결과와 재현 조건을 기록합니다.
7. 계획의 마지막 구현·검증 뒤 plan-completion adversarial review를 수행합니다.
8. Golden Journey마다 사람이 evidence와 exact target을 검토해 checkpoint를
   결정합니다. 모든 Journey 뒤 `pnpm verify full`, 전체 review와 final QA를
   수행합니다.

AI는 자동 검증과 evidence를 작성하지만 `HUMAN_APPROVED`, HIGH-risk 결정과 최종
acceptance는 사람이 소유합니다. 상세 규칙은
[`docs/quality/workflow.md`](./docs/quality/workflow.md)와
[`docs/quality/verification.md`](./docs/quality/verification.md)에 있습니다.

## 프로젝트 구조

```text
src/
├── app/       # provider, 인증 상태, router
├── pages/     # route 단위 composition
├── widgets/   # app shell과 큰 화면 block
├── features/  # 로그인, 생성, 수정, 삭제 등 사용자 action
├── entities/  # Task, User, Dashboard domain 표시와 model
├── shared/    # API client, validation, 공용 UI
├── mocks/     # MSW handler와 fixture
└── generated/ # OpenAPI에서 생성한 TypeScript type
```

서버 상태는 TanStack Query, form은 React Hook Form과 Zod, 인증은 app auth boundary,
mock data는 MSW fixture store가 담당합니다. 자세한 결정은
[`docs/project-plan.md`](./docs/project-plan.md)와
[`docs/tech-stack.md`](./docs/tech-stack.md)를 확인합니다.

## 문서와 AI 기록

- [프로젝트 상위 기획](./docs/project-plan.md)
- [코딩 규약](./docs/coding-standards.md)
- [현재 작업과 evidence](./TODO.md)
- [기능 설계](./docs/superpowers/specs/)
- [구현 계획](./docs/superpowers/plans/)
- [AI 사용 범위와 사람 검증](./AI_USAGE.md)
- [작업 주제별 Codex 세션 기록](./artifacts/index.md)

공개 세션 기록은 사람 검토를 마친 artifact만 포함하며, 인덱스는 작업 주제와
추적 가능한 session ID를 함께 표시합니다.
