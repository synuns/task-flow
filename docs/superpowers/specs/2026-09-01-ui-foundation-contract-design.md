# UI Foundation 계약 검증 설계

## 목적

Journey 화면을 더 구현하기 전에 이미 존재하는 공통 UI primitive의 계약을
검증하고 `UI-FOUNDATION-01`을 닫는다. 새 기능이나 디자인 체계를 만들지 않고,
검증에서 확인된 계약 위반만 공통 primitive에서 최소 교정한다.

## 기준과 범위

- Requirements: `SYS-02`, `SYS-03`, 공통 접근성 invariant
- Source priority: `assignment-original/openapi.yaml` →
  `assignment-original/requirement.md` → `docs/quality/requirements.md`
- Existing source: `src/shared/ui`, `src/styles/globals.css`
- Risk: LOW — 승인된 token과 shadcn/ui 구현을 검증하는 작업

### 포함

- `Button`, `Input`, `Label`, `Card`의 대표 조합 계약
- semantic color token 사용
- keyboard focus, native disabled, input error의 text·semantic 표현
- `/sign-in`의 mobile·desktop browser 확인
- 실패가 확인된 shared primitive의 최소 교정

### 제외

- 새 기능, route, showcase, component catalog
- 새 wrapper, generic form field, design-system abstraction
- application shell과 비동기 상태 UI
- Journey 화면·상태·API·auth·cache·삭제 동작
- dependency와 public API 확장
- 근거 없는 primitive refactor 또는 시각 재설계

## 현재 상태

기존 Focus workspace 구현에서 공식 shadcn/ui 기반 `Button`, `Input`, `Label`,
`Card`와 semantic theme token이 이미 추가됐다. 화면 소비처도 이 public API를
사용한다. 그러나 `UI-FOUNDATION-01`이 요구하는 대표 control 조합의 전용 계약
test와 해당 작업 evidence가 없어 작업 원장은 `NOT_STARTED` 상태다.

따라서 이 작업은 기존 production behavior를 새로 구현하는 작업이 아니라 현재
계약을 특성화하고 회귀를 막는 작업이다. 특성화 test가 모두 통과하면 production
code를 변경하지 않는다.

## Foundation 계약

### Button

- native `button`의 `disabled` attribute로 실행과 keyboard focus를 차단한다.
- disabled 상태는 native semantics와 visible label을 유지하고 opacity 표현을
  함께 사용한다.
- keyboard focus는 semantic `ring` token을 사용하는 visible focus style을 가진다.

### Input과 Label

- visible `Label`은 `htmlFor`/`id`로 `Input`과 연결된다.
- invalid input은 `aria-invalid`를 사용한다.
- 오류 text는 `aria-describedby`로 input과 연결되어 색상 없이도 관계가 전달된다.
- invalid style은 semantic `destructive` token을 사용하고 keyboard focus style을
  유지한다.

Label과 오류 text의 조합은 사용처 책임이다. 두 번째 안정된 사용 패턴 없이 새
form-field wrapper를 만들지 않는다.

### Card surface

- `Card`는 native content composition을 방해하지 않는 중립 surface다.
- background, foreground와 border는 semantic token만 사용한다.
- domain 상태나 interactive behavior를 `Card`에 추가하지 않는다.

## 자동 검증

`src/shared/ui/ui-foundation.test.tsx`에 한 개의 대표 fixture를 구성한다. fixture는
Card 안에서 Label·invalid Input·연결된 오류 text·disabled Button을 사용한다.
test는 다음 observable contract를 검증한다.

- label과 input의 accessible association
- invalid state와 오류 설명의 association
- button의 native disabled semantics
- primitive의 focus, disabled, error, surface style이 semantic token class를 사용함

기존 `src/test/theme-contract.test.ts`는 token 정의와 feature-local color literal
금지를 계속 검증한다. 실행 명령은 다음과 같다.

```bash
pnpm vitest run src/shared/ui/ui-foundation.test.tsx src/test/theme-contract.test.ts
./scripts/verify quick
```

이 작업은 production behavior 변경이 전제되지 않으므로 characterization test가
처음부터 통과할 수 있다. 실패하면 failure class와 root cause를 기록하고, assertion을
약화하지 않은 채 해당 shared primitive만 최소 교정한 뒤 같은 명령을 재실행한다.

## Browser 검증

`/sign-in`을 390×844와 1280×720에서 확인한다.

1. 빈 form에서 로그인 button의 disabled 상태를 확인한다.
2. Tab으로 input에 이동해 visible focus를 확인한다.
3. invalid 값을 입력해 visible error text와 input association을 확인한다.
4. console, page error와 예상 밖 network request가 없는지 확인한다.
5. screenshot을 저장하고 named agent-browser session을 닫는다.

Browser evidence는 `docs/quality/evidence/ui-foundation.md`에 requirement, commit,
route·viewport, precondition, actions, expected/actual, console/network,
screenshot, failure·correction·rerun을 기록한다.

## 완료 조건

- 전용 foundation test와 theme contract가 통과한다.
- `./scripts/verify quick`이 repository를 수정하지 않고 통과한다.
- 두 viewport의 browser evidence가 재현 가능하게 기록된다.
- 확인된 위반만 최소 교정되고 기능 확장이나 관련 없는 diff가 없다.
- plan-completion adversarial review가 완료된다.
- `UI-FOUNDATION-01`은 AI가 `AI_VERIFIED`까지만 갱신한다.
