# UI Foundation Evidence

Requirement: `SYS-02`, `SYS-03`, 공통 접근성 invariant

## Commit and session

- Branch: `feat/ui-foundation-contract`
- Contract commit: `b375d138297042d369d6bbbd5db0ad0feb2e197b`
- Task owner: Codex `/root`, 2026-09-01
- Browser sessions: `ui-foundation-desktop`, `ui-foundation-mobile`; 두 session 모두
  검증 뒤 종료
- Precondition: fresh Vite DEV `http://127.0.0.1:4173`, development MSW,
  anonymous auth bootstrap

## Automatic verification

- Baseline:
  `pnpm vitest run src/shared/ui/shadcn-primitives.test.tsx src/test/theme-contract.test.ts`
  — 2 files, 4 tests PASS
- Focused:
  `pnpm vitest run src/shared/ui/ui-foundation.test.tsx src/test/theme-contract.test.ts`
  — 2 files, 5 tests PASS
- Quick: `./scripts/verify quick` — setup hook 86 tests, verifier contract 18 tests,
  format, lint, OpenAPI type check, TypeScript, Vitest 36 files/128 tests PASS
- Scope: `git diff --check` PASS, `assignment-original/` diff 없음, production
  primitive 변경 없음

## Desktop browser verification

- Route/viewport: `/sign-in`, 1280×720
- Actions: interactive snapshot에서 disabled `로그인` button을 확인하고, 이메일에
  `invalid`를 입력한 뒤 keyboard Tab으로 비밀번호 input에 이동
- Expected: keyboard focus가 보이고 이메일 오류가 text·semantics로 연결되며
  submit이 disabled
- Actual: active element `sign-in-password`; focus `boxShadow`에 semantic ring의
  2px 표시가 계산됨; email `aria-invalid="true"`,
  `aria-describedby="sign-in-email-error"`, visible error
  `올바른 이메일을 입력해주세요.`; submit `disabled=true`
- Screenshot: `/tmp/kbhc-ui-foundation-desktop.png`

## Mobile browser verification

- Route/viewport: `/sign-in`, 390×844
- Actions: desktop과 같은 invalid input·Tab·computed style·semantic association 확인
- Expected: desktop 계약을 유지하고 horizontal clipping이 없음
- Actual: active element `sign-in-password`; semantic ring 2px 표시;
  `aria-invalid="true"`, `aria-describedby="sign-in-email-error"`, visible error,
  submit `disabled=true`; document width 390px와 viewport width 390px 일치
- Screenshot: `/tmp/kbhc-ui-foundation-mobile.png`

## Console and network

- 두 session의 `network requests --filter api`는 service worker가 가로챈 request를
  별도 목록으로 표시하지 않았다.
- MSW console record에서 승인된 anonymous bootstrap
  `POST /api/refresh` 401과 `ErrorResponse`를 확인했다. 이 응답에 대응하는 browser
  resource 401 console line 외 예상 밖 console 오류는 없었다.
- `agent-browser errors`에는 별도 page error가 없었고, form 검증 중 API 요청은
  발생하지 않았다.

## Failure, correction, and rerun

- `TEST`: 첫 focused run에서 test 간 DOM cleanup이 없어 두 번째 fixture query가
  중복 element로 실패했다. `afterEach(cleanup)`을 test에 추가한 뒤 focused
  2 files/5 tests PASS. production 교정은 필요하지 않았다.
- `TOOLING`: 첫 quick run에서 Biome이 한 assertion의 format 차이를 보고했다.
  별도 `npm run format`으로 test 한 파일만 교정하고 diff를 검토한 뒤 focused와
  quick을 재실행해 모두 PASS했다.
- Rerun verdict: automatic과 desktop/mobile browser 계약 PASS; 기능·wrapper·shell·
  async-state·dependency·public API 확장 없음.
