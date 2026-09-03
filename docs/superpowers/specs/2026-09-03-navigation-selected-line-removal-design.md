# Navigation Selected 표시선 제거 설계

## 범위

- Requirement: `NAV-01`, `NAV-03`
- 대상: `src/widgets/app-shell/index.tsx`의 공통 `NavLink` selected style
- 모바일 상단선과 desktop 좌측선을 만드는 `before:*` utility class를 모두 제거한다.
- selected 배경색 `bg-primary/35`, text color와 `aria-current="page"`는 유지한다.
- layout, icon, label, keyboard focus와 route 동작은 변경하지 않는다.

이 결정은
`docs/superpowers/specs/2026-09-01-frontend-screen-design.md`와
`docs/superpowers/specs/2026-09-01-work-overview-journey-design.md`의 non-color
selected indicator 설명 중 선에 관한 부분을 대체한다. Selected 상태는 배경색과
`aria-current`로 전달한다.

## 구현과 검증

`itemClass`에서 pseudo-element utility만 삭제하고 새 abstraction이나 dependency는
추가하지 않는다. 기존 router test의 `before:bg-ring` 기대값만 제거하며, 선이 없다는
별도 회귀 assertion은 추가하지 않는다.

Focused shell/router test, `./scripts/verify quick`, mapped `work-overview` E2E를
실행한다. Agent-browser에서 390×844와 1280×720 selected navigation을 확인하고
computed `::before`가 선을 그리지 않으며 배경색, `aria-current`, keyboard focus가
유지되는 evidence를 기록한다.
