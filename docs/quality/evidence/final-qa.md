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

## QA-HARNESS-01 Latest Full Gate — 2026-09-02

Requirement/Journey: `QA-HARNESS-01`, `SYS-05`, all four core Golden Journeys

Claim target: `df157e6fae0f4aa1c8426589ebc81a5913ba74f6`; correction target:
`468619abc2d9d3c6e370fbc6ec86da9b45d146b4`. The previously reviewed harness behavior
at `9cabebf343fed5ab1c82f7432ce1134e4d1ac157` remains unchanged.

Initial result: the latest canonical `./scripts/verify full` passed its outer Vitest
38 files/167 tests, production build, and fresh-server core Chromium 5/5, then failed
inside verifier regression. `test_quick_runs_frontend_after_scaffolding` invoked its
required nested quick, where the single dialog case `requires byte-exact input and locks
every dismiss path during one pending attempt` exceeded the fixed five-second Vitest
limit. This reproduced the prior QA-02 LOW under canonical nested load, so it was promoted
to a blocking `TEST` finding rather than hidden with a timeout increase.

Root cause and correction: the case serialized a pure controlled-input value matrix and
the pending request/dismiss/focus lifecycle through repeated asynchronous `userEvent`
operations. The correction splits those two independently testable behaviors and uses
synchronous `fireEvent.change` only for controlled value assignment. Real open, submit,
duplicate-submit, Escape, cancel, focus restoration, and reopen interactions still use
`userEvent`; all assertions remain. No product, verifier, Playwright/Vitest config,
dependency, or timeout changed.

Verification:

- `python3 -m unittest tests/test_verify_contract.py -v` — PASS, 19/19.
- `pnpm vitest run src/test/harness-config.test.ts` — PASS, 6/6.
- Focused `delete-task-dialog.test.tsx` five consecutive runs — PASS, each 5/5.
- Full `pnpm run test` two consecutive runs — PASS, each 38 files/168 tests.
- Corrected `./scripts/verify full` — PASS: hook 86, verifier contract 19, format,
  lint, generated API check, typecheck, outer Vitest 38/168, production build, fresh
  Chromium core Journeys 5/5, and verifier regression 19/19 including the formerly
  failing nested quick.
- `git diff --check` and clean worktree — PASS. Verification remained read-only.

Console/Network: all five core tests passed against the verifier-owned fresh Vite server.
No Node 25 MSW web-storage warning appeared. The only emitted warning was the existing
non-failing Vite chunk-size advisory; no product console/network failure was reported.

Verdict: corrected gate PASS; `QA-HARNESS-01` remains `IN_PROGRESS` until an independent
review validates this exact correction and evidence target. No `HUMAN_APPROVED`, AI
record publication, or final acceptance is claimed.

### Independent review — first target

Review target: `8ff7bbd268b72b2af392b706f447c37c91ebd87a`.

Reviewer: `/root/qa_harness_latest_reviewer`, a fresh read-only reviewer that authored
neither the correction nor its evidence.

Checks: inspected the baseline/start/correction/evidence range and harness contracts;
ran focused dialog, verifier contract, harness config, setup, diff/status, and the full
verifier regression suite.

Findings: **MEDIUM / `TEST`** — verifier regression was 18/19 FAIL. Its nested quick
timed out in `shadcn-primitives.test.tsx` instead of the corrected delete dialog: the
full Vitest result was 37/38 files and 167/168 tests, while that file alone passed 1/1
in 430ms. The dialog split retains its assertions and interaction semantics, but it
does not resolve the suite-level five-second timeout reliability problem.

Corrections: N/A in this read-only review. Product, config, timeout, and dependencies
were unchanged at the reviewed target.

Rerun: dialog 5/5, verifier contract 19/19, harness config 6/6, setup hook 86 plus
contract 19, diff check and clean status PASS; `python3 -m unittest tests/test_verify.py
-v` FAIL as above.

Verdict: **FAIL** — bound Vitest suite concurrency and rerun the corrected canonical
full gate before completing `QA-HARNESS-01`.

### Suite-level correction

Correction target: `2853ff72f825d7ba987b716dc0e5b7594acb3530`.

The moving timeout and independently fast focused cases localized the root cause to
full-suite fork contention on the eight-CPU verification host, not another individual
test. A new harness-config assertion first failed because `maxWorkers` was `undefined`.
The correction adds only `maxWorkers: 4` to the existing Vitest test config. It preserves
the five-second per-test limit and existing fork pool, product code, dependencies, and
all test assertions; the central config covers direct test, quick, and nested quick.
The rejected single-worker diagnostic passed but took 130.39 seconds; four workers
passed 38/168 in 42.07 seconds before the contract was added, avoiding full serialization.

Corrected verification:

- Harness-config RED: new `maxWorkers === 4` assertion failed with `undefined`; GREEN
  after the one-line config change: 7/7.
- `pnpm run test` twice consecutively — PASS, each 38 files/169 tests in 9.44s and
  10.05s.
- `python3 -m unittest
  tests.test_verify.VerifyCliTests.test_quick_runs_frontend_after_scaffolding -v` twice
  consecutively — PASS in 22.50s and 20.20s.
- Corrected canonical `./scripts/verify full` — PASS: hook 86, verifier contract 19,
  format, lint, generated API check, typecheck, outer Vitest 38/169, production build,
  fresh Chromium core Journeys 5/5, and verifier regression 19/19.
- No MSW web-storage warning; only the existing non-failing Vite chunk-size advisory.
  `git diff --check` and clean tracked status PASS; all verification remained read-only.

The task remains `IN_PROGRESS` until independent corrected-target re-review. No
`HUMAN_APPROVED`, AI record publication, or final acceptance is claimed.

### Independent corrected-target review

Review target: `fe3da84da54603b853fa7ea17f3f4d3f5223e59f`.

Reviewer: `/root/qa_harness_latest_reviewer`, a fresh read-only reviewer that authored
neither the correction nor its evidence.

Checks: inspected exact `673db8f..fe3da84` diff and QA records, the `maxWorkers: 4`
RED/GREEN contract, retained dialog assertions/interactions, every QA-HARNESS acceptance
condition, and product/config/dependency boundaries.

Findings: none at HIGH, MEDIUM, or LOW. Timeout, pool, product code, dependencies, and
accepted behavior are unchanged.

Corrections: the prior MEDIUM `TEST` finding is resolved by the central Vitest worker
cap. The implementation is one config line plus one contract test.

Rerun: full unit 38 files/169 tests PASS in 14.22s; nested quick target 1/1 PASS in
21.495s; harness config 7/7, dialog 5/5, setup hook 86 plus contract 19, diff check, and
clean status PASS.

Verdict: **PASS** — `QA-HARNESS-01` transitions to `[x]` / `AI_VERIFIED`. This does not
claim `HUMAN_APPROVED`, AI record publication, or final acceptance.

## QA-03 Submission and AI Disclosure Audit — 2026-09-02

Requirement: `SYS-05`; task: `QA-03`.

Targets: README correction `9f2bc9f522cf1987b8054eb1b9cb30b09deba462`;
legacy disclosure correction `a2d83d6b74fabe56760367ed0948f4aca351678d`; audit target is
the latter commit.

Automatic result:

- README now states the package-declared Node range and pnpm 10.15.1, frozen install,
  development and production-preview commands, submitted MSW behavior, local test
  account, three canonical verify modes, and Chromium bootstrap.
- `AI_USAGE.md` contains every assignment-required section and the actual Codex/model,
  scope, prompt summary, human-verification checklist, publication policy, and records.
- The 17 managed public artifacts each contain `human-reviewed` status, reviewer, and
  reviewed digest metadata. Their filenames exactly match all 17 links in both
  `artifacts/index.md` and the managed `AI_USAGE.md` region.
- Ignored `.codex/review-pending` contains zero files. The branch has no generated API,
  lockfile, or `public/mockServiceWorker.js` diff; no tracked runtime report/log/temp
  artifact; and no product `console.log`, `console.debug`, `console.trace`, or `debugger`.
  The `main...HEAD` files are limited to task-resolution and final-QA implementation,
  tests, plans, evidence, config, and submission documentation.
- `pnpm run format:check`, `./scripts/verify setup` (hook 86, verifier contract 19), and
  `git diff --check` PASS.

Human blocker: two tracked pre-policy artifacts have no current review receipt and retain
the `Human review required before submission` banner:

- `artifacts/codex-session-01a04c3e-0a24-7e30-a767-64f1e2c4f3ae.md`
- `artifacts/codex-session-01a04c77-2685-7013-ad38-d81feba1b2a4.md`

Both are explicitly labeled `legacy/pre-policy`, excluded from the public managed index,
and listed as awaiting human review. The current scanner reports
`unredacted_secret` BLOCKING on each, so neither may be treated as reviewed from an old
commit title. A person must inspect the underlying context and either approve a safe
submission treatment or exclude the artifact. The four `AI_USAGE.md` human-verification
checkboxes also remain intentionally unchecked. AI did not select, publish, delete, or
approve any record.

Verdict: **BLOCKED** at the human disclosure checkpoint. All automatic submission checks
currently pass; `QA-03`, `SYS-05`, and dependent `QA-04` remain incomplete.

Human decision and correction: on 2026-09-02 the user explicitly selected option 1,
excluding both legacy records from the submission. Commit
`7b44edb5fc40ea2cd6516ea35272d3a040154c6e` removes only the two recoverable tracked
files, their disclosure links, and the obsolete test assertions that required legacy
preservation. Initial setup RED failed exactly those two assertions. Focused
`ProjectWiringTests` then passed 6/6; `./scripts/verify quick` passed hook 85, verifier
contract 19, and Vitest 38 files/169 tests; committed-state setup, diff check, and clean
status passed.

Post-correction audit: the submission contains exactly 17 session artifacts, all 17 are
managed `.s0001` records with human-reviewed status, reviewer, and digest metadata, and
the same 17 filenames appear in both public indexes. There is no non-managed/legacy
artifact, legacy disclosure marker, pending file, generated/lockfile diff, tracked
runtime noise, or product debug statement. The removed files remain recoverable from Git
history.

Updated verdict: **BLOCKED only on human checklist confirmation** — the four
`AI_USAGE.md` human-verification boxes remain unchecked until the user explicitly
confirms them. AI did not infer or record that confirmation.

Human checklist decision: on 2026-09-02 the user explicitly selected option 1 and
confirmed all four checks: secret/sensitive-information removal, prompt/result accuracy,
test/application behavior, and tool/model/scope accuracy. Commit
`9b051e558a7e696721d03eb578dc3fd8d011518f` records those four checked boxes. The prior
wiring assertion first failed because it required at least one unchecked box; it now
requires exactly four checkbox entries while leaving approval provenance to the person.
Focused RED was one failure; focused GREEN was 1/1. `./scripts/verify quick` passed hook
85, verifier contract 19, and Vitest 38 files/169 tests; diff check and clean status
passed.

Current verdict: all QA-03 acceptance conditions are satisfied pending independent
submission review of the exact target. The task returns to `IN_PROGRESS`; no final
acceptance is claimed.

## Human-owned remainder

`SYS-05` remains `IN_PROGRESS` pending QA-03 independent review: `AI_USAGE.md` contains
the required sections, all 17 submitted records have human-review receipts, and the user
explicitly confirmed all four human-verification checkboxes. No AI record was reviewed
or published by the agent. Final acceptance remains a separate human action after the
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

Human HIGH decision: 2026-09-02 사용자가 exact decision target
`f7d6f0949d6f4414f581effe22b7b32b34a38718`에서 option 1을 `1로 진행`으로
명시 승인했다. Named scroll region을 visible-focus `tabIndex=0` keyboard target으로
만들고 descendant Card의 PageDown/End를 region focus로 synchronously handoff하는
최소 correction 범위로 작업을 재개한다. 이 결정은 기존 blocker diagnosis를
지우지 않으며 correction 검증 전 상태는 `IN_PROGRESS`다.

Approved option 1 correction — PASS: TDD RED는 production 변경 전에
`pnpm vitest run src/widgets/task-list/task-list.test.tsx`로 관찰했다. 7개 case 중
기존 5개는 통과했고 PageDown/End 두 case는 line 67에서 named region focus를
기대했으나 실패했다. 최소 구현은 named section의 `tabIndex=0`, 기존 UI와 같은
2px `focus-visible` ring, descendant Card의 PageDown/End에서 section으로 동기 focus
handoff뿐이며 명시적 scroll, helper, 가짜 role은 추가하지 않았다. Exact product
SHA는 `2099c745b0076f09f1eb42f2bcafb573415d26fc`다.

Fresh GREEN/automatic verification은 task-list 1 file/7 tests, exact focused 7
files/32 tests, quick hook 86·verifier contract 19·Vitest 38 files/152 tests,
mapped `e2e/task-discovery.spec.ts` Chromium 1/1이었다. Fresh named
`qa-responsive-a11y-fix-01` session은 exact product SHA의 Vite와 app bootstrap 전
approved auth/40 schema-conforming task fixture를 사용했다.

- Mobile 390x844: 실제 Tab 네 번으로 region에 도달해 2px ring을 보였고 다음
  Tab은 first Card의 2px outline이었다. Card PageDown은 native scrollTop `0→224`,
  focus는 region/non-BODY, mounted 6이었다. Fresh top Card End handoff 뒤 실제 End
  반복은 terminal `scrollTop=3280`, `clientHeight=560`, `scrollHeight=3840`,
  rows 35~40과 mounted 6/40에 도달하면서 region focus를 유지했다. 다음 Tab은
  viewport 안 task-35 Card와 2px outline을 보였다.
- Desktop 1280x720: 같은 Tab 순서와 2px region/Card focus를 확인했다. Card
  PageDown은 `0→284`, focus region/non-BODY, mounted 6이었다. Fresh top End는
  terminal `scrollTop=3340`, `clientHeight=500`, `scrollHeight=3840`, rows 35~40,
  mounted 6/40에서 focus를 유지했고 다음 Tab은 visible task-35 Card였다.

두 viewport의 document/viewport width는 각각 `390/390`, `1280/1280`이었고
horizontal overflow는 없었다. `agent-browser errors --json`은 `[]`, console의
error message는 0개였으며 관찰된 58개 API group은 모두 200이었다. Dev Vite
forwarder는 반복적인 virtual row resize 중 Chromium의 `ResizeObserver loop
completed with undelivered notifications` 두 건을 server log로 전달했지만 browser
page-error/console-error, overlay, UI 실패는 없었고 production mapped E2E도
통과하여 `TOOLING` notification으로 분류했다. Screenshot은
`/tmp/kbhc-qa-responsive-a11y-01-focus-fix-mobile.png` (390x844),
`/tmp/kbhc-qa-responsive-a11y-01-focus-fix-desktop.png` (1280x720)이며 `sips`로
dimensions를 확인했다. Named session과 server를 닫고 port 4173도 닫았다.

Correction verdict: PASS — 사람 승인 범위 그대로 native keyboard scroll을
유지하면서 virtual Card unmount 이후 focus가 BODY로 손실되는 finding을 해소했다.
QA-RESPONSIVE-A11Y-01은 `AI_VERIFIED`이며 사람이 승인하지 않은
`HUMAN_APPROVED` 상태는 기록하지 않는다.

## QA-CONTRACT-01 OpenAPI·MSW·client 최종 대조 — 2026-09-02

Requirement: `QA-CONTRACT-01`, `SYS-04`와 모든 API requirement

Target: reviewed start `6e57f9a64c4e277de3b813b2b75413b9d93fb753`; task claim
`b5d9102d62533d03c0f42534adf7386658500d4f`

Automatic verification:

- `pnpm api:types:check` — PASS; `assignment-original/openapi.yaml`에서 generated
  `src/generated/openapi.ts`를 재생성할 diff가 없음.
- `pnpm vitest run src/shared/api/openapi-contract.test.ts src/shared/api/auth.test.ts
  src/shared/api/dashboard.test.ts src/shared/api/user.test.ts
  src/shared/api/tasks.test.ts src/mocks/handlers/tasks.test.ts
  src/mocks/handlers/user.test.ts` — PASS, 7 files/25 tests.
- `./scripts/verify quick` — PASS; hook 86, verifier contract 19, format, lint,
  generated API check, TypeScript, 38 Vitest files/152 tests.

Conforming happy-path invariant: 일곱 operation의 documented method/path/query,
bearer 또는 HttpOnly refresh-cookie 경계, success/non-2xx status와 필수 field는
generated type·shared API·MSW·기존 네 Journey network record에서 일치했다.
문서화된 key만 사용하는 현재 happy path는 두 correction option 모두에서
변하지 않는다. Invalid `GET /api/task` page는 승인된 fail-closed transport
error를 유지하며 OAS에 없는 400을 게시하지 않는다.

HIGH blocker: OAS의 response-side object schema 여덟 개
(`AuthTokenResponse`, `UserResponse`, `DashboardResponse`, `TaskItem`,
`TaskListResponse`, `TaskDetailResponse`, `DeleteTaskResponse`, `ErrorResponse`)와
request-side `SignInRequest`는 모두 `additionalProperties: false`다. 현재 runtime은
일곱 operation success response, `TaskListResponse`의 nested `TaskItem`, 공통
`ErrorResponse`와 sign-in request의 추가 key를 거부하지 않는다.
이 차이의 실제 runtime 영향은 다음 네 건이다.

1. `src/shared/api/auth.ts`의 `isAuthTokenPair`가 추가 key를 포함한 token
   response를 success로 반환해 sign-in 또는 refresh 결과가 auth state를 성립시킨다.
2. `src/shared/api/request.ts`의 `isErrorResponse`가 추가 key를 포함한 401/error를
   `invalid-response`가 아닌 HTTP error로 반환해 auth refresh/replay/terminal 경로에
   진입시킨다. 이 guard는 sign-in 400, refresh 400/401, user 401,
   dashboard 401, task list 401, task detail 401/404, task delete 401/404의 10개
   non-2xx 분기에 공통 적용된다.
3. `src/shared/api/tasks.ts`의 `isDeleteTaskResult`가 추가 key를 포함한
   `{ success: true }`를 성공으로 수용해 destructive success navigation과
   list/detail/dashboard cache transition을 시작한다.
4. `src/mocks/handlers/auth.ts`가 승인된 email/password와 추가 key를 함께
   보낸 sign-in request에 200/token pair/cookie를 반환해 session을 생성한다.

나머지 user, dashboard, task list/detail success guard와 nested `TaskItem` guard도
문서화된 필수 field만 검사해 추가 key를 수용한다. 현재 consumer가 그
key를 UI에 사용하지는 않지만 exact OAS schema와는 다르다.

Root cause/test gap: generated type 재생성과 현재 25개 contract test는 exact
happy-path 필수 field, method/path/status를 주로 증명하고 unknown-key negative
boundary를 실행하지 않는다. 그러므로 green 결과는 위 차이를 검출하지
못하며 exact-schema acceptance의 완료 근거가 아니다.

Decision options:

1. Recommended — request, success response, nested `TaskItem`, common error response에서
   exact object key를 runtime으로 거부하고 각 경계의 최소 negative contract
   test를 추가한다.
2. Forward-compatible — 추가 key 수용을 의도한 OAS 예외로 명시하고
   최종 contract acceptance에서 사람이 승인한다.

사람 결정 질문: **OAS `additionalProperties: false`를 runtime에서
강제할까요?** 응답은 `1`(strict 강제, 권장) 또는
`2`(forward-compatible OAS 예외) 중 하나로 기록한다.

Verdict: BLOCKED — 두 option 모두 계약 behavior를 확정하므로 HIGH 사람
결정이 필요하다. 결정 전 product/test는 변경하지 않았고
`QA-CONTRACT-01`의 checklist는 미완료로 유지한다.

Human HIGH decision: 2026-09-02 사용자가 exact decision target
`3a9bb04bbbe04aec55ba616627c93e3c63020df6`의 option `1`을 명시 승인했다.
Request, success response, nested `TaskItem`, common error response의 exact key를
runtime에서 거부하고 negative contract test로 증명하는 권장 교정으로
재개했다.

Strict correction TDD RED: production 변경 전 approval record
`efdcd722e41e792767ee2ce728883b65208c4a2b`에서 `Object.keys`,
`Object.hasOwn`, exact/unknown/additional-property helper를 `src`에서 다시 검색했으나
재사용할 공통 helper는 없었다. 먼저 다음 focused command에 아홉 negative
case를 추가했다.

```bash
pnpm vitest run src/shared/api/auth.test.ts \
  src/shared/api/dashboard.test.ts src/shared/api/user.test.ts \
  src/shared/api/tasks.test.ts src/shared/api/request.test.ts
```

RED 결과는 5 files/25 tests 중 9 failed/16 passed였다. `SignInRequest`는
400 기대에 200을 반환했고, success schema 일곱 경계의
`AuthTokenResponse`, `UserResponse`, `DashboardResponse`, `TaskListResponse`
top-level/nested `TaskItem`, `TaskDetailResponse`, `DeleteTaskResponse`는 각각
reject 기대에 resolve했다. 추가 key 401 `ErrorResponse`는 `invalid-response`
기대에 HTTP error로 분류됐다. 모두 타이포·fixture error가 아닌 승인된
strict behavior의 부재로 인한 예상된 failure였다.

Minimal implementation: exact product target은
`fcffc7abd9a05e7e7c45de0ba879ffdfc3c087a9`다. 새 dependency/schema
framework는 추가하지 않았다. `src/shared/api/request.ts`의 하나의
`hasExactKeys`가 JSON object만 받고 null/array를 거부한 뒤 `Object.keys`의
수와 `Object.hasOwn`으로 정확한 key set을 검증한다. Auth/dashboard/user/task
success guard, nested `TaskItem`, common `ErrorResponse` guard가 이 helper를 공유한다.
`src/mocks/handlers/auth.ts`는 layer dependency를 추가하지 않고 sign-in JSON object의
`email`, `password` 두 own key만 허용한다. 기존 happy-path 값, error status,
auth refresh/terminal과 delete navigation/cache semantics는 변경하지 않았다.

Fresh GREEN verification on `fcffc7abd9a05e7e7c45de0ba879ffdfc3c087a9`:

- 위 focused 5-file command — PASS, 25/25.
- `pnpm api:types:check` — PASS, generated diff 없음.
- TODO의 exact 7-file contract suite — PASS, 7 files/33 tests.
- `./scripts/verify quick` — PASS; hook 86, verifier 19, format, lint,
  typecheck, 38 Vitest files/161 tests.
- `pnpm exec playwright test e2e/auth-entry.spec.ts e2e/task-resolution.spec.ts
  --project=chromium` — PASS, 3/3.

Browser applicability: 교정은 OAS가 금지한 추가 JSON key를 trust boundary에서
거부하는 behavior에만 한정된다. 기존 named Journey browser evidence의
request/response는 모두 schema-conforming이고, fresh mapped auth-entry/task-resolution Chromium이
그 happy path와 auth/delete 전환을 다시 실행했다. 따라서 이 integration-only
negative boundary에 대한 fresh named browser run은 추가하지 않았으며 추가했다고
주장하지 않는다. Playwright는 기존 `NO_COLOR`/chunk-size non-failing warning을
출력했지만 test failure는 없었다.

Correction verdict: PASS — 아홉 schema boundary와 10 non-2xx branch가 strict
`additionalProperties: false` behavior를 공유하고, conforming happy path는 유지됐다.
`QA-CONTRACT-01`은 `AI_VERIFIED`이며 최종 승인은 사람 책임으로 남긴다.

Approval review follow-up: review target
`d9b563f20678c47fb62bf32953dae9048a421b40`의 verdict는 `PASS_WITH_LOW`였다.
유효한 Minor는 `src/shared/api/tasks.test.ts`의 task-detail extra-property case가
`registerDatetime: "now"`를 사용해, 추가 key 외에 OAS `date-time` field도 동시에
무효한 fixture였다는 점이다. Correction/test target
`a1fa0a4a682720acb49a0a232b314d8a35fc48f5`에서 이미 사용 중인
`2026-08-30T09:00:00.000Z`로 교체해 추가 `id` key만 reject 원인으로
격리했다. Tracked evidence/claim target은
`15c83206313617d87bdf7552667830c09a6bb6f0`이며 product code는 변경하지
않았다.

Fresh correction verification:

- `pnpm vitest run src/shared/api/tasks.test.ts` — PASS, 7/7.
- `pnpm vitest run src/shared/api/auth.test.ts src/shared/api/dashboard.test.ts
  src/shared/api/user.test.ts src/shared/api/tasks.test.ts
  src/shared/api/request.test.ts` — PASS, 5 files/25 tests.
- `pnpm run format:check`, `git diff --check` — PASS.

Follow-up verdict: PASS — Minor를 교정했고 strict exact-key behavior와
`QA-CONTRACT-01` `AI_VERIFIED` 상태는 유지된다.

## QA-01 requirement evidence와 상태 정합성 — 2026-09-02

Requirement: `QA-01`; `docs/quality/requirements.md`의 27개 requirement row 전체.

Target: claim base `0bd4fc347ef4059c503d01cf200da4a20b254307`; claim 및 exact
read-only audit target `e990930586c286092b31948312385808733a4429`. Product, test,
E2E, dependency와 requirement acceptance text는 변경하지 않았다.

Audit method: temporary file이나 repository helper를 만들지 않고 `python3 - <<'PY'`
형태의 read-only Python standard-library parser로 `## Requirement Checklist` 표를
분리해 열 수, ID, status, automatic/browser evidence를 assertion했다. Backtick path는
`git ls-files --error-unmatch`로 존재·tracked 여부를 확인하고, Markdown evidence는
heading과 직접 ID 또는 같은 prefix의 range coverage를 검사했다. 이어 모든 ID를
`rg -l --fixed-strings <ID> TODO.md src e2e`로 역추적하고, 네 Journey TODO block의
checkbox/status/person-approval 문구와 `git blame --porcelain` provenance를 대조했다.

Audit result:

- Requirement ID 27/27, unique 27/27, 표 열 수 일치, 허용 status 27/27 PASS.
- Status는 `AI_VERIFIED` 26개와 `IN_PROGRESS` 1개이며 requirement row에
  `HUMAN_APPROVED`는 0개다.
- Automatic evidence는 27/27 nonempty다. Browser evidence는 tracked path 26/27,
  적용되지 않는 `SYS-01`의 명시적 `—` 1/27이다.
- Automated/browser cell의 path reference 30/30이 존재하고 tracked되며, 고유 경로는
  9개다. Browser Markdown의 heading 및 직접 ID/range coverage는 26/26 PASS다.
- 27개 ID 모두 `TODO.md`, `src`, `e2e` 범위에서 하나 이상 역추적됐다. Stale path,
  중복 ID, 빈 evidence, 허용되지 않은 status는 없어서
  `docs/quality/requirements.md` 교정은 필요하지 않았다.

27-row matrix summary:

| Checkpoint | Rows | Requirement status | Browser evidence | Checkpoint owner state |
| --- | ---: | --- | --- | --- |
| final | 4 | `AI_VERIFIED` 3, `IN_PROGRESS` 1 | tracked path 3, `—` 1 | final human/publication gates remain |
| auth-entry | 8 | `AI_VERIFIED` 8 | tracked path 8 | `JOURNEY-AUTH-01` `HUMAN_APPROVED` |
| work-overview | 5 | `AI_VERIFIED` 5 | tracked path 5 | `JOURNEY-WORK-01` `HUMAN_APPROVED` |
| task-discovery | 5 | `AI_VERIFIED` 5 | tracked path 5 | `JOURNEY-TASK-LIST-01` `HUMAN_APPROVED` |
| task-resolution | 5 | `AI_VERIFIED` 5 | tracked path 5 | `JOURNEY-TASK-DETAIL-01` `HUMAN_APPROVED` |
| Total | 27 | `AI_VERIFIED` 26, `IN_PROGRESS` 1 | tracked path 26, `—` 1 | four Journey approvals present |

Checkpoint provenance: the four tracked `HUMAN_APPROVED` status lines blame to commits
`edc8142215a9662fe89db3b45453050ab800f4ab`,
`5b5d60c093099218387ac0f2b6fffb02189c9f13`,
`2c0591b6c2779a371e9f886729a24d05c733c2a3`, and
`48300e534516d702a351980e5661b3851ce02a38`, all authored by `synuns`; each TODO block
contains explicit person review/approval provenance. The requirement table correctly
keeps all 23 Journey-mapped rows at `AI_VERIFIED` rather than copying the human-owned
checkpoint status.

Dependency evidence: `QA-RESPONSIVE-A11Y-01` is `AI_VERIFIED` after its approved
keyboard-focus correction and responsive rerun. `QA-CONTRACT-01` is `AI_VERIFIED`; the
strict exact-key correction target is
`fcffc7abd9a05e7e7c45de0ba879ffdfc3c087a9`, the fixture-only follow-up target is
`a1fa0a4a682720acb49a0a232b314d8a35fc48f5`, and tracked evidence/claim target is
`15c83206313617d87bdf7552667830c09a6bb6f0`.

Final-owned remainder: `SYS-01`, `SYS-02`, and `SYS-04` have sufficient automatic and
browser/equivalent evidence for `AI_VERIFIED`. `SYS-05` remains `IN_PROGRESS` because
human verification, AI record publication, and final acceptance are still pending.
`QA-02`, `QA-HARNESS-01`, `QA-03`, and `QA-04` remain separate final-QA ownership; this
audit neither publishes `AI_USAGE` records nor records `HUMAN_APPROVED` or final
acceptance.

Verification: the claim transition passed `git diff --check` and
`./scripts/verify setup` (hook 86, verifier contract 19). Completion rerun is recorded
with the QA-01 evidence commit.

Verdict: PASS — all 27 requirement rows have consistent status and reproducible
automatic/browser evidence references. `QA-01` is `AI_VERIFIED`; no final human-owned
gate is overclaimed.

### QA-01 independent review follow-up

Review target: `5e07e8c8c222924636479ca79ce690b2cf25bc9b`; exact review range
`e990930586c286092b31948312385808733a4429..5e07e8c8c222924636479ca79ce690b2cf25bc9b`.

Reviewer: `/root/final_branch_reviewer`.

Relationship: fresh independent reviewer who was not the final author of the QA-01
claim, audit, TODO completion, or evidence record.

Checks: re-ran the 27/27 requirement parser and verified unique IDs, allowed statuses,
nonempty automatic evidence, browser path or explicit `—`, 30/30 tracked path
references, Markdown headings, direct ID/range coverage, and all-ID trace across
`TODO.md`, `src`, and `e2e`. Rechecked the four Journey approval lines with
`git blame` and explicit person-approval provenance; verified all six dependencies
(`JOURNEY-AUTH-01`, `JOURNEY-WORK-01`, `JOURNEY-TASK-LIST-01`,
`JOURNEY-TASK-DETAIL-01`, `QA-RESPONSIVE-A11Y-01`, `QA-CONTRACT-01`), the intentional
`SYS-05` `IN_PROGRESS` remainder, `./scripts/verify setup` hook 86/verifier 19,
`git diff --check`, and clean worktree state.

Findings: none.

Corrections: N/A; `docs/quality/requirements.md`, product, tests, E2E, human approval,
and final-owned status remain unchanged.

Rerun: read-only 27/27 audit PASS; `./scripts/verify setup` PASS (hook 86, verifier
contract 19); `git diff --check` and `git status --short` PASS.

Verdict: PASS — QA-01 evidence and status are independently approved with no unresolved
finding. This is an AI verification review, not `HUMAN_APPROVED` or final acceptance.

## QA-02 journey 간 full adversarial review — 2026-09-02

Review target: `assignment-original/requirement.md`, authoritative
`assignment-original/openapi.yaml`, 27 requirement rows, the four Golden Journey
specifications/plans/evidence records, source/unit/integration/E2E, cross-QA and strict
contract changes at exact source target
`6c097ad52018fc7f89e9589743cd801cee9387a7`. Review claim commit:
`d55e0516fc9056625a44dfe2af3df094d38ac23c`.

Reviewer: fresh independent `/root/qa_full_adversarial_reviewer`. This reviewer did not
author the reviewed product, tests, Journey evidence, cross-QA corrections, strict
contract correction, or QA-01 record. Its tracked ownership is limited to this QA-02
TODO/review record; no product or test correction was authored.

Checks: read and cross-checked the assignment sources, project plan, coding/stack and
quality policies, approved auth/delete decisions, all requirement rows and Journey
contracts. Traced auth bootstrap/sign-in/refresh/single-flight/replay/terminal/stale
generation/cache transitions, route allowlist and navigation; query roots, pagination,
virtualization and delete reconciliation; all seven OpenAPI operations, exact object
keys, generated types, client guards and shared MSW fixtures; loading/empty/error/success
presentation; heading/landmark/label/modal/focus/responsive behavior; core E2E size,
overlap and retry policy; console/network records; full branch diff, assignment/generated
immutability, secrets/debug/generated noise, TODO dependencies, checkpoint authorship and
evidence provenance. Existing evidence was used only as trace context. The two suspected
gaps below were independently reproduced in a named browser session.

Findings:

1. **MEDIUM — `INTEGRATION`: invalid `registerDatetime` passes the OpenAPI client
   boundary and crashes the detail route.** Authoritative
   `assignment-original/openapi.yaml:279-293` defines
   `TaskDetailResponse.registerDatetime` as `string` with `format: date-time`, but
   `src/shared/api/tasks.ts:35-41` checks only exact keys and `typeof === "string"`.
   `src/pages/task-detail/index.tsx:86-91` then constructs and formats the value without
   an invalid-date guard. A fresh 1280x400 production-preview browser document with an
   authenticated, otherwise schema-shaped detail response containing
   `registerDatetime: "not-a-date"` received `GET /api/task/task-bad-date` 200, emitted
   `RangeError: Invalid time value` plus React Router's caught render error, removed the
   application shell, and showed only `화면을 불러오지 못했습니다`. The existing
   `src/shared/api/tasks.test.ts:23-36` happy case and exact-key negative cases do not
   exercise the format. Impact: a malformed server response bypasses the intended
   `invalid-response`/recoverable detail error boundary and turns one field into a whole
   route failure. Minimal correction: add one invalid date-time response regression at
   the API guard boundary and reject it before the view formats it; retain the current
   valid RFC3339 fixture.
2. **MEDIUM — `UX_ACCESSIBILITY`: reverse virtual-list keyboard scrolling loses focus.**
   `src/widgets/task-list/index.tsx:96-103` hands descendant focus to the stable named
   region only for `PageDown` and `End`; its test matrix at
   `src/widgets/task-list/task-list.test.tsx:42-75` has the same one-way coverage. In a
   fresh 1280x400 authenticated 40-record list, focus on a mounted Card followed by
   `End` correctly moved to the region. After focusing a lower mounted Card, native
   `Home` changed the list to `scrollTop=0` and mounted rows `task-1`/`task-2`; the
   previously focused row unmounted and `document.activeElement` became `BODY` instead
   of the stable `할 일 목록` region. Impact: keyboard users lose their location when
   reversing through the virtualized list and the next Tab restarts at global
   navigation. Minimal correction: extend the existing single handoff branch and its
   parameterized test to reverse scroll keys that can unmount the focused row, beginning
   with `Home`/`PageUp`; verify native scrolling and visible region focus in a growing
   list.

Corrections: none in this review-only task. Both changes affect accepted runtime
behavior, so implementation belongs to a separately approved fixer. No OAS, generated
file, dependency, architecture, authentication policy, deletion semantics, product,
test or E2E file was changed by the reviewer.

Rerun:

- `pnpm api:types:check` — PASS; generated contract unchanged.
- `pnpm vitest run src/shared/api/tasks.test.ts
  src/pages/task-detail/task-detail.test.tsx src/widgets/task-list/task-list.test.tsx` —
  PASS, 3 files/19 tests. This confirms the current focused suite does not detect either
  reproduced gap.
- `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format, lint,
  generated API check, typecheck, Vitest 38 files/161 tests.
- `pnpm exec playwright test e2e/auth-entry.spec.ts e2e/work-overview.spec.ts
  e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts` — PASS, Chromium 5/5 with a
  fresh server. The representative success/error cases remain green but do not cover
  malformed date-time or reverse virtual focus.
- Named `qa02-review` production-preview session — expected happy-path navigation
  remained usable; the two finding reproductions above remained failing. Screenshots:
  `/tmp/kbhc-qa02-invalid-date.png` and
  `/tmp/kbhc-qa02-virtual-home-focus-loss.png`, both 1280x400. Session/server closed and
  ports 4173/4182 had no listener.
- Full branch `3c31324a6cbbe7d950392dd616ebb50580b33c85..6c097ad52018fc7f89e9589743cd801cee9387a7`
  `git diff --check`, assignment/generated diff, secret/debug/noise scan, 27-row count,
  four human checkpoint blame/provenance and TODO dependency/status audit — PASS apart
  from the two findings recorded above.

Verdict: **BLOCKED** — two unresolved MEDIUM findings remain. Green quick and mapped
Journey tests do not override their fresh runtime reproductions. This review neither
marks QA-02 complete nor claims `HUMAN_APPROVED` or final acceptance.

### Supplemental blocker diagnosis — 2026-09-02

Review target: exact QA-02 record target
`69f36fb8da6cc892f72a1c22dce82808dde97b02`. Product and test content is unchanged from
the reviewed source target; this supplemental pass only narrows the two blocker root
causes and the required HIGH decision.

Checks: used a fresh authenticated Chromium production-preview document at 1280x720
with 40 task records. Each native vertical-scroll key started at a meaningful list
position with focus on an actual mounted Card descendant. The table records list
`scrollTop` before and after the key, whether that focused row remained mounted, and
the resulting `document.activeElement`.

| Key | Before: `scrollTop` / focused row | After `scrollTop` | Focused row mounted | Active element |
| --- | --- | ---: | --- | --- |
| `Home` | 1920 / `task-24` | 0 | no | `BODY` |
| `End` | 0 / `task-1` | 3340 | no | named list region |
| `PageUp` | 1920 / `task-26` | 1460 | no | `BODY` |
| `PageDown` | 1920 / `task-21` | 2380 | no | named list region |
| `ArrowUp` | 1920 / `task-26` | 1880 | no | `BODY` |
| `ArrowDown` | 2000 / `task-21` | 2040 | no | `BODY` |
| `Space` | 1920 / `task-21` | 2380 | no | `BODY` |
| `Shift+Space` | 1920 / `task-26` | 1460 | no | `BODY` |

Findings: the existing `PageDown`/`End` handoff does not conflict with native scrolling:
it focuses the stable region before virtualization unmounts the Card, preserves the
native scroll movement, and showed no double scroll. The minimum root-cause key family
for the actual Card descendants is `ArrowDown`, `ArrowUp`, `End`, `Home`, `PageDown`,
`PageUp`, and `" "`; Space and Shift+Space share `event.key === " "`. The existing
branch therefore needs five additions: `Home`, `PageUp`, `ArrowUp`, `ArrowDown`, and
`" "`. A Home-only correction leaves the same focus-loss defect for PageUp, ArrowUp,
ArrowDown, Space, and Shift+Space.

The repository has no existing RFC3339/date-time validation pattern. It does have the
direct dependency Zod 4.5.2 and an established Zod schema use. Read-only probes showed
that `z.iso.datetime({ offset: true })` accepts canonical `Z` and numeric-offset values
while rejecting malformed calendar values, date-only strings, missing offsets, and
invalid offset syntax. Zod's own JSON Schema converter maps `format: date-time` to this
check, making it the minimum no-new-dependency canonical API-boundary guard.
`Date.parse` is unsuitable because it also accepts non-date-time or extended forms such
as date-only, lowercase separators, and `24:00`. Literal full-RFC3339 acceptance has a
narrowing caveat: Zod rejects rare permitted forms including leap seconds and lowercase
`t/z`. That caveat should remain explicit rather than be hidden behind a
custom parser. A view-only fallback prevents `Intl.DateTimeFormat` from throwing but
still treats an OAS-invalid response as successful data and leaves it in the query
cache; it is not a substitute for boundary rejection.

Corrections: none. The combined HIGH decision question is: which correction boundary
is authorized?

1. **Recommended:** use Zod canonical rejection at the task-detail API boundary and
   hand off focus for the full seven-key native vertical-scroll family.
2. **Narrow exception:** add a UI fallback and Home-only handoff. This explicitly leaves
   OAS-invalid data cached and the PageUp/ArrowUp/ArrowDown/Space/Shift+Space sibling
   focus defects unresolved, so it requires an accepted exception.

Rerun: the named browser session and preview server were closed; no listener remained
on the supplemental preview port. `git status --porcelain` was clean at the target.

Verdict: **BLOCKED** — QA-02 remains blocked pending the decision, correction, and
corrected-target independent rerun. Product, tests, approval state, and
`HUMAN_APPROVED` remain unchanged.

### Finding 1 Zod decision — 2026-09-02

Decision target: `f9e65daceca3d34f39b61b840432c4f102f8ae62`.

Human HIGH decision: the user explicitly approved "zod로 검증으로 진행" for finding 1.
The authorized scope is the existing direct Zod 4.5.2
`z.iso.datetime({ offset: true })` check at the task-detail API boundary and one
invalid-date response regression. No UI fallback, dependency, helper, or framework is
authorized. Canonical `Z` and numeric-offset values remain valid. The narrowing caveat
remains explicit: rare RFC3339-valid leap seconds and lowercase `t/z` are
rejected by this chosen canonical validator.

Finding 1 correction status: `IN_PROGRESS`.

Finding 2 status: unchanged unresolved MEDIUM. The user did not approve a focus/key
correction in this decision, so the full seven-key handoff remains untouched and QA-02
remains `[ ]` / `BLOCKED`.

### Finding 1 Zod correction — 2026-09-02

Implementation/test target: `491cf14381555988bc9741c539b702a44bbb0a54`.

TDD RED: before the production edit, an otherwise exact `TaskDetailResponse` with
`registerDatetime: "not-a-date"` was added to the existing adjacent API test. The
following command failed for the intended reason: the malformed response resolved
instead of rejecting as `invalid-response`.

```bash
pnpm vitest run src/shared/api/tasks.test.ts
```

RED result: 1 failed/7 passed in 1 file/8 tests.

Minimal correction: `src/shared/api/tasks.ts` reuses direct Zod 4.5.2 and adds only
`z.iso.datetime({ offset: true }).safeParse(value.registerDatetime).success` to the
existing detail response guard. The exact-key guard, API shape, view fallback, auth,
delete, cache, dependency set, and focus/key finding are unchanged. The approved
narrowing caveat remains: this canonical validator rejects rare RFC3339-valid leap
seconds and lowercase `t/z` forms.

Fresh GREEN on the implementation/test target:

- `pnpm vitest run src/shared/api/tasks.test.ts` — PASS, 8/8.
- `pnpm vitest run src/shared/api/tasks.test.ts
  src/pages/task-detail/task-detail.test.tsx` — PASS, 2 files/13 tests.
- `pnpm api:types:check` — PASS, generated contract unchanged.
- `./scripts/verify quick` — PASS; hook 86, verifier contract 19, format, lint,
  typecheck, 38 Vitest files/162 tests.
- `pnpm exec playwright test e2e/task-resolution.spec.ts --project=chromium` — PASS,
  1/1.
- `pnpm build` — PASS; the existing non-failing chunk-size warning remained.

Fresh browser rerun: named `qa02-datetime-fix` used a production preview at
`http://127.0.0.1:4183` and viewport 1280x400. After approved auth fixture bootstrap,
a page-local fetch boundary returned an otherwise schema-shaped
`GET /api/task/task-bad-date` 200 with `registerDatetime: "not-a-date"`. The app showed
`할 일 상세를 불러오지 못했습니다.` and `API 응답 형식이 올바르지 않습니다.`,
retained the dashboard/task/profile navigation shell, and exposed an enabled
`다시 불러오기` button. Clicking it produced the second audited invalid-date GET and
kept the same recoverable state. `agent-browser errors --json` was `[]`; body text had
no `RangeError`. Console contained only the expected anonymous bootstrap refresh 401
from the pre-fixture opening plus subsequent successful fixture traffic, with no React
Router caught render error. Screenshot:
`/tmp/kbhc-qa02-datetime-fix.png` (verified 1280x400). The named session and preview
server were closed, and port 4183 had no listener.

Finding 1 verdict: **RESOLVED** — malformed date-time no longer reaches render or cache
as successful detail data, while canonical RFC3339 fixtures and the mapped Journey stay
green.

Finding 2 verdict: unchanged unresolved MEDIUM. No focus/key source or test was edited.
QA-02 therefore remains `[ ]` / `BLOCKED` pending that separate correction and the
corrected-target independent rerun.

### Finding 1 review follow-up — 2026-09-02

Reviewer target: `394bd7c8c35d2218b9d7ad79b2c95388eb43af67`.

Verdict: **APPROVE_WITH_MINOR**. The implementation, regression test, and browser
evidence support Finding 1 `RESOLVED`. The reviewer found one documentation-only
accuracy issue: the evidence said Zod rejects the RFC3339 `-00:00` offset, while a
direct `z.iso.datetime({ offset: true })` probe accepts it. That false claim has been
removed from all QA-02 tracked evidence. The narrowing caveat now names only the
verified rejected forms: leap seconds and lowercase `t/z`.

No product or test file changed. Finding 2 remains unresolved MEDIUM, so QA-02 remains
`[ ]` / `BLOCKED`.

### Finding 2 focus decision request — 2026-09-02

Decision target: `a192c00a19e477f379b44f3df3e5030ac9c50567`.

Partial-decision state: Finding 1 date-time validation has the user's Zod approval,
verified correction, corrected caveat, and `RESOLVED` verdict. The virtual-list focus
finding is the only unresolved QA-02 finding. The fresh eight-key matrix established
that a Home-only change would not correct the root cause, so it is removed as an
option.

Remaining HIGH question: how should descendant Card focus be handled when native
vertical scrolling can unmount the focused virtual row?

1. **Recommended:** for the full seven-key family `ArrowDown`, `ArrowUp`, `End`, `Home`,
   `PageDown`, `PageUp`, and `" "`, synchronously hand focus from a descendant Card to
   the stable named region. Extend the existing PageDown/End branch, add parameterized
   tests, and verify native scroll movement plus stable region focus in the browser.
2. **Final-acceptance exception:** retain the current PageDown/End-only handoff and
   explicitly approve the observed Home/PageUp/ArrowUp/ArrowDown/Space/Shift+Space
   focus losses as a final acceptance exception.

No focus product or test correction is authorized by the partial date-time decision.
QA-02 remains `[ ]` / `BLOCKED` until option 1 is corrected and independently rerun or
option 2 is explicitly accepted by a person. This record changes no product, test, or
`HUMAN_APPROVED` state.

### Finding 2 focus decision — 2026-09-02

Decision target: `728edaa26dd457eb55eafb49f5f6e7094f3f2f55`.

Human HIGH decision: the user explicitly selected option 1 with `1`. The authorized
scope is the full seven-key family `ArrowDown`, `ArrowUp`, `End`, `Home`, `PageDown`,
`PageUp`, and `" "`, using the existing descendant Card to stable named region
synchronous handoff. The existing parameterized test is extended and native scrolling
is verified in a fresh browser matrix. Space and Shift+Space share the same
`event.key === " "` branch.

No explicit scrolling, `preventDefault`, state, effect, helper, fake role, dependency,
or unrelated change is authorized. Finding 2 correction is `IN_PROGRESS`; QA-02 remains
`[ ]` / `BLOCKED` pending correction evidence and independent corrected-target review.
This decision does not record `HUMAN_APPROVED`.

### Finding 2 full-key focus correction — 2026-09-02

Implementation/test target: `cef5e7e91e2f324063ad0abab66dc103f1ead0d1`.

TDD RED: before the production edit, the existing parameterized handoff test was
expanded to `ArrowDown`, `ArrowUp`, `End`, `Home`, `PageDown`, `PageUp`, and `" "`.
`pnpm vitest run src/widgets/task-list/task-list.test.tsx` ran 12 tests: the new
ArrowDown, ArrowUp, Home, PageUp, and Space cases failed at the intended region-focus
assertion, while the existing PageDown/End cases and five unrelated cases passed
(5 failed/7 passed). The Space case covers the shared `event.key === " "` branch used
by both Space and Shift+Space.

Minimal correction: the existing descendant-target `onKeyDown` branch now uses only
native `Array.includes(event.key)` for the full seven-key family before focusing the
existing stable region. It preserves `event.target !== event.currentTarget` and adds no
`preventDefault`, explicit scroll, state, effect, helper, role, or dependency.

Fresh GREEN/automatic verification on the implementation/test target:

- task-list — PASS, 1 file/12 tests.
- focused accessibility suite — PASS, 7 files/37 tests.
- `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format, lint,
  generated API check, typecheck, Vitest 38 files/167 tests.
- mapped `e2e/task-discovery.spec.ts --project=chromium` — PASS, 1/1.
- `pnpm build` — PASS; only the existing non-failing chunk-size warning remained.

The first quick attempt stopped at `format:check` after all prior stages passed because
the two edited files had not yet received repository formatting. This was classified
`TEST`; targeted Biome formatting changed only those owned files, its diff was reviewed,
and the focused and complete quick commands above were rerun fresh.

Fresh browser: named `qa02-focus-fix` used the exact product build via production
preview `http://127.0.0.1:4184`, approved auth, and 40 schema-conforming tasks seeded
before app bootstrap. After all 20 two-record pages loaded, each physical key started
with focus on a meaningful mounted Card using setup-only `focus({ preventScroll: true })`.
The key press itself was native `agent-browser press` with no page scroll injection.

| Physical key | Desktop 1280x720 | Mobile 390x844 |
| --- | --- | --- |
| Home | `1920→0`, task-26 unmounted | `1920→0`, task-26 unmounted |
| End | `0→3340`, task-01 unmounted | `0→3280`, task-01 unmounted |
| PageUp | `1920→1460`, task-26 unmounted | `1920→1400`, task-26 unmounted |
| PageDown | `1920→2380`, task-21 unmounted | `1920→2440`, task-21 unmounted |
| ArrowUp | `1920→1880`, task-26 unmounted | `1960→1920`, task-27 unmounted |
| ArrowDown | `2000→2040`, task-21 unmounted | `2000→2040`, task-21 unmounted |
| Space | `1920→2380`, task-21 unmounted | `1920→2440`, task-21 unmounted |
| Shift+Space | `1920→1460`, task-26 unmounted | `1920→1400`, task-26 unmounted |

All 16 results kept `document.activeElement` on the non-BODY named `할 일 목록` region
with the visible 2px focus ring. Arrow deltas were exactly 40px; Page/Space deltas were
exactly `clientHeight - 40` (desktop 460px, mobile 520px); Home/End reached the exact
boundary. Those one-event native deltas and the source inspection show no double scroll.
Mounted DOM remained bounded at 6~7/40. Document/viewport widths were `1280/1280` and
`390/390`; horizontal overflow was false.

`agent-browser errors --json` returned `[]`, console error messages were empty, and all
21 observed API groups were 200. Screenshots
`/tmp/kbhc-qa02-focus-fix-desktop.png` (1280x720) and
`/tmp/kbhc-qa02-focus-fix-mobile.png` (390x844) visibly show the region ring; `sips`
confirmed both dimensions. The browser session and preview server were closed and port
4184 had no listener.

Finding 2 verdict: **RESOLVED, READY FOR RE-REVIEW** — the full root-cause key family
preserves native movement and stable focus when every tested Card unmounts. QA-02 remains
`[ ]` / `BLOCKED` until the original independent reviewer reviews this corrected target.
This correction does not claim `HUMAN_APPROVED` or final acceptance.

## QA-02 corrected-target independent follow-up — 2026-09-02

Review target: exact corrected target
`49ae7c26115da15c95cbae99eb34097c54b9574a`, reviewed against the original assignment
requirements, authoritative OpenAPI contract, and the two findings at the original
QA-02 source target.

Reviewer/independence: `/root/qa_full_adversarial_reviewer`, the original fresh QA-02
review owner. This reviewer did not author either human decision, production/test
correction, correction evidence, or browser matrix. No product or test file was changed
by this follow-up.

Checks: verified the linear review and correction chain: original review `69f36fb` and
supplement `f9e65da`; Finding 1 decision `2dcb647`, implementation `491cf14`, evidence
`394bd7c`, corrected caveat `a192c00`; Finding 2 decision request `728edaa`, option 1
approval `48a1932`, implementation `cef5e7e9`, and evidence target `49ae7c2`.

For Finding 1, rechecked the approved Zod-only boundary scope, credible one-failure RED,
direct Zod 4.5.2 `z.iso.datetime({ offset: true })` guard, canonical `Z` and numeric
offset behavior, corrected leap-second/lowercase narrowing caveat, `invalid-response`
recovery, retained shell/retry UI, absent `RangeError`, and unchanged cache/view/auth/
delete/dependency behavior. The prior independent approval remains valid.

For Finding 2, the five-failure/seven-pass RED is credible against the parent handler:
the five new ArrowDown/ArrowUp/Home/PageUp/Space cases lacked handoff while the existing
PageDown/End and five unrelated tests remained green. The product change is one condition
containing exactly `ArrowDown`, `ArrowUp`, `End`, `Home`, `PageDown`, `PageUp`, and
`" "`, guarded by `event.target !== event.currentTarget`. Space and Shift+Space share
the same key value. No `preventDefault`, explicit scroll, state, effect, helper, role,
or dependency was added.

Rechecked all 16 recorded physical-key results across 1280x720 and 390x844. Every
focused Card unmounted after one native key press while `document.activeElement`
remained the named region with its visible 2px ring. Arrow movement was ±40px,
Page/Space movement was `clientHeight - 40`, Home/End reached exact bounds, and no
double scroll appeared. Mounted DOM stayed at 6–7 of 40, widths matched both viewports,
horizontal overflow was absent, console/page errors were empty, all recorded traffic
was successful, screenshot dimensions matched, and the session/server were closed.

Findings: no HIGH or MEDIUM finding remains. **LOW — `TEST`:** the first fresh quick run
hit the fixed five-second timeout in two unrelated dialog files under full-suite load.
The correction range does not touch either file; running those two files immediately
passed 2 files/5 tests, and the immediate full quick rerun passed all 38 files/167 tests.
The failure did not reproduce. No timeout or harness expansion is justified unless it
recurs.

Corrections: Finding 1 is resolved by `491cf14381555988bc9741c539b702a44bbb0a54`
with its factual evidence correction at `a192c00a19e477f379b44f3df3e5030ac9c50567`.
Finding 2 is resolved by `cef5e7e91e2f324063ad0abab66dc103f1ead0d1`. This reviewer
made no product/test correction; the non-reproducing LOW timeout received no speculative
change.

Rerun:

- `pnpm vitest run src/shared/api/tasks.test.ts
  src/widgets/task-list/task-list.test.tsx` — PASS, 2 files/20 tests.
- `pnpm vitest run src/shared/ui/shadcn-primitives.test.tsx
  src/features/delete-task/ui/delete-task-dialog.test.tsx` — PASS, 2 files/5 tests.
- Second fresh `./scripts/verify quick` — PASS: hook 86, verifier contract 19, format,
  lint, generated API check, typecheck, Vitest 38 files/167 tests.
- `pnpm exec playwright test e2e/auth-entry.spec.ts e2e/work-overview.spec.ts
  e2e/task-discovery.spec.ts e2e/task-resolution.spec.ts --project=chromium` — PASS,
  5/5 against the current build; only the existing non-failing build-size warning.
- Original-source-to-corrected-target diff, assignment/generated immutability, exact
  correction file scope, decision provenance, TODO dependencies/status, secret/debug
  scan, screenshot dimensions, port cleanup, `git diff --check`, and clean worktree —
  PASS.

Verdict: **PASS_WITH_LOW** — both original MEDIUM findings are resolved and no HIGH or
MEDIUM remains. QA-02 transitions to `[x]` / `AI_VERIFIED`. The isolated non-reproducing
LOW timeout does not block that transition. This is independent AI verification, not
`HUMAN_APPROVED` or final acceptance.
