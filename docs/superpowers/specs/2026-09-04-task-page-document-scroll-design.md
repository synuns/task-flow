# 할 일 페이지 문서 스크롤 설계

## 목적

할 일 목록만 스크롤되는 중첩 스크롤 구조를 제거하고 브라우저 문서 전체가 자연스럽게
스크롤되게 한다. 원본 요구사항 `TASK-LIST-03`, `TASK-LIST-04`의 가상 스크롤과 무한
페이지네이션은 유지하며 수동 다음 페이지 버튼은 제거한다.

## 선택한 접근

기존 `@tanstack/react-virtual` 의존성을 재사용해 목록 가상화 기준을 내부 요소에서
`window`로 전환한다. 할 일 페이지의 viewport 높이 제한과 목록의 `overflow`를 없애고,
문서 스크롤 위치에 따라 화면 주변 행만 렌더링한다.

대안인 페이지 전체 크기의 별도 스크롤 컨테이너는 브라우저 스크롤과 중첩되는 문제를
남기므로 사용하지 않는다. 모든 행을 일반 렌더링하는 방식은 가상 스크롤 요구사항을
위반하므로 사용하지 않는다. 새 의존성이나 공통 추상화는 추가하지 않는다.

## 화면과 상호작용

- 제목, 설명, `새 할 일` 버튼, 카드 목록이 하나의 문서 흐름을 이룬다.
- 사용자는 마우스 휠, 트랙패드, 키보드와 모바일 제스처로 브라우저 문서 전체를
  스크롤한다.
- 마지막 가상 행이 화면에 들어오면 `hasNext`가 참인 동안 다음 페이지를 한 번
  요청한다.
- `다음 페이지 불러오기` 버튼은 렌더링하지 않는다.
- 다음 페이지 로딩 표시와 부분 실패 재시도는 목록 영역 안에서 유지한다.
- `hasNext: false`가 되면 `모든 할 일을 불러왔습니다.` 문구를 목록 영역 최하단에
  표시한다.
- 기존 색상, 타이포그래피, 카드 표현과 반응형 내비게이션은 변경하지 않는다.

## 데이터와 오류 흐름

React Query의 기존 page 순서, single in-flight, abort signal, `hasNext` 종료 판정과
부분 실패 재시도를 그대로 사용한다. 스크롤 소유권만 문서로 이동하며 API 계약,
query key, cache 갱신 정책은 바꾸지 않는다.

초기 오류는 기존 목록 대체 alert와 `다시 불러오기`를 유지한다. 다음 페이지 오류는
이미 받은 카드를 보존하고 목록 하단의 `다시 불러오기`로 실패한 operation만 다시
실행한다. 이 오류 복구 버튼은 수동 페이지네이션이 아니다.

## 검증

- focused component test에서 window virtualizer 사용, 내부 overflow와 수동 다음 페이지
  버튼 부재, terminal 문구의 목록 영역 소속을 확인한다.
- 기존 pagination test로 각 page 1회 요청, intermediate empty page, partial retry와
  `hasNext: false` 종료를 확인한다.
- mapped `task-discovery` E2E를 문서 스크롤 방식으로 바꾸고 1280×400에서 실제 window
  scroll, bounded mounted row 수, page 1~15 exact sequence와 terminal 문구를 확인한다.
- 390×844 browser QA에서 문서 스크롤, 고정 하단 내비게이션과 terminal 문구의 가림
  여부, 가로 overflow, console/page error를 확인한다.
- focused test 뒤 `pnpm verify quick`, mapped Journey E2E, 최종 `pnpm verify full`을
  순서대로 실행한다.

## 범위 제외

API, 인증, 데이터 삭제 의미, 카드 디자인, AppShell 내비게이션 구조와 전역 디자인
토큰은 변경하지 않는다. 무한 스크롤 외 별도 pagination control이나 scroll restoration
기능도 추가하지 않는다.
