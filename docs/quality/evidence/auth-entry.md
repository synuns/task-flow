# Auth Entry Evidence

Requirement/Journey: `NAV-02`, `NAV-03`, `AUTH-01`~`AUTH-07`;
`AUTH-P1-*`, `AUTH-P2-*`, `AUTH-E*`; `auth-entry`

Commit: automatic correction target
`cbff6b502d14faaec3255fa8cf4fb890279dbf65`; browser-tested production target
`be22ce004a974251f4579469fc01c03df263d433`; integration evidence target
`0e38ee653c5f95d6ac205c93101f8c4c8393b2aa`; merge-base
`fe5e1e8c76b2a3ad13a98da5b9f550e8aa297c5d` on `feat/auth-entry-loop`.
Later commits through the automatic target add only evidence/TODO records and the
provider regression test; they do not change the browser-tested production code.

Route/Viewport: `/sign-in`, `/task/task-1`, `/user`; Chromium 390x844 and
1280x720

Precondition: fresh browser contexts, empty memory access token, reset MSW auth
fixture, no application token in Web Storage; approved mock credentials are
`user@example.com` / `Password1`

Actions: run the schema boundary, four-file focused auth suite,
`./scripts/verify quick`, and `pnpm exec playwright test e2e/auth-entry.spec.ts`;
from fresh named agent-browser sessions directly enter `/task/task-1`, inspect
invalid form state, submit a credential failure, exercise modal focus/Escape,
sign in successfully, return to the exact protected route, and reload through
the refresh cookie

Expected: validation alone gates submit; failed credentials produce one exact
`POST /api/sign-in` and an accessible 400 modal; protected entry does not leak
content; approved sign-in returns to the same-origin route; profile replaces
sign-in; reload rotates the refresh cookie and retains the route; bearer,
single-flight, bounded replay, terminal failure, and stale-generation behavior
continue to match `DEC-AUTH-01`

Actual:

| Scenario | Lowest sufficient current evidence | Result |
| --- | --- | --- |
| `AUTH-P1-1` | `sign-in-form.test.tsx`; both named browser sessions | visible associated email/password labels and `/sign-in` action PASS |
| `AUTH-P1-2` | schema 1 file/6 tests; sign-in component within focused suite | valid 8~24 ASCII alphanumeric enables submit only with valid email PASS |
| `AUTH-P1-3` | sign-in component; credential-failure Playwright request listener | one exact email/password-only POST; successful token callback PASS |
| `AUTH-P2-1` | `authenticated-request.test.ts`; both named browser sessions | current bearer boundary PASS; profile-only action after sign-in PASS |
| `AUTH-P2-2` | auth provider/authenticated-request focused tests; protected-entry Playwright and browser reload | single-flight/bounded replay/stale generation PASS; one successful cookie refresh on reload keeps `/task/task-1` |
| `AUTH-E1` | schema 1 file/6 tests; sign-in component 1 file/9 tests; mobile browser | empty, invalid email, 7/25-character and Korean/symbol password boundaries keep submit disabled PASS |
| `AUTH-E2` | sign-in component; credential-failure Playwright; both named browser sessions | one exact POST, 400 `errorMessage`, focus trap, Escape and submit focus restore PASS |
| `AUTH-E3` | auth provider/authenticated-request focused tests | authenticated refresh 401 rejects, increments generation, clears the token and protected cache while retaining unrelated cache; bootstrap 401, replay terminal failure and recoverable network failure PASS |

Fresh totals: focused auth 4 files/29 tests PASS; `./scripts/verify quick` PASS
(hook 86, verifier 19, Vitest 38 files/149 tests); mapped Playwright 2/2
PASS on initial run and fresh rerun. `auth-journey-verify-01-mobile` confirmed
invalid email and 7-character password errors, disabled submit, 400 modal focus
trap/Escape, exact protected return, reload, profile-only action, and
scrollWidth 390px. `auth-journey-verify-01-desktop` confirmed the same error,
focus-return, route/reload and action contract with scrollWidth 1280px.

Console/Network: Playwright observed failed sign-in request exactly once as
`POST {email: "user@example.com", password: "Password2"}` with status 400.
Each fresh browser session's MSW console distinguished expected bootstrap
refresh 401, credential failure 400, successful sign-in 200, successful reload
refresh 200 once, and protected detail GET 200; there were no page errors or
unexpected console errors. Agent-browser's request log does not observe requests
handled inside the MSW service worker, so Playwright listeners, MSW console, and
focused exact-count assertions are the request evidence.

Screenshot/Trace: `/tmp/kbhc-auth-journey-verify-01-mobile.png`,
`/tmp/kbhc-auth-journey-verify-01-desktop.png`;
`/tmp/kbhc-auth-session-ux-01-mobile-error.png`; passing Playwright cases attach
`auth-entry` and `auth-credential-failure` PNGs; no failure trace was generated

Verdict: `AUTH-ERROR-VIEW-01`, `AUTH-SESSION-UX-01`, and
`AUTH-JOURNEY-VERIFY-01` automatic/browser acceptance PASS; Journey review and
human acceptance are separate remaining gates

Human checkpoint record: no tracked explicit person approval exists;
`JOURNEY-AUTH-01` remains `BLOCKED` and this record does not claim
`HUMAN_APPROVED`

Failure class: `TOOLING` — agent-browser route/request logging could not
intercept MSW service-worker refresh; the first explicit-close DOM measurement
also ran before dialog exit animation; Biome required one assertion line format

Correction: use Playwright page request/response listeners plus MSW console and
component exact-count assertions; for the recoverable unavailable browser state,
use a temporary sessionStorage-controlled MSW network-error fixture, remove the
flag before retry, and fully revert the fixture source; wait 500ms for explicit
close and run `pnpm run format`

Rerun verdict: PASS — no temporary fixture or unrelated file remains; focused
4/29, quick 38/149, mapped Playwright 2/2, both current named browser sessions,
screenshots, expected console/network classification, and `git diff --check`
all pass

Independent review: plan
`docs/superpowers/plans/2026-09-01-auth-entry-remaining-loop.md`, requirements
`NAV-02`, `NAV-03`, `AUTH-01`~`AUTH-07`, cases `AUTH-P1-*`, `AUTH-P2-*`,
`AUTH-E*`; target `a284d90dbb6e51868557eeb3d8824b0e8e64f30b` against merge-base
`fe5e1e8c76b2a3ad13a98da5b9f550e8aa297c5d`. Fresh read-only reviewer
`/root/auth_journey_final_review` found no Critical/Important/Minor issue and no
unresolved HIGH/MEDIUM finding after corrections
`cbff6b502d14faaec3255fa8cf4fb890279dbf65` and
`a284d90dbb6e51868557eeb3d8824b0e8e64f30b`. Reviewed boundaries were
requirements/scenarios, auth policy/storage/refresh/replay/return route,
validation/Dialog/session negative paths, keyboard/focus/responsive accessibility,
test strength/duplication, console/network classification, evidence reproduction,
unrelated diff and TODO consistency. Corrected-target rerun: focused 4/29, quick
38/149, Playwright 2/2, browser production evidence unchanged and applicable,
`git diff --check` and clean worktree PASS. Review verdict: PASS; this is not
human Journey approval.

## FINAL-REVIEW-AUTH-CORRECTION-01 — 2026-09-04

Requirement/Journey: `NAV-02`, `NAV-03`, `AUTH-07`; corrected `auth-entry` target

Commit: `1e12ebe16e39d45ec39304be92eff79b7bb7afdd` on
`fix/final-review-auth`, rebased onto `main` `c9c1b928aeb33710be822c0f21d68e4bd1f1a9ac`

Route/Viewport: production preview `http://127.0.0.1:4187`; `/user/`,
`/sign-in/`, `/`; Chromium 1280x720

Precondition: fresh named `agent-browser` sessions, production build with MSW,
empty initial auth state; approved mock credentials `user@example.com` / `Password1`

Actions: entered anonymous `/user/`, signed in and returned to the exact route,
then entered authenticated `/sign-in/`; reviewed route matcher, protected cache
cleanup and refresh/session-generation callers; ran focused auth/router tests,
quick, mapped E2E and full verification

Expected: router-recognized trailing-slash/encoded/case variants receive the
same auth policy, untrusted return targets fall back to `/`, and a new sign-in
cannot observe protected query data from the previous principal

Actual: anonymous `/user/` redirected to `/sign-in` and preserved `/user/` for
successful sign-in; authenticated `/sign-in/` redirected to the dashboard;
route/cache/generation regression tests passed

Console/Network: MSW recorded expected initial and post-logout refresh 401,
sign-in 200 and protected GET 200 responses. `agent-browser errors` was empty;
the browser console contained no unexpected application error.

Screenshot/Trace: `/tmp/final-review-auth-anonymous-user.png`,
`/tmp/final-review-auth-authenticated-sign-in.png`; passing Playwright cases
generated no failure trace

Failure class: `ENVIRONMENT` — another worktree owned port 4173, so the first
mapped E2E and first unmodified full run stopped before Playwright execution.
One intermediate isolated-port run also stopped because the harness contract
correctly expected the canonical 4173 command.

Correction: ran browser and Playwright on isolated port 4187. For the full gate,
temporarily changed only the Playwright and harness-test port literals together,
ran the complete read-only command, then restored both tracked files.

Rerun verdict: PASS — focused 9 files/92 tests; quick hook 88, verifier 20,
48 files/281 tests; mapped auth-entry/user-crud Chromium 4/4; full hook 88,
verifier 20, format/lint/typecheck, 48 files/281 tests, build, core Chromium 9/9,
verifier regression 19/19. Port 4187 was closed and the worktree returned clean.

Review target: `docs/superpowers/plans/2026-09-04-auth-route-session-corrections.md`;
`NAV-02`, `NAV-03`, `AUTH-07`; target
`1e12ebe16e39d45ec39304be92eff79b7bb7afdd`

Reviewer: Codex `/root`, the implementation author in an explicit fresh
second-pass role after implementation; runtime policy prohibited subagent review

Checks: plan acceptance and omitted steps; router/policy parity; canonical,
trailing-slash, encoded, case, unknown, external and malformed paths; principal
cache roots and unrelated cache; refresh replay, terminal 401 and stale generation;
test strength/duplication; browser console/network; OpenAPI/generated/lockfile and
unrelated diff; TODO dependency/evidence consistency

Findings: no unresolved HIGH, MEDIUM, or LOW finding

Corrections: no product, test, or documentation correction was required by the
fresh review

Rerun: the focused, quick, mapped E2E, production-browser and full results above;
`git diff --check` and authoritative-file comparisons PASS

Verdict: PASS for AI plan-completion and corrected auth-entry review. Human
checkpoint acceptance remains separate; no `HUMAN_APPROVED` status is claimed.
