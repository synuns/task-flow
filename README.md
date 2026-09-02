# KBHC Assignment

React 19와 TypeScript로 구현한 업무 대시보드입니다. 제출본은
`assignment-original/openapi.yaml` 계약을 따르는 MSW API를 함께 실행합니다.

## 설치

- Node.js: `^20.19.0 || ^22.12.0 || >=24.0.0`
- pnpm: `10.15.1`

```bash
corepack enable
pnpm install --frozen-lockfile
```

## 실행

개발 서버:

```bash
pnpm dev
```

프로덕션 빌드와 preview:

```bash
pnpm build
pnpm preview
```

개발 서버와 preview 모두 브라우저에서 MSW mock API를 사용합니다.

## 로컬 테스트 계정

개발 환경의 MSW mock에서 다음 계정으로 로그인할 수 있습니다.

- 이메일: `user@example.com`
- 비밀번호: `Password1`

실제 백엔드 계정이 아닌 로컬 개발·테스트 전용 계정입니다.

## 검증

```bash
./scripts/verify setup
./scripts/verify quick
./scripts/verify full
```

`full`은 format, lint, typecheck, unit test, production build와 네 core Journey의
Chromium E2E를 실행합니다. Chromium이 없다면 먼저
`pnpm exec playwright install chromium`을 실행하세요.

AI 활용 범위와 사람이 검토한 공개 기록은 [AI_USAGE.md](./AI_USAGE.md)에 있습니다.
