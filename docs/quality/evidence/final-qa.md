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
