# 프런트엔드 개발 기반 scaffolding 설계

## 목적

과제 기능과 레이아웃을 구현하기 전에 React 19·TypeScript 애플리케이션을
실행, 검사, 테스트, 빌드할 수 있는 개발 기반을 만든다. 이번 작업은 승인된
도구를 설치하고 각 도구가 실제로 동작하는지 증명하는 데 한정한다.

후속 애플리케이션 구조는 Feature-Sliced Design(FSD)을 기반으로 별도
설계한다. 이번 작업에서는 FSD layer, segment, public API, feature별 alias를
미리 만들지 않는다.

## 근거와 대상 요구사항

- `assignment-original/requirement.md`는 React 18 또는 19, TypeScript,
  명명된 색상 토큰, Pretendard, 제출 가능한 API 대체 구현을 요구한다.
- API 세부 계약은 `assignment-original/openapi.yaml`을 최우선으로 따른다.
- 기술 선택은 `docs/tech-stack.md`의 채택 기술을 그대로 사용한다.
- 기반 작업은 `SYS-01`, `SYS-02`, `SYS-03`, `SYS-04`를 대상으로 한다.
- `SYS-02`는 토큰 정의 기반까지만, `SYS-04`는 OpenAPI 타입 생성과 MSW
  실행 기반까지만 진행한다. 실제 UI 색상 적용과 API handler 계약 검증은
  후속 기능 작업에서 완료한다.

## 범위

### 포함

- React 19, TypeScript, Vite 기반 최소 브라우저 진입점
- pnpm 의존성 관리와 `pnpm-lock.yaml`
- 승인된 runtime·development dependency 설치
- TypeScript strict typecheck
- Biome lint, read-only format check, 별도 write format
- Vitest, jsdom, Testing Library matcher smoke test
- Playwright Chromium scaffold smoke test
- Tailwind CSS 설정과 shadcn CLI 설치
- CSS Custom Properties 기반 명명된 색상 토큰
- 로컬 Pretendard font asset과 전역 font 적용
- `openapi-typescript` 생성 명령과 `src/generated/openapi.ts` 생성 산출물
- MSW worker 설치와 실행 준비
- `./scripts/verify quick`, `./scripts/verify full`이 요구하는 frontend scripts
- 기존 `ai:review` script와 AI 기록 lifecycle 보존

### 제외

- 업무 route와 React Router 구성
- provider 계층과 TanStack Query client 연결
- page, widget, feature, entity, shared layer 구조
- GNB/LNB, layout, page, 공용 UI component
- sign-in, dashboard, task, user 기능
- MSW handler, fixture, API별 mock behavior
- 인증 token 저장·갱신·만료·보호 경로 정책
- Golden Journey E2E와 사람 journey checkpoint
- `components.json`과 shadcn/ui component 생성

## 접근안과 결정

### 최소 Vite scaffold

React, TypeScript, Vite만 구성하는 방식이다. 초기 변경은 작지만 다음 기능
작업에서 테스트, MSW, 품질 도구를 다시 구성해야 하고 검증 정책의 frontend
gate를 한 번에 활성화하지 못한다.

### 검증 가능한 개발 기반

승인된 도구 전체를 설치하고 각 도구의 최소 실행 경로를 검증한다. 기능
코드 없이도 이후 작업이 같은 명령과 lockfile 위에서 시작할 수 있다. 이번
작업은 이 방식을 사용한다.

### FSD 골격 선구성

FSD layer와 provider, route placeholder까지 미리 만드는 방식이다. 아직
승인하지 않은 책임 경계와 import 방향을 고정하므로 이번 범위에서 제외한다.

## 파일과 책임

### 패키지와 도구 설정

- `package.json`: 기존 `ai:review`를 보존하고 pnpm package manager,
  dependency, frontend scripts를 추가한다.
- `package.json`의 `kbhc.frontendScaffolded`는 실제 scaffold가 검증되는
  변경에서 `false`에서 `true`로 바꾼다.
- `pnpm-lock.yaml`: 설치 결과를 고정한다. 다른 package manager lockfile은
  만들지 않는다.
- `vite.config.ts`: React plugin과 `@/*`에서 `src/*`로 향하는 단일 alias를
  설정한다.
- TypeScript config: browser source, Vite config, test source를 strict
  mode로 검사한다.
- Biome config: lint와 format을 전담한다. ESLint와 Prettier는 추가하지
  않는다.
- Vitest setup: jsdom과 Testing Library matcher를 활성화한다.
- Playwright config: Vite development server를 사용한 Chromium smoke
  실행을 제공한다.

shadcn CLI는 설치하되 `components.json`은 만들지 않는다. 이 파일의
component, UI, utility, hook alias는 CLI 생성 위치를 결정하므로 후속 FSD
설계에서 layer와 segment 책임을 승인한 뒤 함께 정한다.

FSD layer별 alias는 만들지 않는다. `@/*` 하나만 사용해 후속 FSD 설계가
layer 이름과 public API 규칙을 독립적으로 결정할 수 있게 한다.

### 최소 애플리케이션 진입점

- `index.html`은 Vite root와 module entry만 제공한다.
- `src/main.tsx`는 React root를 생성하고 빈 application root를 렌더링한다.
- 전역 stylesheet는 Tailwind 진입, 명명된 색상 토큰, Pretendard font-face와
  body font 적용만 담당한다.
- 제품 문구, route, layout, component, provider는 만들지 않는다.

### API와 mock 기반

- `openapi-typescript`는 `assignment-original/openapi.yaml`에서 type을
  생성한다.
- 생성 산출물은 사람이 작성하는 source와 구분해
  `src/generated/openapi.ts`에 둔다. 후속 FSD 설계에서 `shared/api`의 최종
  위치와 public API를 결정하면 생성 명령과 import를 함께 옮긴다.
- MSW worker asset은 공식 초기화 명령으로 생성하고 제출 가능한 정적
  asset으로 관리한다.
- handler, fixture, browser worker bootstrap, Node mock server는 실제 API
  behavior 설계 전까지 만들지 않는다.

## script 계약

필수 frontend scripts는 다음 책임을 갖는다.

| Script | 책임 |
| --- | --- |
| `format` | Biome write mode로 format 수정 |
| `format:check` | repository를 수정하지 않고 format 검사 |
| `lint` | Biome lint 검사 |
| `typecheck` | TypeScript type 검사 |
| `test` | Vitest 단위·component·integration suite 실행 |
| `build` | Vite production build |
| `test:e2e:core` | `@core` Golden Journey만 실행하고 미구현 상태의 빈 선택 허용 |

보조 scripts는 development server, preview, OpenAPI type 생성, scaffold
browser smoke를 제공한다. scaffold smoke는 Golden Journey가 아니므로
`@core`로 표시하지 않는다.

## 테스트와 browser evidence

### 자동 검증

Vitest smoke는 다음 경계를 증명한다.

- jsdom test environment가 열린다.
- Testing Library가 임시 test element를 render할 수 있다.
- DOM matcher가 등록되어 assertion에 사용된다.

Playwright scaffold smoke는 다음 경계를 증명한다.

- Vite server의 `/`가 열린다.
- React root가 browser DOM에 존재한다.
- page error와 예상하지 않은 console error가 없다.
- `document.fonts.load("16px Pretendard")`로 font 사용을 강제했을 때
  `public/fonts/PretendardVariable.woff2` 요청이 성공한다.
- root의 computed font family에 Pretendard가 적용된다.

Browser evidence에는 route `/`, viewport, commit, precondition, actions,
expected/actual, console/network, screenshot 또는 trace, verdict를 기록한다.
기능 Golden Journey evidence로 재사용하지 않는다.

### 검증 순서

1. 변경 전 `./scripts/verify setup`으로 workflow baseline을 확인한다.
2. scaffold와 package dependency를 적용한다.
3. OpenAPI type 생성 명령을 실행해 계약 입력과 출력 경로를 확인한다.
4. `./scripts/verify quick`을 실행한다.
5. Playwright scaffold smoke와 수동 browser 확인을 실행한다.
6. `./scripts/verify full`을 실행한다.
7. 검증 전후 repository fingerprint가 같고 생성 누락이 없는지 확인한다.

Formatting 수정이 필요하면 `pnpm format`을 별도로 실행하고 diff를 검토한
뒤 `./scripts/verify quick`을 다시 실행한다.

## 실패 처리와 상태 기록

실패는 `docs/quality/workflow.md`의 `REQUIREMENT`, `IMPLEMENTATION`,
`INTEGRATION`, `UX_ACCESSIBILITY`, `TEST`, `ENVIRONMENT`, `TOOLING` 중 하나로
분류한다. 증상, 재현 명령, 원인, 수정, 재실행 결과를 evidence에 남긴다.
검증을 통과시키기 위한 assertion 약화, skip 추가, read-only verification
내 mutation은 허용하지 않는다.

`SYS-01`은 React 19·TypeScript build evidence로 검증할 수 있다. `SYS-02`와
`SYS-04`는 기반만 만들어지므로 후속 작업 전까지 완료로 표시하지 않는다.
`SYS-03`은 local font request와 computed style evidence가 모두 있을 때만
AI 검증 상태로 올릴 수 있다. AI는 어떤 항목도 `HUMAN_APPROVED`로 표시하지
않는다.

## 완료 조건

- pnpm install 결과가 lockfile로 고정된다.
- 최소 React application이 development와 production mode에서 열린다.
- OpenAPI type 생성, format check, lint, typecheck, Vitest, build가 통과한다.
- scaffold browser smoke가 Chromium에서 통과한다.
- MSW worker와 Tailwind 설정이 존재하지만 제품 behavior는 없다.
- shadcn CLI는 설치되며 `components.json`과 component는 아직 없다.
- 기존 AI review command와 lifecycle test가 회귀하지 않는다.
- `./scripts/verify quick`과 `./scripts/verify full`이 repository를 수정하지
  않고 통과한다.
- 변경 파일에 업무 route, layout, feature, API handler가 없다.
- 후속 FSD 설계가 layer와 import rule을 새로 결정할 수 있다.

이 완료는 개발 기반 준비만 의미한다. Golden Journey, assignment 기능,
최종 QA 또는 사람 acceptance 완료를 의미하지 않는다.
