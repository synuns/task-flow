# AI 사용 내역

## 사용한 도구와 모델

- 도구: OpenAI Codex
- 모델: `gpt-5.6-sol`

## 적용한 작업 범위

- 과제 요구사항 분석과 프로젝트 구조 결정
- Codex 사용 기록 자동화 설계 및 구현
- 이후 구현 과정의 코드 작성, 테스트, 검토 보조

## 핵심 프롬프트 요약

- 과제 원본 문서를 별도 디렉터리로 분리
- Codex Stop Hook으로 사용자 프롬프트, 도구 작업, 최종 응답 기록
- SessionEnd Hook으로 세션 기록 인덱스 자동 생성
- 시스템·개발자 지침과 내부 reasoning 제외
- 비밀정보 자동 마스킹, 비추적 후보 생성, 사람 검토 후 명시적 게시

## 사람이 최종 검증한 내용

- [ ] 비밀정보와 민감정보 제거 확인
- [ ] 프롬프트와 작업 결과 정확성 확인
- [ ] 테스트 결과와 애플리케이션 동작 확인
- [ ] 도구, 모델, 작업 범위 정확성 확인

## 자동 검증 내역

- 자동화 결과는 사람 검증으로 간주하지 않으며 제출 전 확인된 결과만 수동 기록합니다.

## 전체 프롬프트와 작업 기록

Stop 훅은 구조적으로 내부 지침과 reasoning을 제외하고, 메모리에서
민감정보를 마스킹한 뒤 Git 비추적 pending 후보만 생성합니다. 사람이
후보의 내용과 민감정보를 모두 검토한 후 다음 명령으로 게시합니다.

```bash
./scripts/publish-ai-record <session-id> \
  --reviewed-by "<reviewer>" \
  --confirm-sensitive-review \
  --confirm-content-review
```

자동 마스킹은 사람 검토를 대체하지 않습니다. `artifacts/`에는 검토 후
게시된 기록만 추가합니다. 게시 명령은 공용 잠금 안에서 검토 artifact,
인덱스, 아래 managed 링크 순서로 갱신합니다. SessionEnd 훅은 파일명을
기준으로 인덱스만 검증·정리하며 `AI_USAGE.md`는 수정하지 않습니다.

### 검토 완료 기록

<!-- reviewed-records:start -->
<!-- reviewed-records:end -->

- [전체 프롬프트와 작업 기록](./artifacts/index.md)

### 기존 정책 기록

- [기록 자동화 설계·구현 세션](./artifacts/codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md) — `legacy/pre-policy`, 사람 검토 대기

기존 정책 기록은 별도 사람 검토 전까지 검토 완료 managed 영역과
`artifacts/index.md`에 포함하지 않습니다.
