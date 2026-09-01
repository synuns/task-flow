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

Lifecycle 훅은 pending 후보와 metadata만 생성합니다. 사람은 먼저
`.codex/review-pending/`의 세션 Markdown을 검수한 뒤 아래 명령을 실행합니다.

```bash
pnpm run ai:review
```

명령은 검수 대기 세션 ID 목록을 보여주고 번호 선택 후 선택한 session ID와
정확한 record ID를 다시 표시합니다. 정확히 `y`+Enter로 확인한 record만
artifact로 게시합니다.
다른 입력, EOF, signal은 취소되며 AI와 non-TTY 실행은 게시할 수 없습니다.
reviewer는 `git config user.name`에서만 읽으며 출력 가능한 Unicode 이름을
허용하고 제어 문자는 거부합니다. 자동 마스킹은 사람 검토를 대체하지
않습니다. 게시 transaction은 current closed record를 다시 검증한 뒤 staging,
artifact atomic rename, public index 갱신 순서로 실행되며 재실행해도 동일
결과를 냅니다.
`artifacts/`에는 사람 승인 기록만 추가합니다.

### 검토 완료 기록

<!-- reviewed-records:start -->
- [검토 완료 세션 `01a04ddf-4d15-74f3-8568-99bf5272814e.s0001`](./artifacts/codex-session-01a04ddf-4d15-74f3-8568-99bf5272814e.s0001.md)
- [검토 완료 세션 `01a04ddf-5be6-7322-838c-12e18fc2d714.s0001`](./artifacts/codex-session-01a04ddf-5be6-7322-838c-12e18fc2d714.s0001.md)
- [검토 완료 세션 `01a04ffd-0cb5-75e0-8cef-0ed1fbe5ceda.s0001`](./artifacts/codex-session-01a04ffd-0cb5-75e0-8cef-0ed1fbe5ceda.s0001.md)
- [검토 완료 세션 `01a04ffd-1913-77f0-bf79-373841e3ca81.s0001`](./artifacts/codex-session-01a04ffd-1913-77f0-bf79-373841e3ca81.s0001.md)
- [검토 완료 세션 `01a052d2-7802-7e10-b3ba-b89a95e9f783.s0001`](./artifacts/codex-session-01a052d2-7802-7e10-b3ba-b89a95e9f783.s0001.md)
- [검토 완료 세션 `01a052ec-d26a-7032-a6be-cf60cca407b6.s0001`](./artifacts/codex-session-01a052ec-d26a-7032-a6be-cf60cca407b6.s0001.md)
- [검토 완료 세션 `01a052ed-46d9-75a2-9589-4fc69a430e9f.s0001`](./artifacts/codex-session-01a052ed-46d9-75a2-9589-4fc69a430e9f.s0001.md)
- [검토 완료 세션 `01a05814-fa00-7891-b4d6-fd563f5ecf3e.s0001`](./artifacts/codex-session-01a05814-fa00-7891-b4d6-fd563f5ecf3e.s0001.md)
- [검토 완료 세션 `01a05ab5-6373-7620-a6db-87ff765586a4.s0001`](./artifacts/codex-session-01a05ab5-6373-7620-a6db-87ff765586a4.s0001.md)
- [검토 완료 세션 `01a05abc-6c6d-77f0-a445-4d31442b3f3d.s0001`](./artifacts/codex-session-01a05abc-6c6d-77f0-a445-4d31442b3f3d.s0001.md)
- [검토 완료 세션 `01a05acd-15c6-7f63-a78d-12d641fe269a.s0001`](./artifacts/codex-session-01a05acd-15c6-7f63-a78d-12d641fe269a.s0001.md)
- [검토 완료 세션 `01a05b8b-0a5b-74b0-8176-835ce81e007d.s0001`](./artifacts/codex-session-01a05b8b-0a5b-74b0-8176-835ce81e007d.s0001.md)
- [검토 완료 세션 `01a05bac-7de2-7b10-9cad-2854a37dccb5.s0001`](./artifacts/codex-session-01a05bac-7de2-7b10-9cad-2854a37dccb5.s0001.md)
<!-- reviewed-records:end -->

- [전체 프롬프트와 작업 기록](./artifacts/index.md)

### 기존 정책 기록

- [기록 자동화 설계·구현 세션](./artifacts/codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md) — `legacy/pre-policy`, 사람 검토 대기

기존 정책 기록은 별도 사람 검토 전까지 검토 완료 managed 영역과
`artifacts/index.md`에 포함하지 않습니다.
