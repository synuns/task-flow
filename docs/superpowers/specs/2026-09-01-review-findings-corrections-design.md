# 프로젝트 리뷰 지적사항 교정 설계

## 범위와 승인

2026-09-01 사용자가 전체 리뷰의 1, 2, 4, 5, 6번 수정을 승인했다. 원본 OpenAPI와
기존 인증·삭제 정책은 변경하지 않는다.

## 설계

1. 제출 실행도 MSW를 시작하고 Playwright는 `build` 산출물을 `preview`로 검증한다.
2. 전체 Playwright smoke는 현재 인증 경계와 실제 화면 heading을 검증한다.
3. 빈 중간 page가 `hasNext: true`이면 다음 page를 자동 요청하고, terminal 빈
   page에서만 empty state를 표시한다.
4. 모든 TanStack Query read 요청은 제공된 `AbortSignal`을 기존 API client까지
   전달한다.
5. mock `GET /api/task`는 `page`가 없거나 1 미만·비정수·비숫자이면 기존
   `ErrorResponse` 형태의 400을 반환한다. 원본 OpenAPI 파일은 수정하지 않는다.

## 검증

각 항목은 먼저 실패 test로 재현한 뒤 focused Vitest 또는 Playwright를 통과시킨다.
마지막에 `./scripts/verify quick`, 전체 Playwright, production preview browser 확인,
`./scripts/verify full`, 계획 완료 적대적 review를 수행한다.
