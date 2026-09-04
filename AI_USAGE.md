# AI 사용 내역

## 사용한 도구와 모델

| 항목 | 내용 |
| --- | --- |
| 도구 | OpenAI Codex |
| 모델 | `gpt-5.6-sol` |

## 적용한 작업 범위

- 요구사항과 OpenAPI 계약 분석
- 프로젝트 구조와 Journey 설계
- 애플리케이션·MSW mock API 구현
- 단위·통합·E2E 테스트와 browser QA
- 코드 검토, 문서화, 검증 evidence 작성
- 프롬프트 기록의 마스킹·검토·게시 자동화

## 사용한 스킬

| 단계 | 스킬 | 사용 목적 |
| --- | --- | --- |
| 요구 분석·설계 | `brainstorming`, `frontend-design` | 요구를 설계로 구체화하고 화면 방향 결정 |
| 작업 분리·계획 | `using-git-worktrees`, `writing-plans` | 격리 checkout과 실행 가능한 단계 작성 |
| 구현 | `executing-plans`, `subagent-driven-development`, `test-driven-development` | 계획 단위 실행과 RED → GREEN 구현 |
| 문제 해결·검토 | `systematic-debugging`, `requesting-code-review`, `verification-before-completion` | root cause 수정, 적대적 검토, 완료 전 증거 확인 |
| Browser QA | `agent-browser` | 실제 route, viewport, keyboard, console, network 검증 |

## 핵심 프롬프트 요약

- 원본 문서와 OpenAPI를 기준으로 기능과 품질 요구를 Requirement ID로 추적
- 기능을 독립적인 Golden Journey로 분리하고 단계별 설계·구현·검증
- loading, empty, error, success와 접근성·반응형 상태 확인
- focused test, quick, Journey E2E, browser QA, full QA 순서로 검증
- Codex lifecycle hook으로 작업 기록 후보 생성
- 비밀정보 자동 마스킹 후 사람 검토를 통과한 기록만 게시

## 사람이 최종 검증한 내용

- [x] 비밀정보와 민감정보 제거 확인
- [x] 프롬프트와 작업 결과 정확성 확인
- [x] 테스트 결과와 애플리케이션 동작 확인
- [x] 도구, 모델, 작업 범위 정확성 확인

## 자동 검증 내역

자동 검증은 사람 검토를 대체하지 않습니다. 제출 전 확인된 결과와 재현 명령은
`TODO.md`와 `docs/quality/evidence/`에서 관리합니다.

## 프롬프트 작업 기록

- [작업 주제별 프롬프트 기록](./artifacts/index.md)
