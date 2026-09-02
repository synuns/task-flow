# Final QA Evidence

Requirement/Journey: `SYS-02`, `SYS-04`, assignment-wide cross-journey review
Branch/Scope: `fix/dec-prefix`; full-gate commit `8a09746`; `main...HEAD`
Review date: 2026-08-31
Precondition: all four journey evidence records exist; no tracked primary human approval
record was found, so every checkpoint remains unapproved
Actions: compare the branch diff with the original requirement and OpenAPI; inspect auth,
router, delete, query-cache and mock boundaries; run color-literal, forbidden-import,
raw-fetch, production-storage, navigation-owner, secret, debug-output, generated-noise
and `git diff --check` scans; map every OpenAPI operation/status/schema to shared API and
MSW handlers; run the repository full gate on the intended branch state
Expected: semantic color tokens cover application colors; every required API operation
has an OAS-conforming submitted MSW implementation; auth and delete decisions remain
bounded by their approved policies; no cross-journey stale-state, architecture, secret,
debug or unrelated-diff finding remains
Actual: global application colors resolve through named CSS custom properties and the
feature code introduces no color literal; generated OpenAPI types remain consumed only
inside `shared/api`; sign-in, refresh, user, dashboard, task list/detail/delete handlers
cover all seven OpenAPI operations and their documented 200/400/401/404 shapes; protected
requests use the injected bearer client; mock-only session storage is isolated under
`src/mocks`; static boundary and diff scans passed
Console/Network: the four journey records account for the expected anonymous bootstrap
401, credential 400 and deliberate deleted-detail 404; no unexpected console or page
error remained; exact protected request counts and bearer headers are recorded per
journey
Screenshot/Trace: the four journey evidence files reference their Chromium attachments
and manual screenshots at desktop and applicable 390x844 mobile viewports
Finding: `DOCUMENTATION` — three approved and implemented `DEC-*` items, final `SYS-02`
and `SYS-04`, the phase summary, and checkpoint verdict wording retained stale pre-review
states; `TEST` — work-overview used a partial accessible-name locator and inspected the
request sequence before the returned dashboard finished rendering
Correction: set the three decision items and two supported system requirements to
`AI_VERIFIED`, use exact global-navigation names, await the returned dashboard heading,
and assert its legitimate bearer reload
Rerun verdict: focused work-overview Chromium rerun passed three consecutive parallel
cases; clean `./scripts/verify full` passed on `8a09746` — setup 79 tests, format, lint,
generated API check, TypeScript, 33 Vitest files/118 tests, production build, and five
Chromium core cases across all four journeys

Independent review status: the prior cross-Journey review narrative has no reviewer or
exact target commit record, so it is not accepted as the required independent review.
No historical reviewer or target was added retroactively.

## Scenario Loop Harness Independent Review — 2026-09-01

Review target: `9cabebf343fed5ab1c82f7432ce1134e4d1ac157`,
`QA-HARNESS-01`, and the five scenario-loop harness findings
Reviewer: `/root/harness_independent_review`, a fresh read-only context that did not
author the implementation
Checks: inspected `6931c91..9cabebf` and the correction diff, auth fixture/MSW cookie
boundary, three protected Journey specs, Playwright/Vitest config, TODO parser/tests,
`TODO.md`, and all five evidence files; ran `tests/test_verify_contract.py`, the harness
config Vitest, protected Journey Playwright tests, `./scripts/verify full`,
`git diff --check`, and `git status --short`
Findings: the first review of `e01c9c2` found three MEDIUM findings — JavaScript-readable
wide-path fixture cookie, TODO parser negative/English/Status gaps, and loss of semantic
fresh-server config coverage. The final review of `9cabebf` found none.
Corrections: seeded the existing MSW cookie store with an HttpOnly `/api/refresh` cookie
and asserted no document token; added missing-Status and Korean/English approval-claim
boundaries; restored semantic config imports and `reuseExistingServer: false` assertion
Rerun: verifier contract 12/12, harness config 2/2, protected Journey 3/3, hook 86,
Vitest 34 files/122 tests, build, core Chromium 5, verifier regression 19, diff check and
clean status all PASS
Verdict: PASS

## Human-owned remainder

`SYS-05` remains `IN_PROGRESS`: `AI_USAGE.md` contains the required sections, but its
four human-verification checkboxes are intentionally unchecked and a legacy pre-policy
record is explicitly marked as awaiting human review. No AI record was reviewed or
published by the agent. Final acceptance therefore remains a human action after the
full automatic gate.

## QA-CROSS-AUTH-01 Journey 간 인증 전환 — 2026-09-02

Requirement/Journey: `QA-CROSS-AUTH-01`; `AUTH-07`, `NAV-02`, `NAV-03`,
`DASH-01`, `TASK-LIST-01`, `TASK-DETAIL-01`, `TASK-DETAIL-05`, `USER-01`

Commit: approved product/start target
`48300e534516d702a351980e5661b3851ce02a38`; browser and automatic evidence claim
target `0ccdc3c8b5d5acfc281577ffd37c19104c555d6f`. Product, test, API, auth policy,
dependency and architecture files were unchanged. The terminal reproducibility
correction was rerun on evidence target `f2b568a7880fcd7539704c3749d1d63481fbe48f`.

Agent-browser session: fresh named session `qa-cross-auth-01`, closed. Fresh Vite
server `127.0.0.1:4173` was stopped and the port was confirmed closed.

Route/Viewport: `/sign-in`, `/`, `/task`, `/task/task-1`, `/user`, and an uncached
`/task/qa-cross-auth-terminal-*`; Chromium 1280x720 and 390x844.

Precondition: all four Journey dependencies are `HUMAN_APPROVED`; the named context
started with cleared browser cookies and session storage. Sign-in used the existing
approved fixture. The audit retained only request method, path, status, and bearer
presence; credentials and token/cookie values were neither retained nor recorded.

Actions: run the focused auth/provider/route/request/router suite plus the
authenticated API bridge, `./scripts/verify quick`, and mapped auth Playwright. At both
viewports directly enter each protected route while anonymous; sign in from an original
protected target; reload through the refresh cookie; navigate dashboard, task list,
task detail, and profile. For each terminal viewport, send a successful fixture
`POST /api/sign-in` while the app remains on an authenticated route; this calls the
existing MSW `startAuthSession`, replaces the handler's accepted access token, and
leaves the provider holding its prior token. Clear cookies, reset the audit after that
setup request, then enter a fresh detail route and force the terminal refresh response
at the page fetch boundary. Inspect fresh snapshots, URL, protected text, navigation
actions, redacted request audit, console/errors/network, responsive width, and
screenshots.

Expected: every anonymous protected direct entry lands on `/sign-in` without protected
or prior-route content; successful sign-in returns to the preserved protected target;
reload restores the authenticated route; every protected route shows profile and no
sign-in action or stale prior-route content; terminal GET 401 plus refresh 401 clears
protected session/cache state and renders anonymous `/sign-in` with no prior-user UI.

Actual: all four anonymous routes (`/`, `/task`, `/task/task-1`, `/user`) redirected to
`/sign-in` at both widths with exactly one sign-in action, zero profile action, and none
of the checked dashboard/list/detail/profile fixture strings. Mobile sign-in returned
to the original `/user`; reload remained on `/user` and rendered `김담당` /
`오늘도 차근차근`. The authenticated mobile and desktop sweeps rendered, in
order, the dashboard, task list, `task-1` detail, and profile; each fresh route exposed
profile only and excluded the preceding route's checked content. Document width equaled
viewport width at 1280 and 390. Vite React StrictMode cancelled the first development
GET in several pairs; the following bearer GET succeeded with 200 and no stale view
remained. The terminal desktop and mobile runs both ended at `/sign-in` with links
`대시보드` / `할 일` / `로그인`, zero profile action, and none of the checked
dashboard/list/detail/profile data.

Automatic verification:

- `pnpm vitest run src/app/auth/auth-provider.test.tsx
  src/app/auth/auth-route-boundary.test.tsx
  src/shared/api/authenticated-request.test.ts src/app/router.test.tsx
  src/app/auth/authenticated-api-bridge.test.tsx` — PASS, 5 files/29 tests. The provider
  cases prove terminal refresh 401 removes all protected query roots (`dashboard`,
  `tasks`, `task`, `user`) while retaining unrelated cache. The bridge case proves an
  actual task request's 401 + refresh 401, task-root removal, anonymous route recovery,
  unrelated-cache retention, and bounded request counts.
- `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format, lint,
  generated API check, typecheck, Vitest 38 files/150 tests.
- `pnpm exec playwright test e2e/auth-entry.spec.ts` — PASS, Chromium 2/2; protected
  direct entry, preserved return, refresh-cookie reload, profile transition, credential
  error modal, request boundary, focus, and mobile width passed.

Redacted browser request wrapper: `new Request(input, init)` derived method/path and
whether `Authorization` began with `Bearer `, called the untouched original fetch, and
recorded only response status. For the corrected terminal route-only check, the wrapper
returned the contract `ErrorResponse` with status 401 for `POST /api/refresh`; all other
requests used the original fetch. The credential-free wrapper logic was:

```js
window.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const entry = {
    method: request.method.toUpperCase(),
    path: url.pathname + url.search,
    bearer: request.headers.get("Authorization")?.startsWith("Bearer ") === true,
  };
  if (
    window.__qaForceRefresh401 &&
    entry.method === "POST" &&
    url.pathname === "/api/refresh"
  ) {
    window.__qaRequestAudit.push({
      ...entry,
      status: 401,
      source: "contract-intercept",
    });
    return new Response(JSON.stringify({ errorMessage: "인증 정보를 갱신할 수 없습니다." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const response = await window.__qaOriginalFetch(input, init);
    window.__qaRequestAudit.push({
      ...entry,
      status: response.status,
      source: "transport",
    });
    return response;
  } catch (error) {
    window.__qaRequestAudit.push({
      ...entry,
      status:
        error instanceof DOMException && error.name === "AbortError"
          ? "aborted"
          : "network-error",
      source: "transport",
    });
    throw error;
  }
};
```

The initial sweep used `agent-browser --session qa-cross-auth-01`; the terminal-only
rerun used the exact form `agent-browser --session qa-cross-auth-01-correction open
http://127.0.0.1:4173/<route>`. Both used
`set viewport 1280 720` / `set viewport 390 844`, `wait --url`, `snapshot -i`,
`cookies clear`, `console`, `errors`, `network requests --filter api`, `screenshot`,
and `close`. Complex redacted audit/setup expressions were supplied with `eval --stdin`.

The exact invalidation setup was the following successful request. The literal fixture
values are documented in `auth-entry.md`; this record keeps credentials, body values,
and the token response redacted. The page script did not read the response body; the
setup console buffer was cleared before evidence inspection and no body/token was
retained.

```js
fetch("/api/sign-in", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "[approved fixture email]",
    password: "[approved fixture password]",
  }),
}).then((response) => ({
  method: "POST",
  path: "/api/sign-in",
  status: response.status,
}));
```

After that request returned 200 and `agent-browser ... cookies clear` completed, the
precise boundary was:

```js
window.__qaRequestAudit = [];
window.__qaForceRefresh401 = true;
```

Console, page-error, and network buffers were then cleared before the uncached SPA
route transition. Therefore the invalidation setup POST is intentionally excluded from
the following `reset 이후 app-flow audit`; this list is not a complete network sequence:

```json
[
  { "method": "GET", "path": "/api/task/qa-cross-auth-app-flow-*", "bearer": true, "status": 401, "source": "transport" },
  { "method": "POST", "path": "/api/refresh", "bearer": false, "status": 401, "source": "contract-intercept" }
]
```

No protected replay followed the terminal refresh failure. Cache semantics are not
inferred from browser DOM alone: the provider cases establish all protected-root
eviction, while the bridge case establishes task-root eviction and route recovery.

Console/Network: normal protected sweeps recorded successful bearer responses after
expected StrictMode aborts and no page error. The final terminal console contained only
the deliberate protected GET 401 resource error; `agent-browser errors` was empty. The
synthetic contract refresh 401 intentionally did not reach the network monitor. No
unexpected response, request, console error, or secret-bearing evidence was retained.

Screenshot/Trace: `/tmp/kbhc-qa-cross-auth-01-desktop-anonymous.png`,
`/tmp/kbhc-qa-cross-auth-01-mobile-anonymous.png`,
`/tmp/kbhc-qa-cross-auth-01-desktop-authenticated.png`,
`/tmp/kbhc-qa-cross-auth-01-mobile-authenticated.png`,
`/tmp/kbhc-qa-cross-auth-01-mobile-return-user.png`,
`/tmp/kbhc-qa-cross-auth-01-desktop-terminal-401.png`,
`/tmp/kbhc-qa-cross-auth-01-mobile-terminal-401.png`,
`/tmp/kbhc-qa-cross-auth-01-correction-desktop-terminal-401.png`, and
`/tmp/kbhc-qa-cross-auth-01-correction-mobile-terminal-401.png`. `file` and `sips`
confirmed the named desktop files are 1280x720 and mobile files are 390x844. Passing
mapped E2E used attachments only; no failure trace was generated.

Failure class: `TOOLING` — `agent-browser cookies clear` removed browser-context cookies
but did not remove the MSW service-worker cookie store. Two diagnostic attempts therefore
received refresh 200 and ended in the expected missing-detail 404; they are not terminal
401 PASS evidence.

Correction: stopped probing the browser/MSW cookie implementation. Kept the required
cookie-clear action, then used the smallest deterministic page-boundary alternative: a
single contract-shaped refresh 401 response. Used browser evidence only for visible
route/navigation/DOM recovery, provider cases for all protected-root eviction, and the
bridge case for task-root eviction plus route recovery. No product or test source
changed.

Rerun verdict: PASS — focused 5/29, quick 38/150, mapped Chromium 2/2, anonymous and
authenticated cross-route sweeps, plus the fresh correction-session terminal desktop/
mobile `reset 이후 app-flow audit`, screenshot dimensions, session/server cleanup, and
closed port all passed. No accepted auth or security behavior change was required.

## QA-CROSS-DATA-01 삭제 후 data 일관성 — 2026-09-02

Requirement/Journey: `QA-CROSS-DATA-01`; `DASH-01`, `TASK-LIST-01`,
`TASK-DETAIL-01`~`TASK-DETAIL-05`; approved `DEC-DELETE-01`

Commit: reviewed product/start target
`6f6aacd9f957fade390988caca1e7e8834c9dbfa`; evidence claim target
`9602f0222c9a274d550f91bf40c4d93c1e6367fa`. `git diff --name-only` from the
reviewed task-resolution product target
`21a0d07c653f3e0f3e5cab158d0f8f78d9538cee` to the start target contained only
TODO/evidence/spec documentation, so the reviewed product, tests, E2E, API and delete
semantics were unchanged.

Agent-browser session: fresh named session `qa-cross-data-01`, closed and recreated
between viewport cases. Fresh Vite server `127.0.0.1:4173` was stopped and the port was
confirmed closed.

Route/Viewport: `/task/task-1` → `/task` → direct SPA route entry
`/task/task-1` → `/`; Chromium 1280x720 and 390x844.

Precondition: all four Journey dependencies were `HUMAN_APPROVED`. Each viewport began
after clearing cookies and browser storage, then installing the approved refresh-cookie
fixture, removing `__kbhc_msw_task_fixture__`, and opening a fresh document. That reset
restored the three-task store and an empty application query cache. No sign-in request,
credential, access token, refresh token, or cookie value was retained in evidence.

Actions: run the focused fixture/handler/cache/detail suite, `./scripts/verify quick`,
and mapped task-resolution Playwright. At each viewport confirm the existing detail title,
memo and original datetime, install and reset the redacted page fetch audit, open the
delete modal, enter exact `task-1`, and submit once. Inspect the redirected list, directly
enter the deleted detail path through the SPA router, use dashboard navigation, and check
fresh snapshots, URL, visible data, document width, audit, console/errors/network and
screenshots.

Expected: the explicit success attempt sends one bearer DELETE and only its 200 result
navigates to `/task`; task-1 disappears while task-2/task-3 remain; direct deleted detail
returns the contract 404 with list recovery and no stale task-1 content; dashboard values
become `2/1/1`; failure/unknown paths remain non-success without unauthorized mutation or
redirect under the approved decision.

Actual: both fresh viewport cases first rendered `첫 번째 할 일`,
`삭제 검증 대상`, and `datetime=2026-08-30T09:00:00.000Z`. Exact input enabled
confirmation and one click produced exactly one `DELETE /api/task/task-1` with bearer and
status 200, then `/task`. The list contained task-2 and task-3 and contained neither the
task-1 title nor memo. Direct SPA entry to `/task/task-1` displayed exactly one
`할 일을 찾을 수 없습니다.` message and `할 일 목록으로 이동`, with no stale
task-1 title/memo. Dashboard displayed total/rest/done `2/1/1`. Document width equaled
viewport width at 1280 and 390.

Automatic verification:

- `pnpm vitest run src/mocks/fixtures/tasks.test.ts
  src/mocks/handlers/tasks.test.ts
  src/features/delete-task/model/delete-cache.test.ts
  src/pages/task-detail/task-detail.test.tsx` — PASS, 4 files/19 tests. The shared
  fixture/handler test proved the before `3/2/1` → DELETE 200 → remaining list →
  detail 404 → dashboard `2/1/1` transaction; cache/page tests proved protected-root
  eviction, success-only navigation, direct-404 non-success, and unrelated-cache retention.
- `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format, lint, generated
  API check, typecheck and Vitest 38 files/150 tests.
- `pnpm exec playwright test e2e/task-resolution.spec.ts` — PASS, Chromium 1/1; exact-ID
  success, bearer DELETE count 1, list absence, deleted-detail 404, dashboard `2/1/1`,
  expected console 404 and empty page errors passed.

Redacted browser request wrapper: after the initial detail rendered, console/error/network
buffers and this audit were reset. Therefore the arrays below intentionally begin at the
explicit delete attempt and exclude fixture bootstrap and initial detail GET. The wrapper
used `new Request(input, init)` so `init` overrides for string, URL, and Request inputs were
preserved, forwarded the untouched arguments, and retained only method, path, status, and
bearer presence:

```js
window.__qaCrossDataOriginalFetch = window.fetch;
window.__qaCrossDataAudit = [];
window.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const entry = {
    method: request.method.toUpperCase(),
    path: url.pathname + url.search,
    bearer: request.headers.get("Authorization")?.startsWith("Bearer ") === true,
  };
  try {
    const response = await window.__qaCrossDataOriginalFetch(input, init);
    window.__qaCrossDataAudit.push({ ...entry, status: response.status });
    return response;
  } catch (error) {
    window.__qaCrossDataAudit.push({
      ...entry,
      status:
        error instanceof DOMException && error.name === "AbortError"
          ? "aborted"
          : "network-error",
    });
    throw error;
  }
};
window.__qaCrossDataAudit = [];
```

Desktop and mobile produced the same reset-boundary audit:

```json
[
  { "method": "DELETE", "path": "/api/task/task-1", "bearer": true, "status": 200 },
  { "method": "GET", "path": "/api/task?page=1", "bearer": true, "status": "aborted" },
  { "method": "GET", "path": "/api/task?page=1", "bearer": true, "status": 200 },
  { "method": "GET", "path": "/api/task/task-1", "bearer": true, "status": "aborted" },
  { "method": "GET", "path": "/api/task/task-1", "bearer": true, "status": 404 },
  { "method": "GET", "path": "/api/dashboard", "bearer": true, "status": "aborted" },
  { "method": "GET", "path": "/api/dashboard", "bearer": true, "status": 200 }
]
```

The Vite React StrictMode development fetches aborted the first GET in each pair; the
following bearer GET supplied the visible list, 404, and dashboard result. They are not
extra user delete attempts. Each viewport audit contains exactly one DELETE, status 200,
with no auth replay observed.

Failure/unknown reuse: this fresh cross-data browser pass did not repeat destructive
failure injections. The unchanged product target's reviewed
`docs/quality/evidence/task-resolution.md#task-delete-outcome-view-01` record and its
focused delete outcome/cache/page/transport suites already prove direct 404 as
non-success, network/invalid-response GET-only reconciliation, unknown without redirect,
no automatic DELETE retry, and no mutation before 200. The fresh 4/19 suite additionally
reproved unauthorized DELETE nonmutation and repeated-delete 404 at the shared-store
boundary. Reuse is explicit and is not claimed as a fresh browser failure rerun.

Console/Network: after the reset boundary, MSW console showed DELETE 200, remaining-list
200, deliberate deleted-detail 404 and dashboard 200. The sole console error was the
expected 404 resource line; `agent-browser --json errors` returned `[]`. As in the reviewed
Journey, `agent-browser network requests --filter api` returned `No requests captured`
for service-worker-owned traffic and was not used as count evidence; the redacted page
audit and MSW console establish the requests. No unexpected response, console/page error,
or secret-bearing output remained.

Screenshot/Trace: `/tmp/kbhc-qa-cross-data-01-desktop-list.png`,
`/tmp/kbhc-qa-cross-data-01-desktop-deleted-detail.png`,
`/tmp/kbhc-qa-cross-data-01-desktop-dashboard.png` are 1280x720;
`/tmp/kbhc-qa-cross-data-01-mobile-list.png`,
`/tmp/kbhc-qa-cross-data-01-mobile-deleted-detail.png`, and
`/tmp/kbhc-qa-cross-data-01-mobile-dashboard.png` are 390x844. `file` and `sips`
confirmed all six dimensions. Passing mapped E2E produced no failure trace.

Failure class: `TOOLING` — the agent-browser network monitor did not expose MSW
service-worker requests. No product failure occurred.

Correction: used the already-reviewed page-level redacted audit, kept StrictMode aborts
distinct from completed responses, and used the MSW console only for response
corroboration. No product, test, E2E, dependency, architecture or accepted behavior
changed.

Rerun verdict: PASS — focused 4/19, quick 38/150, mapped Chromium 1/1 and both fresh
success cross-route browser cases passed; failure/unknown semantics were reused only from
the unchanged reviewed target. Session/server cleanup, screenshot dimensions and closed
port passed.

## QA-RESPONSIVE-A11Y-01 전체 route 접근성·반응형 sweep — 2026-09-02

Requirement/Journey: `QA-RESPONSIVE-A11Y-01`; 전체 UI requirement와 접근성
invariant. 선행 `QA-CROSS-AUTH-01`과 `QA-CROSS-DATA-01`은 모두 `AI_VERIFIED`였다.

Commit: reviewed start target `1cba1e1258f96a96e3966d508a22f977fb13f8e5`;
claim 및 browser/automatic target `8b2ba83b90379758b33105a045f4dc7085449f23`.
제품, test, E2E, dependency, architecture와 accepted behavior는 변경하지 않았다.

Automatic verification:

- `pnpm vitest run src/widgets/app-shell/app-shell.test.tsx
  src/features/sign-in/ui/sign-in-form.test.tsx
  src/widgets/dashboard-summary/dashboard-summary.test.tsx
  src/widgets/user-profile/user-profile.test.tsx
  src/widgets/task-list/task-list.test.tsx
  src/pages/task-detail/task-detail.test.tsx
  src/features/delete-task/ui/delete-task-dialog.test.tsx` — PASS, 7 files/30 tests.
- `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format, lint,
  generated API check, typecheck, Vitest 38 files/150 tests.
- `pnpm exec playwright test e2e/auth-entry.spec.ts e2e/task-discovery.spec.ts
  e2e/task-resolution.spec.ts` — PASS, Chromium 4/4. 이미 lower-level에서 입증한
  화면 조건을 새 E2E로 복제하지 않았다.

Agent-browser session: fresh named `qa-responsive-a11y-01`; Vite
`pnpm dev --host 127.0.0.1 --port 4173`. Anonymous `/sign-in`을 먼저 확인한 뒤
기존 승인 auth fixture와 기본 3-record task fixture를 새 문서에 설치했다. Route나
DOM 변경 뒤마다 fresh `snapshot -i`를 얻고, `set viewport 1280 720`과
`set viewport 390 844`, keyboard `Tab`/`Shift+Tab`/`Enter`/`Escape`, DOM measure,
`console --json`, `errors --json`, `network requests --filter api --json`, screenshot과
`sips` dimension 검사를 사용했다.

Fresh route results:

| Route | Accessible/visible result | Responsive and keyboard result |
| --- | --- | --- |
| `/sign-in` | `main` 1, `주요 메뉴` navigation 1, h1 `로그인`; `로그인`에 `aria-current=page`; visible `이메일`/`비밀번호` labels가 `sign-in-email`/`sign-in-password`와 연결되고 초기 submit은 native disabled | widths 1280/1280, 390/390; mobile form 308px; Tab으로 `대시보드`에 도달했고 `2px solid` outline 확인 |
| `/` | `main`/navigation 각 1, h1와 current action `대시보드`; `전체 할 일/3`, `남은 할 일/2`, `완료한 일/1` | widths 1280/1280, 390/390; mobile navigation은 fixed bottom; 대표 nav action의 `2px solid` keyboard outline 확인 |
| `/task` | `main`/navigation 각 1, h1와 current action `할 일`; named region `할 일 목록`; 세 Card Link가 title+memo accessible name과 정확한 `/task/task-*` href, terminal text를 노출 | widths 1280/1280, 390/390; region desktop 960x500, mobile 358x560; nav에서 Tab이 Card까지 빠져나와 첫 Card의 `2px solid` outline을 보였고 Enter가 `/task/task-1`로 이동 |
| `/task/task-1` | `main`/navigation 각 1, h1 `첫 번째 할 일`; task navigation에 `aria-current=page`; memo, original `datetime=2026-08-30T09:00:00.000Z`, `할 일 목록` Link와 `할 일 삭제` Button | widths 1280/1280, 390/390; mobile article 358px; list-return keyboard focus는 2px ring box-shadow로 비색상 표시 |
| `/user` | `main`/navigation 각 1, h1와 current action `회원정보`; `이름/김담당`, `메모/오늘도 차근차근` | widths 1280/1280, 390/390; Tab으로 navigation action에 도달했고 `2px solid` outline 확인 |

각 route에서 dashboard/task/profile 또는 sign-in 중 현재 상태에 맞는 세 action이
유지됐고 current route는 색상만이 아니라 `aria-current=page`로 전달됐다. 모든
fresh document에서 `documentElement.scrollWidth <= innerWidth`였으며 horizontal
clipping은 없었다.

Fresh idle delete modal: `/task/task-1`에서 `할 일 삭제`를 열자
`role=alertdialog`, accessible name `할 일 삭제`, visible `할 일 ID` label과
`#delete-task-id` association, 빈 값의 native-disabled `삭제 확인`이 확인됐다.
`wrong`은 disabled를 유지하고 exact `task-1`만 enabled로 바뀌었으며 submit하지
않았다. Mobile dialog는 left/right `16/374`, `358x326`으로 390x844 viewport 안에
있었고 document width도 390이었다. Idle enabled focusables는 input과 `취소`였으며
`취소`에서 Tab은 input으로, input에서 Shift+Tab은 `취소`로 wrap되고 두 경우 모두
dialog containment가 true였다. Exact 입력 상태에서 Escape가 modal을 닫고 focus를
trigger `할 일 삭제`로 복구했다. Desktop dialog도 `512x282`로 1280x720 안에 있었다.

Historical reuse boundary: 사람이 승인한 unchanged
`docs/quality/evidence/task-discovery.md#task-list-virtual-ux-01`은 desktop
`clientHeight=500`, `scrollHeight=3840`, `scrollTop=3340`, 6/40 mounted와 mobile
`clientHeight=560`, 6/40 mounted, `3280→2780→3280` gesture scroll을 입증한다.
이전 문구는 이를 keyboard focus continuity까지 입증한 것처럼 과대 기술했으므로
철회한다. 최초 sweep은 기본 3-record fixture만 사용했고 fresh 40-record keyboard
실행이 아니었다. Pending 중
입력/취소/Escape/outside-click lock과 focus 보존은 unchanged reviewed
`docs/quality/evidence/task-resolution.md#task-delete-outcome-view-01`을 재사용했으며,
이번 browser modal은 idle 상태만 fresh 검증했다.

Console/Network: anonymous sign-in bootstrap의 contract `POST /api/refresh 401`만
예상 console error였고, auth fixture 설치 뒤 dashboard/task/detail/user는 MSW 200
log였다. `agent-browser errors --json`은 `[]`. Service Worker가 처리한 API는
`network requests --filter api --json`에 `[]`로 나타나는 기존 `TOOLING` 한계가 있어
request-count 증거로 사용하지 않았고 mapped Playwright가 cross-boundary 요청을
입증한다. Console inspection 과정의 auth response body나 token은 evidence에
보존하지 않았다.

Screenshot/Trace: `/tmp/kbhc-qa-responsive-a11y-01-{sign-in,dashboard,task,detail,user}-desktop.png`
각 1280x720, 대응 `-mobile.png` 각 390x844;
`/tmp/kbhc-qa-responsive-a11y-01-delete-modal-mobile.png` 390x844. `sips`가 11개
파일의 dimensions를 확인했다. Passing Playwright는 failure trace를 만들지 않았다.

Failure class/correction: `TEST/TOOLING` — desktop task keyboard probe가 이전 focus를
상속해 task-3 Card Enter에는 성공했지만 task-1 wait와 불일치하여 acceptance에서
제외했고, 첫 desktop modal fill은 fresh snapshot의 `@e1` 대신 stale `@e6`을 사용해 실행되지 않았다. 제품
실패로 간주하지 않고 fresh direct `/task/task-1` snapshot과 mobile navigation-to-
Card keyboard sequence, stable `#delete-task-id` selector로 전체 acceptance를 다시
측정했다. `agent-browser errors`에는 page error가 없었고 제품 수정은 필요 없었다.

Reviewer correction — exact-enabled modal PASS: fresh mobile rerun에서 modal open 직후
active element는 `취소` Button이고 `alertdialog.contains(activeElement)=true`였다.
Empty와 `wrong`에서 submit은 disabled, exact `task-1`에서 enabled였고 enabled
focusables는 input, `취소`, `삭제 확인` 세 개였다. Last `삭제 확인`에서 실제 Tab은
first `#delete-task-id`로, first input에서 실제 Shift+Tab은 last submit으로 wrap됐고
두 결과 모두 containment true였다. Escape는 modal을 닫고 trigger `할 일 삭제`로
focus를 복구했다. Dialog는 `358x326`, document/viewport 390x844였다. Screenshot:
`/tmp/kbhc-qa-responsive-a11y-01-correction-modal-mobile.png` (390x844).

Reviewer correction — fresh 40-record keyboard diagnosis: approved auth와 40개의
schema-conforming task를 session storage에 app bootstrap 전에 seed하고 mobile
390x844 `/task`를 열었다. Initial named region은 `clientHeight=544`,
`scrollHeight=768`, 6 mounted rows였고 첫 Card가 2px outline focus를 가졌다. 실제
PageDown은 nested region `scrollTop 0→224`, rows 01~06→03~08로 이동했지만 focused
Card가 virtual DOM에서 제거되자 `activeElement=BODY`가 됐다. 실제 End 반복은
terminal `scrollTop=3280`, `clientHeight=560`, `scrollHeight=3840`, mounted 6/40,
rows 35~40과 `모든 할 일을 불러왔습니다.`에 도달했다. Terminal task-40은 Tab으로
도달해 2px outline을 보였고, 그 다음 Tab은 `BODY`, 다음 Tab은 `대시보드`로
빠져나가므로 keyboard trap은 아니었다. 그러나 top task-1 focus에서 실제 End로
row가 unmount될 때도 focus가 `BODY`로 재현되어 탐색 연속성은 손실됐다.
Screenshot: `/tmp/kbhc-qa-responsive-a11y-01-correction-virtual-mobile.png` (390x844).
Console은 refresh/task 200만, `agent-browser errors --json`은 `[]`; Service Worker
network monitor `[]`는 기존 `TOOLING` 한계다.

Finding/root cause: `UX_ACCESSIBILITY` —
`src/widgets/task-list/index.tsx`는 `overscan: 0`인 `virtualItems`만 render하고,
`section[aria-label="할 일 목록"]`은 `tabIndex=-1`이며 stable focus target이나 range
변경 시 focus 이관이 없다. 따라서 PageDown/End가 focused `TaskCard` Link를 viewport
밖으로 보내 unmount하면 browser가 focus를 `BODY`로 되돌린다.

Correction options requiring a HIGH human decision:

1. Recommended: named scroll section에 `tabIndex=0`과 visible focus style을 주어
   PageDown/End의 stable keyboard scroll target으로 만들고, Tab으로 visible Card에
   진입한다. 가장 작은 변경이나 tab order에 focus stop 하나를 추가한다.
2. Focused row를 virtual range에 보존하거나 range change 때 가장 가까운 mounted
   Card로 focus를 이관한다. 기존 tab order는 유지하지만 state/effect와 edge case가
   늘어난다.

Rerun verdict: BLOCKED — modal Important finding은 해소됐으나 virtual-list keyboard
focus continuity finding이 unresolved다. Workflow상 behavior-changing correction은
HIGH 사람 결정 전 구현할 수 없다. Named browser session과 Vite server를 종료했고
port 4173이 닫힌 것을 확인했다.
