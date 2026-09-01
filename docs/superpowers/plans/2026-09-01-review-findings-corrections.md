# 프로젝트 리뷰 지적사항 교정 구현 계획

> 설계: `docs/superpowers/specs/2026-09-01-review-findings-corrections-design.md`

1. `SCF-RUNTIME-01`: harness test를 RED로 추가하고 `src/main.tsx`와
   `playwright.config.ts`를 production preview 기준으로 수정한다.
2. `E2E-SMOKE-01`: 현재 전체 E2E 실패를 확인하고 두 smoke spec의 인증·heading·
   console 기대값을 현재 계약에 맞춘다.
3. `TASK-PAGE-EMPTY-01`: 빈 중간 page 회귀 test를 RED로 추가하고
   `src/widgets/task-list/index.tsx`의 next-page trigger와 empty 판정을 수정한다.
4. `API-CANCEL-01`: query cancellation test를 RED로 바꾸고 네 query에서 signal을
   API adapter에 전달한다.
5. `MOCK-PAGE-VALIDATION-01`: handler invalid-page parameterized test를 RED로
   추가하고 trust boundary에서 400 `ErrorResponse`를 반환한다.
6. focused test와 `./scripts/verify quick`을 반복하고 전체 Playwright 및
   `./scripts/verify full`을 실행한다.
7. exact diff를 새 관점으로 적대적 review하고 correction/rerun을 TODO evidence에
   기록한다.
