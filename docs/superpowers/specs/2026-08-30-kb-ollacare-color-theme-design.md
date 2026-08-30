# KB올라케어 색상 테마 설계

## 목적

`SYS-02`의 명명된 색상 토큰 요구를 유지하면서 `src/styles/globals.css`의
shadcn semantic token 전체를 KB올라케어에 어울리는 색상 체계로 교체한다.
컴포넌트별 색상 literal이나 별도 theme abstraction은 추가하지 않는다.

## 시각 근거

- KB올라케어 App Store와 Google Play의 현재 홍보 화면은 선명한 옐로우,
  차콜 텍스트, 흰색 surface, 옅은 아이보리 배경을 반복한다.
- KB금융그룹 계열의 공식 색상 체계는 `KB Yellow Positive` `#ffbc00`,
  `KB Yellow Negative` `#ffcc00`, `KB Gray` `#60584c`, `KB Dark Gray`
  `#545045`를 정의한다.
- 옐로우는 브랜드와 주요 action에 집중한다. 오류, muted content, chart series를
  모두 옐로우로 만들지 않고 의미 구분과 대비를 우선한다.

참고:

- <https://apps.apple.com/kr/app/id1538105223>
- <https://www.kbollacare.com/>
- <https://www.kbfg.com/kor/about/corporate/ci.htm>
- <https://mapps.kbcard.com/SVC/DVIEW/HSJMCXCROCIC0025>

## 색상 방향

대표 palette는 다음 여섯 축만 사용한다.

| 역할 | 기준색 | 용도 |
| --- | --- | --- |
| KB Yellow Positive | `#ffbc00` | light theme primary, active action |
| KB Yellow Negative | `#ffcc00` | dark theme primary, 높은 명도의 강조 |
| KB Gray | `#60584c` | 보조 텍스트, 중성 chart |
| KB Dark Gray | `#545045` | dark surface와 진한 중성색 |
| Olla Ivory | `#fff8dc` 계열 | background, secondary, accent surface |
| Care Coral | 접근 가능한 coral-red 계열 | destructive와 일부 chart만 |

실제 CSS 값은 같은 색 공간에서 조절하기 쉬운 `oklch()`로 기록한다. 공식
hex는 브랜드 기준점이며, foreground와 상태색은 WCAG 대비와 semantic 역할에
맞춰 명도와 채도를 조정한다.

## semantic token 매핑

### Light

- `background`, `sidebar`: 아주 옅은 아이보리
- `card`, `popover`: 흰색
- `foreground`, `card-foreground`, `popover-foreground`: near-black warm charcoal
- `primary`, `sidebar-primary`: KB Yellow Positive
- `primary-foreground`, `sidebar-primary-foreground`: near-black charcoal
- `secondary`, `muted`, `accent`: 아이보리와 warm gray의 낮은 채도 surface
- `secondary-foreground`, `accent-foreground`: KB Dark Gray 계열
- `muted-foreground`: KB Gray보다 가독성이 확보된 중간 명도
- `destructive`: 옐로우와 혼동되지 않는 coral-red
- `border`, `input`: warm gray
- `ring`: 흰 배경에서도 식별되는 dark gold
- `chart-1`~`chart-5`: yellow, gold, KB Gray, care coral, KB Dark Gray
- `disabled`, `disabled-foreground`: muted surface와 읽을 수 있는 warm gray

### Dark

- `background`: near-black warm charcoal
- `card`, `popover`, `sidebar`: KB Dark Gray에서 명도를 낮춘 surface
- foreground 계열: warm white
- `primary`, `sidebar-primary`: KB Yellow Negative
- primary foreground: near-black charcoal
- `secondary`, `muted`, `accent`: 서로 구분되는 warm charcoal 단계
- `destructive`: 어두운 배경에서 식별되는 밝은 coral-red
- `border`, `input`: 낮은 alpha의 warm white
- `ring`: KB Yellow Negative보다 어두운 gold
- chart와 disabled는 light theme의 의미 순서를 유지하되 dark 대비만 조정한다.

## Tailwind 연결

`:root`와 `.dark`가 raw palette 값을 소유한다. `@theme inline`은 모든 shadcn
semantic token을 `--color-*` 이름으로 1:1 연결한다. 컴포넌트는 `bg-primary`,
`text-muted-foreground`, `border-border` 같은 semantic utility만 사용한다.

기존 `--disabled`, `--disabled-foreground`는 과제 원본 예시와 현재 계약을
보존하기 위해 shadcn 기본 목록에 추가로 유지한다. Pretendard와 radius 설정도
유지한다.

## 변경 범위

- `src/styles/globals.css`: light/dark raw token과 전체 `@theme inline` 연결
- `src/test/theme-contract.test.ts`: 모든 token의 light/dark 정의와 Tailwind 연결,
  token source 밖의 UI color literal 금지 계약
- `TODO.md`: 작업 상태와 재현 가능한 evidence

새 dependency, theme provider, toggle UI, component styling, layout 변경은 하지
않는다. `.dark`는 class 기반 소비 준비만 하며 현재 제품에 theme toggle 동작을
추가하지 않는다.

## 검증

1. 계약 test가 모든 필수 token의 `:root`, `.dark`, `@theme inline` 연결을 확인한다.
2. `src/styles/globals.css` 외 `src`의 color literal과 비-semantic Tailwind palette
   class가 없음을 정적으로 확인한다.
3. `pnpm vitest run src/test/theme-contract.test.ts`와
   `./scripts/verify quick`, `pnpm build`를 실행한다.
4. `/`에서 light theme의 computed background/foreground를 확인하고 `.dark`
   class 적용 시 값이 전환되는지 확인한다. console과 page error가 없어야 한다.

