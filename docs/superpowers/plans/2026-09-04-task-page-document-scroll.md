# Task Page Document Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 할 일 목록의 내부 스크롤과 수동 다음 페이지 버튼을 제거하고 문서 전체 스크롤 기반 가상 목록·무한 페이지네이션으로 전환한다.

**Architecture:** 기존 React Query infinite query는 유지하고 `@tanstack/react-virtual`의 window virtualizer가 브라우저 문서 스크롤을 관찰하게 한다. 목록의 문서상 시작 위치를 `scrollMargin`으로 전달하며 loading, retry, terminal feedback은 같은 `aria-label="할 일 목록"` 영역 안에 둔다.

**Tech Stack:** React 19, TypeScript 5.9, TanStack Query 5, TanStack Virtual 3, Vitest, Testing Library, Playwright, agent-browser

## Global Constraints

- Authoritative requirements: `TASK-LIST-03`, `TASK-LIST-04`; Journey: `task-discovery`.
- API, 인증, query key, cache, destructive-data semantics와 전역 디자인 토큰은 변경하지 않는다.
- 기존 의존성만 사용하고 새 abstraction이나 pagination control을 추가하지 않는다.
- `다시 불러오기`는 실패 operation 복구용으로 유지하되 `다음 페이지 불러오기`는 렌더링하지 않는다.
- terminal 문구 `모든 할 일을 불러왔습니다.`는 목록 영역 최하단에 유지한다.
- 각 code change는 RED → GREEN을 확인하고 focused → quick → mapped E2E → browser → review → checkpoint → full 순서를 지킨다.

---

### Task 1: 문서 스크롤 기반 가상 목록

**Files:**
- Modify: `TODO.md`
- Modify: `src/pages/task-list/index.tsx`
- Modify: `src/widgets/task-list/index.tsx`
- Test: `src/widgets/task-list/task-list.test.tsx`

**Interfaces:**
- Consumes: `getTasks(client, page, signal)`, `taskKeys.all`, `TaskCard`, `useInfiniteQuery`의 기존 계약.
- Produces: 내부 scroll container 없이 `window`를 관찰하는 `TaskList`; 기존 `aria-label="할 일 목록"` region과 query state UI.

- [ ] **Step 1: 활성 TODO block을 기록한다**

`TODO.md` 끝에 다음 block을 추가한다.

```markdown
## 14. 할 일 페이지 문서 스크롤

### [ ] TASK-PAGE-DOCUMENT-SCROLL-01 전체 화면 스크롤과 순수 무한 pagination

- Requirements: `TASK-LIST-03`, `TASK-LIST-04`
- Risk: MEDIUM — window virtual measurement와 golden-journey scrolling 변경
- Depends on: `TASK-LIST-JOURNEY-VERIFY-01`
- Deliverable: 문서 전체 스크롤 기반 virtual list, 자동 next-page 요청, 목록 내부 terminal feedback
- Acceptance: 내부 overflow와 수동 next-page action 없이 window scroll로 page를 각 1회 요청하고, terminal 문구가 목록 최하단에 표시된다.
- Automatic verification: task-list Vitest, `pnpm verify quick`, mapped task-discovery/task-crud E2E, `pnpm verify full`
- Browser verification: `/task`, 1280×400과 390×844, document scroll/DOM bound/request sequence/terminal 위치/console/page error
- Status: IN_PROGRESS
- Evidence: 2026-09-04 Codex `/root`; branch `fix/task-page-document-scroll`; start SHA `637c323487cf1ee5e913d93a24e08f1eea590de6`; approved design `docs/superpowers/specs/2026-09-04-task-page-document-scroll-design.md`; plan `docs/superpowers/plans/2026-09-04-task-page-document-scroll.md`.
```

Run: `pnpm verify setup`

Expected: TODO dependency/status contract PASS.

- [ ] **Step 2: window virtualizer와 문서 흐름의 실패 test를 작성한다**

`src/widgets/task-list/task-list.test.tsx`의 virtualizer mock이 window 좌표를 지원하게 바꾸고 기존 keyboard handoff test를 문서 스크롤 test로 교체한다. hook 호출 자체는 assertion하지 않고 실제 DOM 결과를 검증한다.

```tsx
const { virtualizerMock } = vi.hoisted(() => ({
  virtualizerMock: ({
    count,
    scrollMargin = 0,
  }: {
    count: number;
    scrollMargin?: number;
  }) => ({
    getTotalSize: () => count * 96,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 96,
        start: index * 96 + scrollMargin,
      })),
    measureElement: () => undefined,
    options: { scrollMargin },
  }),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: virtualizerMock,
  useWindowVirtualizer: virtualizerMock,
}));

afterEach(cleanup);

it("uses the document as the only scroll surface", async () => {
  const successClient: ApiClient = {
    request: async <T,>(
      _input: RequestInfo | URL,
      _init: RequestInit,
      isSuccess: (value: unknown) => value is T,
    ) => {
      const body: unknown = {
        data: [{ id: "task-1", title: "첫 번째 할 일", memo: "첫 메모", status: "TODO" }],
        hasNext: false,
      };
      if (!isSuccess(body)) throw new Error("invalid fixture");
      return body;
    },
  };
  render(<TaskList />, { wrapper: wrapper(successClient) });

  const region = await screen.findByRole("region", { name: "할 일 목록" });
  expect(region).not.toHaveClass("overflow-auto");
  expect(region).not.toHaveAttribute("tabindex");
  expect(region).toContainElement(screen.getByText("모든 할 일을 불러왔습니다."));
  expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
});
```

page layout에는 별도 fixed-height assertion을 추가하지 않고 production source diff와 browser geometry로 검증한다.

- [ ] **Step 3: 실패를 확인한다**

Run: `pnpm vitest run src/widgets/task-list/task-list.test.tsx`

Expected: FAIL — `windowVirtualizer`가 호출되지 않고 region에 `overflow-auto`와 `tabindex="0"`가 남아 있다.

- [ ] **Step 4: page 높이 제한을 제거한다**

`src/pages/task-list/index.tsx`의 outer section만 자연스러운 문서 흐름으로 바꾼다.

```tsx
export function TaskListPage() {
  return (
    <section>
      <div className="mb-6 grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">할 일</h1>
          <p className="mt-2 text-muted-foreground">처리할 업무를 선택하세요.</p>
        </div>
        <CreateTaskDialog />
      </div>
      <TaskList />
    </section>
  );
}
```

- [ ] **Step 5: list를 window virtualizer로 최소 전환한다**

`src/widgets/task-list/index.tsx`에서 `useVirtualizer`를 `useWindowVirtualizer`로 바꾸고 `useLayoutEffect`, `useState`를 import한다. query, pagination effect와 error branches는 그대로 둔다.

```tsx
const scrollRef = useRef<HTMLElement>(null);
const [scrollMargin, setScrollMargin] = useState(0);
const virtualizer = useWindowVirtualizer({
  count: tasks.length,
  estimateSize: () => 96,
  getItemKey: (index) => tasks[index]?.id ?? index,
  overscan: 0,
  scrollMargin,
});

useLayoutEffect(() => {
  const nextScrollMargin = scrollRef.current?.offsetTop ?? 0;
  if (scrollMargin !== nextScrollMargin) setScrollMargin(nextScrollMargin);
});
```

success UI는 하나의 region으로 만들고 내부 scroll/focus handling과 next-page button을 제거한다. virtual row의 translate는 window 좌표를 list 좌표로 환산한다.

```tsx
<section aria-label="할 일 목록" className="grid gap-3" ref={scrollRef}>
  <ul
    className="relative m-0 list-none p-0"
    style={{ height: virtualizer.getTotalSize() }}
  >
    {virtualItems.map((virtualItem) => {
      const task = tasks[virtualItem.index];
      if (!task) return null;
      return (
        <li
          data-index={virtualItem.index}
          data-task-row={task.id}
          key={task.id}
          ref={virtualizer.measureElement}
          style={{
            left: 0,
            minHeight: virtualItem.size,
            position: "absolute",
            top: 0,
            transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
            width: "100%",
          }}
        >
          <TaskCard id={task.id} memo={task.memo} status={task.status} title={task.title} />
        </li>
      );
    })}
  </ul>
  {query.isError && query.data && (
    <Alert variant="destructive">
      <AlertDescription>
        <p>{errorMessage(query.error)}</p>
        <Button
          onClick={() =>
            void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
          }
          size="sm"
          type="button"
          variant="outline"
        >
          다시 불러오기
        </Button>
      </AlertDescription>
    </Alert>
  )}
  {query.isFetchingNextPage && (
    <div className="grid gap-2" role="status">
      <span className="sr-only">다음 할 일을 불러오고 있습니다.</span>
      <Skeleton className="h-24" />
    </div>
  )}
  {!query.hasNextPage && (
    <p className="text-center text-muted-foreground text-sm">모든 할 일을 불러왔습니다.</p>
  )}
</section>
```

- [ ] **Step 6: focused GREEN과 quick gate를 확인한다**

Run: `pnpm vitest run src/widgets/task-list/task-list.test.tsx src/pages/task-list/task-list-page.test.tsx`

Expected: 2 files PASS; window virtualizer, automatic page sequence, retry와 CRUD list refetch가 유지된다.

Run: `pnpm verify quick`

Expected: setup, format, lint, typecheck와 전체 Vitest PASS.

- [ ] **Step 7: 구현 단위를 commit한다**

```bash
git add TODO.md src/pages/task-list/index.tsx src/widgets/task-list/index.tsx src/widgets/task-list/task-list.test.tsx
git commit -m "fix(task): 할 일 목록을 문서 스크롤로 전환"
```

---

### Task 2: Journey E2E와 실제 브라우저 검증

**Files:**
- Modify: `e2e/task-discovery.spec.ts`
- Modify: `e2e/task-crud.spec.ts`
- Modify: `docs/quality/evidence/task-discovery.md`

**Interfaces:**
- Consumes: `/task`, `aria-label="할 일 목록"`, `[data-task-row]`, `GET /api/task?page=N`.
- Produces: 내부 element scroll에 의존하지 않는 task-discovery/task-crud browser journey와 재현 가능한 evidence.

- [ ] **Step 1: E2E를 window scroll 계약으로 바꾼다**

`e2e/task-discovery.spec.ts`의 내부 `scrollTop` mutation을 다음 window scroll polling으로 교체한다.

```ts
for (let pageNumber = 2; pageNumber <= 15; pageNumber += 1) {
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return taskRequests.map((request) => request.page);
    })
    .toContain(String(pageNumber));
}

const list = page.getByRole("region", { name: "할 일 목록" });
await expect(page.getByText("모든 할 일을 불러왔습니다.")).toBeVisible();
await expect
  .poll(() =>
    list.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      terminalInside: element.contains(
        Array.from(element.querySelectorAll("p")).find(
          (node) => node.textContent === "모든 할 일을 불러왔습니다.",
        ) ?? null,
      ),
      windowScrollY: window.scrollY,
    })),
  )
  .toMatchObject({ overflowY: "visible", terminalInside: true });
```

마지막 task 확인 전에도 `window.scrollTo(0, document.documentElement.scrollHeight)`를 사용한다. mounted row `< 10`, exact page 1~15, authorization와 console/page-error assertions는 유지한다.

`e2e/task-crud.spec.ts`의 `openTaskFromList`에서 manual button loop를 제거하고 terminal까지 window를 반복 scroll한다.

```ts
async function openTaskFromList(page: Page, id: string, title: RegExp): Promise<void> {
  const terminal = page.getByText("모든 할 일을 불러왔습니다.");
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      return terminal.isVisible();
    })
    .toBe(true);

  const taskLink = page.getByRole("link", { name: title });
  await expect(taskLink).toHaveAttribute("href", `/task/${id}`);
  await taskLink.click();
}
```

- [ ] **Step 2: mapped Journey를 실행한다**

Run: `pnpm exec playwright test e2e/task-discovery.spec.ts e2e/task-crud.spec.ts`

Expected: Chromium task-discovery 1/1과 task-crud 2/2 PASS; next-page button lookup 없음.

Run: `pnpm verify quick`

Expected: 전체 quick gate PASS.

- [ ] **Step 3: production browser를 두 viewport에서 검증한다**

production preview를 고정 포트에서 실행하고 `agent-browser` named session을 사용한다.

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4173
agent-browser --session task-page-document-scroll open http://127.0.0.1:4173/mockServiceWorker.js
```

기존 `docs/quality/evidence/task-discovery.md`의 same-origin auth/task fixture 방식으로 30개 task를 bootstrap 전에 주입하고 `/task`로 이동한다. 1280×400에서 body/document scroll을 끝까지 반복한 뒤 다음을 기록한다.

```js
({
  documentScrollY: window.scrollY,
  documentHeight: document.documentElement.scrollHeight,
  viewportHeight: innerHeight,
  listOverflowY: getComputedStyle(document.querySelector('[aria-label="할 일 목록"]')).overflowY,
  mounted: document.querySelectorAll("[data-task-row]").length,
  nextButton: !!Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("다음 페이지"),
  ),
  terminalInside: document
    .querySelector('[aria-label="할 일 목록"]')
    ?.contains(Array.from(document.querySelectorAll("p")).find((node) =>
      node.textContent === "모든 할 일을 불러왔습니다.",
    ) ?? null),
})
```

Expected: `documentScrollY > 0`, `documentHeight > viewportHeight`, `listOverflowY`는 `visible`, mounted `< 10`, nextButton `false`, terminalInside `true`, page 1~15 exact once.

390×844로 resize하고 다시 마지막까지 scroll한다. document width와 viewport width가 390으로 같고 terminal 문구가 고정 하단 navigation 위에서 보이며 console/page error가 비어 있음을 확인한다. desktop/mobile screenshot 경로와 network request sequence를 evidence에 기록하고 session을 닫는다.

- [ ] **Step 4: browser evidence를 기록하고 commit한다**

`docs/quality/evidence/task-discovery.md`에 `TASK-PAGE-DOCUMENT-SCROLL-01` section을 추가해 requirement, commit, route/viewports, precondition, actions, expected/actual geometry, request sequence, console/network, screenshots, failure classification과 rerun verdict를 기록한다. 기존 `JOURNEY-TASK-LIST-01 — HUMAN_APPROVED` 문구는 수정하지 않는다.

```bash
git add e2e/task-discovery.spec.ts e2e/task-crud.spec.ts docs/quality/evidence/task-discovery.md
git commit -m "test(task): 문서 무한 스크롤 여정 검증"
```

---

### Task 3: 계획 완료 검토와 사람 checkpoint

**Files:**
- Modify: `TODO.md`
- Modify if findings require: only files already named in Task 1 or Task 2

**Interfaces:**
- Consumes: approved spec, this plan, `TASK-LIST-03`, `TASK-LIST-04`, implementation/evidence commits.
- Produces: seven-field plan-completion review record and an `AI_VERIFIED` implementation task ready for human checkpoint.

- [ ] **Step 1: plan-completion adversarial review를 실행한다**

fresh reviewer context가 다음 target을 read-only로 검토한다.

```text
Review target: docs/superpowers/plans/2026-09-04-task-page-document-scroll.md, TASK-LIST-03/TASK-LIST-04, current implementation/evidence commit SHA
Checks: approved design/plan coverage, window measurement and scrollMargin, exact-once pagination, partial retry, terminal placement, keyboard/mobile accessibility, bounded DOM, task-crud regression, console/network errors, API/auth/cache invariants, weak tests, unrelated diff, TODO dependency/status
```

Expected: 모든 HIGH/MEDIUM finding이 해결되고 verdict `PASS` 또는 `PASS_WITH_LOW`. Finding correction은 원래 failure를 재현하는 focused RED를 먼저 추가하고 affected focused/quick/mapped browser gate를 다시 실행한다.

- [ ] **Step 2: TODO evidence를 완성하되 사람 승인을 주장하지 않는다**

`TASK-PAGE-DOCUMENT-SCROLL-01` checkbox를 `[x]`, Status를 `AI_VERIFIED`로 바꾸고 focused/quick/E2E/browser 결과와 다음 seven-field review record를 Evidence에 추가한다.

```text
Review target: plan path, requirement IDs, exact target SHA
Reviewer: reviewer context ID and author와의 관계
Checks: 실제 수행한 검토 항목
Findings: 없음 또는 severity/class/root cause
Corrections: 없음 또는 적용 변경
Rerun: 실제 재현 명령과 결과
Verdict: PASS | PASS_WITH_LOW
```

Run: `pnpm verify setup && git diff --check`

Expected: TODO contract와 whitespace PASS.

- [ ] **Step 3: 검토 기록을 commit하고 checkpoint를 요청한다**

```bash
git add TODO.md
git commit -m "docs(qa): 할 일 문서 스크롤 검증 근거 기록"
```

사용자에게 desktop/mobile screenshot, exact page sequence, mounted DOM bound, terminal 위치와 review verdict를 제시하고 task-discovery golden-journey checkpoint를 한 번 요청한다. AI는 `HUMAN_APPROVED`를 표시하지 않는다.

---

### Task 4: checkpoint 이후 full review와 최종 QA

**Files:**
- Modify: `TODO.md`
- Modify: `docs/quality/evidence/task-discovery.md`

**Interfaces:**
- Consumes: 사용자의 명시적 checkpoint 결과와 Task 3의 reviewed target.
- Produces: current branch의 full review/full verification 기록; 사람의 최종 acceptance는 생성하지 않는다.

- [ ] **Step 1: checkpoint 결과를 사실대로 기록한다**

사용자가 승인하면 승인 발화와 날짜를 evidence에 기록하되 AI가 status `HUMAN_APPROVED`를 만들거나 checkbox를 대신 완료하지 않는다. 수정 요청이면 TODO를 다시 `IN_PROGRESS`로 두고 해당 finding의 RED → GREEN → browser → review loop를 반복한다.

- [ ] **Step 2: full review와 최종 QA를 실행한다**

Run: `pnpm verify full`

Expected: setup/quick/build/core Chromium/verifier regression 모두 PASS.

Run: `git diff --check && git status --short --branch`

Expected: whitespace 오류, untracked generated noise와 unrelated diff 없음.

fresh full-review context가 task-discovery 외 auth transition, navigation, stale query, API error, CRUD regression, OAS/mock 불변, console/network와 evidence/TODO 정합성을 확인한다. HIGH/MEDIUM finding은 같은 TDD와 검증 loop로 해결한다.

- [ ] **Step 3: final QA evidence를 commit한다**

`TODO.md`와 `docs/quality/evidence/task-discovery.md`에 exact full command 결과와 full-review seven-field record를 추가한다.

```bash
git add TODO.md docs/quality/evidence/task-discovery.md
git commit -m "docs(qa): 할 일 스크롤 최종 검증 기록"
```

마지막으로 `pnpm verify full`과 `git diff --check`를 새 commit에서 다시 실행한다. 결과를 사용자에게 보고하고 merge나 최종 acceptance는 요청하지 않은 상태에서 수행하지 않는다.
