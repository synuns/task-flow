# 기술 스택 문서 설계

## 목적

과제 구현에 사용할 기술과 선정 근거를 `docs/tech-stack.md`에서 한눈에
확인하고, 작업 중 새 기술이 도입되거나 기존 기술이 변경될 때 같은 문서를
지속해서 갱신한다. 루트 `AGENTS.md`에서 문서를 필수 읽기 자료로 연결한다.

## 요구사항 근거

- `assignment-original/requirement.md`는 React 18 또는 19, TypeScript, 색상
  토큰, Pretendard, API 대체 구현을 요구한다.
- `assignment-original/openapi.yaml`은 API 세부 계약의 최우선 출처다.
- `docs/quality/requirements.md`의 `SYS-01`과 `SYS-04`는 기술 스택과 API
  대체 구현 방식을 승인 전 HIGH-risk 결정으로 분류한다.
- 인증 토큰 저장과 갱신 정책은 기술 스택 문서 범위에서 제외하고 별도 설계
  문서에서 관리한다.

## 변경 파일

### `docs/tech-stack.md`

한국어로 작성하는 단일 운영 문서다. 다음 내용을 포함한다.

1. 문서 목적과 관리 범위
2. 과제 요구사항에서 직접 파생된 필수 기술
3. 전체 기술 스택 요약표
4. 기술별 역할과 선정 근거
5. 기술 상태와 변경 규칙
6. 문서 범위에서 제외되는 결정

기술 상태는 다음 값만 사용한다.

- `필수`: 과제 원본이 직접 요구한 기술 또는 특성
- `제안`: 구현 전 검토 중인 기술
- `채택`: 사람 승인을 받아 구현 대상으로 확정된 기술. 설치 여부는
  `package.json`과 `pnpm-lock.yaml`로 확인
- `보류`: 후보로 남지만 현재 구현에는 사용하지 않는 기술
- `제거`: 사용을 중단한 기술

과제 원본이 직접 요구한 React, TypeScript, 색상 토큰, Pretendard, API
대체 구현은 `필수`로 기록한다. 사용자가 승인한 구체 도구는 구현 전이어도
`채택`으로 기록한다. 초기 문서에는 다음 구성을 기록한다.

| 영역 | 기술 | 역할 |
| --- | --- | --- |
| 애플리케이션 | React 19, TypeScript, Vite | UI, 정적 타입, 개발·빌드 환경 |
| 패키지 관리 | pnpm | 의존성 설치와 lockfile 관리 |
| 라우팅 | React Router | 페이지와 상세 경로 이동 |
| 서버 상태 | TanStack Query | API 상태, 캐시, 무한 페이지 관리 |
| 폼 | React Hook Form, Zod | 로그인 입력과 검증 규칙 관리 |
| 가상 목록 | TanStack Virtual | 화면 주변 항목만 렌더링 |
| API | Fetch API, openapi-typescript | HTTP 요청과 OAS 기반 타입 관리 |
| API 대체 | MSW | 브라우저와 테스트의 OAS 기반 API 모킹 |
| UI 컴포넌트 | shadcn/ui | 프로젝트가 소유하는 접근 가능한 컴포넌트 코드 |
| 스타일 | Tailwind CSS, CSS Custom Properties | UI 스타일과 명명된 색상 토큰 관리 |
| 폰트 | Pretendard 자체 호스팅 | 과제 지정 기본 글꼴 적용 |
| 아이콘 | Lucide React | 서로 겹치지 않는 내비게이션 아이콘 제공 |
| 단위·통합 테스트 | Vitest, Testing Library, user-event | 로직과 사용자 상호작용 검증 |
| E2E 테스트 | Playwright | Golden Journey 브라우저 검증 |
| 코드 품질 | Biome, TypeScript | lint·format과 타입 검사 분리 수행 |

Biome은 lint와 format을 전담한다. TypeScript는 타입 검사를 전담한다.
ESLint와 Prettier는 중복 도구로 도입하지 않는다. shadcn/ui는 완성된 UI
라이브러리를 런타임에서 소비하는 방식이 아니라 저장소가 생성된 컴포넌트
코드를 소유하고 수정하는 방식임을 명시한다.

실제 설치 버전과 정확한 의존성 목록은 `package.json`과
`pnpm-lock.yaml`을 기준으로 삼는다. 문서는 해당 파일과 모순되지 않게
갱신한다.

새 기술을 추가할 때 영역, 기술명, 역할, 선정 근거, 상태를 함께 기록한다.
교체 또는 제거할 때 기존 항목을 조용히 삭제하지 않고 상태와 사유를
갱신한다.

### `AGENTS.md`

`Required Reading`에 다음 링크를 추가한다.

```markdown
- [기술 스택](docs/tech-stack.md)
```

이 링크는 이후 작업자가 구현 전 기술 선택과 갱신 규칙을 확인하게 한다.

## 문서 경계

이 작업은 문서만 추가한다. 패키지를 설치하거나 프론트엔드 프로젝트를
scaffold하지 않는다. 인증 정책, 애플리케이션 구조, 토큰 저장 위치,
갱신 실패 처리, 삭제 의미론은 별도 HIGH-risk 설계와 사람 결정을 거친다.

## 검증

- `docs/tech-stack.md`에 모든 승인 기술과 상태·갱신 규칙이 있는지 확인한다.
- Biome의 lint·format 책임과 TypeScript의 타입 검사 책임이 분명히
  분리됐는지 확인한다.
- `AGENTS.md` 링크가 실제 파일을 가리키는지 확인한다.
- `git diff --check`로 Markdown 공백 오류를 확인한다.
- `./scripts/verify setup`으로 기존 문서 계약과 링크 검증을 실행한다.
- 문서 변경이므로 브라우저 검증은 적용하지 않는다.
